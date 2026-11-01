// Та же формула, что в fair.ts, но через Web Crypto — для проверки результатов прямо в браузере.
const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

export async function sha256Web(s: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
}

export async function rollWeb(serverSeed: string, clientSeed: string, nonce: number | string, cursor = 0): Promise<number> {
  const key = await crypto.subtle.importKey('raw', enc.encode(serverSeed), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = hex(await crypto.subtle.sign('HMAC', key, enc.encode(`${clientSeed}:${nonce}:${cursor}`)));
  return parseInt(sig.slice(0, 13), 16) / 2 ** 52;
}
