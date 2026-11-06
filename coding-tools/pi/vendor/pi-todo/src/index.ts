/**
 * pi-todo — Persistent per-project todo tracker with live TUI widget
 *
 * Registers a `todo` tool the LLM can call to manage a task list stored in
 * `.pi/todo.json` in the project root. A live widget above the editor shows
 * the current state at all times.
 */

import * as fs from "node:fs";
import type { AgentToolResult } from "@earendil-works/pi-agent-core";
import { type ExtensionAPI, type ExtensionContext, type ToolDefinition } from "@earendil-works/pi-coding-agent";
import { Text, type Component } from "@earendil-works/pi-tui";
import { TodoParams } from "./schemas.ts";
import {
	addItem,
	clearCompleted,
	listItems,
	readStore,
	removeItem,
	reorderItem,
	toggleItem,
	updateItem,
	type TodoItem,
	type TodoPriority,
	type TodoStatus,
} from "./store.ts";
import { createWidgetComponent, renderTodoResult } from "./render.ts";

const WIDGET_KEY = "todo";

/** Update the live widget from the current store state */
function refreshWidget(pi: ExtensionAPI, cwd: string): void {
	// We need a UI context — grab it from the last known context
	// The widget is set via ctx.ui, but we can also use pi's event system
	// For now, we store the last context and use it here
	const ctx = lastCtx;
	if (!ctx || !ctx.hasUI) return;
	const store = readStore(cwd);
	if (store.items.length === 0) {
		ctx.ui.setWidget(WIDGET_KEY, undefined);
		return;
	}
	ctx.ui.setWidget(WIDGET_KEY, createWidgetComponent(store.items));
}

// Track the last known UI context for widget updates
let lastCtx: ExtensionContext | null = null;

interface TodoDetails {
	action: string;
	items: TodoItem[];
	item?: TodoItem;
	removed?: number;
	moved?: boolean;
	error?: string;
}

