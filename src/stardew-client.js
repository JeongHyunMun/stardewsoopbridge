import 'dotenv/config';

const endpoint = process.env.STARDEW_BRIDGE_URL || 'http://127.0.0.1:8765/event';
const token = process.env.STARDEW_BRIDGE_TOKEN;

/** Sends normalized donation data to the SMAPI HTTP receiver. */
export async function forwardDonationToStardew({ eventId, soopId, balloons }) {
  if (!token) throw new Error('STARDEW_BRIDGE_TOKEN이 .env에 설정되지 않았습니다.');
  if (!soopId || typeof soopId !== 'string') throw new Error('SOOP 방송 ID(bjId)가 필요합니다.');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-SOOP-Token': token
    },
    body: JSON.stringify({ eventId, soopId, balloons }),
    signal: AbortSignal.timeout(5000)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`SMAPI 전달 실패: HTTP ${response.status}${detail ? ` - ${detail.slice(0, 250)}` : ''}`);
  }

  return { ok: true, status: response.status };
}
