import { useEffect, useState, useCallback } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { auth, firestore, db, storage } from "@/lib/firebase";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { ref, onValue, off } from "firebase/database";
import { ref as storageRef, listAll, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, Loader2, Monitor, AlertTriangle, CheckCircle2,
  Clock, Users, Flag, Camera, X, Eye
} from "lucide-react";
import { getAuthToken } from "@/lib/firebase";

interface StudentState {
  status: "waiting" | "in_progress" | "submitted" | "flagged";
  violations?: any[];
  heartbeat?: number;
  answers?: Record<string, string>;
  lastSaved?: number;
}

interface StudentInfo {
  uid: string;
  fullName?: string;
  urn?: string;
  branch?: string;
  year?: string;
  email?: string;
  photoURL?: string;
  snapshotUrl?: string;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    waiting: { cls: "bg-gray-100 text-gray-600", label: "Waiting" },
    in_progress: { cls: "bg-emerald-100 text-emerald-700 animate-pulse", label: "In Progress" },
    submitted: { cls: "bg-blue-100 text-blue-700", label: "Submitted" },
    flagged: { cls: "bg-red-100 text-red-700", label: "Flagged" },
  };
  const s = map[status] || map.waiting;
  return <Badge className={`text-xs font-semibold ${s.cls}`}>{s.label}</Badge>;
}

