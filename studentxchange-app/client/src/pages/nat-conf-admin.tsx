import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  ArrowLeft, QrCode, Search, Download, Users, CheckCircle2,
  XCircle, Loader2, RefreshCw, Camera, CameraOff, UserCheck,
  Clock, Shield, AlertTriangle, Filter, Trash2, RotateCcw,
  UserX, Eye, EyeOff, LogIn
} from "lucide-react";
// html5-qrcode is dynamically imported inside startScanner — NOT in initial bundle

import { NAT_CONF_ADMIN_EMAILS } from "@/config/constants";
const ADMIN_EMAILS = NAT_CONF_ADMIN_EMAILS;

const SESSION_META = [
  { id: 1, name: "S1", fullName: "Day 1 – Session 1", label: "Inauguration & Keynote", color: "#06b6d4" },
  { id: 2, name: "S2", fullName: "Day 1 – Session 2", label: "Technical Presentations I", color: "#3b82f6" },
  { id: 3, name: "S3", fullName: "Day 1 – Session 3", label: "Technical Presentations II", color: "#6366f1" },
  { id: 4, name: "S4", fullName: "Day 2 – Session 4", label: "Advanced Research Papers", color: "#8b5cf6" },
  { id: 5, name: "S5", fullName: "Day 2 – Session 5", label: "Closing Ceremony & Awards", color: "#ec4899" },
];

interface Reg {
  id: string; name: string; college: string; department: string;
  degree: string; year: string; urn: string; phone: string;
  sessions: Record<string, { status: string; checkinTime: string | null }>;
  totalAttended: number; createdAt: string;
  isDeleted: boolean; deletedAt: string | null; deletedBy: string | null; deleteReason: string | null;
}

type ScanState = "idle" | "scanning" | "checking" | "success" | "already" | "expired" | "outdated" | "tampered" | "error";
type ScanResult = {
  name: string; urn: string; college?: string; department?: string;
  degree?: string; year?: string; phone?: string;
  sessionId?: number; sessionName?: string; sessionLabel?: string;
  checkinTime?: string; totalAttended?: number;
} | null;

type StatusFilter = "active" | "deleted" | "all";

interface DeleteModal {
  reg: Reg;
  reason: string;
  submitting: boolean;
}

