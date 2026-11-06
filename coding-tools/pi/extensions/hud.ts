/**
 * HUD — cat header, boxed editor with a powerline status bar, icons.
 *
 * Replaces the built-in header, editor chrome, working row, and footer with one
 * cohesive One Dark surface. Toggle with /hud.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AssistantMessage } from "@earendil-works/pi-ai";
import {
	CustomEditor,
	type ExtensionAPI,
	type ExtensionContext,
	getAgentDir,
	type KeybindingsManager,
	type Theme,
	VERSION,
} from "@earendil-works/pi-coding-agent";
import type { Component, EditorTheme, TUI } from "@earendil-works/pi-tui";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { humanDuration } from "./lib/duration.ts";
import { detectStack, stackBadge, type StackInfo } from "./lib/stack.ts";

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

interface Totals {
	input: number;
	output: number;
	cost: number;
	entries: number;
}

const state = {
	working: false,
	startedAt: 0,
	lastRunMs: undefined as number | undefined,
	branch: undefined as string | undefined,
	dirty: false,
	diff: undefined as { added: number; removed: number } | undefined,
	totals: { input: 0, output: 0, cost: 0, entries: -1 } as Totals,
	beadsReady: undefined as number | undefined,
	stack: undefined as StackInfo | undefined,
	spinner: 0,
	tui: undefined as { requestRender(): void } | undefined,
	ctx: undefined as ExtensionContext | undefined,
};

const fmt = (n: number) =>
	n < 1000 ? `${n}` : n < 1_000_000 ? `${(n / 1000).toFixed(1)}k` : `${(n / 1_000_000).toFixed(1)}M`;

// USD → ZAR. PI_ZAR_RATE overrides; otherwise a cached live rate, refreshed twice a day.
const DEFAULT_ZAR_RATE = 18.5;
let zarRate = DEFAULT_ZAR_RATE;

function rateFile(): string {
	return join(getAgentDir(), "zar-rate.json");
}

function loadCachedRate(): { rate?: number; at?: number } | undefined {
	try {
		const data = JSON.parse(readFileSync(rateFile(), "utf8")) as { rate?: number; at?: number };
		if (typeof data.rate === "number" && data.rate > 0) {
			zarRate = data.rate;
			return data;
		}
	} catch {
		// no cache yet
	}
	return undefined;
}

async function refreshZarRate(): Promise<void> {
	const override = Number(process.env.PI_ZAR_RATE);
	if (override > 0) {
		zarRate = override;
		return;
	}

	const cached = loadCachedRate();
	if (cached?.at && Date.now() - cached.at < 12 * 60 * 60 * 1000) return;

	try {
		const response = await fetch("https://api.frankfurter.app/latest?from=USD&to=ZAR", {
			signal: AbortSignal.timeout(5000),
		});
		const data = (await response.json()) as { rates?: { ZAR?: number } };
		const rate = data.rates?.ZAR;
		if (typeof rate === "number" && rate > 0) {
			zarRate = rate;
			writeFileSync(rateFile(), JSON.stringify({ rate, at: Date.now() }), "utf8");
			state.tui?.requestRender();
		}
	} catch {
		// offline: keep the cached or default rate
	}
}

function padTo(text: string, width: number): string {
	const clipped = truncateToWidth(text, width, "");
	return clipped + " ".repeat(Math.max(0, width - visibleWidth(clipped)));
}

function shortCwd(cwd: string): string {
	const home = process.env.HOME;
	return home && cwd.startsWith(home) ? `~${cwd.slice(home.length)}` : cwd;
}

function frame(
	left: string,
	right: string,
	width: number,
	style: (text: string) => string,
	cornerLeft: string,
	cornerRight: string,
): string {
	let l = left;
	let r = right;
	const room = Math.max(0, width - 4);

	while (visibleWidth(l) + visibleWidth(r) > room && visibleWidth(r) > 0) {
		r = truncateToWidth(r, Math.max(0, visibleWidth(r) - 1), "");
	}
	while (visibleWidth(l) + visibleWidth(r) > room && visibleWidth(l) > 0) {
		l = truncateToWidth(l, Math.max(0, visibleWidth(l) - 1), "");
	}

	const fill = Math.max(0, room - visibleWidth(l) - visibleWidth(r));
	return truncateToWidth(
		style(cornerLeft) + style("─") + l + style("─".repeat(fill)) + r + style("─") + style(cornerRight),
		width,
	);
}

function spinner(): string {
	return SPINNER[state.spinner % SPINNER.length];
}

function recompute(ctx: ExtensionContext) {
	const branch = ctx.sessionManager.getBranch();
	if (branch.length === state.totals.entries) return;

	let input = 0;
	let output = 0;
	let cost = 0;
	for (const entry of branch) {
		if (entry.type !== "message" || entry.message.role !== "assistant") continue;
		const usage = (entry.message as AssistantMessage).usage;
		if (!usage) continue;
		input += usage.input ?? 0;
		output += usage.output ?? 0;
		cost += usage.cost?.total ?? 0;
	}
	state.totals = { input, output, cost, entries: branch.length };
}

function gitBranch(ctx: ExtensionContext, theme: Theme): string {
	if (!state.branch) return "";
	const mark = state.dirty ? "*" : "";
	return ` ${theme.fg("accent", `⑂ ${state.branch}${mark}`)}`;
}

function buildHeader(ctx: ExtensionContext): (tui: TUI, theme: Theme) => Component {
	return (tui: TUI, theme: Theme) => {
		state.tui = tui;
		return {
			render(width: number): string[] {
				const t = ctx.ui.theme;
				const cat = [
					`   ${t.fg("accent", "/\\_/\\")}  `,
					`  ${t.fg("accent", "( o.o )")}${t.fg("muted", "~")}`,
					`   ${t.fg("accent", "> ^ <")}  `,
					`  ${t.fg("accent", "/|   |\\")} `,
					` ${t.fg("accent", "(_|   |_)")} `,
				];
				const stack = state.stack ? stackBadge(state.stack) : "";
				const extras: string[] = [];
				if (state.stack) {
					extras.push(`${t.fg("accent", "⚙")} ${t.fg("muted", stack)}`);
				}
				if (state.beadsReady !== undefined) {
					extras.push(`${t.fg("accent", "✦")} ${t.fg("muted", `${state.beadsReady} beads ready`)}`);
				}
				const info = [
					`${t.bold(t.fg("accent", "pi"))} ${t.fg("dim", `v${VERSION}`)} ${t.fg("muted", "· one-dark")}`,
					`${t.fg("muted", "⌂")} ${t.fg("text", shortCwd(ctx.cwd))}${gitBranch(ctx, t)}`,
					`${t.fg("accent", "◆")} ${t.fg("text", ctx.model?.id ?? "no model")} ${t.fg("muted", "·")} ${t.fg("accent", "✦")} ${t.fg("text", ctx.thinkingLevel ?? "off")} ${t.fg("dim", "· ⇧tab")}`,
					`${t.fg("accent", "❯")} ${t.fg("muted", "/help · /stack · /tasks · /orchestrate · /mcp")}`,
					extras.join(t.fg("dim", " · ")),
				];

				const lines: string[] = [""];
				for (let i = 0; i < cat.length; i++) {
					lines.push(truncateToWidth(padTo(cat[i], 10) + "  " + (info[i] ?? ""), width));
				}
				lines.push("");
				return lines;
			},
			invalidate() {},
		};
	};
}

class PiEditor extends CustomEditor {
	constructor(tui: TUI, theme: EditorTheme, keybindings: KeybindingsManager) {
		super(tui, theme, keybindings, { paddingX: 0 });
		state.tui = tui;
	}

	render(width: number): string[] {
		const ctx = state.ctx;
		const t = ctx?.ui.theme;
		if (!ctx || !t) return super.render(width);

		const inner = Math.max(16, width - 4);
		const raw = super.render(inner);
		const content = raw.length >= 2 ? raw.slice(1, -1) : raw;
		if (content.length === 0) content.push("");

		const elapsed = state.working ? Math.max(0, Date.now() - state.startedAt) : 0;
		const left = state.working
			? `${t.fg("accent", spinner())} ${t.fg("muted", humanDuration(elapsed))} ${t.fg("muted", shortCwd(ctx.cwd))}${gitBranch(ctx, t)}`
			: `${t.fg("accent", "❯")} ${t.fg("muted", shortCwd(ctx.cwd))}${gitBranch(ctx, t)}`;
		const right = `${t.fg("accent", `◆ ${ctx.model?.id ?? "no model"}`)} ${t.fg("dim", "·")} ${t.fg("muted", `✦ ${ctx.thinkingLevel ?? "off"}`)} ${t.fg("dim", "⇧tab")}`;

		const usage = ctx.getContextUsage();
		const limit = ctx.model?.contextWindow;
		const tokens = usage?.tokens ?? undefined;
		const hasTokens = tokens !== undefined && tokens !== null;
		const percent = usage?.percent ?? (hasTokens && limit ? (tokens / limit) * 100 : undefined);
		const segments: string[] = [];
		if (percent !== undefined && percent !== null) {
			const color = percent >= 85 ? "error" : percent >= 60 ? "warning" : "success";
			const counts = hasTokens && limit ? ` ${fmt(tokens)}/${fmt(limit)}` : hasTokens ? ` ${fmt(tokens)}` : "";
			segments.push(t.fg(color, `◐ ${Math.round(percent)}%`) + t.fg("dim", counts));
		} else if (hasTokens) {
			segments.push(t.fg("dim", `◐ ${fmt(tokens)}`));
		}
		segments.push(t.fg("dim", `↑${fmt(state.totals.input)} ↓${fmt(state.totals.output)}`));
		if (state.diff) {
			const parts: string[] = [];
			if (state.diff.added) parts.push(t.fg("success", `+${state.diff.added}`));
			if (state.diff.removed) parts.push(t.fg("error", `-${state.diff.removed}`));
			if (parts.length) segments.push(t.fg("dim", "± ") + parts.join(" "));
		}
		segments.push(t.fg("dim", `R${(state.totals.cost * zarRate).toFixed(2)}`));
		if (state.beadsReady !== undefined) segments.push(t.fg("accent", `✦ ${state.beadsReady} beads`));
		if (state.lastRunMs !== undefined) segments.push(t.fg("dim", `⏱ ${humanDuration(state.lastRunMs)}`));

		const bottomLeft = segments.join(t.fg("dim", " · "));
		const bottomRight = t.fg("dim", "⇧tab thinking · /stack · /help");

		const border = (text: string) => t.fg("border", text);
		const out: string[] = [frame(left, right, width, border, "╭", "╮")];
		for (const line of content) {
			out.push(
				`${t.fg("border", "│")} ${padTo(line, inner)} ${t.fg("border", "│")}`,
			);
		}
		out.push(frame(bottomLeft, bottomRight, width, border, "╰", "╯"));
		return out;
	}
}

export default function (pi: ExtensionAPI) {
	let enabled = true;
	let timer: ReturnType<typeof setInterval> | undefined;

	const stopSpinner = () => {
		if (timer) clearInterval(timer);
		timer = undefined;
	};

	const startSpinner = () => {
		stopSpinner();
		timer = setInterval(() => {
			state.spinner += 1;
			state.tui?.requestRender();
		}, 80);
	};

	async function refreshGit(ctx: ExtensionContext) {
		try {
			const branch = await pi.exec("git", ["branch", "--show-current"], { cwd: ctx.cwd });
			state.branch = branch.code === 0 ? branch.stdout.trim() || undefined : undefined;

			const status = await pi.exec("git", ["status", "--porcelain"], { cwd: ctx.cwd });
			state.dirty = status.code === 0 && status.stdout.trim().length > 0;

			const stat = await pi.exec("git", ["diff", "--shortstat", "HEAD"], { cwd: ctx.cwd });
			const text = stat.code === 0 ? stat.stdout : "";
			const added = Number(text.match(/(\d+) insertion/)?.[1] ?? 0);
			const removed = Number(text.match(/(\d+) deletion/)?.[1] ?? 0);
			state.diff = added || removed ? { added, removed } : undefined;
		} catch {
			state.branch = undefined;
			state.dirty = false;
			state.diff = undefined;
		}
	}

	async function refreshBeads(ctx: ExtensionContext) {
		if (!existsSync(join(ctx.cwd, ".beads"))) {
			state.beadsReady = undefined;
			return;
		}
		try {
			const res = await pi.exec("bd", ["ready", "--json"], { cwd: ctx.cwd, timeout: 15000 });
			const parsed = res.code === 0 ? JSON.parse(res.stdout) : undefined;
			state.beadsReady = Array.isArray(parsed) ? parsed.length : undefined;
		} catch {
			state.beadsReady = undefined;
		}
	}

	function applyUi(ctx: ExtensionContext) {
		if (!ctx.hasUI || ctx.mode !== "tui") return;
		if (enabled) {
			ctx.ui.setHeader(buildHeader(ctx));
			ctx.ui.setFooter(() => ({ render: () => [], invalidate() {} }));
			ctx.ui.setWorkingVisible(false);
			ctx.ui.setEditorComponent((tui, theme, keybindings) => new PiEditor(tui, theme, keybindings));
		} else {
			ctx.ui.setHeader(undefined);
			ctx.ui.setFooter(undefined);
			ctx.ui.setWorkingVisible(true);
			ctx.ui.setEditorComponent(undefined);
		}
	}

	pi.on("session_start", async (_event, ctx) => {
		state.ctx = ctx;
		state.stack = detectStack(ctx.cwd);
		recompute(ctx);
		await refreshGit(ctx);
		await refreshBeads(ctx);
		applyUi(ctx);
		void refreshZarRate();
	});

	pi.on("turn_end", async (_event, ctx) => {
		recompute(ctx);
		await refreshGit(ctx);
		state.tui?.requestRender();
	});

	pi.on("agent_start", async () => {
		state.working = true;
		state.startedAt = Date.now();
		startSpinner();
	});

	pi.on("agent_settled", async (_event, ctx) => {
		state.working = false;
		if (state.startedAt) {
			state.lastRunMs = Date.now() - state.startedAt;
			state.startedAt = 0;
		}
		stopSpinner();
		recompute(ctx);
		await refreshGit(ctx);
		await refreshBeads(ctx);
		state.tui?.requestRender();
	});

	pi.on("session_tree", async (_event, ctx) => {
		state.totals.entries = -1;
		recompute(ctx);
		state.tui?.requestRender();
	});

	pi.on("session_shutdown", async () => {
		stopSpinner();
		state.tui = undefined;
		state.ctx = undefined;
	});

	pi.registerCommand("rate", {
		description: "Show the USD→ZAR rate used for cost display",
		handler: async (_args, ctx) => {
			ctx.ui.notify(`US$1 = R${zarRate.toFixed(2)} (${process.env.PI_ZAR_RATE ? "PI_ZAR_RATE" : "live/cached"})`, "info");
		},
	});

	pi.registerCommand("hud", {
		description: "Toggle the custom header, editor and status bar",
		handler: async (_args, ctx) => {
			enabled = !enabled;
			applyUi(ctx);
			ctx.ui.notify(enabled ? "HUD enabled" : "Built-in UI restored", "info");
		},
	});
}
