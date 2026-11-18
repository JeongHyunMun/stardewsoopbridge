import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleDonation } from './donation-handler.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(here, '../public');
// Central에 방송 닉네임을 알리는 데 쓴다. AgentToken은 이 서버에만 두고 브라우저로 보내지 않는다.
const centralUrl = (process.env.CENTRAL_SERVER_URL || '').trim().replace(/\/+$/, '');
const agentToken = (process.env.AGENT_TOKEN || '').trim();
const allowedOrigins = new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`]);

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

// 브라우저가 SOOP 채팅 접속(JOIN) 때 받은 본인 닉네임을 보내면 Central로 전달한다.
app.post('/profile', async (req, res) => {
  // 다른 사이트가 이 로컬 서버로 요청을 보내지 못하게 한다.
  const origin = req.get('origin');
  if (origin && !allowedOrigins.has(origin)) return res.status(403).json({ ok: false, error: '허용되지 않은 요청입니다.' });

  const soopId = typeof req.body?.soopId === 'string' ? req.body.soopId.trim() : '';
  const nickname = typeof req.body?.nickname === 'string' ? req.body.nickname.trim() : '';
  if (!soopId || soopId.length > 100 || !nickname || nickname.length > 60) {
    return res.status(400).json({ ok: false, error: 'soopId 또는 nickname이 올바르지 않습니다.' });
  }
  if (!centralUrl || !agentToken) {
    return res.json({ ok: true, forwarded: false, reason: '.env에 CENTRAL_SERVER_URL / AGENT_TOKEN이 없어 Central에 전달하지 않았습니다.' });
  }

  try {
    const response = await fetch(`${centralUrl}/api/agent/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Agent-Token': agentToken },
      body: JSON.stringify({ soopId, nickname }),
      signal: AbortSignal.timeout(5000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(502).json({ ok: false, error: data.error || `Central HTTP ${response.status}` });
    return res.json({ ok: true, forwarded: true, nickname: data.nickname });
  } catch (error) {
    console.error('[StardewSOOPBridge] Central 닉네임 전달 실패:', error?.message || error);
    return res.status(502).json({ ok: false, error: `Central에 연결하지 못했습니다: ${error?.message || error}` });
  }
});

app.listen(port, '127.0.0.1', () => {
  console.log(`[StardewSOOPBridge] http://127.0.0.1:${port}`);
  console.log(`[StardewSOOPBridge] health: http://127.0.0.1:${port}/health`);
  console.log('[StardewSOOPBridge] 스트리머가 자신의 SOOP 계정으로 인증/채팅 연결을 진행하세요.');
});
