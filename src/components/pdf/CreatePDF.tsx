import React, { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Loader2, X, FileText } from 'lucide-react';
import { DndContext, rectIntersection, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { SortableImage } from './SortableImage';
import { validateFile, ALLOWED_IMAGE_TYPES, createSecureObjectURL, createSecureDownloadLink, revokeBlobUrl } from '../../utils/security';
import { useOperationsCache } from '../../utils/operationsCache';

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

export function CreatePDF() {
  const { saveOperation } = useOperationsCache();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 0,
        distance: 0,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 0,
        tolerance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => {
      const validation = validateFile(file, ALLOWED_IMAGE_TYPES);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid file type');
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      setError('No valid files were uploaded. Please upload images (JPEG, PNG, WebP).');
      return;
    }

    const newImages = validFiles.map(file => {
      try {
        const preview = createSecureObjectURL(file);
        return {
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          preview
        };
      } catch (err) {
        setError(`Failed to create preview for ${file.name}: ${(err as Error).message}`);
        return null;
      }
    }).filter((img): img is ImageItem => img !== null);

    setImages(prev => {
      const updatedImages = [...prev, ...newImages].slice(0, 30);
      const totalOriginalSize = updatedImages.reduce((sum, img) => sum + img.file.size, 0);
      const estimatedSize = totalOriginalSize * (createQualityLevel / 100);
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
  }, [createQualityLevel]);

  

  const resetBackgroundRemoval = (imageId: string) => {
    setImages(prev => prev.map(img => {
      if (img.id === imageId && img.removedBackground) {
        revokeBlobUrl(img.removedBackground);
        return { ...img, removedBackground: undefined };
      }
      return img;
    }));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    multiple: true,
    maxFiles: 30
  });

  const handleDragStart = useCallback((event: DragStartEvent) => {
    console.log('Drag started:', event);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      setImages((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const handleRemoveImage = useCallback((id: string) => {
    setImages(prev => {
      const imageToRemove = prev.find(img => img.id === id);
      if (imageToRemove) {
        revokeBlobUrl(imageToRemove.preview);
        if (imageToRemove.removedBackground) {
          revokeBlobUrl(imageToRemove.removedBackground);
        }
      }
      const updatedImages = prev.filter(img => img.id !== id);
      const totalOriginalSize = updatedImages.reduce((sum, img) => sum + img.file.size, 0);
      const estimatedSize = totalOriginalSize * (createQualityLevel / 100);
      setCreateFileSizes({
        original: totalOriginalSize,
        estimated: estimatedSize,
        final: null,
      });
      return updatedImages;
    });
  }, [createQualityLevel]);

  const handleCreatePDF = async () => {
    if (images.length === 0) {
      setError('Please select at least one image');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const pdfDoc = await PDFDocument.create();

      for (const image of images) {
        const imageBytes = await image.file.arrayBuffer();
        const img = new Image();
        img.src = URL.createObjectURL(new Blob([imageBytes], { type: image.file.type }));

        await new Promise((resolve) => {
          img.onload = resolve;
        });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get canvas context');

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const quality = createQualityLevel / 100;
        const compressedImageData = canvas.toDataURL('image/jpeg', quality);
        const compressedImageBytes = await fetch(compressedImageData).then(res => res.blob()).then(blob => blob.arrayBuffer());

        let pdfImage = await pdfDoc.embedJpg(compressedImageBytes);
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        const aspectRatio = pdfImage.width / pdfImage.height;

        let drawWidth = width - 40;
        let drawHeight = drawWidth / aspectRatio;

        if (drawHeight > height - 40) {
          drawHeight = height - 40;
          drawWidth = drawHeight * aspectRatio;
        }

        page.drawImage(pdfImage, {
          x: (width - drawWidth) / 2,
          y: (height - drawHeight) / 2,
          width: drawWidth,
          height: drawHeight,
        });

        URL.revokeObjectURL(img.src);
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });

      if (result) revokeBlobUrl(result);
      const newResult = createSecureObjectURL(blob);
      setResult(newResult);
      setResultBlob(blob);

      setCreateFileSizes(prev => ({
        ...prev,
        final: pdfBytes.length,
      }));

      saveOperation({
        type: 'create_pdf',
        metadata: {
          filename: 'document.pdf',
          fileSize: pdfBytes.length,
          settings: { imageCount: images.length, qualityLevel: createQualityLevel }
        },
        preview: createSecureObjectURL(blob)
      });
    } catch (err) {
      setError('Error creating PDF. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!resultBlob) return;

    try {
      const link = createSecureDownloadLink(resultBlob, 'document.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Error downloading file. Please try again.');
    }
  };

  const resetFiles = useCallback(() => {
    images.forEach(image => {
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
    return Math.round(reduction);
  };

  const handleQualityChange = (newQuality: number) => {
    setCreateQualityLevel(newQuality);
    if (createFileSizes.original) {
      const estimatedSize = createFileSizes.original * (newQuality / 100);
      setCreateFileSizes(prev => ({
        ...prev,
        estimated: estimatedSize,
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">
          {isDragActive ? 'Drop the images here' : 'Drag & drop images here, or tap to select'}
        </p>
        <p className="text-sm text-gray-500 mt-2">Supports images (JPEG, PNG, WebP)</p>
      </div>

      {images.length > 0 && (
        <>
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Selected Images ({images.length}/30)
              </h3>
              <button
                onClick={resetFiles}
                className="text-gray-500 hover:text-gray-700"
                title="Remove all images"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={rectIntersection}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={images.map(img => img.id)}
                strategy={rectSortingStrategy}
              >
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
                    <span className="text-gray-600">Final PDF Size:</span>
                    <span className="font-medium">{formatFileSize(createFileSizes.final)}</span>
                  </div>
                  {calculateCreateReduction() !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Reduction:</span>
                      <span className="font-medium text-green-600">{calculateCreateReduction()}%</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleCreatePDF}
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
              >
                <Download className="w-5 h-5 mr-2" />
                Download PDF
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}