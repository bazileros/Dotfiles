import assert from "node:assert/strict";
import { test } from "node:test";
import { commandTouchesSecrets, isSecretPath, redactSecrets, redactValue } from "./secrets.ts";

test("isSecretPath flags env files and credentials", () => {
	for (const path of [".env", ".env.local", ".env.production", "apps/web/.env", ".envrc"]) {
		assert.ok(isSecretPath(path, "/project"), path);
	}
	for (const path of ["~/.ssh/id_rsa", "~/.aws/credentials", "certs/server.pem", "config/.npmrc", "auth.json"]) {
		assert.ok(isSecretPath(path, "/project"), path);
	}
});

test("isSecretPath leaves examples and ordinary files alone", () => {
	for (const path of [".env.example", ".env.sample", ".env.template", "src/env.ts", "README.md", "package.json"]) {
		assert.equal(isSecretPath(path, "/project"), undefined, path);
	}
});

test("commandTouchesSecrets catches reads and dumps", () => {
	for (const command of [
		"cat .env",
		"cat .env.local",
		"node --env-file=.env index.js",
		"source .env && npm start",
		"env",
		"printenv OPENAI_API_KEY",
		"echo $GITHUB_TOKEN",
		"cat ~/.ssh/id_rsa",
		"curl -u user:pass https://example.com",
		"op read op://vault/item",
		"grep -r KEY .env",
		"grep -r KEY --glob **/.env*",
	]) {
		assert.ok(commandTouchesSecrets(command), command);
	}
});

test("commandTouchesSecrets leaves ordinary commands alone", () => {
	for (const command of [
		"npm test",
		"git status",
		"grep -r TODO src",
		"cat .env.example",
		"grep -r KEY --glob **/.env.example",
		"node -e 'console.log(1)'",
	]) {
		assert.equal(commandTouchesSecrets(command), undefined, command);
	}
});

test("redactSecrets masks env values, headers, JSON and known tokens", () => {
	assert.match(redactSecrets("OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz123456"), /OPENAI_API_KEY=\*\*\*/);
	assert.match(redactSecrets('API_KEY="abc123"'), /API_KEY="\*\*\*"/);
	assert.match(redactSecrets("DATABASE_URL=postgres://user:pass@localhost/db"), /DATABASE_URL=\*\*\*/);
	assert.match(redactSecrets("Authorization: Bearer abcdefghijklmnop"), /Authorization: \*\*\*/);
	assert.match(redactSecrets('{"api_key":"abc123","port":3000}'), /"api_key":"\*\*\*"/);
	assert.match(redactSecrets("token = 'abc123'"), /token = '\*\*\*'/);
	assert.match(redactSecrets("AWS_SECRET_ACCESS_KEY=abcdefghijklmnop"), /AWS_SECRET_ACCESS_KEY=\*\*\*/);
});

test("redactSecrets keeps harmless values", () => {
	for (const text of ["PORT=3000", "NODE_ENV=production", "git@github.com:owner/repo.git", "const total = 42;"]) {
		assert.equal(redactSecrets(text), text, text);
	}
});

test("redactSecrets masks private key blocks and credentials in URLs", () => {
	const block = "-----BEGIN RSA PRIVATE KEY-----\nMIIEow\n-----END RSA PRIVATE KEY-----";
	assert.equal(redactSecrets(block), "-----BEGIN RSA PRIVATE KEY----- [redacted] -----END RSA PRIVATE KEY-----");
	assert.match(redactSecrets("postgres://admin:hunter2@db.local/app"), /postgres:\/\/\*\*\*:\*\*\*@/);
});

test("redactValue walks nested details without touching image data", () => {
	const input = {
		diff: "+API_KEY=abc123",
		nested: { password: "hunter2", port: 5432 },
		data: "iVBORw0KGgo=",
	};
	const out = redactValue(input);
	assert.match(out.diff, /API_KEY=\*\*\*/);
	assert.equal(out.nested.password, "***");
	assert.equal(out.nested.port, 5432);
	assert.equal(out.data, "iVBORw0KGgo=");
});
