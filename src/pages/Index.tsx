import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import chickMascot from "@/assets/chick-mascot.png";
import yolkGradient from "@/assets/yolk-gradient.png";
import { Heart, Users, MessageCircle, Sparkles } from "lucide-react";
import { ROUTES } from "@/lib/routes";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div 
        className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 overflow-hidden"
        style={{
          backgroundImage: `url(${yolkGradient})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background" />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8 animate-slide-up">
          {/* Mascot */}
          <div className="flex justify-center mb-8">
            <img 
              src={chickMascot} 
              alt="Yoke Chick" 
              className="w-32 h-32 md:w-40 md:h-40 animate-bounce-soft drop-shadow-2xl"
            />
          </div>

          {/* Heading */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold text-foreground">
              🥚 Yoke
            </h1>
            <p className="text-2xl md:text-3xl font-semibold text-foreground/90">
              Meet together. Match together.
            </p>
            <p className="text-lg md:text-xl text-foreground/70 max-w-2xl mx-auto">
              Dating is better with a friend! Create a duo with your bestie and match with other duos for double the fun.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
            <Link to={ROUTES.AUTH}>
              <Button variant="yolk" size="lg" className="w-full sm:w-auto animate-hatch">
                Get Started
              </Button>
            </Link>
            <Link to={ROUTES.AUTH}>
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="Create a Duo"
              description="Pair up with your best friend to create your duo profile"
            />
            <FeatureCard
              icon={<Sparkles className="w-8 h-8" />}
              title="Swipe Together"
              description="Discover other duos and swipe on profiles you both like"
            />
            <FeatureCard
              icon={<Heart className="w-8 h-8" />}
              title="Match & Connect"
              description="When both duos like each other, it's a match!"
            />
            <FeatureCard
              icon={<MessageCircle className="w-8 h-8" />}
              title="Chat & Meet"
              description="Start a group chat and plan your double date"
            />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 px-4 bg-secondary/30">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Ready to find your match?
          </h2>
          <p className="text-lg text-foreground/70">
            Join thousands of duos already making connections
          </p>
          <Link to={ROUTES.AUTH}>
            <Button variant="yolk" size="lg" className="animate-wiggle hover:animate-none">
              Start Your Journey
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => {
  return (
    <div className="bg-card rounded-3xl p-6 text-center space-y-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-soft)] transition-all hover:scale-105">
      <div className="flex justify-center text-primary">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-card-foreground">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};

export default Index;
