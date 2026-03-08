import { useNavigate } from "react-router";
import { ArrowLeft, Mail, Phone, User, Eye, Calendar, MessageSquare } from "lucide-react";
import { useState } from "react";

type ProfileVisibility = "public" | "staff-only" | "private";

export function AccountCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"contact" | "profile">("contact");
  
  // Contact info
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  
  // Profile info
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [bio, setBio] = useState("");
  const [visibility, setVisibility] = useState<ProfileVisibility>("staff-only");

  const handleContactSubmit = () => {
    if (email || phone) {
      setStep("profile");
    }
  };

  const handleComplete = () => {
    // Simulate account creation
    navigate("/my-page");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="relative bg-primary text-primary-foreground pt-10 pb-2">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
        
        <div className="relative max-w-md mx-auto">
          <div className="flex items-center gap-3 p-6">
            <button
              onClick={() => step === "profile" ? setStep("contact") : navigate("/", { replace: true })}
              className="p-2 -ml-2 hover:bg-white/10 rounded-none transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-light">Create Account</h1>
              <p className="text-xs opacity-90 mt-0.5 font-light">
                {step === "contact" ? "Step 1/2 • Grand Hotel" : "Step 2/2 • Grand Hotel"}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-md mx-auto w-full pb-24">
        {step === "contact" && (
          <div className="space-y-6">
            {/* Info */}
            <div className="bg-secondary/30 rounded-xl p-4 text-sm text-muted-foreground">
              <p className="leading-relaxed font-light">
                Register your email or phone number to access your Kudos history and enjoy a seamless experience.
              </p>
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-sm text-foreground mb-3 font-light">
                Email (Optional)
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full bg-input-background border border-border rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-accent font-light"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-3 text-muted-foreground font-light">or</span>
              </div>
            </div>

            {/* Phone Input */}
            <div>
              <label className="block text-sm text-foreground mb-3 font-light">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full bg-input-background border border-border rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-accent font-light"
                />
              </div>
            </div>

            {/* Privacy Note */}
            <div className="text-xs text-muted-foreground leading-relaxed font-light">
              <p>
                Your contact information will be used for service improvements and notifications.
                <a href="#" className="text-accent hover:underline ml-1">
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>
        )}

        {step === "profile" && (
          <div className="space-y-6">
            {/* Info */}
            <div className="bg-secondary/30 rounded-none p-4 text-sm text-muted-foreground">
              <p className="leading-relaxed font-light">
                Profile information is optional. It helps our staff provide better service.
              </p>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm text-foreground mb-3 font-light">
                Display Name (Optional)
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full bg-input-background border border-border rounded-none pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-accent font-light"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-light">
                This name will be shown to staff when you send Kudos
              </p>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm text-foreground mb-3 font-light">
                Gender (Optional)
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  placeholder="Male/Female/Other"
                  className="w-full bg-input-background border border-border rounded-none pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-accent font-light"
                />
              </div>
            </div>

            {/* Birth Date */}
            <div>
              <label className="block text-sm text-foreground mb-3 font-light">
                Birth Date (Optional)
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full bg-input-background border border-border rounded-none pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-accent font-light"
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm text-foreground mb-3 font-light">
                Bio (Optional)
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us a little about yourself"
                  className="w-full bg-input-background border border-border rounded-none pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-accent font-light"
                />
              </div>
            </div>

            {/* Privacy Settings */}
            <div>
              <label className="block text-sm text-foreground mb-3 flex items-center gap-2 font-light">
                <Eye className="w-4 h-4" />
                Profile Visibility
              </label>
              <div className="space-y-2">
                {[
                  { value: "public", label: "Public", desc: "Visible to all staff" },
                  { value: "staff-only", label: "Staff Only", desc: "Visible to assigned staff" },
                  { value: "private", label: "Private", desc: "Not visible to anyone" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setVisibility(option.value as ProfileVisibility)}
                    className={`w-full text-left p-4 rounded-none border-2 transition-all ${
                      visibility === option.value
                        ? "border-accent bg-accent/5"
                        : "border-border bg-white hover:border-accent/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-foreground mb-0.5 font-light">
                          {option.label}
                        </p>
                        <p className="text-xs text-muted-foreground font-light">
                          {option.desc}
                        </p>
                      </div>
                      {visibility === option.value && (
                        <div className="flex-shrink-0 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4 shadow-lg">
        <div className="max-w-md mx-auto space-y-2">
          <button
            onClick={step === "contact" ? handleContactSubmit : handleComplete}
            disabled={step === "contact" && !email && !phone}
            className="w-full bg-accent text-accent-foreground py-4 rounded-none shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-light"
          >
            {step === "contact" ? "Next" : "Complete"}
          </button>
          
          {step === "profile" && (
            <button
              onClick={() => navigate("/my-page")}
              className="w-full text-sm text-muted-foreground py-2 font-light"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}