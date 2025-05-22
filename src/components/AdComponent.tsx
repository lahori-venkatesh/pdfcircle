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

// Extend window interface for adsbygoogle and gtag
declare global {
  interface Window {
    adsbygoogle: unknown[];
    gtag: (...args: any[]) => void;
  }
}

// Consent banner component
function ConsentBanner({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg z-[9999] p-4 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          We use cookies and similar technologies to personalize ads and improve your experience. 
          By clicking "Accept", you consent to our use of these technologies.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onDecline}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
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
  const [showConsent, setShowConsent] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const maxAttempts = 3;
  const retryDelay = 2000;
  const isProduction = process.env.NODE_ENV === 'production';
  const { width } = useViewport();
  const dimensions = useRef(getAdDimensions());
  const adSlotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Check if consent was previously given
    const consent = localStorage.getItem('ad_consent');
    if (!consent) {
      setShowConsent(true);
    } else {
      // Set consent in Google's system
      window.gtag('consent', 'update', {
        ad_storage: consent === 'granted' ? 'granted' : 'denied',
        ad_user_data: consent === 'granted' ? 'granted' : 'denied',
        ad_personalization: consent === 'granted' ? 'granted' : 'denied'
      });
    }
  }, []);

  const handleAcceptConsent = () => {
    localStorage.setItem('ad_consent', 'granted');
    window.gtag('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted'
    });
    setShowConsent(false);
    loadAd(); // Reload ads with new consent
  };

  const handleDeclineConsent = () => {
    localStorage.setItem('ad_consent', 'denied');
    window.gtag('consent', 'update', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    setShowConsent(false);
    loadAd(); // Reload ads with new consent
  };

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
    if (!isProduction || !adRef.current || isAdLoaded || adAttempts >= maxAttempts || !isVisible) return;

    setIsLoading(true);
    try {
      // Pre-calculate space for ad to prevent layout shift
      const { width, height } = dimensions.current;
      if (adRef.current) {
        adRef.current.style.minHeight = `${height}px`;
        adRef.current.style.minWidth = `${width}px`;
        adRef.current.style.opacity = '0';
        adRef.current.style.transition = 'opacity 0.3s ease-in-out';
      }

      // Initialize ad with retry mechanism
      const initAd = () => {
        if (window.adsbygoogle && adRef.current) {
          // Clear existing ad content
          if (adSlotRef.current) {
            adRef.current.removeChild(adSlotRef.current);
          }

          // Create new ad slot
          const ins = document.createElement('ins');
          ins.className = 'adsbygoogle';
          ins.style.display = 'block';
          ins.style.width = `${width}px`;
          ins.style.height = `${height}px`;
          ins.setAttribute('data-ad-client', 'ca-pub-2007908196419480');
          ins.setAttribute('data-ad-slot', slot);
          
          if (!isSticky) {
            ins.setAttribute('data-ad-format', width <= 768 ? 'auto' : 'horizontal');
            ins.setAttribute('data-full-width-responsive', 'true');
          }

          adRef.current.appendChild(ins);
          adSlotRef.current = ins;

          // Push new ad with a slight delay to ensure proper rendering
          setTimeout(() => {
            window.adsbygoogle.push({});
            if (adRef.current) {
              adRef.current.style.opacity = '1';
            }
            setIsAdLoaded(true);
            setIsLoading(false);
            setAdError(null);
          }, 100);
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
  }, [isProduction, isAdLoaded, adAttempts, slot, width, isSticky, isVisible]);

  const refreshAd = useCallback(() => {
    if (!isProduction || !adRef.current || !isAdLoaded || !isVisible) return;

    setIsLoading(true);
    setIsAdLoaded(false);
    loadAd();
  }, [isProduction, isAdLoaded, loadAd, isVisible]);

  useEffect(() => {
    if (!isProduction || !adRef.current) return;

    // Use Intersection Observer for lazy loading
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting && !isAdLoaded) {
          loadAd();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(adRef.current);
    return () => observer.disconnect();
  }, [loadAd, isAdLoaded, isProduction]);

  useEffect(() => {
    if (!refreshInterval || !isAdLoaded || !isVisible) return;

    const timer = setInterval(() => {
      requestAnimationFrame(refreshAd);
    }, refreshInterval * 1000);

    return () => clearInterval(timer);
  }, [refreshInterval, isAdLoaded, refreshAd, isVisible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (adSlotRef.current && adRef.current) {
        adRef.current.removeChild(adSlotRef.current);
      }
    };
  }, []);

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
    <>
      <div className={`flex justify-center ${className}`} style={style}>
        <div
          ref={adRef}
          style={{
            width: dimensions.current.width,
            height: dimensions.current.height,
            overflow: 'hidden',
            position: 'relative',
            opacity: 0,
            transition: 'opacity 0.3s ease-in-out',
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
        </div>
      </div>
      {showConsent && <ConsentBanner onAccept={handleAcceptConsent} onDecline={handleDeclineConsent} />}
    </>
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