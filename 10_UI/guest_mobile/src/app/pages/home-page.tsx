import { useNavigate } from "react-router";
import { ChevronRight, User, Calendar, ArrowRight, Bed, CreditCard } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import kudosIcon from "figma:asset/f4bf621b3ae64967e30c73582c7e028cfa4590e9.png";
import kudosBadgeImg from "figma:asset/d13c169a55630b616ca2bbf29b05b5269d82cbb9.png";

const pageTransition = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.3, ease: "easeInOut" }
};

interface StayData {
  stay_id: string;
  company_id: string;
  company_name: string;
  checkin_at: string;
  room_code: string;
  room_label: string | null;
  card_uid: string;
  post_checkout_deadline: string | null;
}

export function HomePage() {
  const navigate = useNavigate();
  const [stayData, setStayData] = useState<StayData | null>(null);
  const [remainingQuota, setRemainingQuota] = useState(3);

  useEffect(() => {
    // Load stay data from localStorage
    const storedStayData = localStorage.getItem("stay_data");
    const storedQuota = localStorage.getItem("remaining_quota");
    
    if (storedStayData) {
      const parsed = JSON.parse(storedStayData);
      console.log("Stay data from API:", JSON.stringify(parsed, null, 2));
      setStayData(parsed);
    }
    
    if (storedQuota) {
      setRemainingQuota(parseInt(storedQuota, 10));
    }
  }, []);

  // Format check-in date
  const formatCheckinDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  };

  // Format check-in time
  const formatCheckinTime = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Format card UID for display
  const formatCardUid = (uid: string) => {
    if (!uid) return "";
    // Strip any non-alphanumeric characters, then format as groups of 4
    const clean = uid.replace(/[^a-zA-Z0-9]/g, "");
    return clean.match(/.{1,4}/g)?.join("-") ?? clean;
  };

  return (
    <motion.div 
      className="min-h-screen bg-background flex flex-col"
      {...pageTransition}
    >
      {/* Header - Simplified */}
      <header className="relative bg-primary text-primary-foreground">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
        
        <div className="relative max-w-md mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl tracking-tight font-light mb-1">
                {stayData?.company_name || "Grand Hotel"}
              </h1>
              
            </div>
            <motion.button
              onClick={() => navigate("/my-page")}
              className="bg-white/10 backdrop-blur-sm p-3 rounded-none hover:bg-white/20 transition-all border border-white/20"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <User className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Welcome Section - In Header */}
          <div className="space-y-4">
            <div>
              <p className="text-xs text-white/50 font-light tracking-wider uppercase mb-2">Welcome</p>
              <h2 className="text-2xl text-white font-light">Guest</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6">
              {/* Room Info Card */}
              {stayData && (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-none">
                  
                  <p className="text-xs text-white/50 font-light mb-1">Room</p>
                  <p className="text-lg text-white font-light">Room {stayData.room_code}</p>
                  {stayData.room_label && (
                    <p className="text-xs text-white/50 font-light mt-1">{stayData.room_label}</p>
                  )}
                </div>
              )}
              
              {/* Kudos Available Card */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-5 rounded-none relative overflow-hidden">
                <img
                  src={kudosBadgeImg}
                  alt=""
                  className="absolute -right-2 -bottom-2 w-20 opacity-30 object-contain pointer-events-none"
                  style={{ aspectRatio: '528/590' }}
                />
                <div className="relative">
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-4xl text-white font-light leading-none">{remainingQuota}</span>
                    <span className="text-sm text-white/40 font-light">/ {3}</span>
                  </div>
                  <p className="text-xs text-white/60 font-light tracking-wide">Kudos Available</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-md mx-auto w-full">
        {/* Card Info Section (from design) */}
        {stayData && (
          <div className="bg-white border border-border rounded-none p-5 shadow-sm mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary rounded-none flex items-center justify-center">
                <Bed className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg text-foreground font-light">Room {stayData.room_code}</h3>
                {stayData.room_label && (
                  <p className="text-sm text-muted-foreground font-light">{stayData.room_label}</p>
                )}
              </div>
            </div>
            
            {/* Card UID Display */}
            <div className="bg-primary/95 text-primary-foreground p-4 rounded-none mb-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-accent" />
                <span className="text-xs font-light text-white/70">Checked-in Card</span>
              </div>
              <div className="text-xl font-light tracking-wider">
                {formatCardUid(stayData.card_uid)}
              </div>
            </div>

            {/* Check-in Info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-3 border-t border-border">
              <Calendar className="w-4 h-4" />
              <span className="font-light">Check-in:</span>
              <span className="font-light">
                {stayData.checkin_at && `${new Date(stayData.checkin_at).getFullYear()}/${formatCheckinDate(stayData.checkin_at)} ${formatCheckinTime(stayData.checkin_at)}`}
              </span>
            </div>
          </div>
        )}

        {/* Primary Action */}
        <motion.button
          onClick={() => navigate("/staff")}
          className="w-full bg-accent text-accent-foreground py-8 px-8 mb-8 rounded-none shadow-lg hover:shadow-xl transition-all group relative overflow-hidden"
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          <div className="relative flex items-center justify-between">
            <div className="text-left">
              <span className="block text-xl font-light mb-1">Send Kudos</span>
              <span className="block text-xs opacity-80 font-light">
                Select staff member
              </span>
            </div>
            <ArrowRight className="w-6 h-6 opacity-80 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
          </div>
        </motion.button>

        {/* Secondary Actions */}
        <div className="space-y-3 mb-12">
          <motion.button
            onClick={() => navigate("/my-page/kudos")}
            className="w-full bg-white border border-border rounded-none py-5 px-6 hover:border-accent/30 hover:bg-accent/5 transition-all flex items-center justify-between group"
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.99 }}
          >
            <span className="text-sm font-light text-foreground">Sent Kudos</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </motion.button>
        </div>

        {/* Login Prompt - Refined */}
        <div className="bg-secondary/30 border border-secondary/50 rounded-none p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base text-foreground font-light mb-2">
                Have an Account?
              </h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed mb-4">
                Login to access your profile
              </p>
              <motion.button
                onClick={() => navigate("/account/create")}
                className="text-sm text-accent font-light inline-flex items-center gap-2 hover:gap-3 transition-all"
                whileHover={{ x: 2 }}
              >
                Login or Sign Up
                <ArrowRight className="w-3 h-3" />
              </motion.button>
            </div>
          </div>
        </div>
      </main>
    </motion.div>
  );
}