export default function registerTodoExtension(pi: ExtensionAPI): void {
	const tool: ToolDefinition<typeof TodoParams, TodoDetails> = {
		name: "todo",
		label: "Todo",
		description: `Manage a persistent per-project todo list stored in .pi/todo.json. The list survives across sessions and is shown as a live widget above the editor.

Actions:
- add: Create a new todo item (requires text, optional: priority, assignee, blockedBy)
- update: Modify an existing item by ID (requires id, optional: text, status, priority, assignee, blockedBy)
- toggle: Cycle status pending → in-progress → done → pending (requires id)
- remove: Delete an item by ID (requires id)
- list: List all items, optionally filtered by status (optional: filter)
- clear: Remove all completed items
- reorder: Move an item up or down in the list (requires id, direction)

Only the main agent can modify the todo list. Subagents cannot call this tool.`,
		parameters: TodoParams,
		promptSnippet: "Manage a persistent todo list with add, update, toggle, remove, list, clear, and reorder actions.",
		promptGuidelines: [
			"Use the todo tool to track multi-step tasks — add items before starting work, toggle to in-progress when beginning, toggle to done when complete.",
			"Always set the assignee field to the agent doing the work (e.g. Ultron, Marcus, Quinn, Maya).",
			"Use blockedBy to mark tasks that can't start until another task is done.",
		],

		async execute(toolCallId, params, _signal, _onUpdate, ctx): Promise<AgentToolResult<TodoDetails>> {
			lastCtx = ctx;
			const cwd = ctx.cwd;
			const width = process.stdout.columns || 120;

			try {
				switch (params.action) {
					case "add": {
						if (!params.text) {
							return {
								content: [{ type: "text", text: "Error: 'text' is required for add action." }],
								isError: true,
								details: { action: "add", items: [], error: "text is required" },
							};
						}
						const item = addItem(
							cwd,
							params.text,
							params.priority as TodoPriority | undefined,
							params.assignee,
							params.blockedBy,
						);
						refreshWidget(pi, cwd);
						const all = listItems(cwd);
						return {
							content: [{ type: "text", text: `Added: ${item.id} — ${item.text}` }],
							details: { action: "add", items: all, item },
						};
					}

					case "update": {
						if (!params.id) {
							return {
								content: [{ type: "text", text: "Error: 'id' is required for update action." }],
								isError: true,
								details: { action: "update", items: [], error: "id is required" },
							};
						}
						const updated = updateItem(cwd, params.id, {
							text: params.text,
							status: params.status as TodoStatus | undefined,
							priority: params.priority as TodoPriority | undefined,
							assignee: params.assignee,
							blockedBy: params.blockedBy,
						});
						if (!updated) {
							return {
								content: [{ type: "text", text: `Error: Item ${params.id} not found.` }],
								isError: true,
								details: { action: "update", items: [], error: "item not found" },
							};
						}
						refreshWidget(pi, cwd);
						const all = listItems(cwd);
						return {
							content: [{ type: "text", text: `Updated: ${updated.id} — ${updated.text} [${updated.status}]` }],
							details: { action: "update", items: all, item: updated },
						};
					}

					case "toggle": {
						if (!params.id) {
							return {
								content: [{ type: "text", text: "Error: 'id' is required for toggle action." }],
								isError: true,
								details: { action: "toggle", items: [], error: "id is required" },
							};
						}
						const toggled = toggleItem(cwd, params.id);
						if (!toggled) {
							return {
								content: [{ type: "text", text: `Error: Item ${params.id} not found.` }],
								isError: true,
								details: { action: "toggle", items: [], error: "item not found" },
							};
						}
						refreshWidget(pi, cwd);
						const all = listItems(cwd);
						return {
							content: [{ type: "text", text: `Toggled: ${toggled.id} — ${toggled.text} → ${toggled.status}` }],
							details: { action: "toggle", items: all, item: toggled },
						};
					}

					case "remove": {
						if (!params.id) {
							return {
								content: [{ type: "text", text: "Error: 'id' is required for remove action." }],
								isError: true,
								details: { action: "remove", items: [], error: "id is required" },
							};
						}
						const removed = removeItem(cwd, params.id);
						if (!removed) {
							return {
								content: [{ type: "text", text: `Error: Item ${params.id} not found.` }],
								isError: true,
								details: { action: "remove", items: [], error: "item not found" },
							};
						}
						refreshWidget(pi, cwd);
						const all = listItems(cwd);
						return {
							content: [{ type: "text", text: `Removed: ${params.id}` }],
							details: { action: "remove", items: all },
						};
					}

					case "list": {
						const items = listItems(cwd, params.filter);
						return {
							content: [{ type: "text", text: formatListText(items) }],
							details: { action: "list", items },
						};
					}

					case "clear": {
						const count = clearCompleted(cwd);
						refreshWidget(pi, cwd);
						const all = listItems(cwd);
						return {
							content: [{ type: "text", text: `Cleared ${count} completed item${count === 1 ? "" : "s"}.` }],
							details: { action: "clear", items: all, removed: count },
						};
					}

					case "reorder": {
						if (!params.id) {
							return {
								content: [{ type: "text", text: "Error: 'id' is required for reorder action." }],
								isError: true,
								details: { action: "reorder", items: [], error: "id is required" },
							};
						}
						if (!params.direction) {
							return {
								content: [{ type: "text", text: "Error: 'direction' is required for reorder action." }],
								isError: true,
								details: { action: "reorder", items: [], error: "direction is required" },
							};
						}
						const moved = reorderItem(cwd, params.id, params.direction);
						if (!moved) {
							return {
								content: [{ type: "text", text: `Error: Could not reorder ${params.id} (not found or already at ${params.direction === "up" ? "top" : "bottom"}).` }],
								isError: true,
								details: { action: "reorder", items: [], error: "cannot reorder" },
							};
						}
						refreshWidget(pi, cwd);
						const all = listItems(cwd);
						return {
							content: [{ type: "text", text: `Reordered: ${params.id} ${params.direction}` }],
							details: { action: "reorder", items: all, moved: true },
						};
					}

					default:
						return {
							content: [{ type: "text", text: `Error: Unknown action '${params.action}'.` }],
							isError: true,
							details: { action: String(params.action), items: [], error: "unknown action" },
						};
				}
			} catch (error) {
				const msg = error instanceof Error ? error.message : String(error);
				return {
					content: [{ type: "text", text: `Error: ${msg}` }],
					isError: true,
					details: { action: String(params.action), items: [], error: msg },
				};
			}
		},

		renderCall(args, theme) {
			const action = args.action || "?";
			if (action === "list") {
				return new Text(`${theme.fg("toolTitle", theme.bold("todo "))}list${args.filter ? ` ${theme.fg("dim", args.filter)}` : ""}`, 0, 0);
			}
			if (action === "add" && args.text) {
				const preview = args.text.length > 50 ? `${args.text.slice(0, 49)}…` : args.text;
				return new Text(`${theme.fg("toolTitle", theme.bold("todo "))}add ${theme.fg("accent", `"${preview}"`)}`, 0, 0);
			}
			const target = args.id || "";
			return new Text(`${theme.fg("toolTitle", theme.bold("todo "))}${action}${target ? ` ${theme.fg("accent", target)}` : ""}`, 0, 0);
		},

		renderResult(result, options, theme, _context) {
			const details = result.details as TodoDetails | undefined;
			if (!details) {
				const text = typeof result.content === "string"
					? result.content
					: result.content.map((c) => (c.type === "text" ? c.text : "")).join("");
				return new Text(text, 0, 0);
			}
			if (result.isError) {
				const text = typeof result.content === "string"
					? result.content
					: result.content.map((c) => (c.type === "text" ? c.text : "")).join("");
				return new Text(theme.fg("error", text), 0, 0);
			}
			const width = process.stdout.columns || 120;
			return renderTodoResult(details.items, theme, width);
		},
	};

	pi.registerTool(tool);

	// Slash command: /todo
	pi.registerCommand("todo", {
		description: "List all todo items, or clear completed items with '/todo clear'",
		async handler(args, ctx) {
			lastCtx = ctx;
			const cwd = ctx.cwd;
			const arg = args.trim();

			if (arg === "clear") {
				const count = clearCompleted(cwd);
				refreshWidget(pi, cwd);
				ctx.ui.notify(`Cleared ${count} completed item${count === 1 ? "" : "s"}.`, "info");
				return;
			}

			const items = listItems(cwd);
			if (items.length === 0) {
				ctx.ui.notify("No todo items.", "info");
				return;
			}
			ctx.ui.notify(formatListText(items), "info");
		},
	});

	// Session start: load existing todos and render widget
	pi.on("session_start", (_event, ctx) => {
		lastCtx = ctx;
		const cwd = ctx.cwd;
		const todoPath = `${cwd}/.pi/todo.json`;
		if (!fs.existsSync(todoPath)) return;
		const store = readStore(cwd);
		if (store.items.length === 0) return;
		if (ctx.hasUI) {
			ctx.ui.setWidget(WIDGET_KEY, createWidgetComponent(store.items));
		}
	});

	// Session shutdown: clear widget
	pi.on("session_shutdown", (_event, ctx) => {
		if (ctx.hasUI) {
			ctx.ui.setWidget(WIDGET_KEY, undefined);
		}
	});
}

/** Format items as a plain text list for slash command output */
function formatListText(items: TodoItem[]): string {
	if (items.length === 0) return "No todo items.";
	const lines: string[] = [];
	for (const item of items) {
		const icon = item.status === "done" ? "[x]" : item.status === "in-progress" ? "[•]" : item.status === "blocked" ? "[!]" : "[ ]";
		const assignee = item.assignee ? ` · ${item.assignee}` : "";
		const blocked = item.blockedBy ? ` (blocked by ${item.blockedBy})` : "";
		lines.push(`${icon} ${item.id} [${item.priority.toUpperCase()}] ${item.text}${assignee}${blocked}`);
	}
	return lines.join("\n");
}
