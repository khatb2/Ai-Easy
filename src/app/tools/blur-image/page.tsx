
"use client";

import React, { useState, useRef, useCallback, useContext, MouseEvent, useEffect } from 'react';
import { saveAs } from 'file-saver';
import { Button } from '@/components/ui/button';
import { Download, UploadCloud, Trash2, Copy, Circle, RectangleHorizontal, Loader2, RefreshCw, Eraser } from 'lucide-react';
import { LanguageContext } from '@/context/language-context';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

type ShapeType = 'rect' | 'circle';
type ResizeHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'left' | 'right' | 'circle-r';
type ActionType = 'move' | 'resize' | null;

interface Shape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  blurAmount: number;
}

interface ActionState {
    type: ActionType;
    handle: ResizeHandle | null;
    startX: number;
    startY: number;
    initialShape: Shape | null;
}

const BlurImagePage = () => {
    const { t } = useContext(LanguageContext);
    const { toast } = useToast();
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [shapes, setShapes] = useState<Shape[]>([]);
    const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const interactionOverlayRef = useRef<HTMLDivElement>(null);
    
    const actionStateRef = useRef<ActionState>({ type: null, handle: null, startX: 0, startY: 0, initialShape: null });
    const scaleRef = useRef(1);

    const drawCanvas = useCallback(async () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !image) return;

        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        
        const blurPromises = shapes.map(shape => {
            return new Promise<void>(resolve => {
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                if(!tempCtx) return resolve();
                
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                
                tempCtx.filter = `blur(${shape.blurAmount}px)`;
                
                tempCtx.save();
                tempCtx.beginPath();
                 if (shape.type === 'rect') {
                    tempCtx.rect(shape.x, shape.y, shape.width, shape.height);
                } else {
                    tempCtx.arc(shape.x + shape.width / 2, shape.y + shape.height / 2, shape.width / 2, 0, Math.PI * 2);
                }
                tempCtx.clip();
                tempCtx.drawImage(image, 0, 0, tempCanvas.width, tempCanvas.height);
                tempCtx.restore();

                ctx.drawImage(tempCanvas, 0, 0);
                
                resolve();
            });
        });
        
        await Promise.all(blurPromises);

    }, [image, shapes]);

    useEffect(() => {
        if(image && !isProcessing) {
            drawCanvas();
        }
    }, [image, shapes, drawCanvas, isProcessing]);
    
    useEffect(() => {
      const handleResize = () => {
        if (image) {
            setShapes(s => [...s]);
        }
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [image]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new window.Image();
                img.onload = () => {
                    setImage(img);
                    setShapes([]);
                    setSelectedShapeId(null);
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        } else {
            toast({
              title: "Invalid File",
              description: "Please select a valid image file.",
              variant: "destructive"
            });
        }
    };
    
    const handleStartOver = () => {
      setImage(null);
      setShapes([]);
      setSelectedShapeId(null);
      if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const addShape = (type: ShapeType) => {
        if (!image) return;
        const newSize = Math.min(image.naturalWidth, image.naturalHeight) * 0.25;
        const newShape: Shape = {
            id: `shape-${Math.random().toString(36).substr(2, 9)}`,
            type,
            x: (image.naturalWidth - newSize) / 2,
            y: (image.naturalHeight - newSize) / 2,
            width: newSize,
            height: newSize,
            blurAmount: 25,
        };
        setShapes(prev => [...prev, newShape]);
        setSelectedShapeId(newShape.id);
    };

    const updateShape = (id: string, updates: Partial<Shape>) => {
        setShapes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const handleDuplicate = () => {
        const selected = shapes.find(s => s.id === selectedShapeId);
        if (selected && image) {
            let newX = selected.x + 20;
            let newY = selected.y + 20;
            if (newX + selected.width > image.naturalWidth) newX = image.naturalWidth - selected.width;
            if (newY + selected.height > image.naturalHeight) newY = image.naturalHeight - selected.height;
            const newShape = { ...selected, id: `shape-${Math.random().toString(36).substr(2, 9)}`, x: newX, y: newY }; // Use random string instead of Date.now()
            setShapes(prev => [...prev, newShape]);
            setSelectedShapeId(newShape.id);
        }
    };
    
    const handleClearSelected = () => {
        if (selectedShapeId) {
            setShapes(prev => prev.filter(s => s.id !== selectedShapeId));
            setSelectedShapeId(null);
        }
    };
    
    const handleClearAll = () => {
        setShapes([]);
        setSelectedShapeId(null);
    };

    const handleDownload = async () => {
        if (!canvasRef.current) return;
        setIsProcessing(true);
        await drawCanvas(); 
        try {
            canvasRef.current.toBlob(blob => {
                if (blob) {
                    saveAs(blob, 'blurred-image.png');
                }
                setIsProcessing(false);
            }, 'image/png', 1.0);
        } catch (error) {
            console.error("Failed to download image:", error);
            toast({ title: "Error", description: "Could not process and download the image.", variant: "destructive" });
            setIsProcessing(false);
        }
    };
    
    const getMousePos = (e: MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        return { 
            x: (e.clientX - rect.left) / scaleRef.current,
            y: (e.clientY - rect.top) / scaleRef.current,
        }
    }

    const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        e.preventDefault();

        const { x: mouseX, y: mouseY } = getMousePos(e);
        const target = e.target as HTMLElement;

        let clickedShapeElement = target.closest('.blur-shape');
        let handle = target.dataset.handle as ResizeHandle | undefined;
        let shapeId: string | null = null;
        
        if (clickedShapeElement) {
             shapeId = clickedShapeElement.id;
        }

        if (!shapeId) {
             setActiveShape(null);
             return;
        }

        const clickedShape = shapes.find(s => s.id === shapeId);
        if (!clickedShape) return;
        
        setActiveShape(shapeId);
        
        actionStateRef.current = {
            type: handle ? 'resize' : 'move',
            handle: handle || null,
            startX: mouseX,
            startY: mouseY,
            initialShape: JSON.parse(JSON.stringify(clickedShape)),
        };
    };

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        const { type, handle, initialShape, startX, startY } = actionStateRef.current;
        if (!type || !initialShape || !image) return;
        e.preventDefault();

        const { x: mouseX, y: mouseY } = getMousePos(e);

        const deltaX = mouseX - startX;
        const deltaY = mouseY - startY;
        
        let newProps: Partial<Shape> = {};

        if (type === 'move') {
            let newX = initialShape.x + deltaX;
            let newY = initialShape.y + deltaY;

            newX = Math.max(0, Math.min(newX, image.naturalWidth - initialShape.width));
            newY = Math.max(0, Math.min(newY, image.naturalHeight - initialShape.height));

            newProps.x = newX;
            newProps.y = newY;

        } else if (type === 'resize' && handle) {
            newProps = { ...initialShape };

            if (handle.includes('left')) {
                const newWidth = Math.max(20, initialShape.width - deltaX);
                newProps.x = initialShape.x + initialShape.width - newWidth;
                newProps.width = newWidth;
            }
            if (handle.includes('right')) {
                newProps.width = Math.max(20, initialShape.width + deltaX);
            }
            if (handle.includes('top')) {
                const newHeight = Math.max(20, initialShape.height - deltaY);
                newProps.y = initialShape.y + initialShape.height - newHeight;
                newProps.height = newHeight;
            }
            if (handle.includes('bottom')) {
                newProps.height = Math.max(20, initialShape.height + deltaY);
            }
            
            if (handle === 'circle-r') {
                const newRadius = Math.max(10, initialShape.width / 2 + deltaX);
                newProps.width = newRadius * 2;
                newProps.height = newRadius * 2;
                newProps.x = initialShape.x + (initialShape.width / 2) - newRadius;
                newProps.y = initialShape.y + (initialShape.height / 2) - newRadius;
            }
            
            if (newProps.x !== undefined) newProps.x = Math.max(0, newProps.x);
            if (newProps.y !== undefined) newProps.y = Math.max(0, newProps.y);
            if (newProps.width !== undefined && newProps.x !== undefined) newProps.width = Math.min(newProps.width, image.naturalWidth - newProps.x);
            if (newProps.height !== undefined && newProps.y !== undefined) newProps.height = Math.min(newProps.height, image.naturalHeight - newProps.y);
        }
        
        updateShape(initialShape.id, newProps);
    };
    
    const setActiveShape = (id: string | null) => {
        setSelectedShapeId(id);
    };

    const handleMouseUp = () => {
        actionStateRef.current = { type: null, handle: null, startX: 0, startY: 0, initialShape: null };
    };

    const handleBlurChange = (value: number) => {
      if (selectedShapeId) {
        updateShape(selectedShapeId, { blurAmount: value });
      }
    };

    const toolInfo = t.tools.list.find(tool => tool.icon === 'Aperture');
    const selectedShape = shapes.find(s => s.id === selectedShapeId);

    if (!image) {
        return (
            <div className="flex min-h-screen flex-col bg-white">
                <Header />
                <main className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <h1 className="text-4xl font-bold">{toolInfo?.title}</h1>
                    <p className="mt-2 text-lg text-muted-foreground">{toolInfo?.description}</p>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    <Button onClick={() => fileInputRef.current?.click()} className="mt-8" style={{ width: '320px', height: '90px', fontSize: '1.25rem' }}>
                        <UploadCloud className="mr-2 h-6 w-6" /> {t.compressImagePage.selectButton}
                    </Button>
                </main>
                <Footer />
            </div>
        );
    }
    
    let displayWidth = 600;
    let displayHeight = 760;
    if (image && containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        
        const imageAspectRatio = image.naturalWidth / image.naturalHeight;
        let canvasWidth = containerWidth;
        let canvasHeight = canvasWidth / imageAspectRatio;

        if (canvasHeight > containerHeight) {
            canvasHeight = containerHeight;
            canvasWidth = canvasHeight * imageAspectRatio;
        }
        displayWidth = Math.min(600, canvasWidth);
        displayHeight = Math.min(760, canvasHeight);
        scaleRef.current = displayWidth / image.naturalWidth;
    }


    return (
        <div className="flex h-screen w-full flex-col">
            <Header />
            <div className="flex flex-1 overflow-hidden">
                <main ref={containerRef} className="flex-1 flex flex-col items-center justify-center p-4 bg-gray-100">
                    <div
                        id="interactionOverlay"
                        ref={interactionOverlayRef}
                        className="relative"
                        style={{ width: displayWidth, height: displayHeight }}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        <canvas 
                            ref={canvasRef} 
                            className="absolute top-0 left-0 bg-white"
                            style={{ width: displayWidth, height: displayHeight }}
                        />
                        <div 
                            className="absolute inset-0"
                            onMouseDown={onMouseDown}
                        >
                            {shapes.map(shape => (
                                <div 
                                    key={shape.id}
                                    id={shape.id}
                                    className={`blur-shape absolute cursor-grab ${shape.type === 'circle' ? 'rounded-full' : ''} border-2 border-dashed ${selectedShapeId === shape.id ? 'border-primary bg-primary/30 z-10' : 'border-blue-500 bg-blue-500/20'}`}
                                    style={{
                                        left: shape.x * scaleRef.current,
                                        top: shape.y * scaleRef.current,
                                        width: shape.width * scaleRef.current,
                                        height: shape.height * scaleRef.current
                                    }}
                                >
                                {selectedShapeId === shape.id && (
                                    <>
                                        {shape.type === 'rect' ? (
                                            <>
                                            <div className="absolute w-3 h-3 bg-primary border-2 border-white rounded-sm -top-1.5 -left-1.5 cursor-nwse-resize" data-handle="top-left" />
                                            <div className="absolute w-3 h-3 bg-primary border-2 border-white rounded-sm -top-1.5 -right-1.5 cursor-nesw-resize" data-handle="top-right" />
                                            <div className="absolute w-3 h-3 bg-primary border-2 border-white rounded-sm -bottom-1.5 -left-1.5 cursor-nesw-resize" data-handle="bottom-left" />
                                            <div className="absolute w-3 h-3 bg-primary border-2 border-white rounded-sm -bottom-1.5 -right-1.5 cursor-nwse-resize" data-handle="bottom-right" />
                                            <div className="absolute w-3 h-3 bg-primary border-2 border-white rounded-sm -top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize" data-handle="top" />
                                            <div className="absolute w-3 h-3 bg-primary border-2 border-white rounded-sm -bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize" data-handle="bottom" />
                                            <div className="absolute w-3 h-3 bg-primary border-2 border-white rounded-sm top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize" data-handle="left" />
                                            <div className="absolute w-3 h-3 bg-primary border-2 border-white rounded-sm top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize" data-handle="right" />
                                            </>
                                        ) : (
                                            <div className="absolute w-3 h-3 bg-primary border-2 border-white rounded-full top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize" data-handle="circle-r" />
                                        )}
                                    </>
                                )}
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
                <aside className="w-[350px] border-l bg-white p-6 flex flex-col gap-6 overflow-y-auto" style={{height: 'calc(100vh - 56px)'}}>
                    <div className="flex-grow space-y-6">
                        <h2 className="text-2xl font-bold">{toolInfo?.title}</h2>
                        
                        <div className="space-y-2">
                            <Label>{t.blurImage.addShapes}</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" onClick={() => addShape('rect')}><RectangleHorizontal className="mr-2"/> {t.blurImage.shapeRectangle}</Button>
                                <Button variant="outline" onClick={() => addShape('circle')}><Circle className="mr-2"/> {t.blurImage.shapeCircle}</Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t.blurImage.shapeControls}</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" onClick={handleClearSelected} disabled={!selectedShapeId}><Trash2 className="mr-2"/> {t.blurImage.clearSelected}</Button>
                                <Button variant="outline" onClick={handleDuplicate} disabled={!selectedShapeId}><Copy className="mr-2"/> {t.blurImage.duplicate}</Button>
                            </div>
                        </div>
                        
                         <div className="space-y-2">
                            <Label>{selectedShape ? t.blurImage.selectedBlurAmount : t.blurImage.blurAmount}: {selectedShape ? selectedShape.blurAmount : '-'}px</Label>
                            <Slider
                                value={[selectedShape ? selectedShape.blurAmount : 25]}
                                onValueChange={([v]) => handleBlurChange(v)}
                                min={1} max={100} step={1}
                                disabled={!selectedShapeId}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t.blurImage.generalControls}</Label>
                             <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" onClick={handleStartOver}><RefreshCw className="mr-2"/> {t.blurImage.changeImage}</Button>
                                <Button variant="destructive" onClick={handleClearAll} disabled={shapes.length === 0}><Eraser className="mr-2"/> {t.blurImage.clearAll}</Button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto">
                        <Button onClick={handleDownload} size="lg" className="w-full" disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="mr-2 animate-spin"/> : <Download className="mr-2" />}
                            {t.blurImage.applyButton}
                        </Button>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default BlurImagePage;

    