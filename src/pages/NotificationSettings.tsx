import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, BellOff, CheckCircle2, XCircle, AlertCircle, TestTube } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/lib/routes";
import {
  requestNotificationPermission,
  areNotificationsEnabled,
  notifyNewMessage,
  notifyNewMatch,
  notifyNewDuoRequest,
} from "@/lib/notifications";
import { BottomNavigation } from "@/components/BottomNavigation";

/**
 * Notification Settings Page
 * Allows users to manage browser notification preferences
 */
const NotificationSettings = () => {
  const navigate = useNavigate();
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  // Check permission status on mount and when it changes
  useEffect(() => {
    const checkPermission = () => {
      if ('Notification' in window) {
        setPermissionStatus(Notification.permission);
      } else {
        setPermissionStatus('denied'); // Treat as denied if not supported
      }
    };

    checkPermission();

    // Listen for permission changes (some browsers support this)
    const handleVisibilityChange = () => {
      checkPermission();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        toast.success('Notifications enabled!');
        setPermissionStatus('granted');
      } else {
        toast.error('Notification permission denied. Please enable it in your browser settings.');
        setPermissionStatus('denied');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to request notification permission');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleTestNotification = async (type: 'message' | 'match' | 'duo-request') => {
    if (!areNotificationsEnabled()) {
      toast.error('Please enable notifications first');
      return;
    }

    try {
      switch (type) {
        case 'message':
          notifyNewMessage('Test User', 'This is a test message notification', 'test-match-id');
          toast.success('Test message notification sent!');
          break;
        case 'match':
          notifyNewMatch('Test Duo & Partner');
          toast.success('Test match notification sent!');
          break;
        case 'duo-request':
          notifyNewDuoRequest('Test User');
          toast.success('Test duo request notification sent!');
          break;
      }
    } catch (error: any) {
      toast.error('Failed to send test notification: ' + error.message);
    }
  };

  const isSupported = 'Notification' in window;
  const isEnabled = areNotificationsEnabled();
  const canRequest = permissionStatus === 'default' || permissionStatus === null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate(ROUTES.PROFILE)}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Notification Settings</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Browser Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Browser Support
            </CardTitle>
            <CardDescription>
              Check if your browser supports notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSupported ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                <span>Your browser supports notifications</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="w-5 h-5" />
                <span>Your browser does not support notifications</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permission Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Permission Status
            </CardTitle>
            <CardDescription>
              Current browser notification permission status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {permissionStatus === 'granted' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="font-medium">Notifications Enabled</span>
                  </>
                ) : permissionStatus === 'denied' ? (
                  <>
                    <XCircle className="w-5 h-5 text-destructive" />
                    <span className="font-medium">Notifications Disabled</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    <span className="font-medium">Permission Not Set</span>
                  </>
                )}
              </div>
              <Badge
                variant={
                  permissionStatus === 'granted'
                    ? 'default'
                    : permissionStatus === 'denied'
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {permissionStatus || 'unknown'}
              </Badge>
            </div>

            {canRequest && (
              <Button
                onClick={handleRequestPermission}
                disabled={isRequesting || !isSupported}
                className="w-full"
              >
                {isRequesting ? 'Requesting...' : 'Enable Notifications'}
              </Button>
            )}

            {permissionStatus === 'denied' && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Permission Denied:</strong> To enable notifications, please:
                </p>
                <ol className="list-decimal list-inside mt-2 text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  <li>Click the lock/info icon in your browser's address bar</li>
                  <li>Find "Notifications" in the permissions list</li>
                  <li>Change it from "Block" to "Allow"</li>
                  <li>Refresh this page</li>
                </ol>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notification Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Types
            </CardTitle>
            <CardDescription>
              You'll receive notifications for these events when enabled
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-semibold">New Messages</h3>
                <p className="text-sm text-muted-foreground">
                  Get notified when you receive new messages
                </p>
              </div>
              <Badge variant={isEnabled ? 'default' : 'secondary'}>
                {isEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-semibold">New Matches</h3>
                <p className="text-sm text-muted-foreground">
                  Get notified when you get a new match
                </p>
              </div>
              <Badge variant={isEnabled ? 'default' : 'secondary'}>
                {isEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-semibold">Duo Requests</h3>
                <p className="text-sm text-muted-foreground">
                  Get notified when someone sends you a duo request
                </p>
              </div>
              <Badge variant={isEnabled ? 'default' : 'secondary'}>
                {isEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Test Notifications */}
        {isEnabled && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Test Notifications
              </CardTitle>
              <CardDescription>
                Test each notification type to see how they appear
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                onClick={() => handleTestNotification('message')}
                className="w-full"
              >
                Test Message Notification
              </Button>
              <Button
                variant="outline"
                onClick={() => handleTestNotification('match')}
                className="w-full"
              >
                Test Match Notification
              </Button>
              <Button
                variant="outline"
                onClick={() => handleTestNotification('duo-request')}
                className="w-full"
              >
                Test Duo Request Notification
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle>About Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              • Notifications only appear when the app is in the background or another tab is active
            </p>
            <p>
              • You won't receive notifications for messages in chats you're currently viewing
            </p>
            <p>
              • Notifications are managed by your browser and can be disabled at any time
            </p>
            <p>
              • Clicking a notification will take you directly to the relevant page
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
      <div className="h-24" /> {/* Bottom spacing */}
    </div>
  );
};

export default NotificationSettings;

