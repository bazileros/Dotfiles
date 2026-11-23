/**
 * Pure helpers for ghostex-board-bridge: no pi imports, no I/O, no subprocesses.
 * Lives in a subdirectory without an `index.ts`, so pi never loads it as an extension.
 * Tests: ~/.pi/agent/tests/ghostex-board-bridge.test.ts (`bun test`).
 */

export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
export interface JsonObject {
	[key: string]: JsonValue;
}

export const DEFAULT_STATUSES = ["open", "in_progress", "blocked", "deferred", "closed"] as const;
export const CUSTOM_STATUSES = ["backlog", "test", "review"] as const;

interface BoardLink {
	beadId?: string;
	agentSessionId?: string;
	agentSessionPath?: string;
}

/** `Work on bead <id> (<id>): <title>` is the first line of a dispatched worker prompt. */
export function parseBeadIdFromPrompt(prompt: string): string | null {
	const match = /Work on bead\s+([A-Za-z0-9][A-Za-z0-9._-]*)/.exec(prompt ?? "");
	return match ? match[1] : null;
}

/** Walk an arbitrary `ghostex state` document and return the bead linked to this session. */
export function findLinkedBead(
	state: JsonValue,
	sessionId: string | undefined,
	sessionPath: string | undefined,
): string | null {
	const links: BoardLink[] = [];
	const visit = (node: JsonValue): void => {
		if (node === null || typeof node !== "object") return;
		if (Array.isArray(node)) {
			for (const item of node) visit(item);
			return;
		}
		const record = node as JsonObject;
		const candidate = record.beadConversationLinks;
		if (Array.isArray(candidate)) {
			for (const link of candidate) {
				if (link && typeof link === "object" && !Array.isArray(link)) links.push(link as BoardLink);
			}
		}
		for (const value of Object.values(record)) visit(value);
	};
	visit(state);

	for (const link of links) {
		if (!link.beadId) continue;
		if (sessionId && link.agentSessionId === sessionId) return link.beadId;
		if (sessionPath && link.agentSessionPath === sessionPath) return link.beadId;
	}
	return null;
}

/** Reject anything outside the board's configured swimlanes. */
export function validateStatus(status: string, custom: readonly string[] = CUSTOM_STATUSES): string | null {
	const value = (status ?? "").trim().toLowerCase();
	const allowed = new Set<string>([...DEFAULT_STATUSES, ...custom]);
	return allowed.has(value) ? value : null;
}

/** The board renders `Agent:`/`Session:` trailers on comments; keep that shape automated. */
export function formatComment(text: string, agentName: string, sessionId: string | undefined): string {
	const trailer = `Agent: ${agentName}${sessionId ? `\nSession: ${sessionId}` : ""}`;
	return `${text.trim()}\n\n${trailer}`;
}

export function buildCreateArgs(input: {
	title: string;
	description?: string;
	type?: string;
	priority?: number;
	parent?: string;
	labels?: string[];
}): string[] {
	const args = ["create", input.title, "--json"];
	if (input.description) args.push("--description", input.description);
	args.push("--type", input.type ?? "task");
	if (typeof input.priority === "number") args.push("--priority", `P${input.priority}`);
	if (input.parent) args.push("--parent", input.parent);
	if (input.labels?.length) args.push("--labels", input.labels.join(","));
	return args;
}

/** `git status --porcelain` output means uncommitted work: a card may not close over it. */
export function isDirtyTree(porcelainOutput: string): boolean {
	return porcelainOutput.trim().length > 0;
}

export function summarizeBead(bead: JsonObject): string {
	const id = String(bead.id ?? "?");
	const title = String(bead.title ?? "");
	const status = String(bead.status ?? "?");
	const ac = typeof bead.acceptance_criteria === "string" ? bead.acceptance_criteria : "";
	const deps = Number(bead.dependency_count ?? 0);
	const lines = [`${id} · ${status} · ${title}`];
	if (ac) lines.push(`Acceptance: ${ac}`);
	if (deps > 0) lines.push(`Blocked by ${deps} dependency(ies) — check \`bd show ${id}\` first.`);
	return lines.join("\n");
}
