
"use client";

import React, { useState, useRef, useCallback, useContext, DragEvent } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { Button } from '@/components/ui/button';
import { Download, CornerDownLeft, CheckSquare, Square, Trash2, RotateCw, PanelLeft } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { LanguageContext } from '@/context/language-context';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

interface PageInfo {
  id: number;
  thumbnail: string;
  rotation: number;
}

type Quality = 'normal' | 'high';

export default function PdfToJpgPage() {
  const { t } = useContext(LanguageContext);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [quality, setQuality] = useState<Quality>('normal');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      await renderPdfToThumbnails(file);
    }
  };

  const renderPdfToThumbnails = useCallback(async (file: File) => {
    setIsLoading(true);
    setPages([]);
    setSelectedPages(new Set());
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
            renderedPages.push({
              id: i,
              thumbnail: canvas.toDataURL('image/jpeg', 0.8),
              rotation: 0,
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

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleRestart = () => {
    setPdfFile(null);
    setPages([]);
    setSelectedPages(new Set());
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
  
  const handleRemovePage = (id: number) => {
      setPages(prev => prev.filter(p => p.id !== id));
      setSelectedPages(prev => {
          const newSelection = new Set(prev);
          newSelection.delete(id);
          return newSelection;
      });
  }
  
  const handleRotatePage = (id: number) => {
      setPages(prev => prev.map(p => p.id === id ? {...p, rotation: (p.rotation + 90) % 360} : p));
  }

  const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    dragItem.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>, index: number) => {
    dragOverItem.current = index;
    const list = [...pages];
    const draggedItemContent = list[dragItem.current!];
    if (!draggedItemContent) return;
    list.splice(dragItem.current!, 1);
    list.splice(dragOverItem.current!, 0, draggedItemContent);
    dragItem.current = dragOverItem.current;
    setPages(list);
  };

  const handleDragEnd = () => {
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleDownload = async () => {
    if (!pdfFile || selectedPages.size === 0) return;
    setIsLoading(true);

    try {
        const zip = new JSZip();
        const typedArray = new Uint8Array(await pdfFile.arrayBuffer());
        const pdf = await pdfjsLib.getDocument(typedArray).promise;
        const imageQuality = quality === 'high' ? 1.0 : 0.8;

        for (const pageInfo of pages) {
            if (!selectedPages.has(pageInfo.id)) continue;

            const page = await pdf.getPage(pageInfo.id);
            const viewport = page.getViewport({ scale: 2.0, rotation: pageInfo.rotation });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
              await page.render({ canvasContext: context, viewport: viewport }).promise;
              const imageDataUrl = canvas.toDataURL('image/jpeg', imageQuality);
              const base64Data = imageDataUrl.substring(imageDataUrl.indexOf(',') + 1);
              zip.file(`${pdfFile.name.replace(/\.[^/.]+$/, "")}_page_${pageInfo.id}.jpg`, base64Data, { base64: true });
            }
        }
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, 'converted_images.zip');

    } catch (error) {
      console.error('Error converting PDF to JPG:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!pdfFile) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center bg-white text-center">
          <h1 className="text-4xl font-bold">{t.pdfToJpgPage.title}</h1>
          <p className="mt-2 text-lg text-muted-foreground">{t.pdfToJpgPage.subtitle}</p>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf" />
          <Button onClick={triggerFileInput} className="mt-8" style={{ width: '320px', height: '90px', fontSize: '1.25rem' }}>
            {t.pdfToJpgPage.selectButton}
          </Button>
        </main>
        <Footer />
      </div>
    );
  }
  
  const SidebarContent = () => (
      <div className="flex h-full flex-col gap-4 p-6">
          <h2 className="text-2xl font-bold">{t.pdfToJpgPage.optionsTitle}</h2>
          <div className="space-y-4">
            <div>
              <Label>{t.pdfToJpgPage.quality}</Label>
              <RadioGroup value={quality} onValueChange={(v) => setQuality(v as Quality)} className="flex gap-4 mt-2">
                <div className="flex items-center space-x-2"><RadioGroupItem value="normal" id="normal" /><Label htmlFor="normal">{t.pdfToJpgPage.normal}</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="high" id="high" /><Label htmlFor="high">{t.pdfToJpgPage.high}</Label></div>
              </RadioGroup>
            </div>
            <Button variant="outline" onClick={handleSelectAll} className="w-full justify-start gap-2">
                {selectedPages.size === pages.length ? <CheckSquare /> : <Square />}
                {selectedPages.size === pages.length ? t.pdfToJpgPage.deselectAll : t.pdfToJpgPage.selectAll}
            </Button>
          </div>
          <div className="mt-auto flex flex-col gap-3">
            <Button onClick={handleDownload} size="lg" className="gap-2" disabled={isLoading || selectedPages.size === 0}>
              {isLoading ? t.pdfToJpgPage.loading : <><Download /> {t.pdfToJpgPage.downloadButton}</>}
            </Button>
            <Button onClick={handleRestart} variant="secondary" className="gap-2"><CornerDownLeft /> {t.pdfToJpgPage.restartButton}</Button>
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
                <h1 className="text-xl font-semibold sm:text-2xl">{t.pdfToJpgPage.title}</h1>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {pages.map((page, index) => (
                <div key={page.id} className="relative group cursor-move" draggable onDragStart={(e) => handleDragStart(e, index)} onDragEnter={(e) => handleDragEnter(e, index)} onDragEnd={handleDragEnd} onDragOver={(e) => e.preventDefault()}>
                  <div className={`overflow-hidden rounded-lg border-2 bg-white shadow-md transition-all duration-300 ${selectedPages.has(page.id) ? 'border-primary' : 'border-transparent'}`} onClick={() => togglePageSelection(page.id)}>
                    <div className="w-full h-48 flex items-center justify-center p-2">
                      <img src={page.thumbnail} alt={`Page ${page.id}`} className="max-h-full max-w-full object-contain transition-transform duration-300 ease-in-out" style={{ transform: `rotate(${page.rotation}deg)` }} />
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="destructive" onClick={(e) => { e.stopPropagation(); handleRemovePage(page.id); }}><Trash2 size={16} /></Button>
                    <Button size="icon" onClick={(e) => { e.stopPropagation(); handleRotatePage(page.id); }}><RotateCw size={16} /></Button>
                  </div>
                  <div className="absolute top-2 left-2 pointer-events-none">
                      <CheckSquare size={24} className={`text-primary transition-opacity ${selectedPages.has(page.id) ? 'opacity-100' : 'opacity-0'}`} />
                  </div>
                   <p className="text-center mt-1 text-sm font-medium">{t.pdfToJpgPage.pageLabel.replace('{id}', String(page.id))}</p>
                </div>
              ))}
            </div>
        </main>
      </div>
    </div>
  );
}

    