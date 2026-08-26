"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { RegionSelector } from "@/components/region-selector";
import OcrRegionSelector from "@/components/OcrRegionSelector";
import SubtitlePreview from "@/components/SubtitlePreview";
import TimelineCheckTab from "@/components/TimelineCheckTab";
import VoiceCheckTab from "@/components/VoiceCheckTab";
import { fetchWithSkip, type Region } from "@/lib/api";

type Tab = "watermark" | "ocr" | "subtitle" | "timeline" | "voice";

const TABS: { id: Tab; label: string }[] = [
  { id: "watermark", label: "Xoá watermark" },
  { id: "ocr", label: "Vùng quét sub" },
  { id: "subtitle", label: "Kích thước sub" },
  { id: "timeline", label: "Kiểm tra sub" },
  { id: "voice", label: "Voice" },
];

export function AnnotatorPage() {
  const params = useSearchParams();
  const imageUrl = params.get("url") ?? "";
  const videoId = params.get("videoid") ?? "";
  const baseUrl = imageUrl ? new URL(imageUrl).origin : "";

  const [tab, setTab] = useState<Tab>(
    (params.get("mode") as Tab) || "watermark",
  );
  const [ocrRegion, setOcrRegion] = useState<Region | null>(null);

  return (
    <main className="min-h-[100dvh] bg-[#f8f8f6] text-[#1a1a18]">
      {/* ── Floating pill header ── */}
      <div className="px-5 pt-6 pb-2 lg:px-8">
        <header className="mx-auto flex max-w-6xl items-center justify-between rounded-full bg-white/80 backdrop-blur-xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.02)] ring-1 ring-black/[0.04] px-5 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-2xl bg-[#3563e9] font-mono text-xs font-bold text-white">
              RX
            </div>
            <div className="hidden sm:block">
              <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#9a9a95]">
                Region annotator
              </p>
              <h1 className="text-sm font-semibold tracking-tight leading-tight">
                Đánh dấu vùng
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-[#f0efed] px-3 py-1.5 font-mono text-[10px] text-[#6b6b66]">
            <span className="size-1.5 rounded-full bg-[#22c55e]" />
            Normalized
          </div>
        </header>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
        {/* ── Hero section ── */}
        <div className="mb-12 max-w-2xl">
          <span className="inline-flex items-center rounded-full bg-[#3563e9]/8 px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[#3563e9]">
            01 / Annotate
          </span>
          <h2 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.02em] sm:text-5xl leading-[1.1]">
            Khoanh chính xác
            <br />
            <span className="text-[#6b6b66]">những vùng cần lưu.</span>
          </h2>
          <p className="mt-5 text-lg leading-7 text-[#6b6b66] max-w-xl">
            Kéo trực tiếp trên ảnh/video để tạo vùng. Tọa độ tỷ lệ (0–1), gửi
            kèm video ID.
          </p>
        </div>

        {/* ── Floating tab bar ── */}
        <div className="mb-8 inline-flex items-center gap-1 rounded-2xl bg-white p-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.02)] ring-1 ring-black/[0.04]">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer ${
                tab === t.id
                  ? "bg-[#3563e9] text-white shadow-[0_2px_8px_rgba(53,99,233,0.25)]"
                  : "text-[#6b6b66] hover:text-[#3563e9] hover:bg-[#3563e9]/5"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        {!imageUrl ? (
          <div className="rounded-3xl border border-dashed border-[#e5e4e1] bg-white p-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#f0efed]">
              <span className="text-2xl text-[#9a9a95]">◎</span>
            </div>
            <p className="text-lg font-semibold">Chưa có ảnh để đánh dấu</p>
            <p className="mt-2 text-sm text-[#9a9a95]">
              Mở app với{" "}
              <code className="rounded-lg bg-[#f0efed] px-2 py-1 font-mono text-xs text-[#6b6b66]">
                ?url=...&videoid=...&mode=watermark
              </code>
            </p>
          </div>
        ) : tab === "watermark" ? (
          <RegionSelector imageUrl={imageUrl} videoId={videoId} />
        ) : tab === "timeline" ? (
          <TimelineCheckTab videoId={videoId} baseUrl={baseUrl} />
        ) : tab === "voice" ? (
          <VoiceCheckTab videoId={videoId} baseUrl={baseUrl} />
        ) : tab === "ocr" ? (
          <OcrRegionSelector
            videoId={videoId}
            baseUrl={baseUrl}
            onConfirmed={(region, startTime) => {
              setOcrRegion(region);
              fetchWithSkip(`${baseUrl}/api/region/${videoId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ region, start_time: startTime }),
              }).then((r) => {
                if (r.ok) alert("Đã lưu vùng quét sub!");
              });
            }}
          />
        ) : (
          <SubtitlePreview
            videoId={videoId}
            baseUrl={baseUrl}
            region={ocrRegion || { x1: 0, y1: 0, x2: 1, y2: 1 }}
            onConfirmed={(style) => {
              fetchWithSkip(`${baseUrl}/api/style/${videoId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(style),
              }).then((r) => {
                if (r.ok) alert("Đã lưu kích thước & vị trí sub!");
              });
            }}
          />
        )}
      </div>
    </main>
  );
}
