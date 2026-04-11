"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import AuthModal from "@/components/AuthModal";
import Image from "next/image";
import octopusLogo from "@/assets/octopus.png";

// Floating octopus configuration
const floatingLogos = [
  { id: 1, size: 120, x: "10%", y: "15%", delay: 0, duration: 8 },
  { id: 2, size: 80, x: "85%", y: "20%", delay: 1.5, duration: 10 },
  { id: 3, size: 60, x: "75%", y: "70%", delay: 0.5, duration: 9 },
  { id: 4, size: 100, x: "5%", y: "65%", delay: 2, duration: 7 },
  { id: 5, size: 50, x: "90%", y: "45%", delay: 1, duration: 11 },
  { id: 6, size: 70, x: "15%", y: "80%", delay: 2.5, duration: 8.5 },
];

const Hero = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  const handleConnectClick = () => {
    setIsAuthModalOpen(true);
  };

  // GSAP animation for headline text
  useEffect(() => {
    if (headlineRef.current) {
      const words = headlineRef.current.innerText.split(" ");
      headlineRef.current.innerHTML = words
        .map(
          (word) =>
            `<span class="inline-block overflow-hidden"><span class="inline-block">${word}</span></span>`
        )
        .join(" ");

      const innerSpans = headlineRef.current.querySelectorAll(
        "span > span"
      ) as NodeListOf<HTMLElement>;

      const tl = gsap.timeline({ delay: 0.5 });

      tl.fromTo(
        innerSpans,
        {
          y: "100%",
          opacity: 0,
        },
        {
          y: "0%",
          opacity: 1,
          duration: 0.8,
          stagger: 0.06,
          ease: "power4.out",
        }
      );

      tl.to(
        innerSpans,
        {
          y: -3,
          duration: 0.3,
          stagger: 0.02,
          ease: "power2.out",
        },
        "+=0.2"
      );

      tl.to(innerSpans, {
        y: 0,
        duration: 0.4,
        stagger: 0.02,
        ease: "power2.inOut",
      });
    }
  }, []);

  return (
    <>
      <section className="min-h-screen flex flex-col items-center justify-center px-3 sm:px-6 pt-20 sm:pt-32 pb-12 sm:pb-20 overflow-hidden relative bg-background">
        {/* Animated Background - Floating Octopus Logos */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {floatingLogos.map((logo) => (
            <motion.div
              key={logo.id}
              className="absolute"
              style={{
                left: logo.x,
                top: logo.y,
                width: logo.size,
                height: logo.size,
              }}
              initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
              animate={{
                opacity: [0, 0.08, 0.08, 0],
                scale: [0.8, 1, 1, 0.8],
                rotate: [-10, 5, -5, 10],
                y: [0, -30, 30, 0],
              }}
              transition={{
                duration: logo.duration,
                delay: logo.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Image
                src={octopusLogo}
                alt=""
                width={logo.size}
                height={logo.size}
                className="opacity-100"
              />
            </motion.div>
          ))}

          {/* Subtle gradient orbs */}
          <motion.div
            className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-gray-200/30 to-transparent blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-tl from-gray-300/20 to-transparent blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Animated grid lines */}
          <div className="absolute inset-0 opacity-[0.03]">
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `
                  linear-gradient(to right, currentColor 1px, transparent 1px),
                  linear-gradient(to bottom, currentColor 1px, transparent 1px)
                `,
                backgroundSize: "60px 60px",
              }}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto text-center relative z-10">
          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h1
              ref={headlineRef}
              className="font-serif text-[1.6rem] leading-[1.2] xs:text-3xl sm:text-5xl md:text-7xl lg:text-8xl xl:text-9xl mb-4 sm:mb-8 tracking-tight px-1 sm:px-0"
            >
              From GitHub Issues to Pull Requests in Seconds
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            className="font-sans text-sm sm:text-lg md:text-xl text-muted-foreground max-w-[90%] sm:max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2 sm:px-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2 }}
          >
            An AI software engineer that reads your entire repository,
            understands file dependencies, writes clean code, validates changes
            in isolated environments, and creates pull requests ready for
            review.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.6,
              delay: 1.4,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            <Button
              variant="cta"
              size="lg"
              className="rounded-full mb-10 sm:mb-16 hover:scale-105 transition-transform duration-300 shadow-lg hover:shadow-xl text-sm sm:text-base"
              onClick={handleConnectClick}
            >
              <Github className="w-5 h-5 mr-2" />
              Connect with GitHub
            </Button>
          </motion.div>

          {/* MacBook Style Window - Static, Dark Theme */}
          <motion.div
            className="relative w-full max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.6, ease: "easeOut" }}
          >
            {/* Glow behind MacBook */}
            <div className="absolute -inset-4 bg-gradient-to-b from-foreground/5 to-transparent rounded-3xl blur-2xl -z-10" />

            {/* MacBook Frame - scales down on small screens */}
            <div
              className="bg-gray-900 border border-gray-700 rounded-lg md:rounded-2xl shadow-2xl overflow-hidden"
              style={{ fontSize: "clamp(10px, 2.5vw, 16px)" }}
            >
              {/* Title bar - Dark theme */}
              <div className="bg-gray-800 border-b border-gray-700 px-2 md:px-4 py-1.5 md:py-3 flex items-center gap-1.5">
                <div className="flex gap-1 md:gap-2">
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-red-500"></div>
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="flex-1 text-center font-sans text-[10px] md:text-sm text-gray-400 font-medium truncate">
                  GitHub Issue → Pull Request Demo
                </div>
              </div>

              {/* Window content - Dark theme */}
              <div className="p-2 md:p-8 space-y-2 md:space-y-6 bg-gray-900">
                {/* GitHub Issue */}
                <div className="bg-gray-800 border border-gray-700 rounded md:rounded-xl p-2 md:p-6">
                  <div className="flex items-start gap-2 md:gap-4">
                    <div className="w-5 h-5 md:w-8 md:h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold flex-shrink-0 text-[10px] md:text-xl">
                      !
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <h3 className="font-sans text-xs md:text-lg font-bold text-white mb-0.5 md:mb-2 leading-tight">
                        Critical: Complex Async Error Handling
                      </h3>
                      <p className="font-sans text-[9px] md:text-sm text-gray-400 mb-1 md:mb-3">
                        Issue #4287 • Opened 2 hours ago
                      </p>
                      <p className="font-sans text-[10px] md:text-sm text-gray-300 leading-relaxed">
                        The application crashes when handling multiple
                        concurrent async operations. Need proper error
                        boundaries and retry logic for production stability.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="text-gray-400 font-sans text-[10px] md:text-sm font-medium">
                    ↓ AI Analysis &amp; Fix ↓
                  </div>
                </div>

                {/* PR Result */}
                <div className="bg-gray-800 border border-gray-700 rounded md:rounded-xl overflow-hidden">
                  <div className="px-2 md:px-6 py-2 md:py-4 border-b border-gray-700 flex items-center gap-2 md:gap-4">
                    <div className="w-5 h-5 md:w-8 md:h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold flex-shrink-0 text-[9px] md:text-base">
                      ✓
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <h3 className="font-sans font-bold text-white text-[11px] md:text-base leading-tight">
                        Fix: Add comprehensive async error handling
                      </h3>
                      <p className="font-sans text-[9px] md:text-sm text-gray-400">
                        Pull Request #4288 • Ready to merge
                      </p>
                    </div>
                  </div>
                  <div className="p-2 md:p-6 bg-gray-950 overflow-x-auto">
                    <pre className="font-mono text-[9px] md:text-xs text-gray-300 space-y-0 md:space-y-1 text-left whitespace-pre-wrap break-all md:whitespace-pre md:break-normal">
                      <code className="block">
                        <span className="text-green-400">+ try {"{"}</span>
                      </code>
                      <code className="block">
                        <span className="text-green-400">
                          + const results = await
                          Promise.allSettled(operations);
                        </span>
                      </code>
                      <code className="block">
                        <span className="text-green-400">
                          + return results.filter(r =&gt; r.status ===
                          &apos;fulfilled&apos;);
                        </span>
                      </code>
                      <code className="block">
                        <span className="text-green-400">
                          + {"}"} catch (error) {"{"}
                        </span>
                      </code>
                      <code className="block">
                        <span className="text-green-400">
                          + await handleError(error, {"{"} retry: true,
                          maxRetries: 3 {"}"});
                        </span>
                      </code>
                      <code className="block">
                        <span className="text-green-400">+ {"}"}</span>
                      </code>
                    </pre>
                  </div>
                  <div className="px-2 md:px-6 py-1.5 md:py-4 border-t border-gray-700 bg-gray-800">
                    <div className="flex items-center gap-1 md:gap-2 text-[9px] md:text-xs font-sans">
                      <span className="text-green-500">✓</span>
                      <span className="text-gray-400">
                        All tests passing • 3 files changed • +47 -12 lines
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      </section>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
};

export default Hero;
