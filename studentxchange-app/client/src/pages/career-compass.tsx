import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_ADMIN_EMAIL } from "@/config/constants";
import { displayInstitutionName } from "@/lib/institution-display";
import { DEGREE_GROUPS, CAREER_SECTORS, CAREER_GOALS, searchCareerGoals, findCareerGoal } from "@shared/career-data";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, ArrowRight, Map, CheckCircle2, BookOpen, Lock,
  Target, Zap, Loader2, Download, Users, TrendingUp,
  BarChart2, Award, Star, ChevronRight, Sparkles, GraduationCap,
  Building2, Trophy, CloudUpload, Clock, RotateCcw, AlertTriangle,
  Bell, X, Search, Filter, ChevronDown, FileText, Shield, Contact, Briefcase,
  Pencil, User, CalendarCheck, PenLine,
} from "lucide-react";
import MyExamsContent from "@/components/lancing/my-exams-content";
import { useToast } from "@/hooks/use-toast";
import { useLancingAuth } from "@/hooks/use-lancing-auth";
import { auth, storage, firestore } from "@/lib/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc, getDoc, onSnapshot, collection, updateDoc, serverTimestamp } from "firebase/firestore";
import PlacementReadiness from "@/components/lancing/placement-readiness";
import RoadmapView from "@/components/lancing/roadmap-view";
import CareerTrackLanding from "@/components/lancing/career-track-landing";
import CareerCompassPlanModal from "@/components/lancing/career-compass-plan-modal";
import CareerCompassUpgradeDialog from "@/components/lancing/career-compass-upgrade-dialog";
import { useCareerSubscription } from "@/hooks/use-career-subscription";
import { useCareerPricing } from "@/hooks/use-career-pricing";
import { queryClient } from "@/lib/queryClient";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LearningResource {
  type: "NPTEL" | "YouTube" | "Platform" | "Coursera" | "Udemy" | "Book" | string;
  title: string;
  url: string;
  duration?: string;
  credit_eligible?: boolean;
  free?: boolean;
}
interface RoadmapSkill {
  name: string;
  priority: "high" | "medium" | "low";
  by_when: string;
  category?: string;
  estimated_hours?: number;
  credit_points?: number;
  why_it_matters?: string;
  learning_resources?: LearningResource[];
}
interface RoadmapCourse {
  name: string;
  platform: string;
  url: string;
  free: boolean;
}
interface RoadmapYear {
  year_number: number;
  label: string;
  semester_label?: string;
  skills: RoadmapSkill[];
  courses?: RoadmapCourse[];
  targets: string[];
  studentlancing_fit: { type: string; description: string };
}
interface Roadmap {
  years: RoadmapYear[];
  overall_summary: string;
  top_3_immediate_actions: string[];
}

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "PG 1st Year", "PG 2nd Year"];
const COMMITMENT_LABELS = ["Just exploring", "Building skills", "Actively applying", "Ready to work"];
const HOURS_OPTIONS = ["< 5 hrs", "5–10 hrs", "10–20 hrs", "20+ hrs"];
const POPULAR_CAREER_GOALS = [
  "Software Engineer", "AI Engineer", "Data Scientist", "UI/UX Designer",
  "Financial Analyst", "Doctor / Physician", "Lawyer / Advocate",
  "Entrepreneur / Founder", "Professional Athlete", "Still Exploring", "Other",
];

const PRESET_INSTITUTIONS = [
  "Vedam Institute of Technology",
  "ADYPU",
  "ADYPU - School of Engineering (SOE)",
  "ADYPU - AERO",
  "Bharati Vidyapeeth College of Engineering for Women",
];

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Chandigarh", "Ladakh", "J&K", "Puducherry",
];

