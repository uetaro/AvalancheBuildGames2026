import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Loader2, CheckCircle, Clock, XCircle, AlertCircle, Copy, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { motion } from 'motion/react';
import { supabase, serverUrl, authHeaders } from '../../lib/supabase';
import pointIcon from 'figma:asset/5560785a34694df91ca800dfb17c52f6abbe5399.png';
import kudosIcon from 'figma:asset/d13c169a55630b616ca2bbf29b05b5269d82cbb9.png';

const CATEGORY_CONFIG: Record<string, { color: string; gradient: string }> = {
  'Service': { color: '#FF6B6B', gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 50%, #FFB4B4 100%)' },
  'Service Excellence': { color: '#FF6B6B', gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 50%, #FFB4B4 100%)' },
  'Hospitality': { color: '#FF6B6B', gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 50%, #FFB4B4 100%)' },
  'Teamwork': { color: '#5BA5A5', gradient: 'linear-gradient(135deg, #5BA5A5 0%, #7BBFBF 50%, #A8D8D8 100%)' },
  'Leadership': { color: '#C9A227', gradient: 'linear-gradient(135deg, #C9A227 0%, #D4B84A 50%, #E6D48A 100%)' },
  'Innovation': { color: '#D4A574', gradient: 'linear-gradient(135deg, #D4A574 0%, #E0BB92 50%, #EDDCC4 100%)' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  confirmed: { label: 'Confirmed', color: '#5BA5A5', icon: CheckCircle },
  pending: { label: 'Pending', color: '#C9A227', icon: Clock },
  rejected: { label: 'Rejected', color: '#FF6B6B', icon: XCircle },
};

interface KudosDetailData {
  kudos_id: string;
  kudos_status: string;
  category: string;
  message_text: string;
  points_awarded: number;
  created_at: string;
  confirmed_at: string | null;
  stay_id: string | null;
  company_name: string | null;
  proof: {
    receipt_status: string;
    tx_hash: string | null;
    anchor_hash: string | null;
    created_at: string;
  } | null;
}

function getCategoryConfig(category: string) {
  for (const [key, cfg] of Object.entries(CATEGORY_CONFIG)) {
    if (category.toLowerCase().includes(key.toLowerCase())) return cfg;
  }
  return { color: '#9CA3AF', gradient: 'linear-gradient(135deg, #9CA3AF 0%, #C0C0C0 50%, #E0E0E0 100%)' };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function truncateHash(hash: string, chars = 8) {
  if (hash.length <= chars * 2 + 3) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

export default function KudosDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [kudos, setKudos] = useState<KudosDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/'); return; }
      const res = await fetch(`${serverUrl}/my-kudos/${id}`, {
        headers: authHeaders(session.access_token),
      });
      const data = await res.json();
      console.log('Kudos detail response:', res.status, data);
      if (!res.ok) { setError(data.message || 'Failed to load kudos'); return; }
      setKudos(data);
    } catch (err) {
      console.log('Kudos detail fetch error:', err);
      setError(`Network error: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin" style={{ color: '#FF6B6B' }} />
        </motion.div>
      </div>
    );
  }

  // Error
  if (error || !kudos) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="px-6 pt-14 pb-6">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl active:scale-95">
            <ArrowLeft size={22} style={{ color: '#081A33' }} />
          </button>
        </div>
        <div className="px-6 py-16 flex flex-col items-center gap-4">
          <AlertCircle size={32} style={{ color: '#FF6B6B' }} />
          <p style={{ fontSize: '14px', color: '#9CA3AF', textAlign: 'center' }}>
            {error || 'This kudos could not be found'}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-2 px-6 py-2.5 rounded-xl text-white active:scale-95"
            style={{ backgroundColor: '#081A33', fontSize: '13px', fontWeight: 600 }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const catCfg = getCategoryConfig(kudos.category);
  const statusCfg = STATUS_CONFIG[kudos.kudos_status] || STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;
  const proofStatus = kudos.proof?.receipt_status;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>

      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden" style={{ minHeight: '240px' }}>
        <div className="absolute inset-0" style={{ background: catCfg.gradient }} />
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)',
          }}
        />

        {/* Nav */}
        <div className="relative z-10 px-5 pt-14 pb-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-2xl transition-all active:scale-95"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}
          >
            <ArrowLeft size={20} style={{ color: '#fff' }} />
          </button>
          <div
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}
          >
            <StatusIcon size={13} style={{ color: '#fff' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>{statusCfg.label}</span>
          </div>
        </div>

        {/* Center */}
        <div className="relative z-10 flex flex-col items-center pt-1 pb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="w-14 h-14 flex items-center justify-center mb-3"
            style={{ }}
          >
            <img src={kudosIcon} alt="" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-center">
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>
              {kudos.category}
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '4px', fontWeight: 500 }}>
              {formatDate(kudos.created_at)} at {formatTime(kudos.created_at)}
            </p>
          </motion.div>
        </div>

        {/* Bottom curve */}
        <div className="absolute bottom-0 left-0 right-0" style={{ height: '24px' }}>
          <svg viewBox="0 0 400 24" fill="none" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
            <path d="M0 0 C150 24, 250 24, 400 0 L400 24 L0 24 Z" fill="#F8F9FA" />
          </svg>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-5 -mt-1 pb-32">

        {/* Points Banner — no card, just a clean inline display */}
        {kudos.points_awarded > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="flex items-center justify-center gap-2.5 py-3 mb-5"
          >
            <img src={pointIcon} alt="Points" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#C9A227', letterSpacing: '-0.5px' }}>
              +{kudos.points_awarded}
            </span>
            <span style={{ fontSize: '13px', color: '#C9A227', fontWeight: 500, opacity: 0.5 }}>pt earned</span>
          </motion.div>
        )}

        {/* Message — the main content, elevated card with accent */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="bg-white rounded-2xl overflow-hidden mb-5"
          style={{ boxShadow: '0 8px 32px rgba(8, 26, 51, 0.06)' }}
        >
          <div style={{ height: '3px', background: catCfg.gradient }} />
          <div className="p-6">
            <p style={{
              fontSize: '16px',
              color: '#081A33',
              lineHeight: '1.8',
              fontWeight: 400,
            }}>
              {kudos.message_text || '(No message provided)'}
            </p>
          </div>
        </motion.div>

        {/* Meta info — lightweight, no card background */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="mb-6 px-1"
        >
          <div className="flex items-center gap-6">
            <div>
              <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '3px' }}>
                Received
              </div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#081A33' }}>
                {formatDate(kudos.created_at)}
              </div>
            </div>
            {kudos.confirmed_at && (
              <div>
                <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '3px' }}>
                  Confirmed
                </div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#5BA5A5' }}>
                  {formatDate(kudos.confirmed_at)}
                </div>
              </div>
            )}
            {kudos.company_name && (
              <div>
                <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '3px' }}>
                  From
                </div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#081A33' }}>
                  {kudos.company_name}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Divider */}
        <div className="mx-1 mb-5" style={{ height: '1px', backgroundColor: 'rgba(8, 26, 51, 0.06)' }} />

        {/* Blockchain Proof — card only for this structured data section */}
        {kudos.proof ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-5"
            style={{ boxShadow: '0 1px 3px rgba(8, 26, 51, 0.04)' }}
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-4">
              {proofStatus === 'confirmed' ? (
                <ShieldCheck size={18} style={{ color: '#5BA5A5' }} />
              ) : proofStatus === 'failed' ? (
                <ShieldAlert size={18} style={{ color: '#FF6B6B' }} />
              ) : (
                <Shield size={18} style={{ color: '#C9A227' }} />
              )}
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#081A33' }}>
                  {proofStatus === 'confirmed' ? 'Verified on Chain' :
                   proofStatus === 'failed' ? 'Verification Failed' :
                   'Verification Pending'}
                </h3>
              </div>
              <div className="ml-auto">
                <span
                  className="px-2.5 py-1 rounded-lg inline-flex items-center gap-1"
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: proofStatus === 'confirmed' ? '#5BA5A5' : proofStatus === 'failed' ? '#FF6B6B' : '#C9A227',
                    backgroundColor: proofStatus === 'confirmed' ? 'rgba(91, 165, 165, 0.08)' : proofStatus === 'failed' ? 'rgba(255, 107, 107, 0.08)' : 'rgba(201, 162, 39, 0.08)',
                    textTransform: 'capitalize',
                  }}
                >
                  {proofStatus === 'confirmed' && <CheckCircle size={10} />}
                  {proofStatus === 'failed' && <XCircle size={10} />}
                  {proofStatus === 'pending' && <Clock size={10} />}
                  {proofStatus}
                </span>
              </div>
            </div>

            {/* Hashes — minimal row style */}
            <div className="space-y-2.5">
              {kudos.proof.tx_hash && (
                <div
                  className="flex items-center gap-2 rounded-xl px-3.5 py-3"
                  style={{ backgroundColor: '#FAFBFC' }}
                >
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: '2px' }}>
                      Tx Hash
                    </div>
                    <code className="font-mono block truncate" style={{ fontSize: '12px', color: '#081A33' }}>
                      {truncateHash(kudos.proof.tx_hash)}
                    </code>
                  </div>
                  <button
                    onClick={() => copyToClipboard(kudos.proof!.tx_hash!, 'tx')}
                    className="p-1.5 rounded-lg active:scale-95 flex-shrink-0"
                  >
                    {copiedField === 'tx' ? (
                      <CheckCircle size={14} style={{ color: '#5BA5A5' }} />
                    ) : (
                      <Copy size={14} style={{ color: '#C0C4CC' }} />
                    )}
                  </button>
                </div>
              )}

              {kudos.proof.anchor_hash && (
                <div
                  className="flex items-center gap-2 rounded-xl px-3.5 py-3"
                  style={{ backgroundColor: '#FAFBFC' }}
                >
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: '2px' }}>
                      Anchor Hash
                    </div>
                    <code className="font-mono block truncate" style={{ fontSize: '12px', color: '#081A33' }}>
                      {truncateHash(kudos.proof.anchor_hash)}
                    </code>
                  </div>
                  <button
                    onClick={() => copyToClipboard(kudos.proof!.anchor_hash!, 'anchor')}
                    className="p-1.5 rounded-lg active:scale-95 flex-shrink-0"
                  >
                    {copiedField === 'anchor' ? (
                      <CheckCircle size={14} style={{ color: '#5BA5A5' }} />
                    ) : (
                      <Copy size={14} style={{ color: '#C0C4CC' }} />
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-3 px-1"
          >
            <Shield size={16} style={{ color: '#C0C4CC' }} />
            <div>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#9CA3AF' }}>
                Blockchain receipt pending
              </p>
              <p style={{ fontSize: '11px', color: '#C0C4CC', marginTop: '1px' }}>
                This kudos will be anchored to the chain soon
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}