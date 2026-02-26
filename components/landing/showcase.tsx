"use client";

import {
  MessageSquare,
  Wand2,
  Image,
  FileText,
} from "lucide-react";
import { motion, fadeIn, staggerContainer } from "./motion";

const showcaseItems = [
  {
    icon: MessageSquare,
    title: "Multi-Model Chat",
    description: "Switch between GPT-4o, Claude, and Gemini mid-conversation. Compare responses side by side.",
    className: "sm:col-span-2 sm:row-span-2",
    preview: (
      <div className="mt-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-xs font-medium text-blue-500">
            You
          </div>
          <div className="rounded-lg rounded-tl-none bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Write a product description for our new AI platform
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-xs font-medium text-green-500">
            AI
          </div>
          <div className="rounded-lg rounded-tl-none bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            <span className="inline-block animate-pulse">Introducing AyoMagic — your all-in-one AI content studio...</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: Wand2,
    title: "50+ Templates",
    description: "Blog posts, ads, emails, social media — pick a template, fill in the details, get results.",
    className: "",
    preview: (
      <div className="mt-4 flex flex-wrap gap-1.5">
        {["Blog Post", "Ad Copy", "Email", "Tweet", "Product"].map((t) => (
          <span
            key={t}
            className="rounded-md bg-muted/50 px-2 py-1 text-[10px] text-muted-foreground"
          >
            {t}
          </span>
        ))}
      </div>
    ),
  },
  {
    icon: Image,
    title: "DALL-E 3 Images",
    description: "Generate stunning visuals from text prompts.",
    className: "",
    preview: (
      <div className="mt-4 grid grid-cols-2 gap-1.5">
        {[
          "bg-gradient-to-br from-pink-300 to-purple-400",
          "bg-gradient-to-br from-blue-300 to-cyan-400",
          "bg-gradient-to-br from-amber-300 to-orange-400",
          "bg-gradient-to-br from-green-300 to-emerald-400",
        ].map((bg, i) => (
          <div key={i} className={`aspect-square rounded-md ${bg} opacity-60`} />
        ))}
      </div>
    ),
  },
  {
    icon: FileText,
    title: "Rich Text Editor",
    description: "Edit AI outputs with a full-featured editor. Format, refine, and export your content.",
    className: "sm:col-span-2",
    preview: (
      <div className="mt-4 space-y-2 rounded-lg border bg-muted/20 p-3">
        <div className="flex gap-1.5">
          {["B", "I", "U", "H1", "H2"].map((b) => (
            <span
              key={b}
              className="flex h-6 w-6 items-center justify-center rounded border bg-background text-[10px] font-medium text-muted-foreground"
            >
              {b}
            </span>
          ))}
        </div>
        <div className="space-y-1">
          <div className="h-2 w-3/4 rounded bg-muted" />
          <div className="h-2 w-full rounded bg-muted" />
          <div className="h-2 w-5/6 rounded bg-muted" />
        </div>
      </div>
    ),
  },
];

export function Showcase() {
  return (
    <section className="py-24">
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
            How it works
          </motion.p>
          <motion.h2
            variants={fadeIn}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-4 text-3xl font-bold sm:text-4xl"
          >
            Built for speed and simplicity
          </motion.h2>
          <motion.p
            variants={fadeIn}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mb-16 max-w-2xl text-muted-foreground"
          >
            Every tool designed to get you from idea to finished content in seconds.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {showcaseItems.map((item) => (
            <motion.div
              key={item.title}
              variants={fadeIn}
              transition={{ duration: 0.4 }}
              className={`rounded-xl border bg-background p-6 ${item.className}`}
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="h-4 w-4" />
              </div>
              <h3 className="mb-1 font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
              {item.preview}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
