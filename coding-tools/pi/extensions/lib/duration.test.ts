import assert from "node:assert/strict";
import { test } from "node:test";
import { humanDuration } from "./duration.ts";

test("humanDuration keeps tenths under a minute", () => {
	assert.equal(humanDuration(0), "0.0s");
	assert.equal(humanDuration(4200), "4.2s");
	assert.equal(humanDuration(59_900), "59.9s");
});

test("humanDuration adds minutes, hours, days, weeks and months", () => {
	assert.equal(humanDuration(60_000), "1m");
	assert.equal(humanDuration(192_000), "3m 12s");
	assert.equal(humanDuration(3_600_000), "1h");
	assert.equal(humanDuration(8_100_000), "2h 15m");
	assert.equal(humanDuration(86_400_000), "1d");
	assert.equal(humanDuration(273_600_000), "3d 4h");
	assert.equal(humanDuration(1_209_600_000), "2w");
	assert.equal(humanDuration(2_073_600_000), "3w 3d");
	assert.equal(humanDuration(2_592_000_000), "1mo");
	assert.equal(humanDuration(2_678_400_000), "1mo 1d");
	assert.equal(humanDuration(31_536_000_000), "1y");
});
