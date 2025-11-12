import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import chickMascot from "@/assets/chick-mascot.png";
import { Users, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserDuos } from "@/hooks/useDuos";
import { useCreateDuoRequest } from "@/hooks/useDuoRequests";
import { PhotoUpload } from "@/components/PhotoUpload";
import { ROUTES } from "@/lib/routes";
import { BottomNavigation } from "@/components/BottomNavigation";

/**
 * Page for joining a duo via invite link
 * Route: /join-duo/:userId
 */
const JoinDuo = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const createRequestMutation = useCreateDuoRequest();
  const { data: userDuos } = useUserDuos();
  
  const [duoName, setDuoName] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string>("");

  // Note: Users can have multiple duos now, so we don't redirect
  // But we should check if they already have a duo with this user

  // Validate that user is not trying to create duo with themselves
  const validateSelfJoin = (): boolean => {
    if (user && userId && user.id === userId) {
      toast.error("You cannot create a duo with yourself!");
      return false;
    }
    return true;
  };

  // Check if user is trying to create duo with themselves
  useEffect(() => {
    if (!validateSelfJoin()) {
      navigate(ROUTES.DUO_SETUP);
    }
  }, [user, userId, navigate]);

  const handleJoinDuo = async () => {
    if (!user) {
      toast.error('Please sign in first');
      navigate(ROUTES.AUTH);
      return;
    }

    if (!userId) {
      toast.error('Invalid invite link');
      return;
    }

    if (!validateSelfJoin()) {
      return;
    }

    try {
      const interestsArray = interests
        .split(',')
        .map(i => i.trim())
        .filter(i => i.length > 0);

      // Create a message with the duo details (optional, for display)
      const message = [
        duoName && `Duo Name: ${duoName}`,
        tagline && `Tagline: ${tagline}`,
        bio && `Bio: ${bio}`,
        interests && `Interests: ${interests}`,
      ]
        .filter(Boolean)
        .join('\n') || undefined;

      // Send a request to the user who shared the link
      // Note: The person clicking the link becomes the requester
      await createRequestMutation.mutateAsync({
        requestedId: userId,
        message: message,
        duoName: duoName || undefined,
        tagline: tagline || undefined,
        bio: bio || undefined,
        interests: interestsArray.length > 0 ? interestsArray : undefined,
        photoUrl: photoUrl || undefined,
      });

      toast.success("Duo request sent! They'll need to accept it before the duo is created.");
      navigate(ROUTES.PROFILE);
    } catch (error: any) {
      toast.error(error.message || "Failed to send duo request");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-4 py-12 pb-24">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-3xl shadow-[var(--shadow-card)] p-8 space-y-6 animate-slide-up text-center">
            <h1 className="text-2xl font-bold text-foreground">Please Sign In</h1>
            <p className="text-muted-foreground">You need to sign in to join a duo.</p>
            <Button onClick={() => navigate(ROUTES.AUTH)}>Sign In</Button>
          </div>
        </div>
      </div>
    );
  }

  const loading = createRequestMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-4 py-12 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="bg-card rounded-3xl shadow-[var(--shadow-card)] p-8 space-y-6 animate-slide-up">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <img 
                  src={chickMascot} 
                  alt="Chick 1" 
                  className="w-20 h-20 animate-bounce-soft"
                />
                <img 
                  src={chickMascot} 
                  alt="Chick 2" 
                  className="w-20 h-20 animate-bounce-soft absolute -right-12 top-0"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground">Join Duo</h1>
            <p className="text-muted-foreground">
              Complete your duo profile to start matching together!
            </p>
          </div>

          {/* Duo Details Form */}
          <div className="space-y-4 pt-4">
            {/* Photo Upload */}
            {user && (
              <div className="space-y-2">
                <Label>Duo Photo (Optional)</Label>
                <div className="flex justify-center">
                  <PhotoUpload
                    currentPhotoUrl={photoUrl}
                    onPhotoUploaded={setPhotoUrl}
                    userId={user.id}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="duoName">Duo Name (Optional)</Label>
              <Input
                id="duoName"
                placeholder="e.g., Adventure Buddies"
                value={duoName}
                onChange={(e) => setDuoName(e.target.value)}
                className="rounded-2xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline (Optional)</Label>
              <Input
                id="tagline"
                placeholder="e.g., Adventure seekers & coffee lovers"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="rounded-2xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio (Optional)</Label>
              <Textarea
                id="bio"
                placeholder="Tell others about your duo..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="rounded-2xl resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interests">Interests (Optional)</Label>
              <Input
                id="interests"
                placeholder="hiking, coffee, music"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                className="rounded-2xl"
              />
              <p className="text-xs text-muted-foreground">Separate with commas</p>
            </div>

            <Button 
              variant="yolk" 
              className="w-full" 
              size="lg"
              onClick={handleJoinDuo}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending Request...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  Send Request
                </>
              )}
            </Button>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate(ROUTES.MATCHMAKING)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default JoinDuo;

