import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart, X, MessageCircle, User } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import chickMascot from "@/assets/chick-mascot.png";

// Mock duo data
const mockDuos = [
  {
    id: 1,
    member1: { name: "Sarah", age: 24, photo: chickMascot },
    member2: { name: "Emma", age: 23, photo: chickMascot },
    tagline: "Adventure seekers & coffee lovers",
    bio: "We love hiking, trying new restaurants, and spontaneous road trips!",
    interests: ["Hiking", "Coffee", "Travel", "Music"],
  },
  {
    id: 2,
    member1: { name: "Alex", age: 26, photo: chickMascot },
    member2: { name: "Jordan", age: 25, photo: chickMascot },
    tagline: "Gym buddies looking for fun",
    bio: "Fitness enthusiasts who also love gaming and good food.",
    interests: ["Fitness", "Gaming", "Food", "Movies"],
  },
];

const Matchmaking = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMatched, setIsMatched] = useState(false);
  const navigate = useNavigate();

  const currentDuo = mockDuos[currentIndex];

  const handleSwipe = (liked: boolean) => {
    if (liked && Math.random() > 0.5) {
      setIsMatched(true);
      toast.success("It's a match! 🎉");
      setTimeout(() => {
        setIsMatched(false);
        navigate("/matches");
      }, 2000);
    } else {
      if (currentIndex < mockDuos.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        toast("No more duos to show", { description: "Check back later!" });
      }
    }
  };

  if (!currentDuo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <img src={chickMascot} alt="Yoke" className="w-24 h-24 mx-auto animate-bounce-soft" />
          <h2 className="text-2xl font-bold">No more duos right now</h2>
          <p className="text-muted-foreground">Check back soon for more matches!</p>
          <Button variant="yolk" onClick={() => navigate("/matches")}>
            View Matches
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-4 py-8">
      {/* Match Overlay */}
      {isMatched && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-hatch">
          <div className="bg-card rounded-3xl p-12 text-center space-y-4 animate-hatch shadow-2xl">
            <div className="text-6xl">🎉</div>
            <h2 className="text-4xl font-bold text-foreground">It's a Match!</h2>
            <p className="text-muted-foreground">You can now chat with this duo</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="max-w-lg mx-auto mb-6">
        <div className="flex items-center justify-between">
          <img src={chickMascot} alt="Yoke" className="w-12 h-12" />
          <h1 className="text-2xl font-bold text-foreground">Discover Duos</h1>
          <Button variant="ghost" size="icon" onClick={() => navigate("/matches")}>
            <MessageCircle className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Duo Card */}
      <div className="max-w-lg mx-auto">
        <div className="bg-card rounded-3xl shadow-[var(--shadow-card)] overflow-hidden animate-slide-up">
          {/* Photos */}
          <div className="grid grid-cols-2 bg-secondary/30 p-8 gap-4">
            <div className="text-center space-y-2">
              <div className="w-32 h-32 rounded-full bg-primary/20 mx-auto flex items-center justify-center shadow-lg">
                <User className="w-16 h-16 text-primary" />
              </div>
              <p className="font-semibold text-lg">{currentDuo.member1.name}, {currentDuo.member1.age}</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-32 h-32 rounded-full bg-primary/20 mx-auto flex items-center justify-center shadow-lg">
                <User className="w-16 h-16 text-primary" />
              </div>
              <p className="font-semibold text-lg">{currentDuo.member2.name}, {currentDuo.member2.age}</p>
            </div>
          </div>

          {/* Info */}
          <div className="p-6 space-y-4">
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">{currentDuo.tagline}</h3>
              <p className="text-muted-foreground">{currentDuo.bio}</p>
            </div>

            <div>
              <p className="font-semibold text-sm text-foreground mb-2">Interests</p>
              <div className="flex flex-wrap gap-2">
                {currentDuo.interests.map((interest, idx) => (
                  <span 
                    key={idx}
                    className="px-4 py-2 bg-secondary/50 rounded-full text-sm text-foreground"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center mt-8">
          <Button
            size="lg"
            variant="outline"
            className="w-20 h-20 rounded-full border-2 hover:scale-110 transition-transform"
            onClick={() => handleSwipe(false)}
          >
            <X className="w-8 h-8 text-destructive" />
          </Button>
          <Button
            size="lg"
            variant="yolk"
            className="w-24 h-24 rounded-full hover:scale-110 transition-transform"
            onClick={() => handleSwipe(true)}
          >
            <Heart className="w-10 h-10" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Matchmaking;
