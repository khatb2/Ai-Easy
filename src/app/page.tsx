"use client";

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/landing/hero";
import { Tools } from "@/components-v2/landing-page/tools";

function HomeComponent() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Tools />
      </main>
      <Footer />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeComponent />
    </Suspense>
  );
}
