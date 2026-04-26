/* Shared sketchy primitives — load after React/Babel */

const Box = ({ children, style, className = '', label, ...rest }) => (
  <div className={`sketchy ${className}`} style={style} {...rest}>
    {label && <div style={{position:'absolute', top:-9, left:10, background:'var(--paper)', padding:'0 6px', fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:'.08em'}}>{label}</div>}
    {children}
  </div>
);

const Ph = ({ w, h, label, tight, style }) => (
  <div className={`ph ${tight ? 'tight' : ''}`} style={{width: w, height: h, ...style}}>
    {label}
  </div>
);

const Chip = ({ children, variant }) => (
  <span className={`chip ${variant || ''}`}>{children}</span>
);

const Btn = ({ children, variant, sm, style }) => (
  <span className={`btn ${variant || ''} ${sm ? 'sm' : ''}`} style={style}>{children}</span>
);

const Note = ({ children, style }) => (
  <div className="callout" style={style}>{children}</div>
);

// Hand-drawn arrow SVG. dir: 'down','up','left','right','down-left','down-right'
const Arrow = ({ from, to, color = 'var(--accent)', curve = 30, label, labelOffset = [0, 0], style = {} }) => {
  // from / to in absolute px relative to parent (which must be position:relative)
  const [x1, y1] = from;
  const [x2, y2] = to;
  const mx = (x1 + x2) / 2 + curve;
  const my = (y1 + y2) / 2 - curve;
  const minX = Math.min(x1, x2, mx) - 12;
  const minY = Math.min(y1, y2, my) - 12;
  const maxX = Math.max(x1, x2, mx) + 12;
  const maxY = Math.max(y1, y2, my) + 12;
  const w = maxX - minX, h = maxY - minY;
  const px = (x) => x - minX, py = (y) => y - minY;
  return (
    <svg
      style={{position:'absolute', left:minX, top:minY, width:w, height:h, pointerEvents:'none', overflow:'visible', ...style}}
      viewBox={`0 0 ${w} ${h}`}
    >
      <path
        d={`M ${px(x1)} ${py(y1)} Q ${px(mx)} ${py(my)} ${px(x2)} ${py(y2)}`}
        stroke={color} strokeWidth="2" fill="none" strokeLinecap="round"
      />
      {/* arrowhead */}
      <ArrowHead x={px(x2)} y={py(y2)} cx={px(mx)} cy={py(my)} color={color} />
      {label && (
        <text
          x={px(mx) + labelOffset[0]} y={py(my) + labelOffset[1]}
          fill={color} fontFamily="Caveat, cursive" fontSize="18" fontWeight="700"
          textAnchor="middle"
        >{label}</text>
      )}
    </svg>
  );
};

const ArrowHead = ({ x, y, cx, cy, color }) => {
  const dx = x - cx, dy = y - cy;
  const len = Math.sqrt(dx*dx + dy*dy) || 1;
  const ux = dx/len, uy = dy/len;
  const size = 10;
  const a1x = x - ux*size + uy*size*0.6;
  const a1y = y - uy*size - ux*size*0.6;
  const a2x = x - ux*size - uy*size*0.6;
  const a2y = y - uy*size + ux*size*0.6;
  return (
    <path d={`M ${x} ${y} L ${a1x} ${a1y} M ${x} ${y} L ${a2x} ${a2y}`}
      stroke={color} strokeWidth="2" fill="none" strokeLinecap="round"/>
  );
};

// Squiggle line
const Squig = ({ w = 60, color = 'var(--accent)', style }) => (
  <svg width={w} height="6" style={style} viewBox="0 0 100 6" preserveAspectRatio="none">
    <path d="M0 3 Q 5 0, 10 3 T 20 3 T 30 3 T 40 3 T 50 3 T 60 3 T 70 3 T 80 3 T 90 3 T 100 3"
      stroke={color} strokeWidth="2" fill="none"/>
  </svg>
);

// Section label inside artboard
const Cap = ({ children, style }) => (
  <div className="cap" style={{color:'var(--ink-soft)', marginBottom:6, ...style}}>{children}</div>
);

// Frame: container for a single wireframe with bg color + dimensions
const Frame = ({ w = 1280, h = 800, bg = 'var(--paper)', children, style }) => (
  <div style={{
    width: w, height: h, background: bg, position: 'relative',
    border: '1px solid #00000010', overflow: 'hidden', ...style
  }}>
    {children}
  </div>
);

Object.assign(window, { Box, Ph, Chip, Btn, Note, Arrow, ArrowHead, Squig, Cap, Frame });
