
"use client";

import React, { useState, useRef, useCallback, useContext } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { Button } from '@/components/ui/button';
import { Download, CornerDownLeft, Clipboard, FileText, PanelLeft } from 'lucide-react';
import { LanguageContext } from '@/context/language-context';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

interface PageText {
  id: number;
  text: string;
}

export default function ExtractTextPage() {
  const { t, language } = useContext(LanguageContext);
  const { toast } = useToast();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extractedTexts, setExtractedTexts] = useState<PageText[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      await extractTextFromFile(file);
    }
  };
  
  const extractTextFromFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setExtractedTexts([]);
    const fileReader = new FileReader();
    fileReader.onload = async () => {
        try {
            const typedArray = new Uint8Array(fileReader.result as ArrayBuffer);
            const pdf = await pdfjsLib.getDocument(typedArray).promise;
            const texts: PageText[] = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                
                let lastY = -1;
                let pageText = '';
                let line = [];

                // Sort items by their vertical and then horizontal position
                const sortedItems = textContent.items.sort((a: any, b: any) => {
                    if (a.transform[5] < b.transform[5]) return 1;
                    if (a.transform[5] > b.transform[5]) return -1;
                    if (a.transform[4] < b.transform[4]) return -1;
                    if (a.transform[4] > b.transform[4]) return 1;
                    return 0;
                });

                for (const item of sortedItems) {
                    // Skip items without transform property (TextMarkedContent)
                    if (!(item as any).transform) continue;
                    const currentY = (item as any).transform[5];
                    if (lastY !== -1 && Math.abs(currentY - lastY) > 5) { // Threshold to detect new line
                        // Process the previous line
                        if (line.length > 0) {
                            // Sort line items by x-coordinate
                            line.sort((a: any, b: any) => a.transform[4] - b.transform[4]);
                            // For RTL, we might need to reverse, but pdf.js gives correct order if dir is correct
                            const isRtl = line.some((l: any) => l.dir === 'rtl');
                            if (isRtl) {
                                line.reverse(); // simple reverse for RTL flow
                            }
                            pageText += line.map((l:any) => l.str).join(' ') + '\n';
                            line = [];
                        }
                    }
                    line.push(item);
                    lastY = currentY;
                }
                // Process the last line
                if (line.length > 0) {
                   line.sort((a: any, b: any) => a.transform[4] - b.transform[4]);
                   const isRtl = line.some((l: any) => l.dir === 'rtl');
                   if (isRtl) {
                       line.reverse();
                   }
                   pageText += line.map((l: any) => l.str).join(' ');
                }

                texts.push({ id: i, text: pageText.trim() });
            }
            setExtractedTexts(texts);
            if (texts.every(p => p.text.trim() === '')) {
                toast({
                    title: t.extractTextPage.noTextFound,
                    description: t.extractTextPage.noTextFoundDescription,
                    variant: "default"
                });
            }
        } catch (error) {
            console.error('Error extracting text:', error);
            toast({ title: t.extractTextPage.errorTitle, description: t.extractTextPage.errorDescription, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    fileReader.readAsArrayBuffer(file);
  }, [toast, t]);


  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleRestart = () => {
    setPdfFile(null);
    setExtractedTexts([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCopyText = (text: string, pageNum: number) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${t.extractTextPage.copied} ${pageNum}` });
  };

  const handleDownloadAll = async () => {
    if (extractedTexts.length === 0) return;
    const zip = new JSZip();
    extractedTexts.forEach(page => {
      zip.file(`page_${page.id}.txt`, page.text);
    });
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${pdfFile?.name.replace('.pdf', '')}_texts.zip`);
  };

  const tool = t.tools.list.find(tool => tool.icon === "ClipboardType");

  if (!pdfFile) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center bg-white text-center">
          <h1 className="text-4xl font-bold">{tool?.title}</h1>
          <p className="mt-2 text-lg text-muted-foreground">{tool?.description}</p>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf" />
          <Button onClick={triggerFileInput} className="mt-8" style={{ width: '320px', height: '90px', fontSize: '1.25rem' }}>
            <FileText className="mr-2 h-6 w-6" /> {t.rotatePdfPage.selectButton}
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col gap-4 p-6 overflow-y-auto">
        <h2 className="text-2xl font-bold">{tool?.title}</h2>
        <p className="text-muted-foreground">{tool?.description}</p>
        <div className="mt-auto flex flex-col gap-3 pt-6">
          <Button onClick={handleDownloadAll} size="lg" className="gap-2" disabled={isLoading || extractedTexts.length === 0}>
            {isLoading ? t.addPageNumbersPage.loading : <><Download /> {t.extractTextPage.downloadAll}</>}
          </Button>
          <Button onClick={handleRestart} variant="secondary" className="gap-2"><CornerDownLeft /> {t.addPageNumbersPage.restartButton}</Button>
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
                    <h1 className="text-xl font-semibold sm:text-2xl">{tool?.title}</h1>
                </div>

                {isLoading ? (
                      <div className="flex h-full items-center justify-center text-muted-foreground">{t.extractTextPage.extracting}</div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-150px)]">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      {extractedTexts.map((page) => (
                        <div key={page.id} className="flex flex-col rounded-lg border bg-card shadow-sm">
                           <div className="flex items-center justify-between p-4 border-b">
                             <h3 className="font-semibold">{t.addPageNumbersPage.pageLabel.replace('{id}', String(page.id))}</h3>
                             <Button variant="ghost" size="icon" onClick={() => handleCopyText(page.text, page.id)}>
                               <Clipboard className="h-4 w-4" />
                               <span className="sr-only">Copy</span>
                             </Button>
                           </div>
                           <div className="p-4">
                              <Textarea
                                readOnly
                                value={page.text}
                                className="h-56 w-full resize-none bg-muted"
                                placeholder={t.extractTextPage.noTextOnPage}
                                dir={language === 'ar' ? 'rtl' : 'ltr'}
                              />
                           </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
            </main>
        </div>
    </div>
  );
}

    