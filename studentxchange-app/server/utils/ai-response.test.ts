import assert from "node:assert/strict";
import test from "node:test";
import {
  ClaudeResponseError,
  getClaudeText,
  parseClaudeJson,
} from "./ai-response";

test("rejects a Claude response stopped by max_tokens", () => {
  assert.throws(
    () => getClaudeText({ stop_reason: "max_tokens", content: [{ type: "text", text: "{\"years\":[" }] }),
    (error: any) => error instanceof ClaudeResponseError && error.code === "AI_RESPONSE_TRUNCATED",
  );
});

test("parses fenced JSON and ignores non-text blocks", () => {
  const result = parseClaudeJson(
    { stop_reason: "end_turn", content: [{ type: "thinking" }, { type: "text", text: "```json\n{\"ok\":true}\n```" }] },
  );
  assert.deepEqual(result, { ok: true });
});

test("rejects empty and malformed Claude responses", () => {
  assert.throws(() => getClaudeText({ stop_reason: "end_turn", content: [] }), /no usable text/i);
  assert.throws(() => parseClaudeJson({ stop_reason: "end_turn", content: [{ type: "text", text: "{\"ok\":" }] }), /invalid JSON/i);
});