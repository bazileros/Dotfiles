---
name: convex-webhook-sender
description: Convex component for reliable webhook delivery with Ed25519 signing, automatic retries, exponential backoff, and complete delivery tracking. Use this skill whenever the user mentions webhook, signing, ed25519. Also trigger when discussing retry, send webhooks from convex mutations, webhook retry logic convex, even if they don't explicitly ask for Webhook Sender.
---

# Webhook Sender

## Instructions

Use Webhook Sender to convex component for reliable webhook delivery with ed25519 signing, automatic retries, exponential backoff, and complete delivery tracking. This Convex component integrates directly with your backend.

### Installation

```bash
npm install convex-webhook-sender
```

### Capabilities

- Eliminates webhook infrastructure development with built-in signing, retries, and delivery tracking
- Reduces webhook failures through automatic retry logic with exponential backoff and rate limiting
- Provides complete delivery visibility with attempt history, status codes, and error tracking
- Ensures webhook security with Ed25519 signing and included signature verification utilities

## Examples

### how to send webhooks from Convex mutations

The convex-webhook-sender component lets you send webhooks directly from Convex mutations using webhooks.send(). Register webhook destinations with webhooks.registerDestination() and the component handles HMAC signing, retries, and delivery tracking automatically.

### webhook retry logic Convex

The convex-webhook-sender component provides automatic retry logic with exponential backoff for 5xx responses and network failures. Configure maxRetries and retryWindowMs per destination to control retry behavior without building custom retry infrastructure.

### HMAC webhook signing Convex

The component automatically signs webhooks using HMAC-SHA256 with Standard Webhooks compatible secrets. It includes signature verification utilities for recipients and exposes signing secrets through getSigningSecret() for webhook validation.

### webhook delivery tracking Convex

Track webhook delivery status with getWebhookStatus() and view complete attempt history using getDeliveryHistory(). The component logs all delivery attempts including status codes, timestamps, and error details for debugging failed webhooks.

## When NOT to use

- When a simpler built-in solution exists for your specific use case
- If you are not using Convex as your backend
- When the functionality provided by Webhook Sender is not needed

## Troubleshooting

**How does convex-webhook-sender handle webhook signing?**

The convex-webhook-sender component uses HMAC-SHA256 signing with Standard Webhooks compatible secrets prefixed with 'whsec_'. It automatically adds webhook-signature headers and includes verification utilities for recipients to validate webhook authenticity.

**What retry logic does this webhook component provide?**

The component automatically retries webhooks on 5xx status codes and network failures using exponential backoff. You can configure maxRetries and retryWindowMs per destination, with parallel or serialized (FIFO) delivery modes available.

**Can I track webhook delivery status and failures?**

Yes, convex-webhook-sender provides complete delivery tracking through getWebhookStatus(), getDeliveryHistory(), and getFailedWebhooks() methods. The component logs all delivery attempts with status codes, timestamps, and error details for comprehensive monitoring.

**Does this component support rate limiting for webhooks?**

The convex-webhook-sender component includes per-destination rate limiting with configurable requests per second. This prevents overwhelming webhook endpoints while maintaining reliable delivery through the built-in retry mechanism.

## Resources

- [npm package](https://www.npmjs.com/package/convex-webhook-sender)
- [GitHub repository](https://github.com/TimpiaAI/convex-webhook-sender)
- [Live demo](https://webhook-sender-demo.vercel.app)
- [Convex Components Directory](https://www.convex.dev/components/convex-webhook-sender)
- [Convex documentation](https://docs.convex.dev)