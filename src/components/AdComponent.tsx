import React, { useEffect, useRef, useState, useCallback } from 'react';
import PropTypes from 'prop-types';

// Define ad size configurations with aspect ratios
const AD_SIZES = {
  leaderboard: { width: 728, height: 90, ratio: 8.089 },
  banner: { width: 468, height: 60, ratio: 7.8 },
  mobile_banner: { width: 320, height: 50, ratio: 6.4 },
  mobile_rectangle: { width: 300, height: 250, ratio: 1.2 },
};

// Custom hook for viewport width with debouncing
function useViewport() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        requestAnimationFrame(() => setWidth(window.innerWidth));
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
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
  const [adAttempts, setAdAttempts] = useState(0);
  const maxAttempts = 3;
  const retryDelay = 2000;
  const isProduction = process.env.NODE_ENV === 'production';
  const { width } = useViewport();
  const dimensions = useRef(getAdDimensions());

  function getAdDimensions() {
    if (isSticky) {
      return AD_SIZES.leaderboard;
    }
    if (width <= 768) {
      return adSize === 'leaderboard' ? AD_SIZES.mobile_banner : AD_SIZES.mobile_rectangle;
    }
    return AD_SIZES[adSize];
  }

  const loadAd = useCallback(async () => {
    if (!isProduction || !adRef.current || isAdLoaded || adAttempts >= maxAttempts) return;

    setIsLoading(true);
    try {
      // Pre-calculate space for ad to prevent layout shift
      const { width, height } = dimensions.current;
      adRef.current.style.minHeight = `${height}px`;
      adRef.current.style.minWidth = `${width}px`;

      // Initialize ad with retry mechanism
      const initAd = () => {
        if (window.adsbygoogle) {
          window.adsbygoogle.push({});
          setIsAdLoaded(true);
          setIsLoading(false);
          setAdError(null);
        } else {
          setAdAttempts(prev => {
            if (prev < maxAttempts) {
              setTimeout(initAd, retryDelay);
            } else {
              setAdError('Failed to load advertisement');
              setIsLoading(false);
            }
            return prev + 1;
          });
        }
      };

      initAd();
    } catch (error) {
      console.error('Ad load error:', error);
      setAdError('Error loading advertisement');
      setIsLoading(false);
    }
  }, [isProduction, isAdLoaded, adAttempts]);

  const refreshAd = useCallback(() => {
    if (!isProduction || !adRef.current || !isAdLoaded) return;

    setIsLoading(true);
    try {
      // Clear existing ad
      adRef.current.innerHTML = '';
      
      // Create new ad slot
      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      ins.style.width = `${dimensions.current.width}px`;
      ins.style.height = `${dimensions.current.height}px`;
      ins.setAttribute('data-ad-client', 'ca-pub-2007908196419480');
      ins.setAttribute('data-ad-slot', slot);
      
      if (!isSticky) {
        ins.setAttribute('data-ad-format', width <= 768 ? 'auto' : 'horizontal');
        ins.setAttribute('data-full-width-responsive', 'true');
      }
      
      adRef.current.appendChild(ins);

      // Push new ad
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
      setIsLoading(false);
    } catch (error) {
      console.error('Ad refresh error:', error);
      setAdError('Error refreshing advertisement');
      setIsLoading(false);
    }
  }, [isProduction, isAdLoaded, slot, width, isSticky]);

  useEffect(() => {
    if (!isProduction || !adRef.current) return;

    // Use Intersection Observer for lazy loading
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isAdLoaded) {
          loadAd();
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(adRef.current);
    return () => observer.disconnect();
  }, [loadAd, isAdLoaded, isProduction]);

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
    return null; // Hide ad space on error to prevent layout issues
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

  // Only render sticky ad on desktop
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