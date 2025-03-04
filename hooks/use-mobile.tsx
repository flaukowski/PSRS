import * as React from "react"

// Define breakpoints for different device sizes
export const BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  laptop: 1024,
  desktop: 1280,
} as const;

type DeviceType = 'mobile' | 'tablet' | 'laptop' | 'desktop';

// Enhanced hook for device detection
export function useDevice() {
  const [device, setDevice] = React.useState<DeviceType>('desktop');
  const [orientation, setOrientation] = React.useState<'portrait' | 'landscape'>('portrait');

  React.useEffect(() => {
    // Function to update device type based on window width
    const updateDevice = () => {
      const width = window.innerWidth;
      if (width < BREAKPOINTS.mobile) {
        setDevice('mobile');
      } else if (width < BREAKPOINTS.tablet) {
        setDevice('tablet');
      } else if (width < BREAKPOINTS.laptop) {
        setDevice('laptop');
      } else {
        setDevice('desktop');
      }
    };

    // Function to update orientation
    const updateOrientation = () => {
      if (window.screen && window.screen.orientation) {
        setOrientation(
          window.screen.orientation.type.includes('portrait') ? 'portrait' : 'landscape'
        );
      } else {
        setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
      }
    };

    // Initial updates
    updateDevice();
    updateOrientation();

    // Event listeners for resize and orientation change
    window.addEventListener('resize', updateDevice);
    window.addEventListener('orientationchange', updateOrientation);

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateDevice);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  return {
    device,
    orientation,
    isMobile: device === 'mobile',
    isTablet: device === 'tablet',
    isDesktop: device === 'desktop' || device === 'laptop',
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
  };
}

// Backward compatibility hook
export function useIsMobile() {
  const { isMobile } = useDevice();
  return isMobile;
}