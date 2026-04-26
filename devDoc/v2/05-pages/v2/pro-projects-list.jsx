/* PRO project list landing — when user clicks "项目" nav */
const ProProjectsList = ({ openProject }) => {
  const projects = [
    { id:'wuyin', name:'雾隐之城', count:124, last:'2 小时前', color:'fog', desc:'蒸汽朋克 + 东方水墨', tag:'活跃' },
    { id:'galaxy', name:'星域旅人', count:67, last:'昨天', color:'ink', desc:'科幻 / 硬表面' },
    { id:'forest', name:'雾林祭典', count:41, last:'3 天前', color:'olive', desc:'吉卜力 / 暖色调' },
    { id:'mecha', name:'残骸机甲', count:28, last:'一周前', color:'dim', desc:'废土 / 机械' },
    { id:'cute', name:'萌宠开放日', count:19, last:'2 周前', color:'rose', desc:'卡通 / 童话' },
    { id:'noir', name:'雨夜侦探', count:14, last:'1 月前', color:'cool', desc:'黑色电影 / 高对比' },
  ];
  return (
    <div style={{maxWidth: 1280, margin:'0 auto', padding:'24px 24px 80px'}}>
      <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 18}}>
        <div>
          <h1 style={{margin:0, fontSize:24, fontWeight:700, letterSpacing:'-.01em'}}>项目</h1>
          <div className="muted" style={{fontSize:13, marginTop:2}}>每个项目维护一个独立的世界观、风格锁和资产库</div>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button className="btn sm"><Icon name="search" size={13}/> 搜索</button>
          <button className="btn sm"><Icon name="upload" size={13}/> 导入</button>
          <button className="btn primary"><Icon name="plus" size={14}/> 新建项目</button>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 16}}>
        {projects.map(p => (
          <div key={p.id} onClick={() => openProject(p.id)} className="card" style={{
            overflow:'hidden', cursor:'pointer', transition:'all .2s', boxShadow:'var(--shadow-sm)'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='var(--shadow-lg)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='var(--shadow-sm)'; }}>
            <div className={`imgph ${p.color}`} style={{aspectRatio:'16/9', position:'relative'}} data-label="">
              {p.tag && <span className="chip accent" style={{position:'absolute', top:10, left:10, fontSize:11}}>{p.tag}</span>}
              <div style={{position:'absolute', bottom:10, left:10, display:'flex', gap:3}}>
                {['#1a2333','#3d5a7c','#a39060','#d4a574','#f0e8d8'].map((c,i) =>
                  <div key={i} style={{width:14, height:14, borderRadius:3, background:c, border:'1.5px solid rgba(255,255,255,.5)'}}/>
                )}
              </div>
              <span className="chip mono" style={{position:'absolute', bottom:10, right:10, background:'rgba(0,0,0,.5)', color:'white'}}>
                <Icon name="image" size={10}/> {p.count}
              </span>
            </div>
            <div style={{padding:14}}>
              <div style={{fontSize:15, fontWeight:600}}>{p.name}</div>
              <div className="muted" style={{fontSize:12, marginTop:3}}>{p.desc}</div>
              <div className="cap" style={{marginTop:8}}>更新 {p.last}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

window.ProProjectsList = ProProjectsList;
