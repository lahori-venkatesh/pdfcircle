import React from 'react';
import { Clock } from 'lucide-react';

export function WordToPDF() {
  return (
    <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-6 rounded-lg text-center">
      <Clock className="w-12 h-12 text-blue-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">Word to PDF Coming Soon!</h3>
      <p>
        We're working on bringing you Word to PDF conversion capabilities. Stay tuned for updates!
      </p>
    </div>
  );
}
/* import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Loader2, X, FileText } from 'lucide-react';

export function WordToPDF() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [resultBlob, setResultBlob] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 1) {
      setError('Please select only one Word file');
      return;
    }
    const file = acceptedFiles[0];
    if (!file.type.includes('wordprocessingml')) {
      setError('Please upload a Word file (.docx)');
      return;
    }
    setFiles([{ file, preview: URL.createObjectURL(file) }]);
    setResult(null);
    setResultBlob(null);
    setError(null);
    setProgress(0);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
    multiple: false,
  });

  const handleConvert = async () => {
    if (files.length !== 1) {
      setError('Please select one Word file');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      const file = files[0].file;
      const formData = new FormData();
      formData.append('word', file);

      setProgress(25);

      const response = await fetch('http://localhost:3000/api/word-to-pdf', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_API_KEY}`,
        },
        body: formData,
      });

      setProgress(50);

      if (!response.ok) {
        throw new Error('Failed to convert Word to PDF');
      }

      const blob = await response.blob();
      const newResult = URL.createObjectURL(blob);

      setProgress(75);

      setResult(newResult);
      setResultBlob(blob);
      setProgress(100);
    } catch (err) {
      console.error('Conversion error:', err);
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = 'converted.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFiles = useCallback(() => {
    files.forEach((file) => file.preview && URL.revokeObjectURL(file.preview));
    if (result) URL.revokeObjectURL(result);
    setFiles([]);
    setResult(null);
    setResultBlob(null);
    setError(null);
    setProgress(0);
  }, [files, result]);

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
          {isDragActive ? 'Drop the Word file here' : 'Drag & drop a Word file here, or tap to select'}
        </p>
        <p className="text-sm text-gray-500 mt-2">Supports .docx files</p>
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

          {loading && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
              <p className="text-sm text-gray-600 mt-1">Converting: {progress}%</p>
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
              disabled={loading}
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
        </>
      )}
    </div>
  );
}*/