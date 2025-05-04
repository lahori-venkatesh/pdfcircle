import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Download, Image as ImageIcon, Loader2, Crop, Settings2, FileText, Archive, Trash2, Plus, SplitSquareVertical, Merge, Images, Edit , ChevronDown, ChevronUp  } from 'lucide-react';
import { useOperationsCache } from '../utils/operationsCache';
import { SEOHeaders } from './SEOHeaders';
import { AdComponent , StickyBottomAd } from './AdComponent';
import { validateFile, ALLOWED_IMAGE_TYPES, createSecureObjectURL, createSecureDownloadLink, revokeBlobUrl } from '../utils/security';
import JSZip from 'jszip';
import { Link } from 'react-router-dom';
import { AuthModal } from './AuthModal';

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
const ICO_SIZES = [16, 32, 48, 128, 256];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const parseAspectRatio = (ratio: string | null): number => ratio ? Number(ratio.split(':')[0]) / Number(ratio.split(':')[1]) : 1;
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

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
        if (width > maxWidth) { width = maxWidth; height = width / aspect; }
        if (height > maxHeight) { height = maxHeight; width = height * aspect; }
      }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { revokeBlobUrl(url); return reject(new Error('Canvas context unavailable')); }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => { revokeBlobUrl(url); if (blob) resolve(blob); else reject(new Error('Failed to compress image')); }, 'image/jpeg', Math.max(0.1, quality / 100));
    };
    img.onerror = () => { revokeBlobUrl(url); reject(new Error('Failed to load image')); };
  });
};

const addWatermarkToImage = async (blob: Blob, watermarkText: string): Promise<Blob> => {
  const img = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');
  canvas.width = img.width; canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
  ctx.font = '30px Arial'; ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; ctx.textAlign = 'center';
  ctx.fillText(watermarkText, canvas.width / 2, canvas.height - 30);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')), 'image/jpeg', 0.95));
};

const createPDF = async (blob: Blob, settings: ConversionSettings): Promise<Blob> => {
  const { jsPDF } = await import('jspdf');
  const compressedBlob = await compressImageCanvas(blob, settings.quality, settings.width || undefined, settings.height || undefined);
  const img = new Image(); img.src = createSecureObjectURL(compressedBlob);
  await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('Failed to load image for PDF')); });
  let width = settings.width || img.width; let height = settings.height || img.height;
  if (settings.maintainAspectRatio && (settings.width || settings.height)) {
    const aspectRatio = img.width / img.height;
    if (settings.width && !settings.height) height = settings.width / aspectRatio;
    else if (settings.height && !settings.width) width = settings.height * aspectRatio;
    else if (width / height > aspectRatio) width = height * aspectRatio; else height = width / aspectRatio;
  }
  const pixelRatio = settings.unit === 'px' ? 1 : settings.unit === 'in' ? 96 : settings.unit === 'cm' ? 37.7952755906 : 3.77952755906;
  width *= pixelRatio; height *= pixelRatio;
  const pdf = new jsPDF({ orientation: width > height ? 'landscape' : 'portrait', unit: 'px', format: [width, height] });
  pdf.addImage(img.src, 'JPEG', 0, 0, width, height, undefined, 'FAST');
  revokeBlobUrl(img.src); return pdf.output('blob');
};

const convertToSVG = async (blob: Blob, quality: number): Promise<Blob> => {
  const compressedBlob = await compressImageCanvas(blob, quality);
  const img = await createImageBitmap(compressedBlob);
  const dataURL = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(compressedBlob);
  });
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${img.width}" height="${img.height}"><image href="${dataURL}" width="${img.width}" height="${img.height}"/></svg>`;
  return new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
};

const compressImage = async (file: File, settings: ConversionSettings): Promise<Blob> => {
  const pixelRatio = settings.unit === 'px' ? 1 : settings.unit === 'in' ? 96 : settings.unit === 'cm' ? 37.7952755906 : 3.77952755906;
  const maxWidth = settings.width ? settings.width * pixelRatio : undefined;
  const maxHeight = settings.height ? settings.height * pixelRatio : undefined;

  if (settings.format === 'avif' || settings.format === 'heic') return compressImageCanvas(file, settings.quality, maxWidth, maxHeight);

  const { default: imageCompression } = await import('browser-image-compression');
  const quality = Math.min(settings.quality / 100, 1);
  const options = {
    maxSizeMB: settings.mode === 'size' ? settings.targetSize || 1 : file.size / 1024 / 1024 * quality,
    maxWidthOrHeight: maxWidth || maxHeight ? Math.max(maxWidth || 0, maxHeight || 0) : undefined,
    initialQuality: quality, useWebWorker: true,
    fileType: FORMAT_OPTIONS.find(f => f.value === settings.format)?.mimeType || 'image/jpeg',
  };

  if (settings.format === 'png') { options.initialQuality = quality * 0.8; options.fileType = 'image/png'; }
  return imageCompression(file, options);
};

const createICO = async (blob: Blob): Promise<Blob> => {
  const img = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');
  ctx.drawImage(img, 0, 0, 256, 256);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')), 'image/x-icon'));
};

