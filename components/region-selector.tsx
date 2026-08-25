'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Crosshair, Loader2, Pause, Play, RotateCcw, Trash2 } from 'lucide-react'

type Region = { x1: number; y1: number; x2: number; y2: number }

type Props = { imageUrl: string; videoId: string }

const VIDEO_URL_PATTERN = /\.(mp4|webm|ogg|mov|m4v)(?:$|[?#])/i
const HANDLE_RADIUS = 6
type HandleId = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e'
const ALL_HANDLES: HandleId[] = ['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e']
const HANDLE_CURSOR: Record<HandleId, string> = {
  nw: 'nwse-resize', ne: 'nesw-resize',
  sw: 'nesw-resize', se: 'nwse-resize',
  n: 'ns-resize', s: 'ns-resize',
  w: 'ew-resize', e: 'ew-resize',
}

function clamp(v: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v))
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return '00:00'
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function denorm(r: Region, w: number, h: number) {
  return { x1: r.x1 * w, y1: r.y1 * h, x2: r.x2 * w, y2: r.y2 * h }
}

type DragState =
  | { type: 'idle' }
  | { type: 'draw'; startX: number; startY: number }
  | { type: 'move'; startX: number; startY: number; rect: Region; index: number }
  | { type: 'resize'; handle: HandleId; startX: number; startY: number; rect: Region; index: number }

export function RegionSelector({ imageUrl, videoId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const dragRef = useRef<DragState>({ type: 'idle' })
  const rafRef = useRef<number>(0)
  const regionsRef = useRef<Region[]>([])

  const isVideo = VIDEO_URL_PATTERN.test(imageUrl)
  const [size, setSize] = useState({ w: 800, h: 450 })
  const [regions, setRegions] = useState<Region[]>([])
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [mediaLoaded, setMediaLoaded] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => { regionsRef.current = regions }, [regions])

  const redraw = useCallback(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const allRegions = regionsRef.current

    ctx.clearRect(0, 0, c.width, c.height)
    if (allRegions.length === 0) return

    allRegions.forEach((r, i) => {
      const p = denorm(r, c.width, c.height)
      const isActive = i === activeIndex

      ctx.fillStyle = isActive ? 'rgba(53,99,233,0.12)' : 'rgba(53,99,233,0.08)'
      ctx.fillRect(p.x1, p.y1, p.x2 - p.x1, p.y2 - p.y1)

      ctx.strokeStyle = isActive ? 'rgba(53,99,233,0.85)' : 'rgba(53,99,233,0.55)'
      ctx.lineWidth = isActive ? 2 : 1.5
      ctx.setLineDash([])
      ctx.strokeRect(p.x1, p.y1, p.x2 - p.x1, p.y2 - p.y1)

      const corner = 12
      ctx.strokeStyle = isActive ? 'rgba(53,99,233,1)' : 'rgba(53,99,233,0.6)'
      ctx.lineWidth = 2.5
      for (const [cx, cy, dx, dy] of [
        [p.x1, p.y1, 1, 1], [p.x2, p.y1, -1, 1],
        [p.x1, p.y2, 1, -1], [p.x2, p.y2, -1, -1],
      ] as [number, number, number, number][]) {
        ctx.beginPath()
        ctx.moveTo(cx, cy + dy * corner)
        ctx.lineTo(cx, cy)
        ctx.lineTo(cx + dx * corner, cy)
        ctx.stroke()
      }

      if (isActive) {
        for (const id of ALL_HANDLES) {
          let hx: number, hy: number
          switch (id) {
            case 'nw': hx = p.x1; hy = p.y1; break
            case 'ne': hx = p.x2; hy = p.y1; break
            case 'sw': hx = p.x1; hy = p.y2; break
            case 'se': hx = p.x2; hy = p.y2; break
            case 'n': hx = (p.x1 + p.x2) / 2; hy = p.y1; break
            case 's': hx = (p.x1 + p.x2) / 2; hy = p.y2; break
            case 'w': hx = p.x1; hy = (p.y1 + p.y2) / 2; break
            case 'e': hx = p.x2; hy = (p.y1 + p.y2) / 2; break
          }
          ctx.fillStyle = '#ffffff'
          ctx.strokeStyle = 'rgba(53,99,233,0.8)'
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.arc(hx, hy, HANDLE_RADIUS, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
        }
      }

      const label = `#${i + 1}`
      ctx.font = '600 10px monospace'
      const tw = ctx.measureText(label).width
      ctx.fillStyle = isActive ? '#3563e9' : 'rgba(53,99,233,0.7)'
      const lx = p.x1
      const ly = p.y1 - 20
      const lh = 16
      const lw = tw + 8
      ctx.beginPath()
      ctx.moveTo(lx + 4, ly)
      ctx.lineTo(lx + lw - 4, ly)
      ctx.quadraticCurveTo(lx + lw, ly, lx + lw, ly + 4)
      ctx.lineTo(lx + lw, ly + lh - 4)
      ctx.quadraticCurveTo(lx + lw, ly + lh, lx + lw - 4, ly + lh)
      ctx.lineTo(lx + 4, ly + lh)
      ctx.quadraticCurveTo(lx, ly + lh, lx, ly + lh - 4)
      ctx.lineTo(lx, ly + 4)
      ctx.quadraticCurveTo(lx, ly, lx + 4, ly)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.fillText(label, lx + 4, ly + 11)
    })
  }, [activeIndex])

  const scheduleRedraw = useCallback(() => {
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => { rafRef.current = 0; redraw() })
    }
  }, [redraw])

  useEffect(() => {
    if (size.w > 0 && size.h > 0) scheduleRedraw()
  }, [size, scheduleRedraw])

  useEffect(() => {
    if (activeIndex !== null) scheduleRedraw()
  }, [activeIndex, scheduleRedraw])

  const getPos = (cx: number, cy: number) => {
    const b = canvasRef.current?.getBoundingClientRect()
    return b ? { x: cx - b.left, y: cy - b.top } : { x: 0, y: 0 }
  }

  const hitTest = (px: number, py: number): { type: 'handle'; handle: HandleId; index: number } | { type: 'rect'; index: number } | null => {
    const c = canvasRef.current
    if (!c) return null
    const allRegions = regionsRef.current

    for (let i = allRegions.length - 1; i >= 0; i--) {
      const p = denorm(allRegions[i], c.width, c.height)
      const hs = HANDLE_RADIUS + 4
      for (const id of ALL_HANDLES) {
        let hx: number, hy: number
        switch (id) {
          case 'nw': hx = p.x1; hy = p.y1; break
          case 'ne': hx = p.x2; hy = p.y1; break
          case 'sw': hx = p.x1; hy = p.y2; break
          case 'se': hx = p.x2; hy = p.y2; break
          case 'n': hx = (p.x1 + p.x2) / 2; hy = p.y1; break
          case 's': hx = (p.x1 + p.x2) / 2; hy = p.y2; break
          case 'w': hx = p.x1; hy = (p.y1 + p.y2) / 2; break
          case 'e': hx = p.x2; hy = (p.y1 + p.y2) / 2; break
        }
        if (Math.abs(px - hx) <= hs && Math.abs(py - hy) <= hs) return { type: 'handle', handle: id, index: i }
      }
    }

    for (let i = allRegions.length - 1; i >= 0; i--) {
      const p = denorm(allRegions[i], c.width, c.height)
      if (px >= p.x1 && px <= p.x2 && py >= p.y1 && py <= p.y2) return { type: 'rect', index: i }
    }

    return null
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const pos = getPos(e.clientX, e.clientY)
    ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
    setMessage(null)

    const hit = hitTest(pos.x, pos.y)

    if (hit && hit.type === 'handle') {
      setActiveIndex(hit.index)
      dragRef.current = { type: 'resize', handle: hit.handle, startX: pos.x, startY: pos.y, rect: { ...regionsRef.current[hit.index] }, index: hit.index }
      return
    }
    if (hit && hit.type === 'rect') {
      setActiveIndex(hit.index)
      dragRef.current = { type: 'move', startX: pos.x, startY: pos.y, rect: { ...regionsRef.current[hit.index] }, index: hit.index }
      return
    }

    const n = { x: pos.x / size.w, y: pos.y / size.h }
    dragRef.current = { type: 'draw', startX: pos.x, startY: pos.y }
    const newRect = { x1: n.x, y1: n.y, x2: n.x, y2: n.y }
    const newIndex = regionsRef.current.length
    regionsRef.current = [...regionsRef.current, newRect]
    setActiveIndex(newIndex)
    setRegions([...regionsRef.current])
    scheduleRedraw()
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pos = getPos(e.clientX, e.clientY)
    const d = dragRef.current
    const c = canvasRef.current

    if (d.type === 'idle') {
      if (c) {
        const hit = hitTest(pos.x, pos.y)
        if (hit && hit.type === 'handle') c.style.cursor = HANDLE_CURSOR[hit.handle]
        else if (hit && hit.type === 'rect') c.style.cursor = 'move'
        else c.style.cursor = 'crosshair'
      }
      return
    }

    if (d.type === 'draw') {
      const n = { x: pos.x / size.w, y: pos.y / size.h }
      const s = { x: d.startX / size.w, y: d.startY / size.h }
      const all = [...regionsRef.current]
      all[all.length - 1] = {
        x1: clamp(Math.min(s.x, n.x)), y1: clamp(Math.min(s.y, n.y)),
        x2: clamp(Math.max(s.x, n.x)), y2: clamp(Math.max(s.y, n.y)),
      }
      regionsRef.current = all
      setRegions(all)
      scheduleRedraw()
      return
    }

    if (!c) return
    const dx = (pos.x - d.startX) / c.width
    const dy = (pos.y - d.startY) / c.height
    const sr = d.rect
    const all = [...regionsRef.current]

    if (d.type === 'move') {
      const x1 = clamp(sr.x1 + dx), y1 = clamp(sr.y1 + dy)
      const x2 = clamp(sr.x2 + dx), y2 = clamp(sr.y2 + dy)
      if (x2 - x1 < 0.01 || y2 - y1 < 0.01) return
      all[d.index] = { x1, y1, x2, y2 }
    } else if (d.type === 'resize') {
      let { x1, y1, x2, y2 } = sr
      switch (d.handle) {
        case 'nw': x1 = clamp(sr.x1 + dx); y1 = clamp(sr.y1 + dy); break
        case 'ne': x2 = clamp(sr.x2 + dx); y1 = clamp(sr.y1 + dy); break
        case 'sw': x1 = clamp(sr.x1 + dx); y2 = clamp(sr.y2 + dy); break
        case 'se': x2 = clamp(sr.x2 + dx); y2 = clamp(sr.y2 + dy); break
        case 'n': y1 = clamp(sr.y1 + dy); break
        case 's': y2 = clamp(sr.y2 + dy); break
        case 'w': x1 = clamp(sr.x1 + dx); break
        case 'e': x2 = clamp(sr.x2 + dx); break
      }
      if (x2 - x1 < 0.01 || y2 - y1 < 0.01) return
      all[d.index] = { x1, y1, x2, y2 }
    }

    regionsRef.current = all
    setRegions(all)
    scheduleRedraw()
  }

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    ;(e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId)
    if (dragRef.current.type === 'draw') {
      const all = [...regionsRef.current]
      const last = all[all.length - 1]
      if (last && (last.x2 - last.x1 < 0.01 || last.y2 - last.y1 < 0.01)) {
        all.pop()
        regionsRef.current = all
        setRegions(all)
        setActiveIndex(null)
      }
    }
    dragRef.current = { type: 'idle' }
  }

  const removeRegion = (index: number) => {
    const all = regionsRef.current.filter((_, i) => i !== index)
    regionsRef.current = all
    setRegions(all)
    setActiveIndex(null)
  }

  const clearAll = () => {
    regionsRef.current = []
    setRegions([])
    setActiveIndex(null)
    setMessage(null)
  }

  const saveRegions = async () => {
    if (!videoId) {
      setMessage({ type: 'error', text: 'Thiếu videoid trên URL.' })
      return
    }
    let endpoint: string
    try {
      endpoint = `${new URL(imageUrl).origin}/api/delogo/${encodeURIComponent(videoId)}`
    } catch {
      setMessage({ type: 'error', text: 'URL ảnh hoặc video không hợp lệ.' })
      return
    }
    setIsSaving(true)
    setMessage(null)
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoid: videoId, regions }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      setMessage({ type: 'success', text: `Đã lưu ${regions.length} vùng.` })
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? `Không thể lưu: ${error.message}` : 'Không thể kết nối API.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="double-bezel overflow-hidden">
        <div className="double-bezel-inner">
          <div className="flex items-center justify-between border-b border-black/[0.04] px-5 py-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-light">Canvas</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight">Kéo để khoanh vùng</h2>
            </div>
            <span className="rounded-full bg-accent/8 px-3 py-1 font-mono text-xs text-accent">
              {regions.length} vùng
            </span>
          </div>

          <div className="bg-[#f0efed]/40 p-4 sm:p-6">
            <div
              ref={containerRef}
              className="relative mx-auto w-fit max-w-full overflow-hidden rounded-xl"
            >
              {isVideo ? (
                <video
                  ref={videoRef}
                  src={imageUrl}
                  className="block max-h-[68vh] max-w-full object-contain"
                  preload="metadata"
                  playsInline
                  onLoadedMetadata={(event) => { setMediaLoaded(true); setDuration(event.currentTarget.duration); setSize({ w: event.currentTarget.videoWidth, h: event.currentTarget.videoHeight }) }}
                  onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onError={() => setMediaLoaded(false)}
                />
              ) : (
                <img
                  src={imageUrl}
                  alt="Ảnh cần đánh dấu vùng tọa độ"
                  className="block max-h-[68vh] max-w-full object-contain"
                  onLoad={(e) => { setMediaLoaded(true); const el = e.currentTarget; setSize({ w: el.naturalWidth, h: el.naturalHeight }) }}
                  onError={() => setMediaLoaded(false)}
                />
              )}

              {!mediaLoaded && (
                <div className="flex min-h-64 w-[min(80vw,720px)] items-center justify-center p-8 text-center text-sm text-ink-light">
                  Không thể tải {isVideo ? 'video' : 'ảnh'} từ URL này.
                </div>
              )}

              {mediaLoaded && (
                <canvas
                  ref={canvasRef}
                  width={size.w}
                  height={size.h}
                  className="absolute inset-0 touch-none cursor-crosshair"
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerLeave={onPointerUp}
                />
              )}
            </div>
          </div>

          {isVideo && (
            <div className="flex flex-col gap-3 border-t border-black/[0.04] px-5 py-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={isPlaying ? 'Tạm dừng video' : 'Phát video'}
                  onClick={() => { const video = videoRef.current; if (!video) return; if (video.paused) void video.play(); else video.pause() }}
                  className="btn-island-primary !px-0 !py-0 !size-10 !rounded-full"
                >
                  {isPlaying ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
                </button>
                <input
                  aria-label="Timeline video"
                  type="range"
                  min="0"
                  max={duration || 0}
                  step="0.01"
                  value={Math.min(currentTime, duration || 0)}
                  onChange={(event) => { const time = Number(event.target.value); setCurrentTime(time); if (videoRef.current) videoRef.current.currentTime = time }}
                  disabled={!duration}
                  className="h-1.5 w-full cursor-pointer accent-accent disabled:cursor-not-allowed"
                />
                <span className="min-w-24 text-right font-mono text-xs text-ink-light">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-black/[0.04] px-5 py-3 text-xs text-ink-light">
            <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 9l4-4 4 4" /><path d="M9 5v14" />
            </svg>
            <span>Kéo để tạo vùng, giữ `{`拽`}`Inside di chuyển, kéo mép thay đổi kích thước. Tọa độ 0–1.</span>
          </div>
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        <div className="glass-panel p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Crosshair className="size-4 text-accent" /> Thông tin phiên
          </div>
          <div className="mt-4 grid gap-3 text-sm">
            <div>
              <p className="text-[11px] text-ink-light">Video ID</p>
              <p className="mt-1 truncate font-mono text-xs">{videoId || 'Chưa có'}</p>
            </div>
            <div>
              <p className="text-[11px] text-ink-light">Ảnh nguồn</p>
              <p className="mt-1 truncate font-mono text-[10px]">{imageUrl || 'Chưa có'}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Danh sách vùng</h3>
            <button
              type="button"
              onClick={clearAll}
              disabled={!regions.length}
              className="inline-flex items-center gap-1.5 text-[11px] text-ink-light transition hover:text-danger disabled:opacity-40 cursor-pointer"
            >
              <Trash2 className="size-3" /> Xóa hết
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            {regions.length === 0 ? (
              <p className="rounded-xl bg-black/[0.02] px-3 py-4 text-center text-xs text-ink-light">
                Chưa có vùng nào
              </p>
            ) : (
              regions.map((r, i) => (
                <div
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-[11px] cursor-pointer transition-all duration-200 ${
                    activeIndex === i ? 'bg-accent/8 ring-1 ring-accent/20' : 'bg-black/[0.02] hover:bg-black/[0.04]'
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className={activeIndex === i ? 'text-accent font-semibold' : ''}>#{i + 1}</span>
                    <span className="truncate text-ink-light">
                      x:{(r.x1 * 100).toFixed(1)}%–{(r.x2 * 100).toFixed(1)}%
                      &nbsp;y:{(r.y1 * 100).toFixed(1)}%–{(r.y2 * 100).toFixed(1)}%
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={`Xóa vùng ${i + 1}`}
                    onClick={(e) => { e.stopPropagation(); removeRegion(i) }}
                    className="flex size-6 shrink-0 items-center justify-center rounded-md text-ink-light transition hover:bg-danger/10 hover:text-danger cursor-pointer"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={saveRegions}
          disabled={isSaving || !regions.length}
          className="btn-island-primary w-full justify-center"
        >
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          {isSaving ? 'Đang lưu...' : 'Lưu tọa độ'}
        </button>

        <button
          type="button"
          onClick={clearAll}
          className="inline-flex items-center justify-center gap-2 text-sm text-ink-light hover:text-foreground transition cursor-pointer"
        >
          <RotateCcw className="size-4" /> Đặt lại
        </button>

        {message && (
          <p role="status" className={`rounded-xl px-3 py-2 text-sm ${message.type === 'success' ? 'bg-success/8 text-success' : 'bg-danger/8 text-danger'}`}>
            {message.text}
          </p>
        )}
      </aside>
    </div>
  )
}
