import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";

export const metadata: Metadata = {
  title: "RFI / RFP Automation",
  description: "Automate Request for Information and Request for Proposal workflows",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
