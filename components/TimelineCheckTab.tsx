"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSrtEntries,
  getPipelineState,
  updateSrt,
  reTranslateLine,
  startSrtRiskCheck,
  getJobStatus,
  getSrtRiskResult,
  resolveTimelineReview,
  type SrtEntry,
  type TimelineIssue,
  type SubtitleRisk,
} from "@/lib/api";
import { getVideoUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

interface Props {
  videoId: string;
  baseUrl?: string;
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function IconSpinner({ className = "w-4 h-4" }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.15" />
      <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function TimelineCheckTab({ videoId, baseUrl = "" }: Props) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<SrtEntry[]>([]);
  const [issues, setIssues] = useState<TimelineIssue[]>([]);
  const [risks, setRisks] = useState<SubtitleRisk[]>([]);
  const [loadError, setLoadError] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [retranslating, setRetranslating] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState("");
  const [toast, setToast] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const es = await getSrtEntries(videoId, baseUrl);
      setEntries(es);
      try {
        const st = await getPipelineState(videoId, baseUrl);
        setIssues(st.timeline_check?.issues ?? []);
      } catch { /* state optional */ }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t("timeline.loadError"));
    }
  }, [videoId, baseUrl, t]);

  useEffect(() => { if (videoId) void load(); }, [videoId, load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const seekTo = (sec: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = sec;
    void v.play().catch(() => {});
  };

  const patchEntry = (index: number, patch: Partial<SrtEntry>) => {
    setEntries((prev) => prev.map((e) => (e.index === index ? { ...e, ...patch } : e)));
  };

  const nudge = (entry: SrtEntry, field: "start" | "end", delta: number) => {
    const val = Math.max(0, entry[field] + delta);
    if (field === "start" && val >= entry.end - 0.2) return;
    if (field === "end" && val <= entry.start + 0.2) return;
    patchEntry(entry.index, { [field]: val });
  };

  const handleDelete = (index: number) => {
    setEntries((prev) =>
      prev.filter((e) => e.index !== index).map((e, i) => ({ ...e, index: i + 1 })),
    );
    setIssues((prev) =>
      prev.filter((i) => i.index !== index).map((i) => ({ ...i, index: i.index > index ? i.index - 1 : i.index })),
    );
    setRisks((prev) =>
      prev.filter((r) => r.index !== index).map((r) => ({ ...r, index: r.index > index ? r.index - 1 : r.index })),
    );
    setExpanded(null);
  };

  const handleReTranslate = async (index: number) => {
    setRetranslating(index);
    setCheckError("");
    try {
      const text = await reTranslateLine(videoId, index, "zh", "vi", baseUrl);
      patchEntry(index, { text });
      setRisks((prev) => prev.filter((r) => r.index !== index));
    } catch (e) {
      setCheckError(e instanceof Error ? e.message : "Lỗi dịch lại");
    } finally {
      setRetranslating(null);
    }
  };

  const runRiskCheck = async () => {
    setChecking(true);
    setCheckError("");
    try {
      const { job_id } = { job_id: await startSrtRiskCheck(videoId, "vi", baseUrl) };
      for (let i = 0; i < 600; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const st = await getJobStatus(job_id, baseUrl);
        if (st.status === "done") break;
        if (st.status === "error") throw new Error(st.error || "Risk check lỗi");
        if (i === 599) throw new Error("Timeout");
      }
      const result = await getSrtRiskResult(videoId, baseUrl);
      setRisks(result);
    } catch (e) {
      setCheckError(e instanceof Error ? e.message : "Risk check lỗi");
    } finally {
      setChecking(false);
    }
  };

  const handleSave = async (): Promise<boolean> => {
    setSaving(true);
    try {
      await updateSrt(videoId, entries, baseUrl);
      return true;
    } catch {
      setCheckError("Không lưu được phụ đề");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOnly = async () => {
    if (await handleSave()) showToast(t("timeline.saved"));
  };

  const handleContinue = async () => {
    if (!(await handleSave())) return;
    try {
      await resolveTimelineReview(videoId, "continue", baseUrl);
      showToast(t("timeline.continued"));
    } catch {
      showToast("Không gửi được lệnh tiếp tục");
    }
  };

  const issueIndexes = new Set(issues.map((i) => i.index));
  const riskIndexes = new Set(risks.map((r) => r.index));

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warn/15">
            <svg className="w-4.5 h-4.5 text-warn" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">{t("timeline.title")}</h3>
            <p className="text-[11px] text-ink-muted truncate">
              {issues.length > 0 ? t("timeline.issuesFound", { count: issues.length }) : t("timeline.noIssues")}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={runRiskCheck}
          disabled={checking || entries.length === 0}
          className="shrink-0 rounded-full bg-warn px-3.5 py-2 text-[11px] font-medium text-white transition-all duration-300 active:scale-95 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
        >
          {checking ? <IconSpinner className="w-3.5 h-3.5" /> : null}
          {checking ? t("timeline.checking") : t("timeline.checkRisk")}
        </button>
      </div>

      {/* Video */}
      {videoId && (
        <div className="double-bezel">
          <div className="double-bezel-inner overflow-hidden">
            <video
              ref={videoRef}
              src={getVideoUrl(videoId, baseUrl)}
              className="w-full max-h-[32dvh] bg-black object-contain"
              controls
              playsInline
              preload="metadata"
            />
          </div>
        </div>
      )}

      {/* Errors */}
      {(loadError || checkError) && (
        <div className="rounded-xl bg-danger-muted ring-1 ring-danger/15 px-4 py-3 text-xs text-danger">
          {loadError || checkError}
        </div>
      )}

      {/* Risks banner */}
      {risks.length > 0 && (
        <div className="glass-panel rounded-2xl px-4 py-3 ring-1 ring-warn/20">
          <p className="text-xs font-semibold text-warn mb-2">
            {t("timeline.risksFound", { count: risks.length })}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {risks.map((r) => (
              <button
                key={r.index}
                type="button"
                onClick={() => {
                  const entry = entries.find((e) => e.index === r.index);
                  if (entry) { setExpanded(r.index); seekTo(entry.start); }
                }}
                className="rounded-full bg-warn/10 px-2.5 py-1 text-[11px] font-mono text-warn cursor-pointer"
              >
                #{r.index}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Entry list */}
      <div className="space-y-2">
        {entries.map((entry) => {
          const isOpen = expanded === entry.index;
          const flagged = issueIndexes.has(entry.index) || riskIndexes.has(entry.index);
          return (
            <div
              key={entry.index}
              className={`glass-panel rounded-2xl transition-shadow duration-300 ${
                flagged ? "ring-1 ring-warn/30" : ""
              }`}
            >
              {/* Row header — tap to expand + play */}
              <div className="flex items-center gap-3 p-3.5">
                <button
                  type="button"
                  onClick={() => seekTo(entry.start)}
                  aria-label="Play"
                  className="w-9 h-9 shrink-0 rounded-full bg-accent/10 text-accent flex items-center justify-center cursor-pointer active:scale-90 transition-transform duration-200"
                >
                  <svg className="w-3.5 h-3.5 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </button>
                <button type="button" className="flex-1 min-w-0 text-left cursor-pointer" onClick={() => setExpanded(isOpen ? null : entry.index)}>
                  <p className="font-mono text-[10px] text-ink-light tabular-nums">
                    #{entry.index} · {fmt(entry.start)} → {fmt(entry.end)}
                    {flagged && <span className="text-warn ml-1.5">⚠</span>}
                  </p>
                  <p className={`text-sm leading-snug mt-0.5 ${isOpen ? "" : "truncate"} text-ink`}>
                    {entry.text || <span className="text-ink-light italic">(trống)</span>}
                  </p>
                </button>
                <svg
                  className={`w-4 h-4 text-ink-light shrink-0 transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>

              {/* Expanded editor */}
              {isOpen && (
                <div className="px-3.5 pb-3.5 space-y-3 border-t border-black/[0.04] pt-3">
                  <textarea
                    value={entry.text}
                    onChange={(e) => patchEntry(entry.index, { text: e.target.value })}
                    rows={2}
                    className="w-full rounded-xl bg-black/[0.03] ring-1 ring-black/[0.06] px-3 py-2 text-sm focus:outline-none focus:ring-accent/40 resize-none"
                  />

                  {/* Time nudges */}
                  <div className="grid grid-cols-2 gap-2">
                    {(["start", "end"] as const).map((field) => (
                      <div key={field}>
                        <p className="text-[9px] uppercase tracking-[0.15em] text-ink-light mb-1">
                          {t(`timeline.${field}`)} {fmt(entry[field])}
                        </p>
                        <div className="grid grid-cols-4 gap-1">
                          {[-1, -0.5, 0.5, 1].map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => nudge(entry, field, d)}
                              className="rounded-lg bg-black/[0.04] py-1.5 font-mono text-[10px] text-ink-muted hover:bg-black/[0.07] active:scale-95 transition-all duration-150 cursor-pointer"
                            >
                              {d > 0 ? `+${d}` : d}s
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleReTranslate(entry.index)}
                      disabled={retranslating === entry.index}
                      className="rounded-full bg-black/[0.04] px-3.5 py-2 text-[11px] font-medium text-ink-muted hover:bg-black/[0.07] active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      {retranslating === entry.index && <IconSpinner className="w-3 h-3" />}
                      {retranslating === entry.index ? t("timeline.reTranslating") : t("timeline.reTranslate")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.index)}
                      className="rounded-full bg-danger/8 px-3.5 py-2 text-[11px] font-medium text-danger hover:bg-danger/15 active:scale-95 transition-all duration-200 cursor-pointer ml-auto"
                    >
                      {t("timeline.delete")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-5 pt-8 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none">
        <div className="mx-auto max-w-3xl flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={handleSaveOnly}
            disabled={saving || entries.length === 0}
            className="btn-island-secondary flex-1 justify-center"
          >
            {saving ? t("timeline.saving") : t("timeline.save")}
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={saving || entries.length === 0}
            className="btn-island-primary flex-1 justify-center group"
          >
            {t("timeline.continue")}
            <span className="btn-island-icon">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed left-1/2 bottom-24 z-40 -translate-x-1/2 rounded-full glass-panel px-5 py-2.5 text-xs font-medium shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
