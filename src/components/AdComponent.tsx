import React, { useEffect, useRef, useState } from 'react';

interface AdProps {
  slot?: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal';
  style?: React.CSSProperties;
  className?: string;
  responsive?: boolean;
  isStickyBottomAd?: boolean;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export const AdComponent: React.FC<AdProps> = React.memo(({ 
  slot, 
  format = 'auto', 
  style, 
  className = '', 
  responsive = true, 
  isStickyBottomAd = false 
}: AdProps) => {
  const adRef = useRef<HTMLDivElement>(null);
  const insRef = useRef<HTMLElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);
  const retryCount = useRef(0);
  const maxRetries = 5;
  const isProduction = import.meta.env.PROD;
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const desktopSlots = ['4325618154', '1049089258'];
  const effectiveSlot = slot && !desktopSlots.includes(slot)
    ? slot
    : isMobile
      ? isStickyBottomAd
        ? '8611335761'
        : '8225705840'
      : isStickyBottomAd
        ? '4325618154'
        : '1049089258';
  const effectiveFormat = isMobile ? 'horizontal' : format;

  useEffect(() => {
    let mounted = true;

    const loadAdScript = () => {
      if (document.querySelector('script[src*="pagead2.googlesyndication.com"]')) {
        pushAd();
        return;
      }

      const script = document.createElement('script');
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2007908196419480&nonce=${Math.random().toString(36).substring(2)}`;
      script.onload = () => {
        if (mounted) {
          console.log('AdSense script loaded');
          pushAd();
        }
      };
      script.onerror = () => {
        if (mounted) {
          console.error('Failed to load ad script');
          retryLoad();
        }
      };
      document.head.appendChild(script);
    };

    const pushAd = () => {
      if (!adRef.current || !mounted || isLoaded) return;

      try {
        // Remove existing ins element if it exists
        if (insRef.current && insRef.current.parentNode) {
          insRef.current.parentNode.removeChild(insRef.current);
        }

        // Create new ins element
        const ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'block';
        if (responsive) ins.style.width = '100%';
        ins.setAttribute('data-ad-client', 'ca-pub-2007908196419480');
        ins.setAttribute('data-ad-slot', effectiveSlot);
        ins.setAttribute('data-ad-format', effectiveFormat);
        ins.setAttribute('data-full-width-responsive', responsive.toString());
        ins.setAttribute('data-overlap', 'false');
        adRef.current.appendChild(ins);
        insRef.current = ins;

        // Initialize adsbygoogle array
        window.adsbygoogle = window.adsbygoogle || [];

        // Push ad
        window.adsbygoogle.push({});

        if (mounted) {
          setIsLoaded(true);
          setAdError(null);
          console.log('Ad pushed for slot:', effectiveSlot);
        }
      } catch (e: any) {
        console.error('Ad push failed', e);
        if (mounted && e.message.includes('adsbygoogle.push() error')) {
          setAdError('Ad blocked or already loaded');
          setIsLoaded(false);
        } else if (mounted) {
          retryLoad();
        }
      }
    };

    const retryLoad = () => {
      if (!mounted || retryCount.current >= maxRetries) {
        if (mounted) {
          setAdError('Ad blocked or network error');
          setIsLoaded(false);
        }
        return;
      }

      retryCount.current += 1;
      const delay = Math.min(1000 * Math.pow(2, retryCount.current - 1), 10000);

      setTimeout(() => {
        if (!mounted) return;
        pushAd();
      }, delay);
    };

    // Reset state on slot change
    setIsLoaded(false);
    setAdError(null);
    retryCount.current = 0;

    // Initial load
    loadAdScript();

    return () => {
      mounted = false;
      if (insRef.current && insRef.current.parentNode) {
        insRef.current.parentNode.removeChild(insRef.current);
      }
      insRef.current = null;
    };
  }, [effectiveSlot, effectiveFormat, responsive]);

  if (!isProduction) {
    return (
      <div
        ref={adRef}
        className={`bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 ${className}`}
        style={{
          minHeight: isMobile ? '50px' : isStickyBottomAd ? '100px' : '90px',
          ...style
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
        opacity: isLoaded ? 1 : 0.5,
        transition: 'opacity 0.3s ease-in-out',
        ...style
      }}
    >
      {!isLoaded && (
        <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
          {adError ? (
            <span className="text-red-600 dark:text-red-400 text-sm">
              {adError === 'Ad blocked or network error' 
                ? 'Please disable ad blocker or check network'
                : adError}
            </span>
          ) : (
            <span className="text-sm">Loading ad...</span>
          )}
        </div>
      )}
    </div>
  );
});

export const StickyBottomAd: React.FC = React.memo(() => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-gray-800 z-50 safe-bottom">
      <AdComponent
        className="mx-auto max-w-full sm:max-w-4xl py-1 px-2 sm:px-4 bg-gray-100 dark:bg-gray-800 h-[50px] sm:h-[100px]"
        style={{
          minHeight: '50px',
          maxHeight: '50px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
        responsive={true}
        format="horizontal"
        isStickyBottomAd={true}
      />
    </div>
  );
});