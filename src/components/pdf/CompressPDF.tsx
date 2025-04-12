import { useState, useCallback } from 'react';
import { PDFDocument, PDFImage, PDFName, PDFDict } from 'pdf-lib';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Settings, Image as ImageIcon, Crop, Loader2, X, FileText } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { Link } from 'react-router-dom';

// Constants
const QUALITY_PRESETS = {
  MAXIMUM: { quality: 80, maxSizeMB: 0.4, maxWidthOrHeight: 600, targetReduction: 0.20 },
  HIGH: { quality: 60, maxSizeMB: 0.2, maxWidthOrHeight: 400, targetReduction: 0.40 },
  MEDIUM: { quality: 40, maxSizeMB: 0.1, maxWidthOrHeight: 300, targetReduction: 0.60 },
  LOW: { quality: 20, maxSizeMB: 0.025, maxWidthOrHeight: 200, targetReduction: 0.80 },
  MINIMUM: { quality: 10, maxSizeMB: 0.0125, maxWidthOrHeight: 100, targetReduction: 0.90 },
};

// Types
interface PDFFile {
  file: File;
  preview?: string;
}

interface PreviewSizes {
  original: number | null;
  compressed: number | null;
}

export function CompressPDF() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [quality, setQuality] = useState<number>(60); // Default to HIGH
  const [customReduction, setCustomReduction] = useState<number | null>(null); // User-defined reduction target
  const [previewSize, setPreviewSize] = useState<PreviewSizes>({ original: null, compressed: null });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 1) {
      setError('Please select only one PDF file');
      return;
    }
    const file = acceptedFiles[0];
    if (!file.type.includes('pdf')) {
      setError('Please upload a PDF file');
      return;
    }
    setFiles([{ file, preview: URL.createObjectURL(file) }]);
    setPreviewSize({ original: file.size, compressed: null });
    setResult(null);
    setResultBlob(null);
    setError(null);
    setProgress(0);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  const resetFiles = useCallback(() => {
    files.forEach((file) => file.preview && URL.revokeObjectURL(file.preview));
    if (result) URL.revokeObjectURL(result);
    setFiles([]);
    setResult(null);
    setResultBlob(null);
    setError(null);
    setPreviewSize({ original: null, compressed: null });
    setProgress(0);
    setCustomReduction(null);
  }, [files, result]);

  const analyzePDFContent = async (pdfDoc: PDFDocument) => {
    let imageCount = 0;

    for (let i = 0; i < pdfDoc.getPageCount(); i++) {
      const page = pdfDoc.getPage(i);
      const images = (page.node.get(PDFName.of('XObject')) as PDFDict)?.asMap() || new Map();
      imageCount += images.size;
    }

    return { imageCount, pageCount: pdfDoc.getPageCount() };
  };

  const optimizeFontsAndMetadata = async (pdfDoc: PDFDocument) => {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('');
    pdfDoc.setCreator('');

    const catalog = pdfDoc.context.lookup(pdfDoc.context.trailerInfo.Root);
    if (catalog instanceof PDFDict) catalog.delete(PDFName.of('Metadata'));

    const fontDicts = pdfDoc.context.enumerateIndirectObjects()
      .filter(([_, obj]) => obj instanceof PDFDict && obj.get(PDFName.of('Type')) === PDFName.of('Font'))
      .map(([ref, obj]) => ({ ref, dict: obj as PDFDict }));

    for (const { dict } of fontDicts) {
      if (dict.has(PDFName.of('FontDescriptor'))) {
        const fontDescriptor = dict.get(PDFName.of('FontDescriptor')) as PDFDict;
        fontDescriptor?.delete(PDFName.of('FontFile'));
        fontDescriptor?.delete(PDFName.of('FontFile2'));
        fontDescriptor?.delete(PDFName.of('FontFile3'));
        dict.delete(PDFName.of('ToUnicode'));
        dict.delete(PDFName.of('Encoding'));
      }
    }
  };

  const compressPDFImages = async (pdfDoc: PDFDocument, preset: typeof QUALITY_PRESETS[keyof typeof QUALITY_PRESETS], targetReduction: number) => {
    for (let i = 0; i < pdfDoc.getPageCount(); i++) {
      setProgress(Math.min(30 + (i / pdfDoc.getPageCount()) * 30, 60));
      const page = pdfDoc.getPage(i);
      const images = (page.node.get(PDFName.of('XObject')) as PDFDict)?.asMap() || new Map();

      for (const [name, xObject] of images) {
        if (xObject instanceof PDFImage) {
          const imageData = (xObject as any).decode();
          if (imageData) {
            const compressionOptions = {
              maxSizeMB: Math.max(0.005, preset.maxSizeMB * (1 - targetReduction)),
              maxWidthOrHeight: Math.max(50, preset.maxWidthOrHeight * (1 - targetReduction)),
              useWebWorker: true,
              fileType: 'image/jpeg',
              initialQuality: Math.max(0.05, preset.quality / 100 * (1 - targetReduction)),
              alwaysKeepResolution: false,
            };

            const imageFile = new File([imageData], 'image.jpg', { type: 'image/jpeg' });
            const compressedImage = await imageCompression(imageFile, compressionOptions);
            const compressedBytes = new Uint8Array(await compressedImage.arrayBuffer());
            const embeddedImage = await pdfDoc.embedJpg(compressedBytes);
            page.node.setXObject(name, embeddedImage.ref);
          }
        }
      }
    }
  };

  const handleCompressPDF = async () => {
    if (files.length !== 1) {
      setError('Please select one PDF file');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      const file = files[0].file;
      const pdfBytes = await file.arrayBuffer();
      let pdfDoc = await PDFDocument.load(pdfBytes);
      const preset = Object.values(QUALITY_PRESETS).find(p => p.quality === quality) || QUALITY_PRESETS.HIGH;
      const targetReduction = customReduction ? Math.min(0.95, customReduction / 100) : preset.targetReduction;

      // Analyze content
      const { imageCount, pageCount } = await analyzePDFContent(pdfDoc);
      const isImageHeavy = imageCount > 0 && imageCount / pageCount > 0.5;

      // First pass: Optimize fonts and metadata
      await optimizeFontsAndMetadata(pdfDoc);
      setProgress(20);

      // Second pass: Compress images if present
      if (isImageHeavy) {
        await compressPDFImages(pdfDoc, preset, targetReduction);
      }

      // Apply general compression
      let compressedBytes = await pdfDoc.save({
        useObjectStreams: true,
        compress: true,
        ignoreEncryption: true,
      });
      let currentReduction = (file.size - compressedBytes.length) / file.size;

      // Iterative compression if target not met
      let attempts = 0;
      const maxAttempts = 3;
      while (currentReduction < targetReduction * 0.9 && attempts < maxAttempts) {
        attempts++;
        pdfDoc = await PDFDocument.load(pdfBytes);
        await optimizeFontsAndMetadata(pdfDoc);
        if (isImageHeavy) {
          await compressPDFImages(pdfDoc, { ...preset, quality: Math.max(5, preset.quality * 0.7) }, targetReduction * 1.1);
        }
        compressedBytes = await pdfDoc.save({ useObjectStreams: true, compress: true, ignoreEncryption: true });
        currentReduction = (file.size - compressedBytes.length) / file.size;
        setProgress(60 + (attempts / maxAttempts) * 30);
      }

      setProgress(90);
      const compressedBlob = new Blob([compressedBytes], { type: 'application/pdf' });
      const newResult = URL.createObjectURL(compressedBlob);
      setResult(newResult);
      setResultBlob(compressedBlob);
      setPreviewSize({ original: file.size, compressed: compressedBytes.length });
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? `Failed to compress: ${err.message}` : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !result) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = 'compressed.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number | null) => {
    if (bytes === null) return 'Processing...';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const calculateReduction = () => {
    if (!previewSize.original || !previewSize.compressed) return 0;
    return Math.round(((previewSize.original - previewSize.compressed) / previewSize.original) * 100);
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
        <p className="text-gray-600 dark:text-white">
          {isDragActive ? 'Drop the PDF file here' : 'Drag & drop a PDF file here, or tap to select'}
        </p>
        <p className="text-sm text-gray-500 mt-2 dark:text-white">Supports PDF files</p>
      </div>

      {files.length > 0 && (
        <>
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Selected File</h3>
              <button onClick={resetFiles} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" title="Remove file">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg dark:bg-gray-800">
              <span className="text-gray-700 dark:text-gray-200">{files[0].file.name}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Compression Level</label>
              <select
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition duration-200"
              >
                <option value={80}>Maximum Quality (~20% Reduction)</option>
                <option value={60}>High Quality (~40% Reduction)</option>
                <option value={40}>Medium Quality (~60% Reduction)</option>
                <option value={20}>Low Quality (~80% Reduction)</option>
                <option value={10}>Minimum Quality (~90% Reduction)</option>
              </select>
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Custom Reduction (%)</label>
                <input
                  type="number"
                  min="0"
                  max="95"
                  value={customReduction || ''}
                  onChange={(e) => setCustomReduction(Number(e.target.value) || null)}
                  placeholder="e.g., 50"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition duration-200"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
                  Leave blank for preset, or enter custom reduction percentage (0-95%).
                </p>
              </div>
            </div>

            {loading && (
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Compressing: {progress}%</p>
              </div>
            )}

            {previewSize.original && (
              <div className="bg-gray-50 p-4 rounded-lg dark:bg-gray-800 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-200">Original Size:</span>
                  <span className="font-medium dark:text-gray-200">{formatFileSize(previewSize.original)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-200">Compressed Size:</span>
                  <span className="font-medium dark:text-gray-200">{formatFileSize(previewSize.compressed)}</span>
                </div>
                {calculateReduction() > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-200">Reduction:</span>
                    <span className="font-medium text-green-600">{calculateReduction()}%</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleCompressPDF}
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Compressing...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5 mr-2" />
                  Compress PDF
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
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 dark:text-gray-200">More Image Tools</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/image-tools" className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200">
            <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
              <ImageIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-gray-200">Image Size Reduce</span>
          </Link>
          <Link to="/image-tools" className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200">
            <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
              <Settings className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-gray-200">Image Conversion</span>
          </Link>
          <Link to="/image-tools" className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200">
            <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
              <FileText className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-gray-200">Image to PDF</span>
          </Link>
          <Link to="/image-tools" className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200">
            <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
              <Crop className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-gray-200">Crop Image</span>
          </Link>
        </div>
      </div>
    </div>
  );
}