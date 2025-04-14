import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FileText, FilePlus, Split, Images, Stamp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SEOHeaders } from './SEOHeaders';
import { AdComponent } from './AdComponent';
import { CreatePDF } from './pdf/CreatePDF';
import { MergePDF } from './pdf/MergePDF';
import { SplitPDF } from './pdf/SplitPDF';
import { PDFToImages } from './pdf/PDFToImages';
import { WatermarkPDF } from './pdf/WatermarkPDF';

const tabs = [
  { id: 'create', label: 'Create PDF', icon: FileText },
  { id: 'merge', label: 'Merge PDFs', icon: FilePlus },
  { id: 'split', label: 'Split PDF', icon: Split },
  { id: 'watermark', label: 'Add Watermark', icon: Stamp },
  { id: 'to-images', label: 'PDF to Images', icon: Images },
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
          'Create PDFs, add watermarks on pdfs, Merge, split, compress, and convert PDFs to images with pdfCircle’s free online tools. No sign-up needed.'
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
        {/* Hero Section with H1 */}
        <section className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t('pdfTools.title', 'Free Online PDF Tools')}
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            {t(
              'pdfTools.subtitle',
              'Effortlessly Create PDFs, add watermarks on PDFs, merge, split, compress, and convert your PDFs with pdfCircle’s secure, no-sign-up tools.'
            )}
          </p>
        </section>

        <AdComponent slot="pdf-tools-top" className="mb-6" style={{ minHeight: '90px' }} />

        {/* Tools Navigation with H2 */}
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

        {/* Additional Information and Links */}
        <section className="mt-8 text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {t('pdfTools.info', 'Need more PDF solutions? Explore our ')}
            <Link to="/" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              {t('pdfTools.homeLink', 'homepage')}
            </Link>
            {t('pdfTools.or', ' or ')}
            <Link to="/image-tools" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              {t('pdfTools.imageToolsLink', 'image tools')}
            </Link>
            {t('pdfTools.forMore', ' for additional features.')}
          </p>
          <p className="text-gray-600 dark:text-gray-300">
            {t('pdfTools.externalInfo', 'Learn advanced PDF tips from ')}
            <a
              href="https://www.adobe.com/acrobat/resources.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {t('pdfTools.adobeLink', 'Adobe Acrobat Resources')}
            </a>.
          </p>
        </section>
      </div>
    </>
  );
}