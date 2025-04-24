import React, { useState, useCallback, useEffect, PropsWithChildren, Component, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  FileUp, Image, FileText, FilePlus, Split, Menu, X, LogOut, Images,
  ShieldCheck, Lock as LockIcon, Server, Key, RefreshCw, CheckCircle,
  Stamp, Sun, Moon, ArrowUp, User, Upload, File, Download, Zap
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ImageTools } from './components/ImageTools';
import { PDFTools } from './components/PDFTools';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { TermsOfService } from './components/TermsOfService';
import { Blog } from './components/Blog';
import { Contact } from './components/Contact';
import { AboutUs } from './components/AboutUs';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthModal } from './components/AuthModal';
import { SEOHeaders } from './components/SEOHeaders';
import { StickyBottomAd } from './components/AdComponent';
import { LanguageSelector } from './components/LanguageSelector';
import { ResetPassword } from './components/ResetPassword';

// Error Boundary Component
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  state: { hasError: boolean; error: Error | null } = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Something went wrong</h1>
            <p className="mt-2 text-gray-600">{this.state.error?.message || 'An unexpected error occurred.'}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ScrollToTop = ({ children }: PropsWithChildren<{}>) => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return <>{children}</>;
};

interface SecurityFeatureProps {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
}
function SecurityFeature({ icon: Icon, title, description }: SecurityFeatureProps) {
  return (
    <div className="flex items-start space-x-4 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 dark:border-gray-700 transform hover:-translate-y-1">
      <div className="flex-shrink-0 w-12 h-12 bg-indigo-50 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center">
        <Icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">{title}</h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm">{description}</p>
      </div>
    </div>
  );
}

interface FAQItemProps {
  question: string;
  answer: string;
}
function FAQItem({ question, answer }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
      >
        <span className="text-lg font-medium text-gray-900 dark:text-white">{question}</span>
        <span className={`ml-6 flex-shrink-0 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          <svg className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-96 mb-4' : 'max-h-0'}`}>
        <p className="text-gray-600 dark:text-gray-300 text-sm">{answer}</p>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  to: string;
}
function FeatureCard({ icon: Icon, title, description, to }: FeatureCardProps) {
  return (
    <Link to={to} onClick={() => window.scrollTo(0, 0)} className="block">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700 transform hover:-translate-y-1">
        <div className="flex items-center justify-center w-12 h-12 bg-indigo-50 dark:bg-indigo-900/50 rounded-lg mb-4 transition-transform duration-300 group-hover:scale-110">
          <Icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">{title}</h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm">{description}</p>
      </div>
    </Link>
  );
}

interface StepCardProps {
  number: number;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
}
function StepCard({ number, title, description, icon: Icon }: StepCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center space-x-4 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex-shrink-0 w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Step {number}: {title}</h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm">{description}</p>
      </div>
    </div>
  );
}

interface WhyChooseCardProps {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
}
function WhyChooseCard({ icon: Icon, title, description }: WhyChooseCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
      <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300 text-sm">{description}</p>
    </div>
  );
}

// Hook to check ad consent
function useAdConsent() {
  const [consent, setConsent] = useState<boolean | null>(null);

  useEffect(() => {
    const checkConsent = () => {
      const userConsent = localStorage.getItem('adConsent') === 'true';
      setConsent(userConsent);
    };

    checkConsent();
    window.addEventListener('consentUpdated', checkConsent);
    return () => window.removeEventListener('consentUpdated', checkConsent);
  }, []);

  return consent;
}

// Component to conditionally render ads
function ConditionalAd() {
  const location = useLocation();
  const consent = useAdConsent();
  const contentRichPages = ['/', '/image-tools', '/pdf-tools'];

  if (consent === true && contentRichPages.includes(location.pathname)) {
    return <StickyBottomAd />;
  }
  return null;
}

