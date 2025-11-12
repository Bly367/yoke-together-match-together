import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useLocationPrivacy } from '@/hooks/useLocationPrivacy';
import { MapPin, MapPinOff } from 'lucide-react';

/**
 * Component for toggling location privacy settings
 * Allows users to hide/show their location from other users
 */
export function LocationPrivacyToggle() {
  const { isLocationVisible, setLocationVisible, isUpdating } = useLocationPrivacy();

  return (
    <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
      <div className="flex items-center gap-3 flex-1">
        {isLocationVisible ? (
          <MapPin className="w-5 h-5 text-primary" />
        ) : (
          <MapPinOff className="w-5 h-5 text-muted-foreground" />
        )}
        <div className="flex-1">
          <Label htmlFor="location-privacy" className="text-sm font-medium cursor-pointer">
            Show Location
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            {isLocationVisible
              ? 'Other users can see your location for matching'
              : 'Your location is hidden from other users'}
          </p>
        </div>
      </div>
      <Switch
        id="location-privacy"
        checked={isLocationVisible}
        onCheckedChange={setLocationVisible}
        disabled={isUpdating}
      />
    </div>
  );
}

