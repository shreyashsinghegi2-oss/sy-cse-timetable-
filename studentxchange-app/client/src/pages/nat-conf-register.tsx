import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, CheckCircle, Rocket, Loader2, QrCode,
  User, Building2, GraduationCap, Clock, RefreshCw, EyeOff,
  Lock, CalendarCheck, Zap, ChevronRight
} from "lucide-react";
// qrcode is dynamically imported inside generateAllQrs — NOT in initial bundle

const LS_USER_ID = "ncadt_userId";
const LS_URN    = "ncadt_urn";
const QR_REFRESH_MS = 25_000;

interface SessionData { status: "locked" | "available" | "attended"; checkinTime: string | null; }
interface UserState {
  userId: string; urn: string; name: string;
  sessions: Record<string, SessionData>; totalAttended: number;
}
interface SessionQr { dataUrl: string; token: string; loading: boolean; }

function istDate(d: string, t: string) { return new Date(`${d}T${t}:00+05:30`).getTime(); }
const GRACE = 15 * 60 * 1000;

const SESSION_META = [
  { id: 1, day: 1, name: "Session 1", shortName: "S1", label: "Inauguration & Keynote",       color: "#06b6d4", timeRange: "09:00 – 10:30",
    start: istDate("2026-03-30", "09:00"), end: istDate("2026-03-30", "10:30") },
  { id: 2, day: 1, name: "Session 2", shortName: "S2", label: "Technical Presentations – I",  color: "#3b82f6", timeRange: "11:00 – 13:00",
    start: istDate("2026-03-30", "11:00"), end: istDate("2026-03-30", "13:00") },
  { id: 3, day: 1, name: "Session 3", shortName: "S3", label: "Technical Presentations – II", color: "#6366f1", timeRange: "14:00 – 16:30",
    start: istDate("2026-03-30", "14:00"), end: istDate("2026-03-30", "16:30") },
  { id: 4, day: 2, name: "Session 4", shortName: "S4", label: "Advanced Research Papers",     color: "#8b5cf6", timeRange: "09:30 – 13:00",
    start: istDate("2026-03-31", "09:30"), end: istDate("2026-03-31", "13:00") },
  { id: 5, day: 2, name: "Session 5", shortName: "S5", label: "Closing Ceremony & Awards",    color: "#ec4899", timeRange: "14:00 – 17:00",
    start: istDate("2026-03-31", "14:00"), end: istDate("2026-03-31", "17:00") },
];

type SessStatus = "attended" | "active" | "upcoming" | "missed";
function getSessStatus(sess: typeof SESSION_META[0], attended: boolean): SessStatus {
  if (attended) return "attended";
  const now = Date.now();
  if (now >= sess.start - GRACE && now <= sess.end + GRACE) return "active";
  if (now < sess.start - GRACE) return "upcoming";
  return "missed";
}

const STATUS_CFG: Record<SessStatus, { label: string; bg: string; border: string; text: string; pulse: boolean }> = {
  attended: { label: "Completed ✓", bg: "rgba(34,197,94,0.15)",  border: "rgba(34,197,94,0.45)",  text: "#4ade80", pulse: false },
  active:   { label: "Scan Now",    bg: "rgba(6,182,212,0.18)",  border: "rgba(6,182,212,0.55)",  text: "#22d3ee", pulse: true  },
  upcoming: { label: "Not Started", bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.2)", text: "#94a3b8", pulse: false },
  missed:   { label: "Closed",      bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.3)",   text: "#f87171", pulse: false },
};

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center gap-2">
        <span className="text-cyan-400">{icon}</span>
        <h3 className="text-white font-bold text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-slate-400 text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}

// Determine which day tab to auto-select
function getInitialDay(): 1 | 2 {
  const now = Date.now();
  const day2Sessions = SESSION_META.filter(s => s.day === 2);
  const day1Over = SESSION_META.filter(s => s.day === 1).every(s => now > s.end + GRACE);
  const day2Active = day2Sessions.some(s => now >= s.start - GRACE && now <= s.end + GRACE);
  const day2Upcoming = day2Sessions.some(s => now < s.start - GRACE);
  if (day1Over || day2Active || (day2Upcoming && now > istDate("2026-03-30", "17:00"))) return 2;
  return 1;
}

