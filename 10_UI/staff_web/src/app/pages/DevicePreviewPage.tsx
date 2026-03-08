import { PhoneMockup } from 'phone-mockup-react';
import 'phone-mockup-react/dist/styles.css';
import './device-preview-overrides.css';

const isDev = import.meta.env.DEV;

const APPS = [
  {
    id: 'staff',
    label: 'Staff Mobile',
    url: isDev ? 'http://localhost:3002' : '/staff-mobile/',
    badge: '#5BA5A5',
  },
  {
    id: 'guest',
    label: 'Guest Mobile',
    url: isDev ? 'http://localhost:3003' : '/guest-mobile/',
    badge: '#C9A227',
  },
];

const ZOOM = 0.72;

export default function DevicePreviewPage() {
  return (
    <div
      className="min-h-screen flex flex-col bg-white"
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      {/* Devices area */}
      <div className="flex-1 flex items-center justify-center gap-16 py-10 px-8 overflow-auto scrollbar-hide">
        {APPS.map((app) => (
          <div key={app.id} className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: app.badge }}
              />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#000000', letterSpacing: '0.5px' }}>
                {app.label}
              </span>
            </div>

            <div
              className="device-preview-pro-max"
              style={{ transform: `scale(${ZOOM})`, transformOrigin: 'top center' }}
            >
              <PhoneMockup model={"iphone-16-pro-max" as "iphone-16"}>
                <iframe
                  src={app.url}
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: '600px',
                    border: 'none',
                    display: 'block',
                  }}
                  title={app.label}
                />
              </PhoneMockup>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
