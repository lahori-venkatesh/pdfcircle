import React, { useState, useCallback } from 'react';
import { Upload, Download, Loader2, X, FileText } from 'lucide-react';
import pdfMake from 'pdfmake/build/pdfmake';
import htmlToPdfmake from 'html-to-pdfmake';
import { createSecureObjectURL, createSecureDownloadLink, revokeBlobUrl } from '../../utils/security';
import { Link } from 'react-router-dom';

export function HTMLToPDF() {
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const handleConvert = async () => {
    if (!htmlContent.trim()) {
      setError('Please enter HTML content');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create a temporary div to parse HTML
      const container = document.createElement('div');
      container.innerHTML = htmlContent;

      // Convert HTML to pdfmake format
      const pdfContent = htmlToPdfmake(container.innerHTML);

      // Generate PDF
      const docDefinition = {
        content: [pdfContent],
        defaultStyle: {
          font: 'Roboto',
          fontSize: 12,
          lineHeight: 1.5
        }
      };

      // Create PDF blob
      const pdfDocGenerator = pdfMake.createPdf(docDefinition);
      pdfDocGenerator.getBlob((blob) => {
        if (result) revokeBlobUrl(result);
        const newResult = createSecureObjectURL(blob);
        setResult(newResult);
        setResultBlob(blob);
        setLoading(false);
      });

    } catch (err) {
      setError('Error converting HTML to PDF. Please check your HTML content.');
      console.error(err);
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!resultBlob) return;

    try {
      const link = createSecureDownloadLink(resultBlob, 'converted.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Error downloading file. Please try again.');
    }
  };

  const resetContent = useCallback(() => {
    if (result) revokeBlobUrl(result);
    setHtmlContent('');
    setResult(null);
    setResultBlob(null);
    setError(null);
  }, [result]);

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">How to Convert HTML to PDF:</h3>
        <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1">
          <li>Enter or paste your HTML content in the editor below</li>
          <li>Click "Convert to PDF" to generate the PDF</li>
          <li>Download the converted PDF file</li>
          <li>Note: Basic HTML elements and CSS styles are supported</li>
        </ul>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">HTML Content</h3>
          {htmlContent && (
            <button
              onClick={resetContent}
              className="text-gray-500 hover:text-gray-700 dark:text-white"
              title="Clear content"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        <textarea
          value={htmlContent}
          onChange={(e) => setHtmlContent(e.target.value)}
          placeholder="Enter your HTML content here..."
          className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white dark:border-gray-600"
          spellCheck="false"
        />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleConvert}
            disabled={loading || !htmlContent.trim()}
            className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Converting...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5 mr-2" />
                Convert to PDF
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
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 dark:text-white">More PDF Tools</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/pdf-tools?tab=to-word"
            className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200"
          >
            <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
              <FileText className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-white">
              PDF to Word
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}