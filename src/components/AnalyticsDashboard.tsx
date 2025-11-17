import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePreferenceAnalytics, useUserPreferenceAnalytics } from '@/hooks/useAnalytics';
import { useCostMetrics } from '@/hooks/useCostMonitoring';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, TrendingUp, Eye, Heart, MessageSquare, BarChart3, DollarSign } from 'lucide-react';
import { formatCost } from '@/services/costMonitoring.service';

/**
 * Analytics Dashboard component
 * Displays preference learning metrics and cost monitoring
 */
export function AnalyticsDashboard() {
  const { user } = useAuth();
  const { data: globalAnalytics, isLoading: globalLoading } = usePreferenceAnalytics(30);
  const { data: userAnalytics, isLoading: userLoading } = useUserPreferenceAnalytics(user?.id || null, 30);
  const { data: costMetrics, isLoading: costLoading } = useCostMetrics();

  const isLoading = globalLoading || userLoading || costLoading;
  const hasError = !globalAnalytics || !userAnalytics || !costMetrics;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <p className="text-destructive">Failed to load analytics data</p>
        <p className="text-sm text-muted-foreground">Please try refreshing the page</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold">Analytics Dashboard</h2>
        <p className="text-muted-foreground mt-2">Preference learning metrics and cost monitoring</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="user">Your Analytics</TabsTrigger>
          <TabsTrigger value="costs">Cost Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {globalAnalytics && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{globalAnalytics.totalEvents.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{globalAnalytics.userEngagement.activeUsers}</div>
                    <p className="text-xs text-muted-foreground">
                      Avg {globalAnalytics.userEngagement.averageEventsPerUser.toFixed(1)} events/user
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Dwell Time</CardTitle>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {globalAnalytics.averageDwellTime > 0
                        ? `${(globalAnalytics.averageDwellTime / 1000).toFixed(1)}s`
                        : 'N/A'}
                    </div>
                    <p className="text-xs text-muted-foreground">Time spent viewing</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Embedding Coverage</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {globalAnalytics.embeddingCoverage.totalPhotos > 0
                        ? `${Math.round(
                            (globalAnalytics.embeddingCoverage.photosWithEmbeddings /
                              globalAnalytics.embeddingCoverage.totalPhotos) *
                              100
                          )}%`
                        : '0%'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {globalAnalytics.embeddingCoverage.photosWithEmbeddings}/
                      {globalAnalytics.embeddingCoverage.totalPhotos} photos
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Events by Type</CardTitle>
                  <CardDescription>Distribution of preference events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(globalAnalytics.eventsByType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                        <span className="font-semibold">{count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="user" className="space-y-4">
          {userAnalytics && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Activity</CardTitle>
                    <CardDescription>Your preference learning events</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="text-2xl font-bold">{userAnalytics.totalEvents}</div>
                        <p className="text-sm text-muted-foreground">Total events</p>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(userAnalytics.eventsByType).map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between">
                            <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                            <span className="font-semibold">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Engagement</CardTitle>
                    <CardDescription>Your interaction patterns</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="text-2xl font-bold">
                          {userAnalytics.averageDwellTime > 0
                            ? `${(userAnalytics.averageDwellTime / 1000).toFixed(1)}s`
                            : 'N/A'}
                        </div>
                        <p className="text-sm text-muted-foreground">Average dwell time</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          {costMetrics && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{costMetrics.totalRequests.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">API calls</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{costMetrics.totalTokens.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Avg {Math.round(costMetrics.averageTokensPerRequest)}/request
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCost(costMetrics.estimatedCost)}</div>
                  <p className="text-xs text-muted-foreground">OpenAI API usage</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Request Breakdown</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Photos</span>
                      <span className="font-semibold">{costMetrics.requestsByType.photo}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Prompts</span>
                      <span className="font-semibold">{costMetrics.requestsByType.prompt}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

