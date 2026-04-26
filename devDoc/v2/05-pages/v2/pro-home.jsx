/* PRO mode home — project as root, batch + seed derivation */
const ProHome = ({ openProject }) => {
  const projects = [
    { id: 'wuyin', name: '雾隐之城', count: 124, last: '2 小时前', color: 'fog', desc: '蒸汽朋克 + 东方水墨' },
    { id: 'galaxy', name: '星域旅人', count: 67, last: '昨天', color: 'ink', desc: '科幻 / 硬表面' },
    { id: 'forest', name: '雾林祭典', count: 41, last: '3 天前', color: 'olive', desc: '吉卜力 / 暖色调' },
    { id: 'mecha', name: '残骸机甲', count: 28, last: '一周前', color: 'dim', desc: '废土 / 机械' },
  ];

  return (
    <div style={{maxWidth: 1280, margin: '0 auto', padding: '24px 24px 80px'}}>
      {/* Quick command bar — pro style */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 'var(--radius-lg)', padding: 14, boxShadow: 'var(--shadow)',
        display: 'flex', alignItems: 'center', gap: 10
      }}>
        <Icon name="sparkle" size={18} style={{color:'var(--accent)', flexShrink:0}}/>
        <input className="input lg" placeholder="开始描述，或选下方项目继续工作..." style={{
          border:'none', outline:'none', background:'transparent', flex:1, padding:'8px 0', fontSize:15
        }}/>
        <button className="btn sm"><Icon name="folder" size={13}/> 选项目</button>
        <button className="btn sm"><Icon name="lock" size={13}/> 风格锁</button>
        <span className="chip mono outline">16:9</span>
        <span className="chip mono outline">×4</span>
        <button className="btn accent"><Icon name="wand" size={14}/> 生成</button>
      </div>

      {/* My projects */}
      <div style={{marginTop: 32}}>
        <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 14}}>
          <div>
            <h2 style={{margin:0, fontSize: 22, fontWeight:700, letterSpacing:'-.01em'}}>我的项目</h2>
            <div className="muted" style={{fontSize: 13, marginTop: 2}}>每个项目 = 一个世界观 · 内置风格锁与资产分组</div>
          </div>
          <button className="btn primary"><Icon name="plus" size={14}/> 新建项目</button>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 14}}>
          {projects.map(p => (
            <div key={p.id} onClick={() => openProject(p.id)} className="card" style={{
              overflow:'hidden', cursor:'pointer', transition:'all .2s',
              boxShadow: 'var(--shadow-sm)'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='var(--shadow-lg)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='var(--shadow-sm)'; }}>
              <div className={`imgph ${p.color}`} style={{aspectRatio:'4/3', position:'relative'}} data-label="">
                <div style={{
                  position:'absolute', top:8, left:8, display:'flex', gap:4
                }}>
                  {['#1a2333','#3d5a7c','#a39060','#d4a574'].map((c,i) =>
                    <div key={i} style={{width:14, height:14, borderRadius:3, background:c, border:'1.5px solid rgba(255,255,255,.5)'}}/>
                  )}
                </div>
                <div style={{position:'absolute', bottom:8, right:8}}>
                  <span className="chip mono" style={{background:'rgba(0,0,0,.5)', color:'white'}}>
                    <Icon name="image" size={10}/> {p.count}
                  </span>
                </div>
              </div>
              <div style={{padding:'12px 14px'}}>
                <div style={{fontWeight:600, fontSize:14}}>{p.name}</div>
                <div className="muted" style={{fontSize:12, marginTop:2}}>{p.desc}</div>
                <div className="cap" style={{marginTop:6}}>更新 {p.last}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent batches — across projects */}
      <div style={{marginTop: 36}}>
        <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 14}}>
          <h2 style={{margin:0, fontSize: 18, fontWeight:700}}>最近的批次</h2>
          <div className="muted mono" style={{fontSize: 11}}>跨项目 · 最近 7 天</div>
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          {[
            { batch:'#08', proj:'雾隐之城', prompt:'晨光下的山间湖泊，远景古城，电影感构图', count:4, time:'2h 前', star:2 },
            { batch:'#07', proj:'雾隐之城', prompt:'雾港码头，暖色路灯，蒸汽船', count:4, time:'2h 前', star:1 },
            { batch:'#23', proj:'星域旅人', prompt:'空间站走廊，硬表面，蓝白冷光', count:4, time:'昨天', star:0 },
          ].map((b,i) => (
            <div key={i} className="card" style={{padding:12, display:'flex', alignItems:'center', gap:12}}>
              <span className="chip mono dark">{b.batch}</span>
              <span className="muted" style={{fontSize:12}}>{b.proj}</span>
              <span style={{flex:1, fontSize:13, color:'var(--ink-2)'}}>{b.prompt}</span>
              <div style={{display:'flex', gap:4}}>
                {[0,1,2,3].map(j => (
                  <div key={j} className={`imgph ${['fog','dawn','olive','rose'][(i+j)%4]}`} style={{width:48, height:48, borderRadius:6, position:'relative'}} data-label="">
                    {j < b.star && <div style={{position:'absolute', top:2, right:2, color:'#ffd700'}}><Icon name="star" size={10} stroke={2}/></div>}
                  </div>
                ))}
              </div>
              <span className="cap">{b.time}</span>
              <button className="btn ghost sm"><Icon name="arrow-right" size={13}/></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

window.ProHome = ProHome;
