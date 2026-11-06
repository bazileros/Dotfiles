/**
 * Rendering upgrades — word-level diffs and syntax-highlighted shell output.
 *
 * Overrides only the renderers of the built-in edit and bash tools; execution
 * stays untouched.
 */

import type { BashToolDetails, EditToolDetails, ExtensionAPI, Theme } from "@earendil-works/pi-coding-agent";
import { createBashToolDefinition, createEditToolDefinition } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

const COMMAND_TOKEN =
	/(\s+)|("(?:[^"\\]|\\.)*"|'[^']*')|(\$\{?[A-Za-z_][A-Za-z0-9_]*\}?)|(\|\||&&|\||;|>>|<<|>|<)|(--?[A-Za-z0-9][A-Za-z0-9-]*)|([^\s|;&<>]+)/g;

function highlightCommand(command: string, t: Theme): string {
	let out = "";
	let expectCommand = true;
	let last = 0;

	for (const match of command.matchAll(COMMAND_TOKEN)) {
		const index = match.index ?? 0;
		if (index > last) out += command.slice(last, index);
		last = index + match[0].length;
		const token = match[0];

		if (match[1]) {
			out += token;
			continue;
		}
		if (match[2]) {
			out += t.fg("success", token);
			expectCommand = false;
			continue;
		}
		if (match[3]) {
			out += t.fg("mdCode", token);
			expectCommand = false;
			continue;
		}
		if (match[4]) {
			out += t.fg("syntaxOperator", token);
			expectCommand = true;
			continue;
		}
		if (match[5]) {
			out += t.fg("warning", token);
			continue;
		}
		if (expectCommand) {
			out += t.fg("accent", token);
			expectCommand = false;
		} else if (token.includes("/") || token.startsWith(".")) {
			out += t.fg("mdLink", token);
		} else {
			out += t.fg("text", token);
		}
	}

	if (last < command.length) out += command.slice(last);
	return out;
}

const PLAIN_TOKEN =
	/(https?:\/\/[^\s]+)|("[^"\n]*"|'[^'\n]*')|(\b[0-9a-f]{7,40}\b)|(\b\d+(?:[.,]\d+)?[kKmMgG]?\b)|((?:\.{0,2}\/)?[\w@.-]+(?:\/[\w@.-]+)+|[\w@-]+\.(?:ts|tsx|js|jsx|mjs|cjs|json|jsonl|md|py|go|rs|css|scss|html|yml|yaml|toml|sh|sql|lock|txt))/g;

function highlightPlain(line: string, t: Theme): string {
	let out = "";
	let last = 0;

	for (const match of line.matchAll(PLAIN_TOKEN)) {
		const index = match.index ?? 0;
		if (index > last) out += t.fg("text", line.slice(last, index));
		last = index + match[0].length;
		const token = match[0];

		if (match[1]) out += t.fg("mdLink", token);
		else if (match[2]) out += t.fg("success", token);
		else if (match[3]) out += t.fg("warning", token);
		else if (match[4]) out += t.fg("syntaxNumber", token);
		else out += t.fg("mdLink", token);
	}

	if (last < line.length) out += t.fg("text", line.slice(last));
	return out;
}

