import { Link } from "wouter";

type Props = {
  /** Height of the logo image in px. */
  size?: number;
  /** Use the white-lettered logo (for navy / dark backgrounds). */
  light?: boolean;
  /** Show the "StudentXchange" wordmark next to the logo. */
  wordmark?: boolean;
  className?: string;
};

/** Official StudentXchange logo (transparent cut-out of the brand badge). */
export function BrandMark({ size = 40, light = false, wordmark = true, className = "" }: Props) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src={light ? "/logo-mark-light.png" : "/logo-mark.png"}
        alt={wordmark ? "" : "StudentXchange"}
        height={size}
        width={Math.round(size * 1.1)}
        style={{ height: size, width: "auto" }}
        className="shrink-0 select-none"
        draggable={false}
      />
      {wordmark && (
        <span className={`text-[17px] font-semibold tracking-tight ${light ? "text-white" : "text-gray-900"}`}>StudentXchange</span>
      )}
    </span>
  );
}

export function BrandLink(props: Props & { href?: string }) {
  const { href = "/", ...rest } = props;
  return (
    <Link href={href} aria-label="StudentXchange home" className="inline-flex items-center">
      <BrandMark {...rest} />
    </Link>
  );
}

/** Full-screen branded loading state. */
export function BrandLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-white" role="status" aria-live="polite" aria-label="Loading">
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <span className="absolute inset-0 -z-10 rounded-full bg-sky/30 blur-2xl" style={{ animation: "ping-soft 2s ease-out infinite" }} />
          <img src="/logo-mark.png" alt="StudentXchange" width={132} height={120} className="float-slow h-[120px] w-auto" />
        </div>
        <div className="h-1 w-40 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-sky to-blue-600" style={{ animation: "marquee 1.1s ease-in-out infinite alternate", transform: "translateX(0)" }} />
        </div>
      </div>
    </div>
  );
}
