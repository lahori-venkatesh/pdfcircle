import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
}

export function SEOHeaders({ 
  title, 
  description, 
  keywords = [],
  canonicalUrl,
  ogImage = 'https://www.pdfcircle.com/apple-touch-icon.webp',
}: SEOProps) {
  const location = useLocation();
  const baseUrl = 'https://pdfcircle.com/';
  const defaultCanonicalUrl = canonicalUrl || `${baseUrl}${location.pathname.replace(/\/+$/, '')}`;

  // Optimized defaults
  const defaultTitle = 'pdfCircle | Free Document & Image Converter Tools';
  const defaultDescription = 'Transform PDFs and images with pdfCircle’s free, secure tools. Convert, compress, and unlock powerful editing features.';
  const defaultKeywords = [
    'pdfcircle', 'free pdf tools', 'free image tools', 'pdf converter', 'image editor',
    'compress pdf', 'merge pdf', 'split pdf', 'image to pdf', 'pdf to word'
  ].concat(keywords);
  const uniqueKeywords = [...new Set(defaultKeywords)].join(', ');

  const pageTitle = title ? `${title} | pdfCircle` : defaultTitle;
  const pageDescription = description || defaultDescription;

  // Schema.org tailored for homepage
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
        'mainEntity': {
          '@type': 'ItemList',
          'itemListElement': [
            { '@type': 'WebPageElement', 'name': 'Features', 'description': 'Unlock powerful PDF and image tools.' },
            { '@type': 'WebPageElement', 'name': 'How It Works', 'description': 'Simple document processing steps.' },
            { '@type': 'WebPageElement', 'name': 'Security', 'description': 'Your data is safe with us.' },
            { '@type': 'WebPageElement', 'name': 'FAQ', 'description': 'Answers to common questions.' },
          ],
        },
      },
    ],
  };

  return (
    <Helmet>
      <title>{pageTitle.length > 60 ? pageTitle.substring(0, 60) + '...' : pageTitle}</title>
      <meta name="description" content={pageDescription.length > 160 ? pageDescription.substring(0, 160) + '...' : pageDescription} />
      <meta name="keywords" content={uniqueKeywords} />
      <link rel="canonical" href={defaultCanonicalUrl} />

      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href={ogImage} />
      <link rel="icon" type="image/png" sizes="32x32" href={ogImage} />
      <link rel="icon" type="image/png" sizes="16x16" href={ogImage} />

      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content={defaultCanonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="pdfCircle" />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="180" />
      <meta property="og:image:height" content="180" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content="@pdfcircle" />

      <script type="application/ld+json">
        {JSON.stringify(schemaMarkup, null, 2)}
      </script>
    </Helmet>
  );
}