export interface Region {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface SubtitleStyle {
  font_size: number;
  margin_v: number;
  margin_h: number;
}

export function getVideoUrl(videoId: string, baseUrl?: string): string {
  const base = baseUrl || '';
  return `${base}/api/video/${videoId}`;
}

// ── SRT / Timeline check ──

export interface SrtEntry {
  index: number;
  start: number;
  end: number;
  startLabel: string;
  endLabel: string;
  text: string;
}

export interface TimelineIssue {
  index: number;
  type?: string;
  message?: string;
  [k: string]: unknown;
}

export interface SubtitleRisk {
  index: number;
  risk?: string;
  message?: string;
  [k: string]: unknown;
}

export interface JobStatus {
  job_id: string;
  status: string;
  phase?: string;
  progress?: number;
  error?: string | null;
}

function jbase(baseUrl?: string) {
  return (baseUrl || '').replace(/\/$/, '');
}

export async function getSrtEntries(videoId: string, baseUrl?: string): Promise<SrtEntry[]> {
  const res = await fetch(`${jbase(baseUrl)}/api/srt/${videoId}/entries`);
  if (!res.ok) throw new Error(`SRT HTTP ${res.status}`);
  const data = await res.json();
  return data.entries ?? [];
}

function secToSrt(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.round((sec - Math.floor(sec)) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export function entriesToSrt(entries: SrtEntry[]): string {
  return entries
    .map((e, i) => `${i + 1}\n${secToSrt(e.start)} --> ${secToSrt(e.end)}\n${e.text}\n`)
    .join('\n');
}

export async function updateSrt(videoId: string, entries: SrtEntry[], baseUrl?: string): Promise<void> {
  const res = await fetch(`${jbase(baseUrl)}/api/srt/${videoId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: entriesToSrt(entries) }),
  });
  if (!res.ok) throw new Error(`Save HTTP ${res.status}`);
}

export async function reTranslateLine(
  videoId: string,
  index: number,
  sourceLang = 'zh',
  targetLang = 'vi',
  baseUrl?: string,
): Promise<string> {
  const res = await fetch(`${jbase(baseUrl)}/api/srt/${videoId}/re-translate-line`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ index, source_lang: sourceLang, target_lang: targetLang }),
  });
  if (!res.ok) throw new Error(`Re-translate HTTP ${res.status}`);
  const data = await res.json();
  return data.text as string;
}

export async function startSrtRiskCheck(videoId: string, lang = 'vi', baseUrl?: string): Promise<string> {
  const res = await fetch(`${jbase(baseUrl)}/api/srt/${videoId}/risk-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lang }),
  });
  if (!res.ok) throw new Error(`Risk-check HTTP ${res.status}`);
  const data = await res.json();
  return data.job_id as string;
}

export async function getJobStatus(jobId: string, baseUrl?: string): Promise<JobStatus> {
  const res = await fetch(`${jbase(baseUrl)}/api/status/${jobId}`);
  if (!res.ok) throw new Error(`Status HTTP ${res.status}`);
  return res.json();
}

export async function getSrtRiskResult(videoId: string, baseUrl?: string): Promise<SubtitleRisk[]> {
  const res = await fetch(`${jbase(baseUrl)}/api/srt/${videoId}/risk-check`);
  if (!res.ok) throw new Error(`Risk result HTTP ${res.status}`);
  const data = await res.json();
  return data.risks ?? [];
}

// ── Pipeline state (timeline / voice review) ──

interface PipelineStateResp {
  timeline_check?: { waiting?: boolean; issues?: TimelineIssue[]; decision?: string | null };
  voice_check?: { waiting?: boolean; decision?: string | null };
}

export async function getPipelineState(videoId: string, baseUrl?: string): Promise<PipelineStateResp> {
  const res = await fetch(`${jbase(baseUrl)}/api/pipeline/${videoId}`);
  if (!res.ok) return {};
  return res.json();
}

export async function resolveTimelineReview(
  videoId: string,
  action: 'continue' | 'fix',
  baseUrl?: string,
): Promise<void> {
  await fetch(`${jbase(baseUrl)}/api/pipeline/${videoId}/timeline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
}

// ── Voice check ──

export interface CapCutVoice {
  voice_type: string;
  display_name: string;
  resource_id?: string;
  lang?: string;
  lan?: string;
}

export async function getCapCutVoices(lang = 'vi-VN', baseUrl?: string): Promise<CapCutVoice[]> {
  const res = await fetch(`${jbase(baseUrl)}/api/capcut/voices?lang=${encodeURIComponent(lang)}`);
  if (!res.ok) throw new Error(`Voices HTTP ${res.status}`);
  return res.json();
}

export interface VoiceMapLine {
  voice_type: string;
  [k: string]: unknown;
}

export interface VoiceMapDetail {
  map: Record<string, VoiceMapLine>;
}

export async function getVoiceMapDetail(videoId: string, lang = 'vi', baseUrl?: string): Promise<VoiceMapDetail> {
  const res = await fetch(`${jbase(baseUrl)}/api/voice-map/${videoId}?lang=${lang}`);
  if (!res.ok) throw new Error(`Voice-map HTTP ${res.status}`);
  return res.json();
}

export async function updateVoiceMapLine(
  videoId: string,
  index: number,
  voiceType: string,
  baseUrl?: string,
): Promise<void> {
  const res = await fetch(`${jbase(baseUrl)}/api/voice-map/${videoId}/line`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ index, voice_type: voiceType }),
  });
  if (!res.ok) throw new Error(`Update voice HTTP ${res.status}`);
}

export async function bulkSwitchVoice(
  videoId: string,
  fromVoice: string,
  toVoice: string,
  baseUrl?: string,
): Promise<{ job_id: string }> {
  const res = await fetch(`${jbase(baseUrl)}/api/voice-map/${videoId}/bulk-switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from_voice: fromVoice, to_voice: toVoice }),
  });
  if (!res.ok) throw new Error(`Bulk switch HTTP ${res.status}`);
  return res.json();
}

export async function regenerateTtsLine(
  videoId: string,
  index: number,
  voiceType: string,
  baseUrl?: string,
): Promise<void> {
  const res = await fetch(`${jbase(baseUrl)}/api/tts/${videoId}/regenerate-line`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ index, voice_type: voiceType }),
  });
  if (!res.ok) throw new Error(`Regen HTTP ${res.status}`);
}

export async function setTtsSpeed(
  videoId: string,
  index: number,
  speed: number,
  baseUrl?: string,
): Promise<{ new_duration: number }> {
  const res = await fetch(`${jbase(baseUrl)}/api/tts/${videoId}/set-speed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ index, speed }),
  });
  if (!res.ok) throw new Error(`Speed HTTP ${res.status}`);
  return res.json();
}

export interface AlignmentIssue {
  index: number;
  text: string;
  start: number;
  end: number;
  srt_duration: number;
  audio_duration: number;
  overshoot: number;
  voice_type: string;
  display_name: string;
}

export async function checkTtsAlignment(
  videoId: string,
  lang = 'vi',
  baseUrl?: string,
): Promise<AlignmentIssue[]> {
  const res = await fetch(`${jbase(baseUrl)}/api/tts/${videoId}/check-alignment?lang=${lang}`);
  if (!res.ok) throw new Error(`Alignment HTTP ${res.status}`);
  const data = await res.json();
  return data.issues ?? [];
}

export function getTtsAudioUrl(videoId: string, index: number, baseUrl?: string): string {
  return `${jbase(baseUrl)}/api/tts/${videoId}/audio/${index}`;
}
