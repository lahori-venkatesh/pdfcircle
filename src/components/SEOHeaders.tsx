
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
  articlePublishDate?: string;
  articleModifiedDate?: string;
  articleAuthor?: string;
}

export function SEOHeaders({ 
  title, 
  description, 
  keywords = [],
  canonicalUrl,
  ogImage = 'https://www.pdfcircle.com/apple-touch-icon.webp',
  articlePublishDate,
  articleModifiedDate,
  articleAuthor,
}: SEOProps) {
  const location = useLocation();
  const baseUrl = 'https://pdfcircle.com';
  const defaultCanonicalUrl = canonicalUrl || `${baseUrl}${location.pathname.replace(/\/+$/, '')}`;

  const defaultTitle = 'pdfCircle | Free Document & Image Converter Tools';
  const defaultDescription = 'Transform PDFs and images with pdfCircle\'s free, secure online tools. Convert, compress, merge, edit, and enhance documents instantly. No registration required.';
  const defaultKeywords = [
    'pdfcircle', 'free pdf tools', 'free image tools', 'pdf converter', 'image editor',
    'compress pdf', 'merge pdf', 'split pdf', 'image to pdf', 'pdf to word',
    'edit pdf', 'pdf', 'compress pdf document', 'pdf format converter', 
    'convert to pdf', 'combine pdf', 'pdf compress', 'convert pdf to jpg',
    'file converter', 'document converter', 'online converter',
    'pdf converter online free', 'convert document to pdf', 'image converter',
    'free converter', 'best file converter', 'secure pdf tools', 'free online tools',
    'document processing', 'pdf compression', 'image optimization'
  ].concat(keywords);

  const uniqueKeywords = [...new Set(defaultKeywords)].join(', ');
  const pageTitle = title ? `${title} | pdfCircle` : defaultTitle;
  const pageDescription = description || defaultDescription;

  const schemaMarkup = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        'url': baseUrl,
        'name': 'pdfCircle',
        'description': defaultDescription,
        'potentialAction': {
          '@type': 'SearchAction',
          'target': `${baseUrl}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'WebPage',
        '@id': `${defaultCanonicalUrl}/#webpage`,
        'url': defaultCanonicalUrl,
        'name': pageTitle,
        'description': pageDescription,
        'isPartOf': { '@id': `${baseUrl}/#website` },
        'inLanguage': 'en-US',
        'datePublished': articlePublishDate || new Date().toISOString(),
        'dateModified': articleModifiedDate || new Date().toISOString(),
        'publisher': {
          '@type': 'Organization',
          'name': 'pdfCircle',
          'url': baseUrl,
          'logo': {
            '@type': 'ImageObject',
            'url': ogImage,
            'width': '180',
            'height': '180'
          }
        }
      }
    ]
  };

  if (articleAuthor) {
    schemaMarkup['@graph'].push({
      '@type': 'Article',
      'mainEntityOfPage': { '@id': `${defaultCanonicalUrl}/#webpage` },
      'headline': pageTitle,
      'author': { '@type': 'Person', 'name': articleAuthor },
      'datePublished': articlePublishDate,
      'dateModified': articleModifiedDate,
    });
  }

  return (
    <Helmet>
      <html lang="en" />
      <title>{pageTitle.length > 60 ? pageTitle.substring(0, 60) + '...' : pageTitle}</title>
      <meta name="description" content={pageDescription.length > 160 ? pageDescription.substring(0, 160) + '...' : pageDescription} />
      <meta name="keywords" content={uniqueKeywords} />
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      <meta name="bingbot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      
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
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="en_US" />

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
