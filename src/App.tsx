import { PropsWithChildren } from 'react';
import React, { useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { 
  FileUp, Image, FileText, FilePlus, FileDown, Split, FileCode2, Search, 
  Minimize2, Menu, X, Camera, Mail, Lock, Eye, EyeOff, LogOut, Images,
  Shield, ShieldCheck, Lock as LockIcon, Server, Key, RefreshCw, CheckCircle,
  Globe, Award, Code, Pencil, Stamp, Type, Eraser, Wand2, Sun, Moon
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ImageTools } from './components/ImageTools';
import { PDFTools } from './components/PDFTools';
import { HTMLToPDF } from './components/HTMLToPDF';
import { DigitalImageEnhancer } from './components/DigitalImageEnhancer';
import { BackgroundRemover } from './components/BackgroundRemover';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { TermsOfService } from './components/TermsOfService';
import { Contact } from './components/Contact';
import { AboutUs } from './components/AboutUs';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthModal } from './components/AuthModal';
import { SEOHeaders } from './components/SEOHeaders';
import { StickyBottomAd } from './components/AdComponent';
import { LanguageSelector } from './components/LanguageSelector';

function SecurityFeature({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start space-x-4 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700">
      <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
        <Icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">{title}</h3>
        <p className="text-gray-600 dark:text-gray-300">{description}</p>
      </div>
    </div>
  );
}

function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full py-4 text-left"
      >
        <span className="text-lg font-medium text-gray-900 dark:text-white">{question}</span>
        <span className={`ml-6 flex-shrink-0 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <svg className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-96 mb-4' : 'max-h-0'}`}>
        <p className="text-gray-600 dark:text-gray-300">{answer}</p>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, to }) {
  return (
    <Link to={to} className="block">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg mb-4">
          <Icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">{title}</h3>
        <p className="text-gray-600 dark:text-gray-300">{description}</p>
      </div>
    </Link>
  );
}

function StepCard({ number, title, description }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 flex items-center space-x-4 hover:shadow-xl transition-shadow duration-300">
      <div className="flex-shrink-0 w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
        {number}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">{title}</h3>
        <p className="text-gray-600 dark:text-gray-300">{description}</p>
      </div>
    </div>
  );
}

