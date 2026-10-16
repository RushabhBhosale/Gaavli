import { SignJWT, jwtVerify } from "jose";
export const COOKIE = "gaavli_admin";
function key() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("JWT_SECRET must contain at least 32 characters");
  return new TextEncoder().encode(secret);
}
export async function signToken(
  adminId: string,
  sessionId: string,
  seconds: number,
) {
  return new SignJWT({ role: "super_admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(adminId)
    .setJti(sessionId)
    .setIssuer("gaavli-admin")
    .setAudience("gaavli-admin-panel")
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + seconds)
    .sign(key());
}
export async function verifyToken(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), {
      algorithms: ["HS256"],
      issuer: "gaavli-admin",
      audience: "gaavli-admin-panel",
    });
    if (
      payload.role !== "super_admin" ||
      !payload.sub ||
      !payload.jti ||
      !/^[a-f\d]{24}$/i.test(payload.sub) ||
      !/^[a-f\d]{24}$/i.test(payload.jti)
    )
      return null;
    return { adminId: payload.sub, sessionId: payload.jti };
  } catch {
    return null;
  }
}
