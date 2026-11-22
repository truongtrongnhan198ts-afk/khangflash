import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT_DIR = process.cwd();
const PORT = 4173;
const HOST = '127.0.0.1';
const OUT_DIR = path.join(ROOT_DIR, 'static-data');
const TOPICS_DIR = path.join(OUT_DIR, 'topics');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
};

function startStaticServer() {
  const server = http.createServer((req, res) => {
    try {
      const reqUrl = (req.url || '/').split('?')[0];
      let relPath = decodeURIComponent(reqUrl);
      if (relPath === '/') relPath = '/index.html';
      const filePath = path.resolve(ROOT_DIR, '.' + relPath);
      if (!filePath.startsWith(ROOT_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      let targetPath = filePath;
      if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
        targetPath = path.join(targetPath, 'index.html');
      }
      if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(targetPath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      fs.createReadStream(targetPath).pipe(res);
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(PORT, HOST, () => {
      console.log(`Static server listening at http://${HOST}:${PORT}`);
      resolve(server);
    });
  });
}

async function main() {
  const server = await startStaticServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.setDefaultTimeout(120000);

    await page.goto(`http://${HOST}:${PORT}/flashcards.html`, {
      waitUntil: 'domcontentloaded',
    });

    await page.waitForFunction(() => Boolean(window.__KF_BASE_MERGE_READY__), {
      timeout: 120000,
    });
    await page.evaluate(async () => {
      if (
        window.__KF_BASE_MERGE_READY__ &&
        typeof window.__KF_BASE_MERGE_READY__.then === 'function'
      ) {
        await window.__KF_BASE_MERGE_READY__;
      }
    });

    const DATA = await page.evaluate(async () => {
      const res = await fetch('/data.json');
      if (!res.ok) {
        throw new Error(`Failed to fetch /data.json: ${res.status} ${res.statusText}`);
      }
      return await res.json();
    });

    const topics = Array.isArray(DATA.topics) ? DATA.topics : [];
    const cards = Array.isArray(DATA.cards) ? DATA.cards : [];
    console.log(`Loaded ${cards.length} cards across ${topics.length} topics.`);

    fs.mkdirSync(TOPICS_DIR, { recursive: true });

    const manifestTopics = [];
    for (const topic of topics) {
      const topicId = String(topic.id);
      const topicCards = cards.filter((c) => {
        if (!c || typeof c !== 'object') return false;
        if (c.topic != null && String(c.topic) === topicId) return true;
        if (Array.isArray(c.topics) && c.topics.some((t) => String(t) === topicId)) return true;
        if (Array.isArray(c.sourceTopics) && c.sourceTopics.some((t) => String(t) === topicId)) return true;
        return false;
      });

      const outObj = {
        topics: DATA.topics,
        sources: DATA.sources,
        cardAliases: DATA.cardAliases || {},
        cards: topicCards,
      };
      const fileName = `${topicId}.json`;
      const outPath = path.join(TOPICS_DIR, fileName);
      fs.writeFileSync(outPath, JSON.stringify(outObj), 'utf8');

      manifestTopics.push({
        id: topic.id,
        name: topic.name || topic.title || topicId,
        count: topicCards.length,
        file: `static-data/topics/${fileName}`,
      });
      console.log(`Wrote ${fileName}: ${topicCards.length} cards`);
    }

    const manifest = {
      generatedAt: new Date().toISOString(),
      totalCards: cards.length,
      topicCount: topics.length,
      topics: manifestTopics,
    };
    fs.writeFileSync(
      path.join(OUT_DIR, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    );
    console.log('Wrote static-data/manifest.json');
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
