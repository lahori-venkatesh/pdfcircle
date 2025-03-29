import React from 'react';
import { FileText, Users, Globe, Shield, Award, Code } from 'lucide-react';
import { SEOHeaders } from './SEOHeaders';

export function AboutUs() {
  return (
    <>
      <SEOHeaders
        title="About Us - pdfcircle | Document & Image Converter Tools"
        description="Discover PDFCircle Mission: Providing Free, Secure, and Innovative Document and Image Processing Tools, Crafted by Developers Venkatesh and Prudvi Kumar"
        keywords={[
          'about pdfcircle',
          'free pdf tools',
          'document conversion online',
          'image processing tools',
          'venkatesh developer',
          'prudvi developer',
          'secure pdf tools'
        ]}
      />
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">About Hallopdf</h1>
        
        <div className="prose prose-lg max-w-none">
          {/* Introduction */}
          <section className="mb-12">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center justify-center">
                <Globe className="w-6 h-6 mr-2" />
                Who We Are
              </h2>
              <p className="text-lg text-white/90">
                Welcome to pdfcircle, your go-to platform for free, reliable, and secure online tools for document
                conversion and image processing. Founded by passionate developers Venkatesh and Prudvi Varma, we’re
                committed to making productivity tools accessible to everyone—no subscriptions, no hassle, just results.
              </p>
            </div>
          </section>

          {/* Mission */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
              <Award className="w-6 h-6 mr-2" />
              Our Mission
            </h2>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <p className="text-gray-600">
                At pdfcircle, our mission is simple: empower users worldwide with high-quality tools to edit PDFs,
                convert documents, and process images effortlessly. Whether you’re a student, professional, or
                creative, Venkatesh and Prudvi Varma have designed this platform to break down barriers and boost your efficiency.
              </p>
            </div>
          </section>

          {/* Meet the Developers */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
              <Users className="w-6 h-6 mr-2" />
              Meet Our Developers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Venkatesh</h3>
                <p className="text-gray-600">
                  Venkatesh is the technical visionary behind pdfcircle, bringing expertise in web development and
                  innovative problem-solving. His goal? To create tools that are fast, secure, and user-friendly.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Prudvi</h3>
                <p className="text-gray-600">
                  Prudvi Varma is the creative force driving pdfcircle seamless user experience. With a knack for design
                  and functionality, he ensures our tools are intuitive and meet real-world needs.
                </p>
              </div>
            </div>
          </section>

          {/* Why Choose Us */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
              <Shield className="w-6 h-6 mr-2" />
              Why Choose pdfcircle?
            </h2>
            <div className="bg-gray-50 p-6 rounded-lg">
              <ul className="space-y-4 text-gray-600">
                <li className="flex items-start">
                  <Shield className="w-5 h-5 text-indigo-600 mr-2 mt-1" />
                  <span><strong>Privacy First:</strong> All processing happens in your browser—no files are stored on our servers.</span>
                </li>
                <li className="flex items-start">
                  <Globe className="w-5 h-5 text-indigo-600 mr-2 mt-1" />
                  <span><strong>Free Forever:</strong> Access premium-quality tools at no cost, thanks to Venkatesh and Prudvi’s vision.</span>
                </li>
                <li className="flex items-start">
                  <Code className="w-5 h-5 text-indigo-600 mr-2 mt-1" />
                  <span><strong>Cutting-Edge Tech:</strong> Built with modern web standards for speed and reliability.</span>
                </li>
                <li className="flex items-start">
                  <Users className="w-5 h-5 text-indigo-600 mr-2 mt-1" />
                  <span><strong>User-Centric:</strong> Designed with you in mind, from students to small businesses.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Call to Action */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
              <FileText className="w-6 h-6 mr-2" />
              Join Our Journey
            </h2>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <p className="text-gray-600 mb-4">
                Venkatesh and Prudvi kumar are excited to have you here! Explore our tools, share your feedback, and help us
                shape the future of Hallopdf. Have questions? We’re just a click away.
              </p>
              <a
                href="/contact"
                className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <FileText className="w-5 h-5 mr-2" />
                Contact Us
              </a>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}