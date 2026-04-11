"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import octopusLogo from "@/assets/octopus.png";
import MobileMenu from "@/components/MobileMenu";
import Image from "next/image";

const navVariants = {
  hidden: { y: -100, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut" as const,
    },
  },
};

const Navbar = () => {
  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 w-full"
      initial="hidden"
      animate="visible"
      variants={navVariants}
    >
      <div className="flex items-center justify-between border-b border-gray-200/60 bg-white/95 backdrop-blur-sm px-4 sm:px-8 lg:px-12 py-3 sm:py-4">
        <motion.div
          className="flex items-center gap-3"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
        >
          <Image src={octopusLogo} alt="100xSWE Logo" width={40} height={40} />
          <span className="font-sans font-bold text-foreground text-xl">
            100xSWE
          </span>
        </motion.div>

        <motion.div
          className="hidden lg:flex flex-1 items-center justify-center font-sans font-medium text-base gap-10"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1,
                delayChildren: 0.3,
              },
            },
          }}
        >
          <motion.div variants={itemVariants}>
            <Link
              href="/"
              className="hover:text-muted-foreground transition-colors"
            >
              Home
            </Link>
          </motion.div>
          <motion.div variants={itemVariants}>
            <a
              href="/documentation"
              className="hover:text-muted-foreground transition-colors"
            >
              Documentation
            </a>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Link
              href="/dashboard"
              className="hover:text-muted-foreground transition-colors"
            >
              Dashboard
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.5 }}
        >
          <Button
            variant="cta"
            size="default"
            className="rounded-full hidden lg:block"
            onClick={() => window.open("https://github.com/signup", "_blank")}
          >
            Sign Up
          </Button>
        </motion.div>

        <MobileMenu />
      </div>
    </motion.nav>
  );
};

export default Navbar;
