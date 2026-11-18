import { forwardDonationToStardew } from './stardew-client.js';

/** Receives a normalized BALLOON_GIFTED event from src/soop-client.js. */
export async function handleDonation(donation) {
  if (!donation || typeof donation.eventId !== 'string' || !donation.eventId.trim()) {
    throw new Error('eventId가 필요합니다.');
  }
  if (typeof donation.soopId !== 'string' || !donation.soopId.trim()) {
    throw new Error('soopId가 필요합니다.');
  }
  if (!Number.isSafeInteger(donation.balloons) || donation.balloons <= 0) {
    throw new Error('balloons는 양의 정수여야 합니다.');
  }
  return forwardDonationToStardew(donation);
}
