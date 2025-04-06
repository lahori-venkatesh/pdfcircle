import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Loader2, X, Crop, Wand2, Sliders } from 'lucide-react';
import { AdComponent } from './AdComponent';
import { SEOHeaders } from './SEOHeaders';
import Upscaler from 'upscaler';

// Debounce utility function
const debounce = <F extends (...args: any[]) => void>(func: F, wait: number) => {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<F>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

interface ImageState {
  raw: string;
  preprocessed: string;
  preview: string;
  enhanced: string | null;
  fullEnhanced: string | null;
}

interface Enhancement {
  brightness: number;
  contrast: number;
  saturation: number;
  quality: number;
}

interface CropState {
  width: number;
  height: number;
  x: number;
  y: number;
}

const defaultEnhancements: Enhancement = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  quality: 80
};

interface OpenCV {
  Mat: any;
  MatVector: any;
  imshow: (canvas: HTMLCanvasElement | string, mat: any) => void;
  matFromImageData: (imageData: ImageData) => any;
  cvtColor: (src: any, dst: any, code: number) => void;
  split: (src: any, dst: any) => void;
  merge: (src: any, dst: any) => void;
  filter2D: (src: any, dst: any, ddepth: number, kernel: any) => void;
  COLOR_RGBA2RGB: number;
  COLOR_RGB2HSV: number;
  COLOR_HSV2RGB: number;
  CV_32F: number;
}

declare global {
  interface Window {
    cv: OpenCV;
    isOpenCvReady: boolean;
  }
}

const initOpenCV = (): Promise<void> => {
  if (window.cv && window.isOpenCvReady && window.cv.Mat && typeof window.cv.cvtColor === 'function') {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const handleOpenCVReady = () => {
      if (window.cv && window.cv.Mat && typeof window.cv.cvtColor === 'function') {
        resolve();
      } else {
        reject(new Error('OpenCV loaded but missing core functionality'));
      }
    };

    window.addEventListener('opencv-ready', handleOpenCVReady, { once: true });

    const checkInterval = setInterval(() => {
      if (window.cv && window.isOpenCvReady && window.cv.Mat && window.cv.cvtColor !== undefined) {
        clearInterval(checkInterval);
        window.removeEventListener('opencv-ready', handleOpenCVReady);
        resolve();
      }
    }, 100);

    setTimeout(() => {
      clearInterval(checkInterval);
      window.removeEventListener('opencv-ready', handleOpenCVReady);
      if (!window.cv || !window.cv.Mat || !window.cv.cvtColor) {
        reject(new Error('OpenCV initialization timeout or incomplete'));
      }
    }, 30000);
  });
};

