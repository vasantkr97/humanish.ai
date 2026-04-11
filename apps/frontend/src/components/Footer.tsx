"use client";

import { motion } from "framer-motion";
import { Github } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const,
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut" as const,
    },
  },
};

const Footer = () => {
  return (
    <motion.footer
      className="bg-background border-t border-border py-8 sm:py-12 px-4 sm:px-6"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={containerVariants}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8">
          <motion.div
            className="flex flex-col items-center md:items-start gap-3 sm:gap-4"
            variants={itemVariants}
          >
            <p className="font-sans text-xs sm:text-sm text-muted-foreground">
              © 2025 100xSWE. All rights reserved.
            </p>
            <div className="flex gap-4">
              <motion.a
                href="https://x.com/VeluvoluDeepak"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-foreground flex items-center justify-center hover:bg-foreground hover:text-background transition-colors"
                aria-label="X (Twitter)"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </motion.a>
              <motion.a
                href="https://github.com/Deepak7704/100xSWE/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-foreground flex items-center justify-center hover:bg-foreground hover:text-background transition-colors"
                aria-label="GitHub"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Github className="w-5 h-5" />
              </motion.a>
            </div>
          </motion.div>
          <motion.div
            className="flex flex-wrap justify-center gap-6 font-sans text-sm text-muted-foreground"
            variants={itemVariants}
          >
            <a
              href="#privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="#terms"
              className="hover:text-foreground transition-colors"
            >
              Terms of Service
            </a>
            <a
              href="#contact"
              className="hover:text-foreground transition-colors"
            >
              Contact
            </a>
          </motion.div>
        </div>
      </div>
    </motion.footer>
  );
};

export default Footer;
