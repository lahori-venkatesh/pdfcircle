import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FileText, FilePlus, Split, Images, Stamp, FileSignature, FileSearch, FileCode2, FileKey, GitCompare, FileEdit, FileLock, Unlock, Table } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SEOHeaders } from './SEOHeaders';
import { AdComponent } from './AdComponent';
import { CreatePDF } from './pdf/CreatePDF';
import { MergePDF } from './pdf/MergePDF';
import { SplitPDF } from './pdf/SplitPDF';
import { PDFToImages } from './pdf/PDFToImages';
import { WatermarkPDF } from './pdf/WatermarkPDF';
import { SignPDF } from './pdf/SignPDF';
import { PDFToWord } from './pdf/PDFToWord';
import { PDFToExcel } from './pdf/PDFToExcel';
import { HTMLToPDF } from './pdf/HTMLToPDF';
import { OCRPDF } from './pdf/OCRPDF';
import { ComparePDFs } from './pdf/ComparePDFs';
import { EditPDF } from './pdf/EditPDF';
import { LockPDF } from './pdf/LockPDF';
import { UnlockPDF } from './pdf/UnlockPDF';
import { BankStatementPDF } from './pdf/BankStatementPDF';

const tabs = [
  { id: 'create', label: 'Create PDF', icon: FileText },
  { id: 'merge', label: 'Merge PDFs', icon: FilePlus },
  { id: 'split', label: 'Split PDF', icon: Split },
  { id: 'watermark', label: 'Add Watermark', icon: Stamp },
  { id: 'to-images', label: 'PDF to Images', icon: Images },
  { id: 'bank-statement', label: 'Bank Statement', icon: Table },
  { id: 'sign', label: 'E-Sign PDF', icon: FileSignature },
  { id: 'to-word', label: 'PDF to Word', icon: FileText },
  { id: 'to-excel', label: 'PDF to Excel', icon: FileSearch },
  { id: 'from-html', label: 'HTML to PDF', icon: FileCode2 },
  { id: 'ocr', label: 'OCR PDF', icon: FileKey },
  { id: 'compare', label: 'Compare PDFs', icon: GitCompare },
  { id: 'edit', label: 'Edit PDF', icon: FileEdit },
  { id: 'lock', label: 'Lock PDF', icon: FileLock },
  { id: 'unlock', label: 'Unlock PDF', icon: Unlock },
];

export function PDFTools({ isLoggedIn }: { isLoggedIn: boolean }) {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'create');

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'create':
        return <CreatePDF isLoggedIn={isLoggedIn} />;
      case 'merge':
        return <MergePDF />;
      case 'split':
        return <SplitPDF />;
      case 'watermark':
        return <WatermarkPDF />;
      case 'to-images':
        return <PDFToImages isLoggedIn={isLoggedIn} />;
      case 'compress':
        return <CompressPDF />;
      case 'bank-statement':
        return <BankStatementPDF />;
      case 'sign':
        return <SignPDF />;
      case 'to-word':
        return <PDFToWord />;
      case 'to-excel':
        return <PDFToExcel />;
      case 'from-html':
        return <HTMLToPDF />;
      case 'ocr':
        return <OCRPDF />;
      case 'compare':
        return <ComparePDFs />;
      case 'edit':
        return <EditPDF />;
      case 'lock':
        return <LockPDF />;
      case 'unlock':
        return <UnlockPDF />;
      default:
        return <CreatePDF isLoggedIn={isLoggedIn} />;
    }
  };

  return (
    <>
      <SEOHeaders
        title={t('seo.pdfTools.title', 'Free Online PDF Tools: Merge, Split, Compress, Convert')}
        description={t(
          'seo.pdfTools.description',
          'Create PDFs, add watermarks on PDFs, Merge, split, compress, and convert PDFs to images with pdfCircle\'s free online tools. No sign-up needed.'
        )}
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
          'edit pdf online free no sign up',
          'add watermark to pdf free online',
          'free pdf merge and split tool',
          'online pdf compressor no limit',
          'pdf to jpg converter free tool',
          'merge multiple pdfs online free',
          'split pdf pages free online',
          'compress large pdf online free',
          'free pdf editing tool online',
          'pdf watermark adder free',
          'merge pdf documents online free',
          'split pdf file online free',
          'reduce pdf file size free tool',
          'pdf compression online free',
          'convert pdf to image free online',
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
        ]}
        canonicalUrl="https://pdfcircle.com/pdf-tools"
      />

      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        <section className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t('pdfTools.title', 'Free Online PDF Tools')}
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            {t(
              'pdfTools.subtitle',
              'Effortlessly Create PDFs, add watermarks on PDFs, merge, split, compress, and convert your PDFs with pdfCircle\'s secure, no-sign-up tools.'
            )}
          </p>
        </section>

        <AdComponent
          slot="4325618154"
          adSize="leaderboard"
          refreshInterval={30}
          className="my-4"
        />

        <section>
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white mb-6 sm:mb-8 text-center">
            {t('pdfTools.toolsTitle', 'Choose Your PDF Tool')}
          </h2>
          <div className="flex flex-wrap gap-2 mb-6 justify-center">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 dark:bg-gray-900 dark:text-white rounded-lg text-sm font-medium transition-colors
                  ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white dark:bg-indigo-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {t(`pdfTools.tabs.${tab.id}`, tab.label)}
              </button>
            ))}
          </div>
          
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-4 sm:p-6">
            {renderActiveComponent()}
          </div>
        </section>
      </div>
    </>
  );
}

export default PDFTools;