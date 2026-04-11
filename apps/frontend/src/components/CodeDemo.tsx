"use client";

import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import LangGraphFlow from "@/components/LangGraphFlow";

const CodeDemo = () => {
  return (
    <>
      {/* Code Demo Section */}
      <section className="py-12 sm:py-20 md:py-32 px-4 sm:px-6 bg-background scroll-mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-start gap-6 sm:gap-8 lg:gap-16">
            {/* Left side - Content (Sticky) */}
            <div className="flex-1 space-y-8 lg:sticky lg:top-32 lg:self-start">
              <h2 className="font-serif text-3xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight text-foreground">
                Describe. Generate. Ship.
              </h2>
              <p className="font-sans text-base sm:text-lg lg:text-xl leading-relaxed text-foreground">
                Connect your GitHub repository or a forked open source project
                and describe what you need. Our AI understands the codebase,
                finds the right files, generates production-ready code, and
                creates pull requests—all validated in sandboxed environments.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button variant="cta" size="lg" className="rounded-full">
                  <Github className="w-5 h-5 mr-2" />
                  Connect with GitHub
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full border-foreground hover:bg-foreground hover:text-background"
                >
                  Explore Docs
                </Button>
              </div>
            </div>

            {/* Right side - LangGraph Flow (No animation) */}
            <div className="flex-1 lg:flex-none lg:w-[500px]">
              <LangGraphFlow />
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default CodeDemo;
