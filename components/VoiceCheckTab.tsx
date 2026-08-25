"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getSrtEntries,
  getVoiceMapDetail,
  updateVoiceMapLine,
  bulkSwitchVoice,
  regenerateTtsLine,
  setTtsSpeed,
  checkTtsAlignment,
  getTtsAudioUrl,
  resolveVoiceReview,
  type SrtEntry,
  type VoiceMapDetail,
  type AlignmentIssue,
  type CapCutVoice,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import VoiceSheet from "@/components/VoiceSheet";

interface Props {
  videoId: string;
  baseUrl?: string;
}

const SPEEDS = [0.9, 1.0, 1.1, 1.25];

function IconSpinner({ className = "w-4 h-4" }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.15" />
      <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function VoiceCheckTab({ videoId, baseUrl = "" }: Props) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<SrtEntry[]>([]);
  const [voiceMap, setVoiceMap] = useState<VoiceMapDetail | null>(null);
  const [alignment, setAlignment] = useState<AlignmentIssue[]>([]);
  const [loadError, setLoadError] = useState("");
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [checkingAlignment, setCheckingAlignment] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [sheetFor, setSheetFor] = useState<number | "bulk-from" | "bulk-to" | null>(null);
  const [bulkFrom, setBulkFrom] = useState<string>("");
  const [toast, setToast] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const [es, vm] = await Promise.all([
        getSrtEntries(videoId, baseUrl),
        getVoiceMapDetail(videoId, "vi", baseUrl).catch(() => null),
      ]);
      setEntries(es);
      setVoiceMap(vm);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t("voice.loadError"));
    }
  }, [videoId, baseUrl, t]);

  useEffect(() => { if (videoId) void load(); }, [videoId, load]);

  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  // Group entries by voice for the bulk sheet
  const usedVoices = useMemo(() => {
    const s = new Set<string>();
    if (voiceMap?.map) {
      for (const line of Object.values(voiceMap.map)) s.add(line.voice_type);
    }
    return [...s];
  }, [voiceMap]);

  const togglePlay = (index: number) => {
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    if (playingIndex === index) {
      audio.pause();
      setPlayingIndex(null);
      return;
    }
    audio.pause();
    audio.src = getTtsAudioUrl(videoId, index, baseUrl);
    audio.onended = () => setPlayingIndex(null);
    audio.onerror = () => setPlayingIndex(null);
    audio.play().then(() => setPlayingIndex(index)).catch(() => setPlayingIndex(null));
  };

  const handleRegen = async (index: number) => {
    const vt = voiceMap?.map?.[String(index)]?.voice_type || "";
    setBusyIndex(index);
    try {
      await regenerateTtsLine(videoId, index, vt, baseUrl);
      showToast(t("voice.regenDone"));
    } catch {
      showToast("Không tạo lại được");
    } finally {
      setBusyIndex(null);
    }
  };

  const handleSpeed = async (index: number, speed: number) => {
    setBusyIndex(index);
    try {
      await setTtsSpeed(videoId, index, speed, baseUrl);
      showToast(`Speed ${speed}x ✓`);
    } catch {
      showToast("Không chỉnh được tốc độ");
    } finally {
      setBusyIndex(null);
    }
  };

  const handlePickVoice = async (index: number, voice: CapCutVoice) => {
    setBusyIndex(index);
    try {
      await updateVoiceMapLine(videoId, index, voice.voice_type, baseUrl);
      setVoiceMap((prev) =>
        prev
          ? { map: { ...prev.map, [String(index)]: { ...prev.map[String(index)], voice_type: voice.voice_type, display_name: voice.display_name } } }
          : prev,
      );
      showToast(`${voice.display_name} ✓`);
    } catch {
      showToast("Không đổi được giọng");
    } finally {
      setBusyIndex(null);
    }
  };

  const handleBulkApply = async (toVoice: CapCutVoice) => {
    if (!bulkFrom || !toVoice) return;
    setBusyIndex(-99);
    try {
      await bulkSwitchVoice(videoId, bulkFrom, toVoice.voice_type, baseUrl);
      await load();
      showToast("Đã đổi hàng loạt ✓");
    } catch {
      showToast("Không đổi được hàng loạt");
    } finally {
      setBusyIndex(null);
      setBulkFrom("");
    }
  };

  const runAlignment = async () => {
    setCheckingAlignment(true);
    try {
      const issues = await checkTtsAlignment(videoId, "vi", baseUrl);
      setAlignment(issues);
    } catch {
      showToast("Không kiểm tra được");
    } finally {
      setCheckingAlignment(false);
    }
  };

  const [resolving, setResolving] = useState(false);
  const handleContinue = async () => {
    setResolving(true);
    try {
      await resolveVoiceReview(videoId, baseUrl);
      showToast(t("voice.continued"));
    } catch {
      showToast("Không gửi được lệnh tiếp tục");
    } finally {
      setResolving(false);
    }
  };

  const alignmentByIndex = new Map(alignment.map((a) => [a.index, a]));
  const displayName = (index: number): string => {
    const line = voiceMap?.map?.[String(index)];
    return (line as { display_name?: string } | undefined)?.display_name ?? line?.voice_type ?? "—";
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10">
            <svg className="w-4.5 h-4.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 010 7" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">{t("voice.title")}</h3>
            <p className="text-[11px] text-ink-muted">{t("voice.lines", { count: entries.length })}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={runAlignment}
          disabled={checkingAlignment || entries.length === 0}
          className="shrink-0 rounded-full bg-accent px-3.5 py-2 text-[11px] font-medium text-white transition-all duration-300 active:scale-95 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
        >
          {checkingAlignment && <IconSpinner className="w-3 h-3" />}
          {checkingAlignment ? t("voice.checkingAlignment") : t("voice.checkAlignment")}
        </button>
      </div>

      {/* Errors */}
      {loadError && (
        <div className="rounded-xl bg-danger-muted ring-1 ring-danger/15 px-4 py-3 text-xs text-danger">
          {loadError}
        </div>
      )}

      {/* Alignment banner */}
      {alignment.length > 0 && (
        <div className="glass-panel rounded-2xl px-4 py-3 ring-1 ring-warn/20">
          <p className="text-xs font-semibold text-warn mb-2">
            {t("voice.alignmentIssues", { count: alignment.length })}
          </p>
          <div className="space-y-1">
            {alignment.slice(0, 8).map((a) => (
              <button
                key={a.index}
                type="button"
                onClick={() => togglePlay(a.index)}
                className="flex w-full items-center gap-2 text-left text-[11px] text-ink-muted cursor-pointer"
              >
                <span className="font-mono text-warn shrink-0">#{a.index}</span>
                <span className="truncate flex-1">{a.text}</span>
                <span className="shrink-0 font-mono text-warn">+{a.overshoot.toFixed(1)}s</span>
              </button>
            ))}
            {alignment.length > 8 && (
              <p className="text-[11px] text-ink-light">… và {alignment.length - 8} dòng khác</p>
            )}
          </div>
        </div>
      )}

      {/* Bulk switch */}
      <button
        type="button"
        onClick={() => setSheetFor("bulk-from")}
        className="btn-island-secondary w-full justify-center"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 01-4 4H3" />
        </svg>
        {t("voice.bulkSwitch")}
        {bulkFrom && (
          <span className="font-mono text-[10px] text-accent">{bulkFrom}</span>
        )}
      </button>

      {/* Entry rows */}
      <div className="space-y-2 pb-6">
        {entries.length === 0 && !loadError && (
          <p className="rounded-xl bg-black/[0.02] px-4 py-8 text-center text-xs text-ink-light">
            Chưa có phụ đề / voice map
          </p>
        )}
        {entries.map((entry) => {
          const alignIssue = alignmentByIndex.get(entry.index);
          return (
            <div key={entry.index} className={`glass-panel rounded-2xl p-3.5 ${alignIssue ? "ring-1 ring-warn/25" : ""}`}>
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => togglePlay(entry.index)}
                  aria-label="Play audio"
                  className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 cursor-pointer ${
                    playingIndex === entry.index ? "bg-accent text-white" : "bg-accent/10 text-accent"
                  }`}
                >
                  {playingIndex === entry.index ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                  ) : (
                    <svg className="w-4 h-4 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[10px] text-ink-light tabular-nums flex items-center gap-1.5">
                    #{entry.index}
                    {alignIssue && (
                      <span className="text-warn" title={`${alignIssue.audio_duration.toFixed(1)}s > ${alignIssue.srt_duration.toFixed(1)}s`}>
                        ⚠ +{alignIssue.overshoot.toFixed(1)}s
                      </span>
                    )}
                  </p>
                  <p className="text-sm leading-snug text-ink line-clamp-2 mt-0.5">{entry.text}</p>
                  <button
                    type="button"
                    onClick={() => setSheetFor(entry.index)}
                    className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2.5 py-1 text-[10px] font-medium text-accent cursor-pointer active:scale-95 transition-transform duration-150"
                  >
                    🎙 {displayName(entry.index)}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-2.5 flex items-center gap-1.5 pl-[52px]">
                <button
                  type="button"
                  onClick={() => handleRegen(entry.index)}
                  disabled={busyIndex === entry.index}
                  className="rounded-lg bg-black/[0.04] px-2.5 py-1.5 text-[10px] font-medium text-ink-muted hover:bg-black/[0.07] active:scale-95 transition-all duration-150 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                >
                  {busyIndex === entry.index ? <IconSpinner className="w-3 h-3" /> : "↻"}
                  {t("voice.regenerate")}
                </button>
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSpeed(entry.index, s)}
                    disabled={busyIndex === entry.index}
                    title={`${t("voice.speed")} ${s}x`}
                    className={`rounded-lg px-2 py-1.5 font-mono text-[10px] active:scale-95 transition-all duration-150 cursor-pointer disabled:opacity-50 ${
                      s === 1.0 ? "bg-black/[0.06] text-ink font-semibold" : "bg-black/[0.03] text-ink-light hover:bg-black/[0.06]"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Voice picker sheet */}
      <VoiceSheet
        baseUrl={baseUrl}
        open={typeof sheetFor === "number"}
        title={
          typeof sheetFor === "number"
            ? t("voice.selectVoice", { index: sheetFor })
            : ""
        }
        onClose={() => setSheetFor(null)}
        onPick={(v) => { if (typeof sheetFor === "number") void handlePickVoice(sheetFor, v); }}
      />

      {/* Bulk from-picker */}
      <BulkFromSheet
        baseUrl={baseUrl}
        open={sheetFor === "bulk-from" || sheetFor === "bulk-to"}
        voices={usedVoices}
        stage={sheetFor === "bulk-to" ? "to" : "from"}
        fromVoice={bulkFrom}
        onPickFrom={(vt) => { setBulkFrom(vt); setSheetFor("bulk-to"); }}
        onPickTo={(v) => { void handleBulkApply(v); setSheetFor(null); }}
        onClose={() => { setSheetFor(null); setBulkFrom(""); }}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed left-1/2 bottom-8 z-40 -translate-x-1/2 rounded-full glass-panel px-5 py-2.5 text-xs font-medium shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* Sticky action bar — confirm voice check */}
      <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-5 pt-8 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none">
        <div className="mx-auto max-w-3xl flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={handleContinue}
            disabled={resolving || entries.length === 0}
            className="btn-island-primary flex-1 justify-center group"
          >
            {resolving ? t("voice.saving") : t("voice.continue")}
            <span className="btn-island-icon">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bulk flow sheets ──

interface BulkProps {
  baseUrl?: string;
  open: boolean;
  voices: string[];
  stage: "from" | "to";
  fromVoice: string;
  onPickFrom: (voiceType: string) => void;
  onPickTo: (voice: CapCutVoice) => void;
  onClose: () => void;
}

function BulkFromSheet({ baseUrl, open, voices, stage, fromVoice, onPickFrom, onPickTo, onClose }: BulkProps) {
  const { t } = useI18n();
  if (!open) return null;

  if (stage === "from") {
    return (
      <div className="fixed inset-0 z-40 flex items-end justify-center" onClick={onClose}>
        <div
          className="glass-panel w-full max-w-lg rounded-t-3xl max-h-[60dvh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-black/[0.04]">
            <h3 className="text-sm font-semibold">{t("voice.fromVoice")}</h3>
            <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-black/[0.04] text-ink-muted flex items-center justify-center cursor-pointer">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-1.5">
            {voices.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onPickFrom(v)}
                className="w-full rounded-xl bg-black/[0.02] hover:bg-black/[0.05] px-4 py-3 text-left text-sm cursor-pointer transition-colors"
              >
                {v}
              </button>
            ))}
            {voices.length === 0 && <p className="py-8 text-center text-sm text-ink-light">Chưa có giọng nào trong map</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <VoiceSheet
      baseUrl={baseUrl}
      open
      title={`${t("voice.toVoice")} ← ${fromVoice}`}
      onClose={onClose}
      onPick={onPickTo}
    />
  );
}