function HomePage() {
  const { t } = useTranslation();
  
  return (
    <>
      <SEOHeaders 
        title={t('seo.home.title', 'PdfCircle - Free Tools for Converting Documents and Images | PdfCircle')}
        description={t('seo.home.description', 'PdfCircle-Free all-in-one tool to convert, compress, merge, and enhance PDFs and images easily')}
        keywords={[
          'convert image to pdf online',
          'pdf to jpg converter free',
          'split pdf online free',
          'merge pdf files online',
          'ocr pdf to text free',
          'compress pdf size online',
          'image to digital converter free',
          'reduce image file size online',
          'free pdf converter online',
          'best pdf to image converter',
          'online pdf compressor tool',
          'merge pdf documents securely',
          'split pdf by pages free',
          'convert jpg to pdf without software',
          'free ocr software for pdf',
          'reduce pdf file size for email',
          'alternatives to ilovepdf',
          'online pdf editor free',
          'pdfCircle free pdf converter online',
          'pdfCircle pdf to jpg converter free',
          'pdfCircle split pdf online free',
          'pdfCircle merge pdf files online',
          'pdfCircle ocr pdf to text free',
          'pdfCircle compress pdf size online',
          'pdfCircle image to digital converter free',
          'pdfCircle reduce image file size online',
          'free online pdf converter',
          'best pdf to image converter online',
          'pdfCircle online pdf compressor free',
          'pdfCircle merge pdf documents securely',
          'pdfCircle split pdf by pages free',
          'pdfCircle convert jpg to pdf online',
          'pdfCircle free ocr software for pdf',
          'pdfCircle reduce pdf file size for email',
          'pdfCircle alternatives to ilovepdf',
          'pdfCircle online pdf editor free',
          'how to use pdfCircle to compress pdf',
          'pdfCircle convert scanned pdf to text',
          'convert image to pdf online free',
          'jpg to pdf converter free',
          'png to pdf converter online',
          'image to text converter free',
          'convert image to word online',
          'free image format converter',
          'best image to pdf converter',
          'convert multiple images to pdf',
          'resize image online free',
          'how to resize an image without losing quality',
          'free image resizer tool',
          'bulk image resize online',
          'reduce image size for email',
          'resize image to specific dimensions',
          'best free image resizing software',
          'compress and resize images online',
         // Added from previous discussion
          'pdfCircle document conversion tools',
          'pdfCircle image enhancement online',
          'pdfCircle ocr scan to text free',
          'pdfCircle pdf editing tools online',
          'pdfCircle file compression tools free',
          'pdfCircle pdf to word converter free',
          'pdfCircle pdf to excel converter online',
          'pdfCircle document management tools',
          'pdfCircle image resizing tools free',
          'pdfCircle pdf merge and split online'
        ]}
      />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 dark:from-indigo-900 dark:via-indigo-800 dark:to-purple-900 py-16 sm:py-24">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497493292307-31c376b6e479?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 sm:mb-8">
              {t('hero.title')}
            </h1>
            <p className="text-xl sm:text-2xl text-indigo-100 mb-8 sm:mb-10 max-w-3xl mx-auto">
              {t('hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/image-tools"
                className="inline-block bg-white text-indigo-600 dark:bg-indigo-400 dark:text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-500 transition-colors duration-300 shadow-lg"
              >
                {t('hero.getStarted')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Everything You Need in One Place */}
      <section className="py-12 sm:py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-8 sm:mb-12">
            {t('features.title')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <FeatureCard 
              icon={Image} 
              title={t('features.imageReduction.title')} 
              description={t('features.imageReduction.description')} 
              to="/image-tools" 
            />
            <FeatureCard icon={FileUp} title={t('features.imageToPdf.title')} description={t('features.imageToPdf.description')} to="/pdf-tools?tab=create" />
            <FeatureCard icon={Images} title={t('features.pdfToImages.title')} description={t('features.pdfToImages.description')} to="/pdf-tools?tab=to-images" />
            <FeatureCard icon={Eraser} title={t('features.removeBackground.title')} description={t('features.removeBackground.description')} to="/background-remover" />
            <FeatureCard icon={Wand2} title={t('features.digitalEnhancer.title')} description={t('features.digitalEnhancer.description')} to="/digital-enhancer" />
            <FeatureCard icon={FileText} title={t('features.compressPdf.title')} description={t('features.compressPdf.description')} to="/pdf-tools?tab=compress" />
            <FeatureCard icon={FilePlus} title={t('features.mergePdfs.title')} description={t('features.mergePdfs.description')} to="/pdf-tools?tab=merge" />
            <FeatureCard icon={Split} title={t('features.splitPdf.title')} description={t('features.splitPdf.description')} to="/pdf-tools?tab=split" />
            <FeatureCard icon={FileText} title={t('features.pdfToWord.title')} description={t('features.pdfToWord.description')} to="/pdf-tools?tab=to-word" />
            <FeatureCard icon={FileText} title={t('features.pdfToExcel.title')} description={t('features.pdfToExcel.description')} to="/pdf-tools?tab=to-excel" />
            <FeatureCard icon={FileText} title={t('features.wordToPdf.title')} description={t('features.wordToPdf.description')} to="/pdf-tools?tab=word-to-pdf" />
            <FeatureCard icon={FileText} title={t('features.excelToPdf.title')} description={t('features.excelToPdf.description')} to="/pdf-tools?tab=excel-to-pdf" />
            <FeatureCard icon={Pencil} title={t('features.editPdf.title')} description={t('features.editPdf.description')} to="/pdf-tools?tab=edit" />
            <FeatureCard icon={Stamp} title={t('features.addWatermark.title')} description={t('features.addWatermark.description')} to="/pdf-tools?tab=watermark" />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 sm:py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-8 sm:mb-12">
            {t('howItWorks.title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StepCard
              number={1}
              title={t('howItWorks.step1.title')}
              description={t('howItWorks.step1.description')}
            />
            <StepCard
              number={2}
              title={t('howItWorks.step2.title')}
              description={t('howItWorks.step2.description')}
            />
            <StepCard
              number={3}
              title={t('howItWorks.step3.title')}
              description={t('howItWorks.step3.description')}
            />
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-12 sm:py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('security.title')}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {t('security.subtitle')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SecurityFeature 
              icon={ShieldCheck} 
              title={t('security.localProcessing.title')} 
              description={t('security.localProcessing.description')} 
            />
            <SecurityFeature 
              icon={Key} 
              title={t('security.endToEnd.title')} 
              description={t('security.endToEnd.description')} 
            />
            <SecurityFeature 
              icon={Server} 
              title={t('security.noStorage.title')} 
              description={t('security.noStorage.description')} 
            />
            <SecurityFeature 
              icon={RefreshCw} 
              title={t('security.updates.title')} 
              description={t('security.updates.description')} 
            />
            <SecurityFeature 
              icon={LockIcon} 
              title={t('security.connection.title')} 
              description={t('security.connection.description')} 
            />
            <SecurityFeature 
              icon={CheckCircle} 
              title={t('security.verified.title')} 
              description={t('security.verified.description')} 
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 sm:py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('faq.title')}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              {t('faq.subtitle')}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8">
            <FAQItem 
              question={t('faq.free.question')} 
              answer={t('faq.free.answer')} 
            />
            <FAQItem 
              question={t('faq.fileSize.question')} 
              answer={t('faq.fileSize.answer')} 
            />
            <FAQItem 
              question={t('faq.fileHandling.question')} 
              answer={t('faq.fileHandling.answer')} 
            />
            <FAQItem 
              question={t('faq.formats.question')} 
              answer={t('faq.formats.answer')} 
            />
            <FAQItem 
              question={t('faq.account.question')} 
              answer={t('faq.account.answer')} 
            />
            <FAQItem 
              question={t('faq.security.question')} 
              answer={t('faq.security.answer')} 
            />
          </div>
        </div>
      </section>
    </>
  );
}

let setAuthModalOpen: (open: boolean) => void;
let setAuthMode: (mode: string) => void;

function Layout({ children }: PropsWithChildren<{}>) {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpenState] = useState(false);
  const [authMode, setAuthModeState] = useState('signup');

  setAuthModalOpen = setAuthModalOpenState;
  setAuthMode = setAuthModeState;

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const openAuthModal = (mode) => {
    setAuthMode(mode);
    setAuthModalOpen(true);
    setMobileMenuOpen(false);
  };
  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16">
          <div className="flex items-center justify-between h-full">
            <div className="flex-shrink-0">
              <Link to="/" className="flex items-center space-x-2">
                <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-600 dark:text-indigo-600" />
                <span className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-600">pdfCircle</span>
              </Link>
            </div>
            <div className="hidden sm:flex items-center justify-center flex-1 px-8">
              <div className="flex space-x-6">
                <Link to="/" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">{t('common.home')}</Link>
                <Link to="/image-tools" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">{t('common.imageTools')}</Link>
                <Link to="/pdf-tools" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">{t('common.pdfTools')}</Link>
                <Link to="/digital-enhancer" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">{t('common.digitalEnhancer')}</Link>
              </div>
            </div>
            <div className="hidden sm:flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                title={theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-600 dark:text-gray-300">{user.email}</span>
                  <button onClick={handleSignOut} className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                    <LogOut className="w-5 h-5" />
                    <span>{t('common.signOut')}</span>
                  </button>
                </div>
              ) : (
                <>
                  <button onClick={() => openAuthModal('login')} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                    {t('common.login')}
                  </button>
                  <button onClick={() => openAuthModal('signup')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                    {t('common.signup')}
                  </button>
                </>
              )}
            </div>
            <button className="sm:hidden text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white" onClick={toggleMobileMenu}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </nav>
        {mobileMenuOpen && (
          <div className="sm:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 space-y-3">
              <Link to="/" className="block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white" onClick={() => setMobileMenuOpen(false)}>{t('common.home')}</Link>
              <Link to="/image-tools" className="block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white" onClick={() => setMobileMenuOpen(false)}>{t('common.imageTools')}</Link>
              <Link to="/pdf-tools" className="block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white" onClick={() => setMobileMenuOpen(false)}>{t('common.pdfTools')}</Link>
              <Link to="/digital-enhancer" className="block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white" onClick={() => setMobileMenuOpen(false)}>{t('common.digitalEnhancer')}</Link>
              <button
                onClick={toggleTheme}
                className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-5 h-5" />
                    <span>{t('common.lightMode')}</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-5 h-5" />
                    <span>{t('common.darkMode')}</span>
                  </>
                )}
              </button>
              {user ? (
                <>
                  <div className="py-2 text-gray-600 dark:text-gray-300">{user.email}</div>
                  <button onClick={handleSignOut} className="w-full flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white py-2">
                    <LogOut className="w-5 h-5" />
                    <span>{t('common.signOut')}</span>
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => openAuthModal('login')} className="w-full text-left text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white py-2">{t('common.login')}</button>
                  <button onClick={() => openAuthModal('signup')} className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">{t('common.signup')}</button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {children}

      <footer className="bg-gray-900 dark:bg-gray-950 text-white py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="w-6 h-6" />
                <span className="text-xl font-bold">pdfCircle</span>
              </div>
              <p className="text-gray-400">{t('footer.description')}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('footer.quickLinks')}</h3>
              <ul className="space-y-2">
                <li><Link to="/" className="text-gray-400 hover:text-white">{t('common.home')}</Link></li>
                <li><Link to="/image-tools" className="text-gray-400 hover:text-white">{t('common.imageTools')}</Link></li>
                <li><Link to="/pdf-tools" className="text-gray-400 hover:text-white">{t('common.pdfTools')}</Link></li>
                <li><Link to="/digital-enhancer" className="text-gray-400 hover:text-white">{t('common.digitalEnhancer')}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('footer.legal')}</h3>
              <ul className="space-y-2">
                <li><Link to="/about" className="text-gray-400 hover:text-white">{t('footer.aboutUs')}</Link></li>
                <li><Link to="/privacy" className="text-gray-400 hover:text-white">{t('footer.privacy')}</Link></li>
                <li><Link to="/terms" className="text-gray-400 hover:text-white">{t('footer.terms')}</Link></li>
                <li><Link to="/contact" className="text-gray-400 hover:text-white">{t('footer.contact')}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('footer.language')}</h3>
              <LanguageSelector />
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 sm:mt-12 pt-8 text-center text-gray-400">
            <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          </div>
        </div>
      </footer>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} mode={authMode} />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/image-tools" element={<ImageTools />} />
              <Route path="/pdf-tools" element={<PDFTools />} />
              <Route path="/html-to-pdf" element={<HTMLToPDF />} />
              <Route path="/digital-enhancer" element={<DigitalImageEnhancer />} />
              <Route path="/background-remover" element={<BackgroundRemover />} />
              <Route path="/about" element={<AboutUs />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/contact" element={<Contact />} />
            </Routes>
            <StickyBottomAd />
          </Layout>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;