/**
 * /image — attach an image from disk without leaving the editor.
 *
 * With a path: `/image shot.png`. Without one: pick from recent images in the
 * project, Pictures, Downloads or Desktop. Inserts an `@path` reference, which
 * Pi resolves (and encodes) on submit.
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { extname, isAbsolute, join, relative, resolve } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tiff", ".tif"]);
const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "build", "out", "target", "coverage", ".next"]);
const MAX_IMAGES = 80;

function collect(dir: string, depth: number, out: string[]): void {
	if (out.length >= MAX_IMAGES || depth < 0 || !existsSync(dir)) return;
	let entries: ReturnType<typeof readdirSync>;
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return;
	}

	for (const entry of entries) {
		if (out.length >= MAX_IMAGES) return;
		if (entry.name.startsWith(".")) continue;
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (!IGNORED_DIRS.has(entry.name)) collect(full, depth - 1, out);
			continue;
		}
		if (entry.isFile() && IMAGE_EXT.has(extname(entry.name).toLowerCase())) out.push(full);
	}
}

function candidates(cwd: string): string[] {
	const found: string[] = [];
	collect(cwd, 3, found);
	for (const folder of ["Pictures", "Downloads", "Desktop"]) {
		collect(join(homedir(), folder), 2, found);
	}

	const unique = [...new Set(found)];
	unique.sort((a, b) => {
		try {
			return statSync(b).mtimeMs - statSync(a).mtimeMs;
		} catch {
			return 0;
		}
	});
	return unique.slice(0, MAX_IMAGES);
}

function reference(path: string, cwd: string): string {
	const rel = relative(cwd, path);
	const shown = rel && !rel.startsWith("..") ? rel : path;
	return /\s/.test(shown) ? `@"${shown}"` : `@${shown}`;
}

function label(path: string, cwd: string): string {
	const rel = relative(cwd, path);
	const shown = rel && !rel.startsWith("..") ? rel : path;
	let size = "";
	try {
		const kb = statSync(path).size / 1024;
		size = kb > 1024 ? ` (${(kb / 1024).toFixed(1)} MB)` : ` (${Math.round(kb)} KB)`;
	} catch {
		/* ignore */
	}
	return `${shown}${size}`;
}

async function attach(args: string, ctx: ExtensionContext): Promise<void> {
	const requested = args.trim().replace(/^['"]|['"]$/g, "");
	let path: string | undefined;

	if (requested) {
		const expanded = requested.startsWith("~/") ? join(homedir(), requested.slice(2)) : requested;
		const full = isAbsolute(expanded) ? expanded : resolve(ctx.cwd, expanded);
		if (!existsSync(full)) {
			ctx.ui.notify(`No such file: ${requested}`, "error");
			return;
		}
		if (!IMAGE_EXT.has(extname(full).toLowerCase())) {
			ctx.ui.notify(`Not an image: ${requested}`, "error");
			return;
		}
		path = full;
	} else {
		const images = candidates(ctx.cwd);
		if (images.length === 0) {
			ctx.ui.notify("No images found. Try /image <path>.", "warning");
			return;
		}

		const labels = images.map((image) => label(image, ctx.cwd));
		const picked = await ctx.ui.select("Attach image", labels);
		if (!picked) return;
		path = images[labels.indexOf(picked)];
	}

	if (!path) return;

	const token = reference(path, ctx.cwd);
	const current = ctx.ui.getEditorText();
	ctx.ui.setEditorText(current.trimEnd() ? `${current.trimEnd()} ${token}` : token);
	ctx.ui.notify(`Attached ${label(path, ctx.cwd)}`, "info");
}

export default function (pi: ExtensionAPI) {
	pi.registerCommand("image", {
		description: "Attach an image from disk (picker, or /image <path>)",
		handler: async (args, ctx) => attach(args, ctx),
	});

	pi.registerShortcut("alt+i", {
		description: "Attach an image from disk",
		handler: async (ctx) => attach("", ctx),
	});
}
