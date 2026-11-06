/**
 * Secret detection and redaction.
 *
 * Access to secret-bearing paths and commands is gated in guardrails.ts; this
 * module also masks any literal secret that still reaches tool output, so a
 * confirmed read never prints the value.
 */

import { homedir } from "node:os";
import { basename, resolve } from "node:path";

export interface SecretHit {
	label: string;
	detail: string;
}

const ENV_EXAMPLE = /^\.env\.(example|sample|template|dist|schema|defaults)$/i;

const SECRET_BASENAME: RegExp[] = [
	/^\.env$/i,
	/^\.env\.[A-Za-z0-9._-]+$/i,
	/^\.envrc$/i,
	/^\.npmrc$/i,
	/^\.pypirc$/i,
	/^\.netrc$/i,
	/^\.git-credentials$/i,
	/^\.htpasswd$/i,
	/^id_(rsa|dsa|ecdsa|ed25519)$/i,
	/^credentials(\.json)?$/i,
	/^secrets?\.(json|ya?ml|toml)$/i,
	/^auth\.json$/i,
	/^\.?tfstate(\.backup)?$/i,
	/\.(pem|key|p12|pfx|jks|keystore)$/i,
];

const SECRET_PATH: Array<{ re: RegExp; label: string }> = [
	{ re: /(^|\/)\.ssh\//, label: "ssh" },
	{ re: /(^|\/)\.aws\//, label: "aws" },
	{ re: /(^|\/)\.kube\/config$/, label: "kube" },
	{ re: /(^|\/)\.docker\/config\.json$/, label: "docker" },
	{ re: /(^|\/)\.config\/gh\/hosts\.ya?ml$/, label: "gh" },
	{ re: /(^|\/)\.pi\/agent\/auth\.json$/, label: "pi auth" },
];

const ENV_REF = /(?:^|[\s'"=:(/])\.env(\.[A-Za-z0-9._-]+)?(?=$|[\s'"),:;|&*?[{])/gi;
const SECRET_FILE_REF =
	/(?:^|[\s'"=:(/])(?:\.ssh\/|~?\/?.*\/\.ssh\/|\.npmrc|\.pypirc|\.netrc|\.git-credentials|\.htpasswd|id_rsa|id_ed25519|id_ecdsa|credentials(?:\.json)?|secrets?\.(?:json|ya?ml|toml)|auth\.json|\.?tfstate|[\w./-]+\.(?:pem|key|p12|pfx|jks|keystore))(?=$|[\s'"),:;|&])/i;
const PRINT_COMMAND = /(^|[;&|]\s*|\s)(?:env|printenv|set|export\s+-p|declare\s+-x|compgen\s+-v)(?=\s|$)/;
const ENV_FLAG = /(?:--env-file(?:=|\s+)\S+|(?:-r|--require)\s+dotenv\/config|\bdotenv\b)/i;
const SECRET_VAR = /\$\{?[A-Za-z0-9_]*(?:SECRET|TOKEN|PASS|PWD|KEY|CRED|AUTH|PRIVATE|DSN)[A-Za-z0-9_]*\}?/i;
const SECRET_TOOL =
	/\b(?:pass\s+show|op\s+read|bw\s+get|security\s+find-(?:generic|internet)-password|secret-tool\s+lookup|keychain)\b/i;
const CURL_CREDENTIALS = /\bcurl\b[^\n]*(?:-u|--user)\s+['"]?[^:\s'"]+:[^\s'"]+/i;

const SECRET_KEY =
	/(^|[_.-])(secret|token|passw(?:or)?d|pwd|api[_-]?key|private[_-]?key|access[_-]?key|credential|auth|bearer|dsn|database[_-]?url|connection[_-]?string|client[_-]?secret|signing[_-]?key|encryption[_-]?key|session[_-]?key)([_.-]|$)/i;

const PLACEHOLDER =
	/^(?:|null|undefined|true|false|yes|no|\d+(?:\.\d+)?|\*+|x+|\.\.\.|redacted|\$\{?[A-Za-z_][A-Za-z0-9_]*\}?|process\.env\.[A-Za-z0-9_]+|env\.[A-Za-z0-9_]+|<[^>]*>|your[-_].*|change[-_]?me|placeholder|example|dummy)$/i;

/** Resolve a tool path and report whether it names a secret-bearing file. */
export function isSecretPath(input: string, cwd = process.cwd()): SecretHit | undefined {
	if (!input) return undefined;

	const expanded = input.startsWith("~/")
		? resolve(homedir(), input.slice(2))
		: input === "~"
			? homedir()
			: input;
	const absolute = resolve(cwd, expanded);
	const name = basename(absolute);
	if (ENV_EXAMPLE.test(name)) return undefined;

	for (const pattern of SECRET_BASENAME) {
		if (pattern.test(name)) return { label: "secret file", detail: name };
	}

	const normalized = absolute.replaceAll("\\", "/");
	for (const rule of SECRET_PATH) {
		if (rule.re.test(normalized)) return { label: `${rule.label} credentials`, detail: name };
	}

	return undefined;
}

/** Report whether a shell command reads, dumps or otherwise handles secrets. */
export function commandTouchesSecrets(command: string): SecretHit | undefined {
	if (!command) return undefined;

	let sawEnv = false;
	for (const match of command.matchAll(ENV_REF)) {
		const suffix = match[1] ?? "";
		if (!suffix || !ENV_EXAMPLE.test(`.env${suffix}`)) {
			sawEnv = true;
			break;
		}
	}
	if (sawEnv) return { label: "environment secrets", detail: ".env" };

	if (SECRET_FILE_REF.test(command)) return { label: "credential file", detail: "secret path" };
	if (PRINT_COMMAND.test(command)) return { label: "environment dump", detail: "env/printenv" };
	if (ENV_FLAG.test(command)) return { label: "dotenv loading", detail: "env file" };
	if (SECRET_VAR.test(command)) return { label: "secret variable", detail: "shell expansion" };
	if (SECRET_TOOL.test(command)) return { label: "secret store", detail: "password manager" };
	if (CURL_CREDENTIALS.test(command)) return { label: "inline credentials", detail: "curl --user" };

	return undefined;
}

const TOKEN_PATTERNS: Array<[RegExp, string]> = [
	[/\bAKIA[0-9A-Z]{16}\b/g, "AKIA***"],
	[/\bASIA[0-9A-Z]{16}\b/g, "ASIA***"],
	[/\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, "gh*_***"],
	[/\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, "github_pat_***"],
	[/\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}\b/g, "sk-***"],
	[/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, "xox*-***"],
	[/\bAIza[0-9A-Za-z_-]{30,}\b/g, "AIza***"],
	[/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "eyJ***"],
	[
		/\b(https?|postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s:@/]+:[^\s@/]+@/gi,
		"$1://***:***@",
	],
	[/(\bBearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, "$1***"],
	[/(\bBasic\s+)[A-Za-z0-9+/=]{8,}/gi, "$1***"],
];

/** Mask literal secrets in an arbitrary string. */
export function redactSecrets(text: string): string {
	if (!text) return text;
	let out = text;

	out = out.replace(
		/-----BEGIN ([A-Z ]*PRIVATE KEY)-----[\s\S]*?-----END \1-----/g,
		"-----BEGIN $1----- [redacted] -----END $1-----",
	);

	for (const [pattern, replacement] of TOKEN_PATTERNS) {
		out = out.replace(pattern, replacement);
	}

	out = out.replace(
		/\b(Authorization|Proxy-Authorization|X-Api-Key|Api-Key|X-Auth-Token|Cookie|Set-Cookie)(\s*:\s*)[^\r\n]+/gi,
		"$1$2***",
	);

	out = out.replace(
		/^([ \t]*[+-]?[ \t]*(?:export[ \t]+)?)([A-Za-z_][A-Za-z0-9_.-]*)([ \t]*=[ \t]*)(.*)$/gm,
		(line, lead: string, key: string, separator: string, value: string) => {
			if (!SECRET_KEY.test(key)) return line;
			const trimmed = value.trim();
			if (PLACEHOLDER.test(trimmed)) return line;
			const quote = trimmed.startsWith('"') ? '"' : trimmed.startsWith("'") ? "'" : "";
			return `${lead}${key}${separator}${quote}***${quote}`;
		},
	);

	out = out.replace(
		/("([^"]+)"\s*:\s*)("([^"]*)"|'([^']*)')/g,
		(match, prefix: string, key: string, _raw: string, doubleQuoted?: string, singleQuoted?: string) => {
			const value = doubleQuoted ?? singleQuoted ?? "";
			if (!SECRET_KEY.test(key) || PLACEHOLDER.test(value)) return match;
			return `${prefix}"***"`;
		},
	);

	return out;
}

/** Recursively redact strings, preserving shapes and skipping image payloads. */
export function redactValue<T>(value: T, depth = 0): T {
	if (depth > 8) return value;
	if (typeof value === "string") return redactSecrets(value) as T;
	if (Array.isArray(value)) return value.map((item) => redactValue(item, depth + 1)) as T;
	if (value && typeof value === "object") {
		const out: Record<string, unknown> = {};
		for (const [key, item] of Object.entries(value)) {
			if (/^(data|base64|image|bytes)$/i.test(key)) {
				out[key] = item;
				continue;
			}
			if (SECRET_KEY.test(key) && typeof item === "string" && !PLACEHOLDER.test(item.trim())) {
				out[key] = "***";
				continue;
			}
			out[key] = redactValue(item, depth + 1);
		}
		return out as T;
	}
	return value;
}
