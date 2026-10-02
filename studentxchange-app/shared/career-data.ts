/**
 * shared/career-data.ts
 * Single source of truth for Career Compass degree + aspiration option sets.
 * Used by the personal flow (career-compass.tsx), the institutional student
 * view, and the admin Roadmap Manager so every dropdown stays in sync and a
 * degree resolves to the same Firestore key everywhere.
 *
 * NOTE: Existing degree labels are preserved verbatim so previously saved
 * student profiles still resolve/select correctly. Add new degrees freely;
 * do not rename or remove an existing label.
 */

export interface DegreeGroup {
  group: string;
  degrees: string[];
}

export interface Aspiration {
  label: string;
  icon: string;
}

export interface AspirationGroup {
  group: string;
  items: Aspiration[];
}

// ─── Degrees, grouped by field of study ──────────────────────────────────────
export const DEGREE_GROUPS: DegreeGroup[] = [
  {
    group: "Engineering & Technology (B.Tech / B.E.)",
    degrees: [
      "B.Tech Computer Science",
      "B.Tech CS — Software Engineering",
      "B.Tech CS — Cyber Security",
      "B.Tech CS — AI & Machine Learning",
      "B.Tech CS — Data Science",
      "B.Tech CSE — AR/VR",
      "B.Tech AI & Data Science",
      "B.Tech Robotics & Automation",
      "B.Tech IT",
      "B.Tech ECE",
      "B.Tech Electrical (EE)",
      "B.Tech Electrical & Electronics (EEE)",
      "B.Tech Electronics & Instrumentation",
      "B.Tech Instrumentation & Control",
      "B.Tech Mechanical",
      "B.Tech Mechatronics",
      "B.Tech Civil",
      "B.Tech Aerospace Engineering",
      "B.Tech Aeronautical Engineering",
      "B.Tech Automobile Engineering",
      "B.Tech Chemical Engineering",
      "B.Tech Biomedical Engineering",
      "B.Tech Biotechnology",
      "B.Tech Industrial Engineering",
      "B.Tech Production Engineering",
      "B.Tech Marine Engineering",
      "B.Tech Metallurgical Engineering",
      "B.Tech Mining Engineering",
      "B.Tech Petroleum Engineering",
      "B.Tech Environmental Engineering",
      "B.Tech Agricultural Engineering",
      "B.Tech Food Technology",
      "B.Tech Textile Engineering",
      "B.Tech Ceramic Engineering",
      "B.Tech Nanotechnology",
      "B.Tech Naval Architecture & Ocean Engineering",
      "B.Tech Power Engineering",
      "B.E. (Other Branch)",
    ],
  },
  {
    group: "Computer Applications & IT",
    degrees: [
      "BCA",
      "BCA — Cloud & Security",
      "B.Sc Computer Science",
      "B.Sc IT",
      "MCA",
      "PGDCA",
    ],
  },
  {
    group: "Architecture & Planning",
    degrees: [
      "B.Arch (Architecture)",
      "B.Plan (Planning)",
    ],
  },
  {
    group: "Medicine & Surgery",
    degrees: [
      "MBBS",
      "MD / MS (PG Medicine)",
    ],
  },
  {
    group: "Dental, AYUSH & Allied Health",
    degrees: [
      "BDS (Dental)",
      "BAMS (Ayurveda)",
      "BHMS (Homeopathy)",
      "BUMS (Unani)",
      "BNYS (Naturopathy & Yoga)",
      "BPT (Physiotherapy)",
      "BOT (Occupational Therapy)",
      "B.Optom (Optometry)",
      "BMLT (Medical Lab Technology)",
      "B.Sc Radiology & Imaging",
    ],
  },
  {
    group: "Pharmacy",
    degrees: [
      "D.Pharmacy",
      "B.Pharmacy",
      "Pharm.D",
      "M.Pharmacy",
    ],
  },
  {
    group: "Nursing & Paramedical",
    degrees: [
      "B.Sc Nursing",
      "GNM Nursing",
      "B.Sc Paramedical",
    ],
  },
  {
    group: "Sciences (B.Sc)",
    degrees: [
      "B.Sc Physics",
      "B.Sc Chemistry",
      "B.Sc Mathematics",
      "B.Sc Statistics",
      "B.Sc Biology",
      "B.Sc Botany",
      "B.Sc Zoology",
      "B.Sc Microbiology",
      "B.Sc Biotechnology",
      "B.Sc Biochemistry",
      "B.Sc Data Science",
      "B.Sc Electronics",
      "B.Sc Environmental Science",
      "B.Sc Forensic Science",
      "B.Sc Geology",
      "B.Sc Aviation",
      "B.Sc Nautical Science",
      "B.Sc Home Science",
      "B.Sc Nutrition & Dietetics",
    ],
  },
  {
    group: "Agriculture & Allied Sciences",
    degrees: [
      "B.Sc Agriculture",
      "B.Sc Horticulture",
      "B.Sc Forestry",
      "B.Sc Sericulture",
      "B.Tech Dairy Technology",
    ],
  },
  {
    group: "Commerce & Accountancy",
    degrees: [
      "B.Com",
      "B.Com Honours",
      "B.Com Accounting & Finance",
      "B.Com Banking & Insurance",
      "B.Com Financial Markets",
      "B.Com Taxation",
      "Chartered Accountancy (CA)",
      "Cost & Management Accountancy (CMA)",
      "Company Secretary (CS)",
    ],
  },
  {
    group: "Business & Management",
    degrees: [
      "BBA",
      "BBA — Marketing",
      "BBA — Finance",
      "BBA — Human Resources",
      "BBA — Business Analytics",
      "BBA — International Business",
      "BMS (Management Studies)",
      "MBA",
      "PGDM",
    ],
  },
  {
    group: "Economics & Social Sciences",
    degrees: [
      "BA Economics",
      "BA Psychology",
      "BA Political Science",
      "BA Sociology",
      "BA Public Administration",
      "BA Social Work (BSW)",
      "BA Geography",
      "BA Anthropology",
    ],
  },
  {
    group: "Humanities & Languages",
    degrees: [
      "BA English",
      "BA History",
      "BA Philosophy",
      "BA Hindi",
      "BA Sanskrit",
      "BA Regional Language",
      "BA Liberal Arts",
    ],
  },
  {
    group: "Law",
    degrees: [
      "LLB",
      "BA LLB",
      "BBA LLB",
      "B.Com LLB",
      "LLM",
    ],
  },
  {
    group: "Design",
    degrees: [
      "B.Design UI/UX",
      "B.Design Fashion",
      "B.Design Graphic Design",
      "B.Design Product Design",
      "B.Design Interior Design",
      "B.Design Communication Design",
      "B.Design Animation & VFX",
      "B.Design Game Design",
      "B.Design Textile Design",
    ],
  },
  {
    group: "Fine & Performing Arts",
    degrees: [
      "BFA (Fine Arts)",
      "BPA (Performing Arts)",
      "B.Mus (Music)",
      "BVA (Visual Arts)",
    ],
  },
  {
    group: "Media, Journalism & Communication",
    degrees: [
      "BMM (Mass Media)",
      "BJMC (Journalism & Mass Comm)",
      "BA Film & Television",
      "B.Sc Animation & Multimedia",
    ],
  },
  {
    group: "Education & Physical Education",
    degrees: [
      "B.Ed",
      "B.El.Ed",
      "B.P.Ed (Physical Education)",
      "B.Sc Physical Education",
    ],
  },
  {
    group: "Hospitality, Travel & Tourism",
    degrees: [
      "BHM (Hotel Management)",
      "B.Sc Hospitality & Hotel Admin",
      "BTTM (Travel & Tourism)",
      "B.Sc Culinary Arts",
    ],
  },
  {
    group: "Veterinary & Fisheries",
    degrees: [
      "B.V.Sc (Veterinary Science)",
      "B.F.Sc (Fisheries Science)",
    ],
  },
  {
    group: "Postgraduate Programs",
    degrees: [
      "M.Tech",
      "M.Sc",
      "M.Com",
      "MA",
      "M.Des",
      "M.Arch",
      "M.Ed",
      "MSW (Social Work)",
    ],
  },
  {
    group: "Diplomas & Other",
    degrees: [
      "Diploma / Polytechnic",
      "ITI",
      "Foundation / Pre-University",
      "Other",
    ],
  },
];

