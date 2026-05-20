// Ed25519 sign/verify via WebCrypto SubtleCrypto (Deno + browser compatible).
// Money flow 0 touch: used only for Provably-Fair v2 round signatures.

export type Ed25519Keypair = { publicKeyB64: string; privateKey: CryptoKey; publicKey: CryptoKey };

function b64encode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function generateEd25519(): Promise<Ed25519Keypair> {
  const kp = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]) as CryptoKeyPair;
  const raw = await crypto.subtle.exportKey("raw", kp.publicKey);
  return { publicKey: kp.publicKey, privateKey: kp.privateKey, publicKeyB64: b64encode(raw) };
}

export async function importEd25519Public(publicKeyB64: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey("raw", b64decode(publicKeyB64), "Ed25519", true, ["verify"]);
}

export async function signEd25519(privateKey: CryptoKey, message: string): Promise<string> {
  const sig = await crypto.subtle.sign("Ed25519", privateKey, new TextEncoder().encode(message));
  return b64encode(sig);
}

export async function verifyEd25519(publicKey: CryptoKey, message: string, signatureB64: string): Promise<boolean> {
  return await crypto.subtle.verify("Ed25519", publicKey, b64decode(signatureB64), new TextEncoder().encode(message));
}

/** Crash point derivation — house edge 1.0% (RTP 99%). */
export async function deriveCrashX(serverSeed: string, publicSeed: string, nonce: number): Promise<number> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${serverSeed}|${publicSeed}|${nonce}`));
  const view = new DataView(buf);
  // top 52 bits → [0,1)
  const hi = view.getUint32(0);
  const lo = view.getUint32(4);
  const u = (hi * 2 ** 20 + (lo >>> 12)) / 2 ** 52;
  if (u < 0.01) return 1.00; // 1% instant bust → 1.0% house edge
  const x = 0.99 / u;
  return Math.max(1.00, Math.min(10000, Math.floor(x * 100) / 100));
}

export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
