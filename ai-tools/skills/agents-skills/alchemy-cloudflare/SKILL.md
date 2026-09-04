---
name: alchemy-cloudflare
description: Complete reference for Alchemy (alchemy.run) Cloudflare infrastructure-as-code. Covers every resource type (Worker, D1, KV, R2, Queues, Durable Objects, AI, Workflows, Routes, Domains, Secrets, framework adapters), their full configuration options, and best practices. Use whenever the user mentions Alchemy, alchemy.run, deploying Cloudflare Workers, or any Cloudflare resource configuration — even if they don't explicitly say "Alchemy." This is the authoritative source; do NOT guess Alchemy API surface, use these docs.
---

# Alchemy Cloudflare Skill

**Source of truth:** The Alchemy npm package installed in the project. Never guess or assume Alchemy API — use these docs.

Alchemy is a TypeScript infrastructure-as-code framework for Cloudflare. Define Workers, databases, storage, queues, and more in a single `alchemy.run.ts` file with full type safety.

## Quick Start

An `alchemy.run.ts` entrypoint:

```ts
import alchemy from "alchemy";
import { D1Database, Worker, KVNamespace, R2Bucket, Queue } from "alchemy/cloudflare";

const app = await alchemy("my-app", { stage: "dev" });

const db = await D1Database("db", {
  name: "my-database",
  migrationsDir: "./migrations",
});

const kv = await KVNamespace("kv-store", { title: "My KV Store" });

const server = await Worker("server", {
  entrypoint: "src/index.ts",
  bindings: { DB: db, KV: kv },
  url: true,
});

console.log(`Server at ${server.url}`);
await app.finalize();
```

## How to Use This Skill

When a user asks about Alchemy Cloudflare resources:

1. **Identify the resource type** they're asking about
2. **Read the corresponding reference file** listed below — it has all the options, types, and examples
3. **Answer directly from the docs** — never guess or infer the API

- **Worker configuration** (entrypoint, bindings, domains, dev, observability, crons, event sources, placement) → [references/worker.md](references/worker.md)
- **D1, KV, R2, Queues, Durable Objects, AI, Workflows, Hyperdrive, Vectorize, Browser Rendering, Secrets, Logpush, Analytics, Containers** → [references/resources.md](references/resources.md)
- **Custom domains, Routes, DNS records, Tunnels, VPC, Health Checks** → [references/networking.md](references/networking.md)
- **TanStack Start, Next.js, Astro, Nuxt, SvelteKit, React Router, Redwood, Vite, Bun SPA** → [references/frameworks.md](references/frameworks.md)

## Resource Categories

| Category | Resources | Reference File |
|----------|-----------|----------------|
| **Compute** | `Worker`, `DurableObjectNamespace`, `Workflow`, `Container` | [worker.md](references/worker.md) |
| **Storage** | `D1Database`, `KVNamespace`, `R2Bucket`, `SecretsStore`, `Hyperdrive` | [resources.md](references/resources.md) |
| **AI & Search** | `Ai`, `Vectorize`, `AISearch`, `AIGateway`, `BrowserRendering` | [resources.md](references/resources.md) |
| **Networking** | `CustomDomain`, `Route`, `DNS`, `Tunnel`, `VPC`, `QuickTunnel` | [networking.md](references/networking.md) |
| **Messaging** | `Queue`, `QueueConsumer`, `EventSource` | [resources.md](references/resources.md) |
| **Frameworks** | `TanStackStart`, `Next`, `Astro`, `Nuxt`, `SvelteKit`, `Vite` | [frameworks.md](references/frameworks.md) |
| **Security** | `Access*`, `Ruleset`, `RateLimit`, `Secret`, `API Shield` | [resources.md](references/resources.md) |
| **Observability** | `Logpush`, `AnalyticsEngine`, `HealthCheck` | [resources.md](references/resources.md) |

## Project Structure Convention

```
packages/infra/
├── alchemy.run.ts       # Entrypoint — loads env, creates resources, finalizes
├── .env                 # Cloudflare API token, account ID, domains
└── src/
    ├── config.ts        # loadEnv() — reads .env files
    ├── database.ts      # createDatabase(name: "app" | "analytics")
    ├── kv.ts            # createStore(name: "session-store" | "cache-store")
    ├── storage.ts       # createBucket(name: "images" | "documents" | "uploads")
    ├── messaging.ts     # createQueues() — order queue + DLQ
    └── workers.ts       # createWorkers(resources) — returns { server, consumer, web }
```

## Resource Creation Pattern

Every resource follows the same lifecycle:
1. **Create** in `alchemy.run.ts` or a factory function in `src/`
2. **Type** the resource in `WorkerResources` interface
3. **Pass** to `createWorkers()`
4. **Bind** to the Worker via `bindings: { NAME: resource }`

Async resources (`D1Database`, `KVNamespace`, `R2Bucket`, `Queue`) are `await`ed:
```ts
const db = await D1Database("db", { ... });
```

Sync resources (`DurableObjectNamespace`, `Ai`, `Workflow`) are NOT awaited:
```ts
const ai = Ai();
```

## Key Rules

- Run `alchemy dev` for local development — uses Miniflare emulation
- Run `alchemy deploy` for production
- Secrets go in `alchemy.secret.env.SECRET_NAME`; env vars in `alchemy.env.VAR_NAME`
- Use `compatibility: "node"` on Workers for `nodejs_compat`
- DO bindings and AI bindings are **synchronous** factories; Worker, D1, KV, R2, Queue are **async**
- Never edit old DO migration tags — always add new ones (Alchemy handles this automatically)

For detailed reference on any resource, read the corresponding file in `references/`.
