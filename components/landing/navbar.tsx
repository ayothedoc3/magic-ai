"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, fadeIn } from "./motion";
import { APP_NAME } from "@/lib/constants";
import { trackClientEvent } from "@/lib/analytics";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const trackCtaClick = (
    ctaId: string,
    destination: string,
    placement: "desktop" | "mobile"
  ) => {
    trackClientEvent("landing_cta_click", {
      section: "navbar",
      cta_id: ctaId,
      destination,
      placement,
    });
  };

  return (
    <motion.header
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">{APP_NAME}</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Pricing
          </a>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link
              href="/login"
              onClick={() =>
                trackCtaClick("navbar_sign_in", "/login", "desktop")
              }
            >
              Sign In
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link
              href="/register"
              onClick={() =>
                trackCtaClick("navbar_get_started", "/register", "desktop")
              }
            >
              Get Started
            </Link>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t md:hidden"
        >
          <div className="flex flex-col gap-4 px-6 py-4">
            <a
              href="#features"
              className="text-sm text-muted-foreground"
              onClick={() => setMobileOpen(false)}
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-sm text-muted-foreground"
              onClick={() => setMobileOpen(false)}
            >
              Pricing
            </a>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" size="sm" asChild className="flex-1">
                <Link
                  href="/login"
                  onClick={() =>
                    trackCtaClick("navbar_sign_in", "/login", "mobile")
                  }
                >
                  Sign In
                </Link>
              </Button>
              <Button size="sm" asChild className="flex-1">
                <Link
                  href="/register"
                  onClick={() =>
                    trackCtaClick("navbar_get_started", "/register", "mobile")
                  }
                >
                  Get Started
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}
