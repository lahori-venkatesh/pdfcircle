import React, { useState, useCallback, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Loader2, X, Split, Info } from 'lucide-react';
import { validateFile, ALLOWED_PDF_TYPES, createSecureObjectURL, createSecureDownloadLink, revokeBlobUrl } from '../../utils/security';
import { useOperationsCache } from '../../utils/operationsCache';

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

  // Load PDF page count when file changes
  useEffect(() => {
    const loadPageCount = async () => {
      if (files.length === 1) {
        try {
          const pdfBytes = await files[0].file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(pdfBytes);
          setTotalPages(pdfDoc.getPageCount());
        } catch (err) {
          console.error('Error loading page count:', err);
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

  const handleSplitPDF = async () => {
    if (files.length !== 1) {
      setError('Please select one PDF file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const pdfBytes = await files[0].file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pageCount = pdfDoc.getPageCount();

      const pageRanges = splitPages
        .split(',')
        .map(range => range.trim())
        .map(range => {
          const [start, end] = range.split('-').map(num => parseInt(num));
          return end ? { start: start - 1, end } : { start: start - 1, end: start };
        })
        .filter(range => range.start >= 0 && range.end <= pageCount);

      if (pageRanges.length === 0) {
        throw new Error('Invalid page ranges specified');
      }

      const splitPdfs = await Promise.all(pageRanges.map(async (range) => {
        const newPdf = await PDFDocument.create();
        const pages = await newPdf.copyPages(pdfDoc, Array.from(
          { length: range.end - range.start },
          (_, i) => range.start + i
        ));
        pages.forEach(page => newPdf.addPage(page));
        return newPdf.save();
      }));

      const blobs = splitPdfs.map(pdfBytes => 
        new Blob([pdfBytes], { type: 'application/pdf' })
      );

      if (result) revokeBlobUrl(result);
      const newResult = createSecureObjectURL(blobs[0]);
      setResult(newResult);
      setResultBlob(blobs[0]);

      saveOperation({
        type: 'split_pdf',
        metadata: {
          filename: files[0].file.name,
          fileSize: blobs[0].size,
          settings: { pageRanges }
        },
        preview: createSecureObjectURL(blobs[0])
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
            <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
              <span className="text-gray-700">{files[0].file.name}</span>
              {totalPages !== null && (
                <span className="text-sm text-gray-500">
                  {totalPages} {totalPages === 1 ? 'page' : 'pages'}
                </span>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Split Page Ranges
              </label>
              <div className="flex items-center text-sm text-gray-500">
                <Info className="w-4 h-4 mr-1" />
                <span>e.g., 1-3, 4, 5-7</span>
              </div>
            </div>
            <div className="relative">
              <input
                type="text"
                value={splitPages}
                onChange={(e) => setSplitPages(e.target.value)}
                placeholder={totalPages ? `Enter ranges (1-${totalPages})` : 'Enter page ranges'}
                className="block w-full rounded-lg border border-gray-500 stroke-gray-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pl-3 pr-10 py-2"

              />
              {totalPages !== null && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  / {totalPages}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Separate ranges with commas. Use hyphens for ranges or single numbers.
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
                  <Split className="w-5 h-5 mr-2" />
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
    </div>
  );
}