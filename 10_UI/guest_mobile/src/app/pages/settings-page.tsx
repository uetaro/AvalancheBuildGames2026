import { useNavigate } from "react-router";
import { ArrowLeft, Bell, Mail, MessageSquare, Volume2 } from "lucide-react";
import { useState } from "react";

export function SettingsPage() {
  const navigate = useNavigate();
  
  const [settings, setSettings] = useState({
    kudosReceived: true,
    kudosConfirmed: true,
    emailNotifications: false,
    pushNotifications: true,
    soundEffects: true,
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
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
              onClick={() => navigate("/my-page")}
              className="p-2 -ml-2 hover:bg-white/10 rounded-none transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-light">Notification Settings</h1>
              <p className="text-xs text-white/60 font-light mt-0.5">Grand Hotel</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-md mx-auto w-full">
        {/* Kudos Notifications */}
        <div className="mb-6">
          <h2 className="text-xs text-muted-foreground font-light mb-3 uppercase tracking-wider">
            Kudos Notifications
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
            <SettingItem
              icon={Bell}
              title="Kudos Received"
              description="Get notified when staff receives your Kudos"
              checked={settings.kudosReceived}
              onChange={() => toggleSetting("kudosReceived")}
            />
            <div className="border-t border-border" />
            <SettingItem
              icon={MessageSquare}
              title="Kudos Confirmed"
              description="Confirmation when Kudos is successfully sent"
              checked={settings.kudosConfirmed}
              onChange={() => toggleSetting("kudosConfirmed")}
            />
          </div>
        </div>

        {/* Communication Preferences */}
        <div className="mb-6">
          <h2 className="text-xs text-muted-foreground font-light mb-3 uppercase tracking-wider">
            Communication
          </h2>
          <div className="bg-white rounded-none shadow-sm border border-border overflow-hidden">
            <SettingItem
              icon={Mail}
              title="Email Notifications"
              description="Receive updates via email"
              checked={settings.emailNotifications}
              onChange={() => toggleSetting("emailNotifications")}
            />
            <div className="border-t border-border" />
            <SettingItem
              icon={Bell}
              title="Push Notifications"
              description="Allow push notifications on this device"
              checked={settings.pushNotifications}
              onChange={() => toggleSetting("pushNotifications")}
            />
          </div>
        </div>

        {/* App Settings */}
        <div className="mb-6">
          <h2 className="text-xs text-muted-foreground font-light mb-3 uppercase tracking-wider">
            App Settings
          </h2>
          <div className="bg-white rounded-none shadow-sm border border-border overflow-hidden">
            <SettingItem
              icon={Volume2}
              title="Sound Effects"
              description="Play sounds for app interactions"
              checked={settings.soundEffects}
              onChange={() => toggleSetting("soundEffects")}
            />
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-secondary/20 rounded-none p-4 text-xs text-muted-foreground font-light border border-secondary/30">
          <p className="leading-relaxed">
            You can change these settings at any time. Some notifications may still be sent for important updates regarding your stay.
          </p>
        </div>
      </main>
    </div>
  );
}

interface SettingItemProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

function SettingItem({ icon: Icon, title, description, checked, onChange }: SettingItemProps) {
  return (
    <div className="p-5 flex items-center gap-4">
      <div className="flex-shrink-0 w-10 h-10 bg-secondary/50 rounded-full flex items-center justify-center">
        <Icon className="w-5 h-5 text-secondary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm text-foreground font-light mb-0.5">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground font-light">
          {description}
        </p>
      </div>
      <button
        onClick={onChange}
        className={`flex-shrink-0 relative w-12 h-7 rounded-full transition-colors ${
          checked ? "bg-accent" : "bg-muted"
        }`}
      >
        <div
          className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}