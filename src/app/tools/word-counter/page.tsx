

"use client";

import React, { useState, useRef, useCallback, useContext } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Button } from '@/components/ui/button';
import { Upload, Copy, Trash2, Loader2 } from 'lucide-react';
import { LanguageContext } from '@/context/language-context';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

const WordCounterPage = () => {
    const { t } = useContext(LanguageContext);
    const [text, setText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(event.target.value);
    };
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        try {
            if (file.type === 'text/plain') {
                const fileText = await file.text();
                setText(fileText);
            } else if (file.type === 'application/pdf') {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const typedarray = new Uint8Array(e.target?.result as ArrayBuffer);
                        const pdf = await pdfjsLib.getDocument(typedarray).promise;
                        let fullText = '';
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const textContent = await page.getTextContent();
                            const pageText = textContent.items.map((item: any) => item.str).join(' ');
                            fullText += pageText + '\n';
                        }
                        setText(fullText);
                    } catch (pdfError) {
                        toast({ variant: "destructive", title: t.wordCounter.errors.pdfError });
                    } finally {
                        setIsLoading(false);
                    }
                };
                reader.readAsArrayBuffer(file);
                return; // Prevent setIsLoading(false) from running too early
            } else {
                toast({ variant: "destructive", title: t.wordCounter.errors.unsupportedFile });
            }
        } catch (error) {
            toast({ variant: "destructive", title: t.wordCounter.errors.fileReadError });
        }
        setIsLoading(false);
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };
    
    const clearText = () => {
        setText('');
    };

    const copyText = () => {
        if (text) {
            navigator.clipboard.writeText(text);
            toast({ title: t.wordCounter.copied });
        }
    };

    const stats = React.useMemo(() => {
        const words = text.trim().split(/\s+/).filter(Boolean);
        const characters = text.length;
        const readingTimeMinutes = Math.ceil(words.length / 200); // Average reading speed of 200 WPM
        const readingTime = readingTimeMinutes > 1 ? `${readingTimeMinutes} ${t.wordCounter.minutes}` : `${readingTimeMinutes} ${t.wordCounter.minute}`;
        
        return {
            words: words.length,
            characters,
            readingTime,
        };
    }, [text, t]);

    const toolInfo = t.tools.list.find(tool => tool.icon === 'Calculator');

    return (
        <div className="flex min-h-screen w-full flex-col">
            <Header />
            <div className="flex flex-1">
                <main className="flex-1 p-6 bg-gray-50 dark:bg-gray-900/40">
                    <div className="h-full flex flex-col">
                        <div className="flex-1 relative">
                            <Textarea
                                placeholder={t.wordCounter.placeholder}
                                value={text}
                                onChange={handleTextChange}
                                className="h-full w-full resize-none p-4 text-base border-gray-300 rounded-lg shadow-sm"
                                disabled={isLoading}
                            />
                            {isLoading && (
                                <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-lg">
                                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                </div>
                            )}
                        </div>
                    </div>
                </main>
                <aside className="w-[350px] border-l bg-white p-6 flex flex-col gap-6" style={{height: 'calc(100vh - 64px)'}}>
                    <div className="flex-grow space-y-6">
                        <h2 className="text-2xl font-bold">{toolInfo?.title}</h2>
                        <p className="text-sm text-muted-foreground">{toolInfo?.description}</p>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle>{t.wordCounter.statsTitle}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-center text-lg">
                                    <span className="text-muted-foreground">{t.wordCounter.words}</span>
                                    <span className="font-bold">{stats.words}</span>
                                </div>
                                <div className="flex justify-between items-center text-lg">
                                    <span className="text-muted-foreground">{t.wordCounter.characters}</span>
                                    <span className="font-bold">{stats.characters}</span>
                                </div>
                                <div className="flex justify-between items-center text-lg">
                                    <span className="text-muted-foreground">{t.wordCounter.readingTime}</span>
                                    <span className="font-bold">{stats.readingTime}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button onClick={triggerFileInput} variant="outline" className="w-full">
                            <Upload className="mr-2 h-4 w-4" />
                            {t.wordCounter.uploadButton}
                        </Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".txt,.pdf"
                        />
                         <div className="grid grid-cols-2 gap-2">
                             <Button onClick={copyText} disabled={!text || isLoading} variant="secondary">
                                <Copy className="mr-2 h-4 w-4" />
                                {t.wordCounter.copyText}
                            </Button>
                            <Button onClick={clearText} disabled={!text || isLoading} variant="destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t.wordCounter.clearText}
                            </Button>
                         </div>
                    </div>
                </aside>
            </div>
            <Footer />
        </div>
    );
};

export default WordCounterPage;

    