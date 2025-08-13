import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Loader2, X, FileText, Lock, Eye, EyeOff, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { validateFile, ALLOWED_PDF_TYPES, createSecureObjectURL, createSecureDownloadLink, revokeBlobUrl } from '../../utils/security';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';

interface PDFFile {
  file: File;
  preview?: string;
}

interface EncryptionSettings {
  userPassword: string;
  ownerPassword: string;
  permissions: {
    printing: 'lowResolution' | 'highResolution' | 'none';
    modifying: boolean;
    copying: boolean;
    annotating: boolean;
    fillingForms: boolean;
    contentAccessibility: boolean;
    documentAssembly: boolean;
  };
  encryptionLevel: '128' | '256';
}

export function LockPDF() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');
  
  const [settings, setSettings] = useState<EncryptionSettings>({
    userPassword: '',
    ownerPassword: '',
    permissions: {
      printing: 'highResolution',
      modifying: false,
      copying: false,
      annotating: false,
      fillingForms: true,
      contentAccessibility: true,
      documentAssembly: false
    },
    encryptionLevel: '128'
  });

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
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  });

  // Password strength checker
  const checkPasswordStrength = (password: string) => {
    if (password.length < 6) return 'weak';
    if (password.length < 8) return 'medium';
    
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const score = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    
    if (score >= 3 && password.length >= 8) return 'strong';
    if (score >= 2 && password.length >= 6) return 'medium';
    return 'weak';
  };

  const handlePasswordChange = (password: string, isOwner = false) => {
    if (isOwner) {
      setSettings(prev => ({ ...prev, ownerPassword: password }));
    } else {
      setSettings(prev => ({ ...prev, userPassword: password }));
      setPasswordStrength(checkPasswordStrength(password));
    }
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 'weak': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'strong': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 'weak': return 'Weak password';
      case 'medium': return 'Medium strength';
      case 'strong': return 'Strong password';
      default: return '';
    }
  };

  const handleLock = async () => {
    if (files.length !== 1) {
      setError('Please select a PDF file');
      return;
    }

    if (!settings.userPassword) {
      setError('Please enter a user password');
      return;
    }

    if (settings.userPassword !== settings.ownerPassword && !settings.ownerPassword) {
      setError('Please enter an owner password or use the same password for both');
      return;
    }

    if (passwordStrength === 'weak') {
      setError('Please use a stronger password (at least 8 characters with mixed case, numbers, and symbols)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const pdfBytes = await files[0].file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);

      // Check if PDF is already encrypted
      if (pdfDoc.isEncrypted) {
        setError('This PDF is already password protected. Please use the Unlock PDF tool first.');
        setLoading(false);
        return;
      }

      // Convert PDF to base64 for server processing
      const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));

      // Call the server-side encryption function
      const { data, error } = await supabase.functions.invoke('encrypt-pdf', {
        body: {
          pdfData: pdfBase64,
          userPassword: settings.userPassword,
          ownerPassword: settings.ownerPassword || settings.userPassword,
          permissions: settings.permissions
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to encrypt PDF');
      }

      if (!data?.success || !data?.encryptedPdf) {
        throw new Error('Encryption failed - no data received');
      }

      // Convert base64 response back to Blob
      const encryptedPdfBytes = Uint8Array.from(atob(data.encryptedPdf), c => c.charCodeAt(0));
      const blob = new Blob([encryptedPdfBytes], { type: 'application/pdf' });

      if (result) revokeBlobUrl(result);
      const newResult = createSecureObjectURL(blob);
      setResult(newResult);
      setResultBlob(blob);

    } catch (err) {
      console.error('Encryption error details:', err);
      
      let errorMessage = 'Error encrypting PDF. Please try again.';
      
      if (err instanceof Error) {
        const errorMsg = err.message.toLowerCase();
        
        if (errorMsg.includes('already encrypted') || errorMsg.includes('encrypted')) {
          errorMessage = 'This PDF is already password protected. Please use the Unlock PDF tool first.';
        } else if (errorMsg.includes('password') || errorMsg.includes('invalid')) {
          errorMessage = 'Invalid password format. Please try a different password.';
        } else if (errorMsg.includes('corrupted') || errorMsg.includes('incompatible')) {
          errorMessage = 'The PDF file appears to be corrupted or incompatible. Please try a different file.';
        } else if (errorMsg.includes('permissions') || errorMsg.includes('access')) {
          errorMessage = 'Permission error. Please try with different permission settings.';
        } else {
          errorMessage = `Encryption failed: ${err.message}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!resultBlob) return;

    try {
      const originalName = files[0].file.name.replace('.pdf', '');
      const link = createSecureDownloadLink(resultBlob, `${originalName}_protected.pdf`);
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
    setSettings({
      userPassword: '',
      ownerPassword: '',
      permissions: {
        printing: 'highResolution',
        modifying: false,
        copying: false,
        annotating: false,
        fillingForms: true,
        contentAccessibility: true,
        documentAssembly: false
      },
      encryptionLevel: '128'
    });
    setPasswordStrength('weak');
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

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start">
          <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">Enhanced PDF Security</h3>
            <ul className="list-disc list-inside text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>Advanced encryption with AES-128 or AES-256</li>
              <li>Separate user and owner passwords for better control</li>
              <li>Granular permission settings (printing, editing, copying)</li>
              <li>Password strength validation for maximum security</li>
              <li>Professional-grade protection for sensitive documents</li>
            </ul>
          </div>
        </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Password Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Password Settings</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                  User Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={settings.userPassword}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg pr-10"
                    placeholder="Enter user password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {settings.userPassword && (
                  <div className={`flex items-center mt-1 text-sm ${getPasswordStrengthColor()}`}>
                    {passwordStrength === 'strong' ? (
                      <CheckCircle className="w-4 h-4 mr-1" />
                    ) : (
                      <AlertCircle className="w-4 h-4 mr-1" />
                    )}
                    {getPasswordStrengthText()}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                  Owner Password (Optional)
                </label>
                <div className="relative">
                  <input
                    type={showOwnerPassword ? 'text' : 'password'}
                    value={settings.ownerPassword}
                    onChange={(e) => handlePasswordChange(e.target.value, true)}
                    className="w-full p-2 border border-gray-300 rounded-lg pr-10"
                    placeholder="Enter owner password (optional)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showOwnerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Owner password provides full access to modify permissions
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                  Encryption Level
                </label>
                <select
                  value={settings.encryptionLevel}
                  onChange={(e) => setSettings(prev => ({ ...prev, encryptionLevel: e.target.value as '128' | '256' }))}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="128">AES-128 (Standard)</option>
                  <option value="256">AES-256 (Maximum Security)</option>
                </select>
              </div>
            </div>

            {/* Permission Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Permission Settings</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                  Printing
                </label>
                <select
                  value={settings.permissions.printing}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    permissions: { ...prev.permissions, printing: e.target.value as any }
                  }))}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="highResolution">High Resolution</option>
                  <option value="lowResolution">Low Resolution</option>
                  <option value="none">Not Allowed</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-white">
                  Document Permissions
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.permissions.modifying}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        permissions: { ...prev.permissions, modifying: e.target.checked }
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-white">Allow modifications</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.permissions.copying}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        permissions: { ...prev.permissions, copying: e.target.checked }
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-white">Allow copying content</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.permissions.annotating}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        permissions: { ...prev.permissions, annotating: e.target.checked }
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-white">Allow annotations</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.permissions.fillingForms}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        permissions: { ...prev.permissions, fillingForms: e.target.checked }
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-white">Allow form filling</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.permissions.contentAccessibility}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        permissions: { ...prev.permissions, contentAccessibility: e.target.checked }
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-white">Allow accessibility features</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleLock}
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Encrypting...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  Lock PDF
                </>
              )}
            </button>

            {result && (
              <button
                onClick={handleDownload}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
              >
                <Download className="w-5 h-5 mr-2" />
                Download Protected PDF
              </button>
            )}
          </div>
        </>
      )}

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 dark:text-white">More PDF Tools</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/pdf-tools?tab=unlock"
            className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200"
          >
            <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
              <FileText className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-white">
              Unlock PDF
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}