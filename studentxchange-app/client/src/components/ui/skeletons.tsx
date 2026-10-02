/* ─────────────────────────────────────────────────────
   StudentXchange — Skeleton Loading System
   Shimmer-only, zero spinners, exact layout match
   ───────────────────────────────────────────────────── */

/* ── Primitive helper ── */
function Sk({
  className = "",
  circle = false,
  pill = false,
  rounded = false,
}: {
  className?: string;
  circle?: boolean;
  pill?: boolean;
  rounded?: boolean;
}) {
  const shape = circle
    ? "skeleton-shimmer-circle"
    : pill
    ? "skeleton-shimmer-pill"
    : rounded
    ? "skeleton-shimmer-xl"
    : "";
  return <div className={`skeleton-shimmer ${shape} ${className}`} />;
}

/* ═══════════════════════════════════════════
   PRIMITIVES
   ═══════════════════════════════════════════ */

export function SkeletonAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" | "xl" }) {
  const s = { sm: "h-8 w-8", md: "h-11 w-11", lg: "h-16 w-16", xl: "h-20 w-20" }[size];
  return <Sk className={`${s} flex-shrink-0`} circle />;
}

export function SkeletonText({
  lines = 1,
  widths,
}: {
  lines?: number;
  widths?: string[];
}) {
  const defaults = ["w-full", "w-4/5", "w-2/3", "w-3/4", "w-1/2"];
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Sk key={i} className={`h-3.5 ${widths?.[i] ?? defaults[i % defaults.length]}`} />
      ))}
    </div>
  );
}

export function SkeletonButton({ className = "w-24 h-8" }: { className?: string }) {
  return <Sk className={className} pill />;
}

export function SkeletonImage({ className = "w-full aspect-[3/2]" }: { className?: string }) {
  return <Sk className={`${className} rounded-lg`} />;
}

export function SkeletonBadge({ className = "h-5 w-16" }: { className?: string }) {
  return <Sk className={className} pill />;
}

/* ═══════════════════════════════════════════
   FEED — matches premium-post-card exactly
   ═══════════════════════════════════════════ */

