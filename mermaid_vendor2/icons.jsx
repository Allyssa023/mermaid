// icons.jsx — small Lucide-flavored inline SVG icon set (no external dep)
// Each icon: <Icon name="..." size={16} stroke={1.5} />

const IconPaths = {
  dashboard:  ['M3 13h7V3H3v10z', 'M14 21h7V11h-7v10z', 'M14 3v6h7V3h-7z', 'M3 21h7v-4H3v4z'],
  store:      ['M3 9l1-5h16l1 5', 'M5 9v11h14V9', 'M9 14h6'],
  box:        ['M21 8l-9-5-9 5 9 5 9-5z', 'M3 8v8l9 5 9-5V8', 'M12 13v8'],
  clipboard:  ['M9 4h6v3H9z', 'M5 6h2', 'M17 6h2v15H5V6h2', 'M8 12h8', 'M8 16h5'],
  fish:       ['M6 12c0-3 4-6 9-6 4 0 6 2 6 6s-2 6-6 6c-5 0-9-3-9-6z', 'M6 12c-2 0-3 2-3 4', 'M6 12c-2 0-3-2-3-4', 'M16 12h.01'],
  message:    ['M21 11.5a8.5 8.5 0 0 1-12.6 7.5L3 21l2-5A8.5 8.5 0 1 1 21 11.5z'],
  chart:      ['M3 21V3', 'M3 21h18', 'M7 15v-4', 'M12 15V9', 'M17 15v-2'],
  heart:      ['M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'],
  settings:   ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .68.39 1.29 1 1.51H21a2 2 0 0 1 0 4h-.09c-.61.22-1 .83-1 1.49z'],
  search:     ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.35-4.35'],
  bell:       ['M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 0 1-3.46 0'],
  help:       ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3', 'M12 17h.01'],
  arrowRight: ['M5 12h14', 'M12 5l7 7-7 7'],
  arrowUp:    ['M5 12l7-7 7 7', 'M12 19V5'],
  arrowDown:  ['M5 12l7 7 7-7', 'M12 5v14'],
  chevronRight: ['M9 18l6-6-6-6'],
  chevronDown:  ['M6 9l6 6 6-6'],
  chevronLeft:  ['M15 18l-6-6 6-6'],
  plus:       ['M12 5v14', 'M5 12h14'],
  check:      ['M20 6L9 17l-5-5'],
  x:          ['M18 6L6 18', 'M6 6l12 12'],
  trash:      ['M3 6h18', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'],
  filter:     ['M22 3H2l8 9.46V19l4 2v-8.54L22 3z'],
  eye:        ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  share:      ['M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8', 'M16 6l-4-4-4 4', 'M12 2v13'],
  link:       ['M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71', 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'],
  zap:        ['M13 2L3 14h9l-1 8 10-12h-9l1-8z'],
  storm:      ['M9 16h6l-3 5z', 'M14 7l-3 6h4l-3 5', 'M3 13a4 4 0 0 1 4-4 5 5 0 0 1 10 1 3 3 0 0 1 3 3'],
  fishSimple: ['M2 12c2 4 8 6 12 6s9-3 9-6-5-6-9-6S4 8 2 12z', 'M2 12l3 3', 'M2 12l3-3', 'M16 12h.01'],
  wave:       ['M3 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0', 'M3 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0'],
  badge:      ['M12 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M8 13l-3 8 7-4 7 4-3-8'],
  download:   ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
  expand:     ['M3 3h7v2H5v5H3z', 'M21 3h-7v2h5v5h2z', 'M3 21h7v-2H5v-5H3z', 'M21 21h-7v-2h5v-5h2z'],
  shrink:     ['M10 3v5H5', 'M14 3v5h5', 'M10 21v-5H5', 'M14 21v-5h5'],
  menu:       ['M3 6h18', 'M3 12h18', 'M3 18h18'],
  logout:     ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  pin:        ['M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z', 'M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  rocket:     ['M5 17l4-4 4 4', 'M14.5 14.5L19 19', 'M3 21l3-3', 'M14 4c4 1 6 3 7 7l-3 1-6-6 2-2z', 'M12 12l-3 3-3-3 3-3 3 3z'],
  // chart kinds for active block
  trend:      ['M3 17l6-6 4 4 8-8'],
  more:       ['M5 12h.01', 'M12 12h.01', 'M19 12h.01'],
  refresh:    ['M21 12a9 9 0 1 1-3-6.7', 'M21 3v6h-6'],
};

const FILLED = new Set(['badge']);

function Icon({ name, size = 16, stroke = 1.6, color = 'currentColor', fill = 'none', style }) {
  const d = IconPaths[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
         fill={fill} stroke={color} strokeWidth={stroke}
         strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden>
      {d.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

// Mermaid logo mark — a stylized tail glyph
function MermaidMark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12c0-3 2-7 7-7 4 0 6 2 6 5"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M19 11c0 6-4 9-7 9-4 0-7-2-7-5"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 20l2-3M14 17l3 .5"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="15.5" cy="9.5" r="0.9" fill="currentColor" />
    </svg>
  );
}

Object.assign(window, { Icon, MermaidMark });
