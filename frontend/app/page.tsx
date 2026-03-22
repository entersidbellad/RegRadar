"use client";

import Link from "next/link";
import { Leaf, ArrowRight, ShieldCheck, Brain, MapPin, AlertTriangle, Users, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#1a3409] text-white">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a3409] via-[#2d5016] to-[#1a3409]" />
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div className="relative mx-auto max-w-5xl px-6 py-20 sm:py-28">
          <div className="flex items-center gap-3 mb-8">
            <div className="rounded-xl bg-green-400/20 p-3">
              <Leaf className="h-8 w-8 text-green-400" />
            </div>
            <span className="text-2xl font-bold tracking-tight">RegRadar</span>
          </div>

          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Protecting North Carolina&rsquo;s{" "}
            <span className="text-green-400">Communities</span>{" "}
            and Waterways
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl">
            AI-powered compliance monitoring for the state&rsquo;s 2,300+ animal
            feeding operations. Making environmental regulations accessible to
            farmers who can&rsquo;t afford compliance lawyers.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Button
              size="lg"
              className="bg-green-400 text-[#1a3409] hover:bg-green-300 font-semibold text-base px-8 h-12 gap-2"
              asChild
            >
              <Link href="/dashboard">
                Enter Dashboard
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="border border-white/30 bg-transparent text-white hover:bg-white/10 font-semibold text-base px-8 h-12"
              asChild
            >
              <Link href="#problem">
                Learn More
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── The Problem ──────────────────────────────────────────────── */}
      <section id="problem" className="bg-[#faf8f5] text-[#292524]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#b45309]">
            The Problem
          </p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Environmental Injustice in Eastern NC
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-[#78716c]">
            North Carolina is the second-largest hog-producing state in the U.S.
            Eastern counties like Duplin and Sampson have some of the highest
            concentrations of Concentrated Animal Feeding Operations (CAFOs) in
            the country&mdash;disproportionately affecting low-income communities
            and communities of color.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <StatCard
              icon={<MapPin className="h-6 w-6" />}
              stat="2,300+"
              label="CAFOs in North Carolina"
              detail="Concentrated in just a handful of eastern counties"
            />
            <StatCard
              icon={<AlertTriangle className="h-6 w-6" />}
              stat="$25,000/day"
              label="Non-compliance penalty"
              detail="Small farmers face devastating fines they can't afford"
            />
            <StatCard
              icon={<Droplets className="h-6 w-6" />}
              stat="9 Federal Rules"
              label="Active regulations to track"
              detail="Complex EPA rules governing water, air, and waste"
            />
          </div>
        </div>
      </section>

      {/* ── Who This Helps ───────────────────────────────────────────── */}
      <section className="bg-white text-[#292524]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#2d5016]">
            Who We Help
          </p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Democratizing Regulatory Intelligence
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-[#78716c]">
            Large agricultural corporations have teams of lawyers to navigate
            compliance. Small and mid-size farm operators do not. RegRadar levels
            the playing field.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            <PersonaCard
              icon={<Users className="h-6 w-6 text-[#2d5016]" />}
              title="Farm Operators"
              description="Plain-language compliance guidance and action items. No legal degree required."
            />
            <PersonaCard
              icon={<ShieldCheck className="h-6 w-6 text-[#2d5016]" />}
              title="Environmental Consultants"
              description="Multi-facility management, exportable reports, and audit-ready compliance summaries."
            />
            <PersonaCard
              icon={<Brain className="h-6 w-6 text-[#2d5016]" />}
              title="Agricultural Integrators"
              description="Fleet-wide compliance visibility across dozens of contract grower facilities."
            />
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section className="bg-[#faf8f5] text-[#292524]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#b45309]">
            How It Works
          </p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            From Regulation to Action in Three Steps
          </h2>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            <StepCard
              step="01"
              title="Monitor Regulations"
              description="We continuously track federal and state environmental regulations from the Federal Register and NC DEQ that affect CAFO operations."
            />
            <StepCard
              step="02"
              title="AI Gap Analysis"
              description="Gemini 2.5 Flash extracts compliance requirements and matches them against each facility's profile, permits, and operation type."
            />
            <StepCard
              step="03"
              title="Plain-Language Actions"
              description="Farmers receive specific, understandable action items with deadlines, not 200 pages of legal text. Track progress with checklists."
            />
          </div>
        </div>
      </section>

      {/* ── Tech Stack ───────────────────────────────────────────────── */}
      <section className="bg-white text-[#292524]">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-[#78716c]">
            Built With
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-[#78716c]">
            {["Next.js 14", "FastAPI", "Gemini 2.5 Flash", "ChromaDB", "React Leaflet", "Tailwind CSS", "shadcn/ui"].map(
              (tech) => (
                <span key={tech} className="rounded-full border border-[#e7e5e4] px-4 py-1.5 font-medium">
                  {tech}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="bg-[#1a3409]">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Ready to explore?
          </h2>
          <p className="mt-4 text-lg text-white/70">
            See real compliance data for 15 NC hog farms, AI-powered gap
            analysis, and interactive CAFO mapping.
          </p>
          <Button
            size="lg"
            className="mt-8 bg-green-400 text-[#1a3409] hover:bg-green-300 font-semibold text-base px-10 h-12 gap-2"
            asChild
          >
            <Link href="/dashboard">
              Enter Dashboard
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 bg-[#1a3409]">
        <div className="mx-auto max-w-5xl px-6 py-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-green-400" />
            <span className="font-semibold">RegRadar</span>
          </div>
          <p className="text-xs text-white/40">
            Built for HackDuke &middot; Code for Good 2026
          </p>
        </div>
      </footer>
    </div>
  );
}

function StatCard({
  icon,
  stat,
  label,
  detail,
}: {
  icon: React.ReactNode;
  stat: string;
  label: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-[#e7e5e4] bg-white p-6">
      <div className="mb-4 inline-flex rounded-lg bg-[#2d5016]/10 p-2.5 text-[#2d5016]">
        {icon}
      </div>
      <p className="text-3xl font-bold text-[#292524]">{stat}</p>
      <p className="mt-1 text-sm font-semibold text-[#292524]">{label}</p>
      <p className="mt-2 text-sm leading-relaxed text-[#78716c]">{detail}</p>
    </div>
  );
}

function PersonaCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-[#e7e5e4] bg-[#faf8f5] p-6">
      <div className="mb-3">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#78716c]">{description}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="relative rounded-xl border border-[#e7e5e4] bg-white p-6">
      <span className="text-4xl font-black text-[#2d5016]/10">{step}</span>
      <h3 className="mt-2 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#78716c]">{description}</p>
    </div>
  );
}
