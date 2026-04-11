"use client";

import React from "react";
import { motion } from "framer-motion";
import { Search, GitBranch, Code2, Workflow } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import ProcessVisualization from "./ProcessVisualization";

const features = [
  {
    icon: Search,
    title: "Hybrid Search",
    description:
      "BM25 keyword search + vector embeddings combined with RRF ranking. Finds exactly the right files, every time.",
  },
  {
    icon: Code2,
    title: "Deep Code Understanding",
    description:
      "AST parsing builds code graphs to understand imports, dependencies, and function relationships across your codebase.",
  },
  {
    icon: Workflow,
    title: "Incremental Indexing",
    description:
      "Only changed files are re-indexed. Embeddings stay fresh without reprocessing your entire repository.",
  },
  {
    icon: GitBranch,
    title: "Validated PR Creation",
    description:
      "Every change is tested in an isolated sandbox before a production-ready pull request is created.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    },
  },
};

const FeatureCards = () => {
  return (
    <section className="py-6 md:py-16 px-3 md:px-8 lg:px-12 bg-background overflow-hidden">
      <div className="max-w-[1600px] mx-auto">
        {/* Mobile View - Stacked */}
        <motion.div
          className="block md:hidden space-y-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={containerVariants}
        >
          {/* Process Visualization - Full Width on Mobile */}
          <div className="w-full flex items-center justify-center py-4">
            <ProcessVisualization />
          </div>

          {/* Feature Cards - Stacked on Mobile */}
          {features.map((feature, index) => (
            <motion.div key={index} variants={cardVariants}>
              <Card className="bg-white border-foreground shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-xl">
                <CardContent className="p-3 flex items-start gap-3">
                  {React.createElement(feature.icon, {
                    className:
                      "w-7 h-7 stroke-[1.5] text-foreground flex-shrink-0 mt-0.5",
                  })}
                  <div className="min-w-0">
                    <h3 className="font-sans text-sm font-bold mb-0.5 text-foreground">
                      {feature.title}
                    </h3>
                    <p className="font-sans text-xs leading-relaxed text-foreground">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Desktop View - Bento Grid with reduced height */}
        <div className="hidden md:grid md:grid-cols-4 gap-4 md:auto-rows-[200px] lg:auto-rows-[220px]">
          {/* Process Visualization */}
          <motion.div
            className="md:col-span-2 md:row-span-2 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
          >
            <ProcessVisualization />
          </motion.div>

          {/* Card 1 - Top Right */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-1 md:row-span-1"
          >
            <Card className="h-full bg-white border-foreground shadow-lg hover:shadow-xl hover:-translate-y-2 transition-all duration-300 rounded-2xl overflow-hidden">
              <CardContent className="p-4 lg:p-5 h-full flex flex-col">
                {React.createElement(features[0].icon, {
                  className:
                    "w-8 h-8 lg:w-10 lg:h-10 mb-2 stroke-[1.5] text-foreground flex-shrink-0",
                })}
                <div className="flex-1 flex flex-col">
                  <h3 className="font-sans text-base lg:text-lg font-bold mb-1 text-foreground">
                    {features[0].title}
                  </h3>
                  <p className="font-sans text-xs lg:text-sm leading-relaxed text-foreground">
                    {features[0].description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card 2 - Top Far Right */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:col-span-1 md:row-span-1"
          >
            <Card className="h-full bg-white border-foreground shadow-lg hover:shadow-xl hover:-translate-y-2 transition-all duration-300 rounded-2xl overflow-hidden">
              <CardContent className="p-4 lg:p-5 h-full flex flex-col">
                {React.createElement(features[1].icon, {
                  className:
                    "w-8 h-8 lg:w-10 lg:h-10 mb-2 stroke-[1.5] text-foreground flex-shrink-0",
                })}
                <div className="flex-1 flex flex-col">
                  <h3 className="font-sans text-base lg:text-lg font-bold mb-1 text-foreground">
                    {features[1].title}
                  </h3>
                  <p className="font-sans text-xs lg:text-sm leading-relaxed text-foreground">
                    {features[1].description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card 3 - Bottom Right */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="md:col-span-1 md:row-span-1"
          >
            <Card className="h-full bg-white border-foreground shadow-lg hover:shadow-xl hover:-translate-y-2 transition-all duration-300 rounded-2xl overflow-hidden">
              <CardContent className="p-4 lg:p-5 h-full flex flex-col">
                {React.createElement(features[2].icon, {
                  className:
                    "w-8 h-8 lg:w-10 lg:h-10 mb-2 stroke-[1.5] text-foreground flex-shrink-0",
                })}
                <div className="flex-1 flex flex-col">
                  <h3 className="font-sans text-base lg:text-lg font-bold mb-1 text-foreground">
                    {features[2].title}
                  </h3>
                  <p className="font-sans text-xs lg:text-sm leading-relaxed text-foreground">
                    {features[2].description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card 4 - Bottom Far Right */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="md:col-span-1 md:row-span-1"
          >
            <Card className="h-full bg-white border-foreground shadow-lg hover:shadow-xl hover:-translate-y-2 transition-all duration-300 rounded-2xl overflow-hidden">
              <CardContent className="p-4 lg:p-5 h-full flex flex-col">
                {React.createElement(features[3].icon, {
                  className:
                    "w-8 h-8 lg:w-10 lg:h-10 mb-2 stroke-[1.5] text-foreground flex-shrink-0",
                })}
                <div className="flex-1 flex flex-col">
                  <h3 className="font-sans text-base lg:text-lg font-bold mb-1 text-foreground">
                    {features[3].title}
                  </h3>
                  <p className="font-sans text-xs lg:text-sm leading-relaxed text-foreground">
                    {features[3].description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FeatureCards;
