"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, fadeIn, staggerContainer } from "./motion";
import { trackClientEvent } from "@/lib/analytics";

export function CTA() {
  return (
    <section className="border-t bg-muted/30 py-24">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
        className="mx-auto max-w-2xl px-6 text-center"
      >
        <motion.h2
          variants={fadeIn}
          transition={{ duration: 0.5 }}
          className="mb-4 text-3xl font-bold sm:text-4xl"
        >
          Ready to create with AI?
        </motion.h2>
        <motion.p
          variants={fadeIn}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8 text-lg text-muted-foreground"
        >
          Join thousands of creators using AyoMagic to produce content faster
          than ever. Start free — no credit card required.
        </motion.p>
        <motion.div
          variants={fadeIn}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Button size="lg" asChild className="gap-2">
            <Link
              href="/register"
              onClick={() =>
                trackClientEvent("landing_cta_click", {
                  section: "final_cta",
                  cta_id: "final_get_started_free",
                  destination: "/register",
                })
              }
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
}
