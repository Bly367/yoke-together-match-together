import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import chickMascot from "@/assets/chick-mascot.png";
import { Camera, Loader2 } from "lucide-react";

const ProfileSetup = () => {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Save profile to database
      toast.success("Profile created!");
      navigate("/duo-setup");
    } catch (error: any) {
      toast.error(error.message || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

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
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-secondary/50 flex items-center justify-center border-4 border-primary/20 shadow-[var(--shadow-soft)]">
                  <Camera className="w-12 h-12 text-primary" />
                </div>
                <button 
                  type="button"
                  className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-3 shadow-lg hover:scale-110 transition-transform"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
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
                  onChange={(e) => setAge(e.target.value)}
                  required
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell others about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="rounded-2xl resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interests">Interests</Label>
                <Input
                  id="interests"
                  placeholder="hiking, coffee, music"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  className="rounded-2xl"
                />
                <p className="text-xs text-muted-foreground">Separate with commas</p>
              </div>
            </div>

            <Button 
              type="submit" 
              variant="yolk" 
              className="w-full" 
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
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
