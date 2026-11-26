# KhangFlash — IELTS Speaking AI Examiner (Vercel $0 Deploy)

## Trong file ZIP này có gì?
- `api/ielts-speaking.js` — Backend Vercel Serverless Function (dùng cho Vite / React / HTML / Next.js Pages Router).
- `app/api/ielts-speaking/route.js` — Backend Next.js App Router (dùng nếu repo có thư mục `app/`).
- `components/IeltsSpeakingExaminer.jsx` — Component React hoàn chỉnh (ghi âm, timer Part 1/2/3, giọng giám khảo, chấm 4 tiêu chí + transcript + sửa lỗi).
- `public/ielts-speaking-standalone.html` — Bản HTML độc lập (nhúng iframe hoặc chạy thẳng).

## 3 bước deploy lên GitHub + Vercel ($0)

### Bước 1: Copy file vào repo `khangflash`
- **Nếu repo dùng Next.js App Router (có thư mục `app/` hoặc `src/app/`):**
  Copy `app/api/ielts-speaking/route.js` vào đúng `app/api/ielts-speaking/route.js` (hoặc `src/app/api/ielts-speaking/route.js`). Xoá file `api/ielts-speaking.js` để tránh trùng route.
- **Nếu repo dùng Vite / React / Next.js Pages Router:**
  Copy `api/ielts-speaking.js` vào thư mục gốc `api/ielts-speaking.js`.
- **Gắn UI vào trang `/ielts-speaking`:**
  Copy `components/IeltsSpeakingExaminer.jsx` vào thư mục `components/` rồi import `<IeltsSpeakingExaminer />` vào trang `/ielts-speaking` của bạn (hoặc gọi thẳng `POST /api/ielts-speaking` từ giao diện Speaking hiện tại của bạn).

### Bước 2: Thêm Gemini API Key (miễn phí) trên Vercel
1. Lấy key miễn phí tại https://aistudio.google.com/apikey
2. Vào **Vercel Dashboard -> Project `khangflash` -> Settings -> Environment Variables**
3. Thêm biến:
   - Key: `GEMINI_API_KEY`
   - Value: `<key-cua-ban>`

### Bước 3: Push lên GitHub
```bash
git add .
git commit -m "feat: add IELTS Speaking AI examiner backend and UI"
git push origin main
```
Vercel sẽ tự động build và deploy.
