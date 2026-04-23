import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Image as FabricImage, PencilBrush } from "fabric";
import { Button } from "@/components/ui/button";
import { Eraser, Pen, RotateCcw } from "lucide-react";

interface Props {
  value?: string; // base64 image string
  onChange?: (signatureImage: string) => void;
  width?: number;
  height?: number;
  readOnly?: boolean;
  title?: string;
  id: string; // Required unique identifier
}

export const SignaturePadSimple = ({ 
  value, 
  onChange, 
  width = 300, 
  height = 120, 
  readOnly = false,
  title,
  id
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [isDrawing, setIsDrawing] = useState(true);
  const [canvasKey, setCanvasKey] = useState(0); // Force re-render key

  useEffect(() => {
    if (!canvasRef.current) return;

    console.log(`[SignaturePadSimple:${id}] Initializing canvas`);
    
    const canvas = new FabricCanvas(canvasRef.current, {
      width,
      height,
      backgroundColor: "#ffffff",
      selection: false,
      enableRetinaScaling: true,
      allowTouchScrolling: false
    });

    // Configure drawing mode and create brush
    canvas.isDrawingMode = !readOnly && isDrawing;
    
    if (!readOnly) {
      const pencilBrush = new PencilBrush(canvas);
      pencilBrush.color = "#000000";
      pencilBrush.width = 2;
      canvas.freeDrawingBrush = pencilBrush;
    }

    // Load existing signature if provided
    if (value && value.trim() && value.length > 50 && value.startsWith('data:image/')) {
      console.log(`[SignaturePadSimple:${id}] Loading existing signature`);
      
      const img = new Image();
      img.onload = () => {
        const fabricImg = new FabricImage(img, {
          left: 0,
          top: 0,
          scaleX: width / img.width,
          scaleY: height / img.height,
          selectable: false,
          evented: false
        });
        canvas.add(fabricImg);
        canvas.renderAll();
        console.log(`[SignaturePadSimple:${id}] Signature loaded successfully`);
      };
      img.src = value;
    }

    // Handle drawing events
    const handlePathCreated = () => {
      console.log(`[SignaturePadSimple:${id}] Path created, converting to image`);
      
      setTimeout(() => {
        try {
          const imageData = canvas.toDataURL({
            format: 'png',
            quality: 0.9,
            multiplier: 2
          });
          
          // Check if canvas has actual content
          const canvasElement = canvas.getElement();
          const ctx = canvasElement.getContext('2d');
          if (ctx) {
            const imageDataArray = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);
            const hasContent = imageDataArray.data.some((pixel, index) => index % 4 === 3 && pixel > 0);
            
            if (onChange && imageData && hasContent) {
              console.log(`[SignaturePadSimple:${id}] Sending signature data (${imageData.length} chars)`);
              onChange(imageData);
            }
          }
        } catch (error) {
          console.error(`[SignaturePadSimple:${id}] Error converting to image:`, error);
        }
      }, 100);
    };

    canvas.on('path:created', handlePathCreated);
    
    setFabricCanvas(canvas);

    return () => {
      canvas.off('path:created', handlePathCreated);
      canvas.dispose();
    };
  }, [canvasKey, readOnly]); // Include canvasKey to force re-init

  // Update drawing mode
  useEffect(() => {
    if (fabricCanvas && !readOnly) {
      fabricCanvas.isDrawingMode = isDrawing;
      
      if (isDrawing && fabricCanvas.freeDrawingBrush) {
        fabricCanvas.freeDrawingBrush.color = "#000000";
        fabricCanvas.freeDrawingBrush.width = 2;
      }
    }
  }, [isDrawing, fabricCanvas, readOnly]);

  const clearSignature = () => {
    if (!fabricCanvas) return;
    
    console.log(`[SignaturePadSimple:${id}] Clearing signature`);
    try {
      fabricCanvas.clear();
      fabricCanvas.renderAll();
      onChange?.("");
      console.log(`[SignaturePadSimple:${id}] Signature cleared`);
    } catch (error) {
      console.error(`[SignaturePadSimple:${id}] Error clearing:`, error);
      // Force canvas recreation on error
      setCanvasKey(prev => prev + 1);
      onChange?.("");
    }
  };

  const toggleDrawingMode = () => {
    setIsDrawing(!isDrawing);
  };

  if (readOnly) {
    return (
      <div className="space-y-2">
        {title && <div className="text-xs text-muted-foreground">{title}</div>}
        <div className="border border-border rounded-md overflow-hidden bg-background">
          <canvas 
            ref={canvasRef} 
            key={`canvas-${id}-${canvasKey}`}
            style={{ display: 'block' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {title && <div className="text-xs text-muted-foreground">{title}</div>}
      <div className="border border-border rounded-md overflow-hidden bg-background">
        <canvas 
          ref={canvasRef}
          key={`canvas-${id}-${canvasKey}`}
          style={{ 
            display: 'block', 
            cursor: isDrawing ? 'crosshair' : 'default',
            touchAction: 'none'
          }}
        />
      </div>
      <div className="flex gap-2 justify-center">
        <Button
          type="button"
          variant={isDrawing ? "default" : "outline"}
          size="sm"
          onClick={toggleDrawingMode}
          className="h-8 px-3"
        >
          <Pen className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant={!isDrawing ? "default" : "outline"}
          size="sm"
          onClick={toggleDrawingMode}
          className="h-8 px-3"
        >
          <Eraser className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearSignature}
          className="h-8 px-3"
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};