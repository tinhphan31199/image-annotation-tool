"use client";

import { useEffect, useMemo, useState } from "react";
import { getCapCutVoices, fetchWithSkip, type CapCutVoice } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

interface Props {
  baseUrl?: string;
  title: string;
  open: boolean;
  onClose: () => void;
  onPick: (voice: CapCutVoice) => void;
}

export default function VoiceSheet({ baseUrl, title, open, onClose, onPick }: Props) {
  const { t } = useI18n();
  const [voices, setVoices] = useState<CapCutVoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [audio] = useState(() => typeof Audio !== "undefined" ? new Audio() : null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    getCapCutVoices("vi-VN", baseUrl)
      .then(setVoices)
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi"))
      .finally(() => setLoading(false));
    return () => { audio?.pause(); };
  }, [open, baseUrl, audio]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return voices;
    return voices.filter(
      (v) =>
        v.display_name.toLowerCase().includes(q) ||
        v.voice_type.toLowerCase().includes(q),
    );
  }, [voices, query]);

  if (!open) return null;

  const handlePreview = async (voice: CapCutVoice) => {
    if (!audio) return;
    if (previewing === voice.voice_type) {
      audio.pause();
      setPreviewing(null);
      return;
    }
    audio.pause();
    setPreviewing(voice.voice_type);
    try {
      const res = await fetchWithSkip(`${(baseUrl || "").replace(/\/$/, "")}/api/capcut/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice: voice.voice_type }),
      });
      if (!res.ok) throw new Error("preview failed");
      const blob = await res.blob();
      audio.src = URL.createObjectURL(blob);
      audio.onended = () => setPreviewing(null);
      await audio.play();
    } catch {
      setPreviewing(null);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" onClick={onClose}>
      <div
        className="glass-panel w-full max-w-lg rounded-t-3xl max-h-[75dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "fade-up 0.4s cubic-bezier(0.32,0.72,0,1) forwards" }}
      >
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-black/[0.04]">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/[0.04] text-ink-muted flex items-center justify-center cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
              <path d="M18 6L6 18" /><path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("voice.searchVoice")}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-black/[0.03] ring-1 ring-black/[0.06] focus:outline-none focus:ring-accent/40"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-1.5">
          {loading && (
            <p className="py-8 text-center text-sm text-ink-light">Đang tải…</p>
          )}
          {error && (
            <p className="py-8 text-center text-sm text-danger">{error}</p>
          )}
          {!loading && !error && filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-ink-light">Không có giọng nào</p>
          )}
          {filtered.map((v) => (
            <div
              key={v.voice_type}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 bg-black/[0.02] hover:bg-black/[0.04] transition-colors"
            >
              <button
                type="button"
                onClick={() => handlePreview(v)}
                aria-label={t("voice.preview")}
                className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
                  previewing === v.voice_type
                    ? "bg-accent text-white"
                    : "bg-black/[0.04] text-ink-muted"
                }`}
              >
                {previewing === v.voice_type ? (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
              <button
                type="button"
                className="flex-1 min-w-0 text-left cursor-pointer"
                onClick={() => { onPick(v); onClose(); }}
              >
                <p className="text-sm font-medium truncate">{v.display_name}</p>
                <p className="text-[10px] font-mono text-ink-light truncate">{v.voice_type}</p>
              </button>
              <svg className="w-4 h-4 text-ink-light shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
