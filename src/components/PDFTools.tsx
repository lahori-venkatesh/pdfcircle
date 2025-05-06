import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FileText, FilePlus, Split, Images, Stamp, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SEOHeaders } from './SEOHeaders';
import { AdComponent, StickyBottomAd } from './AdComponent';
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
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

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

  const faqData = [
    {
      question: "What can I do with pdfCircle’s PDF Tools?",
      answer: "Use our tools to create PDFs from scratch, merge multiple PDFs into one, split a PDF into separate pages, add watermarks for branding, or convert PDFs to JPEG/PNG images."
    },
    {
      question: "How do I create a PDF from scratch?",
      answer: "Use the Create PDF tool to upload text, images, or other files. Arrange content, adjust layouts, and download your PDF. Perfect for reports or forms."
    },
    {
      question: "How can I merge multiple PDFs?",
      answer: "With the Merge PDFs tool, upload up to 3 PDFs (10 if signed in), arrange their order, and combine them into a single PDF. Download the merged file instantly."
    },
    {
      question: "How do I split a PDF into pages?",
      answer: "Use the Split PDF tool to upload a PDF and select pages to separate. Download individual pages or a ZIP file with all pages as separate PDFs."
    },
    {
      question: "Can I add watermarks to my PDFs?",
      answer: "Yes, the Add Watermark tool lets you add text or image watermarks. Customize position, opacity, and size for branding or security."
    },
    {
      question: "How do I convert PDFs to images?",
      answer: "Use the PDF to Images tool to convert each PDF page to JPEG or PNG. Download individual images or a ZIP file for multiple pages."
    },
    {
      question: "What are the limits for free users?",
      answer: "Free users can process up to 3 PDFs and perform 3 conversions/downloads per session. Sign up to process 10 PDFs with unlimited conversions."
    },
    {
      question: "Is it safe to upload my PDFs?",
      answer: "Yes, all processing happens in your browser for privacy. We use secure file handling, and no data is stored unless you save operations (logged-in users only)."
    },
    {
      question: "Can I use these tools on mobile devices?",
      answer: "Absolutely! Upload, edit, and convert PDFs on mobile browsers like Chrome or Safari using touch-friendly controls."
    },
    {
      question: "What if I encounter an error?",
      answer: "Errors may occur for files over 15MB or unsupported formats. Check the error message for details or contact support via the <Link to='/contact' className='text-indigo-600 hover:underline'>contact page</Link>."
    },
  ];

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
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

        <AdComponent
          format="horizontal"
          responsive={true}
          className="my-4 mx-auto max-w-full sm:max-w-4xl h-[50px] sm:h-[90px]"
          style={{ minHeight: '50px', maxHeight: '90px', width: '100%' }}
        />


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

        {/* High-Quality Content Section */}
        <section className="mt-6 text-gray-700 dark:text-gray-200">
          <h2 className="text-xl font-semibold mb-2">Why Choose pdfCircle’s PDF Tools?</h2>
          <p className="mb-4">
            pdfCircle’s free online PDF tools provide a powerful, user-friendly solution for <strong>creating, merging, splitting, watermarking, and converting PDFs</strong>. Whether you’re a professional preparing reports, a student organizing study materials, or a small business owner streamlining document workflows, our tools support a wide range of formats and tasks. From compressing large PDFs for email to converting PDFs to images for presentations, pdfCircle ensures secure, browser-based processing without the need for software downloads.
          </p>
          <ul className="list-disc pl-5 mb-4">
            <li><strong>Comprehensive PDF Editing</strong>: Create PDFs from scratch, merge multiple files into one, split large PDFs into smaller parts, or add watermarks for branding and security.</li>
            <li><strong>Flexible Conversion</strong>: Convert PDFs to high-quality images (JPEG, PNG) or compress files to reduce size while maintaining clarity, perfect for web uploads or sharing.</li>
            <li><strong>Batch Processing</strong>: Handle multiple PDFs at once (up to 3 for guests, 10 for logged-in users) and download results individually or as a ZIP file.</li>
            <li><strong>Smart Compression</strong>: Optimize PDF file sizes for faster sharing or storage without sacrificing quality, ideal for professional and personal use.</li>
            <li><strong>Secure & Accessible</strong>: Process files directly in your browser with no sign-up required for basic features. Sign up for a free account to unlock unlimited conversions and enhanced limits.</li>
          </ul>
          <p className="mb-4">
            With an intuitive interface, drag-and-drop functionality, and support for advanced features like custom watermark placement, pdfCircle makes PDF management accessible to all skill levels. Our tools are designed for efficiency, helping you save time on repetitive tasks like merging contracts or splitting scanned documents. Sign up for a free account to process up to 10 PDFs at once and enjoy unlimited conversions, all while keeping your data secure. Transform your PDF workflow with pdfCircle today!
          </p>
          <p className="text-sm text-gray-500">
            <em>Pro Tip: Sign up for unlimited conversions and process up to 10 PDFs at once, directly from your browser.</em>
          </p>
        </section>

        {/* Interactive FAQ Section */}
        <section className="mt-8 text-gray-700 dark:text-gray-200">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-white">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqData.map((faq, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full flex justify-between items-center p-4 text-left text-lg font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
                  aria-expanded={openFaqIndex === index}
                  aria-controls={`faq-answer-${index}`}
                >
                  <span>{faq.question}</span>
                  {openFaqIndex === index ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                <div
                  id={`faq-answer-${index}`}
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaqIndex === index ? 'max-h-96 p-4' : 'max-h-0'}`}
                >
                  <p className="text-sm text-gray-600 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: faq.answer }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
     
    </>
  );
}

export default PDFTools;