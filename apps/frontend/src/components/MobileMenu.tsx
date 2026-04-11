"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import Link from "next/link";

const MobileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200/60 shadow-lg">
          <div className="flex flex-col items-start gap-4 px-6 py-6">
            <Link
              href="/"
              className="font-sans font-medium text-base hover:text-muted-foreground transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Home
            </Link>
            <a
              href="/documentation"
              className="font-sans font-medium text-base hover:text-muted-foreground transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Documentation
            </a>
            <Link
              href="/dashboard"
              className="font-sans font-medium text-base hover:text-muted-foreground transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Dashboard
            </Link>
            <Button
              variant="cta"
              size="default"
              className="rounded-full w-full mt-2"
              onClick={() => window.open("https://github.com/signup", "_blank")}
            >
              Sign Up
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileMenu;