// Flat list (deduped, original order from groups) for places that need a plain array.
export const DEGREES: string[] = Array.from(
  new Set(DEGREE_GROUPS.flatMap((g) => g.degrees)),
);

// Back-compat alias used by the institutional view + admin Roadmap Manager.
export const CAREER_DEGREES = DEGREES;

export const CAREER_YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "PG 1st Year", "PG 2nd Year"];

// ─── Career taxonomy ─────────────────────────────────────────────────────────
// Canonical labels are deliberately unique.  Older labels remain aliases so a
// saved profile can still be resolved without presenting duplicate choices.
export interface CareerGoal {
  id: string;
  label: string;
  icon: string;
  aliases: string[];
  searchTerms: string[];
  relatedCourses: string[];
  coreSkills: string[];
  technologies: string[];
  certifications: string[];
  entryLevelRoles: string[];
  midLevelRoles: string[];
  seniorRoles: string[];
  relatedCareers: string[];
  alternativePaths: string[];
  projectIdeas: string[];
  internshipAreas: string[];
  higherStudyOptions: string[];
  entrepreneurshipOpportunities: string[];
}

export interface CareerFamily { name: string; goals: CareerGoal[]; }
export interface CareerSector { id: string; name: string; icon: string; families: CareerFamily[]; }
export const CAREER_TAXONOMY_VERSION = "2026-09-08";

