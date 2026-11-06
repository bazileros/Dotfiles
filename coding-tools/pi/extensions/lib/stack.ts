/**
 * Project tech-stack detection.
 *
 * Manifests decide most of the result; a shallow extension census fills in
 * languages for projects that have no manifest (or only a small one).
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, extname, join } from "node:path";

export interface LanguageCount {
	name: string;
	files: number;
}

export interface StackInfo {
	root: string;
	languages: LanguageCount[];
	frameworks: string[];
	tooling: string[];
	infra: string[];
	packageManager?: string;
	manifests: string[];
}

const IGNORE_DIRS = new Set([
	"node_modules",
	"bower_components",
	"vendor",
	"dist",
	"build",
	"out",
	"target",
	"coverage",
	".next",
	".nuxt",
	".svelte-kit",
	".turbo",
	".cache",
	".parcel-cache",
	".venv",
	"venv",
	"env",
	"__pycache__",
	".pytest_cache",
	".mypy_cache",
	".ruff_cache",
	".gradle",
	"Pods",
	"DerivedData",
]);

const MAX_FILES = 4000;
const MAX_DEPTH = 3;

const EXT_LANGUAGE: Record<string, string> = {
	".ts": "TypeScript",
	".tsx": "TypeScript",
	".mts": "TypeScript",
	".cts": "TypeScript",
	".js": "JavaScript",
	".jsx": "JavaScript",
	".mjs": "JavaScript",
	".cjs": "JavaScript",
	".py": "Python",
	".pyi": "Python",
	".rs": "Rust",
	".go": "Go",
	".rb": "Ruby",
	".java": "Java",
	".kt": "Kotlin",
	".kts": "Kotlin",
	".cs": "C#",
	".fs": "F#",
	".php": "PHP",
	".swift": "Swift",
	".dart": "Dart",
	".ex": "Elixir",
	".exs": "Elixir",
	".hs": "Haskell",
	".lhs": "Haskell",
	".c": "C",
	".h": "C",
	".cc": "C++",
	".cpp": "C++",
	".cxx": "C++",
	".hpp": "C++",
	".hh": "C++",
	".zig": "Zig",
	".lua": "Lua",
	".sh": "Shell",
	".bash": "Shell",
	".zsh": "Shell",
	".fish": "Shell",
	".sql": "SQL",
	".html": "HTML",
	".htm": "HTML",
	".vue": "Vue",
	".svelte": "Svelte",
	".css": "CSS",
	".scss": "CSS",
	".sass": "CSS",
	".less": "CSS",
	".nix": "Nix",
	".tf": "Terraform",
	".sol": "Solidity",
	".r": "R",
	".jl": "Julia",
	".clj": "Clojure",
	".erl": "Erlang",
	".ml": "OCaml",
	".pl": "Perl",
	".scala": "Scala",
};

const NODE_FRAMEWORKS: Record<string, string> = {
	next: "Next.js",
	nuxt: "Nuxt",
	"@angular/core": "Angular",
	svelte: "Svelte",
	"@sveltejs/kit": "SvelteKit",
	astro: "Astro",
	"solid-js": "Solid",
	qwik: "Qwik",
	"@builder.io/qwik": "Qwik",
	"@remix-run/react": "Remix",
	gatsby: "Gatsby",
	react: "React",
	vue: "Vue",
	express: "Express",
	fastify: "Fastify",
	hono: "Hono",
	koa: "Koa",
	"@nestjs/core": "NestJS",
	electron: "Electron",
	expo: "Expo",
	"react-native": "React Native",
	"@tauri-apps/api": "Tauri",
	three: "Three.js",
	lit: "Lit",
	elysia: "Elysia",
	"@trpc/server": "tRPC",
	"@apollo/server": "Apollo",
};

const NODE_TOOLING: Record<string, string> = {
	typescript: "TypeScript",
	tailwindcss: "Tailwind",
	eslint: "ESLint",
	"@biomejs/biome": "Biome",
	prettier: "Prettier",
	jest: "Jest",
	vitest: "Vitest",
	"@playwright/test": "Playwright",
	cypress: "Cypress",
	prisma: "Prisma",
	"drizzle-orm": "Drizzle",
	zod: "Zod",
	graphql: "GraphQL",
	storybook: "Storybook",
	"@storybook/react": "Storybook",
	vite: "Vite",
	webpack: "webpack",
	rollup: "Rollup",
	esbuild: "esbuild",
	turbo: "Turborepo",
	nx: "Nx",
	lerna: "Lerna",
};

const PY_FRAMEWORKS: Record<string, string> = {
	django: "Django",
	fastapi: "FastAPI",
	flask: "Flask",
	litestar: "Litestar",
	starlette: "Starlette",
	streamlit: "Streamlit",
	gradio: "Gradio",
	tornado: "Tornado",
	phoenix: "Phoenix",
};

const PY_TOOLING: Record<string, string> = {
	pytest: "pytest",
	ruff: "Ruff",
	black: "Black",
	mypy: "mypy",
	pandas: "pandas",
	numpy: "NumPy",
	torch: "PyTorch",
	tensorflow: "TensorFlow",
	jax: "JAX",
	uvicorn: "Uvicorn",
	celery: "Celery",
	sqlalchemy: "SQLAlchemy",
	pydantic: "Pydantic",
};

const RUST_DEPS: Record<string, string> = {
	axum: "Axum",
	"actix-web": "Actix",
	rocket: "Rocket",
	warp: "Warp",
	tonic: "Tonic",
	tokio: "Tokio",
	serde: "Serde",
	diesel: "Diesel",
	sqlx: "SQLx",
	bevy: "Bevy",
	yew: "Yew",
	leptos: "Leptos",
	tauri: "Tauri",
};

const GO_DEPS: Record<string, string> = {
	"github.com/gin-gonic/gin": "Gin",
	"github.com/labstack/echo": "Echo",
	"github.com/gofiber/fiber": "Fiber",
	"github.com/go-chi/chi": "Chi",
	"google.golang.org/grpc": "gRPC",
	"gorm.io/gorm": "GORM",
};

function read(path: string): string | undefined {
	try {
		return readFileSync(path, "utf8");
	} catch {
		return undefined;
	}
}

function readJson<T>(path: string): T | undefined {
	const text = read(path);
	if (!text) return undefined;
	try {
		return JSON.parse(text) as T;
	} catch {
		return undefined;
	}
}

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasWord(haystack: string, needle: string): boolean {
	return new RegExp(`(^|[^a-z0-9_-])${escapeRegExp(needle)}([^a-z0-9_-]|$)`, "i").test(haystack);
}

function census(root: string): Map<string, number> {
	const counts = new Map<string, number>();
	let seen = 0;

	const walk = (dir: string, depth: number): void => {
		if (seen >= MAX_FILES) return;
		let entries: ReturnType<typeof readdirSync>;
		try {
			entries = readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}

		for (const entry of entries) {
			if (seen >= MAX_FILES) return;
			if (entry.isSymbolicLink()) continue;

			if (entry.isDirectory()) {
				if (depth < MAX_DEPTH && !IGNORE_DIRS.has(entry.name) && !entry.name.startsWith(".")) {
					walk(join(dir, entry.name), depth + 1);
				}
				continue;
			}

			if (!entry.isFile()) continue;
			seen += 1;
			const language = EXT_LANGUAGE[extname(entry.name).toLowerCase()];
			if (language) counts.set(language, (counts.get(language) ?? 0) + 1);
		}
	};

	walk(root, 0);
	return counts;
}

export function detectStack(root: string): StackInfo {
	const frameworks: string[] = [];
	const tooling: string[] = [];
	const infra: string[] = [];
	const manifests: string[] = [];
	const declared: string[] = [];
	let packageManager: string | undefined;

	const add = (list: string[], ...items: (string | undefined)[]) => {
		for (const item of items) {
			if (item && !list.includes(item)) list.push(item);
		}
	};
	const addManifest = (name: string) => {
		if (existsSync(join(root, name))) add(manifests, name);
	};
	const declare = (language: string) => add(declared, language);

	if (root.endsWith(".xcodeproj") || readdirSyncSafe(root).some((name) => name.endsWith(".xcodeproj"))) {
		declare("Swift");
		add(infra, "Xcode");
	}

	// JavaScript / TypeScript
	const pkg = readJson<{
		packageManager?: string;
		dependencies?: Record<string, string>;
		devDependencies?: Record<string, string>;
		peerDependencies?: Record<string, string>;
		workspaces?: unknown;
	}>(join(root, "package.json"));

	if (pkg) {
		addManifest("package.json");
		declare("JavaScript");
		add(tooling, "Node.js");

		const deps = {
			...pkg.dependencies,
			...pkg.devDependencies,
			...pkg.peerDependencies,
		};

		for (const [dependency, label] of Object.entries(NODE_FRAMEWORKS)) {
			if (deps[dependency]) add(frameworks, label);
		}
		for (const [dependency, label] of Object.entries(NODE_TOOLING)) {
			if (deps[dependency]) add(tooling, label);
		}

		if (deps.typescript || existsSync(join(root, "tsconfig.json"))) declare("TypeScript");
		if (pkg.workspaces) add(tooling, "Workspaces");

		if (pkg.packageManager) packageManager = pkg.packageManager.split("@")[0];
	}

	for (const [file, manager] of [
		["bun.lock", "bun"],
		["bun.lockb", "bun"],
		["pnpm-lock.yaml", "pnpm"],
		["yarn.lock", "yarn"],
		["package-lock.json", "npm"],
		["npm-shrinkwrap.json", "npm"],
	] as const) {
		if (existsSync(join(root, file))) {
			add(manifests, file);
			packageManager ??= manager;
		}
	}

	if (existsSync(join(root, "deno.json")) || existsSync(join(root, "deno.jsonc"))) {
		declare("TypeScript");
		add(tooling, "Deno");
		addManifest(existsSync(join(root, "deno.json")) ? "deno.json" : "deno.jsonc");
	}
	for (const file of ["tsconfig.json", "jsconfig.json", "pnpm-workspace.yaml", "turbo.json", "nx.json", "lerna.json"]) {
		addManifest(file);
	}

	// Python
	const pyproject = read(join(root, "pyproject.toml"));
	const requirements = read(join(root, "requirements.txt"));
	if (pyproject || requirements) {
		declare("Python");
		const haystack = `${pyproject ?? ""}\n${requirements ?? ""}`.toLowerCase();
		for (const [needle, label] of Object.entries(PY_FRAMEWORKS)) {
			if (hasWord(haystack, needle)) add(frameworks, label);
		}
		for (const [needle, label] of Object.entries(PY_TOOLING)) {
			if (hasWord(haystack, needle)) add(tooling, label);
		}
	}
	if (pyproject) {
		addManifest("pyproject.toml");
		if (pyproject.includes("[tool.poetry]")) add(tooling, "Poetry");
		if (pyproject.includes("[tool.pdm]")) add(tooling, "PDM");
		if (pyproject.includes("[tool.hatch")) add(tooling, "Hatch");
	}
	addManifest("requirements.txt");
	for (const [file, manager] of [
		["poetry.lock", "Poetry"],
		["uv.lock", "uv"],
		["pdm.lock", "PDM"],
		["Pipfile", "Pipenv"],
		["Pipfile.lock", "Pipenv"],
		["setup.py", "setuptools"],
		["manage.py", "Django"],
	] as const) {
		if (existsSync(join(root, file))) {
			addManifest(file);
			add(tooling, manager);
			declare("Python");
		}
	}

	// Rust
	const cargo = read(join(root, "Cargo.toml"));
	if (cargo) {
		addManifest("Cargo.toml");
		declare("Rust");
		const haystack = cargo.toLowerCase();
		for (const [needle, label] of Object.entries(RUST_DEPS)) {
			if (hasWord(haystack, needle)) add(frameworks, label);
		}
	}

	// Go
	const gomod = read(join(root, "go.mod"));
	if (gomod) {
		addManifest("go.mod");
		declare("Go");
		for (const [needle, label] of Object.entries(GO_DEPS)) {
			if (gomod.includes(needle)) add(frameworks, label);
		}
	}

	// Ruby
	const gemfile = read(join(root, "Gemfile"));
	if (gemfile) {
		addManifest("Gemfile");
		declare("Ruby");
		const haystack = gemfile.toLowerCase();
		for (const [needle, label] of [
			["rails", "Rails"],
			["sinatra", "Sinatra"],
			["rspec", "RSpec"],
			["sidekiq", "Sidekiq"],
			["hanami", "Hanami"],
		] as const) {
			if (hasWord(haystack, needle)) add(frameworks, label);
		}
	}
	addManifest("Rakefile");

	// PHP
	const composer = readJson<{ require?: Record<string, string>; "require-dev"?: Record<string, string> }>(
		join(root, "composer.json"),
	);
	if (composer) {
		addManifest("composer.json");
		declare("PHP");
		const deps = { ...composer.require, ...composer["require-dev"] };
		if (deps["laravel/framework"]) add(frameworks, "Laravel");
		if (deps["symfony/framework-bundle"] || deps["symfony/symfony"]) add(frameworks, "Symfony");
		if (deps["phpunit/phpunit"]) add(tooling, "PHPUnit");
	}

	// Java / Kotlin
	const pom = read(join(root, "pom.xml"));
	const gradle = read(join(root, "build.gradle")) ?? read(join(root, "build.gradle.kts"));
	if (pom) {
		addManifest("pom.xml");
		declare("Java");
		add(tooling, "Maven");
		if (pom.includes("spring-boot")) add(frameworks, "Spring Boot");
	}
	if (gradle) {
		addManifest(existsSync(join(root, "build.gradle.kts")) ? "build.gradle.kts" : "build.gradle");
		declare(existsSync(join(root, "build.gradle.kts")) ? "Kotlin" : "Java");
		add(tooling, "Gradle");
		if (gradle.includes("org.springframework.boot")) add(frameworks, "Spring Boot");
	}

	// C# / .NET
	const rootEntries = readdirSyncSafe(root);
	if (rootEntries.some((name) => name.endsWith(".csproj") || name.endsWith(".sln"))) {
		declare("C#");
		add(tooling, ".NET");
		add(manifests, ...rootEntries.filter((name) => name.endsWith(".csproj") || name.endsWith(".sln")));
	}

	// Swift
	addManifest("Package.swift");
	if (existsSync(join(root, "Package.swift"))) declare("Swift");

	// Dart / Flutter
	const pubspec = read(join(root, "pubspec.yaml"));
	if (pubspec) {
		addManifest("pubspec.yaml");
		declare("Dart");
		if (pubspec.includes("flutter:")) add(frameworks, "Flutter");
	}

	// Elixir
	const mix = read(join(root, "mix.exs"));
	if (mix) {
		addManifest("mix.exs");
		declare("Elixir");
		if (mix.includes(":phoenix")) add(frameworks, "Phoenix");
	}

	// Haskell / Nix / Lua / C / C++
	addManifest("stack.yaml");
	addManifest("flake.nix");
	addManifest("default.nix");
	addManifest("CMakeLists.txt");
	addManifest("Makefile");
	if (existsSync(join(root, "stack.yaml")) || rootEntries.some((name) => name.endsWith(".cabal"))) declare("Haskell");
	if (existsSync(join(root, "flake.nix")) || existsSync(join(root, "default.nix"))) declare("Nix");
	if (rootEntries.some((name) => name.endsWith(".rockspec"))) declare("Lua");
	if (existsSync(join(root, "CMakeLists.txt"))) add(tooling, "CMake");
	if (existsSync(join(root, "Makefile"))) add(tooling, "Make");

	// Infrastructure and CI
	const infraFiles: [string[], string][] = [
		[["Dockerfile", "docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"], "Docker"],
		[["vercel.json"], "Vercel"],
		[["netlify.toml"], "Netlify"],
		[["fly.toml"], "Fly.io"],
		[["railway.json", "railway.toml"], "Railway"],
		[["render.yaml"], "Render"],
		[["serverless.yml", "serverless.yaml"], "Serverless"],
		[["cdk.json"], "AWS CDK"],
		[["chart/Chart.yaml"], "Helm"],
		[["Caddyfile"], "Caddy"],
		[["nginx.conf"], "Nginx"],
		[["main.tf", "terraform"], "Terraform"],
	];
	for (const [files, label] of infraFiles) {
		if (files.some((file) => existsSync(join(root, file)))) add(infra, label);
	}
	if (existsSync(join(root, ".github/workflows"))) add(infra, "GitHub Actions");
	if (existsSync(join(root, ".gitlab-ci.yml"))) add(infra, "GitLab CI");
	if (existsSync(join(root, ".circleci"))) add(infra, "CircleCI");
	if (existsSync(join(root, "Jenkinsfile"))) add(infra, "Jenkins");
	if (existsSync(join(root, "azure-pipelines.yml"))) add(infra, "Azure Pipelines");
	if (existsSync(join(root, "k8s")) || existsSync(join(root, "kubernetes"))) add(infra, "Kubernetes");
	if (existsSync(join(root, "Procfile"))) add(infra, "Heroku");

	const languages: LanguageCount[] = [...census(root).entries()]
		.map(([name, files]) => ({ name, files }))
		.sort((a, b) => b.files - a.files);

	for (const name of declared) {
		if (!languages.some((language) => language.name === name)) languages.push({ name, files: 0 });
	}

	return {
		root,
		languages,
		frameworks,
		tooling,
		infra,
		packageManager,
		manifests: manifests.sort(),
	};
}

function readdirSyncSafe(path: string): string[] {
	try {
		return readdirSync(path);
	} catch {
		return [];
	}
}

const SHORT_LANGUAGE: Record<string, string> = {
	TypeScript: "TS",
	JavaScript: "JS",
	Python: "Py",
	Ruby: "Rb",
	Haskell: "Hs",
	Elixir: "Ex",
	Shell: "sh",
};

/** Compact badge for the HUD: language, first frameworks, package manager. */
export function stackBadge(info: StackInfo, max = 3): string {
	const parts: string[] = [];
	const push = (value: string | undefined) => {
		if (value && parts.length < max && !parts.includes(value)) parts.push(value);
	};

	const language = info.languages[0]?.name;
	push(language ? (SHORT_LANGUAGE[language] ?? language) : undefined);
	for (const framework of info.frameworks) push(framework);
	push(info.packageManager);
	for (const tool of info.tooling) push(tool);

	return parts.join(" · ");
}

/** Rows for `/stack` and any other textual surface. */
export function stackRows(info: StackInfo): [string, string][] {
	const rows: [string, string][] = [];
	const languages = info.languages
		.slice(0, 4)
		.map((language) => (language.files > 0 ? `${language.name} (${language.files})` : language.name))
		.join(" · ");

	if (languages) rows.push(["Languages", languages]);
	if (info.frameworks.length) rows.push(["Frameworks", info.frameworks.slice(0, 8).join(" · ")]);
	if (info.tooling.length) rows.push(["Tooling", info.tooling.slice(0, 8).join(" · ")]);
	if (info.infra.length) rows.push(["Infra", info.infra.join(" · ")]);
	if (info.packageManager) rows.push(["Package mgr", info.packageManager]);
	if (info.manifests.length) rows.push(["Manifests", info.manifests.join(", ")]);

	return rows;
}

export function projectName(info: StackInfo): string {
	return basename(info.root) || info.root;
}
