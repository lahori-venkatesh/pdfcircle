
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Loader2, X, FileText } from 'lucide-react';

export function CompressPDF() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [resultBlob, setResultBlob] = useState(null);
  const [previewSize, setPreviewSize] = useState({ original: null, compressed: null });

  // Handle file drop
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 1) {
      setError('Please select only one PDF file');
      return;
    }
    const file = acceptedFiles[0];
    if (!file.type.includes('pdf')) {
      setError('Please upload a PDF file');
      return;
    }
    setFiles([{ file, preview: URL.createObjectURL(file) }]);
    setPreviewSize({ original: file.size, compressed: null });
    setResult(null);
    setResultBlob(null);
    setError(null);
    setProgress(0);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  // Compress PDF by calling the backend API
  const handleCompressPDF = async () => {
    if (files.length !== 1) {
      setError('Please select one PDF file');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      const file = files[0].file;
      const formData = new FormData();
      formData.append('pdf', file);

      // Simulate progress (since backend doesn't stream progress)
      setProgress(25);

      const response = await fetch('http://localhost:3000/api/compress-pdf', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_API_KEY}`,
        },
        body: formData,
      });

      setProgress(50);

      if (!response.ok) {
        throw new Error('Failed to compress PDF');
      }

      const blob = await response.blob();
      const compressedSize = blob.size;
      const newResult = URL.createObjectURL(blob);

      setProgress(75);

      setResult(newResult);
      setResultBlob(blob);
      setPreviewSize({ original: file.size, compressed: compressedSize });
      setProgress(100);
    } catch (err) {
      console.error('Compression error:', err);
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Handle download of compressed file
  const handleDownload = () => {
    if (!resultBlob) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = 'compressed.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset state
  const resetFiles = useCallback(() => {
    files.forEach((file) => file.preview && URL.revokeObjectURL(file.preview));
    if (result) URL.revokeObjectURL(result);
    setFiles([]);
    setResult(null);
    setResultBlob(null);
    setError(null);
    setPreviewSize({ original: null, compressed: null });
    setProgress(0);
  }, [files, result]);

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes === null) return 'Processing...';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Calculate reduction percentage
  const calculateReduction = () => {
    if (!previewSize.original || !previewSize.compressed) return 0;
    const reduction = ((previewSize.original - previewSize.compressed) / previewSize.original) * 100;
    return Math.round(reduction);
  };

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
              <button onClick={resetFiles} className="text-gray-500 hover:text-gray-700" title="Remove file">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <span className="text-gray-700">{files[0].file.name}</span>
            </div>
          </div>

          <div className="space-y-4">
            {loading && (
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
                <p className="text-sm text-gray-600 mt-1">Compressing: {progress}%</p>
              </div>
            )}

            {previewSize.original && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Original Size:</span>
                  <span className="font-medium">{formatFileSize(previewSize.original)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Compressed Size:</span>
                  <span className="font-medium">{formatFileSize(previewSize.compressed)}</span>
                </div>
                {calculateReduction() > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Reduction:</span>
                    <span className="font-medium text-green-600">{calculateReduction()}%</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleCompressPDF}
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Compressing...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5 mr-2" />
                  Compress PDF
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
  
