import { useNavigate } from "react-router";
import { ArrowLeft, User, Settings, ChevronRight, LogOut } from "lucide-react";
import kudosIcon from "figma:asset/f4bf621b3ae64967e30c73582c7e028cfa4590e9.png";

export function MyPage() {
  const navigate = useNavigate();

  const stats = {
    totalKudos: 7,
    currentStay: 2,
    remainingKudos: 1,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="relative bg-primary text-primary-foreground">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
        
        <div className="relative max-w-md mx-auto">
          <div className="flex items-center gap-3 p-6">
            <button
              onClick={() => navigate("/home")}
              className="p-2 -ml-2 hover:bg-white/10 rounded-none transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-light">My Page</h1>
              <p className="text-xs text-white/60 font-light mt-0.5">Grand Hotel</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-md mx-auto w-full">
        {/* Profile Card */}
        <div className="bg-gradient-to-br from-white to-secondary/5 rounded-none p-6 shadow-sm border border-border mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-accent/20 to-accent/10 rounded-none flex items-center justify-center ring-2 ring-accent/10">
              <User className="w-10 h-10 text-accent" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg text-foreground mb-1 font-light">
                Guest
              </h2>
              <p className="text-sm text-muted-foreground font-light">
                Anonymous User
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border">
            <div className="text-center">
              <p className="text-2xl text-accent mb-1 font-light">{stats.totalKudos}</p>
              <p className="text-xs text-muted-foreground font-light">Total Sent</p>
            </div>
            <div className="text-center">
              <p className="text-2xl text-accent mb-1 font-light">{stats.currentStay}</p>
              <p className="text-xs text-muted-foreground font-light">This Stay</p>
            </div>
            <div className="text-center">
              <p className="text-2xl text-accent mb-1 font-light">{stats.remainingKudos}</p>
              <p className="text-xs text-muted-foreground font-light">Remaining</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-3">
          {/* Kudos History */}
          <button
            onClick={() => navigate("/my-page/kudos")}
            className="w-full bg-white rounded-none p-5 shadow-sm border border-border hover:shadow-md hover:border-accent/30 transition-all flex items-center gap-4 group"
          >
            <div className="flex-shrink-0 w-12 h-12 bg-[#FF6B6B]/10 rounded-none flex items-center justify-center p-2">
              <img src={kudosIcon} alt="Kudos" className="w-full h-auto" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-base text-foreground mb-0.5 font-light group-hover:text-accent transition-colors">
                Kudos History
              </h3>
              <p className="text-xs text-muted-foreground font-light">
                View sent Kudos
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
          </button>

          {/* Profile Settings */}
          <button
            onClick={() => navigate("/my-page/profile")}
            className="w-full bg-white rounded-none p-5 shadow-sm border border-border hover:shadow-md hover:border-accent/30 transition-all flex items-center gap-4 group"
          >
            <div className="flex-shrink-0 w-12 h-12 bg-secondary rounded-none flex items-center justify-center">
              <User className="w-6 h-6 text-secondary-foreground" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-base text-foreground mb-0.5 font-light group-hover:text-accent transition-colors">
                Profile Settings
              </h3>
              <p className="text-xs text-muted-foreground font-light">
                Personal info & privacy
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
          </button>

          {/* Settings */}
          <button
            onClick={() => navigate("/my-page/settings")}
            className="w-full bg-white rounded-none p-5 shadow-sm border border-border hover:shadow-md hover:border-accent/30 transition-all flex items-center gap-4 group"
          >
            <div className="flex-shrink-0 w-12 h-12 bg-muted rounded-none flex items-center justify-center">
              <Settings className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-base text-foreground mb-0.5 font-light group-hover:text-accent transition-colors">
                Notification Settings
              </h3>
              <p className="text-xs text-muted-foreground font-light">
                Manage notifications
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
          </button>
        </div>

        {/* Logout */}
        <div className="mt-8 pt-6 border-t border-border">
          <button
            onClick={() => navigate("/")}
            className="w-full text-destructive py-3 rounded-none hover:bg-destructive/5 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-light">Logout</span>
          </button>
        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center space-y-2">
          <a href="#" className="block text-xs text-muted-foreground hover:text-accent font-light">
            Terms of Service
          </a>
          <a href="#" className="block text-xs text-muted-foreground hover:text-accent font-light">
            Privacy Policy
          </a>
          <a href="#" className="block text-xs text-muted-foreground hover:text-accent font-light">
            Help & Contact
          </a>
        </div>
      </main>
    </div>
  );
}