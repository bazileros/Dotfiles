/**
 * Pure helpers for the beads management extension: parsing `bd` output and deciding what an
 * operation may do. No I/O. Lives in a subdirectory without `index.ts`, so pi never loads it as
 * an extension. Tests: ~/.pi/agent/tests/beads.test.ts.
 */

/** `bd version 1.3.2 (9b65b9e19)` → "1.3.2" */
export function parseBdVersion(stdout: string): string | null {
	const match = /bd version\s+v?([0-9][\w.\-+]*)/i.exec(stdout ?? "");
	return match ? match[1] : null;
}

export interface HookShim {
	name: string;
	version: string | null;
	installed: boolean;
}

/**
 * `bd hooks list` lines look like:
 *   ✓ pre-commit: installed (shim 1.3.1)
 *   ✗ pre-push: not installed
 */
export function parseHookShims(stdout: string): HookShim[] {
	const shims: HookShim[] = [];
	for (const line of (stdout ?? "").split("\n")) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		// Only status rows carry "installed" / "not installed"; this drops headers like
		// "Git hooks status:", which would otherwise parse as a shim named "status".
		if (!/installed/i.test(trimmed)) continue;
		const name = /(?:^|\s)([a-z][a-z-]+)\s*:/.exec(trimmed)?.[1];
		if (!name) continue;
		const installed = !/not installed/i.test(trimmed);
		const version = /shim\s+v?([0-9][\w.\-+]*)/i.exec(trimmed)?.[1] ?? null;
		shims.push({ name, version, installed });
	}
	return shims;
}

/** Hook shims written by a different bd than the one installed now. */
export function hookDrift(shims: HookShim[], currentVersion: string | null): HookShim[] {
	if (!currentVersion) return [];
	return shims.filter((shim) => shim.installed && shim.version !== null && shim.version !== currentVersion);
}

export type BeadsOp = "status" | "init" | "repair" | "migrate";

export interface ActionPlan {
	allowed: boolean;
	reason: string;
	command: string[] | null;
	destructive: false;
}

/**
 * Decide what an op may do. Never authorises a destructive re-init: `bd init --reinit-local`
 * needs a `--destroy-token DESTROY-<prefix>`, which is a human decision, not a tool default.
 */
export function planAction(op: BeadsOp, hasWorkspace: boolean, _currentVersion: string | null): ActionPlan {
	switch (op) {
		case "status":
			return { allowed: true, reason: "read-only", command: null, destructive: false };
		case "init":
			return hasWorkspace
				? {
						allowed: false,
						reason:
							"a .beads workspace already exists here; `bd init` would abort. Use op=repair for hooks or op=migrate for the schema.",
						command: null,
						destructive: false,
					}
				: {
						allowed: true,
						reason:
							"creates a new workspace in the current directory; bd init also writes AGENTS.md, CLAUDE.md, .claude/settings.json, and .agents/skills/beads",
						command: ["init", "--non-interactive"],
						destructive: false,
					};
		case "repair":
			return hasWorkspace
				? {
						allowed: true,
						reason: "rewrites the managed git-hook shims to the installed bd version",
						command: ["hooks", "install", "--beads"],
						destructive: false,
					}
				: { allowed: false, reason: "no .beads workspace here", command: null, destructive: false };
		case "migrate":
			return hasWorkspace
				? {
						allowed: true,
						reason: "applies pending schema migrations (idempotent)",
						command: ["migrate", "schema"],
						destructive: false,
					}
				: { allowed: false, reason: "no .beads workspace here", command: null, destructive: false };
		default:
			return {
				allowed: false,
				reason: `unknown op '${String(op)}'; expected status, init, repair, or migrate`,
				command: null,
				destructive: false,
			};
	}
}

export function summarizeStatus(input: {
	workspace: string | null;
	bdVersion: string | null;
	shims: HookShim[];
	drift: HookShim[];
}): string {
	const lines: string[] = [];
	lines.push(input.workspace ? `workspace: ${input.workspace}` : "workspace: none (no .beads in this directory or its parents)");
	lines.push(`bd: ${input.bdVersion ?? "unknown"}`);
	if (input.shims.length) {
		const installed = input.shims.filter((s) => s.installed).length;
		lines.push(`git hooks: ${installed}/${input.shims.length} installed`);
		if (input.drift.length) {
			const detail = input.drift.map((s) => `${s.name} ${s.version ?? "?"}`).join(", ");
			lines.push(`drift: ${detail} → bd ${input.bdVersion ?? "?"}. Run op=repair to rewrite the shims.`);
		} else {
			lines.push("hooks match the installed bd");
		}
	} else {
		lines.push("git hooks: none reported");
	}
	if (!input.workspace) lines.push("next: op=init creates a workspace in the current directory");
	return lines.join("\n");
}
