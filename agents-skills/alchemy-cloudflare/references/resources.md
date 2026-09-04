# Storage, AI & Infrastructure Resources

## D1 Database

Serverless SQL database built on SQLite.

### Import

```ts
import { D1Database } from "alchemy/cloudflare";
```

### Signature

```ts
D1Database(id: string, props?: D1DatabaseProps): Promise<D1Database>
```

### Options

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | `${app}-${stage}-${id}` | Database name in Cloudflare |
| `primaryLocationHint` | `"wnam" \| "enam" \| "weur" \| "eeur" \| "apac" \| "oc"` | — | Primary data location |
| `readReplication` | `{ mode: "auto" \| "disabled" }` | — | Read replication mode |
| `migrationsDir` | `string` | — | Directory containing `.sql` migration files |
| `migrationsTable` | `string` | `"d1_migrations"` | Table tracking applied migrations |
| `importFiles` | `string[]` | — | SQL files to import after migrations |
| `clone` | `D1Database \| { id } \| { name }` | — | Clone data from an existing database |
| `adopt` | `boolean` | `false` | Adopt existing database with same name |
| `delete` | `boolean` | `true` | Delete database when removed from infra |
| `dev` | `{ remote?, force? }` | — | Local dev configuration |
| `jurisdiction` | `"default" \| "eu" \| "fedramp"` | `"default"` | Regulatory jurisdiction |

### Output

```ts
{
  type: "d1";
  id: string;            // Cloudflare UUID
  name: string;
  migrationsDir?: string;
  migrationsTable: string;
  dev: { id: string; remote: boolean };
  jurisdiction: string;
}
```

### Example

```ts
const db = await D1Database("app", {
  name: "my-app-db",
  migrationsDir: "./migrations",
  primaryLocationHint: "weur",
});
```

### Important

- Only `readReplication.mode` can be updated after creation
- `primaryLocationHint` and `jurisdiction` cannot be changed after creation
- Migrations are auto-applied from `migrationsDir` during `alchemy dev` (local) or `alchemy deploy` (remote)
- Local dev uses Miniflare for D1 emulation; set `dev: { remote: true }` to use the real remote DB

---

## KV Namespace

Key-value storage for session data, cache, config, etc.

### Import

```ts
import { KVNamespace } from "alchemy/cloudflare";
```

### Signature

```ts
KVNamespace(id: string, props?: KVNamespaceProps): Promise<KVNamespace>
```

### Options

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `${app}-${stage}-${id}` | Namespace title in Cloudflare |
| `values` | `KVPair[]` | — | Initial key-value pairs (bulk inserted) |
| `adopt` | `boolean` | `false` | Adopt existing namespace with same title |
| `delete` | `boolean` | `true` | Delete when removed from infra |

### KVPair

```ts
{
  key: string;
  value: string | object;         // Objects are JSON-serialized
  expiration?: number;            // Expiration in seconds from now
  expirationTtl?: number;         // Expiration timestamp (epoch seconds)
  metadata?: any;
}
```

### Output

```ts
{
  type: "kv_namespace";
  namespaceId: string;
  title: string;
  values?: KVPair[];
  dev: { id: string; remote: boolean };
  createdAt: number;
  modifiedAt: number;
}
```

### Example

```ts
const sessionStore = await KVNamespace("session-store", {
  title: "Session Store",
  values: [  // Optional initial data
    { key: "config", value: { theme: "dark", locale: "en" } }
  ],
});
```

### Important

- Values are bulk-inserted in batches of 10,000 with exponential backoff
- Local dev uses Miniflare; set `dev: { remote: true }` for remote KV in dev

---

## R2 Bucket

S3-compatible object storage for images, documents, uploads.

### Import

```ts
import { R2Bucket } from "alchemy/cloudflare";
```

### Signature

```ts
R2Bucket(id: string, props?: R2BucketProps): Promise<R2Bucket>
```

### Options

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | `${app}-${stage}-${id}` | Bucket name in Cloudflare |
| `location` | `"auto" \| "weur" \| "eeur" \| "enam" \| "wnam" \| "apac" \| "oc"` | `"auto"` | Bucket location |
| `devDomain` | `boolean` | `false` | Enable dev domain for local testing |
| `customDomains` | `(string \| { domain, zoneId?, adopt? })[]` | — | Custom domains for the bucket |
| `adopt` | `boolean` | `false` | Adopt existing bucket |
| `delete` | `boolean` | `true` | Delete when removed from infra |

