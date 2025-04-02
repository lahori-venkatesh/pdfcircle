import React from 'react';
import { SEOHeaders } from './SEOHeaders';

export function TermsOfService() {
  return (
    <>
      <SEOHeaders
        title="Terms of Service - PdfCircle | Free Document & Image Tools"
        description="Read the Terms of Service for PdfCircle, outlining the rules and conditions for using our free online document and image processing tools."
        keywords={[
          'PdfCircle terms of service',
          'free pdf tools terms',
          'document conversion terms',
          'image processing terms',
          'online tool usage policy'
        ]}
      />
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Terms of Service</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 mb-6 italic">
            Last Updated: April 1, 2025
          </p>

          <p className="text-gray-600 mb-8">
            A Heartful Welcome to PdfCircle! These Terms of Service ("Terms") govern your use of our website and services
            (collectively, the "Service"). By accessing or using PdfCircle, you agree to be bound by these Terms. If you do not
            agree with this, please avoid using our Service.
          </p>

          {/* 1. Acceptance of Terms */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600">
              Through PdfCircle, you confirm that you are at least 18 years old or have legal parental/guardian consent, and you
              agree to comply with these Terms. PdfCircle may update these Terms periodically, and continued use after changes
              constitutes acceptance of the revised Terms.
            </p>
          </section>

          {/* 2. Description of Service */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. Description of Service</h2>
            <p className="text-gray-600">
              PdfCircle provides you free online tools for document conversion (e.g., PDF editing, Word to PDF) and image
              processing (e.g., background removal). These tools are offered "as is" and may be modified, enhanced, or
              discontinued at our discretion to improve user experience or operational efficiency.
            </p>
          </section>

          {/* 3. User Responsibilities */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. User Responsibilities</h2>
            <p className="text-gray-600 mb-4">Being a user, you agree to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Use the services for lawful purposes only.</li>
              <li>Not upload, share, or process files containing viruses, malware, or illegal content.</li>
              <li>Respect the intellectual property rights of others when using our tools.</li>
              <li>Not attempt to reverse engineer, hack, or disrupt the Service.</li>
              <li>Ensure any files you upload are yours or that you have permission to use them.</li>
            </ul>
          </section>

          {/* 4. Intellectual Property */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Intellectual Property</h2>
            <p className="text-gray-600">
              All content, code, design, and trademarks on PdfCircle are owned by us or our licensors and are protected by
              international copyright, trademark, and intellectual property laws. You may not copy, modify, or distribute our
              content without prior written consent, except for personal, non-commercial use of the Service outputs.
            </p>
          </section>

          {/* 5. Privacy and Data */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Privacy and Data</h2>
            <p className="text-gray-600">
              We prioritize your privacy. Files uploaded to PdfCircle are processed in your browser and are not stored on our
              servers. You are responsible for the security of files on your device. Read the{' '}
              <a href="/privacy-policy" className="text-indigo-600 hover:text-indigo-800">
                Privacy Policy
              </a>{' '}
              for a better understanding.
            </p>
          </section>

          {/* 6. Limitation of Liability */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. Limitation of Liability</h2>
            <p className="text-gray-600">
              PdfCircle is provided to you just as it is, without any warranties that it will always work perfectly. We are not
              liable for any direct, indirect, incidental, or consequential damages arising from your use of the Service,
              including data loss, inaccuracies, or service interruptions, to the fullest extent permitted by law.
            </p>
          </section>

          {/* 7. Termination */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. Termination</h2>
            <p className="text-gray-600">
              We reserve the right to suspend or terminate your access to the Service at our discretion, without notice, if you
              violate these Terms or engage in activities that harm the Service or other users.
            </p>
          </section>

          {/* 8. Governing Law */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">8. Governing Law</h2>
            <p className="text-gray-600">
              These Terms are governed by the laws of the State of California, USA, without regard to conflict of law principles.
              Any disputes will be resolved in the courts of that jurisdiction.
            </p>
          </section>

          {/* 9. Changes to Terms */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">9. Changes to Terms</h2>
            <p className="text-gray-600">
              We might change these rules sometimes. If we make changes, we'll let you know on our website. Your continued use
              of the Service after updates signifies your acceptance of the new Terms.
            </p>
          </section>

          {/* 10. Contact Us */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">10. Contact Us</h2>
            <p className="text-gray-600">
              If you have questions or concerns about these Terms, please reach us at{' '}
              <a href="mailto:pdfcircle369@gmail.com" className="text-indigo-600 hover:text-indigo-800">
                pdfcircle369@gmail.com
              </a>. We’re here to assist you during working hours.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}

export default TermsOfService;