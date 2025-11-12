import { useAuth } from '@/hooks/useAuth';
import { calculateProfileCompleteness, getCompletenessColor, getCompletenessVariant } from '@/lib/profileCompleteness';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/routes';

/**
 * Profile Completeness Component
 * Displays profile completion percentage and suggestions
 */
export function ProfileCompleteness() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const completeness = calculateProfileCompleteness(user);

  if (completeness.percentage === 100) {
    return (
      <Alert className="border-green-500/50 bg-green-500/10">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <AlertTitle>Profile Complete!</AlertTitle>
        <AlertDescription>
          Your profile is 100% complete. Great job!
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Profile Completeness</span>
            <Badge variant={getCompletenessVariant(completeness.percentage)}>
              {completeness.percentage}%
            </Badge>
          </div>
          <Progress value={completeness.percentage} className="h-2" />
        </div>
      </div>

      {completeness.suggestions.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Complete your profile</AlertTitle>
          <AlertDescription className="space-y-2">
            <p className="text-sm">Add the following to improve your profile:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {completeness.suggestions.slice(0, 3).map((suggestion, idx) => (
                <li key={idx}>{suggestion}</li>
              ))}
            </ul>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(ROUTES.PROFILE_SETUP)}
              className="mt-2"
            >
              Complete Profile
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

