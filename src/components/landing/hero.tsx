
"use client";

import { useContext } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { LanguageContext } from '@/context/language-context';
import { TypewriterEffect } from "@/components/typewriter-effect";

export function Hero() {
  const { t } = useContext(LanguageContext);

  const typewriterStrings = [
    t.hero.typewriter.text1,
    t.hero.typewriter.text2,
    t.hero.typewriter.text3,
    t.hero.typewriter.text4,
    t.hero.typewriter.text5,
    t.hero.typewriter.text6,
  ];

  return (
    <section className="relative overflow-hidden bg-background py-24 sm:py-32">
      <div
        aria-hidden="true"
        className="absolute inset-0 grid grid-cols-2 -space-x-52 opacity-40 dark:opacity-20"
      >
        <div className="h-56 bg-gradient-to-br from-primary to-purple-400 blur-[106px] dark:from-blue-700"></div>
        <div className="h-32 bg-gradient-to-r from-cyan-400 to-sky-300 blur-[106px] dark:to-indigo-600"></div>
      </div>
      <div className="container relative text-center">
        <h1 className="text-4xl font-bold tracking-tighter text-foreground sm:text-5xl md:text-6xl">
          {t.hero.title}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          {t.hero.subtitle}
        </p>
        <div className="mt-10 mb-8">
            <TypewriterEffect strings={typewriterStrings} />
        </div>
        <div className="mt-10">
          <Button asChild size="lg">
            <a href="#tools">{t.hero.cta}</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
