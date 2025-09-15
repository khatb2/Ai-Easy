"use client";

import Link from "next/link";
import { useContext, useState, useEffect } from "react";
import { FileStack } from "lucide-react";
import { LanguageContext } from "@/context/language-context";

export function Footer() {
  const { t } = useContext(LanguageContext);
  const [currentYear, setCurrentYear] = useState<number>(2024); // Default to 2024 to avoid hydration mismatch
  
  useEffect(() => {
    // Set the current year on the client side to avoid hydration mismatch
    setCurrentYear(new Date().getFullYear());
  }, []);
  
  return (
    <footer id="about" className="border-t py-10">
      <div className="container flex flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold">{t.appName}</p>
           <FileStack className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">
          &copy; {currentYear} {t.footer.copyright.replace('{appName}', t.appName)}
        </p>
        <div className="flex items-center gap-4">
          <Link href="/help" className="text-sm text-muted-foreground hover:underline">{t.footer.help}</Link>
          <Link href="/terms" className="text-sm text-muted-foreground hover:underline">{t.footer.terms}</Link>
          <Link href="/privacy" className="text-sm text-muted-foreground hover:underline">{t.footer.privacy}</Link>
        </div>
      </div>
    </footer>
  );
}