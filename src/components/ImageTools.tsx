import React, { useState, useCallback, useRef, memo, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Download, Image as ImageIcon, Loader2, Crop, Settings2, FileText, Archive, Trash2, Plus, SplitSquareVertical, Merge, Minimize2, Images, Edit } from 'lucide-react';
import { useOperationsCache } from '../utils/operationsCache';
import { SEOHeaders } from './SEOHeaders';
import { AdComponent } from './AdComponent';
import { validateFile, ALLOWED_IMAGE_TYPES, createSecureObjectURL, createSecureDownloadLink, revokeBlobUrl } from '../utils/security';
import JSZip from 'jszip';
import { Link } from 'react-router-dom';

// Interfaces
interface PreviewImage { file: File; preview: string; }
interface ConversionSettings { 
  mode: 'size' | 'quality' | 'custom';
  targetSize: number | null; 
  quality: number; 
  format: string; 
  width: number | null; 
  height: number | null; 
  maintainAspectRatio: boolean; 
  unit: 'px' | 'in' | 'cm' | 'mm'; 
  addWatermark: boolean; 
  watermarkText: string; 
}
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
  { value: 'ico', label: 'ICO', mimeType: 'image/x-icon' },
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
const MAX_RECOMMENDED_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_IMAGES = 3; // Limit to 3 images
const ICO_SIZES = [16, 32, 48, 128, 256];

// Utility Functions
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const parseAspectRatio = (ratio: string | null): number => ratio ? Number(ratio.split(':')[0]) / Number(ratio.split(':')[1]) : 1;
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

// Compress image using canvas
const compressImageCanvas = (file: Blob, quality: number, maxWidth?: number, maxHeight?: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = createSecureObjectURL(file);
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (maxWidth && maxHeight) {
        const aspect = width / height;
        if (width > maxWidth) {
          width = maxWidth;
          height = width / aspect;
        }
        if (height > maxHeight) {
          height = maxHeight;
          width = height * aspect;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        revokeBlobUrl(url);
        return reject(new Error('Canvas context unavailable'));
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          revokeBlobUrl(url);
          if (blob) resolve(blob);
          else reject(new Error('Failed to compress image'));
        },
        'image/jpeg',
        Math.max(0.1, quality / 100)
      );
    };
    img.onerror = () => {
      revokeBlobUrl(url);
      reject(new Error('Failed to load image'));
    };
  });
};

const ImagePreview = memo(({ image, index, convertedSize, onRemove, onCrop, onDownload }: {
  image: PreviewImage; index: number; convertedSize?: number; onRemove: (index: number) => void;
  onCrop: (index: number) => void; onDownload: (index: number) => void;
}) => (
  <div className="relative p-4 bg-gray-100 rounded-lg shadow-md">
    <button onClick={() => onRemove(index)} className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700" aria-label="Remove image">
      <Trash2 className="w-4 h-4" />
    </button>
    <p className="text-sm text-gray-700">Filename: {image.file.name}</p>
    <p className="text-sm text-gray-500">Original Size: {formatFileSize(image.file.size)}</p>
    {convertedSize && <p className="text-sm text-green-600">Converted Size: {formatFileSize(convertedSize)}</p>}
    <div className="mt-2 flex justify-between flex-wrap gap-2">
      <button onClick={() => onCrop(index)} className="bg-indigo-600 text-white rounded-lg px-2 py-1 flex items-center" aria-label="Crop image">
        <Crop className="w-4 h-4 mr-1" />Crop
      </button>
      {convertedSize && (
        <button onClick={() => onDownload(index)} className="bg-green-600 text-white rounded-lg px-2 py-1 flex items-center" aria-label="Download converted image">
          <Download className="w-4 h-4 mr-1" />Download
        </button>
      )}
    </div>
  </div>
));