export function DigitalImageEnhancer() {
  const [image, setImage] = useState<ImageState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropState, setCropState] = useState<CropState>({ width: 0, height: 0, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [enhancements, setEnhancements] = useState<Enhancement>(defaultEnhancements);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [cvReady, setCvReady] = useState(false);
  const [upscalerReady, setUpscalerReady] = useState(false);
  const [upscaler, setUpscaler] = useState<any>(null);
  const [enhancementMode, setEnhancementMode] = useState<'basic' | 'ai'>('basic');
  const [aiEnhancementLevel, setAiEnhancementLevel] = useState<number>(2);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  
  const initializedRef = useRef(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const cropContainerRef = useRef<HTMLDivElement | null>(null);

  // Initialize OpenCV and UpscalerJS
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      
      // Initialize OpenCV
      initOpenCV()
        .then(() => setCvReady(true))
        .catch((err) => setError('Failed to load OpenCV: ' + err.message));
      
      // Initialize UpscalerJS with default scale factor
      try {
        const upscalerInstance = new Upscaler({
          model: '@upscalerjs/esrgan-medium', // Use ESRGAN medium model for good quality/performance balance
          scale: 2 // Default scale factor
        });
        setUpscaler(upscalerInstance);
        setUpscalerReady(true);
      } catch (err) {
        setError('Failed to initialize UpscalerJS: ' + (err as Error).message);
      }
    }
  }, []);

  // Create a new upscaler instance when the AI enhancement level changes
  useEffect(() => {
    if (enhancementMode === 'ai') {
      try {
        // Create a new upscaler instance with the selected scale factor
        const upscalerInstance = new Upscaler({
          model: '@upscalerjs/esrgan-medium',
          scale: aiEnhancementLevel // Use the selected enhancement level
        });
        setUpscaler(upscalerInstance);
        
        // If we already have an image, re-enhance it with the new scale factor
        if (image?.preprocessed) {
          handleAiEnhance(image.preprocessed);
        }
      } catch (err) {
        setError('Failed to update UpscalerJS: ' + (err as Error).message);
      }
    }
  }, [aiEnhancementLevel]);

  const dataURLtoBlob = useCallback((dataURL: string): Blob => {
    const [header, data] = dataURL.split(',');
    const mimeMatch = header.match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Invalid data URL');
    const mime = mimeMatch[1];
    const binary = atob(data);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
  }, []);

  const blobToDataURL = useCallback((blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }, []);

  const resizeImage = useCallback(async (imageSrc: string, maxDimension: number): Promise<string> => {
    const image = await createImageBitmap(dataURLtoBlob(imageSrc));
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const scale = Math.min(maxDimension / image.width, maxDimension / image.height, 1);
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const resizedBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 1.0);
    });
    return await blobToDataURL(resizedBlob);
  }, [dataURLtoBlob, blobToDataURL]);

  const applyCrop = useCallback(async (imageSrc: string, crop: CropState): Promise<string> => {
    const image = await createImageBitmap(dataURLtoBlob(imageSrc));
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = crop.width;
    canvas.height = crop.height;

    const scaleX = image.width / (imgRef.current?.width || image.width);
    const scaleY = image.height / (imgRef.current?.height || image.height);

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    const croppedBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 1.0);
    });
    return await blobToDataURL(croppedBlob);
  }, [dataURLtoBlob, blobToDataURL]);

  const preprocessImage = useCallback(async (imageSrc: string): Promise<string> => {
    const image = await createImageBitmap(dataURLtoBlob(imageSrc));
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);
    const preprocessedBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 1.0);
    });
    return await blobToDataURL(preprocessedBlob);
  }, [dataURLtoBlob, blobToDataURL]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setLoading(true);
      setError(null);
      try {
        const reader = new FileReader();
        reader.onload = async () => {
          let src = reader.result as string;
          src = await resizeImage(src, 800);
          const preprocessedSrc = await preprocessImage(src);
          setImage({
            raw: src,
            preprocessed: preprocessedSrc,
            preview: src,
            enhanced: src,
            fullEnhanced: src,
          });
        };
        reader.readAsDataURL(file);
      } catch (err) {
        setError('Failed to load image: ' + (err as Error).message);
      } finally {
        setLoading(false);
      }
    }
  }, [resizeImage, preprocessImage]);

  const handleImageLoad = useCallback(() => {
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCropState({
        width: Math.min(183, width),
        height: Math.min(95, height),
        x: 28,
        y: 13,
      });
    }
  }, []);

  const handleCropChange = useCallback((key: keyof CropState, value: number) => {
    setCropState((prev) => {
      const newState = { ...prev, [key]: value };
      if (imgRef.current) {
        const maxWidth = imgRef.current.width;
        const maxHeight = imgRef.current.height;
        
        newState.width = Math.min(newState.width, maxWidth);
        newState.height = Math.min(newState.height, maxHeight);
        newState.x = Math.max(0, Math.min(newState.x, maxWidth - newState.width));
        newState.y = Math.max(0, Math.min(newState.y, maxHeight - newState.height));
      }
      return newState;
    });
  }, []);

  const getPositionFromEvent = useCallback((e: MouseEvent | TouchEvent, rect: DOMRect) => {
    const isTouch = 'touches' in e;
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return { x, y };
  }, []);

  const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!cropContainerRef.current) return;

    const rect = cropContainerRef.current.getBoundingClientRect();
    const { x, y } = getPositionFromEvent(e as unknown as MouseEvent | TouchEvent, rect);

    if (
      x >= cropState.x &&
      x <= cropState.x + cropState.width &&
      y >= cropState.y &&
      y <= cropState.y + cropState.height
    ) {
      setIsDragging(true);
      setDragStart({ x: x - cropState.x, y: y - cropState.y });
    }
  }, [cropState, getPositionFromEvent]);

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!cropContainerRef.current) return;
    e.preventDefault();

    const rect = cropContainerRef.current.getBoundingClientRect();
    const { x, y } = getPositionFromEvent(e, rect);

    if (isDragging && dragStart) {
      const newX = x - dragStart.x;
      const newY = y - dragStart.y;

      setCropState((prev) => {
        const maxWidth = imgRef.current?.width || 0;
        const maxHeight = imgRef.current?.height || 0;

        const constrainedX = Math.max(0, Math.min(newX, maxWidth - prev.width));
        const constrainedY = Math.max(0, Math.min(newY, maxHeight - prev.height));

        return {
          ...prev,
          x: constrainedX,
          y: constrainedY,
        };
      });
    } else if (isResizing) {
      setCropState((prev) => {
        const maxWidth = imgRef.current?.width || 0;
        const maxHeight = imgRef.current?.height || 0;
        let newState = { ...prev };

        if (isResizing === 'top-left') {
          const newWidth = prev.width + (prev.x - x);
          const newHeight = prev.height + (prev.y - y);
          const newX = x;
          const newY = y;

          newState.width = Math.max(10, Math.min(newWidth, maxWidth));
          newState.height = Math.max(10, Math.min(newHeight, maxHeight));
          newState.x = Math.max(0, Math.min(newX, prev.x + prev.width - 10));
          newState.y = Math.max(0, Math.min(newY, prev.y + prev.height - 10));
        } else if (isResizing === 'top-right') {
          const newWidth = x - prev.x;
          const newHeight = prev.height + (prev.y - y);
          const newY = y;

          newState.width = Math.max(10, Math.min(newWidth, maxWidth - prev.x));
          newState.height = Math.max(10, Math.min(newHeight, maxHeight));
          newState.y = Math.max(0, Math.min(newY, prev.y + prev.height - 10));
        } else if (isResizing === 'bottom-left') {
          const newWidth = prev.width + (prev.x - x);
          const newHeight = y - prev.y;
          const newX = x;

          newState.width = Math.max(10, Math.min(newWidth, maxWidth));
          newState.height = Math.max(10, Math.min(newHeight, maxHeight - prev.y));
          newState.x = Math.max(0, Math.min(newX, prev.x + prev.width - 10));
        } else if (isResizing === 'bottom-right') {
          const newWidth = x - prev.x;
          const newHeight = y - prev.y;

          newState.width = Math.max(10, Math.min(newWidth, maxWidth - prev.x));
          newState.height = Math.max(10, Math.min(newHeight, maxHeight - prev.y));
        }

        return newState;
      });
    }
  }, [isDragging, dragStart, isResizing, getPositionFromEvent]);

  const handleDragEnd = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setIsResizing(null);
    setDragStart(null);
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, corner: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(corner);
  }, []);

  // Attach event listeners manually with passive: false
  useEffect(() => {
    const container = cropContainerRef.current;
    if (!container || !showCropModal) return;

    container.addEventListener('mousemove', handleDragMove, { passive: false });
    container.addEventListener('mouseup', handleDragEnd, { passive: false });
    container.addEventListener('mouseleave', handleDragEnd, { passive: false });
    container.addEventListener('touchmove', handleDragMove, { passive: false });
    container.addEventListener('touchend', handleDragEnd, { passive: false });
    container.addEventListener('touchcancel', handleDragEnd, { passive: false });

    return () => {
      container.removeEventListener('mousemove', handleDragMove);
      container.removeEventListener('mouseup', handleDragEnd);
      container.removeEventListener('mouseleave', handleDragEnd);
      container.removeEventListener('touchmove', handleDragMove);
      container.removeEventListener('touchend', handleDragEnd);
      container.removeEventListener('touchcancel', handleDragEnd);
    };
  }, [handleDragMove, handleDragEnd, showCropModal]);

  const handleCropComplete = useCallback(async () => {
    if (!cropImageSrc) return;
    setLoading(true);
    try {
      const croppedSrc = await applyCrop(cropImageSrc, cropState);
      const preprocessedSrc = await preprocessImage(croppedSrc);
      setImage({
        raw: cropImageSrc,
        preprocessed: preprocessedSrc,
        preview: croppedSrc,
        enhanced: croppedSrc,
        fullEnhanced: croppedSrc,
      });
      setShowCropModal(false);
      setCropImageSrc(null);
      setCropState({ width: 0, height: 0, x: 0, y: 0 });
      setError(null);
    } catch (err) {
      setError('Cropping/Preprocessing failed: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [cropImageSrc, cropState, applyCrop, preprocessImage]);

  // AI-based image enhancement using UpscalerJS
  const handleAiEnhance = useCallback(async (imageSrc: string) => {
    if (!upscalerReady || !upscaler) {
      setError('AI image enhancement not ready.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Process the image with UpscalerJS
      // No need to configure here - we create a new instance with the correct scale factor in the useEffect
      const enhancedImageSrc = await upscaler.upscale(imageSrc);
      
      // Apply basic enhancements after AI upscaling
      const enhancedImage = await createImageBitmap(dataURLtoBlob(enhancedImageSrc));
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = enhancedImage.width;
      canvas.height = enhancedImage.height;
      ctx.drawImage(enhancedImage, 0, 0);
      
      // Apply brightness, contrast, and saturation adjustments
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      const brightnessAdjust = (enhancements.brightness - 100) / 100 * 255;
      const contrastFactor = enhancements.contrast / 100;
      const saturationFactor = enhancements.saturation / 100;
      
      for (let i = 0; i < data.length; i += 4) {
        // Apply brightness
        data[i] = Math.min(255, Math.max(0, data[i] + brightnessAdjust));
        data[i+1] = Math.min(255, Math.max(0, data[i+1] + brightnessAdjust));
        data[i+2] = Math.min(255, Math.max(0, data[i+2] + brightnessAdjust));
        
        // Apply contrast
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        
        data[i] = Math.min(255, Math.max(0, (r - 128) * contrastFactor + 128));
        data[i+1] = Math.min(255, Math.max(0, (g - 128) * contrastFactor + 128));
        data[i+2] = Math.min(255, Math.max(0, (b - 128) * contrastFactor + 128));
        
        // Apply saturation (simplified approach)
        const avg = (data[i] + data[i+1] + data[i+2]) / 3;
        data[i] = Math.min(255, Math.max(0, avg + (data[i] - avg) * saturationFactor));
        data[i+1] = Math.min(255, Math.max(0, avg + (data[i+1] - avg) * saturationFactor));
        data[i+2] = Math.min(255, Math.max(0, avg + (data[i+2] - avg) * saturationFactor));
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      // Convert to blob with quality setting
      const finalBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', enhancements.quality / 100);
      });
      
      const sizeInKB = finalBlob.size / 1024;
      setFileSize(sizeInKB);
      
      const finalDataURL = await blobToDataURL(finalBlob);
      
      setImage((prev) => ({
        ...prev!,
        enhanced: finalDataURL,
        fullEnhanced: finalDataURL,
      }));
      
    } catch (err) {
      setError('AI Enhancement failed: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [upscalerReady, upscaler, enhancements, dataURLtoBlob, blobToDataURL]);

  // Basic image enhancement using OpenCV
  const handleBasicEnhance = useCallback(async (imageSrc: string, isInitial: boolean = false) => {
    if (!cvReady || !window.cv) {
      setError('Image processing not ready.');
      return;
    }
    setLoading(true);
    setError(null);

    let src, rgb, hsv, channels, sharpDst;
    try {
      const blob = dataURLtoBlob(imageSrc);
      const img = await createImageBitmap(blob);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      src = window.cv.matFromImageData(imageData);
      rgb = new window.cv.Mat();
      window.cv.cvtColor(src, rgb, window.cv.COLOR_RGBA2RGB || 4);

      if (isInitial) {
        const gamma = 1.2;
        for (let i = 0; i < rgb.rows; i++) {
          for (let j = 0; j < rgb.cols; j++) {
            const pixel = rgb.ucharPtr(i, j);
            for (let c = 0; c < 3; c++) {
              pixel[c] = Math.min(255, Math.max(0, 255 * Math.pow(pixel[c] / 255, 1 / gamma)));
            }
          }
        }
      }

      let contrastFactor = enhancements.contrast / 100;
      let brightnessOffset = (enhancements.brightness - 100) * 0.5;
      if (isInitial) {
        contrastFactor = 1.4;
        brightnessOffset = 20;
      }
      const contrastMidpoint = 128;
      for (let i = 0; i < rgb.rows; i++) {
        for (let j = 0; j < rgb.cols; j++) {
          const pixel = rgb.ucharPtr(i, j);
          for (let c = 0; c < 3; c++) {
            let adjusted = (pixel[c] - contrastMidpoint) * contrastFactor + contrastMidpoint + brightnessOffset;
            pixel[c] = Math.min(255, Math.max(0, adjusted));
          }
        }
      }

      hsv = new window.cv.Mat();
      window.cv.cvtColor(rgb, hsv, window.cv.COLOR_RGB2HSV || 40);
      channels = new window.cv.MatVector();
      window.cv.split(hsv, channels);
      const s = channels.get(1);
      let saturationFactor = enhancements.saturation / 100;
      if (isInitial) saturationFactor = 1.3;
      for (let i = 0; i < s.rows; i++) {
        for (let j = 0; j < s.cols; j++) {
          const pixel = s.ucharPtr(i, j);
          pixel[0] = Math.min(255, Math.max(0, pixel[0] * saturationFactor));
        }
      }
      window.cv.merge(channels, hsv);
      window.cv.cvtColor(hsv, rgb, window.cv.COLOR_HSV2RGB || 41);

      let finalDst = rgb;
      if (isInitial) {
        sharpDst = new window.cv.Mat();
        const kernel = window.cv.Mat.eye(3, 3, window.cv.CV_32F || 5);
        const sharpnessValue = 2.5;
        kernel.data32F.set([-0.5, -0.5, -0.5, -0.5, sharpnessValue, -0.5, -0.5, -0.5, -0.5]);
        window.cv.filter2D(rgb, sharpDst, -1, kernel);
        kernel.delete();
        finalDst = sharpDst;
      }

      window.cv.imshow(canvas, finalDst);
      const enhancedBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', enhancements.quality / 100);
      });

      const sizeInKB = enhancedBlob.size / 1024;
      setFileSize(sizeInKB);

      const enhancedDataURL = await blobToDataURL(enhancedBlob);

      setImage((prev) => ({
        ...prev!,
        enhanced: enhancedDataURL,
        fullEnhanced: isInitial ? enhancedDataURL : prev?.fullEnhanced || null,
      }));
    } catch (err) {
      setError('Enhancement failed: ' + (err as Error).message);
      throw err;
    } finally {
      setLoading(false);
      if (src && !src.isDeleted()) src.delete();
      if (rgb && !rgb.isDeleted()) rgb.delete();
      if (hsv && !hsv.isDeleted()) hsv.delete();
      if (channels && !channels.isDeleted()) channels.delete();
      if (sharpDst && !sharpDst.isDeleted()) sharpDst.delete();
    }
  }, [cvReady, enhancements, dataURLtoBlob, blobToDataURL]);

  // Handle enhancement based on selected mode
  const handleEnhance = useCallback(async (imageSrc: string, isInitial: boolean = false) => {
    if (enhancementMode === 'ai') {
      await handleAiEnhance(imageSrc);
    } else {
      await handleBasicEnhance(imageSrc, isInitial);
    }
  }, [enhancementMode, handleAiEnhance, handleBasicEnhance]);

  const debouncedHandleEnhance = useMemo(
    () => debounce((imageSrc: string) => handleEnhance(imageSrc), 300),
    [handleEnhance]
  );

  const handleDownload = useCallback(() => {
    if (!image?.fullEnhanced) return;
    const link = document.createElement('a');
    link.href = image.fullEnhanced;
    link.download = `enhanced-image.jpg`;
    link.click();
  }, [image]);

  const handleEnhancementChange = useCallback((key: keyof Enhancement, value: number) => {
    setEnhancements((prev) => ({ ...prev, [key]: value }));
    if (image && (cvReady || upscalerReady)) {
      debouncedHandleEnhance(image.preprocessed);
    }
  }, [image, cvReady, upscalerReady, debouncedHandleEnhance]);

  const handleQualityChange = useCallback((value: number) => {
    handleEnhancementChange('quality', value);
  }, [handleEnhancementChange]);

  const handleEnhancementModeChange = useCallback((mode: 'basic' | 'ai') => {
    setEnhancementMode(mode);
    if (image?.preprocessed) {
      // Reset enhancements to default when changing modes
      setEnhancements(defaultEnhancements);
      // Apply the new enhancement mode
      if (mode === 'ai') {
        handleAiEnhance(image.preprocessed);
      } else {
        handleBasicEnhance(image.preprocessed);
      }
    }
  }, [image, handleAiEnhance, handleBasicEnhance]);

  const handleAiEnhancementLevelChange = useCallback((value: number) => {
    setAiEnhancementLevel(value);
    // The useEffect will handle creating a new upscaler instance and re-enhancing the image
  }, []);

  const handleReset = useCallback(() => {
    setEnhancements(defaultEnhancements);
    if (image) {
      setImage((prev) => ({
        ...prev!,
        enhanced: prev!.preview,
        fullEnhanced: prev!.preview,
      }));
    }
  }, [image]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.tiff'] },
    maxFiles: 1,
    maxSize: 15 * 1024 * 1024, // 15MB limit for high-quality images
  });

  const resetImage = useCallback(() => {
    setImage(null);
    setEnhancements(defaultEnhancements);
    setError(null);
    setLoading(false);
    setFileSize(null);
    setEnhancementMode('basic');
    setAiEnhancementLevel(2);
    setShowAdvancedControls(false);
  }, []);

  if (!cvReady && !upscalerReady) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-center min-h-[200px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          <p className="text-gray-600 text-sm">Loading image processing libraries...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHeaders 
        title="Free Digital Image Enhancer - Crop, Rotate & Enhance High-Quality Photos"
        description="Enhance your high-quality images online for free. Crop, rotate, and adjust brightness, contrast, and saturation with our advanced photo editing tool."
        keywords={[
          'digital image enhancer', 'photo editor online free', 'enhance high-quality images', 'crop image online', 'rotate image tool', 
          'image brightness adjuster', 'contrast enhancement tool', 'saturation editor', 'free photo enhancer', 'online image editing', 
          'improve image quality', 'photo cropper free', 'image enhancement software', 'edit photos online', 'high-resolution image editor', 
          'image processing tool', 'free image optimizer', 'enhance photos for web', 'digital photo editor', 'online photo enhancement'
        ]}
        canonicalUrl="https://example.com/digital-image-enhancer"
      />

      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          Free Digital Image Enhancer - Crop, Rotate & Enhance Photos
        </h1>
        <AdComponent slot="digital-image-enhancer-top" className="mb-6" style={{ minHeight: '90px' }} />

        {showCropModal && cropImageSrc && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
              <h2 className="text-lg font-semibold mb-4">Crop Your Image</h2>
              <div
                ref={cropContainerRef}
                className="relative w-full h-full overflow-auto touch-none select-none"
              >
                <img
                  ref={imgRef}
                  src={cropImageSrc}
                  alt="Image to crop"
                  onLoad={handleImageLoad}
                  className="w-full h-auto max-h-[70vh]"
                />
                {cropState.width > 0 && cropState.height > 0 && (
                  <div
                    className={`absolute border-2 border-blue-500 border-dashed cursor-move ${isDragging || isResizing ? 'opacity-75' : ''}`}
                    style={{
                      left: `${cropState.x}px`,
                      top: `${cropState.y}px`,
                      width: `${cropState.width}px`,
                      height: `${cropState.height}px`,
                    }}
                    onMouseDown={handleDragStart}
                    onTouchStart={handleDragStart}
                  >
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                      {[...Array(8)].map((_, index) => (
                        <div
                          key={index}
                          className={`border border-blue-500 border-opacity-50 ${
                            index % 3 === 2 ? 'border-r-0' : ''
                          } ${index >= 6 ? 'border-b-0' : ''}`}
                        />
                      ))}
                    </div>
                    <div
                      className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 rounded-full cursor-nwse-resize"
                      onMouseDown={(e) => handleResizeStart(e, 'top-left')}
                      onTouchStart={(e) => handleResizeStart(e, 'top-left')}
                    />
                    <div
                      className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-nesw-resize"
                      onMouseDown={(e) => handleResizeStart(e, 'top-right')}
                      onTouchStart={(e) => handleResizeStart(e, 'top-right')}
                    />
                    <div
                      className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 rounded-full cursor-nesw-resize"
                      onMouseDown={(e) => handleResizeStart(e, 'bottom-left')}
                      onTouchStart={(e) => handleResizeStart(e, 'bottom-left')}
                    />
                    <div
                      className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-nwse-resize"
                      onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
                      onTouchStart={(e) => handleResizeStart(e, 'bottom-right')}
                    />
                  </div>
                )}
              </div>
              <div className="flex mt-4 gap-4">
                <div className="flex-1">
                  <h3 className="text-sm font-medium mb-2">Crop Options</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm">Width (px)</label>
                      <input
                        type="number"
                        value={Math.round(cropState.width)}
                        onChange={(e) => handleCropChange('width', Number(e.target.value))}
                        className="w-full border rounded px-2 py-1"
                        min="10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm">Height (px)</label>
                      <input
                        type="number"
                        value={Math.round(cropState.height)}
                        onChange={(e) => handleCropChange('height', Number(e.target.value))}
                        className="w-full border rounded px-2 py-1"
                        min="10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm">Position X (px)</label>
                      <input
                        type="number"
                        value={Math.round(cropState.x)}
                        onChange={(e) => handleCropChange('x', Number(e.target.value))}
                        className="w-full border rounded px-2 py-1"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm">Position Y (px)</label>
                      <input
                        type="number"
                        value={Math.round(cropState.y)}
                        onChange={(e) => handleCropChange('y', Number(e.target.value))}
                        className="w-full border rounded px-2 py-1"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-end">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowCropModal(false);
                        setCropImageSrc(null);
                        setCropState({ width: 0, height: 0, x: 0, y: 0 });
                      }}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCropComplete}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          Cropping...
                        </>
                      ) : (
                        <>
                          <Crop className="w-5 h-5 mr-2" />
                          Crop Image
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col justify-center space-y-2 mx-4 md:mx-16 lg:mx-36">
          <div className="space-y-6 align-middle">
            {!image ? (
              <div>
                <h2 className="text-lg font-semibold mb-4">Upload Your Image to Enhance</h2>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 align-middle text-center cursor-pointer ${
                    isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-12 h-12 text-gray-400 dark:text-white mx-auto mb-4" />
                  <p className="dark:text-white">
                    {isDragActive ? 'Drop the image here' : 'Drag & drop an image or tap to select'}
                  </p>
                  <p className="text-sm text-gray-500 mt-2 dark:text-white">PNG, JPG, JPEG, WEBP, TIFF (Max 15MB)</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Original Image</h2>
                  <button onClick={resetImage} className="text-gray-500 hover:text-gray-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  {image.preview ? (
                    <img src={image.preview} alt="Original high-quality image" className="w-full h-full object-contain rounded-lg" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                      Original image not available.
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setCropImageSrc(image.raw);
                      setShowCropModal(true);
                    }}
                    className="absolute bottom-4 right-4 bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 flex items-center shadow-lg"
                    title="Crop Image"
                  >
                    <Crop className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {image && (
              <>
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">Enhanced Image Preview</h2>
                  <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    {loading ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100/75">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                          <p className="text-gray-600 text-sm">Processing image...</p>
                        </div>
                      </div>
                    ) : image.enhanced ? (
                      <img src={image.enhanced} alt="Enhanced high-quality image" className="w-full h-full object-contain" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                        No enhanced image available.
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6 bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-medium">Enhancement Mode</h2>
                    <button
                      onClick={() => setShowAdvancedControls(!showAdvancedControls)}
                      className="text-indigo-600 hover:text-indigo-700 text-sm flex items-center"
                    >
                      <Sliders className="w-4 h-4 mr-1" />
                      {showAdvancedControls ? 'Hide Advanced Controls' : 'Show Advanced Controls'}
                    </button>
                  </div>

                  <div className="flex gap-4 mb-4">
                    <button
                      onClick={() => handleEnhancementModeChange('basic')}
                      className={`flex-1 py-2 px-4 rounded-lg ${
                        enhancementMode === 'basic'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Basic Enhancement
                    </button>
                    <button
                      onClick={() => handleEnhancementModeChange('ai')}
                      className={`flex-1 py-2 px-4 rounded-lg ${
                        enhancementMode === 'ai'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      AI Enhancement
                    </button>
                  </div>

                  {enhancementMode === 'ai' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        AI Enhancement Level: {aiEnhancementLevel}x
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="4"
                        step="1"
                        value={aiEnhancementLevel}
                        onChange={(e) => handleAiEnhancementLevelChange(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-indigo-600"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Higher values provide better quality but may take longer to process
                      </p>
                    </div>
                  )}

                  {showAdvancedControls && (
                    <>
                      <div className="pt-2 border-t border-gray-200">
                        <h3 className="text-sm font-medium mb-3">Image Adjustments</h3>
                        {(['brightness', 'contrast', 'saturation'] as const).map((key) => (
                          <div key={key} className="mb-3">
                            <label className="block text-sm font-medium mb-1">
                              {key.charAt(0).toUpperCase() + key.slice(1)}: {enhancements[key]}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="200"
                              value={enhancements[key]}
                              onChange={(e) => handleEnhancementChange(key, Number(e.target.value))}
                              className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-indigo-600"
                            />
                          </div>
                        ))}

                        <div className="mb-3">
                          <label className="block text-sm font-medium mb-1">
                            Quality Level: {enhancements.quality}% {fileSize ? `(~${fileSize.toFixed(2)} KB)` : ''}
                          </label>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            value={enhancements.quality}
                            onChange={(e) => handleQualityChange(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-indigo-600"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={handleReset}
                          className="text-indigo-600 hover:text-indigo-700 text-sm"
                        >
                          Reset to Default
                        </button>
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between pt-4">
                    <button
                      onClick={() => handleEnhance(image.preprocessed)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center disabled:bg-gray-400"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-5 h-5 mr-2" />
                          Enhance Image
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDownload}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center disabled:bg-gray-400"
                      disabled={loading || !image?.fullEnhanced}
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Download
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Useful Resources for Image Enhancement</h2>
            <p>Related Tools: 
                      <a href="/pdf-tools" className="text-indigo-600 hover:underline" title="PDF Editing Tools">PDF Tools</a> | 
                      <a href="/pdf-tools?tab=compress" className="text-indigo-600 hover:underline" title="Image Compression Tool">Compressor pdf</a> | 
                      <a href="/pdf-tools?tab=create" className="text-indigo-600 hover:underline" title="File Format Converter">Create pdf</a> | 
                      <a href="/pdf-tools?tab=to-images" className="text-indigo-600 hover:underline" title="File Format Converter">pdf to image</a> | 
                      <a href="/pdf-tools?tab=watermark" className="text-indigo-600 hover:underline" title="File Format Converter">watermark on pdf</a>
            </p> 
            <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300">
              <li>
                <a href="https://www.adobe.com/products/photoshop.html" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                  Adobe Photoshop - Professional Photo Editing Software
                </a>
              </li>
              <li>
                <a href="https://www.gimp.org/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                  GIMP - Free and Open-Source Image Editor
                </a>
              </li>
              <li>
                <a href="https://opencv.org/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                  OpenCV - Advanced Image Processing Library
                </a>
              </li>
              <li>
                <a href="https://www.canva.com/photo-editor/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                  Canva Photo Editor - Easy Online Design Tool
                </a>
              </li>
            </ul>
          </div>
        </div>

        {error && <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
      </div>
    </>
  );
}

export default DigitalImageEnhancer;
