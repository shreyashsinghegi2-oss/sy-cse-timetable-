import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, CheckCircle, XCircle, Clock, Eye, Loader2,
  Search, RefreshCw, Shield, Users, IndianRupee,
  Image as ImageIcon, Download, Bot, Code2, Wrench,
  Brain, Gamepad2, ChevronDown, ChevronUp, Phone, Mail,
  GraduationCap, Hash, Calendar, UserCheck, X,
  LayoutList, Trophy, Filter,
} from "lucide-react";
import { EVENTS_CONFIG } from "@/lib/hastech-events";
import { getAuth } from "firebase/auth";
import app from "@/lib/firebase";

async function getAuthToken(): Promise<string | null> {
  const auth = getAuth(app);
  if (auth.currentUser) return auth.currentUser.getIdToken(true);
  return new Promise((resolve) => {
    const unsub = auth.onAuthStateChanged((user) => {
      unsub();
      resolve(user ? user.getIdToken(true) : null);
    });
  });
}

async function adminFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  return fetch(url, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

import { HASTECH_ADMIN_EMAILS, PLATFORM_ADMIN_EMAIL } from "@/config/constants";
const ADMIN_EMAILS = HASTECH_ADMIN_EMAILS;

/* ── Event metadata ─────────────────────────────────────────────────── */
const EVENT_CATEGORY: Record<string, { cat: string; color: string; bg: string }> = {
  "Robo Soccer":                      { cat: "Robotics", color: "#a78bfa", bg: "rgba(139,92,246,0.18)" },
  "Line Follower Challenge":          { cat: "Robotics", color: "#a78bfa", bg: "rgba(139,92,246,0.18)" },
  "RC Racing":                        { cat: "Robotics", color: "#a78bfa", bg: "rgba(139,92,246,0.18)" },
  "Tower Titans (Solo)":              { cat: "Robotics", color: "#a78bfa", bg: "rgba(139,92,246,0.18)" },
  "Tower Titans (Group)":             { cat: "Robotics", color: "#a78bfa", bg: "rgba(139,92,246,0.18)" },
  "Hackathon":                        { cat: "Coding",   color: "#60a5fa", bg: "rgba(96,165,250,0.18)" },
  "Project Competition":              { cat: "Coding",   color: "#60a5fa", bg: "rgba(96,165,250,0.18)" },
  "C Coding Champion":                { cat: "Coding",   color: "#60a5fa", bg: "rgba(96,165,250,0.18)" },
  "Arduino Workshop":                 { cat: "Workshop", color: "#34d399", bg: "rgba(52,211,153,0.18)" },
  "Workshop on 3D Printing":          { cat: "Workshop", color: "#34d399", bg: "rgba(52,211,153,0.18)" },
  "BioTech Next":                     { cat: "Workshop", color: "#34d399", bg: "rgba(52,211,153,0.18)" },
  "IoT Robotics & Drones":            { cat: "Workshop", color: "#34d399", bg: "rgba(52,211,153,0.18)" },
  "Ethical Hacking & CTF":            { cat: "Workshop", color: "#34d399", bg: "rgba(52,211,153,0.18)" },
  "Apti Keeda":                       { cat: "Strategy", color: "#fb923c", bg: "rgba(251,146,60,0.18)" },
  "Ingenium":                         { cat: "Strategy", color: "#fb923c", bg: "rgba(251,146,60,0.18)" },
  "The Boss – Escape the Board Room": { cat: "Strategy", color: "#fb923c", bg: "rgba(251,146,60,0.18)" },
  "Quest Tank":                       { cat: "Strategy", color: "#fb923c", bg: "rgba(251,146,60,0.18)" },
  "Gaming Event (Solo)":              { cat: "Gaming",   color: "#f472b6", bg: "rgba(244,114,182,0.18)" },
  "Gaming Event (Group)":             { cat: "Gaming",   color: "#f472b6", bg: "rgba(244,114,182,0.18)" },
};

const CAT_ICONS: Record<string, React.ReactNode> = {
  Robotics: <Bot className="h-3 w-3" />,
  Coding:   <Code2 className="h-3 w-3" />,
  Workshop: <Wrench className="h-3 w-3" />,
  Strategy: <Brain className="h-3 w-3" />,
  Gaming:   <Gamepad2 className="h-3 w-3" />,
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  confirmed:            { label: "Confirmed", color: "#34d399", bg: "rgba(52,211,153,0.15)",  icon: CheckCircle },
  approved:             { label: "Confirmed", color: "#34d399", bg: "rgba(52,211,153,0.15)",  icon: CheckCircle },
  pending_verification: { label: "Pending",   color: "#fbbf24", bg: "rgba(245,158,11,0.15)",  icon: Clock },
  rejected:             { label: "Rejected",  color: "#f87171", bg: "rgba(239,68,68,0.15)",   icon: XCircle },
};

const ENTRY_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  confirmed: { label: "Confirmed", color: "#34d399", bg: "rgba(52,211,153,0.15)",  icon: CheckCircle },
  approved:  { label: "Confirmed", color: "#34d399", bg: "rgba(52,211,153,0.15)",  icon: CheckCircle },
  pending:   { label: "Pending",   color: "#fbbf24", bg: "rgba(245,158,11,0.15)",  icon: Clock },
  rejected:  { label: "Rejected",  color: "#f87171", bg: "rgba(239,68,68,0.15)",   icon: XCircle },
};

