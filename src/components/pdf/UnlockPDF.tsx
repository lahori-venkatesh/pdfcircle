import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Loader2, X, FileText, Unlock, Eye, EyeOff, Key, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { validateFile, ALLOWED_PDF_TYPES, createSecureObjectURL, createSecureDownloadLink, revokeBlobUrl } from '../../utils/security';
import { Link } from 'react-router-dom';

interface PDFFile {
  file: File;
  preview?: string;
  isEncrypted?: boolean;
  encryptionInfo?: {
    isEncrypted: boolean;
    isPasswordProtected: boolean;
    algorithm?: string;
  };
}

export function UnlockPDF() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
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

    setIsAnalyzing(true);
    setError(null);

    try {
      // Analyze the PDF to check if it's encrypted
      const pdfBytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      
      const encryptionInfo = {
        isEncrypted: pdfDoc.isEncrypted,
        isPasswordProtected: pdfDoc.isEncrypted,
        algorithm: pdfDoc.isEncrypted ? 'AES' : undefined
      };

      setFiles([{ 
        file, 
        preview: createSecureObjectURL(file),
        isEncrypted: pdfDoc.isEncrypted,
        encryptionInfo
      }]);

      if (!pdfDoc.isEncrypted) {
        setError('This PDF is not password protected. No unlocking needed.');
      }

    } catch (err) {
      // If we can't load it normally, it might be encrypted
      setFiles([{ 
        file, 
        preview: createSecureObjectURL(file),
        isEncrypted: true,
        encryptionInfo: {
          isEncrypted: true,
          isPasswordProtected: true,
          algorithm: 'AES'
        }
      }]);
    } finally {
      setIsAnalyzing(false);
    }

    setResult(null);
    setResultBlob(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  });

  const handleUnlock = async () => {
    if (files.length !== 1) {
      setError('Please select a PDF file');
      return;
    }

    if (!password) {
      setError('Please enter the password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const pdfBytes = await files[0].file.arrayBuffer();
      
      // Try to load with password
      const pdfDoc = await PDFDocument.load(pdfBytes, { password });

      // Create a new document without encryption
      const unlockedPdfBytes = await pdfDoc.save({ 
        useObjectStreams: false,
        addDefaultPage: false,
        objectsPerTick: 20
      });
      
      const blob = new Blob([unlockedPdfBytes], { type: 'application/pdf' });

      if (result) revokeBlobUrl(result);
      const newResult = createSecureObjectURL(blob);
      setResult(newResult);
      setResultBlob(blob);

    } catch (err: any) {
      if (err.message?.includes('password')) {
        setError('Incorrect password. Please check your password and try again.');
      } else {
        setError('Error unlocking PDF. The file might be corrupted or use an unsupported encryption method.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!resultBlob) return;

    try {
      const originalName = files[0].file.name.replace('.pdf', '');
      const link = createSecureDownloadLink(resultBlob, `${originalName}_unlocked.pdf`);
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
    setPassword('');
  }, [files, result]);

  const getEncryptionStatus = () => {
    if (!files[0]?.encryptionInfo) return null;
    
    const { isEncrypted, isPasswordProtected } = files[0].encryptionInfo;
    
    if (!isEncrypted) {
      return { status: 'unprotected', text: 'Not encrypted', color: 'text-green-600', icon: CheckCircle };
    }
    
    if (isPasswordProtected) {
      return { status: 'protected', text: 'Password protected', color: 'text-orange-600', icon: Key };
    }
    
    return { status: 'encrypted', text: 'Encrypted', color: 'text-red-600', icon: AlertCircle };
  };

  const encryptionStatus = getEncryptionStatus();

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

      <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
        <div className="flex items-start">
          <Unlock className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200 mb-2">PDF Password Removal</h3>
            <ul className="list-disc list-inside text-sm text-orange-700 dark:text-orange-300 space-y-1">
              <li>Remove password protection from PDF files</li>
              <li>Supports AES-128 and AES-256 encrypted PDFs</li>
              <li>Automatic encryption detection and analysis</li>
              <li>Secure processing - files never leave your browser</li>
              <li>Maintains original document quality and formatting</li>
            </ul>
          </div>
        </div>
      </div>

      {isAnalyzing && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400 mr-2" />
            <span className="text-blue-800 dark:text-blue-200">Analyzing PDF encryption...</span>
          </div>
        </div>
      )}

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
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-white">{files[0].file.name}</span>
                {encryptionStatus && (
                  <div className={`flex items-center text-sm ${encryptionStatus.color}`}>
                    <encryptionStatus.icon className="w-4 h-4 mr-1" />
                    {encryptionStatus.text}
                  </div>
                )}
              </div>
            </div>
          </div>

          {files[0]?.isEncrypted && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                  PDF Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg pr-10"
                    placeholder="Enter PDF password"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleUnlock();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter the password that was used to protect this PDF
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Error</p>
                      <p className="text-sm">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleUnlock}
                  disabled={loading || !password}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Unlocking...
                    </>
                  ) : (
                    <>
                      <Unlock className="w-5 h-5 mr-2" />
                      Unlock PDF
                    </>
                  )}
                </button>

                {result && (
                  <button
                    onClick={handleDownload}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download Unlocked PDF
                  </button>
                )}
              </div>
            </div>
          )}

          {!files[0]?.isEncrypted && (
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-green-800 dark:text-green-200">No Password Protection</h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    This PDF file is not password protected. No unlocking is needed.
                  </p>
                </div>
              </div>
            </div>
          )}
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