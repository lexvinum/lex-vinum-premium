import "server-only";

const encoder = new TextEncoder();

async function sha256(input: string) {
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(hashBuffer).toString("hex");
}

export async function createAdminToken() {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SECRET;

  if (!password || !secret) {
    throw new Error("ADMIN_PASSWORD ou ADMIN_SECRET manquant dans .env");
  }

  return sha256(`${password}:${secret}`);
}

export async function isValidAdminToken(token?: string | null) {
  if (!token) return false;

  const expected = await createAdminToken();
  return token === expected;
}

export async function isValidAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error("ADMIN_PASSWORD manquant dans .env");
  }

  return password === expected;
}