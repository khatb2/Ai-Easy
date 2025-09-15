
"use client";

import React, { useState, useRef, useCallback, useContext, DragEvent } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { Button } from '@/components/ui/button';
import { Download, CornerDownLeft, PlusCircle, Trash2, PanelLeft } from 'lucide-react';
import { LanguageContext } from '@/context/language-context';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

type PageSize = 'fit' | 'a4' | 'us-letter';
type Margin = 'no_margin' | 'small_margin' | 'big_margin';
type Orientation = 'portrait' | 'landscape';

interface ImageFile {
  id: number;
  file: File;
  preview: string;
}

export default function ImageToPdfPage() {
  const { t } = useContext(LanguageContext);
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [pageSize, setPageSize] = useState<PageSize>('fit');
  const [margin, setMargin] = useState<Margin>('no_margin');
  const [mergeFiles, setMergeFiles] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const idCounter = useRef(0); // Use a ref to maintain a counter for unique IDs

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newImages = Array.from(files)
        .filter(file => file.type.startsWith('image/'))
        .map((file, index) => ({
          id: ++idCounter.current, // Use counter instead of Date.now()
          file,
          preview: URL.createObjectURL(file),
        }));
      setImageFiles(prev => [...prev, ...newImages]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleRestart = () => {
    setImageFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (id: number) => {
    setImageFiles(prev => prev.filter(img => img.id !== id));
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    dragItem.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>, index: number) => {
    dragOverItem.current = index;
    const list = [...imageFiles];
    const draggedItemContent = list[dragItem.current!];
    if (!draggedItemContent) return;
    list.splice(dragItem.current!, 1);
    list.splice(dragOverItem.current!, 0, draggedItemContent);
    dragItem.current = dragOverItem.current;
    setImageFiles(list);
  };

  const handleDragEnd = () => {
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const getPageSizeArr = (size: PageSize, imgWidth: number, imgHeight: number): [number, number] => {
      if (size === 'a4') return [595.28, 841.89];
      if (size === 'us-letter') return [612, 792];
      return [imgWidth, imgHeight];
  };

  const getMarginValue = (margin: Margin) => {
      if (margin === 'small_margin') return 20;
      if (margin === 'big_margin') return 50;
      return 0;
  };

  const handleDownload = async () => {
    if (imageFiles.length === 0) return;
    setIsLoading(true);

    try {
        const processImage = async (pdfDoc: PDFDocument, imageFile: ImageFile) => {
            const imgBytes = await imageFile.file.arrayBuffer();
            let embeddedImage;
            if (imageFile.file.type === 'image/jpeg') {
                embeddedImage = await pdfDoc.embedJpg(imgBytes);
            } else if (imageFile.file.type === 'image/png') {
                embeddedImage = await pdfDoc.embedPng(imgBytes);
            } else {
                console.warn(`Unsupported image type: ${imageFile.file.type}`);
                return;
            }

            const imgWidth = embeddedImage.width;
            const imgHeight = embeddedImage.height;
            
            let pageOrientation = orientation;
            if (pageSize === 'fit') {
                pageOrientation = imgWidth > imgHeight ? 'landscape' : 'portrait';
            }
            
            let [pageWidth, pageHeight] = getPageSizeArr(pageSize, imgWidth, imgHeight);
             if (pageOrientation === 'landscape' && pageWidth < pageHeight) {
                [pageWidth, pageHeight] = [pageHeight, pageWidth];
            } else if (pageOrientation === 'portrait' && pageHeight < pageWidth) {
                [pageWidth, pageHeight] = [pageHeight, pageWidth];
            }
            
            const page = pdfDoc.addPage([pageWidth, pageHeight]);
            const marginValue = getMarginValue(margin);
            const effectiveWidth = pageWidth - 2 * marginValue;
            const effectiveHeight = pageHeight - 2 * marginValue;
            
            const scaled = embeddedImage.scaleToFit(effectiveWidth, effectiveHeight);

            const x = marginValue + (effectiveWidth - scaled.width) / 2;
            const y = marginValue + (effectiveHeight - scaled.height) / 2;
            
            page.drawImage(embeddedImage, {
                x,
                y,
                width: scaled.width,
                height: scaled.height,
                rotate: degrees(0) // No rotation
            });
        };

        if (mergeFiles) {
            const pdfDoc = await PDFDocument.create();
            for (const imageFile of imageFiles) {
                await processImage(pdfDoc, imageFile);
            }
            const pdfBytes = await pdfDoc.save();
            const arrayBuffer = new ArrayBuffer(pdfBytes.length);
            const view = new Uint8Array(arrayBuffer);
            view.set(pdfBytes);
            const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
            saveAs(blob, 'converted_merged.pdf');
        } else {
            const zip = new JSZip();
            for (const imageFile of imageFiles) {
                const pdfDoc = await PDFDocument.create();
                await processImage(pdfDoc, imageFile);
                const pdfBytes = await pdfDoc.save();
                zip.file(`${imageFile.file.name.replace(/\.[^/.]+$/, "")}.pdf`, pdfBytes);
            }
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            saveAs(zipBlob, 'converted_files.zip');
        }

    } catch (error) {
        console.error('Error creating PDF:', error);
    } finally {
        setIsLoading(false);
    }
  };

  const tool = t.tools.list.find(tool => tool.title === 'Image to PDF' || tool.title === 'تحويل صورة إلى PDF');

  if (imageFiles.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center bg-white text-center">
            <h1 className="text-4xl font-bold">{tool?.title}</h1>
            <p className="mt-2 text-lg text-muted-foreground">{tool?.description}</p>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/jpeg,image/png" multiple />
            <Button onClick={triggerFileInput} className="mt-8" style={{ width: '320px', height: '90px', fontSize: '1.25rem' }}>
              {t.jpgToPdfPage.selectButton.replace('JPG', 'Image')}
            </Button>
        </main>
        <Footer />
      </div>
    );
  }
  
  const SidebarContent = () => (
    <div className="flex h-full flex-col gap-4 p-6">
        <h2 className="text-2xl font-bold">{tool?.title}</h2>
        <div className="space-y-4">
            <div>
                <Label>{t.jpgToPdfPage.orientation}</Label>
                <RadioGroup value={orientation} onValueChange={(value) => setOrientation(value as any)} className="flex gap-4 mt-2">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="portrait" id="portrait" /><Label htmlFor="portrait">{t.jpgToPdfPage.portrait}</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="landscape" id="landscape" /><Label htmlFor="landscape">{t.jpgToPdfPage.landscape}</Label></div>
                </RadioGroup>
            </div>
            <div>
              <Label>{t.jpgToPdfPage.pageSize}</Label>
              <Select value={pageSize} onValueChange={(v) => setPageSize(v as PageSize)}>
                <SelectTrigger className="w-full mt-2"><SelectValue placeholder="Select page size" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fit">{t.jpgToPdfPage.fit}</SelectItem>
                  <SelectItem value="a4">{t.jpgToPdfPage.a4}</SelectItem>
                  <SelectItem value="us-letter">{t.jpgToPdfPage.usLetter}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
                <Label>{t.jpgToPdfPage.margin}</Label>
                <RadioGroup value={margin} onValueChange={(v) => setMargin(v as Margin)} className="mt-2 space-y-1">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="no_margin" id="no_margin" /><Label htmlFor="no_margin">{t.jpgToPdfPage.noMargin}</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="small_margin" id="small_margin" /><Label htmlFor="small_margin">{t.jpgToPdfPage.smallMargin}</Label></div>
                     <div className="flex items-center space-x-2"><RadioGroupItem value="big_margin" id="big_margin" /><Label htmlFor="big_margin">{t.jpgToPdfPage.bigMargin}</Label></div>
                </RadioGroup>
            </div>
            <div className="flex items-center space-x-2 pt-4">
                <Checkbox id="merge" checked={mergeFiles} onCheckedChange={(checked) => setMergeFiles(Boolean(checked))} />
                <Label htmlFor="merge" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{t.jpgToPdfPage.merge}</Label>
            </div>
        </div>
        <div className="mt-auto flex flex-col gap-3">
          <Button onClick={handleDownload} size="lg" className="gap-2" disabled={isLoading}>
            {isLoading ? t.jpgToPdfPage.loading : <><Download /> {t.jpgToPdfPage.downloadButton}</>}
          </Button>
          <Button onClick={handleRestart} variant="secondary" className="gap-2"><CornerDownLeft /> {t.jpgToPdfPage.restartButton}</Button>
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

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {imageFiles.map((img, index) => (
                  <div key={img.id} className="relative group cursor-move" draggable onDragStart={(e) => handleDragStart(e, index)} onDragEnter={(e) => handleDragEnter(e, index)} onDragEnd={handleDragEnd} onDragOver={(e) => e.preventDefault()}>
                    <div className="overflow-hidden rounded-lg border bg-white shadow-md transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1">
                       <div className="w-full h-48 flex items-center justify-center p-2">
                          <img src={img.preview} alt="preview" className="max-h-full max-w-full object-contain" />
                       </div>
                    </div>
                    <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="destructive" onClick={() => handleRemoveImage(img.id)}><Trash2 size={16} /></Button>
                    </div>
                  </div>
                ))}
                  <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-100" onClick={triggerFileInput} style={{height: 200}}>
                      <div className="text-center">
                          <PlusCircle className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-600">{t.jpgToPdfPage.addMore}</p>
                      </div>
                  </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/jpeg,image/png" multiple />
          </main>
      </div>
    </div>
  );
}

    