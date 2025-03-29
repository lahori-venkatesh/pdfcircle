import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { FileCode2, Download, Loader2 } from 'lucide-react';

export function HTMLToPDF() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create an iframe to load the webpage
      const iframe = document.createElement('iframe');
      iframe.style.width = '1200px';
      iframe.style.height = '1600px';
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.visibility = 'hidden'; // Hide the iframe
      document.body.appendChild(iframe);

      // Set up a promise to handle iframe loading
      const iframeLoadPromise = new Promise((resolve, reject) => {
        iframe.onload = () => {
          try {
            // Check if we can access the iframe content
            if (!iframe.contentDocument || !iframe.contentDocument.body) {
              throw new Error('Cannot access webpage content due to security restrictions');
            }
            resolve(iframe);
          } catch (err) {
            reject(err);
          }
        };
        iframe.onerror = () => reject(new Error('Failed to load webpage'));

        // Set timeout for loading
        setTimeout(() => reject(new Error('Timeout loading webpage')), 30000);
      });

      // Set the iframe source after setting up handlers
      iframe.src = url;

      // Wait for iframe to load
      await iframeLoadPromise;

      // Ensure we can access the content
      if (!iframe.contentDocument || !iframe.contentDocument.body) {
        throw new Error('Cannot access webpage content due to security restrictions');
      }

      // Convert the iframe content to PDF
      const canvas = await html2canvas(iframe.contentDocument.body, {
        allowTaint: true,
        useCORS: true,
        logging: false,
        windowWidth: 1200,
        windowHeight: 1600
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      
      // Download the PDF
      pdf.save('webpage.pdf');

    } catch (err) {
      console.error('Error converting webpage to PDF:', err);
      setError(err instanceof Error ? err.message : 'Error converting webpage to PDF. Please try again.');
    } finally {
      // Clean up - remove any iframes we created
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        if (iframe.style.left === '-9999px') {
          document.body.removeChild(iframe);
        }
      });
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8 text-center">
        HTML to PDF Converter
      </h1>

      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <div className="space-y-6">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              Webpage URL
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            onClick={handleConvert}
            disabled={loading || !url}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Converting...
              </>
            ) : (
              <>
                <FileCode2 className="w-5 h-5 mr-2" />
                Convert to PDF
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-6 text-sm text-gray-500">
        <p>Note: Due to security restrictions, some websites may not allow conversion to PDF.</p>
      </div>
    </div>
  );
}