import { chromium, expect } from "@playwright/test";

const chromiumPath = process.env.CHROMIUM_BIN;
const configuredDomain = process.env.REPLIT_DEV_DOMAIN;

if (!chromiumPath || !configuredDomain) {
  throw new Error("CHROMIUM_BIN and REPLIT_DEV_DOMAIN are required.");
}

const baseUrl = /^https?:\/\//i.test(configuredDomain)
  ? configuredDomain.replace(/\/+$/, "")
  : `https://${configuredDomain.replace(/\/+$/, "")}`;

// This data is deliberately disposable and is never printed.
const suffix = Date.now().toString(36).replace(/[^a-z0-9]/gi, "").slice(-10);
const username = `TestCollabQA${suffix}`.slice(0, 30);
const email = `collabqa${suffix}@example.com`;
const password = `qa${suffix.slice(-5)}A7`;
const profileName = `Test Collab QA ${suffix}`;
const initialBio = "Initial QA bio for Student Collab.";
const editedBio = "Edited QA bio after a persisted reload.";

const statuses = [];
const failures = [];
const safePath = (url) => {
  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith("/api/")) return parsed.pathname;
    if (
      parsed.hostname.includes("googleapis.com") &&
      parsed.pathname.includes("identitytoolkit")
    ) {
      return "firebase-auth";
    }
    return null;
  } catch {
    return null;
  }
};

const safeErrorText = (value) =>
  String(value || "")
    .replace(email, "[test-email]")
    .replace(/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, "[redacted-token]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);

const visibleError = async (page) => {
  const candidates = [
    page.locator('[role="alert"]').last(),
    page.locator('[data-sonner-toast]').last(),
    page.locator("body"),
  ];
  for (const candidate of candidates) {
    try {
      const text = safeErrorText(await candidate.innerText({ timeout: 1000 }));
      if (text && text.length < 800) return text;
    } catch {
      // Try the next safe, UI-only source.
    }
  }
  return "No visible error was rendered.";
};

async function waitForSuccessfulRequest(page, method, path, action) {
  const matching = [];
  const listener = (response) => {
    const responsePath = safePath(response.url());
    if (responsePath === path && response.request().method() === method) {
      matching.push(response.status());
    }
  };
  page.on("response", listener);
  try {
    await action();
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      if (matching.some((status) => status >= 200 && status < 300)) {
        return matching;
      }
      await page.waitForTimeout(250);
    }
  } finally {
    page.off("response", listener);
  }
  throw new Error(
    `${method} ${path} did not succeed; observed statuses: ${
      matching.length ? matching.join(", ") : "none"
    }`,
  );
}

