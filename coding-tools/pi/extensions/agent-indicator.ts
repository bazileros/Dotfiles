/**
 * Agent Indicator — shows which agent/mode is active, live, in the status line.
 *
 * Signals used:
 *  - `input`      raw text before template expansion: "/build …" → build mode
 *  - `tool_call`  a `subagent` call → shows the agents being spawned
 *  - `tool_result` after the subagent call → back to the invoking mode
 *  - `agent_end`  leaves the last mode visible so you can see what just ran
 *
 * Note: pi has no persistent agent state. This tracks the last mode invoked and
 * the subagents currently running, which is the closest honest equivalent.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const STATUS_KEY = "agent";

/** Slash commands that put pi into a named mode, with display labels. */
const MODES: Record<string, string> = {
	plan: "plan",
	build: "build",
	ask: "ask",
	implement: "chain scout→plan→build",
	orchestrator: "chain plan→build→reviewer",
	awesome: "cheatsheet",
};

function setStatus(ctx: any, text: string | undefined) {
	try {
		ctx.ui.setStatus(STATUS_KEY, text);
	} catch {
		/* non-TUI modes have no status line */
	}
}

function modeFromInput(text: string): { mode: string; label: string } | null {
	const trimmed = text.trim();
	if (!trimmed.startsWith("/")) return null;

	// "/skill:name args" — the skill becomes the active agent
	const skill = /^\/skill:([a-z0-9-]+)/i.exec(trimmed);
	if (skill) return { mode: `skill:${skill[1]}`, label: `skill ${skill[1]}` };

	const command = /^\/([a-z0-9-]+)/i.exec(trimmed)?.[1]?.toLowerCase();
	if (!command) return null;
	const label = MODES[command];
	if (label) return { mode: command, label };
	return null;
}

/** Read the agent names out of an Agent tool call. */
function subagentsFromCall(input: any): string[] {
	if (!input || typeof input !== "object") return [];
	const names: string[] = [];
	// pi-subagents style: { subagent_type, name }
	if (typeof input.subagent_type === "string") names.push(input.subagent_type);
	if (typeof input.name === "string") names[0] = `${names[0] ?? "agent"}:${input.name}`;
	// example-subagent style: { agent }, { tasks: [...] }, { chain: [...] }
	if (typeof input.agent === "string") names.push(input.agent);
	for (const key of ["tasks", "chain"] as const) {
		const list = input[key];
		if (Array.isArray(list)) {
			for (const item of list) {
				if (item && typeof item.agent === "string") names.push(item.agent);
			}
		}
	}
	return names;
}

function isSubagentTool(toolName: string): boolean {
	return toolName === "Agent" || toolName === "subagent";
}

export default function (pi: ExtensionAPI) {
	// Remember the active mode so a finished subagent call can restore it.
	let activeMode = "main";
	let activeLabel = "main";

	const render = (ctx: any) => {
		if (activeMode === "main") setStatus(ctx, `main`);
		else setStatus(ctx, `${activeLabel}`);
	};

	pi.on("input", async (event: any, ctx: any) => {
		const match = modeFromInput(event.text ?? "");
		if (match) {
			activeMode = match.mode;
			activeLabel = match.label;
		} else {
			activeMode = "main";
			activeLabel = "main";
		}
		render(ctx);
		return { action: "continue" as const };
	});

	pi.on("tool_call", async (event: any, ctx: any) => {
		if (!isSubagentTool(event.toolName)) return;
		const agents = subagentsFromCall(event.input);
		if (agents.length === 0) {
			setStatus(ctx, `${activeLabel} → subagent`);
			return;
		}
		// Keep it short: "build → scout+ask" style
		const shown = agents.length > 3 ? `${agents.slice(0, 3).join("+")}+${agents.length - 3}` : agents.join("+");
		setStatus(ctx, `${activeLabel} → ${shown}`);
	});

	pi.on("tool_result", async (event: any, ctx: any) => {
		if (!isSubagentTool(event.toolName)) return;
		render(ctx);
	});

	// Restore the indicator when a session is resumed.
	pi.on("session_start", async (_event: any, ctx: any) => {
		if (ctx.mode !== "tui") return;
		render(ctx);
	});
}
