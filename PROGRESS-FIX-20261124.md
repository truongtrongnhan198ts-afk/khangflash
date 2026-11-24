# Sửa lưu tiến độ KhangFlash — 24/11/2026

## Phạm vi và nguyên nhân
Bản gốc: `1c09cc15a186bf07b1b11e20294a8f1ba01ab40c`.
Đã đối chiếu các file chính với production: giống nhau byte-for-byte. Console trình duyệt production báo `SyntaxError: Unexpected token ':'` tại local-api-shim.js.
Chi tiết file/hàm/dòng **trước khi vá** nằm trong `tests/progress-investigation.md`.

- `local-api-shim.js:112`: ký tự thừa sau computeRatingPlans làm toàn file không chạy. Đã bỏ đúng phần thừa; giữ nguyên công thức FSRS.
- `api/study.js` và `api/practice.js`: API dự phòng trả 200 nhưng không ghi dữ liệu, GET trả rỗng. Đã đổi thành lỗi rõ ràng nếu lớp lưu local chưa hoạt động, tránh xóa cache hoặc xác nhận nhầm hàng đợi.
- Lớp local cũ nuốt lỗi localStorage, không lưu lịch sử lượt ôn và không chống áp dụng lại event_id. Đã sửa lỗi ghi phải được trả về; giữ hàng đợi; bổ sung lịch sử/hoạt động và chống ghi trùng.
- `store.js:19`: bản cache trả về trước khi đọc/khôi phục hoàn tất. Đã chờ khôi phục để trang lịch không tính trên bản cũ; giữ cache khi bộ lưu không hoạt động.
- `live-override-custom.js`: chỉ vô hiệu các đường sửa tiến độ V5/V6 có thể xóa hàng đợi/ghi đè FSRS/trả thành công giả khi lớp lưu chính đang hoạt động. Các tính năng khác của file được giữ nguyên.
- `news.js`: bản cũ không lưu URL/ngày đọc/metadata đủ để dựng lịch sử. Đã bổ sung metadata, danh sách Bài báo đã đọc, phục hồi từ dấu `knews-read:<URL>` còn tồn tại và trạng thái hoàn thành Đọc báo trên lịch.
- Khám phá: handler thiếu accountKey và revision trả về; đã sửa hợp đồng này và chặn ghi đè revision cũ.
- Ghi chú báo: thiếu route `/api/news/notebook` và danh sách articles trong `/api/practice/notebook`; đã bổ sung vào kho local có sẵn.
- Ngữ pháp/đọc hiểu: question rows thiếu các trường client đọc sau reload; đã bổ sung round-trip và chống áp dụng trùng attempt ID.
- Cache bộ từ: resolver bỏ qua Promise nếu cờ DONE đã được hook bật trước; đã bỏ guard thừa để `/due` không đứng tải trên cache nóng.

## Dữ liệu cũ
Giữ nguyên các key `kf_vercel_study_v1`, `kf_vercel_practice_v1`, `kf_vercel_knowledge_v1`, `kf_vercel_notebook_v1`, `kf_vercel_plan_v1`.
Phục hồi một lần từ `kf_kstore_fast_v1` và `kf_local_srs_backup_v5`; không xóa các nguồn phục hồi. Không đọc cache có accountKey khác. Không xóa outbox IndexedDB `tidian-pending-reviews-v1` hay bản localStorage dự phòng của nó.
Dữ liệu JSON lỗi được giữ nguyên và trả lỗi, không thay bằng kho rỗng.

Đây là cơ chế lưu bền vững trên cùng trình duyệt/thiết bị của bản standalone. Không thêm máy chủ cơ sở dữ liệu hay đồng bộ giữa các thiết bị. Không thể tái tạo dữ liệu từng bị API cũ xác nhận nhưng chưa bao giờ ghi, nếu không còn cache/outbox/backup.

## Kiểm thử đã thực hiện
### Thao tác thật trong trình duyệt trên bản preview, dùng dữ liệu thử riêng
- Đọc báo: bấm Đánh dấu đã đọc → reload → vẫn ✓ Đã đọc, danh sách còn 1 bài, có tên, URL và ngày đọc 2026-11-24.
- Lưu ghi chú báo và từ `foreign workers` → reload → mở lại bài → ghi chú và nghĩa còn nguyên.
- Flashcard: chấm Nhớ và Quên/Cần ôn trên các thẻ thật của thư viện → reload. Kiểm chứng bản lưu có status/reps/interval/due/fsrs_d/fsrs_s. Thẻ Nhớ giữ due 27/11, thẻ Quên giữ due 25/11.
- Học hai thẻ thuộc ngày 1 → mở Lịch học → Flashcard hiển thị `2/791 từ hôm nay`; Đọc báo hiển thị ✓ Đã xong. Cả 8 checkbox vẫn có trên trang.
- `/due`: tải xong với cache nóng, 0 thẻ đến hạn hôm nay là đúng vì các thẻ thử có hạn 25/11 và 27/11; tab Đã nhớ hiển thị `higher education`, `primary education`.
- Khám phá `recall`: đánh dấu đã đọc, lưu từ và ghi chú → reload → cả ba còn nguyên.

Feed báo trong preview là fixture kiểm thử; không thay đổi nguồn tin hoặc dữ liệu production. Fixture và trang kiểm chứng chỉ đọc không được đóng gói/commit.

### Kiểm thử mã
13 kiểm thử tự động đều qua: FSRS và due sau reload, idempotent event/attempt, bản tạm khi quota lỗi, phục hồi cache/backup, account mismatch, Request body, practice checkpoint Writing, vị trí podcast, Khám phá, ghi chú báo và sổ từ, revision conflict, kế hoạch API, JSON lỗi, lỗi listener UI và chốt cache.

Chạy lại (Node 24+):
```sh
npm install --no-save --package-lock=false linkedom@0.18.15 fake-indexeddb@6.2.8
node --test tests/progress-persistence.test.cjs
```
Các bài kiểm thử dùng kho giả riêng, không truy cập dữ liệu học của người dùng.

Đã kiểm tra cú pháp JavaScript và `git diff --check`.

## Các phần giữ nguyên
So hash trước/sau: `voice.js`, `schedule-clean.js`, `full-plan.js`, `noun-countability.js` không thay đổi byte nào. Công thức computeRatingPlans giữ nguyên; chỉ loại bỏ đoạn cú pháp hỏng nằm sau hàm. Vì thế không thay các giọng Kokoro/Microsoft, 8 checkbox, nút đổi band/phân bổ lại và thuật toán Thematic, hay nhãn Countable/Uncountable.

## Triển khai
Thay các file trong ZIP đúng đường dẫn, gồm thư mục `api/`, rồi commit vào nhánh Vercel đang theo dõi. Các HTML đã tăng cache-bust cho mã liên quan và loader live-override đã tăng version custom script.
Không xóa dữ liệu trang, localStorage hoặc IndexedDB khi cập nhật, để giữ và phục hồi tiến độ cũ.
Sau deploy, dùng chính trình duyệt đã học để thử lại Đọc báo → reload → Lịch học, Flashcard → reload → Lịch học → /due.

## Hoàn tác
Revert commit này. Không cần xóa dữ liệu tiến độ. Bản cũ có lỗi xác nhận lưu giả nên chỉ hoàn tác nếu thật sự cần, giữ bản backup/outbox hiện có.
