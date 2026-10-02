import { useEffect, useRef, useState, useCallback, lazy, Suspense } from "react";
import { useRoute, useLocation } from "wouter";
import { auth, firestore, db, storage } from "@/lib/firebase";
const MonacoEditor = lazy(() => import("@monaco-editor/react").then(m => ({ default: m.Editor })));
import { doc, getDoc } from "firebase/firestore";
import { ref as dbRef, set, get, onValue, off } from "firebase/database";
import { ref as storageRef, uploadBytes, listAll, deleteObject, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Camera, AlertTriangle, CheckCircle2, Maximize2,
  ChevronLeft, ChevronRight, Flag, Clock, Send, X
} from "lucide-react";
import { getAuthToken } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

type ViolationType = "tab_switch" | "fullscreen_exit" | "copy_paste_attempt" | "face_not_detected" | "speed_anomaly" | "connection_lost" | "auto_submit_tab_switch" | "auto_submit_fullscreen";

interface Violation { type: ViolationType; timestamp: string; details?: string; }
interface Question {
  id: string; type: "mcq" | "short_answer" | "coding"; questionText: string;
  options?: { A: string; B: string; C: string; D: string };
  correctAnswer?: string; marks: number;
  language?: string; sampleSolution?: string;
  testCases?: { input: string; expectedOutput: string }[];
}
type ExamPhase = "loading" | "setup" | "exam" | "submitted" | "error";
type NavStatus = "not_visited" | "answered" | "marked" | "not_answered";

function langToMonaco(lang: string): string {
  const map: Record<string, string> = {
    "Python": "python", "JavaScript": "javascript", "Java": "java",
    "C++": "cpp", "C": "c", "Go": "go", "TypeScript": "typescript",
  };
  return map[lang] || "python";
}

