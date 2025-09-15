
"use client";

import React, { useState, useRef, useCallback, useContext } from 'react';
import imageCompression from 'browser-image-compression';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { useToast } from '@/hooks/use-toast';
import { LanguageContext } from '@/context/language-context';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Download, RefreshCw, Image as ImageIcon, PlusCircle } from 'lucide-react';

interface ImageFile {
  id: number;
  file: File;
  preview: string;
}

interface CompressedImage {
  id: number;
  blob: Blob;
  originalSize: number;
  newSize: number;
  name: string;
}

type OutputFormat = 'jpeg' | 'webp' | 'png' | 'gif' | 'avif';

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function CompressImagePage() {
  const { t } = useContext(LanguageContext);
  const { toast } = useToast();
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [compressedImages, setCompressedImages] = useState<CompressedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [quality, setQuality] = useState(80);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('jpeg');
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      setCompressedImages([]); // Clear previous results
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  const handleRestart = () => {
    setImageFiles([]);
    setCompressedImages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCompress = async () => {
    if (imageFiles.length === 0) return;
    setIsProcessing(true);
    setCompressedImages([]);
    const compressedResults: CompressedImage[] = [];

    const options = {
      maxSizeMB: 20, 
      useWebWorker: true,
      quality: quality / 100,
      fileType: `image/${outputFormat}`,
      // The library handles which options apply to which format
      // For PNG
      pngQuality: quality / 100,
      // For GIF
      gifQuality: quality,
    };

    for (const imageFile of imageFiles) {
      try {
        // The library automatically detects input type and converts to the output `fileType`.
        const compressedBlob = await imageCompression(imageFile.file, options);
        const originalName = imageFile.file.name.substring(0, imageFile.file.name.lastIndexOf('.'));
        
        compressedResults.push({
          id: imageFile.id,
          blob: compressedBlob,
          originalSize: imageFile.file.size,
          newSize: compressedBlob.size,
          name: `${originalName}.${outputFormat}`
        });
      } catch (error: any) {
        console.error(`Failed to compress image ${imageFile.file.name}:`, error);
        toast({
          title: `Compression Failed for ${imageFile.file.name}`,
          description: error.message || "This image format might not be supported for conversion by your browser.",
          variant: 'destructive',
        });
      }
    }
    setCompressedImages(compressedResults);
    setIsProcessing(false);
  };

  const handleDownloadAll = async () => {
    if (compressedImages.length === 0) return;
    const zip = new JSZip();
    compressedImages.forEach(img => {
      zip.file(img.name, img.blob);
    });
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, 'compressed_images.zip');
  };

  const tool = t.compressImagePage;
  const supportedFormats = "image/jpeg,image/png,image/webp,image/gif,image/avif";

  if (imageFiles.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <h1 className="text-4xl font-bold">{tool.title}</h1>
            <p className="mt-2 text-lg text-muted-foreground">{tool.subtitle}</p>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept={supportedFormats}
              multiple 
            />
            <Button onClick={triggerFileInput} className="mt-8" style={{ width: '320px', height: '90px', fontSize: '1.25rem' }}>
              <ImageIcon className="mr-2 h-6 w-6" /> {tool.selectButton}
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
            <aside className="w-[350px] border-l bg-white p-6 flex flex-col gap-6" style={{height: 'calc(100vh - 64px)'}}>
                <div className="flex-grow space-y-6">
                  <h2 className="text-2xl font-bold">{tool.sidebarTitle}</h2>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                               <Label htmlFor="quality">{tool.quality}</Label>
                               <span className="text-sm font-medium text-primary">{quality}%</span>
                            </div>
                           <Slider id="quality" value={[quality]} onValueChange={([v]) => setQuality(v)} max={100} step={1} />
                        </div>
                        <div className="space-y-2">
                           <Label htmlFor="format">{tool.format}</Label>
                           <Select value={outputFormat} onValueChange={(v) => setOutputFormat(v as any)}>
                                <SelectTrigger id="format"><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="jpeg">JPEG</SelectItem>
                                    <SelectItem value="webp">WEBP</SelectItem>
                                    <SelectItem value="png">PNG</SelectItem>
                                    <SelectItem value="gif">GIF</SelectItem>
                                    <SelectItem value="avif">AVIF</SelectItem>
                                </SelectContent>
                           </Select>
                        </div>
                    </div>
                    <Button onClick={handleCompress} size="lg" className="w-full gap-2" disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="animate-spin" /> : <ImageIcon />} {tool.compressButton}
                    </Button>
                    {compressedImages.length > 0 && (
                        <Button onClick={handleDownloadAll} variant="secondary" className="w-full gap-2"><Download/>{tool.downloadAllButton}</Button>
                    )}
                </div>
                <div className="mt-auto">
                    <Button onClick={handleRestart} variant="outline" className="w-full gap-2"><RefreshCw />{tool.startOverButton}</Button>
                </div>
            </aside>
            <main className="flex-1 p-4 lg:p-8 bg-gray-50 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {imageFiles.map(img => {
                        const compressedResult = compressedImages.find(c => c.id === img.id);
                        return (
                          <Card key={img.id} className="overflow-hidden">
                            <CardHeader className="p-0">
                                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                                    <img src={img.preview} alt={img.file.name} className="max-h-full max-w-full object-contain" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                <CardTitle className="text-base truncate">{img.file.name}</CardTitle>
                                {compressedResult ? (
                                  <>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">{tool.original}</span>
                                      <span className="font-medium">{formatFileSize(compressedResult.originalSize)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">{tool.compressed}</span>
                                      <span className="font-medium text-green-600">{formatFileSize(compressedResult.newSize)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">{tool.reduction}</span>
                                      <span className="font-bold text-green-600">
                                          {Math.round(100 - (compressedResult.newSize / compressedResult.originalSize) * 100)}%
                                      </span>
                                    </div>
                                    <Button onClick={() => saveAs(compressedResult.blob, compressedResult.name)} className="w-full mt-2" size="sm">
                                      <Download className="mr-2 h-4 w-4"/> {tool.downloadButton}
                                    </Button>
                                  </>
                                ) : (
                                  <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">{tool.original}</span>
                                      <span className="font-medium">{formatFileSize(img.file.size)}</span>
                                  </div>
                                )}
                            </CardContent>
                          </Card>
                        );
                    })}
                     <div 
                        className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-100 min-h-[250px]"
                        onClick={triggerFileInput}
                    >
                      <div className="text-center text-gray-500">
                          <PlusCircle className="mx-auto h-12 w-12" />
                          <p className="mt-2 text-sm font-semibold">{tool.addMoreButton}</p>
                      </div>
                    </div>
                </div>
            </main>
        </div>
        <Footer />
    </div>
  );
}
