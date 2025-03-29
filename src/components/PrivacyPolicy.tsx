import React from 'react';
import { SEOHeaders } from './SEOHeaders';

export function PrivacyPolicy() {
  return (
    <>
      <SEOHeaders
        title="Privacy Policy - Hallopdf | Free Document & Image Tools"
        description="Learn how Hallopdf protects your privacy with our secure, browser-based document and image processing tools. No data storage, full control."
        keywords={[
          'PdfCircle data privacy',  
          'Secure PDF and image processing',  
          'Privacy-focused document tools',  
          'No-data-storage PDF conversion',  
          'User-controlled file security'  

        ]}
      />
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Privacy Policy</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 mb-6 italic">
            Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <p className="text-gray-600 mb-8">
            At Hallopdf, your privacy is our priority. This Privacy Policy explains how we handle your information
            when you use our free online tools for document conversion and image processing (the "Service").
            By using Hallopdf, you agree to the practices outlined here.
          </p>

          {/* 1. Introduction */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. Introduction</h2>
            <p className="text-gray-600">
            PdfCircle, designed and developed by Venkatesh with development support from Prudhvi Verma, is committed to delivering secure and efficient tools while prioritizing your privacy. Whenever possible, we process files locally in your browser, ensuring complete control over your data without storing it on our servers.
            </p>
          </section>

          {/* 2. Information We Collect */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. Information We Collect</h2>
            <p className="text-gray-600 mb-4">We may collect the following types of information:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Uploaded Files:</strong> Documents or images you upload for processing (e.g., PDFs, Word files, images).</li>
              <li><strong>Usage Data:</strong> Non-personal data like tool usage patterns, browser type, and device information.</li>
              <li><strong>Contact Information:</strong> Email address if you reach out to us via our contact form (optional).</li>
              <li><strong>Cookies:</strong> Minimal data via cookies or analytics for site performance (see Section 6).</li>
            </ul>
            <p className="text-gray-600 mt-4">
              <strong>Note:</strong> We do not require account creation or collect personal identifiable information unless you voluntarily provide it.
            </p>
          </section>

          {/* 3. How We Use Your Information */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-600 mb-4">We use your information solely to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Process and deliver the requested services (e.g., convert PDFs, remove backgrounds).</li>
              <li>Improve our tools’ functionality and user experience.</li>
              <li>Analyze site performance and usage trends (anonymized data only).</li>
              <li>Respond to your inquiries or feedback if you contact us.</li>
              <li>Protect against misuse or security threats to the Service.</li>
            </ul>
          </section>

          {/* 4. Data Storage and Security */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Data Storage and Security</h2>
            <p className="text-gray-600">
              We prioritize your data security:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
              <li><strong>No Server Storage:</strong> Files you upload are processed in your browser and not stored on our servers.</li>
              <li><strong>Encryption:</strong> Data transmission (if any) uses secure HTTPS protocols.</li>
              <li><strong>Temporary Processing:</strong> Uploaded files are discarded immediately after processing.</li>
              <li><strong>Protection:</strong> We implement industry-standard measures to safeguard our website against unauthorized access.</li>
            </ul>
            <p className="text-gray-600 mt-4">
              You are responsible for securing files on your device after downloading processed outputs.
            </p>
          </section>

          {/* 5. Third-Party Services */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Third-Party Services</h2>
            <p className="text-gray-600">
              We may use third-party services (e.g., analytics providers) to improve our Service. These providers
              may collect anonymized data, such as site visits, but do not access your uploaded files. We ensure
              any third-party complies with strict privacy standards.
            </p>
          </section>

          {/* 6. Cookies and Tracking */}
          <section className="mb-8">
           <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. Data Usage and Tracking</h2>
           <p className="text-gray-600">
            PdfCircle does not use cookies or track personal data. Our tools are designed to function independently
            without storing or sharing user information. We prioritize privacy by ensuring all processing happens locally
            in your browser whenever possible.
           </p> 
          </section>

          {/* 7. Your Privacy Rights */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. Your Privacy Rights</h2>
            <p className="text-gray-600 mb-4">Depending on your location, you may have rights to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Access any personal data we hold (if applicable).</li>
              <li>Request correction or deletion of your data.</li>
              <li>Opt-out of data processing (e.g., analytics).</li>
              <li>Request data portability where feasible.</li>
            </ul>
            <p className="text-gray-600 mt-4">
              To exercise these rights, contact us at the email below. Since we don’t store uploaded files,
              most requests relate to contact data only.
            </p>
          </section>

          {/* 8. Changes to This Policy */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">8. Changes to This Policy</h2>
            <p className="text-gray-600">
              We may update this Privacy Policy as our Service evolves. Significant changes will be posted
              on this page with an updated "Last Updated" date. Continued use of Hallopdf after changes
              indicates your acceptance.
            </p>
          </section>

          {/* 9. Contact Us */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">9. Contact Us</h2>
            <p className="text-gray-600">
              For questions about this Privacy Policy or our data practices, please email us at{' '}
              <a href="mailto:pdfcircle369@gmail.com" className="text-indigo-600 hover:text-indigo-800">
              pdfcircle369@gmail.com
              </a>. We’re committed to addressing your concerns promptly.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}