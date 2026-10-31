/** Inline stroke icons (static, decorative, aria-hidden). */
import { svg } from './dom.js';

const PATHS = Object.freeze({
  cart: ['M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2', 'M9 19.5a1 1 0 1 0 0 .01', 'M17 19.5a1 1 0 1 0 0 .01'],
  api: ['M8 7l-5 5 5 5', 'M16 7l5 5-5 5', 'M13.5 5l-3 14'],
  browser: ['M3 5h18v14H3z', 'M3 9h18', 'M6 7h.01', 'M8.5 7h.01'],
  review: ['M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z', 'M15.5 15.5L21 21', 'M8 10.5l1.8 1.8L13.5 8.6'],
  gear: [
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    'M19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7 7 0 0 1-1.8 1l-.3 2h-4l-.3-2a7 7 0 0 1-1.8-1l-1.9.7-2-3.4 1.6-1.2a7 7 0 0 1 0-3L3 9.3l2-3.4 1.9.7a7 7 0 0 1 1.8-1l.3-2h4l.3 2a7 7 0 0 1 1.8 1l1.9-.7 2 3.4-1.6 1.2a7 7 0 0 1 0 3z',
  ],
  app: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M16.5 13v7', 'M13 16.5h7'],
  spark: ['M12 3v4', 'M12 17v4', 'M3 12h4', 'M17 12h4', 'M12 8l1.5 2.5L16 12l-2.5 1.5L12 16l-1.5-2.5L8 12l2.5-1.5z'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  chevron: ['M6 9l6 6 6-6'],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 11v5', 'M12 8h.01'],
  alert: ['M12 3l9.5 17H2.5z', 'M12 10v4', 'M12 17h.01'],
});

export function icon(name, { size = 24, className = 'dvn-icon' } = {}) {
  const paths = PATHS[name] || PATHS.info;
  return svg(
    'svg',
    {
      class: className,
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 1.75,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
      focusable: 'false',
    },
    paths.map((d) => svg('path', { d })),
  );
}
