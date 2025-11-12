import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/**
 * ThemeToggle Component
 * 
 * Toggle component for switching between light and dark themes.
 * Supports both button and switch variants.
 * 
 * @param variant - Display variant: "button" or "switch" (default: "switch")
 * @param className - Additional CSS classes
 */
interface ThemeToggleProps {
  variant?: "button" | "switch";
  className?: string;
}

export function ThemeToggle({ variant = "switch", className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder with the same dimensions to prevent layout shift
    return variant === "button" ? (
      <Button variant="ghost" size="icon" className={className} disabled>
        <Sun className="w-5 h-5" />
      </Button>
    ) : (
      <div className={cn("flex items-center gap-3", className)}>
        <Sun className="w-5 h-5" />
        <Switch disabled />
        <Moon className="w-5 h-5" />
      </div>
    );
  }

  const isDark = theme === "dark";

  if (variant === "button") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={className}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? (
          <Sun className="w-5 h-5 transition-all" />
        ) : (
          <Moon className="w-5 h-5 transition-all" />
        )}
      </Button>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Sun className={cn("w-5 h-5 transition-colors", !isDark && "text-primary")} />
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label="Toggle dark mode"
      />
      <Moon className={cn("w-5 h-5 transition-colors", isDark && "text-primary")} />
    </div>
  );
}

