/**
 * ask-guideline — keeps dialog-based questions honest inside Ghostex.
 *
 * `ask_user_question` (pi-askuserquestion) is the single interactive question tool. Its UI is a
 * terminal surface: Ghostex chat mode renders the transcript, not the terminal, so a dialog there
 * blocks the turn with nothing visible. pi cannot detect which view is showing, so this extension
 * adds one guideline — only inside a Ghostex session — telling the model when to ask in prose
 * instead. No tool is registered here; that would be the duplicate this replaced.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const GUIDELINE =
	"Ghostex chat mode does not render terminal dialogs: calling ask_user_question there blocks the turn with nothing visible. If the user is in chat mode — they say so, or an earlier question went unanswered — ask the questions as plain text in your reply and wait. Never assume an answer that was not given.";

export default function askGuideline(pi: ExtensionAPI) {
	pi.on("before_agent_start", (event) => {
		// Outside Ghostex the dialog is always visible, so the caveat would only add noise.
		if (!process.env.GHOSTEX_GLOBAL_SESSION_REF) return;
		if (event.messageType !== "user") return;
		event.systemPromptOptions.promptGuidelines.push(GUIDELINE);
	});
}
