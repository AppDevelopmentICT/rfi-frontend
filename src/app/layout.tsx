import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RFI / RFP Automation",
  description: "Automate Request for Information and Request for Proposal workflows",
  icons: {
    icon: "/assets/ICT-Logo.png",
    shortcut: "/assets/ICT-Logo.png",
    apple: "/assets/ICT-Logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className="h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
