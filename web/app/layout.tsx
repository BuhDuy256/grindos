import type { Metadata } from "next";
import { Inter } from "next/font/google";
import SketchFilters from "@/components/ui/SketchFilters";
import { BottomNav } from "@/features/shell/components/BottomNav";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "GrindOS",
  description: "Gamified productivity system with Mochi the cat companion",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Material Symbols for Mochi theme icons */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        {/* Run before React hydration to prevent theme flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var r=document.documentElement;var t=localStorage.getItem('grindos_theme');var d=window.matchMedia('(prefers-color-scheme:dark)').matches;if(t==='dark'||(t!=='light'&&d)){r.classList.add('dark');}var sz={'small':'14px','medium':'16px','large':'18px'};var fs=localStorage.getItem('grindos_font_size')||'medium';r.style.setProperty('--font-size-base',sz[fs]||'16px');var ac=localStorage.getItem('grindos_accent');if(ac){r.style.setProperty('--accent',ac);}var tn=localStorage.getItem('grindos_theme_name')||'mochi';r.setAttribute('data-theme',tn);})();` }} />
      </head>
      <body className="min-h-full">
        <SketchFilters />
        <Providers>
          <ThemeProvider />
          {children}
          <BottomNav />
          {process.env.NODE_ENV === "development" && (
            <div style={{
              position: "fixed", bottom: "4.5rem", right: "0.75rem",
              fontSize: "10px", fontFamily: "monospace", opacity: 0.6,
              background: process.env.NEXT_PUBLIC_API_URL ? "#1e40af" : "#065f46",
              color: "#fff", padding: "2px 6px", borderRadius: "4px",
              zIndex: 9999, pointerEvents: "none",
            }}>
              {process.env.NEXT_PUBLIC_API_URL ? "SQLite :8080" : "MongoDB"}
            </div>
          )}
        </Providers>
      </body>
    </html>
  );
}
