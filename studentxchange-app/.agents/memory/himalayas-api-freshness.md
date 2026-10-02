---
name: Himalayas API search freshness
description: Interpreting the official search API updatedAt field without rejecting legitimate open listings.
---

The Himalayas search endpoint's `updatedAt` is not reliable evidence that the API itself failed to refresh yesterday; it can match the newest publication timestamp among results. Treat it as a bounded dataset age indicator and separately require a current API response plus future expiry for each listing.

**Why:** Live India-restricted junior and internship search responses had `updatedAt` values about three days old while returning currently open jobs. A strict 48-hour provider timestamp requirement made both feeds empty even though the API was accessible and their expiry dates were in the future.

**How to apply:** Keep daily polling, per-record expiration, URL/location/type validation, a finite maximum dataset age, and the shorter local verification cache. Do not interpret a quiet search's old `updatedAt` as proof that every returned job is closed. Do not HTML-scrape detail pages to compensate for uncertainty; use the expressly permitted JSON API and attribution.