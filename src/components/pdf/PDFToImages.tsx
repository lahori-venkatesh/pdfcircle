import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Download, Upload, X, Image as ImageIcon, Loader2, Crop, Settings, FileText, Images, RefreshCw } from 'lucide-react';
import JSZip from 'jszip';
import { pdfjsLib } from '../../utils/pdfjs';
import { validateFile, ALLOWED_PDF_TYPES, createSecureObjectURL, createSecureDownloadLink, revokeBlobUrl } from '../../utils/security';
import { useOperationsCache } from '../../utils/operationsCache';
import { Link } from 'react-router-dom';
import { AuthModal } from '../AuthModal';

interface PDFFile {
  file: File;
  preview?: string;
}

export function PDFToImages({ isLoggedIn }: { isLoggedIn: boolean }) {
  const { saveOperation } = useOperationsCache();
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [format, setFormat] = useState<'jpeg' | 'png' | 'webp'>('png');
  const [hasDownloaded, setHasDownloaded] = useState(false);
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
    setHasDownloaded(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  const handlePDFToImages = async () => {
    if (files.length !== 1) {
      setError('Please select one PDF file');
      return;
    }

    if (!isLoggedIn && conversionCount >= MAX_CONVERSIONS) {
      setShowSignupPopup(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const pdfFile = files[0].file;
      const pdfData = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({
        data: pdfData,
        verbosity: 0,
      }).promise;
      const zip = new JSZip();
      const imageBlobs: Blob[] = [];
      const mimeType = `image/${format}`;
      const extension = format === 'jpeg' ? 'jpg' : format;

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
            mimeType,
            1.0
          );
        });

        imageBlobs.push(blob);
        zip.file(`page-${i}.${extension}`, blob);
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
            settings: { pageCount: pdf.numPages, format },
          },
          preview: createSecureObjectURL(imageBlobs[0]),
        });
      }

      if (!isLoggedIn) {
        setConversionCount((prev) => prev + 1);
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
      const extension = format === 'jpeg' ? 'jpg' : format;
      const link = createSecureDownloadLink(resultBlob, `pdf-images-${extension}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setHasDownloaded(true);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Error downloading file. Please try again.');
    }
  };

  const resetFiles = useCallback(() => {
    files.forEach((file) => file.preview && revokeBlobUrl(file.preview));
    if (result) revokeBlobUrl(result);
    setFiles([]);
    setResult(null);
    setResultBlob(null);
    setError(null);
    setFormat('png');
    setHasDownloaded(false);
  }, [files, result]);

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
        className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4 dark:text-white" />
        <p className="text-gray-600 dark:text-white">
          {isDragActive ? 'Drop the PDF file here' : 'Drag & drop a PDF file here, or tap to select'}
        </p>
        <p className="text-sm text-gray-500 mt-2 dark:text-white">Supports PDF files</p>
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

      {files.length > 0 && (
        <>
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Selected File</h3>
              <button
                onClick={resetFiles}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title="Remove file"
                aria-label="Remove file"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <span className="text-gray-700 dark:text-gray-200">{files[0].file.name}</span>
            </div>
          </div>

          <div>
            <label htmlFor="format-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Output Image Format
            </label>
            <select
              id="format-select"
              value={format}
              onChange={(e) => setFormat(e.target.value as 'jpeg' | 'png' | 'webp')}
              className="block w-full sm:w-48 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Select output image format"
            >
              <option value="png">PNG</option>
              <option value="jpeg">JPG</option>
              <option value="webp">WebP</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
          )}

          <div className="flex sm:flex-row flex-col gap-3">
            {!result && (
              <button
                onClick={handlePDFToImages}
                disabled={loading}
                className="w-full sm:flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                aria-label="Convert PDF to images"
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
            )}
            {result && !hasDownloaded && (
              <button
                onClick={handleDownload}
                className="w-full sm:flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                aria-label="Download converted images as ZIP"
              >
                <Download className="w-5 h-5 mr-2" />
                Download ZIP
              </button>
            )}
            {result && hasDownloaded && (
              <button
                onClick={resetFiles}
                className="w-full sm:flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                aria-label="Start a new PDF to images conversion"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
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
              You've reached the limit of {MAX_CONVERSIONS} free conversions. Log in or sign up to enjoy unlimited PDF to image conversions!
            </p>
            <ul className="list-disc pl-5 mb-4 text-sm text-gray-600">
              <li>Unlimited PDF to image conversions</li>
              <li>High-quality output in PNG, JPG, or WebP</li>
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
        <h3 className="text-lg font-semibold text-gray-800 mb-4 dark:text-white">More Image Tools</h3>
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