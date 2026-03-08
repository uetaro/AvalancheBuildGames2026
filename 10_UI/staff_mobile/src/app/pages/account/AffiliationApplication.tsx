import { ArrowLeft, Building2, Search, FileText, CheckCircle2, Clock, XCircle, AlertCircle, X, Loader2, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { serverUrl, authHeaders, authHeadersWithJson } from '../../lib/supabase';

interface Company {
  company_id: string;
  company_name: string;
}

interface AffiliationRequest {
  company_member_request_id: string;
  company_id: string;
  request_status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_role: string;
  request_note: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
  company: { company_name: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', color: '#C9A227', bg: 'rgba(201, 162, 39, 0.08)', icon: Clock },
  approved: { label: 'Approved', color: '#4CAF50', bg: 'rgba(76, 175, 80, 0.08)', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: '#FF6B6B', bg: 'rgba(255, 107, 107, 0.08)', icon: XCircle },
  cancelled: { label: 'Cancelled', color: '#9CA3AF', bg: 'rgba(156, 163, 175, 0.08)', icon: XCircle },
};

export default function AffiliationApplication() {
  const navigate = useNavigate();

  // Form state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [requestNote, setRequestNote] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Existing requests
  const [myRequests, setMyRequests] = useState<AffiliationRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Get auth token - use getUser() to force refresh if needed
  const getToken = async () => {
    try {
      // First try getSession (fast, from local storage)
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.access_token) {
        console.log('getToken: got token from session, expires_at:', sessionData.session.expires_at);
        return sessionData.session.access_token;
      }
      
      // If no session, try refreshing
      console.log('getToken: no session found, attempting refresh...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.log('getToken: refresh failed:', refreshError.message);
        return null;
      }
      if (refreshData?.session?.access_token) {
        console.log('getToken: got token from refresh');
        return refreshData.session.access_token;
      }
      
      console.log('getToken: no token available after all attempts');
      return null;
    } catch (err) {
      console.log('getToken: unexpected error:', err);
      return null;
    }
  };

  // Fetch existing requests on mount
  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    setLoadingRequests(true);
    try {
      const token = await getToken();
      if (!token) {
        console.log('fetchMyRequests: skipped - no token');
        setLoadingRequests(false);
        return;
      }
      console.log('fetchMyRequests: calling API...');
      const res = await fetch(`${serverUrl}/my-affiliation-requests`, {
        headers: authHeaders(token),
      });
      const data = await res.json();
      console.log('fetchMyRequests response:', res.status, data);
      if (res.ok && data.requests) {
        setMyRequests(data.requests);
      } else {
        console.log('Failed to fetch requests:', data);
      }
    } catch (err) {
      console.log('Error fetching requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  // Company search - triggered explicitly by Enter or button
  const searchCompanies = useCallback(async (q: string) => {
    if (q.trim().length < 1) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setIsSearching(true);
    setSubmitError(null);
    try {
      const token = await getToken();
      if (!token) {
        setSubmitError('Session expired. Please go back and sign in again.');
        setIsSearching(false);
        return;
      }
      console.log(`searchCompanies: q="${q}", calling API...`);
      const res = await fetch(`${serverUrl}/company-search?q=${encodeURIComponent(q.trim())}`, {
        headers: authHeaders(token),
      });
      const data = await res.json();
      console.log('searchCompanies response:', res.status, data);
      if (res.ok && data.companies) {
        setSearchResults(data.companies);
        setShowDropdown(true);
      } else if (res.status === 401) {
        setSubmitError('Authentication failed. Please sign in again.');
      }
    } catch (err) {
      console.log('Company search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setSelectedCompany(null);
    setSubmitError(null);
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim().length >= 1) {
      searchCompanies(searchQuery);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit();
    }
  };

  const selectCompany = (company: Company) => {
    setSelectedCompany(company);
    setSearchQuery(company.company_name);
    setShowDropdown(false);
    setSubmitError(null);
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) {
      setSubmitError('Please select a company from the search results.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const token = await getToken();
      if (!token) {
        setSubmitError('Authentication required. Please sign in again.');
        setIsSubmitting(false);
        return;
      }

      const res = await fetch(`${serverUrl}/affiliation-request`, {
        method: 'POST',
        headers: authHeadersWithJson(token),
        body: JSON.stringify({
          company_id: selectedCompany.company_id,
          request_note: requestNote.trim() || null,
          job_title: jobTitle.trim() || null,
        }),
      });

      const data = await res.json();
      console.log('Submit affiliation response:', res.status, data);

      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => {
          fetchMyRequests();
          setSubmitted(false);
          setSelectedCompany(null);
          setSearchQuery('');
          setRequestNote('');
          setJobTitle('');
          setSearchResults([]);
          setShowDropdown(false);
        }, 2500);
      } else {
        const errorMessages: Record<string, string> = {
          REQUEST_ALREADY_PENDING: 'You already have a pending request for this company.',
          ALREADY_MEMBER: 'You are already a member of this company.',
          COMPANY_NOT_FOUND: 'Company not found.',
          COMPANY_SUSPENDED: 'This company is currently suspended.',
          VALIDATION_ERROR: 'Please select a valid company.',
          UNAUTHORIZED: 'Authentication required. Please sign in again.',
        };
        // Server returns error_code field
        const errorCode = data.error_code || data.code || '';
        const errorMsg = errorMessages[errorCode] || data.message || data.error || 'Failed to submit request.';
        console.log('Submit affiliation error:', errorCode, errorMsg, data);
        setSubmitError(errorMsg);
      }
    } catch (err) {
      console.log('Submit error:', err);
      setSubmitError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel request
  const handleCancel = async (requestId: string) => {
    setCancellingId(requestId);
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${serverUrl}/affiliation-request/${requestId}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });

      const data = await res.json();
      console.log('Cancel response:', res.status, data);

      if (res.ok) {
        fetchMyRequests();
      }
    } catch (err) {
      console.log('Cancel error:', err);
    } finally {
      setCancellingId(null);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F7' }}>
      {/* Header */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #081A33 0%, #0D2B4F 50%, #143A6B 100%)',
          paddingTop: 'max(env(safe-area-inset-top, 0px), 44px)',
        }}
      >
        <div className="relative z-10 px-5 pt-6 pb-6">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => navigate('/app/account')}
              className="p-2 -ml-2 rounded-xl active:scale-95 transition-transform"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              <ArrowLeft size={20} color="white" />
            </button>
            <h1 className="text-white" style={{ fontSize: '20px', fontWeight: 700 }}>
              Affiliation
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', paddingLeft: '44px' }}>
            Apply to join a company or hotel
          </p>
        </div>
      </div>

      <div className="px-5 py-6 space-y-6 pb-32">
        {/* Success Animation */}
        <AnimatePresence>
          {submitted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-50 flex items-center justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
            >
              <motion.div
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                className="bg-white rounded-2xl p-8 mx-8 text-center"
                style={{ boxShadow: '0 8px 32px rgba(8, 26, 51, 0.2)' }}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: 'rgba(76, 175, 80, 0.1)' }}
                >
                  <CheckCircle2 size={32} style={{ color: '#4CAF50' }} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#081A33' }}>Request Sent</h3>
                <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                  Your affiliation request has been submitted
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* New Application Form */}
        <form onSubmit={handleSubmit}>
          <div
            className="rounded-2xl bg-white p-5 space-y-5"
            style={{ boxShadow: '0 8px 32px rgba(8, 26, 51, 0.08)' }}
          >
            <div
              style={{ fontSize: '13px', fontWeight: 600, color: '#081A33', letterSpacing: '0.02em' }}
            >
              NEW APPLICATION
            </div>

            {/* Company Search */}
            <div ref={searchRef} className="relative">
              <label className="block mb-2" style={{ fontSize: '14px', fontWeight: 500, color: '#081A33' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Building2 size={16} style={{ color: '#6B7280' }} />
                  <span>Company / Hotel</span>
                </div>
              </label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    style={{ color: '#9CA3AF' }}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                    placeholder="Enter company name and press Search"
                    className="w-full pl-11 pr-10 py-3 rounded-xl border-0 focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: selectedCompany ? 'rgba(201, 162, 39, 0.06)' : '#F8F9FA',
                      color: '#081A33',
                    }}
                    onKeyDown={handleSearchKeyDown}
                    disabled={!!selectedCompany}
                  />
                  {selectedCompany && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCompany(null);
                        setSearchQuery('');
                        setSearchResults([]);
                        setShowDropdown(false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100"
                    >
                      <X size={16} style={{ color: '#9CA3AF' }} />
                    </button>
                  )}
                  {isSearching && !selectedCompany && (
                    <Loader2
                      size={18}
                      className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin"
                      style={{ color: '#C9A227' }}
                    />
                  )}
                </div>
                {!selectedCompany && (
                  <button
                    type="button"
                    onClick={handleSearchSubmit}
                    disabled={isSearching || searchQuery.trim().length < 1}
                    className="px-4 py-3 rounded-xl text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all flex-shrink-0"
                    style={{
                      backgroundColor: '#081A33',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    {isSearching ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Search size={18} />
                    )}
                  </button>
                )}
              </div>
              {!selectedCompany && !showDropdown && (
                <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '6px' }}>
                  Type a company name and press Enter or tap the search button
                </p>
              )}

              {/* Dropdown Results */}
              <AnimatePresence>
                {showDropdown && searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute z-10 w-full mt-2 rounded-xl overflow-hidden"
                    style={{
                      backgroundColor: 'white',
                      boxShadow: '0 8px 32px rgba(8, 26, 51, 0.12)',
                      border: '1px solid rgba(8, 26, 51, 0.06)',
                    }}
                  >
                    {searchResults.map((company) => (
                      <button
                        key={company.company_id}
                        type="button"
                        onClick={() => selectCompany(company)}
                        className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors hover:bg-gray-50 active:bg-gray-100"
                        style={{ borderBottom: '1px solid rgba(8, 26, 51, 0.04)' }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: 'rgba(201, 162, 39, 0.08)' }}
                        >
                          <Building2 size={14} style={{ color: '#C9A227' }} />
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#081A33' }}>
                          {company.company_name}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
                {showDropdown && searchResults.length === 0 && searchQuery.length >= 1 && !isSearching && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute z-10 w-full mt-2 rounded-xl px-4 py-4 text-center"
                    style={{
                      backgroundColor: 'white',
                      boxShadow: '0 8px 32px rgba(8, 26, 51, 0.12)',
                      border: '1px solid rgba(8, 26, 51, 0.06)',
                    }}
                  >
                    <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
                      No companies found for "{searchQuery}"
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Note */}
            <div>
              <label className="block mb-2" style={{ fontSize: '14px', fontWeight: 500, color: '#081A33' }}>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={16} style={{ color: '#6B7280' }} />
                  <span>Note (optional)</span>
                </div>
              </label>
              <textarea
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder="e.g., Employee ID, department, position..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border-0 focus:outline-none focus:ring-2 resize-none"
                style={{ backgroundColor: '#F8F9FA', color: '#081A33', fontSize: '14px' }}
              />
            </div>

            {/* Job Title */}
            <div>
              <label className="block mb-2" style={{ fontSize: '14px', fontWeight: 500, color: '#081A33' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase size={16} style={{ color: '#6B7280' }} />
                  <span>Job Title (optional)</span>
                </div>
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g., Manager, Engineer..."
                className="w-full px-4 py-3 rounded-xl border-0 focus:outline-none focus:ring-2"
                style={{ backgroundColor: '#F8F9FA', color: '#081A33', fontSize: '14px' }}
              />
            </div>

            {/* Error */}
            {submitError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 p-3 rounded-xl"
                style={{ backgroundColor: 'rgba(255, 107, 107, 0.08)' }}
              >
                <AlertCircle size={16} style={{ color: '#FF6B6B', marginTop: '1px', flexShrink: 0 }} />
                <p style={{ fontSize: '13px', color: '#FF6B6B' }}>{submitError}</p>
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!selectedCompany || isSubmitting}
              className="w-full py-3.5 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all"
              style={{
                backgroundColor: '#C9A227',
                fontSize: '15px',
              }}
            >
              {isSubmitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>Submit Application</>
              )}
            </button>
          </div>
        </form>

        {/* Existing Requests */}
        <div>
          <div
            className="mb-3"
            style={{ fontSize: '13px', fontWeight: 600, color: '#081A33', letterSpacing: '0.02em' }}
          >
            MY REQUESTS
          </div>

          {loadingRequests ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin" style={{ color: '#C9A227' }} />
            </div>
          ) : myRequests.length === 0 ? (
            <div
              className="rounded-2xl bg-white p-6 text-center"
              style={{ boxShadow: '0 1px 3px rgba(8, 26, 51, 0.06)' }}
            >
              <p style={{ fontSize: '13px', color: '#9CA3AF' }}>No requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map((req) => {
                const config = STATUS_CONFIG[req.request_status] || STATUS_CONFIG.pending;
                const StatusIcon = config.icon;
                return (
                  <motion.div
                    key={req.company_member_request_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl bg-white p-4"
                    style={{ boxShadow: '0 1px 3px rgba(8, 26, 51, 0.06)' }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: config.bg }}
                        >
                          <StatusIcon size={18} style={{ color: config.color }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate"
                            style={{ fontSize: '14px', fontWeight: 600, color: '#081A33' }}
                          >
                            {req.company?.company_name || 'Unknown Company'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className="px-2 py-0.5 rounded-full"
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: config.color,
                                backgroundColor: config.bg,
                              }}
                            >
                              {config.label}
                            </span>
                            <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                              {formatDate(req.created_at)}
                            </span>
                          </div>
                          {req.request_note && (
                            <p
                              className="mt-2 truncate"
                              style={{ fontSize: '12px', color: '#6B7280' }}
                            >
                              {req.request_note}
                            </p>
                          )}
                          {req.review_note && (
                            <p
                              className="mt-1 truncate"
                              style={{ fontSize: '12px', color: config.color }}
                            >
                              Review: {req.review_note}
                            </p>
                          )}
                        </div>
                      </div>
                      {req.request_status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleCancel(req.company_member_request_id)}
                          disabled={cancellingId === req.company_member_request_id}
                          className="p-2 rounded-lg hover:bg-gray-50 active:scale-95 transition-all flex-shrink-0"
                        >
                          {cancellingId === req.company_member_request_id ? (
                            <Loader2 size={16} className="animate-spin" style={{ color: '#9CA3AF' }} />
                          ) : (
                            <X size={16} style={{ color: '#9CA3AF' }} />
                          )}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}