export default function NatConfAdmin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Pure Firebase auth — no dependency on Student Collab accounts
  const [firebaseEmail, setFirebaseEmail] = useState<string | null>(null);
  const [firebaseReady, setFirebaseReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseEmail(fbUser?.email || null);
      setFirebaseReady(true);
    });
    return () => unsub();
  }, []);

  const effectiveEmail = (firebaseEmail || "").toLowerCase();
  const isAdmin = ADMIN_EMAILS.includes(effectiveEmail);

  // Loading = Firebase not ready yet
  const status: "loading" | "unauthenticated" | "authenticated" =
    !firebaseReady ? "loading" :
    !firebaseEmail ? "unauthenticated" :
    "authenticated";

  const [tab, setTab] = useState<"scan" | "list">("scan");
  const [registrations, setRegistrations] = useState<Reg[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [includeDeletedExport, setIncludeDeletedExport] = useState(false);
  const [deleteModal, setDeleteModal] = useState<DeleteModal | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [googleSigningIn, setGoogleSigningIn] = useState(false);

  const scannerRef = useRef<any>(null);
  const lastScanRef = useRef<number>(0);
  const scannerDivId = "qr-reader";

  const adminFetch = useCallback(async (url: string, opts?: RequestInit) => {
    let token = "";
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        token = await currentUser.getIdToken(false);
      }
    } catch {}
    if (!token) token = localStorage.getItem("collab_jwt") || localStorage.getItem("collabAuthToken") || "";
    return fetch(url, { ...opts, headers: { ...(opts?.headers || {}), Authorization: `Bearer ${token}` } });
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    setGoogleSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      toast({ title: "Sign-in failed", description: err?.message || "Try again", variant: "destructive" });
    } finally {
      setGoogleSigningIn(false);
    }
  }, [toast]);

  

  const startScanner = async () => {
    try {
      // Dynamic import — html5-qrcode (~3.3 MB) only loaded when admin clicks "Start Scanner"
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(scannerDivId);
      scannerRef.current = scanner;
      setScanState("scanning");
      setScanResult(null);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 12, qrbox: { width: 260, height: 260 } },
        async (decoded) => {
          await scanner.stop();
          scannerRef.current = null;
          handleQrScanned(decoded);
        },
        () => {}
      );
    } catch {
      setScanState("error");
      setErrorMsg("Could not access camera. Check permissions.");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setScanState("idle");
  };

  const handleQrScanned = async (raw: string) => {
    const now = Date.now();
    if (now - lastScanRef.current < 2000) return;
    lastScanRef.current = now;

    setScanState("checking");
    try {
      const res = await adminFetch("/api/conf/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: raw }),
      });
      const data = await res.json();

      if (res.status === 410) { setScanState("expired"); setErrorMsg(data.error); return; }
      if (res.status === 401) { setScanState("tampered"); setErrorMsg(data.error); return; }
      if (res.status === 409) {
        setScanState("outdated");
        setErrorMsg(data.message || data.error);
        return;
      }
      if (res.status === 403) { setScanState("error"); setErrorMsg(data.error || "User not valid"); return; }
      if (!res.ok) { setScanState("error"); setErrorMsg(data.error || "Check-in failed"); return; }

      setScanResult(data);
      setScanState(data.alreadyAttended ? "already" : "success");
      if (!data.alreadyAttended) fetchList();
    } catch {
      setScanState("error");
      setErrorMsg("Network error. Try again.");
    }
  };

  const fetchList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await adminFetch("/api/conf/registrations");
      const data = await res.json();
      if (res.ok) setRegistrations(data.data || []);
    } catch {
      toast({ title: "Error fetching list", variant: "destructive" });
    } finally {
      setListLoading(false);
    }
  }, [adminFetch, toast]);

  useEffect(() => {
    if (tab === "list" && registrations.length === 0) fetchList();
  }, [tab]);

  const handleExport = async () => {
    const url = `/api/conf/export${includeDeletedExport ? "?includeDeleted=true" : ""}`;
    const res = await adminFetch(url);
    if (!res.ok) { toast({ title: "Export failed", variant: "destructive" }); return; }
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = includeDeletedExport ? "NCADT2026_Attendance_All.csv" : "NCADT2026_Attendance.csv";
    a.click();
    URL.revokeObjectURL(objUrl);
  };

  const [backfilling, setBackfilling] = useState(false);
  const handleBackfill = async () => {
    if (!window.confirm("Create/update ncadt_users profiles for all existing registrants? This is safe to run multiple times.")) return;
    setBackfilling(true);
    try {
      const res = await adminFetch("/api/conf/backfill-profiles", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Backfill complete!", description: `Created: ${data.created} · Updated: ${data.updated} · Total: ${data.total}` });
    } catch (e: any) {
      toast({ title: "Backfill failed", description: e.message, variant: "destructive" });
    } finally {
      setBackfilling(false);
    }
  };

  const [syncingCollab, setSyncingCollab] = useState(false);
  const handleSyncCollab = async () => {
    if (!window.confirm("Create Student Collab profiles for all active NCADT registrants who don't already have one? Existing profiles are never overwritten.")) return;
    setSyncingCollab(true);
    try {
      const res = await adminFetch("/api/conf/sync-collab-profiles", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({
        title: "Collab sync done!",
        description: `New profiles created: ${data.created} · Skipped (already in Collab): ${data.skipped} · Email-linked: ${data.emailLinked} · Total registrants: ${data.total}`,
      });
    } catch (e: any) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    } finally {
      setSyncingCollab(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal) return;
    setDeleteModal(prev => prev ? { ...prev, submitting: true } : null);
    try {
      const res = await adminFetch("/api/conf/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deleteModal.reg.id, reason: deleteModal.reason }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Delete failed", description: data.error, variant: "destructive" }); return; }
      toast({ title: "Registration deleted", description: data.message });
      setDeleteModal(null);
      // Update local state immediately
      setRegistrations(prev => prev.map(r =>
        r.id === deleteModal.reg.id
          ? { ...r, isDeleted: true, deletedAt: data.deletedAt, deletedBy: user?.email || "", deleteReason: deleteModal.reason || null }
          : r
      ));
    } catch {
      toast({ title: "Delete failed", description: "Network error", variant: "destructive" });
    } finally {
      setDeleteModal(prev => prev ? { ...prev, submitting: false } : null);
    }
  };

  const handleRestore = async (reg: Reg) => {
    setRestoring(reg.id);
    try {
      const res = await adminFetch("/api/conf/restore-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: reg.id }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Restore failed", description: data.error, variant: "destructive" }); return; }
      toast({ title: "Registration restored", description: data.message });
      setRegistrations(prev => prev.map(r =>
        r.id === reg.id ? { ...r, isDeleted: false, deletedAt: null, deletedBy: null, deleteReason: null } : r
      ));
    } catch {
      toast({ title: "Restore failed", description: "Network error", variant: "destructive" });
    } finally {
      setRestoring(null);
    }
  };

  // Stats — active users only for accuracy
  const activeRegs = registrations.filter(r => !r.isDeleted);
  const deletedRegs = registrations.filter(r => r.isDeleted);
  const sessionStats = SESSION_META.map(s => ({
    ...s,
    count: activeRegs.filter(r => r.sessions?.[String(s.id)]?.status === "attended").length,
  }));

  const colleges = [...new Set(activeRegs.map(r => r.college).filter(Boolean))].sort();
  const departments = [...new Set(activeRegs.map(r => r.department).filter(Boolean))].sort();

  const displayRegs = registrations.filter(r => {
    if (statusFilter === "active" && r.isDeleted) return false;
    if (statusFilter === "deleted" && !r.isDeleted) return false;
    const q = tableSearch.toLowerCase();
    const matchQ = !q || r.name.toLowerCase().includes(q) || r.urn.toLowerCase().includes(q) || r.college?.toLowerCase().includes(q);
    const matchCollege = !collegeFilter || r.college === collegeFilter;
    const matchDept = !deptFilter || r.department === deptFilter;
    return matchQ && matchCollege && matchDept;
  });

  if (status === "loading") return (
    <div className="min-h-screen flex items-center justify-center bg-[#060d1f]">
      <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
    </div>
  );

  if (status === "unauthenticated") return (
    <div className="min-h-screen flex items-center justify-center bg-[#060d1f] p-4">
      <div className="w-full max-w-sm rounded-2xl p-8 text-center space-y-6"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)" }}>
          <Shield className="h-8 w-8 text-cyan-400" />
        </div>
        <div>
          <p className="text-white font-bold text-lg">NCADT 2026 Admin</p>
          <p className="text-blue-300 text-sm mt-1">Sign in with your authorised Google account to access the admin panel.</p>
        </div>
        <Button onClick={handleGoogleSignIn} disabled={googleSigningIn}
          className="w-full h-12 rounded-xl font-semibold text-white"
          style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)" }}>
          {googleSigningIn ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <LogIn className="h-5 w-5 mr-2" />}
          Sign in with Google
        </Button>
        <button onClick={() => setLocation("/")} className="text-blue-400 text-xs hover:underline">← Back to home</button>
      </div>
    </div>
  );

  if (!isAdmin) return (
    <div className="min-h-screen flex items-center justify-center bg-[#060d1f] p-4">
      <div className="w-full max-w-sm rounded-2xl p-8 text-center space-y-5"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(239,68,68,0.3)" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <XCircle className="h-8 w-8 text-red-400" />
        </div>
        <div>
          <p className="text-white font-bold text-lg">Access Denied</p>
          <p className="text-gray-400 text-sm mt-1">This Google account is not authorised for NCADT admin access.</p>
          <p className="text-red-300 text-xs mt-2 font-mono break-all">{effectiveEmail}</p>
        </div>
        <p className="text-gray-500 text-xs">If this is a mistake, contact the platform administrator.</p>
        <div className="flex flex-col gap-2">
          <Button onClick={handleGoogleSignIn} disabled={googleSigningIn} variant="outline"
            className="w-full h-10 rounded-xl text-sm border-blue-500/40 text-blue-300">
            {googleSigningIn ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
            Switch Google Account
          </Button>
          <button onClick={() => setLocation("/")} className="text-blue-400 text-xs hover:underline">← Back to home</button>
        </div>
      </div>
    </div>
  );

  const bgCard = "rgba(255,255,255,0.04)";
  const borderCard = "rgba(255,255,255,0.09)";

  return (
    <div className="min-h-screen pb-10" style={{ background: "linear-gradient(135deg,#060d1f 0%,#0c1f4a 50%,#0a1535 100%)" }}>

      {/* ─── Delete Confirmation Modal ──────────────────────────────── */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-5 space-y-4"
            style={{ background: "#0f1f45", border: "1px solid rgba(239,68,68,0.35)" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(239,68,68,0.15)" }}>
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Delete Registration</p>
                <p className="text-red-300 text-xs">This is a soft delete — data is preserved for audit.</p>
              </div>
            </div>

            <div className="rounded-xl p-3 space-y-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-white font-semibold text-sm">{deleteModal.reg.name}</p>
              <p className="text-cyan-300 text-xs">URN: {deleteModal.reg.urn}</p>
              <p className="text-blue-300 text-xs">{deleteModal.reg.college}</p>
            </div>

            {/* Attendance warning */}
            {deleteModal.reg.totalAttended > 0 && (
              <div className="rounded-xl p-3 flex items-start gap-2"
                style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)" }}>
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-amber-300 text-xs">
                  This user has <strong>{deleteModal.reg.totalAttended} attendance record{deleteModal.reg.totalAttended > 1 ? "s" : ""}</strong>. They will be excluded from active reports but data is retained for audit.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-slate-400 text-xs font-medium">Reason for deletion (optional)</label>
              <Input
                value={deleteModal.reason}
                onChange={e => setDeleteModal(prev => prev ? { ...prev, reason: e.target.value } : null)}
                placeholder="e.g. Duplicate registration, Invalid URN…"
                className="h-9 text-sm rounded-xl"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={() => setDeleteModal(null)} variant="outline" disabled={deleteModal.submitting}
                className="flex-1 h-10 rounded-xl border-white/20 text-blue-200 hover:bg-white/10 text-sm">
                Cancel
              </Button>
              <Button onClick={handleDeleteConfirm} disabled={deleteModal.submitting}
                className="flex-1 h-10 rounded-xl text-sm font-semibold"
                style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff" }}>
                {deleteModal.submitting
                  ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Deleting…</>
                  : <><Trash2 className="h-3.5 w-3.5 mr-1.5" />Confirm Delete</>
                }
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-white/10"
        style={{ background: "rgba(6,13,31,0.97)", backdropFilter: "blur(12px)" }}>
        <button onClick={() => setLocation("/nat-conf-2026")} className="p-2 rounded-xl hover:bg-white/10">
          <ArrowLeft className="h-5 w-5 text-blue-300" />
        </button>
        <div>
          <p className="text-xs text-cyan-400 font-semibold tracking-widest uppercase">NCADT 2026</p>
          <h1 className="text-white font-bold text-base">Attendance Admin</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Shield className="h-5 w-5 text-violet-400" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10" style={{ background: "rgba(6,13,31,0.8)" }}>
        {([
          { key: "scan", label: "QR Scanner", icon: <QrCode className="h-3.5 w-3.5" /> },
          { key: "list", label: "Registrations", icon: <Users className="h-3.5 w-3.5" /> },
        ] as const).map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); if (t.key === "scan" && scanState === "scanning") stopScanner(); }}
            className="flex items-center gap-1.5 px-5 py-3 text-sm font-semibold relative transition-all"
            style={{ color: tab === t.key ? "#67e8f9" : "#7c6fc4" }}>
            {t.icon}{t.label}
            {tab === t.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-cyan-400" />}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* ── SCANNER TAB ── */}
        {tab === "scan" && (
          <>
            {/* Session stats strip */}
            <div className="grid grid-cols-5 gap-1.5">
              {sessionStats.map(s => (
                <div key={s.id} className="rounded-xl p-2 text-center" style={{ background: bgCard, border: `1px solid ${borderCard}` }}>
                  <p className="text-white font-extrabold text-lg leading-tight">{s.count}</p>
                  <p className="font-bold text-[10px]" style={{ color: s.color }}>{s.name}</p>
                </div>
              ))}
            </div>

            {/* QR Viewport */}
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(56,189,248,0.25)" }}>
              <div id={scannerDivId} className="w-full" style={{ minHeight: 280, background: "#000" }} />
              {scanState !== "scanning" && (
                <div className="flex items-center justify-center py-12"
                  style={{ background: "rgba(0,0,0,0.9)", marginTop: scanState === "idle" ? "-280px" : 0, position: scanState === "idle" ? "relative" : "static" }}>
                  <div className="text-center">
                    <Camera className="h-14 w-14 mx-auto mb-3 text-cyan-400 opacity-60" />
                    <p className="text-blue-300 text-sm">{scanState === "idle" ? "Tap below to start camera" : ""}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex gap-3">
              {scanState !== "scanning"
                ? <Button onClick={startScanner} className="flex-1 h-11 font-semibold rounded-xl"
                    style={{ background: "linear-gradient(135deg,#06b6d4,#3b82f6)", color: "#fff" }}>
                    <Camera className="h-4 w-4 mr-2" /> Start QR Scanner
                  </Button>
                : <Button onClick={stopScanner} variant="outline"
                    className="flex-1 h-11 font-semibold rounded-xl border-red-400/40 text-red-300 hover:bg-red-500/10">
                    <CameraOff className="h-4 w-4 mr-2" /> Stop Scanner
                  </Button>
              }
            </div>

            {/* Scan Result */}
            {scanState !== "idle" && scanState !== "scanning" && (
              <div className="rounded-2xl p-5 text-center"
                style={{
                  background: scanState === "success" ? "rgba(34,197,94,0.12)" : scanState === "already" ? "rgba(56,189,248,0.1)" : "rgba(239,68,68,0.1)",
                  border: `1px solid ${scanState === "success" ? "rgba(34,197,94,0.4)" : scanState === "already" ? "rgba(56,189,248,0.35)" : "rgba(239,68,68,0.4)"}`,
                }}>
                {scanState === "checking" && <><Loader2 className="h-8 w-8 animate-spin text-cyan-400 mx-auto mb-2" /><p className="text-blue-200">Validating QR…</p></>}

                {scanState === "success" && scanResult && (
                  <>
                    <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-2" />
                    <p className="text-2xl font-extrabold text-green-300 mb-1">✅ Attendance Marked!</p>
                    <p className="text-xs font-semibold mb-3 px-3 py-1 rounded-full inline-block"
                      style={{ background: "rgba(56,189,248,0.15)", color: "#67e8f9" }}>
                      {scanResult.sessionName}
                    </p>
                    <div className="text-left rounded-xl p-4 space-y-1.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(34,197,94,0.2)" }}>
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-green-400 shrink-0" />
                        <span className="text-white font-bold text-base">{scanResult.name}</span>
                      </div>
                      <p className="text-green-200 text-sm ml-6">URN: <span className="font-semibold text-white">{scanResult.urn}</span></p>
                      {scanResult.college && <p className="text-green-200 text-sm ml-6">🏫 {scanResult.college}</p>}
                      {scanResult.department && <p className="text-green-200 text-sm ml-6">📚 {scanResult.department}</p>}
                      {(scanResult.degree || scanResult.year) && (
                        <p className="text-green-200 text-sm ml-6">🎓 {[scanResult.degree, scanResult.year].filter(Boolean).join(" · ")}</p>
                      )}
                      {scanResult.phone && <p className="text-green-200 text-sm ml-6">📞 {scanResult.phone}</p>}
                      <div className="pt-1.5 border-t border-white/10 flex items-center justify-between">
                        <p className="text-green-300 text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {scanResult.checkinTime ? new Date(scanResult.checkinTime).toLocaleString("en-IN") : "just now"}
                        </p>
                        <p className="text-cyan-300 text-xs font-semibold">{scanResult.totalAttended}/5 sessions</p>
                      </div>
                    </div>
                  </>
                )}

                {scanState === "already" && scanResult && (
                  <>
                    <CheckCircle2 className="h-10 w-10 text-cyan-400 mx-auto mb-2" />
                    <p className="text-xl font-extrabold text-cyan-300 mb-1">Already Attended</p>
                    <p className="text-cyan-200 text-sm mb-3">{scanResult.sessionName}</p>
                    <div className="text-left rounded-xl p-3 space-y-1" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <p className="text-white font-bold">{scanResult.name}</p>
                      <p className="text-cyan-200 text-sm">URN: {scanResult.urn}</p>
                      {scanResult.checkinTime && (
                        <p className="text-cyan-300 text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" />Originally attended: {new Date(scanResult.checkinTime).toLocaleString("en-IN")}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {(scanState === "expired" || scanState === "outdated" || scanState === "tampered" || scanState === "error") && (
                  <>
                    {scanState === "tampered"
                      ? <Shield className="h-10 w-10 text-red-400 mx-auto mb-2" />
                      : scanState === "expired"
                      ? <Clock className="h-10 w-10 text-orange-400 mx-auto mb-2" />
                      : <AlertTriangle className="h-10 w-10 text-orange-400 mx-auto mb-2" />
                    }
                    <p className="text-xl font-bold text-red-300 mb-1">
                      {scanState === "expired" ? "QR Expired" :
                       scanState === "tampered" ? "⚠️ Tampered QR!" :
                       scanState === "outdated" ? "QR Outdated" : "Error"}
                    </p>
                    <p className="text-orange-200 text-sm">{errorMsg}</p>
                  </>
                )}

                <Button onClick={() => { setScanState("idle"); setScanResult(null); }} variant="outline"
                  className="mt-4 border-white/20 text-blue-200 hover:bg-white/10 rounded-xl">
                  Scan Another
                </Button>
              </div>
            )}
          </>
        )}

        {/* ── LIST TAB ── */}
        {tab === "list" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl p-3 text-center" style={{ background: bgCard, border: `1px solid ${borderCard}` }}>
                <p className="text-white font-extrabold text-2xl">{activeRegs.length}</p>
                <p className="text-blue-300 text-[11px] mt-0.5">Active</p>
              </div>
              <div className="rounded-2xl p-3 text-center" style={{ background: bgCard, border: `1px solid ${borderCard}` }}>
                <p className="text-green-300 font-extrabold text-2xl">{activeRegs.filter(r => r.totalAttended > 0).length}</p>
                <p className="text-blue-300 text-[11px] mt-0.5">Attended ≥1</p>
              </div>
              <div className="rounded-2xl p-3 text-center" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <p className="text-red-400 font-extrabold text-2xl">{deletedRegs.length}</p>
                <p className="text-red-300/70 text-[11px] mt-0.5">Deleted</p>
              </div>
            </div>

            {/* Per-session counts */}
            <div className="rounded-2xl p-4" style={{ background: bgCard, border: `1px solid ${borderCard}` }}>
              <p className="text-white font-bold text-sm mb-3">Attendance Per Session <span className="text-slate-500 text-xs font-normal">(active users only)</span></p>
              <div className="space-y-2">
                {sessionStats.map(s => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="text-xs font-bold w-6" style={{ color: s.color }}>{s.name}</span>
                    <div className="flex-1 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div className="h-2 rounded-full transition-all" style={{ width: activeRegs.length ? `${(s.count / activeRegs.length) * 100}%` : "0%", background: s.color }} />
                    </div>
                    <span className="text-xs text-white font-semibold w-8 text-right">{s.count}</span>
                    <span className="text-xs text-slate-400 w-10 text-right">{activeRegs.length ? Math.round((s.count / activeRegs.length) * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status filter tabs */}
            <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
              {(["active", "deleted", "all"] as StatusFilter[]).map(sf => (
                <button key={sf} onClick={() => setStatusFilter(sf)}
                  className="flex-1 py-2 text-xs font-semibold capitalize transition-all"
                  style={{
                    background: statusFilter === sf ? (sf === "deleted" ? "rgba(239,68,68,0.2)" : "rgba(56,189,248,0.15)") : "rgba(255,255,255,0.03)",
                    color: statusFilter === sf ? (sf === "deleted" ? "#f87171" : "#67e8f9") : "#64748b",
                    borderRight: sf !== "all" ? "1px solid rgba(255,255,255,0.08)" : "none",
                  }}>
                  {sf === "active" ? `Active (${activeRegs.length})` : sf === "deleted" ? `Deleted (${deletedRegs.length})` : `All (${registrations.length})`}
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" />
                <Input value={tableSearch} onChange={e => setTableSearch(e.target.value)}
                  placeholder="Search name, URN, college…"
                  className="pl-9 h-10 text-sm rounded-xl"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }} />
              </div>
              {statusFilter !== "deleted" && (
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-400" />
                    <select value={collegeFilter} onChange={e => setCollegeFilter(e.target.value)}
                      className="w-full pl-8 pr-2 h-9 text-xs rounded-xl appearance-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#94a3b8" }}>
                      <option value="">All Colleges</option>
                      {colleges.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 relative">
                    <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-400" />
                    <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                      className="w-full pl-8 pr-2 h-9 text-xs rounded-xl appearance-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#94a3b8" }}>
                      <option value="">All Depts</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <div className="flex gap-3">
                <Button onClick={fetchList} variant="outline" disabled={listLoading}
                  className="h-9 px-4 rounded-xl border-white/20 text-blue-200 hover:bg-white/10 text-sm">
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${listLoading ? "animate-spin" : ""}`} /> Refresh
                </Button>
                <Button onClick={handleBackfill} disabled={backfilling} variant="outline"
                  className="h-9 px-3 rounded-xl border-violet-500/40 text-violet-300 hover:bg-violet-500/10 text-sm shrink-0">
                  {backfilling ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Backfilling…</> : <><UserCheck className="h-3.5 w-3.5 mr-1.5" />Sync Profiles</>}
                </Button>
                <Button onClick={handleSyncCollab} disabled={syncingCollab} variant="outline"
                  className="h-9 px-3 rounded-xl border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 text-sm shrink-0"
                  title="Create Student Collab profiles for all NCADT registrants who don't already have one">
                  {syncingCollab ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Syncing…</> : <><Users className="h-3.5 w-3.5 mr-1.5" />Sync to Collab</>}
                </Button>
                <Button onClick={handleExport}
                  className="flex-1 h-9 rounded-xl font-semibold text-sm"
                  style={{ background: "linear-gradient(135deg,#06b6d4,#3b82f6)", color: "#fff" }}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Export Excel
                </Button>
              </div>

              {/* Export toggle */}
              <button onClick={() => setIncludeDeletedExport(p => !p)}
                className="flex items-center gap-2 text-xs rounded-xl px-3 py-2 w-full transition-all"
                style={{
                  background: includeDeletedExport ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${includeDeletedExport ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"}`,
                  color: includeDeletedExport ? "#fca5a5" : "#64748b",
                }}>
                {includeDeletedExport ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {includeDeletedExport ? "Excel will include deleted users (with Status column)" : "Excel excludes deleted users — click to include them"}
              </button>
            </div>

            {/* Table */}
            {listLoading ? (
              <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin text-cyan-400 mx-auto" /></div>
            ) : displayRegs.length === 0 ? (
              <div className="text-center py-10 text-blue-300 text-sm">
                {statusFilter === "deleted" ? "No deleted registrations" : "No registrations found"}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-blue-400 text-xs">
                  Showing {displayRegs.length} of {registrations.length}
                  {statusFilter !== "all" && <span className="text-slate-500"> ({statusFilter} only)</span>}
                </p>
                {displayRegs.map(reg => (
                  <div key={reg.id} className="rounded-2xl p-4"
                    style={{
                      background: reg.isDeleted ? "rgba(239,68,68,0.05)" : bgCard,
                      border: `1px solid ${reg.isDeleted ? "rgba(239,68,68,0.25)" : borderCard}`,
                      opacity: reg.isDeleted ? 0.8 : 1,
                    }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-bold text-sm truncate">{reg.name}</p>
                          {reg.isDeleted && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                              style={{ background: "rgba(239,68,68,0.2)", color: "#f87171" }}>
                              DELETED
                            </span>
                          )}
                        </div>
                        <p className="text-cyan-300 text-xs">URN: {reg.urn}</p>
                        <p className="text-blue-300 text-xs truncate">{reg.college} · {reg.department}</p>
                        {reg.isDeleted && reg.deletedAt && (
                          <p className="text-red-400/70 text-[10px] mt-0.5">
                            Deleted {new Date(reg.deletedAt).toLocaleDateString("en-IN")}
                            {reg.deleteReason ? ` · "${reg.deleteReason}"` : ""}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {!reg.isDeleted ? (
                          <>
                            <p className="text-white font-bold text-lg leading-tight">{reg.totalAttended}<span className="text-slate-500 text-sm">/5</span></p>
                            <p className="text-xs text-slate-400">sessions</p>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {/* Session dots — only for active users */}
                    {!reg.isDeleted && (
                      <div className="flex gap-1.5 flex-wrap mt-2">
                        {SESSION_META.map(s => {
                          const sd = reg.sessions?.[String(s.id)];
                          const attended = sd?.status === "attended";
                          return (
                            <div key={s.id} title={s.fullName + (attended ? " ✓" : "")}
                              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                              style={{
                                background: attended ? `${s.color}25` : "rgba(255,255,255,0.05)",
                                color: attended ? s.color : "#334155",
                                border: `1px solid ${attended ? `${s.color}60` : "rgba(255,255,255,0.07)"}`,
                              }}>
                              {s.name} {attended ? "✓" : ""}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                      {!reg.isDeleted ? (
                        <button
                          onClick={() => setDeleteModal({ reg, reason: "", submitting: false })}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
                          style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestore(reg)}
                          disabled={restoring === reg.id}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
                          style={{ background: "rgba(34,197,94,0.1)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" }}>
                          {restoring === reg.id
                            ? <><Loader2 className="h-3 w-3 animate-spin" /> Restoring…</>
                            : <><RotateCcw className="h-3 w-3" /> Restore</>
                          }
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
