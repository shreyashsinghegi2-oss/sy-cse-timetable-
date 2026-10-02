export interface EventDetails {
  date: string;
  time: string;
  venue: string;
}

export const EVENT_DETAILS: Record<string, EventDetails> = {
  "Robo Soccer":                       { date: "30/03/2026", time: "10 AM onwards",   venue: "ULC 5 entrance" },
  "Line Follower Challenge":            { date: "31/03/2026", time: "10 AM onwards",   venue: "ULC 5 entrance" },
  "RC Racing":                         { date: "30/03/2026", time: "10 AM onwards",   venue: "Oval Ground" },
  "Tower Titans (Solo)":               { date: "30/03/2026", time: "10 AM onwards",   venue: "ULC 5-102" },
  "Tower Titans (Group)":              { date: "30/03/2026", time: "10 AM onwards",   venue: "ULC 5-102" },
  "Hackathon":                         { date: "01/04/2026", time: "9 AM onwards",    venue: "ULC 6 104-105" },
  "Project Competition":               { date: "27/03/2026", time: "10 AM onwards",   venue: "ULC 6 101–107" },
  "C Coding Champion":                 { date: "31/03/2026", time: "11 AM onwards",   venue: "ULC 6 007–010" },
  "Arduino Workshop":                  { date: "27–28/03/2026", time: "10:30 AM onwards", venue: "ULC 6-108" },
  "Workshop on 3D Printing":           { date: "27–28/03/2026", time: "10 AM onwards",   venue: "ULC 6-006" },
  "BioTech Next":                      { date: "30–31/03/2026", time: "10 AM – 5 PM",    venue: "ULC 1 Bio Lab" },
  "IoT Robotics & Drones":             { date: "27–28/03/2026", time: "10 AM onwards",   venue: "ULC 6" },
  "Ethical Hacking & CTF":             { date: "27–28/03/2026", time: "10 AM onwards",   venue: "ULC 6 007–010" },
  "Apti Keeda":                        { date: "03/04/2026",   time: "9:30 AM onwards",  venue: "ULC 6 multiple rooms" },
  "Ingenium":                          { date: "31/03/2026",   time: "10 AM onwards",    venue: "Computer Lab, 2nd floor ULC 1" },
  "The Boss – Escape the Board Room":  { date: "30/03/2026",   time: "9 AM onwards",     venue: "ULC 6 001–003, 101–103" },
  "Quest Tank":                        { date: "31/03/2026",   time: "10 AM – 1 PM",     venue: "ULC 6 109–110" },
  "Gaming Event (Solo)":               { date: "01/04/2026",   time: "10:30 AM",         venue: "ULC 6 004-005" },
  "Gaming Event (Group)":              { date: "01/04/2026",   time: "10:30 AM",         venue: "ULC 6 004-005" },
};

export interface EventInsights {
  about: string;
  fee?: string;
  prize?: { label: string; amount: string }[];
  teamSize?: string;
  rounds?: string[];
  highlights?: string[];
  badge?: "High Prize" | "Popular" | "Workshop";
}

