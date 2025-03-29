import React, { useEffect, useRef } from 'react';

interface AdProps {
  slot: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal';
  style?: React.CSSProperties;
  className?: string;
  responsive?: boolean;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export function AdComponent({ slot, format = 'auto', style, className, responsive = true }: AdProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const isProduction = import.meta.env.PROD;

  useEffect(() => {
    if (isProduction && adRef.current) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        console.error('Error loading AdSense ad:', error);
      }
    }
  }, []);

  if (!isProduction) {
    return (
      <div
        ref={adRef}
        className={`bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center ${className}`}
        style={{
          minHeight: '100px',
          ...style
        }}
      >
        <span className="text-gray-500 text-sm">Ad Placeholder - {slot}</span>
      </div>
    );
  }

  return (
    <div ref={adRef} className={className} style={style}>
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          ...(responsive && { width: '100%' })
        }}
        data-ad-client="ca-pub-YOUR_CLIENT_ID" // Replace with your AdSense client ID
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive}
      />
    </div>
  );
}

export function StickyBottomAd() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg z-50">
      <AdComponent
        slot="sticky-bottom"
        className="mx-auto max-w-4xl py-2 px-4"
        style={{ minHeight: '50px', maxHeight: '100px' }}
      />
    </div>
  );
}