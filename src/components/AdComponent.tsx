import React, { useEffect, useRef, useState, useCallback } from 'react';
import PropTypes from 'prop-types';

// Define ad size configurations
const AD_SIZES = {
  leaderboard: { width: 728, height: 90 },
  banner: { width: 468, height: 60 },
  mobile_banner: { width: 320, height: 50 },
  mobile_rectangle: { width: 300, height: 250 },
};

// Custom hook for viewport width
function useViewport() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        requestAnimationFrame(() => setWidth(window.innerWidth));
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return { width };
}

// AdComponent props type
type AdSize = 'leaderboard' | 'banner' | 'mobile_banner' | 'mobile_rectangle';

interface AdProps {
  slot: string;
  adSize?: AdSize;
  style?: React.CSSProperties;
  className?: string;
  refreshInterval?: number;
  isSticky?: boolean;
}

// Extend window interface for adsbygoogle
declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export function AdComponent({
  slot,
  adSize = 'leaderboard',
  style,
  className = '',
  refreshInterval = 0,
  isSticky = false,
}: AdProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Safely check production environment
  const isProduction = process.env.NODE_ENV === 'production';
  const { width } = useViewport();

  const getAdDimensions = () => {
    if (isSticky) {
      return AD_SIZES.leaderboard; // Desktop sticky ads: 728x90
    }
    switch (adSize) {
      case 'leaderboard':
        return width <= 768 ? AD_SIZES.mobile_banner : AD_SIZES.leaderboard;
      case 'banner':
        return width <= 768 ? AD_SIZES.mobile_rectangle : AD_SIZES.banner;
      default:
        return AD_SIZES[adSize];
    }
  };
  const dimensions = useRef(getAdDimensions());

  useEffect(() => {
    dimensions.current = getAdDimensions();
  }, [width, adSize, isSticky]);

  const loadAd = useCallback(() => {
    if (!isProduction || !adRef.current || isAdLoaded) return;

    setIsLoading(true);
    try {
      if (window.adsbygoogle) {
        window.adsbygoogle.push({});
        setIsAdLoaded(true);
        setIsLoading(false);
      } else {
        setTimeout(loadAd, 100); // Retry if adsbygoogle not ready
      }
    } catch (error) {
      setAdError('Error loading ad');
      setIsLoading(false);
      console.error('Ad load error:', error);
    }
  }, [isProduction, isAdLoaded]);

  const refreshAd = useCallback(() => {
    if (!isProduction || !adRef.current || !isAdLoaded) return;

    setIsLoading(true);
    try {
      adRef.current.innerHTML = '';
      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.cssText = `display:block;width:${dimensions.current.width}px;height:${dimensions.current.height}px`;
      ins.setAttribute('data-ad-client', 'ca-pub-2007908196419480');
      ins.setAttribute('data-ad-slot', slot);
      if (!isSticky) {
        ins.setAttribute('data-ad-format', width <= 768 ? 'auto' : 'horizontal');
        ins.setAttribute('data-full-width-responsive', 'true');
      }
      adRef.current.appendChild(ins);

      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
      setIsLoading(false);
    } catch (error) {
      setAdError('Error refreshing ad');
      setIsLoading(false);
      console.error('Ad refresh error:', error);
      setTimeout(loadAd, 5000); // Retry after 5 seconds
    }
  }, [isProduction, isAdLoaded, slot, width, isSticky, loadAd]);

  useEffect(() => {
    if (!isProduction || !adRef.current) return;

    if (isSticky) {
      loadAd();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadAd();
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(adRef.current);
    return () => observer.disconnect();
  }, [loadAd, isProduction, isSticky]);

  useEffect(() => {
    if (!refreshInterval || !isAdLoaded) return;

    const timer = setInterval(() => {
      requestAnimationFrame(refreshAd);
    }, refreshInterval * 1000);

    return () => clearInterval(timer);
  }, [refreshInterval, isAdLoaded, refreshAd]);

  if (!isProduction) {
    return (
      <div className={`flex justify-center ${className}`} style={style}>
        <div
          ref={adRef}
          className="bg-gray-200 border border-gray-400 flex items-center justify-center"
          style={{
            width: dimensions.current.width,
            height: dimensions.current.height,
            overflow: 'hidden',
          }}
        >
          <span className="text-gray-600 text-sm text-center p-2">
            {width <= 768 ? 'Mobile' : 'Desktop'} Ad ({dimensions.current.width}x{dimensions.current.height})
          </span>
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
            width: dimensions.current.width,
            height: dimensions.current.height,
            overflow: 'hidden',
          }}
        >
          <span className="text-red-600 text-sm">Ad Failed to Load</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex justify-center ${className}`} style={style}>
      <div
        ref={adRef}
        style={{
          width: dimensions.current.width,
          height: dimensions.current.height,
          overflow: 'hidden',
          position: 'relative',
          ...style,
        }}
      >
        {isLoading && (
          <div
            className="absolute inset-0 bg-gray-100 flex items-center justify-center"
            style={{ width: '100%', height: '100%' }}
          >
            <span className="text-gray-500 text-sm">Loading Ad...</span>
          </div>
        )}
        <ins
          className="adsbygoogle"
          style={{
            display: 'block',
            width: dimensions.current.width,
            height: dimensions.current.height,
          }}
          data-ad-client="ca-pub-2007908196419480"
          data-ad-slot={slot}
          {...(!isSticky
            ? {
                'data-ad-format': width <= 768 ? 'auto' : 'horizontal',
                'data-full-width-responsive': 'true',
              }
            : {})}
        />
      </div>
    </div>
  );
}

AdComponent.propTypes = {
  slot: PropTypes.string.isRequired,
  adSize: PropTypes.oneOf(['leaderboard', 'banner', 'mobile_banner', 'mobile_rectangle']),
  style: PropTypes.object,
  className: PropTypes.string,
  refreshInterval: PropTypes.number,
  isSticky: PropTypes.bool,
};

export function StickyBottomAd() {
  const { width } = useViewport();

  // Render sticky ad only on desktop (width > 768)
  if (width <= 768) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white shadow-lg z-50 sticky-bottom-ad safe-bottom"
      style={{ height: 90, overflow: 'hidden' }}
    >
      <div className="mx-auto ad-container" style={{ width: 728 }}>
        <AdComponent
          slot="1049089258"
          adSize="leaderboard"
          className="py-2 px-4"
          refreshInterval={30}
          isSticky={true}
          style={{
            width: 728,
            height: 90,
            backgroundColor: 'rgba(240, 240, 240, 0.95)',
            overflow: 'hidden',
          }}
        />
      </div>
    </div>
  );
}