export function FeedPostSkeleton({ hasMedia = false }: { hasMedia?: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-4 space-y-3">
      {/* Header row: avatar + name/time + connect button */}
      <div className="flex items-center gap-3">
        <SkeletonAvatar size="md" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <Sk className="h-3.5 w-32" />
          <Sk className="h-3 w-20" />
        </div>
        <SkeletonButton className="w-20 h-7 flex-shrink-0" />
      </div>

      {/* Text lines (post content) — matches text-only posts, the majority */}
      <div className="space-y-2">
        <Sk className="h-3.5 w-full" />
        <Sk className="h-3.5 w-11/12" />
        <Sk className="h-3.5 w-3/4" />
      </div>

      {/* Media placeholder — only shown for the minority of posts that have images.
          Keeping it off by default eliminates the layout shift when text-only posts
          replace the skeleton, since the skeleton height now matches the real card. */}
      {hasMedia && <SkeletonImage className="w-full aspect-[3/2]" />}

      {/* Like / Comment / Share buttons */}
      <div className="flex items-center gap-6 pt-1 border-t border-gray-100">
        <Sk className="h-4 w-14" />
        <Sk className="h-4 w-16" />
        <Sk className="h-4 w-12" />
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="w-full mt-4 space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <FeedPostSkeleton key={i} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   USER PROFILE PAGE — /u/:username
   Matches: h-32 banner → h-20 avatar → name → info → posts
   ═══════════════════════════════════════════ */

export function UserProfileSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Sk className="h-9 w-9 flex-shrink-0" circle />
        <div className="space-y-1.5">
          <Sk className="h-4 w-32" />
          <Sk className="h-3 w-20" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Banner */}
        <Sk className="h-32 w-full rounded-none" />

        {/* Profile card */}
        <div className="bg-white px-4 pb-4 border-b border-gray-100">
          <div className="flex items-end justify-between -mt-10 mb-3">
            <div className="skeleton-shimmer skeleton-shimmer-circle h-20 w-20 border-4 border-white shadow-md" />
            <SkeletonButton className="w-28 h-8 mb-1" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sk className="h-5 w-40" />
              <SkeletonBadge className="h-5 w-16" />
            </div>
            <Sk className="h-3.5 w-28" />
            <div className="flex gap-4 mt-2">
              <Sk className="h-3.5 w-36" />
              <Sk className="h-3.5 w-28" />
            </div>
          </div>
        </div>

        {/* About / Bio */}
        <div className="bg-white mt-2 px-4 py-4 border-b border-gray-100">
          <Sk className="h-4 w-16 mb-3" />
          <SkeletonText lines={3} widths={["w-full", "w-5/6", "w-4/6"]} />
        </div>

        {/* Skills tags */}
        <div className="bg-white mt-2 px-4 py-4 border-b border-gray-100">
          <Sk className="h-4 w-14 mb-3" />
          <div className="flex flex-wrap gap-2">
            {[20, 24, 18, 22, 16, 20].map((w, i) => (
              <SkeletonBadge key={i} className={`h-6 w-${w}`} />
            ))}
          </div>
        </div>

        {/* Posts section */}
        <div className="px-4 py-4 space-y-4">
          <Sk className="h-5 w-28" />
          <FeedPostSkeleton />
          <FeedPostSkeleton />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   COLLAB OWN PROFILE (/collab-profile)
   Matches the 260px banner → avatar+name → 2-col grid
   ═══════════════════════════════════════════ */

export function CollabProfileSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Sk className="h-8 w-24" pill />
          <Sk className="h-8 w-20" pill />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Banner + avatar overlay */}
        <div className="relative">
          <Sk className="h-48 md:h-56 w-full rounded-2xl" />
          <div className="absolute -bottom-8 left-6">
            <div className="skeleton-shimmer skeleton-shimmer-circle h-24 w-24 border-4 border-white shadow-lg" />
          </div>
        </div>

        {/* Name + actions */}
        <div className="pt-10 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2">
            <Sk className="h-6 w-48" />
            <Sk className="h-4 w-32" />
            <div className="flex flex-wrap gap-3 mt-2">
              <Sk className="h-3.5 w-36" />
              <Sk className="h-3.5 w-28" />
            </div>
          </div>
          <div className="flex gap-2">
            <SkeletonButton className="w-28 h-9" />
            <SkeletonButton className="w-28 h-9" />
          </div>
        </div>

        {/* 2-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left col */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <Sk className="h-4 w-20" />
              <SkeletonText lines={3} widths={["w-full", "w-4/5", "w-3/5"]} />
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <Sk className="h-4 w-16" />
              <div className="flex flex-wrap gap-2">
                {[18, 22, 16, 20, 24].map((w, i) => (
                  <SkeletonBadge key={i} className={`h-6 w-${w}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Right col (2 cols) */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <Sk className="h-4 w-24" />
              <SkeletonText lines={4} />
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <Sk className="h-4 w-20" />
              <div className="flex flex-wrap gap-2">
                {[22, 18, 24, 20, 16, 22].map((w, i) => (
                  <SkeletonBadge key={i} className={`h-6 w-${w}`} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Posts skeleton */}
        <div className="space-y-4">
          <Sk className="h-5 w-24" />
          <UserPostsSkeleton count={2} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   USER POSTS — matches user-posts.tsx card
   ═══════════════════════════════════════════ */

export function UserPostCardSkeleton() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 space-y-3">
        {/* Author + date */}
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Sk className="h-3.5 w-32" />
            <Sk className="h-3 w-20" />
          </div>
        </div>
        {/* Text — no image placeholder; most posts are text-only */}
        <SkeletonText lines={2} widths={["w-full", "w-3/4"]} />
        {/* Actions */}
        <div className="flex items-center gap-6 pt-2 border-t border-gray-100">
          <Sk className="h-4 w-12" />
          <Sk className="h-4 w-14" />
          <Sk className="h-4 w-10" />
        </div>
      </div>
    </div>
  );
}

export function UserPostsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {Array.from({ length: count }).map((_, i) => (
        <UserPostCardSkeleton key={i} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MARKETPLACE — matches ProductCard exactly
   ═══════════════════════════════════════════ */

export function MarketplaceProductSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      {/* Image */}
      <Sk className="h-40 sm:h-48 w-full rounded-none" />
      {/* Body */}
      <div className="p-3 sm:p-4 space-y-3">
        <Sk className="h-4 w-3/4" />
        <Sk className="h-3 w-full" />
        <Sk className="h-3 w-2/3" />
        <div className="flex items-center justify-between">
          <SkeletonBadge className="h-5 w-16" />
          <Sk className="h-4 w-20" />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Sk className="h-6 w-24" />
            <Sk className="h-3 w-20" />
          </div>
          <SkeletonButton className="h-8 w-20" />
        </div>
      </div>
      {/* Payment badge */}
      <div className="px-4 pb-4">
        <Sk className="h-6 w-full" />
      </div>
    </div>
  );
}

export function MarketplaceGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <MarketplaceProductSkeleton key={i} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   COLLAB SEARCH — matches search result row
   ═══════════════════════════════════════════ */

export function SearchResultItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
      <SkeletonAvatar size="lg" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <Sk className="h-3.5 w-36" />
          <SkeletonBadge className="h-4 w-14" />
        </div>
        <Sk className="h-3 w-48" />
      </div>
      <SkeletonButton className="w-16 h-8 flex-shrink-0" />
    </div>
  );
}

export function SearchSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <SearchResultItemSkeleton key={i} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SEARCH INPUT INDICATOR — replaces spin icon
   ═══════════════════════════════════════════ */

export function SearchingIndicator() {
  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1 h-1 rounded-full bg-gray-400"
          style={{ animation: `skeleton-shimmer 1s ease ${i * 0.15}s infinite alternate` }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   INLINE SEND BUTTON STATES
   Tiny spinner-free pending indicators
   ═══════════════════════════════════════════ */

export function SendingDots() {
  return (
    <span className="flex gap-0.5 items-center">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block w-1 h-1 rounded-full bg-current opacity-60"
          style={{ animation: `bounce 0.9s ease ${i * 0.15}s infinite alternate` }}
        />
      ))}
    </span>
  );
}
