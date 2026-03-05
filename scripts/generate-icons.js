/**
 * Gerador de ícones PWA — Portal do Colaborador ISIBA
 * Gera ícones SVG inline em múltiplos tamanhos para o manifest.json
 * 
 * Como usar: execute este arquivo no navegador ou converta os SVGs abaixo
 * para PNG usando a ferramenta online: https://svgtopng.com/
 * 
 * OU rode: node scripts/generate-icons.js (requer canvas npm)
 */

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
  const padding = Math.round(size * 0.15);
  const iconSize = size - padding * 2;
  const fontSize = Math.round(size * 0.3);
  const rx = Math.round(size * 0.22);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#134e4a"/>
      <stop offset="100%" style="stop-color:#0f766e"/>
    </linearGradient>
    <linearGradient id="icon" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#5eead4"/>
      <stop offset="100%" style="stop-color:#34d399"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${rx}" fill="url(#bg)"/>
  <text x="50%" y="52%" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="bold"
    fill="url(#icon)" text-anchor="middle" dominant-baseline="middle" letter-spacing="-1">IS</text>
</svg>`;

  console.log(`\n=== icon-${size}x${size}.svg ===`);
  console.log(svg);
});
