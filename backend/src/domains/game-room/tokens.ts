import { sign } from "../../utils/hmac/sign.js";
import { verify } from "../../utils/hmac/verify.js";

export interface RoomTokenPayload {
  roomId: string;
  userId: string;
  playerId: string;
}

export function createRoomToken(
  roomId: string,
  userId: string,
  playerId: string,
  secret: string,
): string {
  return sign(`${roomId}@${userId}@${playerId}`, secret);
}

export function verifyRoomToken(
  token: string,
  secret: string,
): RoomTokenPayload | null {
  const payload = verify(token, secret);
  if (!payload) {
    return null;
  }

  const [roomId, userId, playerId] = payload.split("@");
  if (!roomId || !userId || !playerId) {
    return null;
  }

  return { roomId, userId, playerId };
}
