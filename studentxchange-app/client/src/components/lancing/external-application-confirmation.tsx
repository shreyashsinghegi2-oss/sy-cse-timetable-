import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getAuthToken } from "@/lib/firebase";
import type { OpportunityCardData } from "@/components/lancing/opportunity-card";

export type ExternalApplicationType = "job" | "internship" | "micro_task" | "competition";

export function openExternalOpportunity(item: OpportunityCardData): string | null {
  const rawUrl = item.url || item.source_url || "";
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return null;
    window.open(url.href, "_blank", "noopener,noreferrer");
    return url.href;
  } catch {
    return null;
  }
}

export async function recordExternalApplication(
  item: OpportunityCardData,
  type: ExternalApplicationType,
  externalUrl: string,
): Promise<string> {
  const token = await getAuthToken();
  if (!token) throw new Error("Please sign in again to save this application.");
  const response = await fetch("/api/lancing/external-applications/mark-applied", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...(item.id ? { opportunityId: item.id } : {}),
      title: item.title,
      company: item.company,
      category: type,
      source: item.source || "web",
      externalUrl,
    }),
  });
  let result: any = {};
  try { result = await response.json(); } catch {}
  if (!response.ok) {
    throw new Error(result.error || `Could not save application (HTTP ${response.status}).`);
  }
  if (typeof result.applicationId !== "string" || !result.applicationId) {
    throw new Error("The application was saved, but the server did not return its ID.");
  }
  return result.applicationId;
}

interface ExternalApplicationConfirmationProps {
  item: OpportunityCardData | null;
  open: boolean;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ExternalApplicationConfirmation({
  item, open, submitting, onOpenChange, onConfirm,
}: ExternalApplicationConfirmationProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Mark as applied?</DialogTitle>
          <DialogDescription>
            {item ? `After you submit your application for ${item.title} on the external site, confirm here to add it to My Applications.` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Not yet</Button>
          <Button onClick={onConfirm} disabled={submitting}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Mark as Applied"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}