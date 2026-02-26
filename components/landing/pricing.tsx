"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, fadeIn, staggerContainer } from "./motion";
import { trackClientEvent } from "@/lib/analytics";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with AI content creation",
    features: [
      "100 text credits",
      "10 image credits",
      "GPT-4o Mini access",
      "5 saved documents",
      "Basic templates",
    ],
    cta: "Get Started",
    variant: "outline" as const,
    popular: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    description: "For creators who need more power",
    features: [
      "2,000 text credits/mo",
      "100 image credits/mo",
      "All AI models",
      "Unlimited documents",
      "All templates",
      "Priority support",
    ],
    cta: "Start Pro Trial",
    variant: "default" as const,
    popular: true,
  },
  {
    name: "Business",
    price: "$49",
    period: "/month",
    description: "For teams and heavy usage",
    features: [
      "10,000 text credits/mo",
      "500 image credits/mo",
      "All AI models",
      "Team workspace",
      "API access",
      "Dedicated support",
    ],
    cta: "Contact Us",
    variant: "outline" as const,
    popular: false,
  },
];

export function Pricing() {
  const trackPricingCtaClick = (
    planName: string,
    ctaLabel: string,
    price: string
  ) => {
    trackClientEvent("landing_cta_click", {
      section: "pricing",
      cta_id: "pricing_plan_cta",
      destination: "/register",
      plan_name: planName,
      plan_price: price,
      cta_label: ctaLabel,
    });
  };

  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="text-center"
        >
          <motion.p
            variants={fadeIn}
            transition={{ duration: 0.5 }}
            className="mb-2 text-sm font-medium text-primary"
          >
            Pricing
          </motion.p>
          <motion.h2
            variants={fadeIn}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-4 text-3xl font-bold sm:text-4xl"
          >
            Simple, transparent pricing
          </motion.h2>
          <motion.p
            variants={fadeIn}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mb-16 max-w-2xl text-muted-foreground"
          >
            Start free, upgrade when you need more. No hidden fees.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={fadeIn}
              transition={{ duration: 0.4 }}
              className={`relative rounded-xl border bg-background p-8 ${
                plan.popular ? "border-primary shadow-lg" : ""
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              <div className="mb-6">
                <h3 className="mb-1 text-lg font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="mb-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.variant}
                className="w-full"
                asChild
              >
                <Link
                  href="/register"
                  onClick={() =>
                    trackPricingCtaClick(plan.name, plan.cta, plan.price)
                  }
                >
                  {plan.cta}
                </Link>
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
