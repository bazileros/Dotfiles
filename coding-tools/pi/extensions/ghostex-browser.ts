/**
 * ghostex-browser — gives Pi agents the embedded Ghostex CEF browser as tools.
 *
 * Only registers inside a Ghostex session, so a terminal Pi outside Ghostex never pays for a
 * server that cannot attach. The proxy under mcp/ translates Ghostex's Content-Length framing
 * to the newline-delimited JSON that Pi's MCP client speaks.
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const PROXY = path.join(os.homedir(), ".pi", "agent", "mcp", "ghostex-browser-proxy.mjs");

export default function ghostexBrowser(pi: ExtensionAPI) {
  if (!process.env.GHOSTEX_GLOBAL_SESSION_REF) return;
  if (!fs.existsSync(PROXY)) return;

  pi.registerMcpServer("ghostex-browser", {
    command: process.execPath,
    args: [PROXY],
    exposure: "direct",
    description:
      "Ghostex's embedded CEF browser: list/select pages, navigate, snapshot @e refs, click, fill, press keys, evaluate JavaScript, read console logs, and capture PNG screenshots.",
  });
}
