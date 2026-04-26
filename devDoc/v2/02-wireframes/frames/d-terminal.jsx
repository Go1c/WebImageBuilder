/* Direction D — Terminal-style command + version tree (pro tool feel) */
const FrameD = () => (
  <Frame w={1280} h={820} bg="#15161a">
    <div style={{padding: 20, height:'100%', display:'flex', flexDirection:'column', gap: 12, color:'#e8e6df'}}>
      {/* top */}
      <div style={{display:'flex', alignItems:'center', gap:14}}>
        <div style={{fontFamily:'var(--hand)', fontWeight:700, fontSize:18}}>◆ Lumio</div>
        <span className="mono" style={{fontSize:11, color:'#8a8780'}}>~/projects/雾隐之城/scenes</span>
        <span className="mono" style={{fontSize:11, color:'#8a8780'}}>· branch: main</span>
        <div style={{marginLeft:'auto', display:'flex', gap:8, alignItems:'center'}}>
          <span className="mono" style={{fontSize:11, color:'#8a8780'}}>⌘K</span>
          <span className="mono" style={{fontSize:11, color:'#8a8780'}}>· 128 credits</span>
        </div>
      </div>
      <div style={{height:1, background:'#2a2c33'}}/>

      <div style={{display:'grid', gridTemplateColumns:'280px 1fr 320px', gap: 12, flex:1, minHeight:0}}>
        {/* left — version tree */}
        <div style={{border:'1.5px solid #2a2c33', padding:12, display:'flex', flexDirection:'column', gap:6, fontFamily:'var(--mono)', fontSize:11, background:'#1a1c20'}}>
          <div style={{color:'#8a8780', textTransform:'uppercase', letterSpacing:'.08em', fontSize:10, marginBottom: 4}}>HISTORY</div>
          {[
            ['● a31f', '初版构图', false],
            ['│', '', false],
            ['├─ b440', '+ 雾气', false],
            ['│  │', '', false],
            ['│  └─ c552', '+ 暖色', false],
            ['│', '', false],
            ['├─ d693', '换镜头', false],
            ['│', '', false],
            ['● e7a4', '加远景古城', true],
            ['│', '', false],
            ['├─ f810', '同 seed × 4', false],
            ['│', '', false],
            ['└─ g921', '风格锁应用', false],
            ['', '', false],
          ].map(([a,b,sel], i) => (
            <div key={i} style={{
              display:'flex', gap:8,
              color: sel?'#ff5a3c': (b? '#e8e6df' : '#5a5c63'),
              background: sel?'rgba(255,90,60,.1)':'transparent',
              padding: sel?'2px 6px':'0 6px',
              borderRadius: 3,
            }}>
              <span style={{whiteSpace:'pre'}}>{a}</span>
              <span style={{flex:1}}>{b}</span>
            </div>
          ))}
          <div style={{marginTop:'auto', borderTop:'1px solid #2a2c33', paddingTop:8}}>
            <span className="mono" style={{fontSize:10, color:'#8a8780'}}>分支当前: e7a4 → f810</span>
          </div>
        </div>

        {/* center — generated images */}
        <div style={{border:'1.5px solid #2a2c33', padding:12, background:'#1a1c20', display:'flex', flexDirection:'column', gap:10, minHeight:0}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <span style={{fontFamily:'var(--mono)', fontSize:11, color:'#ff5a3c'}}>● e7a4</span>
            <span style={{fontFamily:'var(--mono)', fontSize:12}}>加远景古城</span>
            <span style={{fontFamily:'var(--mono)', fontSize:10, color:'#8a8780', marginLeft:'auto'}}>2026-04-26 14:32 · 6.2s</span>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, flex:1, minHeight:0}}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{border: i===2?'2px solid #ff5a3c':'1.5px solid #2a2c33', padding:5, background:'#0e0f12', display:'flex', flexDirection:'column'}}>
                <div style={{flex:1, minHeight:0,
                  background:'repeating-linear-gradient(135deg, transparent 0, transparent 6px, rgba(255,255,255,.06) 6px, rgba(255,255,255,.06) 7px)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:'var(--mono)', fontSize:10, color:'#5a5c63'
                }}>e7a4-{i}</div>
                <div style={{display:'flex', justifyContent:'space-between', marginTop:4, fontFamily:'var(--mono)', fontSize:9, color:'#8a8780'}}>
                  <span>seed {i}af3</span>
                  <span>{i===2?'★':'·'}</span>
                </div>
              </div>
            ))}
          </div>

          {/* command input */}
          <div style={{border:'1.5px solid #ff5a3c', borderRadius:4, padding:'10px 12px', background:'#0e0f12', display:'flex', alignItems:'center', gap:8}}>
            <span style={{fontFamily:'var(--mono)', fontSize:13, color:'#ff5a3c'}}>›</span>
            <span style={{fontFamily:'var(--mono)', fontSize:13, flex:1}}>
              gen "晨光下的山间湖泊，远景古城" --ratio 16:9 --batch 4 --lock 雾隐主美<span style={{color:'#ff5a3c'}}>▌</span>
            </span>
            <span style={{fontFamily:'var(--mono)', fontSize:10, color:'#8a8780'}}>⏎ 执行</span>
          </div>
          <div style={{fontFamily:'var(--mono)', fontSize:10, color:'#8a8780'}}>
            提示: <span style={{color:'#e8e6df'}}>vary 2</span> 派生第 2 张 · <span style={{color:'#e8e6df'}}>up 2</span> 放大 · <span style={{color:'#e8e6df'}}>?</span> 查看全部命令
          </div>
        </div>

        {/* right — params + metadata */}
        <div style={{border:'1.5px solid #2a2c33', padding:12, background:'#1a1c20', display:'flex', flexDirection:'column', gap:8, fontFamily:'var(--mono)', fontSize:11}}>
          <div style={{color:'#8a8780', textTransform:'uppercase', letterSpacing:'.08em', fontSize:10}}>PARAMS</div>
          {[
            ['model','lumio-v2.1'],
            ['ratio','16:9'],
            ['steps','32'],
            ['cfg','7.5'],
            ['seed','e7a4···'],
            ['lock','雾隐主美'],
            ['ref imgs','3'],
            ['neg','blurry, lowres'],
          ].map(([k,v]) => (
            <div key={k} style={{display:'flex', justifyContent:'space-between'}}>
              <span style={{color:'#8a8780'}}>{k}</span>
              <span>{v}</span>
            </div>
          ))}
          <div style={{height:1, background:'#2a2c33', margin:'4px 0'}}/>
          <div style={{color:'#8a8780', textTransform:'uppercase', letterSpacing:'.08em', fontSize:10}}>EXPORT</div>
          <div style={{display:'flex', flexDirection:'column', gap:4}}>
            {['PNG 4K','PSD 分层','工程 .lumio','ComfyUI JSON','API curl'].map(x =>
              <div key={x} style={{padding:'4px 8px', border:'1px solid #2a2c33', borderRadius:3}}>{x}</div>
            )}
          </div>
          <div style={{marginTop:'auto', color:'#8a8780', fontSize:10}}>提示: 拖任意图片到此面板可读取参数</div>
        </div>
      </div>
    </div>

    {/* annotations (red on dark) */}
    <Note style={{top: 90, left: 14, maxWidth: 170}}>
      版本树<br/>
      <span style={{fontSize:12, color:'#a8a8a8', fontWeight:400}}>
        像 git，每次生成<br/>是一次 commit
      </span>
    </Note>

    <Note style={{bottom: 130, left: 380, maxWidth: 220, color:'#ffe680'}}>
      命令行 prompt<br/>
      <span style={{fontSize:12, color:'#a8a8a8', fontWeight:400}}>
        熟手快，不熟者用 ? <br/>展开为表单
      </span>
    </Note>

    <Note style={{top: 90, right: 14, maxWidth: 170, color:'#ffe680'}}>
      参数全部可读<br/>
      <span style={{fontSize:12, color:'#a8a8a8', fontWeight:400}}>
        seed/cfg/steps 都不藏，<br/>美术圈就吃这套
      </span>
    </Note>

    <Note style={{bottom: 24, left: 24, maxWidth: 240, color:'#a8a8a8', fontSize:13}}>
      ✦ 风险: 上手陡<br/>
      <span style={{fontSize:11, fontWeight:400}}>
        建议保留"基础模式"开关
      </span>
    </Note>
  </Frame>
);

window.FrameD = FrameD;
