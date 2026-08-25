'use client'

import { useCallback, useRef, useState } from 'react'
import { Check, Crosshair, Loader2, MousePointer2, Pause, Play, RotateCcw, Trash2 } from 'lucide-react'

type Region = { x1: number; y1: number; x2: number; y2: number }

type Props = { imageUrl: string; videoId: string }

const VIDEO_URL_PATTERN = /\.(mp4|webm|ogg|mov|m4v)(?:$|[?#])/i

function clamp(v: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v))
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return '00:00'
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function RegionSelector({ imageUrl, videoId }: Props) {
  const frameRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const isVideo = VIDEO_URL_PATTERN.test(imageUrl)

  const [regions, setRegions] = useState<Region[]>([])
  const [draft, setDraft] = useState<Region | null>(null)
  const [start, setStart] = useState<{ x: number; y: number } | null>(null)

  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [mediaLoaded, setMediaLoaded] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const getPoint = useCallback((event: React.PointerEvent) => {
    const bounds = frameRef.current?.getBoundingClientRect()
    if (!bounds || bounds.width === 0 || bounds.height === 0) return null
    const x = (event.clientX - bounds.left) / bounds.width
    const y = (event.clientY - bounds.top) / bounds.height
    return { x: clamp(x), y: clamp(y) }
  }, [])

  const handlePointerDown = (event: React.PointerEvent) => {
    if (!mediaLoaded || event.button !== 0) return
    const point = getPoint(event)
    if (!point) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setStart(point)
    setDraft({ x1: point.x, y1: point.y, x2: point.x, y2: point.y })
    setMessage(null)
  }

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!start) return
    const point = getPoint(event)
    if (!point) return
    setDraft({
      x1: clamp(Math.min(start.x, point.x)),
      y1: clamp(Math.min(start.y, point.y)),
      x2: clamp(Math.max(start.x, point.x)),
      y2: clamp(Math.max(start.y, point.y)),
    })
  }

  const finishDrawing = () => {
    if (draft && (draft.x2 - draft.x1) >= 0.003 && (draft.y2 - draft.y1) >= 0.003) {
      setRegions((current) => [...current, draft])
    }
    setDraft(null)
    setStart(null)
  }

  const removeRegion = (index: number) => {
    setRegions((current) => current.filter((_, i) => i !== index))
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
      const body = { videoid: videoId, regions }
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      setMessage({ type: 'success', text: `Đã lưu ${regions.length} vùng.` })
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? `Không thể lưu: ${error.message}` : 'Không thể kết nối API.' })
    } finally {
      setIsSaving(false)
    }
  }

  const getVideoRectStyle = (r: Region) => ({
    left: `${r.x1 * 100}%`,
    top: `${r.y1 * 100}%`,
    width: `${(r.x2 - r.x1) * 100}%`,
    height: `${(r.y2 - r.y1) * 100}%`,
  })

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Canvas</p>
            <h2 className="mt-1 text-lg font-semibold">Kéo để khoanh vùng</h2>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 font-mono text-xs text-secondary-foreground">
            {regions.length} vùng
          </span>
        </div>

        <div className="bg-muted/40 p-4 sm:p-6">
          <div
            ref={frameRef}
            className="relative mx-auto w-fit max-w-full touch-none select-none overflow-hidden rounded-xl bg-foreground/5"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishDrawing}
            onPointerCancel={finishDrawing}
          >
            {isVideo ? (
              <video
                ref={videoRef}
                src={imageUrl}
                className="block max-h-[68vh] max-w-full object-contain"
                preload="metadata"
                playsInline
                onLoadedMetadata={(event) => { setMediaLoaded(true); setDuration(event.currentTarget.duration) }}
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
                onLoad={() => setMediaLoaded(true)}
                onError={() => setMediaLoaded(false)}
              />
            )}

            {!mediaLoaded && (
              <div className="flex min-h-64 w-[min(80vw,720px)] items-center justify-center p-8 text-center text-sm text-muted-foreground">
                Không thể tải {isVideo ? 'video' : 'ảnh'} từ URL này.
              </div>
            )}

            {regions.map((region, index) => (
              <div
                key={index}
                className="pointer-events-none absolute border-2 border-region-highlight bg-region-highlight/15 shadow-[0_0_0_1px_var(--region-highlight),0_0_12px_var(--region-highlight)]"
                style={getVideoRectStyle(region)}
              >
                <span className="absolute -top-6 left-0 rounded bg-primary px-1.5 py-0.5 font-mono text-[10px] text-primary-foreground">
                  #{index + 1}
                </span>
              </div>
            ))}

            {draft && (
              <div
                className="pointer-events-none absolute border-2 border-region-highlight border-dashed bg-region-highlight/15 shadow-[0_0_0_1px_var(--region-highlight),0_0_12px_var(--region-highlight)]"
                style={getVideoRectStyle(draft)}
              />
            )}
          </div>
        </div>

        {isVideo && (
          <div className="flex flex-col gap-3 border-t border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label={isPlaying ? 'Tạm dừng video' : 'Phát video'}
                onClick={() => { const video = videoRef.current; if (!video) return; if (video.paused) void video.play(); else video.pause() }}
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90"
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
                className="h-1.5 w-full cursor-pointer accent-primary disabled:cursor-not-allowed"
              />
              <span className="min-w-24 text-right font-mono text-xs text-muted-foreground">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground">
          <MousePointer2 className="size-4" />
          <span>Kéo chuột hoặc ngón tay trên {isVideo ? 'video' : 'ảnh'} để tạo vùng. Tọa độ tính theo tỷ lệ (0–1).</span>
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Crosshair className="size-4 text-primary" /> Thông tin phiên
          </div>
          <div className="mt-4 grid gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Video ID</p>
              <p className="mt-1 truncate font-mono">{videoId || 'Chưa có'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ảnh nguồn</p>
              <p className="mt-1 truncate font-mono text-xs">{imageUrl || 'Chưa có'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Danh sách vùng</h3>
            <button
              type="button"
              onClick={() => setRegions([])}
              disabled={!regions.length}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-destructive disabled:opacity-40"
            >
              <Trash2 className="size-3.5" /> Xóa hết
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {regions.length === 0 ? (
              <p className="rounded-lg bg-muted/50 px-3 py-4 text-center text-sm text-muted-foreground">
                Chưa có vùng nào
              </p>
            ) : (
              regions.map((r, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 font-mono text-xs">
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span>Vùng {i + 1}</span>
                    <span className="truncate text-muted-foreground">
                      x:{(r.x1 * 100).toFixed(1)}%–{(r.x2 * 100).toFixed(1)}%
                      &nbsp;y:{(r.y1 * 100).toFixed(1)}%–{(r.y2 * 100).toFixed(1)}%
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={`Xóa vùng ${i + 1}`}
                    title={`Xóa vùng ${i + 1}`}
                    onClick={() => removeRegion(i)}
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="size-3.5" />
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
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          {isSaving ? 'Đang lưu...' : 'Lưu tọa độ'}
        </button>

        <button
          type="button"
          onClick={() => { setRegions([]); setMessage(null) }}
          className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="size-4" /> Đặt lại
        </button>

        {message && (
          <p role="status" className={`rounded-lg px-3 py-2 text-sm ${message.type === 'success' ? 'bg-secondary text-secondary-foreground' : 'bg-destructive/10 text-destructive'}`}>
            {message.text}
          </p>
        )}
      </aside>
    </div>
  )
}
