const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const SALT = 0x5a3f1e7d

function toBytes(n: number): number[] {
  const bytes: number[] = []
  while (n > 0) {
    bytes.push(n & 0xff)
    n >>>= 8
  }
  if (bytes.length === 0) bytes.push(0)
  return bytes
}

function fromBytes(bytes: number[]): number {
  let n = 0
  for (let i = bytes.length - 1; i >= 0; i--) {
    n = (n << 8) | bytes[i]
  }
  return n >>> 0
}

export function encodePlanId(planId: number): string {
  const bytes = toBytes(planId)
  // XOR each byte with salt-derived bytes (deterministic)
  const xored = bytes.map((b, i) => b ^ ((SALT >>> ((i % 4) * 8)) & 0xff))
  // Add a random-looking prefix based on checksum
  const checksum = bytes.reduce((a, b) => a ^ b, 0) & 0x3f
  const prefix = ALPHABET[checksum]
  // Encode xored bytes to our alphabet (6 bits per char, base64-like)
  let result = ''
  let buffer = 0
  let bitsInBuffer = 0
  for (const b of xored) {
    buffer = (buffer << 8) | b
    bitsInBuffer += 8
    while (bitsInBuffer >= 6) {
      bitsInBuffer -= 6
      result += ALPHABET[(buffer >>> bitsInBuffer) & 0x3f]
    }
  }
  if (bitsInBuffer > 0) {
    result += ALPHABET[(buffer << (6 - bitsInBuffer)) & 0x3f]
  }
  return prefix + result
}

export function decodeShareCode(code: string): number | null {
  try {
    if (code.length < 2) return null
    const checksumChar = code[0]
    const payload = code.slice(1)
    // Decode from alphabet
    const xored: number[] = []
    let buffer = 0
    let bitsInBuffer = 0
    for (const ch of payload) {
      const val = ALPHABET.indexOf(ch)
      if (val === -1) return null
      buffer = (buffer << 6) | val
      bitsInBuffer += 6
      if (bitsInBuffer >= 8) {
        bitsInBuffer -= 8
        xored.push((buffer >>> bitsInBuffer) & 0xff)
      }
    }
    // Reverse XOR
    const bytes = xored.map((b, i) => b ^ ((SALT >>> ((i % 4) * 8)) & 0xff))
    const planId = fromBytes(bytes)
    // Verify checksum
    const origBytes = toBytes(planId)
    const expectedChecksum = origBytes.reduce((a, b) => a ^ b, 0) & 0x3f
    if (ALPHABET[expectedChecksum] !== checksumChar) return null
    return planId
  } catch {
    return null
  }
}
