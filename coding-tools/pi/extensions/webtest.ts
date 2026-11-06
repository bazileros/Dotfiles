/**
 * web_test — drive the Ghostex embedded CEF browser with Playwright over CDP.
 *
 * Ghostex exposes each browser pane on a CEF DevTools port (9333-9343 by
 * default). Playwright attaches to that endpoint, so tests run against the
 * same pane the user sees. The result carries a PNG, which Pi renders inline in
 * Kitty, iTerm2 and other image-capable terminals.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI, ExtensionToolContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { CEF_PORTS, findCdp } from "./lib/cdp.ts";

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "web_test",
		label: "Web test",
		description: [
			"Run Playwright against the Ghostex embedded browser over CDP.",
			"Opens/reuses a Ghostex pane, runs the supplied async Playwright code, and returns console errors plus a screenshot.",
			"The screenshot is returned as image content so image-capable terminals show the page inline.",
		].join(" "),
		parameters: Type.Object({
			url: Type.Optional(Type.String({ description: "URL to open or reuse in the Ghostex browser" })),
			code: Type.Optional(
				Type.String({
					description:
						"Async Playwright function body. Receives page, context, browser and log(). Example: await page.getByRole('button', { name: 'Sign in' }).click(); log(await page.title());",
				}),
			),
			screenshot: Type.Optional(
				Type.Boolean({ description: "Capture a PNG screenshot (default true)", default: true }),
			),
			fullPage: Type.Optional(Type.Boolean({ description: "Capture a full-page screenshot", default: false })),
		}),

		async execute(_toolCallId, params, _signal, onUpdate, ctx: ExtensionToolContext) {
			const notes: string[] = [];
			let openError = "";

			if (params.url) {
				const opened = await pi.exec("ghostex", ["browser", "open", params.url], {
					cwd: ctx.cwd,
					timeout: 30000,
				});
				if (opened.code !== 0) {
					openError = `${opened.stdout}${opened.stderr}`.trim();
					notes.push(`ghostex browser open failed: ${openError}`);
				}
			}

			onUpdate?.({
				content: [{ type: "text", text: "Looking for the Ghostex CEF DevTools endpoint…" }],
				details: { stage: "connect" },
			});

			const cdp = await findCdp();
			if (!cdp) {
				const ports = CEF_PORTS.join(", ");
				return {
					content: [
						{
							type: "text",
							text: [
								`No Ghostex CEF DevTools endpoint found on ${ports}.`,
								openError ? `Open error: ${openError}` : "Open a Browser pane in Ghostex, then retry.",
								"Fallback: use the ghostex_* MCP tools (ghostex_list_pages, ghostex_navigate, ghostex_screenshot).",
							].join("\n"),
						},
					],
					details: { cdp: undefined, ports: CEF_PORTS, openError },
					isError: true,
				};
			}

			let chromium: typeof import("playwright-core").chromium;
			try {
				({ chromium } = await import("playwright-core"));
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `playwright-core is not installed: ${error instanceof Error ? error.message : String(error)}`,
						},
					],
					details: { cdp: cdp.url },
					isError: true,
				};
			}

			onUpdate?.({
				content: [{ type: "text", text: `Connecting Playwright to CEF on port ${cdp.port}…` }],
				details: { stage: "playwright", cdp: cdp.url },
			});

			let browser: import("playwright-core").Browser | undefined;
			const consoleErrors: string[] = [];
			const output: string[] = [];
			let page: import("playwright-core").Page | undefined;
			let codeError: string | undefined;

			try {
				const connected = await chromium.connectOverCDP(cdp.url, { timeout: 15000 });
				browser = connected;
				const context = connected.contexts()[0] ?? (await connected.newContext());
				const pages = context.pages().filter((candidate) => !candidate.isClosed());
				page =
					pages.find((candidate) => /^https?:/i.test(candidate.url())) ??
					pages[0] ??
					(await context.newPage());

				page.setDefaultTimeout(15000);

				const onConsole = (message: import("playwright-core").ConsoleMessage) => {
					if (message.type() === "error" || message.type() === "warning") {
						consoleErrors.push(`[${message.type()}] ${message.text()}`);
					}
				};
				const onPageError = (error: Error) => consoleErrors.push(`[pageerror] ${error.message}`);
				page.on("console", onConsole);
				page.on("pageerror", onPageError);

				try {
					if (params.url && page.url() !== params.url) {
						await page.goto(params.url, { waitUntil: "domcontentloaded" });
					}

					if (params.code?.trim()) {
						const log = (...values: unknown[]) => {
							output.push(values.map((value) => (typeof value === "string" ? value : JSON.stringify(value))).join(" "));
						};
						// Keep browser.close() from taking the user's Ghostex pane down.
						const safeBrowser = new Proxy(connected, {
							get(target, property, receiver) {
								if (property === "close") return async () => {};
								const value = Reflect.get(target, property, receiver);
								return typeof value === "function" ? value.bind(target) : value;
							},
						});
						const run = new Function(
							"page",
							"context",
							"browser",
							"log",
							`return (async () => { ${params.code} })();`,
						) as (
							page: import("playwright-core").Page,
							context: import("playwright-core").BrowserContext,
							browser: import("playwright-core").Browser,
							log: (...values: unknown[]) => void,
						) => Promise<unknown>;

						const result = await run(page, context, safeBrowser, log);
						if (result !== undefined) {
							output.push(typeof result === "string" ? result : JSON.stringify(result, null, 2));
						}
					}
				} finally {
					page.off("console", onConsole);
					page.off("pageerror", onPageError);
				}
			} catch (error) {
				codeError = error instanceof Error ? error.message : String(error);
			}

			let screenshotPath: string | undefined;
			let png: Buffer | undefined;
			if (page && params.screenshot !== false) {
				try {
					png = await page.screenshot({ type: "png", fullPage: params.fullPage ?? false });
					const directory = join(ctx.cwd, ".pi", "webtest");
					mkdirSync(directory, { recursive: true });
					screenshotPath = join(directory, `shot-${Date.now()}.png`);
					writeFileSync(screenshotPath, png);
				} catch (error) {
					codeError ??= `Screenshot failed: ${error instanceof Error ? error.message : String(error)}`;
				}
			}

			const pageUrl = page && !page.isClosed() ? page.url() : "(no page)";
			const title = page && !page.isClosed() ? await page.title().catch(() => "") : "";
			const summary = [
				`CEF ${cdp.port} · ${pageUrl}${title ? ` · ${title}` : ""}`,
				...notes,
				codeError ? `Error: ${codeError}` : "",
				...output,
				consoleErrors.length ? `Console:\n${consoleErrors.join("\n")}` : "Console: no errors",
				screenshotPath ? `Screenshot: ${screenshotPath}` : "",
			]
				.filter(Boolean)
				.join("\n");

			const content: Array<
				{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }
			> = [{ type: "text", text: summary }];
			if (png) content.push({ type: "image", data: png.toString("base64"), mimeType: "image/png" });

			return {
				content,
				details: {
					cdp: cdp.url,
					port: cdp.port,
					url: pageUrl,
					title,
					console: consoleErrors,
					output,
					screenshot: screenshotPath,
					error: codeError,
				},
				isError: Boolean(codeError),
			};
		},
	});

	pi.registerCommand("web", {
		description: "Open a URL in the Ghostex embedded browser",
		handler: async (args, ctx) => {
			const url = args.trim();
			if (!url) {
				const cdp = await findCdp();
				ctx.ui.notify(
					cdp
						? `Ghostex CEF is reachable on port ${cdp.port}`
						: `Ghostex CEF is not reachable on ${CEF_PORTS.join(", ")}`,
					cdp ? "info" : "warning",
				);
				return;
			}

			const opened = await pi.exec("ghostex", ["browser", "open", url], { cwd: ctx.cwd, timeout: 30000 });
			if (opened.code !== 0) {
				ctx.ui.notify(`${opened.stdout}${opened.stderr}`.trim() || "ghostex browser open failed", "error");
				return;
			}
			const cdp = await findCdp();
			ctx.ui.notify(
				cdp ? `Opened ${url} · CEF ${cdp.port}` : `Opened ${url}, but no CEF DevTools port is listening`,
				cdp ? "info" : "warning",
			);
		},
	});
}
