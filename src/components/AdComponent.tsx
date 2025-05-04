import React, { useEffect, useRef, useState } from 'react';

interface AdProps {
  slot?: string; // Optional, defaults set based on device
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal';
  style?: React.CSSProperties;
  className?: string;
  responsive?: boolean;
  isStickyBottomAd?: boolean; // Flag for StickyBottomAd
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export const AdComponent: React.FC<AdProps> = React.memo(
  ({
    slot,
    format = 'auto',
    style,
    className = '',
    responsive = true,
    isStickyBottomAd = false,
  }: AdProps) => {
    const adRef = useRef<HTMLDivElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [adError, setAdError] = useState<string | null>(null);
    const adInitialized = useRef(false);
    const retryCount = useRef(0);
    const maxRetries = 3;
    const isProduction = import.meta.env.PROD;
    const retryTimeout = useRef<NodeJS.Timeout>();

    // Detect mobile device (≤ 768px) with a more performant approach
    const [isMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches);

    const initializeAd = () => {
      try {
        if (window.adsbygoogle && !adInitialized.current) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          adInitialized.current = true;
          setIsLoaded(true);
          setAdError(null);
        }
      } catch (error) {
        console.error('Ad initialization error:', error);
        if (retryCount.current < maxRetries) {
          retryCount.current += 1;
          retryTimeout.current = setTimeout(initializeAd, 1000 * retryCount.current);
        } else {
          setAdError('Failed to initialize ad');
        }
      }
    };

    useEffect(() => {
      if (typeof window === 'undefined') return;
      
      // Check if AdBlocker is enabled
      const checkAdBlocker = async () => {
        try {
          await fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
            method: 'HEAD',
            mode: 'no-cors'
          });
          initializeAd();
        } catch (error) {
          setAdError('Please disable ad blocker');
        }
      };

      checkAdBlocker();

      return () => {
        if (retryTimeout.current) {
          clearTimeout(retryTimeout.current);
        }
      };
    }, []);

    // Select slot ID and format based on device and context
    const desktopSlots = ['4325618154', '1049089258'];
    const effectiveSlot = slot && !desktopSlots.includes(slot)
      ? slot
      : isMobile
      ? isStickyBottomAd
        ? '8611335761' // Mobile sticky ad
        : '8225705840' // Mobile in-content ad
      : isStickyBottomAd
      ? '4325618154' // Desktop sticky ad
      : '1049089258'; // Desktop in-content ad
    const effectiveFormat = isMobile ? 'horizontal' : format;

    useEffect(() => {
      if (!adRef.current || isLoaded) return;

      // Load Google AdSense script
      const loadAdScript = () => {
        if (!document.querySelector('script[src*="pagead2.googlesyndication.com"]')) {
          // Preload script (should be in HTML head, but ensure it's loaded here if not)
          const script = document.createElement('script');
          script.async = true;
          script.crossOrigin = 'anonymous';
          script.src =
            'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2007908196419480';
          script.onload = () => {
            console.log('AdSense script loaded');
            pushAd();
          };
          script.onerror = () => {
            console.error('Failed to load AdSense script');
            retryLoad();
          };
          document.head.appendChild(script);
        } else {
          pushAd();
        }
      };

      const pushAd = () => {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          setIsLoaded(true);
          setAdError(null);
          console.log('Ad pushed for slot:', effectiveSlot);
        } catch (e) {
          console.error('Ad push failed:', e);
          retryLoad();
        }
      };

      const retryLoad = () => {
        if (retryCount.current < maxRetries) {
          retryCount.current += 1;
          console.log(`Retrying ad load, attempt ${retryCount.current}`);
          // Exponential backoff: 100ms, 200ms, 400ms
          setTimeout(() => {
            if (window.adsbygoogle) {
              pushAd();
            } else {
              loadAdScript();
            }
          }, 100 * Math.pow(2, retryCount.current));
        } else {
          setAdError('Failed to load ad');
          console.error('Max retries reached for slot:', effectiveSlot);
        }
      };

      // Use IntersectionObserver to load ad when in view
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !isLoaded) {
            loadAdScript();
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );

      if (adRef.current) {
        observer.observe(adRef.current);
      }

      return () => observer.disconnect();
    }, [isLoaded, effectiveSlot]);

    if (!isProduction) {
      return (
        <div
          ref={adRef}
          className={`bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 ${className}`}
          style={{
            minHeight: isMobile ? '50px' : isStickyBottomAd ? '100px' : '90px',
            ...style,
          }}
        >
          <span className="text-sm">Ad Placeholder - {effectiveSlot}</span>
        </div>
      );
    }

    return (
      <div
        ref={adRef}
        className={`ad-container bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${className}`}
        style={{
          minHeight: isMobile ? '50px' : isStickyBottomAd ? '100px' : '90px',
          opacity: isLoaded ? 1 : 0.3,
          transition: 'opacity 0.2s ease-in-out',
          ...style,
        }}
      >
        {!isLoaded && (
          <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
            {adError ? (
              <span className="text-red-600 dark:text-red-400 text-sm">
                Ad not available
              </span>
            ) : (
              <span className="text-sm animate-pulse">Loading ad...</span>
            )}
          </div>
        )}
        <ins
          className="adsbygoogle"
          style={{
            display: isLoaded ? 'block' : 'none',
            ...(responsive && { width: '100%' }),
          }}
          data-ad-client="ca-pub-2007908196419480"
          data-ad-slot={effectiveSlot}
          data-ad-format={effectiveFormat}
          data-full-width-responsive={responsive.toString()}
          data-overlap="false"
        />
      </div>
    );
  }
);

export const StickyBottomAd: React.FC = React.memo(() => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-gray-800 z-50">
      <AdComponent
        className="mx-auto max-w-full sm:max-w-4xl py-1 px-2 sm:px-4 bg-gray-100 dark:bg-gray-800 h-[50px] sm:h-[100px]"
        style={{
          minHeight: '50px',
          maxHeight: '50px',
          ...(window.innerWidth > 768 && {
            minHeight: '100px',
            maxHeight: '100px',
          }),
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        responsive={true}
        format="horizontal"
        isStickyBottomAd={true}
      />
    </div>
  );
});