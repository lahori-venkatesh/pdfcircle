import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileUp, Image, FileText, FilePlus, Split, Shield, Lock as LockIcon,
  Server, Key, RefreshCw, CheckCircle, Stamp, Upload, Download, Zap,
  ShieldCheck, Clock, Smartphone, ChevronDown, ChevronUp
} from 'lucide-react';
import { SEOHeaders } from './SEOHeaders';
import { AdComponent } from './AdComponent';

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
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
      >
        <span className="text-lg font-medium text-gray-900 dark:text-white">{question}</span>
        <span className={`ml-6 flex-shrink-0 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          {isOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
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

export function HomePage() {
  return (
    <>
      <SEOHeaders
        title="Free Online PDF Tools: Merge, Split, Compress, Convert"
        description="Create PDFs, add watermarks on PDFs, merge, split, compress, and convert PDFs to images with pdfCircle's free online tools. No sign-up needed."
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
          'pdf to image free converter'
        ]}
        canonicalUrl="https://pdfcircle.com/pdf-tools"
      />

      <section className="relative bg-gradient-to-br from-indigo-600 to-purple-700 dark:from-indigo-900 dark:to-purple-900 py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/hero-pattern.svg')] bg-cover bg-center opacity-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center animate-fade-in">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
              PDF & Image Tools: Convert, Edit & Process Documents Online
            </h1>
            <h2 className="text-xl sm:text-2xl text-indigo-100 mb-8 max-w-3xl mx-auto leading-relaxed font-semibold">
              Free, secure, and powerful tools to convert, compress, merge, and edit PDFs and images effortlessly.
            </h2>
            <p className="text-lg text-indigo-200 mb-10 max-w-2xl mx-auto">
              Whether you're a student converting lecture notes to PDF, a professional merging reports, or a creator optimizing images for the web, pdfCircle delivers professional-grade tools with no sign-up required.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link
                to="/pdf-tools"
                onClick={() => window.scrollTo(0, 0)}
                className="inline-flex justify-center items-center bg-white text-indigo-600 px-6 py-3 rounded-lg font-medium hover:bg-indigo-100 transition-colors duration-200 shadow-sm"
              >
                Explore PDF Tools
              </Link>
              <Link
                to="/image-tools"
                onClick={() => window.scrollTo(0, 0)}
                className="inline-flex justify-center items-center text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors duration-200 shadow-sm border border-white"
              >
                Explore Image Tools
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 dark:text-white mb-6">
            PDF & Image Processing Tools: Everything You Need
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 text-center mb-12 max-w-3xl mx-auto">
            Discover our suite of free tools designed to simplify your document and image processing tasks.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={Image} 
              title="Image Compression" 
              description="Reduce image sizes without losing quality for web and storage." 
              to="/image-tools?tab=compress"
            />
            <FeatureCard 
              icon={FileUp} 
              title="Image to PDF" 
              description="Convert images to professional PDFs in one click." 
              to="/pdf-tools?tab=create"
            />
            <FeatureCard 
              icon={FileText} 
              title="PDF to Images" 
              description="Extract high-quality images from PDFs instantly." 
              to="/pdf-tools?tab=to-images"
            />
            <FeatureCard 
              icon={FilePlus} 
              title="Merge PDFs" 
              description="Combine multiple PDFs into one organized document." 
              to="/pdf-tools?tab=merge"
            />
            <FeatureCard 
              icon={Split} 
              title="Split PDF" 
              description="Split large PDFs into smaller, manageable files." 
              to="/pdf-tools?tab=split"
            />
            <FeatureCard 
              icon={Stamp} 
              title="Add Watermark" 
              description="Protect your PDFs with custom watermarks." 
              to="/pdf-tools?tab=watermark"
            />
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 dark:text-white mb-6">
            Why Choose pdfCircle
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 text-center mb-12 max-w-3xl mx-auto">
            Experience unmatched efficiency and security with our cutting-edge document processing tools.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <WhyChooseCard
              icon={Zap}
              title="Lightning Fast"
              description="Process files in seconds with our optimized technology."
            />
            <WhyChooseCard
              icon={ShieldCheck}
              title="Top-Tier Security"
              description="Your data is protected with end-to-end encryption."
            />
            <WhyChooseCard
              icon={FileText}
              title="Completely Free"
              description="Access professional tools at no cost, no hidden fees."
            />
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 dark:text-white mb-6">
            How pdfCircle Simplifies Your Work
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 text-center mb-12 max-w-3xl mx-auto">
            Effortlessly process your PDFs and images in three straightforward steps with our user-friendly platform.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StepCard
              number={1}
              icon={Upload}
              title="Upload Your File"
              description="Simply drag and drop your PDF or image file (up to 100MB) to begin. No account needed!"
            />
            <StepCard
              number={2}
              icon={FileText}
              title="Select a Tool"
              description="Choose from our tools like compression, conversion, merging, or watermarking to suit your needs."
            />
            <StepCard
              number={3}
              icon={Download}
              title="Download Instantly"
              description="Get your processed file in seconds, ready to use, with top-notch security."
            />
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 dark:text-white mb-6">
            Uncompromising Security
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 text-center mb-12 max-w-3xl mx-auto">
            Your privacy is our priority with industry-leading security measures.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SecurityFeature 
              icon={ShieldCheck} 
              title="Local Processing" 
              description="Files are processed in your browser, not on servers." 
            />
            <SecurityFeature 
              icon={Key} 
              title="End-to-End Encryption" 
              description="Your data is protected during all transfers." 
            />
            <SecurityFeature 
              icon={Server} 
              title="No Cloud Storage" 
              description="Files are deleted immediately after processing." 
            />
            <SecurityFeature 
              icon={RefreshCw} 
              title="Regular Updates" 
              description="Continuous updates ensure top security standards." 
            />
            <SecurityFeature 
              icon={LockIcon} 
              title="Secure Connection" 
              description="All interactions use encrypted HTTPS connections." 
            />
            <SecurityFeature 
              icon={CheckCircle} 
              title="Verified Standards" 
              description="Certified to meet industry security standards." 
            />
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-6">
            Frequently Asked Questions
          </h2>
          <p className="text-base text-gray-600 dark:text-gray-300 text-center mb-8 max-w-2xl mx-auto">
            Find answers to your questions about pdfCircle's tools and services.
          </p>
          <div className="space-y-4">
            <FAQItem 
              question="Is pdfCircle really free?" 
              answer="Yes, all our tools are completely free to use with no hidden fees, providing professional-grade document processing for everyone." 
            />
            <FAQItem 
              question="What is the maximum file size?" 
              answer="You can process files up to 100MB for free, with no limits on the number of conversions or edits." 
            />
            <FAQItem 
              question="How are my files handled?" 
              answer="Your files are processed locally in your browser and deleted immediately after use, ensuring maximum privacy and security." 
            />
            <FAQItem 
              question="Which file formats are supported?" 
              answer="We support a wide range of formats, including PDF, JPG, PNG, DOCX, Excel, and more, for seamless conversions." 
            />
            <FAQItem 
              question="Do I need an account?" 
              answer="No account is required, but signing up unlocks advanced features like batch processing for up to 10 files at once." 
            />
            <FAQItem 
              question="Is my data secure?" 
              answer="Absolutely, we use end-to-end encryption, local processing, and HTTPS connections to keep your data private and secure." 
            />
          </div>
        </div>
      </section>

      
    </>
  );
}