import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ChevronRight, Loader2, CheckCircle2, BookOpen, ExternalLink, Clock,
  Award, ChevronDown, ChevronUp, Info, GraduationCap, Target, Sparkles,
  PlayCircle, ShieldCheck, AlertCircle, Trophy, X, FileQuestion, Lock,
  SkipForward, TrendingUp, Building2, Map, BarChart2, Zap, CloudUpload, PlusCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import TestRunner from "./test-runner";
import CodingArena, { WeakAreaWidget } from "./coding-arena";
import { Code2 as CodeArenaIcon, ListChecks } from "lucide-react";
import LearningPathView from "./learning-path";
import SkillInfoPanel, { buildSkillInfo } from "./skill-info-panel";
import { COMPANY_BANK } from "@/data/company-bank";
import { PLATFORM_ADMIN_EMAIL } from "@/config/constants";

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = "entry" | "guide" | "submitted";
type SkillStatus = "not_started" | "learning" | "self_completed" | "coe_verified";

interface LevelResult { passed: boolean; score_pct: number; credits: number; }
interface SkillProgress {
  status: SkillStatus;
  started_at?: string;
  completed_at?: string;
  credits: number;
  levels?: {
    level_1?: LevelResult;
    level_2?: LevelResult;
    level_3?: LevelResult;
  };
}

// ─── Skill catalog (credits, hours, category) ─────────────────────────────────
type SkillMeta = { credits: number; hours: number; category: "Core" | "Applied" | "Domain" | "Foundational" };

const SKILL_META: Record<string, SkillMeta> = {
  // Technical Core
  "Data Structures & Algorithms": { credits: 4, hours: 80, category: "Core" },
  "OOPs Concepts": { credits: 3, hours: 30, category: "Core" },
  "Computer Networks": { credits: 3, hours: 40, category: "Core" },
  "Operating Systems": { credits: 3, hours: 40, category: "Core" },
  "DBMS": { credits: 3, hours: 35, category: "Core" },
  // Technical Applied
  "Python": { credits: 3, hours: 50, category: "Applied" },
  "SQL & Databases": { credits: 3, hours: 35, category: "Applied" },
  "React / JavaScript": { credits: 3, hours: 60, category: "Applied" },
  "Machine Learning Basics": { credits: 4, hours: 70, category: "Applied" },
  "System Design": { credits: 4, hours: 50, category: "Applied" },
  "Statistics & Probability": { credits: 3, hours: 40, category: "Applied" },
  "Data Visualisation": { credits: 2, hours: 25, category: "Applied" },
  // ECE
  "Digital Electronics": { credits: 3, hours: 45, category: "Core" },
  "Signal Processing": { credits: 3, hours: 45, category: "Core" },
  "Embedded Systems": { credits: 3, hours: 50, category: "Applied" },
  "Communication Systems": { credits: 3, hours: 40, category: "Core" },
  "VLSI Design": { credits: 4, hours: 65, category: "Applied" },
  "Microprocessors": { credits: 3, hours: 35, category: "Core" },
  // Mech / Civil
  "Engineering Drawing": { credits: 2, hours: 25, category: "Foundational" },
  "Thermodynamics": { credits: 3, hours: 40, category: "Core" },
  "CAD/CAM": { credits: 3, hours: 50, category: "Applied" },
  "Manufacturing Processes": { credits: 3, hours: 35, category: "Core" },
  "Fluid Mechanics": { credits: 3, hours: 40, category: "Core" },
  "Strength of Materials": { credits: 3, hours: 35, category: "Core" },
  "Structural Analysis": { credits: 3, hours: 40, category: "Core" },
  "Surveying": { credits: 2, hours: 25, category: "Applied" },
  "Concrete Technology": { credits: 2, hours: 30, category: "Applied" },
  "AutoCAD": { credits: 2, hours: 30, category: "Applied" },
  "Environmental Engineering": { credits: 3, hours: 35, category: "Core" },
  // Business
  "Marketing Fundamentals": { credits: 3, hours: 30, category: "Domain" },
  "Financial Accounting": { credits: 3, hours: 40, category: "Domain" },
  "Business Communication": { credits: 2, hours: 20, category: "Foundational" },
  "Excel & Data Analysis": { credits: 2, hours: 25, category: "Foundational" },
  "Digital Marketing": { credits: 3, hours: 30, category: "Domain" },
  "HR Management": { credits: 3, hours: 30, category: "Domain" },
  "Operations Management": { credits: 3, hours: 30, category: "Domain" },
  "Business Strategy": { credits: 3, hours: 30, category: "Domain" },
  "Presentation Skills": { credits: 2, hours: 15, category: "Foundational" },
  "Taxation Basics": { credits: 3, hours: 30, category: "Domain" },
  "Tally & Accounting Software": { credits: 2, hours: 25, category: "Applied" },
  "Business Law": { credits: 3, hours: 30, category: "Domain" },
  "Cost Accounting": { credits: 3, hours: 30, category: "Domain" },
  "Excel for Finance": { credits: 2, hours: 20, category: "Applied" },
  "Auditing Basics": { credits: 3, hours: 30, category: "Domain" },
  // Design
  "Figma": { credits: 2, hours: 25, category: "Applied" },
  "Visual Design Principles": { credits: 3, hours: 30, category: "Domain" },
  "Typography": { credits: 2, hours: 15, category: "Domain" },
  "Prototyping & Wireframing": { credits: 3, hours: 30, category: "Applied" },
  "User Research Basics": { credits: 2, hours: 20, category: "Domain" },
  "Adobe Illustrator": { credits: 2, hours: 25, category: "Applied" },
  "Color Theory": { credits: 2, hours: 15, category: "Domain" },
  // Universal
  "Aptitude & Logical Reasoning": { credits: 2, hours: 30, category: "Foundational" },
  "Communication Skills": { credits: 2, hours: 20, category: "Foundational" },
  "Technical Communication": { credits: 2, hours: 20, category: "Foundational" },
  // CS — Software Engineering specialization
  "Software Development Life Cycle": { credits: 3, hours: 40, category: "Applied" },
  "Agile & Scrum Methodology": { credits: 3, hours: 30, category: "Applied" },
  "Full Stack Development (MERN)": { credits: 4, hours: 80, category: "Applied" },
  "REST API Design": { credits: 3, hours: 40, category: "Applied" },
  "DevOps & CI/CD": { credits: 4, hours: 60, category: "Applied" },
  "Git & Version Control": { credits: 2, hours: 20, category: "Foundational" },
  "Testing & QA": { credits: 3, hours: 35, category: "Applied" },
  "Cloud Computing (AWS/GCP)": { credits: 4, hours: 55, category: "Applied" },
  "Docker & Kubernetes": { credits: 3, hours: 45, category: "Applied" },
  // CS — Cyber Security specialization
  "Network Security Fundamentals": { credits: 4, hours: 60, category: "Core" },
  "Ethical Hacking & Penetration Testing": { credits: 4, hours: 80, category: "Applied" },
  "Cryptography Basics": { credits: 3, hours: 45, category: "Core" },
  "Linux & Command Line": { credits: 3, hours: 40, category: "Applied" },
  "Web Application Security (OWASP)": { credits: 4, hours: 60, category: "Applied" },
  "SIEM & Security Tools": { credits: 3, hours: 50, category: "Applied" },
  "Digital Forensics": { credits: 3, hours: 40, category: "Applied" },
  "Cloud Security": { credits: 3, hours: 45, category: "Applied" },
  "Incident Response": { credits: 3, hours: 35, category: "Applied" },
  "Python for Security Scripting": { credits: 3, hours: 50, category: "Applied" },
  "Risk Management & Compliance": { credits: 2, hours: 30, category: "Domain" },
  // AI & Data Science
  "Python for Data Science": { credits: 4, hours: 60, category: "Applied" },
  "Machine Learning": { credits: 4, hours: 80, category: "Applied" },
  "Deep Learning & Neural Networks": { credits: 4, hours: 70, category: "Applied" },
  "Natural Language Processing": { credits: 3, hours: 55, category: "Applied" },
  "Data Visualisation (Power BI / Tableau)": { credits: 3, hours: 40, category: "Applied" },
  "SQL & Big Data": { credits: 3, hours: 40, category: "Applied" },
  "Computer Vision": { credits: 3, hours: 50, category: "Applied" },
  "Feature Engineering": { credits: 3, hours: 35, category: "Applied" },
  "MLOps & Model Deployment": { credits: 4, hours: 55, category: "Applied" },
  "Research Paper Reading": { credits: 2, hours: 25, category: "Foundational" },
  // Robotics & Automation
  "Robotics Fundamentals": { credits: 4, hours: 60, category: "Core" },
  "ROS (Robot Operating System)": { credits: 4, hours: 70, category: "Applied" },
  "Control Systems": { credits: 3, hours: 50, category: "Core" },
  "Embedded Systems & Arduino": { credits: 3, hours: 55, category: "Applied" },
  "PLC Programming": { credits: 3, hours: 45, category: "Applied" },
  "Computer Vision for Robotics": { credits: 4, hours: 60, category: "Applied" },
  "3D Modelling (SolidWorks/AutoCAD)": { credits: 3, hours: 40, category: "Applied" },
  "Python & C++ for Robotics": { credits: 3, hours: 50, category: "Applied" },
  "Sensors & Actuators": { credits: 3, hours: 40, category: "Core" },
  "IoT & Industry 4.0": { credits: 3, hours: 45, category: "Applied" },
  "Mechatronics": { credits: 3, hours: 40, category: "Core" },
  // ECE (updated names)
  "Electronic Circuits & Devices": { credits: 4, hours: 60, category: "Core" },
  "Signal Processing (DSP)": { credits: 3, hours: 50, category: "Core" },
  "Microcontrollers (Arduino/Raspberry Pi)": { credits: 3, hours: 45, category: "Applied" },
  "PCB Design (Altium/KiCad)": { credits: 3, hours: 40, category: "Applied" },
  "Python / MATLAB": { credits: 3, hours: 40, category: "Applied" },
  "IoT Development": { credits: 3, hours: 45, category: "Applied" },
  "Wireless Networks & Protocols": { credits: 3, hours: 40, category: "Applied" },
};

