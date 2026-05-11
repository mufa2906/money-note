import sharp from "sharp"
import { writeFileSync, mkdirSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, "../public/icons")
mkdirSync(OUT, { recursive: true })

function makeSvg(size, maskable = false) {
  const pad = maskable ? size * 0.15 : size * 0.1
  const inner = size - pad * 2
  const cx = size / 2
  const cy = size / 2

  // Coin circle
  const cr = inner * 0.38
  // ₩ character — rendered as SVG text
  const fontSize = inner * 0.44

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${maskable ? size * 0.2 : size * 0.18}" fill="#09090b"/>
  <circle cx="${cx}" cy="${cy}" r="${cr}" fill="none" stroke="#22c55e" stroke-width="${size * 0.035}"/>
  <text x="${cx}" y="${cy}" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="700"
    fill="#22c55e" text-anchor="middle" dominant-baseline="central">₩</text>
</svg>`
}

const specs = [
  { name: "icon-192x192.png", size: 192, maskable: false },
  { name: "icon-512x512.png", size: 512, maskable: false },
  { name: "icon-maskable-192x192.png", size: 192, maskable: true },
  { name: "icon-maskable-512x512.png", size: 512, maskable: true },
]

for (const { name, size, maskable } of specs) {
  const svg = Buffer.from(makeSvg(size, maskable))
  await sharp(svg).png().toFile(join(OUT, name))
  console.log(`✓ ${name}`)
}
