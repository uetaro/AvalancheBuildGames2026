import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase, serverUrl, authHeaders, authHeadersWithJson } from '../../lib/supabase';

// ============================================================
// Test: hardcoded work_tag_public_id from DB.
// Set work_tag_public_id from an inserted work_tag here.
// Get it via the debug panel "Fetch Tags" button if empty.
// ============================================================
const HARDCODED_WORK_TAG_PUBLIC_ID = ''; // Paste work_tag_public_id from DB, or leave empty to use debug panel

interface WorkTapResponse {
  action: 'clockin' | 'clockout';
  company_id: string;
  on_duty_session_id: string;
  started_at: string | null;
  ended_at: string | null;
  message: string;
}

interface WorkTag {
  work_tag_id: string;
  work_tag_public_id: string;
  company_id: string;
  intended_action: string;
  work_tag_status: string;
  work_tag_label: string;
}

interface Toast {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export default function WorkingStatus() {
  const [isWorking, setIsWorking] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [workStartTime, setWorkStartTime] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Debug panel
  const [debugOpen, setDebugOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<WorkTag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState(HARDCODED_WORK_TAG_PUBLIC_ID);
  const [lastResponse, setLastResponse] = useState<string>('');
  const [tagsLoading, setTagsLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const getAccessToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  // Initial load: fetch current work status
  const fetchWorkStatus = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;

      const res = await fetch(`${serverUrl}/work-status`, {
        headers: authHeaders(token),
      });
      const data = await res.json();
      console.log('Work status response:', data);

      if (data.on_duty && data.session) {
        setIsWorking(true);
        if (data.session.started_at) {
          const startDate = new Date(data.session.started_at);
          setWorkStartTime(startDate.toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', hour12: false,
          }));
        }
      } else {
        setIsWorking(false);
        setWorkStartTime(null);
      }
    } catch (err) {
      console.log('Failed to fetch work status:', err);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkStatus();
    fetchWorkTags();
  }, [fetchWorkStatus]);

  // Debug: fetch available work tags
  const fetchWorkTags = async () => {
    setTagsLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setToast({ type: 'error', title: 'Auth Error', message: 'Not logged in' });
        return;
      }
      const res = await fetch(`${serverUrl}/work-tags`, {
        headers: authHeaders(token),
      });
      const data = await res.json();
      console.log('Work tags response:', data);
      if (data.tags) {
        setAvailableTags(data.tags);
        if (data.tags.length > 0 && !selectedTagId) {
          setSelectedTagId(data.tags[0].work_tag_public_id);
        }
      } else {
        setToast({ type: 'error', title: 'Error', message: data.error || 'Failed to fetch tags' });
      }
    } catch (err) {
      console.log('Failed to fetch work tags:', err);
      setToast({ type: 'error', title: 'Network Error', message: String(err) });
    } finally {
      setTagsLoading(false);
    }
  };

  // NFC tap (or button press) → call API
  const handleWorkTap = async () => {
    if (isAnimating || isLoading) return;

    const tagId = selectedTagId || HARDCODED_WORK_TAG_PUBLIC_ID;
    if (!tagId) {
      setToast({
        type: 'error',
        title: 'Tag Not Set',
        message: 'Open debug panel and fetch tags first, or set HARDCODED_WORK_TAG_PUBLIC_ID',
      });
      return;
    }

    setIsAnimating(true);
    setIsLoading(true);

    try {
      const token = await getAccessToken();
      if (!token) {
        setToast({ type: 'error', title: 'Auth Error', message: 'Not logged in. Please sign in again.' });
        setIsAnimating(false);
        setIsLoading(false);
        return;
      }

      const requestBody = {
        work_tag_public_id: tagId,
        tapped_at: new Date().toISOString(),
        client_request_id: `worktap-${Date.now()}`,
      };

      console.log('Work tap request:', requestBody);

      const res = await fetch(`${serverUrl}/work-tap`, {
        method: 'POST',
        headers: authHeadersWithJson(token),
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();
      console.log('Work tap response:', res.status, data);
      setLastResponse(JSON.stringify(data, null, 2));

      if (!res.ok) {
        // Error response
        const errorMessages: Record<string, string> = {
          'UNAUTHORIZED': 'Authentication failed. Please sign in again.',
          'WORK_TAG_NOT_FOUND': 'NFC tag not found. Check the tag ID.',
          'WORK_TAG_REVOKED': 'This NFC tag has been deactivated.',
          'FORBIDDEN_NOT_MEMBER': 'You are not registered as a member of this company.',
          'FORBIDDEN_ROLE': 'Your role does not permit clock in/out.',
          'ALREADY_ON_DUTY': 'You are already clocked in.',
          'NOT_ON_DUTY': 'You are not currently clocked in.',
          'VALIDATION_ERROR': 'Invalid request. Check parameters.',
        };
        const friendlyMsg = errorMessages[data.error_code] || data.message || 'An error occurred';
        setToast({
          type: 'error',
          title: data.error_code || 'Error',
          message: friendlyMsg,
        });
        setIsAnimating(false);
        setIsLoading(false);
        return;
      }

      // Success
      const tapResult = data as WorkTapResponse;

      setTimeout(() => {
        if (tapResult.action === 'clockin') {
          setIsWorking(true);
          const now = new Date();
          setWorkStartTime(now.toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', hour12: false,
          }));
          setToast({ type: 'success', title: 'Clocked In', message: tapResult.message });
        } else {
          setIsWorking(false);
          setWorkStartTime(null);
          setToast({ type: 'success', title: 'Clocked Out', message: tapResult.message });
        }
        setTimeout(() => setIsAnimating(false), 600);
      }, 300);

    } catch (err) {
      console.log('Work tap network error:', err);
      setToast({ type: 'error', title: 'Network Error', message: `Could not reach server: ${err}` });
      setIsAnimating(false);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });
  };

  const calculateWorkDuration = () => {
    if (!isWorking || !workStartTime) return '0h 00m';
    const now = new Date();
    const start = new Date();
    const [hours, minutes] = workStartTime.split(':');
    start.setHours(parseInt(hours), parseInt(minutes), 0);
    const diff = now.getTime() - start.getTime();
    if (diff < 0) return '0h 00m';
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${h}h ${String(m).padStart(2, '0')}m`;
  };

  if (initialLoading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: '#FAFBFC' }}>
        <div className="animate-spin w-8 h-8 border-3 border-t-transparent rounded-full"
             style={{ borderColor: '#5BA5A5', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#FAFBFC' }}>
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.3 }}
            className="fixed top-0 left-0 right-0 z-50 px-4 pt-4"
            style={{ maxWidth: '480px', margin: '0 auto' }}
          >
            <div
              className="flex items-start gap-3 px-5 py-4 rounded-2xl shadow-lg"
              style={{
                backgroundColor: '#ffffff',
                boxShadow: '0 8px 32px rgba(8, 26, 51, 0.12)',
              }}
            >
              {toast.type === 'success' && <CheckCircle size={20} style={{ color: '#5BA5A5', flexShrink: 0, marginTop: '1px' }} />}
              {toast.type === 'error' && <AlertCircle size={20} style={{ color: '#FF6B6B', flexShrink: 0, marginTop: '1px' }} />}
              {toast.type === 'info' && <Info size={20} style={{ color: '#C9A227', flexShrink: 0, marginTop: '1px' }} />}
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#081A33', marginBottom: '2px' }}>
                  {toast.title}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', lineHeight: '1.4' }}>
                  {toast.message}
                </div>
              </div>
              <button onClick={() => setToast(null)} className="flex-shrink-0 mt-0.5" style={{ color: '#9CA3AF', fontSize: '18px', lineHeight: '1' }}>
                &times;
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="px-6 pt-8 pb-6">
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#081A33', marginBottom: '4px' }}>
          Work
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280' }}>
          {formatDate(currentTime)}
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center px-6" style={{ paddingTop: '24px', paddingBottom: '80px' }}>
        {/* Current Time */}
        <div className="mb-10 text-center">
          <div className="flex items-baseline justify-center gap-3 mb-2">
            <span style={{
              fontSize: '56px', fontWeight: 700, color: '#081A33',
              letterSpacing: '-2px', lineHeight: '1', fontVariantNumeric: 'tabular-nums',
            }}>
              {formatTime(currentTime).slice(0, 5)}
            </span>
            <span style={{
              fontSize: '24px', fontWeight: 500, color: '#D1D5DB',
              letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums',
            }}>
              {formatTime(currentTime).slice(6)}
            </span>
          </div>

          {/* Working Status */}
          <div className="flex items-center justify-center gap-2" style={{ minHeight: '20px' }}>
            <AnimatePresence mode="wait">
              {isWorking && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2"
                >
                  <div className="relative">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#5BA5A5' }} />
                    <motion.div
                      className="absolute inset-0 w-2 h-2 rounded-full"
                      style={{ backgroundColor: '#5BA5A5' }}
                      animate={{ scale: [1, 1.8, 1], opacity: [1, 0, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                  <span style={{ fontSize: '13px', color: '#5BA5A5', fontWeight: 600 }}>
                    Working · {calculateWorkDuration()}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* NFC Detection Area */}
        <div className="w-full max-w-sm">
          <div
            onClick={tagsLoading ? undefined : handleWorkTap}
            className="relative w-full"
            style={{ aspectRatio: '1', maxWidth: '280px', margin: '0 auto', display: 'block', cursor: tagsLoading ? 'not-allowed' : 'pointer' }}
          >
            {/* Animated Detection Rings */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: '2px solid', borderColor: isWorking ? '#5BA5A5' : '#081A33', opacity: 0.2 }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0, 0.2] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: '2px solid', borderColor: isWorking ? '#5BA5A5' : '#081A33', opacity: 0.15 }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0, 0.15] }}
              transition={{ duration: 3, delay: 0.5, repeat: Infinity, ease: "easeOut" }}
            />

            {/* Success Ripple Effect */}
            <AnimatePresence>
              {isAnimating && (
                <>
                  <motion.div
                    key="ripple-1"
                    className="absolute inset-0 rounded-full"
                    style={{ border: '3px solid', borderColor: isWorking ? '#081A33' : '#5BA5A5' }}
                    initial={{ scale: 0.9, opacity: 0.6 }}
                    animate={{ scale: 1.4, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                  <motion.div
                    key="ripple-2"
                    className="absolute inset-0 rounded-full"
                    style={{ border: '3px solid', borderColor: isWorking ? '#081A33' : '#5BA5A5' }}
                    initial={{ scale: 0.9, opacity: 0.4 }}
                    animate={{ scale: 1.6, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                  />
                </>
              )}
            </AnimatePresence>

            {/* Main Detection Circle */}
            <motion.div
              className="absolute inset-8 rounded-full shadow-2xl flex items-center justify-center"
              style={{
                background: isWorking
                  ? 'linear-gradient(135deg, #5BA5A5 0%, #6DB5B5 100%)'
                  : 'linear-gradient(135deg, #081A33 0%, #0F2D52 100%)',
              }}
              animate={{
                boxShadow: isWorking
                  ? '0 20px 60px rgba(91, 165, 165, 0.4)'
                  : '0 20px 60px rgba(8, 26, 51, 0.3)',
                scale: isAnimating ? 0.92 : 1,
              }}
              transition={{
                boxShadow: { duration: 0.5 },
                scale: { duration: 0.3, ease: "easeOut" },
              }}
            >
              {/* Loading spinner overlay */}
              {isLoading && (
                <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                  <div className="animate-spin w-10 h-10 border-3 border-t-transparent rounded-full" style={{ borderColor: 'rgba(255,255,255,0.6)', borderTopColor: 'transparent' }} />
                </div>
              )}

              <motion.div
                className="flex flex-col items-center px-8"
                animate={{ scale: isAnimating ? [1, 1.15, 1] : [1, 1.08, 1] }}
                transition={{
                  duration: isAnimating ? 0.6 : 2.5,
                  repeat: isAnimating ? 0 : Infinity,
                  ease: "easeInOut",
                }}
              >
                <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8.32a7.43 7.43 0 0 1 0 7.36"/>
                  <path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58"/>
                  <path d="M12.91 4.1a15.91 15.91 0 0 1 0 15.8"/>
                  <path d="M16.37 2a20.16 20.16 0 0 1 0 20"/>
                </svg>
                <div className="text-white mt-5 text-center" style={{ fontSize: '13px', fontWeight: 500, opacity: 0.75 }}>
                  {isLoading ? 'Processing...' : tagsLoading ? 'Loading...' : 'Tap to NFC'}
                </div>
              </motion.div>

              {/* Shimmer Effect */}
              {!isLoading && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/15 to-transparent"
                  initial={{ x: '-100%' }}
                  animate={{ x: '200%' }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
                />
              )}
            </motion.div>
          </div>

          {/* Status Information */}
          <motion.div
            className="text-center mt-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {isWorking && workStartTime && (
              <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                Since {workStartTime}
              </div>
            )}
          </motion.div>
        </div>

        {/* Debug Panel */}
        <div className="w-full max-w-sm mt-8">
          <button
            onClick={() => setDebugOpen(!debugOpen)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all"
            style={{ backgroundColor: 'rgba(8, 26, 51, 0.04)' }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Debug Panel
            </span>
            {debugOpen ? (
              <ChevronUp size={16} style={{ color: '#9CA3AF' }} />
            ) : (
              <ChevronDown size={16} style={{ color: '#9CA3AF' }} />
            )}
          </button>

          <AnimatePresence>
            {debugOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-2xl p-5 mt-2 space-y-4" style={{ boxShadow: '0 1px 3px rgba(8, 26, 51, 0.04)' }}>
                  {/* Fetch Tags */}
                  <div>
                    <button
                      onClick={fetchWorkTags}
                      className="w-full py-2.5 rounded-xl text-white transition-all active:scale-[0.98]"
                      style={{ backgroundColor: '#5BA5A5', fontSize: '13px', fontWeight: 600 }}
                    >
                      Fetch Active Work Tags
                    </button>
                  </div>

                  {/* Tag Selection */}
                  {availableTags.length > 0 && (
                    <div>
                      <label style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Select Tag
                      </label>
                      <div className="mt-2 space-y-2">
                        {availableTags.map((tag) => (
                          <button
                            key={tag.work_tag_id}
                            onClick={() => setSelectedTagId(tag.work_tag_public_id)}
                            className="w-full text-left px-3 py-2.5 rounded-xl transition-all"
                            style={{
                              backgroundColor: selectedTagId === tag.work_tag_public_id
                                ? 'rgba(91, 165, 165, 0.08)'
                                : '#F8F9FA',
                              border: selectedTagId === tag.work_tag_public_id
                                ? '1.5px solid #5BA5A5'
                                : '1.5px solid transparent',
                            }}
                          >
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#081A33' }}>
                              {tag.work_tag_label}
                            </div>
                            <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px' }}>
                              {tag.intended_action} · {tag.work_tag_public_id.slice(0, 8)}...
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Selected Tag ID */}
                  <div>
                    <label style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Current Tag Public ID
                    </label>
                    <div
                      className="mt-1 px-3 py-2 rounded-xl overflow-x-auto"
                      style={{ backgroundColor: '#F8F9FA', fontSize: '11px', color: '#081A33', fontFamily: 'monospace', wordBreak: 'break-all' }}
                    >
                      {selectedTagId || '(not set — fetch tags first)'}
                    </div>
                  </div>

                  {/* Last Response */}
                  {lastResponse && (
                    <div>
                      <label style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Last API Response
                      </label>
                      <pre
                        className="mt-1 px-3 py-2 rounded-xl overflow-x-auto"
                        style={{ backgroundColor: '#F8F9FA', fontSize: '10px', color: '#081A33', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '150px', overflowY: 'auto' }}
                      >
                        {lastResponse}
                      </pre>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}