import { useNavigate, useLocation } from "react-router";
import { CheckCircle, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import kudosIcon from "figma:asset/f4bf621b3ae64967e30c73582c7e028cfa4590e9.png";

const pageTransition = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.3, ease: "easeInOut" }
};

export function KudosCompletePage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Read Kudos result from navigation state
  const kudosResult = location.state as {
    kudos_id?: string;
    kudos_status?: string;
    remaining_quota?: number;
    cooldown_sec?: number;
    next_available_at?: string | null;
    staff_display_name?: string;
    category?: string;
  } | null;

  const remainingQuota = kudosResult?.remaining_quota ?? null;
  const staffName = kudosResult?.staff_display_name ?? null;
  const kudosStatus = kudosResult?.kudos_status ?? "pending";

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/5 flex items-center justify-center p-6"
      {...pageTransition}
    >
      <div className="w-full max-w-md">
        {/* Success Icon with Kudos Badge */}
        <motion.div 
          className="flex justify-center mb-6"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: 0.1
          }}
        >
          <div className="relative">
            {/* Kudos Icon */}
            <div className="w-24 h-24 rounded-none bg-gradient-to-br from-[#FF6B6B] to-[#ff8585] p-1">
              <div className="w-full h-full rounded-none bg-white flex items-center justify-center">
                <img src={kudosIcon} alt="Kudos" className="w-14 h-14 object-contain" />
              </div>
            </div>
            {/* Check Badge */}
            <div className="absolute -bottom-1 -right-1 w-9 h-9 bg-green-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
              <CheckCircle className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl text-foreground font-light mb-2">
            Kudos Sent Successfully
          </h2>
          <p className="text-sm text-muted-foreground font-light">
            {staffName 
              ? `Your appreciation has been delivered`
              : "Your appreciation has been delivered"}
          </p>
        </motion.div>

        {/* Remaining Kudos Card */}
        {remainingQuota !== null && (
          <motion.div 
            className="bg-white rounded-none border border-border p-6 mb-5 shadow-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-light uppercase tracking-wider mb-1">
                  Kudos Remaining
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl text-accent font-light">{remainingQuota}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Pending Notice */}
        <motion.div
          className="bg-accent/5 border border-accent/20 rounded-none p-4 mb-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            Your Kudos is currently <span className="text-accent font-medium">{kudosStatus}</span> and will be confirmed at checkout.
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div 
          className="space-y-3 mb-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {remainingQuota !== null && remainingQuota > 0 && (
            <button
              onClick={() => navigate("/staff")}
              className="w-full bg-accent text-accent-foreground py-4 px-6 rounded-none hover:shadow-lg transition-all group font-light"
            >
              <div className="flex items-center justify-between">
                <span>Send Another Kudos</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          )}

          <button
            onClick={() => navigate("/home")}
            className="w-full bg-white border border-border text-foreground py-4 px-6 rounded-none hover:border-accent/30 hover:bg-secondary/5 transition-all font-light"
          >
            Return to Home
          </button>
        </motion.div>

        {/* Account Prompt - Compact */}
        <motion.div 
          className="bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20 rounded-none p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm text-foreground font-light mb-1">
                Support Staff Careers
              </h3>
              <p className="text-xs text-muted-foreground font-light leading-relaxed">
                Record your information to help staff build their professional journey
              </p>
            </div>
            <button
              onClick={() => navigate("/account/create")}
              className="flex-shrink-0 bg-accent text-accent-foreground px-4 py-2 rounded-none text-xs font-light hover:shadow-md transition-all flex items-center gap-1.5"
            >
              Create
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
