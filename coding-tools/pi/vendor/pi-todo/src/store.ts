/**
 * File-based todo store — reads and writes .pi/todo.json in the project root.
 * All operations are synchronous to avoid race conditions (Node single-threaded).
 */

import * as fs from "node:fs";
import * as path from "node:path";

export type TodoStatus = "pending" | "in-progress" | "done" | "blocked";
export type TodoPriority = "low" | "medium" | "high" | "critical";

export interface TodoItem {
	id: string;
	text: string;
	status: TodoStatus;
	priority: TodoPriority;
	assignee: string | null;
	createdAt: string;
	updatedAt: string;
	blockedBy: string | null;
}

export interface TodoStore {
	items: TodoItem[];
	counter: number;
}

const DEFAULT_PRIORITY: TodoPriority = "medium";

/** Get the path to the todo file for the given project root */
export function getTodoPath(cwd: string): string {
	return path.join(cwd, ".pi", "todo.json");
}

/** Read the todo store from disk. Returns empty store if file doesn't exist. */
export function readStore(cwd: string): TodoStore {
	const todoPath = getTodoPath(cwd);
	try {
		const raw = fs.readFileSync(todoPath, "utf-8");
		const parsed = JSON.parse(raw) as TodoStore;
		if (!parsed.items || !Array.isArray(parsed.items)) {
			return { items: [], counter: 0 };
		}
		return parsed;
	} catch {
		return { items: [], counter: 0 };
	}
}

/** Write the todo store to disk. Creates .pi/ directory if needed. */
export function writeStore(cwd: string, store: TodoStore): void {
	const todoPath = getTodoPath(cwd);
	const dir = path.dirname(todoPath);
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(todoPath, JSON.stringify(store, null, "\t") + "\n", "utf-8");
}

/** Generate the next task ID */
function nextId(counter: number): string {
	return `T-${String(counter).padStart(3, "0")}`;
}

/** Create a new todo item */
export function addItem(
	cwd: string,
	text: string,
	priority?: TodoPriority,
	assignee?: string,
	blockedBy?: string,
): TodoItem {
	const store = readStore(cwd);
	store.counter += 1;
	const now = new Date().toISOString();
	const item: TodoItem = {
		id: nextId(store.counter),
		text,
		status: "pending",
		priority: priority ?? DEFAULT_PRIORITY,
		assignee: assignee ?? null,
		createdAt: now,
		updatedAt: now,
		blockedBy: blockedBy ?? null,
	};
	store.items.push(item);
	writeStore(cwd, store);
	return item;
}

/** Update an existing todo item by ID. Returns the updated item or null if not found. */
export function updateItem(
	cwd: string,
	id: string,
	updates: Partial<Pick<TodoItem, "text" | "status" | "priority" | "assignee" | "blockedBy">>,
): TodoItem | null {
	const store = readStore(cwd);
	const item = store.items.find((i) => i.id === id);
	if (!item) return null;
	if (updates.text !== undefined) item.text = updates.text;
	if (updates.status !== undefined) item.status = updates.status;
	if (updates.priority !== undefined) item.priority = updates.priority;
	if (updates.assignee !== undefined) item.assignee = updates.assignee;
	if (updates.blockedBy !== undefined) item.blockedBy = updates.blockedBy;
	item.updatedAt = new Date().toISOString();
	writeStore(cwd, store);
	return item;
}

/** Toggle status: pending → in-progress → done → pending. Returns updated item or null. */
export function toggleItem(cwd: string, id: string): TodoItem | null {
	const store = readStore(cwd);
	const item = store.items.find((i) => i.id === id);
	if (!item) return null;
	const cycle: Record<TodoStatus, TodoStatus> = {
		pending: "in-progress",
		"in-progress": "done",
		done: "pending",
		blocked: "in-progress",
	};
	item.status = cycle[item.status];
	item.updatedAt = new Date().toISOString();
	writeStore(cwd, store);
	return item;
}

/** Remove an item by ID. Returns true if removed, false if not found. */
export function removeItem(cwd: string, id: string): boolean {
	const store = readStore(cwd);
	const before = store.items.length;
	store.items = store.items.filter((i) => i.id !== id);
	if (store.items.length === before) return false;
	writeStore(cwd, store);
	return true;
}

/** List items, optionally filtered by status. */
export function listItems(cwd: string, filter?: string): TodoItem[] {
	const store = readStore(cwd);
	if (!filter || filter === "all") return store.items;
	return store.items.filter((i) => i.status === filter);
}

/** Remove all completed items. Returns the count removed. */
export function clearCompleted(cwd: string): number {
	const store = readStore(cwd);
	const before = store.items.length;
	store.items = store.items.filter((i) => i.status !== "done");
	const removed = before - store.items.length;
	if (removed > 0) writeStore(cwd, store);
	return removed;
}

/** Reorder an item up (earlier) or down (later) in the list. Returns true if moved. */
export function reorderItem(cwd: string, id: string, direction: "up" | "down"): boolean {
	const store = readStore(cwd);
	const index = store.items.findIndex((i) => i.id === id);
	if (index === -1) return false;
	if (direction === "up" && index === 0) return false;
	if (direction === "down" && index === store.items.length - 1) return false;
	const swapWith = direction === "up" ? index - 1 : index + 1;
	[store.items[index], store.items[swapWith]] = [store.items[swapWith]!, store.items[index]!];
	writeStore(cwd, store);
	return true;
}
