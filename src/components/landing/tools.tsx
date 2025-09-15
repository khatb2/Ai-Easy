
"use client";

import React, { useMemo, useContext } from "react";
import Link from "next/link";
import {
  FileImage,
  FileSliders,
  ListOrdered,
  FileLock2,
  FileMinus2,
  Scissors,
  Merge,
  FileOutput,
  ImageDown,
  FileText,
  RotateCw,
  FileKey2,
  Stamp,
  ImageIcon,
  Images,
  ScanText,
  Shrink,
  Crop,
  FileEdit,
  ClipboardType,
  Layers,
  Calculator,
  Aperture,
  Languages,
  PenSquare,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LanguageContext } from "@/context/language-context";

const iconMap: { [key: string]: React.ElementType } = {
  FileSliders,
  ListOrdered,
  FileLock2,
  FileMinus2,
  Scissors,
  Merge,
  FileOutput,
  ImageDown,
  FileText,
  RotateCw,
  FileKey2,
  Stamp,
  ImageIcon,
  FileImage,
  Images,
  ScanText,
  Shrink,
  Crop,
  FileEdit,
  ClipboardType,
  Layers,
  Calculator,
  Aperture,
  Languages,
  PenSquare,
};

export function Tools({ activeFilter }: { activeFilter: string }) {
  const { t } = useContext(LanguageContext);

  const toolsData = useMemo(() => t.tools.list.sort((a, b) => a.title.localeCompare(b.title)), [t]);

  const filteredTools = useMemo(() => {
    if (activeFilter === 'all') {
      return toolsData;
    }
    return toolsData.filter(tool => tool.category === activeFilter);
  }, [toolsData, activeFilter]);

  const getLinkForTool = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('rotate')) return '/tools/rotate-pdf';
    if (lowerTitle.includes('image to pdf')) return '/tools/image-to-pdf';
    if (lowerTitle.includes('jpg to pdf')) return '/tools/jpg-to-pdf';
    if (lowerTitle.includes('png to pdf')) return '/tools/png-to-pdf';
    if (lowerTitle.includes('pdf to jpg')) return '/tools/pdf-to-jpg';
    if (lowerTitle.includes('add page numbers')) return '/tools/add-page-numbers';
    if (lowerTitle.includes('remove pages')) return '/tools/remove-pages';
    if (lowerTitle.includes('extract text')) return '/tools/extract-text';
    if (lowerTitle.includes('extract pages')) return '/tools/extract-pages';
    if (lowerTitle.includes('ocr')) return '/tools/pdf-ocr';
    if (lowerTitle.includes('split pdf')) return '/tools/split-pdf';
    if (lowerTitle.includes('merge pdf')) return '/tools/merge-pdf';
    if (lowerTitle.includes('compress pdf')) return '/tools/compress-pdf';
    if (lowerTitle.includes('organize pdf')) return '/tools/organize-pdf';
    if (lowerTitle.includes('crop pdf')) return '/tools/crop-pdf';
    if (lowerTitle.includes('translate pdf')) return '/tools/translate-pdf';
    if (lowerTitle.includes('word counter')) return '/tools/word-counter';
    if (lowerTitle.includes('compress image')) return '/tools/compress-image';
    if (lowerTitle.includes('blur image')) return '/tools/blur-image';
    
    if (title === 'تدوير PDF') return '/tools/rotate-pdf';
    if (title === 'تحويل صورة إلى PDF') return '/tools/image-to-pdf';
    if (title === 'تحويل JPG إلى PDF') return '/tools/jpg-to-pdf';
    if (title === 'تحويل PNG إلى PDF') return '/tools/png-to-pdf';
    if (title === 'تحويل PDF إلى JPG') return '/tools/pdf-to-jpg';
    if (title === 'إضافة أرقام الصفحات') return '/tools/add-page-numbers';
    if (title === 'إزالة الصفحات') return '/tools/remove-pages';
    if (title === 'استخراج النص') return '/tools/extract-text';
    if (title === 'استخراج الصفحات') return '/tools/extract-pages';
    if (title === 'التعرف الضوئي على الحروف في PDF') return '/tools/pdf-ocr';
    if (title === 'تقسيم PDF') return '/tools/split-pdf';
    if (title === 'دمج PDF') return '/tools/merge-pdf';
    if (title === 'ضغط PDF') return '/tools/compress-pdf';
    if (title === 'تنظيم PDF') return '/tools/organize-pdf';
    if (title === 'قص PDF') return '/tools/crop-pdf';
    if (title === 'ترجمة PDF') return '/tools/translate-pdf';
    if (title === 'عدّاد الكلمات') return '/tools/word-counter';
    if (title === 'ضغط الصور') return '/tools/compress-image';
    if (title === 'طمس الصورة') return '/tools/blur-image';

    return '#';
  };

  return (
    <section id="tools" className="container pb-12 sm:pb-24 -mt-16">
      <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 justify-items-center" style={{ gap: '25px' }}>
        {filteredTools.map((tool) => {
          const Icon = iconMap[tool.icon] || FileImage;
          const link = getLinkForTool(tool.title);

          return (
            <Link key={tool.title} href={link} className="group block w-full max-w-[320px]">
                <Card className="flex h-[285px] transform flex-col justify-between overflow-hidden rounded-xl bg-card shadow-lg transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl">
                    <CardHeader className="flex-grow p-6 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                         <Icon className="h-8 w-8 text-gray-700" />
                      </div>
                      <CardTitle className="text-xl font-bold text-card-foreground">{tool.title}</CardTitle>
                      <CardDescription className="mt-2 text-base leading-relaxed">{tool.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <Button tabIndex={-1} className="w-full rounded-lg bg-primary py-3 text-lg font-semibold text-white transition-colors duration-300 hover:bg-primary/90">
                        {t.tools.buttonText}
                      </Button>
                    </CardContent>
                </Card>
            </Link>
          )
        })}
      </div>

      {filteredTools.length === 0 && (
        <p className="mt-12 text-center text-muted-foreground">{t.tools.noResults}</p>
      )}
    </section>
  );
}
