import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
}

export function SEOHeaders({ 
  title, 
  description, 
  keywords = [],
  canonicalUrl
}: SEOProps) {
  const location = useLocation();
  const baseUrl = 'https://bropdf.com'; // Replace with your actual domain
  const currentUrl = canonicalUrl || `${baseUrl}${location.pathname}`;

  const defaultTitle = 'Free Online PDF & Image Tools | Convert, Compress, Enhance | Bropdf';
  const defaultDescription = 'Convert images to PDF, merge PDFs, compress files, and enhance images online for free. No registration required. Fast, secure, and high-quality document conversion tools.';
  const defaultKeywords = [
    'convert image to pdf',
    'pdf to jpg converter',
    'split pdf online',
    'merge pdf files',
    'ocr pdf to text',
    'compress pdf size',
    'image to digital converter',
    'reduce image file size'
  ];

  const pageTitle = title ? `${title} | Bropdf` : defaultTitle;
  const pageDescription = description || defaultDescription;
  const pageKeywords = [...new Set([...defaultKeywords, ...keywords])].join(', ');

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={pageKeywords} />
      <link rel="canonical" href={currentUrl} />
      
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content={currentUrl} />
      
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
    </Helmet>
  );
}