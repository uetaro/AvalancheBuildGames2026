import { useNavigate } from "react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

const pageTransition = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.3, ease: "easeInOut" }
};

export function LoginFormPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login - navigate to home
    navigate("/home", { replace: true });
  };

  return (
    <motion.div 
      className="min-h-screen bg-background flex flex-col"
      {...pageTransition}
    >
      {/* Header */}
      <header className="relative bg-primary text-primary-foreground">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
        
        <div className="relative max-w-md mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <motion.button
              onClick={() => navigate("/", { replace: true })}
              className="p-2 -ml-2 hover:bg-white/10 rounded-none transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <div>
              <h1 className="text-xl font-light">Login</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-md mx-auto w-full">
        <form onSubmit={handleLogin} className="space-y-6 pt-8">
          <div>
            <label htmlFor="email" className="block text-sm font-light text-foreground mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-border rounded-none px-4 py-3 focus:outline-none focus:ring-1 focus:ring-accent transition-all font-light"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-light text-foreground mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-border rounded-none px-4 py-3 focus:outline-none focus:ring-1 focus:ring-accent transition-all font-light"
              placeholder="••••••••"
              required
            />
          </div>

          <motion.button
            type="submit"
            className="w-full bg-accent text-accent-foreground py-4 px-8 rounded-none hover:shadow-lg transition-all group"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="font-light">Login</span>
              <ArrowRight className="w-4 h-4 opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
          </motion.button>

          <div className="text-center pt-6">
            <p className="text-sm text-muted-foreground font-light mb-2">
              Don't have an account?
            </p>
            <motion.button
              type="button"
              onClick={() => navigate("/account/create")}
              className="text-sm text-accent font-light inline-flex items-center gap-2 hover:gap-3 transition-all"
              whileHover={{ x: 2 }}
            >
              Create Account
              <ArrowRight className="w-3 h-3" />
            </motion.button>
          </div>
        </form>
      </main>
    </motion.div>
  );
}