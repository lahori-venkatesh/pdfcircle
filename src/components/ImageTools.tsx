import React, { useState, useCallback, useRef, memo, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Image as ImageIcon, Loader2, X, Crop, Settings2, FileText } from 'lucide-react';
import { useOperationsCache } from '../utils/operationsCache';
import { SEOHeaders } from './SEOHeaders';
import { AdComponent } from './AdComponent';
import { validateFile, ALLOWED_IMAGE_TYPES, createSecureObjectURL, createSecureDownloadLink, revokeBlobUrl } from '../utils/security';

// Interfaces
interface PreviewImage { file: File; preview: string; }
interface ConversionSettings { mode: 'size' | 'quality'; targetSize: number | null; quality: number; format: string; width: number | null; height: number | null; maintainAspectRatio: boolean; unit: 'px' | 'in' | 'cm' | 'mm'; }
interface FormatOption { value: string; label: string; mimeType: string; }
interface CropSettings { width: number; height: number; positionX: number; positionY: number; aspectRatio: string | null; }

// Constants
const FORMAT_OPTIONS: FormatOption[] = [
  { value: 'jpeg', label: 'JPEG', mimeType: 'image/jpeg' },
  { value: 'png', label: 'PNG', mimeType: 'image/png' },
  { value: 'webp', label: 'WebP', mimeType: 'image/webp' },
  { value: 'svg', label: 'SVG', mimeType: 'image/svg+xml' },
  { value: 'pdf', label: 'PDF', mimeType: 'application/pdf' },
  { value: 'avif', label: 'AVIF', mimeType: 'image/avif' },
  { value: 'heic', label: 'HEIC', mimeType: 'image/heic' },
];
const SIZE_OPTIONS = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2];
const UNIT_OPTIONS = ['px', 'in', 'cm', 'mm'];
const ASPECT_RATIOS = [
  { label: 'Freeform', value: null },
  { label: '1:1', value: '1:1' },
  { label: '4:3', value: '4:3' },
  { label: '16:9', value: '16:9' },
  { label: '3:2', value: '3:2' },
];

// Utility Functions
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const parseAspectRatio = (ratio: string | null): number => ratio ? Number(ratio.split(':')[0]) / Number(ratio.split(':')[1]) : 1;

// Memoized Image Preview Component
const ImagePreview = memo(({ image, index, convertedImage, convertedBlob, onRemove, onCrop, onDownload, formatFileSize }: {
  image: PreviewImage; index: number; convertedImage?: string; convertedBlob?: Blob; onRemove: (index: number) => void;
  onCrop: (index: number) => void; onDownload: (index: number) => void; formatFileSize: (bytes: number) => string;
}) => (
  <div className="relative">
    <img src={image.preview} alt={`Image preview ${index}`} className="w-full aspect-square object-contain rounded-lg bg-gray-100" />
    <button onClick={() => onRemove(index)} className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1"><X className="w-4 h-4" /></button>
    <button onClick={() => onCrop(index)} className="absolute bottom-10 right-2 bg-indigo-600 text-white rounded-lg px-2 py-1 flex items-center"><Crop className="w-4 h-4 mr-1" />Crop</button>
    <p className="mt-2 text-sm text-gray-500">Original: {formatFileSize(image.file.size)}</p>
    {convertedImage && (
      <div className="mt-2">
        <img src={convertedImage} alt={`Converted image ${index}`} className="w-full aspect-square object-contain rounded-lg bg-gray-100" />
        <p className="mt-2 text-sm text-gray-500">Converted: {convertedBlob ? formatFileSize(convertedBlob.size) : 'N/A'}</p>
        <button onClick={() => onDownload(index)} className="mt-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"><Download className="w-5 h-5 mr-2" />Download</button>
      </div>
    )}
  </div>
));

