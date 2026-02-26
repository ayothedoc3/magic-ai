"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { trackClientEvent } from "@/lib/analytics";

export function Footer() {
  return (
    <footer className="border-t py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold">{APP_NAME}</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link
              href="/login"
              className="transition-colors hover:text-foreground"
              onClick={() =>
                trackClientEvent("landing_cta_click", {
                  section: "footer",
                  cta_id: "footer_sign_in",
                  destination: "/login",
                })
              }
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="transition-colors hover:text-foreground"
              onClick={() =>
                trackClientEvent("landing_cta_click", {
                  section: "footer",
                  cta_id: "footer_get_started",
                  destination: "/register",
                })
              }
            >
              Get Started
            </Link>
          </div>
        </div>
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
