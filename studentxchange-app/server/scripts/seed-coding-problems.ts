// Seed script for Coding Arena problems.
// Run: npx tsx server/scripts/seed-coding-problems.ts
// Judging model: full-program stdin/stdout (Judge0 CE). For SQL problems the
// test case "input" holds setup SQL that the judge prepends to the user query.

import { getFirebaseAdmin, admin } from "../firebase-admin";

type TestCase = { input: string; expectedOutput: string; isHidden: boolean };

interface SeedProblem {
  slug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  roadmapSkillTags: string[];
  languages: string[];
  statement: string;
  constraints: string;
  examples: { input: string; output: string; explanation?: string }[];
  testCases: TestCase[];
  timeLimitMs: number;
  memoryLimitMb: number;
  optimalComplexity: { time: string; space: string };
  hint: string;
}

const IO_NOTE =
  "\n\n**Input** is read from standard input. **Output** must be printed to standard output.";

function starterFor(langs: string[], readsNote: string) {
  const starter: Record<string, string> = {};
  if (langs.includes("python"))
    starter.python = `import sys\n\ndef main():\n    data = sys.stdin.read().split("\\n")\n    # ${readsNote}\n    # TODO: write your solution\n    pass\n\nmain()\n`;
  if (langs.includes("javascript"))
    starter.javascript = `const data = require("fs").readFileSync(0, "utf8").trim().split("\\n");\n// ${readsNote}\n// TODO: write your solution\n`;
  if (langs.includes("java"))
    starter.java = `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // ${readsNote}\n        // TODO: write your solution\n    }\n}\n`;
  if (langs.includes("cpp"))
    starter.cpp = `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // ${readsNote}\n    // TODO: write your solution\n    return 0;\n}\n`;
  if (langs.includes("sql"))
    starter.sql = `-- ${readsNote}\n-- Write a single SELECT query.\n`;
  return starter;
}

const ALGO_LANGS = ["python", "javascript", "java", "cpp"];

