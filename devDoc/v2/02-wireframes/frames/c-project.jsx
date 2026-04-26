/* Direction C — Project / World as the root unit */
const FrameC = () => (
  <Frame w={1280} h={820} bg="var(--paper-2)">
    <div style={{padding: 20, height:'100%', display:'flex', flexDirection:'column', gap: 14}}>
      {/* breadcrumb top */}
      <div style={{display:'flex', alignItems:'center', gap: 10}}>
        <div style={{fontFamily:'var(--hand)', fontWeight:700, fontSize:18}}>◆ Lumio</div>
        <span className="mono" style={{fontSize:12, color:'var(--ink-faint)'}}>›</span>
        <span className="mono" style={{fontSize:12}}>项目</span>
        <span className="mono" style={{fontSize:12, color:'var(--ink-faint)'}}>›</span>
        <span style={{fontFamily:'var(--hand)', fontSize:16, fontWeight:700}} className="hl">雾隐之城</span>
        <span className="mono" style={{fontSize:11, color:'var(--ink-faint)'}}>· 124 张 · 上次活动 2h 前</span>
        <div style={{marginLeft:'auto', display:'flex', gap:8}}>
          <Chip>分享</Chip>
          <Chip>导出工程</Chip>
          <Btn sm variant="primary">+ 新建项目</Btn>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'240px 1fr', gap: 14, flex:1, minHeight:0}}>
        {/* world panel — defines the project DNA */}
        <div className="sketchy thick rounded" style={{padding:14, display:'flex', flexDirection:'column', gap: 10, background: 'var(--paper)'}}>
          <div className="cap">世界观 · WORLD</div>
          <Ph h={90} label="世界观封面图&#10;(主美定调)"/>
          <div style={{fontFamily:'var(--hand)', fontWeight:700, fontSize:14}}>雾隐之城</div>
          <div style={{fontFamily:'var(--hand)', fontSize:12, color:'var(--ink-soft)'}}>
            蒸汽朋克 + 东方水墨，<br/>低饱和，霓虹冷光...
          </div>

          <div className="div-h"/>
          <div className="cap">风格锁 · STYLE LOCK</div>
          <div style={{display:'flex', gap:6, alignItems:'center'}}>
            <Ph w={36} h={36} label="" tight/>
            <Ph w={36} h={36} label="" tight/>
            <Ph w={36} h={36} label="" tight/>
            <Btn sm>+</Btn>
          </div>
          <div className="mono" style={{fontSize:10, color:'var(--ink-faint)'}}>3 张参考图已锁定</div>

          <div className="div-h"/>
          <div className="cap">调色板</div>
          <div style={{display:'flex', gap:4}}>
            {['#1a2333','#3d5a7c','#a39060','#d4a574','#f0e8d8'].map(c =>
              <div key={c} style={{width:24, height:24, background:c, border:'1.5px solid var(--ink)', borderRadius:4}}/>
            )}
          </div>

          <div className="div-h"/>
          <div className="cap">资产分类</div>
          <div style={{display:'flex', flexDirection:'column', gap: 4}}>
            {[
              ['场景', 48, true],
              ['角色', 31, false],
              ['道具', 22, false],
              ['UI / 图标', 14, false],
              ['特效', 9, false],
            ].map(([n, c, sel]) => (
              <div key={n} style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'5px 8px', borderRadius:4,
                background: sel?'var(--ink)':'transparent',
                color: sel?'var(--paper)':'var(--ink)',
                fontFamily:'var(--hand)', fontSize:13,
              }}>
                <span>{n}</span>
                <span className="mono" style={{fontSize:10, opacity:.7}}>{c}</span>
              </div>
            ))}
          </div>

          <div style={{marginTop:'auto'}}>
            <Btn variant="accent" style={{width:'100%', justifyContent:'center'}}>+ 在此项目中生成</Btn>
          </div>
        </div>

        {/* main: gallery of project assets */}
        <div style={{display:'flex', flexDirection:'column', gap: 10, minHeight:0}}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <span style={{fontFamily:'var(--hand)', fontWeight:700, fontSize:18}} className="squig">场景 / 48 张</span>
            <span className="mono" style={{fontSize:11, color:'var(--ink-faint)', marginLeft:8}}>排序: 最新 · 视图: 网格</span>
            <span className="mono" style={{fontSize:11, marginLeft:'auto'}}>🔍 搜索资产</span>
          </div>

          {/* group: 第一章 */}
          <div className="sketchy" style={{padding:12, background:'var(--paper)'}}>
            <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
              <span className="cap" style={{marginBottom:0}}>第一章 · 山间湖泊</span>
              <span className="mono" style={{fontSize:10, color:'var(--ink-faint)'}}>12 张</span>
              <Btn sm style={{marginLeft:'auto'}}>+ 添加同风格</Btn>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:6}}>
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="sketchy" style={{padding:3}}>
                  <Ph h={90} label="" tight/>
                  <div className="mono" style={{fontSize:9, color:'var(--ink-faint)', marginTop:2}}>SCN-01-{String(i).padStart(2,'0')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* group: 第二章 */}
          <div className="sketchy" style={{padding:12, background:'var(--paper)'}}>
            <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
              <span className="cap" style={{marginBottom:0}}>第二章 · 雾港码头</span>
              <span className="mono" style={{fontSize:10, color:'var(--ink-faint)'}}>9 张</span>
              <Btn sm style={{marginLeft:'auto'}}>+ 添加同风格</Btn>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:6}}>
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="sketchy" style={{padding:3}}>
                  <Ph h={90} label="" tight/>
                  <div className="mono" style={{fontSize:9, color:'var(--ink-faint)', marginTop:2}}>SCN-02-{String(i).padStart(2,'0')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* draft / unsorted */}
          <div className="sketchy dashed" style={{padding:12, background:'transparent'}}>
            <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
              <span className="cap" style={{marginBottom:0, color:'var(--accent)'}}>未归档草稿</span>
              <span className="mono" style={{fontSize:10, color:'var(--ink-faint)'}}>27 张 · 拖拽到上面分组</span>
            </div>
            <div style={{display:'flex', gap:6}}>
              {[1,2,3,4,5,6,7,8,9,10].map(i => <Ph key={i} w={56} h={56} label="" tight/>)}
              <span className="mono" style={{fontSize:10, color:'var(--ink-faint)', alignSelf:'center'}}>+17</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Note style={{top: 60, right: 14, maxWidth: 180}}>
      面包屑而非<br/>顶部 nav<br/>
      <span style={{fontSize:12, color:'var(--ink-soft)', fontWeight:400}}>始终回答"我在哪个<br/>项目里"</span>
    </Note>

    <Note style={{top: 260, left: 12, maxWidth: 170, color:'var(--good)'}}>
      ✓ 世界观面板<br/>
      <span style={{fontSize:12, color:'var(--ink-soft)', fontWeight:400}}>调色板 + 风格锁<br/>+ 资产数概览</span>
    </Note>
    <Arrow from={[180, 360]} to={[230, 360]} curve={0} color="var(--good)"/>

    <Note style={{top: 260, left: 720, maxWidth: 180, color:'var(--good)'}}>
      ✓ 章节 / 分组<br/>
      <span style={{fontSize:12, color:'var(--ink-soft)', fontWeight:400}}>素材按"剧情节拍"<br/>组织，不是按时间</span>
    </Note>

    <Note style={{bottom: 50, left: 320, maxWidth: 200}}>
      未归档草稿区<br/>
      <span style={{fontSize:12, color:'var(--ink-soft)', fontWeight:400}}>
        生成完先扔这，<br/>事后拖到分组
      </span>
    </Note>
  </Frame>
);

window.FrameC = FrameC;
