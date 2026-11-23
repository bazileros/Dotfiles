/**
 * yolo — set the permission system's `yoloMode` without opening a dialog.
 *
 * Why this exists: the permission system already ships a `/permission-system` settings modal, but
 * that is a TUI surface. In Ghostex chat mode the modal is not rendered, so the only way to stop
 * approval prompts was to hand-edit JSON and restart. This command + tool do the same write from
 * the transcript, and the permission system re-reads its config on every turn
 * (`SessionTurnPrep.refreshConfig`), so the change lands on the next turn — no `/reload`.
 *
 * Scope: `yoloMode` auto-approves *ask* results. `deny` rules and blocked commands still deny.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { AgentToolResult, ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const CONFIG_RELATIVE = ["extensions", "pi-permission-system", "config.json"] as const;

function agentDir(): string {
	const fromEnv = process.env.PI_CODING_AGENT_DIR;
	return fromEnv && fromEnv.trim() ? fromEnv : path.join(os.homedir(), ".pi", "agent");
}

function configPath(): string {
	return path.join(agentDir(), ...CONFIG_RELATIVE);
}

interface YoloState {
	path: string;
	enabled: boolean;
	exists: boolean;
}

function parseConfig(raw: string, file: string): Record<string, unknown> {
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			throw new Error("not a JSON object");
		}
		return parsed as Record<string, unknown>;
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		throw new Error(`cannot parse ${file}: ${detail}`);
	}
}

function readState(): YoloState {
	const file = configPath();
	if (!fs.existsSync(file)) return { path: file, enabled: false, exists: false };
	const parsed = parseConfig(fs.readFileSync(file, "utf8"), file);
	return { path: file, enabled: parsed.yoloMode === true, exists: true };
}

function writeState(enabled: boolean): YoloState {
	const file = configPath();
	const current = fs.existsSync(file) ? parseConfig(fs.readFileSync(file, "utf8"), file) : {};
	const next = { ...current, yoloMode: enabled };
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`, "utf8");
	return { path: file, enabled, exists: true };
}

function describe(state: YoloState, changed: boolean): string {
	const status = state.enabled ? "ON" : "OFF";
	let note: string;
	if (!state.exists) {
		note = "No config file yet; the extension's built-in default is OFF until one is written.";
	} else if (changed) {
		note = "Applies from the next turn (the permission system re-reads its config each turn).";
	} else {
		note = "No change written.";
	}
	const consequence = state.enabled
		? "Default posture: approval prompts are auto-approved. `deny` rules and cc-safety-net blocks still apply."
		: "Opted in to approvals: prompts are shown again — invisible in Ghostex chat mode, so switch to the terminal view.";
	return `yolo: ${status}\n${state.path}\n${note}\n${consequence}`;
}

type Mode = "on" | "off" | "status" | "toggle";

function apply(mode: Mode): { state: YoloState; changed: boolean } {
	const before = readState();
	if (mode === "status") return { state: before, changed: false };
	const target = mode === "toggle" ? !before.enabled : mode === "on";
	if (target === before.enabled) return { state: before, changed: false };
	return { state: writeState(target), changed: true };
}

export default function yoloExtension(pi: ExtensionAPI) {
	pi.registerCommand("yolo", {
		description: "Permission mode: yolo is the default, approvals are opt-in. /yolo [on|off|status] (no argument shows status)",
		async handler(args, ctx) {
			const raw = (args ?? "").trim().toLowerCase();
			const mode: Mode = raw === "on" || raw === "off" || raw === "toggle" ? raw : "status";
			try {
				const { state, changed } = apply(mode);
				ctx.ui.notify(`yolo: ${state.enabled ? "ON" : "OFF"}${changed ? " (applies next turn)" : ""}`, "info");
				ctx.ui.setStatus("yolo", state.enabled ? "yolo on" : "yolo off");
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				ctx.ui.notify(`yolo failed: ${message}`, "error");
			}
		},
	});

	pi.registerTool({
		name: "yolo",
		label: "Yolo",
		description:
			"Read or set the permission system's yolo mode. Yolo is ON by default; approvals are opt-in. Use when the user asks to stop approval prompts, or when prompts are invisible because they are in Ghostex chat mode. Takes effect on the next turn.",
		parameters: Type.Object({
			mode: Type.Union([Type.Literal("on"), Type.Literal("off"), Type.Literal("status"), Type.Literal("toggle")], {
				description: "on, off, status, or toggle",
			}),
		}),

		async execute(_toolCallId, params): Promise<AgentToolResult<Record<string, unknown>>> {
			try {
				const { state, changed } = apply(params.mode);
				return {
					content: [{ type: "text", text: describe(state, changed) }],
					details: { mode: params.mode, enabled: state.enabled, path: state.path, changed },
				};
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return {
					content: [{ type: "text", text: `yolo ${params.mode} failed: ${message}` }],
					details: { mode: params.mode, error: message },
				};
			}
		},
	});
}
