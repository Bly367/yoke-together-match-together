import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, Loader2, User, Mail, Clock, Filter } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { usePendingRequests, useAcceptDuoRequest, useRejectDuoRequest, useCancelDuoRequest, useDuoRequests, useCreateDuoRequest } from "@/hooks/useDuoRequests";
import { ROUTES } from "@/lib/routes";
import { BottomNavigation } from "@/components/BottomNavigation";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DuoRequestStatus } from "@/services/duoRequest.service";

const DuoRequests = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: pendingRequests = [], isLoading: pendingLoading } = usePendingRequests();
  const { data: allRequests, isLoading: allLoading } = useDuoRequests();
  const acceptMutation = useAcceptDuoRequest();
  const rejectMutation = useRejectDuoRequest();
  const cancelMutation = useCancelDuoRequest();
  const createRequestMutation = useCreateDuoRequest();
  const [statusFilter, setStatusFilter] = useState<DuoRequestStatus | 'all'>('all');

  const handleAccept = async (requestId: string) => {
    try {
      await acceptMutation.mutateAsync(requestId);
      toast.success("Duo request accepted! Your duo has been created.");
    } catch (error: any) {
      toast.error(error.message || "Failed to accept request");
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await rejectMutation.mutateAsync(requestId);
      toast.success("Request rejected");
    } catch (error: any) {
      toast.error(error.message || "Failed to reject request");
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      await cancelMutation.mutateAsync(requestId);
      toast.success("Request cancelled");
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel request");
    }
  };

  const handleResendRequest = async (request: any) => {
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    try {
      // Determine who to send the request to
      // If you received the request (you're the requested_id), send TO the requester
      // If you sent the request (you're the requester_id), send TO the requested
      const requestedId = request.requested_id === user.id 
        ? request.requester_id  // You received it, so send to the person who sent it
        : request.requested_id; // You sent it, so send to the person you sent it to

      await createRequestMutation.mutateAsync({
        requestedId: requestedId,
        message: request.message,
        duoName: request.duo_name,
        tagline: request.duo_tagline,
        bio: request.duo_bio,
        interests: request.duo_interests,
        photoUrl: request.duo_photo_url,
      });

      toast.success("Request sent again!");
    } catch (error: any) {
      toast.error(error.message || "Failed to resend request");
    }
  };

  const isLoading = pendingLoading || allLoading;

  // Filter requests by status
  const filteredSentRequests = allRequests?.sent.filter(req => 
    statusFilter === 'all' || req.status === statusFilter
  ) || [];

  const filteredReceivedRequests = allRequests?.received.filter(req => 
    statusFilter === 'all' || req.status === statusFilter
  ) || [];

  // Check if request is expired
  const isExpired = (request: { expires_at?: string; status: string }) => {
    if (request.status !== 'pending') return false;
    if (!request.expires_at) return false;
    return new Date(request.expires_at) < new Date();
  };

  // Check if request can be resent (expired, cancelled, or rejected)
  const canResend = (request: { expires_at?: string; status: string }) => {
    return request.status === 'cancelled' || 
           request.status === 'rejected' || 
           (request.status === 'pending' && isExpired(request));
  };

  // Format expiration time
  const getExpirationText = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today';
    if (diffDays === 1) return 'Expires tomorrow';
    return `Expires in ${diffDays} days`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate(ROUTES.PROFILE)}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Duo Requests</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Filter Tabs */}
        <div className="bg-card rounded-3xl p-4 shadow-[var(--shadow-card)] animate-slide-up">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as DuoRequestStatus | 'all')}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="accepted">Accepted</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Received Requests */}
        {(statusFilter === 'all' || statusFilter === 'pending' || filteredReceivedRequests.length > 0) && (
          <div className="bg-card rounded-3xl p-6 shadow-[var(--shadow-card)] animate-slide-up">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">
              {statusFilter === 'pending' ? 'Pending Requests' : 'Received Requests'}
            </h2>
            {statusFilter === 'all' && pendingRequests.length > 0 && (
              <Badge variant="default" className="ml-2">
                {pendingRequests.length}
              </Badge>
            )}
            {statusFilter !== 'all' && statusFilter !== 'pending' && filteredReceivedRequests.length > 0 && (
              <Badge variant="default" className="ml-2">
                {filteredReceivedRequests.length}
              </Badge>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            </div>
          ) : (statusFilter === 'pending' ? pendingRequests : filteredReceivedRequests).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>
                {statusFilter === 'pending' 
                  ? 'No pending requests' 
                  : `No ${statusFilter} requests`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {(statusFilter === 'pending' ? pendingRequests : filteredReceivedRequests).map((request) => (
                <div
                  key={request.id}
                  className="p-4 rounded-2xl border-2 border-primary/20 bg-primary/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center shadow-md overflow-hidden">
                      <OptimizedImage
                        src={request.requester?.photo_url}
                        alt={request.requester?.name || 'User'}
                        className="w-full h-full"
                        fallbackIcon={<User className="w-8 h-8 text-primary" />}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-lg text-foreground">
                        {request.requester?.name || 'Unknown User'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {request.requester?.email}
                      </p>
                      {request.message && (
                        <p className="text-sm text-foreground mt-2 p-2 bg-secondary/50 rounded-lg whitespace-pre-line">
                          {request.message}
                        </p>
                      )}
                      {/* Show duo details preview if available */}
                      {(request.duo_name || request.duo_tagline || request.duo_bio) && (
                        <div className="mt-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
                          {request.duo_name && (
                            <p className="font-semibold text-sm text-foreground">{request.duo_name}</p>
                          )}
                          {request.duo_tagline && (
                            <p className="text-xs text-muted-foreground mt-1">{request.duo_tagline}</p>
                          )}
                          {request.duo_bio && (
                            <p className="text-xs text-foreground mt-1 line-clamp-2">{request.duo_bio}</p>
                          )}
                          {request.duo_interests && request.duo_interests.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {request.duo_interests.slice(0, 3).map((interest, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-primary/10 rounded-full text-xs text-foreground">
                                  {interest}
                                </span>
                              ))}
                              {request.duo_interests.length > 3 && (
                                <span className="px-2 py-0.5 bg-primary/10 rounded-full text-xs text-muted-foreground">
                                  +{request.duo_interests.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                        {request.expires_at && (
                          <p className={`text-xs ${isExpired(request) ? 'text-destructive' : 'text-muted-foreground'}`}>
                            <Clock className="w-3 h-3 inline mr-1" />
                            {getExpirationText(request.expires_at)}
                          </p>
                        )}
                      </div>
                    </div>
                    {request.status === 'pending' ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(request.id)}
                          disabled={rejectMutation.isPending}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleAccept(request.id)}
                        disabled={acceptMutation.isPending || isExpired(request)}
                        title={isExpired(request) ? 'This request has expired. Please ask them to resend.' : undefined}
                      >
                        {acceptMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 mr-1" />
                        )}
                        Accept
                      </Button>
                      {isExpired(request) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResendRequest(request)}
                          disabled={createRequestMutation.isPending}
                          title="Request expired. Click to ask them to resend."
                        >
                          {createRequestMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Mail className="w-4 h-4 mr-1" />
                              Ask to Resend
                            </>
                          )}
                        </Button>
                      )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 items-end">
                        <Badge
                          variant={
                            request.status === 'accepted'
                              ? 'default'
                              : request.status === 'rejected'
                              ? 'secondary'
                              : 'secondary'
                          }
                        >
                          {request.status}
                        </Badge>
                        {request.status === 'rejected' && (
                          <div className="flex gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleAccept(request.id)}
                              disabled={acceptMutation.isPending}
                            >
                              {acceptMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4 mr-1" />
                              )}
                              Accept
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResendRequest(request)}
                              disabled={createRequestMutation.isPending}
                            >
                              {createRequestMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Mail className="w-4 h-4 mr-1" />
                                  Resend
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                        {request.status === 'cancelled' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResendRequest(request)}
                            disabled={createRequestMutation.isPending}
                          >
                            {createRequestMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Mail className="w-4 h-4 mr-1" />
                                Resend
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        )}

        {/* Sent Requests */}
        {filteredSentRequests.length > 0 && (
          <div className="bg-card rounded-3xl p-6 shadow-[var(--shadow-card)] animate-slide-up">
            <h2 className="text-xl font-bold text-foreground mb-4">Sent Requests</h2>
            <div className="space-y-4">
              {filteredSentRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 rounded-2xl border-2 border-border bg-secondary/20"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center shadow-md overflow-hidden">
                      <OptimizedImage
                        src={request.requested?.photo_url}
                        alt={request.requested?.name || 'User'}
                        className="w-full h-full"
                        fallbackIcon={<User className="w-8 h-8 text-primary" />}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-lg text-foreground">
                          {request.requested?.name || 'Unknown User'}
                        </p>
                        <Badge
                          variant={
                            request.status === 'pending'
                              ? 'default'
                              : request.status === 'accepted'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {request.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {request.requested?.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                        {request.expires_at && request.status === 'pending' && (
                          <p className={`text-xs ${isExpired(request) ? 'text-destructive' : 'text-muted-foreground'}`}>
                            <Clock className="w-3 h-3 inline mr-1" />
                            {getExpirationText(request.expires_at)}
                          </p>
                        )}
                      </div>
                    </div>
                    {request.status === 'pending' ? (
                      <div className="flex flex-col gap-2">
                        {isExpired(request) && (
                          <Badge variant="destructive" className="text-xs">
                            Expired
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancel(request.id)}
                          disabled={cancelMutation.isPending || isExpired(request)}
                        >
                          Cancel
                        </Button>
                        {isExpired(request) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResendRequest(request)}
                            disabled={createRequestMutation.isPending}
                          >
                            {createRequestMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Mail className="w-4 h-4 mr-1" />
                                Resend
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 items-end">
                        <Badge
                          variant={
                            request.status === 'accepted'
                              ? 'default'
                              : request.status === 'rejected'
                              ? 'secondary'
                              : 'secondary'
                          }
                        >
                          {request.status}
                        </Badge>
                        {canResend(request) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResendRequest(request)}
                            disabled={createRequestMutation.isPending}
                          >
                            {createRequestMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Mail className="w-4 h-4 mr-1" />
                                Resend
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
      <div className="h-24" /> {/* Bottom spacing */}
    </div>
  );
};

export default DuoRequests;

