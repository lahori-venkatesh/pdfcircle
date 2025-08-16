import React, { useState, useCallback, useRef } from 'react';
import { Upload, Download, Loader2, X, FileText, Globe, Code, Image, Settings, Eye, EyeOff } from 'lucide-react';
import { createSecureObjectURL, createSecureDownloadLink, revokeBlobUrl } from '../../utils/security';
import { safeDownloadBlob } from '../../utils/download';
import { Link } from 'react-router-dom';

interface ConversionSettings {
  pageSize: 'A4' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  includeImages: boolean;
  waitForImages: boolean;
  timeout: number;
}

type InputMethod = 'url' | 'html' | 'file';

export function HTMLToPDF() {
  const [inputMethod, setInputMethod] = useState<InputMethod>('url');
  const [url, setUrl] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [settings, setSettings] = useState<ConversionSettings>({
    pageSize: 'A4',
    orientation: 'portrait',
    margins: { top: 20, bottom: 20, left: 20, right: 20 },
    includeImages: true,
    waitForImages: true,
    timeout: 30
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const fetchUrlContent = async (url: string): Promise<string> => {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    return html;
  };

  const convertHtmlToPdf = async (html: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      try {
        // Create a temporary iframe to render HTML
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.style.top = '-9999px';
        iframe.style.width = '1200px';
        iframe.style.height = '1600px';
        document.body.appendChild(iframe);

        iframe.onload = () => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc) {
              throw new Error('Could not access iframe document');
            }

            // Set the HTML content
            iframeDoc.open();
            iframeDoc.write(html);
            iframeDoc.close();

            // Wait for images to load if enabled
            const waitForImages = settings.waitForImages ? 
              Promise.all(
                Array.from(iframeDoc.images).map(img => 
                  new Promise((resolve) => {
                    if (img.complete) resolve(null);
                    else {
                      img.onload = () => resolve(null);
                      img.onerror = () => resolve(null);
                    }
                  })
                )
              ) : Promise.resolve();

            waitForImages.then(() => {
              // Use html2canvas to capture the rendered content
              import('html2canvas').then(({ default: html2canvas }) => {
                html2canvas(iframeDoc.body, {
                  allowTaint: true,
                  useCORS: true,
                  scale: 2,
                  width: 1200,
                  height: iframeDoc.body.scrollHeight,
                  backgroundColor: '#ffffff'
                }).then(canvas => {
                  // Convert canvas to PDF using jsPDF
                  import('jspdf').then(({ jsPDF }) => {
                    const pdf = new jsPDF({
                      orientation: settings.orientation,
                      unit: 'mm',
                      format: settings.pageSize
                    });

                    const imgData = canvas.toDataURL('image/png');
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = pdf.internal.pageSize.getHeight();
                    const imgWidth = pdfWidth - settings.margins.left - settings.margins.right;
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;

                    // Add multiple pages if content is too long
                    let heightLeft = imgHeight;
                    let position = 0;

                    pdf.addImage(imgData, 'PNG', settings.margins.left, settings.margins.top, imgWidth, imgHeight);
                    heightLeft -= (pdfHeight - settings.margins.top - settings.margins.bottom);

                    while (heightLeft >= 0) {
                      position = heightLeft - imgHeight;
                      pdf.addPage();
                      pdf.addImage(imgData, 'PNG', settings.margins.left, position + settings.margins.top, imgWidth, imgHeight);
                      heightLeft -= (pdfHeight - settings.margins.top - settings.margins.bottom);
                    }

                    const pdfBlob = pdf.output('blob');
                    document.body.removeChild(iframe);
                    resolve(pdfBlob);
                  }).catch(reject);
                }).catch(reject);
              }).catch(reject);
            });
          } catch (err) {
            document.body.removeChild(iframe);
            reject(err);
          }
        };

        iframe.onerror = () => {
          document.body.removeChild(iframe);
          reject(new Error('Failed to load iframe'));
        };
      } catch (err) {
        reject(err);
      }
    });
  };

  const handleConvert = async () => {
    let htmlToConvert = '';

    try {
      setLoading(true);
      setError(null);

      switch (inputMethod) {
        case 'url':
          if (!url.trim()) {
            setError('Please enter a URL');
            return;
          }
          if (!validateUrl(url)) {
            setError('Please enter a valid URL');
            return;
          }
          htmlToConvert = await fetchUrlContent(url);
          break;

        case 'html':
          if (!htmlContent.trim()) {
            setError('Please enter HTML content');
            return;
          }
          htmlToConvert = htmlContent;
          break;

        case 'file':
          // Handle file upload if needed
          setError('File upload not implemented yet');
          return;
      }

      // Set preview
      setPreviewHtml(htmlToConvert);

      // Convert to PDF
      const pdfBlob = await convertHtmlToPdf(htmlToConvert);

      if (result) revokeBlobUrl(result);
      const newResult = createSecureObjectURL(pdfBlob);
      setResult(newResult);
      setResultBlob(pdfBlob);

    } catch (err) {
      setError(`Error converting to PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!resultBlob) return;

    try {
      const originalName = inputMethod === 'url' ? 'webpage' : 'html';
      safeDownloadBlob(resultBlob, `${originalName}_converted.pdf`);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Error downloading file. Please try again.');
    }
  };

  const resetContent = useCallback(() => {
    if (result) revokeBlobUrl(result);
    setUrl('');
    setHtmlContent('');
    setResult(null);
    setResultBlob(null);
    setError(null);
    setPreviewHtml(null);
  }, [result]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setHtmlContent(e.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
        <div className="flex items-start">
          <Globe className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">HTML to PDF Converter</h3>
            <ul className="list-disc list-inside text-sm text-green-700 dark:text-green-300 space-y-1">
              <li>Convert web pages by URL or paste HTML code</li>
              <li>Support for images, CSS styling, and complex layouts</li>
              <li>Customizable page size, orientation, and margins</li>
              <li>High-quality PDF output with proper formatting</li>
              <li>Preview HTML content before conversion</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Input Method Selection */}
      <div className="space-y-4">
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setInputMethod('url')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              inputMethod === 'url'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4 inline mr-2" />
            URL
          </button>
          <button
            onClick={() => setInputMethod('html')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              inputMethod === 'html'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Code className="w-4 h-4 inline mr-2" />
            HTML Code
          </button>
          <button
            onClick={() => setInputMethod('file')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              inputMethod === 'file'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            File
          </button>
        </div>

        {/* Settings Toggle */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Input Content</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              {showPreview ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
              Preview
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <Settings className="w-4 h-4 mr-1" />
              Settings
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">PDF Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Page Size</label>
                <select
                  value={settings.pageSize}
                  onChange={(e) => setSettings(prev => ({ ...prev, pageSize: e.target.value as any }))}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                >
                  <option value="A4">A4</option>
                  <option value="Letter">Letter</option>
                  <option value="Legal">Legal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Orientation</label>
                <select
                  value={settings.orientation}
                  onChange={(e) => setSettings(prev => ({ ...prev, orientation: e.target.value as any }))}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Wait for Images</label>
                <input
                  type="checkbox"
                  checked={settings.waitForImages}
                  onChange={(e) => setSettings(prev => ({ ...prev, waitForImages: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-600 dark:text-gray-300">Wait for images to load</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Include Images</label>
                <input
                  type="checkbox"
                  checked={settings.includeImages}
                  onChange={(e) => setSettings(prev => ({ ...prev, includeImages: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-600 dark:text-gray-300">Include images in PDF</span>
              </div>
            </div>
          </div>
        )}

        {/* Input Content */}
        <div className="space-y-4">
          {inputMethod === 'url' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                Website URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white dark:border-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the URL of the webpage you want to convert to PDF
              </p>
            </div>
          )}

          {inputMethod === 'html' && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-white">
                  HTML Content
                </label>
                {htmlContent && (
                  <button
                    onClick={resetContent}
                    className="text-gray-500 hover:text-gray-700 dark:text-white"
                    title="Clear content"
                  >
                    <X className="w-4 h-4" />
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
            </div>
          )}

          {inputMethod === 'file' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                Upload HTML File
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 transition-colors flex items-center justify-center"
              >
                <Upload className="w-5 h-5 mr-2" />
                Choose HTML File
              </button>
              {htmlContent && (
                <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Content loaded from file</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Preview Panel */}
        {showPreview && previewHtml && (
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b">
              <h4 className="font-medium text-gray-900 dark:text-white">HTML Preview</h4>
            </div>
            <div 
              className="p-4 bg-white"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
              style={{ maxHeight: '400px', overflow: 'auto' }}
            />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleConvert}
            disabled={loading || (!url.trim() && !htmlContent.trim())}
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