import { useState, useCallback, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Loader2, X, FileText, Plus, Image as ImageIcon, Settings, Crop } from 'lucide-react';
import { DndContext, rectIntersection, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { SortableImage } from './SortableImage';
import { validateFile, ALLOWED_IMAGE_TYPES, createSecureObjectURL, createSecureDownloadLink, revokeBlobUrl } from '../../utils/security';
import { useOperationsCache } from '../../utils/operationsCache';
import JSZip from 'jszip';
import { Link } from 'react-router-dom';
import { AuthModal } from '../AuthModal';

interface ImageItem {
  id: string;
  file: File;
  preview: string;
  removedBackground?: string;
}

interface CreateFileSizes {
  original: number | null;
  estimated: number | null;
  final: number | null;
}

interface PageSize {
  width: number;
  height: number;
}

const PAGE_SIZES: Record<string, PageSize> = {
  'Fit': { width: 0, height: 0 },
  'A4': { width: 595.28, height: 841.89 },
  'US Letter': { width: 612, height: 792 },
};

const MARGINS: Record<string, number> = {
  'No Margin': 0,
  'Small Margin': 20,
  'Big Margin': 50,
  'Custom': 0,
};

export function CreatePDF({ isLoggedIn }: { isLoggedIn: boolean }) {
  const { saveOperation } = useOperationsCache();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [createQualityLevel, setCreateQualityLevel] = useState<number>(80);
  const [processingImageId, setProcessingImageId] = useState<string | null>(null);
  const [createFileSizes, setCreateFileSizes] = useState<CreateFileSizes>({
    original: null,
    estimated: null,
    final: null,
  });
  const [orientation, setOrientation] = useState<'Portrait' | 'Landscape'>('Portrait');
  const [pageSize, setPageSize] = useState<string>('A4');
  const [margin, setMargin] = useState<string>('Small Margin');
  const [customMargin, setCustomMargin] = useState<number>(20);
  const [mergePDF, setMergePDF] = useState<boolean>(true);
  const [showNewConversion, setShowNewConversion] = useState<boolean>(false);
  const [conversionCount, setConversionCount] = useState<number>(0);
  const [showSignupPopup, setShowSignupPopup] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'signup' | 'login' | 'forgot-password'>('signup');

  const MAX_CONVERSIONS = isLoggedIn ? Infinity : 3;

  useEffect(() => {
    if (isLoggedIn) {
      setConversionCount(0);
      setShowSignupPopup(false);
      setError(null);
    }
  }, [isLoggedIn]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 0, distance: 0 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 0, tolerance: 10 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const compressImage = async (file: File, quality: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = createSecureObjectURL(file);
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          revokeBlobUrl(url);
          return reject(new Error('Canvas context not supported'));
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            revokeBlobUrl(url);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality / 100
        );
      };
      img.onerror = () => {
        revokeBlobUrl(url);
        reject(new Error('Failed to load image for compression'));
      };
    });
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const validFiles = acceptedFiles.filter((file) => {
        const validation = validateFile(file, ALLOWED_IMAGE_TYPES);
        if (!validation.isValid) {
          setError(validation.error || 'Invalid file type');
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) {
        setError('No valid files uploaded. Please upload images (JPEG, PNG, WebP).');
        return;
      }

      const newImages = validFiles
        .map((file) => {
          try {
            const preview = createSecureObjectURL(file);
            return {
              id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              file,
              preview,
            };
          } catch (err) {
            setError(`Failed to create preview for ${file.name}: ${(err as Error).message}`);
            return null;
          }
        })
        .filter((img): img is ImageItem => img !== null);

      setImages((prev) => {
        const updatedImages = [...prev, ...newImages].slice(0, 30);
        const totalOriginalSize = updatedImages.reduce((sum, img) => sum + img.file.size, 0);
        const estimatedSize = totalOriginalSize * (createQualityLevel / 100) * 1.1;
        setCreateFileSizes({
          original: totalOriginalSize,
          estimated: estimatedSize,
          final: null,
        });
        return updatedImages;
      });

      setResult(null);
      setResultBlob(null);
      if (validFiles.length > 0) setError(null);
    },
    [createQualityLevel]
  );

  const resetBackgroundRemoval = (imageId: string) => {
    setImages((prev) =>
      prev.map((img) => {
        if (img.id === imageId && img.removedBackground) {
          revokeBlobUrl(img.removedBackground);
          return { ...img, removedBackground: undefined };
        }
        return img;
      })
    );
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    multiple: true,
    maxFiles: 30,
  });

  const handleDragStart = useCallback((event: DragStartEvent) => {
    console.log('Drag started:', event);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      setImages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const handleRemoveImage = useCallback(
    (id: string) => {
      setImages((prev) => {
        const imageToRemove = prev.find((img) => img.id === id);
        if (imageToRemove) {
          revokeBlobUrl(imageToRemove.preview);
          if (imageToRemove.removedBackground) {
            revokeBlobUrl(imageToRemove.removedBackground);
          }
        }
        const updatedImages = prev.filter((img) => img.id !== id);
        const totalOriginalSize = updatedImages.reduce((sum, img) => sum + img.file.size, 0);
        const estimatedSize = totalOriginalSize * (createQualityLevel / 100) * 1.1;
        setCreateFileSizes({
          original: totalOriginalSize,
          estimated: estimatedSize,
          final: null,
        });
        return updatedImages;
      });
    },
    [createQualityLevel]
  );

  const handleCreatePDF = async () => {
    if (images.length === 0) {
      setError('Please select at least one image');
      return;
    }
  
    if (!isLoggedIn && conversionCount >= MAX_CONVERSIONS) {
      setShowSignupPopup(true);
      return;
    }
  
    setLoading(true);
    setError(null);
  
    try {
      if (mergePDF) {
        const pdfDoc = await PDFDocument.create();
  
        for (const image of images) {
          console.log(`Processing image: ${image.file.name}, type: ${image.file.type}`); // Log original file type
          const compressedBlob = await compressImage(image.file, createQualityLevel);
          const imageBytes = await compressedBlob.arrayBuffer();
          console.log(`Compressed blob type: ${compressedBlob.type}, size: ${compressedBlob.size}`); // Log compressed blob details
  
          const img = new Image();
          img.src = createSecureObjectURL(compressedBlob);
  
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error(`Failed to load image for sizing: ${image.file.name}`));
          });
  
          let pdfImage;
          try {
            // Always use embedJpg since compressImage outputs JPEG
            pdfImage = await pdfDoc.embedJpg(imageBytes);
          } catch (embedError) {
            throw new Error(`Failed to embed image ${image.file.name}: ${embedError instanceof Error ? embedError.message : String(embedError)}`);
          }
  
          const page = pdfDoc.addPage();
          const size = PAGE_SIZES[pageSize];
          let pageWidth, pageHeight;
  
          if (pageSize === 'Fit') {
            if (img.width <= 0 || img.height <= 0) {
              throw new Error(`Invalid image dimensions for ${image.file.name}: width=${img.width}, height=${img.height}`);
            }
            pageWidth = img.width;
            pageHeight = img.height;
          } else {
            pageWidth = orientation === 'Portrait' ? size.width : size.height;
            pageHeight = orientation === 'Portrait' ? size.height : size.width;
          }
  
          page.setSize(pageWidth, pageHeight);
  
          const marginSize = margin === 'Custom' ? Math.max(0, customMargin) : MARGINS[margin];
          const drawWidth = pageWidth - 2 * marginSize;
          const drawHeight = pageHeight - 2 * marginSize;
          const aspectRatio = pdfImage.width / pdfImage.height;
  
          let finalWidth = drawWidth;
          let finalHeight = drawHeight;
  
          if (drawWidth / drawHeight > aspectRatio) {
            finalWidth = drawHeight * aspectRatio;
          } else {
            finalHeight = drawWidth / aspectRatio;
          }
  
          page.drawImage(pdfImage, {
            x: (pageWidth - finalWidth) / 2,
            y: (pageHeight - finalHeight) / 2,
            width: finalWidth,
            height: finalHeight,
          });
  
          revokeBlobUrl(img.src);
        }
  
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  
        if (result) revokeBlobUrl(result);
        const newResult = createSecureObjectURL(blob);
        setResult(newResult);
        setResultBlob(blob);
  
        setCreateFileSizes((prev) => ({
          ...prev,
          final: pdfBytes.length,
        }));
  
        saveOperation({
          type: 'create_pdf',
          metadata: {
            filename: 'document.pdf',
            fileSize: pdfBytes.length,
            settings: { imageCount: images.length, qualityLevel: createQualityLevel, orientation, pageSize, margin, mergePDF },
          },
          preview: createSecureObjectURL(blob),
        });
      } else {
        const zip = new JSZip();
        for (const image of images) {
          console.log(`Processing image for ZIP: ${image.file.name}, type: ${image.file.type}`); // Log original file type
          const pdfDoc = await PDFDocument.create();
          const compressedBlob = await compressImage(image.file, createQualityLevel);
          const imageBytes = await compressedBlob.arrayBuffer();
          console.log(`Compressed blob type: ${compressedBlob.type}, size: ${compressedBlob.size}`); // Log compressed blob details
  
          let pdfImage;
          try {
            // Always use embedJpg since compressImage outputs JPEG
            pdfImage = await pdfDoc.embedJpg(imageBytes);
          } catch (embedError) {
            throw new Error(`Failed to embed image ${image.file.name}: ${embedError instanceof Error ? embedError.message : String(embedError)}`);
          }
  
          const page = pdfDoc.addPage();
          const size = PAGE_SIZES[pageSize];
          let pageWidth, pageHeight;
  
          if (pageSize === 'Fit') {
            const img = new Image();
            img.src = createSecureObjectURL(compressedBlob);
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = () => reject(new Error(`Failed to load image for sizing: ${image.file.name}`));
            });
            if (img.width <= 0 || img.height <= 0) {
              throw new Error(`Invalid image dimensions for ${image.file.name}: width=${img.width}, height=${img.height}`);
            }
            pageWidth = img.width;
            pageHeight = img.height;
            revokeBlobUrl(img.src);
          } else {
            pageWidth = orientation === 'Portrait' ? size.width : size.height;
            pageHeight = orientation === 'Portrait' ? size.height : size.width;
          }
  
          page.setSize(pageWidth, pageHeight);
  
          const marginSize = margin === 'Custom' ? Math.max(0, customMargin) : MARGINS[margin];
          const drawWidth = pageWidth - 2 * marginSize;
          const drawHeight = pageHeight - 2 * marginSize;
          const aspectRatio = pdfImage.width / pdfImage.height;
  
          let finalWidth = drawWidth;
          let finalHeight = drawHeight;
  
          if (drawWidth / drawHeight > aspectRatio) {
            finalWidth = drawHeight * aspectRatio;
          } else {
            finalHeight = drawWidth / aspectRatio;
          }
  
          page.drawImage(pdfImage, {
            x: (pageWidth - finalWidth) / 2,
            y: (pageHeight - finalHeight) / 2,
            width: finalWidth,
            height: finalHeight,
          });
  
          const pdfBytes = await pdfDoc.save();
          zip.file(`${image.file.name.replace(/\.[^/.]+$/, '')}.pdf`, pdfBytes);
        }
  
        const zipBlob = await zip.generateAsync({ type: 'blob' }).catch((zipError) => {
          throw new Error(`Failed to generate ZIP: ${zipError instanceof Error ? zipError.message : String(zipError)}`);
        });
        if (result) revokeBlobUrl(result);
        const newResult = createSecureObjectURL(zipBlob);
        setResult(newResult);
        setResultBlob(zipBlob);
  
        setCreateFileSizes((prev) => ({
          ...prev,
          final: zipBlob.size,
        }));
  
        saveOperation({
          type: 'create_pdf_zip',
          metadata: {
            filename: 'documents.zip',
            fileSize: zipBlob.size,
            settings: { imageCount: images.length, qualityLevel: createQualityLevel, orientation, pageSize, margin, mergePDF },
          },
          preview: createSecureObjectURL(zipBlob),
        });
      }
  
      if (!isLoggedIn) {
        setConversionCount((prev) => prev + 1);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err) || 'Unknown error occurred';
      setError(`Error creating PDF: ${errorMessage}`);
      console.error('PDF creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!resultBlob) return;

    setDownloading(true);
    try {
      const link = createSecureDownloadLink(resultBlob, mergePDF ? 'document.pdf' : 'documents.zip');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowNewConversion(true);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Error downloading file. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const resetFiles = useCallback(() => {
    images.forEach((image) => {
      revokeBlobUrl(image.preview);
      if (image.removedBackground) {
        revokeBlobUrl(image.removedBackground);
      }
    });
    if (result) revokeBlobUrl(result);
    setImages([]);
    setResult(null);
    setResultBlob(null);
    setError(null);
    setCreateFileSizes({ original: null, estimated: null, final: null });
    setOrientation('Portrait');
    setPageSize('A4');
    setMargin('Small Margin');
    setCustomMargin(20);
    setMergePDF(true);
    setShowNewConversion(false);
  }, [images, result]);

  const formatFileSize = (bytes: number | null) => {
    if (bytes === null) return 'Unknown';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const calculateCreateReduction = () => {
    if (!createFileSizes.original || !createFileSizes.final) return null;
    const reduction = ((createFileSizes.original - createFileSizes.final) / createFileSizes.original) * 100;
    return Math.max(0, Math.round(reduction));
  };

  const handleQualityChange = (newQuality: number) => {
    setCreateQualityLevel(newQuality);
    if (createFileSizes.original) {
      const estimatedSize = createFileSizes.original * (newQuality / 100) * 1.1;
      setCreateFileSizes((prev) => ({
        ...prev,
        estimated: estimatedSize,
      }));
    }
  };

  const handleNewConversion = () => {
    resetFiles();
  };

  const handleAddMoreImages = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        const fileList = Array.from(files);
        onDrop(fileList);
      }
    };
    input.click();
  };

  const handleSignupClose = useCallback(() => {
    setShowSignupPopup(false);
    setError(null);
  }, []);

  const handleLoginOrSignup = useCallback((mode: 'signup' | 'login') => {
    setShowSignupPopup(false);
    setAuthMode(mode);
    setAuthModalOpen(true);
  }, []);

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors
          ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4 dark:text-white" />
        <p className="text-gray-600 dark:text-white">
          {isDragActive ? 'Drop the images here' : 'Drag & drop images here'}
        </p>
        <button
          type="button"
          onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
          className="mt-4 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Upload className="w-5 h-5 mr-2" />
          Choose Images
        </button>
        <p className="text-sm text-gray-500 mt-2 dark:text-white">Supports images (JPEG, PNG, WebP, max 30)</p>
      </div>
      
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">How to Use Create PDF:</h3>
        <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1">
          <li>Upload up to 30 images via drag-and-drop or by clicking "Choose Images".</li>
          <li>Arrange images in the desired order using drag-and-drop.</li>
          <li>Adjust quality, orientation, page size, and margins as needed.</li>
          <li>Choose to merge images into one PDF or create separate PDFs (downloaded as a ZIP).</li>
          <li>Click "Create PDF" and download the result.</li>
        </ul>
      </div>

      {!isLoggedIn && (
        <div className="text-center text-sm text-gray-500">
          <p>
            Non-logged-in users can perform {MAX_CONVERSIONS} conversions.{' '}
            <button onClick={() => handleLoginOrSignup('login')} className="text-indigo-600 hover:underline">
              Log in
            </button>{' '}
            or{' '}
            <button onClick={() => handleLoginOrSignup('signup')} className="text-indigo-600 hover:underline">
              sign up
            </button>{' '}
            for unlimited conversions!
          </p>
        </div>
      )}

      {images.length > 0 && (
        <>
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold dark:text-white text-gray-800">
                Selected Images ({images.length}/30)
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handleAddMoreImages}
                  className="relative bg-indigo-600 text-white rounded-full p-2 hover:bg-indigo-700 transition-colors"
                  title="Add more images"
                  aria-label="Add more images"
                >
                  <Plus className="w-5 h-5" />
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {Math.max(0, 30 - images.length)}
                  </span>
                </button>
                <button
                  onClick={resetFiles}
                  className="text-gray-500 dark:text-white hover:text-gray-700"
                  title="Remove all images"
                  aria-label="Remove all images"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={rectIntersection}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={images.map((img) => img.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {images.map((image, idx) => (
                    <div key={image.id} className="relative">
                      <SortableImage
                        id={image.id}
                        preview={image.removedBackground || image.preview}
                        onRemove={handleRemoveImage}
                        index={idx}
                      />
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm dark:text-white font-medium text-gray-700 mb-2">
                Quality: {createQualityLevel}% (Higher quality = Larger file size)
              </label>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={createQualityLevel}
                onChange={(e) => handleQualityChange(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-indigo-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-white">Orientation</label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as 'Portrait' | 'Landscape')}
                className="w-full p-3 border border-gray-300 dark:text-white dark:bg-gray-700 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="Portrait">Portrait</option>
                <option value="Landscape">Landscape</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-white">Page Size</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:text-white dark:bg-gray-700 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="Fit">Fit to Image</option>
                <option value="A4">A4</option>
                <option value="US Letter">US Letter</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-white">Margin</label>
              <select
                value={margin}
                onChange={(e) => setMargin(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 dark:text-white dark:bg-gray-700 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="No Margin">No Margin</option>
                <option value="Small Margin">Small Margin</option>
                <option value="Big Margin">Big Margin</option>
                <option value="Custom">Custom</option>
              </select>
              {margin === 'Custom' && (
                <input
                  type="number"
                  min="0"
                  value={customMargin}
                  onChange={(e) => setCustomMargin(Math.max(0, Number(e.target.value)))}
                  className="w-full p-3 mt-2 border border-gray-300 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Enter margin in points"
                />
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={mergePDF}
                onChange={(e) => setMergePDF(e.target.checked)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700 dark:text-white">Merge all images into one PDF</label>
            </div>

            <div className="bg-gray-50 p-4 dark:bg-gray-800 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-white">Original Size (Images):</span>
                <span className="font-medium dark:text-white">{formatFileSize(createFileSizes.original)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-white">Estimated PDF Size:</span>
                <span className="font-medium dark:text-white">{formatFileSize(createFileSizes.estimated)}</span>
              </div>
              {createFileSizes.final !== null && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-white">Final PDF Size:</span>
                    <span className="font-medium dark:text-white">{formatFileSize(createFileSizes.final)}</span>
                  </div>
                  {calculateCreateReduction() !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-white">Reduction:</span>
                      <span className="font-medium text-green-600">{calculateCreateReduction()}%</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
          )}

          <div className="flex gap-3 sm:flex-nowrap flex-wrap">
            <button
              onClick={handleCreatePDF}
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white sm:px-4 px-2 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base"
              aria-label="Create PDF"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Creating PDF...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5 mr-2" />
                  Create PDF
                </>
              )}
            </button>

            {result && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex-1 bg-green-600 text-white sm:px-4 px-2 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base"
                aria-label={`Download ${mergePDF ? 'PDF' : 'ZIP'}`}
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Download {mergePDF ? 'PDF' : 'ZIP'}
                  </>
                )}
              </button>
            )}

            {showNewConversion && (
              <button
                onClick={handleNewConversion}
                className="flex-1 bg-blue-600 text-white sm:px-4 px-2 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-sm sm:text-base"
                aria-label="Start new conversion"
              >
                New Conversion
              </button>
            )}
          </div>

          {!isLoggedIn && conversionCount > 0 && (
            <p className="text-sm text-gray-500">
              You've used {conversionCount} of {MAX_CONVERSIONS} free conversions.{' '}
              <button onClick={() => handleLoginOrSignup('login')} className="text-indigo-600 hover:underline">
                Log in
              </button>{' '}
              or{' '}
              <button onClick={() => handleLoginOrSignup('signup')} className="text-indigo-600 hover:underline">
                sign up
              </button>{' '}
              for unlimited conversions!
            </p>
          )}
        </>
      )}

      {showSignupPopup && !isLoggedIn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Unlock Unlimited Conversions</h2>
            <p className="mb-4">
              You've reached the limit of {MAX_CONVERSIONS} free conversions. Log in or sign up to enjoy unlimited PDF creations!
            </p>
            <ul className="list-disc pl-5 mb-4 text-sm text-gray-600">
              <li>Unlimited PDF conversions</li>
              <li>Process up to 30 images at once</li>
              <li>Priority support</li>
            </ul>
            <div className="flex justify-end gap-4">
              <button
                onClick={handleSignupClose}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
              >
                Maybe Later
              </button>
              <button
                onClick={() => handleLoginOrSignup('signup')}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                Log In / Sign Up
              </button>
            </div>
          </div>
        </div>
      )}

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} mode={authMode} />
      
      <div className="mt-6">
        <h3 className="text-lg font-semibold dark:text-white text-gray-800 mb-4">More Image Tools</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/image-tools"
            className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200"
          >
            <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
              <ImageIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-white">
              Image Size Reduce
            </span>
          </Link>
          <Link
            to="/image-tools"
            className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200"
          >
            <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
              <Settings className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-white">
              Image Conversion
            </span>
          </Link>
          <Link
            to="/image-tools"
            className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200"
          >
            <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
              <FileText className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-white">
              Image to PDF
            </span>
          </Link>
          <Link
            to="/image-tools"
            className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200"
          >
            <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
              <Crop className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-white">
              Crop Image
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}