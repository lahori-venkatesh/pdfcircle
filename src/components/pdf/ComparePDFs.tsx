import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Loader2, X, FileText, GitCompare } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { diffChars } from 'diff';
import { validateFile, ALLOWED_PDF_TYPES, createSecureObjectURL, createSecureDownloadLink, revokeBlobUrl } from '../../utils/security';
import { Link } from 'react-router-dom';

interface PDFFile {
  file: File;
  preview?: string;
}

export function ComparePDFs() {
  const [file1, setFile1] = useState<PDFFile | null>(null);
  const [file2, setFile2] = useState<PDFFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [differences, setDifferences] = useState<string[]>([]);

  const onDrop1 = useCallback((acceptedFiles: File[]) => {
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

    setFile1({ file, preview: createSecureObjectURL(file) });
    setResult(null);
    setResultBlob(null);
    setError(null);
    setDifferences([]);
  }, []);

  const onDrop2 = useCallback((acceptedFiles: File[]) => {
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

    setFile2({ file, preview: createSecureObjectURL(file) });
    setResult(null);
    setResultBlob(null);
    setError(null);
    setDifferences([]);
  }, []);

  const { getRootProps: getRootProps1, getInputProps: getInputProps1, isDragActive: isDragActive1 } = useDropzone({
    onDrop: onDrop1,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  });

  const { getRootProps: getRootProps2, getInputProps: getInputProps2, isDragActive: isDragActive2 } = useDropzone({
    onDrop: onDrop2,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  });

  const handleCompare = async () => {
    if (!file1 || !file2) {
      setError('Please select both PDF files');
      return;
    }

    setLoading(true);
    setError(null);
    setDifferences([]);

    try {
      // Load both PDFs
      const pdf1Bytes = await file1.file.arrayBuffer();
      const pdf2Bytes = await file2.file.arrayBuffer();
      
      const pdf1Doc = await PDFDocument.load(pdf1Bytes);
      const pdf2Doc = await PDFDocument.load(pdf2Bytes);

      // Extract text from both PDFs
      const text1 = await extractTextFromPDF(pdf1Doc);
      const text2 = await extractTextFromPDF(pdf2Doc);

      // Compare texts
      const diff = diffChars(text1, text2);
      
      // Create comparison report
      const differences: string[] = [];
      diff.forEach((part) => {
        if (part.added) {
          differences.push(`Added: "${part.value}"`);
        }
        if (part.removed) {
          differences.push(`Removed: "${part.value}"`);
        }
      });

      setDifferences(differences);

      // Create PDF with comparison results
      const resultDoc = await PDFDocument.create();
      const page = resultDoc.addPage();
      const { width, height } = page.getSize();
      
      let y = height - 50;
      const fontSize = 12;
      const lineHeight = fontSize * 1.5;

      // Add title
      page.drawText('PDF Comparison Report', {
        x: 50,
        y,
        size: 16,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight * 2;

      // Add file names
      page.drawText(`File 1: ${file1.file.name}`, {
        x: 50,
        y,
        size: fontSize,
      });
      y -= lineHeight;

      page.drawText(`File 2: ${file2.file.name}`, {
        x: 50,
        y,
        size: fontSize,
      });
      y -= lineHeight * 2;

      // Add differences
      differences.forEach((diff) => {
        if (y < 50) {
          // Add new page if needed
          page = resultDoc.addPage();
          y = height - 50;
        }
        
        page.drawText(diff, {
          x: 50,
          y,
          size: fontSize,
          maxWidth: width - 100,
        });
        y -= lineHeight;
      });

      const resultBytes = await resultDoc.save();
      const blob = new Blob([resultBytes], { type: 'application/pdf' });

      if (result) revokeBlobUrl(result);
      const newResult = createSecureObjectURL(blob);
      setResult(newResult);
      setResultBlob(blob);

    } catch (err) {
      setError('Error comparing PDFs. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const extractTextFromPDF = async (pdfDoc: PDFDocument): Promise<string> => {
    const pages = pdfDoc.getPages();
    let text = '';
    
    for (const page of pages) {
      const content = await page.node.Resources().lookup('Font', 'Text');
      if (content) {
        text += content.toString() + '\n';
      }
    }
    
    return text;
  };

  const handleDownload = async () => {
    if (!resultBlob) return;

    try {
      const link = createSecureDownloadLink(resultBlob, 'comparison.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Error downloading file. Please try again.');
    }
  };

  const resetFiles = useCallback(() => {
    if (file1?.preview) revokeBlobUrl(file1.preview);
    if (file2?.preview) revokeBlobUrl(file2.preview);
    if (result) revokeBlobUrl(result);
    setFile1(null);
    setFile2(null);
    setResult(null);
    setResultBlob(null);
    setError(null);
    setDifferences([]);
  }, [file1, file2, result]);

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">How to Compare PDFs:</h3>
        <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1">
          <li>Upload two PDF files you want to compare</li>
          <li>Click "Compare PDFs" to analyze differences</li>
          <li>Review the comparison report</li>
          <li>Download the detailed comparison results</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          {...getRootProps1()}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${isDragActive1 ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}`}
        >
          <input {...getInputProps1()} />
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-white">First PDF</p>
          {file1 && (
            <div className="mt-2 text-sm text-gray-500">{file1.file.name}</div>
          )}
        </div>

        <div
          {...getRootProps2()}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${isDragActive2 ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}`}
        >
          <input {...getInputProps2()} />
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-white">Second PDF</p>
          {file2 && (
            <div className="mt-2 text-sm text-gray-500">{file2.file.name}</div>
          )}
        </div>
      </div>

      {(file1 || file2) && (
        <div className="flex justify-end">
          <button
            onClick={resetFiles}
            className="text-gray-500 hover:text-gray-700 dark:text-white"
            title="Remove files"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {differences.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h4 className="font-semibold mb-2 dark:text-white">Differences Found:</h4>
          <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
            {differences.map((diff, index) => (
              <li key={index}>{diff}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleCompare}
          disabled={loading || !file1 || !file2}
          className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Comparing...
            </>
          ) : (
            <>
              <GitCompare className="w-5 h-5 mr-2" />
              Compare PDFs
            </>
          )}
        </button>

        {result && (
          <button
            onClick={handleDownload}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
          >
            <Download className="w-5 h-5 mr-2" />
            Download Report
          </button>
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 dark:text-white">More PDF Tools</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/pdf-tools?tab=edit"
            className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200"
          >
            <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
              <FileText className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-white">
              Edit PDF
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}