function highlightOutput(text: string, t: Theme): string[] {
	const lines = text.split("\n");
	const out: string[] = [];
	let inDiff = false;

	for (const line of lines) {
		if (/^diff --git\b/.test(line)) {
			inDiff = true;
			out.push(t.bold(t.fg("accent", line)));
			continue;
		}
		if (inDiff) {
			if (/^(@@|index |new file|deleted file|similarity|rename )/.test(line)) {
				out.push(t.fg("dim", line));
				continue;
			}
			if (/^(\+\+\+|---)/.test(line)) {
				out.push(t.fg("dim", line));
				continue;
			}
			if (line.startsWith("+")) {
				out.push(t.fg("success", line));
				continue;
			}
			if (line.startsWith("-")) {
				out.push(t.fg("error", line));
				continue;
			}
			if (line.startsWith(" ")) {
				out.push(t.fg("toolDiffContext", line));
				continue;
			}
		}

		// Pi's own line-numbered diff format: " 12 text", "-12 text", "+12 text"
		const diffRow = line.match(/^([ +-])\s*(\d+)\s(.*)$/);
		if (diffRow) {
			const marker = diffRow[1];
			const number = t.fg("toolDiffContext", diffRow[2].padStart(3));
			if (marker === "+") {
				out.push(`${t.fg("success", "+")} ${number} ${t.fg("success", diffRow[3])}`);
				continue;
			}
			if (marker === "-") {
				out.push(`${t.fg("error", "-")} ${number} ${t.fg("error", diffRow[3])}`);
				continue;
			}
			out.push(`${t.fg("toolDiffContext", " ")} ${number} ${t.fg("toolDiffContext", diffRow[3])}`);
			continue;
		}

		if (/^\s*\.\.\.\s*$/.test(line)) {
			out.push(t.fg("dim", line));
			continue;
		}

		const lower = line.toLowerCase();
		if (/\b(error|exception|traceback|fatal|failed|failure|denied|refused)\b/.test(lower)) {
			out.push(t.fg("error", line));
			continue;
		}
		if (/\b(warn|warning|deprecated)\b/.test(lower)) {
			out.push(t.fg("warning", line));
			continue;
		}
		if (/^\s*(✗|✘|fail\b|failing\b)/i.test(line)) {
			out.push(t.fg("error", line));
			continue;
		}
		if (/^\s*(✓|✔|ok\b|done\b|success\b|passed\b|clean\b)/i.test(line)) {
			out.push(t.fg("success", line));
			continue;
		}
		if (/^\s*(#|\/\/)/.test(line)) {
			out.push(t.fg("syntaxComment", line));
			continue;
		}

		out.push(highlightPlain(line, t));
	}

	return out;
}

interface DiffRow {
	kind: "context" | "add" | "del" | "sep";
	num?: string;
	text: string;
}

function parseDiff(diff: string): DiffRow[] {
	return diff.split("\n").map((line) => {
		if (/^\s*\.\.\.\s*$/.test(line)) return { kind: "sep", text: "..." };
		const match = line.match(/^([ +-])\s*(\d+)\s(.*)$/);
		if (!match) return { kind: "context", text: line };
		const kind = match[1] === "+" ? "add" : match[1] === "-" ? "del" : "context";
		return { kind, num: match[2], text: match[3] };
	});
}

function splitChange(a: string, b: string) {
	let prefix = 0;
	while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
	let suffix = 0;
	while (
		suffix < a.length - prefix &&
		suffix < b.length - prefix &&
		a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
	) {
		suffix++;
	}
	return {
		aPre: a.slice(0, prefix),
		aMid: a.slice(prefix, a.length - suffix),
		aSuf: a.slice(a.length - suffix),
		bPre: b.slice(0, prefix),
		bMid: b.slice(prefix, b.length - suffix),
		bSuf: b.slice(b.length - suffix),
	};
}

function rowNumber(row: DiffRow, t: Theme): string {
	return t.fg("toolDiffContext", (row.num ?? "").padStart(3));
}

function contextLine(row: DiffRow, t: Theme): string {
	return `${t.fg("toolDiffContext", " ")} ${rowNumber(row, t)} ${t.fg("toolDiffContext", row.text)}`;
}

function changedLine(row: DiffRow, pre: string, mid: string, suf: string, t: Theme, add: boolean): string {
	const color = add ? "success" : "error";
	const marker = t.fg(color, add ? "+" : "-");
	const body =
		t.fg("toolDiffContext", pre) +
		(mid ? t.bold(t.fg(color, mid)) : "") +
		t.fg("toolDiffContext", suf);
	return `${marker} ${rowNumber(row, t)} ${body}`;
}

function renderDiffRows(rows: DiffRow[], t: Theme): string[] {
	const out: string[] = [];
	let i = 0;

	while (i < rows.length) {
		const row = rows[i];

		if (row.kind === "del") {
			const dels: DiffRow[] = [];
			while (i < rows.length && rows[i].kind === "del") dels.push(rows[i++]);
			const adds: DiffRow[] = [];
			while (i < rows.length && rows[i].kind === "add") adds.push(rows[i++]);

			const count = Math.max(dels.length, adds.length);
			for (let k = 0; k < count; k++) {
				const d = dels[k];
				const a = adds[k];
				if (d && a) {
					const w = splitChange(d.text, a.text);
					out.push(changedLine(d, w.aPre, w.aMid, w.aSuf, t, false));
					out.push(changedLine(a, w.bPre, w.bMid, w.bSuf, t, true));
				} else if (d) {
					out.push(changedLine(d, "", d.text, "", t, false));
				} else if (a) {
					out.push(changedLine(a, "", a.text, "", t, true));
				}
			}
			continue;
		}

		if (row.kind === "add") {
			out.push(changedLine(row, "", row.text, "", t, true));
			i++;
			continue;
		}

		if (row.kind === "sep") {
			out.push(t.fg("dim", "    ..."));
			i++;
			continue;
		}

		out.push(contextLine(row, t));
		i++;
	}

	return out;
}

export default function (pi: ExtensionAPI) {
	const cwd = process.cwd();

	// --- edit: faded context, colored + word-level changes ---
	const originalEdit = createEditToolDefinition(cwd);
	pi.registerTool({
		...originalEdit,

		renderCall(args, theme) {
			return new Text(theme.fg("toolTitle", theme.bold("edit ")) + theme.fg("accent", args.path), 0, 0);
		},

		renderResult(result, { expanded, isPartial }, theme, context) {
			if (isPartial) return new Text(theme.fg("warning", "editing…"), 0, 0);

			const details = result.details as EditToolDetails | undefined;
			const content = result.content[0];
			if (content?.type === "text" && content.text.startsWith("Error")) {
				return new Text(theme.fg("error", content.text.split("\n")[0] ?? "edit failed"), 0, 0);
			}
			if (!details?.diff) return new Text(theme.fg("success", "✓ applied"), 0, 0);

			const rows = parseDiff(details.diff);
			const adds = rows.filter((r) => r.kind === "add").length;
			const dels = rows.filter((r) => r.kind === "del").length;
			const path = (context.args as { path?: string } | undefined)?.path ?? "";

			const header =
				theme.fg("toolTitle", theme.bold("edit ")) +
				theme.fg("accent", path) +
				"  " +
				theme.fg("success", `+${adds}`) +
				theme.fg("dim", " ") +
				theme.fg("error", `-${dels}`);

			const body = renderDiffRows(rows, theme);
			const limit = expanded ? body.length : 14;
			const shown = body.slice(0, limit);
			if (!expanded && body.length > limit) {
				shown.push(theme.fg("dim", `… ${body.length - limit} more lines (ctrl+o)`));
			}

			return new Text([header, ...shown].join("\n"), 0, 0);
		},
	});

	// --- bash: highlighted command and output ---
	const originalBash = createBashToolDefinition(cwd);
	pi.registerTool({
		...originalBash,

		renderCall(args, theme) {
			return new Text(theme.fg("toolTitle", theme.bold("$ ")) + highlightCommand(args.command, theme), 0, 0);
		},

		renderResult(result, { expanded, isPartial }, theme) {
			if (isPartial) return new Text(theme.fg("warning", "running…"), 0, 0);

			const details = result.details as BashToolDetails | undefined;
			const content = result.content[0];
			const output = content?.type === "text" ? content.text : "";
			const exitMatch = output.match(/exit code: (\d+)/);
			const exitCode = exitMatch ? Number(exitMatch[1]) : 0;
			const lines = highlightOutput(output.replace(/\n?exit code: \d+\s*$/, ""), theme);

			const status =
				exitCode === 0
					? theme.fg("success", "✓")
					: theme.fg("error", `✗ exit ${exitCode}`);
			const header = status + theme.fg("dim", ` · ${lines.length} lines${details?.truncation?.truncated ? " · truncated" : ""}`);

			const limit = expanded ? lines.length : 14;
			const shown = lines.slice(0, limit);
			if (!expanded && lines.length > limit) {
				shown.push(theme.fg("dim", `… ${lines.length - limit} more lines (ctrl+o)`));
			}

			return new Text([header, ...shown].join("\n"), 0, 0);
		},
	});
}
