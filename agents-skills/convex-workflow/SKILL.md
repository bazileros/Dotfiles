---
name: convex-dev-workflow
description: Simplify programming long running code flows. Workflows execute durably with configurable retries and delays. Use this skill whenever working with Workflow or related Convex component functionality.
version: 0.4.4
---

> Agents: read this skill fully before writing code that uses Workflow. Follow the installation and configuration steps exactly.

# Workflow

## Instructions

The Workflow component adds durable execution to Convex functions, allowing you to build reliable long-running processes that survive server restarts and handle failures gracefully. It combines queries, mutations, and actions into deterministic workflows with configurable retry policies, parallel execution, and reactive status monitoring. Workflows can run for months with custom delays, be canceled mid-execution, and provide real-time progress updates to multiple subscribers.

### Installation

```bash
npm install @convex-dev/workflow
```

Current npm version: `@convex-dev/workflow@0.4.4`

## Use cases

- **User onboarding flows** that span multiple days with email verification, content generation, and follow-up messages that must complete reliably
- **Data processing pipelines** that orchestrate multiple API calls, transformations, and database updates with automatic retries on transient failures
- **Payment and fulfillment workflows** that coordinate between payment processors, inventory systems, and shipping APIs with precise error handling
- **Content moderation systems** that combine AI analysis, human review queues, and notification steps with configurable delays between stages
- **Batch job orchestration** that processes large datasets by coordinating multiple parallel workers with backpressure and failure recovery

## How it works

You define workflows using `workflow.define()` with deterministic handler functions that orchestrate Convex queries, mutations, and actions through a step context. The component restricts access to non-deterministic APIs like `fetch` and patches others like `Math.random()` to ensure reproducible execution across server restarts.

Workflows are started from mutations or actions using `workflow.start()`, which returns a `WorkflowId` for tracking progress. Steps execute via `ctx.runQuery()`, `ctx.runMutation()`, and `ctx.runAction()` methods, with results passed between steps. Parallel execution happens through `Promise.all()` calls, while retry behavior is configured per-step or globally through workpool options.

The component provides reactive status monitoring through `workflow.status()`, cancellation with `workflow.cancel()`, and completion handling via `onComplete` callbacks. Failed workflows can be restarted from specific steps using `workflow.restart()`, and the system automatically manages step parallelism and resource cleanup.

## When NOT to use

- When a simpler built-in solution exists for your specific use case
- If you are not using Convex as your backend
- When the functionality provided by Workflow is not needed

## Resources

- [npm package](https://www.npmjs.com/package/%40convex-dev%2Fworkflow)
- [GitHub repository](https://github.com/get-convex/workflow)
- [Convex Components Directory](https://www.convex.dev/components/workflow)
- [Convex documentation](https://docs.convex.dev)