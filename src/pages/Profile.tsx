import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings, LogOut, Loader2, User, Users, Mail, Bell } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useUserDuos, useActiveDuo, useSetActiveDuo, useDeleteDuo } from "@/hooks/useDuos";
import { useLeaveDuo, usePendingRequests } from "@/hooks/useDuoRequests";
import { ROUTES } from "@/lib/routes";
import { BottomNavigation } from "@/components/BottomNavigation";
import { LocationPrivacyToggle } from "@/components/LocationPrivacyToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { OptimizedImage } from "@/components/OptimizedImage";
import { ProfileCompleteness } from "@/components/ProfileCompleteness";

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut, isSigningOut } = useAuth();
  const { data: userDuos, isLoading: duosLoading } = useUserDuos();
  const activeDuo = useActiveDuo();
  const setActiveDuoMutation = useSetActiveDuo();
  const deleteDuoMutation = useDeleteDuo();
  const leaveDuoMutation = useLeaveDuo();
  const { data: pendingRequests = [] } = usePendingRequests();

  const handleSetActiveDuo = async (duoId: string) => {
    try {
      await setActiveDuoMutation.mutateAsync(duoId);
      toast.success("Active duo updated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update active duo");
    }
  };

  const handleDeleteDuo = async (duoId: string) => {
    if (!confirm("Are you sure you want to delete this duo? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteDuoMutation.mutateAsync(duoId);
      toast.success("Duo deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete duo");
    }
  };

  const handleLeaveDuo = async (duoId: string) => {
    if (!confirm("Are you sure you want to leave this duo? The other person can reactivate it if they want.")) {
      return;
    }
    try {
      await leaveDuoMutation.mutateAsync(duoId);
      toast.success("You've left the duo");
    } catch (error: any) {
      toast.error(error.message || "Failed to leave duo");
    }
  };

  const handleLogout = async () => {
    try {
      signOut();
      toast.success("Logged out successfully");
      navigate(ROUTES.INDEX);
    } catch (error: any) {
      toast.error(error.message || "Failed to log out");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate(ROUTES.MATCHES)}>
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
        {/* Profile Completeness */}
        <div className="bg-card rounded-3xl p-6 shadow-[var(--shadow-card)] animate-slide-up">
          <ProfileCompleteness />
        </div>

        {/* User Profile Card */}
        {user && (
          <div className="bg-card rounded-3xl p-8 shadow-[var(--shadow-card)] text-center space-y-4 animate-slide-up">
            <div className="w-32 h-32 rounded-full bg-primary/20 mx-auto flex items-center justify-center shadow-lg overflow-hidden">
              <OptimizedImage
                src={user.photo_url}
                alt={user.name}
                className="w-32 h-32 rounded-full"
                fallbackIcon={<User className="w-20 h-20 text-primary" />}
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{user.name}</h2>
              {user.age && (
                <p className="text-muted-foreground">{user.age} years old</p>
              )}
            </div>
            {user.bio && (
              <p className="text-foreground max-w-md mx-auto">{user.bio}</p>
            )}
            {!user.bio && (
              <p className="text-muted-foreground italic">No bio yet. Add one in profile setup!</p>
            )}
          </div>
        )}

        {/* Duo Requests Badge */}
        {pendingRequests.length > 0 && (
          <div className="bg-card rounded-3xl p-4 shadow-[var(--shadow-card)] animate-slide-up">
            <Button
              variant="default"
              className="w-full"
              onClick={() => navigate(ROUTES.DUO_REQUESTS)}
            >
              <Mail className="w-4 h-4 mr-2" />
              {pendingRequests.length} Pending Request{pendingRequests.length !== 1 ? 's' : ''}
            </Button>
          </div>
        )}

        {/* Duos Section */}
        <div className="bg-card rounded-3xl p-8 shadow-[var(--shadow-card)] animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Users className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-bold text-foreground">Your Duos</h3>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate(ROUTES.DUO_REQUESTS)}
              >
                Requests
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate(ROUTES.DUO_SETUP)}
              >
                Create New
              </Button>
            </div>
          </div>
          
          {duosLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            </div>
          ) : userDuos && userDuos.length > 0 ? (
            <div className="space-y-4">
              {[...userDuos]
                .sort((a, b) => {
                  // Sort: active duos first, then by created_at descending
                  if (a.is_active && !b.is_active) return -1;
                  if (!a.is_active && b.is_active) return 1;
                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                })
                .map((duo) => {
                const isActive = duo.is_active;
                return (
                  <div
                    key={duo.id}
                    className={`p-4 rounded-2xl border-2 transition-all ${
                      isActive
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-secondary/20'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center shadow-md overflow-hidden">
                          <OptimizedImage
                            src={duo.member1?.photo_url}
                            alt={duo.member1?.name || 'Member 1'}
                            className="w-full h-full"
                            fallbackIcon={<User className="w-10 h-10 text-primary" />}
                          />
                        </div>
                        <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center absolute -right-4 top-0 shadow-md border-4 border-card overflow-hidden">
                          <OptimizedImage
                            src={duo.member2?.photo_url}
                            alt={duo.member2?.name || 'Member 2'}
                            className="w-full h-full"
                            fallbackIcon={<User className="w-10 h-10 text-primary" />}
                          />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-lg text-foreground truncate">
                            {duo.name || `${duo.member1?.name} & ${duo.member2?.name}`}
                          </p>
                          {isActive && (
                            <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        {duo.tagline && (
                          <p className="text-primary text-sm mt-1 truncate">{duo.tagline}</p>
                        )}
                        {duo.bio && (
                          <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{duo.bio}</p>
                        )}
                      </div>
                    </div>

                    {duo.interests && duo.interests.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {duo.interests.slice(0, 3).map((interest, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-secondary/50 rounded-full text-xs text-foreground"
                          >
                            {interest}
                          </span>
                        ))}
                        {duo.interests.length > 3 && (
                          <span className="px-3 py-1 bg-secondary/50 rounded-full text-xs text-muted-foreground">
                            +{duo.interests.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      {!isActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleSetActiveDuo(duo.id)}
                          disabled={setActiveDuoMutation.isPending}
                        >
                          Set as Active
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          disabled
                        >
                          Currently Active
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`${ROUTES.DUO_SETUP}?edit=${duo.id}`)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleLeaveDuo(duo.id)}
                        disabled={leaveDuoMutation.isPending}
                        title="Leave this duo"
                      >
                        Leave
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteDuo(duo.id)}
                        disabled={deleteDuoMutation.isPending || isActive}
                        title={isActive ? "Cannot delete active duo. Set another duo as active first." : "Permanently delete this duo"}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No duos yet. Create one to start matching!</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate(ROUTES.DUO_SETUP)}
              >
                Create Duo
              </Button>
            </div>
          )}
        </div>

        {/* Location Privacy */}
        <div className="bg-card rounded-3xl p-6 shadow-[var(--shadow-card)] animate-slide-up">
          <LocationPrivacyToggle />
        </div>

        {/* Theme Toggle */}
        <div className="bg-card rounded-3xl p-6 shadow-[var(--shadow-card)] animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Theme</h3>
              <p className="text-sm text-muted-foreground">Switch between light and dark mode</p>
            </div>
            <ThemeToggle variant="switch" />
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            size="lg"
            onClick={() => navigate(ROUTES.PROFILE_SETUP)}
          >
            <Settings className="w-5 h-5 mr-2" />
            Edit Profile
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            size="lg"
            onClick={() => navigate(ROUTES.NOTIFICATION_SETTINGS)}
          >
            <Bell className="w-5 h-5 mr-2" />
            Notification Settings
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start text-destructive hover:text-destructive" 
            size="lg"
            onClick={handleLogout}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Logging out...
              </>
            ) : (
              <>
                <LogOut className="w-5 h-5 mr-2" />
                Log Out
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />

      <div className="h-24" /> {/* Bottom spacing */}
    </div>
  );
};

export default Profile;
