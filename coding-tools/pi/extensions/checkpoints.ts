/**
 * Checkpoints — snapshots the working tree before each turn so a bad turn can
 * be undone with /undo.
 *
 * Uses `git stash create`, which records tracked changes in a dangling commit
 * without touching the index or the stash list. Untracked files are not part
 * of the snapshot and are never deleted by /undo.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

interface Checkpoint {
	ref: string;
	turn: number;
	at: number;
}

const MAX_CHECKPOINTS = 25;

export default function (pi: ExtensionAPI) {
	const stack: Checkpoint[] = [];
	let isRepo: boolean | undefined;
	let turn = 0;

	async function checkRepo(): Promise<boolean> {
		if (isRepo !== undefined) return isRepo;
		const { code } = await pi.exec("git", ["rev-parse", "--is-inside-work-tree"]);
		isRepo = code === 0;
		return isRepo;
	}

	pi.on("session_start", async () => {
		stack.length = 0;
		turn = 0;
		isRepo = undefined;
	});

	pi.on("turn_start", async () => {
		if (!(await checkRepo())) return;
		turn += 1;
		const { stdout, code } = await pi.exec("git", ["stash", "create"]);
		const ref = stdout.trim();
		if (code !== 0 || !ref) return;
		stack.push({ ref, turn, at: Date.now() });
		if (stack.length > MAX_CHECKPOINTS) stack.shift();
	});

	pi.registerCommand("undo", {
		description: "Restore tracked files to the checkpoint before the last turn",
		handler: async (_args, ctx) => {
			const checkpoint = stack.pop();
			if (!checkpoint) {
				ctx.ui.notify("No checkpoint recorded yet", "warning");
				return;
			}
			if (!ctx.hasUI) {
				stack.push(checkpoint);
				ctx.ui.notify("/undo needs an interactive session", "error");
				return;
			}

			const ok = await ctx.ui.confirm(
				"Undo last turn?",
				`Restore tracked files to their state before turn ${checkpoint.turn}.\n\nNew untracked files are kept. Your current changes will be overwritten.`,
			);
			if (!ok) {
				stack.push(checkpoint);
				return;
			}

			const result = await pi.exec("git", ["checkout", checkpoint.ref, "--", "."]);
			if (result.code !== 0) {
				stack.push(checkpoint);
				ctx.ui.notify(`Undo failed: ${result.stderr.trim() || "git checkout error"}`, "error");
				return;
			}
			ctx.ui.notify(`Restored tracked files to before turn ${checkpoint.turn}`, "info");
		},
	});

	pi.registerCommand("checkpoints", {
		description: "List recorded turn checkpoints",
		handler: async (_args, ctx) => {
			if (stack.length === 0) {
				ctx.ui.notify("No checkpoints recorded", "info");
				return;
			}
			const lines = stack
				.slice(-5)
				.reverse()
				.map((c) => `turn ${c.turn} — ${new Date(c.at).toLocaleTimeString()} — ${c.ref.slice(0, 8)}`);
			ctx.ui.notify(lines.join("\n"), "info");
		},
	});
}
