import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import chickMascot from "@/assets/chick-mascot.png";
import { Loader2 } from "lucide-react";
import { useAuth, useUpdateProfile } from "@/hooks/useAuth";
import { PhotoUpload } from "@/components/PhotoUpload";
import { ROUTES } from "@/lib/routes";
import type { Gender, Preference } from "@/services/auth.service";

const MAX_BIO_LENGTH = 500;
const MIN_AGE = 18;
const MAX_AGE = 120;

const ProfileSetup = () => {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [preference, setPreference] = useState<Preference>("both");
  const [ageError, setAgeError] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const updateProfileMutation = useUpdateProfile();

  useEffect(() => {
    if (user) {
      // Pre-fill form with existing user data
      setName(user.name || "");
      setAge(user.age?.toString() || "");
      setBio(user.bio || "");
      setPhotoUrl(user.photo_url || "");
      setGender(user.gender || "");
      setPreference(user.preference || "both");
    }
  }, [user]);

  const validateAge = (ageStr: string): boolean => {
    if (!ageStr.trim()) {
      setAgeError("");
      return true; // Age is optional
    }
    
    const ageNum = parseInt(ageStr, 10);
    if (isNaN(ageNum)) {
      setAgeError("Please enter a valid age");
      return false;
    }
    if (ageNum < MIN_AGE) {
      setAgeError(`You must be ${MIN_AGE} or older`);
      return false;
    }
    if (ageNum > MAX_AGE) {
      setAgeError("Please enter a valid age");
      return false;
    }
    setAgeError("");
    return true;
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAge(value);
    if (value) {
      validateAge(value);
    } else {
      setAgeError("");
    }
  };

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value.slice(0, MAX_BIO_LENGTH);
    setBio(value);
  };

  const handlePhotoUpload = async (url: string) => {
    setPhotoUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    // Validate age if provided
    if (age && !validateAge(age)) {
      return;
    }

    // Validate gender if preference is set
    if (preference !== "both" && !gender) {
      toast.error("Please select your gender to set preferences");
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        name: name.trim(),
        age: age ? parseInt(age, 10) : undefined,
        bio: bio.trim() || undefined,
        photo_url: photoUrl || undefined,
        gender: gender || undefined,
        preference: preference || "both",
      });
      toast.success("Profile updated!");
      navigate(ROUTES.DUO_SETUP);
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    }
  };

  const loading = updateProfileMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="bg-card rounded-3xl shadow-[var(--shadow-card)] p-8 space-y-6 animate-slide-up">
          {/* Header */}
          <div className="text-center space-y-2">
            <img 
              src={chickMascot} 
              alt="Yoke" 
              className="w-20 h-20 mx-auto animate-bounce-soft"
            />
            <h1 className="text-3xl font-bold text-foreground">Create Your Profile</h1>
            <p className="text-muted-foreground">Tell us about yourself</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo Upload */}
            <div className="flex flex-col items-center space-y-4">
              {user && (
                <PhotoUpload
                  currentPhotoUrl={photoUrl}
                  onPhotoUploaded={handlePhotoUpload}
                  userId={user.id}
                />
              )}
              <p className="text-sm text-muted-foreground">Upload your photo</p>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="25"
                  value={age}
                  onChange={handleAgeChange}
                  min={MIN_AGE}
                  max={MAX_AGE}
                  required
                  className={ageError ? "rounded-2xl border-destructive" : "rounded-2xl"}
                />
                {ageError && (
                  <p className="text-sm text-destructive">{ageError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell others about yourself..."
                  value={bio}
                  onChange={handleBioChange}
                  rows={4}
                  className="rounded-2xl resize-none"
                />
                <div className="text-right text-sm text-muted-foreground">
                  {bio.length}/{MAX_BIO_LENGTH}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={gender}
                  onValueChange={(value) => setGender(value as Gender)}
                >
                  <SelectTrigger id="gender" className="rounded-2xl">
                    <SelectValue placeholder="Select your gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="man">Man</SelectItem>
                    <SelectItem value="woman">Woman</SelectItem>
                    <SelectItem value="non-binary">Non-binary</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This helps us show you relevant matches
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preference">I'm interested in</Label>
                <Select
                  value={preference}
                  onValueChange={(value) => setPreference(value as Preference)}
                >
                  <SelectTrigger id="preference" className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="men">Men</SelectItem>
                    <SelectItem value="women">Women</SelectItem>
                    <SelectItem value="both">Everyone</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Who you want to match with
                </p>
              </div>
            </div>

            <Button 
              type="submit" 
              variant="yolk" 
              className="w-full" 
              size="lg"
              disabled={loading || !name.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
