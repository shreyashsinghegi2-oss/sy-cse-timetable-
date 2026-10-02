import { useEffect } from "react";
import { useLocation } from "wouter";

const SITE_URL = "https://studentxchange.in";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

type PageMeta = {
  title: string;
  description: string;
  label: string;
  index?: boolean;
};

const PAGE_META: Record<string, PageMeta> = {
  "/": {
    title: "StudentXchange | Marketplace, Collaboration & Careers",
    description: "Buy and sell student essentials, collaborate with peers, discover internships, and build career-ready skills across India.",
    label: "Home",
  },
  "/marketplace": {
    title: "Student Marketplace India | StudentXchange",
    description: "Discover affordable textbooks, notes, calculators, lab equipment, and student essentials from verified student sellers.",
    label: "Marketplace",
  },
  "/browse": {
    title: "Browse Student Books, Notes & Essentials | StudentXchange",
    description: "Browse student-listed books, notes, calculators, equipment, and educational essentials available across India.",
    label: "Browse",
  },
  "/about": {
    title: "About StudentXchange | Built for Indian Students",
    description: "Learn how StudentXchange connects students through a trusted marketplace, collaboration network, and career opportunity platform.",
    label: "About",
  },
  "/policies": {
    title: "Platform Policies | StudentXchange",
    description: "Review StudentXchange policies for marketplace transactions, subscriptions, refunds, privacy, and responsible platform use.",
    label: "Policies",
  },
  "/terms": {
    title: "Terms and Conditions | StudentXchange",
    description: "Read the terms governing accounts, listings, transactions, collaboration, and career services on StudentXchange.",
    label: "Terms",
  },
  "/privacy-policy": {
    title: "Privacy Policy | StudentXchange",
    description: "Understand how StudentXchange collects, uses, protects, and manages personal information across its student services.",
    label: "Privacy Policy",
  },
  "/disclaimer": {
    title: "Platform Disclaimer | StudentXchange",
    description: "Review important limitations and user responsibilities when using StudentXchange marketplace, collaboration, and career services.",
    label: "Disclaimer",
  },
  "/student-collab": {
    title: "Student Collaboration Network | StudentXchange",
    description: "Connect with students, share projects, join communities, and collaborate on academic and creative work.",
    label: "Student Collab",
  },
  "/collab": {
    title: "Student Collaboration Network | StudentXchange",
    description: "Connect with students, share projects, join communities, and collaborate on academic and creative work.",
    label: "Student Collab",
  },
  "/collab-arena": {
    title: "Student Collab Arena | StudentXchange",
    description: "Join student challenges, showcase projects, and discover collaborative events through StudentXchange Collab Arena.",
    label: "Collab Arena",
  },
  "/student-lancing": {
    title: "Student Internships, Gigs & Career Tools | StudentXchange",
    description: "Find student-friendly jobs, internships, campus drives, career roadmaps, and placement preparation tools.",
    label: "Student Lancing",
  },
  "/lancing/internships": {
    title: "Student Internships in India | StudentXchange",
    description: "Explore internships for Indian students across technology, design, business, content, research, and more.",
    label: "Internships",
  },
  "/lancing/career-compass": {
    title: "AI Career Roadmap for Students | Career Compass",
    description: "Build a personalized, year-by-year career roadmap with skills, projects, learning resources, and placement preparation.",
    label: "Career Compass",
  },
  "/lancing/campus-drives": {
    title: "Campus Placement Drives | StudentXchange",
    description: "Discover active campus placement drives and assessment opportunities available to eligible students.",
    label: "Campus Drives",
  },
  "/competitions": {
    title: "Student Competitions & Hackathons | StudentXchange",
    description: "Discover student hackathons, coding contests, case challenges, quizzes, ideathons, and competitions.",
    label: "Competitions",
  },
};

