export function generateColor() {
  return Math.floor(Math.random() * 16777215)
}

export function intToHexRgb(c: number | undefined) {
  return c ? '#' + (c & 0xffffff).toString(16).padStart(6, '0') : '#000000'
}

function decToHex(n: number) {
  return n.toString(16).padStart(2, '0')
}

export function hexId(length = 12) {
  const arr = new Uint8Array(length / 2)
  window.crypto.getRandomValues(arr)
  return Array.from(arr, decToHex).join('')
}

export function randomSeed() {
  return BigInt(Math.floor((Math.random() - 0.5) * 2 * Number.MAX_SAFE_INTEGER))
}

export function randomInt() {
  return Math.floor(Math.random() * 4294967296) - 2147483648
}