export default function LancingExamTake() {
  const [, params] = useRoute("/lancing/exam/:examId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const examId = params?.examId || "";

  const user = auth.currentUser;
  const uid = user?.uid || "";

  // Phase
  const [phase, setPhase] = useState<ExamPhase>("loading");
  const [exam, setExam] = useState<any>(null);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [error, setError] = useState("");

  // Setup phase
  const [cameraGranted, setCameraGranted] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [declared, setDeclared] = useState(false);

  // Exam state
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [violations, setViolations] = useState<Violation[]>([]);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [fsExitCount, setFsExitCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [autoSubmitWarning, setAutoSubmitWarning] = useState("");
  const [showWarning, setShowWarning] = useState("");
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [faceCheckFailStreak, setFaceCheckFailStreak] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const snapshotRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const faceCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const violationsRef = useRef<Violation[]>([]);
  const tabCountRef = useRef(0);
  const fsCountRef = useRef(0);
  const answersRef = useRef<Record<string, string>>({});
  const submittedRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { violationsRef.current = violations; }, [violations]);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { tabCountRef.current = tabSwitchCount; }, [tabSwitchCount]);
  useEffect(() => { fsCountRef.current = fsExitCount; }, [fsExitCount]);

  // ─── Load exam + profile ──────────────────────────────────────────────────
  useEffect(() => {
    if (!examId || !uid) return;
    async function load() {
      try {
        const token = await getAuthToken();
        const [examRes, profileSnap] = await Promise.all([
          fetch(`/api/assessments/${examId}`, { headers: { Authorization: `Bearer ${token}` } }),
          getDoc(doc(firestore, "users", uid)),
        ]);
        if (!examRes.ok) { setError("Exam not found or not available yet."); setPhase("error"); return; }
        const examData = await examRes.json();
        const ccp = profileSnap.exists() ? profileSnap.data()?.career_compass_profile : {};
        setExam(examData);
        setStudentProfile({ ...ccp, email: user?.email, photoURL: user?.photoURL });
        setTimeLeft(examData.timeLimitMinutes * 60);

        // Check if already submitted
        const resultSnap = await getDoc(doc(firestore, "placement_exam_results", `${examId}_${uid}`));
        if (resultSnap.exists()) {
          setResult(resultSnap.data());
          setPhase("submitted");
          return;
        }

        // Restore answers from Realtime DB if any
        const savedSnap = await get(dbRef(db, `exams/${examId}/students/${uid}/answers`));
        if (savedSnap.exists()) setAnswers(savedSnap.val() || {});

        setPhase("setup");
      } catch (err: any) {
        setError(err.message || "Failed to load exam");
        setPhase("error");
      }
    }
    load();
  }, [examId, uid]);

  // ─── Camera setup ─────────────────────────────────────────────────────────
  async function requestCamera() {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; }
      setCameraGranted(true);
    } catch {
      setCameraError("Camera access is required to take this exam. Please enable camera in your browser settings.");
    }
  }

  // ─── Start exam ───────────────────────────────────────────────────────────
  async function startExam() {
    if (!cameraGranted || !declared) return;
    // Enter fullscreen
    try { await document.documentElement.requestFullscreen(); } catch { }
    setPhase("exam");
    const now = new Date();
    setStartTime(now);
    // Mark student as in_progress in Realtime DB
    await set(dbRef(db, `exams/${examId}/students/${uid}/status`), "in_progress");
    // Update live count
    const lcRef = dbRef(db, `exams/${examId}/liveCount`);
    const lcSnap = await get(lcRef);
    await set(lcRef, (lcSnap.val() || 0) + 1);
    // Mark first question as visited
    if (exam?.questions?.[0]) {
      setVisited(new Set([exam.questions[0].id]));
    }
  }

  // ─── Log violation ────────────────────────────────────────────────────────
  const logViolation = useCallback(async (type: ViolationType, details?: string) => {
    const v: Violation = { type, timestamp: new Date().toISOString(), details };
    const newViolations = [...violationsRef.current, v];
    setViolations(newViolations);
    // Write to Realtime DB
    try {
      await set(dbRef(db, `exams/${examId}/students/${uid}/violations`), newViolations);
    } catch { }
  }, [examId, uid]);

  // ─── Auto-save answers ────────────────────────────────────────────────────
  const saveAnswers = useCallback(async () => {
    if (!examId || !uid) return;
    try {
      await set(dbRef(db, `exams/${examId}/students/${uid}/answers`), answersRef.current);
      await set(dbRef(db, `exams/${examId}/students/${uid}/lastSaved`), Date.now());
      setSavedIndicator(true);
      setTimeout(() => setSavedIndicator(false), 2000);
    } catch { }
  }, [examId, uid]);

  // ─── Capture camera snapshot ──────────────────────────────────────────────
  const captureSnapshot = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = 320; canvas.height = 240;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, 320, 240);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        const timestamp = Date.now();
        const snapRef = storageRef(storage, `exam-snapshots/${examId}/${uid}/${timestamp}.jpg`);
        await uploadBytes(snapRef, blob, { contentType: "image/jpeg" });
        // Keep only last 10 snapshots
        const folder = storageRef(storage, `exam-snapshots/${examId}/${uid}`);
        const list = await listAll(folder);
        if (list.items.length > 10) {
          const sorted = list.items.sort((a, b) => a.name.localeCompare(b.name));
          const toDelete = sorted.slice(0, list.items.length - 10);
          await Promise.all(toDelete.map(item => deleteObject(item)));
        }
      } catch { }
    }, "image/jpeg", 0.7);
  }, [examId, uid]);

  // ─── Face detection (colour variation) ───────────────────────────────────
  const checkFace = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 160; canvas.height = 120;
    ctx.drawImage(videoRef.current, 0, 0, 160, 120);
    const imgData = ctx.getImageData(0, 0, 160, 120);
    const pixels = imgData.data;
    let uniqueColors = new Set<string>();
    for (let i = 0; i < pixels.length; i += 4 * 16) { // sample every 16th pixel
      uniqueColors.add(`${Math.floor(pixels[i] / 32)},${Math.floor(pixels[i + 1] / 32)},${Math.floor(pixels[i + 2] / 32)}`);
    }
    const variation = uniqueColors.size / (160 * 120 / 16 / 100);
    if (variation < 5) {
      setFaceCheckFailStreak(s => {
        const next = s + 1;
        if (next >= 3) {
          logViolation("face_not_detected", "Camera shows little colour variation");
          setShowWarning("⚠ Your face is not visible on camera. Please ensure you are in frame.");
          return 0;
        }
        return next;
      });
    } else {
      setFaceCheckFailStreak(0);
    }
  }, [logViolation]);

  // ─── Heartbeat ─────────────────────────────────────────────────────────────
  const sendHeartbeat = useCallback(async () => {
    try {
      await set(dbRef(db, `exams/${examId}/students/${uid}/heartbeat`), Date.now());
    } catch { }
  }, [examId, uid]);

  // ─── Start all intervals when phase = exam ────────────────────────────────
  useEffect(() => {
    if (phase !== "exam") return;
    autoSaveRef.current = setInterval(saveAnswers, 30000);
    snapshotRef.current = setInterval(captureSnapshot, 15000);
    faceCheckRef.current = setInterval(checkFace, 10000);
    heartbeatRef.current = setInterval(sendHeartbeat, 30000);
    captureSnapshot(); // immediate first snapshot
    sendHeartbeat();
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
      if (snapshotRef.current) clearInterval(snapshotRef.current);
      if (faceCheckRef.current) clearInterval(faceCheckRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [phase, saveAnswers, captureSnapshot, checkFace, sendHeartbeat]);

  // ─── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "exam") return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(interval);
          if (!submittedRef.current) handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // ─── Anti-cheat: Tab switch & window blur ─────────────────────────────────
  useEffect(() => {
    if (phase !== "exam") return;
    const onVisChange = () => {
      if (document.hidden && !submittedRef.current) {
        const next = tabCountRef.current + 1;
        setTabSwitchCount(next);
        logViolation("tab_switch", `Occurrence ${next}`);
        if (next >= 3) {
          logViolation("auto_submit_tab_switch");
          handleSubmit(true);
        } else {
          setShowWarning("⚠ Warning: You left the exam window. This has been recorded.");
        }
      }
    };
    const onBlur = () => {
      if (!submittedRef.current) {
        const next = tabCountRef.current + 1;
        setTabSwitchCount(next);
        logViolation("tab_switch", `Window blur occurrence ${next}`);
        if (next >= 3) {
          logViolation("auto_submit_tab_switch");
          handleSubmit(true);
        }
      }
    };
    document.addEventListener("visibilitychange", onVisChange);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisChange);
      window.removeEventListener("blur", onBlur);
    };
  }, [phase, logViolation]);

  // ─── Anti-cheat: Fullscreen exit ─────────────────────────────────────────
  useEffect(() => {
    if (phase !== "exam") return;
    const onFsChange = () => {
      if (!document.fullscreenElement && !submittedRef.current) {
        const next = fsCountRef.current + 1;
        setFsExitCount(next);
        logViolation("fullscreen_exit", `Occurrence ${next}`);
        if (next >= 3) {
          logViolation("auto_submit_fullscreen");
          handleSubmit(true);
        } else {
          setShowWarning("⚠ You exited fullscreen. Please return to fullscreen.");
          document.documentElement.requestFullscreen().catch(() => {});
        }
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [phase, logViolation]);

  // ─── Anti-cheat: Copy/paste/right-click ──────────────────────────────────
  useEffect(() => {
    if (phase !== "exam") return;
    const prevent = (e: Event) => {
      e.preventDefault();
      logViolation("copy_paste_attempt", `Event: ${e.type}`);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "x", "a"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        logViolation("copy_paste_attempt", `Ctrl+${e.key.toUpperCase()}`);
      }
    };
    document.addEventListener("contextmenu", prevent);
    document.addEventListener("copy", prevent);
    document.addEventListener("paste", prevent);
    document.addEventListener("cut", prevent);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("contextmenu", prevent);
      document.removeEventListener("copy", prevent);
      document.removeEventListener("paste", prevent);
      document.removeEventListener("cut", prevent);
      document.removeEventListener("keydown", onKey);
    };
  }, [phase, logViolation]);

  // ─── Heartbeat loss detection ─────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "exam") return;
    const hbRef = dbRef(db, `exams/${examId}/students/${uid}/heartbeat`);
    let lastHb = Date.now();
    const handler = (snap: any) => { if (snap.val()) lastHb = snap.val(); };
    onValue(hbRef, handler);
    const checker = setInterval(() => {
      if (Date.now() - lastHb > 90000) {
        logViolation("connection_lost", "Heartbeat not updated for 90 seconds");
        setShowWarning("⚠ Connection unstable. Your answers are saved. Please check your internet.");
      }
    }, 30000);
    return () => { off(hbRef, "value", handler); clearInterval(checker); };
  }, [phase, examId, uid, logViolation]);

  // ─── Submit exam ──────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (isAuto = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setShowSubmitConfirm(false);
    setAutoSubmitted(isAuto);

    // Final save
    await saveAnswers();

    // Calculate time taken
    const timeTakenMinutes = startTime ? Math.round((Date.now() - startTime.getTime()) / 60000) : 0;

    // Exit fullscreen
    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch { }
    }

    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }

    // Stop intervals
    [autoSaveRef, snapshotRef, faceCheckRef, heartbeatRef].forEach(r => {
      if (r.current) clearInterval(r.current);
    });

    // Update Realtime DB status
    await set(dbRef(db, `exams/${examId}/students/${uid}/status`), "submitted");
    const lcRef = dbRef(db, `exams/${examId}/liveCount`);
    const lcSnap = await get(lcRef);
    await set(lcRef, Math.max(0, (lcSnap.val() || 1) - 1));

    // Submit to server
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/assessments/${examId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          answers: answersRef.current,
          violations: violationsRef.current,
          autoSubmitted: isAuto,
          timeTakenMinutes,
          studentProfile,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error("Submit failed", err);
    }
    setSubmitting(false);
    setPhase("submitted");
  }, [examId, uid, saveAnswers, startTime, studentProfile]);

  // ─── Question navigation helpers ──────────────────────────────────────────
  function navTo(idx: number) {
    const q = exam?.questions?.[idx];
    if (!q) return;
    setCurrentQ(idx);
    setVisited(v => new Set([...v, q.id]));
  }

  function getNavStatus(q: Question): NavStatus {
    if (answers[q.id]) return "answered";
    if (marked.has(q.id)) return "marked";
    if (visited.has(q.id)) return "not_answered";
    return "not_visited";
  }

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ─── RENDER: Loading ──────────────────────────────────────────────────────
  if (phase === "loading") return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
        <p className="text-gray-600">Loading exam...</p>
      </div>
    </div>
  );

  if (phase === "error") return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center max-w-md mx-auto p-6">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Cannot load exam</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <Button onClick={() => setLocation("/lancing/my-exams")} variant="outline">← Back to My Exams</Button>
      </div>
    </div>
  );

  // ─── RENDER: Submitted ────────────────────────────────────────────────────
  if (phase === "submitted") return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8 max-w-md w-full text-center">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Exam Submitted!</h2>
        {autoSubmitted && (
          <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3 mb-4">
            Your exam was automatically submitted.
          </p>
        )}
        {result && (
          <div className="space-y-3 mb-6">
            {result.hasPendingReview ? (
              <p className="text-sm text-gray-700">
                Your MCQ score: <strong>{result.score}/{result.totalMarks}</strong>. Short answer responses are pending review by your placement cell.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-2xl font-bold text-indigo-700">{result.score}/{result.totalMarks}</p>
                  <p className="text-xs text-gray-500">Score</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className={`text-2xl font-bold ${result.passed ? "text-emerald-600" : "text-red-500"}`}>{result.percentage}%</p>
                  <p className="text-xs text-gray-500">{result.passed ? "Passed ✓" : "Failed"}</p>
                </div>
              </div>
            )}
            {result.violationsCount > 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
                {result.violationsCount} integrity flag{result.violationsCount > 1 ? "s" : ""} were recorded during your exam.
              </p>
            )}
          </div>
        )}
        <Button onClick={() => setLocation("/lancing/my-exams")} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full rounded-xl">
          Back to My Exams
        </Button>
      </div>
    </div>
  );

  // ─── RENDER: Setup ────────────────────────────────────────────────────────
  if (phase === "setup") return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{exam?.title}</h2>
          <p className="text-sm text-gray-500 mt-1">{exam?.timeLimitMinutes} minutes · {exam?.questions?.length} questions</p>
        </div>

        {exam?.instructions && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
            <p className="font-semibold mb-1">Instructions</p>
            <p className="whitespace-pre-line">{exam.instructions}</p>
          </div>
        )}

        {/* Camera permission */}
        <div className="mb-5">
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${cameraGranted ? "border-emerald-300 bg-emerald-50" : "border-gray-200"}`}>
            <Camera className={`w-6 h-6 ${cameraGranted ? "text-emerald-600" : "text-gray-400"}`} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900">Camera Access</p>
              <p className="text-xs text-gray-500">Required throughout the exam for proctoring</p>
              {cameraError && <p className="text-xs text-red-600 mt-1">{cameraError}</p>}
            </div>
            {cameraGranted
              ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              : <Button size="sm" onClick={requestCamera} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">Allow Camera</Button>
            }
          </div>

          {cameraGranted && (
            <div className="mt-3 rounded-xl overflow-hidden aspect-video bg-gray-900 relative">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <span className="absolute bottom-2 left-2 text-[10px] text-white bg-black/50 rounded px-1.5 py-0.5">Camera preview</span>
            </div>
          )}
        </div>

        {/* System checks */}
        <div className="mb-5 space-y-2">
          {[
            { label: "Camera Active", ok: cameraGranted },
            { label: "Fullscreen Ready", ok: true },
            { label: "Stable Connection", ok: true },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              {item.ok && cameraGranted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : item.label !== "Camera Active" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
              )}
              <span className="text-gray-700">{item.label} {item.ok || item.label !== "Camera Active" ? "✓" : ""}</span>
            </div>
          ))}
        </div>

        {/* Identity confirmation */}
        {studentProfile?.fullName && (
          <div className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm">
            <p className="font-semibold text-gray-700 mb-2">Your Identity (read-only)</p>
            <div className="space-y-1 text-gray-600">
              <p><span className="text-gray-400">Name:</span> {studentProfile.fullName}</p>
              {studentProfile.urn && <p><span className="text-gray-400">URN:</span> {studentProfile.urn}</p>}
              {studentProfile.branch && <p><span className="text-gray-400">Branch:</span> {studentProfile.branch}</p>}
            </div>
          </div>
        )}

        {/* Declaration */}
        <label className="flex items-start gap-3 cursor-pointer mb-6">
          <input type="checkbox" checked={declared} onChange={e => setDeclared(e.target.checked)} className="mt-1" />
          <span className="text-sm text-gray-700">I confirm this is my own work and I will not use any unfair means during this exam.</span>
        </label>

        <Button
          onClick={startExam}
          disabled={!cameraGranted || !declared}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-base h-12 rounded-xl disabled:opacity-40"
        >
          <Maximize2 className="w-5 h-5 mr-2" /> Start Exam (Enters Fullscreen)
        </Button>
        <p className="text-xs text-gray-400 text-center mt-2">Exiting fullscreen or switching tabs will be recorded as a violation.</p>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );

  // ─── RENDER: Exam ─────────────────────────────────────────────────────────
  const questions: Question[] = exam?.questions || [];
  const q = questions[currentQ];
  const answeredCount = Object.keys(answers).filter(k => answers[k]).length;

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden select-none">
      {/* Hidden canvas for snapshots */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Warning Overlay */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <p className="text-lg font-bold text-gray-900 mb-2">Warning</p>
            <p className="text-gray-600 mb-6 text-sm">{showWarning}</p>
            <Button onClick={() => {
              setShowWarning("");
              if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
            }} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full">
              Return to Exam
            </Button>
          </div>
        </div>
      )}

      {/* Submit Confirmation */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
            <Send className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Submit Exam?</h3>
            <p className="text-gray-600 text-sm mb-6">
              You have answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions.
              This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowSubmitConfirm(false)} className="flex-1">Cancel</Button>
              <Button onClick={() => handleSubmit(false)} disabled={submitting}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Submit"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-4 flex-shrink-0">
        <span className="font-bold text-gray-900 text-sm flex-1 truncate">{exam?.title}</span>
        <div className={`font-mono text-lg font-bold px-3 py-1 rounded-lg ${timeLeft < 300 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-800"}`}>
          <Clock className="w-4 h-4 inline mr-1" />{formatTime(timeLeft)}
        </div>
        <span className="text-xs text-gray-500 hidden sm:block">{answeredCount}/{questions.length} answered</span>
        <div className="flex items-center gap-1.5 text-xs">
          <div className={`w-2 h-2 rounded-full ${streamRef.current ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
          <span className="text-gray-500 hidden sm:block">Camera</span>
        </div>
        {savedIndicator && <span className="text-xs text-emerald-600 font-medium hidden sm:block">✓ Saved</span>}
        <Button size="sm" onClick={() => setShowSubmitConfirm(true)} disabled={submitting}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-3">
          <Send className="w-3.5 h-3.5 mr-1" /> Submit
        </Button>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Question panel (75%) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {q && (
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-indigo-100 text-indigo-700 text-xs">Q{currentQ + 1} of {questions.length}</Badge>
                <Badge className={`text-xs ${
                  q.type === "mcq" ? "bg-blue-100 text-blue-700" :
                  q.type === "short_answer" ? "bg-amber-100 text-amber-700" :
                  "bg-purple-100 text-purple-700"
                }`}>
                  {q.type === "mcq" ? "MCQ" : q.type === "short_answer" ? "Short Answer" : `Coding · ${q.language || "Python"}`}
                </Badge>
                <span className="text-xs text-gray-500">{q.marks} mark{q.marks > 1 ? "s" : ""}</span>
                <button onClick={() => {
                  setMarked(m => {
                    const next = new Set(m);
                    next.has(q.id) ? next.delete(q.id) : next.add(q.id);
                    return next;
                  });
                }} className={`ml-auto flex items-center gap-1 text-xs ${marked.has(q.id) ? "text-amber-600" : "text-gray-400"}`}>
                  <Flag className="w-3.5 h-3.5" /> {marked.has(q.id) ? "Marked" : "Mark for Review"}
                </button>
              </div>

              <p className="text-base sm:text-lg font-medium text-gray-900 mb-6 leading-relaxed whitespace-pre-line">{q.questionText}</p>

              {q.type === "mcq" && q.options && (
                <div className="space-y-3">
                  {(["A", "B", "C", "D"] as const).map(opt => (
                    <label key={opt} className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      answers[q.id] === opt ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}>
                      <input type="radio" name={`q-${q.id}`} value={opt} checked={answers[q.id] === opt}
                        onChange={() => {
                          setAnswers(a => ({ ...a, [q.id]: opt }));
                          setVisited(v => new Set([...v, q.id]));
                        }} className="mt-0.5" />
                      <span className="text-sm text-gray-800">
                        <span className="font-bold text-indigo-700 mr-2">{opt}.</span>{q.options![opt]}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === "short_answer" && (
                <div>
                  <textarea
                    value={answers[q.id] || ""}
                    onChange={e => {
                      setAnswers(a => ({ ...a, [q.id]: e.target.value }));
                      setVisited(v => new Set([...v, q.id]));
                    }}
                    placeholder="Type your answer here..."
                    rows={6}
                    className="w-full border-2 border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-indigo-400 resize-none"
                  />
                  <p className="text-xs text-gray-400 text-right mt-1">{(answers[q.id] || "").length} characters</p>
                </div>
              )}

              {q.type === "coding" && (
                <div className="border-2 border-gray-200 rounded-xl overflow-hidden select-text">
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                        {q.language || "Python"}
                      </span>
                      <span className="text-xs text-gray-400">Write your solution below</span>
                    </div>
                    {(answers[q.id] || "").trim() && (
                      <span className="text-xs text-emerald-600 font-medium">✓ Code entered</span>
                    )}
                  </div>
                  <Suspense fallback={
                    <div className="flex items-center justify-center h-[250px] bg-gray-50">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  }>
                    <MonacoEditor
                      height="250px"
                      language={langToMonaco(q.language || "Python")}
                      value={answers[q.id] !== undefined ? answers[q.id] : `# Write your ${q.language || "Python"} solution here\n`}
                      onChange={(val) => {
                        setAnswers(a => ({ ...a, [q.id]: val || "" }));
                        setVisited(v => new Set([...v, q.id]));
                      }}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        folding: false,
                        automaticLayout: true,
                        wordWrap: "on",
                      }}
                      theme="vs"
                    />
                  </Suspense>
                </div>
              )}

              <div className="flex gap-3 mt-8">
                <Button variant="outline" onClick={() => navTo(currentQ - 1)} disabled={currentQ === 0} className="flex-1 sm:flex-none">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <Button variant="outline" onClick={() => navTo(currentQ + 1)} disabled={currentQ === questions.length - 1} className="flex-1 sm:flex-none ml-auto">
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {/* Question navigator */}
              <div className="mt-8 p-4 bg-white rounded-xl border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-3">Question Navigator</p>
                <div className="flex flex-wrap gap-1.5">
                  {questions.map((qq, i) => {
                    const st = getNavStatus(qq);
                    return (
                      <button key={qq.id} onClick={() => navTo(i)}
                        className={`w-8 h-8 text-xs font-bold rounded-lg transition-all border ${
                          i === currentQ ? "ring-2 ring-indigo-500 scale-110" :
                          st === "answered" ? "bg-emerald-500 text-white border-emerald-500" :
                          st === "marked" ? "bg-amber-400 text-white border-amber-400" :
                          st === "not_answered" ? "bg-white text-gray-700 border-gray-300" :
                          "bg-gray-200 text-gray-500 border-gray-200"
                        }`}>
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
                  <span><span className="inline-block w-3 h-3 rounded bg-emerald-500 mr-1"></span>Answered</span>
                  <span><span className="inline-block w-3 h-3 rounded bg-amber-400 mr-1"></span>Marked</span>
                  <span><span className="inline-block w-3 h-3 rounded bg-white border border-gray-300 mr-1"></span>Not Answered</span>
                  <span><span className="inline-block w-3 h-3 rounded bg-gray-200 mr-1"></span>Not Visited</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Camera panel (25%) */}
        <div className="hidden lg:flex w-64 xl:w-72 flex-col bg-white border-l border-gray-200 p-4 flex-shrink-0">
          <div className="rounded-xl overflow-hidden bg-gray-900 aspect-video mb-3 relative">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 rounded-full px-2 py-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] text-white">REC</span>
            </div>
          </div>
          <p className="text-xs text-center text-gray-500 font-medium mb-4">You are being monitored</p>
          <div className="space-y-2 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Answered:</span>
              <span className="font-bold text-gray-800">{answeredCount}/{questions.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Time left:</span>
              <span className={`font-bold ${timeLeft < 300 ? "text-red-600" : "text-gray-800"}`}>{formatTime(timeLeft)}</span>
            </div>
            {violations.length > 0 && (
              <div className="mt-3 p-2 bg-red-50 rounded-lg border border-red-100">
                <p className="text-red-600 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {violations.length} flag{violations.length > 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
