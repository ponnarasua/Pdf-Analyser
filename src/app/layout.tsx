import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PDF.insight — AI PDF Analyser",
  description:
    "Paste any public PDF URL and get structured AI analysis instantly. Powered by Gemini 2.5 Flash. Your API key stays on the server.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full bg-[#080B12] text-white">{children}</body>
    </html>
  );
}
