# KhangFlash — IELTS Speaking AI Examiner V3 (Deep Grading + Retry Drill + Coach Chat)

## Có gì mới ở V3?
Dùng chung 1 endpoint `/api/ielts-speaking` và 1 biến `GEMINI_API_KEY` ($0):
1. **Chấm sâu V2 (`action: "evaluate"` — mặc định):** 4 tiêu chí tách Điểm mạnh / Điểm kéo band / Cách lên +0.5, đo WPM & filler words, sửa IPA, 2 bài mẫu Band 7.5 & 8.5.
2. **Luyện nói lại từng câu lỗi (`action: "retry_drill"`):** Nút **🎙 Nói lại câu này** ngay dưới từng câu sửa lỗi -> thu âm lại đúng câu đó -> AI nghe và chấm Đạt/Chưa đạt (thang 10) ngay tại chỗ.
3. **Chat 2 chiều với Giám Khảo AI (`action: "chat"`):** Khung chat ngay dưới bảng điểm (kèm 4 nút hỏi nhanh), tự động nhớ transcript và điểm vừa chấm để bạn hỏi vặn lại thoải mái như đang luyện 1-1.

## Cập nhật lên GitHub & Vercel (2 phút)
1. Ghi đè backend tương ứng:
   - Next.js App Router: `app/api/ielts-speaking/route.js`
   - Vite / React / Pages Router: `api/ielts-speaking.js`
2. Copy `components/IeltsSpeakingFeedbackV3.jsx` vào thư mục `components/` và dùng thay cho bản cũ:
   ```jsx
   <IeltsSpeakingFeedbackV3
     data={result}
     question={currentQuestion}
     onUseFollowup={(q) => setCurrentQuestion(q)}
   />
   ```
3. Push lên GitHub:
   ```bash
   git add .
   git commit -m "feat: upgrade IELTS speaking to V3 with retry drill and coach chat"
   git push origin main
   ```
