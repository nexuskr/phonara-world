/**
 * Phase 2 PF v2 — Stake-compatible HMAC-SHA256 byte stream → floats / ints.
 * Used (Phase 3+) to derive deterministic game outcomes from
 * (serverSeed, clientSeed, nonce, cursor).
 */
import { hmacSha256Hex } from "./crypto";

/** Async byte generator. 32 bytes per HMAC block; cursor increments per block. */
export async function* byteStream(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): AsyncGenerator<number, never, void> {
  let cursor = 0;
  while (true) {
    const hex = await hmacSha256Hex(serverSeed, `${clientSeed}:${nonce}:${cursor}`);
    for (let i = 0; i < hex.length; i += 2) {
      yield parseInt(hex.slice(i, i + 2), 16);
    }
    cursor += 1;
  }
}

/** Next float in [0,1) consuming 4 bytes (Stake convention). */
export async function nextFloat(gen: AsyncGenerator<number, never, void>): Promise<number> {
  let result = 0;
  for (let i = 0; i < 4; i++) {
    const byte = (await gen.next()).value;
    result = result * 256 + byte;
  }
  return result / 256 ** 4;
}

/** Next integer in [0, max). */
export async function nextInt(
  gen: AsyncGenerator<number, never, void>,
  max: number,
): Promise<number> {
  return Math.floor((await nextFloat(gen)) * max);
}

/** One-shot helper. */
export async function derivedFloats(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  count: number,
): Promise<number[]> {
  const gen = byteStream(serverSeed, clientSeed, nonce);
  const out: number[] = new Array(count);
  for (let i = 0; i < count; i++) out[i] = await nextFloat(gen);
  return out;
}
