import { useNavigate, useParams, useLocation } from "react-router";
import { ArrowLeft, Sparkles, Briefcase, HandHeart, Zap, Smile, Star, User, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import kudosIcon from "figma:asset/f4bf621b3ae64967e30c73582c7e028cfa4590e9.png";

interface KudosCategory {
  id: string;
  label: string;
  icon: typeof Sparkles;
}

const categories: KudosCategory[] = [
  { id: "hospitality", label: "Hospitality", icon: Sparkles },
  { id: "professional", label: "Professionalism", icon: Briefcase },
  { id: "helpful", label: "Kindness", icon: HandHeart },
  { id: "quick", label: "Quick Response", icon: Zap },
  { id: "smile", label: "Friendly", icon: Smile },
  { id: "other", label: "Other", icon: Star },
];

// Get initials for avatar placeholder
function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function KudosPostPage() {
  const navigate = useNavigate();
  const { staffId } = useParams<{ staffId: string }>();
  const location = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [message, setMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Read staff data from navigation state, with sessionStorage fallback
  const staffState = location.state as {
    display_name?: string;
    job_title?: string | null;
    profile_image_url?: string | null;
    company_member_id?: string;
  } | null;

  // Persist to sessionStorage when state arrives, read back as fallback
  const storageKey = `kudos_staff_${staffId}`;

  useEffect(() => {
    if (staffState?.display_name) {
      sessionStorage.setItem(storageKey, JSON.stringify(staffState));
    }
  }, [staffState, storageKey]);

  const resolved = staffState?.display_name
    ? staffState
    : (() => {
        try {
          return JSON.parse(sessionStorage.getItem(storageKey) || "null");
        } catch {
          return null;
        }
      })();

  const staffDisplayName = resolved?.display_name ?? "(Unknown)";
  const staffJobTitle = resolved?.job_title ?? null;
  const staffImageUrl = resolved?.profile_image_url ?? null;

  const handleSubmit = () => {
    if (!selectedCategory || !message.trim()) return;
    setSendError(null);
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    if (isSending) return;
    setIsSending(true);
    setSendError(null);

    try {
      const guestSessionToken = localStorage.getItem("guest_session_token");
      if (!guestSessionToken) {
        setSendError("Session expired. Please re-enter.");
        setIsSending(false);
        return;
      }

      const apiUrl = `https://${projectId}.supabase.co/functions/v1/api/make-server-14a1e5b0/public-kudos-send`;

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
          "X-Guest-Session-Token": guestSessionToken,
        },
        body: JSON.stringify({
          receiver_company_member_id: staffId,
          category: selectedCategory,
          message_text: message.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Kudos send error:", data);
        // Map known error codes to user-friendly messages
        const errorMessages: Record<string, string> = {
          QUOTA_EXCEEDED: "You've reached the maximum number of Kudos for this stay.",
          COOLDOWN_ACTIVE: "Please wait a moment before sending another Kudos.",
          POST_CHECKOUT_WINDOW_EXPIRED: "The Kudos submission window has closed.",
          RECEIVER_NOT_FOUND: "This staff member is no longer available.",
          RECEIVER_NOT_ON_DUTY: "This staff member is not currently on duty.",
          UNAUTHORIZED: "Session expired. Please re-enter.",
          GUEST_SESSION_EXPIRED: "Session expired. Please re-enter.",
        };
        const friendlyMsg = errorMessages[data.error_code] ?? data.message ?? "Failed to send Kudos.";
        setSendError(friendlyMsg);
        setIsSending(false);
        return;
      }

      // Navigate to processing page, then complete
      navigate("/kudos/processing", {
        replace: true,
        state: {
          kudos_id: data.kudos_id,
          kudos_status: data.kudos_status,
          remaining_quota: data.remaining_quota,
          cooldown_sec: data.cooldown_sec,
          next_available_at: data.next_available_at,
          staff_display_name: staffDisplayName,
          category: selectedCategory,
        },
      });
    } catch (err: any) {
      console.error("Network error sending Kudos:", err);
      setSendError("Network error. Please try again.");
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/10 flex flex-col">
      {/* Header */}
      <header className="relative bg-gradient-to-br from-primary via-primary to-[#0a2240] text-primary-foreground">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40" />
        
        <motion.div 
          className="relative max-w-md mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center gap-4 px-6 py-5">
            <motion.button
              onClick={() => navigate("/staff")}
              className="p-2 -ml-2 hover:bg-white/10 rounded-none transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <h1 className="text-xl font-light">
              Send Kudos
            </h1>
          </div>
        </motion.div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-md mx-auto w-full pb-32">
        {/* Staff Info Card - Refined */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs text-muted-foreground font-light mb-3 uppercase tracking-wider">To</p>
          <div className="bg-white border border-border rounded-none p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                {staffImageUrl ? (
                  <img
                    src={staffImageUrl}
                    alt={`${staffDisplayName}'s avatar`}
                    className="w-16 h-16 rounded-none bg-primary/10 ring-2 ring-accent/20"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-none bg-primary/10 ring-2 ring-accent/20 flex items-center justify-center">
                    <User className="w-7 h-7 text-primary/40" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base text-foreground font-light mb-1">
                  {staffDisplayName}
                </h2>
                {staffJobTitle && (
                  <p className="text-sm text-muted-foreground font-light">
                    {staffJobTitle}
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Category Selection - Refined */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <label className="block text-xs text-muted-foreground font-light mb-3 uppercase tracking-wider">
            Category <span className="text-[#FF6B6B]">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {categories.map((category, index) => {
              const IconComponent = category.icon;
              const isSelected = selectedCategory === category.id;
              return (
                <motion.button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`p-4 rounded-none border transition-all text-center relative overflow-hidden ${
                    isSelected
                      ? "border-accent bg-accent/5 shadow-sm"
                      : "border-border bg-white hover:border-accent/30 hover:bg-accent/5"
                  }`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <IconComponent className={`w-5 h-5 transition-colors ${
                      isSelected ? "text-accent" : "text-muted-foreground"
                    }`} />
                    <div className={`text-xs font-light transition-colors ${
                      isSelected ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {category.label}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Message Input */}
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <label className="block text-xs text-muted-foreground font-light mb-3 uppercase tracking-wider">
            Message <span className="text-[#FF6B6B]">*</span>
          </label>
          <div className="relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share your gratitude..."
              maxLength={500}
              rows={6}
              className="w-full bg-white border border-border rounded-none p-5 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent resize-none shadow-sm transition-all font-light text-sm"
            />
            <div className="absolute bottom-3 right-3 text-xs text-muted-foreground/60 font-light">
              {message.length} / 500
            </div>
          </div>
        </motion.div>

        {/* Info Box */}
        <motion.div 
          className="bg-secondary/20 rounded-none p-4 text-xs text-muted-foreground font-light border border-secondary/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <p className="leading-relaxed">
            Your Kudos will be recorded as staff evaluation. Your name and message will be shared with the staff member.
          </p>
        </motion.div>
      </main>

      {/* Bottom Action Bar */}
      <motion.div 
        className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-border p-5 shadow-2xl"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="max-w-md mx-auto">
          <motion.button
            onClick={handleSubmit}
            disabled={!selectedCategory || !message.trim()}
            className="w-full bg-gradient-to-r from-[#FF6B6B] to-[#ff8585] text-white py-5 rounded-none shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group relative overflow-hidden"
            whileHover={{ scale: !selectedCategory || !message.trim() ? 1 : 1.02 }}
            whileTap={{ scale: !selectedCategory || !message.trim() ? 1 : 0.98 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <img src={kudosIcon} alt="Kudos" className="w-6 h-auto relative z-10" />
            <span className="text-lg relative z-10">Send Kudos</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirm && (
          <>
            <motion.div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirm(false)}
            />
            <div className="fixed inset-0 flex items-center justify-center p-6 z-50">
              <motion.div 
                className="bg-white rounded-none p-8 max-w-sm w-full shadow-2xl relative overflow-hidden"
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", bounce: 0.3 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#FF6B6B]/20 to-transparent rounded-full blur-3xl" />
                
                <div className="relative text-center mb-8">
                  <motion.div 
                    className="inline-flex items-center justify-center w-24 h-24 mb-5"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                  >
                    <img src={kudosIcon} alt="Kudos" className="w-20 h-auto" />
                  </motion.div>
                  <h3 className="text-xl text-foreground mb-3">
                    Send Kudos?
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Send gratitude to {staffDisplayName}
                  </p>
                </div>

                <div className="relative space-y-3">
                  {sendError && (
                    <div className="bg-destructive/10 border border-destructive/20 p-3 mb-2">
                      <p className="text-xs text-destructive font-light text-center">{sendError}</p>
                    </div>
                  )}
                  <motion.button
                    onClick={handleConfirm}
                    disabled={isSending}
                    className="w-full bg-gradient-to-r from-[#FF6B6B] to-[#ff8585] text-white py-4 rounded-none hover:shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                    whileHover={{ scale: isSending ? 1 : 1.02 }}
                    whileTap={{ scale: isSending ? 1 : 0.98 }}
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      "Send"
                    )}
                  </motion.button>
                  <motion.button
                    onClick={() => { setShowConfirm(false); setSendError(null); }}
                    disabled={isSending}
                    className="w-full bg-muted text-foreground py-4 rounded-none hover:bg-muted/80 transition-all disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}