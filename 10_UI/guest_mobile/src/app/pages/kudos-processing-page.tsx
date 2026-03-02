import { useNavigate, useLocation } from "react-router";
import { motion } from "motion/react";
import { CheckCircle, Sparkles, Shield, FileCheck } from "lucide-react";
import { useEffect, useState } from "react";
import kudosIcon from "figma:asset/f4bf621b3ae64967e30c73582c7e028cfa4590e9.png";

export function KudosProcessingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [stage, setStage] = useState(0);

  // Pass-through state from kudos-post-page
  const kudosResult = location.state as {
    kudos_id?: string;
    kudos_status?: string;
    remaining_quota?: number;
    cooldown_sec?: number;
    next_available_at?: string | null;
    staff_display_name?: string;
    category?: string;
  } | null;

  useEffect(() => {
    // Stage 1: AI Checking (0-1.5s)
    const timer1 = setTimeout(() => {
      setStage(1);
    }, 1500);

    // Stage 2: Content Verification (1.5-2.5s)
    const timer2 = setTimeout(() => {
      setStage(2);
    }, 2500);

    // Stage 3: Finalizing (2.5-3.2s)
    const timer3 = setTimeout(() => {
      setStage(3);
    }, 3200);

    // Navigate to complete page (3.8s)
    const timer4 = setTimeout(() => {
      navigate("/kudos/complete", {
        replace: true,
        state: kudosResult,
      });
    }, 3800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [navigate, kudosResult]);

  const stages = [
    {
      icon: Sparkles,
      title: "Analyzing Message",
      description: "AI is reviewing your message",
    },
    {
      icon: Shield,
      title: "Content Verification",
      description: "Checking for appropriateness",
    },
    {
      icon: FileCheck,
      title: "Finalizing",
      description: "Preparing to send",
    },
    {
      icon: CheckCircle,
      title: "Complete",
      description: "Ready to deliver",
    },
  ];

  const currentStage = stages[stage];
  const IconComponent = currentStage.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-[#0a2240] to-[#081A33] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient Background Elements */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />
      
      <motion.div 
        className="absolute top-20 right-10 w-32 h-32 bg-accent/10 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <motion.div 
        className="absolute bottom-32 left-10 w-40 h-40 bg-[#FF6B6B]/10 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      />

      <div className="max-w-md w-full relative z-10">
        {/* Main Content */}
        <div className="text-center space-y-8">
          {/* Kudos Icon with Animation */}
          <motion.div
            className="flex justify-center mb-4"
            key={`icon-${stage}`}
          >
            <motion.div
              className="relative"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {/* Animated pulse rings */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "radial-gradient(circle, rgba(201, 162, 39, 0.2) 0%, transparent 70%)",
                  width: "160px",
                  height: "160px",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)"
                }}
                animate={{
                  scale: [1, 1.4, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
              />
              
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "radial-gradient(circle, rgba(255, 107, 107, 0.15) 0%, transparent 70%)",
                  width: "160px",
                  height: "160px",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)"
                }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.4, 0, 0.4],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 0.5
                }}
              />

              {/* Center Kudos Icon Container */}
              <motion.div 
                className="relative w-28 h-28 bg-white/5 backdrop-blur-md rounded-none flex items-center justify-center border border-white/10 shadow-2xl"
                animate={{
                  boxShadow: [
                    "0 0 20px rgba(201, 162, 39, 0.2)",
                    "0 0 40px rgba(201, 162, 39, 0.4)",
                    "0 0 20px rgba(201, 162, 39, 0.2)",
                  ]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <motion.img 
                  src={kudosIcon} 
                  alt="Kudos" 
                  className="w-16 h-16 object-contain"
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </motion.div>

              {/* Stage Icon Badge */}
              <motion.div
                className="absolute -bottom-2 -right-2 w-14 h-14 bg-accent/90 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-primary shadow-xl"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  type: "spring",
                  stiffness: 200,
                  damping: 15
                }}
                key={`badge-${stage}`}
              >
                <motion.div
                  animate={{
                    rotate: stage < 3 ? [0, 360] : 0
                  }}
                  transition={{
                    duration: 2,
                    repeat: stage < 3 ? Infinity : 0,
                    ease: "linear"
                  }}
                >
                  <IconComponent className="w-7 h-7 text-primary" strokeWidth={2} />
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Text Content */}
          <motion.div
            key={`text-${stage}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-2"
          >
            <h2 className="text-2xl text-white font-light tracking-tight">
              {currentStage.title}
            </h2>
            <p className="text-white/60 font-light text-sm">
              {currentStage.description}
            </p>
          </motion.div>

          {/* Progress Bar */}
          <div className="pt-4">
            <div className="flex justify-between mb-2 px-1">
              {stages.slice(0, 3).map((stageItem, index) => {
                const StageIcon = stageItem.icon;
                return (
                  <motion.div
                    key={index}
                    className="flex flex-col items-center gap-1"
                    initial={{ opacity: 0.3 }}
                    animate={{ 
                      opacity: index <= stage ? 1 : 0.3,
                      scale: index === stage ? 1.1 : 1
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      index < stage 
                        ? "bg-accent text-primary" 
                        : index === stage 
                        ? "bg-white/10 text-accent border border-accent/50" 
                        : "bg-white/5 text-white/30"
                    }`}>
                      {index < stage ? (
                        <CheckCircle className="w-4 h-4" strokeWidth={2.5} />
                      ) : (
                        <StageIcon className="w-4 h-4" />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
            
            <div className="relative h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent to-[#d4b030] rounded-full"
                initial={{ width: "0%" }}
                animate={{ 
                  width: `${((stage + 1) / 4) * 100}%`
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Loading dots - only show when processing */}
          {stage < 3 && (
            <motion.div 
              className="flex justify-center gap-1.5 pt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 bg-accent/70 rounded-full"
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.4, 1, 0.4],
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}