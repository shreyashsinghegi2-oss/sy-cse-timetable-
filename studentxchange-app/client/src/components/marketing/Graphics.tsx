import { useEffect, useRef, useState } from "react";
import { ShoppingBag, Users, Briefcase, Compass } from "lucide-react";

/** Hub diagram: the StudentXchange identity at the centre, four products orbiting it. */
export function EcosystemHub() {
  const nodes = [
    { icon: ShoppingBag, label: "Marketplace", style: { left: "50%", top: "6%" }, g: "from-sky-500 to-blue-600" },
    { icon: Users, label: "Collab", style: { left: "94%", top: "50%" }, g: "from-blue-500 to-indigo-600" },
    { icon: Briefcase, label: "Lancing", style: { left: "50%", top: "94%" }, g: "from-cyan-500 to-sky-600" },
    { icon: Compass, label: "Career Compass", style: { left: "6%", top: "50%" }, g: "from-indigo-500 to-blue-700" },
  ];
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[460px]" aria-hidden>
      <div className="absolute inset-[6%] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(186,230,253,.55), rgba(186,230,253,0))" }} />
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full">
        <circle cx="200" cy="200" r="150" fill="none" stroke="#bae6fd" strokeWidth="1.5" strokeDasharray="3 7" className="spin-slow" />
        <circle cx="200" cy="200" r="100" fill="none" stroke="#e0f2fe" strokeWidth="1.5" />
        {[[200, 50], [350, 200], [200, 350], [50, 200]].map(([x, y]) => (
          <line key={`${x}-${y}`} x1="200" y1="200" x2={x} y2={y} stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" className="dash-flow" />
        ))}
      </svg>
      <div className="spin-mid absolute inset-[7%]"><span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-sky shadow-[0_0_14px_3px_rgba(56,189,248,.8)]" /></div>

      <div className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center">
        <span className="absolute h-32 w-32 rounded-full border-2 border-sky/50" style={{ animation: "ping-soft 3s ease-out infinite" }} />
        <span className="absolute h-32 w-32 rounded-full border border-sky/40" style={{ animation: "ping-soft 3s ease-out 1.5s infinite" }} />
        <div className="relative grid h-32 w-32 place-items-center rounded-full border border-line bg-white shadow-pop">
          <img src="/logo-mark.png" alt="" width={96} height={88} className="h-[88px] w-auto" />
        </div>
      </div>

      {nodes.map(({ icon: I, label, style, g }, i) => (
        <div key={label} className="absolute -translate-x-1/2 -translate-y-1/2" style={style}>
          <div className="float-slow flex items-center gap-2 rounded-full border border-line bg-white py-1.5 pl-1.5 pr-3.5 shadow-pop" style={{ animationDelay: `${-i * 1.4}s` }}>
            <span className={`grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br text-white ${g}`}><I size={15} /></span>
            <span className="whitespace-nowrap text-xs font-semibold">{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Circular readiness gauge that fills when scrolled into view. */
export function ReadinessGauge({ value = 68 }: { value?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setV(value); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(value); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [value]);
  const r = 54, c = 2 * Math.PI * r;
  return (
    <div className="relative h-40 w-40" role="img" aria-label={`Placement readiness ${value} out of 100`}>
      <svg ref={ref} viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <defs><linearGradient id="gauge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#38bdf8" /><stop offset="1" stopColor="#2563eb" /></linearGradient></defs>
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        <circle cx="70" cy="70" r={r} fill="none" stroke="url(#gauge)" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(.2,.7,.2,1)" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div><div className="text-3xl font-semibold tracking-tight">{value}</div><div className="text-[11px] text-subtle">/ 100 ready</div></div>
      </div>
    </div>
  );
}

/** Curved section divider. `fill` is the colour of the section below. */
export function Wave({ fill, flip = false }: { fill: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 1440 70" preserveAspectRatio="none" className={`block h-10 w-full md:h-16 ${flip ? "rotate-180" : ""}`} aria-hidden>
      <path d="M0 70V30C180 62 360 66 540 46S900 0 1080 14s270 30 360 20V70Z" fill={fill} />
    </svg>
  );
}
