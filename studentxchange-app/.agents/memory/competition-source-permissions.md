---
name: Competition source permissions
description: External access decisions and uncertainties for StudentLancing's real competition feed.
---

Use only real, independently validated competition details; never turn a public page into permission to bypass access controls or present generated records as verified. Devfolio was selected as the first live source after reviewing its public robots.txt and https://devfolio.co/terms-of-use on 2026-09-30; neither identified an explicit prohibition on automated access to public event listings. Collect only concise factual metadata, retain source/application links, and recheck the terms before materially expanding reuse. This review is not an explicit redistribution license.

Hackalendar's https://hackalendar.com/api explicitly offers a public keyless JSON feed and asks consumers to link directly to organisers' registration pages. Its published event start dates are not substitutes for missing registration deadlines. Codeforces' https://codeforces.com/apiHelp documents anonymous `contest.list`; its `startTimeSeconds` is a contest start, **not** a registration deadline, so display it as “Starts” and never claim registration closes then.

Brabble's current https://brabble.ai/docs and https://brabble.ai/developers require a free developer key, despite older claims of keyless access. Preserve original organiser links and attribution; its `kind=contest` deadline is a start time, while `kind=competition` deadline is application close. Kaggle's official list endpoint returned HTTP 401 without an account API token. Do not scrape the website as a workaround or claim either API works without credentials.

**Why:** Devpost's official terms at https://info.devpost.com/legal/terms-of-service prohibit manual or automated scraping/crawling. HackerEarth returned an anti-bot HTTP 403 even for robots.txt; bypassing it is not acceptable. Unstop's public robots.txt lists competition paths, but its https://unstop.com/legal/terms-of-use did not establish permission for republishing extracted listings, and a public detail probe returned only a generic shell.

**How to apply:** Keep Devpost, HackerEarth, and Unstop disabled unless an approved feed, partnership, or explicit permission supplies a lawful and technically verifiable route. Integrate Brabble or Kaggle only after securely configuring a server-side key/token and verifying live responses. Reassess source permissions when they change; never infer access rights from robots.txt alone. Preserve an honest empty state if the approved data goes stale.