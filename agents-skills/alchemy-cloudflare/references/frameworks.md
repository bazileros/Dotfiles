# Framework Adapters

Alchemy supports deploying full-stack frameworks as Cloudflare Workers.

## TanStack Start

Full-stack React framework with SSR, streaming, and server functions.

### Import

```ts
import { TanStackStart } from "alchemy/cloudflare";
```

### Signature

```ts
TanStackStart(id: string, props: TanStackStartProps): Promise<TanStackStart>
```

### Options

All `Worker` options plus framework-specific config.

| Prop | Type | Description |
|------|------|-------------|
| `name` | `string` | Worker name |
| `bindings` | `Record<string, any>` | Resource bindings |
| `domains` | `string[] \| Domain[]` | Custom domains |
| `entrypoint` | `string` | Path to app directory (default `"."`) |
| `dev` | `{ remote?, port? }` | Dev server config |

### Example

```ts
const web = await TanStackStart("web", {
  bindings: {
    DB: db,
    SESSION_STORE: sessionStore,
    BETTER_AUTH_SECRET: alchemy.secret.env.BETTER_AUTH_SECRET!,
  },
  domains: isProd ? [alchemy.env.WEB_DOMAIN!] : undefined,
  name: isProd ? "my-web" : `my-web-${stage}`,
});
```

---

## Next.js

Full-stack React framework (App Router, SSR, ISR, streaming).

### Import

```ts
import { Next } from "alchemy/cloudflare";
```

### Signature

```ts
Next(id: string, props: NextProps): Promise<Next>
```

### Options

Same as `Worker`, plus:

| Prop | Type | Description |
|------|------|-------------|
| `entrypoint` | `string` | Path to Next.js app directory |
| `buildCommand` | `string` | Custom build command |
| `outputDirectory` | `string` | Custom output directory |
| `serverBundle` | `boolean` | Bundle server code |

### Important

- Works with `@opennextjs/cloudflare` or standard Next.js output
- Configure `next.config.js` for Cloudflare compatibility

---

## Astro

Content-focused web framework.

### Import

```ts
import { Astro } from "alchemy/cloudflare";
```

### Options

| Prop | Type | Description |
|------|------|-------------|
| `name` | `string` | Worker name |
| `entrypoint` | `string` | Path to Astro app directory |
| `bindings` | `Record<string, any>` | Resource bindings |
| `assets` | `AssetsConfig` | Static assets config |
| `server` | `"hybrid" \| "static"` | Rendering mode |

---

## Nuxt

Vue.js framework for SSR and static sites.

```ts
import { Nuxt } from "alchemy/cloudflare";

const app = await Nuxt("app", {
  entrypoint: "./apps/web",
  bindings: { DB: db, KV: kv },
  domains: ["mysite.com"],
});
```

---

## SvelteKit

Svelte framework for SSR.

```ts
import { SvelteKit } from "alchemy/cloudflare";

const app = await SvelteKit("app", {
  entrypoint: "./apps/web",
  bindings: { DB: db },
});
```

---

## React Router (SPA)

Client-side React SPA.

```ts
import { ReactRouter } from "alchemy/cloudflare";

const app = await ReactRouter("app", {
  entrypoint: "./apps/web",
  bindings: { API: api },
});
```

---

## Redwood

Full-stack JS framework.

```ts
import { Redwood } from "alchemy/cloudflare";

const app = await Redwood("app", {
  entrypoint: "./apps/web",
  bindings: { DB: db },
});
```

---

## Vite

General Vite project.

```ts
import { Vite } from "alchemy/cloudflare";

const app = await Vite("app", {
  entrypoint: "./apps/client",
  bindings: { API: api },
});
```

---

## Bun SPA

Simple Bun single-page application.

```ts
import { BunSPA } from "alchemy/cloudflare";

const app = await BunSPA("app", {
  entrypoint: "./apps/client",
  staticDir: "./dist",
});
```

---

## Key Differences Between Frameworks

| Adapter | SSR | Streaming | Assets | Build Tool |
|---------|-----|-----------|--------|------------|
| `TanStackStart` | ✅ | ✅ | Auto | Vinxi/Vite |
| `Next` | ✅ | ✅ | Auto | Next.js |
| `Astro` | ✅ | Partial | Auto | Astro |
| `Nuxt` | ✅ | ✅ | Auto | Nuxt/Vite |
| `SvelteKit` | ✅ | ✅ | Auto | SvelteKit/Vite |
| `ReactRouter` | ❌ SPA | ❌ | Manual | Vite |
| `Redwood` | ✅ | ❌ | Auto | Webpack |
| `Vite` | ❌ SPA | ❌ | Manual | Vite |

All framework adapters support:
- Resource bindings (D1, KV, R2, Queues, etc.)
- Custom domains
- Workers.dev URLs in dev
- Environment variables and secrets
