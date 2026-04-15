import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] relative flex-col justify-between overflow-hidden bg-[#0a1628] text-white">
        {/* Decorative gradient mesh */}
        <div className="absolute inset-0">
          <div className="absolute -top-32 -left-32 size-96 rounded-full bg-[#1a3a5c] opacity-40 blur-3xl" />
          <div className="absolute top-1/3 -right-16 size-72 rounded-full bg-[#0d4a6f] opacity-30 blur-3xl" />
          <div className="absolute -bottom-20 left-1/4 size-80 rounded-full bg-[#162d50] opacity-50 blur-3xl" />
        </div>

        {/* Geometric line pattern */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0ea5e9] via-[#38bdf8] to-[#0ea5e9]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 pt-20 flex-1">
          <div className="mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/ICT-Logo.png"
              alt="ICT Logo"
              width={56}
              height={56}
              className="mb-6 rounded-lg"
            />
            <h1 className="text-3xl font-bold tracking-tight leading-tight">
              RFI / RFP
              <br />
              Automation
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/60 max-w-xs">
              Streamline your procurement workflow with intelligent document
              automation.
            </p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/ICT-Logo.png"
              alt="ICT Logo"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="font-semibold text-lg tracking-tight">
              RFI / RFP Automation
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
