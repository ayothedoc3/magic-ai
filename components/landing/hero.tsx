"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, fadeIn, staggerContainer } from "./motion";
import { trackClientEvent } from "@/lib/analytics";

export function Hero() {
  const trackCtaClick = (ctaId: string, destination: string) => {
    trackClientEvent("landing_cta_click", {
      section: "hero",
      cta_id: ctaId,
      destination,
    });
  };

  return (
    <section className="relative overflow-hidden">
      {/* Gradient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute right-0 top-1/4 h-[400px] w-[400px] rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mx-auto flex max-w-4xl flex-col items-center px-6 pb-20 pt-24 text-center sm:pt-32"
      >
        <motion.div variants={fadeIn} transition={{ duration: 0.5 }}>
          <Badge variant="outline" className="mb-6 gap-1.5 px-3 py-1 text-sm font-normal">
            <Sparkles className="h-3.5 w-3.5" />
            Powered by GPT-4o, Claude & Gemini
          </Badge>
        </motion.div>

        <motion.h1
          variants={fadeIn}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
        >
          Create with AI.
          <br />
          <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Ship faster.
          </span>
        </motion.h1>

        <motion.p
          variants={fadeIn}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl"
        >
          Generate blog posts, marketing copy, images, and code with the
          world&apos;s best AI models. One platform, unlimited creativity.
        </motion.p>

        <motion.div
          variants={fadeIn}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col gap-4 sm:flex-row"
        >
          <Button size="lg" asChild className="gap-2">
            <Link
              href="/register"
              onClick={() =>
                trackCtaClick("hero_start_creating_free", "/register")
              }
            >
              Start Creating Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link
              href="/login"
              onClick={() => trackCtaClick("hero_sign_in", "/login")}
            >
              Sign In
            </Link>
          </Button>
        </motion.div>

        <motion.p
          variants={fadeIn}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-6 text-sm text-muted-foreground"
        >
          100 free text credits &middot; 10 free image credits &middot; No credit card required
        </motion.p>
      </motion.div>
    </section>
  );
}
