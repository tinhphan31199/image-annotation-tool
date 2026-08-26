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

  // Timeline check tab
  "timeline.title": "Kiểm tra phụ đề",
  "timeline.instructions": "Rà soát thời gian xuất hiện từng dòng phụ đề. Chỉnh nội dung, dịch lại hoặc xóa dòng, rồi bấm Tiếp tục.",
  "timeline.issuesFound": "{count} lỗi timeline",
  "timeline.noIssues": "Không có lỗi timeline nào được báo",
  "timeline.checkRisk": "Kiểm tra rủi ro",
  "timeline.checking": "Đang kiểm tra…",
  "timeline.risksFound": "{count} dòng có rủi ro",
  "timeline.loadError": "Không tải được phụ đề",
  "timeline.save": "Lưu",
  "timeline.saving": "Đang lưu…",
  "timeline.continue": "Tiếp tục",
  "timeline.saved": "Đã lưu phụ đề",
  "timeline.continued": "Đã gửi tiếp tục — pipeline sẽ chạy tiếp",
  "timeline.reTranslate": "Dịch lại",
  "timeline.reTranslating": "Đang dịch…",
  "timeline.delete": "Xóa dòng",
  "timeline.editText": "Chỉnh sửa nội dung",
  "timeline.adjustTime": "Chỉnh thời gian",
  "timeline.start": "Bắt đầu",
  "timeline.end": "Kết thúc",

  // Voice check tab
  "voice.title": "Kiểm tra giọng đọc",
  "voice.instructions": "Nghe và chỉnh giọng đọc cho từng dòng phụ đề. Đổi giọng, tạo lại audio hoặc chỉnh tốc độ, rồi bấm Tiếp tục.",
  "voice.lines": "{count} dòng",
  "voice.checkAlignment": "Kiểm tra độ khớp",
  "voice.checkingAlignment": "Đang kiểm tra…",
  "voice.alignmentIssues": "{count} dòng audio dài hơn phụ đề",
  "voice.overshoot": "dài hơn {time}s",
  "voice.changeVoice": "Đổi giọng",
  "voice.regenerate": "Tạo lại",
  "voice.regenDone": "Đã tạo lại audio",
  "voice.bulkSwitch": "Đổi hàng loạt",
  "voice.searchVoice": "Tìm giọng đọc…",
  "voice.preview": "Nghe thử",
  "voice.selectVoice": "Chọn giọng cho dòng #{index}",
  "voice.fromVoice": "Từ giọng",
  "voice.toVoice": "Sang giọng",
  "voice.applyBulk": "Áp dụng",
  "voice.speed": "Tốc độ",
  "voice.loadError": "Không tải được voice map",
  "voice.continue": "Tiếp tục",
  "voice.saving": "Đang gửi…",
  "voice.continued": "Đã gửi tiếp tục — pipeline sẽ chạy tiếp",
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
