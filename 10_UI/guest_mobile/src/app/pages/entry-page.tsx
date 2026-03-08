import { useNavigate, useSearchParams } from "react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { AlertCircle } from "lucide-react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import kudosBadgeImg from "figma:asset/kudos.png";

type ErrorState = {
  code: string;
  message: string;
  canRetry: boolean;
};

export function EntryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);

  useEffect(() => {
    verifyCard();
  }, []);

  const verifyCard = async () => {
    setIsVerifying(true);
    setError(null);

    const cardPublicId = searchParams.get("c");
    const companyPublicId = searchParams.get("co");

    if (!cardPublicId) {
      setError({
        code: "VALIDATION_ERROR",
        message: "Invalid card. Please tap your card again.",
        canRetry: true
      });
      setIsVerifying(false);
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/api/make-server-14a1e5b0/public-entry-verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            card_public_id: cardPublicId,
            company_public_id: companyPublicId,
            client_request_id: `entry-${Date.now()}`
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Handle error response
        const errorMap: Record<string, { message: string; canRetry: boolean }> = {
          CARD_NOT_FOUND: {
            message: "Card not found. Please contact the front desk.",
            canRetry: false
          },
          CARD_REVOKED: {
            message: "This card has been deactivated. Please contact the front desk.",
            canRetry: false
          },
          CARD_NOT_ACTIVE: {
            message: "Card is not active. Please contact the front desk.",
            canRetry: false
          },
          CARD_NOT_BOUND: {
            message: "Card is not assigned to a room. Please contact the front desk.",
            canRetry: false
          },
          NO_ACTIVE_STAY: {
            message: "No active stay found. Please check in at the front desk.",
            canRetry: false
          },
          COMPANY_SUSPENDED: {
            message: "Service temporarily unavailable. Please contact the front desk.",
            canRetry: false
          },
          COMPANY_MISMATCH: {
            message: "Card mismatch. Please contact the front desk.",
            canRetry: false
          },
          VALIDATION_ERROR: {
            message: "Invalid request. Please tap your card again.",
            canRetry: true
          }
        };

        const errorInfo = errorMap[data.error_code] || {
          message: data.message || "An error occurred. Please try again.",
          canRetry: true
        };

        setError({
          code: data.error_code,
          ...errorInfo
        });
        setIsVerifying(false);
        return;
      }

      // Success - store session and navigate to home
      localStorage.setItem("guest_session_token", data.guest_session_token);
      localStorage.setItem("guest_session_expires", data.expires_at);
      localStorage.setItem("stay_data", JSON.stringify(data.stay));
      localStorage.setItem("rules_snapshot", JSON.stringify(data.rules_snapshot));
      localStorage.setItem("remaining_quota", data.remaining_quota.toString());

      // Ensure minimum visual time for smooth UX
      await new Promise((r) => setTimeout(r, 600));

      // Navigate to home page
      navigate("/home", { replace: true });

    } catch (err) {
      console.error("Network error during verification:", err);
      setError({
        code: "NETWORK_ERROR",
        message: "Network error. Please check your connection and try again.",
        canRetry: true
      });
      setIsVerifying(false);
    }
  };

  const handleRetry = () => {
    verifyCard();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-[#0a2240] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="max-w-md w-full relative z-10">
        {isVerifying ? (
          <div className="text-center">
            {/* Badge with subtle breathing */}
            <motion.img
              src={kudosBadgeImg}
              alt=""
              className="w-16 mx-auto mb-8 object-contain"
              style={{ aspectRatio: '528/590' }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <p className="text-sm text-white/50 font-light tracking-wide">
              Verifying your card…
            </p>
          </div>
        ) : error ? (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/10 backdrop-blur-sm rounded-none mb-6">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>

            <h2 className="text-2xl text-white font-light mb-3">
              Unable to Verify Card
            </h2>
            <p className="text-white/80 text-sm font-light leading-relaxed mb-8">
              {error.message}
            </p>

            <div className="space-y-3">
              {error.canRetry && (
                <button
                  onClick={handleRetry}
                  className="w-full bg-accent text-accent-foreground py-4 px-6 rounded-none hover:shadow-lg transition-all font-light"
                >
                  Try Again
                </button>
              )}
              <button
                onClick={() => navigate("/")}
                className="w-full bg-white/10 backdrop-blur-sm text-white py-4 px-6 rounded-none border border-white/20 hover:bg-white/20 transition-all font-light"
              >
                Back to Start
              </button>
            </div>

            {!error.canRetry && (
              <div className="mt-6 text-xs text-white/50 font-light">
                Error Code: {error.code}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}