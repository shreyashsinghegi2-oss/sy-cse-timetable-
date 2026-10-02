import { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

type DiscoveryCategory = "jobs" | "internships" | "micro_tasks" | "competitions" | "ai_match";

interface DiscoverySearchLinksProps {
  category: DiscoveryCategory;
  query?: string;
  hints?: string[];
}

interface DiscoveryLink {
  title: string;
  url: string;
}

const MAX_HINTS = 8;
const MAX_HINT_LENGTH = 80;
const MAX_QUERY_LENGTH = 200;

export default function DiscoverySearchLinks({ category, query, hints = [] }: DiscoverySearchLinksProps) {
  const [links, setLinks] = useState<DiscoveryLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const normalizedQuery = query?.trim().slice(0, MAX_QUERY_LENGTH) || "";
  const normalizedHints = hints
    .map((hint) => hint.trim().slice(0, MAX_HINT_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_HINTS);
  const hintsKey = JSON.stringify(normalizedHints);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setLinks([]);

    const body: { category: DiscoveryCategory; query?: string; hints?: string[] } = { category };
    if (normalizedQuery) body.query = normalizedQuery;
    if (normalizedHints.length > 0) body.hints = normalizedHints;

    const timer = window.setTimeout(() => {
    void fetch("/api/lancing/search-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Could not load web searches (HTTP ${response.status}).`);
        return response.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        const results = Array.isArray(data?.links) ? data.links : [];
        const safeLinks = results.flatMap((item: any) => {
          if (typeof item?.title !== "string" || typeof item?.url !== "string") return [];
          try {
            const url = new URL(item.url);
            if (url.origin !== "https://www.google.com" || url.pathname !== "/search") return [];
            return [{ title: item.title, url: url.toString() }];
          } catch {
            return [];
          }
        });
        setLinks(safeLinks);
      })
      .catch((reason: any) => {
        if (!controller.signal.aborted) {
          setLinks([]);
          setError(reason?.message || "Could not load web searches. Please try again.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    }, normalizedQuery || normalizedHints.length ? 350 : 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // Hints are serialized so content changes reliably abort and reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, normalizedQuery, hintsKey]);

  return (
    <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-left">
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-slate-900">Explore the web</h3>
        <p className="text-xs text-slate-500">
          These are web searches, not verified openings. Check details before applying.
        </p>
      </div>
      {loading ? (
        <p role="status" className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Finding web searches…
        </p>
      ) : error ? (
        <p role="status" className="mt-3 text-xs text-slate-500">{error}</p>
      ) : links.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {links.map((link, index) => (
            <li key={`${link.url}-${index}`}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:text-sky-900 hover:underline"
              >
                {link.title}
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-slate-500">No web searches are available right now.</p>
      )}
    </section>
  );
}