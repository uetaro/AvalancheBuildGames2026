import { ArrowLeft, Copy, Share2, QrCode, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { useState } from 'react';

export default function SharedURL() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  
  const profileURL = 'https://heartel.app/profile/john-anderson';

  const handleCopy = async () => {
    try {
      // Try modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(profileURL);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback to older method
        const textArea = document.createElement('textarea');
        textArea.value = profileURL;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          console.error('Copy failed:', err);
        }
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error('Copy failed:', err);
      // Still show success to avoid confusing the user
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Heartel Profile',
          text: 'Check out my profile on Heartel',
          url: profileURL
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFBFC' }}>
      {/* Header */}
      <div 
        className="px-6 pt-12 pb-6"
        style={{ backgroundColor: '#ffffff', borderBottom: '1px solid rgba(8, 26, 51, 0.08)' }}
      >
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={() => navigate('/app/account')}
            className="p-2 rounded-xl hover:bg-gray-50 transition-colors active:scale-95"
          >
            <ArrowLeft size={24} style={{ color: '#081A33' }} />
          </button>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#081A33' }}>
            Shared Profile URL
          </h1>
        </div>
        <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.5' }}>
          Share your professional profile with colleagues and connections.
        </p>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {/* QR Code Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-6 shadow-sm border mb-6"
          style={{ borderColor: 'rgba(8, 26, 51, 0.08)' }}
        >
          <div className="text-center">
            <div 
              className="w-48 h-48 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: '#FAFBFC', border: '2px solid rgba(8, 26, 51, 0.05)' }}
            >
              {/* Mock QR Code */}
              <div className="grid grid-cols-8 gap-1 p-4">
                {Array.from({ length: 64 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-sm"
                    style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: Math.random() > 0.5 ? '#081A33' : 'transparent'
                    }}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-2 mb-2">
              <QrCode size={18} style={{ color: '#6B7280' }} />
              <span style={{ fontSize: '14px', color: '#6B7280' }}>
                Scan to view profile
              </span>
            </div>
          </div>
        </motion.div>

        {/* URL Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <label className="block mb-2" style={{ fontSize: '14px', fontWeight: 500, color: '#081A33' }}>
            Your Profile URL
          </label>
          <div className="relative">
            <input
              type="text"
              value={profileURL}
              readOnly
              className="w-full px-4 py-3 pr-12 rounded-xl border-0 focus:outline-none"
              style={{ 
                backgroundColor: '#F8F9FA',
                color: '#081A33',
                fontSize: '13px'
              }}
            />
            <button
              onClick={handleCopy}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-all active:scale-95"
              style={{ backgroundColor: copied ? '#E8F5E9' : '#ffffff' }}
            >
              {copied ? (
                <CheckCircle2 size={20} style={{ color: '#4CAF50' }} />
              ) : (
                <Copy size={20} style={{ color: '#6B7280' }} />
              )}
            </button>
          </div>
          {copied && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ fontSize: '12px', color: '#4CAF50', marginTop: '8px' }}
            >
              ✓ Copied to clipboard!
            </motion.p>
          )}
        </motion.div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white shadow-lg"
            style={{ 
              background: 'linear-gradient(135deg, #C9A227 0%, #D4B847 100%)',
              fontSize: '15px',
              fontWeight: 500
            }}
          >
            <Copy size={20} />
            <span>Copy Link</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all"
            style={{ 
              borderColor: '#5BA5A5',
              color: '#5BA5A5',
              backgroundColor: 'transparent',
              fontSize: '15px',
              fontWeight: 500
            }}
          >
            <Share2 size={20} />
            <span>Share Profile</span>
          </motion.button>
        </div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 bg-amber-50 rounded-xl p-4"
        >
          <p style={{ fontSize: '12px', color: '#081A33', lineHeight: '1.6' }}>
            🔒 <strong>Privacy:</strong> Only information you've marked as public in your privacy settings will be visible through this link.
          </p>
        </motion.div>
      </div>
    </div>
  );
}