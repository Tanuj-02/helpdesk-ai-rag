import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Runs before first paint to set the theme class from storage. Without this,
 * a dark-mode user would see a white flash between HTML paint and hydration.
 * Kept as a string so it can be inlined as the very first script in <body>.
 */
const themeInitScript = `(function(){try{var t=localStorage.getItem('hd-theme');var d=t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export const metadata = {
  title: {
    default: "Helpdesk | Support with better context",
    template: "%s - Helpdesk",
  },
  description:
    "A focused support workspace that brings tickets, trusted knowledge, and an AI assistant together.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Script
          async
          crossOrigin="anonymous"
          src="https://tweakcn.com/live-preview.min.js"
          strategy="afterInteractive"
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
