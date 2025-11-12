import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import chickMascot from "@/assets/chick-mascot.png";
import { Users, Mail, Copy, Loader2, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCreateDuo, useUpdateDuo, useUserDuos, useDeactivateDuo } from "@/hooks/useDuos";
import { useFindProfileByEmail } from "@/hooks/useAuth";
import { useCreateDuoRequest } from "@/hooks/useDuoRequests";
import { PhotoUpload } from "@/components/PhotoUpload";
import { ROUTES } from "@/lib/routes";
import { BottomNavigation } from "@/components/BottomNavigation";
import { isValidEmail, parseInterests } from "@/lib/utils";

const DuoSetup = () => {
  const [inviteMethod, setInviteMethod] = useState<"email" | "link">("email");
  const [duoName, setDuoName] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const createDuoMutation = useCreateDuo();
  const updateDuoMutation = useUpdateDuo();
  const deactivateDuoMutation = useDeactivateDuo();
  const findFriendMutation = useFindProfileByEmail();
  const createRequestMutation = useCreateDuoRequest();
  const { data: userDuos } = useUserDuos();
  const [searchParams] = useSearchParams();
  const editDuoId = searchParams.get("edit");
  
  // Only edit if explicitly provided edit ID in URL
  const existingDuo = editDuoId ? userDuos?.find(d => d.id === editDuoId) : null;
  
  const [friendId, setFriendId] = useState<string | null>(null);
  const [friendEmail, setFriendEmail] = useState("");
  const isEditMode = !!existingDuo && !!editDuoId;

  // Initialize form with existing duo data if editing
  useEffect(() => {
    if (existingDuo && isEditMode) {
      setDuoName(existingDuo.name || "");
      setTagline(existingDuo.tagline || "");
      setBio(existingDuo.bio || "");
      setInterests(existingDuo.interests?.join(", ") || "");
      setPhotoUrl(existingDuo.photo_url || "");
      // Set friend ID to the other member (read-only in edit mode)
      if (user) {
        const otherMemberId = existingDuo.member1_id === user.id 
          ? existingDuo.member2_id 
          : existingDuo.member1_id;
        setFriendId(otherMemberId);
      }
    } else {
      // Reset form when creating new (not editing)
      setDuoName("");
      setTagline("");
      setBio("");
      setInterests("");
      setPhotoUrl("");
      setFriendId(null);
      setFriendEmail("");
      setEmailError("");
    }
  }, [existingDuo, isEditMode, user, editDuoId]);

  // Validate email format
  const validateEmail = (email: string): boolean => {
    if (!email || email.trim().length === 0) {
      setEmailError('Email is required');
      return false;
    }
    
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    
    setEmailError('');
    return true;
  };

  // Find friend by email using service
  const findFriend = async () => {
    if (!friendEmail) {
      setEmailError('Email is required');
      return;
    }

    if (!validateEmail(friendEmail)) {
      return;
    }

    try {
      const data = await findFriendMutation.mutateAsync(friendEmail);

      if (!data) {
        setEmailError('Friend not found. They need to sign up first!');
        return;
      }

      // Validate member ID - prevent self-duo
      if (data.id === user?.id) {
        setEmailError('You cannot create a duo with yourself!');
        return;
      }

      setFriendId(data.id);
      setEmailError('');
      toast.success(`Found ${data.name}!`);
    } catch (error: any) {
      setEmailError(error.message || 'Failed to find friend');
    }
  };

  const handleInvite = async () => {
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    if (inviteMethod === "email") {
      if (!friendEmail) {
        toast.error('Please enter friend\'s email');
        return;
      }
      await findFriend();
    } else {
      // Generate invite link
      const inviteLink = `${window.location.origin}${ROUTES.JOIN_DUO(user.id)}`;
      navigator.clipboard.writeText(inviteLink);
      toast.success("Link copied to clipboard!");
      if (!isEditMode) {
        navigate(ROUTES.MATCHMAKING);
      }
    }
  };

  const handleCreateOrUpdateDuo = async () => {
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    if (isEditMode && existingDuo) {
      // Update existing duo
      if (!existingDuo.id) {
        toast.error('Invalid duo ID');
        return;
      }

      try {
        const interestsArray = parseInterests(interests);

        await updateDuoMutation.mutateAsync({
          duoId: existingDuo.id,
          updates: {
            name: duoName || undefined,
            tagline: tagline || undefined,
            bio: bio || undefined,
            photo_url: photoUrl || undefined,
            interests: interestsArray.length > 0 ? interestsArray : undefined,
          },
        });

        toast.success("Duo updated successfully!");
        navigate(ROUTES.PROFILE);
      } catch (error: any) {
        toast.error(error.message || "Failed to update duo");
      }
    } else {
      // Create new duo
      if (!friendId) {
        toast.error('Please find your friend first');
        return;
      }

      // Validate member ID - prevent self-duo (double check)
      if (friendId === user?.id) {
        toast.error('You cannot create a duo with yourself!');
        return;
      }

      // Send a duo request instead of creating directly
      // The other person needs to accept before the duo is created
      try {
        const interestsArray = parseInterests(interests);
        
        // Create a message with the duo details (optional, for display)
        const message = [
          duoName && `Duo Name: ${duoName}`,
          tagline && `Tagline: ${tagline}`,
          bio && `Bio: ${bio}`,
          interests && `Interests: ${interests}`,
        ]
          .filter(Boolean)
          .join('\n') || undefined;

        await createRequestMutation.mutateAsync({
          requestedId: friendId,
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
    }
  };

  const handleDeactivateDuo = async () => {
    if (!existingDuo?.id) return;

    if (!confirm('Are you sure you want to deactivate this duo? You can reactivate it later.')) {
      return;
    }

    try {
      await deactivateDuoMutation.mutateAsync(existingDuo.id);
      toast.success("Duo deactivated successfully!");
      navigate(ROUTES.PROFILE);
    } catch (error: any) {
      toast.error(error.message || "Failed to deactivate duo");
    }
  };

  const loading = createDuoMutation.isPending || updateDuoMutation.isPending || findFriendMutation.isPending || createRequestMutation.isPending;
  const canSubmit = isEditMode || (inviteMethod === "email" ? friendId : true);

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
            <h1 className="text-3xl font-bold text-foreground">
              {isEditMode ? "Edit Your Duo" : "Find Your Duo Partner"}
            </h1>
            <p className="text-muted-foreground">
              {isEditMode 
                ? "Update your duo profile and settings"
                : "Invite a friend to create your duo and start matching together!"}
            </p>
          </div>

          {/* Method Selection - only show if creating new duo */}
          {!isEditMode && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setInviteMethod("email")}
                className={`p-6 rounded-2xl border-2 transition-all ${
                  inviteMethod === "email"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Mail className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="font-semibold">Email Invite</p>
              </button>
              <button
                onClick={() => setInviteMethod("link")}
                className={`p-6 rounded-2xl border-2 transition-all ${
                  inviteMethod === "link"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Copy className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="font-semibold">Share Link</p>
              </button>
            </div>
          )}

          {/* Invite Form */}
          <div className="space-y-4">
            {!isEditMode && (
              <>
                {inviteMethod === "email" ? (
                  <div className="space-y-2">
                    <Label htmlFor="email">Friend's Email</Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          id="email"
                          type="email"
                          placeholder="friend@example.com"
                          value={friendEmail}
                          onChange={(e) => {
                            setFriendEmail(e.target.value);
                            if (emailError) setEmailError(''); // Clear error on input
                          }}
                          onBlur={() => {
                            if (friendEmail) validateEmail(friendEmail);
                          }}
                          className={emailError ? "rounded-2xl border-destructive" : "rounded-2xl"}
                          disabled={!!friendId}
                        />
                        {emailError && (
                          <p className="text-sm text-destructive mt-1">{emailError}</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={findFriend}
                        disabled={!friendEmail || !!friendId || findFriendMutation.isPending}
                      >
                        {findFriendMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Find"
                        )}
                      </Button>
                    </div>
                    {friendId && !emailError && (
                      <p className="text-sm text-primary">Friend found! Fill in duo details below.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Invite Link</Label>
                    <div className="flex gap-2">
                      <Input
                        value={user ? `${window.location.origin}${ROUTES.JOIN_DUO(user.id)}` : ''}
                        readOnly
                        className="rounded-2xl bg-muted"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (user) {
                            navigator.clipboard.writeText(`${window.location.origin}${ROUTES.JOIN_DUO(user.id)}`);
                            toast.success("Link copied!");
                          }
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">Share this link with your friend to join your duo</p>
                  </div>
                )}
              </>
            )}

            {/* Duo Details - Show when: friend found, using link method, or editing */}
            {((!isEditMode && (friendId || inviteMethod === "link")) || isEditMode) && (
              <div className="space-y-4 pt-4 border-t">
                {/* Photo Upload */}
                {user && (
                  <div className="space-y-2">
                    <Label>Duo Photo (Optional)</Label>
                    <div className="flex justify-center items-center gap-2">
                      <PhotoUpload
                        currentPhotoUrl={photoUrl}
                        onPhotoUploaded={setPhotoUrl}
                        userId={user.id}
                      />
                      {photoUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPhotoUrl('');
                            toast.success('Photo removed');
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          Remove Photo
                        </Button>
                      )}
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

                <div className="flex gap-2">
                  <Button 
                    variant="yolk" 
                    className="flex-1" 
                    size="lg"
                    onClick={handleCreateOrUpdateDuo}
                    disabled={loading || !canSubmit}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {isEditMode ? "Updating..." : "Sending..."}
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4" />
                        {isEditMode ? "Update Duo" : "Send Request"}
                      </>
                    )}
                  </Button>

                  {isEditMode && existingDuo && (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleDeactivateDuo}
                      disabled={deactivateDuoMutation.isPending}
                      className="text-destructive hover:text-destructive"
                    >
                      {deactivateDuoMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {!isEditMode && inviteMethod === "email" && !friendId && (
              <Button 
                variant="yolk" 
                className="w-full" 
                size="lg"
                onClick={handleInvite}
                disabled={!friendEmail || loading}
              >
                Find Friend
              </Button>
            )}

            {!isEditMode && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate(ROUTES.MATCHMAKING)}
              >
                Skip for Now
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default DuoSetup;