export function ImageTools() {
  const { saveOperation } = useOperationsCache();
  const [images, setImages] = useState<PreviewImage[]>([]);
  const [convertedBlobs, setConvertedBlobs] = useState<{ blob: Blob; originalName: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropImageIndex, setCropImageIndex] = useState<number | null>(null);
  const [cropSettings, setCropSettings] = useState<CropSettings>({ width: 0, height: 0, positionX: 0, positionY: 0, aspectRatio: null });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [showDropdown, setShowDropdown] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const cropContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [settings, setSettings] = useState<ConversionSettings>({
    mode: 'quality',
    targetSize: null,
    quality: 80,
    format: 'jpeg',
    width: null,
    height: null,
    maintainAspectRatio: true,
    unit: 'px',
    addWatermark: false,
    watermarkText: 'Sample Watermark',
  });

  const dataURLtoBlob = useCallback((dataURL: string): Blob => {
    const [header, data] = dataURL.split(',');
    const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
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
    const currentImageCount = images.length;
    const allowedNewImages = Math.max(0, MAX_IMAGES - currentImageCount);
    const newImages = acceptedFiles
      .slice(0, allowedNewImages)
      .filter(file => validateFile(file, ALLOWED_IMAGE_TYPES).isValid)
      .map(file => {
        if (file.size > MAX_RECOMMENDED_SIZE) {
          setError(`File ${file.name} exceeds recommended limit of ${formatFileSize(MAX_RECOMMENDED_SIZE)}.`);
        }
        return { file, preview: createSecureObjectURL(file) };
      });

    if (newImages.length !== acceptedFiles.length) setError(`Some files were rejected. Max ${MAX_IMAGES} images allowed.`);
    if (fileRejections.length > 0) {
      const rejectionErrors = fileRejections.map(rejection => `${rejection.file.name}: ${rejection.errors.map((e: any) => e.message).join(', ')}`).join('; ');
      setError(`Upload failed: ${rejectionErrors}`);
    }

    setImages(prev => [...prev, ...newImages]);
    setConvertedBlobs([]);
    if (!fileRejections.length && newImages.length === acceptedFiles.length) setError(null);
  }, [images]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.avif', '.heic'] },
    maxFiles: MAX_IMAGES,
    maxSize: MAX_RECOMMENDED_SIZE,
  });

  const handleImageLoad = useCallback(() => {
    if (!imgRef.current || !cropContainerRef.current) return;
    const { naturalWidth, naturalHeight, width, height } = imgRef.current;
    setImageDimensions({ width: naturalWidth, height: naturalHeight });
    const scaleX = width / naturalWidth;
    const scaleY = height / naturalHeight;
    const newScale = Math.min(scaleX, scaleY);
    setScale(newScale);
    setCropSettings({
      width: naturalWidth,
      height: naturalHeight,
      positionX: 0,
      positionY: 0,
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
    return blobToDataURL(await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/jpeg', 0.95);
    }));
  }, [blobToDataURL]);

  const addWatermarkToImage = async (blob: Blob, watermarkText: string): Promise<Blob> => {
    const img = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    ctx.font = '30px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.textAlign = 'center';
    ctx.fillText(watermarkText, canvas.width / 2, canvas.height - 30);

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/jpeg', 0.95);
    });
  };

  const createPDF = useCallback(async (blob: Blob, settings: ConversionSettings): Promise<Blob> => {
    const { jsPDF } = await import('jspdf');
    // Compress image before PDF creation
    const compressedBlob = await compressImageCanvas(blob, settings.quality, settings.width || undefined, settings.height || undefined);
    const img = new Image();
    img.src = createSecureObjectURL(compressedBlob);

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image for PDF'));
      img.src = img.src;
    });

    let width = settings.width || img.width;
    let height = settings.height || img.height;

    if (settings.maintainAspectRatio && (settings.width || settings.height)) {
      const aspectRatio = img.width / img.height;
      if (settings.width && !settings.height) {
        height = settings.width / aspectRatio;
      } else if (settings.height && !settings.width) {
        width = settings.height * aspectRatio;
      } else if (width / height > aspectRatio) {
        width = height * aspectRatio;
      } else {
        height = width / aspectRatio;
      }
    }

    const pixelRatio = settings.unit === 'px' ? 1 : settings.unit === 'in' ? 96 : settings.unit === 'cm' ? 37.7952755906 : 3.77952755906;
    width *= pixelRatio;
    height *= pixelRatio;

    const pdf = new jsPDF({
      orientation: width > height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [width, height],
    });

    pdf.addImage(img.src, 'JPEG', 0, 0, width, height, undefined, 'FAST');
    revokeBlobUrl(img.src);
    return pdf.output('blob');
  }, []);

  const convertToSVG = useCallback(async (blob: Blob, quality: number): Promise<Blob> => {
    // Compress image to JPEG to control SVG size
    const compressedBlob = await compressImageCanvas(blob, quality);
    const img = await createImageBitmap(compressedBlob);
    const dataURL = await blobToDataURL(compressedBlob);
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${img.width}" height="${img.height}">
        <image href="${dataURL}" width="${img.width}" height="${img.height}"/>
      </svg>
    `;
    return new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  }, [blobToDataURL]);

  const compressImage = useCallback(async (file: File, settings: ConversionSettings): Promise<Blob> => {
    const pixelRatio = settings.unit === 'px' ? 1 : settings.unit === 'in' ? 96 : settings.unit === 'cm' ? 37.7952755906 : 3.77952755906;
    const maxWidth = settings.width ? settings.width * pixelRatio : undefined;
    const maxHeight = settings.height ? settings.height * pixelRatio : undefined;

    if (settings.format === 'avif' || settings.format === 'heic') {
      // Preprocess to JPEG for AVIF/HEIC to ensure size reduction
      return compressImageCanvas(file, settings.quality, maxWidth, maxHeight);
    }

    const { default: imageCompression } = await import('browser-image-compression');
    const quality = Math.min(settings.quality / 100, 1);
    const options = {
      maxSizeMB: settings.mode === 'size' ? settings.targetSize || 1 : file.size / 1024 / 1024 * quality,
      maxWidthOrHeight: maxWidth || maxHeight ? Math.max(maxWidth || 0, maxHeight || 0) : undefined,
      initialQuality: quality,
      useWebWorker: true,
      fileType: FORMAT_OPTIONS.find(f => f.value === settings.format)?.mimeType || 'image/jpeg',
    };

    if (settings.format === 'png') {
      options.initialQuality = quality * 0.8;
      options.fileType = 'image/png';
    }

    return imageCompression(file, options);
  }, []);

  const createICO = async (blob: Blob): Promise<Blob> => {
    const img = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');
    ctx.drawImage(img, 0, 0, 256, 256);
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/x-icon');
    });
  };

  const createICOSet = async (blob: Blob): Promise<Blob> => {
    const zip = new JSZip();
    const img = await createImageBitmap(blob);
    for (const size of ICO_SIZES) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');
      ctx.drawImage(img, 0, 0, size, size);
      const resizedBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/x-icon');
      });
      zip.file(`${size}x${size}.ico`, resizedBlob);
    }
    return zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
  };

  const handleCropComplete = useCallback(async () => {
    if (!cropImageSrc || cropImageIndex === null || !imageDimensions) {
      setError('Invalid crop selection');
      return;
    }

    setLoading(true);
    try {
      const croppedSrc = await applyCrop(cropImageSrc, cropSettings);
      const croppedBlob = dataURLtoBlob(croppedSrc);
      const croppedFile = new File([croppedBlob], images[cropImageIndex].file.name, { type: 'image/jpeg' });

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

  const handleConversion = useCallback(async () => {
    if (images.length === 0) {
      setError('No images selected');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        images.map(async (image) => {
          let resultBlob: Blob = image.file;

          if (cropImageSrc && images.findIndex(img => img.preview === cropImageSrc) === images.indexOf(image)) {
            const croppedSrc = await applyCrop(image.preview, cropSettings);
            resultBlob = dataURLtoBlob(croppedSrc);
          }

          if (settings.format === 'svg') {
            resultBlob = await convertToSVG(resultBlob, settings.quality);
          } else if (settings.format === 'ico') {
            resultBlob = await createICOSet(resultBlob);
          } else if (settings.format === 'pdf') {
            resultBlob = await createPDF(resultBlob, settings);
          } else {
            resultBlob = await compressImage(resultBlob, settings);
          }

          if (settings.addWatermark && settings.format !== 'svg' && settings.format !== 'pdf' && settings.format !== 'ico') {
            resultBlob = await addWatermarkToImage(resultBlob, settings.watermarkText);
          }
          
          saveOperation({
            type: 'image_conversion',
            metadata: {
              filename: image.file.name,
              fileSize: resultBlob.size,
              format: settings.format,
              settings,
            },
            preview: createSecureObjectURL(resultBlob),
          });

          return { blob: resultBlob, originalName: image.file.name };
        })
      );

      setConvertedBlobs(results);
    } catch (err) {
      setError(`Conversion failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [images, settings, cropImageSrc, cropSettings, saveOperation, applyCrop, dataURLtoBlob, createPDF, addWatermarkToImage, compressImage, convertToSVG]);

  const handleDownload = useCallback((index: number) => {
    if (!convertedBlobs[index]) return;
    const { blob, originalName } = convertedBlobs[index];
    const extension = settings.format === 'jpeg' ? 'jpg' : settings.format === 'ico' ? 'zip' : settings.format;
    const link = createSecureDownloadLink(blob, `${originalName.split('.').slice(0, -1).join('.')}.${extension}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [convertedBlobs, settings.format]);

  const handleBatchDownloadZip = useCallback(async () => {
    const zip = new JSZip();
    convertedBlobs.forEach(({ blob, originalName }, index) => {
      const extension = settings.format === 'jpeg' ? 'jpg' : settings.format === 'ico' ? 'zip' : settings.format;
      zip.file(`${originalName.split('.').slice(0, -1).join('.')}.${extension}`, blob);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const link = createSecureDownloadLink(content, 'converted_images.zip');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [convertedBlobs, settings.format]);

  const resetImages = useCallback(() => {
    images.forEach(img => revokeBlobUrl(img.preview));
    setImages([]);
    setConvertedBlobs([]);
    setError(null);
    setShowCropModal(false);
    setCropImageSrc(null);
    setCropImageIndex(null);
  }, [images]);

  const handleNewConversion = useCallback(() => {
    resetImages();
    setShowDropdown(false);
  }, [resetImages]);

  const removeImage = useCallback((index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      revokeBlobUrl(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
    setConvertedBlobs(prev => {
      const newBlobs = [...prev];
      newBlobs.splice(index, 1);
      return newBlobs;
    });
  }, []);

  const handleAddMoreImages = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const getPlaceholder = (field: 'width' | 'height') => {
    switch (settings.unit) {
      case 'px': return `${field.charAt(0).toUpperCase() + field.slice(1)} in pixels`;
      case 'in': return `${field.charAt(0).toUpperCase() + field.slice(1)} in inches`;
      case 'cm': return `${field.charAt(0).toUpperCase() + field.slice(1)} in centimeters`;
      case 'mm': return `${field.charAt(0).toUpperCase() + field.slice(1)} in millimeters`;
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
        newState.positionX = clamp(x - dragStart.x, 0, imageDimensions.width - prev.width);
        newState.positionY = clamp(y - dragStart.y, 0, imageDimensions.height - prev.height);
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
          const newWidth = clamp(prev.width - dx, minSize, prev.positionX + prev.width);
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
  }, [isDragging, isResizing, dragStart, imageDimensions, getPositionFromEvent]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    setIsResizing(null);
    setDragStart(null);
  }, []);

  const resetCrop = useCallback(() => {
    if (!imageDimensions) return;
    setCropSettings({
      width: imageDimensions.width,
      height: imageDimensions.height,
      positionX: 0,
      positionY: 0,
      aspectRatio: null,
    });
  }, [imageDimensions]);

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

  const handleUploadSource = (source: string) => {
    setShowDropdown(false);
    if (source === 'device' && fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      setError(`Upload from ${source} is not yet implemented`);
    }
  };

  return (
    <>
      <SEOHeaders 
        title="Free Online Image Editor - Create, Resize, Crop, Convert Images"
        description="Create and edit high-resolution images online with our free tool. Resize, crop, convert to JPEG, PNG, WebP, PDF, ICO, and more with advanced features."
        keywords={['image editor online free', 'create images online', 'resize high resolution images', 'crop image online tool', 'convert image to pdf', 'image compressor free', 'optimize images', 'batch image resizer', 'SEO image optimization', 'add watermark to image', 'free photo editing tool', 'online image creator']}
        canonicalUrl="https://pdfcircle.com/image-tools"
      />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold dark:text-white text-gray-900 mb-6 text-center">Free Online Image Editor - Create, Resize, Crop & Convert</h1>
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
                      <input type="number" value={Math.round(cropSettings.positionX)} onChange=
                      {(e) => setCropSettings(prev => ({ ...prev, positionX: clamp(+e.target.value, 0, imageDimensions ? imageDimensions.width - prev.width : Infinity) }))} className="w-1/2 p-2 bg-gray-700 text-white rounded" placeholder="Position X" min="0" />
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
                  <button onClick={() => { setShowCropModal(false); setCropImageSrc(null); setCropImageIndex(null); }} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700" aria-label="Cancel crop">Cancel</button>
                  <button onClick={handleCropComplete} disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center disabled:opacity-50" aria-label="Apply crop">
                    {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Cropping...</> : <><Crop className="w-5 h-5 mr-2" />Apply Crop</>}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {images.length === 0 ? (
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Upload Images to Create Files (Max 3)</h2>
                  <div {...getRootProps()} className={`border-2 border-dashed dark:bg-gray-800 rounded-lg p-6 text-center cursor-pointer ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}`}>
                    <input {...getInputProps()} ref={fileInputRef} className="hidden" />
                    <div className="relative inline-block">
                      <button 
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 mb-4"
                        aria-label="Choose file source"
                      >
                        Choose File
                      </button>
                      {showDropdown && (
                        <div className="absolute left-0 mt-2 w-40 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                          <button onClick={() => handleUploadSource('device')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Device</button>
                          <button onClick={() => handleUploadSource('dropbox')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Dropbox</button>
                          <button onClick={() => handleUploadSource('onedrive')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">OneDrive</button>
                          <button onClick={() => handleUploadSource('url')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">URL</button>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-white">{isDragActive ? 'Drop here' : 'Or drag & drop here'}</p>
                    <p className="text-sm text-gray-500 mt-2 dark:text-white">JPEG, PNG, WebP, SVG, AVIF, HEIC (Max 15MB, 3 images)</p>
                  </div>
                  <div className="mt-4 text-sm text-gray-600">
                    <p>How to Create Files:</p>
                    <ul className="list-disc pl-5">
                      <li>Select up to 3 images to upload.</li>
                      <li>Add more images with the + button if under limit.</li>
                      <li>Choose your desired output format and settings.</li>
                      <li>Optionally crop or add a watermark.</li>
                      <li>Click "Create Files" to generate new files.</li>
                      <li>Download individually or as ZIP, then start a new conversion.</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-800">Preview and Create Files ({images.length}/{MAX_IMAGES})</h2>
                    {images.length < MAX_IMAGES && (
                      <button onClick={handleAddMoreImages} className="bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700" aria-label="Add more images">
                        <Plus className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <input {...getInputProps()} ref={fileInputRef} className="hidden" />
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
                        convertedSize={convertedBlobs[index]?.blob.size}
                        onRemove={removeImage}
                        onCrop={() => { setCropImageSrc(image.preview); setCropImageIndex(index); setShowCropModal(true); }}
                        onDownload={() => handleDownload(index)}
                      />
                    ))}
                  </div>
                  {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
                  <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-medium text-gray-700">File Creation Settings</h2>
                      <Settings2 className="w-5 h-5 text-gray-400" />
                    </div>
                    <select
                      value={settings.format}
                      onChange={(e) => setSettings(prev => ({ ...prev, format: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {FORMAT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      {['quality', 'size', 'custom'].map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setSettings(prev => ({ ...prev, mode: mode as 'size' | 'quality' | 'custom' }))}
                          className={`flex-1 px-3 py-2 rounded-lg ${settings.mode === mode ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                          {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </button>
                      ))}
                    </div>
                    {settings.mode === 'quality' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quality: {settings.quality}%</label>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={settings.quality}
                          onChange={(e) => setSettings(prev => ({ ...prev, quality: Math.max(1, +e.target.value) }))}
                          className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-indigo-600"
                        />
                      </div>
                    ) : settings.mode === 'size' ? (
                      <div className="flex flex-wrap gap-2">
                        {SIZE_OPTIONS.map((size) => (
                          <button
                            key={size}
                            onClick={() => setSettings(prev => ({ ...prev, targetSize: size }))}
                            className={`px-3 py-1 rounded-full ${settings.targetSize === size ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                          >
                            {size < 1 ? `${size * 1000}KB` : `${size}MB`}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div>
                        <div className="grid grid-cols-3 gap-4">
                          <input
                            type="number"
                            value={settings.width || ''}
                            onChange={(e) => setSettings(prev => ({ ...prev, width: e.target.value ? Math.max(1, +e.target.value) : null }))}
                            placeholder={getPlaceholder('width')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            min="1"
                          />
                          <input
                            type="number"
                            value={settings.height || ''}
                            onChange={(e) => setSettings(prev => ({ ...prev, height: e.target.value ? Math.max(1, +e.target.value) : null }))}
                            placeholder={getPlaceholder('height')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            min="1"
                          />
                          <select
                            value={settings.unit}
                            onChange={(e) => setSettings(prev => ({ ...prev, unit: e.target.value as 'px' | 'in' | 'cm' | 'mm' }))}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            {UNIT_OPTIONS.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit.toUpperCase()}
                              </option>
                            ))}
                          </select>
                        </div>
                        <label className="flex items-center mt-2">
                          <input
                            type="checkbox"
                            checked={settings.maintainAspectRatio}
                            onChange={(e) => setSettings(prev => ({ ...prev, maintainAspectRatio: e.target.checked }))}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Maintain aspect ratio</span>
                        </label>
                        <label className="flex items-center mt-2">
                          <input
                            type="checkbox"
                            checked={settings.addWatermark}
                            onChange={(e) => setSettings(prev => ({ ...prev, addWatermark: e.target.checked }))}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Add Watermark</span>
                        </label>
                        {settings.addWatermark && (
                          <input
                            type="text"
                            value={settings.watermarkText}
                            onChange={(e) => setSettings(prev => ({ ...prev, watermarkText: e.target.value }))}
                            placeholder="Enter watermark text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        )}
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={handleConversion}
                        disabled={loading || !settings.format || (settings.mode === 'size' && !settings.targetSize)}
                        className="w-full sm:w-auto flex-1 bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center text-sm sm:text-base"
                        aria-label="Create files"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mr-1 sm:mr-2" /> Creating...
                          </>
                        ) : (
                          <>
                            {settings.format === 'pdf' ? <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> : <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />}
                            Create Files
                          </>
                        )}
                      </button>
                      {convertedBlobs.length > 0 && images.length > 1 && (
                        <button
                          onClick={handleBatchDownloadZip}
                          className="w-full max-w-xs sm:w-auto bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center text-sm sm:text-base"

                          aria-label="Download ZIP"
                        >
                          <Archive className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> Download ZIP
                        </button>
                      )}
                      {convertedBlobs.length > 0 && (
                        <button
                          onClick={handleNewConversion}
                          className="w-full max-w-xs sm:max-w-none sm:w-auto flex bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 items-center text-sm sm:text-base justify-center"

                          aria-label="New conversion"
                        >
                          <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> New Conversion
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold dark:text-white text-gray-800 mb-4">More PDF Tools</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Link to="/pdf-tools?tab=watermark" className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200">
              <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
                <Edit className="w-6 h-6 text-indigo-600" />
              </div>
              <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-white">Watermark PDF</span>
            </Link>
            <Link to="/pdf-tools?tab=split" className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200">
              <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
                <SplitSquareVertical className="w-6 h-6 text-indigo-600" />
              </div>
              <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-white">Split PDF</span>
            </Link>
            <Link to="/pdf-tools?tab=merge" className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200">
              <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
                <Merge className="w-6 h-6 text-indigo-600" />
              </div>
              <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-white">Merge PDF</span>
            </Link>
            <Link to="/pdf-tools?tab=compress" className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200">
              <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
                <Minimize2 className="w-6 h-6 text-indigo-600" />
              </div>
              <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-white">Compress PDF</span>
            </Link>
            <Link to="/pdf-tools?tab=to-images" className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200">
              <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
                <Images className="w-6 h-6 text-indigo-600" />
              </div>
              <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-white">PDF to Images</span>
            </Link>
            <Link to="/pdf-tools?tab=create" className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200">
              <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
                <FileText className="w-6 h-6 text-indigo-600" />
              </div>
              <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-white">Create PDF</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export default ImageTools;