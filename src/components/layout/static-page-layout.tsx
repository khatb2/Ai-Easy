
"use client";

import { useContext } from 'react';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { LanguageContext } from '@/context/language-context';

type StaticPageLayoutProps = {
  titleKey: string;
  contentKey: string;
};

export function StaticPageLayout({ titleKey, contentKey }: { titleKey: any, contentKey: any }) {
  const { t } = useContext(LanguageContext);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container py-12 sm:py-16">
          <article className="prose dark:prose-invert mx-auto max-w-3xl">
            <h1>{(t as any)[titleKey]?.title || ""}</h1>
            <p>{(t as any)[contentKey]?.content || ""}</p>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}
