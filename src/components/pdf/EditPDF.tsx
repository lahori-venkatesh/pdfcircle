import React from 'react';
import { Clock } from 'lucide-react';

export function EditPDF() {
  return (
    <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-6 rounded-lg text-center">
      <Clock className="w-12 h-12 text-blue-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">PDF Editing Coming Soon!</h3>
      <p>
        We're working on bringing you PDF editing capabilities. Stay tuned for updates!
      </p>
    </div>
  );
}
/* import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Loader2, X, FileText } from 'lucide-react';

export function EditPDF() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [resultBlob, setResultBlob] = useState(null);
  const [pagesToRemove, setPagesToRemove] = useState(''); // e.g., "1, 3-5"

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
    setResult(null);
    setResultBlob(null);
    setError(null);
    setProgress(0);
    setPagesToRemove('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  const handleEditPDF = async () => {
    if (files.length !== 1) {
      setError('Please select one PDF file');
      return;
    }
    if (!pagesToRemove.trim()) {
      setError('Please specify pages to remove (e.g., "1, 3-5")');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      const file = files[0].file;
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('pages', pagesToRemove);

      setProgress(25);

      const response = await fetch('http://localhost:3000/api/edit-pdf', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_API_KEY}`,
        },
        body: formData,
      });

      setProgress(50);

      if (!response.ok) {
        throw new Error('Failed to edit PDF');
      }

      const blob = await response.blob();
      const newResult = URL.createObjectURL(blob);

      setProgress(75);

      setResult(newResult);
      setResultBlob(blob);
      setProgress(100);
    } catch (err) {
      console.error('Edit error:', err);
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = 'edited.pdf';
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
    setPagesToRemove('');
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
          {isDragActive ? 'Drop the PDF file here' : 'Drag & drop a PDF file here, or tap to select'}
        </p>
        <p className="text-sm text-gray-500 mt-2">Supports .pdf files</p>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pages to Remove (e.g., "1, 3-5")
              </label>
              <input
                type="text"
                value={pagesToRemove}
                onChange={(e) => setPagesToRemove(e.target.value)}
                placeholder="Enter page numbers"
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
              />
              <p className="mt-1 text-sm text-gray-500">
                Specify pages to remove (e.g., "1" or "1, 3-5" for pages 1 and 3 through 5).
              </p>
            </div>

            {loading && (
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
                <p className="text-sm text-gray-600 mt-1">Editing: {progress}%</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleEditPDF}
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Editing...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5 mr-2" />
                  Edit PDF
                </>
              )}
            </button>

            {result && (
              <button
                onClick={handleDownload}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
              >
                <Download className="w-5 h-5 mr-2" />
                Download Edited PDF
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}*/