// Progress is persisted by local-api-shim.js on this standalone deployment.
// This endpoint has no database: never acknowledge a write or return an empty authoritative snapshot.
module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(503).json({ error: 'Bộ lưu tiến độ chưa được nạp. Tải lại trang để cập nhật; bản tạm trên thiết bị vẫn được giữ.', storageUnavailable: true });
};
