interface Props {
  signatureData?: string; // base64 image string
  width?: number;
  height?: number;
  className?: string;
}

export const SignatureRenderer = ({ 
  signatureData, 
  width = 200, 
  height = 80,
  className = ""
}: Props) => {
  console.log('[SignatureRenderer] Rendering signature:', { 
    hasData: !!signatureData, 
    dataLength: signatureData?.length || 0,
    dataPreview: signatureData?.substring(0, 50) + '...',
    startsWithDataImage: signatureData?.startsWith('data:image/')
  });
  
  if (!signatureData || signatureData.trim() === '' || signatureData.length < 50) {
    return (
      <div 
        className={`flex items-center justify-center border border-gray-200 bg-gray-50 ${className}`} 
        style={{ width, height }}
      >
        <p className="text-gray-400 text-sm">Aucune signature</p>
      </div>
    );
  }

  // Ensure it's a valid base64 image
  if (!signatureData.startsWith('data:image/')) {
    console.warn('[SignatureRenderer] Invalid image data format');
    return (
      <div 
        className={`flex items-center justify-center border border-gray-200 bg-gray-50 ${className}`} 
        style={{ width, height }}
      >
        <p className="text-gray-400 text-sm">Format de signature invalide</p>
      </div>
    );
  }

  return (
    <div className={className} style={{ width, height }}>
      <img 
        src={signatureData} 
        alt="Signature" 
        className="w-full h-full object-contain border border-gray-200"
        style={{ width, height }}
        onError={(e) => {
          console.error('[SignatureRenderer] Image load error:', e);
        }}
        onLoad={() => {
          console.log('[SignatureRenderer] Image loaded successfully');
        }}
      />
    </div>
  );
};