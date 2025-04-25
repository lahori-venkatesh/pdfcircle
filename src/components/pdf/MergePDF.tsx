import { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, ImageIcon, Loader2, Crop, Settings, FileText, X, FilePlus } from 'lucide-react';
import { validateFile, ALLOWED_PDF_TYPES, createSecureObjectURL, createSecureDownloadLink, revokeBlobUrl } from '../../utils/security';
import { useOperationsCache } from '../../utils/operationsCache';
import { Link } from 'react-router-dom';

interface PDFFile {
  file: File;
  preview?: string;
}

export function MergePDF() {
  const { saveOperation } = useOperationsCache();
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => {
      const validation = validateFile(file, ALLOWED_PDF_TYPES);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid file type');
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      setError('No valid files were uploaded. Please upload PDF files.');
      return;
    }

    const newFiles = validFiles.map(file => ({
      file,
      preview: createSecureObjectURL(file)
    }));

    setFiles(prev => [...prev, ...newFiles]);
    setResult(null);
    setResultBlob(null);
    if (validFiles.length > 0) setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true
  });

  const handleMergePDF = async () => {
    if (files.length < 2) {
      setError('Please select at least two PDF files');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        const pdfBytes = await file.file.arrayBuffer();
        const pdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });

      if (result) revokeBlobUrl(result);
      const newResult = createSecureObjectURL(blob);
      setResult(newResult);
      setResultBlob(blob);

      saveOperation({
        type: 'merge_pdf',
        metadata: {
          filename: 'merged.pdf',
          fileSize: mergedPdfBytes.length,
          settings: { fileCount: files.length }
        },
        preview: createSecureObjectURL(blob)
      });
    } catch (err) {
      setError('Error merging PDFs. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!resultBlob) return;

    try {
      const link = createSecureDownloadLink(resultBlob, 'merged.pdf');
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

  const removeFile = useCallback((index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        revokeBlobUrl(newFiles[index].preview);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  }, []);

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
          {isDragActive ? 'Drop the PDF files here' : 'Drag & drop PDF files here'}
        </p>
        <button
          type="button"
          onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
          className="mt-4 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Upload className="w-5 h-5 mr-2" />
          Choose Files
        </button>
        <p className="text-sm text-gray-500 mt-2 dark:text-white">Supports PDF files</p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">How to Use Merge PDF:</h3>
        <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1">
          <li>Upload multiple PDF files via drag-and-drop or by clicking "Choose Files".</li>
          <li>Arrange files in the desired order (remove any unwanted files).</li>
          <li>Click "Merge PDFs" to combine all selected files into a single PDF.</li>
          <li>Download the merged PDF file.</li>
          <li>Clear the list to start a new merge process.</li>
        </ul>
      </div>

      {files.length > 0 && (
        <>
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold dark:text-white text-gray-800">Selected Files</h3>
              <button
                onClick={resetFiles}
                className="text-gray-500 hover:text-gray-700 dark:text-white"
                title="Remove all files"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center dark:bg-gray-800 justify-between bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-700 dark:text-white">{file.file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-gray-500 dark:text-white hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleMergePDF}
              disabled={loading || files.length < 2}
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Merging...
                </>
              ) : (
                <>
                  <FilePlus className="w-5 h-5 mr-2" />
                  Merge PDFs
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