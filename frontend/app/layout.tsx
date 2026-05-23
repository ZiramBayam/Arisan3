import type { Metadata, Viewport } from "next";
import { Header } from "@/components/Header";
import { SplashScreen } from "@/components/SplashScreen";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arisan3 — Arisan on-chain di Base",
  description:
    "Arisan tradisional Indonesia di smart contract immutable. Non-custodial, transparan, dan tidak bisa dimanipulasi siapapun.",
};

export const viewport: Viewport = {
  themeColor: "#FCFBF4",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('arisan3:theme');var dark=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',dark?'dark':'light');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-prime text-ink">
        <Providers>
          <SplashScreen />
          <Header />
          <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
            {children}
          </main>
          <footer className="border-t border-ink/5 bg-prime-100">
            <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-ink-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
              <span>
                Arisan3 · Immutable contract di Base Sepolia · Kode adalah hukum
              </span>
              <span>
                v1.0 · {new Date().getFullYear()}
              </span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
