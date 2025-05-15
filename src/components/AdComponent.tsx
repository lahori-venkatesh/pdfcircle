import React, { useEffect, useRef, useState, useCallback } from 'react';
import PropTypes from 'prop-types';

interface AdProps {
  slot: string;
  adSize?: 'leaderboard' | 'banner';
  style?: React.CSSProperties;
  className?: string;
  refreshInterval?: number; // in seconds
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

// AdSense standard horizontal ad sizes
const AD_SIZES = {
  leaderboard: { width: 728, height: 90 },
  banner: { width: 468, height: 60 }
};

export function AdComponent({
  slot,
  adSize = 'leaderboard',
  style,
  className = '',
  refreshInterval = 0
}: AdProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);
  const isProduction = import.meta.env.PROD;
  const refreshTimerRef = useRef<number | null>(null);

  // Load AdSense script asynchronously
  useEffect(() => {
    if (isProduction && !window.adsbygoogle) {
      const script = document.createElement('script');
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2007908196419480';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onerror = () => {
        setAdError('Failed to load AdSense script');
        console.error('AdSense script failed to load');
      };
      document.head.appendChild(script);
    }
  }, [isProduction]);

  const loadAd = useCallback(() => {
    if (isProduction && adRef.current && !isAdLoaded) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        setIsAdLoaded(true);
      } catch (error) {
        setAdError('Error loading ad');
        console.error('Error loading AdSense ad:', error);
      }
    }
  }, [isProduction, isAdLoaded]);

  const refreshAd = useCallback(() => {
    if (isProduction && adRef.current && isAdLoaded) {
      try {
        adRef.current.innerHTML = ''; // Clear previous ad
        const ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'block';
        ins.style.width = `${AD_SIZES[adSize].width}px`;
        ins.style.height = `${AD_SIZES[adSize].height}px`;
        ins.setAttribute('data-ad-client', 'ca-pub-2007908196419480'); // Your AdSense client ID
        ins.setAttribute('data-ad-slot', slot);
        ins.setAttribute('data-ad-format', 'horizontal');
        ins.setAttribute('data-full-width-responsive', 'false');
        adRef.current.appendChild(ins);
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        setAdError('Error refreshing ad');
        console.error('Error refreshing AdSense ad:', error);
      }
    }
  }, [isProduction, isAdLoaded, adSize, slot]);

  useEffect(() => {
    if (isProduction && adRef.current) {
      // Lazy loading with IntersectionObserver
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            loadAd();
            if (refreshInterval > 0) {
              refreshTimerRef.current = window.setInterval(refreshAd, refreshInterval * 1000);
            }
          }
        },
        { threshold: 0.1 }
      );

      observerRef.current.observe(adRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [loadAd, refreshAd, isProduction, refreshInterval]);

  if (!isProduction) {
    return (
      <div className={`flex justify-center ${className}`} style={style}>
        <div
          ref={adRef}
          className="bg-gray-200 border border-gray-400 flex items-center justify-center transition-all duration-200 hover:bg-gray-100 cursor-pointer"
          style={{
            width: `${AD_SIZES[adSize].width}px`,
            height: `${AD_SIZES[adSize].height}px`
          }}
        >
          <span className="text-gray-600 text-sm font-medium">Ad Placeholder - {slot} ({adSize})</span>
        </div>
      </div>
    );
  }

  if (adError) {
    return (
      <div className={`flex justify-center ${className}`} style={style}>
        <div
          className="bg-red-100 border border-red-400 flex items-center justify-center"
          style={{
            width: `${AD_SIZES[adSize].width}px`,
            height: `${AD_SIZES[adSize].height}px`
          }}
        >
          <span className="text-red-600 text-sm font-medium">Ad Failed to Load</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex justify-center ${className}`} style={style}>
      <div
        ref={adRef}
        className="transition-all duration-200 hover:shadow-md hover:scale-[1.01] cursor-pointer"
        style={{
          width: `${AD_SIZES[adSize].width}px`,
          height: `${AD_SIZES[adSize].height}px`
        }}
      >
        <ins
          className="adsbygoogle"
          style={{
            display: 'block',
            width: `${AD_SIZES[adSize].width}px`,
            height: `${AD_SIZES[adSize].height}px`
          }}
          data-ad-client="ca-pub-2007908196419480" // Your AdSense client ID
          data-ad-slot={slot}
          data-ad-format="horizontal"
          data-full-width-responsive="false"
        />
      </div>
    </div>
  );
}

AdComponent.propTypes = {
  slot: PropTypes.string.isRequired,
  adSize: PropTypes.oneOf(['leaderboard', 'banner']),
  style: PropTypes.object,
  className: PropTypes.string,
  refreshInterval: PropTypes.number
};

export function StickyBottomAd() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-xl z-50 transition-all duration-200">
      <AdComponent
        slot="sticky-bottom"
        adSize="leaderboard"
        className="mx-auto py-2 px-4"
        refreshInterval={30} // Refresh every 30 seconds
      />
    </div>
  );
}