import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useToast } from "@/hooks/use-toast";
import { getAuth } from "firebase/auth";
import app from "@/lib/firebase";
import {
  ArrowLeft, CheckCircle, XCircle, Clock, Eye, Loader2,
  Search, RefreshCw, Shield, Users, IndianRupee, Image as ImageIcon,
  Download, Bot, Phone, Mail, GraduationCap, Hash, Calendar, X,
} from "lucide-react";

import { NETX_ADMIN_EMAILS } from "@/config/constants";
const NETX_ADMINS = NETX_ADMIN_EMAILS;

async function getAuthToken(): Promise<string | null> {
  const auth = getAuth(app);
  if (auth.currentUser) return auth.currentUser.getIdToken(true);
  return new Promise((resolve) => {
    const unsub = auth.onAuthStateChanged((user) => { unsub(); resolve(user ? user.getIdToken(true) : null); });
  });
}

async function adminFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  return fetch(url, { ...opts, headers: { ...(opts.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
}

interface NetxReg {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  college: string;
  educationLevel: string;
  branch: string;
  utrNumber: string;
  paymentScreenshotURL: string;
  paymentStatus: "pending_verification" | "approved" | "rejected";
  amountPaid: number;
  createdAt: any;
}

const STATUS = {
  pending_verification: { label: "Pending",  color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  icon: Clock },
  approved:             { label: "Approved",  color: "#10B981", bg: "rgba(16,185,129,0.12)",  icon: CheckCircle },
  rejected:             { label: "Rejected",  color: "#EF4444", bg: "rgba(239,68,68,0.12)",   icon: XCircle },
};

function fmtDate(ts: any) {
  if (!ts) return "—";
  try {
    const d = ts._seconds ? new Date(ts._seconds * 1000) : ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
}

function exportCSV(rows: NetxReg[]) {
  const headers = ["Name","Email","Phone","College","Education","Branch","UTR","Amount","Status","Date"];
  const lines = rows.map(r => [
    r.fullName, r.email, r.phone, r.college, r.educationLevel, r.branch || "—",
    r.utrNumber, r.amountPaid || 2999, r.paymentStatus, fmtDate(r.createdAt),
  ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(","));
  const csv = [headers.join(","), ...lines].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `netx_registrations_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

export default function NetxAdminPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, status } = useCollabAuth();

  const [regs, setRegs] = useState<NetxReg[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending_verification" | "approved" | "rejected">("all");
  const [actionId, setActionId] = useState<string | null>(null);
  const [previewReg, setPreviewReg] = useState<NetxReg | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const userEmail = user?.email?.toLowerCase() || "";
  const isAdmin = NETX_ADMINS.includes(userEmail);

  const fetchRegs = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await adminFetch("/api/netx/registrations");
      if (!res.ok) throw new Error("Failed");
      setRegs(await res.json());
    } catch { toast({ title: "Failed to load registrations", variant: "destructive" }); }
    finally { setLoading(false); }
  }, [isAdmin, toast]);

  useEffect(() => {
    if (status === "unauthenticated") { setLocation("/student-collab"); return; }
    if (status === "authenticated" && !isAdmin) { setLocation("/student-collab"); return; }
    if (status === "authenticated" && isAdmin) fetchRegs();
  }, [status, isAdmin, fetchRegs, setLocation]);

  const updateStatus = async (id: string, paymentStatus: string) => {
    setActionId(id);
    try {
      const res = await adminFetch(`/api/netx/registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      setRegs((prev) => prev.map((r) => r.id === id ? { ...r, paymentStatus: paymentStatus as any } : r));
      setPreviewReg(null);
      toast({ title: `Registration ${paymentStatus === "approved" ? "approved" : "rejected"}` });
    } catch { toast({ title: "Action failed", variant: "destructive" }); }
    finally { setActionId(null); }
  };

  const deleteReg = async (id: string) => {
    try {
      const res = await adminFetch(`/api/netx/registrations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setRegs((prev) => prev.filter((r) => r.id !== id));
      setDeleteId(null);
      toast({ title: "Registration deleted" });
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const filtered = regs.filter((r) => {
    const matchFilter = filter === "all" || r.paymentStatus === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || r.fullName?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q)
      || r.phone?.includes(q) || r.college?.toLowerCase().includes(q) || r.utrNumber?.includes(q);
    return matchFilter && matchSearch;
  });

  const counts = {
    total: regs.length,
    pending: regs.filter(r => r.paymentStatus === "pending_verification").length,
    approved: regs.filter(r => r.paymentStatus === "approved").length,
    rejected: regs.filter(r => r.paymentStatus === "rejected").length,
    revenue: regs.filter(r => r.paymentStatus === "approved").length * 2999,
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-800" style={{ background: "#F8FAFC", fontFamily: "Inter,ui-sans-serif,system-ui,sans-serif" }}>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <button onClick={() => setLocation("/netx-2026")} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition text-sm font-medium">
            <ArrowLeft className="h-4 w-4" /> Back to NETX
          </button>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#4A90E2,#3B82F6)" }}>
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-slate-900 text-sm">NETX Admin</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Registration Dashboard</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => exportCSV(filtered)} variant="outline" className="h-9 text-xs font-semibold border-slate-200" disabled={filtered.length === 0}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
            </Button>
            <Button onClick={fetchRegs} variant="outline" className="h-9 w-9 p-0 border-slate-200" disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
        {/* Admin badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold mb-6 border border-blue-200">
          <Shield className="h-3.5 w-3.5" /> Logged in as {userEmail}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total",    value: counts.total,   icon: Users,        color: "#4A90E2", bg: "#EFF6FF" },
            { label: "Pending",  value: counts.pending,  icon: Clock,        color: "#F59E0B", bg: "#FFFBEB" },
            { label: "Approved", value: counts.approved, icon: CheckCircle,  color: "#10B981", bg: "#ECFDF5" },
            { label: "Rejected", value: counts.rejected, icon: XCircle,      color: "#EF4444", bg: "#FEF2F2" },
            { label: "Revenue",  value: `₹${counts.revenue.toLocaleString("en-IN")}`, icon: IndianRupee, color: "#8B5CF6", bg: "#F5F3FF" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 shadow-sm">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
                <s.icon className="h-5 w-5" style={{ color: s.color }} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold leading-none mb-1">{s.label}</div>
                <div className="text-xl font-black text-slate-900 leading-none">{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, phone, UTR…"
              className="pl-9 h-10 bg-white border-slate-200" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all","pending_verification","approved","rejected"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`h-10 px-4 rounded-lg text-xs font-bold border transition ${filter === f ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                {f === "all" ? "All" : f === "pending_verification" ? "Pending" : f === "approved" ? "Approved" : "Rejected"}
                <span className="ml-1.5 opacity-75">
                  ({f === "all" ? counts.total : f === "pending_verification" ? counts.pending : f === "approved" ? counts.approved : counts.rejected})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <div className="font-semibold">No registrations found</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const st = STATUS[r.paymentStatus] || STATUS.pending_verification;
              const Icon = st.icon;
              return (
                <div key={r.id} className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-black text-slate-900 text-base truncate">{r.fullName}</h3>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0"
                          style={{ background: st.bg, color: st.color }}>
                          <Icon className="h-3 w-3" /> {st.label}
                        </span>
                      </div>

                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5 text-sm text-slate-600">
                        <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" /> <span className="truncate">{r.email}</span></div>
                        <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {r.phone}</div>
                        <div className="flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {r.educationLevel}{r.branch ? ` · ${r.branch}` : ""}</div>
                        <div className="flex items-center gap-1.5 sm:col-span-2"><Users className="h-3.5 w-3.5 text-slate-400 shrink-0" /> <span className="truncate">{r.college}</span></div>
                        <div className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5 text-slate-400 shrink-0" /> UTR: <span className="font-mono font-semibold text-slate-800">{r.utrNumber}</span></div>
                        <div className="flex items-center gap-1.5"><IndianRupee className="h-3.5 w-3.5 text-slate-400 shrink-0" /> ₹{(r.amountPaid || 2999).toLocaleString("en-IN")}</div>
                        <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {fmtDate(r.createdAt)}</div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col gap-2 shrink-0">
                      <Button onClick={() => setPreviewReg(r)} variant="outline" className="h-9 px-3 text-xs font-semibold border-slate-200 gap-1.5">
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                      {r.paymentStatus === "pending_verification" && (
                        <>
                          <Button onClick={() => updateStatus(r.id, "approved")} disabled={actionId === r.id}
                            className="h-9 px-3 text-xs font-bold text-white gap-1.5 bg-emerald-500 hover:bg-emerald-600">
                            {actionId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />} Approve
                          </Button>
                          <Button onClick={() => updateStatus(r.id, "rejected")} disabled={actionId === r.id}
                            variant="outline" className="h-9 px-3 text-xs font-bold text-red-500 border-red-200 hover:bg-red-50 gap-1.5">
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </Button>
                        </>
                      )}
                      {r.paymentStatus !== "pending_verification" && (
                        <Button onClick={() => updateStatus(r.id, "pending_verification")} disabled={actionId === r.id}
                          variant="outline" className="h-9 px-3 text-xs font-semibold border-slate-200 gap-1.5">
                          <Clock className="h-3.5 w-3.5" /> Reset
                        </Button>
                      )}
                      <Button onClick={() => setDeleteId(r.id)} variant="outline"
                        className="h-9 px-3 text-xs font-semibold border-red-100 text-red-400 hover:bg-red-50 gap-1.5">
                        <X className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Screenshot preview dialog */}
      <Dialog open={!!previewReg} onOpenChange={() => setPreviewReg(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-blue-500" />
              {previewReg?.fullName} — Payment Screenshot
            </DialogTitle>
          </DialogHeader>
          {previewReg && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">UTR</div>
                  <div className="font-mono font-semibold">{previewReg.utrNumber}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Amount</div>
                  <div className="font-semibold">₹{(previewReg.amountPaid || 2999).toLocaleString("en-IN")}</div>
                </div>
              </div>
              {previewReg.paymentScreenshotURL && (
                <img src={previewReg.paymentScreenshotURL} alt="Payment Screenshot"
                  className="w-full max-h-[60vh] object-contain rounded-xl border border-slate-200 bg-slate-50" />
              )}
              {previewReg.paymentStatus === "pending_verification" && (
                <div className="flex gap-3">
                  <Button onClick={() => updateStatus(previewReg.id, "approved")} disabled={actionId === previewReg.id}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold">
                    {actionId === previewReg.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Approve Payment
                  </Button>
                  <Button onClick={() => updateStatus(previewReg.id, "rejected")} disabled={actionId === previewReg.id}
                    variant="outline" className="flex-1 border-red-200 text-red-500 hover:bg-red-50 font-bold">
                    <XCircle className="h-4 w-4 mr-2" /> Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Registration?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">This action cannot be undone. The registration will be permanently removed.</p>
          <div className="flex gap-3 mt-2">
            <Button onClick={() => deleteId && deleteReg(deleteId)} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold">Delete</Button>
            <Button onClick={() => setDeleteId(null)} variant="outline" className="flex-1">Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