type FamilySeed = readonly [string, string];
type SectorSeed = readonly [string, string, string, readonly FamilySeed[]];
const words = (value: string) => value.split("|").map((item) => item.trim()).filter(Boolean);
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// This compact authoring format is expanded below into rich, UI-independent data.
const CAREER_SEEDS: readonly SectorSeed[] = [
  ["technology-software", "Technology & Software", "💻", [
    ["Software Development", "Software Engineer|Front-End Developer|Back-End Developer|Full-Stack Developer|Mobile App Developer|Android Developer|iOS Developer|Web Developer|Desktop Application Developer|Software Architect|Solutions Architect|System Architect|API Developer|Embedded Software Engineer|Firmware Engineer"],
    ["Cloud, Platform & Quality", "DevOps Engineer|Cloud Engineer|Cloud Architect|Site Reliability Engineer|Platform Engineer|Infrastructure Engineer|Database Administrator|Database Engineer|Technical Support Engineer|QA Engineer|Automation Test Engineer|Performance Test Engineer|Release Engineer"],
    ["AI, Data & Automation", "Data Engineer|Data Scientist|Data Analyst|Business Intelligence Analyst|Machine Learning Engineer|AI Engineer|Generative AI Engineer|NLP Engineer|Computer Vision Engineer|MLOps Engineer|Robotics Software Engineer|Automation Engineer|Quantum Computing Researcher|Quantum Software Developer"],
    ["Cybersecurity & Web3", "Cybersecurity Specialist|Security Engineer|Ethical Hacker|Penetration Tester|Security Analyst|SOC Analyst|Digital Forensics Specialist|Cloud Security Engineer|Application Security Engineer|Blockchain Developer|Web3 Developer|Smart Contract Developer"],
    ["Games & Extended Reality", "Game Developer|Game Programmer|Game Designer|Gameplay Engineer|AR/VR Developer|AR Developer|VR Developer|XR Developer|Mixed Reality Developer|Spatial Computing Developer|VR Game Developer|AR Game Developer|XR Designer|Immersive Experience Designer|VR 3D Artist|XR Technical Artist|Virtual Production Specialist|Unity Developer|Unreal Engine Developer|3D Technical Artist|Computer Graphics Engineer|Metaverse Developer|Digital Twin Specialist"],
    ["Technical Leadership", "Technical Writer|Developer Relations|Developer Advocate|Technical Consultant|IT Consultant|IT Project Manager|Technical Product Manager|AI Product Manager|SaaS Product Manager"],
  ]],
  ["core-engineering", "Core Engineering", "⚙️", [
    ["Mechanical & Manufacturing", "Mechanical Engineer|Design Engineer|Manufacturing Engineer|Production Engineer|Industrial Engineer|Automotive Engineer|Thermal Engineer|HVAC Engineer|Mechatronics Engineer|CAD Engineer|CAE Engineer|Simulation Engineer|Maintenance Engineer|Quality Engineer"],
    ["Civil & Built Environment", "Civil Engineer|Structural Engineer|Geotechnical Engineer|Transportation Engineer|Highway Engineer|Construction Engineer|Site Engineer|Quantity Surveyor|Project Engineer|Urban Planner|Infrastructure Engineer|Environmental Engineer|Water Resources Engineer"],
    ["Electrical & Electronics", "Electrical Engineer|Power Systems Engineer|Power Electronics Engineer|Control Systems Engineer|Electrical Design Engineer|Renewable Energy Engineer|Solar Engineer|Energy Engineer|Electronics Engineer|Electronics Design Engineer|VLSI Engineer|Semiconductor Engineer|ASIC Design Engineer|FPGA Engineer|Embedded Systems Engineer|IoT Engineer|RF Engineer|Telecommunications Engineer|Signal Processing Engineer|Instrumentation Engineer"],
    ["Aerospace, Chemical & Robotics", "Aerospace Engineer|Aeronautical Engineer|Aircraft Design Engineer|Propulsion Engineer|Avionics Engineer|Space Systems Engineer|Satellite Engineer|Rocket Engineer|Flight Systems Engineer|Chemical Engineer|Process Engineer|Petroleum Engineer|Nuclear Engineer|Battery Engineer|Hydrogen Energy Engineer|Renewable Energy Specialist|Robotics Engineer|Robotics Researcher|Robot Programmer|Autonomous Systems Engineer|Drone Engineer|Biomedical Engineer|Medical Device Engineer|Clinical Engineer|Biomechanical Engineer"],
  ]],
  ["design-creative", "Design, Creative & Digital Arts", "🎨", [
    ["Experience & Product Design", "UI/UX Designer|UX Researcher|UX Writer|Product Designer|Interaction Designer|Service Designer|Design Strategist"],
    ["Visual, 3D & Screen Arts", "Graphic Designer|Brand Designer|Visual Designer|Motion Designer|3D Designer|3D Artist|3D Modeler|Concept Artist|Illustrator|Animator|VFX Artist|CGI Artist|Character Designer|Environment Artist|Game Artist|Technical Artist|Video Editor|Photographer|Filmmaker|Cinematographer|Art Director|Creative Director"],
    ["Fashion, Space & Writing", "Fashion Designer|Fashion Stylist|Fashion Illustrator|Textile Designer|Interior Designer|Furniture Designer|Industrial Designer|Architect|Landscape Architect|Urban Designer|Exhibition Designer|Set Designer|Content Creator|Creator / Influencer|Copywriter|Scriptwriter|Creative Writer"],
  ]],
  ["business-management", "Business, Management & Entrepreneurship", "💼", [
    ["Leadership & Consulting", "Entrepreneur / Founder|Startup Founder|Business Owner|Product Manager|Product Marketing Manager|Project Manager|Program Manager|Operations Manager|Business Analyst|Management Consultant|Strategy Consultant|Business Consultant|Management Trainee"],
    ["Growth, Sales & People", "Growth Manager|Growth Hacker|Marketing Manager|Brand Manager|Digital Marketing Manager|Performance Marketer|SEO Specialist|SEM Specialist|Social Media Manager|Community Manager|Sales Manager|Sales Executive|Business Development Manager|Account Manager|Customer Success Manager|HR Manager|Talent Acquisition Specialist|Recruiter|Learning & Development Manager"],
    ["Operations & Commerce", "Supply Chain Manager|Procurement Manager|Operations Analyst|Retail Manager|E-commerce Manager|Franchise Owner"],
  ]],
  ["finance-banking-accounting", "Finance, Banking & Accounting", "💰", [
    ["Investing & Banking", "Financial Analyst|Investment Banker|Equity Research Analyst|Portfolio Manager|Fund Manager|Wealth Manager|Investment Advisor|Financial Planner|Corporate Finance Analyst|Credit Analyst|Risk Analyst|Treasury Analyst|Investment Analyst|Private Equity Professional|Venture Capital Professional|FinTech Professional|Banking Professional|Relationship Manager|Credit Manager|Loan Officer|Quantitative Analyst|Quantitative Researcher|Trader|Stock Market Analyst|Algorithmic Trader"],
    ["Accounting, Tax & Insurance", "Chartered Accountant|Cost Accountant|Company Secretary|Auditor|Tax Consultant|Tax Analyst|Actuary|Insurance Professional|Underwriter"],
  ]],
  ["healthcare-life-sciences", "Healthcare & Life Sciences", "🏥", [
    ["Clinical Care", "Doctor / Physician|Surgeon|Dentist|Orthodontist|Pharmacist|Nurse|Physiotherapist|Occupational Therapist|Psychologist|Psychiatrist|Nutritionist|Dietitian|Veterinarian|Radiologist|Medical Imaging Specialist"],
    ["Life Sciences & Health Systems", "Biotechnologist|Microbiologist|Biochemist|Geneticist|Biomedical Researcher|Neuroscientist|Clinical Researcher|Epidemiologist|Public Health Professional|Medical Researcher|Medical Laboratory Scientist|Healthcare Administrator|Hospital Manager|Medical Representative|Health Informatics Specialist|Bioinformatics Scientist|Pharmaceutical Scientist|Clinical Data Manager"],
  ]],
  ["law-public-service", "Law, Government & Public Service", "⚖️", [
    ["Legal Practice", "Lawyer / Advocate|Corporate Lawyer|Corporate Legal Counsel|Criminal Lawyer|Civil Lawyer|Constitutional Lawyer|Intellectual Property Lawyer|Cyber Lawyer|Tax Lawyer|Legal Consultant|Legal Analyst|Judge / Judiciary"],
    ["Government & Policy", "Civil Services / UPSC|State PSC|IAS|IPS|IFS|Government Officer|Public Administrator|Policy Analyst|Public Policy Professional|Diplomat|Foreign Service|Defence / Armed Forces|Police Services|Intelligence Officer|Government Relations Professional|Political Consultant|Political Researcher"],
  ]],
  ["science-research", "Science & Research", "🔬", [
    ["Scientific Research", "Research Scientist|Professor / Academician|Environmental Scientist|Biologist|Chemist|Physicist|Mathematician|Statistician|Astronomer|Astrophysicist|Geologist|Geophysicist|Oceanographer|Meteorologist|Climate Scientist|Materials Scientist|Nanotechnologist|Forensic Scientist|Data Researcher|Scientific Researcher|R&D Scientist"],
  ]],
  ["media-entertainment", "Media, Entertainment & Communication", "🎬", [
    ["Journalism & Communications", "Journalist|Reporter|News Anchor|Editor|Content Writer|PR Specialist|Communications Manager|Corporate Communications|Social Media Strategist"],
    ["Entertainment & Audio", "Film Director|Film Producer|Screenwriter|Actor|Voice Artist|Radio Jockey|Podcast Producer|Podcast Host|YouTuber|Influencer|Music Producer|Sound Designer|Audio Engineer|Musician|Singer|Dancer|Choreographer|Theatre Artist"],
  ]],
  ["architecture-real-estate", "Architecture, Construction & Real Estate", "🏗️", [
    ["Built Environment", "Interior Architect|Structural Consultant|Construction Manager|Real Estate Developer|Real Estate Consultant|Property Manager|Real Estate Analyst|Facility Manager|Building Services Engineer"],
  ]],
  ["agriculture-environment", "Agriculture, Food & Environment", "🌾", [
    ["Food, Land & Sustainability", "Agricultural Scientist|Agronomist|Horticulturist|Agricultural Engineer|Agri-Business Manager|Agricultural Consultant|Food Technologist|Food Scientist|Food Safety Specialist|Dairy Technologist|Fisheries Professional|Forestry Professional|Sustainability Consultant|Climate Specialist|Renewable Energy Professional|Wildlife Conservationist|Ecologist"],
  ]],
  ["hospitality-travel-events", "Hospitality, Travel & Events", "✈️", [
    ["Guest, Travel & Events", "Hotel Manager|Hospitality Manager|Chef / Culinary Expert|Pastry Chef|Food & Beverage Manager|Restaurant Manager|Event Manager|Event Producer|Wedding Planner|Travel Consultant|Travel & Tourism Professional|Airline Professional|Airport Manager|Cabin Crew|Cruise Professional|Tourism Entrepreneur"],
  ]],
  ["education-training", "Education & Training", "🍎", [
    ["Teaching & Learning", "Teacher / Educator|School Teacher|College Professor|Lecturer|Corporate Trainer|Instructional Designer|Curriculum Designer|Education Consultant|Academic Counselor|Career Counselor|Education Entrepreneur|EdTech Professional|Educational Content Creator|Researcher / Academic"],
  ]],
  ["sports-wellness", "Sports, Fitness & Wellness", "🏅", [
    ["Performance & Wellness", "Professional Athlete|Sports Coach|Fitness Trainer|Personal Trainer|Strength & Conditioning Coach|Sports Physiotherapist|Sports Psychologist|Sports Nutritionist|Sports Analyst|Sports Journalist|Sports Manager|Sports Marketing Professional|Sports Agent|Esports Player|Esports Coach|Esports Manager|Yoga Instructor|Wellness Coach"],
  ]],
  ["logistics-transportation", "Logistics, Supply Chain & Transportation", "🚚", [
    ["Movement & Operations", "Logistics Manager|Logistics Analyst|Procurement Specialist|Warehouse Manager|Fleet Manager|Transportation Manager|Import/Export Specialist|Shipping Coordinator|Aviation Operations|Maritime Professional|Port Operations Manager|E-commerce Operations"],
  ]],
  ["defence-emergency", "Defence, Security & Emergency Services", "🛡️", [
    ["Protection & Response", "Armed Forces|Army Officer|Navy Officer|Air Force Officer|Defence Engineer|Defence Researcher|Cyber Defence Specialist|Police Officer|Firefighter|Emergency Response Professional|Disaster Management Professional|Security Consultant"],
  ]],
  ["social-impact", "Social Impact & Non-Profit", "🤲", [
    ["Development & Impact", "NGO Professional|Social Worker|Development Professional|Social Entrepreneur|Humanitarian Worker|CSR Professional|CSR Manager|Community Development Professional|Sustainability Professional|Policy Researcher|International Development Professional"],
  ]],
  ["skilled-professions", "Personal Services & Skilled Professions", "🔧", [
    ["Trades & Personal Services", "Electrician|Plumber|Automotive Technician|Mechanic|Carpenter|Welder|HVAC Technician|Technician|Machine Operator|CNC Operator|Industrial Technician|Beautician|Makeup Artist|Hairstylist|Tattoo Artist|Chef|Baker|Tailor|Craftsman|Jewellery Designer"],
  ]],
  ["emerging-future", "Emerging & Future Careers", "🚀", [
    ["Future Technology", "Generative AI Specialist|AI Agent Developer|AI Automation Specialist|Prompt Engineer|AI Safety Researcher|Digital Twin Engineer|Quantum Computing Specialist|Quantum Software Engineer|Climate Tech Professional|Carbon Management Specialist|Battery Technology Engineer|EV Engineer|Autonomous Vehicle Engineer|Drone Technology Specialist|Space Technology Professional|Satellite Technology Engineer|Genetic Engineering Professional|Synthetic Biology Researcher|Neurotechnology Researcher|Human-Computer Interaction Researcher"],
  ]],
  ["explore-other", "Explore / Other", "🧭", [
    ["Exploration", "Government Job Aspirant|Higher Studies / Masters Abroad|Still Exploring|Other|Competitive Exams|Research / PhD|Entrepreneurship|Family Business|Freelancing|Remote Professional|Career Switcher|Gap Year / Exploration|Multiple Career Interests"],
  ]],
];