const problems: SeedProblem[] = [
  // ---------------- ARRAYS ----------------
  {
    slug: "two-sum-indices",
    title: "Two Sum",
    difficulty: "Easy",
    tags: ["Arrays", "Hash Map"],
    roadmapSkillTags: ["Arrays", "Data Structures"],
    languages: ALGO_LANGS,
    statement:
      "Given an array of integers and a target, print the 0-based indices `i j` (i < j) of the two numbers that add up to the target. Exactly one solution exists." +
      IO_NOTE +
      "\n\nLine 1: n (array size). Line 2: n space-separated integers. Line 3: target.",
    constraints: "2 ≤ n ≤ 10^5, -10^9 ≤ values ≤ 10^9",
    examples: [
      { input: "4\n2 7 11 15\n9", output: "0 1", explanation: "2 + 7 = 9" },
    ],
    testCases: [
      { input: "4\n2 7 11 15\n9", expectedOutput: "0 1", isHidden: false },
      { input: "3\n3 2 4\n6", expectedOutput: "1 2", isHidden: false },
      { input: "2\n-5 5\n0", expectedOutput: "0 1", isHidden: true },
      { input: "6\n1 9 8 2 7 3\n10", expectedOutput: "0 1", isHidden: true },
      { input: "5\n1000000000 -1000000000 3 4 5\n0", expectedOutput: "0 1", isHidden: true },
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(n)", space: "O(n)" },
    hint: "Store seen values with their index in a hash map; look up target - x.",
  },
  {
    slug: "max-subarray-sum",
    title: "Maximum Subarray Sum",
    difficulty: "Easy",
    tags: ["Arrays", "Kadane"],
    roadmapSkillTags: ["Arrays", "Problem Solving"],
    languages: ALGO_LANGS,
    statement:
      "Given an array of integers, print the largest possible sum of a contiguous non-empty subarray." +
      IO_NOTE +
      "\n\nLine 1: n. Line 2: n space-separated integers.",
    constraints: "1 ≤ n ≤ 10^5, -10^4 ≤ values ≤ 10^4",
    examples: [
      { input: "9\n-2 1 -3 4 -1 2 1 -5 4", output: "6", explanation: "[4,-1,2,1] sums to 6" },
    ],
    testCases: [
      { input: "9\n-2 1 -3 4 -1 2 1 -5 4", expectedOutput: "6", isHidden: false },
      { input: "1\n-7", expectedOutput: "-7", isHidden: false },
      { input: "5\n-3 -1 -8 -2 -5", expectedOutput: "-1", isHidden: true },
      { input: "6\n5 4 -1 7 8 -100", expectedOutput: "23", isHidden: true },
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    hint: "Kadane's algorithm: running best-ending-here vs global best.",
  },
  {
    slug: "rotate-array-k",
    title: "Rotate Array by K",
    difficulty: "Easy",
    tags: ["Arrays"],
    roadmapSkillTags: ["Arrays"],
    languages: ALGO_LANGS,
    statement:
      "Rotate an array to the right by k steps and print the result space-separated." +
      IO_NOTE +
      "\n\nLine 1: n and k. Line 2: n integers.",
    constraints: "1 ≤ n ≤ 10^5, 0 ≤ k ≤ 10^9",
    examples: [{ input: "7 3\n1 2 3 4 5 6 7", output: "5 6 7 1 2 3 4" }],
    testCases: [
      { input: "7 3\n1 2 3 4 5 6 7", expectedOutput: "5 6 7 1 2 3 4", isHidden: false },
      { input: "3 0\n1 2 3", expectedOutput: "1 2 3", isHidden: false },
      { input: "2 5\n-1 100", expectedOutput: "100 -1", isHidden: true },
      { input: "4 4\n9 8 7 6", expectedOutput: "9 8 7 6", isHidden: true },
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    hint: "k mod n; reverse whole array, then reverse the two halves.",
  },
  {
    slug: "product-except-self",
    title: "Product of Array Except Self",
    difficulty: "Medium",
    tags: ["Arrays", "Prefix Product"],
    roadmapSkillTags: ["Arrays", "Problem Solving"],
    languages: ALGO_LANGS,
    statement:
      "For each index i, print the product of all elements except nums[i], space-separated. Do not use division." +
      IO_NOTE +
      "\n\nLine 1: n. Line 2: n integers.",
    constraints: "2 ≤ n ≤ 10^5, -30 ≤ values ≤ 30, products fit in 64-bit",
    examples: [{ input: "4\n1 2 3 4", output: "24 12 8 6" }],
    testCases: [
      { input: "4\n1 2 3 4", expectedOutput: "24 12 8 6", isHidden: false },
      { input: "5\n-1 1 0 -3 3", expectedOutput: "0 0 9 0 0", isHidden: false },
      { input: "2\n5 7", expectedOutput: "7 5", isHidden: true },
      { input: "3\n0 0 4", expectedOutput: "0 0 0", isHidden: true },
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(n)", space: "O(1) extra" },
    hint: "Prefix products left-to-right, then multiply suffix products right-to-left.",
  },
  {
    slug: "trapping-rain-water",
    title: "Trapping Rain Water",
    difficulty: "Hard",
    tags: ["Arrays", "Two Pointers"],
    roadmapSkillTags: ["Arrays", "Problem Solving"],
    languages: ALGO_LANGS,
    statement:
      "Given an elevation map (array of non-negative heights, bar width 1), print how much water it traps after raining." +
      IO_NOTE +
      "\n\nLine 1: n. Line 2: n integers.",
    constraints: "1 ≤ n ≤ 2·10^4, 0 ≤ heights ≤ 10^5",
    examples: [{ input: "12\n0 1 0 2 1 0 1 3 2 1 2 1", output: "6" }],
    testCases: [
      { input: "12\n0 1 0 2 1 0 1 3 2 1 2 1", expectedOutput: "6", isHidden: false },
      { input: "6\n4 2 0 3 2 5", expectedOutput: "9", isHidden: false },
      { input: "3\n1 2 3", expectedOutput: "0", isHidden: true },
      { input: "5\n5 0 0 0 5", expectedOutput: "15", isHidden: true },
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    hint: "Two pointers moving inward, tracking left-max and right-max.",
  },
  // ---------------- STRINGS ----------------
  {
    slug: "valid-anagram",
    title: "Valid Anagram",
    difficulty: "Easy",
    tags: ["Strings", "Hash Map"],
    roadmapSkillTags: ["Strings", "Data Structures"],
    languages: ALGO_LANGS,
    statement:
      "Given two lowercase words on two lines, print `true` if the second is an anagram of the first, else `false`." +
      IO_NOTE,
    constraints: "1 ≤ length ≤ 5·10^4",
    examples: [{ input: "anagram\nnagaram", output: "true" }],
    testCases: [
      { input: "anagram\nnagaram", expectedOutput: "true", isHidden: false },
      { input: "rat\ncar", expectedOutput: "false", isHidden: false },
      { input: "a\na", expectedOutput: "true", isHidden: true },
      { input: "ab\nabb", expectedOutput: "false", isHidden: true },
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    hint: "Count character frequencies (26 letters).",
  },
  {
    slug: "reverse-words",
    title: "Reverse Words in a String",
    difficulty: "Easy",
    tags: ["Strings"],
    roadmapSkillTags: ["Strings"],
    languages: ALGO_LANGS,
    statement:
      "Given a sentence (may include extra spaces), print the words in reverse order separated by single spaces." +
      IO_NOTE,
    constraints: "1 ≤ length ≤ 10^4",
    examples: [{ input: "the sky is blue", output: "blue is sky the" }],
    testCases: [
      { input: "the sky is blue", expectedOutput: "blue is sky the", isHidden: false },
      { input: "  hello   world  ", expectedOutput: "world hello", isHidden: false },
      { input: "a", expectedOutput: "a", isHidden: true },
      { input: "one  two   three", expectedOutput: "three two one", isHidden: true },
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(n)", space: "O(n)" },
    hint: "Split on whitespace, filter empties, reverse, join.",
  },
  {
    slug: "longest-substring-no-repeat",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    tags: ["Strings", "Sliding Window"],
    roadmapSkillTags: ["Strings", "Problem Solving"],
    languages: ALGO_LANGS,
    statement:
      "Given a string, print the length of its longest substring without repeating characters." + IO_NOTE,
    constraints: "0 ≤ length ≤ 5·10^4, printable ASCII",
    examples: [{ input: "abcabcbb", output: "3", explanation: '"abc" has length 3' }],
    testCases: [
      { input: "abcabcbb", expectedOutput: "3", isHidden: false },
      { input: "bbbbb", expectedOutput: "1", isHidden: false },
      { input: "pwwkew", expectedOutput: "3", isHidden: true },
      { input: "dvdf", expectedOutput: "3", isHidden: true },
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(n)", space: "O(min(n, alphabet))" },
    hint: "Sliding window with a map of last seen positions.",
  },
  {
    slug: "group-anagrams",
    title: "Group Anagrams (Count Groups)",
    difficulty: "Medium",
    tags: ["Strings", "Hash Map"],
    roadmapSkillTags: ["Strings", "Data Structures"],
    languages: ALGO_LANGS,
    statement:
      "Given n lowercase words, print how many distinct anagram groups they form." +
      IO_NOTE +
      "\n\nLine 1: n. Line 2: n space-separated words.",
    constraints: "1 ≤ n ≤ 10^4, word length ≤ 100",
    examples: [
      { input: "6\neat tea tan ate nat bat", output: "3", explanation: "{eat,tea,ate} {tan,nat} {bat}" },
    ],
    testCases: [
      { input: "6\neat tea tan ate nat bat", expectedOutput: "3", isHidden: false },
      { input: "1\nabc", expectedOutput: "1", isHidden: false },
      { input: "4\naa aa aa aa", expectedOutput: "1", isHidden: true },
      { input: "5\nab ba abc cab bca", expectedOutput: "2", isHidden: true },
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(n·k log k)", space: "O(n·k)" },
    hint: "Use the sorted word as a hash key; count distinct keys.",
  },
  {
    slug: "min-window-substring",
    title: "Minimum Window Substring",
    difficulty: "Hard",
    tags: ["Strings", "Sliding Window"],
    roadmapSkillTags: ["Strings", "Problem Solving"],
    languages: ALGO_LANGS,
    statement:
      "Given strings s and t on two lines, print the smallest substring of s containing every character of t (with multiplicity). Print an empty line if none exists." +
      IO_NOTE,
    constraints: "1 ≤ |s|,|t| ≤ 10^5",
    examples: [{ input: "ADOBECODEBANC\nABC", output: "BANC" }],
    testCases: [
      { input: "ADOBECODEBANC\nABC", expectedOutput: "BANC", isHidden: false },
      { input: "a\na", expectedOutput: "a", isHidden: false },
      { input: "a\naa", expectedOutput: "", isHidden: true },
      { input: "aaflslflsldkalskaaa\naaa", expectedOutput: "aaa", isHidden: true },
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(n)", space: "O(alphabet)" },
    hint: "Expand right until valid, then shrink left while still valid.",
  },
  // ---------------- TREES ----------------
  {
    slug: "tree-level-order",
    title: "Binary Tree Level Order Traversal",
    difficulty: "Easy",
    tags: ["Trees", "BFS"],
    roadmapSkillTags: ["Trees", "Data Structures"],
    languages: ALGO_LANGS,
    statement:
      "A binary tree is given in level order with `null` for missing nodes. Print its values level by level, one line per level, values space-separated." +
      IO_NOTE +
      "\n\nLine 1: space-separated tokens (integers or `null`).",
    constraints: "1 ≤ nodes ≤ 10^4",
    examples: [{ input: "3 9 20 null null 15 7", output: "3\n9 20\n15 7" }],
    testCases: [
      { input: "3 9 20 null null 15 7", expectedOutput: "3\n9 20\n15 7", isHidden: false },
      { input: "1", expectedOutput: "1", isHidden: false },
      { input: "1 2 null 3", expectedOutput: "1\n2\n3", isHidden: true },
      { input: "5 4 6 null null 2 7", expectedOutput: "5\n4 6\n2 7", isHidden: true },
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(n)", space: "O(n)" },
    hint: "Rebuild with a queue, then BFS level by level.",
  },
  {
    slug: "validate-bst",
    title: "Validate Binary Search Tree",
    difficulty: "Medium",
    tags: ["Trees", "DFS"],
    roadmapSkillTags: ["Trees", "Data Structures"],
    languages: ALGO_LANGS,
    statement:
      "A binary tree is given in level order with `null` for missing nodes. Print `true` if it is a valid BST (left < node < right for all subtrees), else `false`." +
      IO_NOTE,
    constraints: "1 ≤ nodes ≤ 10^4, values fit in 32-bit",
    examples: [{ input: "2 1 3", output: "true" }],
    testCases: [
      { input: "2 1 3", expectedOutput: "true", isHidden: false },
      { input: "5 1 4 null null 3 6", expectedOutput: "false", isHidden: false },
      { input: "1", expectedOutput: "true", isHidden: true },
      { input: "10 5 15 null null 6 20", expectedOutput: "false", isHidden: true },
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(n)", space: "O(h)" },
    hint: "DFS with (min, max) bounds passed down.",
  },
  {
    slug: "tree-max-path-sum",
    title: "Binary Tree Maximum Path Sum",
    difficulty: "Hard",
    tags: ["Trees", "DFS"],
    roadmapSkillTags: ["Trees", "Problem Solving"],
    languages: ALGO_LANGS,
    statement:
      "A binary tree is given in level order with `null` for missing nodes. A path is any sequence of connected nodes (each used once); it need not pass through the root. Print the maximum path sum." +
      IO_NOTE,
    constraints: "1 ≤ nodes ≤ 3·10^4, -1000 ≤ values ≤ 1000",
    examples: [{ input: "-10 9 20 null null 15 7", output: "42", explanation: "15 + 20 + 7" }],
    testCases: [
      { input: "-10 9 20 null null 15 7", expectedOutput: "42", isHidden: false },
      { input: "1 2 3", expectedOutput: "6", isHidden: false },
      { input: "-3", expectedOutput: "-3", isHidden: true },
      { input: "2 -1 -2", expectedOutput: "2", isHidden: true },
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(n)", space: "O(h)" },
    hint: "Post-order: each node returns max gain down one side; track best split at each node.",
  },
  // ---------------- GRAPH ----------------
  {
    slug: "count-islands",
    title: "Number of Islands",
    difficulty: "Medium",
    tags: ["Graph", "DFS"],
    roadmapSkillTags: ["Graphs", "Problem Solving"],
    languages: ALGO_LANGS,
    statement:
      "Given a grid of 1s (land) and 0s (water), print the number of islands (4-directional connectivity)." +
      IO_NOTE +
      "\n\nLine 1: rows cols. Next rows lines: cols digits with no spaces.",
    constraints: "1 ≤ rows, cols ≤ 300",
    examples: [{ input: "4 5\n11110\n11010\n11000\n00000", output: "1" }],
    testCases: [
      { input: "4 5\n11110\n11010\n11000\n00000", expectedOutput: "1", isHidden: false },
      { input: "4 5\n11000\n11000\n00100\n00011", expectedOutput: "3", isHidden: false },
      { input: "1 1\n0", expectedOutput: "0", isHidden: true },
      { input: "3 3\n101\n010\n101", expectedOutput: "5", isHidden: true },
    ],
    timeLimitMs: 3000,
    memoryLimitMb: 256,
    optimalComplexity: { time: "O(rows·cols)", space: "O(rows·cols)" },
    hint: "Flood fill each unvisited land cell (DFS/BFS), counting starts.",
  },
  {
    slug: "course-schedule",
    title: "Course Schedule (Cycle Detection)",
    difficulty: "Medium",
    tags: ["Graph", "Topological Sort"],
    roadmapSkillTags: ["Graphs", "Data Structures"],
    languages: ALGO_LANGS,
    statement:
      "There are n courses and m prerequisite pairs `a b` meaning you must take b before a. Print `true` if all courses can be finished, else `false`." +
      IO_NOTE +
      "\n\nLine 1: n m. Next m lines: a b.",
    constraints: "1 ≤ n ≤ 10^5, 0 ≤ m ≤ 5·10^5",
    examples: [{ input: "2 1\n1 0", output: "true" }],
    testCases: [
      { input: "2 1\n1 0", expectedOutput: "true", isHidden: false },
      { input: "2 2\n1 0\n0 1", expectedOutput: "false", isHidden: false },
      { input: "3 0", expectedOutput: "true", isHidden: true },
      { input: "4 4\n1 0\n2 1\n3 2\n1 3", expectedOutput: "false", isHidden: true },
    ],
    timeLimitMs: 3000,
    memoryLimitMb: 256,
    optimalComplexity: { time: "O(n + m)", space: "O(n + m)" },
    hint: "Kahn's algorithm: if processed count < n, there is a cycle.",
  },
  {
    slug: "shortest-path-grid",
    title: "Shortest Path in Binary Matrix",
    difficulty: "Hard",
    tags: ["Graph", "BFS"],
    roadmapSkillTags: ["Graphs", "Problem Solving"],
    languages: ALGO_LANGS,
    statement:
      "Given an n×n grid of 0s (open) and 1s (blocked), print the length of the shortest clear path from top-left to bottom-right moving in 8 directions, or -1 if none. Path length counts cells visited." +
      IO_NOTE +
      "\n\nLine 1: n. Next n lines: n digits with no spaces.",
    constraints: "1 ≤ n ≤ 300",
    examples: [{ input: "2\n01\n10", output: "2" }],
    testCases: [
      { input: "2\n01\n10", expectedOutput: "2", isHidden: false },
      { input: "3\n011\n010\n000", expectedOutput: "4", isHidden: false },
      { input: "1\n1", expectedOutput: "-1", isHidden: true },
      { input: "3\n000\n111\n000", expectedOutput: "-1", isHidden: true },
    ],
    timeLimitMs: 3000,
    memoryLimitMb: 256,
    optimalComplexity: { time: "O(n²)", space: "O(n²)" },
    hint: "Plain BFS over 8 neighbours from (0,0), if it is open.",
  },
  // ---------------- DP ----------------
  {
    slug: "climbing-stairs",
    title: "Climbing Stairs",
    difficulty: "Easy",
    tags: ["DP"],
    roadmapSkillTags: ["Dynamic Programming", "Problem Solving"],
    languages: ALGO_LANGS,
    statement:
      "You climb a staircase of n steps taking 1 or 2 steps at a time. Print the number of distinct ways to reach the top." +
      IO_NOTE +
      "\n\nLine 1: n.",
    constraints: "1 ≤ n ≤ 45",
    examples: [{ input: "3", output: "3", explanation: "1+1+1, 1+2, 2+1" }],
    testCases: [
      { input: "3", expectedOutput: "3", isHidden: false },
      { input: "1", expectedOutput: "1", isHidden: false },
      { input: "10", expectedOutput: "89", isHidden: true },
      { input: "45", expectedOutput: "1836311903", isHidden: true },
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    hint: "Fibonacci recurrence: ways(n) = ways(n-1) + ways(n-2).",
  },
  {
    slug: "coin-change-min",
    title: "Coin Change (Fewest Coins)",
    difficulty: "Medium",
    tags: ["DP"],
    roadmapSkillTags: ["Dynamic Programming", "Problem Solving"],
    languages: ALGO_LANGS,
    statement:
      "Given coin denominations and an amount, print the fewest coins needed to make the amount, or -1 if impossible." +
      IO_NOTE +
      "\n\nLine 1: n amount. Line 2: n denominations.",
    constraints: "1 ≤ n ≤ 12, 0 ≤ amount ≤ 10^4",
    examples: [{ input: "3 11\n1 2 5", output: "3", explanation: "5+5+1" }],
    testCases: [
      { input: "3 11\n1 2 5", expectedOutput: "3", isHidden: false },
      { input: "1 3\n2", expectedOutput: "-1", isHidden: false },
      { input: "1 0\n1", expectedOutput: "0", isHidden: true },
      { input: "4 6249\n186 419 83 408", expectedOutput: "20", isHidden: true },
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(amount·n)", space: "O(amount)" },
    hint: "dp[x] = 1 + min(dp[x - coin]) over all coins.",
  },
  {
    slug: "longest-increasing-subseq",
    title: "Longest Increasing Subsequence",
    difficulty: "Medium",
    tags: ["DP", "Binary Search"],
    roadmapSkillTags: ["Dynamic Programming", "Problem Solving"],
    languages: ALGO_LANGS,
    statement:
      "Print the length of the longest strictly increasing subsequence of the given array." +
      IO_NOTE +
      "\n\nLine 1: n. Line 2: n integers.",
    constraints: "1 ≤ n ≤ 10^5",
    examples: [{ input: "8\n10 9 2 5 3 7 101 18", output: "4" }],
    testCases: [
      { input: "8\n10 9 2 5 3 7 101 18", expectedOutput: "4", isHidden: false },
      { input: "6\n0 1 0 3 2 3", expectedOutput: "4", isHidden: false },
      { input: "7\n7 7 7 7 7 7 7", expectedOutput: "1", isHidden: true },
      { input: "1\n5", expectedOutput: "1", isHidden: true },
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(n log n)", space: "O(n)" },
    hint: "Patience sorting: keep tails array, binary search insert position.",
  },
  {
    slug: "edit-distance",
    title: "Edit Distance",
    difficulty: "Hard",
    tags: ["DP", "Strings"],
    roadmapSkillTags: ["Dynamic Programming", "Strings"],
    languages: ALGO_LANGS,
    statement:
      "Given two words on two lines, print the minimum number of insert/delete/replace operations to convert the first into the second." +
      IO_NOTE,
    constraints: "0 ≤ lengths ≤ 500",
    examples: [{ input: "horse\nros", output: "3" }],
    testCases: [
      { input: "horse\nros", expectedOutput: "3", isHidden: false },
      { input: "intention\nexecution", expectedOutput: "5", isHidden: false },
      { input: "abc\nabc", expectedOutput: "0", isHidden: true },
      { input: "a\nb", expectedOutput: "1", isHidden: true },
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(m·n)", space: "O(min(m,n))" },
    hint: "Classic 2D DP over prefixes; three transitions per cell.",
  },
  // ---------------- BACKTRACKING ----------------
  {
    slug: "subsets-count",
    title: "Generate Subsets",
    difficulty: "Easy",
    tags: ["Backtracking"],
    roadmapSkillTags: ["Recursion", "Problem Solving"],
    languages: ALGO_LANGS,
    statement:
      "Given n distinct integers, print all subsets, one per line, elements space-separated in input order, subsets ordered by binary counting (empty subset first as an empty line, then subsets including earlier elements first)." +
      IO_NOTE +
      "\n\nLine 1: n. Line 2: n integers. For subset order: iterate bitmasks 0..2^n-1; bit i (from position 0 = first element) includes element i.",
    constraints: "1 ≤ n ≤ 10",
    examples: [{ input: "2\n1 2", output: "\n1\n2\n1 2" }],
    testCases: [
      { input: "2\n1 2", expectedOutput: "\n1\n2\n1 2", isHidden: false },
      { input: "1\n7", expectedOutput: "\n7", isHidden: false },
      { input: "3\n1 2 3", expectedOutput: "\n1\n2\n1 2\n3\n1 3\n2 3\n1 2 3", isHidden: true },
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(n·2^n)", space: "O(n)" },
    hint: "Loop mask from 0 to 2^n - 1 and test bits.",
  },
  {
    slug: "permutations-sorted",
    title: "Permutations in Lexicographic Order",
    difficulty: "Medium",
    tags: ["Backtracking"],
    roadmapSkillTags: ["Recursion", "Problem Solving"],
    languages: ALGO_LANGS,
    statement:
      "Given n distinct integers, print every permutation in lexicographic (sorted) order, one per line, space-separated." +
      IO_NOTE +
      "\n\nLine 1: n. Line 2: n integers.",
    constraints: "1 ≤ n ≤ 7",
    examples: [{ input: "3\n2 1 3", output: "1 2 3\n1 3 2\n2 1 3\n2 3 1\n3 1 2\n3 2 1" }],
    testCases: [
      { input: "3\n2 1 3", expectedOutput: "1 2 3\n1 3 2\n2 1 3\n2 3 1\n3 1 2\n3 2 1", isHidden: false },
      { input: "1\n9", expectedOutput: "9", isHidden: false },
      { input: "2\n5 4", expectedOutput: "4 5\n5 4", isHidden: true },
    ],
    timeLimitMs: 3000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(n·n!)", space: "O(n)" },
    hint: "Sort first, then backtrack choosing unused elements in order.",
  },
  {
    slug: "n-queens-count",
    title: "N-Queens (Count Solutions)",
    difficulty: "Hard",
    tags: ["Backtracking"],
    roadmapSkillTags: ["Recursion", "Problem Solving"],
    languages: ALGO_LANGS,
    statement:
      "Print the number of distinct ways to place n non-attacking queens on an n×n board." +
      IO_NOTE +
      "\n\nLine 1: n.",
    constraints: "1 ≤ n ≤ 12",
    examples: [{ input: "4", output: "2" }],
    testCases: [
      { input: "4", expectedOutput: "2", isHidden: false },
      { input: "1", expectedOutput: "1", isHidden: false },
      { input: "8", expectedOutput: "92", isHidden: true },
      { input: "10", expectedOutput: "724", isHidden: true },
    ],
    timeLimitMs: 4000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(n!)", space: "O(n)" },
    hint: "Row-by-row backtracking with column/diagonal sets (or bitmasks).",
  },
  // ---------------- GREEDY ----------------
  {
    slug: "best-stock-day",
    title: "Best Time to Buy and Sell Stock",
    difficulty: "Easy",
    tags: ["Greedy", "Arrays"],
    roadmapSkillTags: ["Arrays", "Problem Solving"],
    languages: ALGO_LANGS,
    statement:
      "Given daily prices, print the maximum profit from one buy followed by one sell (0 if no profit possible)." +
      IO_NOTE +
      "\n\nLine 1: n. Line 2: n prices.",
    constraints: "1 ≤ n ≤ 10^5, 0 ≤ prices ≤ 10^4",
    examples: [{ input: "6\n7 1 5 3 6 4", output: "5" }],
    testCases: [
      { input: "6\n7 1 5 3 6 4", expectedOutput: "5", isHidden: false },
      { input: "5\n7 6 4 3 1", expectedOutput: "0", isHidden: false },
      { input: "1\n5", expectedOutput: "0", isHidden: true },
      { input: "4\n2 4 1 9", expectedOutput: "8", isHidden: true },
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    hint: "Track the minimum price so far; compare each day's profit.",
  },
  {
    slug: "jump-game-min",
    title: "Jump Game II (Minimum Jumps)",
    difficulty: "Medium",
    tags: ["Greedy", "Arrays"],
    roadmapSkillTags: ["Arrays", "Problem Solving"],
    languages: ALGO_LANGS,
    statement:
      "Each element is the max jump length from that index. Print the minimum number of jumps to reach the last index (guaranteed reachable)." +
      IO_NOTE +
      "\n\nLine 1: n. Line 2: n integers.",
    constraints: "1 ≤ n ≤ 10^4",
    examples: [{ input: "5\n2 3 1 1 4", output: "2" }],
    testCases: [
      { input: "5\n2 3 1 1 4", expectedOutput: "2", isHidden: false },
      { input: "1\n0", expectedOutput: "0", isHidden: false },
      { input: "5\n2 3 0 1 4", expectedOutput: "2", isHidden: true },
      { input: "6\n1 1 1 1 1 1", expectedOutput: "5", isHidden: true },
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    hint: "Greedy BFS layers: track current reach and farthest reach.",
  },
  {
    slug: "task-scheduler-intervals",
    title: "Task Scheduler",
    difficulty: "Hard",
    tags: ["Greedy", "Hash Map"],
    roadmapSkillTags: ["Data Structures", "Problem Solving"],
    languages: ALGO_LANGS,
    statement:
      "Given tasks as uppercase letters and cooldown n between identical tasks, print the minimum total intervals (including idles) needed to run them all." +
      IO_NOTE +
      "\n\nLine 1: task string (e.g. AABAB). Line 2: n.",
    constraints: "1 ≤ tasks ≤ 10^4, 0 ≤ n ≤ 100",
    examples: [{ input: "AAABBB\n2", output: "8", explanation: "A B _ A B _ A B" }],
    testCases: [
      { input: "AAABBB\n2", expectedOutput: "8", isHidden: false },
      { input: "AAABBB\n0", expectedOutput: "6", isHidden: false },
      { input: "AAAAAABCDEFG\n2", expectedOutput: "16", isHidden: true },
      { input: "AB\n5", expectedOutput: "2", isHidden: true },
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(n)", space: "O(26)" },
    hint: "Formula on max frequency: (maxF-1)·(n+1) + countOfMaxF, floor at total tasks.",
  },
  // ---------------- SQL ----------------
  {
    slug: "sql-second-highest-salary",
    title: "SQL: Second Highest Salary",
    difficulty: "Medium",
    tags: ["SQL"],
    roadmapSkillTags: ["SQL", "Databases"],
    languages: ["sql"],
    statement:
      "Table `employees(id INTEGER, name TEXT, salary INTEGER)`. Write a query that returns the second highest **distinct** salary. If it does not exist, return NULL. Output a single value.\n\nYour answer must be a single SELECT statement (SQLite dialect).",
    constraints: "Up to 10^4 rows",
    examples: [
      { input: "employees: (1,'A',100),(2,'B',200),(3,'C',300)", output: "200" },
    ],
    testCases: [
      {
        input:
          "CREATE TABLE employees (id INTEGER, name TEXT, salary INTEGER);\nINSERT INTO employees VALUES (1,'A',100),(2,'B',200),(3,'C',300);",
        expectedOutput: "200",
        isHidden: false,
      },
      {
        input:
          "CREATE TABLE employees (id INTEGER, name TEXT, salary INTEGER);\nINSERT INTO employees VALUES (1,'A',100);",
        expectedOutput: "",
        isHidden: false,
      },
      {
        input:
          "CREATE TABLE employees (id INTEGER, name TEXT, salary INTEGER);\nINSERT INTO employees VALUES (1,'A',500),(2,'B',500),(3,'C',200);",
        expectedOutput: "200",
        isHidden: true,
      },
    ],
    timeLimitMs: 3000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(n log n)", space: "O(1)" },
    hint: "SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) ...).",
  },
  {
    slug: "sql-dept-top-earner",
    title: "SQL: Highest Paid Per Department",
    difficulty: "Medium",
    tags: ["SQL", "Joins"],
    roadmapSkillTags: ["SQL", "Databases"],
    languages: ["sql"],
    statement:
      "Tables `departments(id INTEGER, name TEXT)` and `employees(id INTEGER, name TEXT, salary INTEGER, dept_id INTEGER)`. For each department that has employees, output `department_name|employee_name|salary` for the highest-paid employee (assume no salary ties within a department), ordered by department name ascending.\n\nYour answer must be a single SELECT statement (SQLite dialect). Columns are pipe-separated by the judge automatically.",
    constraints: "Up to 10^4 rows",
    examples: [
      {
        input: "departments: (1,'Eng'),(2,'Sales'); employees: (1,'A',900,1),(2,'B',800,1),(3,'C',700,2)",
        output: "Eng|A|900\nSales|C|700",
      },
    ],
    testCases: [
      {
        input:
          "CREATE TABLE departments (id INTEGER, name TEXT);\nCREATE TABLE employees (id INTEGER, name TEXT, salary INTEGER, dept_id INTEGER);\nINSERT INTO departments VALUES (1,'Eng'),(2,'Sales');\nINSERT INTO employees VALUES (1,'A',900,1),(2,'B',800,1),(3,'C',700,2);",
        expectedOutput: "Eng|A|900\nSales|C|700",
        isHidden: false,
      },
      {
        input:
          "CREATE TABLE departments (id INTEGER, name TEXT);\nCREATE TABLE employees (id INTEGER, name TEXT, salary INTEGER, dept_id INTEGER);\nINSERT INTO departments VALUES (1,'HR'),(2,'Ops'),(3,'Empty');\nINSERT INTO employees VALUES (1,'X',400,1),(2,'Y',300,2),(3,'Z',500,2);",
        expectedOutput: "HR|X|400\nOps|Z|500",
        isHidden: true,
      },
    ],
    timeLimitMs: 3000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(n log n)", space: "O(n)" },
    hint: "Join employees to departments and filter with a correlated MAX subquery per department.",
  },
  // Extra easies to balance the bank
  {
    slug: "contains-duplicate",
    title: "Contains Duplicate",
    difficulty: "Easy",
    tags: ["Arrays", "Hash Map"],
    roadmapSkillTags: ["Arrays", "Data Structures"],
    languages: ALGO_LANGS,
    statement:
      "Print `true` if any value appears at least twice in the array, else `false`." +
      IO_NOTE +
      "\n\nLine 1: n. Line 2: n integers.",
    constraints: "1 ≤ n ≤ 10^5",
    examples: [{ input: "4\n1 2 3 1", output: "true" }],
    testCases: [
      { input: "4\n1 2 3 1", expectedOutput: "true", isHidden: false },
      { input: "4\n1 2 3 4", expectedOutput: "false", isHidden: false },
      { input: "1\n0", expectedOutput: "false", isHidden: true },
      { input: "6\n-1 5 -1 9 8 7", expectedOutput: "true", isHidden: true },
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(n)", space: "O(n)" },
    hint: "Compare set size with array length.",
  },
  {
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "Easy",
    tags: ["Strings", "Stack"],
    roadmapSkillTags: ["Strings", "Data Structures"],
    languages: ALGO_LANGS,
    statement:
      "Given a string of brackets ()[]{}, print `true` if it is validly nested, else `false`." + IO_NOTE,
    constraints: "1 ≤ length ≤ 10^4",
    examples: [{ input: "()[]{}", output: "true" }],
    testCases: [
      { input: "()[]{}", expectedOutput: "true", isHidden: false },
      { input: "(]", expectedOutput: "false", isHidden: false },
      { input: "([)]", expectedOutput: "false", isHidden: true },
      { input: "{[]}", expectedOutput: "true", isHidden: true },
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(n)", space: "O(n)" },
    hint: "Push opens on a stack; each close must match the top.",
  },
  {
    slug: "merge-sorted-arrays",
    title: "Merge Two Sorted Arrays",
    difficulty: "Easy",
    tags: ["Arrays", "Two Pointers"],
    roadmapSkillTags: ["Arrays"],
    languages: ALGO_LANGS,
    statement:
      "Merge two sorted arrays into one sorted array and print it space-separated." +
      IO_NOTE +
      "\n\nLine 1: n m. Line 2: n integers. Line 3: m integers (either may be empty when its size is 0).",
    constraints: "0 ≤ n,m ≤ 10^5",
    examples: [{ input: "3 3\n1 2 4\n1 3 4", output: "1 1 2 3 4 4" }],
    testCases: [
      { input: "3 3\n1 2 4\n1 3 4", expectedOutput: "1 1 2 3 4 4", isHidden: false },
      { input: "0 1\n\n5", expectedOutput: "5", isHidden: false },
      { input: "2 0\n7 9\n", expectedOutput: "7 9", isHidden: true },
      { input: "3 2\n-5 0 10\n-6 20", expectedOutput: "-6 -5 0 10 20", isHidden: true },
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(n+m)", space: "O(n+m)" },
    hint: "Two pointers walking both arrays.",
  },
  {
    slug: "binary-search-basic",
    title: "Binary Search",
    difficulty: "Easy",
    tags: ["Arrays", "Binary Search"],
    roadmapSkillTags: ["Arrays", "Problem Solving"],
    languages: ALGO_LANGS,
    statement:
      "Given a sorted array and a target, print the index of the target or -1 if absent." +
      IO_NOTE +
      "\n\nLine 1: n. Line 2: n sorted integers. Line 3: target.",
    constraints: "1 ≤ n ≤ 10^5",
    examples: [{ input: "6\n-1 0 3 5 9 12\n9", output: "4" }],
    testCases: [
      { input: "6\n-1 0 3 5 9 12\n9", expectedOutput: "4", isHidden: false },
      { input: "6\n-1 0 3 5 9 12\n2", expectedOutput: "-1", isHidden: false },
      { input: "1\n5\n5", expectedOutput: "0", isHidden: true },
      { input: "5\n1 2 3 4 5\n1", expectedOutput: "0", isHidden: true },
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(log n)", space: "O(1)" },
    hint: "Classic low/high midpoint loop.",
  },
  {
    slug: "fizzbuzz-classic",
    title: "FizzBuzz",
    difficulty: "Easy",
    tags: ["Basics"],
    roadmapSkillTags: ["Programming Fundamentals"],
    languages: ALGO_LANGS,
    statement:
      "Print numbers 1..n, one per line, but print `Fizz` for multiples of 3, `Buzz` for multiples of 5, and `FizzBuzz` for both." +
      IO_NOTE +
      "\n\nLine 1: n.",
    constraints: "1 ≤ n ≤ 10^4",
    examples: [{ input: "5", output: "1\n2\nFizz\n4\nBuzz" }],
    testCases: [
      { input: "5", expectedOutput: "1\n2\nFizz\n4\nBuzz", isHidden: false },
      { input: "15", expectedOutput: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz", isHidden: false },
      { input: "1", expectedOutput: "1", isHidden: true },
      { input: "3", expectedOutput: "1\n2\nFizz", isHidden: true },
    ],
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    optimalComplexity: { time: "O(n)", space: "O(1)" },
    hint: "Check divisibility by 15 first.",
  },
];

async function seed() {
  getFirebaseAdmin();
  const db = admin.firestore();
  const col = db.collection("coding_problems");

  console.log(`Seeding ${problems.length} problems...`);
  let batch = db.batch();
  let count = 0;
  for (const p of problems) {
    const ref = col.doc(p.slug);
    batch.set(ref, {
      ...p,
      starterCode: starterFor(p.languages, "See problem statement for input format"),
      createdBy: "system-seed",
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
  console.log(`Done. Seeded ${count} problems into coding_problems.`);

  const easy = problems.filter((p) => p.difficulty === "Easy").length;
  const med = problems.filter((p) => p.difficulty === "Medium").length;
  const hard = problems.filter((p) => p.difficulty === "Hard").length;
  console.log(`Breakdown: ${easy} Easy, ${med} Medium, ${hard} Hard`);
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
