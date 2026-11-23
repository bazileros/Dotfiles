/**
 * beads — initialize, repair, and migrate a Beads workspace from pi, without being at a terminal.
 *
 * Why: `bd init` only works in an empty workspace, the git-hook shims it writes are version-stamped
 * (a `bd` upgrade leaves them stale — observed here as 1.3.1 shims under bd 1.3.2), and slash
 * commands are invisible in Ghostex chat mode. So this ships as a command *and* a tool.
 *
 * Safety: every op is planned by the pure layer first. Nothing destructive is reachable:
 * `bd init --reinit-local` requires a `--destroy-token DESTROY-<prefix>`, which stays a human
 * decision. Unknown ops are refused rather than passed through to `bd`.
 */

import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";
import type { AgentToolResult, ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import {
	type BeadsOp,
	hookDrift,
	parseBdVersion,
	parseHookShims,
	planAction,
	summarizeStatus,
} from "./beads/pure.ts";

const exec = promisify(execFile);
const EXEC_TIMEOUT_MS = 120_000;

function findWorkspace(cwd: string): string | null {
	let dir = cwd;
	for (;;) {
		const candidate = path.join(dir, ".beads");
		if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) return candidate;
		const parent = path.dirname(dir);
		if (parent === dir) return null;
		dir = parent;
	}
}

function hasBd(): boolean {
	const pathEnv = process.env.PATH ?? "";
	return pathEnv
		.split(path.delimiter)
		.some((dir) => dir && (fs.existsSync(path.join(dir, "bd")) || fs.existsSync(path.join(dir, "bd.exe"))));
}

export default function beadsExtension(pi: ExtensionAPI) {
	const run = async (args: string[]): Promise<string> => {
		try {
			const { stdout } = await exec("bd", args, {
				cwd: process.cwd(),
				timeout: EXEC_TIMEOUT_MS,
				maxBuffer: 8 * 1024 * 1024,
				env: { ...process.env, BD_NON_INTERACTIVE: "1" },
			});
			return stdout;
		} catch (error) {
			const err = error as { stdout?: string; stderr?: string; message?: string };
			const detail = (err.stderr || err.stdout || err.message || "").trim();
			throw new Error(`bd ${args.join(" ")} failed: ${detail}`);
		}
	};

	const collectStatus = async () => {
		const workspace = findWorkspace(process.cwd());
		let bdVersion: string | null = null;
		let shims: ReturnType<typeof parseHookShims> = [];
		if (hasBd()) {
			try {
				bdVersion = parseBdVersion(await run(["version"]));
			} catch {
				/* version probe is best effort */
			}
			if (workspace) {
				try {
					shims = parseHookShims(await run(["hooks", "list"]));
				} catch {
					/* hooks listing is best effort */
				}
			}
		}
		return { workspace, bdVersion, shims, drift: hookDrift(shims, bdVersion) };
	};

	const execute = async (op: BeadsOp, ctx?: ExtensionContext): Promise<AgentToolResult<Record<string, unknown>>> => {
		if (!hasBd()) {
			return {
				content: [{ type: "text", text: "bd is not on PATH. Install it, then retry." }],
				details: { op, error: "bd-not-found" },
			};
		}

		const before = await collectStatus();
		const plan = planAction(op, Boolean(before.workspace), before.bdVersion);

		if (op === "status" || !plan.allowed) {
			const text = summarizeStatus(before);
			return {
				content: [{ type: "text", text: plan.allowed ? text : `${text}\n\nrefused ${op}: ${plan.reason}` }],
				details: { op, allowed: plan.allowed, reason: plan.reason, ...before, drift: before.drift },
			};
		}

		const command = plan.command;
		if (!command) throw new Error(`no command planned for ${op}`);
		ctx?.ui.setStatus("beads", `bd ${command[0]}…`);
		try {
			const stdout = await run(command);
			const after = await collectStatus();
			const tail = stdout.trim().split("\n").slice(-6).join("\n");
			return {
				content: [
					{
						type: "text",
						text: [
							`bd ${command.join(" ")} → ok (${plan.reason})`,
							after.workspace ? `workspace: ${after.workspace}` : "",
							summarizeStatus(after),
							tail ? `\n${tail}` : "",
						]
							.filter(Boolean)
							.join("\n"),
					},
				],
				details: { op, command, allowed: true, reason: plan.reason, ...after, drift: after.drift },
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				content: [{ type: "text", text: `beads ${op} failed: ${message}` }],
				details: { op, command, error: message },
			};
		} finally {
			ctx?.ui.setStatus("beads", undefined);
		}
	};

	pi.registerCommand("beads-admin", {
		description:
			"Beads workspace maintenance: /beads-admin [status|init|repair|migrate]. status shows bd version and hook drift; init only in an empty workspace",
		async handler(args, ctx) {
			const raw = (args ?? "").trim().toLowerCase();
			const ops: BeadsOp[] = ["status", "init", "repair", "migrate"];
			const op = (ops as string[]).includes(raw) ? (raw as BeadsOp) : "status";
			const result = await execute(op, ctx);
			const text = result.content.map((part) => ("text" in part ? part.text : "")).join("\n");
			ctx.ui.notify(text.split("\n").slice(0, 3).join(" · "), "info");
		},
	});

	pi.registerTool({
		name: "beads_admin",
		label: "Beads Admin",
		description:
			"Maintain a Beads workspace: status (bd version, hooks, drift), init (new workspace only), repair (rewrite stale git-hook shims to the installed bd), migrate (idempotent schema migrations). No destructive re-init.",
		parameters: Type.Object({
			op: Type.Union(
				[Type.Literal("status"), Type.Literal("init"), Type.Literal("repair"), Type.Literal("migrate")],
				{ description: "Operation to perform" },
			),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, ctx): Promise<AgentToolResult<Record<string, unknown>>> {
			return execute(params.op, ctx);
		},
	});
}
