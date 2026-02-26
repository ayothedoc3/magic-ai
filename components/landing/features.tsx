"use client";

import {
  MessageSquare,
  Wand2,
  Image,
  FileText,
  Bot,
  Zap,
} from "lucide-react";
import { motion, fadeIn, staggerContainer } from "./motion";

const features = [
  {
    icon: MessageSquare,
    title: "AI Chat",
    description:
      "Chat with GPT-4o, Claude, and Gemini in real-time with streaming responses.",
  },
  {
    icon: Wand2,
    title: "Content Generation",
    description:
      "Use 50+ templates to generate blog posts, ads, emails, and more.",
  },
  {
    icon: Image,
    title: "Image Creation",
    description:
      "Generate stunning images with DALL-E 3 from simple text prompts.",
  },
  {
    icon: FileText,
    title: "Document Editor",
    description:
      "Edit and refine AI-generated content with a rich text editor.",
  },
  {
    icon: Bot,
    title: "AI Agents",
    description:
      "Deploy specialized AI agents to automate complex workflows.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Real-time streaming responses. No waiting, no loading spinners.",
  },
];

export function Features() {
  return (
    <section id="features" className="border-t bg-muted/30 py-24">
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
            Features
          </motion.p>
          <motion.h2
            variants={fadeIn}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-4 text-3xl font-bold sm:text-4xl"
          >
            Everything you need to create
          </motion.h2>
          <motion.p
            variants={fadeIn}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mb-16 max-w-2xl text-muted-foreground"
          >
            One platform with all the AI tools you need. From chat to content
            generation to image creation.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={fadeIn}
              transition={{ duration: 0.4 }}
              className="group rounded-xl border bg-background p-6 transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-semibold">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
