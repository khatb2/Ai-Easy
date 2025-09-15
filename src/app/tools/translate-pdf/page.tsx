
"use client";

import React, { useState, useRef, useCallback, useContext } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Button } from '@/components/ui/button';
import { FileText, PanelLeft, Languages, CornerDownLeft } from 'lucide-react';
import { LanguageContext } from '@/context/language-context';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

interface PageContent {
  id: number;
  text: string;
  thumbnail: string;
}

export default function TranslatePdfPage() {
  const { t, language } = useContext(LanguageContext);
  const { toast } = useToast();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pageContents, setPageContents] = useState<PageContent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [targetLang, setTargetLang] = useState(language === 'ar' ? 'en' : 'ar');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      await extractTextAndThumbnails(file);
    }
  };
  
  const extractTextAndThumbnails = useCallback(async (file: File) => {
    setIsLoading(true);
    setPageContents([]);
    const fileReader = new FileReader();
    fileReader.onload = async () => {
        try {
            const typedArray = new Uint8Array(fileReader.result as ArrayBuffer);
            const pdf = await pdfjsLib.getDocument(typedArray).promise;
            const contents: PageContent[] = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                
                // Extract text
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');

                // Generate thumbnail
                const viewport = page.getViewport({ scale: 0.3 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                if(context) {
                   await page.render({ canvasContext: context, viewport: viewport }).promise;
                }
                
                contents.push({ id: i, text: pageText.trim(), thumbnail: canvas.toDataURL() });
            }
            setPageContents(contents);
            if (contents.every(p => p.text.trim() === '')) {
                toast({
                    title: t.extractTextPage.noTextFound,
                    description: t.extractTextPage.noTextFoundDescription,
                    variant: "default"
                });
            }
        } catch (error) {
            console.error('Error processing PDF:', error);
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
    setPageContents([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleTranslate = (text: string) => {
    if (!text) return;
    const googleTranslateUrl = `https://translate.google.com/?sl=auto&tl=${targetLang}&text=${encodeURIComponent(text)}&op=translate`;
    window.open(googleTranslateUrl, '_blank');
  };

  const tool = t.tools.list.find(tool => tool.icon === "Languages");

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
        <div className='space-y-2'>
            <Label htmlFor="target-lang">{t.translatePdfPage.targetLanguage}</Label>
            <Select value={targetLang} onValueChange={setTargetLang}>
                <SelectTrigger id='target-lang'>
                    <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="ko">한국어</SelectItem>
                    <SelectItem value="ru">Русский</SelectItem>
                    <SelectItem value="zh-CN">中文 (简体)</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="mt-auto flex flex-col gap-3 pt-6">
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
                             <Button size="sm" onClick={() => handleTranslate(page.text)} disabled={!page.text}>
                               <Languages className="mr-2 h-4 w-4" />
                               {t.translatePdfPage.translateButton}
                             </Button>
                           </div>
                           <div className="p-4">
                              <Textarea
                                readOnly
                                value={page.text}
                                className="h-48 w-full resize-none bg-muted"
                                placeholder={t.extractTextPage.noTextOnPage}
                                dir="auto"
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
