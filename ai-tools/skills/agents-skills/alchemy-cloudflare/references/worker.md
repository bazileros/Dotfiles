# Worker — Cloudflare Workers

The `Worker` resource creates and manages Cloudflare Workers. It's the core compute unit in Alchemy.

## Import

```ts
import { Worker } from "alchemy/cloudflare";
```

## Signature

```ts
Worker<B extends Bindings, RPC extends Rpc.WorkerEntrypointBranded>(
  id: string,
  props: WorkerProps<B, RPC>
): Promise<Worker<B, RPC>>
```

## Configuration Options

### Basic

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `entrypoint` | `string` | — | Path to the worker script (e.g. `"src/index.ts"`) |
| `script` | `string` | — | Inline script content (alternative to `entrypoint`) |
| `name` | `string` | `${app}-${stage}-${id}` | Worker name in Cloudflare dashboard |
| `format` | `"esm" \| "cjs"` | `"esm"` | Module format |
| `noBundle` | `boolean` | `false` | Skip esbuild bundling (keeps original file) |
| `sourceMap` | `boolean` | `true` | Generate source maps |
| `cwd` | `string` | `process.cwd()` | Root directory for resolving `entrypoint` |

### Bindings

| Prop | Type | Description |
|------|------|-------------|
| `bindings` | `B` (generic) | Strongly typed resource bindings. Pass `D1Database`, `KVNamespace`, `R2Bucket`, `DurableObjectNamespace`, `Ai()`, `Queue`, secrets, env vars, etc. |

Example:
```ts
const worker = await Worker("server", {
  entrypoint: "src/index.ts",
  bindings: {
    DB: db,                          // D1 database
    SESSION_STORE: sessionStore,     // KV namespace
    AI: Ai(),                        // Workers AI
    MY_DO: myDurableObject,          // Durable Object
    BETTER_AUTH_SECRET: alchemy.secret.env.BETTER_AUTH_SECRET!,
    CORS_ORIGIN: alchemy.env.CORS_ORIGIN!,
  },
});
```

### Networking

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `url` | `boolean` | `false` | Enable workers.dev URL |
| `routes` | `(string \| { pattern, zoneId?, adopt? })[]` | — | URL route patterns |
| `domains` | `(string \| { domainName, zoneId?, adopt?, overrideExistingOrigin? })[]` | — | Custom domains |
| `namespace` | `string \| DispatchNamespace` | — | Dispatch namespace for routing |

### Dev & Deployment

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dev` | `{ port?, remote?, tunnel? } \| { url }` | — | Local dev configuration |
| `compatibilityDate` | `string` | Internal default | Compatibility date |
| `compatibilityFlags` | `string[]` | — | Compatibility flags |
| `compatibility` | `"node"` | — | Preset: `"node"` enables `nodejs_compat` |
| `adopt` | `boolean` | `false` | Adopt existing worker if already deployed |
| `delete` | `boolean` | `true` | Delete worker when removed from Alchemy |

### Performance & Limits

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `placement` | `WorkerPlacementSmart \| WorkerPlacementRegion \| WorkerPlacementHost \| WorkerPlacementHostname` | — | Placement configuration |
| `limits` | `{ cpu_ms?, subrequests? }` | — | CPU time and subrequest limits |
| `observability` | `{ enabled?, headSamplingRate?, logs?, traces? }` | `{ enabled: true }` | Observability settings |
| `logpush` | `boolean` | `false` | Enable Workers Logpush |

### Triggers

| Prop | Type | Description |
|------|------|-------------|
| `crons` | `string[]` | Cron expressions for scheduled triggers |
| `eventSources` | `EventSource[]` | Event sources (queues, streams, etc.) |

### Versioning

| Prop | Type | Description |
|------|------|-------------|
| `version` | `string` | Version label (e.g. `"pr-123"`) for preview URLs |
| `previewSubdomains` | `boolean` | Enable preview subdomains |

### RPC

| Prop | Type | Description |
|------|------|-------------|
| `rpc` | `(new (...args: any[]) => RPC) \| type<RPC>` | RPC class for cross-worker calls |

### Advanced

| Prop | Type | Description |
|------|------|-------------|
| `tailConsumers` | `Array<Worker \| { service: string }>` | Tail consumers for execution logs |
| `assets` | `AssetsConfig` | Static assets configuration (see below) |

## AssetsConfig

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `_headers` | `string` | From `_headers` file | Custom headers on asset responses |
| `_redirects` | `string` | From `_redirects` file | Redirects/proxy paths |
| `html_handling` | enum | `"auto-trailing-slash"` | HTML redirect/rewrite behavior |
| `not_found_handling` | enum | `"none"` | 404 behavior |
| `run_worker_first` | `boolean \| string[]` | `false` | Always invoke Worker first |

## WorkerPlacement Options

```ts
// Smart placement (default if not set)
{ mode: "smart" }

// Regional placement
{ region: "aws:us-east-1" }
{ region: "weur" }  // Western Europe

// Host-based placement (colocate with database)
{ host: "my-database.example.com:5432" }

// Hostname-based placement
{ hostname: "my-api.example.com" }
```

## Observability

```ts
{
  enabled: true,                    // Enable observability
  headSamplingRate: 1,             // 0.0-1.0 sampling rate
  logs: {
    enabled: true,
    headSamplingRate: 1,
    invocationLogs: true,
    persist: true,
    destinations: ["axiom"],       // e.g., Axiom
  },
  traces: {
    enabled: true,
    headSamplingRate: 1,
    persist: true,
    destinations: ["axiom"],
  },
}
```

## Event Sources

For queue consumers:

```ts
eventSources: [
  {
    queue: orderQueue,
    settings: {
      batchSize: 10,               // Messages per batch
      batchTimeout: 5,             // Seconds to wait for full batch
      maxConcurrency: 2,           // Concurrent batch processing
      maxRetries: 3,               // Retry attempts before DLQ
      retryDelay: 30,              // Seconds between retries
      deadLetterQueue: dlq,        // DLQ for failed messages
    },
  },
],
```

## Output Type

```ts
{
  type: "service";
  id: string;            // UUID
  name: string;          // Worker name
  url?: string;          // workers.dev URL (if enabled)
  bindings: B;           // Normalized bindings
  createdAt: number;
  updatedAt: number;
  compatibilityDate: string;
  compatibilityFlags: string[];
  // ... other resolved props
}
```

## Best Practices

- Use `compatibility: "node"` for Node.js compatibility (`nodejs_compat`)
- Set `url: true` for a workers.dev URL in dev; use `domains` in prod
- Pass secrets via `alchemy.secret.env.SECRET_NAME` (never hardcode)
- DO and Workflow bindings self-reference the host worker automatically — no need for `scriptName` unless cross-worker
- Use `adopt: true` when migrating existing workers into Alchemy
- Set `dev: { port: 3000 }` for local development on a specific port
- For development, run `alchemy dev` from the infra package (Alchemy handles bundling + Miniflare)
