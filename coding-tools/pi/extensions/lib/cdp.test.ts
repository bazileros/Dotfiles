import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { findCdp } from "./cdp.ts";

test("findCdp returns the first port that speaks /json/version", async () => {
	const server = createServer((_request, response) => {
		response.setHeader("content-type", "application/json");
		response.end(JSON.stringify({ Browser: "Chrome/140 CEF" }));
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const { port } = server.address() as AddressInfo;

	try {
		const found = await findCdp([port]);
		assert.equal(found?.port, port);
		assert.equal(found?.url, `http://127.0.0.1:${port}`);
		assert.match(found?.browser ?? "", /CEF/);
	} finally {
		await new Promise<void>((resolve) => server.close(() => resolve()));
	}
});

test("findCdp returns undefined when nothing is listening", async () => {
	assert.equal(await findCdp([1]), undefined);
});
