import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Loader2, X, Crop, RotateCw, Wand2 } from 'lucide-react';
import { AdComponent } from './AdComponent'; // Assuming this is in your project
import { SEOHeaders } from './SEOHeaders'; // Optional: Assuming this is in your project

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
}

interface Point {
  x: number;
  y: number;
}

const defaultEnhancements: Enhancement = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
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
  getPerspectiveTransform: (src: any, dst: any) => any;
  warpPerspective: (src: any, dst: any, transform: any, dsize: any) => void;
  COLOR_RGBA2RGB: number;
  COLOR_RGB2HSV: number;
  COLOR_HSV2RGB: number;
  CV_32F: number;
  CV_32FC2: number;
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
  const [points, setPoints] = useState<Point[]>([]);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState<number | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [enhancements, setEnhancements] = useState<Enhancement>(defaultEnhancements);
  const [quality, setQuality] = useState(80);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [cvReady, setCvReady] = useState(false);
  const initializedRef = useRef(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const cropContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      initOpenCV()
        .then(() => setCvReady(true))
        .catch((err) => setError('Failed to load OpenCV: ' + err.message));
    }
  }, []);

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

  const applyManualCrop = useCallback(async (imageSrc: string, points: Point[]): Promise<string> => {
    const image = await createImageBitmap(dataURLtoBlob(imageSrc));
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);

    const scaleX = image.width / (imgRef.current?.width || image.width);
    const scaleY = image.height / (imgRef.current?.height || image.height);
    const scaledPoints = points.map((p) => ({ x: p.x * scaleX, y: p.y * scaleY }));
    const sortedPoints = [...scaledPoints];
    sortedPoints.sort((a, b) => a.y - b.y);
    const top = sortedPoints.slice(0, 2).sort((a, b) => a.x - b.x);
    const bottom = sortedPoints.slice(2).sort((a, b) => a.x - b.x);
    const orderedPoints = [top[0], top[1], bottom[1], bottom[0]];

    const src = window.cv.matFromImageData(ctx.getImageData(0, 0, image.width, image.height));
    const a4Width = 595;
    const a4Height = 842;
    const dstPoints = new window.cv.Mat(4, 1, window.cv.CV_32FC2 || 5);
    dstPoints.data32F.set([0, 0, a4Width - 1, 0, a4Width - 1, a4Height - 1, 0, a4Height - 1]);
    const srcPoints = new window.cv.Mat(4, 1, window.cv.CV_32FC2 || 5);
    srcPoints.data32F.set(orderedPoints.flatMap((p) => [p.x, p.y]));
    const transform = window.cv.getPerspectiveTransform(srcPoints, dstPoints);
    const warped = new window.cv.Mat();
    canvas.width = a4Width;
    canvas.height = a4Height;
    window.cv.warpPerspective(src, warped, transform, { width: a4Width, height: a4Height });

    let hasNonZeroPixels = false;
    for (let i = 0; i < warped.rows; i += Math.max(1, Math.floor(warped.rows / 10))) {
      for (let j = 0; j < warped.cols; j += Math.max(1, Math.floor(warped.cols / 10))) {
        const pixel = warped.ucharPtr(i, j);
        if (pixel[0] !== 0 || pixel[1] !== 0 || pixel[2] !== 0) {
          hasNonZeroPixels = true;
          break;
        }
      }
      if (hasNonZeroPixels) break;
    }

    if (!hasNonZeroPixels) {
      src.delete();
      srcPoints.delete();
      dstPoints.delete();
      transform.delete();
      warped.delete();
      throw new Error('Perspective transform resulted in an empty image');
    }

    window.cv.imshow(canvas, warped);
    const croppedBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 1.0);
    });
    const croppedDataURL = await blobToDataURL(croppedBlob);

    src.delete();
    srcPoints.delete();
    dstPoints.delete();
    transform.delete();
    warped.delete();

    return croppedDataURL;
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
    if (imgRef.current && cropContainerRef.current) {
      const { width, height } = imgRef.current;
      const cropWidth = width * 0.8;
      const cropHeight = height * 0.8;
      const cropX = (width - cropWidth) / 2;
      const cropY = (height - cropHeight) / 2;
      setPoints([
        { x: cropX, y: cropY },
        { x: cropX + cropWidth, y: cropY },
        { x: cropX + cropWidth, y: cropY + cropHeight },
        { x: cropX, y: cropY + cropHeight },
      ]);
    }
  }, []);

  const getPositionFromEvent = useCallback((e: React.MouseEvent | React.TouchEvent, rect: DOMRect) => {
    const isTouch = 'touches' in e;
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return { 
      x: Math.max(0, Math.min(x, rect.width)), 
      y: Math.max(0, Math.min(y, rect.height)) 
    };
  }, []);

  const handleStart = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, index: number | 'rotate') => {
    e.preventDefault();
    if (index === 'rotate') {
      setIsRotating(true);
    } else {
      setIsDragging(index);
    }
  }, []);

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!cropContainerRef.current || (isDragging === null && !isRotating)) return;
    e.preventDefault();
    
    const rect = cropContainerRef.current.getBoundingClientRect();
    const { x, y } = getPositionFromEvent(e, rect);

    if (isRotating) {
      const center = points.reduce(
        (acc, p) => ({ x: acc.x + p.x / 4, y: acc.y + p.y / 4 }),
        { x: 0, y: 0 }
      );
      const angle = Math.atan2(y - center.y, x - center.x) - Math.PI / 2;
      const newRotation = (angle * 180) / Math.PI;
      setRotation(newRotation);

      const newPoints = points.map((p) => {
        const dx = p.x - center.x;
        const dy = p.y - center.y;
        const radius = Math.sqrt(dx * dx + dy * dy);
        const currentAngle = Math.atan2(dy, dx);
        const newAngle = currentAngle + (newRotation * Math.PI) / 180;
        return {
          x: center.x + radius * Math.cos(newAngle),
          y: center.y + radius * Math.sin(newAngle),
        };
      });
      setPoints(newPoints);
    } else if (isDragging !== null) {
      const newPoints = [...points];
      newPoints[isDragging] = { x, y };
      setPoints(newPoints);
    }
  }, [isDragging, isRotating, points]);

  const handleEnd = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(null);
    setIsRotating(false);
  }, []);

  const handleCropComplete = useCallback(async () => {
    if (!cropImageSrc || points.length !== 4) return;
    setLoading(true);
    try {
      const croppedSrc = await applyManualCrop(cropImageSrc, points);
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
      setPoints([]);
      setRotation(0);
      setError(null);
    } catch (err) {
      setError('Cropping/Preprocessing failed: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [cropImageSrc, points, applyManualCrop, preprocessImage]);

  const handleAutoEnhance = useCallback(async (imageSrc: string, isInitial: boolean = false) => {
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
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', quality / 100);
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
  }, [cvReady, enhancements, quality, dataURLtoBlob, blobToDataURL]);

  const debouncedHandleAutoEnhance = useMemo(
    () => debounce((imageSrc: string) => handleAutoEnhance(imageSrc), 300),
    [handleAutoEnhance]
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
    if (image && cvReady) {
      debouncedHandleAutoEnhance(image.preprocessed);
    }
  }, [image, cvReady, debouncedHandleAutoEnhance]);

  const handleQualityChange = useCallback((value: number) => {
    setQuality(value);
    if (image?.preprocessed) {
      debouncedHandleAutoEnhance(image.preprocessed);
    }
  }, [image, debouncedHandleAutoEnhance]);

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
  });

  const resetImage = useCallback(() => {
    setImage(null);
    setEnhancements(defaultEnhancements);
    setError(null);
    setLoading(false);
    setFileSize(null);
  }, []);

  if (!cvReady) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-center min-h-[200px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          <p className="text-gray-600 text-sm">Loading image processing library...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHeaders 
        title="Digital Image Enhancer" 
        description="Enhance your images with advanced processing tools" 
        keywords={['image enhancer', 'photo editing', 'image processing']} 
      />
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <AdComponent slot="digital-image-enhancer-top" className="mb-6" style={{ minHeight: '90px' }} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">Digital Image Enhancer</h1>

        {showCropModal && cropImageSrc && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
              <h2 className="text-lg font-semibold mb-4">Crop Image</h2>
              <div
                ref={cropContainerRef}
                className="relative w-full h-full overflow-auto touch-none select-none"
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
                onTouchCancel={handleEnd}
              >
                <img
                  ref={imgRef}
                  src={cropImageSrc}
                  alt="Crop"
                  onLoad={handleImageLoad}
                  className="w-auto h-auto max-w-full max-h-[70vh]"
                />
                {points.length === 4 && (
                  <>
                    <svg
                      className="absolute top-0 left-0 pointer-events-none"
                      width={imgRef.current?.width || 0}
                      height={imgRef.current?.height || 0}
                    >
                      <polygon
                        points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                        fill="rgba(79, 70, 229, 0.3)"
                        stroke="rgba(79, 70, 229, 1)"
                        strokeWidth="2"
                      />
                    </svg>
                    {points.map((point, index) => (
                      <div
                        key={index}
                        className="absolute w-6 h-6 bg-indigo-600 rounded-full cursor-move touch-none"
                        style={{
                          left: `${point.x}px`,
                          top: `${point.y}px`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        onMouseDown={(e) => handleStart(e, index)}
                        onTouchStart={(e) => handleStart(e, index)}
                      />
                    ))}
                    <div
                      className="absolute w-6 h-6 bg-green-600 rounded-full cursor-pointer touch-none flex items-center justify-center"
                      style={{
                        left: `${(points[0].x + points[1].x) / 2}px`,
                        top: `${points[0].y - 30}px`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      onMouseDown={(e) => handleStart(e, 'rotate')}
                      onTouchStart={(e) => handleStart(e, 'rotate')}
                    >
                      <RotateCw className="w-4 h-4 text-white" />
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    setShowCropModal(false);
                    setCropImageSrc(null);
                    setPoints([]);
                    setRotation(0);
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCropComplete}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center"
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
                      Apply Crop
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col justify-center space-y-2 mx-4 md:mx-16 lg:mx-36" >
          <div className="space-y-6 align-middle ">
            {!image ? (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 align-middle text-center cursor-pointer ${
                  isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 text-gray-400 dark:text-white mx-auto mb-4" />
                <p className='dark:text-white'>{isDragActive ? 'Drop the image here' : 'Drag & drop an image or tap to select'}</p>
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
                    <img src={image.preview} alt="Original" className="w-full h-full object-contain rounded-lg" />
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
                  <h2 className="text-lg font-semibold">Enhanced Image</h2>
                  <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    {loading ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100/75">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                          <p className="text-gray-600 text-sm">Processing image...</p>
                        </div>
                      </div>
                    ) : image.enhanced ? (
                      <img src={image.enhanced} alt="Enhanced" className="w-full h-full object-contain" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                        No enhanced image available.
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6 bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Enhancement Controls</h3>
                    <button
                      onClick={() => {
                        setEnhancements(defaultEnhancements);
                        if (cvReady && image) handleAutoEnhance(image.preprocessed);
                      }}
                      className="text-indigo-600 hover:text-indigo-700 text-sm"
                    >
                      Reset
                    </button>
                  </div>

                  {(['brightness', 'contrast', 'saturation'] as const).map((key) => (
                    <div key={key}>
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

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Quality Level: {quality}% {fileSize ? `(~${fileSize.toFixed(2)} KB)` : ''}
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={quality}
                      onChange={(e) => handleQualityChange(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-indigo-600"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <button
                      onClick={() => handleAutoEnhance(image.preprocessed)}
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
                          Auto Enhance
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
        </div>
        {error && <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
      </div>
    </>
  );
}

export default DigitalImageEnhancer;