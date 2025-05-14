import React, { useEffect, useRef, useCallback } from 'react';

interface AdProps {
  slot: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal';
  style?: React.CSSProperties;
  className?: string;
  responsive?: boolean;
  lazyLoad?: boolean;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export function AdComponent({
  slot,
  format = 'auto',
  style,
  className,
  responsive = true,
  lazyLoad = true,
}: AdProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const isProduction = import.meta.env.PROD;
  const scriptLoaded = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const consent = useAdConsent();

  // Load adsbygoogle.js dynamically
  const loadAdScript = useCallback(() => {
    if (scriptLoaded.current || !consent) return;

    const script = document.createElement('script');
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2007908196419480';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      scriptLoaded.current = true;
      console.log(`AdSense script loaded for slot: ${slot}`);
    };
    script.onerror = () => console.error(`Failed to load AdSense script for slot: ${slot}`);
    document.head.appendChild(script);
  }, [slot, consent]);

  // Initialize ad
  const initAd = useCallback(() => {
    if (!isProduction || !adRef.current || !consent) return;

    try {
      if (window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        console.log(`Ad initialized for slot: ${slot}`);
      } else {
        console.warn(`Adsbygoogle not ready for slot: ${slot}, retrying...`);
        setTimeout(initAd, 100);
      }
    } catch (error) {
  if (error instanceof Error) {
    console.error(`Error initializing AdSense ad for slot: ${slot}`, error);
    window.gtag?.('event', 'ad_error', { slot, error: error.message });
  } else {
    console.error(`Unknown error initializing AdSense ad for slot: ${slot}`, error);
  }
}
  }, [isProduction, slot, consent]);

  // Handle ad loading and fallback
  useEffect(() => {
    if (!isProduction || !adRef.current || !consent) return;

    loadAdScript();

    // Lazy load ads when they enter the viewport
    if (lazyLoad) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            initAd();
            observerRef.current?.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      observerRef.current.observe(adRef.current);
    } else {
      initAd();
    }

    // Observe DOM changes for new ad slots
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          const insElements = adRef.current?.querySelectorAll('ins.adsbygoogle');
          if (insElements?.length) {
            initAd();
          }
        }
      });
    });

    mutationObserver.observe(adRef.current, { childList: true, subtree: true });

    // Fallback if ad doesn't load
    const timeout = setTimeout(() => {
      if (adRef.current?.querySelector('ins.adsbygoogle')?.innerHTML === '') {
        adRef.current.innerHTML = `
          <div class="flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300">
            <span class="text-sm font-medium">Explore our premium features!</span>
          </div>
        `;
        console.warn(`Ad failed to load for slot: ${slot}, showing fallback`);
      }
    }, 5000);

    return () => {
      mutationObserver.disconnect();
      observerRef.current?.disconnect();
      clearTimeout(timeout);
    };
  }, [initAd, loadAdScript, isProduction, lazyLoad, slot, consent]);

  if (!isProduction) {
    return (
      <div
        ref={adRef}
        className={`bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center ${className}`}
        style={{
          minHeight: '100px',
          ...style,
        }}
      >
        <span className="text-gray-500 text-sm">Ad Placeholder - {slot}</span>
      </div>
    );
  }

  if (!consent) {
    return null; // Don't render ad if consent is not given
  }

  return (
    <div ref={adRef} className={className} style={style}>
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          ...(responsive && { width: '100%' }),
        }}
        data-ad-client="ca-pub-2007908196419480"
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
        lazyLoad={false}
      />
    </div>
  );
}