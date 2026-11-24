module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  return res.status(503).json({ error: 'Sao lưu dùng dữ liệu trên trình duyệt này. Tải lại trang để nạp bộ lưu trước khi thử lại.', storageUnavailable: true });
};
