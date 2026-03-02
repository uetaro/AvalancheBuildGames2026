import { useState } from 'react';
import { DeviceFrameset } from 'react-device-frameset';
import 'react-device-frameset/styles/marvel-devices.min.css';

const APPS = [
  {
    id: 'staff',
    label: 'Staff Mobile',
    url: 'http://localhost:3002',
    color: 'black' as const,
    badge: '#5BA5A5',
  },
  {
    id: 'guest',
    label: 'Guest Mobile',
    url: 'http://localhost:3003',
    color: 'gold' as const,
    badge: '#C9A227',
  },
];

type DeviceColor = 'black' | 'gold' | 'silver' | 'rosegold';
type DeviceName = 'iPhone X' | 'iPhone 8' | 'iPhone 8 Plus' | 'Galaxy Note 8';

const DEVICE_OPTIONS: { label: string; value: DeviceName }[] = [
  { label: 'iPhone X', value: 'iPhone X' },
  { label: 'iPhone 8', value: 'iPhone 8' },
  { label: 'iPhone 8 Plus', value: 'iPhone 8 Plus' },
  { label: 'Galaxy Note 8', value: 'Galaxy Note 8' },
];

export default function DevicePreviewPage() {
  const [device, setDevice] = useState<DeviceName>('iPhone X');
  const [zoom, setZoom] = useState(0.72);
  const [reloadKey, setReloadKey] = useState(0);

  const handleReload = () => setReloadKey((k) => k + 1);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#0F172A', fontFamily: 'system-ui, sans-serif' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-8 py-4 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#5BA5A5' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="5" y="2" width="14" height="20" rx="2" />
              <line x1="12" y1="18" x2="12" y2="18" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#F1F5F9' }}>
            Device Preview
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Device selector */}
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '12px', color: '#64748B' }}>Device</span>
            <select
              value={device}
              onChange={(e) => setDevice(e.target.value as DeviceName)}
              className="rounded-lg px-3 py-1.5 text-sm outline-none"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#E2E8F0',
              }}
            >
              {DEVICE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} style={{ backgroundColor: '#1E293B' }}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Zoom slider */}
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '12px', color: '#64748B' }}>Zoom</span>
            <input
              type="range"
              min={0.4}
              max={1.0}
              step={0.04}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              style={{ width: '80px', accentColor: '#5BA5A5' }}
            />
            <span style={{ fontSize: '12px', color: '#94A3B8', width: '36px' }}>
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Reload button */}
          <button
            onClick={handleReload}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all active:scale-95"
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#E2E8F0',
              fontSize: '12px',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
            Reload
          </button>
        </div>
      </div>

      {/* Devices area */}
      <div className="flex-1 flex items-center justify-center gap-16 py-10 px-8 overflow-auto">
        {APPS.map((app) => (
          <div key={app.id} className="flex flex-col items-center gap-6">
            {/* App label */}
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: app.badge }}
              />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8', letterSpacing: '0.5px' }}>
                {app.label}
              </span>
              <span
                className="px-2 py-0.5 rounded text-xs"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  color: '#64748B',
                  fontFamily: 'monospace',
                }}
              >
                {app.url}
              </span>
            </div>

            {/* Device frame */}
            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
              <DeviceFrameset device={device} color={app.color}>
                <iframe
                  key={reloadKey}
                  src={app.url}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    display: 'block',
                  }}
                  title={app.label}
                />
              </DeviceFrameset>
            </div>

            {/* URL bar shortcut */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                marginTop: `-${Math.round((1 - zoom) * 400)}px`,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              <a
                href={app.url}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '11px', color: '#64748B', textDecoration: 'none' }}
              >
                別タブで開く
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