const LEGACY_ALIASES: Record<string, string[]> = {
  "AI Engineer": ["AI / ML Engineer"],
  "Cloud Engineer": ["Cloud / DevOps Engineer"],
  "QA Engineer": ["QA / Test Engineer"],
  "Civil Engineer": ["Civil / Structural Engineer"],
  "Automotive Engineer": ["Automobile Engineer"],
  "Petroleum Engineer": ["Petroleum / Energy Engineer"],
  "VFX Artist": ["Animator / VFX Artist"],
  "Filmmaker": ["Photographer / Filmmaker"],
  "Digital Marketing Manager": ["Digital Marketer"],
  "Auditor": ["Auditor / Tax Consultant"],
  "Psychologist": ["Psychologist / Therapist"],
  "Nutritionist": ["Nutritionist / Dietitian"],
  "Policy Analyst": ["Policy / Public Administration"],
  "Forensic Scientist": ["Forensic Expert"],
  "Mathematician": ["Mathematician / Statistician"],
  "Physicist": ["Astronomer / Physicist"],
  "Journalist": ["Journalist / Reporter"],
  "PR Specialist": ["PR / Communications"],
  "Film Director": ["Film Director / Producer"],
  "Travel & Tourism Professional": ["Travel & Tourism Pro"],
  "Creator / Influencer": ["Content Creator"],
  "Sales Manager": ["Sales Leader"],
};

