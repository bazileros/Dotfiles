/**
 * Awesome Header — dramatic startup banner with live setup labels:
 * model, thinking hint, modes, agents, and auto-detected skills.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { VERSION } from "@earendil-works/pi-coding-agent";

function detectSkills(): string {
	const dirs = [path.join(os.homedir(), ".agents", "skills")];
	const names = new Set<string>();
	for (const dir of dirs) {
		try {
			for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
				if (entry.name.startsWith(".")) continue;
				// Skills are often symlinked into this dir, so accept links too.
				const full = path.join(dir, entry.name);
				const isDir = entry.isDirectory() || (entry.isSymbolicLink() && fs.existsSync(path.join(full, "SKILL.md")));
				if (isDir) names.add(entry.name);
			}
		} catch { /* dir missing is fine */ }
	}
	return names.size ? Array.from(names).join(" · ") : "none detected";
}

const RULE = "─".repeat(46);

function bannerLines(theme: any, skills: string): string[] {
	const a = (t: string) => theme.fg("accent", t);
	const m = (t: string) => theme.fg("muted", t);
	const d = (t: string) => theme.fg("dim", t);
	const label = (t: string) => a(t.padEnd(10));
	const B = "█";
	const bar = a(B.repeat(46));

	return [
		"",
		bar,
		a(`${B}  ▞▚ PI ${m("· your coding agent")}`) + d(" ".repeat(Math.max(0, 46 - 30)) + `v${VERSION}`) + a(B),
		bar,
		"",
		label("MODEL") + m("deepseek-v4.1-flash") + d("   /thinking low·high·max"),
		label("THEME") + m("onedark") + d("             /settings · /awesome for this sheet"),
		d(RULE),
		label("MODES") + m("/plan · /build · /ask · /implement · /orchestrator"),
		label("AGENTS") + m("scout · plan · build · ask · reviewer · worker"),
		label("SKILLS") + m(skills),
		label("HINT") + d("/skill:<name> to force a skill · Ctrl+P cycles models"),
		"",
	];
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		if (ctx.mode !== "tui") return;
		const skills = detectSkills();
		ctx.ui.setHeader((_tui: any, theme: any) => ({
			render(_width: number): string[] {
				return bannerLines(theme, skills);
			},
			invalidate() {},
		}));
	});

	pi.registerCommand("builtin-header", {
		description: "Restore the built-in header with keybinding hints",
		handler: async (_args, ctx) => {
			ctx.ui.setHeader(undefined);
			ctx.ui.notify("Built-in header restored", "info");
		},
	});
}
