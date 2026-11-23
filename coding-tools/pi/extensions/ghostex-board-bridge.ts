/**
 * ghostex-board-bridge — makes a pi session aware of the Ghostex Project Board bead it is working.
 *
 * Why: Ghostex dispatches work from a board card (`gx board start-work <bead>`), and `bd` already
 * exposes every read and write pi needs. The one missing piece is *identity*: nothing told the
 * session which bead it belongs to, and an id that only exists in chat text is lost at compaction.
 *
 * Design (see docs/plans/2026-10-24-ghostex-pi-integration.md in the project repo):
 *  - identity resolves through four layers, first hit wins, and never invents an id
 *  - the id + acceptance criteria are re-injected as a prompt guideline on every turn
 *  - `bead` wraps the documented `bd` / `gx board associate` commands; no internal storage
 *  - no board (`/.beads` missing) or no `bd` on PATH => the extension is inert
 */

import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";
import type { AgentToolResult, ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import {
	CUSTOM_STATUSES,
	DEFAULT_STATUSES,
	buildCreateArgs,
	findLinkedBead,
	formatComment,
	isDirtyTree,
	parseBeadIdFromPrompt,
	summarizeBead,
	validateStatus,
} from "./ghostex-board-bridge/pure.ts";
import type { JsonObject, JsonValue } from "./ghostex-board-bridge/pure.ts";

const exec = promisify(execFile);

const ENTRY_TYPE = "ghostex-board-bridge";
const EXEC_TIMEOUT_MS = 60_000;


/* ------------------------------------------------------------------ runtime */

interface BridgeState {
	beadId: string | null;
	title?: string;
	status?: string;
	acceptance?: string;
	source: "entry" | "link" | "prompt" | "tool" | "none";
}

function hasBoard(cwd: string): boolean {
	let dir = cwd;
	for (;;) {
		if (fs.existsSync(path.join(dir, ".beads"))) return true;
		const parent = path.dirname(dir);
		if (parent === dir) return false;
		dir = parent;
	}
}

function hasBinary(name: string): boolean {
	return (process.env.PATH ?? "")
		.split(path.delimiter)
		.some((dir) => dir && fs.existsSync(path.join(dir, name)));
}

export default function ghostexBoardBridge(pi: ExtensionAPI) {
	let state: BridgeState = { beadId: null, source: "none" };
	let lastPersisted = "";
	let customStatuses: string[] = [...CUSTOM_STATUSES];

	const boardAvailable = () => hasBoard(process.cwd()) && hasBinary("bd");

	const run = async (cmd: string, args: string[]): Promise<string> => {
		try {
			const { stdout } = await exec(cmd, args, {
				cwd: process.cwd(),
				timeout: EXEC_TIMEOUT_MS,
				maxBuffer: 8 * 1024 * 1024,
			});
			return stdout;
		} catch (error) {
			const err = error as { stderr?: string; message?: string };
			throw new Error(`${cmd} ${args.join(" ")} failed: ${(err.stderr || err.message || "").trim()}`);
		}
	};

	const parseOrThrow = (raw: string, what: string): JsonValue => {
		try {
			return JSON.parse(raw) as JsonValue;
		} catch {
			throw new Error(`${what} returned malformed JSON: ${raw.slice(0, 200)}`);
		}
	};

	const asObject = (value: JsonValue | undefined): JsonObject =>
		value && typeof value === "object" && !Array.isArray(value) ? value : {};

	const asObjectList = (value: JsonValue): JsonObject[] =>
		Array.isArray(value) ? value.map((item) => asObject(item)) : [];

	const loadBead = async (beadId: string): Promise<JsonObject> => {
		const raw = await run("bd", ["show", beadId, "--json"]);
		const parsed = parseOrThrow(raw, `bd show ${beadId}`);
		const bead = asObject(Array.isArray(parsed) ? parsed[0] : parsed);
		if (!bead.id) throw new Error(`bead ${beadId} not found on this board`);
		return bead;
	};

	const remember = (bead: JsonObject, source: BridgeState["source"]) => {
		state = {
			beadId: String(bead.id),
			title: typeof bead.title === "string" ? bead.title : undefined,
			status: typeof bead.status === "string" ? bead.status : undefined,
			acceptance: typeof bead.acceptance_criteria === "string" ? bead.acceptance_criteria : undefined,
			source,
		};
		if (state.beadId !== lastPersisted) {
			pi.appendEntry(ENTRY_TYPE, { ...state });
			lastPersisted = state.beadId ?? "";
		}
	};

	const restore = (ctx: ExtensionContext) => {
		try {
			// SAFETY: SessionEntry is a discriminated union pi owns; this extension only reads the
			// `type`/`customType`/`data` triple it wrote itself via appendEntry, and ignores every other
			// entry kind. Narrowing per-variant would add nothing the writer does not already guarantee.
			const entries = ctx.sessionManager.getBranch() as unknown as Array<Record<string, unknown>>;
			for (let i = entries.length - 1; i >= 0; i--) {
				const entry = entries[i];
				if (entry?.type === "custom" && entry.customType === ENTRY_TYPE) {
					const data = (entry.data ?? {}) as BridgeState;
					if (data.beadId) state = { ...data, source: "entry" };
					return;
				}
			}
		} catch {
			/* no session yet — stay unset */
		}
	};

	const guideline = (): string => {
		if (!state.beadId) {
			return "No project bead is established for this session. Before starting project work, ask which Ghostex board card this belongs to (do not invent an id), then call bead({ op: \"show\" }).";
		}
		const bits = [
			`Task ${state.beadId}${state.title ? ` — ${state.title}` : ""} (status: ${state.status ?? "unknown"}).`,
			state.acceptance ? `Acceptance criteria: ${state.acceptance}` : "",
			"Report progress with bead({ op: \"comment\" }) and change status with bead({ op: \"status\" }) only when the board's own transition is justified.",
			"Never close the card unless the acceptance criteria were verified.",
		];
		return bits.filter(Boolean).join(" ");
	};

	pi.on("session_start", async (_event, ctx) => {
		restore(ctx);
		if (!boardAvailable() || state.beadId) return;

		// Layer 2: the Ghostex link. Documented command, undocumented shape — best effort only.
		const sessionId = process.env.PI_SESSION_ID;
		const sessionPath = process.env.PI_SESSION_FILE;
		if (process.env.GHOSTEX_GLOBAL_SESSION_REF && hasBinary("ghostex")) {
			try {
				const linked = findLinkedBead(
					parseOrThrow(await run("ghostex", ["state"]), "ghostex state"),
					sessionId,
					sessionPath,
				);
				if (linked) remember(await loadBead(linked), "link");
			} catch {
				/* fall through to prompt parsing / asking */
			}
		}

		try {
			const custom = await run("bd", ["config", "get", "status.custom"]);
			customStatuses = custom
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
		} catch {
			/* keep defaults */
		}
	});

	// Layer 3 + re-injection: the dispatched prompt, then a guideline on every turn.
	pi.on("before_agent_start", async (event) => {
		if (!boardAvailable()) return;
		if (!state.beadId && event.messageType === "user") {
			const parsed = parseBeadIdFromPrompt(event.prompt);
			if (parsed) {
				try {
					remember(await loadBead(parsed), "prompt");
				} catch {
					/* unknown id: leave unset so the model asks */
				}
			}
		}
		event.systemPromptOptions.promptGuidelines.push(`Ghostex board: ${guideline()}`);
	});

	pi.registerTool({
		name: "bead",
		label: "Bead",
		description:
			"Work the Ghostex Project Board card this session belongs to. Ops: show, comments, comment, status, children, create, close, associate, clear. Always verifies the bead exists first; never invents ids.",
		parameters: Type.Object({
			op: Type.Union(
				[
					Type.Literal("show"),
					Type.Literal("comments"),
					Type.Literal("comment"),
					Type.Literal("status"),
					Type.Literal("children"),
					Type.Literal("create"),
					Type.Literal("close"),
					Type.Literal("associate"),
					Type.Literal("clear"),
				],
				{ description: "Operation to perform" },
			),
			id: Type.Optional(Type.String({ description: "Bead id; defaults to the session's bead" })),
			text: Type.Optional(Type.String({ description: "Comment body (op: comment)" })),
			status: Type.Optional(Type.String({ description: "Target status (op: status)" })),
			title: Type.Optional(Type.String({ description: "New bead title (op: create)" })),
			description: Type.Optional(Type.String({ description: "New bead description (op: create)" })),
			priority: Type.Optional(Type.Number({ description: "P0–P4 as 0–4 (op: create)" })),
			parent: Type.Optional(Type.String({ description: "Parent bead id (op: create)" })),
			allowDirty: Type.Optional(
				Type.Boolean({ description: "Close despite uncommitted work; requires a comment explaining it" }),
			),
		}),

		async execute(_toolCallId, params): Promise<AgentToolResult<Record<string, unknown>>> {
			if (!boardAvailable()) {
				return {
					content: [{ type: "text", text: "No Beads board here (no .beads directory or no bd on PATH)." }],
					details: { op: params.op, skipped: "no-board" },
				};
			}

			const targetId = (params.id ?? state.beadId ?? "").trim();

			try {
				switch (params.op) {
					case "clear":
						state = { beadId: null, source: "none" };
						lastPersisted = "";
						return { content: [{ type: "text", text: "Cleared the session's bead." }], details: { op: "clear" } };

					case "show": {
						if (!targetId) throw new Error("no bead id: pass id or establish one first");
						const bead = await loadBead(targetId);
						remember(bead, "tool");
						return {
							content: [{ type: "text", text: summarizeBead(bead) }],
							details: { op: "show", bead },
						};
					}

					case "comments": {
						if (!targetId) throw new Error("no bead id: pass id or establish one first");
						await loadBead(targetId);
						const comments = asObjectList(
							parseOrThrow(await run("bd", ["comments", targetId, "--json"]), "bd comments"),
						);
						const text = comments.length
							? comments.map((c) => `- ${String(c.author ?? "?")}: ${String(c.text ?? "")}`).join("\n")
							: "No comments yet.";
						return { content: [{ type: "text", text }], details: { op: "comments", comments } };
					}

					case "children": {
						if (!targetId) throw new Error("no bead id: pass id or establish one first");
						const children = asObjectList(
							parseOrThrow(await run("bd", ["children", targetId, "--json"]), "bd children"),
						);
						const text = children.length
							? children.map((c) => `${String(c.id)} [${String(c.status ?? "?")}] ${String(c.title ?? "")}`).join("\n")
							: "No child beads.";
						return { content: [{ type: "text", text }], details: { op: "children", children } };
					}

					case "comment": {
						if (!targetId) throw new Error("no bead id: pass id or establish one first");
						if (!params.text?.trim()) throw new Error("comment requires text");
						await loadBead(targetId);
						const body = formatComment(params.text, "pi", process.env.PI_SESSION_ID);
						await run("bd", ["comment", targetId, body]);
						return {
							content: [{ type: "text", text: `Commented on ${targetId}.` }],
							details: { op: "comment", beadId: targetId },
						};
					}

					case "status": {
						if (!targetId) throw new Error("no bead id: pass id or establish one first");
						const wanted = validateStatus(params.status ?? "", customStatuses);
						if (!wanted) {
							throw new Error(
								`invalid status '${params.status ?? ""}'. Valid: ${[...DEFAULT_STATUSES, ...customStatuses].join(", ")}`,
							);
						}
						const bead = await loadBead(targetId);
						if (wanted === "closed") throw new Error("use op 'close' to close a bead; it checks the tree");
						await run("bd", ["update", targetId, "--status", wanted]);
						remember({ ...bead, status: wanted }, "tool");
						return {
							content: [{ type: "text", text: `${targetId}: ${bead.status} → ${wanted}` }],
							details: { op: "status", beadId: targetId, status: wanted },
						};
					}

					case "create": {
						if (!params.title?.trim()) throw new Error("create requires a title");
						if (params.parent) await loadBead(params.parent);
						const args = buildCreateArgs({
							title: params.title,
							description: params.description,
							parent: params.parent,
							priority: params.priority,
						});
						const created = parseOrThrow(await run("bd", args), "bd create");
						const newId = String(asObject(Array.isArray(created) ? created[0] : created).id ?? "");
						return {
							content: [{ type: "text", text: `Created ${newId}${params.parent ? ` under ${params.parent}` : ""}.` }],
							details: { op: "create", beadId: newId },
						};
					}

					case "close": {
						if (!targetId) throw new Error("no bead id: pass id or establish one first");
						const bead = await loadBead(targetId);
						let dirty = "";
						try {
							const { stdout } = await exec("git", ["status", "--porcelain"], { cwd: process.cwd() });
							dirty = stdout;
						} catch {
							/* not a git repo: nothing to check */
						}
						if (isDirtyTree(dirty) && !params.allowDirty) {
							throw new Error(
								"refusing to close over uncommitted work. Commit (or ask the user to), record the state in a comment, then retry with allowDirty: true.",
							);
						}
						await run("bd", ["close", targetId]);
						remember({ ...bead, status: "closed" }, "tool");
						return {
							content: [{ type: "text", text: `Closed ${targetId}.` }],
							details: { op: "close", beadId: targetId, hadUncommittedWork: isDirtyTree(dirty) },
						};
					}

					case "associate": {
						if (!targetId) throw new Error("no bead id: pass id or establish one first");
						if (!process.env.GHOSTEX_GLOBAL_SESSION_REF) {
							throw new Error("not inside a Ghostex session (GHOSTEX_GLOBAL_SESSION_REF is unset)");
						}
						await loadBead(targetId);
						if (!state.beadId) remember(await loadBead(targetId), "tool");
						await run("gx", ["board", "associate", targetId]);
						return {
							content: [{ type: "text", text: `Linked this session to ${targetId}.` }],
							details: { op: "associate", beadId: targetId },
						};
					}

					default:
						throw new Error(`unknown op: ${String(params.op)}`);
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return {
					content: [{ type: "text", text: `bead ${params.op} failed: ${message}` }],
					details: { op: params.op, error: message },
				};
			}
		},
	});
}
