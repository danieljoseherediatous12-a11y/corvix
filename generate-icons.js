const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'public', 'icons');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="128" fill="#059669"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="240" fill="#ffffff" font-family="Arial, sans-serif" font-weight="bold">💰</text>
</svg>`;

fs.writeFileSync(path.join(dir, 'icon.svg'), svg);

const png192Base64 = 'iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAIAAADdvvtQAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAcSURBVHhe7cEBDQAAAMKg909tDwcUAAAAAAAA4K0BGf4AAV8hB8AAAAAASUVORK5CYII=';
fs.writeFileSync(path.join(dir, 'icon-192.png'), Buffer.from(png192Base64, 'base64'));
fs.writeFileSync(path.join(dir, 'icon-512.png'), Buffer.from(png192Base64, 'base64'));

console.log('Icons generated successfully');
