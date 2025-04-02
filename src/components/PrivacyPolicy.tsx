import React from 'react';
import { SEOHeaders } from './SEOHeaders';

export function PrivacyPolicy() {
  return (
    <>
      <SEOHeaders
        title="Privacy Policy - PdfCircle | Free Document & Image Tools"
        description="Learn how PdfCircle protects your privacy with our secure, browser-based document and image processing tools. No data storage, full control."
        keywords={[
          'PdfCircle data privacy',
          'secure PDF and image processing',
          'privacy-focused document tools',
          'no-data-storage PDF conversion',
          'user-controlled file security'
        ]}
      />
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Privacy Policy</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 mb-6 italic">
            Last Updated: April 1, 2025
          </p>

          <p className="text-gray-600 mb-8">
            Through this PdfCircle, your privacy is our responsibility. This Privacy Policy explains how we maintain your
            valuable information when you use the free online tools we provide for you. By using PdfCircle, you agree to the
            practices outlined here.
          </p>

          {/* 1. Introduction */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. Introduction</h2>
            <p className="text-gray-600">
              PdfCircle, designed and developed by Venkatesh with development support from Prudhvi, is dedicated to providing
              secure and efficient tools while prioritizing your privacy. Whenever possible, we process files locally in your
              browser without storing your data on our servers. Your privacy is important to us, and we are committed to
              protecting your personal data.
            </p>
          </section>

          {/* 2. Information We Collect */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. Information We Collect</h2>
            <p className="text-gray-600 mb-4">We may collect data from the following types of functionalities:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Usage Data:</strong> Non-personal data such as tool usage patterns, browser type, and device information.</li>
              <li><strong>Uploaded Files:</strong> The documents or images you upload for processing (e.g., PDFs, Word files, images).</li>
              <li><strong>Contact Information:</strong> Email address if you reach out to us via our contact form (optional).</li>
              <li><strong>Cookies:</strong> Minimal data used via cookies for better site performance (see Section 6 for more details).</li>
            </ul>
          </section>

          {/* 3. How We Use Your Information */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-600 mb-4">PdfCircle uses your information in the following ways:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>To provide incredible services continuously through our tools.</li>
              <li>To process the requested services dedicatedly (e.g., convert PDFs, remove backgrounds).</li>
              <li>To improve our tool’s functionality and meet user experience expectations.</li>
              <li>To respond quickly to any queries and inquiries during working hours.</li>
              <li>To protect your data against misuse or security threats to the Service.</li>
              <li>To enhance website security and prevent fraud.</li>
            </ul>
          </section>

          {/* 4. Data Storage and Security */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Data Storage and Security</h2>
            <p className="text-gray-600">
              PdfCircle gives high priority to your data security:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
              <li><strong>No Server Storage:</strong> Files you upload are processed in your browser and not stored on our servers.</li>
              <li><strong>Encryption:</strong> Any data transmission uses secure HTTPS protocols.</li>
              <li><strong>Temporary Processing:</strong> Uploaded files are discarded instantly after processing.</li>
              <li><strong>Protection:</strong> We implement industry-standard measures to safeguard our website against unauthorized access.</li>
            </ul>
            <p className="text-gray-600 mt-4">
              You are solely responsible for securing files on your device after downloading processed outputs.
            </p>
          </section>

          {/* 5. Third-Party Services */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Third-Party Services</h2>
            <p className="text-gray-600">
              We may use third-party services (e.g., analytical providers) to improve our Service. These providers may collect
              anonymized data, such as site visits, but do not access the files you upload. We ensure any third party complies
              with strict privacy standards.
            </p>
          </section>

          {/* 6. Data Usage and Tracking */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. Data Usage and Tracking</h2>
            <p className="text-gray-600">
              PdfCircle does not use cookies or track personal data. Our tools are designed to function independently without
              storing or sharing user information. We prioritize privacy by ensuring all processing happens locally in your
              browser whenever possible.
            </p>
          </section>

          {/* 7. Your Privacy Rights */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. Your Privacy Rights</h2>
            <p className="text-gray-600 mb-4">Through your location, you may have the following rights:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Access any personal data we hold (if applicable).</li>
              <li>Request the correction or deletion of your data at any time.</li>
              <li>Access, modify, or delete your data.</li>
              <li>Request data portability where feasible.</li>
              <li>Opt out of data processing (e.g., analytics).</li>
            </ul>
            <p className="text-gray-600 mt-4">
              To exercise these rights, contact us at the email below. Since we don’t store uploaded files, most requests relate
              to contact data only.
            </p>
          </section>

          {/* 8. Changes to This Policy */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">8. Changes to This Policy</h2>
            <p className="text-gray-600">
              PdfCircle may update this policy periodically. The latest version will be available on this page with an updated
              "Last Updated" date. Continued use of PdfCircle after changes indicates your acceptance.
            </p>
          </section>

          {/* 9. Contact Us */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">9. Contact Us</h2>
            <p className="text-gray-600">
              For any questions about this Privacy Policy or our data practices, please email us at{' '}
              <a href="mailto:pdfcircle369@gmail.com" className="text-indigo-600 hover:text-indigo-800">
                pdfcircle369@gmail.com
              </a>. We are always committed to addressing your concerns promptly.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}

export default PrivacyPolicy;