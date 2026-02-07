import test from "node:test";
import assert from "node:assert/strict";
import { approach, clamp, randomFromRange } from "../src/utils/math.js";

test("clamp limita valores fora do intervalo", () => {
  assert.equal(clamp(12, 0, 10), 10);
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(clamp(7, 0, 10), 7);
});

test("approach aproxima alvo sem ultrapassar", () => {
  assert.equal(approach(0, 10, 4), 4);
  assert.equal(approach(8, 10, 4), 10);
  assert.equal(approach(10, 0, 3), 7);
});

test("randomFromRange gera valores dentro do intervalo", () => {
  for (let index = 0; index < 100; index += 1) {
    const value = randomFromRange(-5, 5);
    assert.ok(value >= -5 && value <= 5);
  }
});