export const EVENT_INSIGHTS: Record<string, EventInsights> = {
  "Robo Soccer": {
    about: "HashTech Robotics Championship — team vs team robot football focusing on coordination and strategy.",
    fee: "₹1,000 per team",
    prize: [{ label: "1st Place", amount: "₹10,000" }, { label: "Runner-up", amount: "₹7,000" }],
    teamSize: "2–5 members",
    rounds: ["Group stage matches", "Knockout rounds", "Grand Finals"],
    highlights: ["Focus on coordination & strategy", "Judged on control and team play"],
    badge: "High Prize",
  },
  "Line Follower Challenge": {
    about: "Your robot must follow a track with precision and speed. Fastest and most accurate robot wins.",
    fee: "₹500 per team",
    prize: [{ label: "1st Place", amount: "₹15,000" }],
    teamSize: "3–5 members",
    rounds: ["Elimination bouts", "Semi-finals", "Grand Finals"],
    highlights: ["Line-following robot challenge", "Judged on speed & accuracy"],
    badge: "High Prize",
  },
  "RC Racing": {
    about: "High-speed remote-controlled car racing on an obstacle circuit. Fastest and most controlled team wins.",
    fee: "₹1,000 per team",
    prize: [{ label: "1st Place", amount: "₹10,000" }, { label: "Runner-up", amount: "₹7,000" }],
    teamSize: "2–5 members",
    rounds: ["Qualifying laps", "Knockout heats", "Grand Final"],
    highlights: ["Speed + control judged", "Obstacle track circuit"],
    badge: "High Prize",
  },
  "Tower Titans (Solo)": {
    about: "Build the tallest stable structural tower using limited materials. Solo engineering creativity test.",
    fee: "₹50 per participant",
    prize: [{ label: "Winner", amount: "₹5,000" }, { label: "Runner-up", amount: "₹3,000" }],
    teamSize: "Individual (max 5 participants per event)",
    rounds: ["Material distribution", "Timed build phase", "Height & stability judged"],
    highlights: ["Engineering creativity tested", "Limited materials provided"],
    badge: "High Prize",
  },
  "Tower Titans (Group)": {
    about: "Build the tallest stable structural tower using limited materials. Team engineering challenge.",
    fee: "₹200 per team",
    prize: [{ label: "Winner", amount: "₹5,000" }, { label: "Runner-up", amount: "₹3,000" }],
    teamSize: "2–5 members",
    rounds: ["Material distribution", "Timed build phase", "Height & stability judged"],
    highlights: ["Engineering creativity tested", "Limited materials provided"],
    badge: "High Prize",
  },
  "Hackathon": {
    about: "Team-based problem-solving event where participants build real-world solutions in a single day.",
    fee: "₹200 per team",
    prize: [{ label: "Total Prize Pool", amount: "₹22,000" }],
    teamSize: "2–4 members",
    rounds: ["Problem statement reveal (9 AM)", "Build phase (9:30 AM – 4:30 PM)", "Presentations & judging (4:30–5:30 PM)"],
    highlights: ["Focus on innovation & prototyping", "Real-world problem statements", "Expert panel judging"],
    badge: "High Prize",
  },
  "Project Competition": {
    about: "Showcase your best technical project to expert judges. Judged on innovation and real-world impact.",
    fee: "₹400 per team",
    prize: [{ label: "1st Place", amount: "₹10,000" }, { label: "2nd Place", amount: "₹5,000" }, { label: "3rd Place", amount: "₹3,000" }],
    teamSize: "2–4 members",
    rounds: ["Project presentation (5 min)", "Q&A with judges", "Winners announced"],
    highlights: ["Real-world impact focused", "Expert industry judges", "Certificate for all"],
    badge: "High Prize",
  },
  "C Coding Champion": {
    about: "Competitive C programming challenge testing speed and problem-solving ability.",
    fee: "₹50 per participant",
    teamSize: "Individual",
    rounds: ["Round 1 – Basics & speed coding", "Round 2 – Advanced problems", "Finals – Speed + accuracy"],
    highlights: ["Placement-prep aligned questions", "Fast-paced competitive format"],
  },
  "Arduino Workshop": {
    about: "Hands-on microcontroller programming and prototyping using Arduino boards over 2 days.",
    fee: "₹1,000 per participant",
    teamSize: "Individual",
    rounds: ["Day 1 – Basics, circuits & code", "Day 2 – Mini-project build"],
    highlights: ["Kits provided", "Certificate for all participants", "2-day intensive"],
    badge: "Workshop",
  },
  "Workshop on 3D Printing": {
    about: "2-day hands-on additive manufacturing workshop covering 3D modeling, slicing, and live printing.",
    fee: "₹500 per participant",
    teamSize: "Individual",
    rounds: ["Day 1 – 3D modeling & slicing tools", "Day 2 – Live printing session"],
    highlights: ["Design-to-print experience", "Certificate for all", "Equipment provided"],
    badge: "Workshop",
  },
  "BioTech Next": {
    about: "Advanced biotechnology workshop with lab exposure and hands-on experiments over 2 days.",
    fee: "₹500 per participant",
    teamSize: "Individual",
    rounds: ["Day 1 – Theory + lab techniques", "Day 2 – Experiments & analysis"],
    highlights: ["Lab access included", "Certificate for all", "Led by faculty experts"],
    badge: "Workshop",
  },
  "IoT Robotics & Drones": {
    about: "Hands-on learning in robotics, IoT systems, and drone technology across 2 days.",
    fee: "₹500 per participant",
    teamSize: "Individual",
    rounds: ["Day 1 – IoT concepts, traffic systems, smart city models", "Day 2 – Bluetooth/WiFi robots + drone demo"],
    highlights: ["Kits + drones provided", "Certificate for all", "No prior experience needed"],
    badge: "Workshop",
  },
  "Ethical Hacking & CTF": {
    about: "Cybersecurity workshop with hands-on ethical hacking techniques and a live Capture The Flag challenge.",
    fee: "₹500 per participant",
    teamSize: "Individual",
    rounds: ["Day 1 – Networking fundamentals, scanning & reconnaissance", "Day 2 – Exploitation techniques + Live CTF"],
    highlights: ["Must attend both days", "Only authorized tools allowed", "Certificate for all"],
    badge: "Workshop",
  },
  "Apti Keeda": {
    about: "Aptitude + logical reasoning competition aligned with placement preparation. Fast-paced online format.",
    fee: "₹100 per participant",
    prize: [{ label: "1st Place", amount: "₹2,500" }, { label: "2nd Place", amount: "₹1,500" }, { label: "3rd Place", amount: "₹1,000" }],
    teamSize: "Individual",
    rounds: ["Online competitive round", "Speed + accuracy judged"],
    highlights: ["E-certificate for all participants", "Placement-focused format", "Online competitive format"],
  },
  "Ingenium": {
    about: "High-energy engineering quiz combining logic, creativity, and teamwork across 3 intense rounds.",
    fee: "₹200 per team",
    prize: [{ label: "Total Prize Pool", amount: "₹6,000" }],
    teamSize: "4–6 members",
    rounds: ["Round 1 – MCQ Knowledge Round", "Round 2 – Problem-Solving Round", "Round 3 – Rapid-Fire Finale"],
    highlights: ["Cross-discipline questions", "High-energy competitive atmosphere", "Certificate for all"],
    badge: "High Prize",
  },
  "The Boss – Escape the Board Room": {
    about: "Corporate escape simulation combining puzzles, strategy, and a final pitch to a panel of judges.",
    fee: "₹300 per team",
    teamSize: "2–4 members",
    rounds: ["Phase 1 – Solve corporate puzzles", "Phase 2 – Navigate strategy lab", "Phase 3 – Final pitch to judges"],
    highlights: ["Certificate for all participants", "LinkedIn badge for winners", "Team strategy experience"],
  },
  "Quest Tank": {
    about: "Shark-Tank style idea pitching and innovation quest. Present your idea, defend it, win.",
    fee: "₹300 per team",
    teamSize: "2–5 members",
    rounds: ["Idea submission", "3-minute pitch round", "Q&A from expert panel"],
    highlights: ["Real investment panel simulation", "Certificate for all participants"],
  },
  "Gaming Event (Solo)": {
    about: "Solo esports tournament — choose your game and compete against the best.",
    fee: "₹500 per participant",
    teamSize: "Individual",
    rounds: ["Registration & seeding", "Group stage matches", "Knockout & Grand Finals"],
    highlights: ["Choose your game: BGMI (Battle Royale) or Valorant (5v5 Tactical Shooter)", "Prizes + certificates for top finishers"],
    badge: "Popular",
  },
  "Gaming Event (Group)": {
    about: "Team esports tournament — choose your game and compete with your squad.",
    fee: "₹300 per team",
    teamSize: "2–4 members",
    rounds: ["Registration & seeding", "Group stage matches", "Knockout & Grand Finals"],
    highlights: ["Choose your game: BGMI (Battle Royale) or Valorant (5v5 Tactical Shooter)", "Prizes + certificates for top finishers"],
    badge: "Popular",
  },
};

