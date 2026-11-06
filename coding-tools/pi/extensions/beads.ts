/**
 * Beads — a typed tool and commands over the `bd` issue tracker.
 *
 * Keeps the agent out of flag archaeology: one tool with explicit actions,
 * compact output, and a clear hint when the repo has no beads database.
 */

import { StringEnum } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const ACTIONS = ["ready", "list", "show", "create", "claim", "close", "update", "dep", "comment"] as const;
const TYPES = ["task", "bug", "feature", "chore", "epic", "spike", "story", "decision", "milestone"] as const;
const STATUSES = ["open", "in_progress", "blocked", "deferred", "closed"] as const;

const BeadsParams = Type.Object({
	action: StringEnum(ACTIONS, {
		description:
			"ready = claimable work; list = all issues; show = one issue; create; claim = take ownership; close; update; dep = add a blocker; comment.",
	}),
	id: Type.Optional(Type.String({ description: "Issue id, e.g. bd-a1b2. Required for show, claim, close, update, dep, comment." })),
	title: Type.Optional(Type.String({ description: "Issue title (create)." })),
	description: Type.Optional(Type.String({ description: "Issue description (create/update)." })),
	priority: Type.Optional(Type.Number({ minimum: 0, maximum: 4, description: "0 = highest, 4 = lowest. Default 2." })),
	type: Type.Optional(StringEnum(TYPES, { description: "Issue type. Default task." })),
	status: Type.Optional(StringEnum(STATUSES, { description: "Status filter for list, or new status for update." })),
	assignee: Type.Optional(Type.String({ description: "Assignee for list filter or update." })),
	reason: Type.Optional(Type.String({ description: "Close reason (close)." })),
	blockedBy: Type.Optional(Type.String({ description: "Issue id that must finish first (dep)." })),
	note: Type.Optional(Type.String({ description: "Comment text (comment) or appended note (update)." })),
});

interface Issue {
	id: string;
	title: string;
	status: string;
	priority: number;
	issue_type?: string;
	assignee?: string;
	description?: string;
}

function formatIssues(raw: string, limit = 50): string {
	let issues: Issue[];
	try {
		issues = JSON.parse(raw) as Issue[];
	} catch {
		return raw.trim() || "No issues.";
	}
	if (!Array.isArray(issues) || issues.length === 0) return "No issues.";

	return issues
		.slice(0, limit)
		.map((i) => {
			const who = i.assignee ? ` @${i.assignee}` : "";
			const type = i.issue_type ? ` [${i.issue_type}]` : "";
			return `${i.id}  P${i.priority}  ${i.status}${who}  ${i.title}${type}`;
		})
		.join("\n");
}

function hint(stderr: string): string {
	const text = stderr.trim();
	if (/not initialized|no beads|\.beads.*not found|database not found/i.test(text)) {
		return `${text}\n\nThis repo has no beads database. Run \`bd init\` first.`;
	}
	if (/command not found|ENOENT/i.test(text)) {
		return "The `bd` CLI is not on PATH. Install beads: npm install -g @beads/bd";
	}
	return text || "bd failed without output.";
}

