/**
 * TypeBox parameter schema for the todo tool
 */

import { Type } from "typebox";

const StatusEnum = Type.Unsafe({
	type: "string",
	enum: ["pending", "in-progress", "done", "blocked"],
	description: "Task status: pending, in-progress, done, or blocked",
});

const PriorityEnum = Type.Unsafe({
	type: "string",
	enum: ["low", "medium", "high", "critical"],
	description: "Task priority: low, medium, high, or critical",
});

const ActionEnum = Type.Unsafe({
	type: "string",
	enum: ["add", "update", "toggle", "remove", "list", "clear", "reorder"],
	description: "Action to perform on the todo list",
});

const FilterEnum = Type.Unsafe({
	type: "string",
	enum: ["all", "pending", "in-progress", "done", "blocked"],
	description: "Filter for list action: all, pending, in-progress, done, or blocked",
});

const DirectionEnum = Type.Unsafe({
	type: "string",
	enum: ["up", "down"],
	description: "Reorder direction: up (earlier) or down (later)",
});

export const TodoParams = Type.Object({
	action: ActionEnum,
	id: Type.Optional(Type.String({ description: "Task ID (e.g. T-001). Required for update, toggle, remove, reorder." })),
	text: Type.Optional(Type.String({ description: "Task description text. Required for add, optional for update." })),
	status: Type.Optional(StatusEnum),
	priority: Type.Optional(PriorityEnum),
	assignee: Type.Optional(Type.String({ description: "Who is assigned to this task (e.g. Ultron, Marcus, Quinn)" })),
	filter: Type.Optional(FilterEnum),
	blockedBy: Type.Optional(Type.String({ description: "Task ID this item is blocked by (null to clear)" })),
	direction: Type.Optional(DirectionEnum),
});
