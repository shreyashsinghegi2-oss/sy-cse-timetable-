import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { auth, firestore } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { getAuthToken } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Clock, Calendar, CheckCircle2, AlertCircle,
  PenLine, ChevronRight, BarChart2
} from "lucide-react";
import { Link } from "wouter";
import { displayInstitutionName } from "@/lib/institution-display";

function useCountdown(targetDate: Date | null) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (!targetDate) return;
    const tick = () => {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) { setText("Starting now..."); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setText(h > 0 ? `Starts in ${h}h ${m}m` : m > 0 ? `Starts in ${m}m ${s}s` : `Starts in ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return text;
}

function ExamCard({ exam, submitted, onJoin }: { exam: any; submitted: boolean; onJoin: () => void }) {
  const isLive = exam.status === "live";
  const isScheduled = exam.status === "scheduled";
  const scheduledDate = exam.scheduledAt ? (exam.scheduledAt?.toDate ? exam.scheduledAt.toDate() : new Date(exam.scheduledAt)) : null;
  const canJoin = isLive;
  const countdown = useCountdown(isScheduled && scheduledDate ? scheduledDate : null);

  return (
    <Card className={`border ${isLive ? "border-emerald-300 bg-emerald-50/30 shadow-emerald-100/50 shadow-md" : "border-gray-200"}`}>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {isLive && <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full animate-pulse">● LIVE NOW</span>}
              {isScheduled && <Badge className="bg-blue-100 text-blue-700 text-xs">Scheduled</Badge>}
            </div>
            <h3 className="text-base font-semibold text-gray-900 truncate">{exam.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">by {displayInstitutionName(exam.collegeName, "Placement Cell")}</p>
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
              {scheduledDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {scheduledDate.toLocaleString()}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {exam.timeLimitMinutes} minutes
              </span>
              <span>{exam.questionCount || 0} questions · {exam.totalMarks || 0} marks</span>
            </div>
            {isScheduled && countdown && (
              <p className="text-xs text-blue-600 font-medium mt-1">{countdown}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {submitted ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5" /> Submitted
              </span>
            ) : canJoin ? (
              <Button size="sm" onClick={onJoin}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg px-4">
                <ChevronRight className="w-3.5 h-3.5 mr-1" /> Join Exam
              </Button>
            ) : (
              <Button size="sm" disabled variant="outline" className="text-xs text-gray-400">
                Not started yet
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PastExamCard({ exam, result }: { exam: any; result?: any }) {
  const [showDetail, setShowDetail] = useState(false);
  if (!result) return (
    <Card className="border border-gray-200 opacity-70">
      <CardContent className="p-5">
        <h3 className="text-base font-semibold text-gray-900">{exam.title}</h3>
        <p className="text-xs text-gray-500 mt-1">by {displayInstitutionName(exam.collegeName, "Placement Cell")} · Result pending</p>
      </CardContent>
    </Card>
  );
  const passed = result.percentage >= (exam.passMarkPercent || 40);
  return (
    <Card className="border border-gray-200">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900">{result.examTitle}</h3>
            <p className="text-xs text-gray-500 mt-0.5">by {displayInstitutionName(exam?.collegeName, "Placement Cell")}</p>
            <div className="flex flex-wrap gap-3 mt-2">
              <span className={`text-sm font-bold ${passed ? "text-emerald-600" : "text-red-500"}`}>
                {result.score}/{result.totalMarks} ({result.percentage}%)
              </span>
              <Badge className={`text-xs ${passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                {passed ? "Passed" : "Failed"}
              </Badge>
              {result.violationsCount > 0 && (
                <span className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{result.violationsCount} integrity flag{result.violationsCount > 1 ? "s" : ""} recorded
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {result.submittedAt ? `Submitted ${new Date(result.submittedAt).toLocaleDateString()}` : ""}
              {result.timeTakenMinutes ? ` · ${result.timeTakenMinutes} minutes taken` : ""}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowDetail(v => !v)} className="text-indigo-700 border-indigo-300 text-xs">
            <BarChart2 className="w-3.5 h-3.5 mr-1" /> View My Result
          </Button>
        </div>
        {showDetail && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xl font-bold text-indigo-700">{result.score}/{result.totalMarks}</p>
                <p className="text-xs text-gray-500">Your Score</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className={`text-xl font-bold ${passed ? "text-emerald-600" : "text-red-500"}`}>{result.percentage}%</p>
                <p className="text-xs text-gray-500">Percentage</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xl font-bold text-gray-700">{result.timeTakenMinutes}m</p>
                <p className="text-xs text-gray-500">Time Taken</p>
              </div>
            </div>
            {result.hasPendingReview && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                Your MCQ score: {result.score}/{result.totalMarks}. Short answer responses are pending review by your placement cell.
              </p>
            )}
            {result.violationsCount > 0 && (
              <p className="text-xs text-gray-500">
                {result.violationsCount} integrity flag{result.violationsCount > 1 ? "s" : ""} were recorded during your exam.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MyExamsContent() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
  const [pastExams, setPastExams] = useState<any[]>([]);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Record<string, any>>({});
  const [hasProfile, setHasProfile] = useState(true);

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      try {
        const token = await getAuthToken();

        const profileSnap = await getDoc(doc(firestore, "users", user.uid));
        const ccp = profileSnap.exists() ? profileSnap.data()?.career_compass_profile : null;
        setHasProfile(!!ccp);

        const examsRes = await fetch("/api/assessments/student/list", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!examsRes.ok) throw new Error("Failed to load exams");
        const allExams: any[] = await examsRes.json();

        const upcoming = allExams.filter(e => e.status === "scheduled" || e.status === "live");
        const past = allExams.filter(e => e.status === "completed");
        setUpcomingExams(upcoming);
        setPastExams(past);

        const submitted = new Set<string>();
        const resultMap: Record<string, any> = {};
        for (const exam of allExams) {
          const resultId = `${exam.id}_${user.uid}`;
          const snap = await getDoc(doc(firestore, "placement_exam_results", resultId));
          if (snap.exists()) {
            submitted.add(exam.id);
            resultMap[exam.id] = snap.data();
          }
        }
        setSubmittedIds(submitted);
        setResults(resultMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  return (
    <div className="space-y-6">
      {!hasProfile && !loading && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-900 text-sm">Complete your Career Compass profile first</p>
            <p className="text-xs text-amber-700 mt-0.5">Your branch and year are needed to match you with eligible exams.</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : (
        <>
          <section>
            <h2 className="text-base font-bold text-gray-800 mb-3">Upcoming &amp; Live Exams</h2>
            {upcomingExams.length === 0 ? (
              <div className="text-center py-10 bg-white border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
                <PenLine className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No upcoming exams scheduled for you.</p>
                <p className="text-xs mt-1 opacity-70">Exams are matched to your branch and year.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingExams.map(exam => (
                  <ExamCard
                    key={exam.id}
                    exam={exam}
                    submitted={submittedIds.has(exam.id)}
                    onJoin={() => setLocation(`/lancing/exam/${exam.id}`)}
                  />
                ))}
              </div>
            )}
          </section>

          {pastExams.length > 0 && (
            <section>
              <h2 className="text-base font-bold text-gray-800 mb-3">Past Exams</h2>
              <div className="space-y-3">
                {pastExams.map(exam => (
                  <PastExamCard key={exam.id} exam={exam} result={results[exam.id]} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