### Output

```ts
{
  type: "r2_bucket";
  id: string;
  name: string;
  location: string;
  devDomain?: boolean;
}
```

### Example

```ts
const images = await R2Bucket("images", {
  name: "my-app-images",
  location: "weur",
  devDomain: true,
});
```

---

## Queue

Message queue for async processing.

### Import

```ts
import { Queue } from "alchemy/cloudflare";
```

### Signature

```ts
Queue<T>(id: string, props?: QueueProps): Promise<Queue<T>>
```

### Options

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | `${app}-${stage}-${id}` | Queue name in Cloudflare |
| `adopt` | `boolean` | `false` | Adopt existing queue |
| `delete` | `boolean` | `true` | Delete when removed from infra |

### Example

```ts
const orderQueue = await Queue<OrderMessage>("order-queue", {
  name: "my-app-order-queue",
});

const dlq = await Queue("order-dlq", {
  name: "my-app-order-dlq",
});
```

### Queue Consumer

Queues are consumed via `eventSources` on a Worker:

```ts
await Worker("consumer", {
  entrypoint: "src/consumer.ts",
  eventSources: [{
    queue: orderQueue,
    settings: {
      batchSize: 10,
      maxConcurrency: 2,
      maxRetries: 3,
      retryDelay: 30,
      deadLetterQueue: dlq,
    },
  }],
});
```

The consumer Worker exports a `queue()` handler:

```ts
export default {
  async queue(batch: MessageBatch<OrderMessage>, env: Env, ctx: ExecutionContext) {
    for (const msg of batch.messages) {
      try {
        await processOrder(msg.body);
        msg.ack();
      } catch {
        msg.retry({ delaySeconds: 30 });
      }
    }
  },
};
```

---

## Durable Object Namespace

Stateful objects with SQLite-backed persistence.

### Import

```ts
import { DurableObjectNamespace } from "alchemy/cloudflare";
```

### Signature (synchronous — NOT async)

```ts
DurableObjectNamespace<T>(id: string, props: DurableObjectNamespaceProps): DurableObjectNamespace<T>
```

### Options

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `className` | `string` | **Yes** | The class name in the Worker that implements the DO |
| `scriptName` | `string` | No | Target script name (cross-worker). Omit for self-referencing DO |
| `sqlite` | `boolean` | No | Use SQLite storage backend |
| `environment` | `string` | No | Environment for the namespace |
| `namespaceId` | `string` | No | Pre-existing namespace ID (for migration/adoption) |

### Example

```ts
// Self-referencing DO (lives in the same worker)
const chatRooms = DurableObjectNamespace("chat-rooms", {
  className: "ChatRoom",
  sqlite: true,
});

// Cross-worker DO reference
const remoteDo = DurableObjectNamespace("remote-do", {
  className: "WorkerDo",
  scriptName: "other-worker",
});
```

### Important

- **Synchronous** — do NOT `await`
- DO migrations are auto-managed by Alchemy when deploying
- Self-referencing DOs (no `scriptName`) are automatically bound to the host worker
- `sqlite: true` enables SQLite storage (recommended for new DOs)

---

## AI Binding

Workers AI for running ML models (text generation, embeddings, image classification, etc.).

### Import

```ts
import { Ai } from "alchemy/cloudflare";
```

### Signature (synchronous — NOT async)

```ts
Ai<Models>(): { type: "ai"; _phantom: Models }
```

### Example

```ts
const ai = Ai();

await Worker("my-worker", {
  entrypoint: "src/index.ts",
  bindings: {
    AI: ai,
  },
});
```

### Important

