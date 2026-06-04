import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GrindOS",
  description: "Gamified productivity system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Run before React hydration to prevent dark-mode flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var r=document.documentElement;var t=localStorage.getItem('grindos_theme');var d=window.matchMedia('(prefers-color-scheme:dark)').matches;if(t==='dark'||(t!=='light'&&d)){r.classList.add('dark');}var sz={'small':'13px','medium':'15px','large':'18px'};var fs=localStorage.getItem('grindos_font_size')||'medium';r.style.setProperty('--font-size-base',sz[fs]||'15px');var ac=localStorage.getItem('grindos_accent');if(ac){r.style.setProperty('--accent',ac);}})();` }} />
      </head>
      <body className="min-h-full flex flex-col pb-16">
        <ThemeProvider />
        <div className="flex flex-col flex-1">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
