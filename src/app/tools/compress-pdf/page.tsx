
"use client";

import React, { useState, useRef, useCallback, useContext } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { LanguageContext } from '@/context/language-context';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from '@/components/ui/button';
import { Loader2, Download, RefreshCw, FileSliders } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import Image from "next/image";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

type CompressionLevel = 'low' | 'medium' | 'high';

interface CompressedResult {
  blob: Blob;
  newSize: number;
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function CompressPdfPage() {
  const { t } = useContext(LanguageContext);
  const { toast } = useToast();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('medium');
  const [compressedResult, setCompressedResult] = useState<CompressedResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateThumbnail = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const doc = await pdfjsLib.getDocument(buffer).promise;
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (context) {
      await page.render({ canvasContext: context, viewport }).promise;
      setPreviewUrl(canvas.toDataURL());
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setIsLoading(true);
      setPdfFile(file);
      setOriginalSize(file.size);
      setCompressedResult(null);
      await generateThumbnail(file);
      setIsLoading(false);
    } else {
        toast({
            title: t.splitPdfPage.error.invalidFileTitle,
            description: t.splitPdfPage.error.invalidFileDescription,
            variant: "destructive"
        })
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleRestart = () => {
    setPdfFile(null);
    setPreviewUrl(null);
    setCompressedResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  const handleDownload = () => {
    if (compressedResult) {
        saveAs(compressedResult.blob, `compressed-${pdfFile?.name}`);
    }
  }

  const handleCompress = async () => {
    if (!pdfFile) return;

    setIsCompressing(true);
    setCompressedResult(null);

    try {
        const existingPdfBytes = await pdfFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(existingPdfBytes, { 
            ignoreEncryption: true 
        });

        if (compressionLevel === 'high') {
          // Remove metadata for highest compression
          pdfDoc.setTitle('');
          pdfDoc.setAuthor('');
          pdfDoc.setSubject('');
          pdfDoc.setKeywords([]);
          pdfDoc.setProducer('');
          pdfDoc.setCreator('');
          pdfDoc.setCreationDate(new Date(0));
          pdfDoc.setModificationDate(new Date(0));
        }

        const pdfBytes = await pdfDoc.save({
          useObjectStreams: compressionLevel !== 'low'
        });
        
        const uint8Array = Array.from(pdfBytes, byte => byte);
        const arrayBuffer = new Uint8Array(uint8Array).buffer;
        const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
        setCompressedResult({ blob, newSize: blob.size });

        toast({
            title: t.compressPdfPage.successTitle,
            description: t.compressPdfPage.successDescription,
        });

    } catch (error) {
      console.error('Error compressing PDF:', error);
      toast({
        title: t.compressPdfPage.errorTitle,
        description: String(error),
        variant: 'destructive',
      });
    } finally {
      setIsCompressing(false);
    }
  };
  
  const tool = t.tools.list.find(tool => tool.icon === "FileSliders");

  if (!pdfFile) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <h1 className="text-4xl font-bold">{tool?.title}</h1>
            <p className="mt-2 text-lg text-muted-foreground">{tool?.description}</p>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf" />
            <Button onClick={triggerFileInput} className="mt-8" style={{ width: '320px', height: '90px', fontSize: '1.25rem' }}>
              {t.rotatePdfPage.selectButton}
            </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
        <Header />
        <div className="flex flex-1">
            <main className="flex-1 flex items-center justify-center p-4 lg:p-8 bg-white">
                <div className="relative w-full max-w-4xl h-[calc(100vh-128px)] rounded-lg border bg-white shadow-sm p-4 flex items-center justify-center">
                    {isLoading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    ) : (
                        previewUrl && <Image src={previewUrl} alt="PDF Preview" layout="fill" objectFit="contain" className="rounded-md" />
                    )}
                </div>
            </main>
            <aside className="w-[350px] border-l bg-white p-6 flex flex-col gap-6" style={{height: 'calc(100vh - 64px)'}}>
                <div className="flex-grow space-y-6">
                  <h2 className="text-2xl font-bold">{tool?.title}</h2>
                    <div>
                        <h3 className="text-lg font-semibold mb-4">{t.compressPdfPage.compressionLevel}</h3>
                         <RadioGroup value={compressionLevel} onValueChange={(v) => setCompressionLevel(v as CompressionLevel)} className="space-y-3">
                            <Label htmlFor="low" className="flex items-center justify-between p-4 rounded-md border cursor-pointer has-[:checked]:bg-primary/10 has-[:checked]:border-primary">
                                <div>
                                    <p className="font-semibold">{t.compressPdfPage.levels.low.title}</p>
                                    <p className="text-sm text-muted-foreground">{t.compressPdfPage.levels.low.description}</p>
                                </div>
                                <RadioGroupItem value="low" id="low" />
                            </Label>
                             <Label htmlFor="medium" className="flex items-center justify-between p-4 rounded-md border cursor-pointer has-[:checked]:bg-primary/10 has-[:checked]:border-primary">
                                <div>
                                    <p className="font-semibold">{t.compressPdfPage.levels.medium.title}</p>
                                    <p className="text-sm text-muted-foreground">{t.compressPdfPage.levels.medium.description}</p>
                                </div>
                                <RadioGroupItem value="medium" id="medium" />
                            </Label>
                             <Label htmlFor="high" className="flex items-center justify-between p-4 rounded-md border cursor-pointer has-[:checked]:bg-primary/10 has-[:checked]:border-primary">
                                <div>
                                    <p className="font-semibold">{t.compressPdfPage.levels.high.title}</p>
                                    <p className="text-sm text-muted-foreground">{t.compressPdfPage.levels.high.description}</p>
                                </div>
                                <RadioGroupItem value="high" id="high" />
                            </Label>
                        </RadioGroup>
                    </div>

                    <Button onClick={handleCompress} size="lg" className="w-full gap-2" disabled={isCompressing}>
                        {isCompressing ? <Loader2 className="animate-spin" /> : <FileSliders />} {t.compressPdfPage.compressButton}
                    </Button>
                    
                    {compressedResult && (
                        <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-center space-y-4">
                             <div className="flex justify-around items-center">
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground">{t.compressPdfPage.originalSize}</p>
                                    <p className="text-lg font-bold">{formatFileSize(originalSize)}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground">{t.compressPdfPage.newSize}</p>
                                    <p className="text-lg font-bold text-green-600">{formatFileSize(compressedResult.newSize)}</p>
                                </div>
                                 <div className="text-center">
                                    <p className="text-sm text-muted-foreground">{t.compressPdfPage.reduction}</p>
                                    <p className="text-lg font-bold text-green-600">
                                        {Math.round(100 - (compressedResult.newSize / originalSize) * 100)}%
                                    </p>
                                </div>
                            </div>
                            <Button onClick={handleDownload} className="w-full gap-2"><Download/>{t.compressPdfPage.downloadButton}</Button>
                        </div>
                    )}
                </div>
                <div className="mt-auto">
                    <Button onClick={handleRestart} variant="outline" className="w-full gap-2"><RefreshCw />{t.addPageNumbersPage.restartButton}</Button>
                </div>
            </aside>
        </div>
        <Footer />
    </div>
  );
}

    