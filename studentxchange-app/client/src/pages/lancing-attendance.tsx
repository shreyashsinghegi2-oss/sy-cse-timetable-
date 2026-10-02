import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import { auth, firestore } from "@/lib/firebase";
import { doc, getDoc, collection, onSnapshot, query, orderBy } from "firebase/firestore";
import QRCode from "qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, CalendarCheck, Download, QrCode, CheckCircle2, TrendingUp, CalendarDays, CalendarRange } from "lucide-react";
import SEOHead from "@/components/seo/seo-head";
import { useToast } from "@/hooks/use-toast";
import { displayInstitutionName } from "@/lib/institution-display";

function toLocalDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getTodayDisplay() {
  return new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function getMonStart() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = (day === 0 ? -6 : 1 - day);
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return toLocalDateStr(mon);
}

function getMonthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function LancingAttendancePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useLancingAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [loading, setLoading] = useState(true);
  const [ccProfile, setCcProfile] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [today] = useState(toLocalDateStr(new Date()));

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { setLocation("/lancing/login"); return; }
    if (user) void loadProfile();
  }, [authLoading, isAuthenticated, user]);

  const loadProfile = async () => {
    try {
      const userDoc = await getDoc(doc(firestore, "users", user!.uid));
      const data = userDoc.data();
      setCcProfile(data?.career_compass_profile || {});
    } catch {}
    setLoading(false);
  };

  // Real-time attendance records
  useEffect(() => {
    if (!user) return;
    const q = query(collection(firestore, "attendance", user.uid, "records"), orderBy("date", "desc"));
    const unsub = onSnapshot(q, snap => {
      const recs: any[] = [];
      snap.forEach(d => recs.push({ id: d.id, ...d.data() }));
      setRecords(recs);
    });
    return () => unsub();
  }, [user]);

  // Render QR code to canvas when profile is ready
  useEffect(() => {
    if (!user || !canvasRef.current) return;
    const payload = JSON.stringify({
      uid: user.uid,
      date: today,
      name: ccProfile?.fullName || ccProfile?.name || user.email || "",
      university: ccProfile?.universityName || ccProfile?.university || "",
    });
    QRCode.toCanvas(canvasRef.current, payload, {
      width: 240,
      margin: 2,
      color: { dark: "#1e293b", light: "#ffffff" },
    });
  }, [user, ccProfile, today]);

  const downloadQR = async () => {
    if (!user || !canvasRef.current) return;
    const payload = JSON.stringify({
      uid: user.uid,
      date: today,
      name: ccProfile?.fullName || user.email || "",
      university: ccProfile?.universityName || ccProfile?.university || "",
    });
    try {
      const url = await QRCode.toDataURL(payload, { width: 400, margin: 2 });
      const a = document.createElement("a");
      a.href = url;
      a.download = `Attendance_QR_${(ccProfile?.fullName || "Student").replace(/\s+/g, "_")}_${today}.png`;
      a.click();
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  // Stats
  const totalPresent = records.filter(r => r.status === "present").length;
  const monStart = getMonStart();
  const monthStart = getMonthStart();
  const thisWeekCount = records.filter(r => r.status === "present" && r.date >= monStart && r.date <= today).length;
  const thisMonthCount = records.filter(r => r.status === "present" && r.date >= monthStart).length;
  const joiningDate = records.length > 0 ? records[records.length - 1].date : today;
  const msPerDay = 86400000;
  const daysSinceJoining = Math.max(1, Math.round((new Date(today).getTime() - new Date(joiningDate).getTime()) / msPerDay) + 1);
  const attendancePct = records.length === 0 ? 0 : Math.round((totalPresent / daysSinceJoining) * 100);

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 py-10 px-4">
      <SEOHead title="My Attendance" description="View your QR code and attendance history" />
      <div className="max-w-2xl mx-auto">

        <Link href="/lancing/freelancer-dashboard">
          <a className="inline-flex items-center text-sm text-indigo-600 mb-5 hover:text-indigo-700 font-medium">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </a>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Attendance</h1>
            <p className="text-xs text-gray-500">{getTodayDisplay()}</p>
          </div>
        </div>

        {/* QR Code Card */}
        <Card className="border-2 border-teal-100 rounded-3xl shadow-lg mb-6">
          <CardContent className="p-6 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-1">
              <QrCode className="w-5 h-5 text-teal-600" />
              <h2 className="text-lg font-bold text-gray-900">Your Attendance QR Code</h2>
            </div>
            <p className="text-sm text-gray-500 mb-1">Show this to your Placement Cell officer to mark attendance</p>
            <p className="text-xs font-semibold text-teal-700 mb-4 bg-teal-50 px-3 py-1 rounded-full">
              Valid for: {getTodayDisplay()}
            </p>

            {/* QR Canvas */}
            <div className="bg-white rounded-2xl p-4 shadow-inner border border-gray-100 mb-4">
              <canvas ref={canvasRef} className="rounded-xl" />
            </div>

            {ccProfile?.fullName && (
              <p className="text-sm font-semibold text-gray-700 mb-1">{ccProfile.fullName}</p>
            )}
            {(ccProfile?.universityName || ccProfile?.university) && (
              <p className="text-xs text-gray-500 mb-4">{displayInstitutionName(ccProfile?.universityName || ccProfile?.university)}</p>
            )}

            <Button
              onClick={downloadQR}
              variant="outline"
              className="rounded-xl border-teal-200 text-teal-700 hover:bg-teal-50"
            >
              <Download className="w-4 h-4 mr-2" /> Download QR
            </Button>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatTile icon={CheckCircle2} color="emerald" label="Total Present" value={totalPresent} />
          <StatTile icon={CalendarDays} color="blue" label="This Month" value={thisMonthCount} />
          <StatTile icon={CalendarRange} color="violet" label="This Week" value={thisWeekCount} />
          <StatTile icon={TrendingUp} color="teal" label="Attendance %" value={`${attendancePct}%`} />
        </div>

        {/* History Table */}
        <Card className="border border-gray-200 rounded-2xl shadow-none">
          <CardContent className="p-5">
            <h3 className="font-bold text-gray-900 mb-4">Attendance History</h3>
            {records.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <CalendarCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm">No attendance records yet.</p>
                <p className="text-xs text-gray-400 mt-1">Show your QR code to your Placement Cell officer to mark attendance.</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-2 pr-4">Date</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-2 pr-4">Day</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-2 pr-4">Status</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-2 pr-4">Marked By</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(r => {
                      const d = new Date(r.date + "T00:00:00");
                      const markedAt = r.markedAt?.toDate ? r.markedAt.toDate() : (r.markedAt ? new Date(r.markedAt) : null);
                      return (
                        <tr key={r.id} className="border-b border-gray-50 last:border-0">
                          <td className="py-2.5 pr-4 font-medium text-gray-800 whitespace-nowrap">{formatDisplayDate(r.date)}</td>
                          <td className="py-2.5 pr-4 text-gray-600">{DAY_NAMES[d.getDay()]}</td>
                          <td className="py-2.5 pr-4">
                            <Badge className={r.status === "present" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                              {r.status === "present" ? "Present" : "Absent"}
                            </Badge>
                          </td>
                          <td className="py-2.5 pr-4 text-gray-600 text-xs">{r.markedByName || "—"}</td>
                          <td className="py-2.5 text-gray-600 text-xs">
                            {markedAt ? markedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, color, label, value }: { icon: any; color: string; label: string; value: any }) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    violet: "bg-violet-50 border-violet-100 text-violet-700",
    teal: "bg-teal-50 border-teal-100 text-teal-700",
  };
  const iconColors: Record<string, string> = {
    emerald: "text-emerald-500", blue: "text-blue-500", violet: "text-violet-500", teal: "text-teal-500",
  };
  return (
    <div className={`rounded-2xl border p-4 ${colors[color]}`}>
      <Icon className={`w-4 h-4 mb-1.5 ${iconColors[color]}`} />
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[11px] font-medium mt-0.5 opacity-80">{label}</p>
    </div>
  );
}
