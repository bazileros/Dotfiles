/**
 * /stack — show the languages, frameworks, tooling and infrastructure that a
 * project uses. The HUD also surfaces a short badge from the same detector.
 */

import type { ExtensionAPI, Theme } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { detectStack, projectName, stackRows, type StackInfo } from "./lib/stack.ts";

function render(info: StackInfo, theme: Theme, expanded: boolean): string {
	const title = theme.bold(theme.fg("text", projectName(info)));
	const head = `${theme.fg("accent", "⚙")} ${title} ${theme.fg("dim", info.root)}`;
	const rows = stackRows(info).map(
		([label, value]) => `${theme.fg("muted", label.padEnd(12))}${theme.fg("text", value)}`,
	);
	const lines = [head, ...rows];
	if (expanded) lines.push(theme.fg("dim", JSON.stringify(info, null, 2)));
	return `\n${lines.join("\n")}\n`;
}

export default function (pi: ExtensionAPI) {
	pi.registerEntryRenderer("tech-stack", (entry, { expanded }, theme) =>
		new Text(render(entry.data as StackInfo, theme, expanded), 1, 0),
	);

	pi.registerCommand("stack", {
		description: "Detect this project's languages, frameworks and tooling",
		handler: async (_args, ctx) => {
			const info = detectStack(ctx.cwd);
			pi.appendEntry("tech-stack", info);
			const lead = info.languages[0]?.name;
			ctx.ui.notify(lead ? `Detected ${lead} project` : "No stack detected", "info");
		},
	});
}
