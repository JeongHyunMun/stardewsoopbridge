import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleDonation } from './donation-handler.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(here, '../public');

app.use(express.json({ limit: '64kb' }));
app.use(express.static(publicDir));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'StardewSOOPBridge',
    configured: Boolean(process.env.SOOP_CLIENT_ID && process.env.SOOP_CLIENT_SECRET && process.env.STARDEW_BRIDGE_TOKEN)
  });
});

// This scaffold is intended to run locally on each streamer's PC.
// The browser SDK performs that streamer's own login; no fixed streamer ID is needed.
app.get('/config', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    clientId: process.env.SOOP_CLIENT_ID || '',
    clientSecret: process.env.SOOP_CLIENT_SECRET || ''
  });
});

app.get('/oauth/callback', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.post('/event', async (req, res) => {
  try {
    const body = req.body || {};
    const balloons = Number(body.balloons);
    const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';
    const soopId = typeof body.soopId === 'string' ? body.soopId.trim() : '';

    if (!eventId || eventId.length > 200) return res.status(400).json({ ok: false, error: 'eventId가 없거나 올바르지 않습니다.' });
    if (!soopId || soopId.length > 100) return res.status(400).json({ ok: false, error: 'SOOP 방송 ID(bjId)가 없거나 올바르지 않습니다.' });
    if (!Number.isSafeInteger(balloons) || balloons <= 0) return res.status(400).json({ ok: false, error: 'balloons는 양의 정수여야 합니다.' });

    const result = await handleDonation({ eventId, soopId, balloons });
    return res.json({ ok: true, forwarded: true, soopId, balloons, result });
  } catch (error) {
    console.error('[StardewSOOPBridge] 후원 이벤트 처리 실패:', error?.message || error);
    return res.status(502).json({ ok: false, error: error?.message || '후원 이벤트 전달에 실패했습니다.' });
  }
});

app.listen(port, '127.0.0.1', () => {
  console.log(`[StardewSOOPBridge] http://127.0.0.1:${port}`);
  console.log(`[StardewSOOPBridge] health: http://127.0.0.1:${port}/health`);
  console.log('[StardewSOOPBridge] 스트리머가 자신의 SOOP 계정으로 인증/채팅 연결을 진행하세요.');
});
