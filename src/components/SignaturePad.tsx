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
  id?: string; // Unique identifier to prevent conflicts
}

export const SignaturePad = ({ 
  value, 
  onChange, 
  width = 300, 
  height = 120, 
  readOnly = false,
  title,
  id = `signature-${Date.now()}-${Math.floor(Math.random() * 1000)}` // More stable unique ID
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [isDrawing, setIsDrawing] = useState(true);

  useEffect(() => {
    if (!canvasRef.current || fabricCanvas) return; // Prevent re-initialization

    console.log(`[SignaturePad:${id}] Initializing new signature pad with:`, { width, height, readOnly, hasValue: !!value });
    
    // Set unique canvas ID to prevent conflicts
    canvasRef.current.id = `canvas-${id}`;
    
    const canvas = new FabricCanvas(canvasRef.current, {
      width,
      height,
      backgroundColor: "#ffffff",
      selection: false,
      enableRetinaScaling: true,
      allowTouchScrolling: false
    });

    // Configure drawing mode and create brush for Fabric.js v6
    canvas.isDrawingMode = !readOnly && isDrawing;
    
    // Create PencilBrush explicitly for Fabric.js v6
    if (!readOnly) {
      console.log(`[SignaturePad:${id}] Creating PencilBrush for Fabric.js v6`);
      try {
        const pencilBrush = new PencilBrush(canvas);
        pencilBrush.color = "#000000";
        pencilBrush.width = 2;
        canvas.freeDrawingBrush = pencilBrush;
        console.log(`[SignaturePad:${id}] PencilBrush created and configured successfully`);
      } catch (error) {
        console.error(`[SignaturePad:${id}] Error creating PencilBrush:`, error);
      }
    }
    
    console.log(`[SignaturePad:${id}] Canvas configured - Drawing mode:`, canvas.isDrawingMode);

    // Load existing signature image if provided
    if (value && value.trim() && value.length > 50) {
      console.log(`[SignaturePad:${id}] Loading existing signature image, length:`, value.length);
      console.log(`[SignaturePad:${id}] Image data preview:`, value.substring(0, 50) + '...');
      
      if (value.startsWith('data:image/')) {
        const img = new Image();
        img.onload = () => {
          console.log(`[SignaturePad:${id}] Image loaded successfully, adding to canvas`);
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
          console.log(`[SignaturePad:${id}] Image added to canvas and rendered`);
        };
        img.onerror = (error) => {
          console.error(`[SignaturePad:${id}] Error loading signature image:`, error);
        };
        img.src = value;
      } else {
        console.warn(`[SignaturePad:${id}] Invalid image format - expected data:image/`);
      }
    } else {
      console.log(`[SignaturePad:${id}] No valid signature data to load`);
    }

  // Convert canvas to image on any drawing
  const handlePathCreated = () => {
    console.log(`[SignaturePad:${id}] Path created - converting to image`);
    
    // Use setTimeout for better canvas rendering
    setTimeout(() => {
      try {
        const imageData = canvas.toDataURL({
          format: 'png',
          quality: 0.9,
          multiplier: 2
        });
        console.log(`[SignaturePad:${id}] Signature converted to image, length:`, imageData.length);
        console.log(`[SignaturePad:${id}] Signature data preview:`, imageData.substring(0, 50) + '...');
        
        // Check if canvas has actual content
        const canvasElement = canvas.getElement();
        const ctx = canvasElement.getContext('2d');
        const imageDataArray = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);
        const hasContent = imageDataArray.data.some((pixel, index) => index % 4 === 3 && pixel > 0);
        
        if (onChange && imageData && imageData.length > 100 && hasContent) {
          console.log(`[SignaturePad:${id}] SUCCESS: Calling onChange with signature data`);
          console.log(`[SignaturePad:${id}] Signature type: ${id.includes('delivery-agent') ? 'delivery_agent_signature' : id.includes('delivery-tenant') ? 'delivery_tenant_signature' : id.includes('return-agent') ? 'return_agent_signature' : id.includes('return-tenant') ? 'return_tenant_signature' : 'unknown'}`);
          onChange(imageData);
          console.log(`[SignaturePad:${id}] onChange call completed successfully`);
        } else {
          console.log(`[SignaturePad:${id}] WARNING: onChange not called - missing onChange, empty imageData, or no content`);
          console.log(`[SignaturePad:${id}] - onChange exists:`, !!onChange);
          console.log(`[SignaturePad:${id}] - imageData length:`, imageData?.length || 0);
          console.log(`[SignaturePad:${id}] - hasContent:`, hasContent);
        }
      } catch (error) {
        console.error(`[SignaturePad:${id}] Error converting canvas to image:`, error);
      }
    }, 100);
  };

    const handleCanvasCleared = () => {
      console.log(`[SignaturePad:${id}] Canvas cleared - sending empty string`);
      if (onChange) {
        onChange("");
        console.log(`[SignaturePad:${id}] Empty signature data sent via onChange`);
      }
    };

    // Track drawing state to prevent accidental clearing
    let hasBeenDrawnOn = false;
    let isInitialized = false;
    
    canvas.on('path:created', (e) => {
      hasBeenDrawnOn = true;
      console.log(`[SignaturePad:${id}] Path created detected, hasBeenDrawnOn:`, hasBeenDrawnOn);
      handlePathCreated();
    });
    
    canvas.on('canvas:cleared', () => {
      console.log(`[SignaturePad:${id}] Canvas cleared event, hasBeenDrawnOn was:`, hasBeenDrawnOn, 'isInitialized:', isInitialized);
      // Only send empty data if it's an intentional clear after drawing
      if (hasBeenDrawnOn || isInitialized) {
        handleCanvasCleared();
      }
      hasBeenDrawnOn = false;
    });
    
    // Mark as initialized after setup
    setTimeout(() => {
      isInitialized = true;
      console.log(`[SignaturePad:${id}] Initialization complete`);
    }, 200);
    
    // Additional debugging for mouse/touch events - Backup method for capturing signatures
    canvas.on('mouse:up', () => {
      console.log(`[SignaturePad:${id}] Mouse up event - checking for changes`);
      // Force conversion to image after mouse up as backup
      setTimeout(() => {
        try {
          const canvasElement = canvas.getElement();
          const ctx = canvasElement.getContext('2d');
          const imageDataArray = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);
          const hasContent = imageDataArray.data.some((pixel, index) => index % 4 === 3 && pixel > 0);
          
          if (hasContent) {
            const imageData = canvas.toDataURL({
              format: 'png',
              quality: 0.9,
              multiplier: 2
            });
            if (onChange && imageData && imageData.length > 100) {
              console.log(`[SignaturePad:${id}] Backup conversion after mouse:up, sending signature`);
              console.log(`[SignaturePad:${id}] Backup signature type: ${id.includes('delivery-agent') ? 'delivery_agent_signature' : id.includes('delivery-tenant') ? 'delivery_tenant_signature' : id.includes('return-agent') ? 'return_agent_signature' : id.includes('return-tenant') ? 'return_tenant_signature' : 'unknown'}`);
              onChange(imageData);
            }
          } else {
            console.log(`[SignaturePad:${id}] Mouse up - no content detected`);
          }
        } catch (error) {
          console.error(`[SignaturePad:${id}] Error in mouse:up handler:`, error);
        }
      }, 200);
    });

    setFabricCanvas(canvas);

    return () => {
      canvas.off('path:created', handlePathCreated);
      canvas.off('canvas:cleared', handleCanvasCleared);
      canvas.dispose();
    };
  }, [width, height, readOnly, value, onChange, id]);

  // Update canvas when value prop changes (important for readOnly mode)
  useEffect(() => {
    if (!fabricCanvas) return;
    
    if (value && value.trim() && value.length > 50 && value.startsWith('data:image/')) {
      console.log(`[SignaturePad:${id}] Loading signature in canvas`);
      
      const img = new Image();
      img.onload = () => {
        console.log(`[SignaturePad:${id}] Image loaded for display`);
        try {
          // Only clear if we can safely do so
          if (fabricCanvas.getObjects().length > 0) {
            fabricCanvas.clear();
          }
          
          const fabricImg = new FabricImage(img, {
            left: 0,
            top: 0,
            scaleX: width / img.width,
            scaleY: height / img.height,
            selectable: false,
            evented: false
          });
          
          fabricCanvas.add(fabricImg);
          fabricCanvas.renderAll();
          console.log(`[SignaturePad:${id}] Signature displayed successfully`);
        } catch (error) {
          console.error(`[SignaturePad:${id}] Error displaying signature:`, error);
        }
      };
      img.onerror = (error) => {
        console.error(`[SignaturePad:${id}] Error loading signature image:`, error);
      };
      img.src = value;
    } else if (!value || value.trim() === '' || value.length < 50) {
      console.log(`[SignaturePad:${id}] No signature data - keeping canvas clean`);
      try {
        if (fabricCanvas.getObjects().length > 0) {
          fabricCanvas.clear();
          fabricCanvas.renderAll();
        }
      } catch (error) {
        console.error(`[SignaturePad:${id}] Error clearing empty canvas:`, error);
      }
    }
  }, [value, fabricCanvas, width, height, id]);

  // Update drawing mode when isDrawing changes
  useEffect(() => {
    if (fabricCanvas && !readOnly) {
      console.log(`[SignaturePad:${id}] Updating drawing mode to:`, isDrawing);
      fabricCanvas.isDrawingMode = isDrawing;
      
      // Ensure brush is properly configured for Fabric.js v6
      if (isDrawing) {
        if (!fabricCanvas.freeDrawingBrush) {
          console.log(`[SignaturePad:${id}] Creating new PencilBrush in useEffect`);
          try {
            const pencilBrush = new PencilBrush(fabricCanvas);
            pencilBrush.color = "#000000";
            pencilBrush.width = 2;
            fabricCanvas.freeDrawingBrush = pencilBrush;
            console.log(`[SignaturePad:${id}] PencilBrush created in useEffect`);
          } catch (error) {
            console.error(`[SignaturePad:${id}] Error creating PencilBrush in useEffect:`, error);
          }
        } else {
          fabricCanvas.freeDrawingBrush.color = "#000000";
          fabricCanvas.freeDrawingBrush.width = 2;
          console.log(`[SignaturePad:${id}] Existing brush configured`);
        }
      }
    }
  }, [isDrawing, fabricCanvas, readOnly, id]);

  const clearSignature = () => {
    if (!fabricCanvas) return;
    console.log(`[SignaturePad:${id}] Manually clearing signature`);
    
    try {
      fabricCanvas.clear();
      fabricCanvas.renderAll();
      onChange?.("");
      console.log(`[SignaturePad:${id}] Signature cleared successfully`);
    } catch (error) {
      console.error(`[SignaturePad:${id}] Error clearing signature:`, error);
      // Still call onChange even if clear fails
      onChange?.("");
    }
  };

  const toggleDrawingMode = () => {
    const newDrawingState = !isDrawing;
    console.log(`[SignaturePad:${id}] Toggling drawing mode from`, isDrawing, 'to', newDrawingState);
    setIsDrawing(newDrawingState);
    
    if (fabricCanvas) {
      fabricCanvas.isDrawingMode = newDrawingState;
      
      if (newDrawingState && !fabricCanvas.freeDrawingBrush) {
        console.log(`[SignaturePad:${id}] Creating brush for toggle`);
        try {
          const pencilBrush = new PencilBrush(fabricCanvas);
          pencilBrush.color = "#000000";
          pencilBrush.width = 2;
          fabricCanvas.freeDrawingBrush = pencilBrush;
          console.log(`[SignaturePad:${id}] Brush created on toggle`);
        } catch (error) {
          console.error(`[SignaturePad:${id}] Error creating brush on toggle:`, error);
        }
      }
    }
  };

  if (readOnly) {
    return (
      <div className="space-y-2">
        {title && <div className="text-xs text-muted-foreground">{title}</div>}
        <div className="border border-border rounded-md overflow-hidden bg-background">
          <canvas ref={canvasRef} id={`canvas-${id}`} />
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
          id={`canvas-${id}`}
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