import test from "node:test";
import assert from "node:assert/strict";
import { AppError } from "../src/utils/AppError.js";
import { escapeRegex } from "../src/utils/escapeRegex.js";

test("escapeRegex makes metacharacters literal", () => {
  const value = "video (part 1).* [final]?";
  const regex = new RegExp(escapeRegex(value));
  assert.equal(regex.test(value), true);
  assert.equal(regex.test("video part 1 anything"), false);
});

test("AppError preserves status, message, and validation details", () => {
  const details = [{ path: "body.title", message: "Title is required" }];
  const error = new AppError(400, "Invalid request", details);
  assert.equal(error.statusCode, 400);
  assert.equal(error.message, "Invalid request");
  assert.deepEqual(error.details, details);
  assert.equal(error.isOperational, true);
});
