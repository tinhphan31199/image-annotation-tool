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
