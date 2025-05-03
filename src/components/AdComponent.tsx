import React, { useEffect, useRef, useState } from 'react';

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

export const AdComponent: React.FC<AdProps> = React.memo(({ slot, format = 'auto', style, className, responsive = true }: AdProps) => {
  const adRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const isProduction = import.meta.env.PROD;

  useEffect(() => {
    // Load Google AdSense script only once
    if (!document.querySelector('script[src*="pagead2.googlesyndication.com"]')) {
      const script = document.createElement('script');
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (!adRef.current || isLoaded) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // Only push ad if not already loaded
            if (!isLoaded) {
              // Delay ad push slightly to ensure script is loaded
              setTimeout(() => {
                try {
                  if (!adRef.current?.querySelector('.adsbygoogle[data-ad-status]')) {
                    (window.adsbygoogle = window.adsbygoogle || []).push({});
                  }
                  setIsLoaded(true);
                } catch (error) {
                  // Silently handle ad loading errors
                }
              }, 100);
            }
          }
        });
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    observer.observe(adRef.current);
    return () => observer.disconnect();
  }, [isLoaded]);

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
    <div 
      ref={adRef} 
      className={`ad-container ${className}`} 
      style={{ 
        minHeight: '100px',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out',
        ...style 
      }}
    >
      {isVisible && (
        <ins
          className="adsbygoogle"
          style={{
            display: 'block',
            ...(responsive && { width: '100%' })
          }}
          data-ad-client="ca-pub-2007908196419480"
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive={responsive}
          data-overlap="false"
        />
      )}
    </div>
  );
});

export const StickyBottomAd = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg z-50 safe-bottom">
      <AdComponent
        slot="1049089258"
        className="mx-auto max-w-4xl py-2 px-4"
        style={{ 
          minHeight: '50px', 
          maxHeight: '100px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
        responsive={true}
        format="horizontal"
      />
    </div>
  );
};