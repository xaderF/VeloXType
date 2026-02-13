// SettingsPanel — modal popup with placeholder settings
// Opens from the lobby nav. All controls are non-functional placeholders.

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold tracking-[0.2em] uppercase text-lobby-text-muted">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable setting row components
// ---------------------------------------------------------------------------

function SliderRow({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  unit = '%',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-lobby-text">{label}</span>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-28 accent-accent h-1 bg-lobby-text-muted/20 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
        />
        <span className="text-xs font-mono text-lobby-text-muted w-10 text-right">
          {value}{unit}
        </span>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-lobby-text">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          'relative w-10 h-5 rounded-full transition-colors duration-200',
          value ? 'bg-accent' : 'bg-lobby-text-muted/30',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200',
            value ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-lobby-text">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-lobby-bg border border-lobby-text-muted/20 rounded-lg px-3 py-1.5 text-sm text-lobby-text
          focus:outline-none focus:border-accent/50 cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props & Component
// ---------------------------------------------------------------------------

export interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  showFps: boolean;
  onShowFpsChange: (value: boolean) => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  onOpenAdmin: () => void;
}

export function SettingsPanel({
  isOpen,
  onClose,
  showFps,
  onShowFpsChange,
  isAuthenticated,
  isAdmin,
  onOpenAdmin,
}: SettingsPanelProps) {
  // All placeholder state — none persisted or functional yet
  const [masterVolume, setMasterVolume] = useState(80);
  const [sfxVolume, setSfxVolume] = useState(70);
  const [musicVolume, setMusicVolume] = useState(50);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [smoothCaret, setSmoothCaret] = useState(true);
  const [caretStyle, setCaretStyle] = useState('Line');
  const [fontSize, setFontSize] = useState('Medium');
  const [showLiveWpm, setShowLiveWpm] = useState(true);
  const [showAccuracy, setShowAccuracy] = useState(true);
  const [antiAliasing, setAntiAliasing] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [theme, setTheme] = useState('Dark');
  const [keyboardLayout, setKeyboardLayout] = useState('QWERTY');
  const [showAdminApplication, setShowAdminApplication] = useState(false);
  const [applicationReason, setApplicationReason] = useState('');
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);

  const openAdmin = () => {
    if (isAdmin) {
      onClose();
      onOpenAdmin();
      return;
    }
    setShowAdminApplication(true);
  };

  const submitAdminApplication = () => {
    if (!applicationReason.trim()) return;
    setApplicationSubmitted(true);
  };

  const closeAdminApplication = () => {
    setShowAdminApplication(false);
    setApplicationReason('');
    setApplicationSubmitted(false);
  };

  useEffect(() => {
    if (!isOpen) {
      setShowAdminApplication(false);
      setApplicationReason('');
      setApplicationSubmitted(false);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Panel */}
          <motion.div
            className="relative z-10 w-full max-w-lg max-h-[80vh] rounded-2xl border border-lobby-text-muted/15 bg-lobby-bg shadow-2xl overflow-hidden flex flex-col"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', bounce: 0.25, duration: 0.35 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-lobby-text-muted/10">
              <h2 className="text-lg font-bold tracking-[0.15em] uppercase text-lobby-text">
                Settings
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={openAdmin}
                  className="rounded-lg border border-lobby-text-muted/25 px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] uppercase text-lobby-text hover:border-accent/40 hover:text-accent transition-colors"
                >
                  Admin
                </button>
                <button
                  onClick={onClose}
                  className="text-lobby-text-muted hover:text-lobby-text transition-colors text-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Audio */}
              <SettingsSection title="Audio">
                <ToggleRow label="Sound Effects" value={soundEnabled} onChange={setSoundEnabled} />
                <SliderRow label="Master Volume" value={masterVolume} onChange={setMasterVolume} />
                <SliderRow label="SFX Volume" value={sfxVolume} onChange={setSfxVolume} />
                <SliderRow label="Music Volume" value={musicVolume} onChange={setMusicVolume} />
              </SettingsSection>

              {/* Typing */}
              <SettingsSection title="Typing">
                <ToggleRow label="Smooth Caret" value={smoothCaret} onChange={setSmoothCaret} />
                <SelectRow
                  label="Caret Style"
                  value={caretStyle}
                  options={['Line', 'Block', 'Underline']}
                  onChange={setCaretStyle}
                />
                <SelectRow
                  label="Font Size"
                  value={fontSize}
                  options={['Small', 'Medium', 'Large', 'Extra Large']}
                  onChange={setFontSize}
                />
                <SelectRow
                  label="Keyboard Layout"
                  value={keyboardLayout}
                  options={['QWERTY', 'DVORAK', 'COLEMAK', 'AZERTY']}
                  onChange={setKeyboardLayout}
                />
              </SettingsSection>

              {/* HUD */}
              <SettingsSection title="HUD &amp; Display">
                <ToggleRow label="Show Live WPM" value={showLiveWpm} onChange={setShowLiveWpm} />
                <ToggleRow label="Show Accuracy" value={showAccuracy} onChange={setShowAccuracy} />
                <ToggleRow label="Show FPS" value={showFps} onChange={onShowFpsChange} />
              </SettingsSection>

              {/* Graphics */}
              <SettingsSection title="Graphics">
                <SelectRow
                  label="Theme"
                  value={theme}
                  options={['Dark', 'Midnight', 'Charcoal', 'OLED']}
                  onChange={setTheme}
                />
                <ToggleRow label="Anti-Aliasing" value={antiAliasing} onChange={setAntiAliasing} />
                <ToggleRow label="Reduced Motion" value={reducedMotion} onChange={setReducedMotion} />
              </SettingsSection>

              {!isAuthenticated && (
                <p className="text-xs text-lobby-text-muted/70">
                  Log in to submit an admin application.
                </p>
              )}

              {/* Placeholder notice */}
              <div className="text-center pt-2 pb-1">
                <p className="text-xs text-lobby-text-muted/50 italic">
                  Some settings are placeholders. FPS toggle is functional.
                </p>
              </div>
            </div>

            <AnimatePresence>
              {showAdminApplication && (
                <motion.div
                  className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="w-full max-w-md rounded-xl border border-lobby-text-muted/20 bg-lobby-bg p-5 shadow-2xl"
                    initial={{ scale: 0.95, opacity: 0, y: 8 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 8 }}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold tracking-[0.14em] uppercase text-lobby-text">
                        Admin Application
                      </h3>
                      <button
                        onClick={closeAdminApplication}
                        className="text-lobby-text-muted hover:text-lobby-text transition-colors"
                        aria-label="Close admin application"
                      >
                        ✕
                      </button>
                    </div>

                    {applicationSubmitted ? (
                      <div className="space-y-4">
                        <p className="text-sm text-lobby-text">
                          Application submitted. We will review it.
                        </p>
                        <button
                          onClick={closeAdminApplication}
                          className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-black"
                        >
                          Close
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm text-lobby-text-muted">
                          Tell us why you want admin access.
                        </p>
                        <textarea
                          value={applicationReason}
                          onChange={(e) => setApplicationReason(e.target.value)}
                          placeholder="Write your admin application..."
                          className="min-h-28 w-full resize-y rounded-lg border border-lobby-text-muted/20 bg-lobby-bg px-3 py-2 text-sm text-lobby-text outline-none focus:border-accent/50"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={submitAdminApplication}
                            disabled={!isAuthenticated || !applicationReason.trim()}
                            className={cn(
                              'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                              isAuthenticated && applicationReason.trim()
                                ? 'bg-accent text-black hover:brightness-110'
                                : 'bg-lobby-text-muted/20 text-lobby-text-muted cursor-not-allowed',
                            )}
                          >
                            Submit
                          </button>
                          <button
                            onClick={closeAdminApplication}
                            className="rounded-lg border border-lobby-text-muted/25 px-3 py-2 text-sm text-lobby-text-muted hover:text-lobby-text transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