const PRIVATE_PREFIXES = [
  "/admin", "/database-monitor", "/seo-dashboard", "/clear-cache", "/auth",
  "/forgot-password", "/reset-password", "/cart", "/checkout", "/sell",
  "/orders", "/seller-listings", "/buyer-requests", "/payment-",
  "/collab-admin", "/admin-lancing", "/coe-dashboard", "/lancing/login",
  "/lancing/freelancer-dashboard", "/lancing/company-dashboard",
  "/lancing/angel-dashboard", "/lancing/placement-cell", "/lancing/pc-",
  "/lancing/my-", "/lancing/exam", "/competitions-admin",
];

function upsertMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function readableLabel(pathname: string) {
  const last = pathname.split("/").filter(Boolean).pop() || "Home";
  return last
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function resolveMeta(pathname: string): PageMeta {
  if (PAGE_META[pathname]) return PAGE_META[pathname];

  if (pathname.startsWith("/product/")) {
    return {
      title: "Student Marketplace Listing | StudentXchange",
      description: "View product details, seller information, and availability for this student marketplace listing.",
      label: "Marketplace Listing",
    };
  }
  const label = readableLabel(pathname);
  return {
    title: `${label} | StudentXchange`,
    description: `Access ${label} on StudentXchange, India's student marketplace, collaboration, and career platform.`,
    label,
    index: false,
  };
}

export default function RouteSEO() {
  const [location] = useLocation();

  useEffect(() => {
    const pathname = location.split("?")[0] || "/";
    const meta = resolveMeta(pathname);
    const canonical = `${SITE_URL}${pathname === "/" ? "/" : pathname.replace(/\/+$/, "")}`;
    const shouldIndex = meta.index !== false && !PRIVATE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    const applyMetadata = () => {
      document.title = meta.title;
      upsertMeta("name", "description", meta.description);
      upsertMeta("name", "robots", shouldIndex
        ? "index, follow, max-snippet:-1, max-image-preview:large"
        : "noindex, nofollow, noarchive");
      upsertMeta("property", "og:title", meta.title);
      upsertMeta("property", "og:description", meta.description);
      upsertMeta("property", "og:type", "website");
      upsertMeta("property", "og:url", canonical);
      upsertMeta("property", "og:image", DEFAULT_IMAGE);
      upsertMeta("property", "og:image:alt", "StudentXchange student marketplace, collaboration, and career platform");
      upsertMeta("name", "twitter:card", "summary_large_image");
      upsertMeta("name", "twitter:title", meta.title);
      upsertMeta("name", "twitter:description", meta.description);
      upsertMeta("name", "twitter:image", DEFAULT_IMAGE);
      upsertMeta("name", "twitter:image:alt", "StudentXchange student marketplace, collaboration, and career platform");

      let canonicalLink = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!canonicalLink) {
        canonicalLink = document.createElement("link");
        canonicalLink.rel = "canonical";
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.href = canonical;

      const crumbs = pathname === "/"
        ? [{ name: "Home", item: `${SITE_URL}/` }]
        : [
            { name: "Home", item: `${SITE_URL}/` },
            { name: meta.label, item: canonical },
          ];
      const graph: Record<string, unknown>[] = [
        {
          "@type": "WebPage",
          "@id": canonical,
          url: canonical,
          name: meta.title,
          description: meta.description,
          isPartOf: { "@id": `${SITE_URL}/#website` },
          primaryImageOfPage: { "@type": "ImageObject", url: DEFAULT_IMAGE },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: crumbs.map((crumb, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: crumb.name,
            item: crumb.item,
          })),
        },
      ];
      if (pathname === "/") {
        graph.push({
          "@type": "LocalBusiness",
          "@id": `${SITE_URL}/#business`,
          name: "StudentXchange",
          url: SITE_URL,
          image: DEFAULT_IMAGE,
          logo: `${SITE_URL}/logo.png`,
          description: "Student marketplace, collaboration, and career services for students across India.",
          address: {
            "@type": "PostalAddress",
            addressRegion: "Maharashtra",
            addressCountry: "IN",
          },
          areaServed: { "@type": "Country", name: "India" },
        });
      }

      let script = document.getElementById("route-structured-data") as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = "route-structured-data";
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@graph": graph,
      });
    };

    const frame = window.requestAnimationFrame(applyMetadata);
    return () => window.cancelAnimationFrame(frame);
  }, [location]);

  return null;
}