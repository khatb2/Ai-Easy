
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
import { File as FileIcon, RefreshCw, UploadCloud, Plus, Trash2, Download, Settings2 } from 'lucide-react';
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
              {t.splitPdfPage.title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
              {t.splitPdfPage.subtitle}
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
                {t.splitPdfPage.selectButton}
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
  mode,
  rangePages,
  fixedPageGroups,
}: PageInfo & { onSelect: (pageNumber: number, isShift: boolean) => void; isSelected: boolean; mode: SplitMode; rangePages: Set<number>, fixedPageGroups: Record<number, number> }) => {
    const isShiftClick = (e: React.MouseEvent) => e.shiftKey;

    const groupIndex = fixedPageGroups[pageNumber] || 0;
    const fixedColors = ['bg-gray-500/20', 'bg-blue-500/20', 'bg-green-500/20', 'bg-purple-500/20', 'bg-orange-500/20'];
    const fixedBg = mode === 'fixed' ? fixedColors[groupIndex % fixedColors.length] : '';

    return (
        <div
            className={cn(
                'relative w-[180px] h-[265px] bg-white rounded-lg cursor-pointer transition-all duration-200 overflow-hidden group shadow-sm hover:scale-105',
                'border-2',
                isSelected && mode === 'extract' ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-transparent',
                 rangePages.has(pageNumber) && mode === 'range' ? 'border-purple-500 ring-2 ring-purple-500 ring-offset-2' : 'border-transparent'
            )}
            onClick={(e) => onSelect(pageNumber, isShiftClick(e))}
        >
             <div className={cn("absolute inset-0 z-0", fixedBg)}></div>
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
            {isSelected && mode === 'extract' && (
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


const SplitPdfPage = () => {
  const { t } = useContext(LanguageContext);
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [thumbnails, setThumbnails] = useState<PageInfo[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSplitting, setIsSplitting] = useState(false);
  const [lastSelectedPage, setLastSelectedPage] = useState<number | null>(null);

  const [splitMode, setSplitMode] = useState<SplitMode>('extract');
  const [ranges, setRanges] = useState<string[]>(['']);
  const [fixedCount, setFixedCount] = useState<string>("1");
  
  const rangePages = useMemo(() => {
    const pageSet = new Set<number>();
    if (splitMode !== 'range') return pageSet;
    ranges.forEach(rangeStr => {
        const parsed = parseRanges(rangeStr, pdfDoc?.numPages || 0);
        parsed.forEach(p => pageSet.add(p));
    });
    return pageSet;
  }, [ranges, pdfDoc, splitMode]);

  const fixedPageGroups = useMemo(() => {
    const groups: Record<number, number> = {};
    if (splitMode !== 'fixed' || !pdfDoc) return groups;
    const count = parseInt(fixedCount, 10);
    if (isNaN(count) || count <= 0) return groups;

    for(let i=1; i<= pdfDoc.numPages; i++) {
        groups[i] = Math.floor((i-1) / count);
    }
    return groups;
  }, [fixedCount, pdfDoc, splitMode]);


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
    
    if (splitMode === 'range') {
        const emptyRangeIndex = ranges.findIndex(r => r === '');
        const newRanges = [...ranges];
        if (lastSelectedPage && isShiftClick) {
             const start = Math.min(lastSelectedPage, pageNumber);
             const end = Math.max(lastSelectedPage, pageNumber);
             const newRange = `${start}-${end}`;
             if(emptyRangeIndex !== -1) newRanges[emptyRangeIndex] = newRange;
             else newRanges.push(newRange);
             setLastSelectedPage(null);
        } else {
             if(emptyRangeIndex !== -1) newRanges[emptyRangeIndex] = String(pageNumber);
             else newRanges.push(String(pageNumber));
             setLastSelectedPage(pageNumber);
        }
        setRanges(newRanges);
    } else {
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
    }
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

  const runSplit = async (pageSets: number[][], baseName: string) => {
    if (pageSets.some(s => s.length === 0)) {
        toast({variant: 'destructive', title: t.splitPdfPage.error.genericTitle, description: t.splitPdfPage.error.emptyPdf});
        return;
    }
    setIsSplitting(true);
    try {
        const originalPdfBytes = await file!.arrayBuffer();
        const zip = new JSZip();

        for (let i = 0; i < pageSets.length; i++) {
            const originalPdf = await PDFDocument.load(originalPdfBytes);
            const indicesToKeep = new Set(pageSets[i].map(p => p-1));
            const indicesToRemove = Array.from({ length: originalPdf.getPageCount() }, (_, k) => k).filter(k => !indicesToKeep.has(k));
            
            for(let j = indicesToRemove.length - 1; j >= 0; j--) {
                originalPdf.removePage(indicesToRemove[j]);
            }
            
            const newPdfBytes = await originalPdf.save();
            const filename = pageSets.length > 1 ? `${baseName}_${i + 1}.pdf` : `${baseName}.pdf`;
            zip.file(filename, newPdfBytes);
        }
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, `${file!.name.replace('.pdf', '')}_split.zip`);

        toast({ title: t.splitPdfPage.success.title, description: t.splitPdfPage.success.description.replace('{count}', String(pageSets.length)) });
    } catch (error) {
        console.error('Splitting failed', error);
        toast({ variant: 'destructive', title: t.splitPdfPage.error.splitFailedTitle, description: t.splitPdfPage.error.splitFailedDescription });
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

  const handleAddRange = () => setRanges([...ranges, '']);
  const handleRemoveRange = (index: number) => setRanges(ranges.filter((_, i) => i !== index));
  const handleRangeChange = (index: number, value: string) => {
    const newRanges = [...ranges];
    newRanges[index] = value.replace(/[^0-9,-]/g, '');
    setRanges(newRanges);
  };

  const handleSplitByExtract = () => {
      if(selectedPages.size === 0) {
          toast({variant: 'destructive', title: t.splitPdfPage.error.noPagesTitle, description: t.splitPdfPage.error.noPagesDescription});
          return;
      }
      runSplit([Array.from(selectedPages).sort((a,b) => a-b)], 'extracted_pages');
  };
  const handleSplitByRange = () => {
    const pageSets = ranges.map(rangeStr => parseRanges(rangeStr, pdfDoc?.numPages || 0)).filter(p => p.length > 0);
    if (pageSets.length === 0) {
      toast({ variant: 'destructive', title: t.splitPdfPage.error.genericTitle, description: t.splitPdfPage.error.invalidRange });
      return;
    }
    runSplit(pageSets, 'range_split');
  };
   const handleSplitByFixed = () => {
    const count = parseInt(fixedCount, 10);
    if (isNaN(count) || count <= 0) {
      toast({ variant: 'destructive', title: t.splitPdfPage.error.genericTitle, description: t.splitPdfPage.error.invalidFixedNumber });
      return;
    }
    const pageSets: number[][] = [];
    for (let i = 1; i <= (pdfDoc?.numPages || 0); i += count) {
        const set: number[] = [];
        for (let j = 0; j < count && i + j <= (pdfDoc?.numPages || 0); j++) {
            set.push(i + j);
        }
        pageSets.push(set);
    }
    runSplit(pageSets, `fixed_split_${count}_pages`);
  };

  function parseRanges(rangesStr: string, totalPages: number): number[] {
    const result = new Set<number>();
    if (!rangesStr) return [];
    const parts = rangesStr.split(',');

    for (const part of parts) {
        const trimmedPart = part.trim();
        if (trimmedPart.includes('-')) {
            const [startStr, endStr] = trimmedPart.split('-');
            const start = parseInt(startStr, 10);
            const end = parseInt(endStr, 10);
            if (!isNaN(start) && !isNaN(end) && start <= end && start > 0 && end <= totalPages) {
                for (let i = start; i <= end; i++) {
                    result.add(i);
                }
            }
        } else {
            const num = parseInt(trimmedPart, 10);
            if (!isNaN(num) && num > 0 && num <= totalPages) {
                result.add(num);
            }
        }
    }
    return Array.from(result).sort((a, b) => a - b);
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
                {t.splitPdfPage.sidebar.toolsButton}
            </h3>
              <Tabs value={splitMode} onValueChange={(value) => setSplitMode(value as SplitMode)} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-muted">
                      <TabsTrigger value="extract">{t.splitPdfPage.modes.extract.title}</TabsTrigger>
                      <TabsTrigger value="range">{t.splitPdfPage.modes.range.title}</TabsTrigger>
                      <TabsTrigger value="fixed">{t.splitPdfPage.modes.fixed.title}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="extract" className="mt-4 py-4 px-2 space-y-4">
                      <p className='text-sm text-muted-foreground text-center' dangerouslySetInnerHTML={{ __html: t.splitPdfPage.modes.extract.description.replace('Shift-Click', `<b>Shift-Click</b>`) }}/>
                      <p className='text-sm font-bold text-center'>{selectedPages.size > 0 ? t.splitPdfPage.modes.extract.selectedInfo.replace('{count}', String(selectedPages.size)) : t.splitPdfPage.modes.extract.notSelected}</p>
                      <Button onClick={handleSplitByExtract} disabled={isSplitting || selectedPages.size === 0} className="w-full">
                          <Download className="mr-2 h-4 w-4" /> {t.splitPdfPage.modes.extract.buttonText}
                      </Button>
                      <Button onClick={handleSelectAll} variant="secondary" disabled={isSplitting} className="w-full">
                          {selectedPages.size === pdfDoc?.numPages ? t.splitPdfPage.modes.extract.deselectAll : t.splitPdfPage.modes.extract.selectAll}
                      </Button>
                  </TabsContent>
                  <TabsContent value="range" className="mt-4 py-4 px-2 space-y-4">
                      <p className='text-sm text-muted-foreground' dangerouslySetInnerHTML={{ __html: t.splitPdfPage.modes.range.description.replace('click on pages', `<b>click on pages</b>`)}}/>
                      <div className='w-full space-y-2 max-h-48 overflow-y-auto pr-2'>
                          {ranges.map((range, index) => (
                              <div key={index} className="flex items-center gap-2">
                                  <Input placeholder={t.splitPdfPage.modes.range.placeholder} value={range} onChange={(e) => handleRangeChange(index, e.target.value)} className="flex-grow" />
                                  {ranges.length > 1 && <Button variant="ghost" size="icon" onClick={() => handleRemoveRange(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                              </div>
                          ))}
                      </div>
                      <Button variant="outline" onClick={handleAddRange}><Plus className="mr-2 h-4 w-4" />{t.splitPdfPage.modes.range.addRangeButton}</Button>
                      <Button onClick={handleSplitByRange} disabled={isSplitting || ranges.every(r => r === '')}><Download className="mr-2 h-4 w-4" /> {t.splitPdfPage.modes.range.buttonText}</Button>
                  </TabsContent>
                  <TabsContent value="fixed" className="mt-4 py-4 px-2 space-y-4">
                      <p className='text-sm text-muted-foreground'>{t.splitPdfPage.modes.fixed.description}</p>
                      <div className="flex items-center gap-2">
                          <label htmlFor="fixed-count" className='text-sm font-medium'>{t.splitPdfPage.modes.fixed.labelPrefix}</label>
                          <Input id="fixed-count" type="number" min="1" value={fixedCount} onChange={(e) => setFixedCount(e.target.value.replace(/[^0-9]/g, ''))} className="w-24 text-center" />
                          <label className='text-sm font-medium'>{t.splitPdfPage.modes.fixed.labelSuffix}</label>
                      </div>
                      <Button onClick={handleSplitByFixed} disabled={isSplitting}><Download className="mr-2 h-4 w-4" /> {t.splitPdfPage.modes.fixed.buttonText}</Button>
                  </TabsContent>
              </Tabs>
        </ScrollArea>
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
                  mode={splitMode}
                  rangePages={rangePages}
                  fixedPageGroups={fixedPageGroups}
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

export default SplitPdfPage;

    