function getMeta(skill: string): SkillMeta {
  if (SKILL_META[skill]) return SKILL_META[skill];
  for (const key of Object.keys(SKILL_META)) {
    if (skill.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(skill.toLowerCase())) {
      return SKILL_META[key];
    }
  }
  return { credits: 2, hours: 25, category: "Applied" };
}

const SKILL_LISTS: Record<string, string[]> = {
  "B.Tech Computer Science": ["Python Programming", "Data Structures & Algorithms", "SQL & Databases", "React / JavaScript", "Machine Learning Basics", "System Design", "OOPs Concepts", "Computer Networks", "Operating Systems", "DBMS", "Aptitude & Logical Reasoning", "Communication Skills"],
  "B.Tech CS — Software Engineering": ["Software Development Life Cycle", "Agile & Scrum Methodology", "Full Stack Development (MERN)", "REST API Design", "DevOps & CI/CD", "Git & Version Control", "Testing & QA", "Cloud Computing (AWS/GCP)", "Docker & Kubernetes", "System Design", "Data Structures & Algorithms", "Aptitude & Logical Reasoning"],
  "B.Tech CS — Cyber Security": ["Network Security Fundamentals", "Ethical Hacking & Penetration Testing", "Cryptography Basics", "Linux & Command Line", "Web Application Security (OWASP)", "SIEM & Security Tools", "Digital Forensics", "Cloud Security", "Incident Response", "Python for Security Scripting", "Risk Management & Compliance", "Communication Skills"],
  "B.Tech AI & Data Science": ["Python for Data Science", "Machine Learning", "Deep Learning & Neural Networks", "Natural Language Processing", "Data Visualisation (Power BI / Tableau)", "Statistics & Probability", "SQL & Big Data", "Computer Vision", "Feature Engineering", "MLOps & Model Deployment", "Research Paper Reading", "Communication Skills"],
  "B.Tech Robotics & Automation": ["Robotics Fundamentals", "ROS (Robot Operating System)", "Control Systems", "Embedded Systems & Arduino", "PLC Programming", "Computer Vision for Robotics", "3D Modelling (SolidWorks/AutoCAD)", "Python & C++ for Robotics", "Sensors & Actuators", "IoT & Industry 4.0", "Mechatronics", "Technical Communication"],
  "B.Tech IT": ["Python Programming", "Data Structures & Algorithms", "SQL & Databases", "React / JavaScript", "Cloud Computing (AWS/GCP)", "System Design", "OOPs Concepts", "Computer Networks", "DBMS", "Cybersecurity Basics", "Aptitude & Logical Reasoning", "Communication Skills"],
  "B.Tech ECE": ["Electronic Circuits & Devices", "Embedded Systems", "Signal Processing (DSP)", "VLSI Design", "Communication Systems", "Microcontrollers (Arduino/Raspberry Pi)", "PCB Design (Altium/KiCad)", "Python / MATLAB", "IoT Development", "Wireless Networks & Protocols", "Aptitude & Logical Reasoning", "Technical Communication"],
  "B.Tech Mechanical": ["Engineering Drawing", "Thermodynamics", "CAD/CAM", "Manufacturing Processes", "Fluid Mechanics", "Strength of Materials", "Aptitude & Logical Reasoning", "Communication Skills"],
  "B.Tech Civil": ["Structural Analysis", "Surveying", "Concrete Technology", "AutoCAD", "Environmental Engineering", "Aptitude & Logical Reasoning", "Communication Skills"],
  "BBA": ["Marketing Fundamentals", "Financial Accounting", "Business Communication", "Excel & Data Analysis", "Digital Marketing", "HR Management", "Operations Management", "Business Strategy", "Presentation Skills"],
  "MBA": ["Marketing Fundamentals", "Financial Accounting", "Business Communication", "Excel & Data Analysis", "Digital Marketing", "HR Management", "Operations Management", "Business Strategy", "Presentation Skills"],
  "B.Com": ["Financial Accounting", "Taxation Basics", "Tally & Accounting Software", "Business Law", "Cost Accounting", "Excel for Finance", "Auditing Basics"],
  "B.Design UI/UX": ["Figma", "Visual Design Principles", "Typography", "Prototyping & Wireframing", "User Research Basics", "Adobe Illustrator", "Color Theory"],
  "B.Design Fashion": ["Figma", "Visual Design Principles", "Typography", "Prototyping & Wireframing", "User Research Basics", "Adobe Illustrator", "Color Theory"],
  "B.Sc Data Science": ["Python for Data Science", "Statistics & Probability", "Machine Learning", "SQL & Big Data", "Data Visualisation (Power BI / Tableau)", "Excel & Data Analysis", "Communication Skills"],
};

const TARGET_ROLES: Record<string, string[]> = {
  "B.Tech Computer Science": ["Software Engineer", "Data Analyst", "Full Stack Developer", "ML Engineer", "DevOps Engineer", "Business Analyst"],
  "B.Tech CS — Software Engineering": ["Software Engineer", "Full Stack Developer", "DevOps Engineer", "Backend Engineer", "Cloud Engineer", "QA Engineer"],
  "B.Tech CS — Cyber Security": ["Security Analyst", "Penetration Tester", "Security Engineer", "SOC Analyst", "Cloud Security Engineer", "Digital Forensics Analyst"],
  "B.Tech AI & Data Science": ["Data Scientist", "ML Engineer", "AI Research Engineer", "NLP Engineer", "Computer Vision Engineer", "MLOps Engineer"],
  "B.Tech Robotics & Automation": ["Robotics Engineer", "Automation Engineer", "Control Systems Engineer", "ROS Developer", "IoT Engineer", "Mechatronics Engineer"],
  "B.Tech IT": ["Software Engineer", "Data Analyst", "Full Stack Developer", "Cloud Engineer", "DevOps Engineer", "Business Analyst"],
  "B.Tech ECE": ["Embedded Engineer", "VLSI Design Engineer", "IoT Developer", "RF Engineer", "PCB Design Engineer", "Signal Processing Engineer"],
  "B.Tech Mechanical": ["Design Engineer", "Manufacturing Engineer", "CAD Engineer", "Product Manager", "Operations Engineer"],
  "B.Tech Civil": ["Site Engineer", "Structural Engineer", "Project Manager", "Urban Planner"],
  "BBA": ["Marketing Executive", "HR Executive", "Business Analyst", "Finance Analyst", "Operations Manager"],
  "MBA": ["Marketing Manager", "HR Manager", "Business Analyst", "Finance Manager", "Strategy Consultant"],
  "B.Com": ["Accounts Executive", "Financial Analyst", "Audit Associate", "Tax Consultant"],
  "B.Design UI/UX": ["UI/UX Designer", "Product Designer", "Graphic Designer", "Motion Designer"],
  "B.Design Fashion": ["Fashion Designer", "Visual Merchandiser", "Graphic Designer", "Brand Designer"],
  "B.Sc Data Science": ["Data Analyst", "Data Scientist", "ML Engineer", "Business Intelligence Analyst"],
};

