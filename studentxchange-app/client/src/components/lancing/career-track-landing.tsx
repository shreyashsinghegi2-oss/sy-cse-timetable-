import { displayInstitutionName } from "@/lib/institution-display";
import { User, Building2, ArrowRight, Sparkles, ShieldCheck, Briefcase, Handshake } from "lucide-react";

export default function CareerTrackLanding({
  institution, onSelect,
}: {
  institution?: string;
  onSelect: (track: "personal" | "institutional") => void;
}) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="text-center max-w-xl mx-auto pt-1 px-2">
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">Choose your Career Map</h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-1.5 leading-relaxed">
          Grow with StudentXchange directly, or follow the roadmap your institution runs with us as their knowledge partner.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Personal Career Map — StudentXchange full-service */}
        <button
          onClick={() => onSelect("personal")}
          className="group text-left bg-white rounded-2xl border border-gray-200 hover:border-sky-300 hover:shadow-lg active:scale-[0.99] transition-all p-4 sm:p-5 flex flex-col"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-md flex-shrink-0">
              <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 rounded-full px-2 py-0.5 text-right leading-tight">
              StudentXchange<br className="sm:hidden" /> Personal
            </span>
          </div>
          <h3 className="text-base font-bold text-gray-900">Personal Career Map</h3>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed flex-1">
            For students growing with StudentXchange directly. AI builds your roadmap, we perfect your placement
            readiness — then we connect you to jobs, internships and placements{" "}
            <span className="font-semibold text-gray-700">through StudentXchange</span>.
          </p>
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] text-sky-600 font-semibold">
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0" /> AI-personalised · editable
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 font-semibold">
              <Briefcase className="w-3.5 h-3.5 flex-shrink-0" /> Jobs, internships &amp; placements by StudentXchange
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-1.5 text-sm font-bold text-white bg-sky-600 group-hover:bg-sky-700 rounded-xl py-2.5 transition-colors">
            Build My Roadmap <ArrowRight className="w-4 h-4" />
          </div>
        </button>

        {/* Institutional Career Map — knowledge partner */}
        <button
          onClick={() => onSelect("institutional")}
          className="group text-left bg-white rounded-2xl border border-gray-200 hover:border-emerald-300 hover:shadow-lg active:scale-[0.99] transition-all p-4 sm:p-5 flex flex-col"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md flex-shrink-0">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 text-right leading-tight">
              Knowledge<br className="sm:hidden" /> Partner
            </span>
          </div>
          <h3 className="text-base font-bold text-gray-900">Institutional Career Map</h3>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed flex-1">
            For students enrolled at {displayInstitutionName(institution, "your institution")}. Follow the same Career Compass steps with
            institution-published guidance when available, or build your roadmap with StudentXchange —{" "}
            <span className="font-semibold text-gray-700">placements, jobs and internships are handled by your institution</span>.
          </p>
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" /> Institution-published plan takes priority
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-teal-600 font-semibold">
              <Handshake className="w-3.5 h-3.5 flex-shrink-0" /> Roadmap powered by StudentXchange
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-1.5 text-sm font-bold text-white bg-emerald-600 group-hover:bg-emerald-700 rounded-xl py-2.5 transition-colors">
            Open My Roadmap <ArrowRight className="w-4 h-4" />
          </div>
        </button>
      </div>
    </div>
  );
}