function HomePage() {
  const { t } = useTranslation();

  return (
    <>
      <SEOHeaders 
        title={t('seo.home.title', 'pdfCircle | Free & Secure PDF and Image Tools')}
        description={t('seo.home.description', 'Convert, compress, merge, and edit PDFs and images online for free with pdfCircle. Fast, secure, and user-friendly tools for all your document needs.')}
        keywords={[
          'pdfcircle', 'pdf converter', 'image converter', 'compress pdf', 'convert pdf to jpg', 'free pdf tools',
          'pdf compression', 'image optimization', 'online document tools', 'secure file conversion', 'pdf to word',
          'pdf to excel', 'image resize', 'image to pdf', 'ocr pdf', 'merge pdf', 'split pdf', 
          'free online tools', 'pdf editing'
        ]}
        canonicalUrl="https://pdfcircle.com/"
      />

      <section className="relative bg-gradient-to-br from-indigo-600 to-purple-700 dark:from-indigo-900 dark:to-purple-900 py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/hero-pattern.svg')] bg-cover bg-center opacity-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center animate-fade-in">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
              {t('hero.title', 'Transform Your Documents with Ease')}
            </h1>
            <p className="text-xl sm:text-2xl text-indigo-100 mb-8 max-w-3xl mx-auto leading-relaxed">
              {t('hero.subtitle', 'Free, secure, and powerful tools to convert, compress, merge, and edit PDFs and images effortlessly.')}
            </p>
            <p className="text-lg text-indigo-200 mb-10 max-w-2xl mx-auto">
              {t('hero.description', 'Whether you’re a student converting lecture notes to PDF, a professional merging reports, or a creator optimizing images for the web, pdfCircle delivers professional-grade tools with no sign-up required. Supporting files up to 100MB, our platform ensures end-to-end encryption and local processing to keep your data safe. Start now and simplify your document tasks!')}
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link
                to="/pdf-tools"
                onClick={() => window.scrollTo(0, 0)}
                className="inline-block bg-white text-indigo-600 px-6 py-3 rounded-full font-semibold hover:bg-indigo-100 transition-all duration-300 shadow-lg transform hover:-translate-y-1"
              >
                {t('hero.getStarted', 'Explore PDF Tools')}
              </Link>
              <Link
                to="/image-tools"
                onClick={() => window.scrollTo(0, 0)}
                className="inline-block border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-indigo-600 transition-all duration-300 shadow-lg transform hover:-translate-y-1"
              >
                {t('hero.imageTools', 'Explore Image Tools')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 dark:text-white mb-6">
            {t('features.title', 'Powerful Tools for Every Need')}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 text-center mb-12 max-w-3xl mx-auto">
            {t('features.description', 'Discover our suite of free tools designed to simplify your document and image processing tasks.')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={Image} 
              title={t('features.imageReduction.title', 'Image Compression')} 
              description={t('features.imageReduction.description', 'Reduce image sizes without losing quality for web and storage.')} 
              to="/image-tools?tab=compress"
            />
            <FeatureCard 
              icon={FileUp} 
              title={t('features.imageToPdf.title', 'Image to PDF')} 
              description={t('features.imageToPdf.description', 'Convert images to professional PDFs in one click.')} 
              to="/pdf-tools?tab=create"
            />
            <FeatureCard 
              icon={Images} 
              title={t('features.pdfToImages.title', 'PDF to Images')} 
              description={t('features.pdfToImages.description', 'Extract high-quality images from PDFs instantly.')} 
              to="/pdf-tools?tab=to-images"
            />
            <FeatureCard 
              icon={FilePlus} 
              title={t('features.mergePdfs.title', 'Merge PDFs')} 
              description={t('features.mergePdfs.description', 'Combine multiple PDFs into one organized document.')} 
              to="/pdf-tools?tab=merge"
            />
            <FeatureCard 
              icon={Split} 
              title={t('features.splitPdf.title', 'Split PDF')} 
              description={t('features.splitPdf.description', 'Split large PDFs into smaller, manageable files.')} 
              to="/pdf-tools?tab=split"
            />
            <FeatureCard 
              icon={Stamp} 
              title={t('features.addWatermark.title', 'Add Watermark')} 
              description={t('features.addWatermark.description', 'Protect your PDFs with custom watermarks.')} 
              to="/pdf-tools?tab=watermark"
            />
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 dark:text-white mb-6">
            {t('whyChoose.title', 'Why Choose pdfCircle')}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 text-center mb-12 max-w-3xl mx-auto">
            {t('whyChoose.description', 'Experience unmatched efficiency and security with our cutting-edge document processing tools.')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <WhyChooseCard
              icon={Zap}
              title={t('whyChoose.speed.title', 'Lightning Fast')}
              description={t('whyChoose.speed.description', 'Process files in seconds with our optimized technology.')}
            />
            <WhyChooseCard
              icon={ShieldCheck}
              title={t('whyChoose.security.title', 'Top-Tier Security')}
              description={t('whyChoose.security.description', 'Your data is protected with end-to-end encryption.')}
            />
            <WhyChooseCard
              icon={File}
              title={t('whyChoose.free.title', 'Completely Free')}
              description={t('whyChoose.free.description', 'Access professional tools at no cost, no hidden fees.')}
            />
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 dark:text-white mb-6">
            {t('howItWorks.title', 'How pdfCircle Simplifies Your Work')}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 text-center mb-12 max-w-3xl mx-auto">
            {t('howItWorks.description', 'Effortlessly process your PDFs and images in three straightforward steps with our user-friendly platform.')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StepCard
              number={1}
              icon={Upload}
              title={t('howItWorks.step1.title', 'Upload Your File')}
              description={t('howItWorks.step1.description', 'Simply drag and drop your PDF or image file (up to 100MB) to begin. No account needed!')}
            />
            <StepCard
              number={2}
              icon={File}
              title={t('howItWorks.step2.title', 'Select a Tool')}
              description={t('howItWorks.step2.description', 'Choose from our tools like compression, conversion, merging, or watermarking to suit your needs.')}
            />
            <StepCard
              number={3}
              icon={Download}
              title={t('howItWorks.step3.title', 'Download Instantly')}
              description={t('howItWorks.step3.description', 'Get your processed file in seconds, ready to use, with top-notch security.')}
            />
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 dark:text-white mb-6">
            {t('security.title', 'Uncompromising Security')}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 text-center mb-12 max-w-3xl mx-auto">
            {t('security.subtitle', 'Your privacy is our priority with industry-leading security measures.')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SecurityFeature 
              icon={ShieldCheck} 
              title={t('security.localProcessing.title', 'Local Processing')} 
              description={t('security.localProcessing.description', 'Files are processed in your browser, not on servers.')} 
            />
            <SecurityFeature 
              icon={Key} 
              title={t('security.endToEnd.title', 'End-to-End Encryption')} 
              description={t('security.endToEnd.description', 'Your data is protected during all transfers.')} 
            />
            <SecurityFeature 
              icon={Server} 
              title={t('security.noStorage.title', 'No Cloud Storage')} 
              description={t('security.noStorage.description', 'Files are deleted immediately after processing.')} 
            />
            <SecurityFeature 
              icon={RefreshCw} 
              title={t('security.updates.title', 'Regular Updates')} 
              description={t('security.updates.description', 'Continuous updates ensure top security standards.')} 
            />
            <SecurityFeature 
              icon={LockIcon} 
              title={t('security.connection.title', 'Secure Connection')} 
              description={t('security.connection.description', 'All interactions use encrypted HTTPS connections.')} 
            />
            <SecurityFeature 
              icon={CheckCircle} 
              title={t('security.verified.title', 'Verified Standards')} 
              description={t('security.verified.description', 'Certified to meet industry security standards.')} 
            />
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-6">
            {t('faq.title', 'Frequently Asked Questions')}
          </h2>
          <p className="text-base text-gray-600 dark:text-gray-300 text-center mb-8 max-w-2xl mx-auto">
            {t('faq.subtitle', 'Find answers to your questions about pdfCircle’s tools and services.')}
          </p>
          <div className="space-y-4">
            <FAQItem 
              question={t('faq.free.question', 'Is pdfCircle really free?')} 
              answer={t('faq.free.answer', 'Yes, all our tools are completely free to use with no hidden fees, providing professional-grade document processing for everyone.')} 
            />
            <FAQItem 
              question={t('faq.fileSize.question', 'What is the maximum file size?')} 
              answer={t('faq.fileSize.answer', 'You can process files up to 100MB for free, with no limits on the number of conversions or edits.')} 
            />
            <FAQItem 
              question={t('faq.fileHandling.question', 'How are my files handled?')} 
              answer={t('faq.fileHandling.answer', 'Your files are processed locally in your browser and deleted immediately after use, ensuring maximum privacy and security.')} 
            />
            <FAQItem 
              question={t('faq.formats.question', 'Which file formats are supported?')} 
              answer={t('faq.formats.answer', 'We support a wide range of formats, including PDF, JPG, PNG, DOCX, Excel, and more, for seamless conversions.')} 
            />
            <FAQItem 
              question={t('faq.account.question', 'Do I need an account?')} 
              answer={t('faq.account.answer', 'No account is required, but signing up unlocks advanced features like batch processing for up to 10 files at once.')} 
            />
            <FAQItem 
              question={t('faq.security.question', 'Is my data secure?')} 
              answer={t('faq.security.answer', 'Absolutely, we use end-to-end encryption, local processing, and HTTPS connections to keep your data private and secure.')} 
            />
            <FAQItem 
              question={t('faq.speed.question', 'How fast is the processing?')} 
              answer={t('faq.speed.answer', 'Our optimized technology processes files in seconds, even for large documents or images, ensuring a seamless experience.')} 
            />
            <FAQItem 
              question={t('faq.devices.question', 'Can I use pdfCircle on any device?')} 
              answer={t('faq.devices.answer', 'Yes, pdfCircle is web-based and works on any device with a modern browser, including desktops, tablets, and smartphones.')} 
            />
            <FAQItem 
              question={t('faq.batch.question', 'Does pdfCircle support batch processing?')} 
              answer={t('faq.batch.answer', 'Yes, registered users can process up to 10 files simultaneously with our batch processing feature, saving you time.')} 
            />
          </div>
        </div>
      </section>
    </>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  useEffect(() => {
    console.log('AppRoutes - User:', user ? 'Logged in' : 'Not logged in');
  }, [user]);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/image-tools" element={<ImageTools isLoggedIn={!!user} />} />
      <Route path="/pdf-tools" element={<PDFTools isLoggedIn={!!user} />} />
      <Route path="/about" element={<AboutUs />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/reset-password" element={<ResetPassword />} />
    </Routes>
  );
}

function Layout({ children }: PropsWithChildren<{}>) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'login' | 'forgot-password'>('signup');
  const [isVisible, setIsVisible] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    console.log('Layout - User:', user ? 'Logged in' : 'Not logged in');
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  const openAuthModal = (mode: 'signup' | 'login' | 'forgot-password') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
    setMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      console.log('User signed out successfully');
      setShowProfileDropdown(false);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
    setMobileMenuOpen(false);
  };

  const handleScroll = useCallback(() => {
    if (window.scrollY > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16">
          <div className="flex items-center justify-between h-full">
            <div className="flex-shrink-0">
              <Link to="/" onClick={scrollToTop} className="flex items-center space-x-2">
                <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-600 dark:text-white" />
                <span className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-white">pdfCircle</span>
              </Link>
            </div>
            <div className="hidden sm:flex items-center justify-center flex-1 px-8">
              <div className="flex space-x-6">
                <Link 
                  to="/" 
                  onClick={scrollToTop} 
                  className={`transition-colors font-medium ${location.pathname === '/' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                >
                  Home
                </Link>
                <Link 
                  to="/image-tools" 
                  onClick={scrollToTop} 
                  className={`transition-colors font-medium ${location.pathname === '/image-tools' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                >
                  Image Tools
                </Link>
                <Link 
                  to="/pdf-tools" 
                  onClick={scrollToTop} 
                  className={`transition-colors font-medium ${location.pathname === '/pdf-tools' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                >
                  PDF Tools
                </Link>
                <Link 
                  to="/blog" 
                  onClick={scrollToTop} 
                  className={`transition-colors font-medium ${location.pathname === '/blog' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                >
                  Blog
                </Link>
              </div>
            </div>
            <div className="hidden sm:flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              {user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="p-2 rounded-full border border-indigo-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Profile"
                    title="Profile"
                  >
                    <User className="w-5 h-5 stroke-indigo-600 dark:stroke-gray-300" />
                  </button>
                  {showProfileDropdown && (
                    <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                      >
                        <div className="w-6 h-6 mr-2 flex items-center justify-center rounded-full">
                          <LogOut className="w-4 h-4" />
                        </div>
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <button onClick={() => openAuthModal('login')} className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    Login
                  </button>
                  <button onClick={() => openAuthModal('signup')} className="bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-700 transition-colors">
                    Sign Up
                  </button>
                </>
              )}
            </div>
            <button
              className="sm:hidden text-gray-600 dark:text-white hover:text-gray-900 dark:hover:text-white"
              onClick={toggleMobileMenu}
              aria-label={mobileMenuOpen ? "Close mobile menu" : "Open mobile menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-8 h-8" />}
            </button>
          </div>
        </nav>
        {mobileMenuOpen && (
          <div className="sm:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 space-y-3">
              <Link 
                to="/" 
                onClick={() => { setMobileMenuOpen(false); scrollToTop(); }} 
                className={`block font-medium ${location.pathname === '/' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
              >
                Home
              </Link>
              <Link 
                to="/image-tools" 
                onClick={() => { setMobileMenuOpen(false); scrollToTop(); }} 
                className={`block font-medium ${location.pathname === '/image-tools' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
              >
                Image Tools
              </Link>
              <Link 
                to="/pdf-tools" 
                onClick={() => { setMobileMenuOpen(false); scrollToTop(); }} 
                className={`block font-medium ${location.pathname === '/pdf-tools' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
              >
                PDF Tools
              </Link>
              <Link 
                to="/blog" 
                onClick={() => { setMobileMenuOpen(false); scrollToTop(); }} 
                className={`block font-medium ${location.pathname === '/blog' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
              >
                Blog
              </Link>
              <button
                onClick={toggleTheme}
                className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-5 h-5" />
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-5 h-5" />
                    <span>Dark Mode</span>
                  </>
                )}
              </button>
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 py-2"
                    aria-label="Profile"
                  >
                    <User className="w-5 h-5 stroke-current" />
                    <span>Profile</span>
                  </button>
                  {showProfileDropdown && (
                    <div className="mt-2 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                      >
                        <LogOut className="w-4 h-4 mr-2 stroke-indigo-600" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <button onClick={() => openAuthModal('login')} className="w-full text-left text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 py-2">Login</button>
                  <button onClick={() => openAuthModal('signup')} className="w-full bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-700 transition-colors">Sign Up</button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {children}
      <ConditionalAd />

      <button
        onClick={scrollToTop}
        className={`fixed bottom-14 right-8 p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'} ${isVisible ? 'translate-y-0' : 'translate-y-10'}`}
        aria-label="Scroll to Top"
      >
        <ArrowUp className="w-6 h-6" />
      </button>

      <footer className="bg-gray-900 dark:bg-gray-950 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="w-6 h-6" />
                <span className="text-xl font-bold">pdfCircle</span>
              </div>
              <p className="text-gray-400 text-sm">Transform your documents and images with our free, secure tools.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link to="/" onClick={scrollToTop} className="text-gray-400 hover:text-indigo-400 transition-colors">Home</Link></li>
                <li><Link to="/image-tools" onClick={scrollToTop} className="text-gray-400 hover:text-indigo-400 transition-colors">Image Tools</Link></li>
                <li><Link to="/pdf-tools" onClick={scrollToTop} className="text-gray-400 hover:text-indigo-400 transition-colors">PDF Tools</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><Link to="/about" onClick={scrollToTop} className="text-gray-400 hover:text-indigo-400 transition-colors">About Us</Link></li>
                <li><Link to="/privacy" onClick={scrollToTop} className="text-gray-400 hover:text-indigo-400 transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" onClick={scrollToTop} className="text-gray-400 hover:text-indigo-400 transition-colors">Terms of Service</Link></li>
                <li><Link to="/contact" onClick={scrollToTop} className="text-gray-400 hover:text-indigo-400 transition-colors">Contact Us</Link></li>
                <li><Link to="/blog" onClick={scrollToTop} className="text-gray-400 hover:text-indigo-400 transition-colors">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Language</h3>
              <LanguageSelector />
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400 text-sm">
            <p>© {new Date().getFullYear()} pdfCircle. All rights reserved.</p>
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
          <ErrorBoundary>
            <ScrollToTop>
              <Layout>
                <AppRoutes />
              </Layout>
            </ScrollToTop>
          </ErrorBoundary>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;