---
name: ghostex-browser
description: Drive the Ghostex embedded browser for browser work — open pages, inspect the DOM, click, fill forms, read console errors, take screenshots, and run Playwright tests against the same pane. Use whenever a task involves a web UI, a local dev server, visual verification, or reproducing a browser bug.
---

# Ghostex embedded browser

Browser work goes through the Ghostex embedded CEF pane. Pi exposes the MCP tools as `mcp__ghostex_browser__ghostex_*` (the server is `ghostex-browser`; Pi normalizes the dash). Images returned by the browser tools render inline because `terminal.images` is `kitty` and `terminal.showImages` is on.

## Open a page
- `ghostex browser open <url>` opens or reuses a pane in the current project (reuse is by origin by default).
- `ghostex browser open <url> --reuse exact` when only the exact URL may be reused.
- `ghostex browser open <url> --reuse none` when you need a separate pane.
- `/web <url>` does the same from inside Pi.

## Drive a page
1. `ghostex_list_pages` — find targets and page ids.
2. `ghostex_select_page` — pin the page when more than one is open.
3. `ghostex_console_logs` — record the baseline before acting.
4. `ghostex_snapshot` — get the DOM with `@e` element refs.
5. `ghostex_click`, `ghostex_fill`, `ghostex_press_key` — act through `@e` refs or CSS selectors.
6. Re-snapshot after every action that changes the DOM; refs go stale.
7. `ghostex_console_logs` again — errors and exceptions are the real evidence.
8. `ghostex_screenshot` — visual proof for the report.

Use `ghostex_evaluate` only for focused inspection the snapshot cannot answer.

## Test a web app with Playwright
Use the `web_test` tool. It opens/reuses the Ghostex pane, connects Playwright to the same CEF DevTools port (`9333-9343`, or `GHOSTEX_CEF_REMOTE_DEBUGGING_PORT`), runs your async Playwright code, and returns console errors plus a PNG screenshot. The image is returned as image content, so Kitty shows the page inline.

```
web_test({
  url: "http://localhost:3000",
  code: `
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByLabel("Email").fill("test@example.com");
    log(await page.locator("h1").innerText());
  `,
  screenshot: true
})
```

- `page`, `context`, `browser` and `log()` are available. Do not call `browser.close()`; the tool blocks it so the user's pane stays open.
- Assert on DOM state, text, or console output. A screenshot alone does not prove behavior.
- Reproduce a failure twice before calling it deterministic.
- If `web_test` reports no CEF endpoint, open a Ghostex Browser pane first. Fall back to the `ghostex_*` MCP tools; do not launch a separate Chrome.

## Verify, don't eyeball
- Assert on DOM state, text content, or console output.
- Report console errors verbatim, with the step that triggered them.
- Keep the screenshot path from `web_test` in the summary so the user can reopen it.

## Boundaries
- Embedded Ghostex panes only. Playwright must attach over CDP (`web_test` does this); never call `chromium.launch()`.
- External Chrome/Chromium/Edge/Electron content needs Cua Driver (`ghostex browser-use install-skill`); ask before installing it.
- If the browser tools return "Could not reach Ghostex CEF DevTools", the Ghostex app has no browser port open. Say so and stop; do not switch to another browser.
