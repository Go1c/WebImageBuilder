/* Direction A — Tighten current 3-col: clearer hierarchy, library as drawer, batch grid */
const FrameA = () => (
  <Frame w={1280} h={820} bg="var(--paper)">
    <div style={{padding: 20, height:'100%', display:'flex', flexDirection:'column', gap: 14}}>
      {/* top — slim, single line */}
      <div style={{display:'flex', alignItems:'center', gap:16}}>
        <div style={{fontFamily:'var(--hand)', fontWeight:700, fontSize:18}}>◆ Lumio</div>
        <div className="mono" style={{fontSize:11, color:'var(--ink-faint)'}}>IMAGE STUDIO / 游戏美术</div>
        <div style={{marginLeft:'auto', display:'flex', gap:10, alignItems:'center'}}>
          <span className="mono" style={{fontSize:11, color:'var(--ink-soft)'}}>探索 · 作品集 · 教程</span>
          <Chip variant="faint">128 次</Chip>
          <Btn sm>登录</Btn>
        </div>
      </div>
      <div className="div-h"/>

      <div style={{display:'grid', gridTemplateColumns:'260px 1fr', gap: 14, flex: 1, minHeight:0}}>
        {/* left — focused prompt panel */}
        <div className="sketchy" style={{padding: 14, display:'flex', flexDirection:'column', gap: 12}}>
          <div className="cap">PROMPT</div>
          <Ph h={120} label="主提示词&#10;（多行 · 大输入）"/>
          <div style={{display:'flex', gap:6}}>
            <Chip>+ 参考图</Chip>
            <Chip>+ 负向</Chip>
          </div>
          <div className="div-h"/>

          <div className="cap">方向 (1 选)</div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:4}}>
            {['场景原画','角色立绘','UI / 图标','3D 概念','特效','写实'].map((t,i) =>
              <div key={t} className="sketchy" style={{padding:'6px 4px', fontFamily:'var(--hand)', fontSize:12, textAlign:'center', background: i===0?'var(--ink)':'transparent', color: i===0?'var(--paper)':'var(--ink)'}}>{t}</div>
            )}
          </div>

          <div className="cap">画幅</div>
          <div style={{display:'flex', gap:4}}>
            {['1:1','3:4','16:9','9:16'].map((t,i) =>
              <Chip key={t} variant={i===2?'dark':''}>{t}</Chip>
            )}
          </div>

          <div className="cap">细节 ●●●○○</div>
          <div className="cap">数量 · 4 张/批</div>

          <div style={{marginTop:'auto'}}>
            <Btn variant="accent" style={{width:'100%', justifyContent:'center'}}>⏎ 生成 4 张</Btn>
            <div className="mono" style={{fontSize:10, color:'var(--ink-faint)', marginTop:6, textAlign:'center'}}>预计 12s · 消耗 4 次</div>
          </div>
        </div>

        {/* right — batch grid + history strip */}
        <div style={{display:'flex', flexDirection:'column', gap: 10, minHeight: 0}}>
          <div className="sketchy" style={{padding:10, display:'flex', alignItems:'center', gap: 10}}>
            <span className="mono" style={{fontSize:11}}>BATCH #07</span>
            <span style={{fontFamily:'var(--hand)', fontSize:13}}>柔光晨光下的山间湖泊，电影感</span>
            <span className="mono" style={{fontSize:10, color:'var(--ink-faint)', marginLeft:'auto'}}>1024² · 6.2s</span>
            <Btn sm>保存全部</Btn>
            <Btn sm>♻ 再来一批</Btn>
          </div>

          {/* 4-up grid */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gridTemplateRows:'1fr 1fr', gap: 8, flex: 1, minHeight: 0}}>
            {[
              {seed:'#a31f', star: true},
              {seed:'#b440'},
              {seed:'#c552'},
              {seed:'#d693'},
            ].map((c,i) => (
              <div key={i} className="sketchy" style={{padding:6, display:'flex', flexDirection:'column', gap:4, background: c.star?'var(--accent-soft)':'var(--paper)'}}>
                <Ph label={`输出 ${i+1}`} style={{flex:1, minHeight:0}}/>
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                  <span className="mono" style={{fontSize:10}}>seed {c.seed}</span>
                  <div style={{display:'flex', gap:4}}>
                    <Chip variant={c.star?'accent':''}>★</Chip>
                    <Chip>变体</Chip>
                    <Chip>放大</Chip>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* history strip */}
          <div className="sketchy" style={{padding:8, display:'flex', alignItems:'center', gap:6}}>
            <span className="cap" style={{marginBottom:0, marginRight:4}}>历史批次</span>
            {[1,2,3,4,5,6,7,8].map(i => <Ph key={i} w={48} h={48} label="" tight/>)}
            <span className="mono" style={{fontSize:10, color:'var(--ink-faint)', marginLeft:'auto'}}>· · ·</span>
          </div>
        </div>
      </div>

      {/* Floating: library as drawer button */}
      <div style={{position:'absolute', right: 24, bottom: 24}}>
        <Btn variant="primary">⊞ 素材库</Btn>
      </div>
    </div>

    {/* Annotations */}
    <Note style={{top: 60, right: 14, maxWidth: 170, color:'var(--good)'}}>
      ✓ 顶部信息合并<br/>
      <span style={{fontSize:12, color:'var(--ink-soft)', fontWeight:400}}>导航变 mono 文本，<br/>不抢戏</span>
    </Note>

    <Note style={{top: 320, left: -4, maxWidth: 160, color:'var(--good)'}}>
      ✓ 单一 CTA<br/>
      <span style={{fontSize:12, color:'var(--ink-soft)', fontWeight:400}}>批量数量 +<br/>预估时间一目了然</span>
    </Note>
    <Arrow from={[160, 660]} to={[200, 720]} curve={-30} color="var(--good)"/>

    <Note style={{top: 240, left: 660, maxWidth: 180, color:'var(--good)'}}>
      ✓ 一次出 4 张<br/>
      <span style={{fontSize:12, color:'var(--ink-soft)', fontWeight:400}}>seed 可见 ·<br/>变体/放大就近</span>
    </Note>

    <Note style={{bottom: 80, right: 80, maxWidth: 170}}>
      素材库 → 收成抽屉<br/>
      <span style={{fontSize:12, color:'var(--ink-soft)', fontWeight:400}}>
        默认隐藏，点击展开<br/>覆盖右栏
      </span>
    </Note>
  </Frame>
);

window.FrameA = FrameA;
