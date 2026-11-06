/**
 * TUI rendering for the todo extension — widget and tool result components
 */

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Container, Text, type Component, type TUI } from "@earendil-works/pi-tui";
import type { TodoItem, TodoStatus, TodoPriority } from "./store.ts";

type Theme = ExtensionContext["ui"]["theme"];

/**
 * BorderedBox — a container that draws a Unicode box border around its children.
 * The border color is controlled by the `colorFn` argument (e.g. theme.fg("success", ...)).
 */
class BorderedBox implements Component {
	private children: Component[] = [];
	private colorFn: (text: string) => string;
	private cachedLines: string[] | null = null;
	private cachedWidth: number | null = null;

	constructor(colorFn: (text: string) => string) {
		this.colorFn = colorFn;
	}

	addChild(component: Component): void {
		this.children.push(component);
		this.invalidate();
	}

	invalidate(): void {
		this.cachedLines = null;
		this.cachedWidth = null;
		for (const child of this.children) {
			child.invalidate?.();
		}
	}

	render(width: number): string[] {
		// Cache hit
		if (this.cachedLines && this.cachedWidth === width) {
			return this.cachedLines;
		}

		// Inner width: total - 2 (left/right border chars)
		const innerWidth = Math.max(0, width - 2);

		// Render all children into flat line array
		const innerLines: string[] = [];
		for (const child of this.children) {
			const rendered = child.render(innerWidth);
			for (const line of rendered) {
				innerLines.push(line);
			}
		}

		const c = this.colorFn;
		const topLeft = c("┌");
		const topRight = c("┐");
		const bottomLeft = c("└");
		const bottomRight = c("┘");
		const horizontal = c("─");
		const vertical = c("│");

		const lines: string[] = [];

		// Top border
		lines.push(`${topLeft}${horizontal.repeat(innerWidth)}${topRight}`);

		// Middle rows
		for (const inner of innerLines) {
			lines.push(`${vertical}${inner}${vertical}`);
		}

		// Bottom border
		lines.push(`${bottomLeft}${horizontal.repeat(innerWidth)}${bottomRight}`);

		this.cachedLines = lines;
		this.cachedWidth = width;
		return lines;
	}
}

const STATUS_ICON: Record<TodoStatus, string> = {
	pending: "[ ]",
	"in-progress": "[•]",
	done: "[x]",
	blocked: "[!]",
};

const PRIORITY_LABEL: Record<TodoPriority, string> = {
	low: "LOW",
	medium: "MED",
	high: "HIGH",
	critical: "CRIT",
};

const PRIORITY_COLOR: Record<TodoPriority, string> = {
	low: "dim",
	medium: "dim",
	high: "warning",
	critical: "error",
};

/** Truncate text to fit within maxWidth (visible characters) */
function truncate(text: string, maxWidth: number): string {
	if (text.length <= maxWidth) return text;
	return text.slice(0, maxWidth - 1) + "…";
}

/** Build the widget content lines for the todo list */
export function buildWidgetLines(items: TodoItem[], theme: Theme, width: number): string[] {
	if (items.length === 0) return [];

	const lines: string[] = [];
	const header = `${theme.fg("accent", theme.bold("TODO"))} ${theme.fg("dim", `· ${items.length} task${items.length === 1 ? "" : "s"}`)}`;
	lines.push(truncate(header, width));

	const pending = items.filter((i) => i.status === "pending").length;
	const inProgress = items.filter((i) => i.status === "in-progress").length;
	const done = items.filter((i) => i.status === "done").length;
	const blocked = items.filter((i) => i.status === "blocked").length;

	const parts: string[] = [];
	if (pending > 0) parts.push(`${pending} pending`);
	if (inProgress > 0) parts.push(`${inProgress} active`);
	if (blocked > 0) parts.push(`${blocked} blocked`);
	if (done > 0) parts.push(`${done} done`);
	if (parts.length > 0) {
		lines.push(truncate(`  ${theme.fg("dim", parts.join(" · "))}`, width));
	}

	const maxItems = Math.min(items.length, 8);
	for (let i = 0; i < maxItems; i++) {
		const item = items[i]!;
		const icon = STATUS_ICON[item.status];
		const priColor = PRIORITY_COLOR[item.priority] ?? "dim";
		const priLabel = PRIORITY_LABEL[item.priority] ?? "MED";
		const assignee = item.assignee ? ` ${theme.fg("dim", `· ${item.assignee}`)}` : "";
		const blocked = item.blockedBy ? ` ${theme.fg("error", `(blocked by ${item.blockedBy})`)}` : "";
		const text = truncate(item.text, width - 20);
		lines.push(
			truncate(`  ${icon} ${theme.fg(priColor, `[${priLabel}]`)} ${text}${assignee}${blocked}`, width),
		);
	}

	if (items.length > maxItems) {
		lines.push(truncate(`  ${theme.fg("dim", `… and ${items.length - maxItems} more`)}`, width));
	}

	return lines;
}

/** Create the widget component factory for setWidget() */
export function createWidgetComponent(items: TodoItem[]): (tui: unknown, theme: Theme) => Component {
	return (_tui: unknown, theme: Theme) => {
		const width = process.stdout.columns || 120;
		const lines = buildWidgetLines(items, theme, width);
		const box = new BorderedBox((text: string) => theme.fg("success", text));
		for (const line of lines) {
			box.addChild(new Text(line, 1, 0));
		}
		return box;
	};
}

/** Render the tool result as a text summary */
export function renderTodoResult(items: TodoItem[], theme: Theme, width: number): Component {
	const container = new Container();
	container.addChild(new Text("", 0, 0));

	if (items.length === 0) {
		container.addChild(new Text(theme.fg("dim", "  No todo items found."), 0, 0));
		return container;
	}

	for (const item of items) {
		const icon = STATUS_ICON[item.status];
		const priColor = PRIORITY_COLOR[item.priority] ?? "dim";
		const priLabel = PRIORITY_LABEL[item.priority] ?? "MED";
		const assignee = item.assignee ? ` · ${item.assignee}` : "";
		const blocked = item.blockedBy ? ` (blocked by ${item.blockedBy})` : "";
		const text = truncate(item.text, width - 25);
		container.addChild(
			new Text(
				`  ${icon} ${theme.bold(item.id)} ${theme.fg(priColor, `[${priLabel}]`)} ${text}${theme.fg("dim", assignee)}${blocked ? theme.fg("error", blocked) : ""}`,
				0,
				0,
			),
		);
	}

	return container;
}
