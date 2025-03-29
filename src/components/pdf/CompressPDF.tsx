import React from 'react';
import { Clock } from 'lucide-react';

export function CompressPDF() {
  return (
    <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-6 rounded-lg text-center">
      <Clock className="w-12 h-12 text-blue-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">PDF Compression Coming Soon!</h3>
      <p>
        We're working on bringing you PDF compression capabilities. Stay tuned for updates!
      </p>
    </div>
  );

  // Original code preserved in comments below
  /*
  import { useState, useCallback } from 'react';
  import { PDFDocument, PDFImage, PDFName, PDFDict } from 'pdf-lib';
  import { useDropzone } from 'react-dropzone';
  import { Upload, Download, Loader2, X, FileText } from 'lucide-react';
  import imageCompression from 'browser-image-compression';

  const QUALITY_PRESETS = {
    MAXIMUM: { quality: 90, maxSizeMB: 0.8, maxWidthOrHeight: 1000, targetReduction: 0.10 },
    HIGH: { quality: 80, maxSizeMB: 0.4, maxWidthOrHeight: 700, targetReduction: 0.25 },
    MEDIUM: { quality: 60, maxSizeMB: 0.2, maxWidthOrHeight: 500, targetReduction: 0.45 },
    LOW: { quality: 40, maxSizeMB: 0.05, maxWidthOrHeight: 300, targetReduction: 0.65 },
    MINIMUM: { quality: 20, maxSizeMB: 0.025, maxWidthOrHeight: 150, targetReduction: 0.75 },
  };

  interface PDFFile {
    file: File;
    preview?: string;
  }

  interface PreviewSizes {
    original: number | null;
    compressed: number | null;
  }

  const [files, setFiles] = useState<PDFFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [quality, setQuality] = useState<number>(80);
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

  // Subset fonts to remove unused glyphs
  const subsetFonts = async (pdfDoc: PDFDocument) => {
    const fontDicts = pdfDoc.context.enumerateIndirectObjects()
      .filter(([_, obj]) => obj instanceof PDFDict && obj.get(PDFName.of('Type')) === PDFName.of('Font'))
      .map(([ref, obj]) => ({ ref, dict: obj as PDFDict }));

    for (const { dict } of fontDicts) {
      if (dict.has(PDFName.of('FontDescriptor'))) {
        const fontDescriptor = dict.get(PDFName.of('FontDescriptor')) as PDFDict;
        fontDescriptor?.delete(PDFName.of('FontFile')); // Remove full font embedding
        fontDescriptor?.delete(PDFName.of('FontFile2'));
        fontDescriptor?.delete(PDFName.of('FontFile3'));
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
      console.log('Original size:', file.size);

      // Load PDF
      const pdfBytes = await file.arrayBuffer();
      let pdfDoc = await PDFDocument.load(pdfBytes);
      const preset = Object.values(QUALITY_PRESETS).find(p => p.quality === quality) || QUALITY_PRESETS.HIGH;
      const targetReduction = preset.targetReduction;

      // Compress images (first pass)
      for (let i = 0; i < pdfDoc.getPageCount(); i++) {
        const page = pdfDoc.getPage(i);
        const images = page.node.get('XObject')?.asMap() || new Map();
        for (const [name, xObject] of images) {
          if (xObject instanceof PDFImage) {
            const imageData = xObject.decode();
            if (imageData) {
              const imageBlob = new Blob([imageData], { type: 'image/jpeg' });
              const compressedImage = await imageCompression(imageBlob, {
                maxSizeMB: preset.maxSizeMB,
                maxWidthOrHeight: preset.maxWidthOrHeight,
                useWebWorker: true,
                fileType: 'image/jpeg',
                initialQuality: preset.quality / 100,
              });
              if (compressedImage.size < imageBlob.size) {
                const compressedBytes = new Uint8Array(await compressedImage.arrayBuffer());
                const embeddedImage = await pdfDoc.embedJpeg(compressedBytes);
                page.node.setXObject(name, embeddedImage.ref);
              }
            }
          }
        }
      }

      // Remove metadata
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('');
      pdfDoc.setCreator('');
      const catalog = pdfDoc.context.lookup(pdfDoc.context.trailerInfo.Root);
      if (catalog instanceof PDFDict) {
        catalog.delete(PDFName.of('Metadata'));
      }

      // Subset fonts
      await subsetFonts(pdfDoc);

      // Initial compression
      let compressedBytes = await pdfDoc.save({ useObjectStreams: true, compress: true });
      let compressionRatio = (file.size - compressedBytes.length) / file.size;
      console.log('Initial compression - Size:', compressedBytes.length, 'Reduction:', (compressionRatio * 100).toFixed(2) + '%');
      setProgress(50);

      // Aggressive pass if target not met
      if (compressionRatio < targetReduction * 0.8) {
        console.log('Applying aggressive compression...');
        pdfDoc = await PDFDocument.load(pdfBytes); // Reload fresh copy
        for (let i = 0; i < pdfDoc.getPageCount(); i++) {
          const page = pdfDoc.getPage(i);
          const images = page.node.get('XObject')?.asMap() || new Map();
          for (const [name, xObject] of images) {
            if (xObject instanceof PDFImage) {
              const imageData = xObject.decode();
              if (imageData) {
                const imageBlob = new Blob([imageData]);
                const compressedImage = await imageCompression(imageBlob, {
                  maxSizeMB: preset.maxSizeMB / 2,
                  maxWidthOrHeight: Math.floor(preset.maxWidthOrHeight * 0.5), // Downsample more
                  initialQuality: preset.quality / 100 * 0.5, // Halve quality
                });
                const compressedBytes = new Uint8Array(await compressedImage.arrayBuffer());
                const embeddedImage = await pdfDoc.embedJpeg(compressedBytes);
                page.node.setXObject(name, embeddedImage.ref);
              }
            }
          }
        }
        await subsetFonts(pdfDoc);
        compressedBytes = await pdfDoc.save({ useObjectStreams: true, compress: true });
        compressionRatio = (file.size - compressedBytes.length) / file.size;
      }

      console.log('Final compressed size:', compressedBytes.length, 'Reduction:', (compressionRatio * 100).toFixed(2) + '%');
      setProgress(75);

      // Create downloadable blob
      const compressedBlob = new Blob([compressedBytes], { type: 'application/pdf' });
      const newResult = URL.createObjectURL(compressedBlob);
      setResult(newResult);
      setResultBlob(compressedBlob);
      setPreviewSize({ original: file.size, compressed: compressedBytes.length });
      setProgress(100);
    } catch (err) {
      console.error('Compression error:', err);
      setError(err instanceof Error ? `Failed to compress: ${err.message}` : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = 'compressed.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFiles = useCallback(() => {
    files.forEach((file) => file.preview && URL.revokeObjectURL(file.preview));
    if (result) URL.revokeObjectURL(result);
    setFiles([]);
    setResult(null);
    setResultBlob(null);
    setError(null);
    setPreviewSize({ original: null, compressed: null });
    setProgress(0);
  }, [files, result]);

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
    const reduction = ((previewSize.original - previewSize.compressed) / previewSize.original) * 100;
    return Math.round(reduction);
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
          {isDragActive ? 'Drop the PDF file here' : 'Drag & drop a PDF file here, or tap to select'}
        </p>
        <p className="text-sm text-gray-500 mt-2">Supports PDF files</p>
      </div>

      {files.length > 0 && (
        <>
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Selected File</h3>
              <button onClick={resetFiles} className="text-gray-500 hover:text-gray-700" title="Remove file">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <span className="text-gray-700">{files[0].file.name}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quality Preset
              </label>
              <select
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value={90}>Maximum Quality (~10% Reduction)</option>
                <option value={80}>High Quality (~25% Reduction)</option>
                <option value={60}>Medium Quality (~45% Reduction)</option>
                <option value={40}>Low Quality (~65% Reduction)</option>
                <option value={20}>Minimum Quality (~75% Reduction)</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Select a quality preset to determine compression level. Results vary based on PDF content.
              </p>
            </div>

            {loading && (
              <div className="w full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
                <p className="text-sm text-gray-600 mt-1">Compressing: {progress}%</p>
              </div>
            )}

            {previewSize.original && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Original Size:</span>
                  <span className="font-medium">{formatFileSize(previewSize.original)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Compressed Size:</span>
                  <span className="font-medium">{formatFileSize(previewSize.compressed)}</span>
                </div>
                {calculateReduction() > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Reduction:</span>
                    <span className="font-medium text-green-600">{calculateReduction()}%</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
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
    </div>
  );
  */
}