// Regression contract: every label previously stored by Career Compass must
// continue to resolve even when its canonical display label evolves.
export const LEGACY_ASPIRATION_LABELS = words(
  "Software Engineer|Full-Stack Developer|Mobile App Developer|Data Scientist|AI / ML Engineer|Data Analyst|Cybersecurity Specialist|Cloud / DevOps Engineer|Game Developer|Blockchain Developer|QA / Test Engineer|Mechanical Engineer|Civil / Structural Engineer|Electrical Engineer|Electronics Engineer|Aerospace Engineer|Automobile Engineer|Chemical Engineer|Robotics Engineer|Biomedical Engineer|Petroleum / Energy Engineer|UI/UX Designer|Graphic Designer|Product Designer|Fashion Designer|Interior Designer|Animator / VFX Artist|Architect|Content Creator|Photographer / Filmmaker|Product Manager|Business Analyst|Management Consultant|Marketing Manager|Digital Marketer|HR Manager|Operations Manager|Entrepreneur / Founder|Sales Leader|Financial Analyst|Investment Banker|Chartered Accountant|Auditor / Tax Consultant|Actuary|Doctor / Physician|Surgeon|Dentist|Pharmacist|Nurse|Physiotherapist|Veterinarian|Biotechnologist|Psychologist / Therapist|Nutritionist / Dietitian|Lawyer / Advocate|Corporate Legal Counsel|Civil Services / UPSC|Judge / Judiciary|Defence / Armed Forces|Policy / Public Administration|Research Scientist|Professor / Academician|Environmental Scientist|Forensic Expert|Mathematician / Statistician|Astronomer / Physicist|Journalist / Reporter|News Anchor|PR / Communications|Social Media Manager|Film Director / Producer|Agricultural Scientist|Agri-Business Manager|Chef / Culinary Expert|Hotel Manager|Event Manager|Travel & Tourism Pro|Teacher / Educator|Corporate Trainer|Government Job Aspirant|Higher Studies / Masters Abroad|Still Exploring|Other",
);

