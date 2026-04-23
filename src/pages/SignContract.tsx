import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useDigitalSignatures } from '@/hooks/useDigitalSignatures';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

const SignContract = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const { validateSignatureToken, saveSignature } = useDigitalSignatures();

  useEffect(() => {
    const loadContract = async () => {
      if (!token) {
        toast({
          title: "خطأ",
          description: "رمز التوقيع غير صحيح",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      const tokenData = await validateSignatureToken(token);
      if (!tokenData) {
        toast({
          title: "خطأ",
          description: "رمز التوقيع غير صالح أو منتهي الصلاحية",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      // Mock contract data for local storage version
      const mockContract = {
        id: tokenData.contract_id,
        contract_number: 'C001',
        customer_name: 'عميل تجريبي',
        customer_email: 'test@example.com',
        vehicle: 'تويوتا كورولا 2022',
        start_date: '2024-01-01',
        end_date: '2024-01-07',
        total_amount: 1400,
        notes: 'عقد تجريبي للاختبار'
      };

      setContract(mockContract);
      setSignerEmail(mockContract.customer_email || '');
      setSignerName(mockContract.customer_name || '');
      setLoading(false);
    };

    loadContract();
  }, [token, validateSignatureToken, navigate, toast]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (canvas && rect) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (canvas && rect) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const handleSubmitSignature = async () => {
    if (!signerName || !signerEmail) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع البيانات المطلوبة",
        variant: "destructive"
      });
      return;
    }

    if (!agreedToTerms) {
      toast({
        title: "خطأ",
        description: "يرجى الموافقة على شروط العقد",
        variant: "destructive"
      });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check if signature is drawn
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasSignature = imageData.data.some((pixel, index) => index % 4 === 3 && pixel > 0);

    if (!hasSignature) {
      toast({
        title: "خطأ",
        description: "يرجى رسم التوقيع أولاً",
        variant: "destructive"
      });
      return;
    }

    setSigning(true);

    try {
      const signatureDataUrl = canvas.toDataURL();
      const result = await saveSignature(
        contract.id,
        token!,
        signatureDataUrl,
        signerName,
        signerEmail
      );

      if (result) {
        toast({
          title: "تم بنجاح",
          description: "تم توقيع العقد بنجاح"
        });
        
        // Redirect to a success page or contract view
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (error) {
      console.error('Error signing contract:', error);
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">جاري تحميل العقد...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-destructive font-semibold">لم يتم العثور على العقد</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6 rounded-[var(--radius)] border border-primary/10 bg-card/95 shadow-2xl shadow-primary/10">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-black tracking-tight">
              توقيع العقد الرقمي
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-card/60 border border-primary/10 rounded-[var(--radius)] p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">تفاصيل العقد</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p><strong>رقم العقد:</strong> {contract.contract_number}</p>
                  <p><strong>اسم العميل:</strong> {contract.customer_name}</p>
                  <p><strong>المركبة:</strong> {contract.vehicle}</p>
                </div>
                <div>
                  <p><strong>تاريخ البداية:</strong> {contract.start_date}</p>
                  <p><strong>تاريخ النهاية:</strong> {contract.end_date}</p>
                  <p><strong>المبلغ الإجمالي:</strong> {contract.total_amount} د.م</p>
                </div>
              </div>
              {contract.notes && (
                <div className="mt-4">
                  <p><strong>ملاحظات:</strong> {contract.notes}</p>
                </div>
              )}
            </div>

            <Separator className="my-6" />

            {/* Signer Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <Label htmlFor="signerName">اسم الموقع</Label>
                <Input
                  id="signerName"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="أدخل اسمك الكامل"
                />
              </div>
              <div>
                <Label htmlFor="signerEmail">البريد الإلكتروني</Label>
                <Input
                  id="signerEmail"
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="أدخل بريدك الإلكتروني"
                />
              </div>
            </div>

            {/* Signature Canvas */}
            <div className="mb-6">
              <Label className="text-lg font-semibold mb-4 block">التوقيع</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  className="border border-border rounded bg-card cursor-crosshair w-full"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  style={{ touchAction: 'none' }}
                />
                <div className="mt-2 text-center">
                  <Button variant="outline" size="sm" onClick={clearSignature} className="rounded-[var(--radius)]">
                    مسح التوقيع
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  اضغط واسحب لرسم توقيعك في المربع أعلاه
                </p>
              </div>
            </div>

            {/* Terms Agreement */}
            <div className="flex items-center space-x-2 mb-6">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              />
              <Label htmlFor="terms" className="text-sm mr-2">
                أوافق على جميع شروط وأحكام هذا العقد وأؤكد صحة البيانات المدخلة
              </Label>
            </div>

            {/* Submit Button */}
            <div className="text-center">
              <Button
                onClick={handleSubmitSignature}
                disabled={signing || !agreedToTerms}
                className="px-8 py-3 text-lg rounded-[var(--radius)] bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
              >
                {signing ? "جاري الحفظ..." : "توقيع العقد"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignContract;
