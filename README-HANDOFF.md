# KhangFlash · Bộ File Bàn Giao Cây Kiến Thức 360° (Handoff Kit)

## 1. Các file trong gói ZIP
- `khangflash-tree-ui-mockup.html`: Bản mẫu tương tác hoàn chỉnh (mở trực tiếp trên trình duyệt, chứa sẵn 1.060 thẻ thật bộ *Daily Routine & Time Management*).
- `daily-routine-1060-cards.json`: Dữ liệu JSON sạch của 1.060 thẻ (schema chuẩn của KhangFlash).
- `local-api-shim.js` & `live-override.js`: 2 file hook hiện tại của KhangFlash (đã hợp nhất 42 bộ thẻ, ~60.000 từ, 0 trùng lặp).

## 2. Yêu cầu thiết kế & Tích hợp vào KhangFlash
- **Điểm gắn nút (không làm rối Sidebar trái):**
  - Trên `/flashcards`: gắn 1 nút nhỏ `🌿 Cây` ở góc trên-phải mỗi thẻ `.deck-grid a.deck` (đọc `topic` từ `?topic=<id>`).
  - Trên `/flashcard.html`: gắn 1 nút `🌿 Cây từ vựng` trên thanh tiêu đề (`.study-topline` / `.panel-heading`).
  - Bấm vào mở **Modal Overlay toàn màn hình** (`Esc` để đóng và quay lại đúng vị trí cũ), có dropdown đổi nhanh giữa cả 42 bộ.
- **Phong cách đồng bộ KhangFlash:**
  - Nền tối `#0d1117`, thanh công cụ `#111722` cố định **1 dòng mảnh (52px)** để không che node.
  - Thanh **Dock Example & Audio** tách rời cố định ở cạnh đáy (`min-height: 82px`) để **0% đè lên nhánh/lá** ở mọi kích thước màn hình.
  - Bảng màu pastel dịu mắt (`#6ee7b7`, `#67e8f9`, `#fda4af`, `#5eead4`, `#fdba74`, `#fde047`, `#93c5fd`, `#c4b5fd`).
- **Trải nghiệm tương tác:**
  - Vòng tròn 360° 8 nhánh thuần nghĩa (7 nhánh chính + 1 nhánh mở rộng) → Cột từ lõi (tối đa 8 cụm/trang, tự phân trang cho bộ 3.100 từ) → Cột lá (tối đa 26 lá/chùm lõi, tự xuống 2 dòng **không cắt `...`**).
  - Cơ chế **Rê êm 220ms** chống nhảy nhầm khi lướt ngang qua nhánh khác + nút gạt sang **Click đổi nhánh**, kèm **Zoom cuộn chuột & Kéo thả**.
- **Kết nối dữ liệu thật trên KhangFlash:**
  - Đọc `/data.json` (đã qua `local-api-shim.js` + `live-override.js`).
  - Đọc tiến độ SRS từ `window.KStore.load()` (`state.progress[cardId]`) để tô chấm xanh lá đã thuộc.
  - Phát âm ưu tiên `window.KVoice.speak(text)`, fallback `window.speechSynthesis`.
