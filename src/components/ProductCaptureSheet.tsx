import { Barcode, Camera, Check, ImagePlus, LoaderCircle, RefreshCw, ScanLine } from 'lucide-react';
import type { BrowserMultiFormatReader } from '@zxing/browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../app/I18nContext';
import { EntrySheet } from './EntrySheet';
import { ShoppingAttachment } from './ShoppingAttachment';
import { Text } from './Typography';

export interface ProductCaptureResult {
  barcode?: string;
  name?: string;
  brand?: string;
  imageUrl?: string;
}

interface ProductCaptureSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onUse: (result: ProductCaptureResult) => void;
}

interface DetectedBarcode { rawValue: string }
interface BarcodeDetectorLike {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

const makeDetector = (): BarcodeDetectorLike | null => {
  const Detector = (window as typeof window & { BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike }).BarcodeDetector;
  if (!Detector) return null;
  return new Detector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
};

const resizePhoto = async (file: Blob): Promise<string> => {
  const bitmap = await createImageBitmap(file);
  const maxSide = 900;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.76);
};

const lookupProduct = async (barcode: string): Promise<ProductCaptureResult> => {
  const normalizedBarcode = barcode.replace(/\D/gu, '').padStart(13, '0');
  const fields = 'code,product_name,product_name_sv,generic_name_sv,brands,image_front_url,image_front_small_url';
  const response = await fetch(`https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(normalizedBarcode)}.json?fields=${fields}&product_type=all&lc=sv&cc=se`);
  if (!response.ok) return { barcode };
  const data = await response.json() as { product?: { product_name?: string; product_name_sv?: string; generic_name_sv?: string; brands?: string; image_front_url?: string; image_front_small_url?: string } };
  if (!data.product) return { barcode };
  return {
    barcode,
    name: data.product.product_name_sv?.trim() || data.product.product_name?.trim() || data.product.generic_name_sv?.trim() || undefined,
    brand: data.product.brands?.split(',')[0]?.trim() || undefined,
    imageUrl: data.product.image_front_url || data.product.image_front_small_url || undefined
  };
};

