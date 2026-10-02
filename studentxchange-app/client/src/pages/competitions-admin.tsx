import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Trophy, Plus, Trash2, Edit3, Save, X, Upload, RefreshCw,
  CheckCircle2, AlertTriangle, BarChart3, Zap, List, Eye, EyeOff,
  ExternalLink, Search, Filter
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { COMPETITION_CATEGORIES } from "@shared/schema";
import type { Competition, InsertCompetition } from "@shared/schema";

const AI_EXTRACTION_PROMPT = `You are a data extraction and normalization engine for StudentXchange's "Competitions" feed.
You will be given raw scraped/unstructured text from various sources (competition listing sites, college portals, organizer websites, social media posts, or RSS feeds).
Your job is to extract, clean, and structure this into a strict JSON format.

## FOR EACH COMPETITION, EXTRACT:
{
  "title": "string - official competition name",
  "organizer": "string - hosting company/college/organization",
  "category": "one of: Hackathon | Case Study | Business Plan | Coding Contest | Olympiad | Research Paper | Design/Art | Quiz | Ideathon | Other",
  "field": "string - relevant academic/professional field(s), comma-separated",
  "eligibility": "string - who can apply, or null",
  "team_size": "string - solo/min-max team size, or null",
  "mode": "Online | Offline | Hybrid",
  "location": "string - city/venue if offline/hybrid, else null",
  "registration_deadline": "YYYY-MM-DD, or null",
  "event_date": "YYYY-MM-DD or date range, or null",
  "prize_pool": "string - total prize money/rewards, or null",
  "entry_fee": "string - amount or 'Free', or null",
  "apply_link": "string - DIRECT official registration URL only, or null",
  "source_platform": "string - where this was scraped from",
  "description_summary": "string - 1-2 line plain-language summary",
  "is_verified": "boolean - true only if apply_link is a working, official domain",
  "tags": ["array of relevant skill/interest tags"]
}

## RULES
1. If registration_deadline has already passed relative to today, exclude the entry entirely.
2. If apply_link is missing, set is_verified to false but still include it.
3. Do not fabricate any field. If not present, use null.
4. Normalize dates to YYYY-MM-DD format.
5. Output ONLY a valid JSON array. No preamble, no markdown, no explanation.

## INPUT:
`;

async function getAdminToken(): Promise<string | null> {
  return auth.currentUser?.getIdToken() ?? null;
}

async function adminFetch(url: string, options: RequestInit = {}) {
  const token = await getAdminToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  return fetch(url, { ...options, headers });
}

const BLANK_FORM: Partial<InsertCompetition> = {
  title: "",
  organizer: "",
  category: "Hackathon",
  field: "",
  eligibility: "",
  teamSize: "",
  mode: "Online",
  location: "",
  registrationDeadline: "",
  eventDate: "",
  prizePool: "",
  entryFee: "",
  applyLink: "",
  sourcePlatform: "",
  descriptionSummary: "",
  isVerified: false,
  requiresReview: false,
  tags: [],
  isActive: true,
};

