const SITE_URL = "https://studentxchange.in";
const SOCIAL_IMAGE = `${SITE_URL}/og-image.png`;

type ServerPageMeta = {
  title: string;
  description: string;
  index: boolean;
};

const ROUTE_META: Record<string, ServerPageMeta> = {
  "/": {
    title: "StudentXchange | Marketplace, Collaboration & Careers",
    description: "Buy and sell student essentials, collaborate with peers, discover internships, and build career-ready skills across India.",
    index: true,
  },
  "/marketplace": {
    title: "Student Marketplace India | StudentXchange",
    description: "Discover affordable textbooks, notes, calculators, lab equipment, and student essentials from verified student sellers.",
    index: true,
  },
  "/browse": {
    title: "Browse Student Books, Notes & Essentials | StudentXchange",
    description: "Browse student-listed books, notes, calculators, equipment, and educational essentials available across India.",
    index: true,
  },
  "/student-collab": {
    title: "Student Collaboration Network | StudentXchange",
    description: "Connect with students, share projects, join communities, and collaborate on academic and creative work.",
    index: true,
  },
  "/collab": {
    title: "Student Collaboration Network | StudentXchange",
    description: "Connect with students, share projects, join communities, and collaborate on academic and creative work.",
    index: true,
  },
  "/collab-arena": {
    title: "Student Collab Arena | StudentXchange",
    description: "Join student challenges, showcase projects, and discover collaborative events through StudentXchange Collab Arena.",
    index: true,
  },
  "/student-lancing": {
    title: "Student Internships, Gigs & Career Tools | StudentXchange",
    description: "Find student-friendly jobs, internships, campus drives, career roadmaps, and placement preparation tools.",
    index: true,
  },
  "/lancing/micro-tasks": {
    title: "StudentLancing | StudentXchange",
    description: "Micro Tasks are temporarily unavailable. Browse student jobs and internships instead.",
    index: false,
  },
  "/lancing/internships": {
    title: "Student Internships in India | StudentXchange",
    description: "Explore internships for Indian students across technology, design, business, content, research, and more.",
    index: true,
  },
  "/lancing/career-compass": {
    title: "AI Career Roadmap for Students | Career Compass",
    description: "Build a personalized, year-by-year career roadmap with skills, projects, learning resources, and placement preparation.",
    index: true,
  },
  "/lancing/campus-drives": {
    title: "Campus Placement Drives | StudentXchange",
    description: "Discover active campus placement drives and assessment opportunities available to eligible students.",
    index: true,
  },
  "/competitions": {
    title: "Student Competitions & Hackathons | StudentXchange",
    description: "Discover student hackathons, coding contests, case challenges, quizzes, ideathons, and competitions.",
    index: true,
  },
  "/about": {
    title: "About StudentXchange | Built for Indian Students",
    description: "Learn how StudentXchange connects students through a trusted marketplace, collaboration network, and career opportunity platform.",
    index: true,
  },
  "/policies": {
    title: "Platform Policies | StudentXchange",
    description: "Review StudentXchange policies for marketplace transactions, subscriptions, refunds, privacy, and responsible platform use.",
    index: true,
  },
  "/terms": {
    title: "Terms and Conditions | StudentXchange",
    description: "Read the terms governing accounts, listings, transactions, collaboration, and career services on StudentXchange.",
    index: true,
  },
  "/privacy-policy": {
    title: "Privacy Policy | StudentXchange",
    description: "Understand how StudentXchange collects, uses, protects, and manages personal information across its student services.",
    index: true,
  },
  "/disclaimer": {
    title: "Platform Disclaimer | StudentXchange",
    description: "Review important limitations and user responsibilities when using StudentXchange marketplace, collaboration, and career services.",
    index: true,
  },
};

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function replaceMeta(html: string, selector: string, value: string) {
  const escaped = escapeAttribute(value);
  const pattern = new RegExp(`<meta\\s+${selector}\\s+content="[^"]*"\\s*/?>`, "i");
  return html.replace(pattern, `<meta ${selector} content="${escaped}" />`);
}

export function injectRouteSeo(html: string, rawUrl: string) {
  const pathname = new URL(rawUrl, SITE_URL).pathname.replace(/\/+$/, "") || "/";
  const isProduct = pathname.startsWith("/product/");
  const meta = ROUTE_META[pathname] || (isProduct
    ? {
        title: "Student Marketplace Listing | StudentXchange",
        description: "View product details, seller information, and availability for this student marketplace listing.",
        index: true,
      }
    : {
        title: "Page Not Found | StudentXchange",
        description: "The requested StudentXchange page could not be found.",
        index: false,
      });
  const canonical = `${SITE_URL}${pathname === "/" ? "/" : pathname}`;
  const robots = meta.index
    ? "index, follow, max-snippet:-1, max-image-preview:large"
    : "noindex, nofollow, noarchive";

  let output = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeAttribute(meta.title)}</title>`);
  output = replaceMeta(output, 'name="description"', meta.description);
  output = replaceMeta(output, 'name="robots"', robots);
  output = replaceMeta(output, 'property="og:title"', meta.title);
  output = replaceMeta(output, 'property="og:description"', meta.description);
  output = replaceMeta(output, 'property="og:url"', canonical);
  output = replaceMeta(output, 'name="twitter:title"', meta.title);
  output = replaceMeta(output, 'name="twitter:description"', meta.description);
  output = replaceMeta(output, 'name="twitter:url"', canonical);
  output = output.replace(
    /(<link\s+rel="canonical"\s+href=")[^"]*("\s*\/?>)/i,
    `$1${escapeAttribute(canonical)}$2`,
  );

  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: meta.title,
    description: meta.description,
    url: canonical,
    image: SOCIAL_IMAGE,
    isPartOf: { "@type": "WebSite", name: "StudentXchange", url: SITE_URL },
  }).replace(/</g, "\\u003c");
  return output.replace(
    "</head>",
    `<script id="server-route-structured-data" type="application/ld+json">${structuredData}</script>\n  </head>`,
  );
}