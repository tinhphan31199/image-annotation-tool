"use client";

import { useCallback } from "react";

const strings: Record<string, string> = {
  "videoplayer.play": "Phát",
  "videoplayer.pause": "Tạm dừng",
  "region.instructions": "Kéo trên video để khoanh vùng phụ đề cần trích xuất. Dùng 8 tay cầm để chỉnh sửa chính xác.",
  "region.play": "Phát/Tạm dừng",
  "region.confirm": "Xác nhận",
  "region.capture": "Đặt lại tại vị trí",
  "region.startTime": "Thời gian bắt đầu",
  "region.useCurrentTime": "Dùng thời gian hiện tại",
  "region.seconds": "giây",
  "region.ocrStartFrom": "OCR sẽ bắt đầu từ {time}s",
  "region.extract": "Trích xuất",
  "preview.helpDesc1": "Kéo trên video để di chuyển vị trí phụ đề.",
  "preview.confirmAction": "Nhấn Xác nhận",
  "preview.helpDesc2": "khi hoàn tất.",
  "preview.confirmShort": "Xác nhận",
  "preview.fontSize": "Cỡ chữ",
  "preview.marginV": "Khoảng cách dọc",
  "preview.marginH": "Khoảng cách ngang",
  "preview.sampleText": "Mẫu phụ đề",
  "preview.overlayAlt": "Xem trước phụ đề",
  "preview.dragHint": "Kéo để di chuyển",
  "preview.previewFailed": "Không thể tạo xem trước",
  "preview.confirm": "Xác nhận",
  "pipeline.removeWatermarkDrawHint": "Kéo trên video để khoanh vùng watermark cần xoá. Có thể tạo nhiều vùng.",
  "pipeline.removeWatermarkRedraw": "Vẽ lại",
  "pipeline.removeWatermarkAdd": "Thêm vùng",
  "pipeline.removeWatermarkClearAll": "Xoá hết",
  "pipeline.removeWatermarkConfirm": "Xác nhận",
};

export function useI18n() {
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      let value = strings[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(`{${k}}`, String(v));
        }
      }
      return value;
    },
    []
  );
  return { t };
}
