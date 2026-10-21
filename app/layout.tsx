import type { Metadata, Viewport } from "next";
import "@fontsource/noto-sans/400.css";
import "@fontsource/noto-sans/600.css";
import "@fontsource/noto-sans-gujarati/400.css";
import "@fontsource/noto-sans-gujarati/600.css";
import "@fontsource/noto-sans-devanagari/400.css";
import "@fontsource/noto-sans-devanagari/600.css";
import "./globals.css";
import { DICTIONARIES } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/client";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: { default: "Vali Setu", template: "%s · Vali Setu" },
  description: "Multilingual school-to-parent communication prototype (demo data).",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1B3259" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getT();
  return (
    <html lang={locale}>
      <body>
        <I18nProvider locale={locale} messages={DICTIONARIES[locale]}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
