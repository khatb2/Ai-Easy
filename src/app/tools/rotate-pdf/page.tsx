
"use client";

import React, { useState, useRef, useCallback, useContext } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, degrees } from 'pdf-lib';
import { Button } from '@/components/ui/button';
import { RotateCcw, RotateCw, Download, Square, CheckSquare, CornerDownLeft, RefreshCw, PanelLeft } from 'lucide-react';
import { LanguageContext } from '@/context/language-context';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

interface Page {
  id: number;
  rotation: number;
  thumbnail: string;
}

export default function RotatePdfPage() {
  const { t } = useContext(LanguageContext);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      await renderPdf(file);
    }
  };

  const renderPdf = useCallback(async (file: File) => {
    setIsLoading(true);
    const fileReader = new FileReader();
    fileReader.onload = async () => {
      try {
        const typedArray = new Uint8Array(fileReader.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument(typedArray).promise;
        const renderedPages: Page[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          if(context){
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            renderedPages.push({
              id: i,
              rotation: page.rotate,
              thumbnail: canvas.toDataURL(),
            });
          }
        }
        setPages(renderedPages);
        setSelectedPages(new Set(renderedPages.map(p => p.id)));
      } catch (error) {
        console.error('Error rendering PDF:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fileReader.readAsArrayBuffer(file);
  }, []);

  const togglePageSelection = (pageId: number) => {
    setSelectedPages(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(pageId)) {
        newSelection.delete(pageId);
      } else {
        newSelection.add(pageId);
      }
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    if (selectedPages.size === pages.length) {
      setSelectedPages(new Set());
    } else {
      setSelectedPages(new Set(pages.map(p => p.id)));
    }
  };

  const rotateSelectedPages = (angle: number) => {
    setPages(prevPages =>
      prevPages.map(page =>
        selectedPages.has(page.id)
          ? { ...page, rotation: (page.rotation + 360 + angle) % 360 }
          : page
      )
    );
  };

  const handleRestart = () => {
    setPdfFile(null);
    setPages([]);
    setSelectedPages(new Set());
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDownload = async () => {
    if (!pdfFile) return;

    setIsLoading(true);
    try {
      const existingPdfBytes = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      
      pages.forEach(pageInfo => {
        const page = pdfDoc.getPage(pageInfo.id - 1);
        page.setRotation(degrees(pageInfo.rotation));
      });

      const pdfBytes = await pdfDoc.save();
      const arrayBuffer = new ArrayBuffer(pdfBytes.length);
      const view = new Uint8Array(arrayBuffer);
      view.set(pdfBytes);
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `rotated-${pdfFile.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error during PDF download:', error);
      alert('Failed to download rotated PDF.');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  if (!pdfFile) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center bg-white text-center">
            <h1 className="text-4xl font-bold">{t.rotatePdfPage.title}</h1>
            <p className="mt-2 text-lg text-muted-foreground">{t.rotatePdfPage.subtitle}</p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="application/pdf"
            />
            <Button
              onClick={triggerFileInput}
              className="mt-8"
              style={{ width: '320px', height: '90px', fontSize: '1.25rem' }}
            >
              {t.rotatePdfPage.selectButton}
            </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const SidebarContent = () => (
      <div className="flex h-full flex-col gap-4 p-6">
        <h2 className="text-2xl font-bold">{t.rotatePdfPage.optionsTitle}</h2>
        <div className="flex flex-col gap-3">
            <Button variant="outline" onClick={handleSelectAll} className="justify-start gap-2">
            {selectedPages.size === pages.length ? <CheckSquare /> : <Square />}
            {selectedPages.size === pages.length ? t.rotatePdfPage.deselectAll : t.rotatePdfPage.selectAll}
            </Button>
            <Button variant="outline" onClick={() => rotateSelectedPages(90)} className="justify-start gap-2"><RotateCw /> {t.rotatePdfPage.rotate90}</Button>
            <Button variant="outline" onClick={() => rotateSelectedPages(180)} className="justify-start gap-2"><RefreshCw /> {t.rotatePdfPage.rotate180}</Button>
            <Button variant="outline" onClick={() => rotateSelectedPages(270)} className="justify-start gap-2"><RotateCcw /> {t.rotatePdfPage.rotate270}</Button>
        </div>
        <div className="mt-auto flex flex-col gap-3">
          <Button onClick={handleDownload} size="lg" className="gap-2" disabled={isLoading}>
            {isLoading ? t.rotatePdfPage.loading : <><Download /> {t.rotatePdfPage.downloadButton}</>}
          </Button>
          <Button onClick={handleRestart} variant="secondary" className="gap-2"><CornerDownLeft /> {t.rotatePdfPage.restartButton}</Button>
        </div>
      </div>
  );

  return (
    <div className="flex min-h-screen w-full flex-col">
        <Header />
        <div className="flex flex-1">
            <aside className="hidden lg:flex lg:w-80 xl:w-96">
                <div className="fixed top-14 h-[calc(100vh-56px)] w-80 border-r xl:w-96">
                    <SidebarContent />
                </div>
            </aside>
            <main className="flex-1 p-4 lg:p-8">
                <div className="flex items-center gap-4 pb-4">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="lg:hidden">
                                <PanelLeft />
                                <span className="sr-only">Toggle sidebar</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-80 p-0">
                            <SidebarContent />
                        </SheetContent>
                    </Sheet>
                    <h1 className="text-xl font-semibold sm:text-2xl">{t.rotatePdfPage.title}</h1>
                </div>

                {isLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <p>{t.rotatePdfPage.loading}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {pages.map(page => (
                      <div
                        key={page.id}
                        onClick={() => togglePageSelection(page.id)}
                        className={`relative cursor-pointer rounded-lg border-2 p-1 transition-all ${selectedPages.has(page.id) ? 'border-primary' : 'border-transparent'}`}
                      >
                        <div className="overflow-hidden rounded-md bg-white shadow">
                            <img
                            src={page.thumbnail}
                            alt={`Page ${page.id}`}
                            className="h-full w-full object-contain transition-transform duration-300 ease-in-out"
                            style={{ transform: `rotate(${page.rotation}deg)` }}
                            />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 transition-opacity hover:opacity-100">
                            <p className="text-lg font-bold text-white">{t.rotatePdfPage.pageLabel.replace('{id}', String(page.id))}</p>
                        </div>
                         {selectedPages.has(page.id) && (
                            <div className="absolute right-2 top-2 rounded-full bg-primary p-1 text-white">
                                <CheckSquare size={20} />
                            </div>
                         )}
                      </div>
                    ))}
                  </div>
                )}
            </main>
        </div>
    </div>
  );
}

    