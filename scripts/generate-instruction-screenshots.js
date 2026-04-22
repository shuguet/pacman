#!/usr/bin/env node
// Generates the instruction-page screenshots (scatter / chase / powerpill)
// as SVG files from the current map.json and the wall-rect list in
// pacman-canvas.js (buildWalls). Regenerate with:
//   docker run --rm -v "$PWD":/app -w /app node:current-alpine node scripts/generate-instruction-screenshots.js

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const map = JSON.parse(readFileSync(join(root, 'public/data/map.json'), 'utf8'));

const cell = 30;
const radius = 15;
const W = 18, H = 13;
const canvasW = W * cell, canvasH = H * cell;

// Wall rectangles from buildWalls() in pacman-canvas.js (gridX, gridY, w, h).
// buildWall pixel conversion: x = radius/2 + gridX*2*radius; width = (2w-1)*radius.
const walls = [
  // K
  [1,1,1,11],[2,5,1,2],[3,4,1,1],[3,7,1,1],[4,3,1,1],[4,8,1,2],[5,1,1,2],[5,10,1,2],
  // 1
  [6,4,1,1],[7,3,1,1],[8,2,1,1],[9,1,1,11],
  // 0
  [11,4,1,2],[11,7,1,2],[12,2,1,2],[12,9,1,2],[13,1,2,1],[13,11,2,1],
  [15,2,1,2],[15,9,1,2],[16,4,1,2],[16,7,1,2],
];

function wallRect(gx, gy, w, h) {
  const x = radius / 2 + gx * 2 * radius;
  const y = radius / 2 + gy * 2 * radius;
  const width = (2 * w - 1) * radius;
  const height = (2 * h - 1) * radius;
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="4" ry="4"/>`;
}

// Cell center in pixels.
const cx = gx => gx * cell + cell / 2;
const cy = gy => gy * cell + cell / 2;

// Pacman and powerpills from map.json.
const pills = [], powerpills = [];
for (const row of map.posY) {
  const gy = row.row - 1;
  for (const c of row.posX) {
    const gx = c.col - 1;
    if (c.type === 'pill') pills.push([gx, gy]);
    else if (c.type === 'powerpill') powerpills.push([gx, gy]);
  }
}

function pacman(gx, gy) {
  // Yellow disc with a small wedge cut out to suggest the mouth.
  const x = cx(gx), y = cy(gy);
  return `
    <g transform="translate(${x} ${y})">
      <path d="M 0 0 L 12 -6 A 13 13 0 1 1 12 6 Z" fill="#FFE600"/>
    </g>`;
}

function ghost(gx, gy, color, dazzled = false) {
  const x = cx(gx), y = cy(gy);
  const body = dazzled ? '#2121DE' : color;
  const eyeFill = dazzled ? '#FFFFFF' : '#FFFFFF';
  const pupilFill = dazzled ? '#FFFFFF' : '#1A1AC4';
  // Classic ghost silhouette: dome on top, zig-zag skirt on bottom.
  return `
    <g transform="translate(${x} ${y})">
      <path d="
        M -12 2
        A 12 12 0 0 1 12 2
        L 12 10
        L 8 12 L 4 10 L 0 12 L -4 10 L -8 12 L -12 10 Z"
        fill="${body}"/>
      <circle cx="-5" cy="-2" r="3.2" fill="${eyeFill}"/>
      <circle cx="5"  cy="-2" r="3.2" fill="${eyeFill}"/>
      <circle cx="-5" cy="-1" r="1.5" fill="${pupilFill}"/>
      <circle cx="5"  cy="-1" r="1.5" fill="${pupilFill}"/>
    </g>`;
}

function svg({ wallColor, pacPos, ghosts, highlightPowerpill }) {
  const wallEls = walls.map(w => wallRect(...w)).join('\n    ');
  const pillEls = pills.map(([gx, gy]) =>
    `<circle cx="${cx(gx)}" cy="${cy(gy)}" r="2" fill="#FFCCA8"/>`
  ).join('\n    ');
  const powerEls = powerpills.map(([gx, gy]) => {
    const isHL = highlightPowerpill && highlightPowerpill[0] === gx && highlightPowerpill[1] === gy;
    const r = isHL ? 10 : 6;
    const glow = isHL ? `<circle cx="${cx(gx)}" cy="${cy(gy)}" r="14" fill="#FFFFFF" opacity="0.15"/>` : '';
    return `${glow}<circle cx="${cx(gx)}" cy="${cy(gy)}" r="${r}" fill="#FFCCA8"/>`;
  }).join('\n    ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}">
  <rect width="${canvasW}" height="${canvasH}" fill="#000000"/>
  <g fill="${wallColor}">
    ${wallEls}
  </g>
  <g>
    ${pillEls}
  </g>
  <g>
    ${powerEls}
  </g>
  ${ghosts.map(g => ghost(g.x, g.y, g.color, g.dazzled)).join('')}
  ${pacman(pacPos[0], pacPos[1])}
</svg>
`;
}

// Scatter: blue walls, each ghost heads toward its scatter corner, pacman
// somewhere in the middle.
const scatter = svg({
  wallColor: '#2121DE',
  pacPos: [8, 6],
  ghosts: [
    { x: 2,  y: 2,  color: '#FFB8FF' }, // pinky  — upper left corner
    { x: 13, y: 0,  color: '#D71921' }, // blinky — upper right corner
    { x: 13, y: 10, color: '#00DEDE' }, // inky   — lower right corner (wall target; shown on nearest open cell)
    { x: 2,  y: 11, color: '#FF8C00' }, // clyde  — lower left corner
  ],
});

// Chase: red walls, ghosts converge on pacman from different sides.
const chase = svg({
  wallColor: '#D10000',
  pacPos: [8, 6],
  ghosts: [
    { x: 10, y: 6,  color: '#D71921' }, // blinky, right of pacman
    { x: 3,  y: 3,  color: '#FFB8FF' }, // pinky, ambush position
    { x: 8,  y: 0,  color: '#00DEDE' }, // inky, top
    { x: 8,  y: 11, color: '#FF8C00' }, // clyde, bottom
  ],
});

// Powerpill: pacman just ate a powerpill, all four ghosts are dazzled (blue).
const power = svg({
  wallColor: '#2121DE',
  pacPos: [2, 4],
  highlightPowerpill: [2, 4],
  ghosts: [
    { x: 4,  y: 4,  color: '#D71921', dazzled: true },
    { x: 8,  y: 6,  color: '#FFB8FF', dazzled: true },
    { x: 13, y: 6,  color: '#00DEDE', dazzled: true },
    { x: 5,  y: 8,  color: '#FF8C00', dazzled: true },
  ],
});

const outDir = join(root, 'public/img/instructions');
writeFileSync(join(outDir, 'instructions_scatter.svg'), scatter);
writeFileSync(join(outDir, 'instructions_chase.svg'), chase);
writeFileSync(join(outDir, 'instructions_powerpill.svg'), power);
console.log('Wrote 3 SVG screenshots to', outDir);
