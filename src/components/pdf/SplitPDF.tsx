import React, { useState, useCallback, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, ImageIcon, FileText, Settings, Crop, Loader2, X, Split, Info } from 'lucide-react';
import { validateFile, ALLOWED_PDF_TYPES, createSecureObjectURL, createSecureDownloadLink, revokeBlobUrl } from '../../utils/security';
import { useOperationsCache } from '../../utils/operationsCache';
import { Link } from 'react-router-dom';
interface PDFFile {
  file: File;
  preview?: string;
}

export function SplitPDF() {
  const { saveOperation } = useOperationsCache();
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [splitPages, setSplitPages] = useState<string>('');
  const [totalPages, setTotalPages] = useState<number | null>(null);

  useEffect(() => {
    const loadPageCount = async () => {
      if (files.length === 1) {
        try {
          const pdfBytes = await files[0].file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(pdfBytes);
          setTotalPages(pdfDoc.getPageCount());
        } catch (err) {
          console.error('Error loading page count:', err);
          setError('Error loading PDF. Please try again.');
        }
      } else {
        setTotalPages(null);
      }
    };
    loadPageCount();
  }, [files]);

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
    setSplitPages('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  });

  const parsePageInput = (input: string, maxPages: number): number[] => {
    const pages: number[] = [];
    const parts = input.split(',').map(part => part.trim());

    for (const part of parts) {
      if (!part) continue;

      const rangeMatch = part.match(/^(\d+)-(\d+)$/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        
        if (isNaN(start) || isNaN(end) || start > end || start < 1 || end > maxPages) {
          throw new Error(`Invalid range: ${part}. Pages must be between 1 and ${maxPages}`);
        }
        
        for (let i = start; i <= end; i++) {
          pages.push(i - 1); // Convert to 0-based indexing
        }
      } else {
        const pageNum = parseInt(part, 10);
        if (isNaN(pageNum) || pageNum < 1 || pageNum > maxPages) {
          throw new Error(`Invalid page number: ${part}. Pages must be between 1 and ${maxPages}`);
        }
        pages.push(pageNum - 1); // Convert to 0-based indexing
      }
    }

    return [...new Set(pages)].sort((a, b) => a - b); // Remove duplicates and sort
  };

  const handleSplitPDF = async () => {
    if (files.length !== 1 || !totalPages) {
      setError('Please select a valid PDF file');
      return;
    }

    if (!splitPages.trim()) {
      setError('Please specify pages to remove');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const pdfBytes = await files[0].file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pagesToRemove = parsePageInput(splitPages, totalPages);

      if (pagesToRemove.length === 0) {
        throw new Error('No valid pages specified to remove');
      }

      if (pagesToRemove.length === totalPages) {
        throw new Error('Cannot remove all pages');
      }

      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(pdfDoc, 
        Array.from({ length: totalPages }, (_, i) => i)
          .filter(i => !pagesToRemove.includes(i))
      );

      copiedPages.forEach(page => newPdf.addPage(page));

      const pdfBytesResult = await newPdf.save();
      const blob = new Blob([pdfBytesResult], { type: 'application/pdf' });

      if (result) revokeBlobUrl(result);
      const newResult = createSecureObjectURL(blob);
      setResult(newResult);
      setResultBlob(blob);

      saveOperation({
        type: 'split_pdf',
        metadata: {
          filename: files[0].file.name,
          fileSize: blob.size,
          settings: { removedPages: splitPages }
        },
        preview: newResult
      });
    } catch (err) {
      setError(err.message || 'Error splitting PDF. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!resultBlob) return;

    try {
      const link = createSecureDownloadLink(resultBlob, 'split.pdf');
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
    setSplitPages('');
    setTotalPages(null);
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
        <p className="text-gray-600 dark:text-white">
          {isDragActive ? 'Drop the PDF file here' : 'Drag & drop a PDF file here, or tap to select'}
        </p>
        <p className="text-sm text-gray-500 mt-2 dark:text-white">Supports PDF files</p>
      </div>

      {files.length > 0 && (
        <>
          <div>
            <div className="flex justify-between  items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Selected File</h3>
              <button
                onClick={resetFiles}
                className="text-gray-500 dark:text-white hover:text-gray-700"
                title="Remove file"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg dark:bg-gray-700 flex justify-between items-center">
              <span className="text-gray-700 dark:text-white">{files[0].file.name}</span>
              {totalPages !== null && (
                <span className="text-sm text-gray-500">
                  {totalPages} {totalPages === 1 ? 'page' : 'pages'}
                </span>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium dark:text-white text-gray-700">
                Pages to Remove
              </label>
              <div className="flex items-center text-sm text-gray-500">
                <Info className="w-4 h-4 mr-1" />
                <span className='dark:text-white'>e.g., 5,6,9 or 4-7,9</span>
              </div>
            </div>
            <div className="relative">
              <input
                type="text"
                value={splitPages}
                onChange={(e) => setSplitPages(e.target.value)}
                placeholder={totalPages ? `Enter pages to remove (1-${totalPages})` : 'Enter pages to remove'}
                className="block w-full rounded-lg border dark:bg-gray-700 border-gray-500 stroke-gray-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pl-3 pr-10 py-2"
              />
              {totalPages !== null && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-white text-sm text-gray-400">
                  / {totalPages}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Use commas to separate numbers or ranges (e.g., 5,6,9 or 4-7).
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSplitPDF}
              disabled={loading || !splitPages.trim()}
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Splitting...
                </>
              ) : (
                <>
                  <Split className="w-5 h-5 mr-2 " />
                  Split PDF
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
        <h3 className="text-lg font-semibold text-gray-800 mb-4 dark:text-white">More Image Tools</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/image-tools" className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200">
            <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
              <ImageIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-white">Image Size Reduce</span>
          </Link>
          <Link to="/image-tools" className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200">
            <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
              <Settings className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-white">Image Conversion</span>
          </Link>
          <Link to="/image-tools" className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200">
            <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
              <FileText className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-white">Image to PDF</span>
          </Link>
          <Link to="/image-tools" className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200">
            <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
              <Crop className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-white">Crop Image</span>
          </Link>
        </div>
      </div>
    </div>
  );
}