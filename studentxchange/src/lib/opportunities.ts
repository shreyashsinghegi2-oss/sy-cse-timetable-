export type OppType = "Competition" | "Hackathon" | "Internship" | "Job" | "Freelance" | "Campus drive";
export type Mode = "Online" | "Offline" | "Hybrid";

export type Opportunity = {
  id: string; title: string; org: string; type: OppType; mode: Mode; location: string;
  fee: "Free" | "Paid"; prize?: string; stipend?: string; daysLeft: number; registrations: number;
  tags: string[]; eligibility: string;
};

/** Sample data for the UI pattern; replace with the existing opportunities API. */
export const opportunities: Opportunity[] = [
  { id: "1", title: "Smart Campus Hackathon 2026", org: "ADYPU Innovation Centre", type: "Hackathon", mode: "Offline", location: "Pune", fee: "Free", prize: "₹1,00,000", daysLeft: 6, registrations: 842, tags: ["AI", "Web", "Teams of 4"], eligibility: "All years" },
  { id: "2", title: "Frontend Developer Intern", org: "Veloces Labs", type: "Internship", mode: "Hybrid", location: "Pune", fee: "Free", stipend: "₹15,000 / mo", daysLeft: 12, registrations: 213, tags: ["React", "TypeScript"], eligibility: "2nd–4th year" },
  { id: "3", title: "National Coding Championship", org: "StudentXchange Arena", type: "Competition", mode: "Online", location: "Remote", fee: "Free", prize: "₹50,000", daysLeft: 3, registrations: 2310, tags: ["DSA", "Individual"], eligibility: "All years" },
  { id: "4", title: "Backend Developer (Freelance)", org: "Orbit Studio", type: "Freelance", mode: "Online", location: "Remote", fee: "Free", stipend: "₹30,000 fixed", daysLeft: 9, registrations: 64, tags: ["Node.js", "PostgreSQL"], eligibility: "Any year" },
  { id: "5", title: "Campus Drive — Software Engineer", org: "Infosys", type: "Campus drive", mode: "Offline", location: "Pune", fee: "Free", daysLeft: 15, registrations: 1180, tags: ["Final year", "CTC 4.5 LPA"], eligibility: "Final year" },
  { id: "6", title: "Product Design Sprint", org: "Sri Balaji University", type: "Competition", mode: "Hybrid", location: "Pune", fee: "Paid", prize: "₹25,000", daysLeft: 20, registrations: 390, tags: ["UI/UX", "Teams of 3"], eligibility: "All years" },
  { id: "7", title: "Data Analyst Intern", org: "Northwind Analytics", type: "Internship", mode: "Online", location: "Remote", fee: "Free", stipend: "₹12,000 / mo", daysLeft: 1, registrations: 508, tags: ["SQL", "Power BI"], eligibility: "3rd–4th year" },
  { id: "8", title: "Associate Software Engineer", org: "Vedam Partners", type: "Job", mode: "Offline", location: "Mumbai", fee: "Free", stipend: "₹6 LPA", daysLeft: 25, registrations: 97, tags: ["Java", "Full-time"], eligibility: "Graduates" },
];

export const types: ("All" | OppType)[] = ["All", "Competition", "Hackathon", "Internship", "Job", "Freelance", "Campus drive"];
