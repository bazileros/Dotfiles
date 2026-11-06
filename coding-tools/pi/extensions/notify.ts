/**
 * Notify — native desktop notification when a long agent run settles.
 * Only fires for runs longer than NOTIFY_MIN_MS so quick turns stay quiet.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const NOTIFY_MIN_MS = 15_000;

function notifyOSC777(title: string, body: string): void {
	process.stdout.write(`\x1b]777;notify;${title};${body}\x07`);
}

function notifyOSC99(title: string, body: string): void {
	process.stdout.write(`\x1b]99;i=1:d=0;${title}\x1b\\`);
	process.stdout.write(`\x1b]99;i=1:p=body;${body}\x1b\\`);
}

function notifyWindows(title: string, body: string): void {
	const type = "Windows.UI.Notifications";
	const mgr = `[${type}.ToastNotificationManager, ${type}, ContentType = WindowsRuntime]`;
	const template = `[${type}.ToastTemplateType]::ToastText01`;
	const toast = `[${type}.ToastNotification]::new($xml)`;
	const script = [
		`${mgr} > $null`,
		`$xml = [${type}.ToastNotificationManager]::GetTemplateContent(${template})`,
		`$xml.GetElementsByTagName('text')[0].AppendChild($xml.CreateTextNode('${body}')) > $null`,
		`[${type}.ToastNotificationManager]::CreateToastNotifier('${title}').Show(${toast})`,
	].join("; ");
	require("node:child_process").execFile("powershell.exe", ["-NoProfile", "-Command", script]);
}

function notify(title: string, body: string): void {
	if (process.env.WT_SESSION) notifyWindows(title, body);
	else if (process.env.KITTY_WINDOW_ID) notifyOSC99(title, body);
	else notifyOSC777(title, body);
}

export default function (pi: ExtensionAPI) {
	let startedAt: number | undefined;

	pi.on("agent_start", async () => {
		startedAt = Date.now();
	});

	pi.on("agent_settled", async (_event, ctx) => {
		// Never write terminal escapes into print/JSON output.
		if (!ctx.hasUI) {
			startedAt = undefined;
			return;
		}
		if (startedAt === undefined) return;
		const elapsed = Date.now() - startedAt;
		startedAt = undefined;
		if (elapsed < NOTIFY_MIN_MS) return;
		notify("pi", `Done in ${Math.round(elapsed / 1000)}s`);
	});
}
