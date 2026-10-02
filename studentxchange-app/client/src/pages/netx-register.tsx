import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Clock, ArrowLeft } from "lucide-react";

export default function NetxRegisterPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Clock className="w-10 h-10 text-cyan-400" />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
          NET<span className="text-cyan-400">X</span> 2026
        </h1>

        <div className="inline-block bg-cyan-500/10 border border-cyan-500/30 rounded-full px-4 py-1 mb-6">
          <span className="text-cyan-400 text-sm font-semibold tracking-widest uppercase">
            Registration Coming Soon
          </span>
        </div>

        <p className="text-gray-400 text-lg mb-8 leading-relaxed">
          Registrations for NETX 2026 are not open yet.
          Check back soon for updates!
        </p>

        <Button
          variant="outline"
          className="border-gray-700 text-gray-300 hover:text-white hover:border-gray-500"
          onClick={() => setLocation("/")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </div>
    </div>
  );
}
