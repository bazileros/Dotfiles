/**
 * Guardrails — confirms destructive shell commands, asks before any access to
 * `.env*` or other credential files, and redacts secret values from output.
 */

import {
	createLocalBashOperations,
	type ExtensionAPI,
	isToolCallEventType,
	type ToolCallEvent,
} from "@earendil-works/pi-coding-agent";
import {
	commandTouchesSecrets,
	isSecretPath,
	redactSecrets,
	redactValue,
	type SecretHit,
} from "./lib/secrets.ts";

interface Rule {
	pattern: RegExp;
	label: string;
}

const BASH_RULES: Rule[] = [
	{ pattern: /\brm\s+(-[^\s]+\s+)*\/(\s|$)/, label: "recursive delete of /" },
	{ pattern: /\brm\s+(-[^\s]+\s+)*(~|\$HOME)(\/|\s|$)/, label: "recursive delete of home" },
	{ pattern: /\brm\s+-[^\s]*[rR][^\s]*f|\brm\s+-[^\s]*f[^\s]*[rR]/, label: "recursive force delete" },
	{ pattern: /\bsudo\b/, label: "sudo" },
	{ pattern: /\bgit\s+push\b[^\n]*(--force\b|\s-f\b)/, label: "force push" },
	{ pattern: /\bgit\s+reset\s+--hard\b/, label: "hard reset" },
	{ pattern: /\bgit\s+clean\s+-[^\s]*f/, label: "git clean -f" },
	{ pattern: /\bgit\s+checkout\s+(--\s+)?\.\s*$/, label: "discard all working-tree changes" },
	{ pattern: /\bchmod\s+(-[^\s]+\s+)*777\b/, label: "chmod 777" },
	{ pattern: /\b(curl|wget)\b[^\n|]*\|\s*(sudo\s+)?(ba|z|da)?sh\b/, label: "pipe download into a shell" },
	{ pattern: /\b(DROP|TRUNCATE)\s+(TABLE|DATABASE)\b/i, label: "destructive SQL" },
	{ pattern: /\bnpm\s+publish\b/, label: "npm publish" },
	{ pattern: /\b(docker\s+(system|volume)\s+prune|docker\s+rm\s+-f)/, label: "docker cleanup" },
	{ pattern: /\bdd\b[^\n]*\bof=\/dev\/(sd|nvme|hd)/, label: "raw disk write" },
	{ pattern: /:\(\)\s*\{.*\}\s*;\s*:/, label: "fork bomb" },
];

const PROTECTED_PATHS: Array<{ test: (p: string) => boolean; label: string }> = [
	{ test: (p) => /(^|\/)\.git(\/|$)/.test(p), label: "git internals" },
	{ test: (p) => /(^|\/)node_modules(\/|$)/.test(p), label: "installed dependencies" },
];

function secretHitForTool(event: ToolCallEvent, cwd: string): SecretHit | undefined {
	if (isToolCallEventType("bash", event)) {
		return commandTouchesSecrets(event.input.command);
	}
	if (isToolCallEventType("read", event)) {
		return isSecretPath(event.input.path, cwd);
	}
	if (isToolCallEventType("grep", event)) {
		const path = event.input.path;
		const glob = event.input.glob;
		return (
			(path ? isSecretPath(path, cwd) ?? commandTouchesSecrets(path) : undefined) ??
			(glob ? commandTouchesSecrets(glob) : undefined)
		);
	}
	if (isToolCallEventType("write", event) || isToolCallEventType("edit", event)) {
		return isSecretPath(event.input.path, cwd);
	}
	return undefined;
}

function blocked(message: string) {
	return { output: message, exitCode: 1, cancelled: false, truncated: false };
}

export default function (pi: ExtensionAPI) {
	pi.on("tool_call", async (event, ctx) => {
		if (isToolCallEventType("bash", event)) {
			const command = event.input.command;
			const rule = BASH_RULES.find((r) => r.pattern.test(command));
			if (rule) {
				if (!ctx.hasUI) {
					return { block: true, reason: `Blocked in non-interactive mode: ${rule.label}` };
				}
				const preview = command.length > 400 ? `${command.slice(0, 400)}…` : command;
				const ok = await ctx.ui.confirm(`⚠️  ${rule.label}`, `${redactSecrets(preview)}\n\nRun it?`);
				if (!ok) return { block: true, reason: `Blocked by user: ${rule.label}` };
			}
		}

		if (isToolCallEventType("write", event) || isToolCallEventType("edit", event)) {
			const path = event.input.path;
			const hit = PROTECTED_PATHS.find((p) => p.test(path));
			if (hit) {
				ctx.ui.notify(`Blocked ${hit.label}: ${path}`, "warning");
				return { block: true, reason: `"${path}" is protected (${hit.label})` };
			}
		}

		const secret = secretHitForTool(event, ctx.cwd);
		if (!secret) return undefined;

		if (!ctx.hasUI) {
			return {
				block: true,
				reason: `Blocked in non-interactive mode: ${secret.label} access needs confirmation`,
			};
		}

		const preview = isToolCallEventType("bash", event)
			? event.input.command
			: isToolCallEventType("grep", event)
				? `${event.input.pattern}${event.input.path ? ` in ${event.input.path}` : ""}`
				: String((event.input as { path?: string }).path ?? "");
		const ok = await ctx.ui.confirm(
			`🔒 ${secret.label}`,
			`${secret.detail}\n\n${redactSecrets(preview.length > 500 ? `${preview.slice(0, 500)}…` : preview)}\n\nAllow this one access? Secret values are redacted from the result.`,
		);
		if (!ok) return { block: true, reason: `Blocked by user: ${secret.label}` };
		return undefined;
	});

	pi.on("tool_result", async (event) => {
		const content = event.content.map((part) =>
			part.type === "text" ? { ...part, text: redactSecrets(part.text) } : part,
		);
		const details = redactValue(event.details);
		const structuredContent =
			event.structuredContent === undefined ? undefined : redactValue(event.structuredContent);

		return structuredContent === undefined
			? { content, details }
			: { content, details, structuredContent };
	});

	pi.on("user_bash", async (event, ctx) => {
		const secret = commandTouchesSecrets(event.command);
		if (!secret) return undefined;

		if (!ctx.hasUI) {
			return { result: blocked(`Blocked in non-interactive mode: ${secret.label}`) };
		}

		const ok = await ctx.ui.confirm(
			`🔒 ${secret.label}`,
			`${secret.detail}\n\n${redactSecrets(event.command)}\n\nAllow this one access? Secret values are redacted from the output.`,
		);
		if (!ok) return { result: blocked(`Blocked by user: ${secret.label}`) };

		const local = createLocalBashOperations();
		return {
			operations: {
				exec(command: string, cwd: string, options: Parameters<typeof local.exec>[2]) {
					// Secret commands (env, cat .env) are short-lived: buffer the output so
					// multi-line blocks are redacted as a whole before display.
					let output = "";
					return local
						.exec(command, cwd, {
							...options,
							onData: (data: Buffer) => {
								output += data.toString();
							},
						})
						.then((code) => {
							const redacted = redactSecrets(output);
							if (redacted) options.onData(Buffer.from(redacted));
							return code;
						});
				},
			},
		};
	});
}
