import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, FilePlus, Split, Images, Pencil, Stamp } from 'lucide-react';
import { SEOHeaders } from './SEOHeaders';
import { AdComponent } from './AdComponent';
import { CreatePDF } from './pdf/CreatePDF';
import { MergePDF } from './pdf/MergePDF';
import { SplitPDF } from './pdf/SplitPDF';
import { PDFToImages } from './pdf/PDFToImages';
import { CompressPDF } from './pdf/CompressPDF';
import { PDFToExcel } from './pdf/PDFToExcel';
import { PDFToWord } from './pdf/PDFToWord';
import { WordToPDF } from './pdf/WordToPDF';
import { ExcelToPDF } from './pdf/ExcelToPDF';
import { EditPDF } from './pdf/EditPDF';
import { WatermarkPDF } from './pdf/WatermarkPDF';

const tabs = [
  { id: 'create', label: 'Create PDF', icon: FileText },
  { id: 'merge', label: 'Merge PDFs', icon: FilePlus },
  { id: 'split', label: 'Split PDF', icon: Split },
  { id: 'edit', label: 'Edit PDF', icon: Pencil },
  { id: 'watermark', label: 'Add Watermark', icon: Stamp },
  { id: 'to-images', label: 'PDF to Images', icon: Images },
  { id: 'compress', label: 'Compress PDF', icon: FileText },
  { id: 'to-excel', label: 'PDF to Excel', icon: FileText },
  { id: 'to-word', label: 'PDF to Word', icon: FileText },
  { id: 'word-to-pdf', label: 'Word to PDF', icon: FileText },
  { id: 'excel-to-pdf', label: 'Excel to PDF', icon: FileText },
];

export function PDFTools() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'create');

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'create':
        return <CreatePDF />;
      case 'merge':
        return <MergePDF />;
      case 'split':
        return <SplitPDF />;
      case 'edit':
        return <EditPDF />;
      case 'watermark':
        return <WatermarkPDF />;
      case 'to-images':
        return <PDFToImages />;
      case 'compress':
        return <CompressPDF />;
      case 'to-excel':
        return <PDFToExcel />;
      case 'to-word':
        return <PDFToWord />;
      case 'word-to-pdf':
        return <WordToPDF />;
      case 'excel-to-pdf':
        return <ExcelToPDF />;
      default:
        return <CreatePDF />;
    }
  };

  return (
    <>
      <SEOHeaders 
        title="Free Online PDF Tools: Merge, Split, Compress, Convert Easy"  // 60 characters
        description="Free online PDF tools to merge, split, compress, convert PDFs to Excel, Word,  JPG, or from Word/Excel to PDF easily. No sign-up required."  // 130 characters
        keywords={[
          'pdfcircle',
          'free online pdf merger tool',
          'split pdf online free tool',
          'compress pdf online free fast',
          'convert pdf to jpg online free',
          'merge pdf files free online',
          'combine pdf files online free',
          'pdf splitter free online tool',
          'reduce pdf size online free',
          'pdf compressor free online',
          'pdf to image converter free',
          'pdf to excel converter online',
          'pdf to word converter free tool',
          'word to pdf converter online free',
          'excel to pdf converter free online',
          'edit pdf online free no sign up',
          'add watermark to pdf free online',
          'free pdf merge and split tool',
          'online pdf compressor no limit',
          'pdf to jpg converter free tool',
          'merge multiple pdfs online free',
          'split pdf pages free online',
          'compress large pdf online free',
          'convert pdf to word free online',
          'pdf to excel free online tool',
          'word to pdf free converter',
          'excel to pdf online free tool',
          'free pdf editing tool online',
          'pdf watermark adder free',
          'merge pdf documents online free',
          'split pdf file online free',
          'reduce pdf file size free tool',
          'pdf compression online free',
          'convert pdf to image free online',
          'pdf to word online free converter',
          'word to pdf online free tool',
          'excel to pdf free converter',
          'free online pdf editor tool',
          'add watermark pdf online free',
          'merge pdfs free online tool',
          'split pdf online no sign up',
          'compress pdf free online tool',
          'pdf to jpg free online converter',
          'combine pdfs online free tool',
          'pdf splitter online free fast',
          'reduce pdf size free online',
          'pdf compressor online free tool',
         'pdf to image free converter',
         'pdf to excel online free tool',
         'word to pdf free online converter',
         'excel to pdf online free fast'
        ]}
      />
      <div className="max-w-4xl  mx-auto px-4 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8 text-center">
          PDF Tools
        </h1>

        <AdComponent
          slot="pdf-tools-top"
          className="mb-6"
          style={{ minHeight: '90px' }}
        />

        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2 dark:bg-gray-900 dark:text-white rounded-lg text-sm font-medium transition-colors
                ${activeTab === tab.id
                  ? 'bg-indigo-600 text-white dark:bg-indigo-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-900  rounded-xl shadow-lg p-4 sm:p-6">
          {renderActiveComponent()}
        </div>
      </div>
    </>
  );
}