export function ProductCaptureSheet({ isOpen, onClose, onUse }: ProductCaptureSheetProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream>();
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const zxingRef = useRef<BrowserMultiFormatReader>();
  const busyRef = useRef(false);
  const [result, setResult] = useState<ProductCaptureResult>();
  const [status, setStatus] = useState('');
  const [cameraReady, setCameraReady] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = undefined;
    setCameraReady(false);
  }, []);

  const handleBarcode = useCallback(async (barcode: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setStatus(t('Looking up product...'));
    try {
      const product = await lookupProduct(barcode);
      setResult(product);
      setStatus(product.name ? t('Product found') : t('Barcode found'));
    } catch {
      setResult({ barcode });
      setStatus(t('Barcode found'));
    } finally {
      busyRef.current = false;
    }
  }, [t]);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setResult(undefined);
      setStatus('');
      return undefined;
    }

    let cancelled = false;
    detectorRef.current = makeDetector();
    void import('@zxing/browser').then(({ BrowserMultiFormatReader }) => {
      if (!cancelled) zxingRef.current = new BrowserMultiFormatReader();
    });
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (cancelled) return stream.getTracks().forEach((track) => track.stop());
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch {
        setStatus(t('Camera unavailable. Choose a photo instead.'));
      }
    };
    void start();
    return () => { cancelled = true; stopCamera(); };
  }, [isOpen, stopCamera, t]);

  useEffect(() => {
    if (!cameraReady || result) return undefined;
    const timer = window.setInterval(async () => {
      if (!videoRef.current || busyRef.current || videoRef.current.readyState < 2) return;
      try {
        const codes = await detectorRef.current?.detect(videoRef.current);
        if (codes?.[0]?.rawValue) void handleBarcode(codes[0].rawValue);
        if (codes?.[0]?.rawValue) return;
      } catch { /* Fall through to ZXing. */ }
      try {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        const cropWidth = Math.round(video.videoWidth * 0.8);
        const cropHeight = Math.round(video.videoHeight * 0.5);
        canvas.width = cropWidth;
        canvas.height = cropHeight;
        canvas.getContext('2d')?.drawImage(video, (video.videoWidth - cropWidth) / 2, (video.videoHeight - cropHeight) / 2, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
        const decoded = zxingRef.current?.decodeFromCanvas(canvas);
        if (decoded?.getText()) void handleBarcode(decoded.getText());
      } catch { /* Keep the camera preview running. */ }
    }, 550);
    return () => window.clearInterval(timer);
  }, [cameraReady, handleBarcode, result]);

  const takePhoto = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) return;
    setResult({ imageUrl: await resizePhoto(blob) });
    setStatus(t('Photo ready'));
  };

  const choosePhoto = async (file?: File) => {
    if (!file) return;
    setStatus(t('Checking photo...'));
    try {
      const bitmap = await createImageBitmap(file);
      const codes = await detectorRef.current?.detect(bitmap);
      if (codes?.[0]?.rawValue) {
        bitmap.close();
        await handleBarcode(codes[0].rawValue);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
      bitmap.close();
      const decoded = zxingRef.current?.decodeFromCanvas(canvas);
      if (decoded?.getText()) {
        await handleBarcode(decoded.getText());
        return;
      }
    } catch { /* A regular product photo is still useful. */ }
    setResult({ imageUrl: await resizePhoto(file) });
    setStatus(t('Photo ready'));
  };

  return (
    <EntrySheet isOpen={isOpen} onClose={onClose} title={t('Scan or photograph')} description={t('Point at a barcode or take a product photo.')} icon={ScanLine} toneClass="text-app-green">
      <div className="capture-stage">
        <video ref={videoRef} muted playsInline className="capture-stage__video" />
        {!cameraReady ? <div className="capture-stage__empty"><Camera className="h-8 w-8" /><Text>{status || t('Starting camera...')}</Text></div> : null}
        {cameraReady && !result ? <div className="capture-reticle"><span /><span /><span /><span /></div> : null}
        {result?.imageUrl ? <img className="capture-stage__result" src={result.imageUrl} alt={result.name || t('Product photo')} /> : null}
      </div>

      {status ? <Text className="mt-2 text-center text-sm" role="status">{status}</Text> : null}

      {result ? (
        <div className="capture-result">
          <ShoppingAttachment src={result.imageUrl} alt={result.name || t('Product photo')} />
          <div className="min-w-0 flex-1">
            <Text className="font-semibold text-app-fg">{result.name || t('Unknown product')}</Text>
            {result.brand ? <Text className="text-sm">{result.brand}</Text> : null}
            {result.barcode ? <Text className="font-mono text-xs">{result.barcode}</Text> : null}
          </div>
        </div>
      ) : null}

      <input ref={fileRef} className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => void choosePhoto(event.target.files?.[0])} />
      <div className="mt-4 grid grid-cols-2 gap-2">
        {result ? (
          <>
            <button type="button" className="secondary-button" onClick={() => { setResult(undefined); setStatus(''); busyRef.current = false; }}><RefreshCw className="h-4 w-4" />{t('Try again')}</button>
            <button type="button" className="primary-button primary-button--green" onClick={() => { onUse(result); onClose(); }}><Check className="h-4 w-4" />{t('Use item')}</button>
          </>
        ) : (
          <>
            <button type="button" className="secondary-button" onClick={() => fileRef.current?.click()}><ImagePlus className="h-4 w-4" />{t('Choose photo')}</button>
            <button type="button" className="primary-button primary-button--green" disabled={!cameraReady} onClick={() => void takePhoto()}>{cameraReady ? <Camera className="h-4 w-4" /> : <LoaderCircle className="h-4 w-4 animate-spin" />}{t('Take photo')}</button>
          </>
        )}
      </div>
      <Text className="mt-3 flex items-center justify-center gap-1.5 text-xs"><Barcode className="h-3.5 w-3.5" />{t('EAN-13, EAN-8 and UPC')}</Text>
    </EntrySheet>
  );
}
