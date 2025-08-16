import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Loader2, X, FileSignature, Type, Image, Trash2, Plus, Move, RotateCw } from 'lucide-react';
import { PDFDocument, rgb } from 'pdf-lib';
import SignatureCanvas from 'react-signature-canvas';
import { validateFile, ALLOWED_PDF_TYPES, createSecureObjectURL, createSecureDownloadLink, revokeBlobUrl, safeDownload } from '../../utils/security';
import { Link } from 'react-router-dom';

interface PDFFile {
  file: File;
  preview?: string;
}

interface Signature {
  id: string;
  type: 'draw' | 'type' | 'upload';
  content: string; // Data URL for draw/upload, text for type
  name: string;
  page: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number;
}

type SignatureType = 'draw' | 'type' | 'upload';

export function SignPDF() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [signatureRef, setSignatureRef] = useState<SignatureCanvas | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [activeSignatureType, setActiveSignatureType] = useState<SignatureType>('draw');
  const [textSignature, setTextSignature] = useState('');
  const [signatureName, setSignatureName] = useState('');
  const [selectedSignature, setSelectedSignature] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setSignatures([]);

    // Get total pages
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const pdfDoc = await PDFDocument.load(reader.result as ArrayBuffer);
        setTotalPages(pdfDoc.getPageCount());
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

  const clearSignature = () => {
    if (signatureRef) {
      signatureRef.clear();
    }
  };

  const saveSignature = () => {
    if (signatureRef && !signatureRef.isEmpty()) {
      const signatureData = signatureRef.toDataURL('image/png');
      const newSignature: Signature = {
        id: Date.now().toString(),
        type: 'draw',
        content: signatureData,
        name: signatureName || `Signature ${signatures.length + 1}`,
        page: 1,
        position: { x: 50, y: 50 },
        size: { width: 200, height: 100 },
        rotation: 0
      };
      setSignatures(prev => [...prev, newSignature]);
      setSignatureName('');
      clearSignature();
    }
  };

  const saveTextSignature = () => {
    if (textSignature.trim()) {
      const newSignature: Signature = {
        id: Date.now().toString(),
        type: 'type',
        content: textSignature,
        name: signatureName || `Text Signature ${signatures.length + 1}`,
        page: 1,
        position: { x: 50, y: 50 },
        size: { width: 200, height: 50 },
        rotation: 0
      };
      setSignatures(prev => [...prev, newSignature]);
      setTextSignature('');
      setSignatureName('');
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newSignature: Signature = {
          id: Date.now().toString(),
          type: 'upload',
          content: e.target?.result as string,
          name: signatureName || file.name,
          page: 1,
          position: { x: 50, y: 50 },
          size: { width: 200, height: 100 },
          rotation: 0
        };
        setSignatures(prev => [...prev, newSignature]);
        setSignatureName('');
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSignature = (id: string) => {
    setSignatures(prev => prev.filter(sig => sig.id !== id));
    if (selectedSignature === id) {
      setSelectedSignature(null);
    }
  };

  const updateSignature = (id: string, updates: Partial<Signature>) => {
    setSignatures(prev => prev.map(sig => 
      sig.id === id ? { ...sig, ...updates } : sig
    ));
  };

  const handleSignPDF = async () => {
    if (files.length !== 1 || signatures.length === 0) {
      setError('Please select a PDF file and add at least one signature');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const pdfBytes = await files[0].file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      
      // Group signatures by page
      const signaturesByPage = signatures.reduce((acc, sig) => {
        if (!acc[sig.page - 1]) acc[sig.page - 1] = [];
        acc[sig.page - 1].push(sig);
        return acc;
      }, {} as Record<number, Signature[]>);

      // Add signatures to each page
      for (const [pageIndex, pageSignatures] of Object.entries(signaturesByPage)) {
        const page = pages[parseInt(pageIndex)];
        const { width, height } = page.getSize();

        for (const signature of pageSignatures) {
          const { x, y } = signature.position;
          const { width: sigWidth, height: sigHeight } = signature.size;

          // Convert position from percentage to actual coordinates
          const actualX = (x / 100) * width;
          const actualY = height - ((y / 100) * height) - sigHeight; // Flip Y coordinate

          if (signature.type === 'draw' || signature.type === 'upload') {
            // Handle image signatures
            const signatureBytes = await fetch(signature.content).then(res => res.arrayBuffer());
            const signatureImage = await pdfDoc.embedPng(signatureBytes);
            
            page.drawImage(signatureImage, {
              x: actualX,
              y: actualY,
              width: sigWidth,
              height: sigHeight,
            });
          } else if (signature.type === 'type') {
            // Handle text signatures
            const fontSize = Math.min(sigHeight, 24);
            page.drawText(signature.content, {
              x: actualX,
              y: actualY + sigHeight,
              size: fontSize,
              color: rgb(0, 0, 0),
            });
          }
        }
      }

      const signedPdfBytes = await pdfDoc.save();
      const blob = new Blob([signedPdfBytes], { type: 'application/pdf' });

      if (result) revokeBlobUrl(result);
      const newResult = createSecureObjectURL(blob);
      setResult(newResult);
      setResultBlob(blob);

    } catch (err) {
      setError('Error signing PDF. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!resultBlob) return;

    try {
      const originalName = files[0].file.name.replace('.pdf', '');
      safeDownload(resultBlob, `${originalName}_signed.pdf`);
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
    setSignatures([]);
    setSelectedSignature(null);
    if (signatureRef) signatureRef.clear();
    setTotalPages(0);
    setTextSignature('');
    setSignatureName('');
  }, [files, result, signatureRef]);

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

      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
        <div className="flex items-start">
          <FileSignature className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200 mb-2">Advanced E-Sign PDF</h3>
            <ul className="list-disc list-inside text-sm text-purple-700 dark:text-purple-300 space-y-1">
              <li>Multiple signature types: Draw, Type, or Upload image</li>
              <li>Add multiple signatures to different pages</li>
              <li>Precise positioning and sizing controls</li>
              <li>Professional digital signature creation</li>
              <li>Secure processing - files never leave your browser</li>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Signature Creation */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Create Signature</h3>
              
              {/* Signature Type Tabs */}
              <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setActiveSignatureType('draw')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    activeSignatureType === 'draw'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Draw
                </button>
                <button
                  onClick={() => setActiveSignatureType('type')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    activeSignatureType === 'type'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Type
                </button>
                <button
                  onClick={() => setActiveSignatureType('upload')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    activeSignatureType === 'upload'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Upload
                </button>
              </div>

              {/* Signature Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                  Signature Name
                </label>
                <input
                  type="text"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="Enter signature name"
                />
              </div>

              {/* Draw Signature */}
              {activeSignatureType === 'draw' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-white">
                    Draw Your Signature
                  </label>
                  <div className="border-2 border-gray-300 rounded-lg bg-white">
                    <SignatureCanvas
                      ref={(ref) => setSignatureRef(ref)}
                      canvasProps={{
                        className: 'signature-canvas w-full h-40',
                        style: { width: '100%', height: '160px' }
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={clearSignature}
                      className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                    >
                      Clear
                    </button>
                    <button
                      onClick={saveSignature}
                      disabled={!signatureRef || signatureRef.isEmpty()}
                      className="px-3 py-1 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Save Signature
                    </button>
                  </div>
                </div>
              )}

              {/* Type Signature */}
              {activeSignatureType === 'type' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-white">
                    Type Your Signature
                  </label>
                  <input
                    type="text"
                    value={textSignature}
                    onChange={(e) => setTextSignature(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg text-center text-2xl font-cursive"
                    placeholder="Type your signature here"
                  />
                  <button
                    onClick={saveTextSignature}
                    disabled={!textSignature.trim()}
                    className="w-full px-3 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Save Text Signature
                  </button>
                </div>
              )}

              {/* Upload Signature */}
              {activeSignatureType === 'upload' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-white">
                    Upload Signature Image
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 transition-colors flex items-center justify-center"
                  >
                    <Image className="w-5 h-5 mr-2" />
                    Choose Image
                  </button>
                </div>
              )}
            </div>

            {/* Signature Management */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Manage Signatures</h3>
              
              {signatures.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileSignature className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No signatures created yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {signatures.map((signature) => (
                    <div
                      key={signature.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedSignature === signature.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedSignature(signature.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {signature.type === 'draw' || signature.type === 'upload' ? (
                            <img
                              src={signature.content}
                              alt={signature.name}
                              className="w-12 h-8 object-contain border border-gray-200 rounded"
                            />
                          ) : (
                            <div className="w-12 h-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center text-xs">
                              {signature.content}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{signature.name}</p>
                            <p className="text-sm text-gray-500 capitalize">{signature.type} signature</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSignature(signature.id);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Signature Settings */}
              {selectedSignature && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Signature Settings</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400">Page</label>
                      <input
                        type="number"
                        min="1"
                        max={totalPages}
                        value={signatures.find(s => s.id === selectedSignature)?.page || 1}
                        onChange={(e) => updateSignature(selectedSignature, { page: parseInt(e.target.value) || 1 })}
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400">X Position (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={signatures.find(s => s.id === selectedSignature)?.position.x || 0}
                          onChange={(e) => updateSignature(selectedSignature, { 
                            position: { 
                              ...signatures.find(s => s.id === selectedSignature)?.position || { x: 0, y: 0 },
                              x: parseInt(e.target.value) || 0 
                            } 
                          })}
                          className="w-full p-2 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400">Y Position (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={signatures.find(s => s.id === selectedSignature)?.position.y || 0}
                          onChange={(e) => updateSignature(selectedSignature, { 
                            position: { 
                              ...signatures.find(s => s.id === selectedSignature)?.position || { x: 0, y: 0 },
                              y: parseInt(e.target.value) || 0 
                            } 
                          })}
                          className="w-full p-2 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSignPDF}
              disabled={loading || signatures.length === 0}
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Signing PDF...
                </>
              ) : (
                <>
                  <FileSignature className="w-5 h-5 mr-2" />
                  Sign PDF ({signatures.length} signature{signatures.length !== 1 ? 's' : ''})
                </>
              )}
            </button>

            {result && (
              <button
                onClick={handleDownload}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
              >
                <Download className="w-5 h-5 mr-2" />
                Download Signed PDF
              </button>
            )}
          </div>
        </>
      )}

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 dark:text-white">More PDF Tools</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/pdf-tools?tab=create"
            className="group flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 transition-all duration-200"
          >
            <div className="bg-indigo-100 rounded-full p-2 mr-3 group-hover:bg-indigo-200 transition-colors">
              <FileSignature className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-sm sm:text-base text-gray-700 group-hover:text-indigo-800 dark:text-white">
              Create PDF
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}