import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const studentLancingServerFiles = [
  "./lancing-ai.ts",
  "./routes/lancing-ai.ts",
  "./routes/lancing.ts",
  "./routes/coding-arena.ts",
  "./routes/placement-readiness.ts",
  "./routes/placement-cell.ts",
  "./routes/assessments.ts",
];

test("StudentLancing server paths contain no Claude provider imports or calls", () => {
  for (const file of studentLancingServerFiles) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(
      source,
      /@anthropic-ai\/sdk|anthropic\.messages\.create|claude-(?:haiku|sonnet|opus)|CLAUDE_API_KEY|ANTHROPIC_API_KEY/i,
      `${file} must never invoke Claude; Career Compass is a separate system`,
    );
  }
});