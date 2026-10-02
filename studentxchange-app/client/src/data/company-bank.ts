export type CompanyTier = "FAANG" | "Tier 1" | "Tier 2";

export interface InterviewRound {
  name: string;
  description: string;
}

export interface CompanyProblemSet {
  topic: string;
  problems: { title: string; difficulty: "Easy" | "Medium" | "Hard"; url?: string }[];
}

export interface CompanyEntry {
  id: string;
  name: string;
  tier: CompanyTier;
  logoEmoji: string;
  hiringSeason: string;
  ctcRange: string;
  eligibility: { minCgpa: number; backlogs: string; branches: string[] };
  topicsTested: string[];
  interviewRounds: InterviewRound[];
  problemSets: CompanyProblemSet[];
  recommendedSkills: string[];
  applyUrl?: string;
}

export const COMPANY_BANK: CompanyEntry[] = [
  // ===== FAANG =====
  {
    id: "google", name: "Google", tier: "FAANG", logoEmoji: "🔵",
    hiringSeason: "Aug–Oct (campus) · Year-round (off-campus)",
    ctcRange: "₹40–55 LPA (SDE-1) · ₹18–25 LPA (Intern stipend)",
    eligibility: { minCgpa: 8.0, backlogs: "No active backlogs", branches: ["CSE", "IT", "ECE", "EEE"] },
    topicsTested: ["Data Structures", "Algorithms", "System Design", "OS", "DBMS", "Behavioural"],
    interviewRounds: [
      { name: "Online Assessment", description: "2 coding problems (Medium-Hard) on Codility/HackerEarth, 90 min." },
      { name: "Phone Screen", description: "1 coding problem live on Google Doc, 45 min." },
      { name: "Onsite × 4-5", description: "DSA, system design (entry-level lite), Googleyness/Leadership, 1 hour each." },
      { name: "Hiring Committee", description: "Packet review by senior engineers, no candidate involvement." },
    ],
    problemSets: [
      { topic: "Arrays & Strings", problems: [
        { title: "Two Sum", difficulty: "Easy", url: "https://leetcode.com/problems/two-sum" },
        { title: "Longest Substring Without Repeating Characters", difficulty: "Medium", url: "https://leetcode.com/problems/longest-substring-without-repeating-characters" },
        { title: "Trapping Rain Water", difficulty: "Hard", url: "https://leetcode.com/problems/trapping-rain-water" },
      ]},
      { topic: "Trees & Graphs", problems: [
        { title: "Binary Tree Maximum Path Sum", difficulty: "Hard", url: "https://leetcode.com/problems/binary-tree-maximum-path-sum" },
        { title: "Word Ladder", difficulty: "Hard", url: "https://leetcode.com/problems/word-ladder" },
      ]},
      { topic: "DP", problems: [
        { title: "Longest Increasing Subsequence", difficulty: "Medium", url: "https://leetcode.com/problems/longest-increasing-subsequence" },
        { title: "Edit Distance", difficulty: "Hard", url: "https://leetcode.com/problems/edit-distance" },
      ]},
    ],
    recommendedSkills: ["DSA", "System Design Basics", "OS", "DBMS"],
    applyUrl: "https://careers.google.com/students/",
  },
  {
    id: "meta", name: "Meta (Facebook)", tier: "FAANG", logoEmoji: "🔷",
    hiringSeason: "Sep–Nov", ctcRange: "₹45–60 LPA",
    eligibility: { minCgpa: 8.0, backlogs: "No backlogs", branches: ["CSE", "IT"] },
    topicsTested: ["DSA", "System Design", "Product Sense", "Behavioural"],
    interviewRounds: [
      { name: "Online Coding", description: "2 problems on CoderPad, 45 min." },
      { name: "Onsite × 4", description: "2 coding (Ninja round), 1 design, 1 behavioural (Jedi round)." },
    ],
    problemSets: [
      { topic: "Arrays/Strings", problems: [
        { title: "Subarray Sum Equals K", difficulty: "Medium", url: "https://leetcode.com/problems/subarray-sum-equals-k" },
        { title: "Minimum Window Substring", difficulty: "Hard", url: "https://leetcode.com/problems/minimum-window-substring" },
      ]},
      { topic: "Graph BFS/DFS", problems: [
        { title: "Number of Islands", difficulty: "Medium", url: "https://leetcode.com/problems/number-of-islands" },
        { title: "Clone Graph", difficulty: "Medium", url: "https://leetcode.com/problems/clone-graph" },
      ]},
    ],
    recommendedSkills: ["DSA", "System Design Basics"],
    applyUrl: "https://www.metacareers.com/students/",
  },
  {
    id: "amazon", name: "Amazon", tier: "FAANG", logoEmoji: "🟠",
    hiringSeason: "Aug–Dec", ctcRange: "₹28–48 LPA",
    eligibility: { minCgpa: 7.0, backlogs: "Max 1 active backlog", branches: ["CSE", "IT", "ECE"] },
    topicsTested: ["DSA", "OOPs", "OS", "DBMS", "Leadership Principles"],
    interviewRounds: [
      { name: "Online Assessment", description: "2 coding + Amazon-specific work-style + work-simulation, ~3 hours." },
      { name: "Tech Phone Screen", description: "1 DSA problem, 45 min." },
      { name: "Onsite Loop × 4-5", description: "Mix of coding, design, and Bar Raiser (LP-deep-dive)." },
    ],
    problemSets: [
      { topic: "Heap/Priority Queue", problems: [
        { title: "K Closest Points to Origin", difficulty: "Medium", url: "https://leetcode.com/problems/k-closest-points-to-origin" },
        { title: "Top K Frequent Elements", difficulty: "Medium", url: "https://leetcode.com/problems/top-k-frequent-elements" },
      ]},
      { topic: "Recursion/Backtracking", problems: [
        { title: "Word Search", difficulty: "Medium", url: "https://leetcode.com/problems/word-search" },
        { title: "N-Queens", difficulty: "Hard", url: "https://leetcode.com/problems/n-queens" },
      ]},
    ],
    recommendedSkills: ["DSA", "OOPs", "OS"],
    applyUrl: "https://amazon.jobs/en/teams/internships-for-students",
  },
  {
    id: "netflix", name: "Netflix", tier: "FAANG", logoEmoji: "🔴",
    hiringSeason: "Year-round (low-volume)", ctcRange: "₹50–70 LPA",
    eligibility: { minCgpa: 8.5, backlogs: "No backlogs", branches: ["CSE", "IT"] },
    topicsTested: ["DSA", "System Design", "Distributed Systems", "Culture deck fit"],
    interviewRounds: [
      { name: "Recruiter Screen", description: "30 min discussion." },
      { name: "Tech Screen", description: "1 problem, 1 hour." },
      { name: "Onsite × 5", description: "DSA, system design (heavy), behavioural × 2, hiring manager." },
    ],
    problemSets: [
      { topic: "System Design", problems: [
        { title: "Design Video Streaming Service", difficulty: "Hard" },
        { title: "Design Recommendation Engine", difficulty: "Hard" },
      ]},
      { topic: "Concurrency", problems: [
        { title: "Print in Order", difficulty: "Easy", url: "https://leetcode.com/problems/print-in-order" },
        { title: "Building H2O", difficulty: "Medium", url: "https://leetcode.com/problems/building-h2o" },
      ]},
    ],
    recommendedSkills: ["DSA", "System Design Basics", "OS"],
    applyUrl: "https://jobs.netflix.com/",
  },
  {
    id: "apple", name: "Apple", tier: "FAANG", logoEmoji: "⚪",
    hiringSeason: "Sep–Feb", ctcRange: "₹35–55 LPA",
    eligibility: { minCgpa: 8.0, backlogs: "No active backlogs", branches: ["CSE", "IT", "ECE", "EEE"] },
    topicsTested: ["DSA", "OS", "OOPs", "Domain-specific (HW/iOS/ML)"],
    interviewRounds: [
      { name: "Recruiter Screen", description: "Background + interest match, 30 min." },
      { name: "Tech × 2", description: "1 DSA, 1 system/domain, 45 min each." },
      { name: "Team Match Onsite × 4", description: "Tech + cultural with multiple team members." },
    ],
    problemSets: [
      { topic: "DSA", problems: [
        { title: "LRU Cache", difficulty: "Medium", url: "https://leetcode.com/problems/lru-cache" },
        { title: "Median of Two Sorted Arrays", difficulty: "Hard", url: "https://leetcode.com/problems/median-of-two-sorted-arrays" },
      ]},
    ],
    recommendedSkills: ["DSA", "OS", "OOPs"],
    applyUrl: "https://www.apple.com/careers/in/students.html",
  },
  {
    id: "microsoft", name: "Microsoft", tier: "FAANG", logoEmoji: "🟦",
    hiringSeason: "Jul–Oct", ctcRange: "₹35–55 LPA",
    eligibility: { minCgpa: 7.5, backlogs: "Max 1", branches: ["CSE", "IT", "ECE"] },
    topicsTested: ["DSA", "OOPs", "OS", "DBMS", "Microsoft Aptitude"],
    interviewRounds: [
      { name: "Online Round", description: "3 coding problems on Mettl/CoCubes, 90 min." },
      { name: "Group Fly", description: "1 design + 1 case discussion." },
      { name: "Tech Interviews × 2-3", description: "DSA + OOP/OS deep-dive." },
      { name: "HR + AA", description: "Leadership + manager round." },
    ],
    problemSets: [
      { topic: "Linked Lists", problems: [
        { title: "Reverse Linked List", difficulty: "Easy", url: "https://leetcode.com/problems/reverse-linked-list" },
        { title: "Merge K Sorted Lists", difficulty: "Hard", url: "https://leetcode.com/problems/merge-k-sorted-lists" },
      ]},
      { topic: "Trees", problems: [
        { title: "Lowest Common Ancestor of a BT", difficulty: "Medium", url: "https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree" },
      ]},
    ],
    recommendedSkills: ["DSA", "OOPs", "DBMS"],
    applyUrl: "https://careers.microsoft.com/students/",
  },

  // ===== Tier 1 =====
  {
    id: "uber", name: "Uber", tier: "Tier 1", logoEmoji: "⚫",
    hiringSeason: "Sep–Nov", ctcRange: "₹25–40 LPA",
    eligibility: { minCgpa: 7.5, backlogs: "Max 1", branches: ["CSE", "IT"] },
    topicsTested: ["DSA", "Design", "DBMS"],
    interviewRounds: [
      { name: "OA", description: "2 coding problems, 90 min." },
      { name: "Phone Tech", description: "1 problem, 1 hour." },
      { name: "Onsite × 4", description: "2 coding, 1 design, 1 behavioural." },
    ],
    problemSets: [
      { topic: "Geo/Map problems", problems: [
        { title: "Design Hit Counter", difficulty: "Medium", url: "https://leetcode.com/problems/design-hit-counter" },
        { title: "Number of Connected Components", difficulty: "Medium", url: "https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph" },
      ]},
    ],
    recommendedSkills: ["DSA", "DBMS"],
    applyUrl: "https://www.uber.com/global/en/careers/university/",
  },
  {
    id: "salesforce", name: "Salesforce", tier: "Tier 1", logoEmoji: "☁️",
    hiringSeason: "Aug–Oct", ctcRange: "₹25–35 LPA",
    eligibility: { minCgpa: 7.0, backlogs: "Max 1", branches: ["CSE", "IT", "ECE"] },
    topicsTested: ["DSA", "OOPs", "DBMS", "Apex/Salesforce ecosystem (bonus)"],
    interviewRounds: [
      { name: "OA", description: "2 problems + MCQs." },
      { name: "Tech × 2", description: "DSA + OOPs/SQL." },
      { name: "Manager + HR", description: "Cultural fit, problem-solving." },
    ],
    problemSets: [
      { topic: "DSA", problems: [
        { title: "Group Anagrams", difficulty: "Medium", url: "https://leetcode.com/problems/group-anagrams" },
        { title: "Validate BST", difficulty: "Medium", url: "https://leetcode.com/problems/validate-binary-search-tree" },
      ]},
    ],
    recommendedSkills: ["DSA", "OOPs", "SQL"],
    applyUrl: "https://www.salesforce.com/company/careers/university-recruiting/",
  },
  {
    id: "adobe", name: "Adobe", tier: "Tier 1", logoEmoji: "🟥",
    hiringSeason: "Aug–Oct", ctcRange: "₹22–35 LPA",
    eligibility: { minCgpa: 7.0, backlogs: "No active backlogs", branches: ["CSE", "IT", "ECE"] },
    topicsTested: ["DSA", "OOPs", "OS", "DBMS"],
    interviewRounds: [
      { name: "Aptitude + Coding", description: "MCQs + 2 coding, 2 hours." },
      { name: "Tech × 2-3", description: "DSA + project/system design." },
      { name: "Manager + HR", description: "Final discussion." },
    ],
    problemSets: [
      { topic: "DSA", problems: [
        { title: "Merge Intervals", difficulty: "Medium", url: "https://leetcode.com/problems/merge-intervals" },
        { title: "Search in Rotated Sorted Array", difficulty: "Medium", url: "https://leetcode.com/problems/search-in-rotated-sorted-array" },
      ]},
    ],
    recommendedSkills: ["DSA", "OOPs"],
    applyUrl: "https://adobe.com/careers/university.html",
  },
  {
    id: "linkedin", name: "LinkedIn", tier: "Tier 1", logoEmoji: "🟦",
    hiringSeason: "Aug–Nov", ctcRange: "₹30–45 LPA",
    eligibility: { minCgpa: 8.0, backlogs: "No backlogs", branches: ["CSE", "IT"] },
    topicsTested: ["DSA", "System Design", "DBMS"],
    interviewRounds: [
      { name: "OA", description: "2 problems, 90 min." },
      { name: "Onsite × 4", description: "2 coding, 1 design, 1 host (cultural+role-fit)." },
    ],
    problemSets: [
      { topic: "DSA", problems: [
        { title: "Maximum Subarray", difficulty: "Easy", url: "https://leetcode.com/problems/maximum-subarray" },
        { title: "Insert Delete GetRandom O(1)", difficulty: "Medium", url: "https://leetcode.com/problems/insert-delete-getrandom-o1" },
      ]},
    ],
    recommendedSkills: ["DSA", "System Design Basics"],
    applyUrl: "https://careers.linkedin.com/students",
  },
  {
    id: "atlassian", name: "Atlassian", tier: "Tier 1", logoEmoji: "🟦",
    hiringSeason: "Sep–Nov", ctcRange: "₹25–38 LPA",
    eligibility: { minCgpa: 7.5, backlogs: "Max 1", branches: ["CSE", "IT"] },
    topicsTested: ["DSA", "OOPs", "Behavioural"],
    interviewRounds: [
      { name: "OA", description: "Coding + values quiz." },
      { name: "Tech × 2", description: "DSA + project deep-dive." },
      { name: "Hiring Manager + Values", description: "Final 2 rounds." },
    ],
    problemSets: [
      { topic: "DSA", problems: [
        { title: "Spiral Matrix", difficulty: "Medium", url: "https://leetcode.com/problems/spiral-matrix" },
      ]},
    ],
    recommendedSkills: ["DSA", "OOPs"],
    applyUrl: "https://www.atlassian.com/company/careers/students",
  },
  {
    id: "flipkart", name: "Flipkart", tier: "Tier 1", logoEmoji: "🟨",
    hiringSeason: "Aug–Oct", ctcRange: "₹22–35 LPA",
    eligibility: { minCgpa: 7.5, backlogs: "Max 2", branches: ["CSE", "IT", "ECE"] },
    topicsTested: ["DSA", "OOPs", "DBMS", "OS"],
    interviewRounds: [
      { name: "OA", description: "3 coding + MCQs, ~2 hours." },
      { name: "Machine Coding", description: "Build a small system in 90 min." },
      { name: "Tech × 2", description: "Design + DSA." },
      { name: "Hiring Manager", description: "Final fit + project discussion." },
    ],
    problemSets: [
      { topic: "Machine Coding", problems: [
        { title: "Design Snake & Ladder", difficulty: "Medium" },
        { title: "Design Parking Lot", difficulty: "Medium" },
      ]},
    ],
    recommendedSkills: ["DSA", "OOPs", "DBMS"],
    applyUrl: "https://www.flipkartcareers.com/",
  },
  {
    id: "swiggy", name: "Swiggy", tier: "Tier 1", logoEmoji: "🟧",
    hiringSeason: "Aug–Oct", ctcRange: "₹22–32 LPA",
    eligibility: { minCgpa: 7.0, backlogs: "Max 1", branches: ["CSE", "IT"] },
    topicsTested: ["DSA", "OOPs", "Low-Level Design"],
    interviewRounds: [
      { name: "OA", description: "2 coding, 75 min." },
      { name: "Machine Coding", description: "LLD round, 90 min." },
      { name: "Tech + HM", description: "Final discussion + DSA." },
    ],
    problemSets: [
      { topic: "LLD", problems: [
        { title: "Design Notification Service", difficulty: "Medium" },
        { title: "Design Splitwise", difficulty: "Medium" },
      ]},
    ],
    recommendedSkills: ["DSA", "OOPs"],
    applyUrl: "https://careers.swiggy.com/",
  },

  // ===== Tier 2 =====
  {
    id: "tcs-digital", name: "TCS Digital", tier: "Tier 2", logoEmoji: "🟪",
    hiringSeason: "Aug–Mar", ctcRange: "₹7–11.5 LPA",
    eligibility: { minCgpa: 6.0, backlogs: "Max 1", branches: ["All Engineering"] },
    topicsTested: ["Aptitude", "DSA basics", "DBMS", "OOPs"],
    interviewRounds: [
      { name: "TCS NQT", description: "Aptitude + 2 coding, ~3 hours." },
      { name: "Tech Interview", description: "DSA + project + DBMS." },
      { name: "MR + HR", description: "Final 2 rounds." },
    ],
    problemSets: [
      { topic: "Aptitude", problems: [
        { title: "Numerical reasoning sets", difficulty: "Easy" },
        { title: "Logical reasoning sets", difficulty: "Easy" },
      ]},
    ],
    recommendedSkills: ["Aptitude", "DSA", "DBMS"],
    applyUrl: "https://www.tcs.com/careers/",
  },
  {
    id: "infosys", name: "Infosys", tier: "Tier 2", logoEmoji: "🟦",
    hiringSeason: "Sep–Apr", ctcRange: "₹3.6–8 LPA",
    eligibility: { minCgpa: 6.0, backlogs: "Max 1", branches: ["All"] },
    topicsTested: ["Aptitude", "Verbal", "Coding basics"],
    interviewRounds: [
      { name: "InfyTQ / OA", description: "MCQ + 1-2 coding." },
      { name: "Tech + HR", description: "Single combined round." },
    ],
    problemSets: [
      { topic: "Coding", problems: [
        { title: "Reverse a String", difficulty: "Easy" },
        { title: "Fibonacci sequence", difficulty: "Easy" },
      ]},
    ],
    recommendedSkills: ["Aptitude", "DSA", "OOPs"],
    applyUrl: "https://www.infosys.com/careers/",
  },
  {
    id: "wipro", name: "Wipro Elite NLTH", tier: "Tier 2", logoEmoji: "🟪",
    hiringSeason: "Sep–Mar", ctcRange: "₹3.5–6.5 LPA",
    eligibility: { minCgpa: 6.0, backlogs: "Max 1", branches: ["All"] },
    topicsTested: ["Aptitude", "Verbal", "Coding"],
    interviewRounds: [
      { name: "Online Test", description: "Aptitude + 2 coding." },
      { name: "Tech + HR", description: "Combined." },
    ],
    problemSets: [
      { topic: "Coding", problems: [
        { title: "Palindrome Check", difficulty: "Easy" },
        { title: "Sum of Digits", difficulty: "Easy" },
      ]},
    ],
    recommendedSkills: ["Aptitude", "DSA"],
    applyUrl: "https://careers.wipro.com/careers-home/",
  },
  {
    id: "capgemini", name: "Capgemini", tier: "Tier 2", logoEmoji: "🟦",
    hiringSeason: "Aug–Feb", ctcRange: "₹4–7.5 LPA",
    eligibility: { minCgpa: 6.0, backlogs: "Max 1", branches: ["All"] },
    topicsTested: ["Pseudo-code MCQs", "English", "Aptitude"],
    interviewRounds: [
      { name: "Cognitive Test", description: "Aptitude + game-based assessment." },
      { name: "Tech + HR", description: "Combined." },
    ],
    problemSets: [
      { topic: "Pseudo-code", problems: [
        { title: "Pseudo-code MCQ practice", difficulty: "Easy" },
      ]},
    ],
    recommendedSkills: ["Aptitude", "OOPs"],
    applyUrl: "https://www.capgemini.com/careers/",
  },
  {
    id: "cognizant", name: "Cognizant GenC", tier: "Tier 2", logoEmoji: "🟦",
    hiringSeason: "Aug–Mar", ctcRange: "₹4–7 LPA",
    eligibility: { minCgpa: 6.0, backlogs: "Max 1", branches: ["All"] },
    topicsTested: ["Aptitude", "Verbal", "Coding"],
    interviewRounds: [
      { name: "OA", description: "MCQ + 2 coding." },
      { name: "Tech + HR", description: "Combined round." },
    ],
    problemSets: [
      { topic: "Coding", problems: [
        { title: "Array operations", difficulty: "Easy" },
      ]},
    ],
    recommendedSkills: ["Aptitude", "DSA"],
    applyUrl: "https://careers.cognizant.com/global/en",
  },
  {
    id: "accenture", name: "Accenture", tier: "Tier 2", logoEmoji: "🟪",
    hiringSeason: "Aug–Feb", ctcRange: "₹4.5–6.5 LPA",
    eligibility: { minCgpa: 6.0, backlogs: "Max 1", branches: ["All"] },
    topicsTested: ["Aptitude", "Communication", "Coding"],
    interviewRounds: [
      { name: "Cognitive + Tech Test", description: "MCQ + coding." },
      { name: "Communication Assessment", description: "Spoken English check." },
      { name: "Tech + HR", description: "Combined." },
    ],
    problemSets: [
      { topic: "Coding", problems: [
        { title: "Pattern problems", difficulty: "Easy" },
      ]},
    ],
    recommendedSkills: ["Aptitude"],
    applyUrl: "https://www.accenture.com/in-en/careers",
  },
];