const createICOSet = async (blob: Blob): Promise<Blob> => {
  const zip = new JSZip();
  const img = await createImageBitmap(blob);
  for (const size of ICO_SIZES) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');
    ctx.drawImage(img, 0, 0, size, size);
    const resized_blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')), 'image/x-icon'));
    zip.file(`${size}x${size}.ico`, resized_blob);
  }
  return zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
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

export function ImageTools({ isLoggedIn }: { isLoggedIn: boolean }) {
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
  const [conversionCount, setConversionCount] = useState(0);
  const [downloadCount, setDownloadCount] = useState(0);
  const [showSignupPopup, setShowSignupPopup] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'login' | 'forgot-password'>('signup');
  const [urlInput, setUrlInput] = useState<string>('');
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const cropContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [settings, setSettings] = useState<ConversionSettings>({
    mode: 'quality', targetSize: null, quality: 80, format: 'jpeg', width: null, height: null, maintainAspectRatio: true, unit: 'px', addWatermark: false, watermarkText: 'Sample Watermark',
  });

  const MAX_IMAGES = isLoggedIn ? 10 : 3;
  const MAX_CONVERSIONS = isLoggedIn ? Infinity : 3;
  const faqData = [
    {
      question: "What can I do with pdfCircle’s Image Editor?",
      answer: "Edit and convert images easily! Resize, crop, compress, add watermarks, and convert to formats like JPEG, PNG, WebP, PDF, or ICO. Upload via drag-and-drop, device, or URL, and download results individually or as a ZIP."
    },

    {
      question: "What image formats are supported?",
      answer: "Upload PNG, JPEG, WebP, SVG, AVIF, or HEIC (up to 15MB). Convert to JPEG, PNG, WebP, SVG, PDF, AVIF, HEIC, or ICO for versatile use, like PDFs for documents or ICOs for favicons."
    },
    {
      question: "How do I compress images?",
      answer: "Use 'Quality' mode to adjust compression (1-100%) or 'Size' mode to target sizes like 50KB or 1MB. The tool balances quality and file size, perfect for web or email."
    },
    {
      question: "Can I crop or resize images?",
      answer: "Yes! Crop with custom sizes or aspect ratios (e.g., 1:1, 16:9) using an interactive tool. Resize in pixels, inches, or cm, with an option to keep the aspect ratio."
    },
    {
      question: "How do I add watermarks?",
      answer: "Check 'Add Watermark' in settings and enter your text. Watermarks are added to all formats except SVG, PDF, and ICO, great for branding or protection."
    },
    {
      question: "What are the limits for free users?",
      answer: "Free users can upload 3 images and do 3 conversions/downloads per session. Sign up to process 10 images at once with unlimited conversions."
    },
    {
      question: "Is it safe to upload images?",
      answer: "Yes, processing happens in your browser for privacy. Secure file handling ensures safety, and no data is stored unless you save operations (logged-in users only)."
    },
    {
      question: "Can I use it on mobile?",
      answer: "Absolutely! Upload, edit, and convert images on mobile browsers like Chrome or Safari. Touch controls make cropping and resizing easy."
    },
    {
      question: "What if I get an error?",
      answer: "Errors may occur for files over 15MB or unsupported formats. Check the error message for details. Contact support via the <Link to='/contact' className='text-indigo-600 hover:underline'>contact page</Link> for help."
    }
  ];

  useEffect(() => {
    console.log('isLoggedIn:', isLoggedIn, 'MAX_IMAGES:', MAX_IMAGES); // Debug log
    if (isLoggedIn) {
      setConversionCount(0);
      setDownloadCount(0);
      setShowSignupPopup(false);
      setError(null); // Clear any errors
    }
  }, [isLoggedIn]);

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
    console.log('onDrop - isLoggedIn:', isLoggedIn, 'Current images:', images.length, 'New files:', acceptedFiles.length); // Debug log
    if (!isLoggedIn && images.length + acceptedFiles.length > MAX_IMAGES) {
      setShowSignupPopup(true);
      setError(`Maximum ${MAX_IMAGES} images allowed for non-logged-in users. Please log in or sign up to upload up to 10 images.`);
      return;
    }

    const currentImageCount = images.length;
    const allowedNewImages = Math.max(0, MAX_IMAGES - currentImageCount);
    const newImages = acceptedFiles.slice(0, allowedNewImages).filter(file => {
      const validation = validateFile(file, ALLOWED_IMAGE_TYPES);
      if (!validation.isValid) {
        setError(validation.error ?? null);
      }
      return validation.isValid;
    }).map(file => ({
      file, preview: createSecureObjectURL(file),
    }));

    if (newImages.length !== acceptedFiles.length) {
      setError(`Only ${allowedNewImages} more image${allowedNewImages !== 1 ? 's' : ''} allowed. ${isLoggedIn ? 'You can upload up to 10 images.' : 'Log in or sign up to upload up to 10 images.'}`);
    }
    if (fileRejections.length > 0) {
      const rejectionErrors = fileRejections.map(rejection => `${rejection.file.name}: ${rejection.errors.map((e: any) => e.message).join(', ')}`).join('; ');
      setError(`Upload failed: ${rejectionErrors}`);
    }

    setImages(prev => [...prev, ...newImages]);
    setConvertedBlobs([]);
    if (!fileRejections.length && newImages.length === acceptedFiles.length) setError(null);
  }, [images, MAX_IMAGES, isLoggedIn]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.avif', '.heic'] }, maxFiles: MAX_IMAGES, maxSize: MAX_RECOMMENDED_SIZE,
  });

  const handleImageLoad = useCallback(() => {
    if (!imgRef.current || !cropContainerRef.current) return;
    const { naturalWidth, naturalHeight, width, height } = imgRef.current;
    setImageDimensions({ width: naturalWidth, height: naturalHeight });
    const scaleX = width / naturalWidth; const scaleY = height / naturalHeight;
    const newScale = Math.min(scaleX, scaleY);
    setScale(newScale);
    setCropSettings({ width: naturalWidth, height: naturalHeight, positionX: 0, positionY: 0, aspectRatio: null });
  }, []);

  const applyCrop = useCallback(async (imageSrc: string, cropSettings: CropSettings): Promise<string> => {
    const img = new Image();
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = imageSrc; });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');
    canvas.width = cropSettings.width; canvas.height = cropSettings.height;
    ctx.drawImage(img, cropSettings.positionX, cropSettings.positionY, cropSettings.width, cropSettings.height, 0, 0, cropSettings.width, cropSettings.height);
    return blobToDataURL(await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')), 'image/jpeg', 0.95)));
  }, [blobToDataURL]);

  const handleCropComplete = useCallback(async () => {
    if (!cropImageSrc || cropImageIndex === null || !imageDimensions) { setError('Invalid crop selection'); return; }
    setLoading(true);
    try {
      const croppedSrc = await applyCrop(cropImageSrc, cropSettings);
      const croppedBlob = dataURLtoBlob(croppedSrc);
      const croppedFile = new File([croppedBlob], images[cropImageIndex].file.name, { type: 'image/jpeg' });
      setImages(prev => { const newImages = [...prev]; revokeBlobUrl(newImages[cropImageIndex].preview); newImages[cropImageIndex] = { file: croppedFile, preview: croppedSrc }; return newImages; });
      setShowCropModal(false); setCropImageSrc(null); setCropImageIndex(null);
    } catch (err) { setError(`Cropping failed: ${(err as Error).message}`); } finally { setLoading(false); }
  }, [cropImageSrc, cropImageIndex, images, applyCrop, dataURLtoBlob, cropSettings, imageDimensions]);

  const handleConversion = useCallback(async () => {
    if (images.length === 0) { setError('No images selected'); return; }
    if (!isLoggedIn && conversionCount >= MAX_CONVERSIONS) { setShowSignupPopup(true); return; }
    setLoading(true); setError(null);
    try {
      const results = await Promise.all(images.map(async (image) => {
        let resultBlob: Blob = image.file;
        if (cropImageSrc && images.findIndex(img => img.preview === cropImageSrc) === images.indexOf(image)) {
          const croppedSrc = await applyCrop(image.preview, cropSettings);
          resultBlob = dataURLtoBlob(croppedSrc);
        }
        if (settings.format === 'svg') resultBlob = await convertToSVG(resultBlob, settings.quality);
        else if (settings.format === 'ico') resultBlob = await createICOSet(resultBlob);
        else if (settings.format === 'pdf') resultBlob = await createPDF(resultBlob, settings);
        else resultBlob = await compressImage(resultBlob, settings);
        if (settings.addWatermark && settings.format !== 'svg' && settings.format !== 'pdf' && settings.format !== 'ico')
          resultBlob = await addWatermarkToImage(resultBlob, settings.watermarkText);
        saveOperation({ type: 'image_conversion', metadata: { filename: image.file.name, fileSize: resultBlob.size, format: settings.format, settings }, preview: createSecureObjectURL(resultBlob) });
        return { blob: resultBlob, originalName: image.file.name };
      }));
      setConvertedBlobs(results);
      if (!isLoggedIn) setConversionCount(prev => prev + 1);
    } catch (err) { setError(`Conversion failed: ${(err as Error).message}`); } finally { setLoading(false); }
  }, [images, settings, cropImageSrc, cropSettings, saveOperation, isLoggedIn, conversionCount]);

  const handleDownload = useCallback((index: number) => {
    if (!isLoggedIn && downloadCount >= MAX_CONVERSIONS) { setShowSignupPopup(true); return; }
    if (!convertedBlobs[index]) return;
    const { blob, originalName } = convertedBlobs[index];
    const extension = settings.format === 'jpeg' ? 'jpg' : settings.format === 'ico' ? 'zip' : settings.format;
    const link = createSecureDownloadLink(blob, `${originalName.split('.').slice(0, -1).join('.')}.${extension}`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    if (!isLoggedIn) setDownloadCount(prev => prev + 1);
  }, [convertedBlobs, settings.format, isLoggedIn, downloadCount]);

  const handleBatchDownloadZip = useCallback(async () => {
    if (!isLoggedIn && downloadCount >= MAX_CONVERSIONS) { setShowSignupPopup(true); return; }
    const zip = new JSZip();
    convertedBlobs.forEach(({ blob, originalName }, index) => {
      const extension = settings.format === 'jpeg' ? 'jpg' : settings.format === 'ico' ? 'zip' : settings.format;
      zip.file(`${originalName.split('.').slice(0, -1).join('.')}.${extension}`, blob);
    });
    const content = await zip.generateAsync({ type: 'blob' });
    const link = createSecureDownloadLink(content, 'converted_images.zip');
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    if (!isLoggedIn) setDownloadCount(prev => prev + 1);
  }, [convertedBlobs, settings.format, isLoggedIn, downloadCount]);

  const resetImages = useCallback(() => {
    images.forEach(img => revokeBlobUrl(img.preview));
    setImages([]); setConvertedBlobs([]); setError(null); setShowCropModal(false); setCropImageSrc(null); setCropImageIndex(null);
  }, [images]);

  const handleNewConversion = useCallback(() => { resetImages(); setShowDropdown(false); }, [resetImages]);

  const removeImage = useCallback((index: number) => {
    setImages(prev => { const newImages = [...prev]; revokeBlobUrl(newImages[index].preview); newImages.splice(index, 1); return newImages; });
    setConvertedBlobs(prev => { const newBlobs = [...prev]; newBlobs.splice(index, 1); return newBlobs; });
  }, []);

  const handleAddMoreImages = useCallback(() => {
    console.log('handleAddMoreImages - isLoggedIn:', isLoggedIn, 'Images:', images.length, 'MAX_IMAGES:', MAX_IMAGES); // Debug log
    if (images.length >= MAX_IMAGES) {
      if (!isLoggedIn) {
        setShowSignupPopup(true);
        setError(`Maximum ${MAX_IMAGES} images reached. Log in or sign up to upload up to 10 images.`);
      } else {
        setError('Maximum 10 images reached.');
      }
      return;
    }
    if (fileInputRef.current) fileInputRef.current.click();
  }, [isLoggedIn, images, MAX_IMAGES]);

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
    if (x >= cropSettings.positionX && x <= cropSettings.positionX + cropSettings.width && y >= cropSettings.positionY && y <= cropSettings.positionY + cropSettings.height) {
      setIsDragging(true); setDragStart({ x, y });
    }
  }, [cropSettings, getPositionFromEvent]);

  const handleResizeStart = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, corner: string) => {
    e.preventDefault(); e.stopPropagation();
    const { x, y } = getPositionFromEvent(e);
    setIsResizing(corner); setDragStart({ x: x - cropSettings.positionX, y: y - cropSettings.positionY });
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
        const sensitivity = 0.3; const dx = (x - dragStart.x) * sensitivity; const dy = (y - dragStart.y) * sensitivity;
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

  const handleEnd = useCallback(() => { setIsDragging(false); setIsResizing(null); setDragStart(null); }, []);

  const resetCrop = useCallback(() => {
    if (!imageDimensions) return;
    setCropSettings({ width: imageDimensions.width, height: imageDimensions.height, positionX: 0, positionY: 0, aspectRatio: null });
  }, [imageDimensions]);

  const handleSignupClose = useCallback(() => setShowSignupPopup(false), []);

  const handleLoginOrSignup = useCallback((mode: 'signup' | 'login') => { 
    setShowSignupPopup(false); 
    setAuthMode(mode); 
    setAuthModalOpen(true); 
  }, []);

  const handleDropboxUpload = useCallback(() => { setShowDropdown(false); setError('Dropbox integration requires setup. Please use device upload for now.'); }, []);

  const handleUrlUpload = useCallback(async () => {
    if (!urlInput) { setError('Please enter a valid image URL.'); return; }
    setShowUrlModal(false); setLoading(true);
    try {
      const response = await fetch(urlInput, { mode: 'cors' });
      if (!response.ok) throw new Error('Failed to fetch image from URL.');
      const blob = await response.blob();
      const fileName = urlInput.split('/').pop() || 'image-from-url';
      const newFile = new File([blob], fileName, { type: blob.type });
      if (!validateFile(newFile, ALLOWED_IMAGE_TYPES).isValid) { setError('Invalid file type. Please upload an image.'); return; }
      if (newFile.size > MAX_RECOMMENDED_SIZE) setError(`File exceeds recommended limit of ${formatFileSize(MAX_RECOMMENDED_SIZE)}.`);
      onDrop([newFile], []); setUrlInput('');
    } catch (err) { setError(`URL upload failed: ${(err as Error).message}`); } finally { setLoading(false); }
  }, [urlInput, onDrop]);

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
    if (source === 'device' && fileInputRef.current) fileInputRef.current.click(); 
    else if (source === 'dropbox') handleDropboxUpload(); 
    else if (source === 'url') setShowUrlModal(true); 
  };
  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <>
      <SEOHeaders
        title="Free Online Image Editor - Create, Resize, Crop, Convert Images"
        description="Create and edit high-resolution images online with our free tool. Resize, crop, convert to JPEG, PNG, WebP, PDF, ICO, and more with advanced features."
        keywords={['image editor online free', 'create images online', 'resize high resolution images', 'crop image online tool', 'convert image to pdf', 'image compressor free', 'optimize images', 'batch image resizer', 'SEO image optimization', 'add watermark to image', 'free photo editing tool', 'online image creator']}
        canonicalUrl="https://pdfcircle.com/image-tools"
      />

      <div className="max-w-6xl mx-auto px-4 py-6 bg-white dark:bg-gray-900">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">Free Online Image Editor - Create, Resize, Crop & Convert</h1>
        <AdComponent
          format="horizontal"
          responsive={true}
          className="my-4 mx-auto max-w-full sm:max-w-4xl h-[50px] sm:h-[90px]"
          style={{ minHeight: '50px', maxHeight: '90px', width: '100%' }}
        />
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          {showCropModal && cropImageSrc && cropImageIndex !== null ? (
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/3 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-gray-900 dark:text-gray-100 space-y-4 border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Crop Rectangle</h2>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={Math.round(cropSettings.width)}
                      onChange={(e) => {
                        const newWidth = Math.max(50, +e.target.value);
                        setCropSettings(prev => ({ ...prev, width: newWidth, height: prev.aspectRatio ? newWidth / parseAspectRatio(prev.aspectRatio) : prev.height }));
                      }}
                      className="w-1/2 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
                      placeholder="Width"
                      min="50"
                    />
                    <input
                      type="number"
                      value={Math.round(cropSettings.height)}
                      onChange={(e) => {
                        const newHeight = Math.max(50, +e.target.value);
                        setCropSettings(prev => ({ ...prev, height: newHeight, width: prev.aspectRatio ? newHeight * parseAspectRatio(prev.aspectRatio) : prev.width }));
                      }}
                      className="w-1/2 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
                      placeholder="Height"
                      min="50"
                    />
                  </div>
                  <select
                    value={cropSettings.aspectRatio || 'Freeform'}
                    onChange={(e) => {
                      const value = e.target.value === 'Freeform' ? null : e.target.value;
                      setCropSettings(prev => ({ ...prev, aspectRatio: value, height: value ? prev.width / parseAspectRatio(value) : prev.height }));
                    }}
                    className="w-full p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
                  >
                    {ASPECT_RATIOS.map(ratio => <option key={ratio.value || 'Freeform'} value={ratio.value || 'Freeform'}>{ratio.label}</option>)}
                  </select>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Crop Position</h3>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={Math.round(cropSettings.positionX)}
                        onChange={(e) => setCropSettings(prev => ({ ...prev, positionX: clamp(+e.target.value, 0, imageDimensions ? imageDimensions.width - prev.width : Infinity) }))}
                        className="w-1/2 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
                        placeholder="Position X"
                        min="0"
                      />
                      <input
                        type="number"
                        value={Math.round(cropSettings.positionY)}
                        onChange={(e) => setCropSettings(prev => ({ ...prev, positionY: clamp(+e.target.value, 0, imageDimensions ? imageDimensions.height - prev.height : Infinity) }))}
                        className="w-1/2 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
                        placeholder="Position Y"
                        min="0"
                      />
                    </div>
                  </div>
                  <button onClick={resetCrop} className="w-full bg-gray-500 dark:bg-gray-600 text-white p-2 rounded hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors">Reset</button>
                </div>
              </div>
              <div className="w-full md:w-2/3 relative overflow-hidden">
                <div ref={cropContainerRef} className="relative overflow-auto touch-none select-none bg-gray-100 dark:bg-gray-900" style={{ maxHeight: '80vh', userSelect: 'none' }}>
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
                      className={`absolute border-2 border-indigo-500 dark:border-indigo-400 bg-indigo-500/30 dark:bg-indigo-400/30 cursor-move ${isDragging || isResizing ? 'opacity-75' : ''}`}
                      style={{
                        width: `${cropSettings.width * scale}px`,
                        height: `${cropSettings.height * scale}px`,
                        left: `${cropSettings.positionX * scale}px`,
                        top: `${cropSettings.positionY * scale}px`,
                        touchAction: 'none'
                      }}
                      onMouseDown={handleDragStart}
                      onTouchStart={handleDragStart}
                    >
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                        {[...Array(8)].map((_, i) => (
                          <div key={i} className={`border border-indigo-500 dark:border-indigo-400 border-opacity-50 ${i % 3 === 2 ? 'border-r-0' : ''} ${i >= 6 ? 'border-b-0' : ''}`} />
                        ))}
                      </div>
                      <div
                        className="absolute -top-2 -left-2 w-4 h-4 bg-indigo-600 dark:bg-indigo-500 rounded-full cursor-nwse-resize"
                        onMouseDown={(e) => handleResizeStart(e, 'tl')}
                        onTouchStart={(e) => handleResizeStart(e, 'tl')}
                      />
                      <div
                        className="absolute -top-2 -right-2 w-4 h-4 bg-indigo-600 dark:bg-indigo-500 rounded-full cursor-nesw-resize"
                        onMouseDown={(e) => handleResizeStart(e, 'tr')}
                        onTouchStart={(e) => handleResizeStart(e, 'tr')}
                      />
                      <div
                        className="absolute -bottom-2 -left-2 w-4 h-4 bg-indigo-600 dark:bg-indigo-500 rounded-full cursor-nesw-resize"
                        onMouseDown={(e) => handleResizeStart(e, 'bl')}
                        onTouchStart={(e) => handleResizeStart(e, 'bl')}
                      />
                      <div
                        className="absolute -bottom-2 -right-2 w-4 h-4 bg-indigo-600 dark:bg-indigo-500 rounded-full cursor-nwse-resize"
                        onMouseDown={(e) => handleResizeStart(e, 'br')}
                        onTouchStart={(e) => handleResizeStart(e, 'br')}
                      />
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => { setShowCropModal(false); setCropImageSrc(null); setCropImageIndex(null); }}
                    className="bg-gray-500 dark:bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Cancel crop"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCropComplete}
                    disabled={loading}
                    className="bg-indigo-500 dark:bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 dark:hover:bg-indigo-700 flex items-center disabled:opacity-50 transition-colors"
                    aria-label="Apply crop"
                  >
                    {loading ? (
                      <><Loader2 className="w-5 h-5 animate-spin mr-2 text-white" />Cropping...</>
                    ) : (
                      <><Crop className="w-5 h-5 mr-2 text-white" />Apply Crop</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {images.length === 0 ? (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Upload Images to Create Files (Max {MAX_IMAGES})</h2>
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer ${isDragActive ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500'}`}
                  >
                    <input {...getInputProps()} ref={fileInputRef} className="hidden" />
                    <div className="relative inline-block">
                      <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="bg-indigo-500 dark:bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 dark:hover:bg-indigo-700 transition-colors mb-4"
                        aria-label="Choose file source"
                      >
                        Choose File
                      </button>
                      {showDropdown && (
                        <div className="absolute left-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
                          <button
                            onClick={() => handleUploadSource('device')}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            Device
                          </button>
                          <button
                            onClick={() => handleUploadSource('dropbox')}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            Dropbox
                          </button>
                          <button
                            onClick={() => handleUploadSource('url')}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            URL
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">{isDragActive ? 'Drop here' : 'Or drag & drop here'}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">JPEG, PNG, WebP, SVG, AVIF, HEIC (Max 15MB, {MAX_IMAGES} images)</p>
                  </div>
                  <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                    <p>How to Create Files:</p>
                    <ul className="list-disc pl-5">
                      <li>Select up to {MAX_IMAGES} images to upload.</li>
                      <li>Add more images with the + button if under limit.</li>
                      <li>Choose your desired output format and settings.</li>
                      <li>Optionally crop or add a watermark.</li>
                      <li>Click "Create Files" to generate new files.</li>
                      <li>Download individually or as ZIP, then start a new conversion.</li>
                    </ul>
                  </div>
                  {!isLoggedIn && (
                    <div className="mt-6 mx-auto max-w-md rounded-lg border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300 shadow-sm">
                      <p>
                        <span className="font-semibold text-gray-800 dark:text-gray-100">Guests can upload up to {MAX_IMAGES} images</span> and make{" "}
                        <span className="font-semibold text-gray-800 dark:text-gray-100">{MAX_CONVERSIONS} conversions.</span><br />
                        <span className="text-gray-600 dark:text-gray-400">Want more?</span>{" "}
                        <button onClick={() => handleLoginOrSignup('login')} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Log in</button> or{" "}
                        <button onClick={() => handleLoginOrSignup('signup')} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">sign up</button>{" "}
                        to <span className="font-semibold text-gray-800 dark:text-gray-100">upload 10 images at once</span> and enjoy{" "}
                        <span className="font-semibold text-gray-800 dark:text-gray-100">unlimited conversions!</span>
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Preview and Create Files ({images.length}/{MAX_IMAGES})</h2>
                    {images.length < MAX_IMAGES && (
                      <button
                        onClick={handleAddMoreImages}
                        className="bg-blue-500 dark:bg-blue-600 text-white rounded-full p-2 hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
                        aria-label="Add more images"
                      >
                        <Plus className="w-5 h-5 text-white" />
                      </button>
                    )}
                  </div>
                  <input {...getInputProps()} ref={fileInputRef} className="hidden" />
                  {loading && (
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 dark:text-indigo-400" />
                      <p className="mt-2 text-gray-600 dark:text-gray-300">Processing...</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
                      {error}
                    </div>
                  )}
                  <div className="space-y-4 bg-gray-50 dark:bg-gray-900/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">File Creation Settings</h2>
                      <Settings2 className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <select
                      value={settings.format}
                      onChange={(e) => setSettings(prev => ({ ...prev, format: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
                    >
                      {FORMAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <div className="flex gap-2">
                      {['quality', 'size', 'custom'].map(mode => (
                        <button
                          key={mode}
                          onClick={() => setSettings(prev => ({ ...prev, mode: mode as 'size' | 'quality' | 'custom' }))}
                          className={`flex-1 px-3 py-2 rounded-lg ${settings.mode === mode ? 'bg-indigo-500 dark:bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'}`}
                        >
                          {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </button>
                      ))}
                    </div>
                    {settings.mode === 'quality' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quality: {settings.quality}%</label>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={settings.quality}
                          onChange={(e) => setSettings(prev => ({ ...prev, quality: Math.max(1, +e.target.value) }))}
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer accent-indigo-600 dark:accent-indigo-400"
                        />
                      </div>
                    ) : settings.mode === 'size' ? (
                      <div className="flex flex-wrap gap-2">
                        {SIZE_OPTIONS.map(size => (
                          <button
                            key={size}
                            onClick={() => setSettings(prev => ({ ...prev, targetSize: size }))}
                            className={`px-3 py-1 rounded-full ${settings.targetSize === size ? 'bg-indigo-500 dark:bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'}`}
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
                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
                            min="1"
                          />
                          <input
                            type="number"
                            value={settings.height || ''}
                            onChange={(e) => setSettings(prev => ({ ...prev, height: e.target.value ? Math.max(1, +e.target.value) : null }))}
                            placeholder={getPlaceholder('height')}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
                            min="1"
                          />
                          <select
                            value={settings.unit}
                            onChange={(e) => setSettings(prev => ({ ...prev, unit: e.target.value as 'px' | 'in' | 'cm' | 'mm' }))}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
                          >
                            {UNIT_OPTIONS.map(unit => <option key={unit} value={unit}>{unit.toUpperCase()}</option>)}
                          </select>
                        </div>
                        <label className="flex items-center mt-2">
                          <input
                            type="checkbox"
                            checked={settings.maintainAspectRatio}
                            onChange={(e) => setSettings(prev => ({ ...prev, maintainAspectRatio: e.target.checked }))}
                            className="h-4 w-4 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 border-gray-300 dark:border-gray-700 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Maintain aspect ratio</span>
                        </label>
                        <label className="flex items-center mt-2">
                          <input
                            type="checkbox"
                            checked={settings.addWatermark}
                            onChange={(e) => setSettings(prev => ({ ...prev, addWatermark: e.target.checked }))}
                            className="h-4 w-4 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 border-gray-300 dark:border-gray-700 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Add Watermark</span>
                        </label>
                        {settings.addWatermark && (
                          <input
                            type="text"
                            value={settings.watermarkText}
                            onChange={(e) => setSettings(prev => ({ ...prev, watermarkText: e.target.value }))}
                            placeholder="Enter watermark text"
                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
                          />
                        )}
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={handleConversion}
                        disabled={loading || !settings.format || (settings.mode === 'size' && !settings.targetSize)}
                        className="w-full sm:w-auto flex-1 bg-indigo-500 dark:bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-600 dark:hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center text-sm sm:text-base transition-colors"
                        aria-label="Create files"
                      >
                        {loading ? (
                          <><Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mr-1 sm:mr-2 text-white" /> Creating...</>
                        ) : (
                          <>{settings.format === 'pdf' ? <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-white" /> : <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-white" />} Create Files</>
                        )}
                      </button>
                      {convertedBlobs.length > 0 && images.length > 1 && (
                        <button
                          onClick={handleBatchDownloadZip}
                          className="w-full max-w-xs sm:w-auto bg-green-500 dark:bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-600 dark:hover:bg-green-700 flex items-center justify-center text-sm sm:text-base transition-colors"
                          aria-label="Download ZIP"
                        >
                          <Archive className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-white" /> Download ZIP
                        </button>
                      )}
                      {convertedBlobs.length > 0 && (
                        <button
                          onClick={handleNewConversion}
                          className="w-full max-w-xs sm:max-w-none sm:w-auto flex bg-purple-500 dark:bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-600 dark:hover:bg-purple-700 items-center text-sm sm:text-base justify-center transition-colors"
                          aria-label="New conversion"
                        >
                          <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-white" /> New Conversion
                        </button>
                      )}
                    </div>
                    {!isLoggedIn && (conversionCount > 0 || downloadCount > 0) && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        You've used {conversionCount} conversions and {downloadCount} downloads of {MAX_CONVERSIONS} free actions.
                        <button onClick={() => handleLoginOrSignup('login')} className="text-indigo-600 dark:text-indigo-400 hover:underline">Log in</button> or
                        <button onClick={() => handleLoginOrSignup('signup')} className="text-indigo-600 dark:text-indigo-400 hover:underline">sign up</button> for unlimited access and up to 10 images per batch!
                      </p>
                    )}
                    {isLoggedIn && images.length > 0 && (
                      <p className="text-sm text-green-600 dark:text-green-400">You can upload up to 10 images and perform unlimited conversions!</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {showSignupPopup && !isLoggedIn && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Unlock Unlimited Features</h2>
              <p className="mb-4 text-gray-700 dark:text-gray-300">You've reached the limit of {MAX_CONVERSIONS} free conversions/downloads or attempted to upload more than {MAX_IMAGES} images. Log in or sign up to process up to 10 images at once and enjoy unlimited conversions!</p>
              <ul className="list-disc pl-5 mb-4 text-sm text-gray-600 dark:text-gray-400">
                <li>Batch process up to 10 images</li>
                <li>Unlimited conversions and downloads</li>
                <li>Priority support</li>
              </ul>
              <div className="flex justify-end gap-4">
                <button onClick={handleSignupClose} className="bg-gray-500 dark:bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors">Maybe Later</button>
                <button onClick={() => handleLoginOrSignup('signup')} className="bg-indigo-500 dark:bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 dark:hover:bg-indigo-700 transition-colors">Log In / Sign Up</button>
              </div>
            </div>
          </div>
        )}

        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} mode={authMode} />

        {showUrlModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Upload Image from URL</h2>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Enter image URL"
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 mb-4"
              />
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => { setShowUrlModal(false); setUrlInput(''); }}
                  className="bg-gray-500 dark:bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUrlUpload}
                  className="bg-indigo-500 dark:bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 dark:hover:bg-indigo-700 transition-colors"
                  disabled={loading}
                >
                  {loading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-lg font-semibold dark:text-white text-gray-800 mb-4">More PDF Tools</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {['watermark', 'split', 'merge', 'to-images', 'create'].map(tab => (
              <Link 
                key={tab} 
                to={`/pdf-tools?tab=${tab}`} 
                className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200"
              >
                <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
                  {tab === 'watermark' ? <Edit className="w-6 h-6 text-indigo-600" /> : 
                   tab === 'split' ? <SplitSquareVertical className="w-6 h-6 text-indigo-600" /> : 
                   tab === 'merge' ? <Merge className="w-6 h-6 text-indigo-600" /> : 
                   tab === 'to-images' ? <Images className="w-6 h-6 text-indigo-600" /> : 
                   <FileText className="w-6 h-6 text-indigo-600" />}
                </div>
                <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-white">
                  {tab === 'watermark' ? 'Watermark PDF' : tab === 'split' ? 'Split PDF' : tab === 'merge' ? 'Merge PDF' : tab === 'to-images' ? 'PDF to Images' : 'Create PDF'}
                </span>
              </Link>
            ))}
          </div>
        </div>
        <section className="mt-6 text-gray-700 dark:text-gray-200">
          <h2 className="text-xl font-semibold mb-2">Why Use pdfCircle’s Image Editor?</h2>
          <p className="mb-4">
            pdfCircle’s free online image editor empowers professionals, students, and creators to <strong>edit, resize, crop, and convert images</strong> with ease. Supporting formats like <strong>JPEG, PNG, WebP, PDF, ICO, AVIF, and HEIC</strong>, our tools are perfect for optimizing images for websites, crafting social media visuals, or preparing professional documents. Whether you’re a web developer reducing file sizesfor faster load times, a marketer designing eye-catching graphics, or a student formatting images for assignments, pdfCircle delivers a secure, user-friendly experience.
          </p>
          <ul className="list-disc pl-5 mb-4">
            <li><strong>Advanced Editing</strong>: Resize images in pixels, inches, or centimeters, crop with custom aspect ratios (e.g., 1:1, 16:9), and add watermarks for branding or protection.</li>
            <li><strong>Versatile Conversion</strong>: Convert images to multiple formats, including PDF for documents, ICO for favicons, or WebP for web optimization.</li>
            <li><strong>Batch Processing</strong>: Edit up to 10 images at once (3 for guests) and download them individually or as a ZIP file for convenience.</li>
            <li><strong>Smart Compression</strong>: Reduce file sizes while preserving quality, ideal for email attachments or SEO-friendly websites. Choose quality levels or target sizes (e.g., 100KB, 1MB).</li>
            <li><strong>Secure & Accessible</strong>: Process images directly in your browser for maximum privacy. No sign-up needed for basic features, with premium accounts for unlimited conversions.</li>
          </ul>
          <p className="mb-4">
            Our intuitive interface supports drag-and-drop uploads, real-time previews, and URL-based image imports, making editing accessible to all skill levels. Optimize your workflow with pdfCircle’s free tools and unlock unlimited possibilities by signing up for a free account. Start transforming your images today—no software downloads required!
          </p>
          <p className="text-sm text-gray-500">
            <em>Pro Tip: Sign up to process up to 10 images at once and enjoy unlimited conversions, all from the comfort of your browser.</em>
          </p>
        </section>
        <section className="mt-8 text-gray-700 dark:text-gray-200">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-white">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqData.map((faq, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full flex justify-between items-center p-4 text-left text-lg font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
                  aria-expanded={openFaqIndex === index}
                  aria-controls={`faq-answer-${index}`}
                >
                  <span>{faq.question}</span>
                  {openFaqIndex === index ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                <div
                  id={`faq-answer-${index}`}
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaqIndex === index ? 'max-h-96 p-4' : 'max-h-0'}`}
                >
                  <p className="text-sm text-gray-600 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: faq.answer }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <StickyBottomAd />
    </>
  );
}

export default ImageTools;