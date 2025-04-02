import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string; // Required for explicit control
  ogImage?: string; // Optional OG image URL
}

export function SEOHeaders({ 
  title, 
  description, 
  keywords = [],
  canonicalUrl,
  ogImage = 'https://www.pdfcircle.com/apple-touch-icon.png',
}: SEOProps) {
  const location = useLocation();
  const baseUrl = 'https://pdfcircle.com/';
  const defaultCanonicalUrl = canonicalUrl || `${baseUrl}${location.pathname.replace(/\/+$/, '')}`; // Clean trailing slashes

  // Default SEO Values (Optimized for brevity and impact)
  const defaultTitle = 'pdfCircle | Free PDF & Image Tools';
  const defaultDescription = 'Compress, convert, and edit PDFs and images online for free with pdfCircle. Fast, secure, and easy-to-use tools.';
  const defaultKeywords = [
    'pdfcircle', 'pdf converter', 'image converter', 'compress pdf', 'convert pdf to jpg', 'free pdf tools',
    'pdf compression', 'image optimization', 'online document tools', 'secure file conversion', 'pdf to word',
    'pdf to excel', 'image resize', 'image to pdf', 'ocr pdf', 'merge pdf', 'split pdf', 'background remover',
  ].concat(keywords); // Merge with page-specific keywords, removing duplicates

  // Ensure unique keywords
  const uniqueKeywords = [...new Set(defaultKeywords)].join(', ');

  // Page-specific values with fallbacks
  const pageTitle = title ? `${title} | pdfCircle` : defaultTitle;
  const pageDescription = description || defaultDescription;

  // Define key and informational pages for Schema.org (expanded from your list)
  const keyPages = [
    { name: 'Home', url: `${baseUrl}`, description: 'Free online tools to convert, compress, and edit PDFs and images.' },
    { name: 'Image Tools', url: `${baseUrl}image-tools`, description: 'Resize, convert, and enhance images online for free.' },
    { name: 'PDF Tools', url: `${baseUrl}pdf-tools`, description: 'Compress, merge, split, and convert PDFs online securely.' },
    { name: 'HTML to PDF', url: `${baseUrl}html-to-pdf`, description: 'Convert HTML to PDF easily and for free.' },
    { name: 'Digital Enhancer', url: `${baseUrl}digital-enhancer`, description: 'Enhance digital images with our free tools.' },
    { name: 'Background Remover', url: `${baseUrl}background-remover`, description: 'Remove backgrounds from images quickly and free.' },
  ];

  const informationalPages = [
    { name: 'About Us', url: `${baseUrl}about`, description: 'Learn about pdfCircle and our mission.' },
    { name: 'Privacy Policy', url: `${baseUrl}privacy`, description: 'Understand how we handle your data with our privacy policy.' },
    { name: 'Terms of Service', url: `${baseUrl}terms`, description: 'Review our terms for using pdfCircle tools.' },
    { name: 'Contact Us', url: `${baseUrl}contact`, description: 'Contact pdfCircle for support or inquiries.' },
  ];

  const allPages = [...keyPages, ...informationalPages];

  // Enhanced Schema.org Markup
  const schemaMarkup = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        'name': 'pdfCircle',
        'url': baseUrl,
        'potentialAction': {
          '@type': 'SearchAction',
          'target': `${baseUrl}search?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
        'sameAs': ['https://www.facebook.com/pdfcircle', 'https://twitter.com/pdfcircle'], // Add social profiles if applicable
      },
      {
        '@type': 'WebPage',
        'url': defaultCanonicalUrl,
        'name': pageTitle,
        'description': pageDescription,
        'isPartOf': { '@type': 'WebSite', 'url': baseUrl, 'name': 'pdfCircle' },
        'publisher': {
          '@type': 'Organization',
          'name': 'pdfCircle',
          'url': baseUrl,
          'logo': { '@type': 'ImageObject', 'url': ogImage, 'width': '180', 'height': '180' },
        },
        'inLanguage': 'en-US',
        'potentialAction': {
          '@type': 'ReadAction',
          'target': [defaultCanonicalUrl],
        },
        'hasPart': allPages.map(page => ({
          '@type': 'WebPage',
          'name': page.name,
          'url': page.url,
          'description': page.description,
        })),
      },
    ],
  };

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{pageTitle.length > 60 ? pageTitle.substring(0, 60) + '...' : pageTitle}</title>
      <meta name="description" content={pageDescription.length > 160 ? pageDescription.substring(0, 160) + '...' : pageDescription} />
      <meta name="keywords" content={uniqueKeywords} />
      <link rel="canonical" href={defaultCanonicalUrl} />

      {/* Favicon and Icons */}
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href={ogImage} />
      <link rel="icon" type="image/png" sizes="32x32" href={ogImage} />
      <link rel="icon" type="image/png" sizes="16x16" href={ogImage} />

      {/* Open Graph Tags */}
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content={defaultCanonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="pdfCircle" />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="180" />
      <meta property="og:image:height" content="180" />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content="@pdfcircle" /> {/* Add your Twitter handle if applicable */}

      {/* Schema.org JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify(schemaMarkup, null, 2)}
      </script>
    </Helmet>
  );
}