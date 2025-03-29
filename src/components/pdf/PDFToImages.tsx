import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Loader2, X, Images } from 'lucide-react';
import JSZip from 'jszip';
import { pdfjsLib } from '../../utils/pdfjs';
import { validateFile, ALLOWED_PDF_TYPES, createSecureObjectURL, createSecureDownloadLink, revokeBlobUrl } from '../../utils/security';
import { useOperationsCache } from '../../utils/operationsCache';

interface PDFFile {
  file: File;
  preview?: string;
}

export function PDFToImages() {
  const { saveOperation } = useOperationsCache();
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

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

  const handlePDFToImages = async () => {
    if (files.length !== 1) {
      setError('Please select one PDF file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const pdfFile = files[0].file;
      const pdfData = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({
        data: pdfData,
        verbosity: 0
      }).promise;
      const zip = new JSZip();
      const imageBlobs: Blob[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error(`Failed to get 2D context for page ${i}`);
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => {
              if (b) resolve(b);
              else reject(new Error(`Failed to convert page ${i} to blob`));
            },
            'image/png',
            1.0
          );
        });

        imageBlobs.push(blob);
        zip.file(`page-${i}.png`, blob);
      }

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
      });

      if (result) revokeBlobUrl(result);
      const newResult = createSecureObjectURL(zipBlob);
      setResult(newResult);
      setResultBlob(zipBlob);

      if (imageBlobs.length > 0) {
        saveOperation({
          type: 'pdf_to_images',
          metadata: {
            filename: files[0].file.name,
            fileSize: zipBlob.size,
            settings: { pageCount: pdf.numPages },
          },
          preview: createSecureObjectURL(imageBlobs[0]),
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred during conversion';
      setError(`PDF to images failed: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!resultBlob) return;

    try {
      const link = createSecureDownloadLink(resultBlob, 'pdf-images.zip');
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
    setFiles([]);
    setResult(null);
    setResultBlob(null);
    setError(null);
  }, [files, result]);

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

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handlePDFToImages}
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Converting...
                </>
              ) : (
                <>
                  <Images className="w-5 h-5 mr-2" />
                  Convert to Images
                </>
              )}
            </button>

            {result && (
              <button
                onClick={handleDownload}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
              >
                <Download className="w-5 h-5 mr-2" />
                Download ZIP
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}