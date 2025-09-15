
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
import { PlusCircle, Trash2, Download, RefreshCw, Upload, Loader2, Merge, RotateCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

interface PdfFile {
  id: number;
  file: File;
  preview: string;
  pageCount: number;
  rotation: number;
}

export default function MergePdfPage() {
  const { t } = useContext(LanguageContext);
  const { toast } = useToast();
  const [pdfFiles, setPdfFiles] = useState<PdfFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const idCounter = useRef(0); // Use a ref to maintain a counter for unique IDs

  const generateThumbnail = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const doc = await pdfjsLib.getDocument(buffer).promise;
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 0.5 }); // Scale down for thumbnail
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (context) {
      await page.render({ canvasContext: context, viewport }).promise;
      return { preview: canvas.toDataURL(), pageCount: doc.numPages };
    }
    return { preview: '', pageCount: 0 };
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setIsLoading(true);
      const newPdfFilesPromises = Array.from(files)
        .filter(file => file.type === 'application/pdf')
        .map(async (file, index) => {
          const { preview, pageCount } = await generateThumbnail(file);
          return {
            id: ++idCounter.current, // Use counter instead of Date.now()
            file,
            preview,
            pageCount,
            rotation: 0,
          };
        });
      const newPdfFiles = await Promise.all(newPdfFilesPromises);
      setPdfFiles(prev => [...prev, ...newPdfFiles]);
      setIsLoading(false);
    }
  };
  
  const triggerFileInput = () => fileInputRef.current?.click();

  const handleRestart = () => {
    setPdfFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveFile = (id: number) => {
    setPdfFiles(prev => prev.filter(pdf => pdf.id !== id));
  };

  const handleRotateFile = (id: number) => {
    setPdfFiles(prev => prev.map(pdf => pdf.id === id ? { ...pdf, rotation: (pdf.rotation + 90) % 360 } : pdf));
  };
  
  const handleDragStart = (_: DragEvent<HTMLDivElement>, index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (_: DragEvent<HTMLDivElement>, index: number) => {
    dragOverItem.current = index;
    const list = [...pdfFiles];
    const draggedItemContent = list[dragItem.current!];
    if (!draggedItemContent) return;
    list.splice(dragItem.current!, 1);
    list.splice(dragOverItem.current!, 0, draggedItemContent);
    dragItem.current = dragOverItem.current;
    setPdfFiles(list);
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
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e, false);
    const files = e.dataTransfer.files;
    if (files) {
      setIsLoading(true);
      const newPdfFilesPromises = Array.from(files)
        .filter(file => file.type === 'application/pdf')
        .map(async (file, index) => {
          const { preview, pageCount } = await generateThumbnail(file);
          return {
            id: ++idCounter.current, // Use counter instead of Date.now()
            file,
            preview,
            pageCount,
            rotation: 0
          };
        });
      const newPdfFiles = await Promise.all(newPdfFilesPromises);
      setPdfFiles(prev => [...prev, ...newPdfFiles]);
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (pdfFiles.length < 2) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select at least two PDF files to merge.',
      });
      return;
    }
    setIsProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();
      for (const pdfFile of pdfFiles) {
        const pdfBytes = await pdfFile.file.arrayBuffer();
        const pdfToMerge = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        
        const copiedPages = await mergedPdf.copyPages(pdfToMerge, pdfToMerge.getPageIndices());
        
        copiedPages.forEach((page) => {
          const originalRotation = page.getRotation().angle;
          page.setRotation(degrees(originalRotation + pdfFile.rotation));
          mergedPdf.addPage(page);
        });
      }

      const mergedPdfBytes = await mergedPdf.save();
      const arrayBuffer = new ArrayBuffer(mergedPdfBytes.length);
      const view = new Uint8Array(arrayBuffer);
      view.set(mergedPdfBytes);
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      saveAs(blob, 'merged.pdf');
    } catch (error) {
      console.error('Error merging PDFs:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to merge PDF files. One or more files might be corrupted or password-protected.',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const tool = t.tools.list.find(tool => tool.icon === 'Merge');

  if (pdfFiles.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main 
            className="flex-1 flex flex-col items-center justify-center text-center p-4"
            onDragEnter={(e: React.DragEvent<HTMLDivElement>) => handleDragEvents(e, true)}
            onDragLeave={(e: React.DragEvent<HTMLDivElement>) => handleDragEvents(e, false)}
            onDragOver={(e: React.DragEvent<HTMLDivElement>) => handleDragEvents(e, true)}
            onDrop={handleDrop}
        >
          <div className={cn("w-full max-w-2xl p-8 rounded-lg border-2 border-dashed transition-colors", isDragging ? 'border-primary bg-primary/10' : 'border-transparent')}>
            <h1 className="text-4xl font-bold">{t.mergePdfPage.title}</h1>
            <p className="mt-2 text-lg text-muted-foreground">{t.mergePdfPage.subtitle}</p>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf" multiple />
            <Button onClick={triggerFileInput} className="mt-8" style={{ width: '320px', height: '90px', fontSize: '1.25rem' }}>
              {t.mergePdfPage.selectButton}
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">{t.mergePdfPage.dropzone}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50">
      <Header />
      <main className="flex-1 p-4 lg:p-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 pb-8">
            <div className="text-center lg:text-left">
                <h1 className="text-3xl font-bold">{t.mergePdfPage.title}</h1>
                <p className="mt-1 text-muted-foreground">{t.mergePdfPage.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
                <Button onClick={handleRestart} variant="outline" className="gap-2">
                    <RefreshCw /> {t.mergePdfPage.restartButton}
                </Button>
                <Button onClick={handleDownload} size="lg" className="gap-2" disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="animate-spin" /> : <Download />} {t.mergePdfPage.downloadButton}
                </Button>
            </div>
        </div>
        
        <div 
          className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          onDragEnter={(e: React.DragEvent<HTMLDivElement>) => handleDragEvents(e, true)}
          onDragLeave={(e: React.DragEvent<HTMLDivElement>) => handleDragEvents(e, false)}
          onDragOver={(e: React.DragEvent<HTMLDivElement>) => handleDragEvents(e, true)}
          onDrop={handleDrop}
        >
          {pdfFiles.map((pdf, index) => (
            <div 
              key={pdf.id} 
              className="relative group cursor-move rounded-lg bg-white p-2 shadow-md transition-shadow hover:shadow-xl border"
              draggable 
              onDragStart={(e: React.DragEvent<HTMLDivElement>) => handleDragStart(e, index)} 
              onDragEnter={(e: React.DragEvent<HTMLDivElement>) => handleDragEnter(e, index)} 
              onDragEnd={handleDragEnd} 
              onDragOver={(e: React.DragEvent<HTMLDivElement>) => e.preventDefault()}
            >
              <div className="w-full h-56 flex items-center justify-center bg-gray-100 rounded-md overflow-hidden mb-2">
                <img src={pdf.preview} alt="preview" className="max-h-full max-w-full object-contain transition-transform duration-300" style={{ transform: `rotate(${pdf.rotation}deg)` }} />
              </div>
              <p className="text-sm font-medium truncate" title={pdf.file.name}>{pdf.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {pdf.pageCount} {pdf.pageCount > 1 ? t.mergePdfPage.pageCounts : t.mergePdfPage.pageCount}
              </p>
              <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="destructive" onClick={() => handleRemoveFile(pdf.id)}>
                    <Trash2 size={16} />
                </Button>
                <Button size="icon" onClick={() => handleRotateFile(pdf.id)}>
                    <RotateCw size={16} />
                </Button>
              </div>
            </div>
          ))}
          {isLoading ? (
            <Skeleton className="h-72 w-full rounded-lg" />
          ) : (
             <div 
                className={cn("flex items-center justify-center rounded-lg border-2 border-dashed h-72 cursor-pointer transition-colors hover:border-primary hover:bg-primary/5", isDragging ? 'border-primary bg-primary/10' : 'border-gray-300')}
                onClick={triggerFileInput}
             >
                <div className="text-center text-gray-500">
                    <PlusCircle className="mx-auto h-12 w-12" />
                    <p className="mt-2 text-sm font-semibold">{t.mergePdfPage.addButton}</p>
                </div>
             </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

    