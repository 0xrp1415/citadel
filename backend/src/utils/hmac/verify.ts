import crypto from "node:crypto";

export function verify(token: string, secret: string): string | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const id = Buffer.from(payload, "base64url").toString();
  const expected = crypto.createHmac("sha256", secret).update(id).digest("hex");
  
  return crypto.timingSafeEqual(
    Buffer.from(sig, "hex"),
    Buffer.from(expected, "hex"),
  )
    ? id
    : null;
}
