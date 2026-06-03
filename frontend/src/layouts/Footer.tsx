import React from "react";
import { PageType } from "../types";

interface FooterProps {
  onNavigate: (page: PageType) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="bg-surface-container-lowest border-t border-outline-variant/30 py-12 mt-auto">
      <div className="flex flex-col md:flex-row justify-between items-center px-6 sm:px-8 max-w-[1200px] mx-auto gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          {/* Logo */}
          <button
            onClick={() => onNavigate("dashboard")}
            className="font-serif text-3xl text-primary font-bold tracking-tight hover:brightness-110 active:scale-98 transition-all cursor-pointer"
          >
            GrandStride
          </button>
          <p className="font-sans text-xs text-on-tertiary-container/80 text-center md:text-left">
            © {new Date().getFullYear()} GrandStride. All rights reserved. Built
            for champions.
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              alert("Terms of Service: Mock Document");
            }}
            className="text-xs text-on-tertiary-container hover:text-secondary hover:underline transition-colors duration-300"
          >
            Terms of Service
          </a>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              alert("Privacy Policy: Mock Document");
            }}
            className="text-xs text-on-tertiary-container hover:text-secondary hover:underline transition-colors duration-300"
          >
            Privacy Policy
          </a>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              alert("For support, contact support@grandstride.com");
            }}
            className="text-xs text-on-tertiary-container hover:text-secondary hover:underline transition-colors duration-300"
          >
            Contact Support
          </a>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              alert("Official racing guidelines & weights apply.");
            }}
            className="text-xs text-on-tertiary-container hover:text-secondary hover:underline transition-colors duration-300"
          >
            Race Rules
          </a>
        </nav>
      </div>
    </footer>
  );
}