const SKILLS_BY_BRANCH: Record<string, { name: string; credits: number; hours: number }[]> = {

  // ── Engineering & Technology ──────────────────────────────────────────────
  "B.Tech Computer Science": [
    { name: "Python Programming", credits: 3, hours: 50 },
    { name: "Data Structures & Algorithms", credits: 4, hours: 80 },
    { name: "SQL & Databases", credits: 3, hours: 35 },
    { name: "React / JavaScript", credits: 3, hours: 60 },
    { name: "Machine Learning Basics", credits: 4, hours: 70 },
    { name: "System Design", credits: 4, hours: 50 },
    { name: "OOPs Concepts", credits: 3, hours: 30 },
    { name: "Computer Networks", credits: 3, hours: 40 },
    { name: "Operating Systems", credits: 3, hours: 40 },
    { name: "DBMS", credits: 3, hours: 35 },
    { name: "Aptitude & Logical Reasoning", credits: 2, hours: 30 },
    { name: "Communication Skills", credits: 2, hours: 20 },
  ],
  "B.Tech CS — Software Engineering": [
    { name: "Software Development Life Cycle", credits: 3, hours: 40 },
    { name: "Agile & Scrum Methodology", credits: 3, hours: 30 },
    { name: "Full Stack Development (MERN)", credits: 4, hours: 80 },
    { name: "REST API Design", credits: 3, hours: 40 },
    { name: "DevOps & CI/CD", credits: 4, hours: 60 },
    { name: "Git & Version Control", credits: 2, hours: 20 },
    { name: "Testing & QA", credits: 3, hours: 35 },
    { name: "Cloud Computing (AWS/GCP)", credits: 4, hours: 55 },
    { name: "Docker & Kubernetes", credits: 3, hours: 45 },
    { name: "System Design", credits: 4, hours: 50 },
    { name: "Data Structures & Algorithms", credits: 4, hours: 80 },
    { name: "Aptitude & Logical Reasoning", credits: 2, hours: 30 },
  ],
  "B.Tech CS — Cyber Security": [
    { name: "Network Security Fundamentals", credits: 4, hours: 60 },
    { name: "Ethical Hacking & Penetration Testing", credits: 4, hours: 80 },
    { name: "Cryptography Basics", credits: 3, hours: 45 },
    { name: "Linux & Command Line", credits: 3, hours: 40 },
    { name: "Web Application Security (OWASP)", credits: 4, hours: 60 },
    { name: "SIEM & Security Tools", credits: 3, hours: 50 },
    { name: "Digital Forensics", credits: 3, hours: 40 },
    { name: "Cloud Security", credits: 3, hours: 45 },
    { name: "Incident Response", credits: 3, hours: 35 },
    { name: "Python for Security Scripting", credits: 3, hours: 50 },
    { name: "Risk Management & Compliance", credits: 2, hours: 30 },
    { name: "Communication Skills", credits: 2, hours: 20 },
  ],
  "B.Tech CS — AI & Machine Learning": [
    { name: "Python for AI/ML", credits: 4, hours: 60 },
    { name: "Machine Learning Algorithms", credits: 4, hours: 80 },
    { name: "Deep Learning & Neural Networks", credits: 4, hours: 70 },
    { name: "Natural Language Processing", credits: 3, hours: 55 },
    { name: "Computer Vision", credits: 3, hours: 50 },
    { name: "Statistics & Probability", credits: 3, hours: 50 },
    { name: "MLOps & Model Deployment", credits: 4, hours: 55 },
    { name: "Data Structures & Algorithms", credits: 4, hours: 70 },
    { name: "Research Paper Reading & Writing", credits: 2, hours: 25 },
    { name: "Communication Skills", credits: 2, hours: 20 },
  ],
  "B.Tech CS — Data Science": [
    { name: "Python for Data Science", credits: 4, hours: 60 },
    { name: "Machine Learning", credits: 4, hours: 70 },
    { name: "Statistics & Probability", credits: 3, hours: 50 },
    { name: "SQL & Big Data (Spark/Hadoop)", credits: 3, hours: 45 },
    { name: "Data Visualisation (Power BI / Tableau)", credits: 3, hours: 40 },
    { name: "Feature Engineering", credits: 3, hours: 35 },
    { name: "Deep Learning Basics", credits: 3, hours: 50 },
    { name: "Data Structures & Algorithms", credits: 3, hours: 60 },
    { name: "Communication Skills", credits: 2, hours: 20 },
    { name: "Aptitude & Logical Reasoning", credits: 2, hours: 30 },
  ],
  "B.Tech CSE — AR/VR": [
    { name: "Unity Development", credits: 4, hours: 70 },
    { name: "Unreal Engine", credits: 4, hours: 70 },
    { name: "C# Programming", credits: 4, hours: 60 },
    { name: "3D Modelling with Blender", credits: 3, hours: 55 },
    { name: "AR Foundation & ARCore", credits: 4, hours: 60 },
    { name: "VR Interaction Design", credits: 3, hours: 45 },
    { name: "Computer Graphics", credits: 4, hours: 60 },
    { name: "Spatial Computing Fundamentals", credits: 3, hours: 45 },
    { name: "Game Physics & Animation", credits: 3, hours: 50 },
    { name: "XR User Experience Design", credits: 3, hours: 40 },
    { name: "Data Structures & Algorithms", credits: 4, hours: 70 },
    { name: "Communication Skills", credits: 2, hours: 20 },
  ],
  "B.Tech AI & Data Science": [
    { name: "Python for Data Science", credits: 4, hours: 60 },
    { name: "Machine Learning", credits: 4, hours: 80 },
    { name: "Deep Learning & Neural Networks", credits: 4, hours: 70 },
    { name: "Natural Language Processing", credits: 3, hours: 55 },
    { name: "Data Visualisation (Power BI / Tableau)", credits: 3, hours: 40 },
    { name: "Statistics & Probability", credits: 3, hours: 50 },
    { name: "SQL & Big Data", credits: 3, hours: 40 },
    { name: "Computer Vision", credits: 3, hours: 50 },
    { name: "Feature Engineering", credits: 3, hours: 35 },
    { name: "MLOps & Model Deployment", credits: 4, hours: 55 },
    { name: "Research Paper Reading", credits: 2, hours: 25 },
    { name: "Communication Skills", credits: 2, hours: 20 },
  ],
  "B.Tech Robotics & Automation": [
    { name: "Robotics Fundamentals", credits: 4, hours: 60 },
    { name: "ROS (Robot Operating System)", credits: 4, hours: 70 },
    { name: "Control Systems", credits: 3, hours: 50 },
    { name: "Embedded Systems & Arduino", credits: 3, hours: 55 },
    { name: "PLC Programming", credits: 3, hours: 45 },
    { name: "Computer Vision for Robotics", credits: 4, hours: 60 },
    { name: "3D Modelling (SolidWorks/AutoCAD)", credits: 3, hours: 40 },
    { name: "Python & C++ for Robotics", credits: 3, hours: 50 },
    { name: "Sensors & Actuators", credits: 3, hours: 40 },
    { name: "IoT & Industry 4.0", credits: 3, hours: 45 },
    { name: "Mechatronics", credits: 3, hours: 40 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Tech IT": [
    { name: "Data Structures & Algorithms", credits: 4, hours: 80 },
    { name: "OOPs Concepts", credits: 3, hours: 30 },
    { name: "DBMS", credits: 3, hours: 35 },
    { name: "Computer Networks", credits: 3, hours: 40 },
    { name: "Python Programming", credits: 3, hours: 50 },
    { name: "React / JavaScript", credits: 3, hours: 60 },
    { name: "Cloud Computing (AWS/GCP)", credits: 3, hours: 45 },
    { name: "Cybersecurity Basics", credits: 2, hours: 30 },
    { name: "System Design", credits: 3, hours: 50 },
    { name: "Aptitude & Logical Reasoning", credits: 2, hours: 30 },
    { name: "Communication Skills", credits: 2, hours: 20 },
  ],
  "B.Tech ECE": [
    { name: "Electronic Circuits & Devices", credits: 4, hours: 60 },
    { name: "Embedded Systems", credits: 3, hours: 55 },
    { name: "Signal Processing (DSP)", credits: 3, hours: 50 },
    { name: "VLSI Design", credits: 4, hours: 65 },
    { name: "Communication Systems", credits: 3, hours: 50 },
    { name: "Microcontrollers (Arduino/Raspberry Pi)", credits: 3, hours: 45 },
    { name: "PCB Design (Altium/KiCad)", credits: 3, hours: 40 },
    { name: "Python / MATLAB", credits: 3, hours: 40 },
    { name: "IoT Development", credits: 3, hours: 45 },
    { name: "Wireless Networks & Protocols", credits: 3, hours: 40 },
    { name: "Aptitude & Logical Reasoning", credits: 2, hours: 30 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Tech Electrical (EE)": [
    { name: "Circuit Theory & Networks", credits: 4, hours: 60 },
    { name: "Electrical Machines", credits: 4, hours: 65 },
    { name: "Power Systems", credits: 4, hours: 60 },
    { name: "Control Systems", credits: 3, hours: 50 },
    { name: "Power Electronics", credits: 3, hours: 50 },
    { name: "MATLAB / Simulink", credits: 3, hours: 40 },
    { name: "Renewable Energy Systems", credits: 3, hours: 40 },
    { name: "PLC & Industrial Automation", credits: 3, hours: 45 },
    { name: "Electrical Safety & Standards", credits: 2, hours: 25 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Tech Electrical & Electronics (EEE)": [
    { name: "Circuit Theory & Networks", credits: 4, hours: 60 },
    { name: "Electrical Machines", credits: 4, hours: 60 },
    { name: "Power Systems Analysis", credits: 3, hours: 55 },
    { name: "Control Systems", credits: 3, hours: 50 },
    { name: "Power Electronics & Drives", credits: 3, hours: 50 },
    { name: "Embedded Systems", credits: 3, hours: 45 },
    { name: "MATLAB / Simulink", credits: 3, hours: 40 },
    { name: "Renewable Energy & Smart Grid", credits: 3, hours: 40 },
    { name: "Aptitude & Logical Reasoning", credits: 2, hours: 30 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Tech Electronics & Instrumentation": [
    { name: "Electronic Circuits", credits: 4, hours: 60 },
    { name: "Sensors & Transducers", credits: 3, hours: 50 },
    { name: "Process Control & Instrumentation", credits: 4, hours: 55 },
    { name: "Signal & Systems", credits: 3, hours: 45 },
    { name: "Microcontrollers & Embedded Systems", credits: 3, hours: 50 },
    { name: "SCADA & PLC", credits: 3, hours: 45 },
    { name: "Biomedical Instrumentation", credits: 3, hours: 40 },
    { name: "MATLAB", credits: 2, hours: 30 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Tech Instrumentation & Control": [
    { name: "Sensors & Measurement Systems", credits: 4, hours: 55 },
    { name: "Control Systems Engineering", credits: 4, hours: 60 },
    { name: "Process Instrumentation", credits: 3, hours: 50 },
    { name: "PLC & SCADA", credits: 3, hours: 45 },
    { name: "Industrial Automation", credits: 3, hours: 45 },
    { name: "Signal Processing", credits: 3, hours: 40 },
    { name: "MATLAB / LabVIEW", credits: 3, hours: 40 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Tech Mechanical": [
    { name: "Thermodynamics", credits: 3, hours: 50 },
    { name: "Fluid Mechanics", credits: 3, hours: 45 },
    { name: "Strength of Materials", credits: 3, hours: 45 },
    { name: "Manufacturing Processes", credits: 3, hours: 40 },
    { name: "CAD/CAM (AutoCAD/SolidWorks)", credits: 4, hours: 60 },
    { name: "Engineering Drawing", credits: 2, hours: 30 },
    { name: "Finite Element Analysis (FEA)", credits: 3, hours: 40 },
    { name: "Heat Transfer", credits: 3, hours: 45 },
    { name: "Industrial Management", credits: 2, hours: 25 },
    { name: "Aptitude & Logical Reasoning", credits: 2, hours: 30 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Tech Mechatronics": [
    { name: "Mechanical Design & CAD", credits: 3, hours: 50 },
    { name: "Electronics & Circuits", credits: 3, hours: 50 },
    { name: "Embedded Systems & Microcontrollers", credits: 4, hours: 60 },
    { name: "Control Systems", credits: 3, hours: 50 },
    { name: "Robotics & Automation", credits: 4, hours: 60 },
    { name: "PLC & Industrial Automation", credits: 3, hours: 45 },
    { name: "MATLAB / Simulink", credits: 3, hours: 40 },
    { name: "Sensors & Actuators", credits: 3, hours: 40 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Tech Civil": [
    { name: "Structural Analysis", credits: 4, hours: 60 },
    { name: "Surveying", credits: 3, hours: 45 },
    { name: "Concrete Technology", credits: 3, hours: 40 },
    { name: "AutoCAD & Revit", credits: 3, hours: 45 },
    { name: "Environmental Engineering", credits: 3, hours: 40 },
    { name: "Geotechnical Engineering", credits: 3, hours: 45 },
    { name: "Construction Management", credits: 3, hours: 35 },
    { name: "Estimation & Costing", credits: 3, hours: 35 },
    { name: "Aptitude & Logical Reasoning", credits: 2, hours: 30 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Tech Aerospace Engineering": [
    { name: "Aerodynamics", credits: 4, hours: 65 },
    { name: "Flight Mechanics", credits: 4, hours: 60 },
    { name: "Aircraft Structures", credits: 4, hours: 60 },
    { name: "Propulsion Systems", credits: 3, hours: 55 },
    { name: "Control Systems", credits: 3, hours: 50 },
    { name: "CAD & CATIA", credits: 3, hours: 45 },
    { name: "MATLAB / Simulink", credits: 3, hours: 40 },
    { name: "Composite Materials", credits: 3, hours: 40 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Tech Aeronautical Engineering": [
    { name: "Aerodynamics", credits: 4, hours: 65 },
    { name: "Aircraft Performance", credits: 4, hours: 60 },
    { name: "Avionics", credits: 3, hours: 50 },
    { name: "Aircraft Maintenance (AME basics)", credits: 3, hours: 50 },
    { name: "Propulsion & Gas Turbines", credits: 4, hours: 60 },
    { name: "Aircraft Structures", credits: 4, hours: 55 },
    { name: "CATIA / SolidWorks", credits: 3, hours: 45 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Tech Automobile Engineering": [
    { name: "Automotive Engine Systems", credits: 4, hours: 60 },
    { name: "Vehicle Dynamics & Suspension", credits: 3, hours: 50 },
    { name: "Transmission & Driveline", credits: 3, hours: 45 },
    { name: "CAD (CATIA/SolidWorks)", credits: 3, hours: 45 },
    { name: "Electric Vehicles (EV) Technology", credits: 4, hours: 55 },
    { name: "Manufacturing Processes", credits: 3, hours: 40 },
    { name: "Automotive Embedded Systems", credits: 3, hours: 45 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Tech Chemical Engineering": [
    { name: "Chemical Process Principles", credits: 4, hours: 60 },
    { name: "Thermodynamics for Chemical Eng.", credits: 4, hours: 60 },
    { name: "Heat & Mass Transfer", credits: 4, hours: 60 },
    { name: "Fluid Flow Operations", credits: 3, hours: 50 },
    { name: "Reaction Engineering", credits: 4, hours: 60 },
    { name: "Process Control & Simulation", credits: 3, hours: 45 },
    { name: "HYSYS / Aspen Plus", credits: 3, hours: 40 },
    { name: "Safety & Hazard Analysis", credits: 2, hours: 30 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Tech Biomedical Engineering": [
    { name: "Human Anatomy & Physiology", credits: 3, hours: 50 },
    { name: "Biomedical Instrumentation", credits: 4, hours: 60 },
    { name: "Medical Imaging Systems", credits: 3, hours: 50 },
    { name: "Biomaterials & Biomechanics", credits: 3, hours: 45 },
    { name: "Signal Processing (Bio-signals)", credits: 3, hours: 45 },
    { name: "Embedded Systems for Medical Devices", credits: 3, hours: 45 },
    { name: "MATLAB", credits: 2, hours: 30 },
    { name: "Regulatory Affairs (FDA/CE)", credits: 2, hours: 25 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Tech Biotechnology": [
    { name: "Cell Biology & Genetics", credits: 3, hours: 50 },
    { name: "Microbiology & Immunology", credits: 3, hours: 50 },
    { name: "Biochemistry", credits: 3, hours: 45 },
    { name: "Recombinant DNA Technology", credits: 4, hours: 55 },
    { name: "Bioinformatics & Computational Biology", credits: 3, hours: 45 },
    { name: "Fermentation Technology", credits: 3, hours: 45 },
    { name: "Bioprocess Engineering", credits: 4, hours: 55 },
    { name: "Research Methodology", credits: 2, hours: 25 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Tech Industrial Engineering": [
    { name: "Operations Research", credits: 4, hours: 60 },
    { name: "Production Planning & Control", credits: 3, hours: 50 },
    { name: "Supply Chain Management", credits: 3, hours: 45 },
    { name: "Quality Management (Six Sigma)", credits: 3, hours: 45 },
    { name: "Lean Manufacturing", credits: 3, hours: 40 },
    { name: "Ergonomics & Work Study", credits: 3, hours: 40 },
    { name: "CAD / Manufacturing Systems", credits: 3, hours: 40 },
    { name: "Excel & Data Analysis", credits: 2, hours: 30 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Tech Production Engineering": [
    { name: "Manufacturing Technology", credits: 4, hours: 60 },
    { name: "Metrology & Quality Control", credits: 3, hours: 45 },
    { name: "Production Planning & Control", credits: 3, hours: 45 },
    { name: "CNC Programming", credits: 3, hours: 45 },
    { name: "CAD/CAM", credits: 4, hours: 55 },
    { name: "Lean & Six Sigma", credits: 3, hours: 40 },
    { name: "Industrial Safety", credits: 2, hours: 25 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Tech Marine Engineering": [
    { name: "Marine Diesel Engines", credits: 4, hours: 65 },
    { name: "Naval Architecture Basics", credits: 3, hours: 50 },
    { name: "Fluid Mechanics & Thermodynamics", credits: 4, hours: 60 },
    { name: "Marine Electrical Systems", credits: 3, hours: 50 },
    { name: "Ship Stability & Structures", credits: 3, hours: 50 },
    { name: "STCW Safety Training", credits: 3, hours: 40 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Tech Metallurgical Engineering": [
    { name: "Physical Metallurgy", credits: 4, hours: 60 },
    { name: "Materials Characterisation", credits: 3, hours: 50 },
    { name: "Extractive Metallurgy", credits: 4, hours: 60 },
    { name: "Heat Treatment & Processing", credits: 3, hours: 45 },
    { name: "Corrosion Science", credits: 3, hours: 40 },
    { name: "Mechanical Testing & Failure Analysis", credits: 3, hours: 40 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Tech Mining Engineering": [
    { name: "Mining Methods & Systems", credits: 4, hours: 60 },
    { name: "Rock Mechanics & Geomechanics", credits: 3, hours: 50 },
    { name: "Mine Ventilation", credits: 3, hours: 45 },
    { name: "Mineral Exploration & Geology", credits: 3, hours: 45 },
    { name: "Mine Safety & Legislation", credits: 3, hours: 40 },
    { name: "Blasting Technology", credits: 3, hours: 40 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Tech Petroleum Engineering": [
    { name: "Petroleum Geology & Reservoir Engineering", credits: 4, hours: 65 },
    { name: "Drilling Engineering", credits: 4, hours: 60 },
    { name: "Well Logging & Completion", credits: 3, hours: 50 },
    { name: "Production Operations", credits: 3, hours: 50 },
    { name: "Petroleum Refining", credits: 3, hours: 45 },
    { name: "HSE (Health, Safety & Environment)", credits: 2, hours: 30 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Tech Environmental Engineering": [
    { name: "Environmental Chemistry", credits: 3, hours: 50 },
    { name: "Water & Wastewater Treatment", credits: 4, hours: 60 },
    { name: "Air Pollution Control", credits: 3, hours: 50 },
    { name: "Solid Waste Management", credits: 3, hours: 40 },
    { name: "Environmental Impact Assessment", credits: 3, hours: 45 },
    { name: "GIS & Remote Sensing", credits: 3, hours: 40 },
    { name: "Renewable Energy Systems", credits: 3, hours: 40 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Tech Agricultural Engineering": [
    { name: "Farm Machinery & Power", credits: 4, hours: 60 },
    { name: "Soil & Water Conservation Engineering", credits: 3, hours: 50 },
    { name: "Irrigation & Drainage Engineering", credits: 3, hours: 50 },
    { name: "Post-Harvest Technology", credits: 3, hours: 45 },
    { name: "Agricultural Processing & Equipment", credits: 3, hours: 40 },
    { name: "Rural Energy & Biogas", credits: 2, hours: 30 },
    { name: "GIS for Agriculture", credits: 2, hours: 30 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Tech Food Technology": [
    { name: "Food Chemistry & Biochemistry", credits: 3, hours: 50 },
    { name: "Food Processing & Preservation", credits: 4, hours: 60 },
    { name: "Food Microbiology", credits: 3, hours: 45 },
    { name: "Food Safety & Quality (FSSAI/ISO)", credits: 3, hours: 40 },
    { name: "Dairy & Beverage Technology", credits: 3, hours: 40 },
    { name: "Packaging Technology", credits: 3, hours: 35 },
    { name: "Food Plant Design", credits: 2, hours: 30 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Tech Textile Engineering": [
    { name: "Textile Fibre Science", credits: 3, hours: 50 },
    { name: "Yarn Manufacturing (Spinning)", credits: 3, hours: 50 },
    { name: "Fabric Manufacturing (Weaving/Knitting)", credits: 3, hours: 50 },
    { name: "Textile Chemical Processing", credits: 3, hours: 45 },
    { name: "Textile Testing & Quality Control", credits: 3, hours: 40 },
    { name: "Garment Manufacturing Technology", credits: 3, hours: 40 },
    { name: "Fashion Technology Basics", credits: 2, hours: 30 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Tech Ceramic Engineering": [
    { name: "Ceramic Raw Materials & Processing", credits: 3, hours: 50 },
    { name: "Ceramic Kilns & Firing", credits: 3, hours: 45 },
    { name: "Glass Technology", credits: 3, hours: 45 },
    { name: "Refractories & Thermal Systems", credits: 3, hours: 45 },
    { name: "Material Testing & Characterisation", credits: 3, hours: 40 },
    { name: "Product Design in Ceramics", credits: 2, hours: 30 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Tech Nanotechnology": [
    { name: "Nanomaterials Synthesis & Characterisation", credits: 4, hours: 60 },
    { name: "Nanoscale Physics & Chemistry", credits: 3, hours: 50 },
    { name: "Nanofabrication Techniques", credits: 3, hours: 50 },
    { name: "Nano-Biotechnology", credits: 3, hours: 45 },
    { name: "Nano-Electronics", credits: 3, hours: 45 },
    { name: "Research Methodology", credits: 2, hours: 30 },
    { name: "Scientific Writing & Communication", credits: 2, hours: 20 },
  ],
  "B.Tech Naval Architecture & Ocean Engineering": [
    { name: "Naval Architecture & Ship Stability", credits: 4, hours: 65 },
    { name: "Marine Hydrodynamics", credits: 4, hours: 60 },
    { name: "Ship Structural Design", credits: 4, hours: 60 },
    { name: "Offshore Structures", credits: 3, hours: 50 },
    { name: "Marine Propulsion Systems", credits: 3, hours: 50 },
    { name: "CAD for Ships (AutoCAD/CADMATIC)", credits: 3, hours: 40 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Tech Power Engineering": [
    { name: "Power Plant Engineering", credits: 4, hours: 65 },
    { name: "Power Systems Analysis", credits: 4, hours: 60 },
    { name: "Renewable Energy (Solar/Wind)", credits: 4, hours: 55 },
    { name: "High Voltage Engineering", credits: 3, hours: 50 },
    { name: "Smart Grid & Energy Management", credits: 3, hours: 45 },
    { name: "MATLAB / Simulink for Power", credits: 3, hours: 40 },
    { name: "Electrical Safety Standards", credits: 2, hours: 25 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.E. (Other Branch)": [
    { name: "Engineering Mathematics", credits: 4, hours: 60 },
    { name: "Technical Drawing & CAD", credits: 3, hours: 45 },
    { name: "Basic Electrical & Electronics", credits: 3, hours: 40 },
    { name: "Programming Fundamentals (Python/C)", credits: 3, hours: 50 },
    { name: "Project Management Basics", credits: 2, hours: 30 },
    { name: "Aptitude & Logical Reasoning", credits: 2, hours: 30 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],

  // ── Computer Applications & IT ────────────────────────────────────────────
  "BCA": [
    { name: "Programming in C / C++", credits: 3, hours: 50 },
    { name: "Data Structures", credits: 3, hours: 60 },
    { name: "Python Programming", credits: 3, hours: 50 },
    { name: "DBMS & SQL", credits: 3, hours: 40 },
    { name: "Web Development (HTML/CSS/JS)", credits: 3, hours: 55 },
    { name: "React / Node.js Basics", credits: 3, hours: 50 },
    { name: "Computer Networks", credits: 3, hours: 40 },
    { name: "Operating Systems", credits: 2, hours: 30 },
    { name: "Aptitude & Logical Reasoning", credits: 2, hours: 30 },
    { name: "Communication Skills", credits: 2, hours: 20 },
  ],
  "BCA — Cloud & Security": [
    { name: "Cloud Computing (AWS / Azure / GCP)", credits: 4, hours: 60 },
    { name: "Cybersecurity Fundamentals", credits: 3, hours: 50 },
    { name: "Linux Administration", credits: 3, hours: 45 },
    { name: "Networking & Protocols", credits: 3, hours: 45 },
    { name: "Python for Automation", credits: 3, hours: 50 },
    { name: "DevOps & CI/CD Basics", credits: 3, hours: 45 },
    { name: "Ethical Hacking Basics", credits: 3, hours: 45 },
    { name: "DBMS & SQL", credits: 2, hours: 30 },
    { name: "Communication Skills", credits: 2, hours: 20 },
  ],
  "B.Sc Computer Science": [
    { name: "Programming in Python & Java", credits: 3, hours: 55 },
    { name: "Data Structures & Algorithms", credits: 4, hours: 70 },
    { name: "DBMS & SQL", credits: 3, hours: 40 },
    { name: "Computer Networks", credits: 3, hours: 40 },
    { name: "Operating Systems", credits: 3, hours: 40 },
    { name: "Web Technologies (HTML/CSS/JS)", credits: 3, hours: 50 },
    { name: "Software Engineering Basics", credits: 2, hours: 30 },
    { name: "Aptitude & Logical Reasoning", credits: 2, hours: 30 },
    { name: "Communication Skills", credits: 2, hours: 20 },
  ],
  "B.Sc IT": [
    { name: "Programming Fundamentals (Python)", credits: 3, hours: 50 },
    { name: "Web Development (HTML/CSS/JS)", credits: 3, hours: 55 },
    { name: "DBMS & SQL", credits: 3, hours: 40 },
    { name: "Networking Fundamentals", credits: 3, hours: 40 },
    { name: "Cloud Computing Basics", credits: 3, hours: 40 },
    { name: "Cybersecurity Awareness", credits: 2, hours: 30 },
    { name: "Office Tools & Excel", credits: 2, hours: 25 },
    { name: "Aptitude & Logical Reasoning", credits: 2, hours: 30 },
    { name: "Communication Skills", credits: 2, hours: 20 },
  ],
  "MCA": [
    { name: "Data Structures & Algorithms", credits: 4, hours: 80 },
    { name: "OOPs Concepts", credits: 3, hours: 30 },
    { name: "DBMS", credits: 3, hours: 35 },
    { name: "Python Programming", credits: 3, hours: 50 },
    { name: "React / JavaScript", credits: 3, hours: 60 },
    { name: "System Design", credits: 4, hours: 50 },
    { name: "Computer Networks", credits: 3, hours: 40 },
    { name: "Cloud Computing (AWS/GCP)", credits: 3, hours: 45 },
    { name: "Aptitude & Logical Reasoning", credits: 2, hours: 30 },
    { name: "Communication Skills", credits: 2, hours: 20 },
  ],
  "PGDCA": [
    { name: "Programming in C / Python", credits: 3, hours: 50 },
    { name: "MS Office & Excel Advanced", credits: 3, hours: 35 },
    { name: "DBMS & SQL", credits: 3, hours: 40 },
    { name: "Web Basics (HTML/CSS)", credits: 2, hours: 30 },
    { name: "Tally & Accounting Software", credits: 2, hours: 30 },
    { name: "Cybersecurity Awareness", credits: 2, hours: 25 },
    { name: "Communication Skills", credits: 2, hours: 20 },
  ],

  // ── Architecture & Planning ───────────────────────────────────────────────
  "B.Arch (Architecture)": [
    { name: "Architectural Design Studio", credits: 5, hours: 120 },
    { name: "Building Construction & Materials", credits: 4, hours: 60 },
    { name: "Structural Systems in Architecture", credits: 3, hours: 50 },
    { name: "AutoCAD & Revit (BIM)", credits: 4, hours: 60 },
    { name: "Environmental Design (Acoustics & HVAC)", credits: 3, hours: 45 },
    { name: "Urban Design & Planning", credits: 3, hours: 45 },
    { name: "Architectural History & Theory", credits: 2, hours: 30 },
    { name: "Portfolio Building", credits: 3, hours: 35 },
    { name: "Presentation & Communication Skills", credits: 2, hours: 20 },
  ],
  "B.Plan (Planning)": [
    { name: "Urban & Regional Planning", credits: 4, hours: 60 },
    { name: "Land Use & Zoning", credits: 3, hours: 50 },
    { name: "GIS & Remote Sensing", credits: 4, hours: 55 },
    { name: "Transportation Planning", credits: 3, hours: 45 },
    { name: "Housing & Infrastructure Planning", credits: 3, hours: 45 },
    { name: "Environmental Planning", credits: 3, hours: 45 },
    { name: "AutoCAD & Mapping Tools", credits: 3, hours: 40 },
    { name: "Research & Report Writing", credits: 2, hours: 30 },
  ],

  // ── Medicine & Surgery ────────────────────────────────────────────────────
  "MBBS": [
    { name: "Anatomy & Physiology", credits: 5, hours: 80 },
    { name: "Biochemistry & Pathology", credits: 4, hours: 70 },
    { name: "Pharmacology", credits: 4, hours: 65 },
    { name: "Microbiology & Immunology", credits: 3, hours: 55 },
    { name: "Clinical Medicine & Bedside Diagnosis", credits: 5, hours: 90 },
    { name: "Surgery Fundamentals", credits: 4, hours: 70 },
    { name: "Paediatrics & Gynaecology", credits: 3, hours: 50 },
    { name: "Community Medicine (Preventive Health)", credits: 3, hours: 45 },
    { name: "Research & Evidence-Based Medicine", credits: 2, hours: 30 },
    { name: "Medical Ethics & Communication", credits: 2, hours: 20 },
  ],
  "MD / MS (PG Medicine)": [
    { name: "Advanced Clinical Specialty Training", credits: 5, hours: 120 },
    { name: "Research Methodology & Statistics", credits: 4, hours: 60 },
    { name: "Evidence-Based Medicine", credits: 3, hours: 50 },
    { name: "Thesis / Dissertation Writing", credits: 4, hours: 80 },
    { name: "Healthcare Administration Basics", credits: 2, hours: 30 },
    { name: "Medical Ethics & Law", credits: 2, hours: 25 },
  ],

  // ── Dental, AYUSH & Allied Health ────────────────────────────────────────
  "BDS (Dental)": [
    { name: "Oral Anatomy & Dental Histology", credits: 4, hours: 60 },
    { name: "Dental Materials Science", credits: 3, hours: 50 },
    { name: "Oral Pathology & Microbiology", credits: 3, hours: 50 },
    { name: "Conservative Dentistry & Endodontics", credits: 4, hours: 65 },
    { name: "Oral Surgery", credits: 4, hours: 65 },
    { name: "Orthodontics & Periodontics", credits: 3, hours: 55 },
    { name: "Public Health Dentistry", credits: 2, hours: 35 },
    { name: "Clinical Communication Skills", credits: 2, hours: 20 },
  ],
  "BAMS (Ayurveda)": [
    { name: "Ayurvedic Principles (Samhita & Sanskrit)", credits: 3, hours: 50 },
    { name: "Dravyaguna (Ayurvedic Pharmacology)", credits: 4, hours: 60 },
    { name: "Kaya Chikitsa (Internal Medicine)", credits: 4, hours: 65 },
    { name: "Panchakarma Therapy", credits: 3, hours: 50 },
    { name: "Anatomy & Physiology (Modern)", credits: 3, hours: 50 },
    { name: "Shalya Tantra (Surgery)", credits: 3, hours: 50 },
    { name: "Research Methodology", credits: 2, hours: 30 },
    { name: "Clinical Communication Skills", credits: 2, hours: 20 },
  ],
  "BHMS (Homeopathy)": [
    { name: "Organon of Medicine (Homeopathic Philosophy)", credits: 4, hours: 60 },
    { name: "Homeopathic Materia Medica", credits: 4, hours: 65 },
    { name: "Repertory & Case Taking", credits: 4, hours: 60 },
    { name: "Anatomy & Physiology (Modern)", credits: 3, hours: 50 },
    { name: "Pathology & Diagnostics", credits: 3, hours: 50 },
    { name: "Pharmacopoeia & Pharmacy", credits: 2, hours: 35 },
    { name: "Clinical Communication Skills", credits: 2, hours: 20 },
  ],
  "BUMS (Unani)": [
    { name: "Kulliyat (Unani Principles)", credits: 4, hours: 60 },
    { name: "Ilmul Advia (Unani Pharmacology)", credits: 4, hours: 60 },
    { name: "Moalijat (Internal Medicine)", credits: 4, hours: 65 },
    { name: "Anatomy & Physiology", credits: 3, hours: 50 },
    { name: "Ilmul Jarahat (Surgery)", credits: 3, hours: 50 },
    { name: "Tahaffuzi wa Samaji Tib (Preventive)", credits: 2, hours: 35 },
    { name: "Clinical Communication Skills", credits: 2, hours: 20 },
  ],
  "BNYS (Naturopathy & Yoga)": [
    { name: "Anatomy & Physiology", credits: 3, hours: 50 },
    { name: "Yoga Therapy & Asanas", credits: 4, hours: 60 },
    { name: "Naturopathic Therapies (Hydrotherapy/Mud)", credits: 4, hours: 60 },
    { name: "Nutrition & Dietetics", credits: 3, hours: 45 },
    { name: "Community Medicine & Wellness", credits: 3, hours: 40 },
    { name: "Research Methods in Naturopathy", credits: 2, hours: 30 },
    { name: "Communication Skills", credits: 2, hours: 20 },
  ],
  "BPT (Physiotherapy)": [
    { name: "Anatomy, Physiology & Biomechanics", credits: 4, hours: 65 },
    { name: "Electrotherapy & Modalities", credits: 4, hours: 60 },
    { name: "Exercise Therapy & Therapeutic Exercise", credits: 4, hours: 60 },
    { name: "Musculoskeletal Rehabilitation", credits: 3, hours: 55 },
    { name: "Neurological Rehabilitation", credits: 3, hours: 50 },
    { name: "Sports Physiotherapy", credits: 3, hours: 45 },
    { name: "Research Methods & Evidence-Based Practice", credits: 2, hours: 30 },
    { name: "Clinical Communication Skills", credits: 2, hours: 20 },
  ],
  "BOT (Occupational Therapy)": [
    { name: "Human Anatomy & Physiology", credits: 3, hours: 55 },
    { name: "OT Theory & Models of Practice", credits: 3, hours: 50 },
    { name: "Rehabilitation of Physical Conditions", credits: 4, hours: 60 },
    { name: "Neurological Occupational Therapy", credits: 4, hours: 60 },
    { name: "Paediatric OT", credits: 3, hours: 50 },
    { name: "Mental Health Occupational Therapy", credits: 3, hours: 50 },
    { name: "Assistive Technology", credits: 2, hours: 30 },
    { name: "Clinical Communication Skills", credits: 2, hours: 20 },
  ],
  "B.Optom (Optometry)": [
    { name: "Ocular Anatomy & Physiology", credits: 3, hours: 50 },
    { name: "Optics & Refraction", credits: 4, hours: 60 },
    { name: "Dispensing Optics & Contact Lenses", credits: 3, hours: 50 },
    { name: "Ocular Disease & Pharmacology", credits: 3, hours: 50 },
    { name: "Low Vision Rehabilitation", credits: 2, hours: 35 },
    { name: "Clinical Communication Skills", credits: 2, hours: 20 },
  ],
  "BMLT (Medical Lab Technology)": [
    { name: "Clinical Biochemistry & Lab Techniques", credits: 4, hours: 60 },
    { name: "Haematology & Blood Banking", credits: 4, hours: 60 },
    { name: "Microbiology (Clinical)", credits: 3, hours: 55 },
    { name: "Histopathology & Cytology", credits: 3, hours: 50 },
    { name: "Parasitology & Immunology", credits: 3, hours: 45 },
    { name: "Lab Equipment Operation & QC", credits: 3, hours: 40 },
    { name: "Research & Lab Report Writing", credits: 2, hours: 25 },
  ],
  "B.Sc Radiology & Imaging": [
    { name: "Radiographic Anatomy", credits: 4, hours: 60 },
    { name: "X-Ray & CT Imaging Techniques", credits: 4, hours: 60 },
    { name: "MRI & Ultrasound Imaging", credits: 3, hours: 55 },
    { name: "Radiation Physics & Protection", credits: 3, hours: 50 },
    { name: "Nuclear Medicine Basics", credits: 2, hours: 35 },
    { name: "PACS & Digital Radiology", credits: 2, hours: 30 },
    { name: "Clinical Communication Skills", credits: 2, hours: 20 },
  ],

  // ── Pharmacy ──────────────────────────────────────────────────────────────
  "D.Pharmacy": [
    { name: "Pharmacognosy (Herbal & Natural Drugs)", credits: 3, hours: 45 },
    { name: "Pharmaceutics (Dosage Forms)", credits: 3, hours: 45 },
    { name: "Pharmaceutical Chemistry", credits: 3, hours: 45 },
    { name: "Pharmacology Basics", credits: 3, hours: 40 },
    { name: "Hospital & Community Pharmacy", credits: 3, hours: 40 },
    { name: "Drug Store Management", credits: 2, hours: 25 },
    { name: "Communication Skills", credits: 2, hours: 20 },
  ],
  "B.Pharmacy": [
    { name: "Pharmacology Basics", credits: 3, hours: 40 },
    { name: "Pharmaceutical Chemistry", credits: 3, hours: 40 },
    { name: "Pharmaceutics & Drug Delivery", credits: 4, hours: 55 },
    { name: "Pharmacognosy & Phytochemistry", credits: 3, hours: 45 },
    { name: "Drug Regulatory Affairs", credits: 2, hours: 25 },
    { name: "Biopharmaceutics & Pharmacokinetics", credits: 3, hours: 40 },
    { name: "Quality Assurance in Pharma", credits: 3, hours: 35 },
    { name: "Clinical Pharmacy", credits: 2, hours: 30 },
    { name: "Aptitude & Logical Reasoning", credits: 2, hours: 30 },
    { name: "Communication Skills", credits: 2, hours: 20 },
  ],
  "Pharm.D": [
    { name: "Clinical Pharmacology", credits: 4, hours: 65 },
    { name: "Hospital & Clinical Pharmacy", credits: 4, hours: 65 },
    { name: "Pharmacokinetics & Biopharmaceutics", credits: 3, hours: 50 },
    { name: "Drug Information & Literature Review", credits: 3, hours: 45 },
    { name: "Pharmacotherapy (Disease Management)", credits: 4, hours: 65 },
    { name: "Research Methods in Pharmacy", credits: 3, hours: 40 },
    { name: "Patient Counselling Skills", credits: 2, hours: 25 },
  ],
  "M.Pharmacy": [
    { name: "Advanced Pharmaceutics", credits: 4, hours: 65 },
    { name: "Advanced Pharmacology / Pharmaceutical Chemistry", credits: 4, hours: 65 },
    { name: "Drug Delivery Systems", credits: 3, hours: 50 },
    { name: "Research Methodology & Biostatistics", credits: 3, hours: 45 },
    { name: "Regulatory Affairs & Quality", credits: 3, hours: 40 },
    { name: "Dissertation / Research Project", credits: 4, hours: 80 },
    { name: "Scientific Writing & Presentation", credits: 2, hours: 25 },
  ],

  // ── Nursing & Paramedical ─────────────────────────────────────────────────
  "B.Sc Nursing": [
    { name: "Anatomy, Physiology & Microbiology", credits: 4, hours: 65 },
    { name: "Fundamentals of Nursing", credits: 4, hours: 70 },
    { name: "Medical-Surgical Nursing", credits: 4, hours: 70 },
    { name: "Paediatric & Obstetric Nursing", credits: 3, hours: 55 },
    { name: "Community Health Nursing", credits: 3, hours: 50 },
    { name: "Mental Health Nursing", credits: 3, hours: 45 },
    { name: "Nutrition, Pharmacology & Nursing Ethics", credits: 2, hours: 35 },
    { name: "Research & Clinical Communication", credits: 2, hours: 25 },
  ],
  "GNM Nursing": [
    { name: "Anatomy & Physiology", credits: 3, hours: 55 },
    { name: "Fundamentals of Nursing Practice", credits: 4, hours: 70 },
    { name: "Medical & Surgical Nursing", credits: 4, hours: 70 },
    { name: "Community Health & Midwifery", credits: 3, hours: 55 },
    { name: "Paediatric Nursing", credits: 3, hours: 45 },
    { name: "Mental Health Nursing", credits: 2, hours: 35 },
    { name: "Clinical Communication & Ethics", credits: 2, hours: 20 },
  ],
  "B.Sc Paramedical": [
    { name: "Human Anatomy & Physiology", credits: 3, hours: 55 },
    { name: "Basic Pathology & Clinical Biochemistry", credits: 3, hours: 50 },
    { name: "First Aid & Emergency Care", credits: 3, hours: 45 },
    { name: "Medical Terminology & Patient Communication", credits: 2, hours: 30 },
    { name: "Lab Techniques & Operation of Medical Instruments", credits: 3, hours: 45 },
    { name: "Healthcare Management Basics", credits: 2, hours: 25 },
    { name: "Research Aptitude & Communication", credits: 2, hours: 20 },
  ],

  // ── Sciences ──────────────────────────────────────────────────────────────
  "B.Sc Physics": [
    { name: "Classical Mechanics & Thermodynamics", credits: 4, hours: 60 },
    { name: "Electromagnetism & Optics", credits: 4, hours: 60 },
    { name: "Quantum Mechanics & Modern Physics", credits: 4, hours: 60 },
    { name: "Electronics & Instrumentation", credits: 3, hours: 50 },
    { name: "Mathematical Physics & MATLAB", credits: 3, hours: 50 },
    { name: "Research Methodology & Data Analysis", credits: 3, hours: 40 },
    { name: "Scientific Writing & Communication", credits: 2, hours: 20 },
    { name: "Aptitude & Logical Reasoning", credits: 2, hours: 30 },
  ],
  "B.Sc Chemistry": [
    { name: "Organic Chemistry", credits: 4, hours: 60 },
    { name: "Inorganic Chemistry", credits: 3, hours: 55 },
    { name: "Physical Chemistry & Thermodynamics", credits: 4, hours: 60 },
    { name: "Analytical Chemistry & Instrumentation", credits: 3, hours: 55 },
    { name: "Green Chemistry & Environmental Impact", credits: 2, hours: 35 },
    { name: "Research Methods & Lab Safety", credits: 3, hours: 45 },
    { name: "Scientific Writing & Communication", credits: 2, hours: 20 },
    { name: "Aptitude & Logical Reasoning", credits: 2, hours: 30 },
  ],
  "B.Sc Mathematics": [
    { name: "Calculus & Real Analysis", credits: 4, hours: 65 },
    { name: "Algebra & Number Theory", credits: 4, hours: 60 },
    { name: "Differential Equations", credits: 3, hours: 55 },
    { name: "Statistics & Probability", credits: 3, hours: 50 },
    { name: "Numerical Methods & MATLAB/Python", credits: 3, hours: 50 },
    { name: "Discrete Mathematics", credits: 3, hours: 45 },
    { name: "Research Methodology", credits: 2, hours: 30 },
    { name: "Communication Skills", credits: 2, hours: 20 },
  ],
  "B.Sc Statistics": [
    { name: "Probability Theory", credits: 4, hours: 60 },
    { name: "Statistical Inference", credits: 4, hours: 60 },
    { name: "Regression Analysis & Econometrics", credits: 3, hours: 55 },
    { name: "Sampling Theory", credits: 3, hours: 50 },
    { name: "Operations Research", credits: 3, hours: 45 },
    { name: "Statistical Computing (R / Python)", credits: 4, hours: 60 },
    { name: "Data Visualisation", credits: 3, hours: 40 },
    { name: "Communication Skills", credits: 2, hours: 20 },
  ],
  "B.Sc Biology": [
    { name: "Cell Biology & Genetics", credits: 4, hours: 60 },
    { name: "Botany (Plant Biology)", credits: 3, hours: 55 },
    { name: "Zoology (Animal Biology)", credits: 3, hours: 55 },
    { name: "Biochemistry", credits: 3, hours: 50 },
    { name: "Ecology & Environmental Biology", credits: 3, hours: 45 },
    { name: "Bioinformatics Basics", credits: 2, hours: 35 },
    { name: "Research Methodology & Lab Skills", credits: 2, hours: 35 },
    { name: "Communication Skills", credits: 2, hours: 20 },
  ],
  "B.Sc Botany": [
    { name: "Plant Morphology & Anatomy", credits: 3, hours: 55 },
    { name: "Plant Physiology & Biochemistry", credits: 4, hours: 60 },
    { name: "Plant Taxonomy & Systematics", credits: 3, hours: 50 },
    { name: "Genetics & Molecular Biology", credits: 4, hours: 55 },
    { name: "Plant Pathology", credits: 3, hours: 45 },
    { name: "Ecology & Conservation Biology", credits: 3, hours: 45 },
    { name: "Research Methods & Scientific Writing", credits: 2, hours: 30 },
  ],
  "B.Sc Zoology": [
    { name: "Animal Diversity & Taxonomy", credits: 3, hours: 55 },
    { name: "Cell Biology & Genetics", credits: 4, hours: 60 },
    { name: "Animal Physiology", credits: 3, hours: 55 },
    { name: "Ecology & Wildlife Biology", credits: 3, hours: 50 },
    { name: "Developmental Biology & Embryology", credits: 3, hours: 45 },
    { name: "Entomology & Parasitology", credits: 3, hours: 45 },
    { name: "Research Methods & Scientific Writing", credits: 2, hours: 30 },
  ],
  "B.Sc Microbiology": [
    { name: "Bacteriology & Virology", credits: 4, hours: 60 },
    { name: "Immunology", credits: 3, hours: 55 },
    { name: "Industrial Microbiology & Fermentation", credits: 4, hours: 60 },
    { name: "Environmental Microbiology", credits: 3, hours: 50 },
    { name: "Medical Microbiology & Diagnostics", credits: 3, hours: 50 },
    { name: "Bioinformatics & Molecular Techniques", credits: 3, hours: 45 },
    { name: "Research Methods & Lab Safety", credits: 2, hours: 30 },
    { name: "Communication Skills", credits: 2, hours: 20 },
  ],
  "B.Sc Biotechnology": [
    { name: "Cell Biology & Genetics", credits: 3, hours: 55 },
    { name: "Biochemistry", credits: 3, hours: 50 },
    { name: "Molecular Biology & Genetic Engineering", credits: 4, hours: 60 },
    { name: "Immunology & Microbiology", credits: 3, hours: 50 },
    { name: "Bioinformatics", credits: 3, hours: 45 },
    { name: "Bioprocess Technology", credits: 3, hours: 50 },
    { name: "Research Methodology & Scientific Writing", credits: 2, hours: 30 },
    { name: "Communication Skills", credits: 2, hours: 20 },
  ],
  "B.Sc Biochemistry": [
    { name: "Proteins, Enzymes & Metabolism", credits: 4, hours: 60 },
    { name: "Molecular Biology", credits: 4, hours: 60 },
    { name: "Clinical Biochemistry", credits: 3, hours: 55 },
    { name: "Immunology & Cell Biology", credits: 3, hours: 50 },
    { name: "Analytical Techniques (Spectroscopy/Chromatography)", credits: 3, hours: 50 },
    { name: "Bioinformatics", credits: 3, hours: 40 },
    { name: "Research Methods & Lab Skills", credits: 2, hours: 30 },
    { name: "Scientific Writing", credits: 2, hours: 20 },
  ],
  "B.Sc Data Science": [
    { name: "Python for Data Science", credits: 4, hours: 60 },
    { name: "Machine Learning", credits: 4, hours: 70 },
    { name: "Statistics & Probability", credits: 3, hours: 50 },
    { name: "SQL & Big Data", credits: 3, hours: 40 },
    { name: "Data Visualisation (Power BI / Tableau)", credits: 3, hours: 40 },
    { name: "Feature Engineering", credits: 3, hours: 35 },
    { name: "Deep Learning Basics", credits: 3, hours: 50 },
    { name: "Communication Skills", credits: 2, hours: 20 },
    { name: "Aptitude & Logical Reasoning", credits: 2, hours: 30 },
  ],
  "B.Sc Electronics": [
    { name: "Analogue & Digital Circuits", credits: 4, hours: 60 },
    { name: "Microprocessors & Microcontrollers", credits: 3, hours: 55 },
    { name: "Signal & Systems", credits: 3, hours: 50 },
    { name: "Communication Systems", credits: 3, hours: 50 },
    { name: "Embedded Systems & IoT", credits: 3, hours: 50 },
    { name: "MATLAB / Python for Electronics", credits: 2, hours: 35 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.Sc Environmental Science": [
    { name: "Ecology & Environmental Biology", credits: 4, hours: 60 },
    { name: "Environmental Chemistry & Pollution", credits: 3, hours: 55 },
    { name: "GIS & Remote Sensing", credits: 3, hours: 50 },
    { name: "Environmental Impact Assessment", credits: 3, hours: 50 },
    { name: "Waste Management & Sustainability", credits: 3, hours: 45 },
    { name: "Climate Change & Policy", credits: 3, hours: 40 },
    { name: "Research Methods & Report Writing", credits: 2, hours: 30 },
    { name: "Communication Skills", credits: 2, hours: 20 },
  ],
  "B.Sc Forensic Science": [
    { name: "Criminalistics & Crime Scene Investigation", credits: 4, hours: 60 },
    { name: "Forensic Biology & DNA Analysis", credits: 4, hours: 60 },
    { name: "Forensic Chemistry & Toxicology", credits: 3, hours: 55 },
    { name: "Questioned Documents & Fingerprint Analysis", credits: 3, hours: 50 },
    { name: "Digital Forensics Basics", credits: 3, hours: 50 },
    { name: "Legal Aspects of Forensic Science", credits: 2, hours: 35 },
    { name: "Scientific Writing & Expert Testimony", credits: 2, hours: 25 },
  ],
  "B.Sc Geology": [
    { name: "Physical & Structural Geology", credits: 4, hours: 60 },
    { name: "Mineralogy & Petrology", credits: 4, hours: 60 },
    { name: "Sedimentology & Stratigraphy", credits: 3, hours: 55 },
    { name: "Geomorphology & Remote Sensing", credits: 3, hours: 50 },
    { name: "Hydrogeology & Engineering Geology", credits: 3, hours: 50 },
    { name: "GIS & Geological Mapping", credits: 3, hours: 45 },
    { name: "Research Methods & Field Report Writing", credits: 2, hours: 30 },
  ],
  "B.Sc Nutrition & Dietetics": [
    { name: "Human Nutrition & Biochemistry", credits: 4, hours: 60 },
    { name: "Clinical Dietetics & Medical Nutrition Therapy", credits: 4, hours: 65 },
    { name: "Community Nutrition & Public Health", credits: 3, hours: 50 },
    { name: "Sports Nutrition", credits: 3, hours: 45 },
    { name: "Food Science & Quality", credits: 3, hours: 45 },
    { name: "Counselling & Communication Skills", credits: 3, hours: 40 },
    { name: "Research Methods & Diet Planning", credits: 2, hours: 30 },
  ],
  "B.Sc Home Science": [
    { name: "Human Development & Child Psychology", credits: 3, hours: 50 },
    { name: "Food Science & Nutrition", credits: 3, hours: 50 },
    { name: "Textile Science & Apparel", credits: 3, hours: 45 },
    { name: "Interior Design & Resource Management", credits: 3, hours: 45 },
    { name: "Community Development & Extension", credits: 3, hours: 40 },
    { name: "Communication & Life Skills", credits: 2, hours: 30 },
    { name: "Entrepreneurship in Home Science", credits: 2, hours: 25 },
  ],
  "B.Sc Aviation": [
    { name: "Principles of Flight (Aerodynamics)", credits: 4, hours: 60 },
    { name: "Aviation Meteorology", credits: 3, hours: 50 },
    { name: "Air Navigation & Communication", credits: 3, hours: 50 },
    { name: "Aircraft Systems & Instruments", credits: 4, hours: 60 },
    { name: "Aviation Regulations & Safety", credits: 3, hours: 45 },
    { name: "Flight Operations Management", credits: 2, hours: 35 },
    { name: "English & Communication for Aviation", credits: 2, hours: 25 },
  ],
  "B.Sc Nautical Science": [
    { name: "Navigation & Chart Work", credits: 4, hours: 65 },
    { name: "Ship Stability & Cargo Operations", credits: 4, hours: 60 },
    { name: "Marine Meteorology & Oceanography", credits: 3, hours: 50 },
    { name: "GMDSS & Maritime Communication", credits: 3, hours: 50 },
    { name: "STCW Safety & Survival Training", credits: 3, hours: 45 },
    { name: "Marine Law & Regulations", credits: 2, hours: 35 },
    { name: "English Proficiency (IMO Standard)", credits: 2, hours: 25 },
  ],

  // ── Agriculture & Allied Sciences ─────────────────────────────────────────
  "B.Sc Agriculture": [
    { name: "Soil Science & Agronomy", credits: 4, hours: 60 },
    { name: "Crop Production & Horticulture", credits: 4, hours: 60 },
    { name: "Plant Protection & Pest Management", credits: 3, hours: 50 },
    { name: "Agricultural Economics & Marketing", credits: 3, hours: 45 },
    { name: "Farm Management & Extension", credits: 3, hours: 45 },
    { name: "Agri-Technology (Precision Farming / Drones)", credits: 3, hours: 40 },
    { name: "Research Methodology & Scientific Writing", credits: 2, hours: 30 },
    { name: "Communication Skills", credits: 2, hours: 20 },
  ],
  "B.Sc Horticulture": [
    { name: "Fruit Science & Pomology", credits: 4, hours: 60 },
    { name: "Vegetable Crops & Olericulture", credits: 3, hours: 55 },
    { name: "Floriculture & Landscape Design", credits: 3, hours: 50 },
    { name: "Post-Harvest Technology", credits: 3, hours: 45 },
    { name: "Plant Propagation & Nursery Management", credits: 3, hours: 45 },
    { name: "Agro-Chemicals & Soil Nutrition", credits: 3, hours: 40 },
    { name: "Research Methods & Report Writing", credits: 2, hours: 30 },
  ],
  "B.Sc Forestry": [
    { name: "Silviculture & Forest Management", credits: 4, hours: 60 },
    { name: "Forest Ecology & Biodiversity", credits: 3, hours: 55 },
    { name: "Wildlife Science & Conservation", credits: 3, hours: 50 },
    { name: "Forest Laws & Policy", credits: 3, hours: 45 },
    { name: "Agroforestry & Social Forestry", credits: 3, hours: 45 },
    { name: "GIS & Remote Sensing for Forests", credits: 3, hours: 40 },
    { name: "Research Methods & Field Report Writing", credits: 2, hours: 30 },
  ],
  "B.Sc Sericulture": [
    { name: "Sericulture & Mulberry Cultivation", credits: 4, hours: 60 },
    { name: "Silkworm Rearing & Disease Management", credits: 3, hours: 55 },
    { name: "Post-Cocoon Technology (Reeling & Weaving)", credits: 3, hours: 50 },
    { name: "Agri-Extension & Rural Entrepreneurship", credits: 3, hours: 40 },
    { name: "Research Methods", credits: 2, hours: 30 },
    { name: "Communication Skills", credits: 2, hours: 20 },
  ],
  "B.Tech Dairy Technology": [
    { name: "Milk & Dairy Products Processing", credits: 4, hours: 60 },
    { name: "Food Microbiology (Dairy)", credits: 3, hours: 50 },
    { name: "Dairy Plant Management & Engineering", credits: 3, hours: 50 },
    { name: "Quality Control & Food Safety", credits: 3, hours: 45 },
    { name: "Dairy Chemistry & Biochemistry", credits: 3, hours: 45 },
    { name: "Entrepreneurship in Dairy", credits: 2, hours: 30 },
    { name: "Technical Communication", credits: 2, hours: 20 },
  ],
  "B.V.Sc (Veterinary Science)": [
    { name: "Veterinary Anatomy & Physiology", credits: 4, hours: 65 },
    { name: "Animal Diseases & Pathology", credits: 4, hours: 65 },
    { name: "Veterinary Pharmacology & Toxicology", credits: 3, hours: 55 },
    { name: "Clinical Veterinary Medicine & Surgery", credits: 5, hours: 90 },
    { name: "Animal Nutrition & Husbandry", credits: 3, hours: 50 },
    { name: "Livestock Production & Management", credits: 3, hours: 45 },
    { name: "Veterinary Public Health & Zoonoses", credits: 2, hours: 35 },
    { name: "Clinical Communication Skills", credits: 2, hours: 20 },
  ],
  "B.F.Sc (Fisheries Science)": [
    { name: "Aquaculture & Fish Farming", credits: 4, hours: 60 },
    { name: "Fish Biology & Ecology", credits: 3, hours: 55 },
    { name: "Fisheries Resource Management", credits: 3, hours: 50 },
    { name: "Post-Harvest Fish Technology", credits: 3, hours: 50 },
    { name: "Fish Disease & Health Management", credits: 3, hours: 45 },
    { name: "Fisheries Economics & Entrepreneurship", credits: 2, hours: 35 },
    { name: "Research Methods & Communication", credits: 2, hours: 25 },
  ],

  // ── Commerce & Accountancy ────────────────────────────────────────────────
  "B.Com": [
    { name: "Financial Accounting", credits: 4, hours: 50 },
    { name: "Taxation (GST & Income Tax)", credits: 3, hours: 45 },
    { name: "Tally & Accounting Software", credits: 3, hours: 35 },
    { name: "Business Law", credits: 3, hours: 40 },
    { name: "Cost Accounting", credits: 3, hours: 40 },
    { name: "Excel for Finance", credits: 3, hours: 30 },
    { name: "Auditing Basics", credits: 3, hours: 35 },
    { name: "Financial Management", credits: 3, hours: 40 },
    { name: "Banking & Insurance", credits: 2, hours: 25 },
    { name: "Business Communication", credits: 2, hours: 20 },
    { name: "Economics", credits: 3, hours: 35 },
    { name: "Quantitative Aptitude", credits: 2, hours: 30 },
  ],
  "B.Com Honours": [
    { name: "Advanced Financial Accounting", credits: 4, hours: 55 },
    { name: "Corporate Accounting", credits: 4, hours: 55 },
    { name: "Taxation — Direct & Indirect", credits: 4, hours: 55 },
    { name: "Cost & Management Accounting", credits: 3, hours: 50 },
    { name: "Business Law & Corporate Governance", credits: 3, hours: 45 },
    { name: "Tally ERP & Accounting Software", credits: 3, hours: 35 },
    { name: "Financial Management", credits: 3, hours: 45 },
    { name: "Auditing & Assurance", credits: 3, hours: 40 },
    { name: "Excel & Data Analytics for Finance", credits: 3, hours: 35 },
    { name: "Business Communication", credits: 2, hours: 25 },
  ],
  "B.Com Accounting & Finance": [
    { name: "Financial Accounting & Reporting", credits: 4, hours: 55 },
    { name: "Corporate Finance", credits: 4, hours: 55 },
    { name: "Taxation (GST, Income Tax, TDS)", credits: 4, hours: 55 },
    { name: "Investment Analysis & Portfolio Mgt.", credits: 3, hours: 50 },
    { name: "Cost Accounting & Budgeting", credits: 3, hours: 45 },
    { name: "Tally & SAP Finance Basics", credits: 3, hours: 40 },
    { name: "Excel & Financial Modelling", credits: 4, hours: 50 },
    { name: "Business Communication & Presentations", credits: 2, hours: 25 },
  ],
  "B.Com Banking & Insurance": [
    { name: "Banking Operations & Products", credits: 4, hours: 55 },
    { name: "Insurance Principles & Products", credits: 4, hours: 55 },
    { name: "Financial Accounting", credits: 3, hours: 45 },
    { name: "Risk Management in Banking & Insurance", credits: 3, hours: 45 },
    { name: "NISM / IRDA Regulatory Framework", credits: 3, hours: 40 },
    { name: "Credit Analysis & Lending", credits: 3, hours: 40 },
    { name: "Excel & Data Tools for Finance", credits: 2, hours: 30 },
    { name: "Business Communication", credits: 2, hours: 25 },
  ],
  "B.Com Financial Markets": [
    { name: "Security Analysis & Valuation", credits: 4, hours: 60 },
    { name: "Equity & Derivative Markets", credits: 4, hours: 60 },
    { name: "Financial Accounting & Reporting", credits: 3, hours: 45 },
    { name: "Corporate Finance & Capital Markets", credits: 3, hours: 50 },
    { name: "NISM Certifications (Series I / VIII)", credits: 3, hours: 40 },
    { name: "Excel & Financial Modelling", credits: 4, hours: 55 },
    { name: "Bloomberg / Tickertape / Screener Tools", credits: 2, hours: 30 },
    { name: "Business Communication", credits: 2, hours: 25 },
  ],
  "B.Com Taxation": [
    { name: "Direct Tax (Income Tax Act)", credits: 4, hours: 60 },
    { name: "Indirect Tax (GST & Customs)", credits: 4, hours: 60 },
    { name: "Corporate Tax Planning", credits: 4, hours: 55 },
    { name: "TDS & TCS Compliance", credits: 3, hours: 45 },
    { name: "Tally GST & Tax Software", credits: 3, hours: 40 },
    { name: "Business Law & Company Act", credits: 3, hours: 40 },
    { name: "Excel for Tax Computation", credits: 2, hours: 30 },
    { name: "Business Communication", credits: 2, hours: 25 },
  ],
  "Chartered Accountancy (CA)": [
    { name: "Financial Reporting (Ind AS / IFRS)", credits: 4, hours: 80 },
    { name: "Direct Tax & GST", credits: 4, hours: 80 },
    { name: "Auditing & Assurance", credits: 4, hours: 70 },
    { name: "Cost & Management Accounting", credits: 3, hours: 60 },
    { name: "Corporate & Other Laws", credits: 3, hours: 60 },
    { name: "Strategic Financial Management", credits: 4, hours: 70 },
    { name: "Tally / SAP FICO Basics", credits: 2, hours: 35 },
    { name: "Excel & Financial Modelling", credits: 3, hours: 45 },
    { name: "Aptitude & Quantitative Skills", credits: 2, hours: 40 },
    { name: "Communication & Presentation Skills", credits: 2, hours: 25 },
  ],
  "Cost & Management Accountancy (CMA)": [
    { name: "Financial Accounting & Reporting", credits: 4, hours: 70 },
    { name: "Cost Accounting & Cost Audit", credits: 4, hours: 75 },
    { name: "Management Accounting & Controls", credits: 4, hours: 70 },
    { name: "Direct & Indirect Taxation", credits: 3, hours: 60 },
    { name: "Corporate Laws & Compliance", credits: 3, hours: 55 },
    { name: "Strategic Management & Analytics", credits: 3, hours: 55 },
    { name: "Excel & ERP Tools", credits: 2, hours: 35 },
    { name: "Communication & Presentation Skills", credits: 2, hours: 25 },
  ],
  "Company Secretary (CS)": [
    { name: "Company Law & Corporate Governance", credits: 4, hours: 70 },
    { name: "Securities Laws & SEBI Regulations", credits: 3, hours: 60 },
    { name: "Financial & Strategic Management", credits: 3, hours: 55 },
    { name: "Tax Laws (Direct & Indirect)", credits: 3, hours: 55 },
    { name: "Compliance & Secretarial Practice", credits: 4, hours: 65 },
    { name: "Drafting, Appearances & Pleadings", credits: 3, hours: 50 },
    { name: "Business Communication & Ethics", credits: 2, hours: 30 },
    { name: "Aptitude & Reasoning", credits: 2, hours: 35 },
  ],

  // ── Business & Management ─────────────────────────────────────────────────
  "BBA": [
    { name: "Marketing Fundamentals", credits: 3, hours: 40 },
    { name: "Financial Accounting", credits: 3, hours: 45 },
    { name: "Business Communication", credits: 3, hours: 30 },
    { name: "Excel & Data Analysis", credits: 3, hours: 35 },
    { name: "Digital Marketing", credits: 3, hours: 40 },
    { name: "HR Management", credits: 3, hours: 35 },
    { name: "Operations Management", credits: 3, hours: 35 },
    { name: "Business Strategy", credits: 3, hours: 30 },
    { name: "Presentation & Public Speaking", credits: 2, hours: 20 },
    { name: "Entrepreneurship Basics", credits: 2, hours: 25 },
    { name: "Supply Chain Management", credits: 3, hours: 35 },
    { name: "Consumer Behaviour", credits: 2, hours: 25 },
  ],
  "BBA — Marketing": [
    { name: "Marketing Management & Strategy", credits: 4, hours: 55 },
    { name: "Digital Marketing & SEO", credits: 4, hours: 55 },
    { name: "Consumer Behaviour & Market Research", credits: 3, hours: 50 },
    { name: "Brand Management", credits: 3, hours: 45 },
    { name: "Advertising & Media Planning", credits: 3, hours: 45 },
    { name: "Sales Management & CRM", credits: 3, hours: 40 },
    { name: "Excel & Analytics for Marketers", credits: 3, hours: 40 },
    { name: "Business Communication & Presentations", credits: 2, hours: 25 },
  ],
  "BBA — Finance": [
    { name: "Financial Accounting & Reporting", credits: 4, hours: 55 },
    { name: "Corporate Finance & Valuation", credits: 4, hours: 55 },
    { name: "Investment Analysis", credits: 3, hours: 50 },
    { name: "Taxation (GST & Income Tax)", credits: 3, hours: 45 },
    { name: "Cost Accounting & Budgeting", credits: 3, hours: 45 },
    { name: "Excel & Financial Modelling", credits: 4, hours: 55 },
    { name: "Risk Management", credits: 2, hours: 35 },
    { name: "Business Communication", credits: 2, hours: 25 },
  ],
  "BBA — Human Resources": [
    { name: "Human Resource Management", credits: 4, hours: 55 },
    { name: "Organisational Behaviour", credits: 3, hours: 50 },
    { name: "Labour Laws & Industrial Relations", credits: 3, hours: 50 },
    { name: "Talent Acquisition & Recruitment", credits: 3, hours: 45 },
    { name: "Training & Development", credits: 3, hours: 45 },
    { name: "Compensation & Performance Management", credits: 3, hours: 45 },
    { name: "Excel & HRIS Tools", credits: 2, hours: 30 },
    { name: "Business Communication & Presentations", credits: 2, hours: 25 },
  ],
  "BBA — Business Analytics": [
    { name: "Business Statistics & Probability", credits: 4, hours: 55 },
    { name: "Data Analysis with Excel & Python", credits: 4, hours: 60 },
    { name: "SQL & Database Management", credits: 3, hours: 45 },
    { name: "Data Visualisation (Power BI / Tableau)", credits: 3, hours: 45 },
    { name: "Machine Learning Basics for Business", credits: 3, hours: 50 },
    { name: "Business Strategy & Decision Making", credits: 3, hours: 45 },
    { name: "Operations Research & Optimisation", credits: 2, hours: 35 },
    { name: "Business Communication", credits: 2, hours: 25 },
  ],
  "BBA — International Business": [
    { name: "International Trade & Business Law", credits: 4, hours: 55 },
    { name: "Global Marketing & Export-Import", credits: 4, hours: 55 },
    { name: "Foreign Exchange & International Finance", credits: 3, hours: 50 },
    { name: "Cross-Cultural Communication", credits: 3, hours: 45 },
    { name: "Supply Chain & Logistics Management", credits: 3, hours: 50 },
    { name: "WTO & Trade Agreements", credits: 2, hours: 35 },
    { name: "Excel & Financial Modelling", credits: 2, hours: 35 },
    { name: "Business Communication", credits: 2, hours: 25 },
  ],
  "BMS (Management Studies)": [
    { name: "Business Management & Strategy", credits: 3, hours: 50 },
    { name: "Financial Management & Accounting", credits: 3, hours: 50 },
    { name: "Marketing Management", credits: 3, hours: 45 },
    { name: "Operations & Supply Chain Mgt.", credits: 3, hours: 45 },
    { name: "HR Management", credits: 3, hours: 40 },
    { name: "Entrepreneurship & Innovation", credits: 3, hours: 40 },
    { name: "Excel & Business Analytics", credits: 3, hours: 40 },
    { name: "Business Communication & Presentations", credits: 2, hours: 25 },
  ],
  "MBA": [
    { name: "Marketing Management", credits: 3, hours: 40 },
    { name: "Financial Management", credits: 3, hours: 45 },
    { name: "Business Communication", credits: 3, hours: 25 },
    { name: "Digital Marketing", credits: 3, hours: 40 },
    { name: "Operations Management", credits: 3, hours: 35 },
    { name: "Business Strategy", credits: 3, hours: 30 },
    { name: "HR Management", credits: 3, hours: 35 },
    { name: "Excel & Data Analysis", credits: 3, hours: 30 },
    { name: "Entrepreneurship & Innovation", credits: 2, hours: 25 },
    { name: "Quantitative Aptitude", credits: 2, hours: 30 },
  ],
  "PGDM": [
    { name: "Business Strategy & Competitive Advantage", credits: 3, hours: 50 },
    { name: "Marketing & Sales Management", credits: 3, hours: 45 },
    { name: "Financial Accounting & Corporate Finance", credits: 3, hours: 50 },
    { name: "Operations & Supply Chain", credits: 3, hours: 45 },
    { name: "HR & Organisational Behaviour", credits: 3, hours: 40 },
    { name: "Digital Marketing & Analytics", credits: 3, hours: 45 },
    { name: "Excel & Business Data Tools", credits: 3, hours: 40 },
    { name: "Communication & Leadership", credits: 2, hours: 25 },
  ],

  // ── Economics & Social Sciences ───────────────────────────────────────────
  "BA Economics": [
    { name: "Microeconomics", credits: 3, hours: 40 },
    { name: "Macroeconomics", credits: 3, hours: 40 },
    { name: "Statistics & Probability", credits: 3, hours: 45 },
    { name: "Excel & Data Analysis", credits: 3, hours: 35 },
    { name: "Financial Accounting", credits: 2, hours: 30 },
    { name: "Business Communication", credits: 2, hours: 20 },
    { name: "Research Methodology", credits: 2, hours: 25 },
    { name: "Aptitude & Logical Reasoning", credits: 2, hours: 30 },
  ],
  "BA Psychology": [
    { name: "Organisational Behaviour", credits: 3, hours: 35 },
    { name: "HR Management", credits: 3, hours: 35 },
    { name: "Research Methods in Psychology", credits: 3, hours: 40 },
    { name: "Counselling Skills & Psychotherapy", credits: 3, hours: 40 },
    { name: "Developmental Psychology", credits: 2, hours: 30 },
    { name: "Business Communication", credits: 3, hours: 25 },
    { name: "Excel & Data Analysis", credits: 2, hours: 25 },
    { name: "Aptitude & Logical Reasoning", credits: 2, hours: 30 },
  ],
  "BA Political Science": [
    { name: "Political Theory & Ideologies", credits: 3, hours: 50 },
    { name: "Indian Constitution & Government", credits: 3, hours: 50 },
    { name: "International Relations & Diplomacy", credits: 3, hours: 45 },
    { name: "Public Policy & Administration", credits: 3, hours: 45 },
    { name: "Research Methods & Data Analysis", credits: 3, hours: 40 },
    { name: "Essay Writing & Critical Analysis", credits: 2, hours: 30 },
    { name: "Communication & Public Speaking", credits: 2, hours: 25 },
    { name: "UPSC/MPSC Aptitude Preparation", credits: 2, hours: 35 },
  ],
  "BA Sociology": [
    { name: "Sociological Theory", credits: 3, hours: 50 },
    { name: "Research Methods in Sociology", credits: 3, hours: 50 },
    { name: "Social Stratification & Inequality", credits: 3, hours: 45 },
    { name: "Rural & Urban Sociology", credits: 3, hours: 45 },
    { name: "Gender Studies", credits: 2, hours: 35 },
    { name: "Social Work & Community Development", credits: 3, hours: 40 },
    { name: "Communication & Report Writing", credits: 2, hours: 25 },
    { name: "Aptitude & Logical Reasoning", credits: 2, hours: 30 },
  ],
  "BA Public Administration": [
    { name: "Principles of Public Administration", credits: 3, hours: 50 },
    { name: "Indian Governance & Administration", credits: 3, hours: 50 },
    { name: "Public Policy Analysis", credits: 3, hours: 45 },
    { name: "Financial Administration & Budgeting", credits: 3, hours: 45 },
    { name: "E-Governance & Digital India", credits: 3, hours: 40 },
    { name: "Research Methods & Report Writing", credits: 2, hours: 30 },
    { name: "Communication & Public Speaking", credits: 2, hours: 25 },
    { name: "UPSC/MPSC Aptitude Preparation", credits: 2, hours: 35 },
  ],
  "BA Social Work (BSW)": [
    { name: "Principles & Philosophy of Social Work", credits: 3, hours: 50 },
    { name: "Community Organisation & Development", credits: 3, hours: 50 },
    { name: "Social Work with Groups", credits: 3, hours: 45 },
    { name: "Medical & Psychiatric Social Work", credits: 3, hours: 45 },
    { name: "Child Welfare & Rights", credits: 3, hours: 40 },
    { name: "NGO Management & CSR", credits: 3, hours: 40 },
    { name: "Research Methods & Report Writing", credits: 2, hours: 30 },
    { name: "Communication & Counselling Skills", credits: 2, hours: 25 },
  ],
  "BA Geography": [
    { name: "Physical Geography & Geomorphology", credits: 3, hours: 50 },
    { name: "Human & Economic Geography", credits: 3, hours: 50 },
    { name: "GIS & Cartography", credits: 4, hours: 60 },
    { name: "Environmental Geography & Climate", credits: 3, hours: 45 },
    { name: "Regional Planning & Development", credits: 3, hours: 45 },
    { name: "Remote Sensing", credits: 3, hours: 45 },
    { name: "Research Methods & Field Study", credits: 2, hours: 35 },
    { name: "Communication Skills", credits: 2, hours: 20 },
  ],
  "BA Anthropology": [
    { name: "Cultural & Social Anthropology", credits: 3, hours: 50 },
    { name: "Physical & Biological Anthropology", credits: 3, hours: 50 },
    { name: "Archaeological Anthropology", credits: 3, hours: 45 },
    { name: "Tribal Studies & Ethnic Relations", credits: 3, hours: 45 },
    { name: "Research Methods (Ethnography & Field)", credits: 4, hours: 60 },
    { name: "Communication & Report Writing", credits: 2, hours: 30 },
    { name: "Aptitude & Logical Reasoning", credits: 2, hours: 30 },
  ],

  // ── Humanities & Languages ────────────────────────────────────────────────
  "BA English": [
    { name: "English Literature (British, American, Indian)", credits: 3, hours: 50 },
    { name: "Literary Theory & Criticism", credits: 3, hours: 50 },
    { name: "Academic & Creative Writing", credits: 4, hours: 55 },
    { name: "Mass Communication Fundamentals", credits: 2, hours: 35 },
    { name: "Content Writing & Digital Media", credits: 3, hours: 45 },
    { name: "Public Speaking & Communication", credits: 3, hours: 40 },
    { name: "Research & Essay Writing", credits: 2, hours: 30 },
    { name: "Aptitude & Logical Reasoning", credits: 2, hours: 30 },
  ],
  "BA History": [
    { name: "Ancient, Medieval & Modern Indian History", credits: 3, hours: 55 },
    { name: "World History & International Relations", credits: 3, hours: 50 },
    { name: "Historical Research Methods & Historiography", credits: 4, hours: 55 },
    { name: "Indian Constitutional History", credits: 3, hours: 45 },
    { name: "Cultural & Heritage Studies", credits: 2, hours: 35 },
    { name: "Academic Writing & Report", credits: 2, hours: 30 },
    { name: "UPSC/Civil Services Aptitude Prep", credits: 2, hours: 40 },
    { name: "Communication Skills", credits: 2, hours: 20 },
  ],
  "BA Philosophy": [
    { name: "Indian Philosophy & Ethics", credits: 3, hours: 50 },
    { name: "Western Philosophy", credits: 3, hours: 50 },
    { name: "Logic & Critical Thinking", credits: 4, hours: 55 },
    { name: "Ethics & Applied Philosophy", credits: 3, hours: 45 },
    { name: "Philosophy of Religion", credits: 2, hours: 35 },
    { name: "Academic Writing & Argumentation", credits: 2, hours: 30 },
    { name: "Aptitude & Logical Reasoning", credits: 2, hours: 35 },
  ],
  "BA Liberal Arts": [
    { name: "Critical Thinking & Analytical Reasoning", credits: 4, hours: 55 },
    { name: "Academic Research & Writing", credits: 3, hours: 50 },
    { name: "Economics & Policy Fundamentals", credits: 3, hours: 45 },
    { name: "Literature, Media & Culture Studies", credits: 3, hours: 45 },
    { name: "Sociology & Political Science Basics", credits: 3, hours: 45 },
    { name: "Digital Literacy & Data Basics", credits: 2, hours: 35 },
    { name: "Public Speaking & Communication", credits: 3, hours: 40 },
    { name: "Aptitude & Logical Reasoning", credits: 2, hours: 30 },
  ],
  "BA Hindi": [
    { name: "Hindi Sahitya (Literature)", credits: 3, hours: 50 },
    { name: "Hindi Grammar & Linguistics", credits: 3, hours: 45 },
    { name: "Translation & Interpretation", credits: 3, hours: 45 },
    { name: "Journalism & Mass Communication in Hindi", credits: 3, hours: 45 },
    { name: "Content Writing & Editing", credits: 3, hours: 40 },
    { name: "Hindi Typing & Digital Media", credits: 2, hours: 30 },
    { name: "Communication & Public Speaking", credits: 2, hours: 25 },
  ],
  "BA Sanskrit": [
    { name: "Sanskrit Literature & Grammar", credits: 4, hours: 60 },
    { name: "Vedic Studies & Philosophy", credits: 3, hours: 50 },
    { name: "Translation & Interpretation", credits: 3, hours: 45 },
    { name: "Sanskrit Linguistics & Comparative Study", credits: 3, hours: 45 },
    { name: "Research Methods & Thesis Writing", credits: 2, hours: 30 },
    { name: "Communication Skills", credits: 2, hours: 20 },
  ],
  "BA Regional Language": [
    { name: "Regional Language Literature", credits: 3, hours: 50 },
    { name: "Linguistics & Grammar", credits: 3, hours: 45 },
    { name: "Translation & Interpretation", credits: 3, hours: 45 },
    { name: "Journalism & Media in Regional Language", credits: 3, hours: 45 },
    { name: "Content Writing & Digital Media", credits: 3, hours: 40 },
    { name: "Academic Writing & Research", credits: 2, hours: 30 },
    { name: "Communication Skills", credits: 2, hours: 25 },
  ],

  // ── Law ───────────────────────────────────────────────────────────────────
  "LLB": [
    { name: "Business Law & Contracts", credits: 3, hours: 40 },
    { name: "Corporate Law", credits: 3, hours: 40 },
    { name: "Intellectual Property Rights", credits: 3, hours: 35 },
    { name: "Business Communication", credits: 3, hours: 25 },
    { name: "Legal Research & Writing", credits: 3, hours: 35 },
    { name: "Presentation Skills", credits: 2, hours: 20 },
    { name: "Aptitude & Logical Reasoning", credits: 2, hours: 30 },
  ],
  "BA LLB": [
    { name: "Constitutional Law & Human Rights", credits: 4, hours: 60 },
    { name: "Criminal Law (IPC & CrPC)", credits: 4, hours: 60 },
    { name: "Civil Procedure Code & Law of Evidence", credits: 3, hours: 55 },
    { name: "Corporate & Business Law", credits: 3, hours: 50 },
    { name: "Family & Property Law", credits: 3, hours: 50 },
    { name: "Legal Research, Moot Court & Drafting", credits: 4, hours: 60 },
    { name: "Intellectual Property Rights", credits: 2, hours: 35 },
    { name: "Communication & Legal Advocacy", credits: 2, hours: 25 },
  ],
  "BBA LLB": [
    { name: "Business Law & Contracts", credits: 4, hours: 60 },
    { name: "Corporate Governance & Company Law", credits: 4, hours: 60 },
    { name: "Financial Management & Accounting", credits: 3, hours: 50 },
    { name: "Constitutional & Administrative Law", credits: 3, hours: 50 },
    { name: "Intellectual Property & Cyber Law", credits: 3, hours: 50 },
    { name: "Legal Research, Moot Court & Drafting", credits: 4, hours: 60 },
    { name: "Tax Laws", credits: 2, hours: 35 },
    { name: "Business Communication & Legal Advocacy", credits: 2, hours: 25 },
  ],
  "B.Com LLB": [
    { name: "Financial Accounting & Auditing", credits: 3, hours: 50 },
    { name: "Business & Corporate Law", credits: 4, hours: 60 },
    { name: "Taxation Law (Direct & Indirect)", credits: 4, hours: 60 },
    { name: "Securities Laws & SEBI Regulations", credits: 3, hours: 50 },
    { name: "Civil & Criminal Law Fundamentals", credits: 3, hours: 50 },
    { name: "Legal Drafting, Moot Court & Advocacy", credits: 4, hours: 60 },
    { name: "Business Communication & Legal Ethics", credits: 2, hours: 25 },
  ],
  "LLM": [
    { name: "Advanced Constitutional Law", credits: 4, hours: 65 },
    { name: "Comparative Law & Jurisprudence", credits: 3, hours: 55 },
    { name: "Specialisation Paper (Corporate/Criminal/IP)", credits: 4, hours: 70 },
    { name: "Research Methodology & Dissertation", credits: 4, hours: 80 },
    { name: "International Law & Human Rights", credits: 3, hours: 55 },
    { name: "Legal Writing & Academic Publishing", credits: 2, hours: 30 },
  ],

  // ── Design ────────────────────────────────────────────────────────────────
  "B.Design UI/UX": [
    { name: "Figma (UI Design)", credits: 4, hours: 60 },
    { name: "Visual Design Principles", credits: 3, hours: 40 },
    { name: "Typography & Color Theory", credits: 2, hours: 25 },
    { name: "Prototyping & Wireframing", credits: 3, hours: 40 },
    { name: "User Research & Usability Testing", credits: 3, hours: 35 },
    { name: "Adobe Illustrator / Photoshop", credits: 3, hours: 45 },
    { name: "Design Systems", credits: 3, hours: 30 },
    { name: "Motion Design Basics", credits: 2, hours: 25 },
    { name: "Portfolio Building", credits: 2, hours: 20 },
  ],
  "B.Design Fashion": [
    { name: "Fashion Design & Draping", credits: 4, hours: 70 },
    { name: "Textile Science & Fabric Knowledge", credits: 3, hours: 55 },
    { name: "Pattern Making & Garment Construction", credits: 4, hours: 70 },
    { name: "Fashion Illustration (Hand & Digital)", credits: 3, hours: 55 },
    { name: "Fashion History & Trend Forecasting", credits: 2, hours: 40 },
    { name: "Retail Management & Buying", credits: 3, hours: 45 },
    { name: "Adobe Illustrator for Fashion", credits: 3, hours: 45 },
    { name: "Portfolio Building & Presentation", credits: 3, hours: 40 },
  ],
  "B.Design Graphic Design": [
    { name: "Visual Communication Fundamentals", credits: 3, hours: 50 },
    { name: "Adobe Photoshop & Illustrator", credits: 4, hours: 65 },
    { name: "Typography & Layout Design", credits: 3, hours: 50 },
    { name: "Brand Identity & Logo Design", credits: 3, hours: 50 },
    { name: "Print & Packaging Design", credits: 3, hours: 45 },
    { name: "Digital & Web Graphics", credits: 3, hours: 50 },
    { name: "Motion Graphics Basics (After Effects)", credits: 2, hours: 35 },
    { name: "Portfolio Building", credits: 3, hours: 35 },
  ],
  "B.Design Product Design": [
    { name: "Product Design Process & Thinking", credits: 4, hours: 65 },
    { name: "CAD (SolidWorks / Fusion 360)", credits: 4, hours: 65 },
    { name: "Materials & Manufacturing for Design", credits: 3, hours: 50 },
    { name: "Prototyping & Model Making", credits: 3, hours: 55 },
    { name: "Ergonomics & Human Factors", credits: 3, hours: 45 },
    { name: "Design for Sustainability", credits: 2, hours: 35 },
    { name: "Branding & Market Research", credits: 2, hours: 35 },
    { name: "Portfolio Building & Presentation", credits: 2, hours: 30 },
  ],
  "B.Design Interior Design": [
    { name: "Interior Space Planning", credits: 4, hours: 65 },
    { name: "Architectural Drawing & AutoCAD", credits: 4, hours: 60 },
    { name: "Materials, Finishes & Furniture Design", credits: 3, hours: 55 },
    { name: "3D Rendering (SketchUp / 3ds Max / Lumion)", credits: 4, hours: 65 },
    { name: "Lighting Design", credits: 2, hours: 35 },
    { name: "Sustainable & Green Design", credits: 2, hours: 35 },
    { name: "Portfolio Building & Presentation", credits: 3, hours: 40 },
  ],
  "B.Design Communication Design": [
    { name: "Visual Communication & Storytelling", credits: 3, hours: 55 },
    { name: "Graphic Design (Adobe Suite)", credits: 4, hours: 65 },
    { name: "Advertising & Campaign Design", credits: 3, hours: 55 },
    { name: "Digital & Social Media Design", credits: 3, hours: 50 },
    { name: "Motion Graphics & Video Editing", credits: 3, hours: 50 },
    { name: "Brand Strategy & Identity", credits: 3, hours: 45 },
    { name: "Portfolio Building & Presentation", credits: 2, hours: 35 },
  ],
  "B.Design Animation & VFX": [
    { name: "2D Animation (Adobe Animate / Toon Boom)", credits: 4, hours: 70 },
    { name: "3D Modelling & Rigging (Maya / Blender)", credits: 4, hours: 75 },
    { name: "VFX Compositing (After Effects / Nuke)", credits: 4, hours: 70 },
    { name: "Character Design & Storyboarding", credits: 3, hours: 55 },
    { name: "Rendering & Lighting Techniques", credits: 3, hours: 55 },
    { name: "Film & Narrative Design", credits: 2, hours: 40 },
    { name: "Portfolio & Showreel Building", credits: 3, hours: 40 },
  ],
  "B.Design Game Design": [
    { name: "Game Design Principles & Mechanics", credits: 4, hours: 65 },
    { name: "Unity / Unreal Engine", credits: 4, hours: 70 },
    { name: "3D Modelling for Games (Blender/Maya)", credits: 3, hours: 60 },
    { name: "Game Art & Level Design", credits: 3, hours: 55 },
    { name: "Game Programming (C# / Blueprints)", credits: 3, hours: 55 },
    { name: "UX for Games & Playtesting", credits: 2, hours: 40 },
    { name: "Portfolio & Game Project Showcase", credits: 3, hours: 40 },
  ],
  "B.Design Textile Design": [
    { name: "Textile Fibre & Fabric Knowledge", credits: 3, hours: 55 },
    { name: "Weaving, Printing & Dyeing Techniques", credits: 4, hours: 65 },
    { name: "Textile Surface Design", credits: 3, hours: 55 },
    { name: "Fashion Illustration & CAD for Textiles", credits: 3, hours: 55 },
    { name: "Textile History & Cultural Studies", credits: 2, hours: 35 },
    { name: "Sustainable Textiles", credits: 2, hours: 35 },
    { name: "Portfolio Building", credits: 2, hours: 35 },
  ],

  // ── Fine & Performing Arts ────────────────────────────────────────────────
  "BFA (Fine Arts)": [
    { name: "Drawing & Sketching Fundamentals", credits: 4, hours: 65 },
    { name: "Painting (Oil, Acrylic, Watercolour)", credits: 4, hours: 70 },
    { name: "Sculpture & 3D Art", credits: 3, hours: 55 },
    { name: "Art History & Criticism", credits: 2, hours: 40 },
    { name: "Digital Art & Illustration", credits: 3, hours: 55 },
    { name: "Print Making Techniques", credits: 2, hours: 40 },
    { name: "Portfolio Building & Exhibition", credits: 3, hours: 45 },
  ],
  "BPA (Performing Arts)": [
    { name: "Classical / Contemporary Dance or Theatre", credits: 4, hours: 80 },
    { name: "Performance Theory & Aesthetics", credits: 3, hours: 50 },
    { name: "Stage Craft & Technical Theatre", credits: 3, hours: 55 },
    { name: "Voice & Speech Training", credits: 3, hours: 50 },
    { name: "Choreography & Direction", credits: 3, hours: 55 },
    { name: "Production & Event Management", credits: 2, hours: 40 },
    { name: "Portfolio Building & Showcase", credits: 2, hours: 35 },
  ],
  "B.Mus (Music)": [
    { name: "Hindustani / Carnatic Vocal or Instrumental", credits: 5, hours: 90 },
    { name: "Music Theory, Notation & Composition", credits: 4, hours: 65 },
    { name: "Music History & Aesthetics", credits: 2, hours: 40 },
    { name: "Recording & Music Production (DAW)", credits: 3, hours: 55 },
    { name: "Music Technology & Sound Engineering", credits: 3, hours: 50 },
    { name: "Performance & Ensemble Practice", credits: 3, hours: 60 },
    { name: "Portfolio & Recital Preparation", credits: 2, hours: 35 },
  ],
  "BVA (Visual Arts)": [
    { name: "Drawing & Composition", credits: 4, hours: 65 },
    { name: "Painting Techniques (Classical & Contemporary)", credits: 4, hours: 70 },
    { name: "Art History & Cultural Studies", credits: 2, hours: 40 },
    { name: "Digital Photography & Media Arts", credits: 3, hours: 55 },
    { name: "Printmaking & Sculpture", credits: 3, hours: 55 },
    { name: "Curatorial Practice & Exhibition Design", credits: 2, hours: 40 },
    { name: "Portfolio Building", credits: 3, hours: 40 },
  ],

  // ── Media, Journalism & Communication ────────────────────────────────────
  "BMM (Mass Media)": [
    { name: "Media Writing & Journalism", credits: 4, hours: 60 },
    { name: "Advertising & Brand Communication", credits: 3, hours: 55 },
    { name: "Public Relations & Corporate Communication", credits: 3, hours: 50 },
    { name: "Digital Media & Social Media Strategy", credits: 3, hours: 55 },
    { name: "Video Production & Editing (Premiere/DaVinci)", credits: 3, hours: 55 },
    { name: "Media Research & Analytics", credits: 3, hours: 45 },
    { name: "Portfolio & Showreel Building", credits: 2, hours: 35 },
  ],
  "BJMC (Journalism & Mass Comm)": [
    { name: "News Writing, Reporting & Editing", credits: 4, hours: 65 },
    { name: "Broadcast Journalism (Radio & TV)", credits: 3, hours: 60 },
    { name: "Digital Journalism & Social Media", credits: 3, hours: 55 },
    { name: "Photojournalism & Visual Communication", credits: 3, hours: 50 },
    { name: "Media Ethics, Law & Freedom of Press", credits: 2, hours: 40 },
    { name: "Public Relations & Communication Strategy", credits: 3, hours: 50 },
    { name: "Video Editing (Premiere / DaVinci Resolve)", credits: 2, hours: 40 },
    { name: "Portfolio Building", credits: 2, hours: 30 },
  ],
  "BA Film & Television": [
    { name: "Film Theory, History & Aesthetics", credits: 3, hours: 55 },
    { name: "Screenwriting & Story Development", credits: 4, hours: 65 },
    { name: "Direction & Cinematography", credits: 4, hours: 70 },
    { name: "Video Editing (Premiere / DaVinci Resolve)", credits: 3, hours: 60 },
    { name: "Sound Design & Music for Film", credits: 3, hours: 50 },
    { name: "Production Design & Art Direction", credits: 2, hours: 40 },
    { name: "Portfolio & Short Film Production", credits: 3, hours: 55 },
  ],
  "B.Sc Animation & Multimedia": [
    { name: "2D Animation Fundamentals", credits: 3, hours: 60 },
    { name: "3D Modelling & Animation (Maya/Blender)", credits: 4, hours: 70 },
    { name: "VFX & Compositing (After Effects)", credits: 3, hours: 60 },
    { name: "Graphic Design & Typography", credits: 3, hours: 50 },
    { name: "Web Design & UX Basics", credits: 3, hours: 50 },
    { name: "Video Editing", credits: 2, hours: 40 },
    { name: "Portfolio & Showreel Building", credits: 3, hours: 40 },
  ],

  // ── Education ─────────────────────────────────────────────────────────────
  "B.Ed": [
    { name: "Educational Psychology & Learning Theories", credits: 3, hours: 50 },
    { name: "Curriculum Design & Pedagogy", credits: 3, hours: 50 },
    { name: "Teaching Subject Specialisation", credits: 4, hours: 65 },
    { name: "Assessment & Evaluation in Education", credits: 3, hours: 45 },
    { name: "ICT in Education", credits: 3, hours: 45 },
    { name: "Classroom Management & Communication", credits: 2, hours: 35 },
    { name: "School Internship & Practice Teaching", credits: 4, hours: 80 },
  ],
  "B.El.Ed": [
    { name: "Child Development & Early Childhood Education", credits: 4, hours: 60 },
    { name: "Pedagogy for Primary Subjects", credits: 4, hours: 60 },
    { name: "Language & Literacy Development", credits: 3, hours: 50 },
    { name: "Mathematics for Young Children", credits: 3, hours: 50 },
    { name: "Activity-Based & Inclusive Education", credits: 3, hours: 45 },
    { name: "ICT in Elementary Education", credits: 2, hours: 35 },
    { name: "School Internship", credits: 4, hours: 80 },
  ],
  "B.P.Ed (Physical Education)": [
    { name: "Sports Science & Kinesiology", credits: 4, hours: 60 },
    { name: "Anatomy & Physiology for Sports", credits: 3, hours: 55 },
    { name: "Sports Coaching & Training Methods", credits: 4, hours: 65 },
    { name: "Games & Sports Practical (Major Sport)", credits: 4, hours: 70 },
    { name: "Sports Psychology", credits: 2, hours: 35 },
    { name: "Sports Management & Administration", credits: 2, hours: 35 },
    { name: "First Aid & Sports Medicine", credits: 2, hours: 30 },
  ],
  "B.Sc Physical Education": [
    { name: "Anatomy & Physiology", credits: 3, hours: 55 },
    { name: "Exercise Physiology & Sports Science", credits: 4, hours: 60 },
    { name: "Biomechanics & Kinesiology", credits: 3, hours: 55 },
    { name: "Sports Psychology & Mental Training", credits: 3, hours: 45 },
    { name: "Fitness Assessment & Training Programming", credits: 3, hours: 50 },
    { name: "Sports Nutrition", credits: 2, hours: 35 },
    { name: "Sports Management & Event Organisation", credits: 2, hours: 35 },
  ],

  // ── Hospitality, Travel & Tourism ─────────────────────────────────────────
  "BHM (Hotel Management)": [
    { name: "Food Production & Culinary Arts", credits: 4, hours: 70 },
    { name: "Food & Beverage Service", credits: 3, hours: 60 },
    { name: "Front Office & Rooms Division", credits: 3, hours: 55 },
    { name: "Housekeeping Management", credits: 3, hours: 50 },
    { name: "Hotel Operations & Management", credits: 4, hours: 60 },
    { name: "Hospitality Marketing & Revenue Mgt.", credits: 3, hours: 50 },
    { name: "Communication & Guest Relations", credits: 2, hours: 35 },
    { name: "Entrepreneurship in Hospitality", credits: 2, hours: 30 },
  ],
  "B.Sc Hospitality & Hotel Admin": [
    { name: "Food Production & Kitchen Management", credits: 4, hours: 70 },
    { name: "Food & Beverage Service Operations", credits: 3, hours: 60 },
    { name: "Accommodation & Front Office Operations", credits: 3, hours: 55 },
    { name: "Hotel Accounting & Revenue Management", credits: 3, hours: 50 },
    { name: "Tourism & Event Management", credits: 3, hours: 50 },
    { name: "Communication & Guest Relationship Skills", credits: 2, hours: 35 },
    { name: "Hospitality Technology & PMS", credits: 2, hours: 35 },
  ],
  "BTTM (Travel & Tourism)": [
    { name: "Tourism Products & Destination Management", credits: 4, hours: 60 },
    { name: "Travel Agency & Tour Operations", credits: 3, hours: 55 },
    { name: "Airline & Transport Operations (GDS/Amadeus)", credits: 3, hours: 55 },
    { name: "Hospitality Management", credits: 3, hours: 50 },
    { name: "Tourism Marketing & Digital Marketing", credits: 3, hours: 50 },
    { name: "Heritage & Cultural Tourism", credits: 2, hours: 35 },
    { name: "Communication & Presentation Skills", credits: 2, hours: 35 },
  ],
  "B.Sc Culinary Arts": [
    { name: "Culinary Fundamentals & Knife Skills", credits: 4, hours: 75 },
    { name: "Continental, Oriental & Indian Cuisine", credits: 4, hours: 75 },
    { name: "Bakery, Pastry & Confectionery", credits: 3, hours: 65 },
    { name: "Food Science, Safety & Hygiene", credits: 3, hours: 50 },
    { name: "Kitchen Management & Cost Control", credits: 3, hours: 50 },
    { name: "Menu Planning & Gastronomy", credits: 2, hours: 40 },
    { name: "Food Entrepreneurship & Branding", credits: 2, hours: 35 },
  ],

  // ── Postgraduate Programs ─────────────────────────────────────────────────
  "M.Tech": [
    { name: "Advanced Algorithms", credits: 4, hours: 70 },
    { name: "System Design", credits: 4, hours: 60 },
    { name: "Machine Learning", credits: 4, hours: 70 },
    { name: "Research Methodology", credits: 3, hours: 40 },
    { name: "Technical Writing", credits: 2, hours: 25 },
    { name: "Data Structures & Algorithms", credits: 4, hours: 80 },
    { name: "Communication Skills", credits: 2, hours: 20 },
  ],
  "M.Sc": [
    { name: "Advanced Subject Specialisation I", credits: 4, hours: 65 },
    { name: "Advanced Subject Specialisation II", credits: 4, hours: 65 },
    { name: "Research Methodology & Biostatistics", credits: 3, hours: 50 },
    { name: "Dissertation / Research Project", credits: 5, hours: 100 },
    { name: "Scientific Writing & Paper Publishing", credits: 2, hours: 30 },
    { name: "Seminar & Presentation Skills", credits: 2, hours: 25 },
  ],
  "M.Com": [
    { name: "Advanced Accounting & Reporting", credits: 4, hours: 65 },
    { name: "Business Finance & Capital Markets", credits: 3, hours: 55 },
    { name: "Advanced Taxation", credits: 3, hours: 55 },
    { name: "Management Accounting & Controls", credits: 3, hours: 50 },
    { name: "Research Methodology & Thesis", credits: 3, hours: 60 },
    { name: "Business Analytics & Excel", credits: 3, hours: 45 },
    { name: "Communication & Presentation Skills", credits: 2, hours: 25 },
  ],
  "MA": [
    { name: "Advanced Subject Specialisation I", credits: 4, hours: 65 },
    { name: "Advanced Subject Specialisation II", credits: 4, hours: 65 },
    { name: "Research Methodology", credits: 3, hours: 50 },
    { name: "Dissertation / Research Project", credits: 5, hours: 100 },
    { name: "Academic Writing & Publishing", credits: 2, hours: 30 },
    { name: "Communication Skills", credits: 2, hours: 25 },
  ],
  "M.Des": [
    { name: "Advanced Design Studio", credits: 5, hours: 100 },
    { name: "Design Research Methods", credits: 3, hours: 55 },
    { name: "Design Technology & Advanced Software", credits: 4, hours: 70 },
    { name: "Thesis / Capstone Design Project", credits: 5, hours: 100 },
    { name: "Design Management & Entrepreneurship", credits: 2, hours: 40 },
    { name: "Portfolio Building & Exhibition", credits: 2, hours: 35 },
  ],
  "M.Arch": [
    { name: "Advanced Architectural Design Studio", credits: 5, hours: 110 },
    { name: "Architectural Research Methods", credits: 3, hours: 55 },
    { name: "Advanced BIM & Digital Design", credits: 3, hours: 55 },
    { name: "Urban Design & Planning", credits: 3, hours: 50 },
    { name: "Sustainable Architecture & Green Building", credits: 3, hours: 50 },
    { name: "Thesis / Major Project", credits: 5, hours: 110 },
  ],
  "M.Ed": [
    { name: "Philosophy & Sociology of Education", credits: 3, hours: 50 },
    { name: "Educational Psychology & Guidance", credits: 3, hours: 50 },
    { name: "Curriculum Development & Instruction", credits: 3, hours: 50 },
    { name: "Educational Research & Statistics", credits: 4, hours: 60 },
    { name: "Educational Technology & ICT", credits: 3, hours: 50 },
    { name: "Dissertation / Research Project", credits: 4, hours: 80 },
  ],
  "MSW (Social Work)": [
    { name: "Advanced Social Work Practice", credits: 4, hours: 65 },
    { name: "Community Development & Project Management", credits: 3, hours: 55 },
    { name: "Social Policy, Planning & Administration", credits: 3, hours: 50 },
    { name: "Research Methodology in Social Work", credits: 3, hours: 55 },
    { name: "NGO Management & Fundraising", credits: 3, hours: 50 },
    { name: "Thesis / Field Placement & Report", credits: 4, hours: 80 },
  ],

  // ── Diplomas & Other ──────────────────────────────────────────────────────
  "Diploma / Polytechnic": [
    { name: "Core Technical Skills (Branch-Specific)", credits: 4, hours: 70 },
    { name: "Workshop Practice & Lab Skills", credits: 3, hours: 60 },
    { name: "Engineering Drawing & CAD Basics", credits: 3, hours: 50 },
    { name: "Mathematics & Science Fundamentals", credits: 3, hours: 50 },
    { name: "MS Office & Basic Computer Skills", credits: 2, hours: 30 },
    { name: "Industrial Training & Project Work", credits: 3, hours: 60 },
    { name: "Communication & Soft Skills", credits: 2, hours: 25 },
  ],
  "ITI": [
    { name: "Trade Theory (Branch-Specific)", credits: 3, hours: 60 },
    { name: "Trade Practical Skills", credits: 4, hours: 90 },
    { name: "Workshop Calculation & Science", credits: 2, hours: 40 },
    { name: "Engineering Drawing", credits: 2, hours: 40 },
    { name: "Safety & Industrial Practices", credits: 2, hours: 30 },
    { name: "Communication & Soft Skills", credits: 2, hours: 25 },
  ],
  "Foundation / Pre-University": [
    { name: "Mathematics / Quantitative Aptitude", credits: 3, hours: 55 },
    { name: "Science / Commerce Fundamentals", credits: 3, hours: 55 },
    { name: "English & Communication Skills", credits: 3, hours: 45 },
    { name: "Computer Literacy & Digital Skills", credits: 2, hours: 35 },
    { name: "Study Skills & Career Planning", credits: 2, hours: 30 },
  ],
  "Other": [
    { name: "Core Subject Knowledge", credits: 3, hours: 50 },
    { name: "Research & Study Skills", credits: 2, hours: 35 },
    { name: "Communication & Presentation", credits: 3, hours: 40 },
    { name: "MS Office & Digital Literacy", credits: 2, hours: 30 },
    { name: "Aptitude & Logical Reasoning", credits: 2, hours: 35 },
  ],
};

// ─── Authed Fetch ─────────────────────────────────────────────────────────────
async function authedFetch(url: string, init: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
}

const LOADING_STEPS = [
  "Analysing your degree & goals…",
  "Mapping career pathways…",
  "Building Year 1 roadmap…",
  "Adding learning resources…",
  "Generating project suggestions…",
  "Finalising your roadmap…",
];

// ─── Institution Picker (searchable dropdown + custom "Other" entry) ──────────
function InstitutionPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isOtherInitial = !!value && value !== "Your Institute" && !PRESET_INSTITUTIONS.includes(value);
  const [search, setSearch] = useState(isOtherInitial ? "" : (PRESET_INSTITUTIONS.includes(value) ? value : ""));
  const [isOpen, setIsOpen] = useState(false);
  const [isOther, setIsOther] = useState(isOtherInitial);
  const [customText, setCustomText] = useState(isOtherInitial ? value : "");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = PRESET_INSTITUTIONS.filter((inst) =>
    inst.toLowerCase().includes(search.toLowerCase()),
  );

  const selectPreset = (inst: string) => {
    setSearch(inst);
    setIsOther(false);
    setCustomText("");
    onChange(inst);
    setIsOpen(false);
  };

  const selectOther = () => {
    setSearch("");
    setIsOther(true);
    setIsOpen(false);
    if (customText) onChange(customText);
    else onChange("");
  };

  const handleSearchChange = (v: string) => {
    setSearch(v);
    setIsOther(false);
    setIsOpen(true);
    // If user is typing and it matches a preset exactly, set it
    if (PRESET_INSTITUTIONS.includes(v)) onChange(v);
    else onChange(v); // allow typing custom directly too
  };

  const handleCustomChange = (v: string) => {
    setCustomText(v);
    onChange(v);
  };

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="relative">
        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            value={displayInstitutionName(search, "")}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder="Search or select your institution…"
            className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 pr-10 text-gray-900 text-sm focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            <div className="max-h-72 overflow-y-auto">
              {filtered.length === 0 && (
                <p className="text-xs text-gray-400 px-4 py-3 italic">No matching institution found.</p>
              )}
              {filtered.map((inst) => (
                <button
                  key={inst}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); selectPreset(inst); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-sky-50 hover:text-sky-700 ${
                    value === inst ? "bg-sky-50 text-sky-700 font-semibold" : "text-gray-800"
                  }`}
                >
                  {displayInstitutionName(inst)}
                </button>
              ))}
              {/* "Other" always at bottom */}
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); selectOther(); }}
                className={`w-full text-left px-4 py-2.5 text-sm border-t border-gray-100 transition-colors hover:bg-amber-50 hover:text-amber-700 ${
                  isOther ? "bg-amber-50 text-amber-700 font-semibold" : "text-gray-500"
                }`}
              >
                ✏️ Other (Type Your Institution)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom text input when "Other" selected */}
      {isOther && (
        <input
          type="text"
          value={displayInstitutionName(customText, "")}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder="Type your institution name…"
          autoFocus
          className="w-full bg-white border border-amber-300 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all"
        />
      )}

      {/* Hint text */}
      {!isOther && value && PRESET_INSTITUTIONS.includes(value) && (
        <p className="text-[11px] text-sky-600 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          Institution selected
        </p>
      )}
    </div>
  );
}
// ─── Main Component ───────────────────────────────────────────────────────────
export default function CareerCompassPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading, role } = useLancingAuth();
  const fromPlacementCell = new URLSearchParams(window.location.search).get("from") === "placement-cell";
  const viewParam = new URLSearchParams(window.location.search).get("view");

  const isAdmin = user?.email?.toLowerCase() === PLATFORM_ADMIN_EMAIL;
  const isPlacementCell = role === "placement_cell";

  // ─── Premium subscription (server-authoritative) ───────────────────────────
  const { isPremium, isLoading: subLoading, subscription, refetch: refetchSub } =
    useCareerSubscription(isAuthenticated);
  const { pricing } = useCareerPricing();
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string | null>(null);

  const planSeenKey = user ? `cc_plan_seen_${user.uid}` : "";

  // Show the plan chooser when a non-premium student first opens Career Compass
  // (or whenever their subscription has lapsed).
  useEffect(() => {
    if (subLoading || !isAuthenticated || !user) return;
    if (isPremium) { setShowPlanModal(false); return; }
    if (subscription.expired) {
      try { localStorage.removeItem(planSeenKey); } catch {}
      toast({
        title: "Premium expired",
        description: "Your Career Compass Premium has expired. Renew to keep your premium features.",
        variant: "destructive",
      });
    }
    let seen = false;
    try { seen = localStorage.getItem(planSeenKey) === "1"; } catch {}
    if (!seen) setShowPlanModal(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subLoading, isAuthenticated, user?.uid, isPremium, subscription.expired]);

  const handleContinueFree = () => {
    try { localStorage.setItem(planSeenKey, "1"); } catch {}
    setShowPlanModal(false);
  };

  const openUpgrade = () => { setUpgradeFeature(null); setShowPlanModal(true); };

  // Handle PayU return (?premium=success|failed)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("premium");
    if (!p) return;
    if (p === "success") {
      toast({ title: "Welcome to Premium! 🎉", description: "Career Compass Premium is now unlocked." });
      try { localStorage.setItem(planSeenKey, "1"); } catch {}
      queryClient.invalidateQueries({ queryKey: ["/api/career-compass/subscription"] });
      refetchSub();
      // Restore the track the user came from before payment (institutional → stay on institutional)
      const tParam = new URLSearchParams(window.location.search).get("t");
      if (tParam === "institutional") {
        setTrack("institutional");
        try { localStorage.setItem("cc_track_v1", "institutional"); } catch {}
      }
    } else if (p === "failed") {
      toast({ title: "Payment not completed", description: "Your payment was not completed. You can try again anytime.", variant: "destructive" });
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("premium");
    url.searchParams.delete("t");
    window.history.replaceState({}, "", url.pathname + (url.search === "?" ? "" : url.search));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    if (authLoading) return;
    if (viewParam === "placement" && (isAdmin || isPlacementCell)) {
      setViewMode("placement");
    } else if (viewMode === "placement" && !isAdmin && !isPlacementCell) {
      // Non-PC, non-admin user who somehow landed on ?view=placement — reset to student
      setViewMode("student");
    }
  }, [viewParam, isAdmin, isPlacementCell, authLoading]);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(2);
  const [degree, setDegree] = useState("");
  const [year, setYear] = useState("");
  const [university, setUniversity] = useState("");
  const [fieldOfInterest, setFieldOfInterest] = useState("");
  const [selectedAspirations, setSelectedAspirations] = useState<string[]>([]);
  const [otherAspiration, setOtherAspiration] = useState("");
  const [careerSearch, setCareerSearch] = useState("");
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set());
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());
  const [commitmentIdx, setCommitmentIdx] = useState(2);
  const [hoursIdx, setHoursIdx] = useState(1);

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [generating, setGenerating] = useState(false);
  const [skillStatus, setSkillStatus] = useState<Record<string, "not_started" | "in_progress" | "done">>({});
  const [institutionalRoadmap, setInstitutionalRoadmap] = useState<Roadmap | null>(null);
  const [institutionalSkillStatus, setInstitutionalSkillStatus] = useState<Record<string, "not_started" | "in_progress" | "done">>({});
  const [institutionalPublished, setInstitutionalPublished] = useState(false);
  const [institutionalUpdatedAt, setInstitutionalUpdatedAt] = useState<string | null>(null);
  const [institutionalLoading, setInstitutionalLoading] = useState(false);
  const [institutionalLoadedKey, setInstitutionalLoadedKey] = useState("");
  const [institutionalLoadError, setInstitutionalLoadError] = useState(false);
  const [institutionalRetry, setInstitutionalRetry] = useState(0);
  const [roadmapSaveError, setRoadmapSaveError] = useState("");
  const [institutionalLastSaved, setInstitutionalLastSaved] = useState<string | null>(null);
  const institutionalSaveQueue = useRef<Promise<unknown>>(Promise.resolve());

  // Initialise from URL so placement-cell users land directly in placement mode
  const [viewMode, setViewMode] = useState<"student" | "placement">(() =>
    new URLSearchParams(window.location.search).get("view") === "placement" ? "placement" : "student"
  );
  const [placementStats, setPlacementStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [activeTab, setActiveTab] = useState<"roadmap" | "placement" | "profile" | "exams">("roadmap");
  // Career Compass dual-track: null = pick a track, "personal" = AI roadmap, "institutional" = admin-published
  const [track, setTrack] = useState<null | "personal" | "institutional">(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  // True once the saved session (server or localStorage) has been restored —
  // auto-save is disabled until then to avoid overwriting cloud data with empty state.
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const [initialPlacementSession, setInitialPlacementSession] = useState<any>(null);
  const [streamText, setStreamText] = useState("");
  const [generationStage, setGenerationStage] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [pendingTrack, setPendingTrack] = useState<null | "personal" | "institutional">(null);
  const [onboardedAt, setOnboardedAt] = useState<string | null>(null);
  const [accessExpiresAt, setAccessExpiresAt] = useState<Date | null>(null);

  // Profile tab state
  const [roadmapSavedToCloud, setRoadmapSavedToCloud] = useState(false);
  // Returning users who already have a saved personal roadmap skip the track picker.
  useEffect(() => {
    if (track === null && (roadmap || roadmapSavedToCloud)) setTrack("personal");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadmap, roadmapSavedToCloud]);

  // Cycle through loading step messages while generating
  useEffect(() => {
    if (!generating) { setLoadingStep(0); return; }
    const STEP_DURATIONS = [1200, 1800, 2500, 2000, 2000];
    setLoadingStep(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let accumulated = 0;
    STEP_DURATIONS.forEach((dur, i) => {
      accumulated += dur;
      const t = setTimeout(() => setLoadingStep(i + 1), accumulated);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
  }, [generating]);

  const [ccProfile, setCcProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Document upload state (Step 1)
  const DOC_KEYS = ["profile_photo", "aadhaar_card", "id_card", "marksheet_10th", "marksheet_12th_diploma", "marksheet_latest_sem"] as const;
  type DocKey = typeof DOC_KEYS[number];
  const [docFiles, setDocFiles] = useState<Partial<Record<DocKey, File>>>({});
  const [docUrls, setDocUrls] = useState<Partial<Record<DocKey, string>>>({});
  const [docErrors, setDocErrors] = useState<Partial<Record<DocKey, string>>>({});
  const [docUploading, setDocUploading] = useState<Partial<Record<DocKey, boolean>>>({});

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) setLocation("/lancing/login");
  }, [authLoading, isAuthenticated, user, setLocation]);

  // Server-first session restore; localStorage is fallback only
  useEffect(() => {
    // Reset auto-save guards whenever the signed-in user changes so a pending
    // save from the previous account can never write into the new account.
    setSessionHydrated(false);
    autoSaveSkipFirst.current = true;
    if (autoSaveTimer.current) { clearTimeout(autoSaveTimer.current); autoSaveTimer.current = null; }
    if (!user) return;
    const uidAtLoad = user.uid;
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const r = await fetch("/api/career-compass/load-session", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (r.ok) {
          const { session } = await r.json();
          if (session) {
            if (session.degree) setDegree(session.degree);
            if (session.year) setYear(session.year);
            if (session.university) setUniversity(session.university);
            if (session.aspirations?.length) setSelectedAspirations(session.aspirations);
            if (session.commitment) {
              const idx = COMMITMENT_LABELS.indexOf(session.commitment);
              if (idx >= 0) setCommitmentIdx(idx);
            }
            if (session.hours) {
              const idx = HOURS_OPTIONS.indexOf(session.hours);
              if (idx >= 0) setHoursIdx(idx);
            }
            if (session.roadmap) { setRoadmap(session.roadmap); setRoadmapSavedToCloud(true); }
            if (session.skillStatus && Object.keys(session.skillStatus).length > 0) setSkillStatus(session.skillStatus);
            if (session.lastSaved) setLastSaved(session.lastSaved);
            if (session.placementPhase !== "entry" || session.placementSelectedSkills?.length > 0) {
              setInitialPlacementSession(session);
            }
            if (auth.currentUser?.uid === uidAtLoad) setSessionHydrated(true);
            return; // server data loaded — skip localStorage
          }
        }
      } catch {}
      // Fallback: localStorage
      try {
        const saved = localStorage.getItem(`career_compass_${user.uid}`);
        if (saved) {
          const data = JSON.parse(saved);
          if (data.roadmap) setRoadmap(data.roadmap);
          if (data.skillStatus) setSkillStatus(data.skillStatus);
          if (data.degree) setDegree(data.degree);
          if (data.year) setYear(data.year);
          if (data.aspirations) setSelectedAspirations(data.aspirations);
        }
      } catch {}
      if (auth.currentUser?.uid === uidAtLoad) setSessionHydrated(true);
    })();
  }, [user]);

  // Keep localStorage in sync as lightweight local backup
  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem(`career_compass_${user.uid}`, JSON.stringify({ roadmap, skillStatus, degree, year, aspirations: selectedAspirations }));
    } catch {}
  }, [roadmap, skillStatus, user, degree, year, selectedAspirations]);

  // ── Auto-save to cloud as the user enters info (debounced) ──
  // Replaces the manual "Save Info" button: any change to degree, year,
  // aspirations, commitment, hours, or skill progress is saved automatically.
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveSkipFirst = useRef(true);
  const autoSaveSeq = useRef(0);
  useEffect(() => {
    if (!user || !sessionHydrated) return;
    if (track === "institutional") return; // institutional skill progress has its own store
    // Skip the very first run after hydration (state just restored, nothing new to save)
    if (autoSaveSkipFirst.current) { autoSaveSkipFirst.current = false; return; }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    const uidAtSchedule = user.uid;
    autoSaveTimer.current = setTimeout(async () => {
      // Identity check: never save if the signed-in user changed since scheduling
      if (auth.currentUser?.uid !== uidAtSchedule) return;
      const seq = ++autoSaveSeq.current;
      setSaving(true);
      try {
        const body: Record<string, any> = {
          degree, year,
          aspirations: selectedAspirations,
          commitment: COMMITMENT_LABELS[commitmentIdx],
          hours: HOURS_OPTIONS[hoursIdx],
          university,
          step,
        };
        if (roadmap) body.skillStatus = skillStatus;
        const r = await authedFetch("/api/career-compass/save-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        // Ignore stale responses — only the latest save updates the UI
        if (r.ok && seq === autoSaveSeq.current) setLastSaved(new Date().toISOString());
      } catch {}
      if (seq === autoSaveSeq.current) setSaving(false);
    }, 1200);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionHydrated, degree, year, selectedAspirations, commitmentIdx, hoursIdx, university, step, skillStatus, track]);

  // Read ?t=personal or ?t=institutional from the query string (for direct-link / bookmark support).
  const trackFromUrl: "personal" | "institutional" | null = (() => {
    try {
      const t = new URLSearchParams(window.location.search).get("t");
      return t === "personal" || t === "institutional" ? t : null;
    } catch { return null; }
  })();

  // Persist the selected track so returning users land in their chosen track directly.
  useEffect(() => {
    if (!user) return;
    if (track !== null) {
      try { localStorage.setItem(`cc_track_${user.uid}`, track); } catch {}
    }
  }, [user, track]);

  // Silently update the URL query param when track changes so the link is bookmarkable.
  useEffect(() => {
    if (!user) return;
    try {
      if (track) {
        window.history.replaceState(null, "", `/lancing/career-compass?t=${track}`);
      } else {
        window.history.replaceState(null, "", `/lancing/career-compass`);
      }
    } catch {}
  }, [user, track]);

  // Restore saved track on mount — query param takes priority over localStorage.
  useEffect(() => {
    if (!user || track !== null) return;
    if (trackFromUrl) { setTrack(trackFromUrl); return; }
    try {
      const saved = localStorage.getItem(`cc_track_${user.uid}`);
      if (saved === "personal" || saved === "institutional") setTrack(saved);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Check if user has completed onboarding — store flag but don't pop modal yet.
  // The modal fires after the student picks a track so they see the landing first.
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const r = await fetch("/api/career-compass/check-onboarded", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (r.ok) {
          const { onboarded, onboarded_at } = await r.json();
          if (!onboarded) setNeedsOnboarding(true);
          if (onboarded_at) setOnboardedAt(onboarded_at);
        }
      } catch {}
    })();
  }, [user]);

  // When student picks a track: show onboarding first if they haven't done it yet,
  // otherwise jump straight to the track.
  const handleTrackSelect = (t: "personal" | "institutional") => {
    if (needsOnboarding) {
      setPendingTrack(t);
      setShowOnboarding(true);
    } else {
      setTrack(t);
    }
  };

  // Load career_compass_access_expires_at for 365-day paid access check
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDoc(doc(firestore, "users", user.uid));
        const data = snap.data();
        const expires = data?.career_compass_access_expires_at;
        if (expires) {
          setAccessExpiresAt(expires.toDate ? expires.toDate() : new Date(expires));
        }
      } catch {}
    })();
  }, [user]);

  const orgLabel = (pendingTrack ?? track) === "institutional" ? "Placement Cell" : "StudentXchange";

  const activeRoadmap = track === "institutional" ? institutionalRoadmap : roadmap;
  const activeSkillStatus = track === "institutional" ? institutionalSkillStatus : skillStatus;
  const allSkills = activeRoadmap ? activeRoadmap.years.flatMap((y) => y.skills) : [];
  const doneCount = allSkills.filter((s) => activeSkillStatus[s.name] === "done").length;
  const profileScore = allSkills.length > 0 ? Math.round((doneCount / allSkills.length) * 100) : 0;
  // Skills-only sync into Placement Readiness from the active track.
  const roadmapSkillNames = Array.from(new Set(allSkills.map((s) => s.name).filter(Boolean)));

  // Published institutional plans take precedence over the student's saved generated plan.
  // Both use the same visible form and roadmap view as the personal track.
  useEffect(() => {
    if (track !== "institutional" || !user || !degree || !year) {
      setInstitutionalRoadmap(null);
      setInstitutionalLoadedKey("");
      setInstitutionalLoading(false);
      setInstitutionalLoadError(false);
      return;
    }
    let cancelled = false;
    const key = `${user.uid}:${degree}:${year}`;
    setInstitutionalRoadmap(null);
    setInstitutionalPublished(false);
    setInstitutionalLoadedKey("");
    setInstitutionalLoading(true);
    setInstitutionalLoadError(false);
    (async () => {
      try {
        const [publishedRes, progressRes] = await Promise.all([
          authedFetch(`/api/institutional-roadmap/student?degree=${encodeURIComponent(degree)}&year=${encodeURIComponent(year)}`),
          authedFetch(`/api/institutional-roadmap/progress?degree=${encodeURIComponent(degree)}&year=${encodeURIComponent(year)}`),
        ]);
        if (!publishedRes.ok || !progressRes.ok) throw new Error("Unable to load institutional roadmap");
        const [published, progress] = await Promise.all([publishedRes.json(), progressRes.json()]);
        if (cancelled) return;
        const hasPublished = published.status === "published" && !!published.roadmap;
        setInstitutionalPublished(hasPublished);
        setInstitutionalUpdatedAt(hasPublished ? published.lastUpdated : null);
        setInstitutionalRoadmap(hasPublished ? published.roadmap : progress.generatedRoadmap || null);
        setInstitutionalSkillStatus(progress.skillStatus || {});
        setInstitutionalLoadedKey(key);
      } catch {
        if (!cancelled) setInstitutionalLoadError(true);
      } finally {
        if (!cancelled) setInstitutionalLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [track, user?.uid, degree, year, institutionalRetry]);

  const saveInstitutionalProgress = (next: Record<string, "not_started" | "in_progress" | "done">, generatedRoadmap?: Roadmap): Promise<void> => {
    const degreeAtSave = degree;
    const save = async () => {
      const response = await authedFetch("/api/institutional-roadmap/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ degree: degreeAtSave, year, skillStatus: next, ...(generatedRoadmap ? { generatedRoadmap } : {}) }),
      });
      if (!response.ok) throw new Error("Institutional progress could not be saved.");
      setInstitutionalLastSaved(new Date().toISOString());
      setRoadmapSaveError("");
    };
    const pending = institutionalSaveQueue.current.then(save, save);
    institutionalSaveQueue.current = pending.catch(() => {});
    return pending.catch((error) => {
      setRoadmapSaveError(error.message || "Institutional progress could not be saved.");
      throw error;
    });
  };

  const toggleAspiration = (label: string) => {
    setSelectedAspirations((prev) => {
      const goal = findCareerGoal(label);
      const selectedValue = prev.find((value) => findCareerGoal(value)?.id === goal?.id || value === label);
      if (selectedValue) return prev.filter((a) => a !== selectedValue);
      if (prev.length >= 3) { toast({ title: "Max 3 aspirations", description: "Please deselect one first." }); return prev; }
      return [...prev, goal?.label ?? label];
    });
  };

  const isGoalSelected = useCallback((label: string) => {
    const goal = findCareerGoal(label);
    return selectedAspirations.some((value) => findCareerGoal(value)?.id === goal?.id || value === label);
  }, [selectedAspirations]);

  const careerSearchResults = useMemo(
    () => careerSearch.trim() ? searchCareerGoals(careerSearch, 36) : [],
    [careerSearch],
  );
  const popularGoals = useMemo(
    () => POPULAR_CAREER_GOALS.map((label) => CAREER_GOALS.find((goal) => goal.label === label)).filter(Boolean),
    [],
  );
  const toggleSector = (id: string) => {
    setExpandedSectors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleFamily = (key: string) => {
    setExpandedFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const cycleSkill = useCallback((name: string) => {
    if (track === "institutional") {
      setInstitutionalSkillStatus((prev) => {
        const cur = prev[name] || "not_started";
        const next: "not_started" | "in_progress" | "done" = cur === "not_started" ? "in_progress" : cur === "in_progress" ? "done" : "not_started";
        const updated = { ...prev, [name]: next };
        void saveInstitutionalProgress(updated).catch(() => {});
        return updated;
      });
      return;
    }
    setSkillStatus((prev) => {
      const cur = prev[name] || "not_started";
      const next = cur === "not_started" ? "in_progress" : cur === "in_progress" ? "done" : "not_started";
      return { ...prev, [name]: next };
    });
  }, [track, degree]);

  const persistClientRoadmap = async (value: Roadmap, selectedGoals: string[]) => {
    if (track === "institutional") {
      await saveInstitutionalProgress(institutionalSkillStatus, institutionalPublished ? undefined : value);
      return;
    }
    const roadmapResponse = await authedFetch("/api/career-compass/save-roadmap", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roadmap: value }),
    });
    if (!roadmapResponse.ok) throw new Error("Your roadmap is visible, but could not be saved. Retry below.");
    const sessionResponse = await authedFetch("/api/career-compass/save-session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        degree, year, aspirations: selectedGoals, commitment: COMMITMENT_LABELS[commitmentIdx],
        hours: HOURS_OPTIONS[hoursIdx], university, step,
      }),
    });
    if (!sessionResponse.ok) throw new Error("Your roadmap is saved, but your selections could not be saved. Retry below.");
    setRoadmapSavedToCloud(true);
    setLastSaved(new Date().toISOString());
    setRoadmapSaveError("");
  };

  const generateRoadmap = async () => {
    const customGoal = selectedAspirations.includes("Other");
    const aspirationsToSend = selectedAspirations.map((a) => a === "Other" && otherAspiration ? otherAspiration : a);
    if (!degree || !year || aspirationsToSend.length === 0) {
      toast({ title: "Please complete all fields", variant: "destructive" }); return;
    }
    setGenerating(true);
    setGenerationStage("");
    setRoadmapSaveError("");
    if (track === "institutional") setInstitutionalLastSaved(null);
    else setRoadmapSavedToCloud(false);
    setStreamText("");
    setLoadingStep(0);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/career-compass/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          degree, year, aspirations: aspirationsToSend,
          commitment: COMMITMENT_LABELS[commitmentIdx],
          hours: HOURS_OPTIONS[hoursIdx],
          university,
          fieldOfInterest: fieldOfInterest.trim() || undefined,
          track: track || "personal",
          customGoal,
        }),
      });

      if (!response.ok) {
        const failure = await response.json().catch(() => null);
        throw new Error(
          failure?.message ||
          (failure?.error === "quota_exceeded" ? "Daily roadmap limit reached. Please try again after it resets." : "") ||
          `Server error ${response.status}`,
        );
      }

      const ct = response.headers.get("Content-Type") || "";
      let finalRoadmap: Roadmap | null = null;
      let savedByServer = false;
      if (ct.includes("application/json")) {
        // Cache hit — instant JSON response
        const data = await response.json();
        if (data.roadmap) {
          finalRoadmap = data.roadmap;
          savedByServer = data.saved === true;
        } else {
          throw new Error(data.message || data.error || "The saved roadmap is unavailable. Please retry.");
        }
      } else {
        // SSE streaming
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const payload = JSON.parse(line.slice(6));
              if (payload.reset) setStreamText("");
              if (payload.t) setStreamText((prev) => prev + payload.t);
              if (payload.progress && payload.progress !== "building_roadmap") {
                const stageLabels: Record<string, string> = {
                  preparing: "Preparing your career context…",
                  generating: "Generating your Career Map with Gemini…",
                  retrying_for_complete_roadmap: "Checking for a complete roadmap…",
                  reviewing: "Reviewing career fit and quality…",
                  validating: "Validating the roadmap structure…",
                  finalizing: "Validating and saving your roadmap…",
                };
                if (stageLabels[payload.progress]) setGenerationStage(stageLabels[payload.progress]);
              }
              if (payload.done && payload.roadmap) {
                finalRoadmap = payload.roadmap;
                savedByServer = payload.saved === true;
              }
              if (payload.error) throw new Error(payload.error);
            } catch (e) {
              if ((e as any) instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }
      if (!finalRoadmap) throw new Error("The connection was interrupted before the roadmap finished. Please try again.");
      if (track === "institutional") setInstitutionalRoadmap(finalRoadmap);
      else setRoadmap(finalRoadmap);
      if (savedByServer) {
        if (track === "personal") setRoadmapSavedToCloud(true);
        if (track === "institutional") setInstitutionalLastSaved(new Date().toISOString());
        else setLastSaved(new Date().toISOString());
        setRoadmapSaveError("");
      } else {
        try {
          await persistClientRoadmap(finalRoadmap, aspirationsToSend);
        } catch (saveError: any) {
          setRoadmapSaveError(saveError.message || "Your roadmap could not be saved. Retry below.");
        }
      }
    } catch (e: any) {
      toast({ title: "Failed to generate roadmap", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
      setStreamText("");
    }
  };

  const loadCCProfile = async () => {
    if (profileLoading || ccProfile) return;
    setProfileLoading(true);
    try {
      const r = await authedFetch("/api/career-compass/load-profile");
      if (r.ok) { const { profile } = await r.json(); if (profile) setCcProfile(profile); }
    } catch {}
    setProfileLoading(false);
  };

  const loadPlacementStats = async () => {
    if (placementStats) return;
    setLoadingStats(true);
    try {
      const r = await authedFetch("/api/career-compass/placement-stats");
      if (r.ok) setPlacementStats(await r.json());
    } catch {}
    setLoadingStats(false);
  };

  const switchToPlacement = () => { setViewMode("placement"); loadPlacementStats(); };

  // Auto-switch placement cell users straight to the placement dashboard
  useEffect(() => {
    if (isPlacementCell) {
      setViewMode("placement");
      loadPlacementStats();
    }
  }, [isPlacementCell]);

  const skillsByCategory = allSkills.reduce<Record<string, RoadmapSkill[]>>((acc, s) => {
    const cat = s.category || "technical";
    if (!acc[cat]) acc[cat] = [];
    if (!acc[cat].find((x) => x.name === s.name)) acc[cat].push(s);
    return acc;
  }, {});

  const exportCSV = () => {
    if (!placementStats?.profiles?.length) return;
    const header = "Email,Degree,Year,Aspirations,University,Profile Score";
    const rows = placementStats.profiles.map((p: any) =>
      [p.email, p.degree, p.year, `"${p.aspirations}"`, p.university, p.profileScore].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "adypu_career_data.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // Placement Readiness is open to all years — access is gated only by Premium.
  const placementEnabled = true;

  // Smart back navigation — never clears entered values, roadmap, or placement data.
  // Returns user to whichever page they came from (browser history) or dashboard.
  const handleBack = () => {
    // If user is mid-form (no roadmap yet), step back through the form first.
    if (!activeRoadmap && step === 4) { setStep(3); return; }
    if (!activeRoadmap && step === 3) { setStep(2); return; }
    if (!activeRoadmap && step === 2) { setTrack(null); return; }
    // Otherwise: prefer browser back so we land where the user came from
    // (dashboard, internships, sure-shot, etc). Falls back to dashboard.
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      // Safety net: if history.back() doesn't navigate within 200ms, force dashboard.
      setTimeout(() => {
        if (window.location.pathname === "/lancing/career-compass") {
          setLocation("/lancing/freelancer-dashboard");
        }
      }, 200);
      return;
    }
    setLocation("/lancing/freelancer-dashboard");
  };

  const handleDocumentContinue = async () => {
    const SIZE_LIMITS: Record<string, number> = {
      profile_photo: 2, aadhaar_card: 5, id_card: 5,
      marksheet_10th: 10, marksheet_12th_diploma: 10, marksheet_latest_sem: 10,
    };
    const newErrors: Partial<Record<string, string>> = {};
    for (const [key, file] of Object.entries(docFiles)) {
      if (file && file.size > (SIZE_LIMITS[key] || 10) * 1024 * 1024) {
        newErrors[key] = `File exceeds ${SIZE_LIMITS[key]}MB limit`;
      }
    }
    if (Object.keys(newErrors).length > 0) { setDocErrors(newErrors as any); return; }

    if (!user || Object.keys(docFiles).length === 0) { setStep(2); return; }

    const newUploading: Partial<Record<string, boolean>> = {};
    const newUrls: Partial<Record<string, string>> = { ...docUrls };
    const entries = Object.entries(docFiles) as [string, File][];
    for (const [key] of entries) newUploading[key] = true;
    setDocUploading(newUploading as any);

    await Promise.all(entries.map(async ([key, file]) => {
      try {
        const filename = `${Date.now()}_${file.name}`;
        const fileRef = storageRef(storage, `student-documents/${user.uid}/${key}/${filename}`);
        await uploadBytes(fileRef, file);
        newUrls[key] = await getDownloadURL(fileRef);
      } catch (e) {
        console.error(`Doc upload failed (${key}):`, e);
      } finally {
        setDocUploading((prev) => { const n = { ...prev }; delete (n as any)[key]; return n; });
      }
    }));
    setDocUrls(newUrls as any);

    if (Object.keys(newUrls).length > 0) {
      try {
        await setDoc(doc(firestore, "users", user.uid), { career_compass_profile: { documents: newUrls } }, { merge: true });
        if (university) {
          await setDoc(doc(firestore, "spcr_students", university, user.uid, "documents"), newUrls, { merge: true });
        }
      } catch (e) { console.error("Failed to save doc URLs to Firestore:", e); }
    }
    setStep(2);
  };

  const handleReset = () => {
    setRoadmap(null);
    setStep(2);
    setSkillStatus({});
    setDegree("");
    setYear("");
    setFieldOfInterest("");
    setSelectedAspirations([]);
    setOtherAspiration("");
    setCommitmentIdx(2);
    setHoursIdx(1);
    try {
      if (user) localStorage.removeItem(`career_compass_${user.uid}`);
    } catch {}
    // Clear cloud roadmap + session (keep onboarding profile and skill_results intact)
    if (user) {
      authedFetch("/api/career-compass/save-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ degree: "", year: "", aspirations: [], commitment: "", hours: "", university: "", step: 1, skillStatus: {} }),
      }).catch(() => {});
    }
  };

  const handleChangeSelections = () => {
    if (track === "institutional") {
      if (institutionalPublished) return;
      setInstitutionalRoadmap(null);
    } else {
      setRoadmap(null);
      setRoadmapSavedToCloud(false);
      setSkillStatus({});
    }
    setStep(1);
    setActiveTab("roadmap");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const backLabel = step > 1 || activeRoadmap ? "Back" : "Dashboard";

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  const earnedCredits = allSkills.filter(s => activeSkillStatus[s.name] === "done").reduce((sum, s) => sum + (s.credit_points || 2), 0);
  const totalCredits = allSkills.reduce((sum, s) => sum + (s.credit_points || 2), 0);

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 overflow-x-hidden">
      {showOnboarding && user && (
        <OnboardingModal
          user={user}
          track={pendingTrack || track}
          onComplete={(profile) => {
            setShowOnboarding(false);
            setNeedsOnboarding(false);
            if (profile) setCcProfile(profile);
            if (fromPlacementCell) setLocation("/lancing/placement-cell-dashboard");
            // Navigate to the track the student had picked before onboarding
            if (pendingTrack) { setTrack(pendingTrack); setPendingTrack(null); }
          }}
        />
      )}

      {/* ── Premium: plan chooser + upgrade prompt ── */}
      {!isAdmin && (
        <CareerCompassPlanModal
          open={showPlanModal}
          onContinueFree={handleContinueFree}
          customerName={user?.email?.split("@")[0]}
          returnTrack={track ?? "personal"}
        />
      )}
      <CareerCompassUpgradeDialog
        open={upgradeFeature !== null}
        onOpenChange={(o) => { if (!o) setUpgradeFeature(null); }}
        onUpgrade={openUpgrade}
        featureName={upgradeFeature ?? undefined}
      />


      {/* ── Sticky Top Bar ── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
          {/* Back / breadcrumb */}
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-500 hover:text-gray-800 text-sm font-medium flex-shrink-0 min-w-0"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">{backLabel}</span>
          </button>

          {/* Title */}
          <div className="flex items-center gap-2 flex-1 min-w-0 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Map className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-base sm:text-lg truncate">Career Compass</span>
            {track !== null && viewMode === "student" && (
              <span className={`hidden sm:block text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 border ${track === "institutional" ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-sky-600 bg-sky-50 border-sky-200"}`}>
                {track === "institutional" ? "Institutional" : "Personal"}
              </span>
            )}
            {roadmap && degree && track === "personal" && (
              <span className="hidden lg:block text-[11px] text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full font-semibold flex-shrink-0 truncate max-w-[120px]">
                {degree}
              </span>
            )}
          </div>
          {/* Switch Track — only shown once inside a track */}
          {track !== null && viewMode === "student" && (
            <button
              onClick={() => {
                setTrack(null);
                try { if (user) localStorage.removeItem(`cc_track_${user.uid}`); } catch {}
              }}
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-sky-600 transition-colors flex-shrink-0 px-2 py-1 rounded-lg hover:bg-gray-100"
              title="Go back to track selection"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Switch Track</span>
            </button>
          )}

          {/* Auto-save status — progress saves automatically as info is entered */}
          {viewMode === "student" && (
            <div
              title={(track === "institutional" ? institutionalLastSaved : lastSaved)
                ? `Last saved: ${new Date((track === "institutional" ? institutionalLastSaved : lastSaved)!).toLocaleTimeString()}`
                : "Your progress saves automatically as you enter info"}
              className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex-shrink-0"
            >
              {track !== "institutional" && saving
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : (track === "institutional" ? institutionalLastSaved : lastSaved)
                  ? <CheckCircle2 className="w-3.5 h-3.5" />
                  : <CloudUpload className="w-3.5 h-3.5" />
              }
              <span className="hidden sm:inline">{roadmapSaveError ? "Save failed" : track !== "institutional" && saving ? "Saving…" : (track === "institutional" ? institutionalLastSaved : lastSaved) ? "Saved" : "Auto-save"}</span>
            </div>
          )}

          {/* Step pills (onboarding only) */}
          {(track === "personal" || track === "institutional") && !activeRoadmap && viewMode === "student" && activeTab === "roadmap" && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {[1, 2, 3, 4].map(s => (
                <div
                  key={s}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step > s ? "bg-sky-600 text-white" : step === s ? "bg-sky-600 text-white ring-2 ring-sky-200" : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {step > s ? <CheckCircle2 className="w-3.5 h-3.5" /> : s}
                </div>
              ))}
            </div>
          )}

          {/* Admin/PC toggle */}
          {(isAdmin || isPlacementCell) && (
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-full p-0.5 flex-shrink-0">
              {isAdmin && (
                <button
                  onClick={() => setViewMode("student")}
                  className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold transition-colors ${viewMode === "student" ? "bg-sky-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Student
                </button>
              )}
              <button
                onClick={switchToPlacement}
                className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold transition-colors ${viewMode === "placement" ? "bg-sky-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                SPCR
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Page Body ── */}
      {track === null && viewMode === "student" ? (
        /* ── Track-selector landing: clean screen, no sidebar/banner/tabs ── */
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-12 lg:py-16">
          <CareerTrackLanding institution={university} onSelect={handleTrackSelect} />
        </div>
      ) : (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-6 flex gap-6 items-start">

        {/* ── Left Sidebar (desktop only) ── */}
        <aside className="hidden lg:flex flex-col gap-4 w-64 xl:w-72 flex-shrink-0 sticky top-[4.5rem]">

          {/* Profile Card */}
          <Link href="/lancing/profile-board">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-5 cursor-pointer group">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow overflow-hidden">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
                    ) : (
                      <Contact className="w-8 h-8 text-white" />
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
                </div>
                <div className="min-w-0 w-full">
                  <div className="font-bold text-gray-900 text-sm truncate leading-snug">
                    {user?.displayName || user?.email?.split("@")[0] || "My Profile"}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 truncate">{user?.email || ""}</div>
                </div>
                <div className="w-full">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-sky-600 group-hover:text-sky-700 bg-sky-50 group-hover:bg-sky-100 rounded-xl py-2 px-3 transition-all">
                    <Contact className="w-3.5 h-3.5" />
                    View My Profile
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Quick Navigation */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Quick Access</div>
            <nav className="space-y-0.5">
              {[
                { href: "/lancing/freelancer-dashboard", icon: Briefcase, label: "Dashboard" },
                { href: "/lancing/profile-board", icon: Contact, label: "My Profile" },
                { href: "/lancing/attendance", icon: CalendarCheck, label: "My Attendance" },
                { href: "/lancing/ai-match", icon: Sparkles, label: "AI Match" },
                { href: "/lancing/sure-shot", icon: Shield, label: "Sure Shot Jobs" },
              ].map(({ href, icon: Icon, label }) => (
                <Link key={href} href={href}>
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                    <Icon className="w-4 h-4 text-gray-400 group-hover:text-sky-600 flex-shrink-0 transition-colors" />
                    <span className="text-sm text-gray-600 group-hover:text-sky-700 font-medium transition-colors">{label}</span>
                  </div>
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        <main className="flex-1 min-w-0 space-y-4 sm:space-y-5">

          {/* ── Mobile profile strip (visible below lg) ── */}
          <div className="lg:hidden">
            <Link href="/lancing/profile-board">
              <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-3.5 cursor-pointer group">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-sm overflow-hidden flex-shrink-0">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-11 h-11 rounded-full object-cover" />
                  ) : (
                    <Contact className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 text-sm truncate leading-snug">
                    {user?.displayName || user?.email?.split("@")[0] || "My Profile"}
                  </div>
                  <div className="text-xs text-sky-600 font-semibold mt-0.5">View My Profile →</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </div>
            </Link>
          </div>

        {/* ── Hero Banner ── */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-sky-600 via-indigo-600 to-violet-700 shadow-lg">
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle at 15% 60%, #fff 0%, transparent 45%), radial-gradient(circle at 85% 30%, #a5b4fc 0%, transparent 45%)" }}
          />
          <div className="relative z-10 p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="w-4 h-4 text-sky-200 flex-shrink-0" />
                  <span className="text-sky-200 font-semibold text-xs tracking-widest uppercase">
                    {track === "institutional" ? `${displayInstitutionName(university)} × StudentXchange` : "StudentXchange Personal"}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  {track === "institutional" ? "Your Institutional Career Roadmap" : "Your AI Career Roadmap"}
                </h1>
                <p className="text-sky-100 text-xs sm:text-sm mt-1.5 leading-relaxed max-w-sm">
                  {track === "institutional"
                    ? "Your career plan and readiness with StudentXchange as your institution's knowledge partner. Placements are handled by your institution."
                    : "Personalised plan — skills, internships & companies tailored to your degree and goals."}
                </p>
              </div>
              {/* Stats — hidden on very small screens to avoid overflow */}
              <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                {[["4-yr", "Roadmap"], ["AI", "Powered"], ["Free", "Access"]].map(([val, sub]) => (
                  <div key={val} className="text-center">
                    <div className="text-xl font-black text-white leading-none">{val}</div>
                    <div className="text-[10px] text-sky-200 mt-0.5">{sub}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Mobile stats row */}
            <div className="flex sm:hidden items-center gap-4 mt-3 pt-3 border-t border-white/20">
              {[["4-Year", "Roadmap"], ["AI", "Powered"], ["Free", "Access"]].map(([val, sub]) => (
                <div key={val} className="text-center">
                  <div className="text-sm font-black text-white leading-none">{val}</div>
                  <div className="text-[9px] text-sky-200">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tab Switcher (student view) ── */}
        {viewMode === "student" && (
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => {
                setActiveTab("roadmap");
                // Keep the student's selected track when returning to the roadmap tab.
              }}
              className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all text-center ${
                activeTab === "roadmap" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              🗺️ <span className="hidden sm:inline ml-0.5">Career </span><span className="ml-0.5">Roadmap</span>
            </button>
            <button
              onClick={() => {
                if (!isPremium) { setUpgradeFeature("Placement Readiness"); return; }
                setActiveTab("placement");
              }}
              title={!isPremium ? "Premium feature" : ""}
              className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all text-center ${
                activeTab === "placement"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {!isPremium
                ? <Lock className="w-3 h-3 inline mr-0.5 -mt-0.5 text-amber-500" />
                : "🎯 "}
              <span className="hidden sm:inline ml-0.5">Placement </span><span className="ml-0.5">Readiness</span>
            </button>
            <button
              onClick={() => { setActiveTab("profile"); loadCCProfile(); }}
              className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all text-center ${
                activeTab === "profile" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              👤 <span className="ml-0.5">My Profile</span>
            </button>
            <button
              onClick={() => {
                if (!isPremium) { setUpgradeFeature("Skill Assessments & Exams"); return; }
                setActiveTab("exams");
              }}
              title={!isPremium ? "Premium feature" : ""}
              className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all text-center ${
                activeTab === "exams" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {!isPremium
                ? <Lock className="w-3.5 h-3.5 inline mr-0.5 -mt-0.5 text-amber-500" />
                : <PenLine className="w-3.5 h-3.5 inline mr-0.5" />}
              <span>My Exams</span>
            </button>
          </div>
        )}

        {/* ── ADMIN / PC: Placement Cell View ── */}
        {viewMode === "placement" && (
          authLoading
            ? <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
            : (isAdmin || isPlacementCell)
              ? <PlacementCellView stats={placementStats} loading={loadingStats} onExportCSV={exportCSV} />
              : null
        )}

        {/* ── STUDENT: Career Roadmap tab ── */}
        {viewMode === "student" && activeTab === "roadmap" && (
          <>
            {/* Both tracks use the same student journey and roadmap interface. */}
            {(track === "personal" || track === "institutional") && (
              <>
                <button
                  onClick={() => setTrack(null)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors mb-3"
                >
                  <ArrowLeft className="w-4 h-4" /> Choose track
                </button>

            {track === "institutional" && institutionalLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
                <span className="ml-3 text-sm text-gray-600">Loading your institutional roadmap…</span>
              </div>
            )}
            {track === "institutional" && institutionalLoadError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                Could not load your institution's roadmap. <button type="button" className="font-bold underline" onClick={() => setInstitutionalRetry((n) => n + 1)}>Retry</button>
              </div>
            )}
            {track === "institutional" && institutionalPublished && institutionalUpdatedAt && (
              <p className="text-xs text-gray-500">Institution-published roadmap · Updated {new Date(institutionalUpdatedAt).toLocaleDateString()}</p>
            )}
            {/* ── Onboarding Form ── */}
            {!activeRoadmap && !generating && !institutionalLoading && !institutionalLoadError && (track === "institutional" ? (!degree || !year || institutionalLoadedKey === `${user?.uid}:${degree}:${year}`) : !roadmapSavedToCloud) && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Progress bar at top */}
                <div className="h-1 bg-gray-100">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-all duration-500"
                    style={{ width: `${((step - 2) / 3) * 100}%` }}
                  />
                </div>

                <div className="p-5 sm:p-7">
                  {/* Step label — docs step is skipped; steps 2/3/4 display as 1/2/3 */}
                  <div className="flex items-center gap-2 mb-5">
                    <span className="text-[11px] font-bold text-sky-600 uppercase tracking-widest">
                      Step {step - 1} of 3
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="text-[11px] text-gray-400">
                      {step === 2 ? "Your background" : step === 3 ? "Career goals" : "Work style"}
                    </span>
                  </div>

                  {/* ── Step 1: Documents ── */}
                  {step === 1 && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                          Upload your documents 📄
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                          These help {orgLabel} verify your eligibility. All uploads are optional for now.
                        </p>
                      </div>

                      <div className="bg-sky-50 border border-sky-100 rounded-xl px-3 py-2.5 text-xs text-sky-700 flex items-start gap-2">
                        <span className="mt-0.5">ℹ️</span>
                        <span>You can upload documents later from your Profile Board.</span>
                      </div>

                      <div className="space-y-3">
                        {([
                          { key: "profile_photo", label: "Profile Photo", accept: ".jpg,.jpeg,.png", maxMB: 2, note: null, isImage: true },
                          { key: "aadhaar_card", label: "Aadhaar Card", accept: ".pdf,.jpg,.jpeg,.png", maxMB: 5, note: null, isImage: false },
                          { key: "id_card", label: "College / University ID Card", accept: ".pdf,.jpg,.jpeg,.png", maxMB: 5, note: null, isImage: false },
                          { key: "marksheet_10th", label: "10th Marksheet", accept: ".pdf,.jpg,.jpeg,.png", maxMB: 10, note: null, isImage: false },
                          { key: "marksheet_12th_diploma", label: "12th Marksheet / Diploma", accept: ".pdf,.jpg,.jpeg,.png", maxMB: 10, note: "(upload whichever applies to you)", isImage: false },
                          { key: "marksheet_latest_sem", label: "Latest Semester Marksheet", accept: ".pdf,.jpg,.jpeg,.png", maxMB: 10, note: "(most recent available)", isImage: false },
                        ] as { key: string; label: string; accept: string; maxMB: number; note: string | null; isImage: boolean }[]).map(({ key, label, accept, maxMB, note, isImage }) => {
                          const file = (docFiles as any)[key] as File | undefined;
                          const url = (docUrls as any)[key] as string | undefined;
                          const err = (docErrors as any)[key] as string | undefined;
                          const uploading = (docUploading as any)[key] as boolean | undefined;
                          return (
                            <div key={key} className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-bold text-gray-700">{label}</span>
                                  {note && <span className="text-[10px] text-gray-400 ml-1.5">{note}</span>}
                                  <p className="text-[10px] text-gray-400 mt-0.5">Max {maxMB}MB · {isImage ? "JPG, PNG" : "PDF, JPG, PNG"}</p>
                                </div>
                                {uploading && <Loader2 className="w-4 h-4 text-sky-500 animate-spin flex-shrink-0" />}
                                {url && !uploading && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                              </div>
                              {isImage && file && (
                                <img src={URL.createObjectURL(file)} alt="Preview" className="mt-2 w-16 h-16 rounded-lg object-cover border border-gray-200" />
                              )}
                              {!isImage && file && <p className="text-[10px] text-sky-600 mt-1 truncate">{file.name}</p>}
                              {err && <p className="text-[10px] text-red-500 mt-1">{err}</p>}
                              <label className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-600 cursor-pointer hover:text-sky-700">
                                <CloudUpload className="w-3.5 h-3.5" />
                                {file ? "Replace" : "Choose file"}
                                <input
                                  type="file"
                                  accept={accept}
                                  className="sr-only"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    if (f.size > maxMB * 1024 * 1024) {
                                      setDocErrors((prev) => ({ ...prev, [key]: `File exceeds ${maxMB}MB limit` }));
                                      return;
                                    }
                                    setDocErrors((prev) => { const n = { ...prev }; delete (n as any)[key]; return n; });
                                    setDocFiles((prev) => ({ ...prev, [key]: f }));
                                  }}
                                />
                              </label>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setLocation("/lancing/freelancer-dashboard")}
                          className="border-gray-300 text-gray-600 hover:bg-gray-50 px-4"
                          title="Back to Dashboard"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={handleDocumentContinue}
                          disabled={Object.values(docUploading).some(Boolean)}
                          className="flex-1 h-12 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-sm"
                        >
                          {Object.values(docUploading).some(Boolean)
                            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…</>
                            : <>Continue <ArrowRight className="w-4 h-4 ml-2" /></>
                          }
                        </Button>
                      </div>
                      <p className="text-center text-[11px] text-gray-400">
                        {track === "institutional" ? "Career guidance with your institution and StudentXchange" : "Trusted by 2,500+ ADYPU students · Free forever"}
                      </p>
                    </div>
                  )}

                  {/* ── Step 2: Background ── */}
                  {step === 2 && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                          Let's build your roadmap 🎯
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                          Tell us where you are so we can map exactly where you need to go.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            Year of Study
                          </label>
                          <select
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all appearance-none"
                          >
                            <option value="">Select your current year…</option>
                            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            Degree / Branch
                          </label>
                          <select
                            value={degree}
                            onChange={(e) => setDegree(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all appearance-none"
                          >
                            <option value="">Select your degree…</option>
                            <optgroup label="B.Tech Computer Science">
                              <option value="B.Tech Computer Science">B.Tech CS — General</option>
                              <option value="B.Tech CS — Software Engineering">B.Tech CS — Software Engineering</option>
                              <option value="B.Tech CS — Cyber Security">B.Tech CS — Cyber Security</option>
                              <option value="B.Tech CSE — AR/VR">B.Tech CSE — AR/VR</option>
                            </optgroup>
                            <option value="B.Tech AI & Data Science">B.Tech AI &amp; Data Science (AIDS)</option>
                            <option value="B.Tech Robotics & Automation">B.Tech Robotics &amp; Automation</option>
                            <option value="B.Tech IT">B.Tech IT</option>
                            <option value="B.Tech ECE">B.Tech ECE</option>
                            <option value="B.Tech Mechanical">B.Tech Mechanical</option>
                            <option value="B.Tech Civil">B.Tech Civil</option>
                            <option value="BBA">BBA</option>
                            <option value="B.Com">B.Com</option>
                            <option value="BA Economics">BA Economics</option>
                            <option value="BA Psychology">BA Psychology</option>
                            <option value="B.Design UI/UX">B.Design UI/UX</option>
                            <option value="B.Design Fashion">B.Design Fashion</option>
                            <option value="B.Sc Data Science">B.Sc Data Science</option>
                            <option value="B.Pharmacy">B.Pharmacy</option>
                            <option value="LLB">LLB</option>
                            <option value="MBA">MBA</option>
                            <option value="MCA">MCA</option>
                            <option value="M.Tech">M.Tech</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            Field of Interest / Specialization <span className="text-gray-400 font-normal normal-case">(optional but recommended)</span>
                          </label>
                          <input
                            type="text"
                            value={fieldOfInterest}
                            onChange={(e) => setFieldOfInterest(e.target.value)}
                            placeholder="e.g. Propulsion Systems, Digital Marketing, Machine Learning…"
                            className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all"
                          />
                          <p className="text-[11px] text-gray-400 mt-1">Specific specialization within your degree — makes your roadmap far more precise.</p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            Institution <span className="text-red-400">*</span>
                          </label>
                          <InstitutionPicker value={university} onChange={setUniversity} />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setStep(1)}
                          className="border-gray-300 text-gray-600 hover:bg-gray-50 px-4"
                          title="Back to Documents"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => {
                            if (!degree || !year) { toast({ title: "Please fill your degree and year" }); return; }
                            if (!university || university === "Your Institute") { toast({ title: "Please select your institution" }); return; }
                            setStep(3);
                          }}
                          className="flex-1 h-12 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-sm"
                        >
                          Continue <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>

                      {/* Social proof */}
                      <p className="text-center text-[11px] text-gray-400">
                        {track === "institutional" ? "Career guidance with your institution and StudentXchange" : "Trusted by 2,500+ ADYPU students · Free forever"}
                      </p>
                    </div>
                  )}

                  {/* ── Step 3: Aspirations ── */}
                  {step === 3 && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                          What do you want to become?
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                          Pick up to 3 paths. We’ll blend them into your roadmap.
                        </p>
                      </div>

                      {/* Selected chips */}
                      {selectedAspirations.length > 0 && (
                        <div aria-label="Selected career paths" className="flex flex-wrap gap-1.5">
                          {selectedAspirations.map(a => (
                            <span key={a} className="inline-flex items-center gap-1.5 bg-sky-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                              {findCareerGoal(a)?.label ?? a}
                              <button
                                type="button"
                                aria-label={`Remove ${findCareerGoal(a)?.label ?? a}`}
                                onClick={() => toggleAspiration(a)}
                                className="ml-0.5 rounded-full p-0.5 opacity-75 hover:bg-sky-700 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="relative">
                        <label htmlFor="career-goal-search" className="sr-only">Search career goals</label>
                        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                        <input
                          id="career-goal-search"
                          type="search"
                          value={careerSearch}
                          onChange={(event) => setCareerSearch(event.target.value)}
                          placeholder="Search careers, such as AI, finance, design or law"
                          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-10 text-sm text-gray-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                        />
                        {careerSearch && (
                          <button type="button" aria-label="Clear career search" onClick={() => setCareerSearch("")} className="absolute right-3 top-3 rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="max-h-[440px] space-y-4 overflow-y-auto pr-1 -mr-1">
                        {careerSearch.trim() ? (
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Search results</h3>
                              <span className="text-[11px] text-gray-400">{careerSearchResults.length} matches</span>
                            </div>
                            {careerSearchResults.length > 0 ? (
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {careerSearchResults.map((goal) => {
                                  const selected = isGoalSelected(goal.label);
                                  return (
                                    <button
                                      type="button"
                                      key={goal.id}
                                      aria-pressed={selected}
                                      onClick={() => toggleAspiration(goal.label)}
                                      className={`flex min-h-[52px] items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all ${selected ? "border-sky-400 bg-sky-50 text-sky-700" : "border-gray-200 bg-white text-gray-700 hover:border-sky-300 hover:bg-sky-50/40"}`}
                                    >
                                      <span className="flex-1 leading-tight">{goal.label}</span>
                                      {selected && <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-sky-500" />}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                                No matching career yet. Try a broader term or choose Other below.
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <div>
                              <div className="mb-2 flex items-center justify-between">
                                <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Popular starting points</h3>
                                <span className="text-[11px] text-gray-400">Up to 3</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {popularGoals.map((goal) => goal && (
                                  <button
                                    type="button"
                                    key={goal.id}
                                    aria-pressed={isGoalSelected(goal.label)}
                                    onClick={() => toggleAspiration(goal.label)}
                                    className={`min-h-[54px] rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-all ${isGoalSelected(goal.label) ? "border-sky-400 bg-sky-50 text-sky-700" : "border-gray-200 bg-white text-gray-700 hover:border-sky-300 hover:bg-sky-50/40"}`}
                                  >
                                    {goal.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Browse by field</h3>
                              {CAREER_SECTORS.map((sector) => {
                                const sectorOpen = expandedSectors.has(sector.id);
                                const sectorGoalCount = sector.families.reduce((count, family) => count + family.goals.length, 0);
                                return (
                                  <div key={sector.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                                    <button type="button" aria-expanded={sectorOpen} onClick={() => toggleSector(sector.id)} className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-sky-50/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-300">
                                      <span className="flex-1">
                                        <span className="block text-sm font-bold text-gray-800">{sector.name}</span>
                                        <span className="text-[11px] text-gray-400">{sectorGoalCount} career paths across {sector.families.length} families</span>
                                      </span>
                                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${sectorOpen ? "rotate-180" : ""}`} />
                                    </button>
                                    {sectorOpen && (
                                      <div className="space-y-2 border-t border-gray-100 bg-gray-50/60 p-2">
                                        {sector.families.map((family) => {
                                          const familyKey = `${sector.id}:${family.name}`;
                                          const familyOpen = expandedFamilies.has(familyKey);
                                          return (
                                            <div key={familyKey} className="rounded-lg border border-gray-200 bg-white">
                                              <button type="button" aria-expanded={familyOpen} onClick={() => toggleFamily(familyKey)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-gray-700 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-300">
                                                <span className="flex-1">{family.name}</span>
                                                <span className="text-[10px] font-normal text-gray-400">{family.goals.length}</span>
                                                <ChevronRight className={`h-3.5 w-3.5 text-gray-400 transition-transform ${familyOpen ? "rotate-90" : ""}`} />
                                              </button>
                                              {familyOpen && (
                                                <div className="grid grid-cols-1 gap-1.5 border-t border-gray-100 p-2 sm:grid-cols-2">
                                                  {family.goals.map((goal) => {
                                                    const selected = isGoalSelected(goal.label);
                                                    return (
                                                      <button type="button" key={goal.id} aria-pressed={selected} onClick={() => toggleAspiration(goal.label)} className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-all ${selected ? "border-sky-400 bg-sky-50 text-sky-700" : "border-gray-100 text-gray-600 hover:border-sky-300 hover:bg-sky-50/40"}`}>
                                                        <span className="flex-1">{goal.label}</span>
                                                        {selected && <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-sky-500" />}
                                                      </button>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>

                      {selectedAspirations.includes("Other") && (
                        <input
                          type="text"
                          aria-label="Describe another career goal"
                          value={otherAspiration}
                          onChange={(e) => setOtherAspiration(e.target.value)}
                          placeholder="Describe your career goal"
                          className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                        />
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setStep(2)}
                          className="border-gray-300 text-gray-600 hover:bg-gray-50 px-4"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => {
                            if (!selectedAspirations.length) { toast({ title: "Pick at least one career path" }); return; }
                            setStep(4);
                          }}
                          className="flex-1 h-11 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold rounded-xl"
                        >
                          Continue <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ── Step 4: Commitment ── */}
                  {step === 4 && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                          How committed are you? 🔥
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                          This calibrates the intensity and pace of your roadmap.
                        </p>
                      </div>

                      {/* Commitment slider */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Commitment Level</label>
                          <span className="text-xs font-bold text-sky-600 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-full">
                            {COMMITMENT_LABELS[commitmentIdx]}
                          </span>
                        </div>
                        <input
                          type="range" min={0} max={3} step={1} value={commitmentIdx}
                          onChange={(e) => setCommitmentIdx(+e.target.value)}
                          className="w-full accent-sky-500"
                        />
                        {/* Abbreviated labels to avoid mobile overflow */}
                        <div className="flex justify-between mt-1.5">
                          {["Exploring", "Building", "Applying", "Ready"].map((l, i) => (
                            <span
                              key={l}
                              className={`text-[9px] sm:text-[10px] transition-colors ${commitmentIdx === i ? "text-sky-600 font-bold" : "text-gray-400"}`}
                            >
                              {l}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Hours per week */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                          Available Hours / Week
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {HOURS_OPTIONS.map((h, i) => (
                            <button
                              key={h}
                              onClick={() => setHoursIdx(i)}
                              className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                                hoursIdx === i
                                  ? "bg-sky-600 border-sky-600 text-white shadow-sm"
                                  : "bg-white border-gray-200 text-gray-600 hover:border-sky-300"
                              }`}
                            >
                              {h}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setStep(3)}
                          className="border-gray-300 text-gray-600 hover:bg-gray-50 px-4"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={generateRoadmap}
                          disabled={generating}
                          className="flex-1 h-12 bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 hover:from-sky-700 hover:via-indigo-700 hover:to-violet-700 font-bold text-white rounded-xl shadow-sm"
                        >
                          {generating
                            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
                            : <><Sparkles className="w-4 h-4 mr-2" /> Generate My Roadmap</>
                          }
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Streaming Roadmap Skeleton ── */}
            {generating && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
                {/* Header */}
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full border-4 border-sky-100 border-t-sky-500 animate-spin" />
                    <Map className="w-5 h-5 text-sky-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">Building your roadmap…</p>
                    <p className="text-xs text-sky-600 mt-0.5 font-medium transition-all duration-500">
                      {generationStage || LOADING_STEPS[loadingStep] || LOADING_STEPS[LOADING_STEPS.length - 1]}
                    </p>
                  </div>
                </div>

                {/* Step progress bar */}
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {LOADING_STEPS.map((step, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                          i <= loadingStep ? "bg-sky-500" : "bg-gray-100"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Step {loadingStep + 1} of {LOADING_STEPS.length}</span>
                    <span className="text-sky-500">AI-powered generation</span>
                  </div>
                </div>

                {/* Animated skeleton cards matching real roadmap */}
                <div className="space-y-3 animate-pulse">
                  {[
                    { w: "w-24", label: "Year 1 — Foundation" },
                    { w: "w-28", label: "Year 2 — Growth" },
                    { w: "w-32", label: "Year 3 — Specialisation" },
                  ].map((item, i) => (
                    <div key={i} className={`rounded-xl border border-gray-100 p-4 space-y-2 transition-opacity duration-700 ${i > loadingStep ? "opacity-30" : "opacity-100"}`}>
                      <div className="flex items-center gap-2">
                        <div className={`h-5 bg-sky-100 rounded ${item.w}`} />
                        <div className="h-4 bg-gray-100 rounded w-16 ml-auto" />
                      </div>
                      <div className="h-3 bg-gray-100 rounded w-full" />
                      <div className="h-3 bg-gray-100 rounded w-4/5" />
                      <div className="flex gap-2 pt-1">
                        <div className="h-5 bg-gray-100 rounded-full w-20" />
                        <div className="h-5 bg-gray-100 rounded-full w-24" />
                        <div className="h-5 bg-gray-100 rounded-full w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Roadmap Output ── */}
            {activeRoadmap && !generating && !institutionalLoading && (
              <>
                {roadmapSaveError && (
                  <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                    <span>Your roadmap is visible, but its latest changes are not saved. {roadmapSaveError}</span>
                    <button type="button" className="font-bold underline" onClick={() => {
                      void persistClientRoadmap(activeRoadmap, selectedAspirations.map((a) => a === "Other" && otherAspiration ? otherAspiration : a))
                        .catch((error) => setRoadmapSaveError(error.message || "Could not save. Please retry."));
                    }}>Retry save</button>
                  </div>
                )}
                {isAdmin && (track === "personal" || !institutionalPublished) && (
                  <div className="mb-4 flex flex-col gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-indigo-950">Verification mode</p>
                      <p className="text-xs text-indigo-700">Change your degree, year, interests, or goals and generate another fresh roadmap.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleChangeSelections}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Change selections & generate again
                    </button>
                  </div>
                )}
                <RoadmapView
                  roadmap={activeRoadmap}
                  skillStatus={activeSkillStatus}
                  onCycleSkill={cycleSkill}
                  trackType={track === "institutional" ? "institutional" : undefined}
                  onReset={track === "institutional" ? (institutionalPublished ? undefined : handleChangeSelections) : isAdmin ? handleChangeSelections : !roadmapSavedToCloud ? handleReset : undefined}
                />

                {/* ── Documents Card (shown below roadmap, collapsible) ── */}
                <div className="mt-4 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <button
                    onClick={() => setShowDocUpload((v) => !v)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-base">📄</span>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-gray-900">Your Documents</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {Object.keys(docUrls).length > 0
                            ? `${Object.keys(docUrls).length} document${Object.keys(docUrls).length !== 1 ? "s" : ""} uploaded`
                            : "Optional — helps placement cell verify your eligibility"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {Object.keys(docUrls).length > 0 && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          ✓ Uploaded
                        </span>
                      )}
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showDocUpload ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {showDocUpload && (
                    <div className="border-t border-gray-100 p-5 space-y-4">
                      <div className="bg-sky-50 border border-sky-100 rounded-xl px-3 py-2.5 text-xs text-sky-700 flex items-start gap-2">
                        <span className="mt-0.5">ℹ️</span>
                        <span>All uploads are optional. These help {orgLabel} verify your eligibility for placements and competitions.</span>
                      </div>
                      <div className="space-y-2.5">
                        {([
                          { key: "profile_photo", label: "Profile Photo", accept: ".jpg,.jpeg,.png", maxMB: 2, isImage: true },
                          { key: "aadhaar_card", label: "Aadhaar Card", accept: ".pdf,.jpg,.jpeg,.png", maxMB: 5, isImage: false },
                          { key: "id_card", label: "College / University ID Card", accept: ".pdf,.jpg,.jpeg,.png", maxMB: 5, isImage: false },
                          { key: "marksheet_10th", label: "10th Marksheet", accept: ".pdf,.jpg,.jpeg,.png", maxMB: 10, isImage: false },
                          { key: "marksheet_12th_diploma", label: "12th / Diploma Marksheet", accept: ".pdf,.jpg,.jpeg,.png", maxMB: 10, isImage: false },
                          { key: "marksheet_latest_sem", label: "Latest Semester Marksheet", accept: ".pdf,.jpg,.jpeg,.png", maxMB: 10, isImage: false },
                        ] as { key: string; label: string; accept: string; maxMB: number; isImage: boolean }[]).map(({ key, label, accept, maxMB, isImage }) => {
                          const file = (docFiles as any)[key] as File | undefined;
                          const url = (docUrls as any)[key] as string | undefined;
                          const err = (docErrors as any)[key] as string | undefined;
                          const uploading = (docUploading as any)[key] as boolean | undefined;
                          return (
                            <div key={key} className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl p-3 bg-gray-50">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-700">{label}</p>
                                {file && !isImage && <p className="text-[10px] text-sky-600 truncate">{file.name}</p>}
                                {isImage && file && <img src={URL.createObjectURL(file)} alt="Preview" className="mt-1.5 w-12 h-12 rounded-lg object-cover border border-gray-200" />}
                                {err && <p className="text-[10px] text-red-500 mt-0.5">{err}</p>}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {uploading && <Loader2 className="w-4 h-4 text-sky-500 animate-spin" />}
                                {url && !uploading && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 cursor-pointer hover:text-sky-700 bg-sky-50 border border-sky-200 rounded-lg px-2.5 py-1.5">
                                  <CloudUpload className="w-3 h-3" />
                                  {file ? "Replace" : "Upload"}
                                  <input
                                    type="file"
                                    accept={accept}
                                    className="sr-only"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (!f) return;
                                      if (f.size > maxMB * 1024 * 1024) {
                                        setDocErrors((prev) => ({ ...prev, [key]: `Exceeds ${maxMB}MB` }));
                                        return;
                                      }
                                      setDocErrors((prev) => { const n = { ...prev }; delete (n as any)[key]; return n; });
                                      setDocFiles((prev) => ({ ...prev, [key]: f }));
                                      // Auto-upload on select
                                      if (user) {
                                        setDocUploading((prev) => ({ ...prev, [key]: true }));
                                        const fileRef = storageRef(storage, `student-documents/${user.uid}/${key}/${Date.now()}_${f.name}`);
                                        uploadBytes(fileRef, f)
                                          .then(() => getDownloadURL(fileRef))
                                          .then((url2) => {
                                            setDocUrls((prev) => ({ ...prev, [key]: url2 }));
                                            setDocUploading((prev) => ({ ...prev, [key]: false }));
                                          })
                                          .catch(() => setDocUploading((prev) => ({ ...prev, [key]: false })));
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Placement Readiness embedded below personal roadmap (Premium only) */}
                {user && isPremium && (
                  <EmbeddedPlacementPanel
                    user={user}
                    degree={degree}
                    year={year}
                    roadmapSkills={roadmapSkillNames}
                    roadmapAspirations={selectedAspirations}
                    initialPlacementSession={initialPlacementSession}
                    onUpgrade={() => setUpgradeFeature("Coding Arena")}
                  />
                )}
                {user && !isPremium && (
                  <div className="mt-4 sm:mt-6 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 sm:p-6 text-center">
                    <div className="mx-auto mb-2 sm:mb-3 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-amber-100">
                      <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">Placement Readiness is a Premium feature</h3>
                    <p className="mt-1 text-xs sm:text-sm text-gray-600">Unlock Placement Readiness, skill assessments, student exams, guided learning paths and Coding Arena.</p>
                    <button
                      onClick={() => setUpgradeFeature("Placement Readiness")}
                      className="mt-3 sm:mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 sm:px-5 py-2 text-sm font-semibold text-white shadow hover:from-amber-600 hover:to-orange-600 active:scale-95 transition-transform"
                    >
                      <Sparkles className="h-4 w-4" /> {pricing ? `Unlock Premium — ${pricing.priceLabel}` : "View Premium plans"}
                    </button>
                  </div>
                )}
              </>
            )}
              </>
            )}
          </>
        )}

        {/* ── STUDENT: Placement Readiness tab ── */}
        {viewMode === "student" && activeTab === "placement" && user && isPremium && (
          <PlacementReadiness user={user} initialDegree={degree} initialYear={year} initialSession={initialPlacementSession} roadmapSkills={roadmapSkillNames} roadmapAspirations={selectedAspirations} sourceLabel={track === "institutional" ? "Placement Cell" : "StudentXchange"} onUpgrade={() => setUpgradeFeature("Coding Arena")} />
        )}

        {/* ── STUDENT: My Profile tab ── */}
        {viewMode === "student" && activeTab === "profile" && (
          <CCProfileTab
            user={user}
            profile={ccProfile}
            loading={profileLoading}
            onSave={(updated: any) => setCcProfile(updated)}
          />
        )}

        {/* ── STUDENT: My Exams tab ── */}
        {viewMode === "student" && activeTab === "exams" && isPremium && (
          <MyExamsContent />
        )}

        {/* Bottom spacer */}
        <div className="h-6" />
      </main>
      </div>
      )} {/* end track-gate */}
    </div>
  );
}

// ─── Placement Cell Dashboard ─────────────────────────────────────────────────
function PlacementCellView({
  stats, loading, onExportCSV,
}: { stats: any; loading: boolean; onExportCSV: () => void }) {
  const { toast } = useToast();
  const [pcTab, setPcTab] = useState<"overview" | "students">("overview");
  const [spcrStudents, setSpcrStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [showRejected, setShowRejected] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [spcrStatuses, setSpcrStatuses] = useState<Record<string, { status: string; reason?: string }>>({});
  const [approvingStudentUid, setApprovingStudentUid] = useState<string | null>(null);
  const [rejectingStudentUid, setRejectingStudentUid] = useState<string | null>(null);
  const [studentRejectionReason, setStudentRejectionReason] = useState("");
  const [removingStudentUid, setRemovingStudentUid] = useState<string | null>(null);
  const [expandedStudentUid, setExpandedStudentUid] = useState<string | null>(null);
  const SPCR_DOC_LABELS: Record<string, string> = {
    profile_photo: "Profile Photo",
    aadhaar_card: "Aadhaar Card",
    id_card: "College ID",
    marksheet_10th: "10th Marksheet",
    marksheet_12th_diploma: "12th / Diploma",
    marksheet_latest_sem: "Latest Semester",
  };

  useEffect(() => {
    if (pcTab !== "students" || spcrStudents.length > 0) return;
    setLoadingStudents(true);
    authedFetch("/api/career-compass/spcr-students")
      .then((r) => r.json())
      .then((d) => setSpcrStudents(d.students || []))
      .catch(() => {})
      .finally(() => setLoadingStudents(false));
  }, [pcTab]);


  const handleApproveStudent = async (st: any) => {
    setApprovingStudentUid(st.uid);
    try {
      const res = await authedFetch("/api/career-compass/spcr-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: st.uid, university: st.university || st.universityName || "" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Approval failed");
      }
      setSpcrStatuses((p) => ({ ...p, [st.uid]: { status: "approved" } }));
      setSpcrStudents((prev) => prev.map((s) => s.uid === st.uid ? { ...s, spcrApproval: "approved" } : s));
      toast({ title: "Student approved", description: `${st.fullName} has been approved.` });
    } catch (e: any) {
      console.error("Approval failed:", e);
      toast({ title: "Failed to approve", description: e.message || "Please try again.", variant: "destructive" });
    }
    setApprovingStudentUid(null);
  };

  const handleRejectStudent = async (st: any, reason: string) => {
    setApprovingStudentUid(st.uid);
    try {
      const res = await authedFetch("/api/career-compass/spcr-reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: st.uid, university: st.university || st.universityName || "", reason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Rejection failed");
      }
      setSpcrStatuses((p) => ({ ...p, [st.uid]: { status: "rejected", reason } }));
      setSpcrStudents((prev) => prev.map((s) => s.uid === st.uid ? { ...s, spcrApproval: "rejected", spcr_rejection_reason: reason } : s));
      toast({ title: "Student rejected", description: `${st.fullName} has been marked as rejected.` });
    } catch (e: any) {
      console.error("Rejection failed:", e);
      toast({ title: "Failed to reject", description: e.message || "Please try again.", variant: "destructive" });
    }
    setApprovingStudentUid(null);
    setRejectingStudentUid(null);
    setStudentRejectionReason("");
  };

  const handleRemoveStudent = async (st: any) => {
    if (!window.confirm(`Remove ${st.fullName} from the SPCR system? They will be able to re-register.`)) return;
    setRemovingStudentUid(st.uid);
    try {
      const res = await authedFetch("/api/career-compass/spcr-remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: st.uid, university: st.university || st.universityName || "" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Remove failed");
      }
      setSpcrStudents((prev) => prev.filter((s) => s.uid !== st.uid));
      toast({ title: "Student removed", description: `${st.fullName} has been removed and can re-register.` });
    } catch (e: any) {
      toast({ title: "Failed to remove", description: (e as any).message || "Please try again.", variant: "destructive" });
    }
    setRemovingStudentUid(null);
  };

  if (loading) {
    return (
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardContent className="p-10 flex justify-center">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const s = stats || { total: 0, avgScore: 0, readyForPlacement: 0, topBranches: [], profiles: [] };

  const DEMO_SKILLS_GAP = [
    { name: "DSA / Problem Solving", pct: 78 },
    { name: "SQL & Databases", pct: 65 },
    { name: "Communication Skills", pct: 60 },
    { name: "Git & GitHub", pct: 55 },
    { name: "System Design", pct: 48 },
    { name: "Cloud (AWS/GCP)", pct: 42 },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-sky-500" />
            SPCR Placement Cell Dashboard
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Institute — Live student career data</p>
        </div>
        <button
          onClick={onExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        <button
          onClick={() => setPcTab("overview")}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${pcTab === "overview" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
        >
          Overview
        </button>
        <button
          onClick={() => setPcTab("students")}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${pcTab === "students" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
        >
          {`All Students${spcrStudents.length > 0 ? ` (${spcrStudents.length})` : ""}`}
        </button>
      </div>

      {/* ── Overview Tab ── */}
      {pcTab === "overview" && <>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Students Enrolled", value: s.total, icon: Users, bg: "bg-sky-50", ic: "text-sky-600" },
          { label: "Avg Profile Score", value: `${s.avgScore}%`, icon: TrendingUp, bg: "bg-indigo-50", ic: "text-indigo-600" },
          { label: "Ready for Placement", value: s.readyForPlacement, icon: Trophy, bg: "bg-green-50", ic: "text-green-600" },
          { label: "Internships Secured", value: Math.max(0, Math.round(s.total * 0.12)), icon: Award, bg: "bg-amber-50", ic: "text-amber-600" },
        ].map(({ label, value, icon: Icon, bg, ic }) => (
          <Card key={label} className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                <Icon className={`w-5 h-5 ${ic}`} />
              </div>
              <div className="text-2xl font-black text-gray-900">{value}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        {/* Skills Gap */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-red-500" /> Skills Gap Analysis
            </CardTitle>
            <p className="text-xs text-gray-400">Most commonly missing skills across enrolled students</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {DEMO_SKILLS_GAP.map(({ name, pct }) => (
              <div key={name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-700">{name}</span>
                  <span className="text-red-500 font-semibold">{pct}% lacking</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-400 to-orange-400 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Branches */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" /> Top Performing Branches
            </CardTitle>
            <p className="text-xs text-gray-400">By student enrolment on Career Compass</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {s.topBranches.length > 0 ? s.topBranches.map((b: any, i: number) => (
              <div key={b.name} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${i === 0 ? "bg-yellow-400 text-white" : i === 1 ? "bg-gray-300 text-gray-700" : i === 2 ? "bg-orange-400 text-white" : "bg-gray-100 text-gray-500"}`}>
                  {i + 1}
                </span>
                <span className="flex-1 text-sm text-gray-700 truncate">{b.name}</span>
                <Badge variant="outline" className="border-gray-200 text-gray-500 text-xs">{b.count} students</Badge>
              </div>
            )) : (
              <p className="text-sm text-gray-400 text-center py-4">No data yet. Students will appear here once they use Career Compass.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Student table */}
      {s.profiles?.length > 0 && (
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-gray-900">Student Directory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    {["Email", "Degree", "Year", "Aspirations", "Score", "Roadmap", "PR Phase", "Last Saved"].map((h) => (
                      <th key={h} className="text-left py-2 px-2 text-gray-400 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.profiles.map((p: any) => (
                    <tr key={p.uid} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-2 text-gray-700 max-w-[160px] truncate">{p.email}</td>
                      <td className="py-2 px-2 text-gray-700 whitespace-nowrap">{p.degree}</td>
                      <td className="py-2 px-2 text-gray-700 whitespace-nowrap">{p.year}</td>
                      <td className="py-2 px-2 text-gray-500 max-w-[160px] truncate">{p.aspirations}</td>
                      <td className="py-2 px-2">
                        <span className={`font-bold ${p.profileScore >= 70 ? "text-green-600" : "text-amber-600"}`}>{p.profileScore}%</span>
                      </td>
                      <td className="py-2 px-2">
                        {p.roadmapGenerated
                          ? <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 rounded-full px-1.5 py-0.5 font-semibold">✓ Generated</span>
                          : <span className="text-[10px] text-gray-400">—</span>
                        }
                      </td>
                      <td className="py-2 px-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold border ${
                          p.placementPhase === "submitted" ? "bg-green-50 text-green-700 border-green-200"
                          : p.placementPhase === "guide" ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-gray-50 text-gray-500 border-gray-200"
                        }`}>
                          {p.placementPhase === "submitted" ? "Submitted" : p.placementPhase === "guide" ? "In Progress" : "Not started"}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-gray-400 whitespace-nowrap">
                        {p.lastSaved
                          ? <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(p.lastSaved).toLocaleDateString()}</span>
                          : "—"
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Powered by badge */}
      <div className="flex justify-end">
        <div className="flex items-center gap-2 text-xs text-gray-400 border border-gray-200 rounded-full px-3 py-1.5 bg-white shadow-sm">
          <Sparkles className="w-3 h-3 text-sky-500" />
          Powered by <span className="font-bold text-gray-600">StudentXchange</span>
        </div>
      </div>

      </>} {/* end overview tab */}

      {/* ── All Students Tab ── */}
      {pcTab === "students" && (() => {
        const uniqueColleges = Array.from(new Set(spcrStudents.map((s: any) => s.university || "").filter(Boolean))).sort() as string[];
        const filtered = spcrStudents.filter((st) => {
          const q = studentSearch.toLowerCase();
          const matchSearch = !studentSearch
            || (st.fullName || "").toLowerCase().includes(q)
            || (st.email || "").toLowerCase().includes(q)
            || (st.urn || "").toLowerCase().includes(q)
            || (st.degree || "").toLowerCase().includes(q);
          const matchBranch = !branchFilter || (st.degree || "") === branchFilter;
          const matchYear = !yearFilter || (st.yearOfStudy || "") === yearFilter;
          const matchGender = !genderFilter || (st.gender || "").toLowerCase() === genderFilter.toLowerCase();
          const matchCollege = !collegeFilter || (st.university || "") === collegeFilter;
          const stStatus = (spcrStatuses[st.uid]?.status || st.spcrApproval || "pending").toLowerCase();
          const matchRejected = showRejected ? true : stStatus !== "rejected";
          return matchSearch && matchBranch && matchYear && matchGender && matchCollege && matchRejected;
        }).sort((a, b) => {
          if (sortBy === "cgpa") return parseFloat(b.cgpa || "0") - parseFloat(a.cgpa || "0");
          if (sortBy === "joined") return (b.onboarded_at || "").localeCompare(a.onboarded_at || "");
          return (a.fullName || "").localeCompare(b.fullName || "");
        });
        const downloadXLSX = async () => {
          try {
            const XLSX = (await import("xlsx")).default;
            const headers = ["Full Name","Gender","DOB","Email","Phone","URN","University","Degree","Branch","Year of Study","CGPA","Division","10th Marks","12th/Diploma Marks","LinkedIn","GitHub","Known Skills","Certifications","Placement Engine Score","SPCR Approval Status","COE Approval Status","Date Joined"];
            const rows = filtered.map((st) => [
              st.fullName||"", st.gender||"", st.dob||"", st.email||"", st.phone||"",
              st.urn||"", displayInstitutionName(st.university, "Your Institute"), st.degree||"", st.branch||st.degree||"", st.yearOfStudy||"",
              st.cgpa||"", st.division||"", st.marks10||"", st.marks12||"",
              st.linkedin||"", st.github||"",
              Array.isArray(st.skillsKnown)?st.skillsKnown.join("; "):(st.careerGoal||""),
              Array.isArray(st.certifications)?st.certifications.join("; "):"",
              st.placementScore!=null?st.placementScore:"",
              st.spcrApproval||"Pending", st.coeApproval||"Pending",
              st.onboarded_at?new Date(st.onboarded_at).toLocaleDateString("en-IN"):"",
            ]);
            const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "SPCR Students");
            const dateStr = new Date().toISOString().slice(0,10);
            const uniName = displayInstitutionName(spcrStudents[0]?.university, "University").replace(/\s+/g, "_");
            XLSX.writeFile(wb, `SPCR_Shortlist_${uniName}_${dateStr}.xlsx`);
          } catch {
            /* silent */
          }
        };
        return (
          <div className="space-y-3">
            {/* Search + Filters row */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="text" placeholder="Search name, URN, branch, email…" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-sky-500 bg-white" />
              </div>
              {/* College / University filter */}
              <select value={collegeFilter} onChange={(e) => setCollegeFilter(e.target.value)} className="border border-sky-300 bg-sky-50 text-sky-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500 min-w-[180px] font-medium">
                <option value="">All Colleges</option>
                {uniqueColleges.map((c) => <option key={c} value={c}>{displayInstitutionName(c)}</option>)}
              </select>
              <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-sky-500">
                <option value="">All Branches</option>
                {DEGREE_GROUPS.map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    {g.degrees.filter((d) => d !== "Other").map((d) => <option key={d} value={d}>{d}</option>)}
                  </optgroup>
                ))}
              </select>
              <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-sky-500">
                <option value="">All Years</option>
                {["1st Year","2nd Year","3rd Year","4th Year","PG 1st Year","PG 2nd Year"].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-sky-500">
                <option value="">All Genders</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other / Prefer not to say">Other / Prefer not to say</option>
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-sky-500">
                <option value="name">Sort: Name</option>
                <option value="cgpa">Sort: CGPA</option>
                <option value="joined">Sort: Joined</option>
              </select>
              <button onClick={downloadXLSX} className="flex items-center gap-1.5 border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white hover:bg-gray-50 text-gray-700 transition-colors">
                <Download className="w-4 h-4" />.xlsx
              </button>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Showing {filtered.length} of {spcrStudents.length} students
                {collegeFilter && <span className="ml-1.5 text-sky-600 font-medium">· {collegeFilter}</span>}
              </p>
              <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                <input type="checkbox" checked={showRejected} onChange={(e) => setShowRejected(e.target.checked)} className="rounded" />
                Show rejected students
              </label>
            </div>
            {loadingStudents ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-sky-500 animate-spin" /></div>
            ) : (
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[900px]">
                      <thead>
                        <tr className="border-b-2 border-gray-200 bg-gray-50">
                          {["Photo","Name / Contact","University","Branch / Degree","Year","CGPA","Skills","Joined","SPCR Status","Actions"].map((h) => (
                            <th key={h} className="text-left py-3 px-4 text-gray-500 font-semibold uppercase tracking-wide whitespace-nowrap text-xs">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filtered.map((st) => {
                          const stStatus = spcrStatuses[st.uid]?.status || st.spcrApproval || "pending";
                          const isApprovingThis = approvingStudentUid === st.uid;
                          const isRejectingThis = rejectingStudentUid === st.uid;
                          const photoUrl = st.documents?.profile_photo || st.photoUrl || "";
                          const initials2 = (st.fullName || "?").split(" ").map((w: string) => w[0]).join("").slice(0,2).toUpperCase();
                          const isExpanded = expandedStudentUid === st.uid;
                          const studentDocs = st.documents || {};
                          const docKeys = Object.keys(SPCR_DOC_LABELS).filter(k => studentDocs[k]);
                          return (
                            <React.Fragment key={st.uid}>
                            <tr className={`hover:bg-sky-50 transition-colors cursor-pointer ${stStatus === "rejected" ? "opacity-60" : ""} ${isExpanded ? "bg-sky-50 border-l-2 border-sky-400" : ""}`} onClick={() => setExpandedStudentUid(isExpanded ? null : st.uid)}>
                              {/* Photo */}
                              <td className="py-3 px-4">
                                {photoUrl
                                  ? <img src={photoUrl} alt={st.fullName} className="w-10 h-10 rounded-xl object-cover border border-gray-200 shadow-sm" />
                                  : <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-sm font-black text-white shadow-sm">{initials2}</div>
                                }
                              </td>
                              {/* Name + contact */}
                              <td className="py-3 px-4 min-w-[180px]">
                                <div className="flex items-center gap-1.5 font-semibold text-gray-900">{st.fullName || "—"}<span className="text-[10px] text-sky-400">{isExpanded ? "▲" : "▼"}</span></div>
                                {st.email && <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">{st.email}</div>}
                                {st.phone && <div className="text-xs text-gray-400">{st.phone}</div>}
                              </td>
                              {/* University */}
                              <td className="py-3 px-4 min-w-[160px]">
                                <span className="text-gray-700 leading-snug">{displayInstitutionName(st.university, "—")}</span>
                              </td>
                              {/* Branch */}
                              <td className="py-3 px-4 min-w-[140px]">
                                <span className="text-gray-700">{st.degree || "—"}</span>
                                {st.gender && <div className="text-xs text-gray-400 mt-0.5">{st.gender}</div>}
                              </td>
                              {/* Year */}
                              <td className="py-3 px-4 whitespace-nowrap text-gray-600">{st.yearOfStudy || "—"}</td>
                              {/* CGPA */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className={`text-base font-bold ${parseFloat(st.cgpa) >= 7 ? "text-green-600" : parseFloat(st.cgpa) > 0 ? "text-amber-600" : "text-gray-400"}`}>{st.cgpa || "—"}</span>
                              </td>
                              {/* Skills */}
                              <td className="py-3 px-4 min-w-[140px]">
                                {Array.isArray(st.skillsKnown) && st.skillsKnown.length > 0
                                  ? <div className="flex flex-wrap gap-1">
                                      {st.skillsKnown.slice(0, 3).map((sk: string) => (
                                        <span key={sk} className="bg-sky-50 text-sky-700 border border-sky-200 rounded-full px-2 py-0.5 text-[11px] font-medium">{sk}</span>
                                      ))}
                                      {st.skillsKnown.length > 3 && <span className="text-xs text-gray-400">+{st.skillsKnown.length - 3}</span>}
                                    </div>
                                  : <span className="text-gray-300 text-xs">—</span>}
                              </td>
                              {/* Joined */}
                              <td className="py-3 px-4 text-gray-500 whitespace-nowrap text-xs">{st.onboarded_at ? new Date(st.onboarded_at).toLocaleDateString("en-IN") : "—"}</td>
                              {/* SPCR Status */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  stStatus === "approved" ? "bg-emerald-100 text-emerald-700" :
                                  stStatus === "rejected" ? "bg-red-100 text-red-700" :
                                  "bg-amber-100 text-amber-700"
                                }`}>
                                  {stStatus === "approved" ? "✓ Approved" : stStatus === "rejected" ? "✗ Rejected" : "⏳ Pending"}
                                </span>
                              </td>
                              {/* Actions */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                {isRejectingThis ? (
                                  <div className="flex items-center gap-1 flex-wrap" onClick={e => e.stopPropagation()}>
                                    <input
                                      type="text"
                                      placeholder="Reason…"
                                      value={studentRejectionReason}
                                      onChange={(e) => setStudentRejectionReason(e.target.value)}
                                      className="border border-gray-300 rounded px-2 py-1 text-xs w-28 focus:outline-none"
                                    />
                                    <button onClick={() => handleRejectStudent(st, studentRejectionReason)} className="px-2.5 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700">Confirm</button>
                                    <button onClick={() => { setRejectingStudentUid(null); setStudentRejectionReason(""); }} className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded text-xs">Cancel</button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 flex-wrap" onClick={e => e.stopPropagation()}>
                                    {stStatus !== "approved" && (
                                      <button
                                        onClick={() => handleApproveStudent(st)}
                                        disabled={isApprovingThis}
                                        className="px-3 py-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-xs font-semibold disabled:opacity-50 border border-emerald-200"
                                      >
                                        {isApprovingThis ? "…" : "Approve"}
                                      </button>
                                    )}
                                    {stStatus !== "rejected" && (
                                      <button
                                        onClick={() => { setRejectingStudentUid(st.uid); setStudentRejectionReason(""); }}
                                        className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-semibold border border-red-200"
                                      >
                                        Reject
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleRemoveStudent(st)}
                                      disabled={removingStudentUid === st.uid}
                                      className="px-3 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg text-xs font-semibold border border-gray-200 disabled:opacity-50"
                                    >
                                      {removingStudentUid === st.uid ? "…" : "Remove"}
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                            {/* ── Expanded Detail Panel — Full student record ── */}
                            {isExpanded && (
                              <tr key={`${st.uid}-detail`} className="bg-gradient-to-br from-sky-50 to-indigo-50 border-b border-sky-100">
                                <td colSpan={10} className="px-6 py-6" onClick={e => e.stopPropagation()}>
                                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                    {/* ── Personal ── */}
                                    <div className="bg-white rounded-xl border border-sky-100 p-4 shadow-sm">
                                      <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                        <span className="w-1 h-3 bg-sky-500 rounded-full"></span> Personal Details
                                      </p>
                                      <div className="text-xs space-y-1.5">
                                        <DetailRow label="Full Name" value={st.fullName} />
                                        <DetailRow label="Gender" value={st.gender} />
                                        <DetailRow label="Date of Birth" value={st.dob ? new Date(st.dob).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""} />
                                        <DetailRow label="Email" value={st.email} breakAll />
                                        <DetailRow label="Phone" value={st.phone} />
                                        <DetailRow label="State" value={st.state} />
                                        <DetailRow label="City" value={st.city} />
                                        <DetailRow label="Address" value={st.address} />
                                        {(st.linkedin || st.github) && (
                                          <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                                            {st.linkedin && <a href={st.linkedin} target="_blank" rel="noopener noreferrer" className="text-sky-600 underline text-[11px] font-semibold" onClick={e => e.stopPropagation()}>LinkedIn ↗</a>}
                                            {st.github && <a href={st.github} target="_blank" rel="noopener noreferrer" className="text-gray-600 underline text-[11px] font-semibold" onClick={e => e.stopPropagation()}>GitHub ↗</a>}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* ── Academic ── */}
                                    <div className="bg-white rounded-xl border border-indigo-100 p-4 shadow-sm">
                                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                        <span className="w-1 h-3 bg-indigo-500 rounded-full"></span> Academic Record
                                      </p>
                                      <div className="text-xs space-y-1.5">
                                        <DetailRow label="University" value={displayInstitutionName(st.university, "—")} />
                                        <DetailRow label="Degree" value={st.degree} />
                                        <DetailRow label="Year of Study" value={st.yearOfStudy} />
                                        <DetailRow label="Division" value={st.division} />
                                        <DetailRow label="URN" value={st.urn} mono />
                                        <DetailRow label="Admission Year" value={st.admissionYear} />
                                        <DetailRow label="Current CGPA" value={st.cgpa} bold colorByCgpa />
                                        <div className="pt-1.5 mt-1.5 border-t border-gray-100 space-y-1.5">
                                          <DetailRow label="10th Board" value={st.board10} />
                                          <DetailRow label="10th %" value={st.marks10 ? `${st.marks10}%` : ""} />
                                          {st.prevType === "Diploma" || st.diplomaPct ? (
                                            <>
                                              <DetailRow label="Diploma Stream" value={st.diplomaStream} />
                                              <DetailRow label="Diploma %" value={st.diplomaPct ? `${st.diplomaPct}%` : ""} />
                                            </>
                                          ) : (
                                            <>
                                              <DetailRow label="12th Board" value={st.board12} />
                                              <DetailRow label="12th %" value={st.marks12 ? `${st.marks12}%` : ""} />
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* ── Skills + Documents ── */}
                                    <div className="space-y-4">
                                      {/* Skills & Goals */}
                                      <div className="bg-white rounded-xl border border-emerald-100 p-4 shadow-sm">
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                          <span className="w-1 h-3 bg-emerald-500 rounded-full"></span> Skills & Goals
                                        </p>
                                        {Array.isArray(st.skillsKnown) && st.skillsKnown.length > 0 ? (
                                          <div className="flex flex-wrap gap-1 mb-2">
                                            {st.skillsKnown.map((sk: string) => (
                                              <span key={sk} className="bg-sky-100 text-sky-700 border border-sky-200 rounded-full px-2 py-0.5 text-[11px] font-medium">{sk}</span>
                                            ))}
                                          </div>
                                        ) : <p className="text-[11px] text-gray-400 italic mb-2">No skills listed.</p>}
                                        {st.certifications && (typeof st.certifications === "string" ? st.certifications : st.certifications.length > 0) && (
                                          <div className="pt-2 border-t border-gray-100">
                                            <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide font-semibold">Certifications</p>
                                            {Array.isArray(st.certifications) ? (
                                              <div className="flex flex-wrap gap-1">
                                                {st.certifications.map((c: string) => (
                                                  <span key={c} className="bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 text-[11px]">{c}</span>
                                                ))}
                                              </div>
                                            ) : <p className="text-xs text-gray-700">{st.certifications}</p>}
                                          </div>
                                        )}
                                        {st.careerGoal && <div className="pt-2 mt-2 border-t border-gray-100 text-xs text-gray-600 italic">"{st.careerGoal}"</div>}
                                        {st.placementScore != null && (
                                          <div className="mt-2 pt-2 border-t border-gray-100 text-xs">
                                            <span className="text-gray-400">Placement Score: </span>
                                            <span className="font-bold text-indigo-600">{st.placementScore}%</span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Documents */}
                                      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                          <span className="w-1 h-3 bg-gray-400 rounded-full"></span> Documents
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {docKeys.length === 0 ? (
                                            <span className="text-xs text-gray-400 italic">No documents uploaded.</span>
                                          ) : docKeys.map(k => (
                                            <a key={k} href={studentDocs[k]} target="_blank" rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-sky-50 border border-sky-200 rounded-lg text-[11px] font-semibold text-sky-700 hover:bg-sky-100 transition-colors"
                                              onClick={e => e.stopPropagation()}
                                            >
                                              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                              {SPCR_DOC_LABELS[k] || k}
                                            </a>
                                          ))}
                                        </div>
                                        {stStatus === "rejected" && st.spcr_rejection_reason && (
                                          <div className="mt-3 pt-3 border-t border-red-100">
                                            <p className="text-[10px] text-red-600 font-black uppercase tracking-wide mb-1">Rejection Reason</p>
                                            <p className="text-xs text-red-700">{st.spcr_rejection_reason}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                    {filtered.length === 0 && (
                      <div className="text-center py-10 text-gray-400 text-sm">
                        {studentSearch || branchFilter || yearFilter || genderFilter || collegeFilter ? "No students match your filters." : "No SPCR-onboarded students yet."}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
      })()}


    </div>
  );
}

// ─── DetailRow — label/value row for SPCR student detail panel ────────────────
function DetailRow({ label, value, breakAll, mono, bold, colorByCgpa }: {
  label: string;
  value?: string | number | null;
  breakAll?: boolean;
  mono?: boolean;
  bold?: boolean;
  colorByCgpa?: boolean;
}) {
  const v = value == null || value === "" ? "—" : String(value);
  const isEmpty = v === "—";
  let valueClass = "text-gray-700";
  if (isEmpty) valueClass = "text-gray-300";
  else if (colorByCgpa) {
    const n = parseFloat(v);
    valueClass = n >= 7 ? "text-green-600" : n > 0 ? "text-amber-600" : "text-gray-700";
  }
  return (
    <div className="flex gap-1.5 leading-snug">
      <span className="text-gray-400 flex-shrink-0">{label}:</span>
      <span className={`${valueClass} ${breakAll ? "break-all" : ""} ${mono ? "font-mono" : ""} ${bold ? "font-bold" : ""}`}>{v}</span>
    </div>
  );
}


// ─── Onboarding Modal (SPCR first-time setup) ─────────────────────────────────
// ─── My Profile Tab ───────────────────────────────────────────────────────────
function CCProfileTab({ user, profile, loading, onSave }: {
  user: any; profile: any; loading: boolean; onSave: (p: any) => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState(0);

  // Editable field state — initialised when editing starts
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [universityName, setUniversityName] = useState("");
  const [deg, setDeg] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [urn, setUrn] = useState("");
  const [division, setDivision] = useState("");
  const [admissionYear, setAdmissionYear] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [board10, setBoard10] = useState("");
  const [pct10, setPct10] = useState("");
  const [passingYear10, setPassingYear10] = useState("");
  const [prevType, setPrevType] = useState<"12th" | "diploma">("12th");
  const [board12, setBoard12] = useState("");
  const [pct12, setPct12] = useState("");
  const [passingYear12, setPassingYear12] = useState("");
  const [diplomaStream, setDiplomaStream] = useState("");
  const [diplomaPct, setDiplomaPct] = useState("");
  const [diplomaPassingYear, setDiplomaPassingYear] = useState("");
  const [currentCgpa, setCurrentCgpa] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [certifications, setCertifications] = useState("");
  const [careerGoal, setCareerGoal] = useState("");
  const [skillsKnown, setSkillsKnown] = useState<string[]>([]);
  const [foreignLanguages, setForeignLanguages] = useState("");

  const startEditing = () => {
    if (!profile) return;
    setFullName(profile.fullName || ""); setGender(profile.gender || "");
    setDob(profile.dob || ""); setPhone(profile.phone || "");
    setParentPhone(profile.parentPhone || "");
    setAddress(profile.address || ""); setCity(profile.city || "");
    setSelectedState(profile.state || "");
    setUniversityName(profile.universityName || ""); setDeg(profile.degree || "");
    setYearOfStudy(profile.yearOfStudy || ""); setUrn(profile.urn || "");
    setDivision(profile.division || ""); setAdmissionYear(profile.admissionYear || "");
    setBoard10(profile.board10 || ""); setPct10(profile.pct10 || "");
    setPassingYear10(profile.passingYear10 || "");
    setPrevType(profile.prevType === "diploma" ? "diploma" : "12th");
    setBoard12(profile.board12 || ""); setPct12(profile.pct12 || "");
    setPassingYear12(profile.passingYear12 || "");
    setDiplomaStream(profile.diplomaStream || ""); setDiplomaPct(profile.diplomaPct || "");
    setDiplomaPassingYear(profile.diplomaPassingYear || "");
    setCurrentCgpa(profile.currentCgpa || "");
    setLinkedin(profile.linkedin || ""); setGithub(profile.github || "");
    setCertifications(typeof profile.certifications === "string" ? profile.certifications : (profile.certifications || []).join(", "));
    setCareerGoal(profile.careerGoal || "");
    setSkillsKnown(Array.isArray(profile.skillsKnown) ? profile.skillsKnown : []);
    setForeignLanguages(Array.isArray(profile.foreignLanguages) ? profile.foreignLanguages.join(", ") : (profile.foreignLanguages || ""));
    setActiveSection(0); setEditing(true);
  };

  const handleSave = async () => {
    if (!fullName || !phone || !universityName || !deg || !yearOfStudy) {
      toast({ title: "Fill all required fields (*)", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const r = await fetch("/api/career-compass/save-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          fullName, phone, parentPhone, gender, dob, address, city, state: selectedState,
          universityName, degree: deg, yearOfStudy, urn, division, admissionYear,
          board10, pct10, passingYear10,
          prevType, board12, pct12, passingYear12,
          diplomaStream, diplomaPct, diplomaPassingYear, currentCgpa,
          certifications, careerGoal, skillsKnown, linkedin, github,
          foreignLanguages,
        }),
      });
      if (r.ok) {
        const flArr = foreignLanguages.split(",").map(s => s.trim()).filter(Boolean);
        onSave({ ...profile, fullName, phone, parentPhone, gender, dob, address, city, state: selectedState,
          universityName, degree: deg, yearOfStudy, urn, division, admissionYear,
          board10, pct10, passingYear10,
          prevType, board12, pct12, passingYear12,
          diplomaStream, diplomaPct, diplomaPassingYear, currentCgpa,
          certifications, careerGoal, skillsKnown, linkedin, github, foreignLanguages: flArr });
        toast({ title: "Profile updated ✓" });
        setEditing(false);
      } else throw new Error("Server error");
    } catch { toast({ title: "Couldn't save profile. Try again.", variant: "destructive" }); }
    setSaving(false);
  };

  const branchSkills = deg && SKILLS_BY_BRANCH[deg] ? SKILLS_BY_BRANCH[deg] : [];
  const toggleSkill = (name: string) => setSkillsKnown((p) => p.includes(name) ? p.filter(s => s !== name) : [...p, name]);

  const Field = ({ label, value }: { label: string; value?: string | null }) => (
    <div>
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-sm text-gray-800 font-medium">{value || <span className="text-gray-300 font-normal italic">—</span>}</div>
    </div>
  );

  if (loading) return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex items-center justify-center gap-3 text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin" /> Loading your profile…
    </div>
  );

  if (!profile) return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
      <GraduationCap className="w-10 h-10 text-gray-200 mx-auto mb-3" />
      <p className="text-sm text-gray-500 font-medium">No profile found.</p>
      <p className="text-xs text-gray-400 mt-1">Complete your onboarding to fill in your details.</p>
    </div>
  );

  const sections = ["Personal", "Academic", "Marks", "Additional"];

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-md overflow-hidden flex-shrink-0">
            {profile.photoUrl
              ? <img src={profile.photoUrl} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
              : <Contact className="w-8 h-8 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-gray-900 text-lg leading-tight truncate">{profile.fullName || user?.displayName || "Student"}</h2>
            <p className="text-sm text-gray-500 truncate">{profile.degree || "—"} · {profile.yearOfStudy || "—"}</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">{displayInstitutionName(profile.universityName, "—")}</p>
          </div>
          {!editing && (
            <Button
              size="sm"
              onClick={startEditing}
              className="bg-sky-600 hover:bg-sky-700 text-white flex-shrink-0 gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit Profile
            </Button>
          )}
        </div>
        {profile.onboarded_at && (
          <p className="text-[10px] text-gray-400 mt-3">
            Profile created {new Date(profile.onboarded_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}
      </div>

      {!editing ? (
        /* ── VIEW MODE ── */
        <>
        {/* ── Student Summary Card (formatted for institutional marketing) ── */}
        <div className="bg-gradient-to-br from-sky-50 via-indigo-50 to-violet-50 rounded-2xl border border-indigo-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <Star className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-widest">Student Summary</span>
            <span className="ml-auto text-[10px] text-gray-400 italic">Visible to Placement Cell</span>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {/* Identity */}
            <div className="space-y-2.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Identity</p>
              <p className="text-sm font-black text-gray-900 leading-tight">{profile.fullName || user?.displayName || "—"}</p>
              <p className="text-xs text-gray-600">{profile.degree || "—"} · {profile.yearOfStudy || "—"}</p>
              <p className="text-[11px] text-gray-500">{displayInstitutionName(profile.universityName, "—")}</p>
              {profile.urn && <p className="text-[11px] text-gray-400">URN: {profile.urn}</p>}
            </div>
            {/* Academics */}
            <div className="space-y-2.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Academics</p>
              {profile.currentCgpa && (
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-indigo-600">{profile.currentCgpa}</span>
                  <span className="text-xs text-gray-500">/ 10 CGPA</span>
                </div>
              )}
              {profile.pct10 && <p className="text-[11px] text-gray-600">10th: {profile.pct10}%{profile.board10 ? ` (${profile.board10})` : ""}</p>}
              {profile.prevType === "diploma"
                ? profile.diplomaPct && <p className="text-[11px] text-gray-600">Diploma: {profile.diplomaPct}%</p>
                : profile.pct12 && <p className="text-[11px] text-gray-600">12th: {profile.pct12}%{profile.board12 ? ` (${profile.board12})` : ""}</p>}
              {profile.admissionYear && <p className="text-[11px] text-gray-400">Batch of {String(parseInt(profile.admissionYear) + 4)}</p>}
            </div>
            {/* Skills & Aspiration */}
            <div className="space-y-2.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Skills & Goal</p>
              {profile.careerGoal && <p className="text-[11px] text-gray-700 italic leading-relaxed">"{profile.careerGoal}"</p>}
              {(Array.isArray(profile.skillsKnown) ? profile.skillsKnown : []).slice(0, 5).map((s: string) => (
                <span key={s} className="inline-block text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full mr-1 mb-1 font-medium">{s}</span>
              ))}
              {Array.isArray(profile.skillsKnown) && profile.skillsKnown.length > 5 && (
                <span className="text-[10px] text-gray-400">+{profile.skillsKnown.length - 5} more</span>
              )}
            </div>
          </div>
          {/* Contact strip */}
          <div className="mt-4 pt-3 border-t border-indigo-200/70 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-gray-600">
            {user?.email && <span><span className="font-semibold text-gray-400">Email</span> {user.email}</span>}
            {profile.phone && <span><span className="font-semibold text-gray-400">Mobile</span> {profile.phone}</span>}
            {profile.city && profile.state && <span><span className="font-semibold text-gray-400">Location</span> {profile.city}, {profile.state}</span>}
            {profile.linkedin && <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">LinkedIn ↗</a>}
            {profile.github && <a href={profile.github} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:underline">Portfolio ↗</a>}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Personal */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <User className="w-3.5 h-3.5" /> Personal Details
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full Name" value={profile.fullName} />
              <Field label="Gender" value={profile.gender} />
              <Field label="Date of Birth" value={profile.dob ? new Date(profile.dob).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null} />
              <Field label="Mobile" value={profile.phone} />
            </div>
            <Field label="Email" value={user?.email} />
            <Field label="Address" value={profile.address} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" value={profile.city} />
              <Field label="State" value={profile.state} />
            </div>
          </div>

          {/* Academic */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <GraduationCap className="w-3.5 h-3.5" /> Academic Details
            </h3>
            <Field label="University" value={displayInstitutionName(profile.universityName, "—")} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Degree / Branch" value={profile.degree} />
              <Field label="Year of Study" value={profile.yearOfStudy} />
              <Field label="URN / Roll No." value={profile.urn} />
              <Field label="Division" value={profile.division} />
              <Field label="Admission Year" value={profile.admissionYear} />
              <Field label="Current CGPA" value={profile.currentCgpa} />
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="10th Board" value={profile.board10} />
                <Field label="10th %" value={profile.pct10 ? `${profile.pct10}%` : null} />
              </div>
              {profile.prevType === "diploma" ? (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Diploma Stream" value={profile.diplomaStream} />
                  <Field label="Diploma %" value={profile.diplomaPct ? `${profile.diplomaPct}%` : null} />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="12th Board" value={profile.board12} />
                  <Field label="12th %" value={profile.pct12 ? `${profile.pct12}%` : null} />
                </div>
              )}
            </div>
          </div>

          {/* Skills & Goals */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" /> Skills & Goals
            </h3>
            {profile.careerGoal && (
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Career Goal</div>
                <p className="text-sm text-gray-700 italic">"{profile.careerGoal}"</p>
              </div>
            )}
            {(Array.isArray(profile.skillsKnown) ? profile.skillsKnown : []).length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Skills Known</div>
                <div className="flex flex-wrap gap-1.5">
                  {(profile.skillsKnown as string[]).map((s: string) => (
                    <span key={s} className="text-[11px] bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full font-medium">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {profile.certifications && (
              <Field label="Certifications" value={typeof profile.certifications === "string" ? profile.certifications : (profile.certifications as string[]).join(", ")} />
            )}
          </div>

          {/* Links */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Contact className="w-3.5 h-3.5" /> Links & Contact
            </h3>
            {profile.linkedin ? (
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">LinkedIn</div>
                <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm text-sky-600 hover:underline break-all">{profile.linkedin}</a>
              </div>
            ) : <Field label="LinkedIn" value={null} />}
            {profile.github ? (
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">GitHub / Portfolio</div>
                <a href={profile.github} target="_blank" rel="noopener noreferrer" className="text-sm text-sky-600 hover:underline break-all">{profile.github}</a>
              </div>
            ) : <Field label="GitHub / Portfolio" value={null} />}
            <Field label="Email (login)" value={user?.email} />
          </div>
        </div>
        </>
      ) : (
        /* ── EDIT MODE ── */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Section tabs */}
          <div className="flex gap-0 border-b border-gray-100">
            {sections.map((s, i) => (
              <button
                key={s}
                onClick={() => setActiveSection(i)}
                className={`flex-1 py-3 text-xs font-semibold transition-colors border-b-2 ${
                  activeSection === i ? "text-sky-600 border-sky-600" : "text-gray-400 border-transparent hover:text-gray-600"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-3.5">
            {/* Section 0 — Personal */}
            {activeSection === 0 && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Full Name *</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Gender</label>
                    <select value={gender} onChange={e => setGender(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 bg-white">
                      <option value="">Select</option>
                      <option>Male</option><option>Female</option><option>Prefer not to say</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date of Birth</label>
                    <input type="date" value={dob} onChange={e => setDob(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Mobile Number *</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Permanent Address</label>
                  <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">City</label>
                    <input value={city} onChange={e => setCity(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">State</label>
                    <select value={selectedState} onChange={e => setSelectedState(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 bg-white">
                      <option value="">Select</option>
                      {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Section 1 — Academic */}
            {activeSection === 1 && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Institution *</label>
                  <div className="mt-1"><InstitutionPicker value={universityName} onChange={setUniversityName} /></div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Degree / Branch *</label>
                  <select value={deg} onChange={e => { setDeg(e.target.value); setSkillsKnown([]); }} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 bg-white">
                    <option value="">Select degree</option>
                    {DEGREE_GROUPS.map((g) => (
                      <optgroup key={g.group} label={g.group}>
                        {g.degrees.map((d) => <option key={d}>{d}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Year of Study *</label>
                    <select value={yearOfStudy} onChange={e => setYearOfStudy(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 bg-white">
                      <option value="">Select</option>
                      {["1st Year","2nd Year","3rd Year","4th Year","PG 1st Year","PG 2nd Year"].map(y => <option key={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Admission Year</label>
                    <select value={admissionYear} onChange={e => setAdmissionYear(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 bg-white">
                      <option value="">Select</option>
                      {[2021,2022,2023,2024,2025,2026].map(y => <option key={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">URN / Roll No.</label>
                    <input value={urn} onChange={e => setUrn(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Division / Section</label>
                    <input value={division} onChange={e => setDivision(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
                  </div>
                </div>
              </div>
            )}

            {/* Section 2 — Marks */}
            {activeSection === 2 && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">10th Board</label>
                    <select value={board10} onChange={e => setBoard10(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 bg-white">
                      <option value="">Select</option>
                      <option>CBSE</option><option>ICSE</option><option>State Board</option><option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">10th %</label>
                    <input value={pct10} onChange={e => setPct10(e.target.value)} placeholder="85.40" className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Passing Year</label>
                    <select value={passingYear10} onChange={e => setPassingYear10(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 bg-white">
                      <option value="">Year</option>
                      {Array.from({length: 16}, (_, i) => 2026 - i).map(y => <option key={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">After 10th</label>
                  <div className="flex gap-5 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={prevType === "12th"} onChange={() => setPrevType("12th")} className="accent-sky-600" />
                      <span className="text-sm text-gray-700">12th Standard</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={prevType === "diploma"} onChange={() => setPrevType("diploma")} className="accent-sky-600" />
                      <span className="text-sm text-gray-700">Diploma</span>
                    </label>
                  </div>
                </div>
                {prevType === "12th" ? (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">12th Board</label>
                      <select value={board12} onChange={e => setBoard12(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 bg-white">
                        <option value="">Select</option>
                        <option>CBSE</option><option>ICSE</option><option>State Board</option><option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">12th %</label>
                      <input value={pct12} onChange={e => setPct12(e.target.value)} placeholder="78.20" className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Passing Year</label>
                      <select value={passingYear12} onChange={e => setPassingYear12(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 bg-white">
                        <option value="">Year</option>
                        {Array.from({length: 16}, (_, i) => 2026 - i).map(y => <option key={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Diploma Stream</label>
                      <input value={diplomaStream} onChange={e => setDiplomaStream(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Diploma %</label>
                      <input value={diplomaPct} onChange={e => setDiplomaPct(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Passing Year</label>
                      <select value={diplomaPassingYear} onChange={e => setDiplomaPassingYear(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 bg-white">
                        <option value="">Year</option>
                        {Array.from({length: 16}, (_, i) => 2026 - i).map(y => <option key={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Current CGPA (0–10)</label>
                  <input value={currentCgpa} onChange={e => setCurrentCgpa(e.target.value)} type="number" min="0" max="10" step="0.1" className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
                </div>
              </div>
            )}

            {/* Section 3 — Additional */}
            {activeSection === 3 && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">LinkedIn URL</label>
                  <input value={linkedin} onChange={e => setLinkedin(e.target.value)} type="url" placeholder="https://linkedin.com/in/yourname" className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">GitHub / Portfolio URL</label>
                  <input value={github} onChange={e => setGithub(e.target.value)} type="url" placeholder="https://github.com/yourname" className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Certifications</label>
                  <textarea value={certifications} onChange={e => setCertifications(e.target.value)} rows={2} placeholder="e.g. AWS Cloud Practitioner, NPTEL Python…" className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500 resize-none" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Career Goal *</label>
                  <textarea value={careerGoal} onChange={e => setCareerGoal(e.target.value)} rows={2} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500 resize-none" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Foreign Languages</label>
                  <input value={foreignLanguages} onChange={e => setForeignLanguages(e.target.value)} placeholder="e.g. French, German, Spanish" className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
                  <p className="text-[10px] text-gray-400 mt-1">Separate with commas. Leave blank if none.</p>
                </div>
                {branchSkills.length > 0 && (
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Skills Known</label>
                    <div className="mt-2 space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {branchSkills.map((s) => (
                        <label key={s.name} className="flex items-center gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all">
                          <input type="checkbox" checked={skillsKnown.includes(s.name)} onChange={() => toggleSkill(s.name)} className="w-4 h-4 accent-sky-600 flex-shrink-0" />
                          <span className="text-xs text-gray-700 flex-1">{s.name}</span>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">{s.credits}cr · {s.hours}h</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Edit Footer */}
          <div className="px-5 pb-5 flex items-center gap-3">
            <div className="flex gap-1 flex-1">
              {sections.map((_, i) => (
                <button key={i} onClick={() => setActiveSection(i)}
                  className={`flex-1 h-1.5 rounded-full transition-all ${i === activeSection ? "bg-sky-500" : "bg-gray-200"}`}
                />
              ))}
            </div>
            <Button variant="outline" onClick={() => setEditing(false)} className="border-gray-300 text-gray-600 text-xs px-3">
              Cancel
            </Button>
            {activeSection < sections.length - 1 ? (
              <Button onClick={() => setActiveSection(s => s + 1)} className="bg-sky-600 hover:bg-sky-700 text-white text-xs px-3">
                Next <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4">
                {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : <>Save Changes</>}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OnboardingModal({ user, track, onComplete }: { user: any; track?: string | null; onComplete: (profile?: any) => void }) {
  const { pricing } = useCareerPricing();
  const orgLabel = track === "institutional" ? "Placement Cell" : "StudentXchange";
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState(0);

  // Section 1 — Personal
  const [fullName, setFullName] = useState(user?.displayName || "");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [selectedState, setSelectedState] = useState("");
  // Section 2 — Academic
  const [universityName, setUniversityName] = useState("");
  const [deg, setDeg] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [urn, setUrn] = useState("");
  const [division, setDivision] = useState("");
  const [admissionYear, setAdmissionYear] = useState("");
  // Section 3 — Previous Marks
  const [board10, setBoard10] = useState("");
  const [pct10, setPct10] = useState("");
  const [passingYear10, setPassingYear10] = useState("");
  const [prevType, setPrevType] = useState<"12th" | "diploma">("12th");
  const [board12, setBoard12] = useState("");
  const [pct12, setPct12] = useState("");
  const [passingYear12, setPassingYear12] = useState("");
  const [diplomaStream, setDiplomaStream] = useState("");
  const [diplomaPct, setDiplomaPct] = useState("");
  const [diplomaPassingYear, setDiplomaPassingYear] = useState("");
  const [currentCgpa, setCurrentCgpa] = useState("");
  // Section 4 — Additional Info
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [certifications, setCertifications] = useState("");
  const [careerGoal, setCareerGoal] = useState("");
  const [skillsKnown, setSkillsKnown] = useState<string[]>([]);
  const [foreignLanguages, setForeignLanguages] = useState("");
  // Section 5 — Terms
  const [agreedSpcr, setAgreedSpcr] = useState(false);
  const [agreedPerf, setAgreedPerf] = useState(false);
  const [agreedTos, setAgreedTos] = useState(false);

  const sections = ["Personal Details", "Academic Details", "Previous Marks", "Additional Info", "Terms & Agreement"];
  const branchSkills = deg && SKILLS_BY_BRANCH[deg] ? SKILLS_BY_BRANCH[deg] : [];
  const toggleSkill = (name: string) => setSkillsKnown((p) => p.includes(name) ? p.filter((s) => s !== name) : [...p, name]);

  const handleSubmit = async () => {
    if (!fullName || !phone || !universityName || !deg || !yearOfStudy) {
      toast({ title: "Fill all required fields (*)", variant: "destructive" }); return;
    }
    if (!agreedSpcr || !agreedPerf || !agreedTos) {
      toast({ title: "Please agree to all 3 terms to continue", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const r = await fetch("/api/career-compass/save-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          fullName, phone, parentPhone, gender, dob, address, city, state: selectedState,
          universityName, degree: deg, yearOfStudy, urn, division, admissionYear,
          board10, pct10, passingYear10,
          prevType, board12, pct12, passingYear12,
          diplomaStream, diplomaPct, diplomaPassingYear, currentCgpa,
          certifications, careerGoal, skillsKnown,
          linkedin, github, foreignLanguages,
        }),
      });
      if (r.ok) {
        toast({ title: "Profile saved! Welcome to Career Compass 🎉" });
        onComplete({
          fullName, phone, parentPhone, gender, dob, address, city, state: selectedState,
          universityName, degree: deg, yearOfStudy, urn, division, admissionYear,
          board10, pct10, passingYear10,
          prevType, board12, pct12, passingYear12,
          diplomaStream, diplomaPct, diplomaPassingYear, currentCgpa,
          certifications, careerGoal, skillsKnown, linkedin, github,
          foreignLanguages: foreignLanguages.split(",").map(s => s.trim()).filter(Boolean),
        });
      } else throw new Error("Server error");
    } catch { toast({ title: "Couldn't save profile. Try again.", variant: "destructive" }); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-t-3xl sm:rounded-t-2xl">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-6 h-6 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-black">Onboarding Form</h2>
              <p className="text-sky-200 text-xs">One-time setup — takes about 2 minutes</p>
            </div>
          </div>
          <div className="flex gap-1.5 mt-4">
            {sections.map((s, i) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${i <= activeSection ? "bg-white" : "bg-sky-400/40"}`} />
            ))}
          </div>
          <p className="text-sky-200 text-[11px] mt-1.5">{sections[activeSection]} · {activeSection + 1}/{sections.length}</p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {activeSection === 0 && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Full Name *</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="First name  Middle name  Surname" className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Gender</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 bg-white">
                    <option value="">Select</option>
                    <option>Male</option><option>Female</option><option>Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date of Birth</label>
                  <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Mobile Number *</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit number" type="tel" className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Parent's Mobile</label>
                  <input value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="10-digit number" type="tel" className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Personal Email</label>
                <input value={user?.email || ""} disabled className="mt-1 w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-400" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Permanent Address</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, locality, landmark…" rows={2} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">City *</label>
                  <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Pune" className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">State *</label>
                  <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 bg-white">
                    <option value="">Select</option>
                    {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeSection === 1 && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Institution *</label>
                <div className="mt-1"><InstitutionPicker value={universityName} onChange={setUniversityName} /></div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Degree / Branch *</label>
                <select value={deg} onChange={(e) => { setDeg(e.target.value); setSkillsKnown([]); }} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 bg-white">
                  <option value="">Select degree</option>
                  {DEGREE_GROUPS.map((g) => (
                    <optgroup key={g.group} label={g.group}>
                      {g.degrees.map((d) => <option key={d}>{d}</option>)}
                    </optgroup>
                  ))}
                </select>
                {deg && SKILLS_BY_BRANCH[deg] && (
                  <p className="text-[10px] text-sky-600 mt-1.5">
                    {SKILLS_BY_BRANCH[deg].length} skills tracked · {SKILLS_BY_BRANCH[deg].reduce((a, s) => a + s.credits, 0)} total credits
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Year of Study *</label>
                  <select value={yearOfStudy} onChange={(e) => setYearOfStudy(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 bg-white">
                    <option value="">Select</option>
                    {["1st Year", "2nd Year", "3rd Year", "4th Year", "PG 1st Year", "PG 2nd Year"].map((y) => <option key={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Admission Year</label>
                  <select value={admissionYear} onChange={(e) => setAdmissionYear(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 bg-white">
                    <option value="">Select</option>
                    {[2021,2022,2023,2024,2025,2026].map((y) => <option key={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">URN / University Roll No *</label>
                  <input value={urn} onChange={(e) => setUrn(e.target.value)} placeholder="University Roll Number" className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Division / Section</label>
                  <input value={division} onChange={(e) => setDivision(e.target.value)} placeholder="e.g. A, CS-1" className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
                </div>
              </div>
            </div>
          )}

          {activeSection === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-xl p-3">Enter your academic marks. Used for placement eligibility checks by {orgLabel}.</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">10th Board *</label>
                  <select value={board10} onChange={(e) => setBoard10(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 bg-white">
                    <option value="">Select</option>
                    <option>CBSE</option><option>ICSE</option><option>State Board</option><option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">10th %</label>
                  <input value={pct10} onChange={(e) => setPct10(e.target.value)} placeholder="85.40" className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Passing Year</label>
                  <select value={passingYear10} onChange={(e) => setPassingYear10(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 bg-white">
                    <option value="">Year</option>
                    {Array.from({length: 16}, (_, i) => 2026 - i).map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">After 10th I completed</label>
                <div className="flex gap-5 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={prevType === "12th"} onChange={() => setPrevType("12th")} className="accent-sky-600" />
                    <span className="text-sm text-gray-700">12th Standard</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={prevType === "diploma"} onChange={() => setPrevType("diploma")} className="accent-sky-600" />
                    <span className="text-sm text-gray-700">Diploma</span>
                  </label>
                </div>
              </div>
              {prevType === "12th" ? (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">12th Board</label>
                    <select value={board12} onChange={(e) => setBoard12(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 bg-white">
                      <option value="">Select</option>
                      <option>CBSE</option><option>ICSE</option><option>State Board</option><option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">12th %</label>
                    <input value={pct12} onChange={(e) => setPct12(e.target.value)} placeholder="78.20" className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Passing Year</label>
                    <select value={passingYear12} onChange={(e) => setPassingYear12(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 bg-white">
                      <option value="">Year</option>
                      {Array.from({length: 16}, (_, i) => 2026 - i).map(y => <option key={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Diploma Stream</label>
                    <input value={diplomaStream} onChange={(e) => setDiplomaStream(e.target.value)} placeholder="e.g. Computer Engg" className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Diploma %</label>
                    <input value={diplomaPct} onChange={(e) => setDiplomaPct(e.target.value)} placeholder="72.00" className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Passing Year</label>
                    <select value={diplomaPassingYear} onChange={(e) => setDiplomaPassingYear(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500 bg-white">
                      <option value="">Year</option>
                      {Array.from({length: 16}, (_, i) => 2026 - i).map(y => <option key={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              )}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Current CGPA (0–10 scale)</label>
                <input value={currentCgpa} onChange={(e) => setCurrentCgpa(e.target.value)} placeholder="e.g. 7.8" type="number" min="0" max="10" step="0.1" className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
              </div>
            </div>
          )}

          {activeSection === 3 && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">LinkedIn Profile URL</label>
                <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/yourname" type="url" className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">GitHub / Portfolio URL</label>
                <input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/yourname" type="url" className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Existing Certifications (optional)</label>
                <textarea value={certifications} onChange={(e) => setCertifications(e.target.value)} placeholder="e.g. AWS Cloud Practitioner, Google Analytics, NPTEL Python…" rows={2} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500 resize-none" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Career Goal (one sentence) *</label>
                <textarea value={careerGoal} onChange={(e) => setCareerGoal(e.target.value)} placeholder="e.g. I want to become a full-stack developer at a product startup within 2 years of graduation." rows={2} className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500 resize-none" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Foreign Languages (optional)</label>
                <input value={foreignLanguages} onChange={(e) => setForeignLanguages(e.target.value)} placeholder="e.g. French, German, Spanish, Japanese" className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-500" />
                <p className="text-[10px] text-gray-400 mt-1">Separate with commas. Leave blank if none.</p>
              </div>
              {branchSkills.length > 0 && (
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Skills Already Known</label>
                  <p className="text-[10px] text-gray-400 mt-0.5 mb-2">Helps Career Compass personalise your roadmap</p>
                  <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto pr-1">
                    {branchSkills.map((s) => (
                      <label key={s.name} className="flex items-center gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all">
                        <input type="checkbox" checked={skillsKnown.includes(s.name)} onChange={() => toggleSkill(s.name)} className="w-4 h-4 accent-sky-600 flex-shrink-0" />
                        <span className="text-xs text-gray-700 flex-1">{s.name}</span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{s.credits}cr · {s.hours}h</span>
                      </label>
                    ))}
                  </div>
                  {skillsKnown.length > 0 && (
                    <p className="text-[10px] text-sky-600 mt-1.5">{skillsKnown.length} skill{skillsKnown.length > 1 ? "s" : ""} selected</p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeSection === 4 && (
            <div className="space-y-3.5">
              <div className="bg-sky-50 border border-sky-100 rounded-xl p-4">
                <h4 className="text-sm font-bold text-sky-800 flex items-center gap-2 mb-2"><Shield className="w-4 h-4" />{orgLabel} Data Sharing</h4>
                <p className="text-xs text-gray-600 leading-relaxed">I agree to share this information with {orgLabel} for placement tracking and career guidance purposes.</p>
                <label className="flex items-start gap-2 cursor-pointer mt-3">
                  <input type="checkbox" checked={agreedSpcr} onChange={(e) => setAgreedSpcr(e.target.checked)} className="w-4 h-4 accent-sky-600 mt-0.5 flex-shrink-0" />
                  <span className="text-xs font-semibold text-gray-700">I agree to share my data with {orgLabel} *</span>
                </label>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4" />Performance Visibility</h4>
                <p className="text-xs text-gray-600 leading-relaxed">I understand that my performance on Career Compass, skill assessments, and placement readiness tests will be visible to my placement cell and may be considered for placement drive eligibility.</p>
                <label className="flex items-start gap-2 cursor-pointer mt-3">
                  <input type="checkbox" checked={agreedPerf} onChange={(e) => setAgreedPerf(e.target.checked)} className="w-4 h-4 accent-amber-600 mt-0.5 flex-shrink-0" />
                  <span className="text-xs font-semibold text-gray-700">I understand my performance will be visible to the placement cell *</span>
                </label>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-2"><FileText className="w-4 h-4" />Terms of Service</h4>
                <p className="text-xs text-gray-600 leading-relaxed">I agree to the StudentLancing Terms of Service and Privacy Policy. Career Compass Free is available with the features shown in the plan details. Premium is a one-time payment for {pricing ? `${pricing.durationDays} days at ${pricing.priceLabel}` : "the duration and price shown in the plan details"}, with no automatic renewal.</p>
                <label className="flex items-start gap-2 cursor-pointer mt-3">
                  <input type="checkbox" checked={agreedTos} onChange={(e) => setAgreedTos(e.target.checked)} className="w-4 h-4 accent-sky-600 mt-0.5 flex-shrink-0" />
                  <span className="text-xs font-semibold text-gray-700">I agree to the Terms of Service & Privacy Policy *</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col gap-2">
          <div className="flex gap-3">
            {activeSection > 0 && (
              <Button variant="outline" onClick={() => setActiveSection((s) => s - 1)} className="px-4 border-gray-300 text-gray-600">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            {activeSection < sections.length - 1 ? (
              <Button onClick={() => setActiveSection((s) => s + 1)} className="flex-1 bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-bold rounded-xl">
                Next: {sections[activeSection + 1]} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={saving} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl">
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : <>Save & Start Career Compass <ArrowRight className="w-4 h-4 ml-1" /></>}
              </Button>
            )}
          </div>
          {user?.email?.toLowerCase() === PLATFORM_ADMIN_EMAIL && (
            <button
              onClick={onComplete}
              className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 text-center transition-colors"
            >
              Skip for now (admin only)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── EmbeddedPlacementPanel ───────────────────────────────────────────────────
// A collapsible Placement Readiness section that lives inside the roadmap tab.
function EmbeddedPlacementPanel({ user, degree, year, roadmapSkills, roadmapAspirations, initialPlacementSession, onUpgrade }: {
  user: any;
  degree: string;
  year: string;
  roadmapSkills: string[];
  roadmapAspirations: string[];
  initialPlacementSession?: any;
  onUpgrade?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-indigo-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-indigo-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-bold text-gray-900">Placement Readiness</span>
            <p className="text-[11px] text-gray-400 mt-0.5">Track, test & prove your skills — synced from this roadmap</p>
          </div>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="border-t border-indigo-100 p-0">
          <PlacementReadiness
            user={user}
            initialDegree={degree}
            initialYear={year}
            initialSession={initialPlacementSession}
            roadmapSkills={roadmapSkills}
            roadmapAspirations={roadmapAspirations}
            onUpgrade={onUpgrade}
          />
        </div>
      )}
    </div>
  );
}
