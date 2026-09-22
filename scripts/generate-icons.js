import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Color Palette
const BG_COLOR = '#16A34A';
const SYMBOL_COLOR = '#FFFFFF';
const G_PATH = 'M 75 25 C 67 16 57.5 13 47.5 13 C 27 13 13 28.5 13 50 C 13 71.5 27 87 47.5 87 C 68 87 83 72.5 84 52 L 84 48 L 50 61 L 38 49';

/**
 * Android Adaptive Icon Foreground SVG
 * Canvas: 108x108dp. Safe zone: circle diameter 72dp (radius 36 centered at 54, 54).
 * Optical center of G symbol is ~ (48.5, 50).
 * Scaled and centered with clean margin within the 72dp safe circle.
 */
const adaptiveForegroundSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="108" height="108">
  <g transform="translate(54, 54) scale(0.62) translate(-48.5, -50)">
    <path
      d="${G_PATH}"
      fill="none"
      stroke="${SYMBOL_COLOR}"
      stroke-width="11"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </g>
</svg>
`.trim();

/**
 * Android Adaptive Icon Combined (Full Bleed Background + Centered Symbol)
 * Canvas: 108x108
 */
const adaptiveCombinedSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="108" height="108">
  <rect width="108" height="108" fill="${BG_COLOR}"/>
  <g transform="translate(54, 54) scale(0.62) translate(-48.5, -50)">
    <path
      d="${G_PATH}"
      fill="none"
      stroke="${SYMBOL_COLOR}"
      stroke-width="11"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </g>
</svg>
`.trim();

/**
 * Legacy/Standard Squircle Icon SVG
 * Canvas: 100x100, rx=22 (modern Android squircle standard)
 */
const squircleIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
  <rect width="100" height="100" rx="22" fill="${BG_COLOR}"/>
  <g transform="translate(50, 50) scale(0.70) translate(-48.5, -50)">
    <path
      d="${G_PATH}"
      fill="none"
      stroke="${SYMBOL_COLOR}"
      stroke-width="11"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </g>
</svg>
`.trim();

/**
 * Legacy/Standard Round Icon SVG
 * Canvas: 100x100, circle r=50
 */
const roundIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
  <circle cx="50" cy="50" r="50" fill="${BG_COLOR}"/>
  <g transform="translate(50, 50) scale(0.62) translate(-48.5, -50)">
    <path
      d="${G_PATH}"
      fill="none"
      stroke="${SYMBOL_COLOR}"
      stroke-width="11"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </g>
</svg>
`.trim();

/**
 * Google Play Store High-Res Icon (512x512)
 * Google Play requires full-bleed 512x512 square (Play console applies mask and drop-shadow).
 * Symbol is placed in Play Store safe zone (center circle 384px diameter).
 */
const playstoreIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="${BG_COLOR}"/>
  <g transform="translate(256, 256) scale(3.15) translate(-48.5, -50)">
    <path
      d="${G_PATH}"
      fill="none"
      stroke="${SYMBOL_COLOR}"
      stroke-width="11"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </g>
</svg>
`.trim();

/**
 * Play Store Preview Icon with subtle squircle rounded corners (for web showcase/preview)
 */
const playstorePreviewSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="112" fill="${BG_COLOR}"/>
  <g transform="translate(256, 256) scale(3.15) translate(-48.5, -50)">
    <path
      d="${G_PATH}"
      fill="none"
      stroke="${SYMBOL_COLOR}"
      stroke-width="11"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </g>
</svg>
`.trim();

// Android Mipmap densities & sizes
const DENSITIES = [
  { name: 'mipmap-mdpi', launcherSize: 48, foregroundSize: 108 },
  { name: 'mipmap-hdpi', launcherSize: 72, foregroundSize: 162 },
  { name: 'mipmap-xhdpi', launcherSize: 96, foregroundSize: 216 },
  { name: 'mipmap-xxhdpi', launcherSize: 144, foregroundSize: 324 },
  { name: 'mipmap-xxxhdpi', launcherSize: 192, foregroundSize: 432 },
];

// Android XML definitions
const adaptiveIconXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
`;

const adaptiveRoundIconXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
`;

const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${BG_COLOR}</color>
    <color name="primary_green">${BG_COLOR}</color>
</resources>
`;

const backgroundDrawableXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="${BG_COLOR}"
        android:pathData="M0,0h108v108h-108z" />
</vector>
`;

const foregroundVectorXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <group
        android:translateX="23.93"
        android:translateY="23.0"
        android:scaleX="0.62"
        android:scaleY="0.62">
        <path
            android:pathData="M75,25 C67,16 57.5,13 47.5,13 C27,13 13,28.5 13,50 C13,71.5 27,87 47.5,87 C68,87 83,72.5 84,52 L84,48 L50,61 L38,49"
            android:strokeColor="${SYMBOL_COLOR}"
            android:strokeWidth="11"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
    </group>
</vector>
`;

async function main() {
  console.log('Generating Gochao Android App & Play Store Icons...');

  const targets = [
    path.resolve(process.cwd(), 'android/app/src/main/res'),
    path.resolve(process.cwd(), 'public/android/res'),
  ];

  for (const resDir of targets) {
    fs.mkdirSync(resDir, { recursive: true });

    // XML folders
    const anydpiDir = path.join(resDir, 'mipmap-anydpi-v26');
    const valuesDir = path.join(resDir, 'values');
    const drawableDir = path.join(resDir, 'drawable');

    fs.mkdirSync(anydpiDir, { recursive: true });
    fs.mkdirSync(valuesDir, { recursive: true });
    fs.mkdirSync(drawableDir, { recursive: true });

    fs.writeFileSync(path.join(anydpiDir, 'ic_launcher.xml'), adaptiveIconXml);
    fs.writeFileSync(path.join(anydpiDir, 'ic_launcher_round.xml'), adaptiveRoundIconXml);
    fs.writeFileSync(path.join(valuesDir, 'colors.xml'), colorsXml);
    fs.writeFileSync(path.join(valuesDir, 'ic_launcher_background.xml'), colorsXml);
    fs.writeFileSync(path.join(drawableDir, 'ic_launcher_background.xml'), backgroundDrawableXml);
    fs.writeFileSync(path.join(drawableDir, 'ic_launcher_foreground.xml'), foregroundVectorXml);

    // Render mipmap PNGs
    for (const d of DENSITIES) {
      const mipmapDir = path.join(resDir, d.name);
      fs.mkdirSync(mipmapDir, { recursive: true });

      // 1. ic_launcher.png (squircle)
      await sharp(Buffer.from(squircleIconSvg))
        .resize(d.launcherSize, d.launcherSize)
        .png()
        .toFile(path.join(mipmapDir, 'ic_launcher.png'));

      // 2. ic_launcher_round.png (circle)
      await sharp(Buffer.from(roundIconSvg))
        .resize(d.launcherSize, d.launcherSize)
        .png()
        .toFile(path.join(mipmapDir, 'ic_launcher_round.png'));

      // 3. ic_launcher_foreground.png (transparent foreground)
      await sharp(Buffer.from(adaptiveForegroundSvg))
        .resize(d.foregroundSize, d.foregroundSize)
        .png()
        .toFile(path.join(mipmapDir, 'ic_launcher_foreground.png'));
    }
  }

  // Play Store and Web Icons in public/ and public/android/
  const publicDir = path.resolve(process.cwd(), 'public');
  const publicAndroidDir = path.resolve(process.cwd(), 'public/android');
  fs.mkdirSync(publicAndroidDir, { recursive: true });

  // Play Store 512x512 Full Bleed (Official Play Console standard)
  await sharp(Buffer.from(playstoreIconSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicAndroidDir, 'playstore-icon-512.png'));

  // Play Store 512x512 with squircle mask preview
  await sharp(Buffer.from(playstorePreviewSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicAndroidDir, 'ic_launcher-playstore.png'));

  // Also in public root for web / PWA / Play Store exports
  await sharp(Buffer.from(playstorePreviewSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));

  await sharp(Buffer.from(playstorePreviewSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));

  await sharp(Buffer.from(squircleIconSvg))
    .resize(48, 48)
    .png()
    .toFile(path.join(publicDir, 'favicon-48.png'));

  // Overwrite public/icon.svg with high-precision safe-zone adaptive-ready SVG
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), squircleIconSvg);
  fs.writeFileSync(path.join(publicAndroidDir, 'ic_launcher_adaptive_preview.svg'), adaptiveCombinedSvg);

  console.log('Successfully generated all Android and Play Store icons!');
}

main().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
