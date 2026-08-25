"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Crosshair,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react";

type Region = { x1: number; y1: number; x2: number; y2: number };

type Props = { imageUrl: string; videoId: string };

const VIDEO_URL_PATTERN = /\.(mp4|webm|ogg|mov|m4v)(?:$|[?#])/i;
const HANDLE_RADIUS = 6;
type HandleId = "nw" | "ne" | "sw" | "se" | "n" | "s" | "w" | "e";
const ALL_HANDLES: HandleId[] = ["nw", "ne", "sw", "se", "n", "s", "w", "e"];
const HANDLE_CURSOR: Record<HandleId, string> = {
  nw: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  se: "nwse-resize",
  n: "ns-resize",
  s: "ns-resize",
  w: "ew-resize",
  e: "ew-resize",
};

function clamp(v: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "00:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function denorm(r: Region, w: number, h: number) {
  return { x1: r.x1 * w, y1: r.y1 * h, x2: r.x2 * w, y2: r.y2 * h };
}

type DragState =
  | { type: "idle" }
  | { type: "draw"; startX: number; startY: number }
  | { type: "move"; startX: number; startY: number; rect: Region; index: number }
  | { type: "resize"; handle: HandleId; startX: number; startY: number; rect: Region; index: number };

export function RegionSelector({ imageUrl, videoId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState>({ type: "idle" });
  const rafRef = useRef<number>(0);
  const regionsRef = useRef<Region[]>([]);

  const isVideo = VIDEO_URL_PATTERN.test(imageUrl);
  const [size, setSize] = useState({ w: 800, h: 450 });
  const [regions, setRegions] = useState<Region[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => { regionsRef.current = regions; }, [regions]);

  const redraw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const allRegions = regionsRef.current;

    ctx.clearRect(0, 0, c.width, c.height);
    if (allRegions.length === 0) return;

    allRegions.forEach((r, i) => {
      const p = denorm(r, c.width, c.height);
      const isActive = i === activeIndex;

      ctx.fillStyle = isActive ? "rgba(53,99,233,0.12)" : "rgba(53,99,233,0.08)";
      ctx.fillRect(p.x1, p.y1, p.x2 - p.x1, p.y2 - p.y1);

      ctx.strokeStyle = isActive ? "rgba(53,99,233,0.85)" : "rgba(53,99,233,0.55)";
      ctx.lineWidth = isActive ? 2 : 1.5;
      ctx.setLineDash([]);
      ctx.strokeRect(p.x1, p.y1, p.x2 - p.x1, p.y2 - p.y1);

      const corner = 12;
      ctx.strokeStyle = isActive ? "rgba(53,99,233,1)" : "rgba(53,99,233,0.6)";
      ctx.lineWidth = 2.5;
      for (const [cx, cy, dx, dy] of [
        [p.x1, p.y1, 1, 1], [p.x2, p.y1, -1, 1],
        [p.x1, p.y2, 1, -1], [p.x2, p.y2, -1, -1],
      ] as [number, number, number, number][]) {
        ctx.beginPath(); ctx.moveTo(cx, cy + dy * corner); ctx.lineTo(cx, cy); ctx.lineTo(cx + dx * corner, cy); ctx.stroke();
      }

      if (isActive) {
        for (const id of ALL_HANDLES) {
          let hx: number, hy: number;
          switch (id) {
            case "nw": hx = p.x1; hy = p.y1; break;
            case "ne": hx = p.x2; hy = p.y1; break;
            case "sw": hx = p.x1; hy = p.y2; break;
            case "se": hx = p.x2; hy = p.y2; break;
            case "n": hx = (p.x1 + p.x2) / 2; hy = p.y1; break;
            case "s": hx = (p.x1 + p.x2) / 2; hy = p.y2; break;
            case "w": hx = p.x1; hy = (p.y1 + p.y2) / 2; break;
            case "e": hx = p.x2; hy = (p.y1 + p.y2) / 2; break;
          }
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "rgba(53,99,233,0.8)";
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(hx, hy, HANDLE_RADIUS, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
      }

      const label = `#${i + 1}`;
      ctx.font = "600 10px monospace";
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = isActive ? "#3563e9" : "rgba(53,99,233,0.7)";
      const lx = p.x1, ly = p.y1 - 20, lh = 16, lw = tw + 8;
      ctx.beginPath();
      ctx.moveTo(lx + 4, ly); ctx.lineTo(lx + lw - 4, ly); ctx.quadraticCurveTo(lx + lw, ly, lx + lw, ly + 4);
      ctx.lineTo(lx + lw, ly + lh - 4); ctx.quadraticCurveTo(lx + lw, ly + lh, lx + lw - 4, ly + lh);
      ctx.lineTo(lx + 4, ly + lh); ctx.quadraticCurveTo(lx, ly + lh, lx, ly + lh - 4);
      ctx.lineTo(lx, ly + 4); ctx.quadraticCurveTo(lx, ly, lx + 4, ly); ctx.fill();
      ctx.fillStyle = "#ffffff"; ctx.fillText(label, lx + 4, ly + 11);
    });
  }, [activeIndex]);

  const scheduleRedraw = useCallback(() => {
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => { rafRef.current = 0; redraw(); });
    }
  }, [redraw]);

  useEffect(() => { if (size.w > 0 && size.h > 0) scheduleRedraw(); }, [size, scheduleRedraw]);
  useEffect(() => { if (activeIndex !== null) scheduleRedraw(); }, [activeIndex, scheduleRedraw]);

  const getPos = (cx: number, cy: number) => {
    const b = canvasRef.current?.getBoundingClientRect();
    return b ? { x: cx - b.left, y: cy - b.top } : { x: 0, y: 0 };
  };

  const hitTest = (px: number, py: number): { type: "handle"; handle: HandleId; index: number } | { type: "rect"; index: number } | null => {
    const c = canvasRef.current;
    if (!c) return null;
    const allRegions = regionsRef.current;

    for (let i = allRegions.length - 1; i >= 0; i--) {
      const p = denorm(allRegions[i], c.width, c.height);
      const hs = HANDLE_RADIUS + 4;
      for (const id of ALL_HANDLES) {
        let hx: number, hy: number;
        switch (id) {
          case "nw": hx = p.x1; hy = p.y1; break;
          case "ne": hx = p.x2; hy = p.y1; break;
          case "sw": hx = p.x1; hy = p.y2; break;
          case "se": hx = p.x2; hy = p.y2; break;
          case "n": hx = (p.x1 + p.x2) / 2; hy = p.y1; break;
          case "s": hx = (p.x1 + p.x2) / 2; hy = p.y2; break;
          case "w": hx = p.x1; hy = (p.y1 + p.y2) / 2; break;
          case "e": hx = p.x2; hy = (p.y1 + p.y2) / 2; break;
        }
        if (Math.abs(px - hx) <= hs && Math.abs(py - hy) <= hs) return { type: "handle", handle: id, index: i };
      }
    }
    for (let i = allRegions.length - 1; i >= 0; i--) {
      const p = denorm(allRegions[i], c.width, c.height);
      if (px >= p.x1 && px <= p.x2 && py >= p.y1 && py <= p.y2) return { type: "rect", index: i };
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pos = getPos(e.clientX, e.clientY);
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    setMessage(null);

    const hit = hitTest(pos.x, pos.y);
    if (hit && hit.type === "handle") {
      setActiveIndex(hit.index);
      dragRef.current = { type: "resize", handle: hit.handle, startX: pos.x, startY: pos.y, rect: { ...regionsRef.current[hit.index] }, index: hit.index };
      return;
    }
    if (hit && hit.type === "rect") {
      setActiveIndex(hit.index);
      dragRef.current = { type: "move", startX: pos.x, startY: pos.y, rect: { ...regionsRef.current[hit.index] }, index: hit.index };
      return;
    }

    const n = { x: pos.x / size.w, y: pos.y / size.h };
    dragRef.current = { type: "draw", startX: pos.x, startY: pos.y };
    const newRect = { x1: n.x, y1: n.y, x2: n.x, y2: n.y };
    const newIndex = regionsRef.current.length;
    regionsRef.current = [...regionsRef.current, newRect];
    setActiveIndex(newIndex);
    setRegions([...regionsRef.current]);
    scheduleRedraw();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pos = getPos(e.clientX, e.clientY);
    const d = dragRef.current;
    const c = canvasRef.current;

    if (d.type === "idle") {
      if (c) {
        const hit = hitTest(pos.x, pos.y);
        if (hit && hit.type === "handle") c.style.cursor = HANDLE_CURSOR[hit.handle];
        else if (hit && hit.type === "rect") c.style.cursor = "move";
        else c.style.cursor = "crosshair";
      }
      return;
    }

    if (d.type === "draw") {
      const n = { x: pos.x / size.w, y: pos.y / size.h };
      const s = { x: d.startX / size.w, y: d.startY / size.h };
      const all = [...regionsRef.current];
      all[all.length - 1] = {
        x1: clamp(Math.min(s.x, n.x)), y1: clamp(Math.min(s.y, n.y)),
        x2: clamp(Math.max(s.x, n.x)), y2: clamp(Math.max(s.y, n.y)),
      };
      regionsRef.current = all; setRegions(all); scheduleRedraw();
      return;
    }

    if (!c) return;
    const dx = (pos.x - d.startX) / c.width, dy = (pos.y - d.startY) / c.height;
    const sr = d.rect;
    const all = [...regionsRef.current];

    if (d.type === "move") {
      const x1 = clamp(sr.x1 + dx), y1 = clamp(sr.y1 + dy);
      const x2 = clamp(sr.x2 + dx), y2 = clamp(sr.y2 + dy);
      if (x2 - x1 < 0.01 || y2 - y1 < 0.01) return;
      all[d.index] = { x1, y1, x2, y2 };
    } else if (d.type === "resize") {
      let { x1, y1, x2, y2 } = sr;
      switch (d.handle) {
        case "nw": x1 = clamp(sr.x1 + dx); y1 = clamp(sr.y1 + dy); break;
        case "ne": x2 = clamp(sr.x2 + dx); y1 = clamp(sr.y1 + dy); break;
        case "sw": x1 = clamp(sr.x1 + dx); y2 = clamp(sr.y2 + dy); break;
        case "se": x2 = clamp(sr.x2 + dx); y2 = clamp(sr.y2 + dy); break;
        case "n": y1 = clamp(sr.y1 + dy); break;
        case "s": y2 = clamp(sr.y2 + dy); break;
        case "w": x1 = clamp(sr.x1 + dx); break;
        case "e": x2 = clamp(sr.x2 + dx); break;
      }
      if (x2 - x1 < 0.01 || y2 - y1 < 0.01) return;
      all[d.index] = { x1, y1, x2, y2 };
    }
    regionsRef.current = all; setRegions(all); scheduleRedraw();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
    if (dragRef.current.type === "draw") {
      const all = [...regionsRef.current];
      const last = all[all.length - 1];
      if (last && (last.x2 - last.x1 < 0.01 || last.y2 - last.y1 < 0.01)) {
        all.pop(); regionsRef.current = all; setRegions(all); setActiveIndex(null);
      }
    }
    dragRef.current = { type: "idle" };
  };

  const removeRegion = (index: number) => {
    const all = regionsRef.current.filter((_, i) => i !== index);
    regionsRef.current = all; setRegions(all); setActiveIndex(null);
  };

  const clearAll = () => {
    regionsRef.current = []; setRegions([]); setActiveIndex(null); setMessage(null);
  };

  const saveRegions = async () => {
    if (!videoId) { setMessage({ type: "error", text: "Thiếu videoid trên URL." }); return; }
    let endpoint: string;
    try { endpoint = `${new URL(imageUrl).origin}/api/delogo/${encodeURIComponent(videoId)}`; }
    catch { setMessage({ type: "error", text: "URL ảnh hoặc video không hợp lệ." }); return; }
    setIsSaving(true); setMessage(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoid: videoId, regions }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setMessage({ type: "success", text: `Đã lưu ${regions.length} vùng.` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? `Không thể lưu: ${error.message}` : "Không thể kết nối API." });
    } finally { setIsSaving(false); }
  };

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const seekTimeline = (clientX: number) => {
    const v = videoRef.current;
    const bar = timelineRef.current;
    if (!v || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / rect.width);
    v.currentTime = ratio * duration;
    setCurrentTime(v.currentTime);
  };

  return (
    <div className="space-y-5">
      {/* Instructions bar */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 flex items-start justify-between gap-4">
        <p className="text-sm text-ink-muted leading-relaxed">
          Kéo trên ảnh/video để tạo vùng xoá watermark. Tọa độ tỷ lệ (0–1).
        </p>
        <div className="flex gap-2 flex-shrink-0 items-center">
          <kbd className="px-2 py-0.5 rounded text-[10px] font-mono text-ink-muted bg-black/[0.03] ring-1 ring-black/[0.06]">drag</kbd>
          <span className="text-[10px] text-ink-light hidden sm:inline">tạo / di chuyển</span>
          <kbd className="px-2 py-0.5 rounded text-[10px] font-mono text-ink-muted bg-black/[0.03] ring-1 ring-black/[0.06]">handle</kbd>
          <span className="text-[10px] text-ink-light hidden sm:inline">resize</span>
        </div>
      </div>

      {/* Video frame */}
      <div className="double-bezel">
        <div className="double-bezel-inner overflow-hidden">
          <div
            ref={containerRef}
            className="relative bg-black select-none mx-auto touch-none"
            style={{ width: size.w, height: size.h, maxWidth: "100%" }}
          >
            {isVideo ? (
              <video
                ref={videoRef}
                src={imageUrl}
                className="absolute inset-0 w-full h-full object-contain"
                preload="metadata"
                playsInline
                controls={false}
                onLoadedMetadata={(event) => {
                  const v = event.currentTarget;
                  setMediaLoaded(true);
                  setDuration(v.duration);
                  const cw = containerRef.current?.clientWidth || 800;
                  const r = v.videoWidth / v.videoHeight || 16 / 9;
                  setSize({ w: Math.min(cw, v.videoWidth), h: Math.min(cw, v.videoWidth) / r });
                }}
                onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => { setIsPlaying(false); setCurrentTime(videoRef.current?.currentTime ?? 0); }}
                onError={() => setMediaLoaded(false)}
              />
            ) : (
              <img
                src={imageUrl}
                alt="Ảnh cần xoá watermark"
                className="absolute inset-0 w-full h-full object-contain"
                onLoad={(e) => {
                  setMediaLoaded(true);
                  const el = e.currentTarget;
                  const cw = containerRef.current?.clientWidth || 800;
                  const r = el.naturalWidth / el.naturalHeight;
                  setSize({ w: Math.min(cw, el.naturalWidth), h: Math.min(cw, el.naturalWidth) / r });
                }}
                onError={() => setMediaLoaded(false)}
              />
            )}

            {!mediaLoaded && (
              <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-sm text-white/40">
                Không thể tải {isVideo ? "video" : "ảnh"} từ URL này.
              </div>
            )}

            {mediaLoaded && (
              <canvas
                ref={canvasRef}
                width={size.w}
                height={size.h}
                className="absolute inset-0 touch-none"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
              />
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      {isVideo && (
        <div className="space-y-2">
          <div className="glass-panel rounded-2xl px-3 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { const v = videoRef.current; if (v) v.paused ? v.play() : v.pause(); }}
                aria-label={isPlaying ? "Tạm dừng" : "Phát"}
                className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center
                           hover:bg-accent shadow-sm active:scale-[0.95] transition-all duration-300
                           ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer"
              >
                {isPlaying ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                ) : (
                  <svg className="w-4 h-4 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
            </div>
            <span className="text-[11px] font-mono text-ink-light tabular-nums tracking-tight">
              {formatTime(currentTime)} <span className="opacity-40">/</span> {formatTime(duration)}
            </span>
          </div>

          <div
            ref={timelineRef}
            className="relative h-6 flex items-center cursor-pointer group select-none"
            onMouseDown={(e) => seekTimeline(e.clientX)}
            onMouseMove={(e) => { if (e.buttons === 1) seekTimeline(e.clientX); }}
          >
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-black/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-150" style={{ width: `${pct}%` }} />
            </div>
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-accent shadow-sm transition-opacity duration-200 opacity-0 group-hover:opacity-100 pointer-events-none"
              style={{ left: `calc(${pct}% - 7px)` }}
            />
          </div>
        </div>
      )}

      {/* Two cards horizontal */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Session info */}
        <div className="double-bezel">
          <div className="double-bezel-inner p-5 h-full">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-xl bg-accent/8">
                <Crosshair className="size-4 text-accent" />
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-light">Session</p>
                <h3 className="text-sm font-semibold leading-tight">Thông tin phiên</h3>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-ink-light">Video ID</span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" />
                  <span className="truncate font-mono text-xs text-ink">{videoId || "—"}</span>
                </div>
              </div>
              <div className="h-px bg-black/[0.04]" />
              <div className="flex items-start justify-between gap-3">
                <span className="text-[11px] text-ink-light shrink-0">Nguồn</span>
                <span className="truncate font-mono text-[10px] text-ink-light text-right">{imageUrl || "—"}</span>
              </div>
              <div className="h-px bg-black/[0.04]" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-ink-light">Số vùng</span>
                <span className="inline-flex items-center justify-center min-w-[28px] h-6 rounded-lg bg-accent/8 px-2 font-mono text-xs font-semibold text-accent">
                  {regions.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Region list */}
        <div className="double-bezel">
          <div className="double-bezel-inner p-5 h-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-xl bg-accent/8">
                  <svg className="size-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
                  </svg>
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-light">Regions</p>
                  <h3 className="text-sm font-semibold leading-tight">Danh sách vùng</h3>
                </div>
              </div>
              <button
                type="button" onClick={clearAll} disabled={!regions.length}
                className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] text-ink-light transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-danger/8 hover:text-danger disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <Trash2 className="size-3 transition-transform duration-300 group-hover:rotate-[-8deg]" />
                Xóa hết
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {regions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-black/[0.06] px-4 py-8 text-center">
                  <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-xl bg-black/[0.02]">
                    <svg className="size-5 text-ink-light/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 8v8" /><path d="M8 12h8" />
                    </svg>
                  </div>
                  <p className="text-xs text-ink-light">Kéo trên ảnh để tạo vùng</p>
                </div>
              ) : regions.map((r, i) => {
                const isActive = activeIndex === i;
                return (
                  <div
                    key={i} onClick={() => setActiveIndex(i)}
                    className={`group/item relative flex items-center gap-3 rounded-xl px-3.5 py-3 cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                      isActive
                        ? "bg-accent/8 shadow-[0_0_0_1px_rgba(53,99,233,0.15)]"
                        : "bg-black/[0.015] hover:bg-black/[0.035] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.04)]"
                    }`}
                  >
                    <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg font-mono text-[10px] font-bold transition-all duration-300 ${
                      isActive ? "bg-accent text-white" : "bg-black/[0.04] text-ink-light"
                    }`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[11px] tabular-nums tracking-tight text-ink">
                        x:{(r.x1 * 100).toFixed(1)}% — {(r.x2 * 100).toFixed(1)}%
                      </div>
                      <div className="font-mono text-[11px] tabular-nums tracking-tight text-ink-light">
                        y:{(r.y1 * 100).toFixed(1)}% — {(r.y2 * 100).toFixed(1)}%
                      </div>
                    </div>
                    <button
                      type="button" aria-label={`Xóa vùng ${i + 1}`}
                      onClick={(e) => { e.stopPropagation(); removeRegion(i); }}
                      className="flex size-7 shrink-0 items-center justify-center rounded-lg text-ink-light opacity-0 group-hover/item:opacity-100 transition-all duration-300 hover:bg-danger/10 hover:text-danger cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button" onClick={saveRegions} disabled={isSaving || !regions.length}
          className="btn-island-primary justify-center flex-1"
        >
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          {isSaving ? "Đang lưu..." : "Lưu tọa độ"}
        </button>

        <button
          type="button" onClick={clearAll}
          className="group inline-flex items-center justify-center gap-2 text-sm text-ink-light hover:text-foreground transition-all duration-300 cursor-pointer px-4"
        >
          <RotateCcw className="size-4 transition-transform duration-500 group-hover:rotate-[-180deg]" /> Đặt lại
        </button>
      </div>

      {message && (
        <div
          role="status"
          className={`rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
            message.type === "success"
              ? "bg-success/8 text-success border border-success/10"
              : "bg-danger/8 text-danger border border-danger/10"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
