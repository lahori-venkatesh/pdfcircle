
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
  noindex?: boolean;
  nofollow?: boolean;
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
  noindex = false,
  nofollow = false,
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
    'document processing', 'pdf compression', 'image optimization', 'ocr pdf',
    'pdf to excel', 'watermark pdf', 'sign pdf', 'lock pdf', 'unlock pdf',
    'html to pdf', 'compare pdfs', 'bank statement pdf', 'image compression',
    'image resizing', 'format conversion', 'batch processing'
  ].concat(keywords);

  const uniqueKeywords = [...new Set(defaultKeywords)].join(', ');
  const pageTitle = title ? `${title} | pdfCircle` : defaultTitle;
  const pageDescription = description || defaultDescription;

  // Enhanced structured data
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
        'sameAs': [
          'https://twitter.com/pdfcircle',
          'https://www.linkedin.com/company/pdfcircle'
        ]
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
          },
          'contactPoint': {
            '@type': 'ContactPoint',
            'contactType': 'customer service',
            'url': `${baseUrl}/contact`
          }
        },
        'breadcrumb': {
          '@type': 'BreadcrumbList',
          'itemListElement': [
            {
              '@type': 'ListItem',
              'position': 1,
              'name': 'Home',
              'item': baseUrl
            },
            {
              '@type': 'ListItem',
              'position': 2,
              'name': title || 'Tools',
              'item': defaultCanonicalUrl
            }
          ]
        }
      },
      {
        '@type': 'SoftwareApplication',
        'name': 'pdfCircle',
        'applicationCategory': 'ProductivityApplication',
        'operatingSystem': 'Web Browser',
        'description': 'Free online PDF and image processing tools',
        'url': baseUrl,
        'offers': {
          '@type': 'Offer',
          'price': '0',
          'priceCurrency': 'USD'
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

  // Robots meta tag
  const robotsContent = noindex || nofollow 
    ? `${noindex ? 'noindex' : 'index'},${nofollow ? 'nofollow' : 'follow'}`
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

  return (
    <Helmet>
      <html lang="en" />
      <title>{pageTitle.length > 60 ? pageTitle.substring(0, 60) + '...' : pageTitle}</title>
      <meta name="description" content={pageDescription.length > 160 ? pageDescription.substring(0, 160) + '...' : pageDescription} />
      <meta name="keywords" content={uniqueKeywords} />
      <meta name="robots" content={robotsContent} />
      <meta name="googlebot" content={robotsContent} />
      <meta name="bingbot" content={robotsContent} />
      
      {/* Canonical and alternate links */}
      <link rel="canonical" href={defaultCanonicalUrl} />
      <link rel="alternate" hrefLang="en" href={defaultCanonicalUrl} />
      
      {/* Favicon and app icons */}
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href={ogImage} />
      <link rel="icon" type="image/png" sizes="32x32" href={ogImage} />
      <link rel="icon" type="image/png" sizes="16x16" href={ogImage} />
      <link rel="manifest" href="/manifest.json" />

      {/* Open Graph tags */}
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content={defaultCanonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="pdfCircle" />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:image:alt" content="pdfCircle - Free PDF and Image Tools" />

      {/* Twitter Card tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content="@pdfcircle" />
      <meta name="twitter:creator" content="@pdfcircle" />

      {/* Additional meta tags for better SEO */}
      <meta name="author" content="pdfCircle" />
      <meta name="application-name" content="pdfCircle" />
      <meta name="theme-color" content="#3B82F6" />
      <meta name="msapplication-TileColor" content="#3B82F6" />
      <meta name="msapplication-config" content="/browserconfig.xml" />
      
      {/* Mobile optimization */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
      <meta name="format-detection" content="telephone=no" />
      
      {/* Security headers */}
      <meta http-equiv="X-Content-Type-Options" content="nosniff" />
      <meta http-equiv="X-Frame-Options" content="DENY" />
      <meta http-equiv="X-XSS-Protection" content="1; mode=block" />
      
      {/* Preconnect for performance */}
      <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
      <link rel="preconnect" href="https://www.google-analytics.com" />
      <link rel="preconnect" href="https://www.googletagmanager.com" />
      <link rel="dns-prefetch" href="https://pagead2.googlesyndication.com" />
      <link rel="dns-prefetch" href="https://www.google-analytics.com" />

      {/* Structured data */}
      <script type="application/ld+json">
        {JSON.stringify(schemaMarkup, null, 2)}
      </script>
    </Helmet>
  );
}
