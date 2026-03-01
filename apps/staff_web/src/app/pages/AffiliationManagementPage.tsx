import { useState, useEffect, useCallback } from 'react';
import { Users, CheckCircle, XCircle, Mail, Calendar, Search, Clock, AlertCircle, Loader2, RefreshCw, Briefcase } from 'lucide-react';
import { AIChat, AIChatButton } from '../components/AIChat';
import { useAuth } from '../components/AuthContext';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-20781d19`;

interface AffiliationRequest {
  company_member_request_id: string;
  user_id: string;
  app_display_name: string;
  email: string | null;
  job_title: string | null;
  requested_role: string;
  request_status: string;
  request_note: string | null;
  review_note: string | null;
  reviewed_by_company_member_id: string | null;
  reviewed_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export default function AffiliationManagementPage() {
  const { session, activeMembership } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAIChat, setShowAIChat] = useState(false);
  const [requests, setRequests] = useState<AffiliationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  const fetchRequests = useCallback(async () => {
    if (!session?.access_token || !activeMembership?.company_id) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/ops-affiliation-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          access_token: session.access_token,
          company_id: activeMembership.company_id,
          status: statusFilter,
          limit: 100,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('[affiliation] fetch error:', data);
        setError(data.message || 'Failed to fetch requests');
        setRequests([]);
      } else {
        setRequests(data.items || []);
      }
    } catch (err) {
      console.error('[affiliation] network error:', err);
      setError('Network error while fetching requests');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, activeMembership?.company_id, statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleDecide = async (requestId: string, decision: 'approve' | 'reject') => {
    if (!session?.access_token || !activeMembership?.company_id) return;

    const request = requests.find(r => r.company_member_request_id === requestId);
    if (!request) return;

    setDecidingId(requestId);

    try {
      const res = await fetch(`${API_BASE}/ops-affiliation-requests-decide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          access_token: session.access_token,
          company_id: activeMembership.company_id,
          company_member_request_id: requestId,
          decision,
          expected_version: request.version,
          granted_role: request.requested_role === 'manager' ? 'manager' : 'staff',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(`[affiliation] ${decision} error:`, data);
        setError(data.message || `Failed to ${decision} request`);
      } else {
        // Update local state
        setRequests(prev => prev.map(r =>
          r.company_member_request_id === requestId
            ? { ...r, request_status: data.request_status, version: data.version, reviewed_at: data.reviewed_at }
            : r
        ));
      }
    } catch (err) {
      console.error(`[affiliation] ${decision} network error:`, err);
      setError(`Network error while ${decision === 'approve' ? 'approving' : 'rejecting'} request`);
    } finally {
      setDecidingId(null);
    }
  };

  const filteredRequests = requests.filter(req =>
    req.app_display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (req.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (req.request_note || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingRequests = filteredRequests.filter(r => r.request_status === 'pending');
  const decidedRequests = filteredRequests.filter(r => r.request_status !== 'pending');

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return dateStr; }
  };

  const renderRequestCard = (request: AffiliationRequest, showActions: boolean) => (
    <div
      key={request.company_member_request_id}
      className={`bg-white rounded-lg border p-5 hover:shadow-sm transition-shadow ${
        request.request_status === 'rejected' ? 'border-[#FF6B6B]/20 opacity-75' :
        request.request_status === 'approved' ? 'border-[#10B981]/20' :
        'border-[#E5E7EB]'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#081A33] to-[#0A2240] flex items-center justify-center text-white font-semibold flex-shrink-0">
            {request.app_display_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-[#081A33]">{request.app_display_name}</h3>
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                request.requested_role === 'manager'
                  ? 'bg-[#081A33]/10 text-[#081A33]'
                  : 'bg-[#C9A227]/10 text-[#C9A227]'
              }`}>
                {request.requested_role}
              </span>
              {request.request_status !== 'pending' && (
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                  request.request_status === 'approved'
                    ? 'bg-[#10B981]/10 text-[#10B981]'
                    : 'bg-[#FF6B6B]/10 text-[#FF6B6B]'
                }`}>
                  {request.request_status}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-[#6B7280] mb-2">
              {request.job_title && (
                <div className="flex items-center gap-1.5">
                  <Briefcase size={14} className="text-[#9CA3AF]" />
                  {request.job_title}
                </div>
              )}
              {request.email && (
                <div className="flex items-center gap-1.5">
                  <Mail size={14} className="text-[#9CA3AF]" />
                  {request.email}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-[#9CA3AF]" />
                {formatDate(request.created_at)}
              </div>
            </div>
            {request.request_note && (
              <p className="text-sm text-[#6B7280] bg-[#F7F8FA] rounded p-3 mt-2">
                "{request.request_note}"
              </p>
            )}
          </div>
        </div>
        {showActions && request.request_status === 'pending' && (
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => handleDecide(request.company_member_request_id, 'reject')}
              disabled={decidingId === request.company_member_request_id}
              className="px-4 py-2 border border-[#FF6B6B] text-[#FF6B6B] rounded-lg hover:bg-[#FF6B6B]/5 transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
            >
              {decidingId === request.company_member_request_id ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <XCircle size={18} />
              )}
              Reject
            </button>
            <button
              onClick={() => handleDecide(request.company_member_request_id, 'approve')}
              disabled={decidingId === request.company_member_request_id}
              className="px-4 py-2 bg-[#081A33] text-white rounded-lg hover:bg-[#0A2240] transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
            >
              {decidingId === request.company_member_request_id ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <CheckCircle size={18} />
              )}
              Approve
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-[#FAFBFC]">
      <div className="bg-white border-b border-[#E5E7EB] px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[#081A33]">Affiliation Requests</h1>
            <p className="text-sm text-[#6B7280] mt-1">Review and approve access requests</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchRequests}
              disabled={loading}
              className="p-2.5 border border-[#E5E7EB] rounded-lg hover:bg-[#F7F8FA] transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={16} className={`text-[#6B7280] ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="relative w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-[#C9A227]/5 rounded-lg border border-[#C9A227]/20">
            <Clock size={16} className="text-[#C9A227]" />
            <span className="text-sm font-medium text-[#081A33]">{pendingRequests.length} pending</span>
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1 bg-[#F7F8FA] rounded-lg p-1">
            {['pending', 'approved', 'rejected', 'pending,approved,rejected'].map((s) => {
              const label = s.includes(',') ? 'All' : s.charAt(0).toUpperCase() + s.slice(1);
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    statusFilter === s
                      ? 'bg-white text-[#081A33] shadow-sm'
                      : 'text-[#6B7280] hover:text-[#081A33]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Error */}
        {error && (
          <div className="mb-4 flex items-start gap-2 p-3 bg-[#FF6B6B]/10 border border-[#FF6B6B]/30 rounded-lg">
            <AlertCircle size={16} className="text-[#FF6B6B] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[#FF6B6B]">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-[#C9A227]" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-[#081A33] mb-3">Pending Requests</h2>
                <div className="space-y-3">
                  {pendingRequests.map((request) => renderRequestCard(request, true))}
                </div>
              </div>
            )}

            {/* Decided Requests (shown when viewing all or specific decided status) */}
            {decidedRequests.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-[#081A33] mb-3">Processed Requests</h2>
                <div className="space-y-3">
                  {decidedRequests.map((request) => renderRequestCard(request, false))}
                </div>
              </div>
            )}

            {/* No Requests */}
            {filteredRequests.length === 0 && (
              <div className="bg-white rounded-lg border border-[#E5E7EB] p-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-[#F7F8FA] flex items-center justify-center mb-4">
                    <Users size={32} className="text-[#9CA3AF]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#081A33] mb-1">No {statusFilter.includes(',') ? '' : statusFilter + ' '}requests</h3>
                  <p className="text-sm text-[#9CA3AF]">
                    {searchQuery ? 'Try adjusting your search' : 'All requests have been processed'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Chat */}
      {showAIChat ? (
        <AIChat context="affiliation" onClose={() => setShowAIChat(false)} />
      ) : (
        <AIChatButton onClick={() => setShowAIChat(true)} />
      )}
    </div>
  );
}