export interface HastechEvent {
  name: string;
  category: string;
  catId: string;
  type: "individual" | "group";
  price: number;
  minTeamSize?: number;
  maxTeamSize?: number;
  desc: string;
  closed?: boolean;
}

export const EVENTS_CONFIG: HastechEvent[] = [
  { name: "Robo Soccer",                       category: "Robotics & Engineering", catId: "robotics",  type: "group",      price: 1000, minTeamSize: 2, maxTeamSize: 5,  desc: "Autonomous robots battle it out on the football field."                    },
  { name: "Line Follower Challenge",             category: "Robotics & Engineering", catId: "robotics",  type: "group",      price:  500, minTeamSize: 3, maxTeamSize: 5,  desc: "Robot follows a track — precision and speed decide the winner."            },
  { name: "RC Racing",                          category: "Robotics & Engineering", catId: "robotics",  type: "group",      price: 1000, minTeamSize: 2, maxTeamSize: 5,  desc: "High-speed remote-controlled car racing circuit — team entry."             },
  { name: "Tower Titans (Solo)",                category: "Robotics & Engineering", catId: "robotics",  type: "individual", price:   50,                                  desc: "Build the tallest structural tower using limited materials — solo entry."  },
  { name: "Tower Titans (Group)",               category: "Robotics & Engineering", catId: "robotics",  type: "group",      price:  200, minTeamSize: 2, maxTeamSize: 5,  desc: "Build the tallest structural tower using limited materials — team entry."   },
  { name: "Hackathon",                          category: "Coding & Innovation",    catId: "coding",    type: "group",      price:  200, minTeamSize: 2, maxTeamSize: 4,  desc: "Single day innovation challenge solving real-world problems · 9:30 AM – 5:30 PM." },
  { name: "Project Competition",                category: "Coding & Innovation",    catId: "coding",    type: "group",      price:  400, minTeamSize: 2, maxTeamSize: 4,  desc: "Showcase your best technical project to expert judges."                    },
  { name: "C Coding Champion",                  category: "Coding & Innovation",    catId: "coding",    type: "individual", price:   50,                                  desc: "Competitive C programming challenge testing speed and problem-solving."    },
  { name: "Arduino Workshop",                   category: "Workshops",              catId: "workshops", type: "individual", price: 1000,                                  desc: "Hands-on microcontroller programming and prototyping."                     },
  { name: "Workshop on 3D Printing",            category: "Workshops",              catId: "workshops", type: "individual", price:  500,                                  desc: "Learn additive manufacturing from design to print."                        },
  { name: "BioTech Next",                       category: "Workshops",              catId: "workshops", type: "individual", price:  500,                                  desc: "Advanced techniques in modern biotechnology."                              },
  { name: "IoT Robotics & Drones",              category: "Workshops",              catId: "workshops", type: "individual", price:  500,                                  desc: "Build and program connected IoT-enabled robots and drones.",                closed: true },
  { name: "Ethical Hacking & CTF",              category: "Workshops",              catId: "workshops", type: "individual", price:  500,                                  desc: "Cybersecurity capture-the-flag challenge."                                 },
  { name: "Apti Keeda",                         category: "Strategy & Mind Games",  catId: "strategy",  type: "individual", price:  100,                                  desc: "Battle of aptitude — logic, reasoning, and quant."                        },
  { name: "Ingenium",                           category: "Strategy & Mind Games",  catId: "strategy",  type: "group",      price:  200, minTeamSize: 4, maxTeamSize: 6,  desc: "Engineering quiz and technical brain-teaser competition — team event."     },
  { name: "The Boss – Escape the Board Room",   category: "Strategy & Mind Games",  catId: "strategy",  type: "group",      price:  300, minTeamSize: 2, maxTeamSize: 4,  desc: "Strategic business simulation escape challenge — max 4 members."           },
  { name: "Quest Tank",                         category: "Strategy & Mind Games",  catId: "strategy",  type: "group",      price:  300, minTeamSize: 2, maxTeamSize: 5,  desc: "Shark-Tank style idea pitching and innovation quest."                      },
  { name: "Gaming Event (Solo)",                category: "Gaming Arena",           catId: "gaming",    type: "individual", price:  500,                                  desc: "Solo esports tournament — compete across multi-title gaming showdowns."    },
  { name: "Gaming Event (Group)",               category: "Gaming Arena",           catId: "gaming",    type: "group",      price:  300, minTeamSize: 2, maxTeamSize: 4,  desc: "Team esports tournament — multi-title gaming showdowns with your squad."   },
];

export const EVENTS_BY_NAME: Record<string, HastechEvent> =
  Object.fromEntries(EVENTS_CONFIG.map(e => [e.name, e]));

export function calcTotal(names: string[]): number {
  return names.reduce((sum, n) => sum + (EVENTS_BY_NAME[n]?.price ?? 0), 0);
}

export function hasGroupEvent(names: string[]): boolean {
  return names.some(n => EVENTS_BY_NAME[n]?.type === "group");
}

export function getGroupEvents(names: string[]): HastechEvent[] {
  return names.map(n => EVENTS_BY_NAME[n]).filter(e => e?.type === "group") as HastechEvent[];
}

export function toEventObjects(names: string[]) {
  return names.map(name => {
    const ev = EVENTS_BY_NAME[name];
    return { name, price: ev?.price ?? 0, type: ev?.type ?? "individual", category: ev?.category ?? "" };
  });
}