- **Synchronous** — do NOT `await`
- No props needed — just call `Ai()`
- Access in worker code via `env.AI`
- See [Workers AI docs](https://developers.cloudflare.com/workers-ai/) for available models

---

## Workflow

Durable, multi-step background workflows.

### Import

```ts
import { Workflow } from "alchemy/cloudflare";
```

### Signature (synchronous — NOT async)

```ts
Workflow(id: string, props: WorkflowProps): Workflow
```

### Options

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `workflowName` | `string` | **Yes** | Workflow name in Cloudflare |
| `className` | `string` | **Yes** | The class implementing the workflow |
| `scriptName` | `string` | No | Target script (cross-script). Omit for self-referencing |

### Example

```ts
const processingWorkflow = Workflow("processing", {
  workflowName: "order-processing",
  className: "OrderProcessingWorkflow",
});
```

### Important

- **Synchronous** — do NOT `await`
- Self-referencing by default (lives in the worker that declares it)
- Use `scriptName` for cross-worker workflow references

---

## Hyperdrive

Accelerated database connection pooling (PostgreSQL, MySQL).

### Import

```ts
import { Hyperdrive } from "alchemy/cloudflare";
```

### Signature

```ts
Hyperdrive(id: string, props: HyperdriveProps): Promise<Hyperdrive>
```

### Options

| Prop | Type | Description |
|------|------|-------------|
| `name` | `string` | Hyperdrive name |
| `database` | `string` | Connection string or D1 binding |
| `origin` | `{ host, port, scheme?, database?, user?, password? }` | Database origin config |
| `caching` | `{ enabled?, maxAge?, staleWhileRevalidate? }` | Query caching |
| `adopt` | `boolean` | Adopt existing |

---

## Vectorize

Vector search index for AI embeddings.

### Import

```ts
import { VectorizeIndex } from "alchemy/cloudflare";
```

### Signature

```ts
VectorizeIndex(id: string, props: VectorizeIndexProps): Promise<VectorizeIndex>
```

### Options

| Prop | Type | Description |
|------|------|-------------|
| `name` | `string` | Index name |
| `dimensions` | `number` | Vector dimensions |
| `metric` | `"cosine" \| "euclidean" \| "dot-product"` | Distance metric |
| `description` | `string` | Index description |

---

## AISearch / AIGateway

### AISearch

```ts
import { AISearch } from "alchemy/cloudflare";

const search = await AISearch("search", {
  name: "my-search",
});
```

### AIGateway

```ts
import { AIGateway } from "alchemy/cloudflare";

const gateway = await AIGateway("gateway", {
  name: "my-ai-gateway",
});
```

---

## Browser Rendering

Remote browser automation via Puppeteer/Playwright.

### Import

```ts
import { BrowserRendering } from "alchemy/cloudflare";
```

### Signature (synchronous)

```ts
BrowserRendering(id: string): { type: "browser_rendering" }
```

### Example

```ts
const browser = BrowserRendering("browser");

await Worker("renderer", {
  entrypoint: "src/index.ts",
  bindings: { BROWSER: browser },
});
```

---

## Secrets & Secrets Store

### Secret

```ts
import { Secret } from "alchemy/cloudflare";
```

For individual secrets that can be referenced across resources:

```ts
const apiKey = Secret("api-key", "actual-secret-value");
```

### Secrets Store

```ts
import { SecretsStore } from "alchemy/cloudflare";

const store = await SecretsStore("secrets", {
  name: "my-secrets-store",
});
```

---

## Logpush

Push Workers logs to external destinations (Axiom, Datadog, etc.).

### Import

```ts
import { LogpushJob } from "alchemy/cloudflare";
```

### Options

| Prop | Type | Description |
|------|------|-------------|
| `name` | `string` | Job name |
| `destination` | `{ type: "axiom" \| "datadog" \| ... }` | Log destination config |
| `dataset` | `"workers"` | Dataset type |
| `enabled` | `boolean` | Enable/disable job |

---

## Analytics Engine

```ts
import { AnalyticsEngine } from "alchemy/cloudflare";

const analytics = AnalyticsEngine("analytics", {
  name: "my-analytics",
});
```

---

## Container

Run containerized workloads on Cloudflare.

### Import

```ts
import { Container } from "alchemy/cloudflare";
```

### Signature

```ts
Container(id: string, props: ContainerProps): Promise<Container>
```

### Options

| Prop | Type | Description |
|------|------|-------------|
| `name` | `string` | Container name |
| `image` | `string` | Container image URL |
| `entrypoint` | `string[]` | Entrypoint command |
| `env` | `Record<string, string>` | Environment variables |
| `resources` | `{ cpu?, memory? }` | Resource allocation |
