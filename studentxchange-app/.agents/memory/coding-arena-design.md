---
name: Coding Arena design constraints
description: Durable rules for the Coding Arena (Judge0 judging, free-tier limits, readiness coupling)
---

- Free-tier daily submission limit must be enforced by *reserving* a slot in a Firestore transaction BEFORE judging (and refunding on judge error). A plain read-check-then-write lets concurrent submits bypass the limit.
  **Why:** architect review flagged the race; judging takes seconds, plenty of overlap window.
  **How to apply:** any new quota (e.g. AI coach calls) on coding_user_progress must use the same reserve-in-txn pattern.
- All coding_user_progress read-modify-writes (solved lists, streak, bySkillTag, codingReadinessScore) happen inside one transaction in /submit; never add a separate non-txn writer for these fields.
- Hidden test cases never leave the server — detail endpoint returns public tests only; submit response strips input/expected for hidden cases.
- Placement Readiness weights after coding was added: skills 30, coe 20, portal_activity 20 (raw caps 6/6/3 + inst 5), profile 10, cgpa 10, coding 10. Changing one weight requires rebalancing gap thresholds too.
- Judge0 lang ids: python 71, js 63, java 62, cpp 54, sqlite 82; base64_encoded=true&wait=true on judge0-ce.p.rapidapi.com. SQL problems prepend testCase.input (setup SQL) to the user query.
