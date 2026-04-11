"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { FileText, BookOpen, Boxes, ExternalLink, Github } from "lucide-react";
import Image from "next/image";
import architecture from "../assets/Architecture.png";

interface ReferenceItem {
  title: string;
  url: string;
}

import type { StaticImageData } from "next/image";

interface Reference {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  items: ReferenceItem[];
  image?: string | StaticImageData;
}

const references: Reference[] = [
  {
    icon: FileText,
    title: "Research Papers",
    description: "Academic research powering our AI code generation.",
    items: [
      {
        title: "SWE-Fixer: LLMs for GitHub Issue Resolution",
        url: "https://arxiv.org/abs/2501.05040",
      },
      {
        title: "Fusion Functions for Hybrid Retrieval",
        url: "https://arxiv.org/pdf/2210.11934",
      },
    ],
  },
  {
    icon: BookOpen,
    title: "Technical Blogs",
    description: "Deep dives into hybrid search and BM25+Vector retrieval.",
    items: [
      {
        title: "Why Grep-Only Retrieval Falls Short",
        url: "https://milvus.io/blog/why-im-against-claude-codes-grep-only-retrieval-it-just-burns-too-many-tokens.md",
      },
      {
        title: "Hybrid Search & RRF Explained",
        url: "https://www.elastic.co/what-is/hybrid-search",
      },
      {
        title: "BM25 + Vector Search Implementation",
        url: "https://milvus.io/ai-quick-reference/how-do-i-implement-bm25-alongside-vector-search",
      },
    ],
  },
  {
    icon: Boxes,
    title: "Architecture",
    description:
      "LangGraph workflows, hybrid retrieval, and sandboxed execution.",
    items: [
      {
        title: "View on GitHub",
        url: "https://github.com/Deepak7704/100xSWE",
      },
    ],
    image: architecture,
  },
];

const References = () => {
  return (
    <section className="py-12 md:py-16 px-4 md:px-8 lg:px-12 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-10">
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-3 text-foreground">
            Built on Strong Foundations
          </h2>
          <p className="font-sans text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            Research, resources, and architecture powering this AI assistant
          </p>
        </div>

        {/* Reference Cards - Compact Apple-style Design */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {references.map((ref, index) => (
            <motion.div
              key={index}
              whileHover={{
                y: -6,
                transition: { duration: 0.25, ease: "easeOut" },
              }}
              whileTap={{ scale: 0.98 }}
            >
              <Card className="h-full bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden group">
                {/* Compact Header */}
                <div className="bg-foreground px-5 py-4 flex items-center gap-3 group-hover:bg-gray-800 transition-colors duration-300">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    <ref.icon className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <h3 className="font-sans text-base font-semibold text-background leading-tight">
                      {ref.title}
                    </h3>
                    <p className="font-sans text-xs text-gray-400 mt-0.5">
                      {ref.description}
                    </p>
                  </div>
                </div>

                {/* Card Content */}
                <div className="px-5 py-4 bg-white">
                  {/* Architecture Image - Smaller */}
                  {ref.image && (
                    <a
                      href={ref.items[0]?.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-3 block rounded-lg overflow-hidden border border-gray-100 hover:border-gray-300 transition-colors"
                    >
                      <Image
                        src={ref.image}
                        alt="System Architecture"
                        width={300}
                        height={180}
                        className="w-full h-32 object-cover"
                      />
                    </a>
                  )}

                  {/* Reference Items - Compact List */}
                  <div className="space-y-2">
                    {ref.items.map((item, itemIndex) => (
                      <motion.a
                        key={itemIndex}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 group/item"
                        whileHover={{ x: 4 }}
                        transition={{ duration: 0.15 }}
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 group-hover/item:text-foreground transition-colors" />
                        <span className="font-sans text-xs text-gray-600 group-hover/item:text-foreground transition-colors line-clamp-1">
                          {item.title}
                        </span>
                      </motion.a>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default References;
