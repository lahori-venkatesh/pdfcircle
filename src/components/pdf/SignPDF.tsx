import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Loader2, X, FileSignature } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import SignatureCanvas from 'react-signature-canvas';
import { validateFile, ALLOWED_PDF_TYPES, createSecureObjectURL, createSecureDownloadLink, revokeBlobUrl } from '../../utils/security';
import { Link } from 'react-router-dom';

interface PDFFile {
  file: File;
  preview?: string;
}

export function SignPDF() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [signatureRef, setSignatureRef] = useState<SignatureCanvas | null>(null);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [signaturePage, setSignaturePage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [signaturePosition, setSignaturePosition] = useState({ x: 50, y: 50 });

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

    // Get total pages
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const pdfDoc = await PDFDocument.load(reader.result as ArrayBuffer);
        setTotalPages(pdfDoc.getPageCount());
      } catch (err) {
        console.error('Error loading PDF:', err);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  });

  const clearSignature = () => {
    if (signatureRef) {
      signatureRef.clear();
      setSignatureImage(null);
    }
  };

  const saveSignature = () => {
    if (signatureRef && !signatureRef.isEmpty()) {
      setSignatureImage(signatureRef.toDataURL('image/png'));
    }
  };

  const handleSignPDF = async () => {
    if (files.length !== 1 || !signatureImage) {
      setError('Please select a PDF file and create a signature');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const pdfBytes = await files[0].file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      
      if (signaturePage > pages.length) {
        throw new Error('Selected page number exceeds document length');
      }

      const page = pages[signaturePage - 1];
      const { width, height } = page.getSize();

      // Convert signature to PNG and embed in PDF
      const signatureBytes = await fetch(signatureImage).then(res => res.arrayBuffer());
      const signatureImage2 = await pdfDoc.embedPng(signatureBytes);

      // Calculate signature dimensions (maintain aspect ratio)
      const signatureWidth = Math.min(200, width * 0.3);
      const signatureHeight = (signatureImage2.height / signatureImage2.width) * signatureWidth;

      // Calculate position (ensure signature stays within page bounds)
      const x = Math.max(0, Math.min(signaturePosition.x, width - signatureWidth));
      const y = Math.max(0, Math.min(signaturePosition.y, height - signatureHeight));

      page.drawImage(signatureImage2, {
        x,
        y,
        width: signatureWidth,
        height: signatureHeight,
      });

      const signedPdfBytes = await pdfDoc.save();
      const blob = new Blob([signedPdfBytes], { type: 'application/pdf' });

      if (result) revokeBlobUrl(result);
      const newResult = createSecureObjectURL(blob);
      setResult(newResult);
      setResultBlob(blob);

    } catch (err) {
      setError('Error signing PDF. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!resultBlob) return;

    try {
      const link = createSecureDownloadLink(resultBlob, 'signed.pdf');
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
    setSignatureImage(null);
    if (signatureRef) signatureRef.clear();
    setSignaturePage(1);
    setTotalPages(0);
  }, [files, result, signatureRef]);

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors
          ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-white">
          {isDragActive ? 'Drop the PDF file here' : 'Drag & drop a PDF file here'}
        </p>
        <button
          type="button"
          onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
          className="mt-4 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Upload className="w-5 h-5 mr-2" />
          Choose File
        </button>
        <p className="text-sm text-gray-500 mt-2">Supports PDF files</p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">How to Use E-Sign PDF:</h3>
        <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1">
          <li>Upload a PDF file that needs a signature</li>
          <li>Draw your signature in the signature pad below</li>
          <li>Choose the page where you want to add the signature</li>
          <li>Position the signature on the page</li>
          <li>Click "Sign PDF" to add your signature</li>
          <li>Download your signed PDF</li>
        </ul>
      </div>

      {files.length > 0 && (
        <>
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Selected File</h3>
              <button
                onClick={resetFiles}
                className="text-gray-500 hover:text-gray-700 dark:text-white"
                title="Remove file"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg dark:bg-gray-800">
              <span className="text-gray-700 dark:text-white">{files[0].file.name}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Draw Your Signature</h3>
              <div className="border-2 border-gray-300 rounded-lg bg-white">
                <SignatureCanvas
                  ref={(ref) => setSignatureRef(ref)}
                  canvasProps={{
                    className: 'signature-canvas w-full h-40',
                    style: { width: '100%', height: '160px' }
                  }}
                />
              </div>
              <div className="flex gap-4 mt-2">
                <button
                  onClick={clearSignature}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Clear
                </button>
                <button
                  onClick={saveSignature}
                  className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Save Signature
                </button>
              </div>
            </div>

            {totalPages > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                  Select Page (1-{totalPages})
                </label>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={signaturePage}
                  onChange={(e) => setSignaturePage(Math.min(Math.max(1, parseInt(e.target.value) || 1), totalPages))}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                Signature Position
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400">X Position (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={signaturePosition.x}
                    onChange={(e) => setSignaturePosition(prev => ({ ...prev, x: parseInt(e.target.value) || 0 }))}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400">Y Position (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={signaturePosition.y}
                    onChange={(e) => setSignaturePosition(prev => ({ ...prev, y: parseInt(e.target.value) || 0 }))}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSignPDF}
              disabled={loading || !signatureImage}
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Signing PDF...
                </>
              ) : (
                <>
                  <FileSignature className="w-5 h-5 mr-2" />
                  Sign PDF
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
        <h3 className="text-lg font-semibold text-gray-800 mb-4 dark:text-white">More PDF Tools</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/pdf-tools?tab=create"
            className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200"
          >
            <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
              <FileSignature className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-white">
              Create PDF
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}