import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Process Studio · Team 5",
  description: "Review descriptions, clarify missing information and refine editable process diagrams.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head><link rel="stylesheet" href="/studio-themes.css" /></head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
