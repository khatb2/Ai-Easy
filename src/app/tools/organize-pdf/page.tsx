
"use client";

import React, { useState, useRef, useCallback, useContext, DragEvent } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, degrees } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { LanguageContext } from '@/context/language-context';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, RotateCw, Download, RefreshCw, Loader2, Layers } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

interface PageInfo {
  id: string; // Use a unique string for ID to handle new blank pages
  originalPageNumber?: number; // Keep track of the original page for copying
  thumbnail: string;
  rotation: number;
  isBlank: boolean;
}

export default function OrganizePdfPage() {
  const { t } = useContext(LanguageContext);
  const { toast } = useToast();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const idCounter = useRef(0); // Use a ref to maintain a counter for unique IDs

  const generateThumbnails = async (doc: pdfjsLib.PDFDocumentProxy) => {
    const thumbnails: string[] = [];
    const promises: Promise<void>[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
        promises.push((async () => {
            const page = await doc.getPage(i);
            const viewport = page.getViewport({ scale: 0.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
                await page.render({ canvasContext: context, viewport: viewport }).promise;
                thumbnails[i-1] = canvas.toDataURL();
            }
        })());
    }
    await Promise.all(promises);
    return thumbnails;
  };

  const generateBlankPageThumbnail = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 150;
    canvas.height = 212;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = '#e0e0e0';
      context.lineWidth = 2;
      context.setLineDash([5, 5]);
      context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
      context.setLineDash([]);
      context.fillStyle = '#999999';
      context.font = '14px Arial';
      context.textAlign = 'center';
      context.fillText('Blank Page', canvas.width / 2, canvas.height / 2);
    }
    return canvas.toDataURL();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setIsLoading(true);
      setPdfFile(file);
      const buffer = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument(buffer).promise;
      const thumbnails = await generateThumbnails(doc);
      const initialPages: PageInfo[] = thumbnails.map((thumbnail: string, i: number) => ({
        id: `page-${++idCounter.current}`,
        thumbnail,
        originalPageNumber: i + 1,
        rotation: 0,
        isBlank: false,
      }));
      setPages(initialPages);
      setIsLoading(false);
    } else {
        toast({
            title: t.splitPdfPage.error.invalidFileTitle,
            description: t.splitPdfPage.error.invalidFileDescription,
            variant: "destructive"
        })
    }
  };
  
  const triggerFileInput = () => fileInputRef.current?.click();

  const handleRestart = () => {
    setPdfFile(null);
    setPages([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const handleRemovePage = (id: string) => {
    setPages(prev => prev.filter(p => p.id !== id));
  };

  const handleRotatePage = (id: string) => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p));
  };
  
  const handleAddBlankPage = (index: number) => {
    const newBlankPage: PageInfo = {
        id: `blank-${++idCounter.current}`,
        thumbnail: generateBlankPageThumbnail(),
        rotation: 0,
        isBlank: true,
    };
    setPages(prev => {
        const newPages = [...prev];
        newPages.splice(index, 0, newBlankPage);
        return newPages;
    });
  };

  const handleDragStart = (_: DragEvent<HTMLDivElement>, index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (_: DragEvent<HTMLDivElement>, index: number) => {
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
  
  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, isEntering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(isEntering);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e, false);
    const droppedFile = e.dataTransfer.files?.[0];
     if (droppedFile && droppedFile.type === 'application/pdf') {
        const fakeEvent = { target: { files: [droppedFile] } } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleFileChange(fakeEvent);
     }
  };

  const handleDownload = async () => {
    if (!pdfFile || pages.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No pages to organize.',
      });
      return;
    }
    setIsProcessing(true);
    try {
      const organizedPdf = await PDFDocument.create();
      const sourcePdf = await PDFDocument.load(await pdfFile.arrayBuffer(), { ignoreEncryption: true });

      const copiedPagesMap = new Map<number, any>();

      for (const pageInfo of pages) {
        if (pageInfo.isBlank) {
            const [width, height] = [595.28, 841.89]; // A4 size
            const newPage = organizedPdf.addPage([width, height]);
            
            const isSideways = pageInfo.rotation % 180 !== 0;
            if (isSideways) {
                newPage.setSize(height, width);
            }
            newPage.setRotation(degrees(pageInfo.rotation));

        } else if (pageInfo.originalPageNumber) {
            if (!copiedPagesMap.has(pageInfo.originalPageNumber)) {
                 const [copiedPage] = await organizedPdf.copyPages(sourcePdf, [pageInfo.originalPageNumber - 1]);
                 copiedPagesMap.set(pageInfo.originalPageNumber, copiedPage);
            }
            const finalPage = organizedPdf.addPage(copiedPagesMap.get(pageInfo.originalPageNumber));
            finalPage.setRotation(degrees(pageInfo.rotation));
        }
      }

      const organizedPdfBytes = await organizedPdf.save();
      const arrayBuffer = new ArrayBuffer(organizedPdfBytes.length);
      const view = new Uint8Array(arrayBuffer);
      view.set(organizedPdfBytes);
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      saveAs(blob, `organized-${pdfFile.name}`);
    } catch (error) {
      console.error('Error organizing PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to organize PDF. The file might be corrupted or password-protected.',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const tool = t.tools.list.find(tool => tool.icon === 'Layers');

  if (!pdfFile) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main 
            className="flex-1 flex flex-col items-center justify-center text-center bg-white p-4"
            onDragEnter={(e: React.DragEvent<HTMLDivElement>) => handleDragEvents(e, true)}
            onDragLeave={(e: React.DragEvent<HTMLDivElement>) => handleDragEvents(e, false)}
            onDragOver={(e: React.DragEvent<HTMLDivElement>) => handleDragEvents(e, true)}
            onDrop={handleDrop}
        >
          <div className={cn("w-full max-w-2xl p-8 rounded-lg border-2 border-dashed transition-colors", isDragging ? 'border-primary bg-primary/10' : 'border-transparent')}>
            <h1 className="text-4xl font-bold">{tool?.title}</h1>
            <p className="mt-2 text-lg text-muted-foreground">{tool?.description}</p>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf" />
             { isLoading ? <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mt-8" /> : 
                <Button onClick={triggerFileInput} className="mt-8" style={{ width: '320px', height: '90px', fontSize: '1.25rem' }}>
                  {t.rotatePdfPage.selectButton}
                </Button>
            }
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="flex h-screen w-full flex-col bg-slate-50">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[350px] flex-shrink-0 border-r bg-slate-50 p-6 flex flex-col" style={{height: 'calc(100vh - 64px)'}}>
            <div className="flex-grow space-y-6">
                <h2 className="text-2xl font-bold border-b pb-4">{t.organizePdfPage.title}</h2>
                <p className="text-sm text-muted-foreground">{t.organizePdfPage.description}</p>
            </div>
            <div className="mt-auto flex flex-col gap-4">
                <Button onClick={handleDownload} size="lg" className="w-full gap-2" disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="animate-spin" /> : <Layers />} {t.organizePdfPage.button}
                </Button>
                <Button onClick={handleRestart} variant="outline" className="w-full gap-2">
                    <RefreshCw /> {t.mergePdfPage.restartButton}
                </Button>
            </div>
        </aside>
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-white">
            <h1 className="text-3xl font-bold text-center mb-2">{tool?.title}</h1>
            <p className="text-muted-foreground text-center mb-8">{tool?.description}</p>
            <div 
              className="flex flex-wrap justify-center gap-x-2 gap-y-6"
              onDragEnter={(e) => handleDragEvents(e, true)}
              onDragLeave={(e) => handleDragEvents(e, false)}
              onDragOver={(e) => handleDragEvents(e, true)}
              onDrop={handleDrop}
            >
                {pages.map((page, index) => (
                    <div key={page.id} className="group/container relative flex items-center">
                        <div 
                            className="relative group/page cursor-move rounded-lg bg-white p-2 shadow-md transition-shadow hover:shadow-xl border"
                            draggable 
                            onDragStart={(e) => handleDragStart(e, index)} 
                            onDragEnter={(e) => handleDragEnter(e, index)} 
                            onDragEnd={handleDragEnd} 
                            onDragOver={(e) => e.preventDefault()}
                        >
                            <div className="w-[150px] h-[212px] flex items-center justify-center bg-gray-100 rounded-md overflow-hidden mb-2">
                                <img 
                                    src={page.thumbnail} 
                                    alt={`Page ${page.originalPageNumber || 'New'}`} 
                                    className="max-h-full max-w-full object-contain transition-transform duration-300" 
                                    style={{ 
                                      transform: `rotate(${page.rotation}deg) scale(${page.rotation % 180 !== 0 ? 0.707 : 1})`,
                                    }}
                                />
                            </div>
                            <p className="text-center text-xs text-muted-foreground">
                            {page.isBlank ? t.organizePdfPage.blankPage : `${t.addPageNumbersPage.pageLabel.replace('{id}', String(page.originalPageNumber))}`}
                            </p>
                            <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover/page:opacity-100 transition-opacity">
                                <Button size="icon" variant="destructive" className="h-6 w-6" onClick={() => handleRemovePage(page.id)}>
                                    <Trash2 size={12} />
                                </Button>
                                <Button size="icon" className="h-6 w-6" onClick={() => handleRotatePage(page.id)}>
                                    <RotateCw size={12} />
                                </Button>
                            </div>
                        </div>

                        <div className="relative h-full w-8 mx-1 flex items-center justify-center opacity-0 group-hover/container:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="rounded-full h-8 w-8 z-10 bg-blue-500 hover:bg-blue-600 text-white" onClick={() => handleAddBlankPage(index + 1)}>
                            <PlusCircle size={20}/>
                        </Button>
                        </div>
                    </div>
                ))}
            </div>
        </main>
      </div>
    </div>
  );
}

    