/* Shared icons (SVG) and small primitives */

const Icon = ({ name, size = 16, stroke = 1.6, style }) => {
  const s = size;
  const props = {
    width: s, height: s, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: stroke,
    strokeLinecap: 'round', strokeLinejoin: 'round', style
  };
  switch (name) {
    case 'sparkle': return <svg {...props}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>;
    case 'wand': return <svg {...props}><path d="M15 4V2M19 8h2M17.4 5.6l1.4-1.4M3 21l9-9M12.5 11.5l3 3"/></svg>;
    case 'image': return <svg {...props}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>;
    case 'grid': return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
    case 'folder': return <svg {...props}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>;
    case 'compass': return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M16 8l-2 6-6 2 2-6 6-2z"/></svg>;
    case 'book': return <svg {...props}><path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4z"/><path d="M4 17a3 3 0 0 1 3-3h12"/></svg>;
    case 'gift': return <svg {...props}><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8s-3-4-5.5-2-.5 4 2.5 4M12 8s3-4 5.5-2 .5 4-2.5 4"/></svg>;
    case 'user': return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>;
    case 'share': return <svg {...props}><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8 11l8-4M8 13l8 4"/></svg>;
    case 'plus': return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case 'check': return <svg {...props}><path d="M5 12l5 5L20 7"/></svg>;
    case 'star': return <svg {...props}><path d="M12 3l2.6 6 6.4.6-4.8 4.4 1.4 6.4L12 17l-5.6 3.4 1.4-6.4L3 9.6 9.4 9 12 3z"/></svg>;
    case 'arrow-right': return <svg {...props}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
    case 'arrow-down': return <svg {...props}><path d="M12 5v14M6 13l6 6 6-6"/></svg>;
    case 'download': return <svg {...props}><path d="M12 4v12M6 11l6 6 6-6M4 20h16"/></svg>;
    case 'upload': return <svg {...props}><path d="M12 20V8M6 13l6-6 6 6M4 4h16"/></svg>;
    case 'settings': return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>;
    case 'search': return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></svg>;
    case 'close': return <svg {...props}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case 'menu': return <svg {...props}><path d="M3 6h18M3 12h18M3 18h18"/></svg>;
    case 'shuffle': return <svg {...props}><path d="M16 3h5v5M21 3l-7 7M4 21l7-7M16 21h5v-5M3 3l18 18"/></svg>;
    case 'palette': return <svg {...props}><path d="M12 2a10 10 0 1 0 0 20c1 0 2-.5 2-2 0-1.5-1-1.5-1-3s1-2 2-2h2a5 5 0 0 0 5-5c0-5-4-8-10-8z"/><circle cx="7" cy="11" r="1"/><circle cx="9" cy="6.5" r="1"/><circle cx="14" cy="6.5" r="1"/><circle cx="17" cy="11" r="1"/></svg>;
    case 'lock': return <svg {...props}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>;
    case 'box': return <svg {...props}><path d="M12 3l9 5v8l-9 5-9-5V8l9-5zM3 8l9 5 9-5M12 13v9"/></svg>;
    case 'layers': return <svg {...props}><path d="M12 2l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5"/></svg>;
    case 'code': return <svg {...props}><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>;
    case 'play': return <svg {...props}><path d="M6 4l14 8-14 8V4z"/></svg>;
    case 'mic': return <svg {...props}><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>;
    case 'paperclip': return <svg {...props}><path d="M21 11l-9 9a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5L10 18a2 2 0 0 1-3-3l8-8"/></svg>;
    case 'sliders': return <svg {...props}><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h-2"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>;
    case 'branch': return <svg {...props}><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 7v10M6 11a4 4 0 0 0 4 4h2a4 4 0 0 0 4-4V8"/></svg>;
    case 'logo-mini': return <svg {...props}><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></svg>;
    default: return null;
  }
};

const Logo = ({ pro }) => (
  <div className="logo">
    <span className="mark">L</span>
    <span>Lumio{pro && <span style={{color:'var(--accent)', marginLeft:6, fontFamily:'var(--font-mono)', fontSize:11, fontWeight:600, letterSpacing:'.05em'}}>PRO</span>}</span>
  </div>
);

const ModeToggle = ({ mode, setMode }) => (
  <div className="mode-toggle">
    <button className={mode==='basic'?'active':''} onClick={() => setMode('basic')}>
      <Icon name="sparkle" size={12}/> 普通
    </button>
    <button className={mode==='pro'?'active':''} onClick={() => setMode('pro')}>
      <Icon name="layers" size={12}/> 专业
    </button>
  </div>
);

const TopBar = ({ mode, setMode, page, setPage, project }) => (
  <header style={{
    display:'flex', alignItems:'center', gap: 18,
    padding: '14px 24px',
    borderBottom: '1px solid var(--line)',
    background: 'var(--bg)',
    position: 'sticky', top: 0, zIndex: 50,
  }}>
    <Logo pro={mode==='pro'}/>
    {project && (
      <>
        <span style={{color:'var(--ink-4)', fontSize:13}}>›</span>
        <span style={{fontSize:13, color:'var(--ink-2)', fontWeight:500}}>{project}</span>
      </>
    )}
    <nav style={{display:'flex', gap: 4, marginLeft: 16}}>
      {[
        ['create', '创作'],
        ...(mode==='pro' ? [['projects','项目']] : []),
        ['gallery', '作品集'],
        ['explore', '探索'],
        ['learn', '教程'],
      ].map(([k, n]) => (
        <button key={k} onClick={() => setPage(k)} style={{
          border:'none', background: page===k ? 'var(--surface-2)':'transparent',
          padding:'6px 12px', borderRadius: 8,
          fontFamily:'var(--font-ui)', fontSize:13, fontWeight: page===k?600:500,
          color: page===k ? 'var(--ink)' : 'var(--ink-2)',
          cursor:'pointer'
        }}>{n}</button>
      ))}
    </nav>
    <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap: 10}}>
      <ModeToggle mode={mode} setMode={setMode}/>
      <button className="btn ghost sm"><Icon name="share" size={14}/></button>
      <span className="chip mono outline"><Icon name="sparkle" size={11}/> 128</span>
      <button className="btn sm"><Icon name="gift" size={13}/> 邀请有礼</button>
      <button className="btn primary sm"><Icon name="user" size={13}/> 登录</button>
    </div>
  </header>
);

Object.assign(window, { Icon, Logo, ModeToggle, TopBar });
