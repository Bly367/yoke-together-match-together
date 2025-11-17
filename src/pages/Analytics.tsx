import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { BottomNavigation } from '@/components/BottomNavigation';

/**
 * Analytics page
 * Displays preference learning metrics and cost monitoring
 */
export default function Analytics() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <AnalyticsDashboard />
      <BottomNavigation />
    </div>
  );
}

