import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import chickMascot from "@/assets/chick-mascot.png";
import { Users, Mail, Copy, Loader2 } from "lucide-react";

const DuoSetup = () => {
  const [loading, setLoading] = useState(false);
  const [inviteMethod, setInviteMethod] = useState<"email" | "link">("email");
  const [friendEmail, setFriendEmail] = useState("");
  const navigate = useNavigate();

  const inviteLink = `${window.location.origin}/join-duo/ABC123`;

  const handleInvite = async () => {
    setLoading(true);
    try {
      if (inviteMethod === "email") {
        // TODO: Send invitation email
        toast.success(`Invitation sent to ${friendEmail}!`);
      } else {
        navigator.clipboard.writeText(inviteLink);
        toast.success("Link copied to clipboard!");
      }
      setTimeout(() => navigate("/matchmaking"), 1500);
    } catch (error: any) {
      toast.error("Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-4 py-12">
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
            <h1 className="text-3xl font-bold text-foreground">Find Your Duo Partner</h1>
            <p className="text-muted-foreground">
              Invite a friend to create your duo and start matching together!
            </p>
          </div>

          {/* Method Selection */}
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

          {/* Invite Form */}
          <div className="space-y-4">
            {inviteMethod === "email" ? (
              <div className="space-y-2">
                <Label htmlFor="email">Friend's Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="friend@example.com"
                  value={friendEmail}
                  onChange={(e) => setFriendEmail(e.target.value)}
                  className="rounded-2xl"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Invite Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={inviteLink}
                    readOnly
                    className="rounded-2xl bg-muted"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      toast.success("Link copied!");
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            <Button 
              variant="yolk" 
              className="w-full" 
              size="lg"
              onClick={handleInvite}
              disabled={loading || (inviteMethod === "email" && !friendEmail)}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  {inviteMethod === "email" ? "Send Invitation" : "Copy Link"}
                </>
              )}
            </Button>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate("/matchmaking")}
            >
              Skip for Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DuoSetup;