const RESOURCE_MAP: Record<string, Array<{ title: string; url: string; platform: string; type: "free" | "paid" | "practice" }>> = {
  "Python": [
    { title: "Python for Everybody", url: "https://www.coursera.org/specializations/python", platform: "Coursera", type: "paid" },
    { title: "CS50P – Harvard Free", url: "https://cs50.harvard.edu/python/", platform: "Harvard", type: "free" },
    { title: "Python Practice Track", url: "https://www.hackerrank.com/domains/python", platform: "HackerRank", type: "practice" },
  ],
  "Data Structures & Algorithms": [
    { title: "DSA Masterclass", url: "https://www.udemy.com/course/datastructurescncpp/", platform: "Udemy", type: "paid" },
    { title: "NPTEL DSA Course", url: "https://nptel.ac.in/courses/106102064", platform: "NPTEL", type: "free" },
    { title: "Blind 75 Practice", url: "https://leetcode.com/discuss/general-discussion/460599/", platform: "LeetCode", type: "practice" },
  ],
  "SQL & Databases": [
    { title: "SQL for Data Analysis", url: "https://www.coursera.org/learn/sql-for-data-science", platform: "Coursera", type: "paid" },
    { title: "SQLZoo Interactive", url: "https://sqlzoo.net/", platform: "SQLZoo", type: "free" },
    { title: "HackerRank SQL", url: "https://www.hackerrank.com/domains/sql", platform: "HackerRank", type: "practice" },
  ],
  "React / JavaScript": [
    { title: "The Odin Project", url: "https://www.theodinproject.com/", platform: "Odin Project", type: "free" },
    { title: "React Official Docs", url: "https://react.dev/learn", platform: "React Team", type: "free" },
    { title: "Frontend Mentor Challenges", url: "https://www.frontendmentor.io/", platform: "Frontend Mentor", type: "practice" },
  ],
  "Machine Learning Basics": [
    { title: "Andrew Ng ML Course", url: "https://www.coursera.org/specializations/machine-learning-introduction", platform: "Coursera", type: "paid" },
    { title: "Fast.ai Practical DL", url: "https://course.fast.ai/", platform: "Fast.ai", type: "free" },
    { title: "Kaggle Learn ML", url: "https://www.kaggle.com/learn", platform: "Kaggle", type: "practice" },
  ],
  "System Design": [
    { title: "System Design Primer", url: "https://github.com/donnemartin/system-design-primer", platform: "GitHub", type: "free" },
    { title: "Grokking System Design", url: "https://www.educative.io/courses/grokking-modern-system-design-interview", platform: "Educative", type: "paid" },
    { title: "ByteByteGo", url: "https://bytebytego.com/", platform: "ByteByteGo", type: "paid" },
  ],
  "OOPs Concepts": [
    { title: "OOP with Python", url: "https://realpython.com/python3-object-oriented-programming/", platform: "Real Python", type: "free" },
    { title: "NPTEL OOP Java", url: "https://nptel.ac.in/courses/106105153", platform: "NPTEL", type: "free" },
    { title: "OOP Practice Problems", url: "https://www.geeksforgeeks.org/object-oriented-programming-in-cpp/", platform: "GFG", type: "practice" },
  ],
  "Computer Networks": [
    { title: "Computer Networking", url: "https://www.coursera.org/learn/computer-networking", platform: "Coursera", type: "paid" },
    { title: "GATE Networks Notes", url: "https://www.geeksforgeeks.org/computer-network-tutorials/", platform: "GFG", type: "free" },
  ],
  "Operating Systems": [
    { title: "OS Concepts (Galvin)", url: "https://www.os-book.com/OS10/", platform: "Official", type: "free" },
    { title: "NPTEL OS", url: "https://nptel.ac.in/courses/106106144", platform: "NPTEL", type: "free" },
  ],
  "DBMS": [
    { title: "Database Management Systems", url: "https://nptel.ac.in/courses/106105175", platform: "NPTEL", type: "free" },
    { title: "DBMS GFG", url: "https://www.geeksforgeeks.org/dbms/", platform: "GFG", type: "free" },
  ],
  "Marketing Fundamentals": [
    { title: "Google Digital Garage", url: "https://grow.google/certificates/digital-marketing-ecommerce/", platform: "Google", type: "free" },
    { title: "Marketing Analytics", url: "https://www.coursera.org/learn/marketing-analytics", platform: "Coursera", type: "paid" },
  ],
  "Financial Accounting": [
    { title: "Accounting Foundations", url: "https://www.coursera.org/learn/uva-darden-foundations-accounting", platform: "Coursera", type: "paid" },
    { title: "Khan Academy Finance", url: "https://www.khanacademy.org/economics-finance-domain", platform: "Khan Academy", type: "free" },
  ],
  "Figma": [
    { title: "Figma Academy", url: "https://help.figma.com/hc/en-us/categories/360002042553", platform: "Figma", type: "free" },
    { title: "Designlab Figma 101", url: "https://designlab.com/figma-101-course/", platform: "Designlab", type: "free" },
  ],
  "Communication Skills": [
    { title: "Public Speaking", url: "https://www.coursera.org/learn/public-speaking", platform: "Coursera", type: "paid" },
    { title: "Improve English", url: "https://www.coursera.org/specializations/improve-english", platform: "Coursera", type: "paid" },
  ],
  "Aptitude & Logical Reasoning": [
    { title: "IndiaBix Aptitude", url: "https://www.indiabix.com/", platform: "IndiaBix", type: "free" },
    { title: "PrepInsta Aptitude", url: "https://prepinsta.com/", platform: "PrepInsta", type: "practice" },
  ],
  "Excel & Data Analysis": [
    { title: "Excel Skills for Business", url: "https://www.coursera.org/specializations/excel", platform: "Coursera", type: "paid" },
    { title: "Excel Exposure", url: "https://excelexposure.com/", platform: "Excel Exposure", type: "free" },
  ],
};

