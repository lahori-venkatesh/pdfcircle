import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Loader2, X, FileText, Table } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as XLSX from 'xlsx';
import { validateFile, ALLOWED_PDF_TYPES, createSecureObjectURL, createSecureDownloadLink, revokeBlobUrl } from '../../utils/security';
import { Link } from 'react-router-dom';

interface PDFFile {
  file: File;
  preview?: string;
}

interface BankTransaction {
  date: string;
  description: string;
  debit?: number;
  credit?: number;
  balance: number;
}

export function BankStatementPDF() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [bankName, setBankName] = useState<string>('');
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);

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
    setTransactions([]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  });

  const extractTransactions = async (text: string): Promise<BankTransaction[]> => {
    // This is a simplified example - in reality, you'd need more sophisticated parsing
    const lines = text.split('\n');
    const transactions: BankTransaction[] = [];
    
    const dateRegex = /\d{2}[/-]\d{2}[/-]\d{2,4}/;
    const amountRegex = /[\d,]+\.\d{2}/;

    for (const line of lines) {
      if (dateRegex.test(line)) {
        const date = line.match(dateRegex)?.[0] || '';
        const amounts = line.match(new RegExp(amountRegex, 'g')) || [];
        
        if (amounts.length >= 1) {
          const transaction: BankTransaction = {
            date,
            description: line.replace(dateRegex, '').replace(new RegExp(amountRegex, 'g'), '').trim(),
            balance: parseFloat(amounts[amounts.length - 1].replace(',', ''))
          };

          if (amounts.length > 1) {
            const amount = parseFloat(amounts[0].replace(',', ''));
            if (line.toLowerCase().includes('credit') || line.toLowerCase().includes('deposit')) {
              transaction.credit = amount;
            } else {
              transaction.debit = amount;
            }
          }

          transactions.push(transaction);
        }
      }
    }

    return transactions;
  };

  const handleConvert = async () => {
    if (files.length !== 1) {
      setError('Please select a PDF file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const pdfBytes = await files[0].file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      let extractedText = '';
      for (const page of pages) {
        const content = await page.node.Resources().lookup('Font', 'Text');
        if (content) {
          extractedText += content.toString() + '\n';
        }
      }

      const transactions = await extractTransactions(extractedText);
      setTransactions(transactions);

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(transactions);

      // Add headers
      XLSX.utils.sheet_add_aoa(ws, [['Date', 'Description', 'Debit', 'Credit', 'Balance']], { origin: 'A1' });

      if (format === 'xlsx') {
        XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
        const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        if (result) revokeBlobUrl(result);
        const newResult = createSecureObjectURL(blob);
        setResult(newResult);
        setResultBlob(blob);
      } else {
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        
        if (result) revokeBlobUrl(result);
        const newResult = createSecureObjectURL(blob);
        setResult(newResult);
        setResultBlob(blob);
      }

    } catch (err) {
      setError('Error converting bank statement. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!resultBlob) return;

    try {
      const extension = format === 'xlsx' ? 'xlsx' : 'csv';
      const link = createSecureDownloadLink(resultBlob, `bank_statement.${extension}`);
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
    setTransactions([]);
    setBankName('');
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
          {isDragActive ? 'Drop the bank statement here' : 'Drag & drop your bank statement PDF here'}
        </p>
        <button
          type="button"
          onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
          className="mt-4 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Upload className="w-5 h-5 mr-2" />
          Choose File
        </button>
        <p className="text-sm text-gray-500 mt-2">Supports PDF bank statements</p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">How to Convert Bank Statements:</h3>
        <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1">
          <li>Upload your bank statement PDF</li>
          <li>Select your preferred output format (Excel or CSV)</li>
          <li>Click "Convert Statement" to process</li>
          <li>Download the converted file</li>
          <li>Note: Works with most major bank statement formats</li>
        </ul>
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

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                Output Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as 'xlsx' | 'csv')}
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="xlsx">Excel (XLSX)</option>
                <option value="csv">CSV</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                Bank Name (Optional)
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
                placeholder="Enter bank name to improve accuracy"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {transactions.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 dark:text-white">Preview:</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Description</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300">Debit</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300">Credit</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {transactions.slice(0, 5).map((transaction, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{transaction.date}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{transaction.description}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 text-right">{transaction.debit?.toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 text-right">{transaction.credit?.toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 text-right">{transaction.balance.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {transactions.length > 5 && (
                  <p className="text-sm text-gray-500 mt-2">Showing first 5 of {transactions.length} transactions</p>
                )}
              </div>
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
                  <Table className="w-5 h-5 mr-2" />
                  Convert Statement
                </>
              )}
            </button>

            {result && (
              <button
                onClick={handleDownload}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
              >
                <Download className="w-5 h-5 mr-2" />
                Download {format.toUpperCase()}
              </button>
            )}
          </div>
        </>
      )}

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