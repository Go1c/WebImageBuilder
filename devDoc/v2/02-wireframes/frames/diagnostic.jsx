/* Frame 0 — Diagnostic of current state */
const FrameDiagnostic = () => (
  <Frame w={1280} h={820}>
    {/* recreate the current layout in low-fi */}
    <div style={{padding: 24, height: '100%', display: 'flex', flexDirection: 'column', gap: 16, position: 'relative'}}>
      {/* top bar */}
      <div className="sketchy" style={{padding: '10px 16px', display:'flex', alignItems:'center', gap: 24, background:'var(--paper)'}}>
        <div style={{fontFamily:'var(--hand)', fontWeight:700, fontSize:18}}>◆ Lumio Image Studio</div>
        <div style={{display:'flex', gap: 14, fontFamily:'var(--mono)', fontSize: 12, color:'var(--ink-soft)'}}>
          <span>探索</span><span>作品集</span><span>教程</span>
        </div>
        <div style={{marginLeft:'auto', display:'flex', gap:10, alignItems:'center'}}>
          <Chip>128 次</Chip>
          <Chip>邀请有礼</Chip>
          <Btn variant="primary" sm>登录</Btn>
        </div>
      </div>

      {/* main: 3-col, current */}
      <div style={{display:'grid', gridTemplateColumns:'320px 1fr 280px', gap: 14, flex: 1, minHeight: 0}}>
        {/* left: prompt panel */}
        <div className="sketchy" style={{padding: 12, display:'flex', flexDirection:'column', gap: 10, overflow:'hidden'}}>
          <div className="cap">创作面板</div>
          <div style={{fontFamily:'var(--hand)', fontWeight:700, fontSize:16}}>用对话生成你想要的画面</div>
          <Ph h={70} label="提示词输入框"/>
          <Ph h={50} label="参考图缩略图"/>
          <Ph h={36} label="负面提示词"/>
          <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-soft)'}}>类型 · 游戏美术方向</div>
          <div style={{display:'flex', flexWrap:'wrap', gap:4}}>
            {['UI','UE立绘','3D','二次元','写实','特效','场景原画'].map(t => <Chip key={t}>{t}</Chip>)}
          </div>
          <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-soft)'}}>画幅比例</div>
          <div style={{display:'flex', gap:4}}>
            {['1:1','3:4','4:3','16:9','9:16'].map(t => <Chip key={t}>{t}</Chip>)}
          </div>
          <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-soft)'}}>细节强度 · 柔和 — 锐利</div>
          <Ph h={20} label="slider" tight/>
        </div>

        {/* center: canvas */}
        <div className="sketchy" style={{padding: 12, display:'flex', flexDirection:'column', gap: 8}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <span className="cap">Lumio v2.1</span>
            <span className="mono" style={{fontSize:11, color:'var(--ink-faint)'}}>1024×1024 · 6.2s · 刚刚</span>
          </div>
          <div style={{fontFamily:'var(--hand)', fontSize:13}}>柔光晨光下的山间湖泊，极简构图，电影感</div>
          <Ph h={420} label="单张大图预览"/>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <span className="cap">历史</span>
            <Btn sm>保存到作品集</Btn>
          </div>
          <div style={{display:'flex', gap:6}}>
            {[1,2,3,4,5].map(i => <Ph key={i} w={56} h={56} label="" tight/>)}
          </div>
        </div>

        {/* right: library */}
        <div className="sketchy" style={{padding: 12, display:'flex', flexDirection:'column', gap: 8}}>
          <div className="cap">素材库</div>
          <div style={{fontFamily:'var(--hand)', fontSize:13}}>点击直接套用提示词</div>
          <div style={{display:'flex', gap:4, flexWrap:'wrap'}}>
            {['热门','人物','场景','风格','我的'].map(t => <Chip key={t} variant={t==='热门'?'dark':''}>{t}</Chip>)}
          </div>
          <div className="cap">风格预设</div>
          <div style={{display:'flex', gap:4, flexWrap:'wrap'}}>
            {['电影感','赛博朋克','极简日系','水彩插画','3D渲染','黑白胶片'].map(t => <Chip key={t}>{t}</Chip>)}
          </div>
          <div className="cap">社区热门</div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:4}}>
            {[1,2,3,4,5,6].map(i => <Ph key={i} h={70} label="" tight/>)}
          </div>
          <div className="cap">关键词标签</div>
          <div style={{display:'flex', gap:4, flexWrap:'wrap'}}>
            {['柔光','高对比','微距','广角','黄金时刻','极简'].map(t => <Chip key={t}>{t}</Chip>)}
          </div>
        </div>
      </div>

      {/* ===== 诊断红字 ===== */}
      <Note style={{top: 60, left: 4}}>
        ① 信息层级<br/>糊在一起<br/>
        <span style={{fontSize:13, color:'var(--ink-soft)', fontWeight:400}}>导航 / 邀请 / 登录<br/>同等权重</span>
      </Note>
      <Arrow from={[180, 96]} to={[280, 70]} curve={-20} />

      <Note style={{top: 230, left: 6, maxWidth: 180}}>
        ② 参数堆得太满<br/>
        <span style={{fontSize:13, color:'var(--ink-soft)', fontWeight:400}}>
          类型/比例/细节<br/>都用 chip 表达，<br/>没有视觉重心
        </span>
      </Note>
      <Arrow from={[200, 360]} to={[260, 360]} curve={0} />

      <Note style={{top: 200, left: 540, maxWidth: 180}}>
        ③ 一次只看 1 张<br/>
        <span style={{fontSize:13, color:'var(--ink-soft)', fontWeight:400}}>
          不符合 batch /<br/>seed 对比的<br/>专业出图流程
        </span>
      </Note>
      <Arrow from={[640, 320]} to={[600, 360]} curve={-20} />

      <Note style={{top: 110, right: 24, maxWidth: 180}}>
        ④ 素材库 = chip 墙<br/>
        <span style={{fontSize:13, color:'var(--ink-soft)', fontWeight:400}}>
          标签很多但不知道<br/>点了出什么 →<br/>需要"可视化预设"
        </span>
      </Note>
      <Arrow from={[1100, 220]} to={[1100, 290]} curve={20} />

      <Note style={{bottom: 70, left: 360, maxWidth: 220}}>
        ⑤ 没有"项目 / 世界观"概念<br/>
        <span style={{fontSize:13, color:'var(--ink-soft)', fontWeight:400}}>
          游戏从业者要保持风格统一，<br/>需要 Project / Style Lock
        </span>
      </Note>

      <Note style={{bottom: 16, right: 40, maxWidth: 200}}>
        ⑥ 缺少专业出口<br/>
        <span style={{fontSize:13, color:'var(--ink-soft)', fontWeight:400}}>
          批量导出 / 4K /<br/>分图层 / API 接入
        </span>
      </Note>
    </div>
  </Frame>
);

window.FrameDiagnostic = FrameDiagnostic;