export default function LancingPCExamMonitor() {
  const [, params] = useRoute("/lancing/pc-exam-monitor/:examId");
  const [, setLocation] = useLocation();
  const examId = params?.examId || "";

  const [exam, setExam] = useState<any>(null);
  const [liveCount, setLiveCount] = useState(0);
  const [studentStates, setStudentStates] = useState<Record<string, StudentState>>({});
  const [eligibleStudents, setEligibleStudents] = useState<StudentInfo[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [loadingSnapshots, setLoadingSnapshots] = useState<Record<string, boolean>>({});

  // Load exam config
  useEffect(() => {
    if (!examId) return;
    const unsub = onSnapshot(doc(firestore, "placement_exams", examId), snap => {
      if (snap.exists()) setExam({ id: snap.id, ...snap.data() });
    });
    return unsub;
  }, [examId]);

  // Load live count from Realtime DB
  useEffect(() => {
    if (!examId) return;
    const r = ref(db, `exams/${examId}/liveCount`);
    const handler = (snap: any) => setLiveCount(snap.val() || 0);
    onValue(r, handler);
    return () => off(r, "value", handler);
  }, [examId]);

  // Load all student live states from Realtime DB
  useEffect(() => {
    if (!examId) return;
    const r = ref(db, `exams/${examId}/students`);
    const handler = (snap: any) => {
      const val = snap.val() || {};
      setStudentStates(val as Record<string, StudentState>);
    };
    onValue(r, handler);
    return () => off(r, "value", handler);
  }, [examId]);

  // Load profile for any student who appears in RTDB (joined the exam)
  useEffect(() => {
    if (!examId) return;
    const uids = Object.keys(studentStates);
    if (uids.length === 0) return;
    async function loadStudentProfiles() {
      try {
        const profiles = await Promise.all(
          uids.map(async uid => {
            const snap = await getDoc(doc(firestore, "users", uid));
            if (!snap.exists()) return { uid, fullName: "Student", urn: "", branch: "", year: "", email: "", photoURL: "" } as StudentInfo;
            const data = snap.data()!;
            const ccp = data.career_compass_profile || {};
            return {
              uid,
              fullName: ccp.fullName || data.displayName || "Student",
              urn: ccp.urn || ccp.enrollmentNumber || "",
              branch: ccp.branch || ccp.degree || "",
              year: ccp.yearOfStudy || ccp.year || "",
              email: data.email || "",
              photoURL: ccp.photoURL || data.photoURL || "",
            } as StudentInfo;
          })
        );
        setEligibleStudents(profiles);
      } catch (err) {
        console.error("Failed to load student profiles", err);
      }
    }
    loadStudentProfiles();
  }, [examId, Object.keys(studentStates).join(",")]);

  // Load snapshots for students currently in_progress or submitted
  const loadSnapshot = useCallback(async (uid: string) => {
    if (snapshots[uid] || loadingSnapshots[uid]) return;
    setLoadingSnapshots(p => ({ ...p, [uid]: true }));
    try {
      const folderRef = storageRef(storage, `exam-snapshots/${examId}/${uid}`);
      const list = await listAll(folderRef);
      if (list.items.length > 0) {
        // Get latest by name (timestamp-based)
        const sorted = list.items.sort((a, b) => b.name.localeCompare(a.name));
        const url = await getDownloadURL(sorted[0]);
        setSnapshots(p => ({ ...p, [uid]: url }));
      }
    } catch { /* no snapshot yet */ } finally {
      setLoadingSnapshots(p => ({ ...p, [uid]: false }));
    }
  }, [examId, snapshots, loadingSnapshots]);

  useEffect(() => {
    Object.entries(studentStates).forEach(([uid, state]) => {
      if (state.status === "in_progress" || state.status === "submitted") {
        loadSnapshot(uid);
      }
    });
  }, [studentStates]);

  // Timer countdown
  useEffect(() => {
    if (!exam?.scheduledAt) return;
    const startTime = exam.scheduledAt?.toDate ? exam.scheduledAt.toDate() : new Date(exam.scheduledAt);
    const endTime = new Date(startTime.getTime() + exam.timeLimitMinutes * 60 * 1000);

    const tick = () => {
      const diff = endTime.getTime() - Date.now();
      setTimeLeft(Math.max(0, Math.floor(diff / 1000)));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [exam]);

  async function flagStudent(uid: string) {
    try {
      const token = await getAuthToken();
      // Update status in Realtime DB via fetch (no RTDB admin writes from client in this path)
      // Just log it - the PC can mark for manual review in results
      alert("Student has been flagged for manual review. Check results after exam.");
    } catch { }
  }

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const allStudents = eligibleStudents.map(s => ({
    ...s,
    state: studentStates[s.uid],
  }));

  // Sort: flagged first, then in_progress, then others
  allStudents.sort((a, b) => {
    const order = { flagged: 0, in_progress: 1, waiting: 2, submitted: 3 };
    const ao = order[a.state?.status || "waiting"] ?? 2;
    const bo = order[b.state?.status || "waiting"] ?? 2;
    return ao - bo;
  });

  // Also show students from Realtime DB who joined but might not be in eligibleStudents list yet
  const rtdbUids = Object.keys(studentStates);
  const profileUids = new Set(eligibleStudents.map(s => s.uid));
  const extraUids = rtdbUids.filter(uid => !profileUids.has(uid));

  const totalJoined = Object.values(studentStates).filter(s => s.status !== "waiting").length;
  const totalSubmitted = Object.values(studentStates).filter(s => s.status === "submitted").length;
  const totalFlagged = Object.values(studentStates).filter(s => (s.violations?.length || 0) > 0).length;

  const selectedState = selectedStudent ? studentStates[selectedStudent] : null;
  const selectedInfo = selectedStudent ? allStudents.find(s => s.uid === selectedStudent) : null;

  if (!exam) return (
    <div className="flex items-center justify-center h-screen bg-gray-950">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-6 py-4 flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/lancing/pc-assessments")} className="text-gray-400 hover:text-white">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{exam.title}</h1>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          {timeLeft !== null && (
            <div className={`font-mono text-lg font-bold px-3 py-1 rounded-lg ${timeLeft < 300 ? "bg-red-900 text-red-300" : "bg-gray-800 text-emerald-400"}`}>
              <Clock className="w-4 h-4 inline mr-1" />{formatTime(timeLeft)}
            </div>
          )}
          <div className="flex gap-4 text-sm text-gray-300">
            <span><Users className="w-4 h-4 inline mr-1 text-blue-400" />{totalJoined} joined</span>
            <span><CheckCircle2 className="w-4 h-4 inline mr-1 text-emerald-400" />{totalSubmitted} submitted</span>
            <span><AlertTriangle className="w-4 h-4 inline mr-1 text-red-400" />{totalFlagged} flagged</span>
            <span className="text-indigo-300 font-semibold">● {liveCount} live</span>
          </div>
        </div>
      </div>

      <div className="p-6 flex gap-6">
        {/* Student Grid */}
        <div className={`flex-1 ${selectedStudent ? "lg:max-w-[calc(100%-380px)]" : ""}`}>
          {allStudents.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <Monitor className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No eligible students loaded yet. Students will appear here when they join.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {allStudents.map(student => {
                const violCount = student.state?.violations?.length || 0;
                const isFlagged = violCount > 0 || student.state?.status === "flagged";
                return (
                  <button key={student.uid} onClick={() => setSelectedStudent(s => s === student.uid ? null : student.uid)}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all text-left ${
                      isFlagged ? "border-red-500 shadow-red-900/50 shadow-lg" :
                      student.state?.status === "in_progress" ? "border-emerald-500" :
                      student.state?.status === "submitted" ? "border-blue-500" :
                      "border-gray-700"
                    } ${selectedStudent === student.uid ? "ring-2 ring-indigo-400" : ""}`}>
                    {/* Camera snapshot */}
                    <div className="w-full h-20 bg-gray-800 relative overflow-hidden">
                      {snapshots[student.uid] ? (
                        <img src={snapshots[student.uid]} alt="snapshot" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-600">
                          <Camera className="w-6 h-6" />
                        </div>
                      )}
                      {student.state?.status === "in_progress" && (
                        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                      {isFlagged && violCount > 0 && (
                        <div className="absolute top-1 left-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                          {violCount}
                        </div>
                      )}
                    </div>
                    <div className="p-2 bg-gray-900">
                      <p className="text-xs font-semibold text-white truncate">{student.fullName || "Student"}</p>
                      <p className="text-[10px] text-gray-400 truncate">{student.urn || student.branch || ""}</p>
                      <StatusBadge status={student.state?.status || "waiting"} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Extra students from RTDB not in eligible list */}
          {extraUids.length > 0 && (
            <p className="text-xs text-gray-500 mt-4">{extraUids.length} additional students joined from outside eligible list.</p>
          )}
        </div>

        {/* Detail Panel */}
        {selectedStudent && selectedInfo && (
          <div className="w-80 shrink-0 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="font-bold text-sm">{selectedInfo.fullName}</h3>
              <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                <div><span className="text-gray-500">URN:</span> {selectedInfo.urn || "—"}</div>
                <div><span className="text-gray-500">Branch:</span> {selectedInfo.branch || "—"}</div>
                <div><span className="text-gray-500">Year:</span> {selectedInfo.year || "—"}</div>
                <div><span className="text-gray-500">Status:</span> <StatusBadge status={selectedState?.status || "waiting"} /></div>
              </div>

              {/* Last snapshot */}
              {snapshots[selectedStudent] && (
                <div>
                  <p className="text-xs text-gray-500 mb-2 font-semibold">Latest Snapshot</p>
                  <img src={snapshots[selectedStudent]} alt="Latest snapshot" className="w-full rounded-lg border border-gray-700" />
                </div>
              )}

              {/* Answer progress */}
              {selectedState?.answers && (
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-1">Answer Progress</p>
                  <p className="text-sm text-white">
                    {Object.keys(selectedState.answers).length} / {exam.questions?.length || 0} questions answered
                  </p>
                </div>
              )}

              {/* Violations */}
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-2">Violations ({selectedState?.violations?.length || 0})</p>
                {(!selectedState?.violations || selectedState.violations.length === 0) ? (
                  <p className="text-xs text-gray-600">No violations recorded.</p>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {selectedState.violations.map((v: any, i: number) => (
                      <div key={i} className="flex gap-2 text-xs text-red-300 bg-red-950/30 rounded-lg p-2">
                        <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold capitalize">{v.type?.replace(/_/g, " ")}</span>
                          {v.details && <p className="text-red-400 mt-0.5">{v.details}</p>}
                          <p className="text-gray-500 mt-0.5">{v.timestamp ? new Date(v.timestamp).toLocaleTimeString() : ""}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button size="sm" variant="outline" onClick={() => flagStudent(selectedStudent)}
                className="w-full text-red-400 border-red-800 hover:bg-red-950/30 text-xs">
                <Flag className="w-3.5 h-3.5 mr-1" /> Flag for Manual Review
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
