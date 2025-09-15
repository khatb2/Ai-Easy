
"use client";

import React, { useState, useRef, useCallback, useContext } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { Button } from '@/components/ui/button';
import { Download, CornerDownLeft, Bold, Italic, PanelLeft } from 'lucide-react';
import { LanguageContext } from '@/context/language-context';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

interface PageInfo {
  id: number;
  thumbnail: string;
  width: number;
  height: number;
}

type Position = 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
type Mode = 'single' | 'facing';

export default function AddPageNumbersPage() {
  const { t } = useContext(LanguageContext);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [mode, setMode] = useState<Mode>('single');
  const [range, setRange] = useState('');
  const [position, setPosition] = useState<Position>('bottom-center');
  const [margin, setMargin] = useState(30);
  const [startFrom, setStartFrom] = useState(1);
  const [format, setFormat] = useState('{n}');
  const [customFormat, setCustomFormat] = useState('{n}');
  const [selectedFormat, setSelectedFormat] = useState('{n}');
  
  const [font, setFont] = useState('Helvetica');
  const [fontSize, setFontSize] = useState(12);
  const [color, setColor] = useState('#000000');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  
  const handleFormatChange = (value: string) => {
    setSelectedFormat(value);
    if (value === 'custom') {
      setFormat(customFormat);
    } else {
      setFormat(value);
    }
  };

  const handleCustomFormatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCustomFormat = e.target.value;
    setCustomFormat(newCustomFormat);
    if (selectedFormat === 'custom') {
      setFormat(newCustomFormat);
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      await renderPdfToThumbnails(file);
    }
  };

  const renderPdfToThumbnails = useCallback(async (file: File) => {
    setIsLoading(true);
    setPages([]);
    const fileReader = new FileReader();
    fileReader.onload = async () => {
      try {
        const typedArray = new Uint8Array(fileReader.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument(typedArray).promise;
        const renderedPages: PageInfo[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.3 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          if (context) {
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            renderedPages.push({
              id: i,
              thumbnail: canvas.toDataURL('image/jpeg', 0.8),
              width: page.view[2],
              height: page.view[3],
            });
          }
        }
        setPages(renderedPages);
        setRange(`1-${pdf.numPages}`);
      } catch (error) {
        console.error('Error rendering PDF:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fileReader.readAsArrayBuffer(file);
  }, []);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleRestart = () => {
    setPdfFile(null);
    setPages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const parseRange = (rangeStr: string, totalPages: number): Set<number> => {
    const selected = new Set<number>();
    if (!rangeStr) return selected;
    
    const parts = rangeStr.split(',');
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        for (let i = start; i <= end; i++) {
          if (i > 0 && i <= totalPages) selected.add(i);
        }
      } else {
        const num = Number(part);
        if (num > 0 && num <= totalPages) selected.add(num);
      }
    }
    return selected;
  };

  const getPositionCoords = (pos: Position, width: number, height: number, margin: number) => {
    const coords = { x: 0, y: 0, align: 'center' as 'center' | 'left' | 'right' };
    const [yPos, xPos] = pos.split('-');

    switch(yPos) {
      case 'top': coords.y = height - margin - fontSize; break;
      case 'middle': coords.y = height / 2; break;
      case 'bottom': coords.y = margin; break;
    }
    
    switch(xPos) {
      case 'left': coords.x = margin; coords.align = 'left'; break;
      case 'center': coords.x = width / 2; coords.align = 'center'; break;
      case 'right': coords.x = width - margin; coords.align = 'right'; break;
    }
    return coords;
  }

  const handleDownload = async () => {
    if (!pdfFile) return;
    setIsLoading(true);

    try {
        const existingPdfBytes = await pdfFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const pagesToNumber = parseRange(range, pdfDoc.getPageCount());

        const fontToEmbed = await pdfDoc.embedFont(
            isBold && isItalic ? StandardFonts.HelveticaBoldOblique :
            isBold ? StandardFonts.HelveticaBold :
            isItalic ? StandardFonts.HelveticaOblique :
            StandardFonts.Helvetica
        );

        const pdfPages = pdfDoc.getPages();
        let currentPageNumber = startFrom;

        for (let i = 0; i < pdfPages.length; i++) {
            if (!pagesToNumber.has(i + 1)) continue;

            const page = pdfPages[i];
            const { width, height } = page.getSize();
            
            let currentPosition = position;
            if (mode === 'facing' && (i + 1) % 2 === 0) {
                if (position.includes('right')) currentPosition = position.replace('right', 'left') as Position;
            }
            if (mode === 'facing' && (i + 1) % 2 !== 0) {
                 if (position.includes('left')) currentPosition = position.replace('left', 'right') as Position;
            }

            const { x, y, align } = getPositionCoords(currentPosition, width, height, margin);
            const textToDraw = format.replace('{n}', String(currentPageNumber)).replace('{p}', String(pagesToNumber.size));
            const textWidth = fontToEmbed.widthOfTextAtSize(textToDraw, fontSize);
            
            let textX = x;
            if (align === 'center') textX = x - textWidth / 2;
            if (align === 'right') textX = x - textWidth;

            page.drawText(textToDraw, {
                x: textX, y, font: fontToEmbed, size: fontSize,
                color: rgb(
                    parseInt(color.slice(1, 3), 16) / 255,
                    parseInt(color.slice(3, 5), 16) / 255,
                    parseInt(color.slice(5, 7), 16) / 255
                ),
            });
            currentPageNumber++;
        }

        const pdfBytes = await pdfDoc.save();
        const uint8Array = Array.from(pdfBytes, byte => byte);
        const arrayBuffer = new Uint8Array(uint8Array).buffer;
        const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
        saveAs(pdfBlob, 'numbered.pdf');

    } catch (error) {
        console.error('Error adding page numbers:', error);
    } finally {
        setIsLoading(false);
    }
  };
  
  const positionOptions: { value: Position, labelKey: keyof typeof t.addPageNumbersPage.positions }[] = [
      { value: 'bottom-right', labelKey: 'bottomRight' }, { value: 'bottom-left', labelKey: 'bottomLeft' },
      { value: 'bottom-center', labelKey: 'bottomCenter' }, { value: 'top-right', labelKey: 'topRight' },
      { value: 'top-left', labelKey: 'topLeft' }, { value: 'top-center', labelKey: 'topCenter' },
      { value: 'middle-right', labelKey: 'middleRight' }, { value: 'middle-left', labelKey: 'middleLeft' },
  ];
    
  const formatOptions = [
      { value: '{n}', label: '{n}'},
      { value: 'Page {n}', label: t.addPageNumbersPage.formats.pageN },
      { value: 'Page {n} of {p}', label: t.addPageNumbersPage.formats.pageNofP },
      { value: 'custom', label: t.addPageNumbersPage.formats.custom }
  ];

  if (!pdfFile) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center bg-white text-center">
          <h1 className="text-4xl font-bold">{t.addPageNumbersPage.title}</h1>
          <p className="mt-2 text-lg text-muted-foreground">{t.addPageNumbersPage.subtitle}</p>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf" />
          <Button onClick={triggerFileInput} className="mt-8" style={{ width: '320px', height: '90px', fontSize: '1.25rem' }}>
            {t.addPageNumbersPage.selectButton}
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col gap-4 p-6 overflow-y-auto">
        <h2 className="text-2xl font-bold">{t.addPageNumbersPage.optionsTitle}</h2>
        <div className="space-y-6">
          <div>
            <Label>{t.addPageNumbersPage.mode}</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)} className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2"><RadioGroupItem value="single" id="single" /><Label htmlFor="single">{t.addPageNumbersPage.singlePage}</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="facing" id="facing" /><Label htmlFor="facing">{t.addPageNumbersPage.facingPages}</Label></div>
            </RadioGroup>
          </div>
          <div>
            <Label>{t.addPageNumbersPage.position}</Label>
              <Select value={position} onValueChange={(v) => setPosition(v as Position)}>
                  <SelectTrigger className="mt-2"><SelectValue placeholder={t.addPageNumbersPage.position} /></SelectTrigger>
                  <SelectContent>{positionOptions.map(opt => (<SelectItem key={opt.value} value={opt.value}>{t.addPageNumbersPage.positions[opt.labelKey]}</SelectItem>))}</SelectContent>
              </Select>
          </div>
          <div>
              <Label>{t.addPageNumbersPage.margin}</Label>
               <Select value={String(margin)} onValueChange={(v) => setMargin(Number(v))}>
                  <SelectTrigger className="mt-2"><SelectValue placeholder={t.addPageNumbersPage.margin} /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="10">{t.addPageNumbersPage.margins.small}</SelectItem>
                      <SelectItem value="30">{t.addPageNumbersPage.margins.medium}</SelectItem>
                      <SelectItem value="50">{t.addPageNumbersPage.margins.big}</SelectItem>
                  </SelectContent>
              </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div>
                  <Label htmlFor="range">{t.addPageNumbersPage.pagesToNumber}</Label>
                  <Input id="range" value={range} onChange={e => setRange(e.target.value)} placeholder="e.g. 1,3,5-10" className="mt-1" />
              </div>
              <div>
                  <Label htmlFor="startFrom">{t.addPageNumbersPage.startFrom}</Label>
                  <Input id="startFrom" type="number" value={startFrom} onChange={e => setStartFrom(Number(e.target.value))} className="mt-1" />
              </div>
          </div>
           <div>
              <Label htmlFor="format">{t.addPageNumbersPage.format}</Label>
               <Select onValueChange={handleFormatChange} value={selectedFormat}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select a format" /></SelectTrigger>
                  <SelectContent>{formatOptions.map(opt => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
              </Select>
              {selectedFormat === 'custom' && (
                <Input id="custom-format" value={customFormat} onChange={handleCustomFormatChange} placeholder="e.g. Page {n} of {p}" className="mt-2"/>
              )}
               <p className="text-xs text-muted-foreground mt-1">{t.addPageNumbersPage.formatHint}</p>
          </div>
          <div>
              <Label>{t.addPageNumbersPage.textStyle}</Label>
              <div className="space-y-3 mt-2">
                   <Select value={font} onValueChange={setFont}>
                      <SelectTrigger><SelectValue placeholder="Font" /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Helvetica">Helvetica</SelectItem>
                          <SelectItem value="Times-Roman">Times New Roman</SelectItem>
                          <SelectItem value="Courier">Courier</SelectItem>
                      </SelectContent>
                  </Select>
                   <div className="flex items-center gap-2">
                      <Input type="number" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-20" />
                      <Input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-20 p-1" />
                      <Button variant={isBold ? 'secondary' : 'outline'} size="icon" onClick={() => setIsBold(!isBold)}><Bold /></Button>
                      <Button variant={isItalic ? 'secondary' : 'outline'} size="icon" onClick={() => setIsItalic(!isItalic)}><Italic /></Button>
                   </div>
              </div>
          </div>
        </div>
        <div className="mt-auto flex flex-col gap-3 pt-6">
          <Button onClick={handleDownload} size="lg" className="gap-2" disabled={isLoading}>
            {isLoading ? t.addPageNumbersPage.loading : <><Download /> {t.addPageNumbersPage.downloadButton}</>}
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
                    <h1 className="text-xl font-semibold sm:text-2xl">{t.addPageNumbersPage.title}</h1>
                </div>

                {isLoading && pages.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-muted-foreground">{t.addPageNumbersPage.loading}</div>
                ) : (
                  <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {pages.map((page, index) => {
                      const totalPages = pages.length;
                      const textToDisplay = format.replace('{n}', String(index + startFrom)).replace('{p}', String(totalPages));
                      const scale = 208 / page.width; 
                      
                      const style: React.CSSProperties = {
                          position: 'absolute',
                          fontSize: `${fontSize * scale * 2.5}px`,
                          color: color,
                          fontWeight: isBold ? 'bold' : 'normal',
                          fontStyle: isItalic ? 'italic' : 'normal',
                          fontFamily: font,
                          whiteSpace: 'nowrap',
                          padding: '2px 4px',
                          backgroundColor: 'rgba(255, 255, 255, 0.7)',
                          borderRadius: '3px'
                      };
                      
                      const [yPos, xPos] = position.split('-');
                      if (yPos === 'top') style.top = `${margin * scale}px`;
                      if (yPos === 'bottom') style.bottom = `${margin * scale}px`;
                      if (yPos === 'middle') {
                          style.top = '50%';
                          style.transform = 'translateY(-50%)';
                      }

                      if (xPos === 'left') style.left = `${margin * scale}px`;
                      if (xPos === 'right') style.right = `${margin * scale}px`;
                      if (xPos === 'center') {
                          style.left = '50%';
                          style.transform = style.transform ? `${style.transform} translateX(-50%)` : 'translateX(-50%)';
                      }
                      
                      return (
                          <div key={page.id} className="relative group cursor-pointer flex flex-col items-center">
                              <div className="overflow-hidden rounded-lg border bg-white shadow-md" style={{width: 208, height: 290}}>
                                  <div className="w-full h-full flex items-center justify-center p-2 relative">
                                      <img src={page.thumbnail} alt={`Page ${page.id}`} className="max-h-full max-w-full object-contain" />
                                       <div style={style}>{textToDisplay}</div>
                                  </div>
                              </div>
                              <p className="text-center mt-1 text-sm font-medium">{t.addPageNumbersPage.pageLabel.replace('{id}', String(page.id))}</p>
                          </div>
                      )
                  })}
                  </div>
                )}
            </main>
        </div>
    </div>
  );
}

    