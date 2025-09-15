
"use client";

import { useState, useEffect, useRef, useCallback, type ChangeEvent, useMemo, useContext } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { LanguageContext } from '@/context/language-context';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

import { Button } from '@/components/ui/button';
import { File as FileIcon, RefreshCw, Loader2, UploadCloud, Plus, Trash2, Download, Settings2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

type SplitMode = 'extract' | 'range' | 'fixed';

interface PageInfo {
  pageNumber: number;
  thumbnailUrl: string;
}

const UploadView = ({ onFileSelect }: { onFileSelect: (file: File) => void }) => {
  const { t } = useContext(LanguageContext);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const validateFile = (file: File | undefined) => {
    if (file && file.type === "application/pdf") {
      onFileSelect(file);
    } else {
      toast({
        variant: 'destructive',
        title: t.splitPdfPage.error.invalidFileTitle,
        description: t.splitPdfPage.error.invalidFileDescription
      });
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    validateFile(event.target.files?.[0]);
  };
  
  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, isEntering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(isEntering);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e, false);
    validateFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main 
        className="flex flex-1 flex-col items-center justify-center p-4 text-center bg-white"
        onDragEnter={(e: React.DragEvent<HTMLDivElement>) => handleDragEvents(e, true)}
        onDragLeave={(e: React.DragEvent<HTMLDivElement>) => handleDragEvents(e, false)}
        onDragOver={(e: React.DragEvent<HTMLDivElement>) => handleDragEvents(e, true)}
        onDrop={handleDrop}
      >
        <div className="max-w-lg w-full flex flex-col items-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              {t.extractPagesPage.title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
              {t.extractPagesPage.subtitle}
          </p>

          <div 
            className={cn(
              "mt-8 w-full flex flex-col items-center justify-center transition-all duration-300",
              isDragging ? "border-primary bg-primary/10 border-2 border-dashed rounded-lg p-8" : ""
            )}
          >
             <Button
                onClick={handleButtonClick}
                className="text-lg font-semibold"
                style={{ width: '320px', height: '90px' }}
              >
                {t.extractPagesPage.selectButton}
              </Button>
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf"
            className="hidden"
          />
        </div>
      </main>
      <Footer/>
    </div>
  );
};


const PageThumbnail = ({
  pageNumber,
  thumbnailUrl,
  isSelected,
  onSelect,
}: PageInfo & { onSelect: (pageNumber: number, isShift: boolean) => void; isSelected: boolean }) => {
    const isShiftClick = (e: React.MouseEvent) => e.shiftKey;

    return (
        <div
            className={cn(
                'relative w-[180px] h-[265px] bg-white rounded-lg cursor-pointer transition-all duration-200 overflow-hidden group shadow-sm hover:scale-105',
                'border-2',
                isSelected ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-transparent'
            )}
            onClick={(e) => onSelect(pageNumber, isShiftClick(e))}
        >
            <Image
                src={thumbnailUrl}
                alt={`Page ${pageNumber}`}
                width={180}
                height={265}
                className="relative z-10 object-contain w-full h-full"
                unoptimized
            />
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-bold rounded-md px-2 py-1 z-20">
                {pageNumber}
            </div>
            {isSelected && (
                <div className="absolute top-2 left-2 z-20">
                    <Checkbox
                        checked={isSelected}
                        id={`page-${pageNumber}`}
                        className="h-6 w-6 bg-white/70 backdrop-blur-sm border-gray-400"
                        aria-label={`Select page ${pageNumber}`}
                    />
                </div>
            )}
        </div>
    );
};


