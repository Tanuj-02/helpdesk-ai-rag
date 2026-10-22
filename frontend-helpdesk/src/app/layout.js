import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "./experience.css";
import { ThemeProvider } from "@/components/theme-provider";

/**
 * Inter for UI text. Its tall x-height and open apertures stay legible at
 * 12-13px, which is the size most of this product's dense screens live at.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/**
 * JetBrains Mono for ticket ids, tenant slugs and code fragments. A tabular
 * mono means `#1042` and `acme-corp` line up in columns.
 */
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-jetbrains",
  subsets: ["latin"],
  display: "swap",
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
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
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