export default function NatConfRegister() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"loading" | "form" | "dashboard">("loading");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userState, setUserState] = useState<UserState | null>(null);
  const [activeDay, setActiveDay] = useState<1 | 2>(getInitialDay);

  const [sessionQrs, setSessionQrs] = useState<Record<number, SessionQr>>({});
  const [refreshIn, setRefreshIn] = useState(Math.round(QR_REFRESH_MS / 1000));
  const [tabBlurred, setTabBlurred] = useState(false);
  const isGenerating = useRef(false);
  const userStateRef = useRef<UserState | null>(null);

  const [form, setForm] = useState({ name: "", college: "", department: "", degree: "", year: "", urn: "", phone: "", email: "" });
  const setF = (field: string, val: string) => setForm(prev => ({ ...prev, [field]: val }));

  useEffect(() => { userStateRef.current = userState; }, [userState]);

  useEffect(() => {
    const onVis = () => setTabBlurred(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    const prevent = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", prevent);
    return () => document.removeEventListener("contextmenu", prevent);
  }, []);

  useEffect(() => {
    const uid = localStorage.getItem(LS_USER_ID);
    const savedUrn = localStorage.getItem(LS_URN);
    if (uid && savedUrn) {
      fetch("/api/conf/status", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid, urn: savedUrn }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) { setUserState(data); setStep("dashboard"); }
          else { localStorage.removeItem(LS_USER_ID); localStorage.removeItem(LS_URN); setStep("form"); }
        })
        .catch(() => setStep("form"));
    } else { setStep("form"); }
  }, []);

  const generateAllQrs = useCallback(async (uid: string, urn: string) => {
    if (isGenerating.current) return;
    isGenerating.current = true;

    const u = userStateRef.current;
    const targets = SESSION_META.filter(sess => {
      const attended = u?.sessions?.[String(sess.id)]?.status === "attended";
      if (attended) return false;
      return getSessStatus(sess, false) !== "missed";
    });

    await Promise.all(targets.map(async (sess) => {
      setSessionQrs(prev => ({ ...prev, [sess.id]: { ...prev[sess.id], loading: true, dataUrl: prev[sess.id]?.dataUrl || "", token: prev[sess.id]?.token || "" } }));
      try {
        const res = await fetch("/api/conf/generate-qr", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: uid, urn, sessionId: sess.id }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.error === "already_attended") {
            setUserState(prev => {
              if (!prev) return prev;
              const updated = { ...prev, sessions: { ...prev.sessions, [String(sess.id)]: { status: "attended" as any, checkinTime: data.checkinTime } } };
              const totalAttended = Object.values(updated.sessions).filter((s: any) => s.status === "attended").length;
              return { ...updated, totalAttended };
            });
          }
          setSessionQrs(prev => ({ ...prev, [sess.id]: { ...prev[sess.id], loading: false } }));
          return;
        }
        // Dynamic import — qrcode (~940 KB) only loaded when QR codes need to be generated
        const { default: QRCode } = await import('qrcode');
        const qrUrl = await QRCode.toDataURL(data.token, {
          width: 220, margin: 2, color: { dark: "#000000", light: "#ffffff" }, errorCorrectionLevel: "M",
        });
        setSessionQrs(prev => ({ ...prev, [sess.id]: { dataUrl: qrUrl, token: data.token, loading: false } }));
      } catch {
        setSessionQrs(prev => ({ ...prev, [sess.id]: { ...prev[sess.id], loading: false } }));
      }
    }));

    isGenerating.current = false;
  }, []);

  useEffect(() => {
    if (step !== "dashboard" || !userState) return;
    generateAllQrs(userState.userId, userState.urn);
    const rt = setInterval(() => {
      const u = userStateRef.current;
      if (u) generateAllQrs(u.userId, u.urn);
      setRefreshIn(Math.round(QR_REFRESH_MS / 1000));
    }, QR_REFRESH_MS);
    const ct = setInterval(() => setRefreshIn(prev => Math.max(0, prev - 1)), 1000);
    return () => { clearInterval(rt); clearInterval(ct); };
  }, [step, userState?.userId, generateAllQrs]);

  const validate = () => {
    if (!form.name.trim()) return "Full name is required";
    if (!form.college.trim()) return "College name is required";
    if (!form.department.trim()) return "Department is required";
    if (!form.degree.trim() || form.degree.trim().length < 2) return "Degree must be at least 2 characters";
    if (form.degree.trim().length > 50) return "Degree must be under 50 characters";
    if (!form.year) return "Year is required";
    if (!form.urn.trim()) return "URN is required";
    if (!/^\d{10}$/.test(form.phone)) return "Phone must be exactly 10 digits";
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { toast({ title: "Validation error", description: err, variant: "destructive" }); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/conf/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, email: form.email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      localStorage.setItem(LS_USER_ID, data.userId);
      localStorage.setItem(LS_URN, data.urn);
      setUserState(data);
      setStep("dashboard");
      if (data.existing) toast({ title: "Welcome back!", description: "Your QR dashboard is ready." });
    } catch (e: any) {
      toast({ title: "Registration failed", description: e.message, variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem(LS_USER_ID);
    localStorage.removeItem(LS_URN);
    setUserState(null); setSessionQrs({}); setStep("form");
  };

  if (step === "loading") return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg,#060d1f,#0c1f4a)" }}>
      <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
    </div>
  );

  return (
    <div className="min-h-screen select-none" style={{ background: "linear-gradient(135deg,#060d1f 0%,#0c1f4a 50%,#0a1535 100%)" }}>

      {/* ── Fixed header ── */}
      <div className="sticky top-0 z-20 border-b border-white/10"
        style={{ background: "rgba(6,13,31,0.97)", backdropFilter: "blur(14px)" }}>
        <div className="flex items-center gap-3 px-4 py-2.5">
          <button onClick={() => setLocation("/nat-conf-2026")} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <ArrowLeft className="h-5 w-5 text-blue-300" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-cyan-400 font-bold tracking-widest uppercase leading-tight">NCADT 2026</p>
            <h1 className="text-white font-bold text-sm leading-tight">
              {step === "dashboard" ? "Session QR Codes" : "Attendance Registration"}
            </h1>
          </div>
          {step === "dashboard" && userState && (
            <div className="flex items-center gap-2">
              <span className="text-cyan-300 font-bold text-sm">{userState.totalAttended}<span className="text-slate-500">/5</span></span>
              <button onClick={handleLogout} className="text-xs text-blue-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">
                Switch
              </button>
            </div>
          )}
          {step !== "dashboard" && <Rocket className="h-5 w-5 text-cyan-400 shrink-0" />}
        </div>

        {/* Day tabs — only in dashboard */}
        {step === "dashboard" && userState && (
          <div className="flex border-t border-white/08">
            {([1, 2] as const).map(day => {
              const daySessions = SESSION_META.filter(s => s.day === day);
              const hasActive = daySessions.some(s => getSessStatus(s, userState.sessions?.[String(s.id)]?.status === "attended") === "active");
              const attended = daySessions.filter(s => userState.sessions?.[String(s.id)]?.status === "attended").length;
              const total = daySessions.length;
              return (
                <button key={day} onClick={() => setActiveDay(day)}
                  className="flex-1 py-2.5 flex items-center justify-center gap-2 text-sm font-semibold relative transition-all"
                  style={{ color: activeDay === day ? "#67e8f9" : "#475569" }}>
                  {hasActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  )}
                  Day {day}
                  <span className="text-[10px] font-normal" style={{ color: activeDay === day ? "#22d3ee" : "#334155" }}>
                    {attended}/{total}
                  </span>
                  {activeDay === day && <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-cyan-400" />}
                </button>
              );
            })}
            {/* Refresh countdown */}
            <div className="flex items-center gap-1 px-3 text-[10px] text-slate-500 shrink-0">
              <RefreshCw className="h-2.5 w-2.5" />{refreshIn}s
            </div>
          </div>
        )}
      </div>

      {/* ── FORM ── */}
      {step === "form" && (
        <div className="max-w-lg mx-auto px-4 py-5 pb-28 space-y-4">
          <div className="rounded-2xl p-3.5" style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.25)" }}>
            <div className="flex items-center gap-2 mb-1">
              <QrCode className="h-4 w-4 text-cyan-400" />
              <span className="text-cyan-300 font-semibold text-sm">Register to Access All Session QR Codes</span>
            </div>
            <p className="text-blue-200 text-xs">Register once — QR codes for all 5 sessions appear instantly. Each refreshes every 25 seconds.</p>
          </div>

          <Section icon={<User className="h-4 w-4" />} title="Personal Details">
            <Field label="Full Name *">
              <Input className="conf-input" placeholder="As per college ID" value={form.name} onChange={e => setF("name", e.target.value)} />
            </Field>
            <Field label="Phone Number *">
              <Input className="conf-input" type="tel" maxLength={10} placeholder="10-digit mobile number"
                value={form.phone} onChange={e => setF("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} />
            </Field>
            <Field label="Email (optional — for profile)">
              <Input className="conf-input" type="email" placeholder="your@email.com"
                value={form.email} onChange={e => setF("email", e.target.value)} />
            </Field>
          </Section>

          <Section icon={<GraduationCap className="h-4 w-4" />} title="Academic Details">
            <Field label="URN / Roll Number *">
              <Input className="conf-input" placeholder="e.g. BTME2024001" value={form.urn} onChange={e => setF("urn", e.target.value.toUpperCase())} />
            </Field>
            <Field label="Degree *">
              <Input className="conf-input" placeholder="e.g. B.Tech, M.Tech, PhD" value={form.degree} onChange={e => setF("degree", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Year / Level *">
                <Select value={form.year} onValueChange={v => setF("year", v)}>
                  <SelectTrigger className="conf-input"><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>
                    {["1st Year", "2nd Year", "3rd Year", "4th Year", "Faculty", "Researcher", "Industry"].map(y => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Department *">
                <Input className="conf-input" placeholder="e.g. Space Engg" value={form.department} onChange={e => setF("department", e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section icon={<Building2 className="h-4 w-4" />} title="Institution">
            <Field label="College / University *">
              <Input className="conf-input" placeholder="Full institution name" value={form.college} onChange={e => setF("college", e.target.value)} />
            </Field>
          </Section>

          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full h-12 font-bold text-base rounded-xl"
            style={{ background: "linear-gradient(135deg,#06b6d4,#3b82f6)", color: "#fff" }}>
            {isSubmitting
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Registering…</>
              : <><Rocket className="h-4 w-4 mr-2" />Register & Get QR Dashboard</>}
          </Button>
        </div>
      )}

      {/* ── DASHBOARD ── */}
      {step === "dashboard" && userState && (
        <div className="max-w-lg mx-auto px-3 py-3 pb-24 space-y-2.5">

          {/* User info strip */}
          <div className="rounded-xl px-3 py-2.5 flex items-center gap-3"
            style={{ background: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.18)" }}>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate">{userState.name}</p>
              <p className="text-cyan-300 text-xs">URN: {userState.urn}</p>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
              <Zap className="h-3 w-3 text-amber-400" />
              QRs auto-refresh · screenshots blocked
            </div>
          </div>

          {/* Session cards for active day */}
          {SESSION_META.filter(s => s.day === activeDay).map(sess => {
            const sData = userState.sessions?.[String(sess.id)];
            const attended = sData?.status === "attended";
            const ds = getSessStatus(sess, attended);
            const cfg = STATUS_CFG[ds];
            const qr = sessionQrs[sess.id];

            return (
              <div key={sess.id} className="rounded-2xl overflow-hidden"
                style={{ border: `1px solid ${cfg.border}`, background: ds === "active" ? "rgba(6,182,212,0.06)" : "rgba(255,255,255,0.03)" }}>

                {/* Card header */}
                <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-extrabold tracking-wide" style={{ color: sess.color }}>
                        {sess.shortName.toUpperCase()} · {sess.name}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.pulse ? "animate-pulse" : ""}`}
                        style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm truncate">{sess.label}</p>
                    <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />{sess.timeRange} IST
                    </p>
                    {ds === "attended" && sData?.checkinTime && (
                      <p className="text-green-400 text-xs flex items-center gap-1 mt-1">
                        <CalendarCheck className="h-3 w-3" />
                        Checked in at {new Date(sData.checkinTime).toLocaleTimeString("en-IN")}
                      </p>
                    )}
                  </div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-sm"
                    style={{ background: `${sess.color}18`, color: sess.color, border: `1px solid ${sess.color}35` }}>
                    S{sess.id}
                  </div>
                </div>

                {/* QR / status area */}
                <div className="px-4 pb-4">
                  {ds === "attended" ? (
                    <div className="rounded-xl p-5 flex flex-col items-center gap-2"
                      style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
                      <CheckCircle className="h-10 w-10 text-green-400" />
                      <p className="text-green-300 font-bold text-sm">Attendance Recorded</p>
                    </div>

                  ) : ds === "missed" ? (
                    <div className="rounded-xl p-4 flex items-center gap-3"
                      style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <Lock className="h-7 w-7 text-red-400/60 shrink-0" />
                      <div>
                        <p className="text-red-400 font-semibold text-sm">Session Closed</p>
                        <p className="text-red-400/60 text-xs">Check-in window has passed.</p>
                      </div>
                    </div>

                  ) : tabBlurred ? (
                    <div className="rounded-xl flex flex-col items-center justify-center py-10"
                      style={{ background: "rgba(6,13,31,0.85)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <EyeOff className="h-8 w-8 text-cyan-400 mb-2" />
                      <p className="text-cyan-300 font-semibold text-sm">QR hidden</p>
                      <p className="text-blue-300/60 text-xs">Return to this tab to view</p>
                    </div>

                  ) : qr?.loading && !qr?.dataUrl ? (
                    <div className="rounded-xl flex flex-col items-center justify-center py-10"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-2" />
                      <p className="text-blue-300 text-sm">Generating QR…</p>
                    </div>

                  ) : qr?.dataUrl ? (
                    <div>
                      <div className="relative rounded-xl overflow-hidden mx-auto"
                        style={{ background: "#fff", padding: 10, maxWidth: 280 }}>
                        <img src={qr.dataUrl} alt={`QR ${sess.name}`} className="w-full block rounded-lg" />
                        {/* Watermark */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                          <div className="watermark-drift text-[9px] font-bold whitespace-nowrap select-none"
                            style={{ color: "rgba(6,182,212,0.18)", position: "absolute", top: "50%", left: -20 }}>
                            NCADT2026 · {userState.urn} · {sess.shortName} · NCADT2026 · {userState.urn}
                          </div>
                        </div>
                        {qr.loading && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-xl"
                            style={{ background: "rgba(255,255,255,0.55)" }}>
                            <RefreshCw className="h-6 w-6 animate-spin text-cyan-600" />
                          </div>
                        )}
                      </div>
                      <p className="text-center text-slate-500 text-xs mt-2 flex items-center justify-center gap-1">
                        <Zap className="h-3 w-3 text-amber-400" />
                        {ds === "upcoming" ? "QR ready — valid when session starts" : "Show to admin at session entry"}
                      </p>
                    </div>

                  ) : (
                    <div className="rounded-xl flex flex-col items-center justify-center py-10"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <QrCode className="h-8 w-8 text-slate-700 mb-2" />
                      <p className="text-slate-600 text-sm">QR not yet generated</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* All completed message for this day */}
          {(() => {
            const daySessions = SESSION_META.filter(s => s.day === activeDay);
            const allDone = daySessions.every(s => userState.sessions?.[String(s.id)]?.status === "attended");
            const otherDay = activeDay === 1 ? 2 : 1;
            if (!allDone) return null;
            return (
              <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}>
                <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-1" />
                <p className="text-green-300 font-bold text-sm">All Day {activeDay} sessions completed!</p>
                {userState.totalAttended < 5 && (
                  <button onClick={() => setActiveDay(otherDay)} className="mt-2 text-xs text-cyan-400 flex items-center gap-1 mx-auto hover:text-cyan-300">
                    Switch to Day {otherDay} <ChevronRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })()}

          {/* All 5 completed */}
          {userState.totalAttended >= 5 && (
            <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
              <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-2" />
              <p className="text-green-300 font-extrabold text-base">All 5 Sessions Completed!</p>
              <p className="text-green-200 text-xs mt-1">You have attended the full NCADT 2026 conference. Well done!</p>
            </div>
          )}

          {/* Anti-cheat compact notice */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] text-slate-600"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <span>🔒</span>
            <span>QRs refresh every 25s · Tab-switch hides QR · One scan per session per person</span>
          </div>

        </div>
      )}

      <style>{`
        .conf-input {
          background: rgba(255,255,255,0.06) !important;
          border: 1px solid rgba(255,255,255,0.15) !important;
          color: #fff !important;
          border-radius: 10px !important;
          height: 40px !important;
        }
        .conf-input::placeholder { color: #475569 !important; }
        .conf-input:focus { border-color: rgba(56,189,248,0.5) !important; outline: none !important; box-shadow: 0 0 0 2px rgba(56,189,248,0.15) !important; }
        @keyframes watermark-drift {
          0%   { transform: translateX(0); }
          100% { transform: translateX(80px); }
        }
        .watermark-drift { animation: watermark-drift 7s linear infinite; }
        .border-white\\/08 { border-color: rgba(255,255,255,0.08); }
      `}</style>
    </div>
  );
}