function getResources(skill: string) {
  if (RESOURCE_MAP[skill]) return RESOURCE_MAP[skill];
  for (const key of Object.keys(RESOURCE_MAP)) {
    if (skill.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(skill.toLowerCase())) {
      return RESOURCE_MAP[key];
    }
  }
  return [
    { title: `Search "${skill}" on Coursera`, url: `https://www.coursera.org/search?query=${encodeURIComponent(skill)}`, platform: "Coursera", type: "paid" as const },
    { title: `Search "${skill}" on YouTube`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(skill + " full course")}`, platform: "YouTube", type: "free" as const },
  ];
}

function getSkillList(degree: string): string[] {
  return SKILL_LISTS[degree] || SKILL_LISTS["BBA"] || [];
}
function getTargetRoles(degree: string): string[] {
  return TARGET_ROLES[degree] || ["Other"];
}

// ─── Authed fetch ─────────────────────────────────────────────────────────────
async function apiFetch(url: string, init: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
}

// ─── Status badges ────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<SkillStatus, string> = {
  not_started: "bg-gray-100 text-gray-600 border-gray-200",
  learning: "bg-blue-50 text-blue-700 border-blue-200",
  self_completed: "bg-amber-50 text-amber-700 border-amber-200",
  coe_verified: "bg-green-50 text-green-700 border-green-200",
};
const STATUS_LABELS: Record<SkillStatus, string> = {
  not_started: "Not Started",
  learning: "Learning",
  self_completed: "Self-Completed (Pending COE)",
  coe_verified: "COE Verified ✓",
};

const RESOURCE_TYPE_STYLES = {
  free: "bg-green-50 text-green-700 border-green-200",
  paid: "bg-purple-50 text-purple-700 border-purple-200",
  practice: "bg-orange-50 text-orange-700 border-orange-200",
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PlacementReadiness({
  user, initialDegree = "", initialYear = "", initialSession = null,
  roadmapSkills = [], roadmapAspirations = [], sourceLabel = "StudentXchange",
  onUpgrade,
}: {
  user: any;
  initialDegree?: string;
  initialYear?: string;
  initialSession?: any;
  // Skills pulled from the student's personal Career Roadmap (skills-only sync).
  roadmapSkills?: string[];
  roadmapAspirations?: string[];
  /** Label used in student-facing copy — "StudentXchange" for personal track, "Placement Cell" for institutional */
  sourceLabel?: string;
  /** Opens the Career Compass premium upgrade dialog (used by Coding Arena gating) */
  onUpgrade?: () => void;
}) {
  const { toast } = useToast();
  const isTester = (user?.email || "").toLowerCase() === PLATFORM_ADMIN_EMAIL.toLowerCase();

  const [phase, setPhase] = useState<Phase>("entry");
  const [degree, setDegree] = useState(initialDegree);
  const [targetRole, setTargetRole] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [progress, setProgress] = useState<Record<string, SkillProgress>>({});
  const [saving, setSaving] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingSkill, setSavingSkill] = useState<string | null>(null);

  // T001/T002: assessment + skill info panel
  const [testRunner, setTestRunner] = useState<{ skill: string; level: 1 | 2 | 3 } | null>(null);
  const [infoPanelSkill, setInfoPanelSkill] = useState<string | null>(null);
  const [learningPathSkill, setLearningPathSkill] = useState<string | null>(null);
  const [skippedTests, setSkippedTests] = useState<Set<string>>(new Set());
  const [addSkillsOpen, setAddSkillsOpen] = useState(false);
  const [pendingNewSkills, setPendingNewSkills] = useState<string[]>([]);
  // Gate auto-save until initial server-session restore is complete, otherwise
  // the entry-phase debounced save can clobber a previously saved guide phase.
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // Readiness score (35/20/25/10/10)
  const [readiness, setReadiness] = useState<{
    total: number; threshold: number; eligible: boolean;
    breakdown: Record<string, { score: number; weight: number; max: number }>;
    gaps: string[];
  } | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  // Institutional roadmap progress (read-only) surfaced inside Placement Readiness.
  const [instProgress, setInstProgress] = useState<{ score: number; done: number; total: number } | null>(null);
  // Coding Arena sub-view inside the guide phase
  const [guideView, setGuideView] = useState<"skills" | "arena">("skills");

  // Skills-only sync: when the student has a personal Career Roadmap, Placement
  // Readiness is curated from its exact skills (instead of the hardcoded lists
  // that only covered a handful of degrees).
  const fromRoadmap = roadmapSkills.length > 0;

  useEffect(() => {
    if (initialDegree && !degree) setDegree(initialDegree);
  }, [initialDegree]);

  // Preselect the roadmap's skills once hydration is done and nothing was
  // restored from a prior session. Keeps the student's roadmap as the source of
  // truth without clobbering a track they've already started.
  useEffect(() => {
    if (!fromRoadmap || !hydrated || phase !== "entry") return;
    if (selectedSkills.length === 0) setSelectedSkills(roadmapSkills);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromRoadmap, hydrated]);

  // Restore from server session (passed down from CareerCompassPage)
  useEffect(() => {
    if (initialSession) {
      const { placementPhase, placementDegree, placementTargetRole, placementCgpa, placementSelectedSkills, placementProgress } = initialSession;
      if (placementDegree) setDegree(placementDegree);
      if (placementTargetRole) setTargetRole(placementTargetRole);
      if (placementCgpa) setCgpa(placementCgpa);
      if (placementSelectedSkills?.length > 0) setSelectedSkills(placementSelectedSkills);
      if (placementProgress && Object.keys(placementProgress).length > 0) {
        const restored: Record<string, SkillProgress> = {};
        Object.entries(placementProgress).forEach(([skill, p]: [string, any]) => {
          restored[skill] = {
            status: p.status || "not_started",
            credits: p.credits || getMeta(skill).credits,
            started_at: p.started_at || undefined,
            completed_at: p.completed_at || undefined,
          };
        });
        setProgress(restored);
      }
      // Move to guide phase if they were there before
      if (placementPhase === "guide" && placementSelectedSkills?.length > 0) setPhase("guide");
    }
    // Mark hydration complete so auto-save can begin (also fires when
    // initialSession is null so first-time users still get auto-save).
    setHydrated(true);
  }, [initialSession]);

  async function saveProgressToServer() {
    if (!user || saving) return;
    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const placementProgressPayload: Record<string, any> = {};
      Object.entries(progress).forEach(([k, v]) => {
        placementProgressPayload[k] = {
          status: v.status,
          credits: v.credits,
          started_at: v.started_at || null,
          completed_at: v.completed_at || null,
        };
      });
      const r = await fetch("/api/career-compass/save-session", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          placementPhase: phase,
          placementDegree: degree,
          placementTargetRole: targetRole,
          placementCgpa: cgpa,
          placementSelectedSkills: selectedSkills,
          placementProgress: placementProgressPayload,
        }),
      });
      if (r.ok) {
        toast({ title: "Progress saved ✓", description: "Your placement track is saved. Resume anytime from any device." });
      } else {
        throw new Error("Server error");
      }
    } catch {
      toast({ title: "Couldn't save", description: "Please try again.", variant: "destructive" });
    }
    setSaving(false);
  }

  async function fetchReadinessScore() {
    if (!user) return;
    setReadinessLoading(true);
    try {
      const r = await apiFetch("/api/placement/readiness-score");
      if (r.ok) setReadiness(await r.json());
    } catch {}
    setReadinessLoading(false);
  }

  async function fetchInstitutionalProgress() {
    if (!user || !degree) return;
    try {
      const r = await apiFetch(`/api/institutional-roadmap/progress?degree=${encodeURIComponent(degree)}`);
      if (!r.ok) { setInstProgress(null); return; }
      const d = await r.json();
      const status: Record<string, string> = d.skillStatus || {};
      const vals = Object.values(status);
      const total = vals.length;
      const done = vals.filter((v) => v === "done").length;
      if (total === 0) { setInstProgress(null); return; }
      setInstProgress({ score: typeof d.progressScore === "number" ? d.progressScore : Math.round((done / total) * 100), done, total });
    } catch { setInstProgress(null); }
  }

  // Load server-side skill progress (includes level results) when entering guide phase
  async function refreshSkillProgress() {
    try {
      const r = await apiFetch("/api/placement/skill-progress");
      if (!r.ok) return;
      const data = await r.json();
      const serverProgress: Record<string, SkillProgress> = {};
      for (const skill of selectedSkills) {
        const sk = skill.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 60);
        const sd = data.progress?.[sk];
        const meta = getMeta(skill);
        if (sd) {
          serverProgress[skill] = {
            status: sd.status || "not_started",
            credits: meta.credits,
            levels: sd.levels || {},
          };
        } else {
          serverProgress[skill] = progress[skill] || { status: "not_started", credits: meta.credits };
        }
      }
      setProgress(serverProgress);
    } catch {}
  }

  useEffect(() => {
    if (phase === "guide" && selectedSkills.length > 0) {
      refreshSkillProgress();
      fetchReadinessScore();
      fetchInstitutionalProgress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, selectedSkills.length]);

  // ── Computed ──────────────────────────────────────────────────────────────
  const totalCredits = selectedSkills.reduce((sum, s) => sum + getMeta(s).credits, 0);
  const earnedCredits = selectedSkills.reduce((sum, s) => {
    const p = progress[s];
    if (p && (p.status === "self_completed" || p.status === "coe_verified")) return sum + getMeta(s).credits;
    return sum;
  }, 0);
  const verifiedCredits = selectedSkills.reduce((sum, s) => {
    const p = progress[s];
    if (p && p.status === "coe_verified") return sum + getMeta(s).credits;
    return sum;
  }, 0);
  const creditPct = totalCredits > 0 ? Math.round((earnedCredits / totalCredits) * 100) : 0;
  const eligibleForShortlist = creditPct >= 70;

  // ── Persist placement state to career-compass session (used for resume) ───
  async function persistPlacementSession(overrides: Partial<{
    phase: Phase; degree: string; targetRole: string; cgpa: string;
    selectedSkills: string[]; progress: Record<string, SkillProgress>;
  }> = {}, opts: { retry?: boolean } = { retry: true }): Promise<boolean> {
    if (!user) return false;
    const effectiveProgress = overrides.progress ?? progress;
    const placementProgressPayload: Record<string, any> = {};
    Object.entries(effectiveProgress).forEach(([k, v]) => {
      placementProgressPayload[k] = {
        status: v.status, credits: v.credits,
        started_at: v.started_at || null, completed_at: v.completed_at || null,
      };
    });
    const body = JSON.stringify({
      placementPhase: overrides.phase ?? phase,
      placementDegree: overrides.degree ?? degree,
      placementTargetRole: overrides.targetRole ?? targetRole,
      placementCgpa: overrides.cgpa ?? cgpa,
      placementSelectedSkills: overrides.selectedSkills ?? selectedSkills,
      placementProgress: placementProgressPayload,
    });
    setSaveStatus("saving");
    const attempt = async (): Promise<boolean> => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const r = await fetch("/api/career-compass/save-session", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body,
        });
        return r.ok;
      } catch { return false; }
    };
    let ok = await attempt();
    if (!ok && opts.retry) {
      // One quick retry handles transient network blips & token refreshes
      await new Promise(r => setTimeout(r, 600));
      ok = await attempt();
    }
    setSaveStatus(ok ? "saved" : "error");
    if (ok) setLastSavedAt(Date.now());
    return ok;
  }

  // Auto-save entry-phase fields (debounced) so partial form data isn't lost.
  // Gated on `hydrated` to prevent clobbering server state during initial restore.
  useEffect(() => {
    if (!hydrated || phase !== "entry" || !user) return;
    if (!degree && !targetRole && !cgpa && selectedSkills.length === 0) return;
    const t = setTimeout(() => { persistPlacementSession(); }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [degree, targetRole, cgpa, selectedSkills, phase, user, hydrated]);

  // Last-chance save when the user closes the tab / navigates away.
  // sendBeacon survives unload where fetch() would be aborted.
  useEffect(() => {
    if (!user) return;
    const flush = () => {
      try {
        const placementProgressPayload: Record<string, any> = {};
        Object.entries(progress).forEach(([k, v]) => {
          placementProgressPayload[k] = {
            status: v.status, credits: v.credits,
            started_at: v.started_at || null, completed_at: v.completed_at || null,
          };
        });
        const body = JSON.stringify({
          placementPhase: phase, placementDegree: degree, placementTargetRole: targetRole,
          placementCgpa: cgpa, placementSelectedSkills: selectedSkills,
          placementProgress: placementProgressPayload,
          // Beacon can't set Authorization headers, so include uid hint server can use
          // (server still trusts session/cookie/Bearer for normal saves; beacon is best-effort).
          _beaconUid: user.uid,
        });
        navigator.sendBeacon?.("/api/career-compass/save-session", new Blob([body], { type: "application/json" }));
      } catch {}
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, [user, phase, degree, targetRole, cgpa, selectedSkills, progress]);

  // ── Save profile + move to guide ───────────────────────────────────────────
  async function startGuide() {
    if (!degree) { toast({ title: "Please select your degree" }); return; }
    if (!targetRole) { toast({ title: "Please select your target role" }); return; }
    if (!cgpa) { toast({ title: "Please enter your current CGPA" }); return; }
    if (selectedSkills.length === 0) { toast({ title: "Please select at least one skill to develop" }); return; }

    try {
      await apiFetch("/api/placement/save-profile", {
        method: "POST",
        body: JSON.stringify({ degree, target_role: targetRole, self_reported_cgpa: cgpa, skills_selected: selectedSkills }),
      });
    } catch {}

    const initialProgress: Record<string, SkillProgress> = {};
    selectedSkills.forEach(s => {
      initialProgress[s] = { status: "not_started", credits: getMeta(s).credits };
    });
    setProgress(initialProgress);
    setPhase("guide");
    // Persist phase=guide + all fields so user lands here on next visit.
    // Await so we only confirm "saved" after the server actually accepted it.
    const ok = await persistPlacementSession({ phase: "guide", progress: initialProgress });
    if (ok) {
      toast({ title: "Profile saved ✓", description: "You can leave anytime — your progress is safe and you'll resume right here." });
    } else {
      toast({ title: "Couldn't save your profile", description: "You can keep going, but please check your connection and try Save Info.", variant: "destructive" });
    }
  }

  // ── Add more skills to existing track ─────────────────────────────────────
  function confirmAddSkills() {
    if (pendingNewSkills.length === 0) { setAddSkillsOpen(false); return; }
    const merged = Array.from(new Set([...selectedSkills, ...pendingNewSkills]));
    const newProgress = { ...progress };
    pendingNewSkills.forEach(s => {
      if (!newProgress[s]) newProgress[s] = { status: "not_started", credits: getMeta(s).credits };
    });
    setSelectedSkills(merged);
    setProgress(newProgress);
    setAddSkillsOpen(false);
    setPendingNewSkills([]);
    persistPlacementSession({ selectedSkills: merged, progress: newProgress });
    toast({ title: `${pendingNewSkills.length} skill${pendingNewSkills.length === 1 ? "" : "s"} added`, description: "Your placement track is updated." });
  }

  async function updateSkillStatus(skill: string, newStatus: SkillStatus) {
    const meta = getMeta(skill);
    setSavingSkill(skill);
    setProgress(prev => ({
      ...prev,
      [skill]: {
        ...prev[skill],
        status: newStatus,
        credits: meta.credits,
        ...(newStatus === "learning" && !prev[skill]?.started_at ? { started_at: new Date().toISOString() } : {}),
        ...(newStatus === "self_completed" ? { completed_at: new Date().toISOString() } : {}),
      },
    }));

    try {
      await apiFetch("/api/placement/update-skill-status", {
        method: "POST",
        body: JSON.stringify({ skill, status: newStatus, credits: meta.credits }),
      });
    } catch (err: any) {
      toast({ title: "Couldn't save status", description: "Your progress is tracked locally. Try again later.", variant: "destructive" });
    }
    setSavingSkill(null);
  }

  async function submitForVerification() {
    if (creditPct < 70) {
      toast({ title: "Not yet eligible", description: `You need at least 70% credits earned (currently ${creditPct}%).`, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const skillsSummary: Record<string, any> = {};
      selectedSkills.forEach(s => {
        const p = progress[s];
        skillsSummary[s] = {
          status: p?.status || "not_started",
          credits_earned: (p?.status === "self_completed" || p?.status === "coe_verified") ? getMeta(s).credits : 0,
          credits_total: getMeta(s).credits,
        };
      });

      const r = await apiFetch("/api/placement/save-result", {
        method: "POST",
        body: JSON.stringify({
          degree, target_role: targetRole,
          self_reported_cgpa: cgpa,
          name: user?.displayName || user?.email?.split("@")[0] || "Student",
          university: "ADYPU", batch: "2025",
        }),
      });
      if (!r.ok) {
        const errBody = await r.json().catch(() => ({}));
        throw new Error(errBody.error || "Submission failed");
      }

      setPhase("submitted");
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    }
    setSubmitting(false);
  }

  // ── Tester (platform admin) quick-jump: skip setup, land in guide/arena ────
  function testerQuickJump(view: "skills" | "arena") {
    const d = degree || "B.Tech Computer Science";
    const skills = selectedSkills.length > 0 ? selectedSkills : getSkillList(d).slice(0, 6);
    const roles = getTargetRoles(d);
    if (!degree) setDegree(d);
    if (!targetRole) setTargetRole(roles.find(r => r !== "Other") || roles[0] || "Other");
    if (!cgpa) setCgpa("8.0");
    setSelectedSkills(skills);
    const initialProgress: Record<string, SkillProgress> = { ...progress };
    skills.forEach(s => {
      if (!initialProgress[s]) initialProgress[s] = { status: "not_started", credits: getMeta(s).credits };
    });
    setProgress(initialProgress);
    setGuideView(view);
    setPhase("guide");
    toast({ title: "Tester mode", description: "Setup skipped — you're in. Use “Change degree” anytime to test another track." });
  }

  // ── ENTRY PHASE ───────────────────────────────────────────────────────────
  if (phase === "entry") {
    const skillsAvailable = fromRoadmap ? roadmapSkills : getSkillList(degree);
    const roleSet = fromRoadmap
      ? Array.from(new Set([...getTargetRoles(degree).filter(r => r !== "Other"), ...roadmapAspirations]))
      : getTargetRoles(degree);
    const rolesAvailable = roleSet.length > 0 ? roleSet : ["Other"];

    return (
      <div className="space-y-4">
        {/* Tester (platform admin) bypass */}
        {isTester && (
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 uppercase tracking-wide">
                    <ShieldCheck className="w-4 h-4" /> Admin Tester Mode
                  </div>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Skip the setup and jump straight in. Pick any degree above first (or leave blank for B.Tech CS defaults).
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" variant="outline" className="border-amber-400 text-amber-800 hover:bg-amber-100" onClick={() => testerQuickJump("skills")}>
                    <SkipForward className="w-3.5 h-3.5 mr-1.5" /> Skip to Track
                  </Button>
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => testerQuickJump("arena")}>
                    <CodeArenaIcon className="w-3.5 h-3.5 mr-1.5" /> Open Coding Arena
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* How it works banner */}
        <Card className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 border-indigo-200">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="bg-indigo-100 rounded-lg p-2 flex-shrink-0">
                <Info className="w-5 h-5 text-indigo-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-900 mb-1.5">How Placement Readiness works</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  This is a <strong>self-paced skill-development guide</strong> that maps every skill companies look for in your degree, with curated free + paid courses for each.
                  You learn on your own, mark each skill as completed, and earn <strong>college credits</strong> tied to your placement eligibility.
                  The actual placement exam is conducted separately by recruiting companies — this system tracks your preparation accountability with the {sourceLabel} placement cell.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-indigo-600" />
              <h2 className="text-xl font-bold text-gray-900">Set up your placement track</h2>
            </div>

            {fromRoadmap ? (
              <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Map className="w-4 h-4 text-sky-600 flex-shrink-0" />
                  <span className="text-xs font-bold text-sky-700 uppercase tracking-wide">Synced from your Career Roadmap</span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  These skills are pulled straight from your <strong>{degree || "Career Roadmap"}</strong> roadmap, so your placement track matches exactly what you're learning. You still prove each one here via the skill test or COE verification.
                </p>
              </div>
            ) : (
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">Degree / Branch</label>
                <select
                  value={degree}
                  onChange={e => { setDegree(e.target.value); setSelectedSkills([]); setTargetRole(""); }}
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Select your degree…</option>
                  <optgroup label="B.Tech Computer Science">
                    <option value="B.Tech Computer Science">B.Tech CS — General</option>
                    <option value="B.Tech CS — Software Engineering">B.Tech CS — Software Engineering</option>
                    <option value="B.Tech CS — Cyber Security">B.Tech CS — Cyber Security</option>
                  </optgroup>
                  <option value="B.Tech AI & Data Science">B.Tech AI &amp; Data Science (AIDS)</option>
                  <option value="B.Tech Robotics & Automation">B.Tech Robotics &amp; Automation</option>
                  <option value="B.Tech IT">B.Tech IT</option>
                  <option value="B.Tech ECE">B.Tech ECE</option>
                  <option value="B.Tech Mechanical">B.Tech Mechanical</option>
                  <option value="B.Tech Civil">B.Tech Civil</option>
                  <option value="BBA">BBA</option>
                  <option value="MBA">MBA</option>
                  <option value="B.Com">B.Com</option>
                  <option value="B.Design UI/UX">B.Design UI/UX</option>
                  <option value="B.Design Fashion">B.Design Fashion</option>
                  <option value="B.Sc Data Science">B.Sc Data Science</option>
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">Target Role</label>
              <select
                value={targetRole}
                onChange={e => setTargetRole(e.target.value)}
                disabled={!degree}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">Select target role…</option>
                {rolesAvailable.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">Current CGPA</label>
              <input
                type="text"
                value={cgpa}
                onChange={e => setCgpa(e.target.value)}
                placeholder="e.g. 7.5 (out of 10)"
                className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <p className="text-[11px] text-gray-500 mt-1">Your COE office will verify this from your transcript.</p>
            </div>

            {skillsAvailable.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">{fromRoadmap ? "Skills from your roadmap" : "Skills you want to develop"}</label>
                  <span className="text-[11px] text-gray-500">{selectedSkills.length} selected • {selectedSkills.reduce((s, k) => s + getMeta(k).credits, 0)} credits</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {skillsAvailable.map(s => {
                    const meta = getMeta(s);
                    const checked = selectedSkills.includes(s);
                    return (
                      <label key={s} className={`flex items-center gap-2.5 p-2.5 border rounded-lg cursor-pointer transition-all ${checked ? "bg-indigo-50 border-indigo-300" : "bg-white border-gray-200 hover:border-indigo-200"}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => setSelectedSkills(p => e.target.checked ? [...p, s] : p.filter(x => x !== s))}
                          className="w-4 h-4 accent-indigo-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900 font-medium truncate">{s}</div>
                          <div className="text-[10px] text-gray-500">{meta.credits} credits • ~{meta.hours}h</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <Button onClick={startGuide} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-11">
              <Sparkles className="w-4 h-4 mr-2" />
              Start my placement track
            </Button>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500 -mt-1">
              {saveStatus === "saving" && (<><Loader2 className="w-3 h-3 animate-spin" /> Saving your details…</>)}
              {saveStatus === "saved" && (<><CheckCircle2 className="w-3 h-3 text-green-600" /> Saved — you can come back anytime{lastSavedAt ? ` (just now)` : ""}.</>)}
              {saveStatus === "error" && (
                <button onClick={() => persistPlacementSession()} className="flex items-center gap-1 text-red-600 hover:underline">
                  <AlertCircle className="w-3 h-3" /> Couldn't save — tap to retry
                </button>
              )}
              {saveStatus === "idle" && (<><CloudUpload className="w-3 h-3" /> Your inputs save automatically as you type.</>)}
            </div>
          </CardContent>
        </Card>

        {/* Company Problems — filtered by selected skills */}
        {selectedSkills.length > 0 && (() => {
          const matchingCompanies = COMPANY_BANK.filter(co =>
            co.recommendedSkills.some(rs =>
              selectedSkills.some(ss =>
                ss.toLowerCase().includes(rs.toLowerCase()) || rs.toLowerCase().includes(ss.toLowerCase())
              )
            )
          ).slice(0, 6);
          if (!matchingCompanies.length) return null;
          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-gray-800">Companies hiring for your skills</h3>
                </div>
                <Link href="/lancing/company-problem-bank" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                  View all 19 <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {matchingCompanies.map(co => (
                  <Card key={co.id} className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-xl">{co.logoEmoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-gray-900">{co.name}</span>
                            <Badge className={`text-[9px] px-1.5 py-0 ${co.tier === "FAANG" ? "bg-orange-50 text-orange-700 border-orange-200" : co.tier === "Tier 1" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                              {co.tier}
                            </Badge>
                          </div>
                          <div className="text-[10px] text-gray-500 mt-0.5">{co.ctcRange}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {co.topicsTested.slice(0, 3).map(t => (
                          <span key={t} className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-1.5 py-0.5">{t}</span>
                        ))}
                      </div>
                      <div className="text-[10px] text-gray-500">CGPA ≥ {co.eligibility.minCgpa} · {co.hiringSeason}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Career Compass CTA */}
        <Card className="bg-gradient-to-br from-sky-50 via-indigo-50 to-purple-50 border-indigo-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="bg-indigo-100 rounded-xl p-2.5 flex-shrink-0">
                <Map className="w-5 h-5 text-indigo-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-900 mb-1">Need a full 4-year career roadmap?</h3>
                <p className="text-xs text-gray-600 mb-3">Career Compass generates a personalised year-by-year plan powered by AI — skills to learn, internships to target, and companies to apply to based on your degree and aspirations.</p>
                <Link href="/lancing/career-compass">
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8">
                    <Map className="w-3.5 h-3.5 mr-1.5" /> Open Career Compass
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── SUBMITTED PHASE ───────────────────────────────────────────────────────
  if (phase === "submitted") {
    return (
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Submitted to {sourceLabel} Placement Cell</h2>
            <p className="text-gray-600 mt-1.5 text-sm max-w-md mx-auto">
              Your profile has been sent to the placement cell. They will verify your CGPA and the skills you've marked complete, then add you to the official placement shortlist.
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 max-w-md mx-auto text-left space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-600">Credits earned</span><span className="font-bold text-gray-900">{earnedCredits} / {totalCredits}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">Verified credits</span><span className="font-bold text-gray-900">{verifiedCredits} / {totalCredits}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">Status</span><Badge className="bg-amber-100 text-amber-800 border-amber-300">Pending Review</Badge></div>
          </div>
          <Button variant="outline" onClick={() => setPhase("guide")} className="border-gray-300">
            Back to my track
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── GUIDE PHASE (main dashboard) ──────────────────────────────────────────
  const BREAKDOWN_META: Record<string, { label: string; icon: string; color: string }> = {
    skills:          { label: "Skills Completed",    icon: "🎓", color: "text-indigo-600" },
    portal_activity: { label: "Portal Activity",      icon: "⚡",  color: "text-amber-600" },
    profile:         { label: "Profile Completeness", icon: "👤", color: "text-blue-600" },
    cgpa:            { label: "CGPA Score",           icon: "📊", color: "text-green-600" },
    coding:          { label: "Coding Practice",      icon: "💻", color: "text-purple-600" },
  };

  const skillsByCategory: Record<string, string[]> = {};
  selectedSkills.forEach(s => {
    const cat = getMeta(s).category;
    if (!skillsByCategory[cat]) skillsByCategory[cat] = [];
    skillsByCategory[cat].push(s);
  });

  const CATEGORY_ORDER: Array<keyof typeof skillsByCategory> = ["Core", "Applied", "Domain", "Foundational"];
  const CATEGORY_LABELS: Record<string, string> = {
    Core: "🎯 Technical Core",
    Applied: "⚙️ Applied Skills",
    Domain: "💼 Domain Knowledge",
    Foundational: "🧠 Foundational Skills",
  };

  return (
    <div className="space-y-4">
      {/* Skills Track / Coding Arena sub-tabs */}
      <div className="flex items-center gap-1.5 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setGuideView("skills")}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${guideView === "skills" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <ListChecks className="w-3.5 h-3.5" /> Skills Track
        </button>
        <button
          onClick={() => setGuideView("arena")}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${guideView === "arena" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <CodeArenaIcon className="w-3.5 h-3.5" /> Coding Arena
        </button>
        {isTester && (
          <button
            onClick={() => setPhase("entry")}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-amber-700 hover:bg-amber-50 transition-colors"
            title="Tester: go back to setup to switch degree"
          >
            <SkipForward className="w-3.5 h-3.5 rotate-180" /> Change degree
          </button>
        )}
      </div>

      {guideView === "arena" ? (
        <CodingArena user={user} onUpgrade={onUpgrade} />
      ) : (
      <>
      {/* Top progress card */}
      <Card className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white border-0 shadow-lg">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white/70 uppercase tracking-wide font-semibold">Your Placement Track</div>
              <div className="text-xl font-bold truncate">{degree} • {targetRole}</div>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <div className="text-right">
                <div className="text-3xl font-bold">{readiness ? `${readiness.total}%` : `${creditPct}%`}</div>
                <div className="text-xs text-white/70">{readiness ? "readiness score" : "credits earned"}</div>
              </div>
              {/* Save Info button */}
              <button
                onClick={saveProgressToServer}
                disabled={saving}
                className="flex items-center gap-1.5 text-[11px] font-semibold bg-white/15 hover:bg-white/25 border border-white/30 text-white px-2.5 py-1 rounded-lg transition-colors disabled:opacity-60"
                title="Save your placement progress to the cloud"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CloudUpload className="w-3 h-3" />}
                Save Info
              </button>
            </div>
          </div>
          <Progress value={readiness ? readiness.total : creditPct} className="h-2 bg-white/20" />
          <div className="flex items-center justify-between mt-2 text-xs flex-wrap gap-1">
            <span className="text-white/80">{earnedCredits} of {totalCredits} skill credits</span>
            <span className="text-white/80">{verifiedCredits} verified</span>
            <span className={`font-bold ${(readiness ? readiness.eligible : eligibleForShortlist) ? "text-green-200" : "text-amber-200"}`}>
              {(readiness ? readiness.eligible : eligibleForShortlist)
                ? "✓ Eligible for shortlist"
                : readiness
                  ? `Need ${readiness.threshold - readiness.total}% more`
                  : `${70 - creditPct}% credits to go`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Institutional Roadmap Progress — feeds the readiness score */}
      {instProgress && (
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-gray-900">Institutional Roadmap Progress</span>
              </div>
              <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">{instProgress.score}%</Badge>
            </div>
            <Progress value={instProgress.score} className="h-2" />
            <p className="text-[11px] text-gray-600 mt-2">
              {instProgress.done} of {instProgress.total} skills completed on your institution's plan. This progress feeds directly into your Placement Readiness score below.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Placement Readiness Score Breakdown */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-bold text-gray-900">Placement Readiness Score</span>
              {readiness && (
                <Badge className={`text-[10px] ${readiness.eligible ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                  {readiness.total}% / {readiness.threshold}%
                </Badge>
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={fetchReadinessScore} disabled={readinessLoading} className="text-xs h-7 px-2">
              {readinessLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}
              Refresh
            </Button>
          </div>
          {readinessLoading && !readiness && (
            <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Calculating your score…
            </div>
          )}
          {readiness && (
            <>
              <div className="space-y-2.5">
                {Object.entries(readiness.breakdown).filter(([key]) => key !== "coe_credits").map(([key, b]) => {
                  const meta = BREAKDOWN_META[key] || { label: key, icon: "📌", color: "text-gray-600" };
                  const pct = Math.round((b.score / b.max) * 100);
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1 text-xs">
                        <span className="flex items-center gap-1.5">
                          <span>{meta.icon}</span>
                          <span className="text-gray-700 font-medium">{meta.label}</span>
                          <span className="text-gray-400">({b.weight}% weight)</span>
                        </span>
                        <span className={`font-bold ${meta.color}`}>{b.score}/{b.max}</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
              {readiness.gaps.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Gap-closing plan</p>
                  {readiness.gaps.map((g, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-amber-800 bg-amber-50 rounded-lg px-2.5 py-1.5">
                      <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-500" />
                      {g}
                    </div>
                  ))}
                </div>
              )}
              {readiness.eligible && (
                <div className="mt-3 flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2 text-xs text-green-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  You meet the 70% threshold — Apply Now buttons are unlocked across the platform.
                </div>
              )}
            </>
          )}
          {!readiness && !readinessLoading && (
            <p className="text-xs text-gray-400 py-1">Complete your profile and mark skills to see your score.</p>
          )}
        </CardContent>
      </Card>

      {/* Coding Arena weak-area widget — coding feeds 10% of the readiness score */}
      <WeakAreaWidget onPractice={() => setGuideView("arena")} />

      {/* How it works (collapsible) */}
      <Card className="bg-blue-50 border-blue-200">
        <button onClick={() => setHowItWorksOpen(o => !o)} className="w-full p-4 flex items-center justify-between text-left">
          <div className="flex items-center gap-2.5">
            <Info className="w-5 h-5 text-blue-700" />
            <span className="text-sm font-bold text-blue-900">How this works — read before you start</span>
          </div>
          {howItWorksOpen ? <ChevronUp className="w-4 h-4 text-blue-700" /> : <ChevronDown className="w-4 h-4 text-blue-700" />}
        </button>
        {howItWorksOpen && (
          <CardContent className="px-4 pb-4 pt-0 text-sm text-blue-900/90 space-y-2.5 leading-relaxed">
            <div className="flex gap-2.5"><span className="font-bold text-blue-700 flex-shrink-0">1.</span><span><strong>This is a learning guide, not a test.</strong> We don't grade you — you study the linked courses on your own time and mark each skill as completed when you genuinely feel ready.</span></div>
            <div className="flex gap-2.5"><span className="font-bold text-blue-700 flex-shrink-0">2.</span><span>Each skill carries <strong>credit points</strong> that count toward your placement eligibility. The credit weight reflects how much companies care about that skill for your target role.</span></div>
            <div className="flex gap-2.5"><span className="font-bold text-blue-700 flex-shrink-0">3.</span><span>When you mark a skill <strong>"Self-Completed"</strong>, your progress is sent to the {sourceLabel} placement cell for verification against course completion certificates, internal exams, or capstone projects.</span></div>
            <div className="flex gap-2.5"><span className="font-bold text-blue-700 flex-shrink-0">4.</span><span>Once you reach <strong>≥70% credits</strong>, you can submit your profile for <strong>placement shortlisting</strong>. Companies see only verified credits.</span></div>
            <div className="flex gap-2.5"><span className="font-bold text-blue-700 flex-shrink-0">5.</span><span>The <strong>actual placement exam is conducted by recruiting companies</strong> separately — this system only tracks your <em>preparation</em> accountability and shortlist eligibility.</span></div>
            <div className="flex gap-2.5"><span className="font-bold text-amber-700 flex-shrink-0"><AlertCircle className="w-4 h-4 inline" /></span><span className="text-amber-900"><strong>Be honest.</strong> Falsely marking skills as completed will be caught during verification and may flag your profile from the placement pool.</span></div>
          </CardContent>
        )}
      </Card>

      {/* Skill cards by category */}
      {CATEGORY_ORDER.map(cat => {
        const skills = skillsByCategory[cat];
        if (!skills || skills.length === 0) return null;
        return (
          <div key={cat} className="space-y-2">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide px-1">{CATEGORY_LABELS[cat]}</h3>
            <div className="space-y-2">
              {skills.map(skill => {
                const meta = getMeta(skill);
                const p = progress[skill] || { status: "not_started", credits: meta.credits };
                const isSaving = savingSkill === skill;
                const lvls = p.levels || {};
                const earnedFromTests =
                  (lvls.level_1?.passed ? lvls.level_1.credits : 0) +
                  (lvls.level_2?.passed ? lvls.level_2.credits : 0) +
                  (lvls.level_3?.passed ? lvls.level_3.credits : 0);

                return (
                  <Card key={skill} className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className="text-base font-bold text-gray-900">{skill}</h4>
                            <Badge className={`${STATUS_STYLES[p.status]} text-[10px] font-semibold border`}>
                              {STATUS_LABELS[p.status]}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                            <span className="flex items-center gap-1"><Award className="w-3 h-3" /> {meta.credits} credits</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ~{meta.hours} hours</span>
                            {earnedFromTests > 0 && (
                              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                                <Trophy className="w-3 h-3" /> +{earnedFromTests} test credits
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setLearningPathSkill(skill)} className="text-xs h-7 px-2" title="AI-generated week-by-week plan">
                            <BookOpen className="w-3 h-3 mr-1" /> Path
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setInfoPanelSkill(skill)} className="text-xs h-7 px-2">
                            <Info className="w-3 h-3 mr-1" /> Info
                          </Button>
                        </div>
                      </div>

                      {/* Level assessment buttons */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        {([1, 2, 3] as const).map(L => {
                          const lk = `level_${L}` as "level_1" | "level_2" | "level_3";
                          const prevK = L > 1 ? (`level_${L - 1}` as "level_1" | "level_2") : null;
                          const result = lvls[lk];
                          const passed = !!result?.passed;
                          const skippedKey = `${skill}_L${L}`;
                          const isSkipped = skippedTests.has(skippedKey);
                          const locked = prevK ? (!lvls[prevK]?.passed && !skippedTests.has(`${skill}_L${L - 1}`)) : false;
                          if (isSkipped && !passed) {
                            return (
                              <Badge key={L} className="text-[10px] bg-gray-50 text-gray-400 border-gray-200 h-7 px-2 flex items-center gap-1">
                                <SkipForward className="w-2.5 h-2.5" /> L{L} skipped
                                <button onClick={() => setSkippedTests(p => { const n = new Set(p); n.delete(skippedKey); return n; })} className="ml-1 hover:text-gray-600">×</button>
                              </Badge>
                            );
                          }
                          return (
                            <div key={L} className="flex items-center gap-0.5">
                              <Button
                                size="sm"
                                variant={passed ? "default" : "outline"}
                                disabled={locked}
                                onClick={() => setTestRunner({ skill, level: L })}
                                className={`text-[11px] h-7 px-2 ${passed ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
                                title={locked ? `Pass Level ${L - 1} first` : passed ? `Passed at ${result?.score_pct}%` : `Take Level ${L} assessment`}
                              >
                                {locked ? <Lock className="w-3 h-3 mr-1" /> : passed ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <FileQuestion className="w-3 h-3 mr-1" />}
                                L{L}{passed ? ` ✓` : locked ? "" : " Test"}
                              </Button>
                              {!passed && !locked && (
                                <button
                                  onClick={() => setSkippedTests(p => new Set(Array.from(p).concat(skippedKey)))}
                                  className="text-[9px] text-gray-400 hover:text-gray-600 px-1 h-7 flex items-center"
                                  title="Skip this test"
                                >
                                  <SkipForward className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                        <span className="text-[9px] text-gray-400 ml-1">Tests are optional — skip anytime</span>
                      </div>

                      {/* Self-paced status row (parallel to assessments) */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {p.status === "not_started" && (
                          <Button size="sm" onClick={() => updateSkillStatus(skill, "learning")} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                            {isSaving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <PlayCircle className="w-3 h-3 mr-1" />}
                            Start Learning
                          </Button>
                        )}
                        {p.status === "learning" && (
                          <>
                            <Button size="sm" onClick={() => updateSkillStatus(skill, "self_completed")} disabled={isSaving} className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
                              {isSaving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                              Mark as Self-Completed
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => updateSkillStatus(skill, "not_started")} disabled={isSaving} className="text-xs">
                              <X className="w-3 h-3 mr-1" /> Reset
                            </Button>
                          </>
                        )}
                        {p.status === "self_completed" && (
                          <>
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[11px] py-1">
                              <Clock className="w-3 h-3 mr-1" /> Awaiting COE verification
                            </Badge>
                            <Button size="sm" variant="ghost" onClick={() => updateSkillStatus(skill, "learning")} disabled={isSaving} className="text-xs text-gray-600">
                              <X className="w-3 h-3 mr-1" /> Still learning
                            </Button>
                          </>
                        )}
                        {p.status === "coe_verified" && (
                          <Badge className="bg-green-50 text-green-700 border-green-200 text-[11px] py-1">
                            <ShieldCheck className="w-3 h-3 mr-1" /> Verified by COE
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Add more skills */}
      <Card className="bg-white border-dashed border-2 border-indigo-200 hover:border-indigo-400 transition-colors">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="bg-indigo-50 rounded-lg p-2 flex-shrink-0">
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-gray-900">Want to add more skills to your track?</div>
              <div className="text-xs text-gray-500">Pick more skills from your degree's recommended list — credits add up.</div>
            </div>
          </div>
          <Button size="sm" onClick={() => { setPendingNewSkills([]); setAddSkillsOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex-shrink-0">
            <PlusCircle className="w-3.5 h-3.5 mr-1" /> Add skills
          </Button>
        </CardContent>
      </Card>

      {/* Add-skills picker modal */}
      {addSkillsOpen && (() => {
        const remaining = (fromRoadmap ? roadmapSkills : getSkillList(degree)).filter(s => !selectedSkills.includes(s));
        return (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3" onClick={() => setAddSkillsOpen(false)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-gray-200 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Add more skills</h3>
                  <p className="text-xs text-gray-500 mt-0.5">From your {degree || "degree"} recommended list. {pendingNewSkills.length} selected.</p>
                </div>
                <button onClick={() => setAddSkillsOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-400" /></button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                {remaining.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">You've already added every skill recommended for {degree || "your degree"}. 🎉</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {remaining.map(s => {
                      const meta = getMeta(s);
                      const checked = pendingNewSkills.includes(s);
                      return (
                        <label key={s} className={`flex items-center gap-2.5 p-2.5 border rounded-lg cursor-pointer transition-all ${checked ? "bg-indigo-50 border-indigo-300" : "bg-white border-gray-200 hover:border-indigo-200"}`}>
                          <input type="checkbox" checked={checked} onChange={e => setPendingNewSkills(p => e.target.checked ? [...p, s] : p.filter(x => x !== s))} className="w-4 h-4 accent-indigo-600" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-900 font-medium truncate">{s}</div>
                            <div className="text-[10px] text-gray-500">{meta.credits} credits • ~{meta.hours}h • {meta.category}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-gray-200 flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setAddSkillsOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={confirmAddSkills} disabled={pendingNewSkills.length === 0} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Add {pendingNewSkills.length || ""} skill{pendingNewSkills.length === 1 ? "" : "s"}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Career Compass + Company Bank quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-sky-50 to-indigo-50 border-indigo-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Map className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-bold text-gray-900">Career Compass</span>
            </div>
            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
              Get your personalised AI-powered 4-year roadmap — skills, internships, and companies tailored to your degree and goals.
            </p>
            <Link href="/lancing/career-compass">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 w-full">
                <Map className="w-3.5 h-3.5 mr-1.5" /> Open Career Compass
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-amber-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-bold text-gray-900">Company Problem Bank</span>
            </div>
            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
              Explore FAANG, Tier 1 and Tier 2 company interview rounds, problem sets, eligibility and CTC ranges.
            </p>
            <Link href="/lancing/company-problem-bank">
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white text-xs h-8 w-full">
                <Building2 className="w-3.5 h-3.5 mr-1.5" /> View 19 Companies
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Submit CTA */}
      <Card className={`border-2 ${eligibleForShortlist ? "border-green-300 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
        <CardContent className="p-5 text-center">
          {eligibleForShortlist ? (
            <>
              <Trophy className="w-10 h-10 text-green-600 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-gray-900">You're eligible for placement shortlisting</h3>
              <p className="text-sm text-gray-600 mb-4">Submit your profile to the {sourceLabel} placement cell. The COE office will verify your skill completion and add you to the official shortlist.</p>
              <Button onClick={submitForVerification} disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white font-semibold">
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : <><GraduationCap className="w-4 h-4 mr-2" /> Submit to Placement Cell</>}
              </Button>
            </>
          ) : (
            <>
              <Target className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-gray-900">Keep going — {70 - creditPct}% credits to go</h3>
              <p className="text-sm text-gray-600">Complete more skills to unlock placement shortlisting. You need at least 70% credits earned. Pick a skill above and start learning.</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* T002: Skill Info Panel modal */}
      {infoPanelSkill && (() => {
        const meta = getMeta(infoPanelSkill);
        const info = buildSkillInfo({
          skill: infoPanelSkill,
          credits: meta.credits,
          hours: meta.hours,
          resources: getResources(infoPanelSkill),
        });
        const skillToOpen = infoPanelSkill;
        return (
          <SkillInfoPanel
            info={info}
            onClose={() => setInfoPanelSkill(null)}
            onStartLearning={() => {
              updateSkillStatus(skillToOpen, "learning");
              setInfoPanelSkill(null);
            }}
            onMarkCompleted={() => {
              setInfoPanelSkill(null);
              setTestRunner({ skill: skillToOpen, level: 1 });
            }}
            hideAddToRoadmap
          />
        );
      })()}

      {/* T001: Test Runner modal */}
      {testRunner && (
        <TestRunner
          skill={testRunner.skill}
          level={testRunner.level}
          onClose={() => { setTestRunner(null); refreshSkillProgress(); }}
          onResult={() => { /* refresh happens onClose */ }}
        />
      )}

      {/* T003: Learning Path modal */}
      {learningPathSkill && (
        <LearningPathView
          skill={learningPathSkill}
          onClose={() => setLearningPathSkill(null)}
          onTakeAssessment={() => setTestRunner({ skill: learningPathSkill, level: 1 })}
        />
      )}
      </>
      )}
    </div>
  );
}
