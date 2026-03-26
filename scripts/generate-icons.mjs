/**
 * Generates the PWA icon PNGs using only Node.js built-ins (no extra packages).
 * Writes: public/icon-192.png, public/icon-512.png, public/apple-touch-icon.png
 *
 * Run once with: node scripts/generate-icons.mjs
 */
import { createWriteStream, mkdirSync } from 'fs'
import { deflateSync } from 'zlib'

// ── Minimal PNG encoder ───────────────────────────────────────────────────────

function crc32(buf) {
  let crc = 0xffffffff
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1
    table[i] = c
  }
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crcInput = Buffer.concat([typeBytes, data])
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(crcInput))
  return Buffer.concat([len, typeBytes, data, crcBuf])
}

/**
 * Generates a rounded-rect wine-scanner icon as a PNG Buffer.
 * Background: #7f1d1d (deep red). Foreground: white wine glass + stem.
 */
function generateIconPng(size) {
  // Draw into a flat RGBA pixel buffer
  const buf = new Uint8ClampedArray(size * size * 4)

  const cx = size / 2
  const radius = size * 0.22  // corner radius as fraction
  const r = 0x7f, g = 0x1d, b = 0x1d  // #7f1d1d

  // Helper: is (px, py) inside a rounded rectangle?
  function inRoundedRect(px, py) {
    const rx = radius, ry = radius
    const left = rx, right = size - rx
    const top = ry, bottom = size - ry
    if (px >= left && px <= right) return true
    if (py >= top && py <= bottom) return true
    const dx = Math.min(Math.abs(px - left), Math.abs(px - right))
    const dy = Math.min(Math.abs(py - top), Math.abs(py - bottom))
    return px >= left && px <= right
      ? py >= top && py <= bottom
      : (px < left ? (px - left) ** 2 : (px - right) ** 2) +
        (py < top  ? (py - top)  ** 2 : (py - bottom) ** 2) <= radius ** 2
  }

  // Wine glass geometry (normalized to size)
  const bowlTop    = size * 0.18
  const bowlBot    = size * 0.55
  const bowlW      = size * 0.36          // half-width at widest
  const stemTop    = bowlBot
  const stemBot    = size * 0.72
  const stemW      = size * 0.04          // half-width
  const baseY      = size * 0.80
  const baseH      = size * 0.05
  const baseW      = size * 0.22          // half-width

  function inWineGlass(px, py) {
    // Bowl: parabolic sides
    if (py >= bowlTop && py < bowlBot) {
      const t = (py - bowlTop) / (bowlBot - bowlTop)  // 0→1 top to bottom
      const hw = bowlW * (0.45 + 0.55 * t)
      return Math.abs(px - cx) <= hw
    }
    // Stem
    if (py >= stemTop && py <= stemBot) {
      return Math.abs(px - cx) <= stemW
    }
    // Base
    if (py > stemBot && py <= baseY + baseH) {
      return Math.abs(px - cx) <= baseW
    }
    return false
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4

      const inBg    = inRoundedRect(x, y)
      const inGlass = inBg && inWineGlass(x, y)

      if (inGlass) {
        buf[idx]   = 255
        buf[idx+1] = 255
        buf[idx+2] = 255
        buf[idx+3] = 255
      } else if (inBg) {
        buf[idx]   = r
        buf[idx+1] = g
        buf[idx+2] = b
        buf[idx+3] = 255
      } else {
        // Transparent outside rounded rect
        buf[idx+3] = 0
      }
    }
  }

  // Encode as PNG
  const PNG_MAGIC = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8]  = 8  // bit depth
  ihdr[9]  = 2  // color type: RGB (we'll strip alpha in scanlines)
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  // Build scanlines: filter byte (0) + RGB triplets
  // For pixels with alpha=0, use background color to avoid fringing
  const rawRows = Buffer.alloc(size * (1 + size * 3))
  for (let y = 0; y < size; y++) {
    rawRows[y * (1 + size * 3)] = 0  // filter none
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4
      const dst = y * (1 + size * 3) + 1 + x * 3
      const alpha = buf[src + 3]
      rawRows[dst]   = alpha > 0 ? buf[src]   : 0
      rawRows[dst+1] = alpha > 0 ? buf[src+1] : 0
      rawRows[dst+2] = alpha > 0 ? buf[src+2] : 0
    }
  }

  const compressed = deflateSync(rawRows)

  return Buffer.concat([
    PNG_MAGIC,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Write icon files ──────────────────────────────────────────────────────────

mkdirSync('public', { recursive: true })

const icons = [
  { size: 192, file: 'public/icon-192.png' },
  { size: 512, file: 'public/icon-512.png' },
  { size: 180, file: 'public/apple-touch-icon.png' },
]

for (const { size, file } of icons) {
  const png = generateIconPng(size)
  const ws = createWriteStream(file)
  ws.write(png)
  ws.end()
  console.log(`✓ ${file}  (${size}×${size})`)
}
