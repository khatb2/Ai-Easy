
"use client";

import React, { useState, useRef, useCallback, useContext, useEffect, MouseEvent } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';
import { LanguageContext } from '@/context/language-context';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  UploadCloud, RefreshCw, Download, Crop as CropIcon, ZoomIn, ZoomOut, Loader2
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

interface PageInfo {
    pageNumber: number;
    thumbnailUrl: string;
    width: number;
    height: number;
}

interface CropBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

type ApplyTo = 'all' | 'current' | 'range';

const CropPdfPage = () => {
    const { t } = useContext(LanguageContext);
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    const [pages, setPages] = useState<PageInfo[]>([]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [cropBox, setCropBox] = useState<CropBox | null>(null);
    const [zoom, setZoom] = useState(1);
    
    // Interaction state for cropping
    const [isCropping, setIsCropping] = useState(false);
    const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);

    // Options state
    const [applyTo, setApplyTo] = useState<ApplyTo>('all');
    const [pageRange, setPageRange] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const interactionCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
    
    const handleFileChange = useCallback(async (selectedFile: File | null) => {
        if (!selectedFile || selectedFile.type !== 'application/pdf') {
            toast({ variant: 'destructive', title: t.splitPdfPage.error.invalidFileTitle });
            return;
        }
        setFile(selectedFile);
        setIsLoading(true);
        setPages([]);
        setCropBox(null);
        setProgress(10);
        setZoom(1);

        try {
            const buffer = await selectedFile.arrayBuffer();
            const doc = await pdfjsLib.getDocument(buffer).promise;
            pdfDocRef.current = doc;
            const numPages = doc.numPages;
            const newPages: PageInfo[] = [];
            
            for (let i = 1; i <= numPages; i++) {
                const page = await doc.getPage(i);
                const viewport = page.getViewport({ scale: 1 });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const context = canvas.getContext('2d');
                if (context) {
                    await page.render({ canvasContext: context, viewport }).promise;
                    newPages.push({ 
                        pageNumber: i, 
                        thumbnailUrl: canvas.toDataURL('image/png', 0.5),
                        width: viewport.width,
                        height: viewport.height
                    });
                }
                setProgress(10 + (i / numPages) * 80);
            }
            setPages(newPages);
            setCurrentPageIndex(0);
            setProgress(100);

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: t.cropPdfPage.errors.readError });
        } finally {
            setIsLoading(false);
            setProgress(0);
        }
    }, [toast, t]);

    const draw = useCallback(() => {
        const canvas = interactionCanvasRef.current;
        if (!canvas || !pages[currentPageIndex]) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const page = pages[currentPageIndex];
        canvas.width = page.width * zoom;
        canvas.height = page.height * zoom;
        
        // Clear and draw the page image
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const img = new Image();
        img.src = page.thumbnailUrl;
        img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Draw crop box if it exists
            if (cropBox) {
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(cropBox.x * zoom, cropBox.y * zoom, cropBox.width * zoom, cropBox.height * zoom);
                ctx.setLineDash([]);
                
                // Dim the outside area
                ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
                ctx.beginPath();
                // Outer rectangle
                ctx.rect(0, 0, canvas.width, canvas.height);
                // Inner (hole) rectangle
                ctx.moveTo(cropBox.x * zoom, cropBox.y * zoom);
                ctx.lineTo((cropBox.x + cropBox.width) * zoom, cropBox.y * zoom);
                ctx.lineTo((cropBox.x + cropBox.width) * zoom, (cropBox.y + cropBox.height) * zoom);
                ctx.lineTo(cropBox.x * zoom, (cropBox.y + cropBox.height) * zoom);
                ctx.closePath();
                ctx.fill("evenodd");
            }
        };
    }, [currentPageIndex, pages, cropBox, zoom]);

    useEffect(() => {
        draw();
    }, [draw]);

    const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / zoom;
        const y = (e.clientY - rect.top) / zoom;
        setIsCropping(true);
        setStartPoint({x, y});
        setCropBox({x, y, width: 0, height: 0});
    };

    const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
        if (!isCropping || !startPoint) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const currentX = (e.clientX - rect.left) / zoom;
        const currentY = (e.clientY - rect.top) / zoom;

        const newCropBox = {
            x: Math.min(startPoint.x, currentX),
            y: Math.min(startPoint.y, currentY),
            width: Math.abs(currentX - startPoint.x),
            height: Math.abs(currentY - startPoint.y),
        };
        setCropBox(newCropBox);
    };

    const handleMouseUp = () => {
        setIsCropping(false);
        setStartPoint(null);
    };
    
    const handleResetCrop = () => setCropBox(null);
    
    const handleDownload = async () => {
        if (!file || !cropBox || cropBox.width === 0 || cropBox.height === 0) {
            toast({ variant: 'destructive', title: t.cropPdfPage.errors.noCropAreaTitle, description: t.cropPdfPage.errors.noCropAreaDescription });
            return;
        }
        setIsProcessing(true);
        
        let pagesToCrop: number[] = [];
        if (applyTo === 'all') {
            pagesToCrop = pages.map(p => p.pageNumber);
        } else if (applyTo === 'current') {
            pagesToCrop = [currentPageIndex + 1];
        } else if (applyTo === 'range') {
            const rangeSet = new Set<number>();
            const parts = pageRange.split(',').map(p => p.trim());
            parts.forEach(part => {
                if(part.includes('-')) {
                    const [start, end] = part.split('-').map(Number);
                    for(let i=start; i<=end; i++) rangeSet.add(i);
                } else {
                    rangeSet.add(Number(part));
                }
            });
            pagesToCrop = Array.from(rangeSet);
        }
        
        try {
            const pdfBytes = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const pdfPages = pdfDoc.getPages();
            
            pagesToCrop.forEach(pageNum => {
                if (pageNum > 0 && pageNum <= pdfPages.length) {
                    const page = pdfPages[pageNum - 1];
                    const { width, height } = page.getSize();
                    // PDF-lib's y-axis is from bottom-left, canvas is top-left
                    const pdfLibCropBox = {
                        x: cropBox.x,
                        y: height - (cropBox.y + cropBox.height),
                        width: cropBox.width,
                        height: cropBox.height
                    }
                    page.setCropBox(pdfLibCropBox.x, pdfLibCropBox.y, pdfLibCropBox.width, pdfLibCropBox.height);
                }
            });

            const modifiedPdfBytes = await pdfDoc.save();
            const uint8Array = Array.from(modifiedPdfBytes, byte => byte);
            const arrayBuffer = new Uint8Array(uint8Array).buffer;
            saveAs(new Blob([arrayBuffer], { type: 'application/pdf' }), `cropped-${file.name}`);
            toast({ title: t.cropPdfPage.success.title, description: t.cropPdfPage.success.description });
        } catch (error) {
             console.error("Failed to save PDF", error);
            toast({ variant: 'destructive', title: "Error", description: t.cropPdfPage.errors.cropError });
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleReset = () => {
        setFile(null);
        setPages([]);
        setCropBox(null);
        pdfDocRef.current = null;
    };
    
    const toolTitle = t.tools.list.find(t => t.icon === 'Crop')?.title || "Crop PDF";

    if (!file) {
        return (
            <div className="flex min-h-screen flex-col bg-white">
                <Header />
                <main className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <h1 className="text-4xl font-bold">{toolTitle}</h1>
                    <p className="mt-2 text-lg text-muted-foreground">{t.tools.list.find(t => t.icon === 'Crop')?.description}</p>
                    <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e.target.files?.[0] || null)} className="hidden" accept="application/pdf" />
                    <Button onClick={() => fileInputRef.current?.click()} className="mt-8" style={{ width: '320px', height: '90px', fontSize: '1.25rem' }}>
                        <UploadCloud className="mr-2 h-6 w-6" /> {t.rotatePdfPage.selectButton}
                    </Button>
                </main>
                <Footer />
            </div>
        );
    }
    
    const currentPage = pages[currentPageIndex];

    return (
        <div className="flex h-screen w-full flex-col bg-slate-100">
            <Header />
            {isLoading && <Progress value={progress} className="w-full absolute top-14" />}
            
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                <main ref={canvasContainerRef} className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-200 overflow-auto">
                    {currentPage ? (
                        <canvas
                            ref={interactionCanvasRef}
                            className="shadow-lg cursor-crosshair"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        />
                    ) : (
                        <Loader2 className="w-16 h-16 animate-spin text-primary" />
                    )}
                </main>
                <aside className="w-full md:w-[350px] flex-shrink-0 border-l bg-white flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
                     <ScrollArea className="flex-grow p-4">
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold border-b pb-2">{toolTitle}</h2>
                            
                            <div className="flex justify-between items-center">
                                <Button
                                  variant="outline"
                                  onClick={() => setCurrentPageIndex(p => Math.max(0, p - 1))}
                                  disabled={currentPageIndex === 0}
                                >
                                    {t.cropPdfPage.previous}
                                </Button>
                                <span>{t.cropPdfPage.pageIndicator.replace('{current}', String(currentPageIndex + 1)).replace('{total}', String(pages.length))}</span>
                                <Button
                                  variant="outline"
                                  onClick={() => setCurrentPageIndex(p => Math.min(pages.length - 1, p + 1))}
                                  disabled={currentPageIndex === pages.length - 1}
                                >
                                    {t.cropPdfPage.next}
                                </Button>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>{t.cropPdfPage.zoom}</Label>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.2, z-0.1))}><ZoomOut/></Button>
                                    <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.min(3, z+0.1))}><ZoomIn/></Button>
                                </div>
                            </div>
                            
                             <div className="space-y-2">
                                 <Label>{t.cropPdfPage.applyTo.label}</Label>
                                  <RadioGroup value={applyTo} onValueChange={(v) => setApplyTo(v as ApplyTo)} className="space-y-1">
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="all" id="r-all" />
                                      <Label htmlFor="r-all">{t.cropPdfPage.applyTo.all}</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="current" id="r-current" />
                                      <Label htmlFor="r-current">{t.cropPdfPage.applyTo.current.replace('{page}', String(currentPageIndex + 1))}</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="range" id="r-range" />
                                      <Label htmlFor="r-range" className="flex-1">{t.cropPdfPage.applyTo.range}</Label>
                                      <Input
                                        type="text"
                                        className="h-8 w-24"
                                        placeholder={t.cropPdfPage.applyTo.placeholder}
                                        value={pageRange}
                                        onChange={e => setPageRange(e.target.value)}
                                        onClick={() => setApplyTo('range')}
                                        disabled={applyTo !== 'range'}
                                        />
                                    </div>
                                  </RadioGroup>
                             </div>
                             
                             <Button onClick={handleResetCrop} variant="secondary" className="w-full">{t.cropPdfPage.resetSelection}</Button>
                        </div>
                    </ScrollArea>
                    <div className="p-4 border-t space-y-2">
                        <Button onClick={handleDownload} size="lg" disabled={isProcessing} className="w-full">
                           {isProcessing ? <Loader2 className="mr-2 animate-spin"/> : <CropIcon className="mr-2"/>}
                           {t.cropPdfPage.cropButton}
                        </Button>
                        <Button onClick={handleReset} variant="outline" className="w-full">
                           <RefreshCw className="mr-2"/> {t.cropPdfPage.startOver}
                        </Button>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default CropPdfPage;
