// Icon set — minimal 1.5px line iconography
// Pass size + color via props; default to currentColor.

const Icon = ({ d, size = 18, stroke = 1.5, fill = 'none', color = 'currentColor', children, viewBox = '0 0 24 24', ...rest }) => (
  <svg width={size} height={size} viewBox={viewBox} fill={fill} stroke={color}
       strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {d ? <path d={d} /> : children}
  </svg>
);

const I = {
  home:  (p) => <Icon {...p}><path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/></Icon>,
  list:  (p) => <Icon {...p}><rect x="4" y="6" width="16" height="13" rx="2"/><path d="M4 10h16"/></Icon>,
  folder:(p) => <Icon {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></Icon>,
  chart: (p) => <Icon {...p}><path d="M5 19V11"/><path d="M12 19V5"/><path d="M19 19v-7"/></Icon>,
  gear:  (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Icon>,
  arrowUp:   (p) => <Icon {...p}><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></Icon>,
  arrowDown: (p) => <Icon {...p}><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></Icon>,
  arrowRight:(p) => <Icon {...p}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></Icon>,
  arrowLeft: (p) => <Icon {...p}><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></Icon>,
  chev:  (p) => <Icon {...p}><path d="m9 6 6 6-6 6"/></Icon>,
  chevL: (p) => <Icon {...p}><path d="m15 6-6 6 6 6"/></Icon>,
  plus:  (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>,
  close: (p) => <Icon {...p}><path d="M18 6 6 18M6 6l12 12"/></Icon>,
  spark: (p) => <Icon {...p}><path d="M3 12h3l2-6 4 12 2-6h3"/></Icon>,
  target:(p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></Icon>,
  bolt:  (p) => <Icon {...p}><path d="m13 3-9 11h7l-1 7 9-11h-7l1-7Z"/></Icon>,
  cal:   (p) => <Icon {...p}><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 10h16M9 4v4M15 4v4"/></Icon>,
  search:(p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></Icon>,
  filter:(p) => <Icon {...p}><path d="M4 6h16M7 12h10M10 18h4"/></Icon>,
  heart: (p) => <Icon {...p}><path d="M20.8 8.6c0 5.3-8.8 10.4-8.8 10.4S3.2 13.9 3.2 8.6a4.4 4.4 0 0 1 8.8-1.6 4.4 4.4 0 0 1 8.8 1.6Z"/></Icon>,
  download: (p) => <Icon {...p}><path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/></Icon>,
  upload:   (p) => <Icon {...p}><path d="M12 20V8"/><path d="m7 13 5-5 5 5"/><path d="M5 4h14"/></Icon>,
  send:     (p) => <Icon {...p}><path d="m22 2-7 20-4-9-9-4 20-7Z"/></Icon>,
};

Object.assign(window, { I, Icon });
