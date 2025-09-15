
"use client";

import React, { useState, useRef, useCallback, useContext } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { Button } from '@/components/ui/button';
import { Download, CornerDownLeft, Clipboard, FileText, PanelLeft, LoaderCircle } from 'lucide-react';
import { LanguageContext } from '@/context/language-context';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
// OCR functionality is now handled via API route
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

interface PageContent {
  id: number;
  text: string;
  thumbnail: string;
  status: 'pending' | 'processing' | 'done' | 'error';
}

export default function PdfOcrPage() {
  const { t, language } = useContext(LanguageContext);
  const { toast } = useToast();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pageContents, setPageContents] = useState<PageContent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processPage = useCallback(async (pdf: pdfjsLib.PDFDocumentProxy, pageNum: number) => {
      try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 }); // Use a higher scale for better OCR quality
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (!context) {
          throw new Error("Could not get canvas context");
        }
        await page.render({ canvasContext: context, viewport }).promise;

        const imageDataUrl = canvas.toDataURL('image/png');

        const response = await fetch('/api/ocr', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pageImage: imageDataUrl,
                language: language,
            }),
        });
        
        if (!response.ok) {
            throw new Error(`OCR API error: ${response.status}`);
        }
        
        const result = await response.json();

        setPageContents(prev => prev.map(p => p.id === pageNum ? { ...p, text: result.extractedText, status: 'done' } : p));

      } catch (error) {
        console.error(`Error processing page ${pageNum}:`, error);
        setPageContents(prev => prev.map(p => p.id === pageNum ? { ...p, text: t.pdfOcrPage.errorDescription, status: 'error' } : p));
        toast({ title: `${t.pdfOcrPage.errorTitle} ${pageNum}`, description: t.pdfOcrPage.errorDescription, variant: 'destructive' });
      }
  }, [language, t, toast]);
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      await processPdf(file);
    }
  };
  
  const processPdf = useCallback(async (file: File) => {
    setIsLoading(true);
    setPageContents([]);

    const fileReader = new FileReader();
    fileReader.onload = async () => {
        try {
            const typedArray = new Uint8Array(fileReader.result as ArrayBuffer);
            const pdf = await pdfjsLib.getDocument(typedArray).promise;
            
            // First, create placeholders with thumbnails
            const initialContents: PageContent[] = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                 const page = await pdf.getPage(i);
                 const viewport = page.getViewport({ scale: 0.2 });
                 const canvas = document.createElement('canvas');
                 const context = canvas.getContext('2d');
                 canvas.height = viewport.height;
                 canvas.width = viewport.width;
                 if(context) {
                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    initialContents.push({ id: i, text: '', thumbnail: canvas.toDataURL(), status: 'pending' });
                 }
            }
            setPageContents(initialContents);
            setIsLoading(false);

            // Now, process pages for OCR one by one
            for (let i = 1; i <= pdf.numPages; i++) {
                setPageContents(prev => prev.map(p => p.id === i ? { ...p, status: 'processing' } : p));
                await processPage(pdf, i);
            }

        } catch (error) {
            console.error('Error processing PDF:', error);
            toast({ title: t.extractTextPage.errorTitle, description: t.extractTextPage.errorDescription, variant: "destructive" });
            setIsLoading(false);
        }
    };
    fileReader.readAsArrayBuffer(file);
  }, [processPage, toast, t]);


  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleRestart = () => {
    setPdfFile(null);
    setPageContents([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCopyText = (text: string, pageNum: number) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${t.extractTextPage.copied} ${pageNum}` });
  };

  const handleDownloadAll = async () => {
    if (pageContents.length === 0) return;
    const zip = new JSZip();
    pageContents.forEach(page => {
      if (page.status === 'done') {
        zip.file(`page_${page.id}.txt`, page.text);
      }
    });
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${pdfFile?.name.replace('.pdf', '')}_ocr_texts.zip`);
  };

  const tool = t.tools.list.find(tool => tool.icon === "ScanText");

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
        <Alert>
          <AlertTitle>{t.pdfOcrPage.alertTitle}</AlertTitle>
          <AlertDescription>
           {t.pdfOcrPage.alertDescription}
          </AlertDescription>
        </Alert>
        <div className="mt-auto flex flex-col gap-3 pt-6">
          <Button onClick={handleDownloadAll} size="lg" className="gap-2" disabled={isLoading || pageContents.some(p => p.status !== 'done')}>
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
                    <div className="mx-auto max-w-4xl space-y-6">
                      {pageContents.map((page) => (
                        <div key={page.id} className="flex flex-col rounded-lg border bg-card shadow-sm">
                           <div className="flex items-center justify-between p-4 border-b">
                             <div className="flex items-center gap-3">
                               <img src={page.thumbnail} alt={`preview ${page.id}`} className="h-10 w-10 rounded-sm border object-cover" />
                               <h3 className="font-semibold">{t.addPageNumbersPage.pageLabel.replace('{id}', String(page.id))}</h3>
                             </div>
                             <div className="flex items-center gap-2">
                                {page.status === 'processing' && <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />}
                                <Button variant="ghost" size="icon" onClick={() => handleCopyText(page.text, page.id)} disabled={page.status !== 'done'}>
                                  <Clipboard className="h-4 w-4" />
                                  <span className="sr-only">Copy</span>
                                </Button>
                             </div>
                           </div>
                           <div className="p-4">
                              <Textarea
                                readOnly
                                value={page.status === 'done' ? page.text : (page.status === 'error' ? t.pdfOcrPage.errorDescription : t.pdfOcrPage.processing)}
                                className="h-64 w-full resize-none bg-muted"
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

    