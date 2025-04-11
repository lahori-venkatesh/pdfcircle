import React, { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Loader2, X, FileText, Plus, Image as ImageIcon, Settings, Crop } from 'lucide-react';
import { DndContext, rectIntersection, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { SortableImage } from './SortableImage';
import { validateFile, ALLOWED_IMAGE_TYPES, createSecureObjectURL, createSecureDownloadLink, revokeBlobUrl } from '../../utils/security';
import { useOperationsCache } from '../../utils/operationsCache';
import JSZip from 'jszip';
import { Link } from 'react-router-dom'; // Assuming you're using react-router-dom for internal links

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
  'Fit': { width: 0, height: 0 }, // Will be set dynamically based on image
  'A4': { width: 595.28, height: 841.89 }, // A4 in points (1/72 inch)
  'US Letter': { width: 612, height: 792 }, // US Letter in points
};

const MARGINS: Record<string, number> = {
  'No Margin': 0,
  'Small Margin': 20,
  'Big Margin': 50,
  'Custom': 0, // Will be set by user input
};

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
  const [orientation, setOrientation] = useState<'Portrait' | 'Landscape'>('Portrait');
  const [pageSize, setPageSize] = useState<string>('A4');
  const [margin, setMargin] = useState<string>('Small Margin');
  const [customMargin, setCustomMargin] = useState<number>(20);
  const [mergePDF, setMergePDF] = useState<boolean>(true);
  const [showNewConversion, setShowNewConversion] = useState<boolean>(false);

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
      if (mergePDF) {
        const pdfDoc = await PDFDocument.create();

        for (const image of images) {
          const imageBytes = await image.file.arrayBuffer();
          const img = new Image();
          img.src = URL.createObjectURL(new Blob([imageBytes], { type: image.file.type }));

          await new Promise((resolve) => {
            img.onload = resolve;
          });

          let pdfImage = await pdfDoc.embedJpg(await fetch(URL.createObjectURL(new Blob([imageBytes], { type: image.file.type }))).then(res => res.arrayBuffer()));
          const page = pdfDoc.addPage();
          const size = PAGE_SIZES[pageSize];
          let pageWidth, pageHeight;

          if (pageSize === 'Fit') {
            pageWidth = img.width;
            pageHeight = img.height;
          } else {
            pageWidth = orientation === 'Portrait' ? size.width : size.height;
            pageHeight = orientation === 'Portrait' ? size.height : size.width;
          }

          page.setSize(pageWidth, pageHeight);

          const marginSize = margin === 'Custom' ? customMargin : MARGINS[margin];
          const drawWidth = pageWidth - (2 * marginSize);
          const drawHeight = pageHeight - (2 * marginSize);
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
            settings: { imageCount: images.length, qualityLevel: createQualityLevel, orientation, pageSize, margin, mergePDF }
          },
          preview: createSecureObjectURL(blob)
        });
      } else {
        const zip = new JSZip();
        for (const image of images) {
          const pdfDoc = await PDFDocument.create();
          const imageBytes = await image.file.arrayBuffer();
          let pdfImage = await pdfDoc.embedJpg(await fetch(URL.createObjectURL(new Blob([imageBytes], { type: image.file.type }))).then(res => res.arrayBuffer()));
          const page = pdfDoc.addPage();
          const size = PAGE_SIZES[pageSize];
          let pageWidth, pageHeight;

          if (pageSize === 'Fit') {
            const img = new Image();
            img.src = URL.createObjectURL(new Blob([imageBytes], { type: image.file.type }));
            await new Promise((resolve) => { img.onload = resolve; });
            pageWidth = img.width;
            pageHeight = img.height;
          } else {
            pageWidth = orientation === 'Portrait' ? size.width : size.height;
            pageHeight = orientation === 'Portrait' ? size.height : size.width;
          }

          page.setSize(pageWidth, pageHeight);

          const marginSize = margin === 'Custom' ? customMargin : MARGINS[margin];
          const drawWidth = pageWidth - (2 * marginSize);
          const drawHeight = pageHeight - (2 * marginSize);
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
          zip.file(`${image.file.name.replace(/\.[^/.]+$/, "")}.pdf`, pdfBytes);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        if (result) revokeBlobUrl(result);
        const newResult = createSecureObjectURL(zipBlob);
        setResult(newResult);
        setResultBlob(zipBlob);

        setCreateFileSizes(prev => ({
          ...prev,
          final: zipBlob.size,
        }));

        saveOperation({
          type: 'create_pdf_zip',
          metadata: {
            filename: 'documents.zip',
            fileSize: zipBlob.size,
            settings: { imageCount: images.length, qualityLevel: createQualityLevel, orientation, pageSize, margin, mergePDF }
          },
          preview: createSecureObjectURL(zipBlob)
        });
      }
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
      const link = createSecureDownloadLink(resultBlob, mergePDF ? 'document.pdf' : 'documents.zip');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowNewConversion(true); // Show new conversion button after download
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

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 dark:text-white text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-white">
          {isDragActive ? 'Drop the images here' : 'Drag & drop images here, or tap to select'}
        </p>
        <p className="text-sm text-gray-500 dark:text-white  mt-2">Supports images (JPEG, PNG, WebP)</p>
      </div>

      {images.length > 0 && (
        <>
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold dark:text-white  text-gray-800">
                Selected Images ({images.length}/30)
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handleAddMoreImages}
                  className="relative bg-indigo-600 text-white rounded-full p-2 hover:bg-indigo-700 transition-colors"
                  title="Add more images"
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
                  onChange={(e) => setCustomMargin(Number(e.target.value))}
                  className="w-full p-3 mt-2 border border-gray-300 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleCreatePDF}
              disabled={loading}
              className="flex-1 min-w-[48%] bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
                className="flex-1 min-w-[48%] bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
              >
                <Download className="w-5 h-5 mr-2" />
                Download {mergePDF ? 'PDF' : 'ZIP'}
              </button>
            )}

            {showNewConversion && (
              <button
                onClick={handleNewConversion}
                className="flex-1 min-w-[48%] bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                New Conversion
              </button>
            )}
          </div>
        </>
      )}

      <div className="mt-6">
        <h3 className="text-lg font-semibold dark:text-white text-gray-800 mb-4">More Image Tools</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/image-tools" className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200">
            <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
              <ImageIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-white ">Image Size Reduce</span>
          </Link>
          <Link to="/image-tools" className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200">
            <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
              <Settings className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-white ">Image Conversion</span>
          </Link>
          <Link to="/image-tools" className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200">
            <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
              <FileText className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-white ">Image to PDF</span>
          </Link>
          <Link to="/image-tools" className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200">
            <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
              <Crop className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-white ">Crop Image</span>
          </Link>
        </div>
      </div>
    </div>
  );
}