const sectorKeywords = (sector: string) => {
  const keywords = sector.toLowerCase().replace(/&/g, " and ").split(/[\s,/]+/).filter((word) => word.length > 2);
  if (sector === "Healthcare & Life Sciences") keywords.push("medicine", "medical", "health");
  if (sector === "Core Engineering") keywords.push("engineering");
  return keywords;
};
const sectorProfile = (sector: string) => {
  if (sector === "Technology & Software") return { courses: ["Computer Science", "Information Technology", "Software Engineering"], tools: ["Git", "Cloud platforms", "Issue tracking"] };
  if (sector === "Core Engineering") return { courses: ["Engineering fundamentals", "Mathematics", "Engineering design"], tools: ["CAD/CAE tools", "Simulation software", "Industry safety tools"] };
  if (sector === "Healthcare & Life Sciences") return { courses: ["Health sciences", "Biology", "Clinical practice"], tools: ["Clinical information systems", "Laboratory tools", "Medical documentation"] };
  if (sector === "Finance, Banking & Accounting") return { courses: ["Finance", "Accounting", "Economics"], tools: ["Spreadsheets", "Financial modelling tools", "Accounting software"] };
  if (sector === "Law, Government & Public Service") return { courses: ["Law", "Public policy", "Legal research"], tools: ["Legal research databases", "Case management tools", "Document drafting"] };
  if (sector === "Design, Creative & Digital Arts") return { courses: ["Design", "Visual communication", "Creative practice"], tools: ["Figma", "Adobe Creative Cloud", "Portfolio platforms"] };
  return { courses: [`${sector} fundamentals`, "Communication and professional practice"], tools: ["Industry-standard tools", "Collaboration tools", "Analytics and documentation"] };
};
const metadataFor = (label: string, sector: string, family: string): Omit<CareerGoal, "id" | "label" | "icon" | "aliases" | "searchTerms"> => {
  const profile = sectorProfile(sector);
  const xr = /(^|\/|\s)(AR|VR|XR)(\/|\s|$)|Spatial|Immersive|Unity|Unreal|Metaverse|Virtual Production|Digital Twin|Computer Graphics/i.test(label);
  const tools = xr ? ["Unity", "Unreal Engine", "C#", "C++", "3D modelling", "Computer Vision"] : profile.tools;
  const courses = xr ? ["Computer Science", "Information Technology", "Computer Engineering", "Game Technology", "3D design"] : profile.courses;
  return {
  relatedCourses: [...courses, `${family} specialization`],
  coreSkills: ["Problem solving", "Communication", `${family} fundamentals`, ...(xr ? ["3D interaction design", "real-time rendering"] : [])],
  technologies: tools,
  certifications: [`${family} professional certificate`, "Industry safety or ethics certification"],
  entryLevelRoles: [`Junior ${label}`, `${label} Intern`],
  midLevelRoles: [label, `Lead ${label}`],
  seniorRoles: [`Senior ${label}`, `${family} Director`],
  relatedCareers: [`${family} Specialist`, `${sector} Consultant`],
  alternativePaths: ["Apprenticeship or portfolio route", "Adjacent career-family transition"],
  projectIdeas: [`Build a practical ${label} portfolio project`, `Solve a real ${family} problem`],
  internshipAreas: [family, `${sector} operations`],
  higherStudyOptions: [`Postgraduate study in ${family}`, `Research degree in ${sector}`],
  entrepreneurshipOpportunities: [`Independent ${label} practice`, `${family} services or product venture`],
  };
};

