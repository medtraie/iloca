import React, { useRef, useEffect, useState } from 'react';
import banqueImage from '@/assets/banque.png';

interface AnimatedObjectProps {
  type: 'cash' | 'check';
  amount: number;
}

export const TransferAnimation3D = ({ type, amount }: AnimatedObjectProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [animationProgress, setAnimationProgress] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    // Load bank image
    const bankImg = new Image();
    bankImg.src = banqueImage;
    
    let animationId: number;
    let startTime = Date.now();

    const animate = () => {
      const currentTime = Date.now();
      const elapsed = (currentTime - startTime) / 3000; // 3 seconds animation
      const progress = Math.min(elapsed, 1);
      
      setAnimationProgress(progress);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      gradient.addColorStop(0, '#1e3a8a');
      gradient.addColorStop(0.5, '#7c3aed');
      gradient.addColorStop(1, '#3730a3');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      // Draw moving object
      const startX = 50;
      const endX = canvas.offsetWidth - 100;
      const currentX = startX + (endX - startX) * progress;
      const currentY = canvas.offsetHeight / 2 + Math.sin(progress * Math.PI * 4) * 20;

      // Calculate object opacity (fades out when reaching bank)
      const objectOpacity = progress < 0.9 ? 1 : Math.max(0, 1 - (progress - 0.9) / 0.1);

      // Draw object based on type (with opacity)
      if (type === 'cash') {
        drawCash(ctx, currentX, currentY, progress, objectOpacity);
      } else {
        drawCheck(ctx, currentX, currentY, progress, objectOpacity);
      }

      // Draw bank with image
      drawBank(ctx, canvas.offsetWidth - 80, canvas.offsetHeight / 2, bankImg);

      // Draw amount text (fades with object)
      if (objectOpacity > 0) {
        ctx.globalAlpha = objectOpacity;
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${amount.toLocaleString()} DH`, currentX, currentY - 30);
        ctx.globalAlpha = 1;
      }

      // Continue animation if not complete
      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [type, amount]);

  const drawCash = (ctx: CanvasRenderingContext2D, x: number, y: number, progress: number, opacity: number = 1) => {
    ctx.globalAlpha = opacity;
    // Draw multiple bills
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(x, y + i * 2);
      ctx.rotate(Math.sin(progress * Math.PI * 6) * 0.1);
      
      // Bill background
      ctx.fillStyle = `hsl(${120 - i * 10}, 70%, 50%)`;
      ctx.fillRect(-30, -8, 60, 16);
      
      // Bill details
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(-25, -6, 50, 2);
      ctx.fillRect(-25, -2, 50, 2);
      ctx.fillRect(-25, 2, 50, 2);
      
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };

  const drawCheck = (ctx: CanvasRenderingContext2D, x: number, y: number, progress: number, opacity: number = 1) => {
    ctx.globalAlpha = opacity;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(progress * Math.PI * 4) * 0.05);
    
    // Check background
    ctx.fillStyle = '#e0e7ff';
    ctx.fillRect(-40, -15, 80, 30);
    
    // Check border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(-40, -15, 80, 30);
    
    // Check lines
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-30, -5);
    ctx.lineTo(30, -5);
    ctx.moveTo(-30, 0);
    ctx.lineTo(30, 0);
    ctx.moveTo(-30, 5);
    ctx.lineTo(30, 5);
    ctx.stroke();
    
    ctx.restore();
    ctx.globalAlpha = 1;
  };

  const drawBank = (ctx: CanvasRenderingContext2D, x: number, y: number, bankImg: HTMLImageElement) => {
    // Draw bank image if loaded, otherwise draw simple bank
    if (bankImg.complete && bankImg.naturalWidth > 0) {
      const imgSize = 100;
      ctx.drawImage(bankImg, x - imgSize/2, y - imgSize/2, imgSize, imgSize);
    } else {
      // Fallback: simple bank drawing
      ctx.fillStyle = '#1e40af';
      ctx.fillRect(x - 25, y - 40, 50, 80);
      
      // Bank columns
      ctx.fillStyle = 'white';
      for (let i = 0; i < 4; i++) {
        const colX = x - 20 + i * 12;
        ctx.fillRect(colX, y - 35, 3, 70);
      }
      
      // Bank roof
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(x - 30, y - 45, 60, 8);
      
      // Bank text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('BANQUE', x, y - 10);
    }
  };

  return (
    <div className="w-full h-64 rounded-lg overflow-hidden bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 relative">
      <canvas 
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
      
      {/* Progress indicator */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="bg-white/20 rounded-full h-2">
          <div 
            className="bg-white rounded-full h-2 transition-all duration-100"
            style={{ width: `${animationProgress * 100}%` }}
          />
        </div>
      </div>
      
      {/* Status text */}
      <div className="absolute top-4 left-4 text-white">
        <div className="text-sm font-medium">
          {animationProgress < 1 ? 'Transfert en cours...' : 'Transfert terminé'}
        </div>
        <div className="text-xs opacity-75">
          {type === 'cash' ? 'Espèces' : 'Chèque'} → Banque
        </div>
      </div>
    </div>
  );
};