const fs = require('fs');
const path = require('path');

// Clean, high-contrast SVG favicon (512x512 with emerald gemstone logo)
const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="110" fill="#0f172a"/>
  <defs>
    <linearGradient id="fav_g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
    <linearGradient id="fav_g2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
    <linearGradient id="fav_dark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#334155"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>

  <g>
    <!-- Top Vault Arch -->
    <path d="M 256 80 L 380 152 L 380 220 L 256 148 L 132 220 L 132 152 Z" fill="url(#fav_dark)"/>

    <!-- Left Emerald Facet -->
    <path d="M 120 168 L 244 240 L 244 360 L 120 288 Z" fill="url(#fav_g1)"/>

    <!-- Right Obsidian Facet -->
    <path d="M 392 168 L 392 288 L 268 360 L 268 240 Z" fill="#1e293b"/>

    <!-- Bottom Emerald Wing -->
    <path d="M 256 432 L 132 360 L 132 292 L 256 364 L 380 292 L 380 360 Z" fill="url(#fav_g2)"/>

    <!-- Center Precision Diamond Core -->
    <polygon points="256,204 316,256 256,308 196,256" fill="#10b981"/>
    <polygon points="256,226 290,256 256,286 222,256" fill="#ffffff" opacity="0.95"/>
  </g>
</svg>`;

// Write SVGs
fs.writeFileSync(path.join(__dirname, 'public', 'favicon.svg'), svgFavicon);
fs.writeFileSync(path.join(__dirname, 'src', 'app', 'icon.svg'), svgFavicon);

// Generate 32x32 ICO file with 32-bit RGBA BMP
function createIco32() {
  const width = 32;
  const height = 32;
  const numPixels = width * height;
  const pixelArraySize = numPixels * 4; // 32bpp RGBA
  const maskArraySize = Math.ceil(width / 32) * 4 * height; // 1bpp AND mask
  const bmpHeaderSize = 40; // BITMAPINFOHEADER
  const imageDataSize = bmpHeaderSize + pixelArraySize + maskArraySize;

  // ICO header (6 bytes) + 1 directory entry (16 bytes)
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(1, 4); // 1 image

  header.writeUInt8(width, 6);
  header.writeUInt8(height, 7);
  header.writeUInt8(0, 8); // No color palette
  header.writeUInt8(0, 9); // Reserved
  header.writeUInt16LE(1, 10); // Color planes
  header.writeUInt16LE(32, 12); // Bits per pixel
  header.writeUInt32LE(imageDataSize, 14); // Image data size
  header.writeUInt32LE(22, 18); // Offset to image data (22)

  // BMP Header (40 bytes)
  const bmpHeader = Buffer.alloc(40);
  bmpHeader.writeUInt32LE(40, 0); // Header size
  bmpHeader.writeInt32LE(width, 4);
  bmpHeader.writeInt32LE(height * 2, 8); // Height * 2 for ICO BMP (XOR + AND mask)
  bmpHeader.writeUInt16LE(1, 12); // Planes
  bmpHeader.writeUInt16LE(32, 14); // Bit count
  bmpHeader.writeUInt32LE(0, 16); // BI_RGB (no compression)
  bmpHeader.writeUInt32LE(pixelArraySize + maskArraySize, 20); // Image size
  bmpHeader.writeInt32LE(0, 24);
  bmpHeader.writeInt32LE(0, 28);
  bmpHeader.writeUInt32LE(0, 32);
  bmpHeader.writeUInt32LE(0, 36);

  // Pixels in BGRA format, bottom-to-top
  const pixelData = Buffer.alloc(pixelArraySize);
  const maskData = Buffer.alloc(maskArraySize, 0); // 0 = fully opaque

  // Draw 32x32 rounded dark card with emerald center diamond
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // Distance from center (15.5, 15.5)
      const dx = Math.abs(x - 15.5);
      const dy = Math.abs(y - 15.5);
      const manhattan = dx + dy;

      if (dx > 14 || dy > 14) {
        // Transparent border / rounded corners
        if (dx > 13 && dy > 13) {
          pixelData.writeUInt32LE(0x00000000, idx);
          continue;
        }
      }

      if (manhattan <= 4.5) {
        // Inner diamond: pure white
        pixelData.writeUInt8(255, idx);     // B
        pixelData.writeUInt8(255, idx + 1); // G
        pixelData.writeUInt8(255, idx + 2); // R
        pixelData.writeUInt8(255, idx + 3); // A
      } else if (manhattan <= 8.5) {
        // Emerald core: #10b981 (R:16, G:185, B:129)
        pixelData.writeUInt8(129, idx);     // B
        pixelData.writeUInt8(185, idx + 1); // G
        pixelData.writeUInt8(16, idx + 2);  // R
        pixelData.writeUInt8(255, idx + 3); // A
      } else if (manhattan <= 12.5) {
        // Deep emerald: #047857 (R:4, G:120, B:87)
        pixelData.writeUInt8(87, idx);      // B
        pixelData.writeUInt8(120, idx + 1); // G
        pixelData.writeUInt8(4, idx + 2);   // R
        pixelData.writeUInt8(255, idx + 3); // A
      } else {
        // Dark background: #0f172a (R:15, G:23, B:42)
        pixelData.writeUInt8(42, idx);      // B
        pixelData.writeUInt8(23, idx + 1);  // G
        pixelData.writeUInt8(15, idx + 2);  // R
        pixelData.writeUInt8(255, idx + 3); // A
      }
    }
  }

  return Buffer.concat([header, bmpHeader, pixelData, maskData]);
}

const icoBuffer = createIco32();
fs.writeFileSync(path.join(__dirname, 'public', 'favicon.ico'), icoBuffer);
fs.writeFileSync(path.join(__dirname, 'src', 'app', 'favicon.ico'), icoBuffer);

console.log('✅ Favicon files (SVG & ICO) generated successfully!');
