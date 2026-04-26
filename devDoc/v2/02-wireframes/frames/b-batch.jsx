/* Direction B — Batch / Seed comparison workflow (game-art native) */
const FrameB = () => (
  <Frame w={1280} h={820} bg="var(--paper)">
    <div style={{padding: 18, height:'100%', display:'flex', flexDirection:'column', gap: 12}}>
      {/* slim top */}
      <div style={{display:'flex', alignItems:'center', gap:14}}>
        <div style={{fontFamily:'var(--hand)', fontWeight:700, fontSize:18}}>◆ Lumio</div>
        <span className="mono" style={{fontSize:11, color:'var(--ink-faint)'}}>/ 项目: 雾隐之城</span>
        <span className="mono" style={{fontSize:11, color:'var(--ink-faint)'}}>· 场景原画</span>
        <div style={{marginLeft:'auto', display:'flex', gap:8, alignItems:'center'}}>
          <Chip variant="faint">⌘K 命令面板</Chip>
          <Chip>128</Chip>
          <Btn sm>登录</Btn>
        </div>
      </div>
      <div className="div-h"/>

      {/* prompt bar — single row, dominant */}
      <div className="sketchy thick" style={{padding:'12px 14px', display:'flex', alignItems:'center', gap: 12, background: 'var(--paper)'}}>
        <span className="mono" style={{fontSize:11, color:'var(--ink-faint)'}}>PROMPT &gt;</span>
        <span style={{fontFamily:'var(--hand)', fontSize:15, flex:1}}>柔光晨光下的山间湖泊，远景古城轮廓，电影感构图...</span>
        <Chip>+ 参考图 2</Chip>
        <Chip>风格锁: 雾隐主美</Chip>
        <span className="mono" style={{fontSize:11, color:'var(--ink-faint)'}}>16:9 · 4 张</span>
        <Btn variant="accent">⏎ 生成</Btn>
      </div>

      {/* main 3-up: side rail + grid + inspector */}
      <div style={{display:'grid', gridTemplateColumns:'56px 1fr 280px', gap:12, flex:1, minHeight:0}}>
        {/* icon rail */}
        <div className="sketchy" style={{padding:8, display:'flex', flexDirection:'column', alignItems:'center', gap:10}}>
          {['◐','▣','◇','◆','◈','◉','✦'].map((g,i) =>
            <div key={i} style={{
              width:36, height:36, border:'1.5px solid var(--ink)', borderRadius:6,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:'var(--mono)', fontSize:14,
              background: i===1?'var(--ink)':'transparent', color: i===1?'var(--paper)':'var(--ink)'
            }}>{g}</div>
          )}
        </div>

        {/* main grid: 8 thumbs (2 batches of 4) */}
        <div className="sketchy" style={{padding:12, display:'flex', flexDirection:'column', gap: 10, minHeight:0}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <span className="mono" style={{fontSize:11}}>BATCH #08</span>
            <span style={{fontFamily:'var(--hand)', fontSize:13, color:'var(--ink-soft)'}}>· 4 候选 · 选中 1 张做变体</span>
            <span className="mono" style={{fontSize:10, color:'var(--ink-faint)', marginLeft:'auto'}}>对比 · 大图 · 拼接</span>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8}}>
            {[
              {sel:false}, {sel:true, focus:true}, {sel:false}, {sel:false}
            ].map((c,i) => (
              <div key={i} className="sketchy" style={{padding:5, background: c.focus?'var(--accent-soft)':'var(--paper)', borderColor: c.focus?'var(--accent)':'var(--ink)', borderWidth: c.focus?2.5:2}}>
                <Ph h={150} label={`#08-${i+1}`}/>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4}}>
                  <span className="mono" style={{fontSize:9}}>seed a3{i}f</span>
                  <span className="mono" style={{fontSize:10}}>{c.focus?'★':'☆'}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="cap" style={{marginTop:6}}>↓ 基于 #08-2 派生</div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8}}>
            {[0,1,2,3].map(i => (
              <div key={i} className="sketchy" style={{padding:5}}>
                <Ph h={150} label={`#09-${i+1}`}/>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4}}>
                  <span className="mono" style={{fontSize:9}}>seed b1{i}c</span>
                  <span className="mono" style={{fontSize:10}}>☆</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{display:'flex', gap:6, marginTop:'auto'}}>
            <Btn sm>+ 再 4 张同 seed</Btn>
            <Btn sm>+ 4 张随机</Btn>
            <Btn sm>+ 风格变体</Btn>
            <Btn sm style={{marginLeft:'auto'}}>导出选中</Btn>
          </div>
        </div>

        {/* inspector — selected image params */}
        <div className="sketchy" style={{padding:12, display:'flex', flexDirection:'column', gap:10}}>
          <div className="cap">已选 · #08-2</div>
          <Ph h={140} label="放大预览"/>
          <div className="div-h"/>
          <div style={{display:'flex', flexDirection:'column', gap: 4, fontFamily:'var(--mono)', fontSize:11}}>
            <div style={{display:'flex', justifyContent:'space-between'}}><span>seed</span><span>a31f...</span></div>
            <div style={{display:'flex', justifyContent:'space-between'}}><span>steps</span><span>32</span></div>
            <div style={{display:'flex', justifyContent:'space-between'}}><span>cfg</span><span>7.5</span></div>
            <div style={{display:'flex', justifyContent:'space-between'}}><span>model</span><span>lumio-v2.1</span></div>
            <div style={{display:'flex', justifyContent:'space-between'}}><span>style-lock</span><span>雾隐主美</span></div>
          </div>
          <div className="div-h"/>
          <Btn sm>放大 4×</Btn>
          <Btn sm>抠主体</Btn>
          <Btn sm>导出 PSD 分层</Btn>
          <Btn sm>复制为 ComfyUI 节点</Btn>
          <Btn variant="primary" sm>保存到「场景 / 第一章」</Btn>
        </div>
      </div>
    </div>

    {/* annotations */}
    <Note style={{top: 80, left: 280, maxWidth: 200, color:'var(--good)'}}>
      ✓ Prompt 升为<br/>顶部命令栏<br/>
      <span style={{fontSize:12, color:'var(--ink-soft)', fontWeight:400}}>风格锁 / 项目都<br/>就近声明</span>
    </Note>

    <Note style={{top: 280, left: 4, maxWidth: 140}}>
      左侧切换<br/>美术大类<br/>
      <span style={{fontSize:12, color:'var(--ink-soft)', fontWeight:400}}>把"7 个 chip"<br/>升级成图标导航</span>
    </Note>

    <Note style={{bottom: 230, left: 360, maxWidth: 180, color:'var(--good)'}}>
      ✓ 派生关系可视<br/>
      <span style={{fontSize:12, color:'var(--ink-soft)', fontWeight:400}}>选中 → 再生成 →<br/>新一行成为子代</span>
    </Note>

    <Note style={{top: 250, right: 14, maxWidth: 170, color:'var(--good)'}}>
      ✓ 专业出口<br/>
      <span style={{fontSize:12, color:'var(--ink-soft)', fontWeight:400}}>PSD 分层 ·<br/>ComfyUI 节点 ·<br/>seed 全可读</span>
    </Note>
  </Frame>
);

window.FrameB = FrameB;
