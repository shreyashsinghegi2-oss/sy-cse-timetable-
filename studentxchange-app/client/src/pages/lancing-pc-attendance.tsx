import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import { auth, firestore } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, onSnapshot, query, where, getDocs } from "firebase/firestore";
import { Html5Qrcode } from "html5-qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, ScanLine, CheckCircle2, XCircle, AlertCircle, Download, Users, RefreshCw, UserCheck } from "lucide-react";
import SEOHead from "@/components/seo/seo-head";
import { useToast } from "@/hooks/use-toast";
import { displayInstitutionName } from "@/lib/institution-display";

function ManualUIDInput({ onUID }: { onUID: (uid: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="flex gap-2 w-full max-w-sm mx-auto">
      <Input
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder="Enter student Firebase UID..."
        className="text-xs h-8"
        onKeyDown={e => { if (e.key === "Enter" && val.trim()) { onUID(val.trim()); setVal(""); } }}
      />
      <Button size="sm" onClick={() => { if (val.trim()) { onUID(val.trim()); setVal(""); } }}
        className="bg-teal-600 hover:bg-teal-700 text-white h-8 px-3 text-xs shrink-0">
        Lookup
      </Button>
    </div>
  );
}

function toLocalDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getTodayDisplay(d = new Date()) {
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

type ScanState = "idle" | "scanning" | "confirming" | "success" | "error" | "already_marked" | "wrong_date";

export default function LancingPCAttendancePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useLancingAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [pcProfile, setPcProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [scanState, setScanState] = useState<ScanState>("idle");
  const [scannedStudent, setScannedStudent] = useState<any>(null);
  const [scanError, setScanError] = useState("");
  const [marking, setMarking] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerMounted = useRef(false);

  const [todayRecords, setTodayRecords] = useState<any[]>([]);
  const [historyDate, setHistoryDate] = useState(toLocalDateStr());
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const today = toLocalDateStr();

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { setLocation("/lancing/login"); return; }
    if (user) void loadPcProfile();
  }, [authLoading, isAuthenticated, user]);

  const loadPcProfile = async () => {
    try {
      const pcSnap = await getDoc(doc(firestore, "placement_cells", user!.uid));
      if (pcSnap.exists()) setPcProfile(pcSnap.data());
    } catch {}
    setLoadingProfile(false);
  };

  // Real-time today list
  useEffect(() => {
    if (!pcProfile?.collegeName) return;
    const q = query(
      collection(firestore, "attendance_today_index"),
      where("date", "==", today),
      where("markedByCollege", "==", pcProfile.collegeName)
    );
    const unsub = onSnapshot(q, snap => {
      const recs: any[] = [];
      snap.forEach(d => recs.push({ id: d.id, ...d.data() }));
      recs.sort((a, b) => {
        const ta = a.markedAt?.toDate ? a.markedAt.toDate() : new Date(a.markedAt || 0);
        const tb = b.markedAt?.toDate ? b.markedAt.toDate() : new Date(b.markedAt || 0);
        return tb.getTime() - ta.getTime();
      });
      setTodayRecords(recs);
    }, () => {});
    return () => unsub();
  }, [pcProfile?.collegeName, today]);

  // ── Camera: start via useEffect AFTER "scanning" state is set and div is in DOM ──
  useEffect(() => {
    if (scanState !== "scanning") return;

    let mounted = true;
    let scanner: Html5Qrcode | null = null;

    const startAsync = async () => {
      // Wait two frames — ensures React has committed the #qr-reader div to the DOM
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (!mounted) return;

      const el = document.getElementById("qr-reader");
      if (!el) {
        setScanState("error");
        setScanError("Camera container not ready. Please try again.");
        return;
      }

      try {
        scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;
        scannerMounted.current = true;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 230, height: 230 }, aspectRatio: 1.0 },
          async (decodedText) => {
            if (!mounted) return;
            try { await scanner?.stop(); } catch {}
            scannerMounted.current = false;
            processQRCode(decodedText);
          },
          () => { /* scan failure per frame — ignore */ }
        );
      } catch (err: any) {
        if (!mounted) return;
        const msg = err?.message || "";
        let friendly = "Failed to start camera scanner.";
        if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("denied")) {
          friendly = "Camera permission denied. Please allow camera access in your browser settings and try again.";
        } else if (msg.toLowerCase().includes("notfound") || msg.toLowerCase().includes("no camera")) {
          friendly = "No camera found on this device.";
        } else if (msg.toLowerCase().includes("already")) {
          friendly = "Camera is already in use by another app. Please close it and try again.";
        }
        setScanState("error");
        setScanError(friendly);
      }
    };

    startAsync();

    return () => {
      mounted = false;
      if (scanner && scannerMounted.current) {
        scanner.stop().catch(() => {});
        scannerMounted.current = false;
      }
      scannerRef.current = null;
    };
  }, [scanState]);

  const handleManualUID = (uid: string) => {
    processQRCode(JSON.stringify({ uid, date: today }));
  };

  const processQRCode = async (text: string) => {
    // Step 1: parse QR payload
    let payload: any;
    try { payload = JSON.parse(text); } catch {
      setScanState("error");
      setScanError("Invalid QR code. This QR was not generated by StudentLancing.");
      return;
    }

    const { uid, date, name, university } = payload;
    if (!uid || !date) {
      setScanState("error");
      setScanError("Invalid QR code format. Ask the student to refresh their attendance page.");
      return;
    }

    if (date !== today) {
      setScanState("wrong_date");
      setScanError(date);
      return;
    }

    // Step 2: check duplicate — isolated try/catch so a permission error doesn't abort the scan
    try {
      const recordRef = doc(firestore, "attendance", uid, "records", today);
      const existing = await getDoc(recordRef);
      if (existing.exists()) {
        setScanState("already_marked");
        setScannedStudent({ uid, name, university, ...existing.data() });
        return;
      }
    } catch {
      // Firestore rules may not yet allow this read — proceed anyway;
      // the server's /api/attendance/mark will return 409 if already marked.
    }

    // Step 3: fetch richer profile from users collection — isolated try/catch
    let ccp: any = {};
    try {
      const userDoc = await getDoc(doc(firestore, "users", uid));
      ccp = (userDoc.data()?.career_compass_profile) || {};
    } catch {
      // Fall back to QR payload data if Firestore read fails
    }

    setScannedStudent({
      uid,
      name: ccp.fullName || name || "Unknown",
      university: ccp.universityName || ccp.university || university || "",
      branch: ccp.branch || ccp.degree || "",
      year: ccp.yearOfStudy || ccp.year || "",
      cgpa: ccp.currentCgpa || ccp.cgpa || "",
      photo: ccp.photoUrl || ccp.profilePhoto || "",
    });
    setScanState("confirming");
  };

  const markPresent = async () => {
    if (!scannedStudent || !user || marking) return;
    setMarking(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          studentUid: scannedStudent.uid,
          date: today,
          studentName: scannedStudent.name,
          studentBranch: scannedStudent.branch,
          studentYear: scannedStudent.year,
          studentUniversity: scannedStudent.university,
        }),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 409) throw new Error(data.error || "Failed");
      if (res.status === 409) { setScanState("already_marked"); setMarking(false); return; }

      await setDoc(doc(firestore, "attendance_today_index", `${today}_${(pcProfile?.collegeName || "unknown").replace(/\s+/g, "_")}_${scannedStudent.uid}`), {
        date: today,
        markedByCollege: pcProfile?.collegeName || "",
        markedByName: pcProfile?.contactName || "",
        markedByUid: user.uid,
        markedAt: new Date(),
        studentUid: scannedStudent.uid,
        studentName: scannedStudent.name,
        studentBranch: scannedStudent.branch,
        studentYear: scannedStudent.year,
        studentUniversity: scannedStudent.university,
        studentPhoto: scannedStudent.photo || "",
        cgpa: scannedStudent.cgpa || "",
      });

      setScanState("success");
      toast({ title: `${scannedStudent.name} marked Present for ${today}.` });
    } catch (err: any) {
      setScanState("error");
      setScanError(err.message || "Failed to mark attendance");
    } finally {
      setMarking(false);
    }
  };

  const resetScanner = () => {
    setScannedStudent(null);
    setScanError("");
    setScanState("idle");
  };

  const loadHistory = async (dateStr: string) => {
    if (!pcProfile?.collegeName) return;
    setLoadingHistory(true);
    try {
      const q = query(
        collection(firestore, "attendance_today_index"),
        where("date", "==", dateStr),
        where("markedByCollege", "==", pcProfile.collegeName)
      );
      const snap = await getDocs(q);
      const recs: any[] = [];
      snap.forEach(d => recs.push({ id: d.id, ...d.data() }));
      recs.sort((a, b) => {
        const ta = a.markedAt?.toDate ? a.markedAt.toDate() : new Date(a.markedAt || 0);
        const tb = b.markedAt?.toDate ? b.markedAt.toDate() : new Date(b.markedAt || 0);
        return tb.getTime() - ta.getTime();
      });
      setHistoryRecords(recs);
    } catch {}
    setLoadingHistory(false);
  };

  useEffect(() => {
    if (historyDate !== today) void loadHistory(historyDate);
  }, [historyDate, pcProfile?.collegeName]);

  const exportCSV = (records: any[], dateStr: string) => {
    const headers = ["Full Name", "Branch", "Year of Study", "University", "CGPA", "Date", "Marked At", "Marked By"];
    const rows = records.map(r => {
      const mt = r.markedAt?.toDate ? r.markedAt.toDate() : (r.markedAt ? new Date(r.markedAt) : null);
      return [r.studentName || "", r.studentBranch || "", r.studentYear || "", r.studentUniversity || "", r.cgpa || "", r.date || "",
        mt ? mt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }) : "", r.markedByName || ""];
    });
    const csv = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Attendance_${(pcProfile?.collegeName || "College").replace(/\s+/g, "_")}_${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading || loadingProfile) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  const displayRecords = historyDate === today ? todayRecords : historyRecords;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 py-10 px-4">
      <SEOHead title="Mark Attendance" description="Scan student QR codes to mark attendance" />
      <div className="max-w-2xl mx-auto">

        <Link href="/lancing/placement-cell-dashboard">
          <a className="inline-flex items-center text-sm text-indigo-600 mb-5 hover:text-indigo-700 font-medium">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </a>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
            <ScanLine className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mark Attendance</h1>
            <p className="text-xs text-gray-500">{getTodayDisplay()} · {pcProfile?.collegeName ? displayInstitutionName(pcProfile.collegeName) : ""}</p>
          </div>
        </div>

        {/* Scanner Card */}
        <Card className="border-2 border-teal-100 rounded-3xl shadow-lg mb-6">
          <CardContent className="p-6">
            <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-teal-600" /> Scan Student QR Code
            </h2>
            <p className="text-xs text-gray-500 mb-4">Point your camera at the student's screen to scan their QR code</p>

            {/* ── Always in DOM — html5-qrcode renders here. Hidden via CSS when not scanning. ── */}
            <div
              id="qr-reader"
              className={`w-full max-w-sm mx-auto rounded-2xl overflow-hidden border border-teal-200 ${scanState === "scanning" ? "block" : "hidden"}`}
            />

            {scanState === "scanning" && (
              <div className="flex flex-col items-center mt-3">
                <p className="text-xs text-gray-500 text-center">Position the QR code within the frame</p>
                <Button
                  variant="outline"
                  onClick={() => setScanState("idle")}
                  className="mt-3 rounded-xl text-sm"
                >
                  <XCircle className="w-4 h-4 mr-1.5" /> Cancel
                </Button>
              </div>
            )}

            {scanState === "idle" && (
              <div className="flex flex-col items-center py-6 gap-4 w-full">
                <div className="w-20 h-20 rounded-2xl bg-teal-50 border-2 border-dashed border-teal-200 flex items-center justify-center">
                  <ScanLine className="w-8 h-8 text-teal-400" />
                </div>
                <p className="text-sm text-gray-500 text-center">Camera is off. Tap to start scanning.</p>
                <Button onClick={() => setScanState("scanning")} className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-6">
                  <ScanLine className="w-4 h-4 mr-2" /> Start Camera Scanner
                </Button>
                <div className="w-full border-t border-gray-100 pt-4">
                  <p className="text-xs text-gray-500 text-center mb-2">or enter student UID manually</p>
                  <ManualUIDInput onUID={handleManualUID} />
                </div>
              </div>
            )}

            {scanState === "confirming" && scannedStudent && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-teal-50 border border-teal-100">
                  {scannedStudent.photo ? (
                    <img src={scannedStudent.photo} alt={scannedStudent.name} className="w-14 h-14 rounded-xl object-cover border-2 border-white shadow" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-teal-200 flex items-center justify-center text-teal-700 text-xl font-bold border-2 border-white shadow">
                      {(scannedStudent.name || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-lg truncate">{scannedStudent.name}</p>
                    <p className="text-xs text-gray-600">{scannedStudent.branch} · {scannedStudent.year}</p>
                    <p className="text-xs text-gray-500 truncate">{scannedStudent.university ? displayInstitutionName(scannedStudent.university) : ""}</p>
                    {scannedStudent.cgpa && <p className="text-xs text-indigo-600 font-medium mt-0.5">CGPA: {scannedStudent.cgpa}</p>}
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center">Mark present for <strong>{getTodayDisplay()}</strong>?</p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={resetScanner} disabled={marking} className="flex-1 rounded-xl">Cancel</Button>
                  <Button onClick={markPresent} disabled={marking} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded-xl">
                    {marking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserCheck className="w-4 h-4 mr-2" />}
                    Mark Present
                  </Button>
                </div>
              </div>
            )}

            {scanState === "success" && scannedStudent && (
              <div className="flex flex-col items-center py-4 space-y-3">
                <CheckCircle2 className="w-14 h-14 text-emerald-500" />
                <p className="font-bold text-emerald-800 text-lg">{scannedStudent.name}</p>
                <p className="text-sm text-emerald-700">Marked Present for {today}</p>
                <Button onClick={resetScanner} className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl mt-2">
                  <ScanLine className="w-4 h-4 mr-2" /> Scan Another Student
                </Button>
              </div>
            )}

            {scanState === "already_marked" && (
              <div className="flex flex-col items-center py-4 space-y-3">
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-blue-500" />
                </div>
                <p className="font-semibold text-blue-800 text-center">{scannedStudent?.name || "This student"} is already marked Present today.</p>
                <Button onClick={resetScanner} variant="outline" className="rounded-xl">
                  <RefreshCw className="w-4 h-4 mr-2" /> Scan Another Student
                </Button>
              </div>
            )}

            {scanState === "wrong_date" && (
              <div className="flex flex-col items-center py-4 space-y-3">
                <AlertCircle className="w-14 h-14 text-amber-500" />
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center text-sm text-amber-800 max-w-sm">
                  <p className="font-bold mb-1">Outdated QR Code</p>
                  <p>This QR code is from <strong>{scanError}</strong>. Only today's QR codes are valid.</p>
                  <p className="text-xs mt-1">Ask the student to refresh their attendance page.</p>
                </div>
                <Button onClick={resetScanner} variant="outline" className="rounded-xl">
                  <RefreshCw className="w-4 h-4 mr-2" /> Scan Again
                </Button>
              </div>
            )}

            {scanState === "error" && (
              <div className="flex flex-col items-center py-4 space-y-3">
                <XCircle className="w-14 h-14 text-red-400" />
                <p className="text-sm text-red-700 text-center max-w-xs">{scanError}</p>
                <Button onClick={resetScanner} variant="outline" className="rounded-xl">
                  <RefreshCw className="w-4 h-4 mr-2" /> Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Records */}
        <Card className="border border-gray-200 rounded-2xl shadow-none">
          <CardContent className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div>
                <h3 className="font-bold text-gray-900">Attendance Records</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {historyDate === today
                    ? `${todayRecords.length} student${todayRecords.length !== 1 ? "s" : ""} marked present today`
                    : `${historyRecords.length} record${historyRecords.length !== 1 ? "s" : ""} for ${historyDate}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Input type="date" value={historyDate} max={today} onChange={e => setHistoryDate(e.target.value)} className="h-8 text-xs rounded-lg w-36" />
                {displayRecords.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => exportCSV(displayRecords, historyDate)} className="rounded-lg h-8 text-xs">
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
                  </Button>
                )}
              </div>
            </div>

            {historyDate !== today && loadingHistory && (
              <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-teal-500" /></div>
            )}

            {!loadingHistory && displayRecords.length === 0 && (
              <div className="text-center py-10 text-gray-500">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm">{historyDate === today ? "No students scanned yet today." : `No attendance records for ${historyDate}.`}</p>
              </div>
            )}

            {!loadingHistory && displayRecords.length > 0 && (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-2 pr-3">Photo</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-2 pr-3">Name</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-2 pr-3">Branch</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-2 pr-3">Year</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayRecords.map(r => {
                      const mt = r.markedAt?.toDate ? r.markedAt.toDate() : (r.markedAt ? new Date(r.markedAt) : null);
                      return (
                        <tr key={r.id} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 pr-3">
                            {r.studentPhoto ? (
                              <img src={r.studentPhoto} alt="" className="w-8 h-8 rounded-lg object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold">
                                {(r.studentName || "?").charAt(0).toUpperCase()}
                              </div>
                            )}
                          </td>
                          <td className="py-2 pr-3 font-medium text-gray-800 text-xs">{r.studentName || "—"}</td>
                          <td className="py-2 pr-3 text-gray-600 text-xs">{r.studentBranch || "—"}</td>
                          <td className="py-2 pr-3 text-gray-600 text-xs">{r.studentYear || "—"}</td>
                          <td className="py-2 text-gray-600 text-xs">
                            {mt ? mt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }) : "—"}
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