const usedIds = new Set<string>();
const makeGoal = (label: string, sector: string, family: string, icon: string): CareerGoal => {
  const base = slug(label);
  let id = base;
  let suffix = 2;
  while (usedIds.has(id)) id = `${base}-${suffix++}`;
  usedIds.add(id);
  const aliases = LEGACY_ALIASES[label] ?? [];
  return { id, label, icon, aliases, searchTerms: Array.from(new Set([label, ...aliases, family, ...sectorKeywords(sector)])), ...metadataFor(label, sector, family) };
};

const seenLabels = new Set<string>();
export const CAREER_SECTORS: CareerSector[] = CAREER_SEEDS.map(([id, name, icon, families]) => ({
  id, name, icon, families: families.map(([family, labels]) => ({
    name: family,
    goals: words(labels).filter((label) => {
      if (seenLabels.has(label)) return false;
      seenLabels.add(label);
      return true;
    }).map((label) => makeGoal(label, name, family, icon)),
  })).filter((family) => family.goals.length),
}));
export const CAREER_GOALS: CareerGoal[] = CAREER_SECTORS.flatMap((sector) => sector.families.flatMap((family) => family.goals));

/** Resolves stable ids, canonical labels, and legacy labels case-insensitively. */
export function findCareerGoal(value: string | null | undefined): CareerGoal | undefined {
  const query = value?.trim().toLocaleLowerCase();
  if (!query) return undefined;
  return CAREER_GOALS.find((goal) => [goal.id, goal.label, ...goal.aliases].some((term) => term.toLocaleLowerCase() === query));
}

