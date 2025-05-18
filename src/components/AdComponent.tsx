import React, { useEffect, useRef, useState, useCallback } from 'react';
import PropTypes from 'prop-types';

interface AdProps {
  slot: string;
  adSize?: 'leaderboard' | 'banner' | 'mobile_banner' | 'mobile_rectangle';
  style?: React.CSSProperties;
  className?: string;
  refreshInterval?: number;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

const AD_SIZES = {
  leaderboard: { width: 728, height: 90 },    // Desktop leaderboard
  banner: { width: 468, height: 60 },         // Desktop banner
  mobile_banner: { width: 320, height: 50 },  // Mobile sticky banner
  mobile_rectangle: { width: 300, height: 250 } // Mobile content rectangle
};

function useViewport() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { width };
}

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
  const { width } = useViewport();
  const isMobile = width <= 768;

  const getAdDimensions = () => {
    if (isMobile) {
      switch(adSize) {
        case 'leaderboard': return AD_SIZES.mobile_banner;
        case 'banner': return AD_SIZES.mobile_rectangle;
        default: return AD_SIZES[adSize];
      }
    }
    return AD_SIZES[adSize];
  };

  const dimensions = getAdDimensions();

  const loadAd = useCallback(() => {
    if (isProduction && adRef.current && !isAdLoaded) {
      try {
        if (window.adsbygoogle) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          setIsAdLoaded(true);
        } else {
          throw new Error('AdSense script not loaded');
        }
      } catch (error) {
        setAdError('Error loading ad');
        console.error('Error loading AdSense ad:', error);
      }
    }
  }, [isProduction, isAdLoaded]);

  const refreshAd = useCallback(() => {
    if (isProduction && adRef.current && isAdLoaded) {
      try {
        adRef.current.innerHTML = '';
        const ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'block';
        ins.style.width = '100%';
        ins.style.height = `${dimensions.height}px`;
        ins.setAttribute('data-ad-client', 'ca-pub-2007908196419480');
        ins.setAttribute('data-ad-slot', slot);
        ins.setAttribute('data-ad-format', isMobile ? 'auto' : 'horizontal');
        ins.setAttribute('data-full-width-responsive', 'true');
        adRef.current.appendChild(ins);
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        setAdError('Error refreshing ad');
        console.error('Error refreshing AdSense ad:', error);
      }
    }
  }, [isProduction, isAdLoaded, slot, dimensions.height, isMobile]);

  useEffect(() => {
    if (isProduction && adRef.current) {
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
      observerRef.current?.disconnect();
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [loadAd, refreshAd, isProduction, refreshInterval]);

  if (!isProduction) {
    return (
      <div className={`flex justify-center ${className}`} style={style}>
        <div
          ref={adRef}
          className="bg-gray-200 border border-gray-400 flex items-center justify-center transition-all duration-200 hover:bg-gray-100 cursor-pointer"
          style={{
            maxWidth: `${dimensions.width}px`,
            width: '100%',
            height: `${dimensions.height}px`
          }}
        >
          <span className="text-gray-600 text-sm font-medium text-center p-2">
            {isMobile ? 'Mobile' : 'Desktop'} Ad ({dimensions.width}x{dimensions.height})<br/>
            {slot}
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
            maxWidth: `${dimensions.width}px`,
            width: '100%',
            height: `${dimensions.height}px`
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
          maxWidth: `${dimensions.width}px`,
          width: '100%',
          height: `${dimensions.height}px`,
          ...style
        }}
      >
        <ins
          className="adsbygoogle"
          style={{
            display: 'block',
            width: '100%',
            height: `${dimensions.height}px`
          }}
          data-ad-client="ca-pub-2007908196419480"
          data-ad-slot={slot}
          data-ad-format={isMobile ? 'auto' : 'horizontal'}
          data-full-width-responsive="true"
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
  refreshInterval: PropTypes.number
};

export function StickyBottomAd() {
  const { width } = useViewport();
  const isMobile = width <= 768;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-xl z-50 transition-all duration-200">
      <div className="mx-auto" style={{ maxWidth: isMobile ? '320px' : '728px' }}>
        <AdComponent
          slot="1049089258"
          adSize={isMobile ? 'mobile_banner' : 'leaderboard'}
          className="py-2 px-4"
          refreshInterval={30}
          style={{ 
            height: isMobile ? '50px' : '90px',
            backgroundColor: '#f0f0f0'
          }}
        />
      </div>
    </div>
  );
}