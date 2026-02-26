"use client";

import { motion, fadeIn, staggerContainer } from "./motion";

const stats = [
  { value: "3", label: "AI Providers" },
  { value: "50+", label: "Templates" },
  { value: "< 1s", label: "First Token" },
  { value: "99.9%", label: "Uptime" },
];

export function Stats() {
  return (
    <section className="border-y bg-muted/30 py-16">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
        className="mx-auto grid max-w-4xl grid-cols-2 gap-8 px-6 sm:grid-cols-4"
      >
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            variants={fadeIn}
            transition={{ duration: 0.4 }}
            className="text-center"
          >
            <p className="text-3xl font-bold tracking-tight sm:text-4xl">
              {stat.value}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
