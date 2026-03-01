import { useNavigate } from "react-router";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3 }
};

export function LoginPage() {
  const navigate = useNavigate();

  return (
    <motion.div 
      className="min-h-screen bg-primary flex flex-col relative overflow-hidden"
      {...pageTransition}
    >
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />
      
      {/* Ambient Gradient Orbs - More Subtle */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/3 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
        {/* Logo & Brand */}
        <motion.div 
          className="text-center mb-20"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="mb-8">
            <div className="text-accent text-4xl font-light tracking-wider mx-auto mb-8 text-center">
              Heartel
            </div>
            <h1 className="text-5xl text-white mb-4 tracking-tight font-light">
              Grand Hotel
            </h1>
            <div className="w-12 h-[1px] bg-accent/60 mx-auto mb-6" />
            <p className="text-white/60 text-sm tracking-[0.2em] uppercase">
              Kudos System
            </p>
          </div>
        </motion.div>

        {/* Action Cards */}
        <motion.div 
          className="w-full space-y-4 mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        >
          {/* Guest Access - Primary */}
          <motion.button
            onClick={() => navigate("/entry?c=a73427d9-731e-46ee-9ccb-4c5fe76c099d&co=324d2d08-f659-4d83-b942-f0cb4077e0ee")}
            className="w-full bg-white text-primary py-7 px-8 rounded-none shadow-2xl hover:shadow-accent/10 transition-all group relative overflow-hidden"
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/5 to-accent/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <div className="relative flex items-center justify-between">
              <div className="text-left">
                <span className="block text-lg font-light mb-1">Continue as Guest</span>
                <span className="block text-xs text-muted-foreground font-light">
                  Send Kudos instantly • No registration required
                </span>
              </div>
              <ArrowRight className="w-5 h-5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
          </motion.button>

          {/* Login - Secondary */}
          <motion.button
            onClick={() => navigate("/login")}
            className="w-full bg-white/5 backdrop-blur-md text-white py-6 px-8 rounded-none border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <span className="block text-base font-light mb-1">Login</span>
                <span className="block text-xs text-white/50 font-light">
                  Access your profile & history
                </span>
              </div>
              <ArrowRight className="w-4 h-4 opacity-40 group-hover:opacity-60 group-hover:translate-x-1 transition-all" />
            </div>
          </motion.button>
          
          {/* Sign Up - Tertiary */}
          <motion.button
            onClick={() => navigate("/account/create")}
            className="w-full bg-white/5 backdrop-blur-md text-white py-5 px-8 rounded-none border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <span className="block text-sm font-light mb-1">Sign Up</span>
                <span className="block text-xs text-white/50 font-light">
                  Create new account
                </span>
              </div>
              <ArrowRight className="w-4 h-4 opacity-40 group-hover:opacity-60 group-hover:translate-x-1 transition-all" />
            </div>
          </motion.button>
        </motion.div>

        {/* Features - Minimal */}
        <motion.div 
          className="w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          {/* Removed stats section */}
        </motion.div>

        {/* Footer */}
        <motion.div 
          className="absolute bottom-8 left-0 right-0 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <p className="text-white/30 text-xs font-light tracking-wider">
            Your voice shapes their future
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}