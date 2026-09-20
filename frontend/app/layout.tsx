import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CustomerIQ — E-commerce Customer Intelligence",
    template: "%s | CustomerIQ",
  },
  description:
    "CustomerIQ transforms your e-commerce data into actionable customer intelligence with RFM analysis, AI-powered segmentation, and business insights.",
  keywords: ["customer analytics", "RFM analysis", "customer segmentation", "e-commerce intelligence"],
  authors: [{ name: "CustomerIQ" }],
  metadataBase: new URL("https://customeriq.app"),
  openGraph: {
    title: "CustomerIQ — E-commerce Customer Intelligence",
    description: "Turn your data into actionable business intelligence.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        </head>
        <body className="antialiased">
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            storageKey="customeriq-theme"
          >
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
