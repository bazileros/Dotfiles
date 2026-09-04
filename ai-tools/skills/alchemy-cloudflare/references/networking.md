# Networking Resources

## Custom Domain

Attach a custom domain to a Worker.

### Import

```ts
import { CustomDomain } from "alchemy/cloudflare";
```

### Signature

```ts
CustomDomain(id: string, props: CustomDomainProps): Promise<CustomDomain>
```

### Options

| Prop | Type | Description |
|------|------|-------------|
| `domainName` | `string` | The domain (e.g. `"api.example.com"`) |
| `zoneId` | `string` | Cloudflare zone ID (auto-detected if omitted) |
| `adopt` | `boolean` | Adopt existing custom domain |
| `overrideExistingOrigin` | `boolean` | Override if origin already exists |
| `environment` | `string` | Environment for the domain |

### Important

- Domains are typically set on Workers via the `domains` prop instead of creating standalone `CustomDomain` resources
- Use standalone `CustomDomain` when the domain needs to reference a Worker in a different Alchemy app

---

## Route

Map URL patterns to a Worker.

### Import

```ts
import { Route } from "alchemy/cloudflare";
```

### Signature

```ts
Route(id: string, props: RouteProps): Promise<Route>
```

### Options

| Prop | Type | Description |
|------|------|-------------|
| `pattern` | `string` | URL pattern (e.g. `"api.example.com/*"`) |
| `zoneId` | `string` | Zone ID (auto-detected) |
| `adopt` | `boolean` | Adopt existing route |

---

## DNS Records

Manage DNS records in a Cloudflare zone.

### Import

```ts
import { DNSRecord } from "alchemy/cloudflare";
```

### Signature

```ts
DNSRecord(id: string, props: DNSRecordProps): Promise<DNSRecord>
```

### Options

| Prop | Type | Description |
|------|------|-------------|
| `zoneId` | `string` | Zone ID |
| `name` | `string` | Record name (e.g. `"www"`, `"@"`, `"api"`) |
| `type` | `"A" \| "AAAA" \| "CNAME" \| "TXT" \| "MX" \| "SRV" \| ...` | DNS record type |
| `content` | `string` | Record value |
| `ttl` | `number` | TTL in seconds (`1` = auto) |
| `proxied` | `boolean` | Whether proxied through Cloudflare |
| `priority` | `number` | Priority (for MX/SRV) |

### Example

```ts
const record = await DNSRecord("www", {
  zoneId: "abc123",
  name: "www",
  type: "CNAME",
  content: "my-worker.workers.dev",
  proxied: true,
});
```

---

## Tunnel & Quick Tunnel

### Tunnel (Cloudflare Tunnel)

```ts
import { Tunnel } from "alchemy/cloudflare";

const tunnel = await Tunnel("tunnel", {
  name: "my-tunnel",
});
```

### Quick Tunnel (ephemeral)

```ts
import { QuickTunnel } from "alchemy/cloudflare";

const tunnel = QuickTunnel("quick-tunnel", {
  name: "my-quick-tunnel",
});
```

Quick Tunnels are ephemeral — great for testing.

---

## VPC & VPC Service Reference

### VPC

```ts
import { VPC } from "alchemy/cloudflare";

const vpc = await VPC("my-vpc", {
  name: "my-vpc",
  region: "weur",
});
```

### VPC Service Reference

```ts
import { VPCServiceRef } from "alchemy/cloudflare";

const dbRef = VPCServiceRef("db-ref", {
  vpc,
  service: "database-service",
});
```

---

## Health Check

Monitor endpoint health.

```ts
import { HealthCheck } from "alchemy/cloudflare";

const check = await HealthCheck("api-health", {
  name: "API Health Check",
  address: "https://api.example.com/health",
  interval: 60,
  timeout: 10,
  retries: 2,
});
```