const ExtractPagesPage = () => {
  const { t } = useContext(LanguageContext);
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [thumbnails, setThumbnails] = useState<PageInfo[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSplitting, setIsSplitting] = useState(false);
  const [lastSelectedPage, setLastSelectedPage] = useState<number | null>(null);

  const generateThumbnails = useCallback(async (doc: pdfjsLib.PDFDocumentProxy) => {
    const newThumbnails: PageInfo[] = [];
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
                newThumbnails[i-1] = { pageNumber: i, thumbnailUrl: canvas.toDataURL() };
            }
        })());
    }
    await Promise.all(promises);
    setThumbnails(newThumbnails);
    setIsLoading(false);
  }, []);

   useEffect(() => {
    if (!file) return;
    const loadPdf = async () => {
      try {
        setIsLoading(true);
        const buffer = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument(buffer).promise;
        setPdfDoc(doc);
        await generateThumbnails(doc);
      } catch (error) {
        console.error('Failed to load PDF:', error);
        toast({
          variant: 'destructive',
          title: t.splitPdfPage.error.loadErrorTitle,
          description: t.splitPdfPage.error.loadErrorDescription,
        });
        handleClearFile();
      }
    };
    loadPdf();
  }, [file, generateThumbnails, toast, t]);

  const togglePageSelection = (pageNumber: number, isShiftClick: boolean) => {
    const newSelection = new Set(selectedPages);
    
    if (isShiftClick && lastSelectedPage !== null) {
      const start = Math.min(lastSelectedPage, pageNumber);
      const end = Math.max(lastSelectedPage, pageNumber);
      const shouldSelect = !newSelection.has(pageNumber);
      for (let i = start; i <= end; i++) {
        if (shouldSelect) newSelection.add(i);
        else newSelection.delete(i);
      }
    } else {
      if (newSelection.has(pageNumber)) {
        newSelection.delete(pageNumber);
      } else {
        newSelection.add(pageNumber);
      }
    }
    setLastSelectedPage(pageNumber);
    setSelectedPages(newSelection);
  };

  const handleSelectAll = () => {
    if (pdfDoc) {
      if (selectedPages.size === pdfDoc.numPages) {
          setSelectedPages(new Set());
      } else {
          const allPages = new Set(Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1));
          setSelectedPages(allPages);
      }
    }
  };

  const runExtract = async () => {
    if (selectedPages.size === 0) {
        toast({variant: 'destructive', title: t.extractPagesPage.error.noPagesTitle, description: t.extractPagesPage.error.noPagesDescription});
        return;
    }
    setIsSplitting(true);
    try {
        const originalPdfBytes = await file!.arrayBuffer();
        const originalPdf = await PDFDocument.load(originalPdfBytes);
        
        const newPdf = await PDFDocument.create();
        const pagesToCopy = Array.from(selectedPages).sort((a,b) => a - b);
        
        const copiedPageIndices = await newPdf.copyPages(originalPdf, pagesToCopy.map(p => p - 1));
        copiedPageIndices.forEach(page => newPdf.addPage(page));

        const newPdfBytes = await newPdf.save();
        const filename = `${file!.name.replace('.pdf', '')}_extracted.pdf`;
        const arrayBuffer = new ArrayBuffer(newPdfBytes.length);
        const view = new Uint8Array(arrayBuffer);
        view.set(newPdfBytes);
        saveAs(new Blob([arrayBuffer], {type: 'application/pdf'}), filename);

        toast({ title: t.extractPagesPage.success.title, description: t.extractPagesPage.success.description.replace('{count}', String(selectedPages.size)) });
    } catch (error) {
        console.error('Extraction failed', error);
        toast({ variant: 'destructive', title: t.extractPagesPage.error.splitFailedTitle, description: t.extractPagesPage.error.splitFailedDescription });
    } finally {
        setIsSplitting(false);
    }
  };
  
  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
  };
  
  const handleClearFile = () => {
    setFile(null);
    setPdfDoc(null);
    setThumbnails([]);
    setSelectedPages(new Set());
  };

  if (!file) {
    return <UploadView onFileSelect={handleFileSelect} />;
  }

  const SidebarContent = () => (
    <div className='flex flex-col h-full'>
      <div className="p-4 border-b space-y-4">
          <div className='flex items-center gap-3'>
            <FileIcon className="h-7 w-7 text-primary flex-shrink-0" />
            <div>
              <h2 className='text-md font-semibold text-foreground truncate' title={file.name}>{file.name}</h2>
              <p className='text-sm text-muted-foreground'>{`${(file.size / 1024 / 1024).toFixed(2)} MB • ${pdfDoc?.numPages || 0} ${t.splitPdfPage.sidebar.pages}`}</p>
            </div>
          </div>
           <Button variant="outline" onClick={handleClearFile} disabled={isSplitting} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" /> {t.splitPdfPage.restartButton}
          </Button>
      </div>

      <ScrollArea className="flex-grow p-4">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Settings2 className="h-5 w-5" />
            {t.extractPagesPage.sidebar.toolsButton}
          </h3>
            <div className="mt-4 py-4 px-2 space-y-4">
                <p className='text-sm text-muted-foreground text-center' dangerouslySetInnerHTML={{ __html: t.extractPagesPage.modes.extract.description.replace('Shift-Click', `<b>Shift-Click</b>`) }}/>
                <p className='text-sm font-bold text-center'>{selectedPages.size > 0 ? t.extractPagesPage.modes.extract.selectedInfo.replace('{count}', String(selectedPages.size)) : t.extractPagesPage.modes.extract.notSelected}</p>
                <Button onClick={handleSelectAll} variant="secondary" disabled={isSplitting} className="w-full">
                    {selectedPages.size === pdfDoc?.numPages ? t.extractPagesPage.modes.extract.deselectAll : t.extractPagesPage.modes.extract.selectAll}
                </Button>
            </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <Button onClick={runExtract} disabled={isSplitting || selectedPages.size === 0} className="w-full">
            {isSplitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {t.extractPagesPage.modes.extract.buttonText}
        </Button>
      </div>
    </div>
);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[350px] bg-card border-l border-border flex-shrink-0 shadow-lg">
          <div className="fixed top-14 h-[calc(100vh-56px)] w-[350px] flex flex-col">
            <SidebarContent/>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto p-6 bg-white">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="w-[180px] h-[265px] rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="flex flex-row flex-wrap justify-center gap-6">
              {thumbnails.map((pageInfo) => (
                <PageThumbnail
                  key={pageInfo.pageNumber}
                  pageNumber={pageInfo.pageNumber}
                  thumbnailUrl={pageInfo.thumbnailUrl}
                  isSelected={selectedPages.has(pageInfo.pageNumber)}
                  onSelect={togglePageSelection}
                />
              ))}
            </div>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default ExtractPagesPage;
