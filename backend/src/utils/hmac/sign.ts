import crypto from "node:crypto";


export function sign(id: string, secret: string): string {
  const payload = Buffer.from(id).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(id).digest("hex");
  return `${payload}.${sig}`;
}