/* ── Interfaces ──────────────────────────────────────────────────────── */
interface HastechReg {
  id: string;
  name: string;
  urn: string;
  college: string;
  department: string;
  course: string;
  year: string;
  email: string;
  phone: string;
  selectedEvents: Array<string | { name: string; price?: number; type?: string; category?: string }>;
  teamName: string;
  teamLeader: string;
  totalAmount: number;
  paymentScreenshotURL: string;
  paymentStatus: "pending_verification" | "approved" | "rejected";
  createdAt: any;
}

interface EventEntry {
  id: string;
  registrationId: string;
  name: string;
  phone: string;
  email: string;
  urn: string;
  college: string;
  department: string;
  eventName: string;
  eventCategory: string;
  eventType: string;
  teamName: string;
  teamLeader: string;
  amountPaid: number;
  paymentScreenshotURL: string;
  paymentStatus: "pending" | "approved" | "rejected";
  createdAt: any;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */
function formatDate(ts: any) {
  if (!ts) return "—";
  try {
    const d = ts._seconds ? new Date(ts._seconds * 1000) : ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
}

type AnyEvent = string | { name: string; price?: number; type?: string; category?: string };
function evtName(e: AnyEvent): string { return typeof e === "string" ? e : e.name; }
function evtType(e: AnyEvent): string | undefined { return typeof e === "string" ? undefined : e.type; }
function evtPrice(e: AnyEvent): number | undefined { return typeof e === "string" ? undefined : e.price; }
function evtNames(events: AnyEvent[]): string[] { return (events || []).map(evtName); }

function exportCSV(rows: HastechReg[]) {
  const headers = ["Name","URN","College","Department","Course","Year","Email","Phone","Events","Team Name","Team Leader","Amount","Status","Date"];
  const lines = rows.map(r => [
    r.name, r.urn, r.college, r.department, r.course, r.year, r.email, r.phone,
    evtNames(r.selectedEvents || []).join("; "),
    r.teamName || "", r.teamLeader || "",
    r.totalAmount, r.paymentStatus, formatDate(r.createdAt),
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "hastech_registrations.csv"; a.click();
  URL.revokeObjectURL(url);
}

function exportEntriesCSV(rows: EventEntry[]) {
  const headers = ["Event","Name","URN","Phone","Email","College","Team Name","Team Leader","Type","Amount","Status","Date"];
  const lines = rows.map(r => [
    r.eventName, r.name, r.urn, r.phone, r.email, r.college,
    r.teamName || "", r.teamLeader || "",
    r.eventType, r.amountPaid, r.paymentStatus, formatDate(r.createdAt),
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "hastech_event_entries.csv"; a.click();
  URL.revokeObjectURL(url);
}

/* ── Sub-components ──────────────────────────────────────────────────── */
function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-white/5 last:border-0">
      <span className="flex items-center gap-1.5 text-xs shrink-0" style={{ color: "#7c6fc4" }}>
        {icon}{label}
      </span>
      <span className="text-white text-xs font-medium text-right break-all">{value || "—"}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(139,92,246,0.15)" }}>
      <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#a5b4fc" }}>{title}</p>
      {children}
    </div>
  );
}

function EventChip({ ev }: { ev: AnyEvent }) {
  const name = evtName(ev);
  const type = evtType(ev);
  const price = evtPrice(ev);
  const meta = EVENT_CATEGORY[name] || { cat: "Other", color: "#9ca3af", bg: "rgba(156,163,175,0.18)" };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}40` }}>
      {CAT_ICONS[meta.cat]}
      {name}
      {price !== undefined && <span className="opacity-75">· ₹{price}</span>}
      {type === "group" && <span className="opacity-75">· Group</span>}
    </span>
  );
}

function StatCard({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col items-center justify-center text-center"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(139,92,246,0.2)" }}>
      <p className="text-2xl font-extrabold tracking-tight" style={{ color }}>{value}</p>
      <p className="text-xs font-semibold mt-0.5" style={{ color: "#7c6fc4" }}>{label}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: "#a78bfa" }}>{sub}</p>}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────── */
export default function HastechAdmin() {
  const [, setLocation] = useLocation();
  const { user, status } = useCollabAuth();
  const { toast } = useToast();

  /* ── Shared state ── */
  const [mainTab, setMainTab] = useState<"registrations" | "events" | "controls">("registrations");
  const isAdmin = ADMIN_EMAILS.includes((user?.email || "").toLowerCase());
  const isOwner = (user?.email || "").toLowerCase() === PLATFORM_ADMIN_EMAIL;

  /* ── Event Controls tab state (owner only) ── */
  const [serverClosedEvents, setServerClosedEvents] = useState<string[]>([]);
  const [controlsLoading, setControlsLoading] = useState(false);
  const [togglingEvent, setTogglingEvent] = useState<string | null>(null);

  /* ── Registrations tab state ── */
  const [registrations, setRegistrations] = useState<HastechReg[]>([]);
  const [regsLoading, setRegsLoading] = useState(true);
  const [selected, setSelected] = useState<HastechReg | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedEvents, setExpandedEvents] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [confirmRejectId, setConfirmRejectId] = useState<string | null>(null);
  const [clearStep, setClearStep] = useState<0 | 1 | 2>(0);
  const [isClearing, setIsClearing] = useState(false);

  /* ── Event Management tab state ── */
  const [eventEntries, setEventEntries] = useState<EventEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [selectedEventTab, setSelectedEventTab] = useState("__all__");
  const [entrySearch, setEntrySearch] = useState("");
  const [entryScreenshot, setEntryScreenshot] = useState<string | null>(null);

  /* ── Fetch functions ── */
  const fetchClosedEvents = useCallback(async () => {
    setControlsLoading(true);
    try {
      const res = await fetch("/api/hastech/closed-events");
      const data = await res.json();
      if (Array.isArray(data.closed)) setServerClosedEvents(data.closed);
    } catch {
      toast({ title: "Error", description: "Failed to load event status", variant: "destructive" });
    } finally { setControlsLoading(false); }
  }, [toast]);

  const toggleClosedEvent = useCallback(async (eventName: string, makeClosed: boolean) => {
    setTogglingEvent(eventName);
    try {
      const res = await adminFetch("/api/hastech/closed-events/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventName, closed: makeClosed }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (Array.isArray(data.closed)) setServerClosedEvents(data.closed);
      toast({ title: makeClosed ? "Registration Closed" : "Registration Opened", description: `"${eventName}" is now ${makeClosed ? "closed" : "open"} for registration.` });
    } catch {
      toast({ title: "Failed", description: "Could not update event status", variant: "destructive" });
    } finally { setTogglingEvent(null); }
  }, [toast]);

  const fetchRegistrations = useCallback(async () => {
    setRegsLoading(true);
    try {
      const res = await adminFetch("/api/hastech/registrations");
      if (!res.ok) throw new Error();
      setRegistrations(await res.json());
    } catch {
      toast({ title: "Error", description: "Failed to load registrations", variant: "destructive" });
    } finally { setRegsLoading(false); }
  }, [toast]);

  const fetchEventEntries = useCallback(async () => {
    setEntriesLoading(true);
    try {
      const res = await adminFetch("/api/hastech/event-entries");
      if (!res.ok) throw new Error();
      setEventEntries(await res.json());
    } catch {
      toast({ title: "Error", description: "Failed to load event entries", variant: "destructive" });
    } finally { setEntriesLoading(false); }
  }, [toast]);

  const handleReject = useCallback(async (id: string) => {
    setIsRejecting(true);
    try {
      const res = await adminFetch(`/api/hastech/registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: "rejected" }),
      });
      if (!res.ok) throw new Error();
      setRegistrations(prev => prev.map(r => r.id === id ? { ...r, paymentStatus: "rejected" } : r));
      setSelected(prev => prev?.id === id ? { ...prev, paymentStatus: "rejected" } : prev);
      setConfirmRejectId(null);
      toast({ title: "Registration rejected", description: "Status updated to Rejected" });
    } catch {
      toast({ title: "Failed to reject", description: "Please try again", variant: "destructive" });
    } finally { setIsRejecting(false); }
  }, [toast]);

  const handleClearAll = useCallback(async () => {
    setIsClearing(true);
    try {
      const res = await adminFetch("/api/hastech/all", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRegistrations([]);
      setEventEntries([]);
      setClearStep(0);
      toast({ title: "All data cleared", description: "All registrations and entries have been deleted" });
    } catch {
      toast({ title: "Failed to clear", description: "Please try again", variant: "destructive" });
    } finally { setIsClearing(false); }
  }, [toast]);

  useEffect(() => {
    if (status === "authenticated") {
      if (!isAdmin) {
        toast({ title: "Access denied", description: "Admin only area", variant: "destructive" });
        setLocation("/hastech-2026");
        return;
      }
      fetchRegistrations();
      fetchEventEntries();
    } else if (status === "unauthenticated") {
      setLocation("/student-collab");
    }
  }, [status, isAdmin]);

  /* ── Load closed events when controls tab opens ── */
  useEffect(() => {
    if (mainTab === "controls" && isOwner) fetchClosedEvents();
  }, [mainTab, isOwner, fetchClosedEvents]);

  /* ── Derived: Registrations tab ── */
  const regStats = useMemo(() => ({
    total:   registrations.length,
    revenue: registrations.reduce((s, r) => s + (r.totalAmount || 0), 0),
  }), [registrations]);

  const eventBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    registrations.forEach(r => evtNames(r.selectedEvents || []).forEach(ev => { counts[ev] = (counts[ev] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [registrations]);

  const filteredRegs = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return registrations;
    return registrations.filter(r =>
      r.name?.toLowerCase().includes(q) ||
      r.urn?.toLowerCase().includes(q) ||
      r.college?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.phone?.includes(q) ||
      r.department?.toLowerCase().includes(q) ||
      r.teamName?.toLowerCase().includes(q) ||
      evtNames(r.selectedEvents || []).some(e => e.toLowerCase().includes(q))
    );
  }, [registrations, searchTerm]);

  /* ── Derived: Event Management tab ── */
  const allEventNames = useMemo(() => EVENTS_CONFIG.map(e => e.name), []);

  const eventEntryStats = useMemo(() => {
    const scope = selectedEventTab === "__all__"
      ? eventEntries
      : eventEntries.filter(e => e.eventName === selectedEventTab);
    return {
      total:   scope.length,
      revenue: scope.reduce((s, e) => s + (e.amountPaid || 0), 0),
    };
  }, [eventEntries, selectedEventTab]);

  const filteredEntries = useMemo(() => {
    const q = entrySearch.toLowerCase().trim();
    return eventEntries.filter(e => {
      const matchEvent  = selectedEventTab === "__all__" || e.eventName === selectedEventTab;
      const matchSearch = !q ||
        e.name?.toLowerCase().includes(q) ||
        e.phone?.includes(q) ||
        e.urn?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.teamName?.toLowerCase().includes(q);
      return matchEvent && matchSearch;
    });
  }, [eventEntries, selectedEventTab, entrySearch]);

  /* ── Event entry counts per event name (for tab badges) ── */
  const entryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    eventEntries.forEach(e => { counts[e.eventName] = (counts[e.eventName] || 0) + 1; });
    return counts;
  }, [eventEntries]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f0320" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#a78bfa" }} />
      </div>
    );
  }


  /* ─────────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen pb-16" style={{ background: "linear-gradient(160deg,#0f0320,#1a0a40,#0d0530)" }}>

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 gap-3"
        style={{ background: "rgba(15,3,32,0.96)", backdropFilter: "blur(18px)", borderBottom: "1px solid rgba(139,92,246,0.18)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => setLocation("/hastech-2026")}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 hover:bg-white/10 transition-colors"
            style={{ color: "#a5b4fc" }}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-white font-extrabold text-base leading-tight">#TECH 2026</h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background: "rgba(167,139,250,0.2)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.4)" }}>
                Admin Portal
              </span>
            </div>
            <p className="text-xs truncate" style={{ color: "#7c6fc4" }}>
              {regStats.total} registrations · ₹{regStats.revenue.toLocaleString("en-IN")} collected
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => mainTab === "registrations" ? exportCSV(filteredRegs) : exportEntriesCSV(filteredEntries)}
            title="Export CSV"
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
            style={{ color: "#a5b4fc" }}>
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={() => { fetchRegistrations(); fetchEventEntries(); }}
            title="Refresh"
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
            style={{ color: "#a5b4fc" }}>
            <RefreshCw className={`h-4 w-4 ${(regsLoading || entriesLoading) ? "animate-spin" : ""}`} />
          </button>
          <div className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(167,139,250,0.15)" }}>
            <Shield className="h-4 w-4" style={{ color: "#a78bfa" }} />
          </div>
        </div>
      </div>

      {/* ── Main Tabs ── */}
      <div className="flex gap-0 border-b overflow-x-auto" style={{ borderColor: "rgba(139,92,246,0.18)", background: "rgba(15,3,32,0.8)" }}>
        {([
          { key: "registrations", label: "Registrations", icon: <LayoutList className="h-3.5 w-3.5" /> },
          { key: "events",        label: "Event Entries", icon: <Trophy className="h-3.5 w-3.5" /> },
          ...(isOwner ? [{ key: "controls", label: "Event Controls", icon: <Shield className="h-3.5 w-3.5" /> }] : []),
        ] as const).map(tab => (
          <button key={tab.key}
            onClick={() => setMainTab(tab.key as any)}
            className="flex items-center gap-1.5 px-4 py-3 text-sm font-semibold transition-all relative whitespace-nowrap"
            style={{ color: mainTab === tab.key ? (tab.key === "controls" ? "#f87171" : "#c4b5fd") : "#7c6fc4" }}>
            {tab.icon}{tab.label}
            {mainTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: tab.key === "controls" ? "linear-gradient(90deg,#ef4444,#dc2626)" : "linear-gradient(90deg,#7c3aed,#2563eb)" }} />
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* REGISTRATIONS TAB                                              */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {mainTab === "registrations" && (
        <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total Registrations" value={regStats.total}   color="#a78bfa" />
            <StatCard label="Total Revenue"        value={`₹${regStats.revenue.toLocaleString("en-IN")}`} color="#60a5fa" />
          </div>

          {/* Clear All Data */}
          {clearStep === 0 && (
            <button
              onClick={() => setClearStep(1)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90"
              style={{ background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
              <X className="h-3.5 w-3.5" /> Clear All Test Data
            </button>
          )}
          {clearStep === 1 && (
            <div className="rounded-xl p-4 space-y-3"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)" }}>
              <p className="text-sm font-bold text-center" style={{ color: "#fca5a5" }}>
                Delete ALL registrations, event entries, and user profiles?
              </p>
              <p className="text-xs text-center" style={{ color: "#9ca3af" }}>
                This cannot be undone. All {regStats.total} registration(s) will be permanently deleted.
              </p>
              <div className="flex gap-2">
                <Button
                  className="flex-1 h-9 rounded-xl font-bold text-sm"
                  style={{ background: "rgba(239,68,68,0.2)", color: "#f87171", border: "1px solid rgba(239,68,68,0.4)" }}
                  onClick={() => setClearStep(2)}>
                  Yes, I'm sure
                </Button>
                <Button variant="ghost" className="flex-1 h-9 rounded-xl font-bold text-sm" style={{ color: "#9ca3af" }}
                  onClick={() => setClearStep(0)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {clearStep === 2 && (
            <div className="rounded-xl p-4 space-y-3"
              style={{ background: "rgba(239,68,68,0.12)", border: "2px solid rgba(239,68,68,0.5)" }}>
              <p className="text-sm font-extrabold text-center" style={{ color: "#f87171" }}>
                FINAL CONFIRMATION — This is irreversible!
              </p>
              <div className="flex gap-2">
                <Button
                  className="flex-1 h-9 rounded-xl font-bold text-sm"
                  style={{ background: "#dc2626", color: "white", border: "none" }}
                  onClick={handleClearAll}
                  disabled={isClearing}>
                  {isClearing ? <Loader2 className="h-4 w-4 animate-spin" /> : "DELETE EVERYTHING"}
                </Button>
                <Button variant="ghost" className="flex-1 h-9 rounded-xl font-bold text-sm" style={{ color: "#9ca3af" }}
                  onClick={() => setClearStep(0)} disabled={isClearing}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Event Breakdown */}
          {eventBreakdown.length > 0 && (
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(139,92,246,0.2)" }}>
              <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                onClick={() => setExpandedEvents(v => !v)}>
                <span className="text-sm font-bold" style={{ color: "#a5b4fc" }}>Event-wise Registrations</span>
                {expandedEvents
                  ? <ChevronUp className="h-4 w-4" style={{ color: "#7c6fc4" }} />
                  : <ChevronDown className="h-4 w-4" style={{ color: "#7c6fc4" }} />}
              </button>
              {expandedEvents && (
                <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {eventBreakdown.map(([ev, count]) => {
                    const meta = EVENT_CATEGORY[ev] || { color: "#9ca3af", bg: "rgba(156,163,175,0.1)", cat: "Other" };
                    const pct = regStats.total ? Math.round((count / regStats.total) * 100) : 0;
                    return (
                      <div key={ev} className="flex items-center gap-2 rounded-xl px-3 py-2"
                        style={{ background: meta.bg, border: `1px solid ${meta.color}30` }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: meta.color }}>{ev}</p>
                          <div className="mt-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                            <div className="h-1 rounded-full transition-all" style={{ width: `${pct}%`, background: meta.color }} />
                          </div>
                        </div>
                        <span className="text-sm font-bold shrink-0" style={{ color: meta.color }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "#7c6fc4" }} />
            <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search name, URN, email, phone, event…"
              className="pl-10 pr-4"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(139,92,246,0.25)", color: "white", borderRadius: "12px" }} />
            {searchTerm && (
              <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearchTerm("")}>
                <X className="h-3.5 w-3.5" style={{ color: "#7c6fc4" }} />
              </button>
            )}
          </div>

          <p className="text-xs" style={{ color: "#7c6fc4" }}>
            Showing <strong style={{ color: "#a5b4fc" }}>{filteredRegs.length}</strong> of {registrations.length} registrations
          </p>

          {/* List */}
          {regsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#a78bfa" }} />
            </div>
          ) : filteredRegs.length === 0 ? (
            <div className="text-center py-20" style={{ color: "#7c6fc4" }}>
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">No registrations found</p>
              <p className="text-xs mt-1">Try adjusting your search or filter</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRegs.map((reg, idx) => {
                const sc = STATUS_CONFIG[reg.paymentStatus] || STATUS_CONFIG.pending_verification;
                const Icon = sc.icon;
                return (
                  <div key={reg.id}
                    className="rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.005]"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(139,92,246,0.18)" }}
                    onClick={() => { setSelected(reg); setShowModal(true); }}>

                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-bold shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(139,92,246,0.25)", color: "#c4b5fd" }}>
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-white text-sm leading-tight truncate">{reg.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: "#7c6fc4" }}>
                            URN: <span style={{ color: "#a5b4fc" }}>{reg.urn}</span>
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shrink-0"
                        style={{ background: sc.bg, color: sc.color }}>
                        <Icon className="h-3 w-3" />{sc.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-2.5">
                      {reg.college && (
                        <span className="text-xs flex items-center gap-1" style={{ color: "#a5b4fc" }}>
                          <GraduationCap className="h-3 w-3" />{reg.college}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: "#9ca3af" }}>
                        {reg.department || "—"} · {reg.course || "—"} · {reg.year ? `${reg.year} Year` : "—"}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {(reg.selectedEvents || []).map(ev => <EventChip key={evtName(ev)} ev={ev} />)}
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-3">
                        {reg.teamName && (
                          <span className="text-xs flex items-center gap-1" style={{ color: "#fb923c" }}>
                            <UserCheck className="h-3 w-3" />Team: {reg.teamName}
                          </span>
                        )}
                        <span className="text-xs flex items-center gap-1 font-bold" style={{ color: "#60a5fa" }}>
                          <IndianRupee className="h-3 w-3" />₹{reg.totalAmount}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: "#4b5563" }}>
                          <Calendar className="h-3 w-3 inline mr-0.5" />
                          {formatDate(reg.createdAt).split(",")[0]}
                        </span>
                        {reg.paymentStatus !== "rejected" && (
                          confirmRejectId === reg.id ? (
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <button
                                className="text-xs px-2 py-0.5 rounded-lg font-bold transition-colors"
                                style={{ background: "rgba(239,68,68,0.2)", color: "#f87171", border: "1px solid rgba(239,68,68,0.4)" }}
                                onClick={() => handleReject(reg.id)}
                                disabled={isRejecting}>
                                {isRejecting ? "..." : "Confirm"}
                              </button>
                              <button
                                className="text-xs px-2 py-0.5 rounded-lg font-bold transition-colors"
                                style={{ background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}
                                onClick={() => setConfirmRejectId(null)}>
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              title="Reject registration"
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/20 transition-colors"
                              style={{ color: "#f87171" }}
                              onClick={e => { e.stopPropagation(); setConfirmRejectId(reg.id); }}>
                              <XCircle className="h-4 w-4" />
                            </button>
                          )
                        )}
                        <Eye className="h-4 w-4" style={{ color: "#6b7280" }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* EVENT MANAGEMENT TAB                                           */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {mainTab === "events" && (
        <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">

          {/* Event stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Event Entries" value={eventEntryStats.total}   color="#a78bfa" />
            <StatCard label="Total Revenue" value={`₹${eventEntryStats.revenue.toLocaleString("en-IN")}`} color="#60a5fa" />
          </div>

          {/* Event tabs (horizontal scroll) */}
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            {/* All Events */}
            <button
              onClick={() => setSelectedEventTab("__all__")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0"
              style={selectedEventTab === "__all__"
                ? { background: "rgba(139,92,246,0.35)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.7)" }
                : { background: "rgba(255,255,255,0.05)", color: "#7c6fc4", border: "1px solid rgba(139,92,246,0.2)" }}>
              All Events
              <span className="px-1.5 py-0.5 rounded-full text-xs"
                style={{ background: "rgba(139,92,246,0.3)", color: "#c4b5fd" }}>
                {eventEntries.length}
              </span>
            </button>
            {/* Per-event tabs */}
            {allEventNames.map(evName => {
              const count = entryCounts[evName] || 0;
              const isActive = selectedEventTab === evName;
              const meta = EVENT_CATEGORY[evName] || { color: "#9ca3af", bg: "rgba(156,163,175,0.12)" };
              return (
                <button key={evName}
                  onClick={() => setSelectedEventTab(evName)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0"
                  style={isActive
                    ? { background: meta.bg, color: meta.color, border: `1px solid ${meta.color}90` }
                    : { background: "rgba(255,255,255,0.04)", color: "#7c6fc4", border: "1px solid rgba(139,92,246,0.15)" }}>
                  {evName}
                  {count > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-xs"
                      style={{ background: isActive ? `${meta.color}25` : "rgba(255,255,255,0.08)", color: isActive ? meta.color : "#9ca3af" }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "#7c6fc4" }} />
            <Input value={entrySearch} onChange={e => setEntrySearch(e.target.value)}
              placeholder="Search name, phone, URN, team…"
              className="pl-10 pr-4"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(139,92,246,0.25)", color: "white", borderRadius: "12px" }} />
            {entrySearch && (
              <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setEntrySearch("")}>
                <X className="h-3.5 w-3.5" style={{ color: "#7c6fc4" }} />
              </button>
            )}
          </div>

          <p className="text-xs" style={{ color: "#7c6fc4" }}>
            Showing <strong style={{ color: "#a5b4fc" }}>{filteredEntries.length}</strong> of {eventEntries.length} event entries
          </p>

          {/* Entries list */}
          {entriesLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#a78bfa" }} />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-20" style={{ color: "#7c6fc4" }}>
              <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">No entries found</p>
              <p className="text-xs mt-1">Try a different event or search term</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map((entry, idx) => {
                const sc = ENTRY_STATUS_CONFIG[entry.paymentStatus] || ENTRY_STATUS_CONFIG.pending;
                const StatusIcon = sc.icon;
                const meta = EVENT_CATEGORY[entry.eventName] || { color: "#9ca3af", bg: "rgba(156,163,175,0.12)", cat: "Other" };
                return (
                  <div key={entry.id} className="rounded-2xl p-4"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(139,92,246,0.18)"
                    }}>

                    {/* Row 1: serial + name + event chip + status */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="text-xs font-bold shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(139,92,246,0.25)", color: "#c4b5fd" }}>
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-white text-sm leading-tight">{entry.name}</p>
                            {selectedEventTab === "__all__" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                                style={{ background: meta.bg, color: meta.color }}>
                                {CAT_ICONS[meta.cat]}{entry.eventName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            <span className="text-xs" style={{ color: "#7c6fc4" }}>
                              URN: <span style={{ color: "#a5b4fc" }}>{entry.urn}</span>
                            </span>
                            {entry.phone && (
                              <span className="text-xs flex items-center gap-1" style={{ color: "#7c6fc4" }}>
                                <Phone className="h-3 w-3" />{entry.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shrink-0"
                        style={{ background: sc.bg, color: sc.color }}>
                        <StatusIcon className="h-3 w-3" />{sc.label}
                      </span>
                    </div>

                    {/* Row 2: college + type */}
                    {(entry.college || entry.eventType) && (
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-2.5">
                        {entry.college && (
                          <span className="text-xs flex items-center gap-1" style={{ color: "#a5b4fc" }}>
                            <GraduationCap className="h-3 w-3" />{entry.college}
                          </span>
                        )}
                        <span className="text-xs px-1.5 py-0.5 rounded-full"
                          style={entry.eventType === "group"
                            ? { background: "rgba(251,146,60,0.15)", color: "#fb923c" }
                            : { background: "rgba(96,165,250,0.15)", color: "#60a5fa" }}>
                          {entry.eventType === "group" ? "Group" : "Individual"}
                        </span>
                      </div>
                    )}

                    {/* Row 3: team info */}
                    {entry.teamName && (
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="text-xs flex items-center gap-1" style={{ color: "#fb923c" }}>
                          <Users className="h-3 w-3" />Team: {entry.teamName}
                        </span>
                        {entry.teamLeader && (
                          <span className="text-xs flex items-center gap-1" style={{ color: "#9ca3af" }}>
                            <UserCheck className="h-3 w-3" />Leader: {entry.teamLeader}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Row 4: amount + screenshot + actions */}
                    <div className="flex items-center justify-between gap-2 flex-wrap pt-2.5 border-t"
                      style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <span className="text-sm font-extrabold flex items-center gap-1" style={{ color: "#a78bfa" }}>
                        <IndianRupee className="h-3.5 w-3.5" />₹{entry.amountPaid}
                      </span>
                      <div className="flex items-center gap-2">
                        {entry.paymentScreenshotURL && (
                          <button
                            onClick={() => setEntryScreenshot(entry.paymentScreenshotURL)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                            style={{ background: "rgba(139,92,246,0.18)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.35)" }}>
                            <ImageIcon className="h-3.5 w-3.5" />Screenshot
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Registration Detail Modal ── */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md w-full rounded-2xl p-0 overflow-hidden max-h-[92vh] flex flex-col"
          style={{ background: "linear-gradient(160deg,#0f0320,#1a0a40)", border: "1px solid rgba(139,92,246,0.35)" }}>
          <DialogHeader className="px-5 pt-5 pb-3 shrink-0"
            style={{ borderBottom: "1px solid rgba(139,92,246,0.15)" }}>
            <DialogTitle className="text-white font-bold text-base flex items-center justify-between">
              Registration Details
              {selected && (() => {
                const sc = STATUS_CONFIG[selected.paymentStatus];
                const Icon = sc.icon;
                return (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{ background: sc.bg, color: sc.color }}>
                    <Icon className="h-3.5 w-3.5" />{sc.label}
                  </span>
                );
              })()}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
            {selected && (
              <>
                <Section title="Personal Information">
                  <Row label="Full Name"   value={selected.name}       icon={<UserCheck className="h-3 w-3" />} />
                  <Row label="URN"         value={selected.urn}        icon={<Hash className="h-3 w-3" />} />
                  <Row label="College"     value={selected.college}    icon={<GraduationCap className="h-3 w-3" />} />
                  <Row label="Department"  value={selected.department} icon={<GraduationCap className="h-3 w-3" />} />
                  <Row label="Course"      value={`${selected.course} — ${selected.year} Year`} icon={<GraduationCap className="h-3 w-3" />} />
                  <Row label="Email"       value={selected.email}      icon={<Mail className="h-3 w-3" />} />
                  <Row label="Phone"       value={selected.phone}      icon={<Phone className="h-3 w-3" />} />
                  <Row label="Submitted"   value={formatDate(selected.createdAt)} icon={<Calendar className="h-3 w-3" />} />
                </Section>

                {selected.teamName && (
                  <Section title="Team Details">
                    <Row label="Team Name"   value={selected.teamName}   icon={<Users className="h-3 w-3" />} />
                    <Row label="Team Leader" value={selected.teamLeader} icon={<UserCheck className="h-3 w-3" />} />
                  </Section>
                )}

                <Section title={`Registered Events (${(selected.selectedEvents || []).length})`}>
                  <div className="flex flex-wrap gap-1.5 pt-1 pb-2">
                    {(selected.selectedEvents || []).map(ev => <EventChip key={evtName(ev)} ev={ev} />)}
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-white/10">
                    <span className="text-xs" style={{ color: "#7c6fc4" }}>Total Payable</span>
                    <span className="text-base font-extrabold" style={{ color: "#a78bfa" }}>₹{selected.totalAmount}</span>
                  </div>
                </Section>

                {selected.paymentScreenshotURL && (
                  <button
                    className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-sm hover:opacity-90 transition-colors"
                    style={{ background: "rgba(139,92,246,0.18)", border: "1px solid rgba(139,92,246,0.45)", color: "#c4b5fd" }}
                    onClick={() => setShowScreenshot(true)}>
                    <ImageIcon className="h-4 w-4" /> View Payment Screenshot
                  </button>
                )}
              </>
            )}
          </div>

          {/* ── Modal footer: reject action ── */}
          {selected && selected.paymentStatus !== "rejected" && (
            <div className="px-5 pb-5 pt-3 shrink-0"
              style={{ borderTop: "1px solid rgba(139,92,246,0.15)" }}>
              {confirmRejectId === selected.id ? (
                <div className="rounded-xl p-3 space-y-3"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
                  <p className="text-sm font-semibold text-center" style={{ color: "#fca5a5" }}>
                    Reject this registration?
                  </p>
                  <p className="text-xs text-center" style={{ color: "#9ca3af" }}>
                    This will mark <span className="font-bold text-white">{selected.name}</span>'s registration as Rejected.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 h-9 rounded-xl font-bold text-sm"
                      style={{ background: "rgba(239,68,68,0.2)", color: "#f87171", border: "1px solid rgba(239,68,68,0.4)" }}
                      onClick={() => handleReject(selected.id)}
                      disabled={isRejecting}>
                      {isRejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><XCircle className="h-4 w-4 mr-1" /> Yes, Reject</>}
                    </Button>
                    <Button
                      variant="ghost"
                      className="flex-1 h-9 rounded-xl font-bold text-sm"
                      style={{ color: "#9ca3af" }}
                      onClick={() => setConfirmRejectId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  className="w-full h-9 rounded-xl font-bold text-sm"
                  style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}
                  onClick={() => setConfirmRejectId(selected.id)}>
                  <XCircle className="h-4 w-4 mr-2" /> Reject Registration
                </Button>
              )}
            </div>
          )}

          {selected && selected.paymentStatus === "rejected" && (
            <div className="px-5 pb-5 pt-3 shrink-0" style={{ borderTop: "1px solid rgba(139,92,246,0.15)" }}>
              <div className="flex items-center justify-center gap-2 rounded-xl py-2.5"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <XCircle className="h-4 w-4" style={{ color: "#f87171" }} />
                <span className="text-sm font-semibold" style={{ color: "#f87171" }}>This registration has been rejected</span>
              </div>
            </div>
          )}

        </DialogContent>
      </Dialog>

      {/* ── Registration Screenshot Modal ── */}
      <Dialog open={showScreenshot} onOpenChange={setShowScreenshot}>
        <DialogContent className="max-w-sm w-full rounded-2xl p-4"
          style={{ background: "#0f0320", border: "1px solid rgba(139,92,246,0.35)" }}>
          <DialogHeader>
            <DialogTitle className="text-white text-sm font-bold">Payment Screenshot</DialogTitle>
          </DialogHeader>
          {selected?.paymentScreenshotURL && (
            <img src={selected.paymentScreenshotURL} alt="Payment Screenshot"
              className="w-full rounded-xl object-contain max-h-96" />
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* EVENT CONTROLS TAB (Owner only)                               */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {mainTab === "controls" && isOwner && (
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
          {/* Header */}
          <div className="rounded-2xl p-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-5 w-5" style={{ color: "#f87171" }} />
              <span className="font-bold text-white">Event Registration Controls</span>
            </div>
            <p className="text-xs" style={{ color: "#fca5a5" }}>
              Toggle registrations open/closed for any event. Changes take effect immediately for all users. Only you (owner) can access this.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={fetchClosedEvents}
              disabled={controlsLoading}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
              style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)" }}>
              <RefreshCw className={`h-3.5 w-3.5 ${controlsLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* Event list grouped by category */}
          {controlsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-7 w-7 animate-spin" style={{ color: "#a78bfa" }} />
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { label: "Robotics & Engineering", catId: "robotics", color: "#a78bfa" },
                { label: "Coding & Innovation",    catId: "coding",   color: "#60a5fa" },
                { label: "Workshops",              catId: "workshops", color: "#34d399" },
                { label: "Strategy & Mind Games",  catId: "strategy",  color: "#fbbf24" },
                { label: "Gaming Arena",           catId: "gaming",    color: "#f472b6" },
              ].map(({ label, catId, color }) => {
                const catEvents = EVENTS_CONFIG.filter(e => e.catId === catId);
                return (
                  <div key={catId} className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="px-4 py-2.5 font-bold text-xs uppercase tracking-widest" style={{ background: "rgba(255,255,255,0.04)", color }}>
                      {label}
                    </div>
                    <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      {catEvents.map(ev => {
                        const isStaticClosed = !!ev.closed;
                        const isDynClosed = serverClosedEvents.includes(ev.name);
                        const isClosed = isStaticClosed || isDynClosed;
                        const isToggling = togglingEvent === ev.name;
                        return (
                          <div key={ev.name} className="flex items-center justify-between px-4 py-3 gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white leading-tight">{ev.name}</p>
                              <p className="text-xs mt-0.5" style={{ color: isClosed ? "#f87171" : "#6ee7b7" }}>
                                {isClosed ? "🔒 Registration Closed" : "✅ Registration Open"}
                                {isStaticClosed && " (permanently closed)"}
                              </p>
                            </div>
                            {isStaticClosed ? (
                              <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
                                Permanent
                              </span>
                            ) : (
                              <button
                                onClick={() => toggleClosedEvent(ev.name, !isDynClosed)}
                                disabled={isToggling}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-80 disabled:opacity-50"
                                style={isDynClosed
                                  ? { background: "rgba(34,197,94,0.15)", color: "#6ee7b7", border: "1px solid rgba(34,197,94,0.35)" }
                                  : { background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.35)" }}>
                                {isToggling
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : isDynClosed
                                    ? <><CheckCircle className="h-3.5 w-3.5" /> Open</>
                                    : <><XCircle className="h-3.5 w-3.5" /> Close</>
                                }
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Event Entry Screenshot Modal ── */}
      <Dialog open={!!entryScreenshot} onOpenChange={() => setEntryScreenshot(null)}>
        <DialogContent className="max-w-sm w-full rounded-2xl p-4"
          style={{ background: "#0f0320", border: "1px solid rgba(139,92,246,0.35)" }}>
          <DialogHeader>
            <DialogTitle className="text-white text-sm font-bold">Payment Screenshot</DialogTitle>
          </DialogHeader>
          {entryScreenshot && (
            <img src={entryScreenshot} alt="Payment Screenshot"
              className="w-full rounded-xl object-contain max-h-96" />
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