async function chooseRadixOption(page, triggerTestId, optionName) {
  await page.locator(`[data-testid="${triggerTestId}"]`).click();
  const option = page.getByRole("option", { name: optionName, exact: true });
  await expect(option).toBeVisible();
  await option.click();
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: chromiumPath,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });
  const page = await context.newPage();

  page.on("response", (response) => {
    const path = safePath(response.url());
    if (path) {
      const method = response.request().method();
      statuses.push({
        method,
        path,
        status: response.status(),
      });
      const expectedEmptyProfile = method === "GET" && path === "/api/collab/student-profile";
      if (
        response.status() >= 400 &&
        !expectedEmptyProfile &&
        (path === "/api/collab/auth/smart-login" ||
          path === "/api/collab/student-profile")
      ) {
        failures.push({
          method,
          path,
          status: response.status(),
          body: response
            .finished()
            .then(() => response.text())
            .then((body) => safeErrorText(body))
            .catch(() => "response body unavailable"),
        });
      }
    }
  });

  try {
    await page.goto(`${baseUrl}/student-collab`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await expect(page.getByRole("button", { name: "Sign Up Free" })).toBeVisible({
      timeout: 30000,
    });
    await page.screenshot({ path: "/tmp/student-collab-signup.png", fullPage: true });

    await page.getByRole("button", { name: "Sign Up Free" }).click();
    await expect(page.locator('[data-testid="input-username"]')).toBeVisible();
    await page.locator('[data-testid="input-username"]').fill(username);
    await page.locator('[data-testid="input-email"]').fill(email);
    await page.locator('[data-testid="input-password"]').fill(password);
    await page.locator('[data-testid="input-confirm-password"]').fill(password);
    await page.locator('[data-testid="checkbox-terms"]').click();

    try {
      await waitForSuccessfulRequest(
        page,
        "POST",
        "/api/collab/auth/smart-login",
        () => page.getByRole("button", { name: "Create Account" }).click(),
      );
    } catch (error) {
      const uiError = await visibleError(page);
      throw new Error(
        `Firebase/email signup failed: ${uiError}; ${safeErrorText(error.message)}`,
      );
    }

    await page.goto(`${baseUrl}/collab-student-profile-builder`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await expect(page.locator('[data-testid="input-full-name"]')).toBeVisible({
      timeout: 30000,
    });

    await page.locator('[data-testid="input-full-name"]').fill(profileName);
    await page.locator('[data-testid="input-college"]').fill("QA University");
    await page.locator('[data-testid="input-email"]').fill(email);
    await page.locator('[data-testid="textarea-about"]').fill(initialBio);
    await page.locator('[data-testid="button-next-step1"]').click();

    await chooseRadixOption(page, "select-course", "B.Tech");
    await chooseRadixOption(page, "select-year", "First Year");
    await chooseRadixOption(page, "select-stream", "Computer Science & IT");
    await page.locator('[data-testid="button-next-step2"]').click();

    await page.locator('[data-testid="input-search-skills"]').fill("JavaScript");
    await chooseRadixOption(page, "select-skills", "JavaScript");
    await page.locator('[data-testid="input-search-interests"]').fill("Hackathons");
    await chooseRadixOption(page, "select-interests", "Hackathons");

    // The builder intentionally stores a draft in sessionStorage. Reload before
    // saving, then walk back through every step to verify restoration.
    await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
    await expect(page.locator('[data-testid="input-full-name"]')).toHaveValue(profileName, {
      timeout: 30000,
    });
    await expect(page.locator('[data-testid="input-college"]')).toHaveValue("QA University");
    await expect(page.locator('[data-testid="input-email"]')).toHaveValue(email);
    await expect(page.locator('[data-testid="textarea-about"]')).toHaveValue(initialBio);
    await page.screenshot({
      path: "/tmp/student-collab-draft-restored.png",
      fullPage: true,
      mask: [page.locator("input"), page.locator("textarea")],
    });

    await page.locator('[data-testid="button-next-step1"]').click();
    await expect(page.locator('[data-testid="select-course"]')).toContainText("B.Tech");
    await expect(page.locator('[data-testid="select-year"]')).toContainText("First Year");
    await expect(page.locator('[data-testid="select-stream"]')).toContainText("Computer Science & IT");
    await page.locator('[data-testid="button-next-step2"]').click();
    await expect(page.getByText("JavaScript", { exact: true })).toBeVisible();
    await expect(page.getByText("Hackathons", { exact: true })).toBeVisible();

    await waitForSuccessfulRequest(
      page,
      "POST",
      "/api/collab/student-profile",
      () => page.locator('[data-testid="button-save-profile"]').click(),
    );
    await expect(page).toHaveURL(/\/collab-profile$/, { timeout: 30000 });
    await expect(page.getByText(profileName, { exact: true })).toBeVisible({
      timeout: 30000,
    });

    // A full reload must fetch the persisted profile, not just render the
    // optimistic React Query value.
    await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
    await expect(page.getByText(profileName, { exact: true })).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByText(initialBio, { exact: true })).toBeVisible({
      timeout: 30000,
    });

    await page.locator('[data-testid="button-edit-profile"]').click();
    await expect(page.locator('[data-testid="textarea-bio"]')).toHaveValue(initialBio, {
      timeout: 30000,
    });
    await page.locator('[data-testid="textarea-bio"]').fill(editedBio);

    await waitForSuccessfulRequest(
      page,
      "PUT",
      "/api/collab/student-profile",
      () => page.getByRole("button", { name: "Save Changes" }).click(),
    );
    await expect(page.getByText(editedBio, { exact: true })).toBeVisible({
      timeout: 30000,
    });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
    await expect(page.getByText(editedBio, { exact: true })).toBeVisible({
      timeout: 30000,
    });

    const summary = statuses
      .map(({ method, path, status }) => `${method} ${path}=${status}`)
      .filter(
        (entry, index, all) =>
          all.indexOf(entry) === index &&
          (entry.includes("/api/collab/auth/smart-login") ||
            entry.includes("/api/collab/student-profile") ||
            entry.includes("firebase-auth")),
      );
    const apiErrors = await Promise.all(
      failures.map(async ({ method, path, status, body }) =>
        `${method} ${path}=${status}: ${await body}`,
      ),
    );
    console.log("RESULT: PASS — Student Collab signup, draft restoration, profile persistence, and bio edit verified.");
    console.log(`REQUEST STATUSES: ${summary.join("; ")}`);
    if (apiErrors.length) console.log(`API ERRORS OBSERVED: ${apiErrors.join("; ")}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(async (error) => {
  console.error(`RESULT: FAIL — ${safeErrorText(error.message || error)}`);
  const relevant = statuses
    .map(({ method, path, status }) => `${method} ${path}=${status}`)
    .filter(
      (entry, index, all) =>
        all.indexOf(entry) === index &&
        (entry.includes("/api/collab/auth/smart-login") ||
          entry.includes("/api/collab/student-profile") ||
          entry.includes("firebase-auth")),
    );
  if (relevant.length) console.error(`REQUEST STATUSES: ${relevant.join("; ")}`);
  if (failures.length) {
    const apiErrors = await Promise.all(
      failures.map(async ({ method, path, status, body }) =>
        `${method} ${path}=${status}: ${await body}`,
      ),
    );
    console.error(
      `API ERRORS OBSERVED: ${apiErrors.join("; ")}`,
    );
  }
  process.exitCode = 1;
});