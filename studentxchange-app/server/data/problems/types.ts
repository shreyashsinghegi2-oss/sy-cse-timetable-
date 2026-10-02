// ─── Shared types + factories for the static 1000-problem bank ───────────────

export type Diff = "Easy" | "Medium" | "Hard";

export interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface Example {
  input: string;
  output: string;
  explanation?: string;
}

export interface Problem {
  slug: string;
  title: string;
  difficulty: Diff;
  tags: string[];
  roadmapSkillTags: string[];
  languages: string[];
  statement: string;
  constraints: string;
  examples: Example[];
  testCases: TestCase[];
  timeLimitMs: number;
  memoryLimitMb: number;
  hint: string;
  starterCode: Record<string, string>;
  optimalComplexity: { time: string; space: string };
}

export const IO =
  "\n\n**Input** is read from standard input. **Output** must be printed to standard output.";

export const ALGO_LANGS = ["python", "javascript", "java", "cpp"] as const;

const DEF_STARTER: Record<string, string> = {
  python:
    "import sys\n\ndef solve():\n    data = sys.stdin.read().split('\\n')\n    # TODO: write your solution\n    pass\n\nsolve()\n",
  javascript:
    "const lines = require('fs').readFileSync(0, 'utf8').trim().split('\\n');\n// TODO: write your solution\n",
  java:
    "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // TODO: write your solution\n    }\n}\n",
  cpp:
    "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // TODO: write your solution\n    return 0;\n}\n",
};

/** Factory for standard algorithmic problems (Python / JS / Java / C++). */
export function mkP(
  slug: string,
  title: string,
  diff: Diff,
  tags: string[],
  stmt: string,
  cstr: string,
  exs: [string, string, string?][],
  tcs: [string, string, boolean?][],
  hint: string,
  rstags?: string[],
  timeMs = 2000,
  memMb = 256,
): Problem {
  return {
    slug,
    title,
    difficulty: diff,
    tags,
    roadmapSkillTags: rstags || tags,
    languages: [...ALGO_LANGS],
    statement: stmt + IO,
    constraints: cstr,
    examples: exs.map(([i, o, e]) => ({ input: i, output: o, explanation: e })),
    testCases: tcs.map(([i, o, h]) => ({
      input: i,
      expectedOutput: o,
      isHidden: !!h,
    })),
    timeLimitMs: timeMs,
    memoryLimitMb: memMb,
    hint,
    starterCode: DEF_STARTER,
    optimalComplexity: { time: "O(n)", space: "O(1)" },
  };
}

/** Factory for SQL-only problems. */
export function mkSQL(
  slug: string,
  title: string,
  diff: Diff,
  stmt: string,
  cstr: string,
  exs: [string, string][],
  tcs: [string, string, boolean?][],
  hint: string,
): Problem {
  return {
    slug,
    title,
    difficulty: diff,
    tags: ["SQL"],
    roadmapSkillTags: ["SQL", "Databases"],
    languages: ["sql"],
    statement: stmt,
    constraints: cstr,
    examples: exs.map(([i, o]) => ({ input: i, output: o })),
    testCases: tcs.map(([i, o, h]) => ({
      input: i,
      expectedOutput: o,
      isHidden: !!h,
    })),
    timeLimitMs: 3000,
    memoryLimitMb: 256,
    hint,
    starterCode: { sql: "-- Write your SQL query here\nSELECT " },
    optimalComplexity: { time: "O(n log n)", space: "O(n)" },
  };
}
