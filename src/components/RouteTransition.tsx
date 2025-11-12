import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface RouteTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Route Transition Component
 * Provides smooth page transitions when navigating between routes
 */
export function RouteTransition({ children, className }: RouteTransitionProps) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState<'entering' | 'entered'>('entered');

  useEffect(() => {
    if (location !== displayLocation) {
      setTransitionStage('entering');
      // Small delay to allow exit animation
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage('entered');
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [location, displayLocation]);

  return (
    <div
      className={cn(
        'transition-opacity duration-200 ease-in-out',
        transitionStage === 'entering' && 'opacity-0',
        transitionStage === 'entered' && 'opacity-100',
        className
      )}
    >
      {children}
    </div>
  );
}

