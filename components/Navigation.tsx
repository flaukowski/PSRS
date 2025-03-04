import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Map, BarChart2, Heart } from "lucide-react";
import { useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useAccount } from "wagmi";
import { useToast } from "@/hooks/use-toast";
import { useDimensionalTranslation } from "@/contexts/LocaleContext";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";

export function Navigation() {
  const [location, setLocation] = useLocation();
  const { address } = useAccount();
  const { toast } = useToast();
  const { t } = useDimensionalTranslation();
  const { isSynced } = useMusicPlayer();

  const requestLocation = useCallback(async (e: React.MouseEvent) => {
    const hasLocationPermission = localStorage.getItem('location-permission');
    if (hasLocationPermission === 'granted') {
      return;
    }

    e.preventDefault();

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });

      localStorage.setItem('location-permission', 'granted');

      if (address) {
        await apiRequest("POST", "/api/users/register", {
          address,
          geolocation: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        });
      }

      setLocation('/map');
    } catch (error) {
      console.error('Geolocation error:', error);
      localStorage.setItem('location-permission', 'denied');

      toast({
        title: t('map.location.error.title'),
        description: t('map.location.error.description'),
        variant: "destructive",
      });

      setLocation('/map');
    }
  }, [address, setLocation, toast, t]);

  const links = [
    {
      href: "/map",
      label: (
        <span className="flex items-center gap-2">
          <Map className="h-4 w-4" />
          {t('nav.map')}
        </span>
      ),
      onClick: requestLocation,
      show: location !== '/map'
    },
    {
      href: "/lumira",
      label: (
        <span className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4" />
          {t('nav.analytics')}
        </span>
      ),
      show: location !== '/lumira'
    },
    {
      href: "/whitepaper",
      label: (
        <span className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-red-500 animate-pulse" />
          {t('nav.whitepaper')}
        </span>
      ),
      show: location !== '/whitepaper'
    }
  ];

  return (
    <nav className="flex items-center gap-6 ml-8">
      {links.filter(link => link.show).map(({ href, label, onClick }) => (
        <Link
          key={href}
          href={href}
          onClick={onClick}
          className={cn(
            "text-sm transition-colors hover:text-primary",
            location === href
              ? "text-foreground font-medium"
              : "text-muted-foreground"
          )}
        >
          {label}
        </Link>
      ))}

      {isSynced && (
        <a
          href="https://app.pitchforks.social"
          target="_blank"
          rel="noopener noreferrer" 
          className="text-sm transition-colors hover:text-primary flex items-center gap-2"
          title="Visit Pitchforks"
        >
          <span className="text-xl animate-pulse">☠️</span>
        </a>
      )}
    </nav>
  );
}