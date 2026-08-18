const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generate() {
  const faviconSvgPath = path.join(__dirname, '..', 'public', 'favicon.svg');
  const faviconContent = fs.readFileSync(faviconSvgPath, 'utf8');

  // Extract paths from favicon.svg
  // Path 1 is car body (AB2121)
  // Path 2 is windshield (38BDF8)
  // Path 3 is left headlight (E0F2FE)
  // Path 4 is right headlight (E0F2FE)
  const pathMatches = faviconContent.match(/<path[^>]+>/g);
  if (!pathMatches || pathMatches.length < 4) {
    throw new Error('Could not find all required paths in favicon.svg');
  }

  // Extract path 'd' and 'transform' attributes
  const extractAttrs = (tag) => {
    const dMatch = tag.match(/d="([^"]+)"/);
    const transMatch = tag.match(/transform="([^"]+)"/);
    return {
      d: dMatch ? dMatch[1] : '',
      transform: transMatch ? transMatch[1] : '',
    };
  };

  const body = extractAttrs(pathMatches[0]);
  const windshield = extractAttrs(pathMatches[1]);
  const leftHeadlight = extractAttrs(pathMatches[2]);
  const rightHeadlight = extractAttrs(pathMatches[3]);

  // Construct monochrome masked SVG with exact cutout silhouette matching the app icon
  const silhouetteSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="800" height="636" viewBox="0 0 800 636">
  <defs>
    <mask id="iconCutouts" maskUnits="userSpaceOnUse" x="0" y="0" width="800" height="636">
      <!-- Visible area in white -->
      <rect x="0" y="0" width="800" height="636" fill="#FFFFFF" />
      <!-- Cutouts in black (windshield & headlights) -->
      <path d="${windshield.d}" fill="#000000" ${windshield.transform ? `transform="${windshield.transform}"` : ''} />
      <path d="${leftHeadlight.d}" fill="#000000" ${leftHeadlight.transform ? `transform="${leftHeadlight.transform}"` : ''} />
      <path d="${rightHeadlight.d}" fill="#000000" ${rightHeadlight.transform ? `transform="${rightHeadlight.transform}"` : ''} />
    </mask>
  </defs>
  <!-- Car body silhouette filled with pure solid white, with window/headlight cutouts -->
  <path d="${body.d}" fill="#FFFFFF" mask="url(#iconCutouts)" ${body.transform ? `transform="${body.transform}"` : ''} />
</svg>`;

  const outPath = path.join(__dirname, '..', 'public', 'badge.png');

  // Render SVG to 96x96 with subtle padding so Android status bar won't clip edges
  const renderedBuffer = await sharp(Buffer.from(silhouetteSvg))
    .resize(80, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 16,
      bottom: 16,
      left: 8,
      right: 8,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(outPath);

  console.log('Badge created successfully at:', outPath, renderedBuffer);
}

generate().catch(console.error);