export default function (pi: ExtensionAPI) {
	async function run(args: string[], cwd: string) {
		try {
			return await pi.exec("bd", args, { cwd, timeout: 30_000 });
		} catch (error) {
			return { code: 1, stdout: "", stderr: String(error) };
		}
	}

	pi.registerTool({
		name: "beads",
		label: "Beads",
		description: [
			"Track work in the repo's beads issue database (`bd`).",
			"Use action=ready to find claimable work, claim before starting, close with a reason when done.",
			"Prefer this over ad-hoc todo lists when a .beads directory exists.",
		].join(" "),
		parameters: BeadsParams,

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const cwd = ctx.cwd;
			const id = params.id?.trim();
			const text = (value: string) => ({ content: [{ type: "text" as const, text: value }], details: {} });

			switch (params.action) {
				case "ready": {
					const res = await run(["ready", "--json"], cwd);
					if (res.code !== 0) return text(hint(res.stderr));
					return text(formatIssues(res.stdout));
				}

				case "list": {
					const args = ["list", "--json"];
					if (params.status) args.push("--status", params.status);
					if (params.assignee) args.push("--assignee", params.assignee);
					const res = await run(args, cwd);
					if (res.code !== 0) return text(hint(res.stderr));
					return text(formatIssues(res.stdout));
				}

				case "show": {
					if (!id) return text("action=show requires id.");
					const res = await run(["show", id], cwd);
					if (res.code !== 0) return text(hint(res.stderr));
					return text(res.stdout.trim());
				}

				case "create": {
					if (!params.title) return text("action=create requires title.");
					const args = [
						"create",
						params.title,
						"-p",
						String(params.priority ?? 2),
						"-t",
						params.type ?? "task",
						"--silent",
					];
					if (params.description) args.push("-d", params.description);
					const res = await run(args, cwd);
					if (res.code !== 0) return text(hint(res.stderr));
					const created = res.stdout.trim().split("\n").pop() ?? "";
					const shown = created ? await run(["show", created], cwd) : undefined;
					return text(shown?.code === 0 ? shown.stdout.trim() : `Created ${created}`);
				}

				case "claim": {
					if (!id) return text("action=claim requires id.");
					const res = await run(["update", id, "--claim", "--json"], cwd);
					if (res.code !== 0) return text(hint(res.stderr));
					return text(formatIssues(res.stdout, 1));
				}

				case "close": {
					if (!id) return text("action=close requires id.");
					const args = ["close", id];
					if (params.reason) args.push("--reason", params.reason);
					const res = await run(args, cwd);
					if (res.code !== 0) return text(hint(res.stderr));
					return text(res.stdout.trim() || `Closed ${id}`);
				}

				case "update": {
					if (!id) return text("action=update requires id.");
					const args = ["update", id];
					if (params.status) args.push("--status", params.status);
					if (params.priority !== undefined) args.push("--priority", String(params.priority));
					if (params.assignee) args.push("--assignee", params.assignee);
					if (params.description) args.push("--description", params.description);
					if (params.note) args.push("--append-notes", params.note);
					if (args.length === 2) return text("action=update needs at least one field.");
					const res = await run(args, cwd);
					if (res.code !== 0) return text(hint(res.stderr));
					return text(res.stdout.trim() || `Updated ${id}`);
				}

				case "dep": {
					if (!id || !params.blockedBy) return text("action=dep requires id and blockedBy.");
					const res = await run(["dep", "add", id, params.blockedBy], cwd);
					if (res.code !== 0) return text(hint(res.stderr));
					return text(res.stdout.trim() || `${id} now depends on ${params.blockedBy}`);
				}

				case "comment": {
					if (!id || !params.note) return text("action=comment requires id and note.");
					const res = await run(["comment", id, params.note], cwd);
					if (res.code !== 0) return text(hint(res.stderr));
					return text(res.stdout.trim() || `Commented on ${id}`);
				}
			}
		},
	});

	pi.registerCommand("tasks", {
		description: "Show ready beads tasks",
		handler: async (_args, ctx) => {
			const res = await run(["ready", "--json"], ctx.cwd);
			if (res.code !== 0) {
				ctx.ui.notify(hint(res.stderr), "warning");
				return;
			}
			const formatted = formatIssues(res.stdout, 8);
			ctx.ui.notify(formatted === "No issues." ? "No ready beads tasks" : formatted, "info");
		},
	});

	pi.registerCommand("task", {
		description: "Create a bead (usage: /task [title])",
		handler: async (args, ctx) => {
			const title = args.trim();
			if (!title) {
				ctx.ui.notify("Usage: /task <title>", "warning");
				return;
			}
			const res = await run(["create", title, "--silent"], ctx.cwd);
			if (res.code !== 0) {
				ctx.ui.notify(hint(res.stderr), "error");
				return;
			}
			ctx.ui.notify(`Created ${res.stdout.trim().split("\n").pop()}`, "info");
		},
	});
}
