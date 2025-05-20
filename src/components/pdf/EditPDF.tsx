import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Loader2, X, FileText, Edit, Plus, Minus, Type } from 'lucide-react';
import { PDFDocument, rgb } from 'pdf-lib';
import { validateFile, ALLOWED_PDF_TYPES, createSecureObjectURL, createSecureDownloadLink, revokeBlobUrl } from '../../utils/security';
import { Link } from 'react-router-dom';

interface PDFFile {
  file: File;
  preview?: string;
}

interface EditOperation {
  type: 'text' | 'delete';
  page: number;
  content?: string;
  position?: { x: number; y: number };
}

export function EditPDF() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [operations, setOperations] = useState<EditOperation[]>([]);
  const [textContent, setTextContent] = useState<string>('');
  const [textPosition, setTextPosition] = useState({ x: 50, y: 50 });

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
    setOperations([]);

    // Get total pages
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const pdfDoc = await PDFDocument.load(reader.result as ArrayBuffer);
        setTotalPages(pdfDoc.getPageCount());
        setCurrentPage(1);
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

  const addTextOperation = () => {
    if (!textContent.trim()) {
      setError('Please enter text content');
      return;
    }

    setOperations(prev => [...prev, {
      type: 'text',
      page: currentPage,
      content: textContent,
      position: textPosition
    }]);
    setTextContent('');
  };

  const addDeletePageOperation = () => {
    setOperations(prev => [...prev, {
      type: 'delete',
      page: currentPage
    }]);
  };

  const handleEdit = async () => {
    if (files.length !== 1) {
      setError('Please select a PDF file');
      return;
    }

    if (operations.length === 0) {
      setError('No edit operations added');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const pdfBytes = await files[0].file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      // Apply operations
      for (const op of operations) {
        if (op.type === 'text' && op.content && op.position) {
          const page = pages[op.page - 1];
          page.drawText(op.content, {
            x: op.position.x,
            y: op.position.y,
            size: 12,
            color: rgb(0, 0, 0)
          });
        } else if (op.type === 'delete') {
          pdfDoc.removePage(op.page - 1);
        }
      }

      const editedPdfBytes = await pdfDoc.save();
      const blob = new Blob([editedPdfBytes], { type: 'application/pdf' });

      if (result) revokeBlobUrl(result);
      const newResult = createSecureObjectURL(blob);
      setResult(newResult);
      setResultBlob(blob);

    } catch (err) {
      setError('Error editing PDF. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!resultBlob) return;

    try {
      const link = createSecureDownloadLink(resultBlob, 'edited.pdf');
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
    setOperations([]);
    setCurrentPage(1);
    setTotalPages(0);
    setTextContent('');
  }, [files, result]);

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
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">How to Edit PDF:</h3>
        <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1">
          <li>Upload a PDF file you want to edit</li>
          <li>Add text or delete pages as needed</li>
          <li>Click "Apply Edits" to save changes</li>
          <li>Download the edited PDF</li>
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

          {totalPages > 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                  Current Page ({currentPage} of {totalPages})
                </label>
                <input
                  type="range"
                  min="1"
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => setCurrentPage(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-indigo-600"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-white mb-2">Add Text</h4>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="Enter text"
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={textPosition.x}
                        onChange={(e) => setTextPosition(prev => ({ ...prev, x: parseInt(e.target.value) || 0 }))}
                        placeholder="X position"
                        className="p-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="number"
                        value={textPosition.y}
                        onChange={(e) => setTextPosition(prev => ({ ...prev, y: parseInt(e.target.value) || 0 }))}
                        placeholder="Y position"
                        className="p-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <button
                      onClick={addTextOperation}
                      className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center"
                    >
                      <Type className="w-5 h-5 mr-2" />
                      Add Text
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-white mb-2">Page Operations</h4>
                  <button
                    onClick={addDeletePageOperation}
                    className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                  >
                    <Minus className="w-5 h-5 mr-2" />
                    Delete Current Page
                  </button>
                </div>
              </div>

              {operations.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 dark:text-white">Pending Operations:</h4>
                  <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                    {operations.map((op, index) => (
                      <li key={index}>
                        {op.type === 'text' ? 
                          `Add text "${op.content}" at (${op.position?.x}, ${op.position?.y}) on page ${op.page}` :
                          `Delete page ${op.page}`
                        }
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleEdit}
              disabled={loading || operations.length === 0}
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Applying Edits...
                </>
              ) : (
                <>
                  <Edit className="w-5 h-5 mr-2" />
                  Apply Edits
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
            to="/pdf-tools?tab=lock"
            className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200"
          >
            <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
              <FileText className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-white">
              Lock PDF
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}