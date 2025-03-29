import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Loader2, X, Stamp, Type, Image as ImageIcon } from 'lucide-react';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { validateFile, ALLOWED_PDF_TYPES, ALLOWED_IMAGE_TYPES, createSecureObjectURL, createSecureDownloadLink, revokeBlobUrl } from '../../utils/security';
import { useOperationsCache } from '../../utils/operationsCache';

interface PDFFile {
  file: File;
  preview?: string;
}

interface WatermarkSettings {
  type: 'text' | 'image';
  text: string;
  fontSize: number;
  opacity: number;
  rotation: number;
  color: string;
  image?: File;
  imagePreview?: string;
}

export function WatermarkPDF() {
  const { saveOperation } = useOperationsCache();
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [settings, setSettings] = useState<WatermarkSettings>({
    type: 'text',
    text: 'CONFIDENTIAL',
    fontSize: 48,
    opacity: 0.3,
    rotation: 45,
    color: '#FF0000'
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 1) {
      setError('Please select only one PDF file');
      return;
    }

    const file = acceptedFiles[0];
    const validation = validateFile(file, ALLOWED_PDF_TYPES);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid file type');
      return;
    }

    setFiles([{ file, preview: createSecureObjectURL(file) }]);
    setResult(null);
    setResultBlob(null);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file, ALLOWED_IMAGE_TYPES);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid image type');
      return;
    }

    if (settings.imagePreview) {
      revokeBlobUrl(settings.imagePreview);
    }

    setSettings(prev => ({
      ...prev,
      image: file,
      imagePreview: createSecureObjectURL(file)
    }));
  };

  const handleAddWatermark = async () => {
    if (files.length !== 1) {
      setError('Please select one PDF file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const pdfBytes = await files[0].file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      if (settings.type === 'text') {
        const color = settings.color.match(/^#([A-Fa-f0-9]{6})$/)?.[1];
        if (!color) throw new Error('Invalid color format');
        
        const r = parseInt(color.substring(0, 2), 16) / 255;
        const g = parseInt(color.substring(2, 4), 16) / 255;
        const b = parseInt(color.substring(4, 6), 16) / 255;

        for (const page of pages) {
          const { width, height } = page.getSize();
          page.drawText(settings.text, {
            x: width / 2,
            y: height / 2,
            size: settings.fontSize,
            opacity: settings.opacity,
            color: rgb(r, g, b),
            rotate: degrees(settings.rotation),
            xSkew: degrees(0),
            ySkew: degrees(0),
          });
        }
      } else if (settings.image && settings.imagePreview) {
        const imageBytes = await settings.image.arrayBuffer();
        const watermarkImage = settings.image.type === 'image/jpeg' 
          ? await pdfDoc.embedJpg(imageBytes)
          : await pdfDoc.embedPng(imageBytes);

        for (const page of pages) {
          const { width, height } = page.getSize();
          const imageSize = {
            width: Math.min(width * 0.5, watermarkImage.width),
            height: Math.min(height * 0.5, watermarkImage.height)
          };

          page.drawImage(watermarkImage, {
            x: (width - imageSize.width) / 2,
            y: (height - imageSize.height) / 2,
            width: imageSize.width,
            height: imageSize.height,
            opacity: settings.opacity,
            rotate: degrees(settings.rotation),
          });
        }
      }

      const watermarkedBytes = await pdfDoc.save();
      const blob = new Blob([watermarkedBytes], { type: 'application/pdf' });

      if (result) revokeBlobUrl(result);
      const newResult = createSecureObjectURL(blob);
      setResult(newResult);
      setResultBlob(blob);

      saveOperation({
        type: 'watermark_pdf',
        metadata: {
          filename: files[0].file.name,
          fileSize: blob.size,
          settings: {
            type: settings.type,
            text: settings.type === 'text' ? settings.text : undefined,
            opacity: settings.opacity,
            rotation: settings.rotation
          }
        },
        preview: createSecureObjectURL(blob)
      });
    } catch (err) {
      setError('Error adding watermark. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!resultBlob) return;

    try {
      const link = createSecureDownloadLink(resultBlob, 'watermarked.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Error downloading file. Please try again.');
    }
  };

  const resetFiles = useCallback(() => {
    files.forEach(file => file.preview && revokeBlobUrl(file.preview));
    if (result) revokeBlobUrl(result);
    if (settings.imagePreview) revokeBlobUrl(settings.imagePreview);
    setFiles([]);
    setResult(null);
    setResultBlob(null);
    setError(null);
    setSettings(prev => ({
      ...prev,
      image: undefined,
      imagePreview: undefined
    }));
  }, [files, result, settings.imagePreview]);

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
              <button
                onClick={resetFiles}
                className="text-gray-500 hover:text-gray-700"
                title="Remove file"
              >
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
                Watermark Type
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setSettings(prev => ({ ...prev, type: 'text' }))}
                  className={`flex items-center px-4 py-2 rounded-lg ${
                    settings.type === 'text'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Type className="w-5 h-5 mr-2" />
                  Text
                </button>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, type: 'image' }))}
                  className={`flex items-center px-4 py-2 rounded-lg ${
                    settings.type === 'image'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <ImageIcon className="w-5 h-5 mr-2" />
                  Image
                </button>
              </div>
            </div>

            {settings.type === 'text' ? (
              <>
                <div>
                  <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
                    Watermark Text
                  </label>
                  <input
                    type="text"
                    id="text"
                    value={settings.text}
                    onChange={(e) => setSettings(prev => ({ ...prev, text: e.target.value }))}
                    className="block w-full rounded-xl border-2 border-gray-200 py-2 px-4 text-gray-700 
                      focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 
                      transition-all duration-200 shadow-sm hover:border-gray-300"
                  />
                </div>

                <div>
                  <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <input
                    type="color"
                    id="color"
                    value={settings.color}
                    onChange={(e) => setSettings(prev => ({ ...prev, color: e.target.value }))}
                    className="block rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 h-10 w-20"
                  />
                </div>

                <div>
                  <label htmlFor="fontSize" className="block text-sm font-medium text-gray-700 mb-2">
                    Font Size: {settings.fontSize}px
                  </label>
                  <input
                    type="range"
                    id="fontSize"
                    min="12"
                    max="144"
                    value={settings.fontSize}
                    onChange={(e) => setSettings(prev => ({ ...prev, fontSize: Number(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-indigo-600"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Watermark Image
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                  <div className="space-y-1 text-center">
                    {settings.imagePreview ? (
                      <div className="relative">
                        <img
                          src={settings.imagePreview}
                          alt="Watermark preview"
                          className="mx-auto h-32 object-contain"
                        />
                        <button
                          onClick={() => setSettings(prev => ({ ...prev, image: undefined, imagePreview: undefined }))}
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                            <span>Upload a file</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={handleImageUpload}
                            />
                          </label>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="opacity" className="block text-sm font-medium text-gray-700 mb-2">
                Opacity: {Math.round(settings.opacity * 100)}%
              </label>
              <input
                type="range"
                id="opacity"
                min="0"
                max="100"
                value={settings.opacity * 100}
                onChange={(e) => setSettings(prev => ({ ...prev, opacity: Number(e.target.value) / 100 }))}
                className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-indigo-600"
              />
            </div>

            <div>
              <label htmlFor="rotation" className="block text-sm font-medium text-gray-700 mb-2">
                Rotation: {settings.rotation}°
              </label>
              <input
                type="range"
                id="rotation"
                min="0"
                max="360"
                value={settings.rotation}
                onChange={(e) => setSettings(prev => ({ ...prev, rotation: Number(e.target.value) }))}
                className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleAddWatermark}
              disabled={loading || (settings.type === 'image' && !settings.image)}
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Adding Watermark...
                </>
              ) : (
                <>
                  <Stamp className="w-5 h-5 mr-2" />
                  Add Watermark
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