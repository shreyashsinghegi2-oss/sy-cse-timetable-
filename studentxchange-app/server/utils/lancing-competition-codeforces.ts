export interface CodeforcesCompetition {
  id: string;
  title: string;
  url: string;
  applicationUrl: string;
  deadline: string;
  deadlineKind: "START_TIME";
  registrationDeadline: null;
  startsAt: string;
  endsAt: string;
  description: string;
  organizer: null;
  participationMode: "Online";
  themes: ["coding"];
}

export interface CollectCodeforcesOptions {
  fetch?: typeof fetch;
  now?: () => Date;
}

const API_URL = "https://codeforces.com/api/contest.list?gym=false";
const API_ORIGIN = "https://codeforces.com";
const MAX_RESPONSE_BYTES = 2_000_000;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RECORDS = 30;
const USER_AGENT = "StudentLancingCompetitionRefresh/1.0 (public contest API)";

function safeApiUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.origin !== API_ORIGIN || url.username || url.password || url.port) return null;
    return url;
  } catch {
    return null;
  }
}

async function readBoundedJson(response: Response): Promise<unknown> {
  if (response.status >= 300 && response.status < 400 || response.redirected) {
    throw new Error("Codeforces redirects are refused");
  }
  if (!response.ok) throw new Error(`Codeforces returned HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (!/application\/(?:[\w.-]+\+)?json\b/i.test(contentType)) {
    throw new Error("Codeforces returned an unexpected content type");
  }
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    throw new Error("Codeforces response exceeds the body size limit");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Codeforces response has no readable body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("Codeforces response exceeds the body size limit");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));
  } catch {
    throw new Error("Codeforces returned malformed JSON");
  }
}

function normalizeContest(value: unknown, nowSeconds: number): CodeforcesCompetition | null {
  if (!value || typeof value !== "object") return null;
  const contest = value as Record<string, unknown>;
  const id = contest.id;
  const start = contest.startTimeSeconds;
  const duration = contest.durationSeconds;
  const title = typeof contest.name === "string" ? contest.name.trim().replace(/\s+/g, " ").slice(0, 300) : "";
  if (!Number.isSafeInteger(id) || Number(id) <= 0
    || contest.phase !== "BEFORE"
    || !Number.isSafeInteger(start) || Number(start) <= nowSeconds
    || !Number.isSafeInteger(duration) || Number(duration) <= 0
    || !title) return null;

  const startsAtDate = new Date(Number(start) * 1000);
  const endsAtDate = new Date((Number(start) + Number(duration)) * 1000);
  if (!Number.isFinite(startsAtDate.getTime()) || !Number.isFinite(endsAtDate.getTime())) return null;
  const url = `https://codeforces.com/contest/${Number(id)}`;
  const startsAt = startsAtDate.toISOString();
  return {
    id: `codeforces:${Number(id)}`,
    title,
    url,
    applicationUrl: url,
    deadline: startsAt,
    deadlineKind: "START_TIME",
    registrationDeadline: null,
    startsAt,
    endsAt: endsAtDate.toISOString(),
    description: "",
    organizer: null,
    participationMode: "Online",
    themes: ["coding"],
  };
}

export async function collectCodeforcesCompetitions(
  options: CollectCodeforcesOptions = {},
): Promise<CodeforcesCompetition[]> {
  const apiUrl = safeApiUrl(API_URL);
  if (!apiUrl) throw new Error("Codeforces API URL is not allowed");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await (options.fetch || globalThis.fetch)(apiUrl.toString(), {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { accept: "application/json", "user-agent": USER_AGENT },
    });
    const payload = await readBoundedJson(response);
    if (!payload || typeof payload !== "object"
      || (payload as Record<string, unknown>).status !== "OK"
      || !Array.isArray((payload as Record<string, unknown>).result)) {
      throw new Error("Codeforces returned a malformed contest-list response");
    }
    const nowSeconds = (options.now?.() || new Date()).getTime() / 1000;
    const contests = (payload as { result: unknown[] }).result
      .map((contest) => normalizeContest(contest, nowSeconds))
      .filter((contest): contest is CodeforcesCompetition => contest !== null)
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
    return contests.slice(0, MAX_RECORDS);
  } finally {
    clearTimeout(timer);
  }
}