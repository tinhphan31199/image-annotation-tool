'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { RegionSelector } from '@/components/region-selector'
import OcrRegionSelector from '@/components/OcrRegionSelector'
import SubtitlePreview from '@/components/SubtitlePreview'
import type { Region } from '@/lib/api'

type Tab = 'watermark' | 'ocr' | 'subtitle'

export function AnnotatorPage() {
  const params = useSearchParams()
  const imageUrl = params.get('url') ?? ''
  const videoId = params.get('videoid') ?? ''
  const baseUrl = imageUrl ? new URL(imageUrl).origin : ''

  const [tab, setTab] = useState<Tab>((params.get('mode') as Tab) || 'watermark')
  const [ocrRegion, setOcrRegion] = useState<Region | null>(null)

  const tabs: { id: Tab; label: string }[] = [
    { id: 'watermark', label: 'Xoá watermark' },
    { id: 'ocr', label: 'Vùng quét sub' },
    { id: 'subtitle', label: 'Kích thước sub' },
  ]

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary font-mono text-sm font-bold text-primary-foreground">RX</div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Region annotator</p>
              <h1 className="text-lg font-semibold tracking-tight">Đánh dấu vùng ảnh</h1>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground sm:flex">
            <span className="size-1.5 rounded-full bg-primary" /> Normalized mode
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
        <div className="mb-8 max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">01 / Annotate</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Khoanh chính xác những vùng cần lưu.</h2>
          <p className="mt-3 text-pretty leading-6 text-muted-foreground">Kéo trực tiếp trên ảnh/video để tạo một hoặc nhiều vùng. Tọa độ được gửi theo tỷ lệ (0–1), cùng với video ID.</p>
        </div>

        {/* ── Tab bar ── */}
        <div className="mb-6 flex gap-1 rounded-xl bg-muted/50 p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer ${
                tab === t.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        {!imageUrl ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <p className="font-semibold">Chưa có ảnh để đánh dấu</p>
            <p className="mt-2 text-sm text-muted-foreground">Mở app với dạng <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">?url=...&videoid=...&mode=watermark</code></p>
          </div>
        ) : tab === 'watermark' ? (
          <RegionSelector imageUrl={imageUrl} videoId={videoId} />
        ) : tab === 'ocr' ? (
          <OcrRegionSelector
            videoId={videoId}
            baseUrl={baseUrl}
            onConfirmed={(region, startTime) => {
              setOcrRegion(region)
              // POST to backend
              fetch(`${baseUrl}/api/region/${videoId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ region, start_time: startTime }),
              }).then((r) => {
                if (r.ok) alert('Đã lưu vùng quét sub!')
              })
            }}
          />
        ) : (
          <SubtitlePreview
            videoId={videoId}
            baseUrl={baseUrl}
            region={ocrRegion || { x1: 0, y1: 0, x2: 1, y2: 1 }}
            onConfirmed={(style) => {
              fetch(`${baseUrl}/api/style/${videoId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(style),
              }).then((r) => {
                if (r.ok) alert('Đã lưu kích thước & vị trí sub!')
              })
            }}
          />
        )}
      </div>
    </main>
  )
}
