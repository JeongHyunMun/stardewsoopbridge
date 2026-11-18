import { randomUUID } from 'node:crypto';

/**
 * Connects an already-created official SOOP ChatSDK instance.
 * The SDK package/import is intentionally not guessed; create the instance using
 * the official SOOP Getting Started/OAuth instructions, then pass it here.
 */
export function createSoopClient(
  chatSdk,
  { onStatus = () => {}, onError = () => {}, onDonation = async () => {} } = {}
) {
  if (!chatSdk) throw new Error('ChatSDK 인스턴스가 필요합니다.');

  let connected = false;
  let roomInfo = null;

  if (typeof chatSdk.handleChatClosed === 'function') {
    chatSdk.handleChatClosed(() => {
      connected = false;
      roomInfo = null;
      onStatus({ state: 'disconnected', message: 'SOOP 채팅 연결이 종료되었습니다.' });
    });
  }

  if (typeof chatSdk.handleError === 'function') {
    chatSdk.handleError((code, message) => {
      onError({ code: String(code), message: String(message) });
      onStatus({ state: 'error', message: `SOOP SDK 오류 (${code}): ${message}` });
    });
  }

  if (typeof chatSdk.handleMessageReceived === 'function') {
    chatSdk.handleMessageReceived((action, message) => {
      if (action !== 'BALLOON_GIFTED') return;

      const balloons = Number(message?.count);
      const soopId = String(message?.bjId || '').trim();
      if (!Number.isSafeInteger(balloons) || balloons <= 0 || !soopId) {
        onError({
          code: 'INVALID_BALLOON_EVENT',
          message: '별풍선 이벤트에 유효한 count 또는 bjId가 없습니다.',
          payload: message
        });
        return;
      }

      // The documented payload has no unique donation-event ID. This UUID
      // prevents accidental duplicate handling within this received callback,
      // but cannot guarantee deduplication if SOOP replays the same event.
      const donation = {
        eventId: randomUUID(),
        soopId,
        balloons,
        userId: message?.userId ? String(message.userId) : '',
        userNickname: message?.userNickname ? String(message.userNickname) : ''
      };

      Promise.resolve(onDonation(donation)).catch((error) => {
        onError({ code: 'DONATION_FORWARD_FAILED', message: error?.message || String(error) });
      });
    });
  } else {
    throw new Error('현재 SDK 인스턴스에 handleMessageReceived(callback)가 없습니다.');
  }

  return {
    async connect() {
      onStatus({ state: 'connecting', message: 'SOOP 채팅 서버에 연결 중입니다.' });
      await chatSdk.connect();
      roomInfo = typeof chatSdk.getRoomInfo === 'function' ? await chatSdk.getRoomInfo() : null;
      connected = true;
      onStatus({
        state: 'connected',
        message: 'SOOP 채팅 서버에 연결되었습니다.',
        roomInfo: { chatNumber: roomInfo?.chatNumber ?? null, bjId: roomInfo?.bjId ?? null }
      });
      return roomInfo;
    },
    async disconnect() {
      await chatSdk.disconnect();
      connected = false;
      roomInfo = null;
      onStatus({ state: 'disconnected', message: 'SOOP 채팅 연결을 해제했습니다.' });
    },
    getStatus() {
      return {
        connected,
        roomInfo: roomInfo
          ? { chatNumber: roomInfo.chatNumber ?? null, bjId: roomInfo.bjId ?? null }
          : null
      };
    }
  };
}
