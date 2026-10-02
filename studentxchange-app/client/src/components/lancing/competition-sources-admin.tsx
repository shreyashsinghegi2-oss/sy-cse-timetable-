import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Clock3, Loader2, RefreshCw } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface CompetitionSource {
  id: string;
  name: string;
  enabled: boolean;
  approved: boolean;
  status: string;
  last_attempted_at: string | null;
  last_successful_at: string | null;
  last_failed_at: string | null;
  active_count: number;
  expired_count: number;
  stale_count: number;
  record_count: number;
  parser_version: string | null;
  last_error: string | null;
}

interface RefreshReport {
  sourcesSucceeded: number;
  sourcesFailed: number;
  newCompetitions: number;
  updatedCompetitions: number;
  expiredCompetitions: number;
  duplicatesRemoved: number;
}

const SOURCES_QUERY_KEY = ["/api/lancing/admin/competition-sources"];

async function getAuthHeaders(json = false): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error("Your session has expired. Please sign in again.");
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

async function responseError(response: Response, fallback: string): Promise<Error> {
  const body = await response.json().catch(() => ({}));
  return new Error(body.error || body.message || fallback);
}

function formatDate(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function count(value: number | null | undefined) {
  return typeof value === "number" ? value.toLocaleString() : "—";
}

export default function CompetitionSourcesAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const refreshInFlight = useRef(false);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<{ sources: CompetitionSource[] }>({
    queryKey: SOURCES_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch("/api/lancing/admin/competition-sources", {
        headers: await getAuthHeaders(),
      });
      if (!response.ok) throw await responseError(response, "Failed to load competition sources.");
      return response.json();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const response = await fetch(`/api/lancing/admin/competition-sources/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: await getAuthHeaders(true),
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) throw await responseError(response, "Failed to update source.");
    },
    onSuccess: (_, variables) => {
      toast({ title: `Competition source ${variables.enabled ? "enabled" : "disabled"}` });
      queryClient.invalidateQueries({ queryKey: SOURCES_QUERY_KEY });
    },
    onError: (mutationError) => {
      toast({
        title: "Could not update competition source",
        description: mutationError.message,
        variant: "destructive",
      });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async (): Promise<RefreshReport> => {
      if (refreshInFlight.current) throw new Error("A competition refresh is already running.");
      refreshInFlight.current = true;
      try {
        const response = await fetch("/api/lancing/admin/competition-sources/refresh", {
          method: "POST",
          headers: await getAuthHeaders(true),
        });
        if (!response.ok) throw await responseError(response, "Failed to refresh competitions.");
        return response.json();
      } finally {
        refreshInFlight.current = false;
      }
    },
    onSuccess: (report) => {
      toast({
        title: "Competition refresh complete",
        description: `${report.sourcesSucceeded} sources succeeded, ${report.sourcesFailed} failed · ${report.newCompetitions} new, ${report.updatedCompetitions} updated, ${report.expiredCompetitions} expired, ${report.duplicatesRemoved} duplicates removed.`,
        variant: report.sourcesFailed > 0 ? "destructive" : "default",
      });
      queryClient.invalidateQueries({ queryKey: SOURCES_QUERY_KEY });
    },
    onError: (mutationError) => {
      toast({
        title: "Competition refresh failed",
        description: mutationError.message,
        variant: "destructive",
      });
    },
  });

  const sources = data?.sources || [];
  const refreshDisabled = refreshMutation.isPending || !sources.some((source) => source.approved);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Competition sources</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Monitor source health and refresh competition listings.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Reload competition source health"
            >
              {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Reload
            </Button>
            <Button
              size="sm"
              onClick={() => refreshMutation.mutate()}
              disabled={refreshDisabled}
              title={!sources.some((source) => source.approved) ? "No approved sources are available to refresh" : undefined}
            >
              {refreshMutation.isPending
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <RefreshCw className="mr-2 h-4 w-4" />}
              {refreshMutation.isPending ? "Refreshing…" : "Refresh Competitions"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading competition sources…
            </div>
          ) : isError ? (
            <div className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <span>{(error as Error)?.message || "Failed to load competition sources."}</span>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
            </div>
          ) : sources.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No competition sources configured.</div>
          ) : (
            <div className="space-y-3">
              {sources.map((source) => {
                const toggleBusy = toggleMutation.isPending && toggleMutation.variables?.id === source.id;
                const status = source.status || "unknown";
                const isHealthy = ["healthy", "success", "refreshed"].includes(status.toLowerCase());
                const hasError = Boolean(source.last_error);
                return (
                  <section key={source.id} className="rounded-lg border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{source.name}</h3>
                          <Badge variant={isHealthy ? "default" : hasError ? "destructive" : "secondary"}>
                            {status}
                          </Badge>
                          {source.approved ? (
                            <Badge variant="outline" className="border-green-200 text-green-700">Approved</Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-200 text-amber-700">Not approved</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">Source ID: {source.id}</p>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{source.enabled ? "Enabled" : "Disabled"}</span>
                        <Switch
                          checked={source.enabled}
                          onCheckedChange={(enabled) => toggleMutation.mutate({ id: source.id, enabled })}
                          disabled={!source.approved || toggleMutation.isPending}
                          aria-label={`${source.enabled ? "Disable" : "Enable"} ${source.name}`}
                        />
                        {toggleBusy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      </label>
                    </div>

                    {!source.approved && (
                      <p className="mt-3 text-xs text-amber-700">
                        This source needs access approval or API configuration before it can be enabled or refreshed.
                      </p>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                      <div className="rounded-md bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground">Active</p>
                        <p className="mt-1 text-lg font-semibold">{count(source.active_count)}</p>
                      </div>
                      <div className="rounded-md bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground">Expired</p>
                        <p className="mt-1 text-lg font-semibold">{count(source.expired_count)}</p>
                      </div>
                      <div className="rounded-md bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground">Stale</p>
                        <p className="mt-1 text-lg font-semibold">{count(source.stale_count)}</p>
                      </div>
                      <div className="rounded-md bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground">Total records</p>
                        <p className="mt-1 text-lg font-semibold">{count(source.record_count)}</p>
                      </div>
                      <div className="rounded-md bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground">Parser version</p>
                        <p className="mt-1 truncate text-sm font-semibold" title={source.parser_version || undefined}>
                          {source.parser_version || "—"}
                        </p>
                      </div>
                      <div className="rounded-md bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground">Last attempt</p>
                        <p className="mt-1 flex items-center gap-1 text-xs font-medium">
                          <Clock3 className="h-3 w-3 shrink-0" />{formatDate(source.last_attempted_at)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Last success: <span className="text-foreground">{formatDate(source.last_successful_at)}</span>
                      </p>
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        Last failure: <span className="text-foreground">{formatDate(source.last_failed_at)}</span>
                      </p>
                    </div>
                    {source.last_error && (
                      <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                        <span className="font-medium">Last error: </span>
                        <span className="break-words">{source.last_error}</span>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}