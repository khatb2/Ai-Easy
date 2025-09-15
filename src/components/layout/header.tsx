
"use client";

import Link from "next/link";
import { useContext } from "react";
import { FileStack } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LanguageContext } from "@/context/language-context";
import { Button } from "@/components/ui/button";

export function Header() {
  const { t } = useContext(LanguageContext);

  const navLinks = [
    { href: "/", label: t.header.home },
    { href: "/#tools", label: t.header.tools },
    { href: "/#about", label: t.header.about },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex flex-1 items-center justify-start gap-x-2">
          <Link href="/" className="flex items-center gap-x-2">
            <FileStack className="h-6 w-6 text-primary" />
            <span className="font-bold">{t.appName}</span>
          </Link>
        </div>
        <nav className="hidden flex-1 items-center justify-center gap-6 text-sm md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-foreground/60 transition-colors hover:text-foreground/80"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-1 items-center justify-end">
           <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
