import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mekong Apparel · Attendance",
  description: "Factory gate attendance terminal. Invented data for a cloud computing capstone demo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans")}
    >
      <body className="min-h-full flex flex-col">
        <span hidden aria-hidden="true" data-design-contract="fd833913">THESIS: A readable shared gate terminal paired with a persistent attendance ledger. OWN-WORLD: Light mineral surfaces, deep forest-green clock field, workhorse sans and tabular timestamps. STORY: Choose an invented worker, record arrival or departure, inspect the saved row. FIRST VIEWPORT: Clock and actions at left, full attendance ledger at right, stacked on mobile. FORM: Gate control desk, direction 3, fd833913. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md</span>
        {children}
      </body>
    </html>
  );
}
