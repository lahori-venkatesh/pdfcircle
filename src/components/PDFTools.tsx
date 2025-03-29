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
        title="Free Online PDF Tools - Merge, Split, Convert, Compress, Excel & Word"
        description="Convert PDFs to Excel, Word, images, merge, split, compress, and convert Word/Excel to PDF online for free. No registration required."
        keywords={[
          'merge pdf files free',
          'split pdf online',
          'compress pdf size',
          'convert pdf to jpg',
          'pdf merger online',
          'combine pdf files',
          'pdf splitter free',
          'reduce pdf file size',
          'pdf compression tool',
          'pdf to image converter',
          'pdf to excel converter',
          'pdf to word converter',
          'word to pdf converter',
          'excel to pdf converter',
          'edit pdf online',
          'add watermark to pdf'
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