export function ImageTools() {
  const { saveOperation } = useOperationsCache();
  const [images, setImages] = useState<PreviewImage[]>([]);
  const [convertedImages, setConvertedImages] = useState<string[]>([]);
  const [convertedBlobs, setConvertedBlobs] = useState<Blob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropImageIndex, setCropImageIndex] = useState<number | null>(null);
  const [cropSettings, setCropSettings] = useState<CropSettings>({ width: 600, height: 600, positionX: 0, positionY: 0, aspectRatio: null });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [scale, setScale] = useState(1);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const cropContainerRef = useRef<HTMLDivElement | null>(null);

  const dataURLtoBlob = useCallback((dataURL: string): Blob => {
    const [header, data] = dataURL.split(',');
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    const binary = atob(data);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    return new Blob([array], { type: mime });
  }, []);

  const blobToDataURL = useCallback((blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }), []);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    const newImages = acceptedFiles
      .filter(file => validateFile(file, ALLOWED_IMAGE_TYPES).isValid)
      .map(file => ({ file, preview: createSecureObjectURL(file) }));

    if (newImages.length !== acceptedFiles.length) setError('Some files were rejected due to invalid type');
    if (fileRejections.length > 0) {
      const rejectionErrors = fileRejections.map(rejection => `${rejection.file.name}: ${rejection.errors.map((e: any) => e.message).join(', ')}`).join('; ');
      setError(`Upload failed: ${rejectionErrors}`);
    }

    setImages(prev => [...prev, ...newImages]);
    setConvertedImages([]);
    setConvertedBlobs([]);
    if (!fileRejections.length) setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.avif', '.heic'] },
    maxFiles: 0,
    maxSize: 15 * 1024 * 1024,
  });

  const handleImageLoad = useCallback(() => {
    if (!imgRef.current || !cropContainerRef.current) return;
    const { naturalWidth, naturalHeight, width, height } = imgRef.current;
    setImageDimensions({ width: naturalWidth, height: naturalHeight });
    const scaleX = width / naturalWidth;
    const scaleY = height / naturalHeight;
    const newScale = Math.min(scaleX, scaleY);
    setScale(newScale);
    const defaultSize = Math.min(naturalWidth, naturalHeight, 600);
    setCropSettings({
      width: defaultSize,
      height: defaultSize,
      positionX: (naturalWidth - defaultSize) / 2,
      positionY: (naturalHeight - defaultSize) / 2,
      aspectRatio: null,
    });
  }, []);

  const applyCrop = useCallback(async (imageSrc: string, cropSettings: CropSettings): Promise<string> => {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = imageSrc;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');

    canvas.width = cropSettings.width;
    canvas.height = cropSettings.height;
    ctx.drawImage(img, cropSettings.positionX, cropSettings.positionY, cropSettings.width, cropSettings.height, 0, 0, cropSettings.width, cropSettings.height);
    return blobToDataURL(await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 1)));
  }, [blobToDataURL]);

  const handleCropComplete = useCallback(async () => {
    if (!cropImageSrc || cropImageIndex === null || !imageDimensions) {
      setError('Invalid crop selection');
      return;
    }

    setLoading(true);
    try {
      const croppedSrc = await applyCrop(cropImageSrc, cropSettings);
      const croppedBlob = dataURLtoBlob(croppedSrc);
      const croppedFile = new File([croppedBlob], images[cropImageIndex]?.file.name || 'cropped.jpg', { type: 'image/jpeg' });

      setImages(prev => {
        const newImages = [...prev];
        revokeBlobUrl(newImages[cropImageIndex].preview);
        newImages[cropImageIndex] = { file: croppedFile, preview: croppedSrc };
        return newImages;
      });

      setShowCropModal(false);
      setCropImageSrc(null);
      setCropImageIndex(null);
    } catch (err) {
      setError(`Cropping failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [cropImageSrc, cropImageIndex, images, applyCrop, dataURLtoBlob, cropSettings, imageDimensions]);

  const [settings, setSettings] = useState<ConversionSettings>({
    mode: 'quality',
    targetSize: null,
    quality: 80,
    format: 'jpeg',
    width: null,
    height: null,
    maintainAspectRatio: true,
    unit: 'px',
  });

  const createPDF = useCallback(async (preview: string, settings: ConversionSettings): Promise<Blob> => {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'px' });
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image for PDF conversion'));
      img.src = preview;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    let width = settings.width || img.width;
    let height = settings.height || img.height;
    if (settings.maintainAspectRatio) {
      const aspectRatio = img.width / img.height;
      if (width / height > aspectRatio) width = height * aspectRatio;
      else height = width / aspectRatio;
    }

    const pixelRatio = settings.unit === 'px' ? 1 : settings.unit === 'in' ? 96 : settings.unit === 'cm' ? 37.7952755906 : 3.77952755906;
    width = width * pixelRatio;
    height = height * pixelRatio;

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);

    const imgData = canvas.toDataURL('image/jpeg', settings.quality / 100);
    pdf.addImage(imgData, 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
    return pdf.output('blob');
  }, []);

  const compressImage = useCallback((file: File, settings: ConversionSettings): Promise<Blob> => {
    return import('browser-image-compression').then(({ default: imageCompression }) => {
      let maxWidthOrHeight = Math.max(settings.width || 0, settings.height || 0);
      const pixelRatio = settings.unit === 'px' ? 1 : settings.unit === 'in' ? 96 : settings.unit === 'cm' ? 37.7952755906 : 3.77952755906;
      maxWidthOrHeight = maxWidthOrHeight * pixelRatio;

      return imageCompression(file, {
        maxSizeMB: settings.mode === 'size' ? settings.targetSize || 1 : undefined,
        maxWidthOrHeight: maxWidthOrHeight || undefined,
        initialQuality: settings.quality / 100,
        useWebWorker: true,
        fileType: FORMAT_OPTIONS.find(f => f.value === settings.format)?.mimeType || 'image/jpeg'
      });
    });
  }, []);

  const handleConversion = useCallback(async () => {
    if (images.length === 0) {
      setError('No images selected');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const isPDF = settings.format === 'pdf';
      const results = await Promise.all(images.map(async (image, index) => {
        try {
          const resultBlob = isPDF ? await createPDF(image.preview, settings) : await compressImage(image.file, settings);
          const resultUrl = createSecureObjectURL(resultBlob);
          saveOperation({ type: 'image_conversion', metadata: { filename: image.file.name, fileSize: resultBlob.size, format: settings.format, settings }, preview: resultUrl });
          return { url: resultUrl, blob: resultBlob };
        } catch (err) {
          throw new Error(`Failed to convert image ${index + 1}: ${(err as Error).message}`);
        }
      }));

      setConvertedImages(results.map(r => r.url));
      setConvertedBlobs(results.map(r => r.blob));
    } catch (err) {
      setError((err as Error).message || 'Conversion failed');
    } finally {
      setLoading(false);
    }
  }, [images, settings, saveOperation, createPDF, compressImage]);

  const handleDownload = useCallback((index: number) => {
    if (!convertedBlobs[index] || !settings.format) return;
    const link = createSecureDownloadLink(convertedBlobs[index], `converted-${index}.${settings.format === 'jpeg' ? 'jpg' : settings.format}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [convertedBlobs, settings.format]);

  const resetImages = useCallback(() => {
    images.forEach(img => revokeBlobUrl(img.preview));
    convertedImages.forEach(url => revokeBlobUrl(url));
    setImages([]);
    setConvertedImages([]);
    setConvertedBlobs([]);
    setError(null);
    setShowCropModal(false);
    setCropImageSrc(null);
    setCropImageIndex(null);
  }, [images, convertedImages]);

  const removeImage = useCallback((index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      revokeBlobUrl(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
    setConvertedImages(prev => {
      const newConverted = [...prev];
      if (newConverted[index]) {
        revokeBlobUrl(newConverted[index]);
        newConverted.splice(index, 1);
      }
      return newConverted;
    });
    setConvertedBlobs(prev => {
      const newBlobs = [...prev];
      newBlobs.splice(index, 1);
      return newBlobs;
    });
  }, []);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }, []);

  const getPlaceholder = (field: 'width' | 'height') => {
    switch (settings.unit) {
      case 'px': return `${field.charAt(0).toUpperCase() + field.slice(1)} in pixels (e.g., 800)`;
      case 'in': return `${field.charAt(0).toUpperCase() + field.slice(1)} in inches (e.g., 8.5)`;
      case 'cm': return `${field.charAt(0).toUpperCase() + field.slice(1)} in centimeters (e.g., 21.6)`;
      case 'mm': return `${field.charAt(0).toUpperCase() + field.slice(1)} in millimeters (e.g., 216)`;
      default: return `${field.charAt(0).toUpperCase() + field.slice(1)}`;
    }
  };

  const getPositionFromEvent = useCallback((e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    const rect = cropContainerRef.current?.getBoundingClientRect();
    if (!rect || !imgRef.current || !imageDimensions) return { x: 0, y: 0 };
    const isTouch = 'touches' in e;
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) / scale;
    const y = (clientY - rect.top) / scale;
    return { x: clamp(x, 0, imageDimensions.width), y: clamp(y, 0, imageDimensions.height) };
  }, [scale, imageDimensions]);

  const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const { x, y } = getPositionFromEvent(e);
    if (x >= cropSettings.positionX && x <= cropSettings.positionX + cropSettings.width &&
        y >= cropSettings.positionY && y <= cropSettings.positionY + cropSettings.height) {
      setIsDragging(true);
      setDragStart({ x, y });
    }
  }, [cropSettings, getPositionFromEvent]);

  const handleResizeStart = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, corner: string) => {
    e.preventDefault();
    e.stopPropagation();
    const { x, y } = getPositionFromEvent(e);
    setIsResizing(corner);
    setDragStart({ x: x - cropSettings.positionX, y: y - cropSettings.positionY });
  }, [getPositionFromEvent]);

  const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragStart || !imageDimensions || !cropContainerRef.current) return;
    if (!isDragging && !isResizing) return;

    e.preventDefault();
    const { x, y } = getPositionFromEvent(e);
    const minSize = 50;

    setCropSettings(prev => {
      let newState = { ...prev };

      if (isDragging) {
        const dx = x - dragStart.x;
        const dy = y - dragStart.y;
        if (isDragging) {
          newState.positionX = clamp(x - dragStart.x, 0, imageDimensions.width - prev.width);
          newState.positionY = clamp(y - dragStart.y, 0, imageDimensions.height - prev.height);
        }
      } else if (isResizing) {
        const sensitivity = 0.3;
        const dx = (x - dragStart.x) * sensitivity;
        const dy = (y - dragStart.y) * sensitivity;
        if (isResizing === 'tl') {
          const newWidth = clamp(prev.width - dx, minSize, prev.positionX + prev.width);
          const newHeight = prev.aspectRatio ? newWidth / parseAspectRatio(prev.aspectRatio) : clamp(prev.height - dy, minSize, prev.positionY + prev.height);
          newState.positionX = prev.positionX + (prev.width - newWidth);
          newState.positionY = prev.aspectRatio ? prev.positionY + (prev.height - newHeight) : prev.positionY + (prev.height - newHeight);
          newState.width = newWidth;
          newState.height = newHeight;
        } else if (isResizing === 'tr') {
          const newWidth = clamp(prev.positionX + dx, minSize, imageDimensions.width - prev.positionX);
          const newHeight = prev.aspectRatio ? newWidth / parseAspectRatio(prev.aspectRatio) : clamp(prev.height - dy, minSize, prev.positionY + prev.height);
          newState.positionY = prev.aspectRatio ? prev.positionY + (prev.height - newHeight) : prev.positionY + (prev.height - newHeight);
          newState.width = newWidth;
          newState.height = newHeight;
        } else if (isResizing === 'bl') {
          const newWidth = clamp(prev.width - (x - dragStart.x), minSize, prev.positionX + prev.width);
          const newHeight = prev.aspectRatio ? newWidth / parseAspectRatio(prev.aspectRatio) : clamp(y - prev.positionY, minSize, imageDimensions.height - prev.positionY);
          newState.positionX = prev.positionX + (prev.width - newWidth);
          newState.width = newWidth;
          newState.height = newHeight;
        } else if (isResizing === 'br') {
          const newWidth = clamp(x - prev.positionX, minSize, imageDimensions.width - prev.positionX);
          const newHeight = prev.aspectRatio ? newWidth / parseAspectRatio(prev.aspectRatio) : clamp(y - prev.positionY, minSize, imageDimensions.height - prev.positionY);
          newState.width = newWidth;
          newState.height = newHeight;
        }
        newState.positionX = clamp(newState.positionX, 0, imageDimensions.width - newState.width);
        newState.positionY = clamp(newState.positionY, 0, imageDimensions.height - newState.height);
      }

      return newState;
    });
  }, [isDragging, isResizing, dragStart, imageDimensions]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    setIsResizing(null);
    setDragStart(null);
  }, []);

  useEffect(() => {
    if (!showCropModal) return;

    const handleGlobalMove = (e: MouseEvent | TouchEvent) => handleMove(e);
    const handleGlobalEnd = () => handleEnd();

    window.addEventListener('mousemove', handleGlobalMove, { passive: false });
    window.addEventListener('mouseup', handleGlobalEnd);
    window.addEventListener('touchmove', handleGlobalMove, { passive: false });
    window.addEventListener('touchend', handleGlobalEnd);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalEnd);
    };
  }, [showCropModal, handleMove, handleEnd]);

  const resetCrop = useCallback(() => {
    if (!imageDimensions) return;
    const defaultSize = Math.min(imageDimensions.width, imageDimensions.height, 600);
    setCropSettings({
      width: defaultSize,
      height: defaultSize,
      positionX: (imageDimensions.width - defaultSize) / 2,
      positionY: (imageDimensions.height - defaultSize) / 2,
      aspectRatio: null,
    });
  }, [imageDimensions]);

  return (
    <>
      <SEOHeaders 
        title="Free Online Image Editor - Resize, Crop, Rotate & Convert Images"
        description="Edit high-resolution images online with our free tool. Resize, crop, rotate, and convert to JPEG, PNG, WebP, AVIF, HEIC, or PDF with advanced rectangle cropping."
        keywords={['image editor online free', 'resize high resolution images', 'crop image online tool', 'rotate image free', 'convert image to pdf online', 'image compressor free', 'optimize images for web', 'batch image resizer', 'SEO image optimization', 'convert jpg to png free', 'png to webp converter online', 'free photo editing tool', 'resize images for social media', 'compress jpg online', 'image format converter free', 'online image resizer high quality', 'photo cropper free', 'web image optimizer tool', 'edit large images online', 'free image conversion tool', 'rectangle crop tool', 'zoom image editor', 'convert to avif', 'convert to heic']}
        canonicalUrl="https://pdfcircle.com/image-tools"
      />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold dark:text-white text-gray-900 mb-6 text-center">Free Online Image Editor - Resize, Crop, Rotate & Convert</h1>
        <AdComponent slot="image-tools-top" className="mb-6" style={{ minHeight: '90px' }} />
        <div className="bg-white rounded-xl shadow-lg p-6">
          {showCropModal && cropImageSrc && cropImageIndex !== null ? (
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/3 bg-gray-800 p-4 rounded-lg text-white space-y-4">
                <h2 className="text-lg font-semibold">Crop Rectangle</h2>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input type="number" value={Math.round(cropSettings.width)} onChange={(e) => {
                      const newWidth = Math.max(50, +e.target.value);
                      setCropSettings(prev => ({
                        ...prev,
                        width: newWidth,
                        height: prev.aspectRatio ? newWidth / parseAspectRatio(prev.aspectRatio) : prev.height,
                      }));
                    }} className="w-1/2 p-2 bg-gray-700 text-white rounded" placeholder="Width" min="50" />
                    <input type="number" value={Math.round(cropSettings.height)} onChange={(e) => {
                      const newHeight = Math.max(50, +e.target.value);
                      setCropSettings(prev => ({
                        ...prev,
                        height: newHeight,
                        width: prev.aspectRatio ? newHeight * parseAspectRatio(prev.aspectRatio) : prev.width,
                      }));
                    }} className="w-1/2 p-2 bg-gray-700 text-white rounded" placeholder="Height" min="50" />
                  </div>
                  <select value={cropSettings.aspectRatio || 'Freeform'} onChange={(e) => {
                    const value = e.target.value === 'Freeform' ? null : e.target.value;
                    setCropSettings(prev => ({
                      ...prev,
                      aspectRatio: value,
                      height: value ? prev.width / parseAspectRatio(value) : prev.height,
                    }));
                  }} className="w-full p-2 bg-gray-700 text-white rounded">
                    {ASPECT_RATIOS.map(ratio => <option key={ratio.value || 'Freeform'} value={ratio.value || 'Freeform'}>{ratio.label}</option>)}
                  </select>
                  <div>
                    <h3 className="text-sm font-medium">Crop Position</h3>
                    <div className="flex gap-2">
                      <input type="number" value={Math.round(cropSettings.positionX)} onChange={(e) => setCropSettings(prev => ({ ...prev, positionX: clamp(+e.target.value, 0, imageDimensions ? imageDimensions.width - prev.width : Infinity) }))} className="w-1/2 p-2 bg-gray-700 text-white rounded" placeholder="Position X" min="0" />
                      <input type="number" value={Math.round(cropSettings.positionY)} onChange={(e) => setCropSettings(prev => ({ ...prev, positionY: clamp(+e.target.value, 0, imageDimensions ? imageDimensions.height - prev.height : Infinity) }))} className="w-1/2 p-2 bg-gray-700 text-white rounded" placeholder="Position Y" min="0" />
                    </div>
                  </div>
                  <button onClick={resetCrop} className="w-full bg-gray-600 text-white p-2 rounded hover:bg-gray-700">Reset</button>
                </div>
              </div>
              <div className="w-full md:w-2/3 relative overflow-hidden">
                <div
                  ref={cropContainerRef}
                  className="relative overflow-auto touch-none select-none"
                  style={{ maxHeight: '80vh', userSelect: 'none' }}
                >
                  <img
                    ref={imgRef}
                    src={cropImageSrc}
                    alt="Image to crop"
                    onLoad={handleImageLoad}
                    className="max-w-full max-h-full object-contain"
                    style={{ width: '100%', height: 'auto' }}
                  />
                  {imageDimensions && scale > 0 && (
                    <div
                      className={`absolute border-2 border-indigo-500 bg-indigo-500/30 cursor-move ${isDragging || isResizing ? 'opacity-75' : ''}`}
                      style={{
                        width: `${cropSettings.width * scale}px`,
                        height: `${cropSettings.height * scale}px`,
                        left: `${cropSettings.positionX * scale}px`,
                        top: `${cropSettings.positionY * scale}px`,
                        touchAction: 'none',
                      }}
                      onMouseDown={handleDragStart}
                      onTouchStart={handleDragStart}
                    >
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                        {[...Array(8)].map((_, i) => (
                          <div key={i} className={`border border-indigo-500 border-opacity-50 ${i % 3 === 2 ? 'border-r-0' : ''} ${i >= 6 ? 'border-b-0' : ''}`} />
                        ))}
                      </div>
                      <div
                        className="absolute -top-2 -left-2 w-4 h-4 bg-indigo-600 rounded-full cursor-nwse-resize"
                        onMouseDown={(e) => handleResizeStart(e, 'tl')}
                        onTouchStart={(e) => handleResizeStart(e, 'tl')}
                      />
                      <div
                        className="absolute -top-2 -right-2 w-4 h-4 bg-indigo-600 rounded-full cursor-nesw-resize"
                        onMouseDown={(e) => handleResizeStart(e, 'tr')}
                        onTouchStart={(e) => handleResizeStart(e, 'tr')}
                      />
                      <div
                        className="absolute -bottom-2 -left-2 w-4 h-4 bg-indigo-600 rounded-full cursor-nesw-resize"
                        onMouseDown={(e) => handleResizeStart(e, 'bl')}
                        onTouchStart={(e) => handleResizeStart(e, 'bl')}
                      />
                      <div
                        className="absolute -bottom-2 -right-2 w-4 h-4 bg-indigo-600 rounded-full cursor-nwse-resize"
                        onMouseDown={(e) => handleResizeStart(e, 'br')}
                        onTouchStart={(e) => handleResizeStart(e, 'br')}
                      />
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => { setShowCropModal(false); setCropImageSrc(null); setCropImageIndex(null); }} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">Cancel</button>
                  <button onClick={handleCropComplete} disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center disabled:opacity-50">
                    {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Cropping...</> : <><Crop className="w-5 h-5 mr-2" />Apply Crop</>}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {images.length === 0 ? (
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Upload Images to Edit</h2>
                  <div {...getRootProps()} className={`border-2 border-dashed dark:bg-gray-800 rounded-lg p-6 text-center cursor-pointer ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}`}>
                    <input {...getInputProps()} />
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-white">{isDragActive ? 'Drop here' : 'Drag & drop or tap to select'}</p>
                    <p className="text-sm text-gray-500 mt-2 dark:text-white">JPEG, PNG, WebP, SVG, AVIF, HEIC (Max 15MB)</p>
                  </div>
                  <div className="mt-4 text-sm text-gray-600">
                    <p>Related Tools: 
                      <a href="/pdf-tools" className="text-indigo-600 hover:underline" title="PDF Editing Tools">PDF Tools</a> | 
                      <a href="/pdf-tools?tab=compress" className="text-indigo-600 hover:underline" title="Image Compression Tool">Compressor pdf</a> | 
                      <a href="/pdf-tools?tab=create" className="text-indigo-600 hover:underline" title="File Format Converter">Create pdf</a> | 
                      <a href="/pdf-tools?tab=to-images" className="text-indigo-600 hover:underline" title="File Format Converter">pdf to image</a> | 
                      <a href="/pdf-tools?tab=watermark" className="text-indigo-600 hover:underline" title="File Format Converter">watermark on pdf</a>
                    </p>
                    <p className="mt-2">Learn More: 
                      <a href="https://developers.google.com/speed/docs/insights/OptimizeImages" className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer" title="Google's Image Optimization Guide">Google Image Optimization</a> | 
                      <a href="https://www.smashingmagazine.com/2021/03/complete-guide-image-optimization-website-performance/" className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer" title="Smashing Magazine Image Optimization">Smashing Magazine Guide</a> | 
                      <a href="https://web.dev/learn/images/" className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer" title="Web.dev Image Best Practices">Web.dev Images</a>
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-800">Preview and Edit Your Images</h2>
                    <button onClick={resetImages} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
                  </div>
                  {loading && (
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
                      <p className="mt-2 text-gray-600">Processing...</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {images.map((image, index) => (
                      <ImagePreview
                        key={index}
                        image={image}
                        index={index}
                        convertedImage={convertedImages[index]}
                        convertedBlob={convertedBlobs[index]}
                        onRemove={removeImage}
                        onCrop={() => { setCropImageSrc(image.preview); setCropImageIndex(index); setShowCropModal(true); }}
                        onDownload={handleDownload}
                        formatFileSize={formatFileSize}
                      />
                    ))}
                  </div>
                  {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
                  <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-medium text-gray-700">Image Conversion Settings</h2>
                      <Settings2 className="w-5 h-5 text-gray-400" />
                    </div>
                    <select value={settings.format} onChange={e => setSettings(prev => ({ ...prev, format: e.target.value }))} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 appearance-none">
                      {FORMAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <div className="flex gap-2">
                      {['quality', 'size'].map(mode => (
                        <button key={mode} onClick={() => setSettings(prev => ({ ...prev, mode: mode as 'size' | 'quality' }))} className={`flex-1 px-3 py-2 rounded-lg ${settings.mode === mode ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                          {mode === 'quality' ? 'Quality' : 'Size'}
                        </button>
                      ))}
                    </div>
                    {settings.mode === 'quality' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quality: {settings.quality}%</label>
                        <input type="range" min="1" max="100" value={settings.quality} onChange={e => setSettings(prev => ({ ...prev, quality: +e.target.value }))} className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-indigo-600" />
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {SIZE_OPTIONS.map(size => (
                          <button key={size} onClick={() => setSettings(prev => ({ ...prev, targetSize: size }))} className={`px-3 py-1 rounded-full ${settings.targetSize === size ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                            {size < 1 ? `${size * 1000}KB` : `${size}MB`}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-4">
                      <input type="number" value={settings.width || ''} onChange={e => setSettings(prev => ({ ...prev, width: e.target.value ? +e.target.value : null }))} placeholder={getPlaceholder('width')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400 transition-colors duration-200" />
                      <input type="number" value={settings.height || ''} onChange={e => setSettings(prev => ({ ...prev, height: e.target.value ? +e.target.value : null }))} placeholder={getPlaceholder('height')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400 transition-colors duration-200" />
                      <select value={settings.unit} onChange={e => setSettings(prev => ({ ...prev, unit: e.target.value as 'px' | 'in' | 'cm' | 'mm' }))} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 appearance-none">
                        {UNIT_OPTIONS.map(unit => <option key={unit} value={unit}>{unit.toUpperCase()}</option>)}
                      </select>
                    </div>
                    <label className="flex items-center">
                      <input type="checkbox" checked={settings.maintainAspectRatio} onChange={e => setSettings(prev => ({ ...prev, maintainAspectRatio: e.target.checked }))} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                      <span className="ml-2 text-sm text-gray-700">Maintain aspect ratio</span>
                    </label>
                    <div className="flex gap-3">
                      <button onClick={handleConversion} disabled={loading || !settings.format || (settings.mode === 'size' && !settings.targetSize)} className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center">
                        {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Converting...</> : <>{settings.format === 'pdf' ? <FileText className="w-5 h-5 mr-2" /> : <ImageIcon className="w-5 h-5 mr-2" />}Convert</>}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ImageTools;