/* PRO mode — Project detail / batch generation workspace */
const ProProject = ({ projectId, onBack }) => {
  const [selected, setSelected] = React.useState(1);

  const project = {
    name: '雾隐之城',
    desc: '蒸汽朋克 + 东方水墨，低饱和，霓虹冷光',
    palette: ['#1a2333','#3d5a7c','#a39060','#d4a574','#f0e8d8'],
  };

  return (
    <div style={{display:'grid', gridTemplateColumns:'260px 1fr 320px', height:'calc(100vh - 65px)', overflow:'hidden'}}>

      {/* LEFT: project / world panel */}
      <aside className="scroll" style={{
        borderRight:'1px solid var(--line)', overflow:'auto', padding: 16,
        display:'flex', flexDirection:'column', gap: 14, background:'var(--bg)'
      }}>
        <button onClick={onBack} className="btn ghost sm" style={{alignSelf:'flex-start', marginLeft:-6}}>
          ← 全部项目
        </button>

        <div className="imgph fog" style={{height:100, borderRadius:'var(--radius)'}} data-label=""/>
        <div>
          <div style={{fontWeight:700, fontSize:16}}>{project.name}</div>
          <div className="muted" style={{fontSize:12, marginTop:2}}>{project.desc}</div>
        </div>

        <div className="divider"/>

        <div>
          <div className="cap" style={{marginBottom:6}}>风格锁 · 3 张</div>
          <div style={{display:'flex', gap:6}}>
            {['warm','fog','olive'].map((c,i) =>
              <div key={i} className={`imgph ${c}`} style={{width:56, height:56, borderRadius:6, position:'relative'}} data-label="">
                <div style={{position:'absolute', top:2, right:2, color:'var(--accent)'}}>
                  <Icon name="lock" size={10} stroke={2.5}/>
                </div>
              </div>
            )}
            <button className="btn ghost sm" style={{width:56, height:56, padding:0}}><Icon name="plus" size={16}/></button>
          </div>
        </div>

        <div>
          <div className="cap" style={{marginBottom:6}}>调色板</div>
          <div style={{display:'flex', gap:4}}>
            {project.palette.map(c =>
              <div key={c} style={{width:28, height:28, borderRadius:6, background:c, border:'1px solid var(--line-2)'}} title={c}/>
            )}
          </div>
        </div>

        <div className="divider"/>

        <div>
          <div className="cap" style={{marginBottom:8}}>资产分类</div>
          <div style={{display:'flex', flexDirection:'column', gap:2}}>
            {[
              ['场景', 48, true],
              ['角色', 31, false],
              ['道具', 22, false],
              ['UI / 图标', 14, false],
              ['特效', 9, false],
            ].map(([n, c, sel]) => (
              <div key={n} style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'6px 10px', borderRadius:6,
                background: sel?'var(--ink)':'transparent',
                color: sel?'var(--bg)':'var(--ink-2)',
                fontSize:13, fontWeight: sel?600:500, cursor:'pointer',
              }}>
                <span>{n}</span>
                <span className="mono" style={{fontSize:11, opacity:.7}}>{c}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="divider"/>
        <button className="btn block"><Icon name="settings" size={14}/> 项目设置</button>
        <button className="btn block"><Icon name="share" size={14}/> 分享给团队</button>
      </aside>

      {/* CENTER: prompt + batch grid */}
      <main className="scroll" style={{overflow:'auto', padding: 20, display:'flex', flexDirection:'column', gap: 16}}>

        {/* prompt bar */}
        <div className="card" style={{padding:14, boxShadow:'var(--shadow-sm)'}}>
          <div style={{display:'flex', alignItems:'flex-start', gap:10}}>
            <Icon name="sparkle" size={18} style={{color:'var(--accent)', marginTop:6, flexShrink:0}}/>
            <textarea defaultValue="柔光晨光下的山间湖泊，远景古城轮廓，电影感构图" rows={2} style={{
              flex:1, border:'none', outline:'none', resize:'none',
              fontFamily:'var(--font-ui)', fontSize:15, lineHeight:1.5,
              background:'transparent', color:'var(--ink)', padding:'4px 0'
            }}/>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8, marginTop:10, paddingTop:10, borderTop:'1px solid var(--line)'}}>
            <span className="chip outline mono"><Icon name="lock" size={10}/> 雾隐主美</span>
            <span className="chip outline mono"><Icon name="paperclip" size={10}/> 参考 ×2</span>
            <span className="chip outline mono">16:9</span>
            <span className="chip outline mono">×4</span>
            <button className="btn ghost sm"><Icon name="sliders" size={13}/> 高级</button>
            <span style={{flex:1}}/>
            <button className="btn accent sm"><Icon name="wand" size={13}/> 生成</button>
          </div>
        </div>

        {/* current batch */}
        <div>
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
            <span className="chip dark mono">BATCH #08</span>
            <span className="muted" style={{fontSize:12}}>2 分钟前 · 6.2s</span>
            <span style={{flex:1}}/>
            <button className="btn ghost sm"><Icon name="grid" size={13}/> 对比</button>
            <button className="btn ghost sm"><Icon name="shuffle" size={13}/> 拼接</button>
            <button className="btn sm"><Icon name="download" size={13}/> 全部导出</button>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10}}>
            {[0,1,2,3].map(i => (
              <div key={i} onClick={()=>setSelected(i)} className="card" style={{
                overflow:'hidden', cursor:'pointer',
                border: selected===i?'2px solid var(--accent)':'1px solid var(--line)',
                padding: 0, position:'relative'
              }}>
                <div className={`imgph ${['fog','dawn','olive','warm'][i]}`} style={{aspectRatio:'16/9'}} data-label=""/>
                {selected===i && (
                  <div style={{position:'absolute', top:8, left:8, background:'var(--accent)', color:'white', borderRadius:'50%', width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center'}}>
                    <Icon name="check" size={12} stroke={2.5}/>
                  </div>
                )}
                <div style={{padding:'8px 10px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <span className="mono" style={{fontSize:11, color:'var(--ink-3)'}}>seed a3{i}f</span>
                  <span style={{color: i===1 ? '#e8b800' : 'var(--ink-4)'}}>
                    <Icon name="star" size={13} stroke={i===1?2.5:1.6}/>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* derived */}
        <div>
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
            <Icon name="branch" size={14} style={{color:'var(--accent)'}}/>
            <span style={{fontSize:13, fontWeight:600}}>基于 #08-2 派生</span>
            <span className="chip mono outline sm">BATCH #09</span>
            <span className="muted" style={{fontSize:12}}>同 seed · 微调 prompt</span>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10}}>
            {[0,1,2,3].map(i => (
              <div key={i} className="card" style={{overflow:'hidden', padding:0}}>
                <div className={`imgph ${['fog','warm','dawn','olive'][i]}`} style={{aspectRatio:'16/9', filter:'saturate(1.05)'}} data-label=""/>
                <div style={{padding:'6px 10px', display:'flex', justifyContent:'space-between'}}>
                  <span className="mono" style={{fontSize:11, color:'var(--ink-3)'}}>seed b1{i}c</span>
                  <span style={{color:'var(--ink-4)'}}><Icon name="star" size={12}/></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* derive actions */}
        <div style={{display:'flex', gap:8, padding:12, background:'var(--surface-2)', borderRadius:'var(--radius)'}}>
          <span className="cap" style={{alignSelf:'center', marginRight:4}}>派生:</span>
          <button className="btn sm"><Icon name="shuffle" size={12}/> 同 seed × 4</button>
          <button className="btn sm"><Icon name="palette" size={12}/> 风格变体</button>
          <button className="btn sm"><Icon name="image" size={12}/> 局部重绘</button>
          <button className="btn sm"><Icon name="plus" size={12}/> 4× 放大</button>
          <span style={{flex:1}}/>
          <button className="btn primary sm"><Icon name="folder" size={12}/> 收入「场景 / 第一章」</button>
        </div>

      </main>

      {/* RIGHT: inspector / params + export */}
      <aside className="scroll" style={{
        borderLeft:'1px solid var(--line)', overflow:'auto', padding:16,
        display:'flex', flexDirection:'column', gap: 14, background:'var(--bg)'
      }}>
        <div className="cap">已选 · #08-{selected+1}</div>
        <div className={`imgph ${['fog','dawn','olive','warm'][selected]}`} style={{aspectRatio:'16/9', borderRadius:'var(--radius)'}} data-label=""/>

        <div className="divider"/>
        <div className="cap">参数</div>
        <div style={{display:'flex', flexDirection:'column', gap:4, fontFamily:'var(--font-mono)', fontSize:11}}>
          {[
            ['model','lumio-v2.1'],
            ['ratio','16:9'],
            ['steps','32'],
            ['cfg','7.5'],
            ['seed',`a3${selected}f···`],
            ['lock','雾隐主美'],
            ['ref imgs','2'],
          ].map(([k,v]) => (
            <div key={k} style={{display:'flex', justifyContent:'space-between', padding:'3px 0'}}>
              <span style={{color:'var(--ink-3)'}}>{k}</span>
              <span style={{color:'var(--ink)'}}>{v}</span>
            </div>
          ))}
        </div>

        <div className="divider"/>
        <div className="cap">专业出口</div>
        <div style={{display:'flex', flexDirection:'column', gap:6}}>
          <button className="btn sm"><Icon name="download" size={12}/> PNG · 4K 放大</button>
          <button className="btn sm"><Icon name="layers" size={12}/> PSD · 分图层</button>
          <button className="btn sm"><Icon name="box" size={12}/> 工程 .lumio</button>
          <button className="btn sm"><Icon name="code" size={12}/> ComfyUI JSON</button>
          <button className="btn sm"><Icon name="code" size={12}/> API · cURL</button>
        </div>

        <div className="divider"/>
        <button className="btn primary block"><Icon name="folder" size={13}/> 保存到项目</button>
      </aside>
    </div>
  );
};

window.ProProject = ProProject;
