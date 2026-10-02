export type ClaudeResponseFailureCode =
  | "AI_RESPONSE_TRUNCATED"
  | "AI_RESPONSE_EMPTY"
  | "AI_RESPONSE_INVALID_JSON";

export class ClaudeResponseError extends Error {
  readonly code: ClaudeResponseFailureCode;

  constructor(code: ClaudeResponseFailureCode, message: string) {
    super(message);
    this.name = "ClaudeResponseError";
    this.code = code;
  }
}

export function getClaudeText(response: any): string {
  if (response?.stop_reason === "max_tokens") {
    throw new ClaudeResponseError(
      "AI_RESPONSE_TRUNCATED",
      "Claude reached the output limit before completing the response.",
    );
  }

  const text = Array.isArray(response?.content)
    ? response.content
        .filter((block: any) => block?.type === "text" && typeof block.text === "string")
        .map((block: any) => block.text)
        .join("")
        .trim()
    : "";

  if (!text) {
    throw new ClaudeResponseError("AI_RESPONSE_EMPTY", "Claude returned no usable text.");
  }
  return text;
}

export function parseClaudeJson<T = any>(response: any, extractJson?: (text: string) => string | null): T {
  const text = getClaudeText(response)
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  const jsonText = extractJson ? extractJson(text) : text;
  if (!jsonText) {
    throw new ClaudeResponseError("AI_RESPONSE_INVALID_JSON", "Claude did not return a JSON object.");
  }

  try {
    return JSON.parse(jsonText) as T;
  } catch {
    throw new ClaudeResponseError("AI_RESPONSE_INVALID_JSON", "Claude returned incomplete or invalid JSON.");
  }
}

export function isClaudeResponseError(error: unknown): error is ClaudeResponseError {
  return error instanceof ClaudeResponseError;
}