export default function CompetitionsAdmin() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [tab, setTab] = useState<"list" | "add" | "bulk">("list");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<InsertCompetition>>({ ...BLANK_FORM });
  const [tagsInput, setTagsInput] = useState("");
  const [rawText, setRawText] = useState("");
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [parseError, setParseError] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");

  const { data: allComps, isLoading: listLoading } = useQuery<Competition[]>({
    queryKey: ["/api/competitions/admin/all"],
    queryFn: async () => {
      const r = await adminFetch("/api/competitions/admin/all");
      if (!r.ok) throw new Error("Auth required");
      return r.json();
    },
  });

  const { data: stats } = useQuery<{ total: number; active: number; needsReview: number }>({
    queryKey: ["/api/competitions/admin/stats"],
    queryFn: async () => {
      const r = await adminFetch("/api/competitions/admin/stats");
      if (!r.ok) throw new Error("Auth required");
      return r.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<InsertCompetition>) => {
      const r = await adminFetch("/api/competitions", { method: "POST", body: JSON.stringify(data) });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/competitions/admin/all"] });
      qc.invalidateQueries({ queryKey: ["/api/competitions/admin/stats"] });
      qc.invalidateQueries({ queryKey: ["/api/competitions"] });
      toast({ title: "Competition added!" });
      setForm({ ...BLANK_FORM });
      setTagsInput("");
      setTab("list");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertCompetition> }) => {
      const r = await adminFetch(`/api/competitions/${id}`, { method: "PATCH", body: JSON.stringify(data) });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/competitions/admin/all"] });
      qc.invalidateQueries({ queryKey: ["/api/competitions"] });
      toast({ title: "Updated!" });
      setEditingId(null);
      setForm({ ...BLANK_FORM });
      setTagsInput("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await adminFetch(`/api/competitions/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(await r.text());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/competitions/admin/all"] });
      qc.invalidateQueries({ queryKey: ["/api/competitions/admin/stats"] });
      qc.invalidateQueries({ queryKey: ["/api/competitions"] });
      toast({ title: "Deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const bulkMutation = useMutation({
    mutationFn: async (items: any[]) => {
      const r = await adminFetch("/api/competitions/bulk", { method: "POST", body: JSON.stringify({ items }) });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/competitions/admin/all"] });
      qc.invalidateQueries({ queryKey: ["/api/competitions/admin/stats"] });
      qc.invalidateQueries({ queryKey: ["/api/competitions"] });
      toast({ title: `Imported ${data.inserted} competitions`, description: data.errors?.length ? `${data.errors.length} entries skipped` : undefined });
      setParsedItems([]);
      setRawText("");
      setTab("list");
    },
    onError: (e: any) => toast({ title: "Import failed", description: e.message, variant: "destructive" }),
  });

  function handleFormChange(key: keyof InsertCompetition, val: any) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function handleSubmitForm() {
    const payload = {
      ...form,
      tags: tagsInput ? tagsInput.split(",").map(t => t.trim()).filter(Boolean) : (form.tags ?? []),
    };
    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function startEdit(c: Competition) {
    setEditingId(c.id);
    setForm({
      title: c.title, organizer: c.organizer, category: c.category, field: c.field,
      eligibility: c.eligibility ?? "", teamSize: c.teamSize ?? "", mode: c.mode,
      location: c.location ?? "", registrationDeadline: c.registrationDeadline ?? "",
      eventDate: c.eventDate ?? "", prizePool: c.prizePool ?? "", entryFee: c.entryFee ?? "",
      applyLink: c.applyLink ?? "", sourcePlatform: c.sourcePlatform ?? "",
      descriptionSummary: c.descriptionSummary ?? "", isVerified: c.isVerified,
      requiresReview: c.requiresReview, tags: c.tags, isActive: c.isActive,
    });
    setTagsInput((c.tags ?? []).join(", "));
    setTab("add");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ ...BLANK_FORM });
    setTagsInput("");
    setTab("list");
  }

  function parseJson() {
    setParseError("");
    try {
      let text = rawText.trim();
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) text = jsonMatch[1].trim();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) { setParseError("Expected a JSON array"); return; }
      setParsedItems(parsed);
    } catch (e: any) {
      setParseError("Invalid JSON: " + e.message);
    }
  }

  const filteredComps = (allComps ?? []).filter(c => {
    const matchQ = !searchQ || c.title.toLowerCase().includes(searchQ.toLowerCase()) || c.organizer.toLowerCase().includes(searchQ.toLowerCase());
    const matchCat = filterCategory === "All" || c.category === filterCategory;
    return matchQ && matchCat;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-700 to-indigo-700 text-white px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-7 h-7 text-yellow-300" />
            <h1 className="text-2xl font-black">Competitions Admin</h1>
          </div>
          <p className="text-violet-200 text-sm">Manage the student competitions feed</p>

          {stats && (
            <div className="mt-5 grid grid-cols-3 gap-3 max-w-sm">
              {[
                { label: "Total", value: stats.total, color: "bg-white/20" },
                { label: "Active", value: stats.active, color: "bg-emerald-500/30" },
                { label: "Needs Review", value: stats.needsReview, color: "bg-amber-500/30" },
              ].map(s => (
                <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
                  <div className="text-2xl font-black">{s.value}</div>
                  <div className="text-xs text-white/80">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { id: "list", label: "All Competitions", icon: List },
            { id: "add", label: editingId ? "Edit Competition" : "Add Competition", icon: Plus },
            { id: "bulk", label: "Bulk Import (AI)", icon: Zap },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { if (id !== "add" || !editingId) { setEditingId(null); setForm({ ...BLANK_FORM }); setTagsInput(""); } setTab(id as any); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === id ? "bg-violet-600 text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
          <a href="/competitions" target="_blank" className="ml-auto flex items-center gap-1.5 text-sm text-violet-600 hover:underline">
            <ExternalLink className="w-4 h-4" /> View Live Feed
          </a>
        </div>

        {/* ── LIST TAB ── */}
        {tab === "list" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search competitions..."
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  className="pl-9 rounded-xl"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-44 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Categories</SelectItem>
                  {COMPETITION_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {listLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : filteredComps.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No competitions yet.</p>
                <p className="text-sm mt-1">Use "Add Competition" or "Bulk Import (AI)" to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredComps.map(c => (
                  <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:border-violet-200 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 truncate">{c.title}</span>
                        <Badge variant="secondary" className="text-xs rounded-full shrink-0">{c.category}</Badge>
                        {!c.isActive && <Badge variant="destructive" className="text-xs rounded-full">Hidden</Badge>}
                        {c.requiresReview && <Badge className="text-xs rounded-full bg-amber-100 text-amber-700 border-amber-200">Review</Badge>}
                        {c.isVerified && <Badge className="text-xs rounded-full bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" />Verified</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{c.organizer} · {c.mode} · {c.field}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm" variant="outline"
                        onClick={() => updateMutation.mutate({ id: c.id, data: { isActive: !c.isActive } })}
                        className="rounded-lg h-8 w-8 p-0"
                        title={c.isActive ? "Hide" : "Show"}
                      >
                        {c.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => startEdit(c)} className="rounded-lg h-8 w-8 p-0">
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        onClick={() => { if (confirm(`Delete "${c.title}"?`)) deleteMutation.mutate(c.id); }}
                        className="rounded-lg h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:border-red-300"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ADD / EDIT TAB ── */}
        {tab === "add" && (
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center justify-between">
                {editingId ? "Edit Competition" : "Add Competition"}
                {editingId && (
                  <Button variant="ghost" size="sm" onClick={cancelEdit} className="text-slate-500 gap-1">
                    <X className="w-4 h-4" /> Cancel
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Title *</Label>
                  <Input value={form.title ?? ""} onChange={e => handleFormChange("title", e.target.value)} placeholder="e.g. Smart India Hackathon 2025" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Organizer *</Label>
                  <Input value={form.organizer ?? ""} onChange={e => handleFormChange("organizer", e.target.value)} placeholder="e.g. AICTE" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Category *</Label>
                  <Select value={form.category ?? "Hackathon"} onValueChange={v => handleFormChange("category", v)}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COMPETITION_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Field *</Label>
                  <Input value={form.field ?? ""} onChange={e => handleFormChange("field", e.target.value)} placeholder="e.g. Engineering, AI/ML" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Mode</Label>
                  <Select value={form.mode ?? "Online"} onValueChange={v => handleFormChange("mode", v)}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Online", "Offline", "Hybrid"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Location (if Offline/Hybrid)</Label>
                  <Input value={form.location ?? ""} onChange={e => handleFormChange("location", e.target.value)} placeholder="e.g. Mumbai" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Registration Deadline (YYYY-MM-DD)</Label>
                  <Input value={form.registrationDeadline ?? ""} onChange={e => handleFormChange("registrationDeadline", e.target.value)} placeholder="2025-08-31" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Event Date</Label>
                  <Input value={form.eventDate ?? ""} onChange={e => handleFormChange("eventDate", e.target.value)} placeholder="2025-09-15 or 2025-09-15/2025-09-17" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Prize Pool</Label>
                  <Input value={form.prizePool ?? ""} onChange={e => handleFormChange("prizePool", e.target.value)} placeholder="e.g. ₹1,00,000" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Entry Fee</Label>
                  <Input value={form.entryFee ?? ""} onChange={e => handleFormChange("entryFee", e.target.value)} placeholder="Free or ₹200" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Eligibility</Label>
                  <Input value={form.eligibility ?? ""} onChange={e => handleFormChange("eligibility", e.target.value)} placeholder="e.g. UG students, all years" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Team Size</Label>
                  <Input value={form.teamSize ?? ""} onChange={e => handleFormChange("teamSize", e.target.value)} placeholder="e.g. Solo or 2-4" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Apply Link</Label>
                  <Input value={form.applyLink ?? ""} onChange={e => handleFormChange("applyLink", e.target.value)} placeholder="https://..." className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Source Platform</Label>
                  <Input value={form.sourcePlatform ?? ""} onChange={e => handleFormChange("sourcePlatform", e.target.value)} placeholder="e.g. Unstop, Devfolio" className="rounded-xl" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Description Summary</Label>
                <Textarea value={form.descriptionSummary ?? ""} onChange={e => handleFormChange("descriptionSummary", e.target.value)} placeholder="1-2 line summary of what the competition is about" className="rounded-xl resize-none" rows={2} />
              </div>

              <div className="space-y-1.5">
                <Label>Tags (comma-separated)</Label>
                <Input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="e.g. React, Machine Learning, Finance" className="rounded-xl" />
              </div>

              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={!!form.isVerified} onCheckedChange={v => handleFormChange("isVerified", v)} id="isVerified" />
                  <Label htmlFor="isVerified">Verified link</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={!!form.requiresReview} onCheckedChange={v => handleFormChange("requiresReview", v)} id="requiresReview" />
                  <Label htmlFor="requiresReview">Needs manual review</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.isActive !== false} onCheckedChange={v => handleFormChange("isActive", v)} id="isActive" />
                  <Label htmlFor="isActive">Active (visible to students)</Label>
                </div>
              </div>

              <Button
                onClick={handleSubmitForm}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-violet-600 hover:bg-violet-700 rounded-xl gap-2 w-full sm:w-auto"
              >
                <Save className="w-4 h-4" />
                {editingId ? "Save Changes" : "Add Competition"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── BULK IMPORT TAB ── */}
        {tab === "bulk" && (
          <div className="space-y-5">
            <Card className="rounded-2xl border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="w-5 h-5 text-violet-600" />
                  AI-Powered Bulk Import
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-sm text-violet-800 space-y-2">
                  <p className="font-semibold">How to use:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Scrape competition listings from Unstop, Devfolio, HackerEarth, college portals etc.</li>
                    <li>Copy the raw text and paste it below</li>
                    <li>Use the AI prompt button to copy the extraction prompt, run it in ChatGPT/Claude</li>
                    <li>Paste the resulting JSON array into the JSON field below</li>
                    <li>Review and import</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>AI Extraction Prompt</Label>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => { navigator.clipboard.writeText(AI_EXTRACTION_PROMPT); toast({ title: "Prompt copied!" }); }}
                      className="rounded-lg gap-1.5 text-xs"
                    >
                      <Upload className="w-3 h-3" /> Copy Prompt
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">Copy this prompt, paste it into ChatGPT or Claude, then append your scraped text and run it.</p>
                </div>

                <div className="space-y-2">
                  <Label>Paste JSON Output Here</Label>
                  <Textarea
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                    placeholder={'Paste the JSON array output from the AI here...\n[\n  {\n    "title": "...",\n    "organizer": "...",\n    ...\n  }\n]'}
                    className="rounded-xl resize-none font-mono text-xs"
                    rows={12}
                  />
                </div>

                {parseError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    {parseError}
                  </div>
                )}

                <div className="flex gap-3 flex-wrap">
                  <Button onClick={parseJson} variant="outline" className="rounded-xl gap-2">
                    <RefreshCw className="w-4 h-4" /> Parse & Preview
                  </Button>
                  {parsedItems.length > 0 && (
                    <Button
                      onClick={() => bulkMutation.mutate(parsedItems)}
                      disabled={bulkMutation.isPending}
                      className="bg-violet-600 hover:bg-violet-700 rounded-xl gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Import {parsedItems.length} Competitions
                    </Button>
                  )}
                </div>

                {parsedItems.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-700">{parsedItems.length} competitions parsed — preview:</p>
                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                      {parsedItems.map((item, i) => (
                        <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                          <div className="font-semibold text-slate-800">{item.title ?? "(no title)"}</div>
                          <div className="text-slate-500">{item.organizer} · {item.category} · {item.mode}</div>
                          {item.registration_deadline && <div className="text-slate-400">Deadline: {item.registration_deadline}</div>}
                          {item.apply_link && (
                            <a href={item.apply_link} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline truncate block">
                              {item.apply_link}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
