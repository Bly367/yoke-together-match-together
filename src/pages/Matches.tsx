import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { MessageCircle, User, ArrowLeft } from "lucide-react";
import chickMascot from "@/assets/chick-mascot.png";

const mockMatches = [
  {
    id: 1,
    member1: { name: "Sarah", age: 24 },
    member2: { name: "Emma", age: 23 },
    lastMessage: "Hey! When are you free to meet up?",
    timestamp: "2m ago",
    unread: 2,
  },
  {
    id: 2,
    member1: { name: "Alex", age: 26 },
    member2: { name: "Jordan", age: 25 },
    lastMessage: "That sounds great! Let's do it!",
    timestamp: "1h ago",
    unread: 0,
  },
];

const Matches = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate("/matchmaking")}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Matches</h1>
          <img src={chickMascot} alt="Yoke" className="w-10 h-10" />
        </div>
      </div>

      {/* Matches List */}
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {mockMatches.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <img src={chickMascot} alt="No matches" className="w-24 h-24 mx-auto animate-bounce-soft opacity-50" />
            <h2 className="text-xl font-semibold text-foreground">No matches yet</h2>
            <p className="text-muted-foreground">Start swiping to find your duo matches!</p>
            <Button variant="yolk" onClick={() => navigate("/matchmaking")}>
              Start Swiping
            </Button>
          </div>
        ) : (
          mockMatches.map((match) => (
            <div
              key={match.id}
              onClick={() => navigate(`/chat/${match.id}`)}
              className="bg-card rounded-3xl p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-soft)] transition-all cursor-pointer animate-slide-up"
            >
              <div className="flex items-center gap-4">
                {/* Duo Avatars */}
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center shadow-md">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div className="w-14 h-14 rounded-full bg-secondary/30 flex items-center justify-center absolute -right-4 top-0 shadow-md border-2 border-card">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                </div>

                {/* Match Info */}
                <div className="flex-1 min-w-0 ml-4">
                  <h3 className="font-semibold text-lg text-foreground truncate">
                    {match.member1.name} & {match.member2.name}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {match.lastMessage}
                  </p>
                </div>

                {/* Meta */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className="text-xs text-muted-foreground">{match.timestamp}</span>
                  {match.unread > 0 && (
                    <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      {match.unread}
                    </span>
                  )}
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 inset-x-0 bg-card border-t border-border shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-around">
          <Button variant="ghost" onClick={() => navigate("/matchmaking")} className="flex flex-col gap-1">
            <User className="w-6 h-6" />
            <span className="text-xs">Discover</span>
          </Button>
          <Button variant="ghost" className="flex flex-col gap-1">
            <MessageCircle className="w-6 h-6 text-primary" />
            <span className="text-xs text-primary">Matches</span>
          </Button>
          <Button variant="ghost" onClick={() => navigate("/profile")} className="flex flex-col gap-1">
            <User className="w-6 h-6" />
            <span className="text-xs">Profile</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Matches;
