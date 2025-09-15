
"use client";

import React, { useState, useRef, useCallback, useContext, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { Button } from '@/components/ui/button';
import { Download, CornerDownLeft, Trash2, PanelLeft, CheckSquare, Square } from 'lucide-react';
import { LanguageContext } from '@/context/language-context';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

interface PageInfo {
  id: number;
  thumbnail: string;
}

export default function RemovePagesPage() {
  const { t } = useContext(LanguageContext);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [pagesToRemove, setPagesToRemove] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lastSelected, setLastSelected] = useState<number | null>(null);
  const [pagesToRemoveInput, setPagesToRemoveInput] = useState('');

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      await renderPdfToThumbnails(file);
    }
  };

  const updateInputFromSet = (pageSet: Set<number>) => {
      const sortedRanges = Array.from(pageSet).sort((a, b) => a - b);
      setPagesToRemoveInput(sortedRanges.join(', '));
  };
  
  const updateSetFromInput = (inputStr: string) => {
      const newSet = new Set<number>();
      const parts = inputStr.split(/[, ]+/);
      parts.forEach(part => {
          if (part.includes('-')) {
              const [start, end] = part.split('-').map(Number);
              if (!isNaN(start) && !isNaN(end)) {
                  for (let i = start; i <= end; i++) {
                      if (i > 0 && i <= pages.length) newSet.add(i);
                  }
              }
          } else {
              const num = Number(part);
              if (!isNaN(num) && num > 0 && num <= pages.length) newSet.add(num);
          }
      });
      setPagesToRemove(newSet);
  };
  
  useEffect(() => {
    updateInputFromSet(pagesToRemove);
  }, [pagesToRemove]);

  const renderPdfToThumbnails = useCallback(async (file: File) => {
    setIsLoading(true);
    setPages([]);
    setPagesToRemove(new Set());
    const fileReader = new FileReader();
    fileReader.onload = async () => {
      try {
        const typedArray = new Uint8Array(fileReader.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument(typedArray).promise;
        const renderedPages: PageInfo[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          if (context) {
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            renderedPages.push({ id: i, thumbnail: canvas.toDataURL('image/jpeg', 0.8) });
          }
        }
        setPages(renderedPages);
      } catch (error) {
        console.error('Error rendering PDF:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fileReader.readAsArrayBuffer(file);
  }, []);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleRestart = () => {
    setPdfFile(null);
    setPages([]);
    setPagesToRemove(new Set());
    setPagesToRemoveInput('');
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePageClick = (pageId: number, isShiftClick: boolean) => {
    const newSelection = new Set(pagesToRemove);
    if (isShiftClick && lastSelected !== null) {
      const start = Math.min(lastSelected, pageId);
      const end = Math.max(lastSelected, pageId);
      const isSelecting = !newSelection.has(pageId); 
      for (let i = start; i <= end; i++) {
        if (isSelecting) {
          newSelection.add(i);
        } else {
          newSelection.delete(i);
        }
      }
    } else {
       if (newSelection.has(pageId)) {
        newSelection.delete(pageId);
      } else {
        newSelection.add(pageId);
      }
    }
    setLastSelected(pageId);
    setPagesToRemove(newSelection);
  };

  const handleSelectAll = () => {
    if (pagesToRemove.size === pages.length) {
      setPagesToRemove(new Set());
    } else {
      setPagesToRemove(new Set(pages.map(p => p.id)));
    }
  }

  const handleDownload = async () => {
    if (!pdfFile || pagesToRemove.size === 0) return;
    setIsLoading(true);

    try {
        const existingPdfBytes = await pdfFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(existingPdfBytes);

        const pagesToDelete = Array.from(pagesToRemove).sort((a,b) => b-a);
        pagesToDelete.forEach(pageNum => {
            pdfDoc.removePage(pageNum - 1);
        });

        const pdfBytes = await pdfDoc.save();
        const arrayBuffer = new ArrayBuffer(pdfBytes.length);
        const view = new Uint8Array(arrayBuffer);
        view.set(pdfBytes);
        saveAs(new Blob([arrayBuffer], { type: 'application/pdf' }), `edited-${pdfFile.name}`);

    } catch (error) {
        console.error('Error removing pages:', error);
    } finally {
        setIsLoading(false);
    }
  };
  
  const toolTitle = t.tools.list.find(tool => tool.title === 'Remove Pages' || tool.title === 'إزالة الصفحات')?.title;

  if (!pdfFile) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center bg-white text-center">
          <h1 className="text-4xl font-bold">{toolTitle}</h1>
          <p className="mt-2 text-lg text-muted-foreground">{t.tools.list.find(tool => tool.title === 'Remove Pages' || tool.title === 'إزالة الصفحات')?.description}</p>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf" />
          <Button onClick={triggerFileInput} className="mt-8" style={{ width: '320px', height: '90px', fontSize: '1.25rem' }}>
            {t.rotatePdfPage.selectButton}
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col gap-4 p-6">
      <h2 className="text-2xl font-bold">{toolTitle}</h2>
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Click on pages to remove from document. You can use "shift" key to set ranges.</p>
            <p className="font-medium">Total pages: {pages.length}</p>
            <div className="space-y-2">
                <Label htmlFor="pages-to-remove">Pages to remove:</Label>
                <Input id="pages-to-remove" value={pagesToRemoveInput} onChange={(e) => {
                    setPagesToRemoveInput(e.target.value);
                    updateSetFromInput(e.target.value);
                }} placeholder="e.g. 1-3, 5, 8" />
            </div>
             <Button variant="outline" onClick={handleSelectAll} className="w-full justify-start gap-2">
                {pagesToRemove.size === pages.length ? <CheckSquare /> : <Square />}
                {pagesToRemove.size === pages.length ? "Deselect All" : "Select All"}
             </Button>
        </div>
      <div className="mt-auto flex flex-col gap-3">
        <Button onClick={handleDownload} size="lg" className="gap-2" disabled={isLoading || pagesToRemove.size === 0}>
          {isLoading ? t.jpgToPdfPage.loading : <><Trash2 /> {`Remove ${pagesToRemove.size} page(s)`}</>}
        </Button>
        <Button onClick={handleRestart} variant="secondary" className="gap-2"><CornerDownLeft /> {t.jpgToPdfPage.restartButton}</Button>
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
                 <h1 className="text-xl font-semibold sm:text-2xl">{toolTitle}</h1>
            </div>

            {isLoading && pages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">{t.addPageNumbersPage.loading}</div>
            ) : (
              <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {pages.map(page => (
                  <div key={page.id} className="relative group cursor-pointer" onClick={(e) => handlePageClick(page.id, e.shiftKey)}>
                    <div className={`overflow-hidden rounded-lg border-2 bg-white shadow-md transition-all duration-300 ${pagesToRemove.has(page.id) ? 'border-red-500' : 'border-transparent'}`}>
                        <div className="w-full h-full flex items-center justify-center p-2 relative">
                            <img src={page.thumbnail} alt={`Page ${page.id}`} className={`max-h-full max-w-full object-contain ${pagesToRemove.has(page.id) ? 'opacity-50' : ''}`} />
                            {pagesToRemove.has(page.id) && (
                                <div className="absolute inset-0 flex items-center justify-center bg-red-500 bg-opacity-50">
                                    <Trash2 className="h-12 w-12 text-white" />
                                </div>
                            )}
                        </div>
                    </div>
                    <p className="text-center mt-1 text-sm font-medium">{t.addPageNumbersPage.pageLabel.replace('{id}', String(page.id))}</p>
                  </div>
                ))}
              </div>
            )}
        </main>
      </div>
    </div>
  );
}

    