import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings, LogOut, User, Users } from "lucide-react";
import chickMascot from "@/assets/chick-mascot.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Profile = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to log out");
    } else {
      toast.success("Logged out successfully");
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate("/matches")}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
          <Button variant="ghost" size="icon">
            <Settings className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* User Profile Card */}
        <div className="bg-card rounded-3xl p-8 shadow-[var(--shadow-card)] text-center space-y-4 animate-slide-up">
          <div className="w-32 h-32 rounded-full bg-primary/20 mx-auto flex items-center justify-center shadow-lg">
            <User className="w-20 h-20 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Alex Johnson</h2>
            <p className="text-muted-foreground">25 years old</p>
          </div>
          <p className="text-foreground max-w-md mx-auto">
            Love hiking, coffee, and spontaneous adventures. Looking for fun double dates!
          </p>
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            {["Hiking", "Coffee", "Travel", "Music", "Food"].map((interest, idx) => (
              <span 
                key={idx}
                className="px-4 py-2 bg-secondary/50 rounded-full text-sm text-foreground"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>

        {/* Duo Card */}
        <div className="bg-card rounded-3xl p-8 shadow-[var(--shadow-card)] animate-slide-up">
          <div className="flex items-center gap-4 mb-6">
            <Users className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-bold text-foreground">Your Duo</h3>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center shadow-md">
                <User className="w-12 h-12 text-primary" />
              </div>
              <div className="w-20 h-20 rounded-full bg-secondary/30 flex items-center justify-center absolute -right-6 top-0 shadow-md border-4 border-card">
                <User className="w-12 h-12 text-primary" />
              </div>
            </div>
            
            <div className="ml-8">
              <p className="font-semibold text-lg text-foreground">Alex & Jamie</p>
              <p className="text-muted-foreground text-sm">Duo since March 2024</p>
              <p className="text-primary text-sm mt-1">Adventure buddies seeking fun!</p>
            </div>
          </div>

          <Button variant="outline" className="w-full mt-6">
            Edit Duo Profile
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card rounded-3xl p-6 text-center shadow-[var(--shadow-card)] animate-slide-up">
            <p className="text-3xl font-bold text-primary">12</p>
            <p className="text-sm text-muted-foreground">Matches</p>
          </div>
          <div className="bg-card rounded-3xl p-6 text-center shadow-[var(--shadow-card)] animate-slide-up">
            <p className="text-3xl font-bold text-primary">5</p>
            <p className="text-sm text-muted-foreground">Active Chats</p>
          </div>
          <div className="bg-card rounded-3xl p-6 text-center shadow-[var(--shadow-card)] animate-slide-up">
            <p className="text-3xl font-bold text-primary">3</p>
            <p className="text-sm text-muted-foreground">Dates</p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button variant="outline" className="w-full justify-start" size="lg">
            <Settings className="w-5 h-5 mr-2" />
            Settings
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start text-destructive hover:text-destructive" 
            size="lg"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-2" />
            Log Out
          </Button>
        </div>
      </div>

      <div className="h-24" /> {/* Bottom spacing */}
    </div>
  );
};

export default Profile;
