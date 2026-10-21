// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ParentMessageView } from "@/components/parent/ParentMessageView";
import { ReasonList } from "@/components/notices/workspace/ReviewStep";
import { I18nProvider } from "@/lib/i18n/client";
import { DICTIONARIES } from "@/lib/i18n";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

const wrap = (ui: React.ReactNode, locale: "en" | "gu" | "hi" = "en") => render(<I18nProvider locale={locale} messages={DICTIONARIES[locale]}>{ui}</I18nProvider>);

describe("ReasonList", () => {
  it("explains blocking reasons in the user's language", () => {
    wrap(<ReasonList reasons={[{ code: "UNRESOLVED_DISCREPANCIES", language: "gu", count: 1 }]} />);
    expect(screen.getByText("ગુજરાતી: unresolved critical issues (1).")).toBeInTheDocument();
  });
});

describe("ParentMessageView", () => {
  const versions = [
    { language: "gu" as const, text: "વાલી-શિક્ષક બેઠક ૨૫ ઓક્ટોબર", audio: null, keyDetails: [{ type: "date", text: "૨૫ ઓક્ટોબર" }] },
    { language: "hi" as const, text: "अभिभावक-शिक्षक बैठक 25 अक्टूबर", audio: { id: "a1", status: "SIMULATED", provider: "demo" }, keyDetails: [] },
  ];

  it("opens in the family's language and switches language on tap", async () => {
    wrap(<ParentMessageView noticeId="n1" versions={versions} defaultLanguage="gu" acknowledged={false} questions={[]} helpline="02830-000100" />, "gu");
    expect(screen.getByText(versions[0]!.text)).toBeInTheDocument();
    expect(screen.getByText("૨૫ ઓક્ટોબર")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "हिन्दी" }));
    expect(screen.getByText(versions[1]!.text)).toBeInTheDocument();
    // Simulated audio is labelled honestly instead of showing a fake player.
    expect(screen.queryByRole("button", { name: DICTIONARIES.gu.parent.listen })).not.toBeInTheDocument();
    expect(screen.getByText(DICTIONARIES.gu.parent.simulatedAudio)).toBeInTheDocument();
  });

  it("shows the acknowledged state instead of the button", () => {
    wrap(<ParentMessageView noticeId="n1" versions={versions} defaultLanguage="gu" acknowledged questions={[]} helpline={null} />);
    expect(screen.getByText(DICTIONARIES.en.parent.alreadyAck)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: DICTIONARIES.en.parent.understand })).not.toBeInTheDocument();
  });
});
