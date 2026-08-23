const fs = require('fs');
const path = require('path');

// Exact official Corvix SVG Logo (transparent background, sharp geometry)
const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="corv_g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
    <linearGradient id="corv_g2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
    <linearGradient id="corv_dark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>

  <g>
    <!-- Top Dark Vault Wing -->
    <path d="M 256 80 L 380 152 L 380 220 L 256 148 L 132 220 L 132 152 Z" fill="url(#corv_dark)"/>

    <!-- Left Emerald Facet -->
    <path d="M 120 168 L 244 240 L 244 360 L 120 288 Z" fill="url(#corv_g1)"/>

    <!-- Right Obsidian Facet -->
    <path d="M 392 168 L 392 288 L 268 360 L 268 240 Z" fill="url(#corv_dark)"/>

    <!-- Bottom Emerald Wing -->
    <path d="M 256 432 L 132 360 L 132 292 L 256 364 L 380 292 L 380 360 Z" fill="url(#corv_g2)"/>

    <!-- Center Precision Diamond Core -->
    <polygon points="256,204 316,256 256,308 196,256" fill="#10b981"/>
    <polygon points="256,226 290,256 256,286 222,256" fill="#ffffff" opacity="0.95"/>
  </g>
</svg>`;

// Write SVGs
fs.writeFileSync(path.join(__dirname, 'public', 'favicon.svg'), svgFavicon);
fs.writeFileSync(path.join(__dirname, 'src', 'app', 'icon.svg'), svgFavicon);

// Generate 32x32 ICO file matching the exact geometric facets
function createIco32() {
  const width = 32;
  const height = 32;
  const numPixels = width * height;
  const pixelArraySize = numPixels * 4;
  const maskArraySize = Math.ceil(width / 32) * 4 * height;
  const bmpHeaderSize = 40;
  const imageDataSize = bmpHeaderSize + pixelArraySize + maskArraySize;

  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  header.writeUInt8(width, 6);
  header.writeUInt8(height, 7);
  header.writeUInt8(0, 8);
  header.writeUInt8(0, 9);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(imageDataSize, 14);
  header.writeUInt32LE(22, 18);

  const bmpHeader = Buffer.alloc(40);
  bmpHeader.writeUInt32LE(40, 0);
  bmpHeader.writeInt32LE(width, 4);
  bmpHeader.writeInt32LE(height * 2, 8);
  bmpHeader.writeUInt16LE(1, 12);
  bmpHeader.writeUInt16LE(32, 14);
  bmpHeader.writeUInt32LE(0, 16);
  bmpHeader.writeUInt32LE(pixelArraySize + maskArraySize, 20);

  const pixelData = Buffer.alloc(pixelArraySize, 0); // Start transparent
  const maskData = Buffer.alloc(maskArraySize, 0);

  // Map 512x512 exact facets to 32x32
  // Coordinates scaled by 32/512 = 0.0625, centered
  // Let's test each pixel (x: 0..31, y: 0..31) in bottom-up BMP coordinates:
  for (let py = 0; py < height; py++) {
    // Convert BMP bottom-up py to normal top-down y
    const y = (height - 1 - py) * (512 / 32);
    for (let px = 0; px < width; px++) {
      const x = px * (512 / 32);
      const idx = (py * width + px) * 4;

      // Check geometric shapes from official logo:
      // 1. Center Inner White Diamond: (256, 226) -> (290, 256) -> (256, 286) -> (222, 256)
      const dxInner = Math.abs(x - 256) / 34;
      const dyInner = Math.abs(y - 256) / 30;
      if (dxInner + dyInner <= 1.0) {
        pixelData.writeUInt8(255, idx);     // B
        pixelData.writeUInt8(255, idx + 1); // G
        pixelData.writeUInt8(255, idx + 2); // R
        pixelData.writeUInt8(255, idx + 3); // A
        continue;
      }

      // 2. Center Emerald Diamond Core: (256, 204) -> (316, 256) -> (256, 308) -> (196, 256)
      const dxCore = Math.abs(x - 256) / 60;
      const dyCore = Math.abs(y - 256) / 52;
      if (dxCore + dyCore <= 1.0) {
        pixelData.writeUInt8(129, idx);     // B: 129
        pixelData.writeUInt8(185, idx + 1); // G: 185
        pixelData.writeUInt8(16, idx + 2);  // R: 16
        pixelData.writeUInt8(255, idx + 3); // A
        continue;
      }

      // 3. Top Vault Arch (y from 80 to 220, |x-256| <= 124)
      if (y >= 80 && y <= 220) {
        const topSlope = (y - 80) / (152 - 80); // 0 at top, 1 at wings
        const maxDist = 124 * Math.min(1.0, topSlope);
        const minDist = Math.max(0, (y - 148) / (220 - 148) * 124);
        const dist = Math.abs(x - 256);
        if (dist <= maxDist && (y < 148 || dist >= minDist)) {
          pixelData.writeUInt8(42, idx);     // B
          pixelData.writeUInt8(23, idx + 1); // G
          pixelData.writeUInt8(15, idx + 2); // R
          pixelData.writeUInt8(255, idx + 3); // A
          continue;
        }
      }

      // 4. Left Emerald Facet (x from 120 to 244, y from 168 to 360)
      if (x >= 120 && x <= 248 && y >= 168 && y <= 360) {
        const prog = (x - 120) / (244 - 120);
        const topY = 168 + prog * (240 - 168);
        const botY = 288 + prog * (360 - 288);
        if (y >= topY && y <= botY) {
          pixelData.writeUInt8(87, idx);      // B
          pixelData.writeUInt8(185, idx + 1); // G: #10b981
          pixelData.writeUInt8(16, idx + 2);  // R
          pixelData.writeUInt8(255, idx + 3); // A
          continue;
        }
      }

      // 5. Right Obsidian Facet (x from 264 to 392, y from 168 to 360)
      if (x >= 264 && x <= 392 && y >= 168 && y <= 360) {
        const prog = (392 - x) / (392 - 268);
        const topY = 168 + prog * (240 - 168);
        const botY = 288 + prog * (360 - 288);
        if (y >= topY && y <= botY) {
          pixelData.writeUInt8(59, idx);      // B: #1e293b
          pixelData.writeUInt8(41, idx + 1);  // G
          pixelData.writeUInt8(30, idx + 2);  // R
          pixelData.writeUInt8(255, idx + 3); // A
          continue;
        }
      }

      // 6. Bottom Emerald Shield Wing (y from 292 to 432)
      if (y >= 292 && y <= 432) {
        const botSlope = (432 - y) / (432 - 360);
        const maxDist = 124 * Math.min(1.0, botSlope);
        const dist = Math.abs(x - 256);
        if (dist <= maxDist && dist >= 0) {
          pixelData.writeUInt8(105, idx);     // B: #059669
          pixelData.writeUInt8(150, idx + 1); // G
          pixelData.writeUInt8(5, idx + 2);   // R
          pixelData.writeUInt8(255, idx + 3); // A
          continue;
        }
      }
    }
  }

  return Buffer.concat([header, bmpHeader, pixelData, maskData]);
}

const icoBuffer = createIco32();
fs.writeFileSync(path.join(__dirname, 'public', 'favicon.ico'), icoBuffer);
fs.writeFileSync(path.join(__dirname, 'src', 'app', 'favicon.ico'), icoBuffer);

console.log('✅ Exact geometric Corvix favicon (SVG & transparent ICO) generated successfully!');
