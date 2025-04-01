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
  const baseUrl = 'https://pdfcircle.com/';
  const currentUrl = canonicalUrl || `${baseUrl}${location.pathname}`;

  const defaultTitle = 'PdfCircle | Free Tools for Converting Documents and Images.';
  const defaultDescription = 'PdfCircle-Free all-in-one tool to convert, compress, merge, and enhance PDFs and images easily';
  const defaultKeywords = [
    'pdfcircle',
    'pdf circle',
    'convert image to pdf online',
    'pdf to jpg converter free',
    'split pdf online free',
    'merge pdf files online',
    'ocr pdf to text free',
    'compress pdf size online',
    'image to digital converter free',
    'reduce image file size online',
    'free pdf converter online',
    'best pdf to image converter',
    'online pdf compressor tool',
    'merge pdf documents securely',
    'split pdf by pages free',
    'convert jpg to pdf without software',
    'free ocr software for pdf',
    'reduce pdf file size for email',
    'alternatives to ilovepdf',
    'online pdf editor free',
    'pdfCircle free pdf converter online',
    'pdfCircle pdf to jpg converter free',
    'pdfCircle split pdf online free',
    'pdfCircle merge pdf files online',
    'pdfCircle ocr pdf to text free',
    'pdfCircle compress pdf size online',
    'pdfCircle image to digital converter free',
    'pdfCircle reduce image file size online',
    'free online pdf converter',
    'best pdf to image converter online',
    'pdfCircle online pdf compressor free',
    'pdfCircle merge pdf documents securely',
    'pdfCircle split pdf by pages free',
    'pdfCircle convert jpg to pdf online',
    'pdfCircle free ocr software for pdf',
    'pdfCircle reduce pdf file size for email',
    'pdfCircle alternatives to ilovepdf',
    'pdfCircle online pdf editor free',
    'how to use pdfCircle to compress pdf',
    'pdfCircle convert scanned pdf to text',
    'convert image to pdf online free',
    'jpg to pdf converter free',
    'png to pdf converter online',
    'image to text converter free',
    'convert image to word online',
    'free image format converter',
    'best image to pdf converter',
    'convert multiple images to pdf',
    'resize image online free',
    'how to resize an image without losing quality',
    'free image resizer tool',
    'bulk image resize online',
    'reduce image size for email',
    'resize image to specific dimensions',
    'best free image resizing software',
    'compress and resize images online',
    // Added from previous discussion
    'pdfCircle document conversion tools',
    'pdfCircle image enhancement online',
    'pdfCircle ocr scan to text free',
    'pdfCircle pdf editing tools online',
    'pdfCircle file compression tools free',
    'pdfCircle pdf to word converter free',
    'pdfCircle pdf to excel converter online',
    'pdfCircle document management tools',
    'pdfCircle image resizing tools free',
    'pdfCircle pdf merge and split online'
  ];

  const pageTitle = title ? `${title} | pdfcircle` : defaultTitle;
  const pageDescription = description || defaultDescription;
  const pageKeywords = [...new Set([...defaultKeywords, ...keywords])].join(', ');

  // Define key pages for sitelinks based on the provided routes
  const keyPages = [
    {
      name: 'Home',
      description: 'Free online tools to convert, compress, and edit PDFs and images with pdfCircle.',
      url: `${baseUrl}`
    },
    {
      name: 'Image Tools',
      description: 'Convert, resize, and enhance images with our free online image tools.',
      url: `${baseUrl}image-tools`
    },
    {
      name: 'PDF Tools',
      description: 'Compress, merge, split, and convert PDFs with our free PDF tools.',
      url: `${baseUrl}pdf-tools`
    },
    {
      name: 'HTML to PDF',
      description: 'Convert HTML pages to PDF documents easily and for free.',
      url: `${baseUrl}html-to-pdf`
    },
    {
      name: 'Digital Enhancer',
      description: 'Enhance your digital images with our free online tool.',
      url: `${baseUrl}digital-enhancer`
    },
    {
      name: 'Background Remover',
      description: 'Remove backgrounds from images quickly and for free.',
      url: `${baseUrl}background-remover`
    }
  ];

  // Additional informational pages
  const informationalPages = [
    {
      name: 'About Us',
      description: 'Learn more about pdfCircle and our mission.',
      url: `${baseUrl}about`
    },
    {
      name: 'Privacy Policy',
      description: 'Read our privacy policy to understand how we handle your data.',
      url: `${baseUrl}privacy`
    },
    {
      name: 'Terms of Service',
      description: 'View our terms of service for using pdfCircle tools.',
      url: `${baseUrl}terms`
    },
    {
      name: 'Contact Us',
      description: 'Get in touch with the pdfCircle team for support or inquiries.',
      url: `${baseUrl}contact`
    }
  ];

  const allPages = [...keyPages, ...informationalPages];

  // Schema.org markup for WebSite and WebPage
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
          'query-input': 'required name=search_term_string'
        },
        'mainEntity': keyPages.map(page => ({
          '@type': 'WebPage',
          'name': page.name,
          'description': page.description,
          'url': page.url
        }))
      },
      {
        '@type': 'WebPage',
        'url': currentUrl,
        'name': pageTitle,
        'description': pageDescription,
        'isPartOf': {
          '@type': 'WebSite',
          'url': baseUrl
        },
        'publisher': {
          '@type': 'Organization',
          'name': 'pdfCircle',
          'url': baseUrl,
          'logo': {
            '@type': 'ImageObject',
            'url': `${baseUrl}apple-touch-icon.png`,
            'width': '180',
            'height': '180'
          }
        },
        'mainEntity': {
          '@type': 'SoftwareApplication',
          'name': 'pdfCircle Tools',
          'applicationCategory': 'UtilitiesApplication',
          'operatingSystem': 'Web',
          'offers': {
            '@type': 'Offer',
            'price': '0',
            'priceCurrency': 'USD'
          },
          'featureList': [
            'PDF Compression',
            'Image to PDF Conversion',
            'PDF Merging',
            'OCR Text Extraction',
            'Image Resizing',
            'Background Removal',
            'HTML to PDF Conversion'
          ]
        },
        'hasPart': allPages.map(page => ({
          '@type': 'WebPage',
          'name': page.name,
          'description': page.description,
          'url': page.url
        }))
      }
    ]
  };

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={pageKeywords} />
      <link rel="canonical" href={currentUrl} />

      {/* Favicon and Apple Touch Icon */}
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link 
        rel="apple-touch-icon" 
        sizes="180x180" 
        href="/apple-touch-icon.png" 
      />
      <link 
        rel="icon" 
        type="image/png" 
        sizes="32x32" 
        href="/apple-touch-icon.png" 
      />
      <link 
        rel="icon" 
        type="image/png" 
        sizes="16x16" 
        href="/apple-touch-icon.png" 
      />

      {/* Open Graph Tags */}
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="pdfCircle" />
      <meta property="og:image" content={`${baseUrl}apple-touch-icon.png`} />
      <meta property="og:image:width" content="180" />
      <meta property="og:image:height" content="180" />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={`${baseUrl}apple-touch-icon.png`} />

      {/* Schema.org JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify(schemaMarkup, null, 2)}
      </script>
    </Helmet>
  );
}