/** Search labels, aliases, family/sector context, and enrichment terms for UI or prompts. */
export function searchCareerGoals(query: string, limit?: number): CareerGoal[] {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = !terms.length ? CAREER_GOALS : CAREER_GOALS
    .map((goal, index) => {
      const label = goal.label.toLocaleLowerCase();
      const aliases = goal.aliases.map((alias) => alias.toLocaleLowerCase());
      const haystack = goal.searchTerms.join(" ").toLocaleLowerCase();
      if (!terms.every((term) => haystack.includes(term))) return null;
      const phrase = terms.join(" ");
      const score =
        (label === phrase ? 100 : 0) +
        (label.startsWith(phrase) ? 50 : 0) +
        (label.includes(phrase) ? 25 : 0) +
        (aliases.some((alias) => alias === phrase) ? 80 : 0) +
        (aliases.some((alias) => alias.includes(phrase)) ? 20 : 0);
      return { goal, index, score };
    })
    .filter((item): item is { goal: CareerGoal; index: number; score: number } => item !== null)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ goal }) => goal);
  return limit === undefined ? matches : matches.slice(0, Math.max(0, limit));
}

export function getCareerSector(goalOrId: CareerGoal | string): CareerSector | undefined {
  const id = typeof goalOrId === "string" ? findCareerGoal(goalOrId)?.id : goalOrId.id;
  return CAREER_SECTORS.find((sector) => sector.families.some((family) => family.goals.some((goal) => goal.id === id)));
}

export interface CareerSelectionContext {
  taxonomy_version: string;
  selected_goals: Array<
    | { selected: string; custom: true }
    | {
        selected: string;
        stable_id: string;
        sector: string;
        family: string;
        canonical_goal: string;
        relevant_courses: string[];
        core_skills: string[];
        technologies_tools: string[];
        certifications: string[];
        role_progression: { entry: string[]; mid: string[]; senior: string[] };
        related_careers: string[];
        alternative_paths: string[];
        project_ideas: string[];
        internship_areas: string[];
        higher_studies: string[];
        entrepreneurship: string[];
      }
  >;
  shared_foundation_skills: string[];
  shared_tools: string[];
}

/** Builds a compact, deterministic payload for AI roadmap generation. */
export function buildCareerSelectionContext(values: unknown[]): CareerSelectionContext {
  const selected = values
    .slice(0, 3)
    .map((value) => typeof value === "string" ? value.trim().slice(0, 160) : "")
    .filter(Boolean);
  const resolved: CareerSelectionContext["selected_goals"] = selected.map((selectedValue) => {
    const goal = findCareerGoal(selectedValue);
    if (!goal || goal.label === "Other") return { selected: selectedValue, custom: true as const };
    const sector = getCareerSector(goal);
    const family = sector?.families.find((item) => item.goals.some((candidate) => candidate.id === goal.id));
    return {
      selected: selectedValue,
      stable_id: goal.id,
      sector: sector?.name || "",
      family: family?.name || "",
      canonical_goal: goal.label,
      relevant_courses: goal.relatedCourses.slice(0, 4),
      core_skills: goal.coreSkills.slice(0, 4),
      technologies_tools: goal.technologies.slice(0, 4),
      certifications: goal.certifications.slice(0, 3),
      role_progression: {
        entry: goal.entryLevelRoles.slice(0, 2),
        mid: goal.midLevelRoles.slice(0, 2),
        senior: goal.seniorRoles.slice(0, 2),
      },
      related_careers: goal.relatedCareers.slice(0, 3),
      alternative_paths: goal.alternativePaths.slice(0, 2),
      project_ideas: goal.projectIdeas.slice(0, 2),
      internship_areas: goal.internshipAreas.slice(0, 2),
      higher_studies: goal.higherStudyOptions.slice(0, 2),
      entrepreneurship: goal.entrepreneurshipOpportunities.slice(0, 2),
    };
  });
  type CanonicalSelection = Extract<CareerSelectionContext["selected_goals"][number], { stable_id: string }>;
  const canonical = resolved.filter((item): item is CanonicalSelection => "stable_id" in item);
  const intersection = (field: "core_skills" | "technologies_tools") => {
    const first = canonical[0];
    if (!first) return [];
    if (canonical.length < 2) return first[field];
    const remaining = canonical.slice(1).map((item) => new Set(item[field].map((value) => value.toLocaleLowerCase())));
    return first[field].filter((value) => remaining.every((set) => set.has(value.toLocaleLowerCase())));
  };
  return {
    taxonomy_version: CAREER_TAXONOMY_VERSION,
    selected_goals: resolved,
    shared_foundation_skills: intersection("core_skills"),
    shared_tools: intersection("technologies_tools"),
  };
}

// Backward-compatible selection exports, derived from canonical data.
export const ASPIRATION_GROUPS: AspirationGroup[] = CAREER_SECTORS.map((sector) => ({
  group: sector.name,
  items: sector.families.flatMap((family) => family.goals.map(({ label, icon }) => ({ label, icon }))),
}));
export const ASPIRATIONS: Aspiration[] = ASPIRATION_GROUPS.flatMap((group) => group.items);
