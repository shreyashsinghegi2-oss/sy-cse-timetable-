import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, CheckCircle, Upload, Loader2, AlertCircle,
  FileImage, Rocket, X, Users, IndianRupee,
  User, ShoppingBag, ArrowRight, MessageCircle
} from "lucide-react";

import { EVENTS_BY_NAME, calcTotal, hasGroupEvent as checkGroupEvent, getGroupEvents, toEventObjects } from "@/lib/hastech-events";
import { useCollabAuth } from "@/hooks/use-collab-auth";

const UPI_ID = "adypu@idfcbank";
const WHATSAPP_LINK = "https://chat.whatsapp.com/BZFrB1UVOlHIODhWj5YoZ1";

/* ── Stored receipt shape ── */
interface StoredReceipt {
  name: string;
  urn: string;
  email: string;
  events: string[];
  amount: number;
  regId: string;
}

function readStoredReceipt(): StoredReceipt | null {
  try {
    const raw = localStorage.getItem("hastech_receipt");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function HastechRegister() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { status: authStatus } = useCollabAuth();

  /* ── State — submitted initialized from localStorage so page reload keeps confirmation ── */
  const [submitted, setSubmitted] = useState<boolean>(() => {
    try { return localStorage.getItem("hastech_registered") === "true"; } catch { return false; }
  });
  const [storedReceipt, setStoredReceipt] = useState<StoredReceipt | null>(readStoredReceipt);
  const [isFetchingReceipt, setIsFetchingReceipt] = useState(false);

  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [registrationId, setRegistrationId] = useState(() => {
    try { return readStoredReceipt()?.regId || ""; } catch { return ""; }
  });

  /* Redirect unauthenticated users to sign-in — but never after submission */
  useEffect(() => {
    if (submitted) return;
    if (authStatus === "unauthenticated") {
      localStorage.setItem("hastech_return_after_login", "/hastech-register");
      toast({ title: "Sign in required", description: "Please sign in to register for #TECH 2026" });
      setLocation("/student-collab");
    }
  }, [authStatus, setLocation, toast, submitted]);

  /* ── Email duplicate-check state ── */
  const [alreadyRegistered, setAlreadyRegistered] = useState<string[]>([]);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const [form, setForm] = useState({
    name: "",
    urn: "",
    college: "",
    department: "",
    course: "",
    year: "",
    email: "",
    phone: "",
    teamName: "",
    teamLeader: "",
    teamSize: "",
    gameChoice: "",
  });

  useEffect(() => {
    /* Never redirect away if already submitted — confirmation must stay visible */
    if (submitted) return;
    const stored = localStorage.getItem("hastech_selected_events");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          /* Normalize legacy names that lack Solo/Group suffix */
          const LEGACY: Record<string, string> = {
            "Tower Titans":   "Tower Titans (Solo)",
            "Gaming Event":   "Gaming Event (Solo)",
          };
          const normalized = parsed.map((n: string) => LEGACY[n] ?? n);
          const withoutClosed = normalized.filter((n: string) => !!EVENTS_BY_NAME[n]);
          const closedRemoved = withoutClosed.filter((n: string) => EVENTS_BY_NAME[n]?.closed);
          const valid = withoutClosed.filter((n: string) => !EVENTS_BY_NAME[n]?.closed);
          if (closedRemoved.length > 0) {
            setTimeout(() => {
              toast({
                title: "Registration Closed",
                description: `"${closedRemoved.join(", ")}" registration is now closed and has been removed from your selection.`,
                variant: "destructive",
              });
            }, 500);
          }
          if (valid.length > 0) {
            localStorage.setItem("hastech_selected_events", JSON.stringify(valid));
            setSelectedEvents(valid);
            return;
          }
        }
      } catch {}
    }
    /* No selected events and not submitted — go back to event selection */
    setLocation("/hastech-2026");
  }, [setLocation, submitted]);


  /* ── Fetch server registration when returning visitor has no local receipt ── */
  useEffect(() => {
    if (!submitted || storedReceipt) return;
    const email = (() => {
      try { return localStorage.getItem("hastech_reg_email") || ""; } catch { return ""; }
    })();
    if (!email) return;
    setIsFetchingReceipt(true);
    fetch(`/api/hastech/my-registration?email=${encodeURIComponent(email)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data || !data.name) return;
        const receipt: StoredReceipt = {
          name: data.name,
          urn: data.urn || "",
          email: data.email || email,
          events: data.events || [],
          amount: data.amount || 0,
          regId: data.regId || "",
        };
        localStorage.setItem("hastech_receipt", JSON.stringify(receipt));
        setStoredReceipt(receipt);
      })
      .catch(err => console.error("[HastechRegister] Failed to fetch receipt:", err))
      .finally(() => setIsFetchingReceipt(false));
  }, [submitted, storedReceipt]);

  const checkExistingRegistration = async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;
    setCheckingEmail(true);
    try {
      const res = await fetch(`/api/hastech/registered-events?email=${encodeURIComponent(trimmed)}`);
      if (!res.ok) return;
      const data = await res.json();
      setAlreadyRegistered(data.registeredEvents || []);
    } catch {
      /* silent */
    } finally {
      setCheckingEmail(false);
    }
  };

  /* Derive new (unregistered) events from current selection */
  const newEvents = selectedEvents.filter(ev => !alreadyRegistered.includes(ev));
  const skippedEvents = selectedEvents.filter(ev => alreadyRegistered.includes(ev));

  const hasGroupEvent = checkGroupEvent(newEvents);
  const totalAmount = calcTotal(newEvents);
  const isGamingEvent = newEvents.some(ev => ev.startsWith("Gaming Event"));

  const set = (field: string, val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  const validateStep1 = () => {
    if (!form.name.trim()) return "Full name is required";
    if (!form.urn.trim()) return "URN is required";
    if (!form.college.trim()) return "College name is required";
    if (!form.department.trim()) return "Department is required";
    if (!form.course.trim()) return "Course is required";
    if (!form.year) return "Year is required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return "Valid email is required";
    if (!/^\d{10}$/.test(form.phone)) return "Phone must be exactly 10 digits";
    if (hasGroupEvent) {
      if (!form.teamName.trim()) return "Team name is required";
      if (!form.teamLeader.trim()) return "Team leader name is required";
      const ts = parseInt(form.teamSize, 10);
      if (!form.teamSize.trim() || isNaN(ts) || ts < 1 || ts > 10) return "Enter a valid number of team members (1–10)";
    }
    if (isGamingEvent && !form.gameChoice) return "Please select your game (BGMI or Valorant)";
    return null;
  };

  const handleStep1Submit = () => {
    if (newEvents.length === 0) {
      toast({
        title: "Already registered",
        description: "You've already registered for all the selected events. Go back and choose different events.",
        variant: "destructive",
      });
      return;
    }
    const err = validateStep1();
    if (err) {
      toast({ title: "Validation error", description: err, variant: "destructive" });
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload a JPG or PNG image", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
      return;
    }

    setScreenshotFile(file);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "hastech-payments");
      const res = await fetch("/api/upload/firebase", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const result = await res.json();
      setScreenshotUrl(result.url);
      toast({ title: "Uploaded!", description: "Screenshot saved successfully" });
    } catch {
      toast({ title: "Upload failed", description: "Please try again", variant: "destructive" });
      setScreenshotFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!screenshotUrl) {
      toast({ title: "Screenshot required", description: "Please upload your payment screenshot first", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/hastech/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          urn: form.urn.trim(),
          college: form.college.trim(),
          department: form.department.trim(),
          course: form.course.trim(),
          year: form.year,
          email: form.email.trim(),
          phone: form.phone.trim(),
          selectedEvents: toEventObjects(newEvents),
          teamName: hasGroupEvent ? form.teamName.trim() : "",
          teamLeader: hasGroupEvent ? form.teamLeader.trim() : "",
          teamSize: hasGroupEvent ? parseInt(form.teamSize, 10) : null,
          gameChoice: isGamingEvent ? form.gameChoice : "",
          totalAmount,
          paymentScreenshotURL: screenshotUrl,
        }),
      });

      if (!res.ok) throw new Error("Server error");

      const data = await res.json();
      const regId = data.id || "";
      setRegistrationId(regId);
      /* Persist receipt so returning visitors immediately see confirmation on reload */
      const receipt: StoredReceipt = {
        name: form.name.trim(),
        urn: form.urn.trim(),
        email: form.email.trim().toLowerCase(),
        events: newEvents,
        amount: totalAmount,
        regId,
      };
      localStorage.removeItem("hastech_selected_events");
      localStorage.setItem("hastech_registered", "true");
      localStorage.setItem("hastech_receipt", JSON.stringify(receipt));
      localStorage.removeItem("hastech_return_after_login");
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Registration error:", err);
      toast({ title: "Submission failed", description: "Please try again", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* Only show auth loading spinner before submission — never block the confirmation page */
  if (!submitted && (authStatus === "loading" || authStatus === "unauthenticated")) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(160deg,#0f0320,#1a0a40,#0d0530)" }}>
        <Loader2 className="h-9 w-9 animate-spin" style={{ color: "#a78bfa" }} />
      </div>
    );
  }

  if (submitted) {
    /* Show spinner while fetching receipt from server for returning visitors */
    if (isFetchingReceipt) {
      return (
        <div className="min-h-screen flex items-center justify-center"
          style={{ background: "linear-gradient(160deg,#0f0320,#1a0a40,#0d0530)" }}>
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-9 w-9 animate-spin" style={{ color: "#a78bfa" }} />
            <p className="text-sm" style={{ color: "#a5b4fc" }}>Loading your registration...</p>
          </div>
        </div>
      );
    }

    /* Resolve display data — use live form state if available, fall back to persisted receipt */
    const displayName  = form.name  || storedReceipt?.name  || "Participant";
    const displayUrn   = form.urn   || storedReceipt?.urn   || "";
    const displayEmail = form.email || storedReceipt?.email || "";
    const regEvents = (() => {
      if (newEvents.length > 0) return newEvents;
      if (selectedEvents.length > 0) return selectedEvents;
      return storedReceipt?.events || [];
    })();
    const regTotal = storedReceipt?.amount ?? calcTotal(regEvents);
    const profilePct = 60;

    return (
      <div className="min-h-screen px-4 py-10"
        style={{ background: "linear-gradient(160deg,#0f0320,#1a0a40,#0d0530)" }}>
        <div className="max-w-sm mx-auto space-y-5">

          {/* Hero banner */}
          <div className="text-center pt-4 pb-2">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl"
              style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)" }}>
              <CheckCircle className="h-9 w-9 text-white" />
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-1">You're Registered!</h2>
            <p className="text-sm" style={{ color: "#a5b4fc" }}>
              Confirmed for #TECH 2026 · ADYPU
            </p>
          </div>

          {/* Receipt card */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(139,92,246,0.35)" }}>
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ background: "rgba(139,92,246,0.12)", borderBottom: "1px solid rgba(139,92,246,0.2)" }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: "#a78bfa" }}>Registration Receipt</p>
                <p className="text-base font-extrabold text-white">{displayName}</p>
                {displayUrn && <p className="text-xs mt-0.5" style={{ color: "#7c6fc4" }}>URN: {displayUrn}</p>}
                {displayEmail && <p className="text-xs mt-0.5" style={{ color: "#7c6fc4" }}>{displayEmail}</p>}
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: "rgba(52,211,153,0.15)", color: "#34d399", border: "1px solid rgba(52,211,153,0.4)" }}>
                <CheckCircle className="h-3.5 w-3.5" /> Confirmed
              </span>
            </div>
            <div className="px-5 pt-4 pb-3">
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#7c6fc4" }}>
                Events Booked ({regEvents.length})
              </p>
              <div className="space-y-1.5">
                {regEvents.map(ev => {
                  const evData = EVENTS_BY_NAME[ev];
                  return (
                    <div key={ev} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-white font-medium truncate">{ev}</span>
                      <span className="text-sm font-bold shrink-0" style={{ color: "#a78bfa" }}>₹{evData?.price ?? 0}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="px-5 py-3 flex items-center justify-between"
              style={{ borderTop: "1px solid rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.07)" }}>
              <span className="text-sm font-bold" style={{ color: "#a5b4fc" }}>Amount Paid</span>
              <span className="text-xl font-extrabold" style={{ color: "#c4b5fd" }}>₹{regTotal.toLocaleString("en-IN")}</span>
            </div>
            {(form.email || form.phone) && (
              <div className="px-5 py-3 space-y-1" style={{ borderTop: "1px solid rgba(139,92,246,0.15)" }}>
                {form.email && <p className="text-xs" style={{ color: "#7c6fc4" }}><span style={{ color: "#a5b4fc" }}>Email:</span> {form.email}</p>}
                {form.phone && <p className="text-xs" style={{ color: "#7c6fc4" }}><span style={{ color: "#a5b4fc" }}>Phone:</span> {form.phone}</p>}
              </div>
            )}
            <div className="px-5 py-3 flex items-start gap-2"
              style={{ background: "rgba(251,146,60,0.06)", borderTop: "1px solid rgba(251,146,60,0.15)" }}>
              <FileImage className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#fb923c" }} />
              <p className="text-xs leading-relaxed" style={{ color: "#fb923c" }}>
                Screenshot this receipt. Show it at event check-in.
              </p>
            </div>
          </div>

          {/* ── WhatsApp CTA ─────────────────────────────────────── */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "linear-gradient(135deg,rgba(37,211,102,0.15),rgba(18,140,67,0.12))", border: "2px solid rgba(37,211,102,0.45)" }}>
            <div className="px-5 py-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(37,211,102,0.2)", border: "1px solid rgba(37,211,102,0.4)" }}>
                  <MessageCircle className="h-6 w-6" style={{ color: "#25d366" }} />
                </div>
                <div>
                  <p className="text-base font-extrabold text-white leading-tight">Join our WhatsApp Community</p>
                  <p className="text-xs mt-0.5" style={{ color: "#86efac" }}>Updates, schedule & event coordination</p>
                </div>
              </div>
              <p className="text-sm mb-2 leading-relaxed" style={{ color: "#d1fae5" }}>
                This is the community for all the events. Get the latest updates, event schedules and media by joining it!
              </p>
              <p className="text-sm mb-4 leading-relaxed font-semibold" style={{ color: "#86efac" }}>
                ALL PARTICIPANTS — Once you have registered for your interested event, you can join the respective group of that event.
              </p>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-base transition-all active:scale-95"
                style={{ background: "#25d366", color: "#fff" }}>
                <MessageCircle className="h-5 w-5" />
                Join WhatsApp Community
              </a>
              <p className="text-center text-xs mt-2.5" style={{ color: "#6ee7b7" }}>
                Opens in WhatsApp — free to join
              </p>
            </div>
          </div>

          {/* ── PRIMARY: Complete Your Profile ─────────────────────── */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.18),rgba(37,99,235,0.18))", border: "1px solid rgba(139,92,246,0.45)" }}>
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)" }}>
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: "#a78bfa" }}>Action Required</p>
                  <h3 className="text-base font-extrabold text-white">Complete Your Student Profile</h3>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold" style={{ color: "#c4b5fd" }}>Profile Completion</span>
                  <span className="text-sm font-extrabold" style={{ color: "#a78bfa" }}>{profilePct}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-2.5 rounded-full transition-all duration-700"
                    style={{ width: `${profilePct}%`, background: "linear-gradient(90deg,#7c3aed,#2563eb)" }} />
                </div>
              </div>

              {/* Certificate note */}
              <div className="rounded-xl px-4 py-3 mb-4 flex items-start gap-2.5"
                style={{ background: "rgba(251,191,36,0.09)", border: "1px solid rgba(251,191,36,0.3)" }}>
                <span className="text-lg leading-none mt-0.5">🏅</span>
                <p className="text-sm leading-relaxed" style={{ color: "#fde68a" }}>
                  <span className="font-bold">Complete your profile to get your participation certificate</span> after the event. Fill in your photo, bio, and skills to unlock it.
                </p>
              </div>

              <Button
                className="w-full rounded-xl font-bold text-sm h-10"
                style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)", color: "white", border: "none" }}
                onClick={() => setLocation("/student-collab")}>
                <User className="h-4 w-4 mr-2" />
                Complete Profile Now
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* ── SECONDARY: Marketplace ─────────────────────────────── */}
          <div className="rounded-2xl px-5 py-4 flex items-center gap-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(251,146,60,0.15)", border: "1px solid rgba(251,146,60,0.3)" }}>
              <ShoppingBag className="h-5 w-5" style={{ color: "#fb923c" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white mb-0.5">Explore Student Marketplace</p>
              <p className="text-xs" style={{ color: "#9ca3af" }}>Buy/sell books, notes & items</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 rounded-xl text-xs font-bold px-3 h-8"
              style={{ color: "#fb923c", border: "1px solid rgba(251,146,60,0.3)" }}
              onClick={() => setLocation("/")}>
              Visit
            </Button>
          </div>


          {/* ── Register for other events ─────────────────────────── */}
          <div className="rounded-2xl px-5 py-4"
            style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.25)" }}>
            <p className="text-sm font-semibold text-white mb-1">Want to register for more events?</p>
            <p className="text-xs mb-3" style={{ color: "#a5b4fc" }}>
              Go back to the event list and add more events to your registration.
            </p>
            <Button
              className="w-full rounded-xl font-bold text-sm h-10"
              style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.4)" }}
              onClick={() => {
                localStorage.removeItem("hastech_registered");
                localStorage.removeItem("hastech_receipt");
                localStorage.removeItem("hastech_reg_email");
                setLocation("/hastech-2026");
              }}>
              <ArrowRight className="h-4 w-4 mr-2" />
              Browse All Events
            </Button>
          </div>

          {/* Bottom nav */}
          <div className="pb-6 flex justify-center">
            <button
              onClick={() => setLocation("/hastech-2026")}
              className="text-xs font-medium hover:underline transition-all"
              style={{ color: "#7c6fc4" }}>
              ← Back to #TECH 2026
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: "linear-gradient(160deg,#0f0320,#1a0a40,#0d0530)" }}>
      <style>{`
        .ht-input {
          background: rgba(255,255,255,0.06) !important;
          border: 1px solid rgba(139,92,246,0.25) !important;
          color: white !important;
          border-radius: 12px !important;
        }
        .ht-input::placeholder { color: rgba(165,180,252,0.4) !important; }
        .ht-input:focus { border-color: rgba(139,92,246,0.6) !important; box-shadow: 0 0 0 2px rgba(139,92,246,0.2) !important; }
        .ht-label { color: #c4b5fd; font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; }
        .ht-select-trigger {
          background: rgba(255,255,255,0.06) !important;
          border: 1px solid rgba(139,92,246,0.25) !important;
          color: white !important;
          border-radius: 12px !important;
        }
        .ht-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(139,92,246,0.2);
          border-radius: 16px;
          padding: 16px;
        }
      `}</style>

      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-4"
        style={{ background: "rgba(15,3,32,0.95)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(139,92,246,0.15)" }}>
        <button
          onClick={() => step === 2 ? setStep(1) : setLocation("/hastech-2026")}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10"
          style={{ color: "#a5b4fc" }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-white font-extrabold text-lg leading-tight">#TECH 2026 — Registration</h1>
          <p className="text-xs" style={{ color: "#7c6fc4" }}>
            Step {step} of 2 — {step === 1 ? "Your Details" : "Payment & Submit"}
          </p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-6">

        {/* Progress bar */}
        <div className="flex gap-2 mb-6">
          {[1, 2].map((s) => (
            <div key={s} className="flex-1 h-1.5 rounded-full"
              style={{ background: s <= step ? "linear-gradient(90deg,#7c3aed,#2563eb)" : "rgba(255,255,255,0.08)" }} />
          ))}
        </div>

        {/* ── STEP 1: DETAILS ── */}
        {step === 1 && (
          <div className="space-y-5">
            {/* Selected Events Summary */}
            <div className="ht-card">
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#a5b4fc" }}>
                {skippedEvents.length > 0
                  ? `Registering for (${newEvents.length} of ${selectedEvents.length} selected)`
                  : `Selected Events (${selectedEvents.length})`}
              </p>
              {newEvents.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {newEvents.map((ev) => (
                    <span key={ev}
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: "rgba(139,92,246,0.25)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.4)" }}>
                      {ev}
                    </span>
                  ))}
                </div>
              )}
              {skippedEvents.length > 0 && (
                <div className="mt-2 rounded-xl px-3 py-2.5"
                  style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)" }}>
                  <p className="text-xs font-bold mb-1.5" style={{ color: "#fbbf24" }}>
                    Already registered (will be skipped):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {skippedEvents.map((ev) => (
                      <span key={ev}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium line-through opacity-60"
                        style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}>
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {newEvents.length === 0 && skippedEvents.length > 0 && (
                <div className="rounded-xl px-3 py-2.5 mt-1"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                  <p className="text-xs font-bold" style={{ color: "#f87171" }}>
                    You're already registered for all selected events. Go back and select different events.
                  </p>
                </div>
              )}
            </div>

            {/* Basic Details */}
            <div>
              <h2 className="text-white font-bold text-base mb-4">Basic Details</h2>
              <div className="space-y-4">
                <div>
                  <Label className="ht-label">Full Name *</Label>
                  <Input className="ht-input" placeholder="Enter your full name"
                    value={form.name} onChange={(e) => set("name", e.target.value)} />
                </div>
                <div>
                  <Label className="ht-label">URN *</Label>
                  <Input className="ht-input" placeholder="Enter URN (if not ADYPU student, type 123)"
                    value={form.urn} onChange={(e) => set("urn", e.target.value)} />
                </div>
                <div>
                  <Label className="ht-label">College Name *</Label>
                  <Input className="ht-input" placeholder="e.g., Ajeenkya DY Patil University"
                    value={form.college} onChange={(e) => set("college", e.target.value)} />
                </div>
                <div>
                  <Label className="ht-label">Department *</Label>
                  <Input className="ht-input" placeholder="e.g., Computer Engineering"
                    value={form.department} onChange={(e) => set("department", e.target.value)} />
                </div>
                <div>
                  <Label className="ht-label">Course *</Label>
                  <Input className="ht-input" placeholder="e.g., B.Tech, M.Tech, Diploma"
                    value={form.course} onChange={(e) => set("course", e.target.value)} />
                </div>
                <div>
                  <Label className="ht-label">Year *</Label>
                  <Select value={form.year} onValueChange={(v) => set("year", v)}>
                    <SelectTrigger className="ht-select-trigger">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1st">1st Year</SelectItem>
                      <SelectItem value="2nd">2nd Year</SelectItem>
                      <SelectItem value="3rd">3rd Year</SelectItem>
                      <SelectItem value="4th">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="ht-label">
                    Email *
                    {checkingEmail && <span className="ml-2 text-xs font-normal" style={{ color: "#a78bfa" }}>Checking...</span>}
                  </Label>
                  <Input className="ht-input" type="email" placeholder="your@email.com"
                    value={form.email}
                    onChange={(e) => { set("email", e.target.value); setAlreadyRegistered([]); }}
                    onBlur={(e) => checkExistingRegistration(e.target.value)} />
                </div>
                <div>
                  <Label className="ht-label">Phone Number *</Label>
                  <Input className="ht-input" type="tel" placeholder="10-digit mobile number"
                    maxLength={10} value={form.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))} />
                </div>
              </div>
            </div>

            {/* Game Choice — Gaming Events only */}
            {isGamingEvent && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ fontSize: 16 }}>🎮</span>
                  <h2 className="text-white font-bold text-base">Choose Your Game *</h2>
                </div>
                <p className="text-xs mb-4" style={{ color: "#8b7cc8" }}>
                  Select which game you'll compete in for your gaming event(s).
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {(["BGMI (Battle Royale)", "Valorant (5v5 Tactical Shooter)"] as const).map(game => (
                    <button
                      key={game}
                      type="button"
                      onClick={() => set("gameChoice", game)}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-left"
                      style={form.gameChoice === game
                        ? { borderColor: "#a78bfa", background: "rgba(167,139,250,0.15)", color: "#fff" }
                        : { borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#a5b4fc" }}>
                      <span className="text-2xl">{game.startsWith("BGMI") ? "🔫" : "⚔️"}</span>
                      <span className="text-sm font-semibold text-center leading-tight">{game}</span>
                      {form.gameChoice === game && (
                        <span className="text-xs font-bold" style={{ color: "#a78bfa" }}>✓ Selected</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hasGroupEvent && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-4 w-4" style={{ color: "#a78bfa" }} />
                  <h2 className="text-white font-bold text-base">Team Details</h2>
                </div>
                <p className="text-xs mb-4" style={{ color: "#8b7cc8" }}>
                  Required for group events: {getGroupEvents(selectedEvents).map(e => e.name).join(", ")}
                </p>
                <div className="space-y-4">
                  <div>
                    <Label className="ht-label">Team Name *</Label>
                    <Input className="ht-input" placeholder="Enter your team name"
                      value={form.teamName} onChange={(e) => set("teamName", e.target.value)} />
                  </div>
                  <div>
                    <Label className="ht-label">Team Leader Name *</Label>
                    <Input className="ht-input" placeholder="Name of the team leader"
                      value={form.teamLeader} onChange={(e) => set("teamLeader", e.target.value)} />
                  </div>
                  <div>
                    <Label className="ht-label">Number of Team Members *</Label>
                    <Input
                      className="ht-input"
                      type="number"
                      min={1}
                      max={10}
                      placeholder="e.g., 3"
                      value={form.teamSize}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || (/^\d+$/.test(v) && parseInt(v) <= 10)) set("teamSize", v);
                      }}
                    />
                    <p className="text-xs mt-1" style={{ color: "#8b7cc8" }}>
                      Include yourself — total headcount of your team (max 10)
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: PAYMENT & SUBMIT ── */}
        {step === 2 && (
          <div className="space-y-5">
            {/* Event Summary & Price */}
            <div className="ht-card">
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#a5b4fc" }}>
                Event Summary & Amount
              </p>
              <div className="space-y-2.5 mb-3">
                {selectedEvents.map((evName) => {
                  const cfg = EVENTS_BY_NAME[evName];
                  return (
                    <div key={evName} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm text-white truncate">{evName}</span>
                        {cfg && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full shrink-0"
                            style={cfg.type === "group"
                              ? { background: "rgba(251,146,60,0.15)", color: "#fb923c" }
                              : { background: "rgba(96,165,250,0.15)", color: "#60a5fa" }}>
                            {cfg.type === "group" ? "Group" : "Solo"}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-semibold shrink-0" style={{ color: "#c4b5fd" }}>
                        ₹{cfg?.price ?? 0}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t pt-3 flex items-center justify-between"
                style={{ borderColor: "rgba(139,92,246,0.25)" }}>
                <span className="font-bold text-white">Total Payable Amount</span>
                <span className="font-extrabold text-xl" style={{ color: "#a78bfa" }}>
                  ₹{totalAmount}
                </span>
              </div>
            </div>

            {/* QR Payment Section */}
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(139,92,246,0.35)" }}>
              <div className="px-4 pt-4 pb-3 text-center" style={{ background: "rgba(139,92,246,0.12)" }}>
                <p className="text-sm font-extrabold uppercase tracking-widest" style={{ color: "#a5b4fc" }}>
                  Complete Your Payment
                </p>
              </div>
              <div className="px-4 pb-5 pt-3 flex flex-col items-center gap-4" style={{ background: "rgba(15,3,32,0.6)" }}>
                <p className="text-sm text-center" style={{ color: "#c4b5fd" }}>
                  Scan the QR code below and pay <span className="font-extrabold text-white">₹{totalAmount}</span> to complete your registration.
                </p>

                {/* QR Code Image */}
                <div className="rounded-2xl overflow-hidden shadow-2xl border-2" style={{ borderColor: "rgba(139,92,246,0.5)", maxWidth: 240 }}>
                  <img src="/hastech-qr.jpg" alt="UPI QR Code" className="w-full object-contain" />
                </div>

                {/* UPI ID */}
                <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 w-full justify-center" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
                  <span className="text-xs font-semibold" style={{ color: "#a5b4fc" }}>UPI ID:</span>
                  <span className="text-sm font-bold text-white select-all">{UPI_ID}</span>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard?.writeText(UPI_ID); }}
                    className="text-xs px-2 py-0.5 rounded-md font-semibold transition-opacity hover:opacity-70"
                    style={{ background: "rgba(139,92,246,0.3)", color: "#c4b5fd" }}
                  >
                    Copy
                  </button>
                </div>

                {/* Warning note */}
                <div className="rounded-xl px-4 py-3 w-full" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.35)" }}>
                  <div className="flex gap-2 items-start">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#fbbf24" }} />
                    <div className="space-y-1">
                      <p className="text-xs font-bold" style={{ color: "#fbbf24" }}>⚠️ Use your Name as payment reference while paying</p>
                      <ul className="text-xs space-y-0.5 pl-0.5" style={{ color: "#fde68a" }}>
                        <li>• Pay exactly <strong>₹{totalAmount}</strong> as shown above.</li>
                        <li>• After payment, upload the screenshot below.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Screenshot Upload */}
            <div className="ht-card">
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#a5b4fc" }}>
                Upload Payment Screenshot *
              </p>

              {screenshotUrl ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" style={{ color: "#6ee7b7" }} />
                    <span className="text-sm" style={{ color: "#6ee7b7" }}>Screenshot uploaded</span>
                  </div>
                  <button
                    className="text-xs hover:opacity-70"
                    style={{ color: "#f87171" }}
                    onClick={() => { setScreenshotUrl(""); setScreenshotFile(null); }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-3 py-6 rounded-xl cursor-pointer border-2 border-dashed transition-colors hover:border-violet-500/50"
                  style={{ borderColor: "rgba(139,92,246,0.3)" }}>
                  <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleScreenshotUpload} disabled={isUploading} />
                  {isUploading
                    ? <Loader2 className="h-7 w-7 animate-spin" style={{ color: "#a78bfa" }} />
                    : <FileImage className="h-7 w-7" style={{ color: "#a78bfa" }} />}
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white">{isUploading ? "Uploading…" : "Tap to upload"}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#7c6fc4" }}>JPG or PNG, max 10MB</p>
                  </div>
                </label>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom action bar */}
      <div className="fixed bottom-14 md:bottom-0 left-0 right-0 z-[60] px-4 py-3"
        style={{ background: "rgba(15,3,32,0.97)", backdropFilter: "blur(16px)", borderTop: "1px solid rgba(139,92,246,0.2)" }}>
        <div className="max-w-xl mx-auto space-y-2">
          {step === 2 && !isSubmitting && (
            <p className="text-center text-xs" style={{ color: "#86efac" }}>
              After registering, you'll be redirected to join the official WhatsApp group.
            </p>
          )}
          {step === 1 ? (
            <Button
              size="lg"
              className="w-full font-bold text-base rounded-2xl text-white border-0"
              style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)" }}
              onClick={handleStep1Submit}
            >
              Continue to Payment
              <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
          ) : (
            <Button
              size="lg"
              disabled={isSubmitting || !screenshotUrl}
              className="w-full font-bold text-base rounded-2xl text-white border-0"
              style={{
                background: screenshotUrl ? "linear-gradient(135deg,#7c3aed,#2563eb)" : "rgba(255,255,255,0.08)",
                cursor: screenshotUrl ? "pointer" : "not-allowed",
              }}
              onClick={handleFinalSubmit}
            >
              {isSubmitting
                ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Submitting…</>
                : <><Rocket className="h-5 w-5 mr-2" /> Submit Registration</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
