import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "ValiSetu@2026";

async function login(page: Page, user: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.locator("#email").fill(`${user}@valisetu.example`);
  await page.locator("#password").fill(PASSWORD);
  await page.locator("button[type=submit]").click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

async function step(page: Page, id: string, name: string) {
  await page.goto(`/notices/${id}?step=${name}`);
}

test.describe.configure({ mode: "serial" });

let noticeId = "";

test("teacher creates, translates and validates a notice; a wrong date is caught", async ({ page }) => {
  await login(page, "teacher");
  await expect(page).toHaveURL(/\/teacher\/dashboard/);
  await page.goto("/teacher/create");
  await page.getByRole("button", { name: /Load sample: Parent-teacher meeting/ }).click();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.waitForURL(/\/notices\/[^/?]+\?step=simplify/);
  noticeId = new URL(page.url()).pathname.split("/")[2]!;

  await page.getByRole("button", { name: "Simplify notice" }).click();
  await expect(page.getByText(/Simulated: prepared sample text/)).toBeVisible();

  await step(page, noticeId, "translate");
  for (const tab of ["ગુજરાતી", "हिन्दी", "English"]) {
    await page.getByRole("tab", { name: tab }).click();
    await page.getByRole("button", { name: "Generate translation" }).click();
    await expect(page.getByRole("button", { name: "Regenerate" })).toBeVisible();
  }

  // Introduce the Scenario B error: 26 instead of 25 October in Gujarati.
  await page.getByRole("tab", { name: "ગુજરાતી" }).click();
  const gu = page.locator("#tr-gu");
  await gu.fill((await gu.inputValue()).replace("૨૫ ઓક્ટોબર", "૨૬ ઓક્ટોબર"));
  await page.getByRole("button", { name: "Save translation" }).click();
  await expect(page.getByText("Edited by staff")).toBeVisible();

  await step(page, noticeId, "validate");
  await page.getByRole("button", { name: "Run validation" }).click();
  await expect(page.getByText("Mismatch detected")).toBeVisible();
  await expect(page.getByText(/Critical issues to fix before approval/)).toBeVisible();

  // Fix it by resetting to the generated version, then validate again.
  await step(page, noticeId, "translate");
  await page.getByRole("tab", { name: "ગુજરાતી" }).click();
  await page.getByRole("button", { name: "Reset to generated version" }).click();
  await expect(page.getByText("Edited by staff")).toHaveCount(0);
  await step(page, noticeId, "validate");
  await page.getByRole("button", { name: /Run validation/ }).click();
  await expect(page.getByText("No unresolved critical issues.")).toBeVisible();

  await step(page, noticeId, "review");
  await page.getByRole("button", { name: "Submit for approval" }).click();
  await expect(page.getByText("Submitted for approval.")).toBeVisible();
  // The creating teacher has no approval rights.
  await expect(page.getByRole("button", { name: "Approve notice" })).toHaveCount(0);
});

test("head teacher approves and dispatches in demo mode", async ({ page }) => {
  await login(page, "headteacher");
  await step(page, noticeId, "review");
  await page.getByRole("button", { name: "Approve notice" }).click();
  await expect(page.getByText("Notice approved.")).toBeVisible();
  await expect(page.getByText("DEMO MODE · NO REAL MESSAGES SENT")).toBeVisible();
  await page.getByRole("button", { name: "Dispatch approved notice" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Yes" }).click();
  await expect(page.getByText("Dispatch summary")).toBeVisible();
  await expect(page.getByText("Delivered (simulated)")).toBeVisible();

  await page.goto(`/notices/${noticeId}/record`);
  await expect(page.getByText("notice.approved")).toBeVisible();
  await page.goto(`/notices/${noticeId}/basic-phone`);
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByText("The parent picks up the call.")).toBeVisible();
});

test("parent reads in their language, acknowledges and asks a question", async ({ page }) => {
  await login(page, "parent");
  await expect(page).toHaveURL(/\/parent\/messages/);
  await page.goto(`/parent/message/${noticeId}`);
  await expect(page.getByText(/૨૫ ઓક્ટોબર/).first()).toBeVisible();
  await page.getByRole("tab", { name: "हिन्दी" }).click();
  await expect(page.getByText(/25 अक्टूबर/).first()).toBeVisible();
  await page.getByRole("button", { name: "મને સમજાયું" }).click();
  await expect(page.getByText(/^આભાર/)).toBeVisible();
  await page.getByRole("button", { name: "મારે પ્રશ્ન છે" }).click();
  await page.getByRole("radio").nth(1).check();
  await page.locator("#q-message").fill("Is it 11 in the morning?");
  await page.getByRole("button", { name: "પ્રશ્ન મોકલો" }).click();
  await expect(page.getByText("Is it 11 in the morning?")).toBeVisible();

  // Parents cannot open staff pages.
  await page.goto("/school/dashboard");
  await expect(page).toHaveURL(/\/forbidden/);
});

test("teacher sees the question; CRC sees aggregates without contact details", async ({ page }) => {
  await login(page, "teacher");
  await page.goto("/teacher/responses");
  await expect(page.getByText("Is it 11 in the morning?")).toBeVisible();

  await login(page, "crc");
  await expect(page).toHaveURL(/\/crc-brc\/dashboard/);
  await expect(page.getByRole("heading", { name: "School comparison" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("+91");
  await page.goto(`/notices/${noticeId}`);
  await expect(page).toHaveURL(/\/forbidden/);
});

