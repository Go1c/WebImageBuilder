/* Direction E — Split: generate ↔ moodboard reference */
const FrameE = () => (
  <Frame w={1280} h={820} bg="var(--paper)">
    <div style={{padding: 18, height:'100%', display:'flex', flexDirection:'column', gap: 12}}>
      <div style={{display:'flex', alignItems:'center', gap:12}}>
        <div style={{fontFamily:'var(--hand)', fontWeight:700, fontSize:18}}>◆ Lumio</div>
        <span className="mono" style={{fontSize:11, color:'var(--ink-faint)'}}>分屏: 生成 ↔ 灵感板</span>
        <div style={{marginLeft:'auto', display:'flex', gap:8}}>
          <Chip>同步主题</Chip>
          <Chip>对策划演示</Chip>
          <Btn sm>登录</Btn>
        </div>
      </div>
      <div className="div-h"/>

      <div style={{display:'grid', gridTemplateColumns:'1fr 8px 1fr', gap:0, flex:1, minHeight:0}}>
        {/* LEFT — generate side */}
        <div className="sketchy" style={{padding:12, display:'flex', flexDirection:'column', gap:10, borderTopRightRadius:0, borderBottomRightRadius:0, borderRight:'none'}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <span className="cap" style={{marginBottom:0}}>生成 · LIVE</span>
            <span style={{fontFamily:'var(--hand)', fontSize:13, color:'var(--ink-soft)'}}>从灵感板拖图过来作参考</span>
          </div>
          <Ph h={50} label="prompt 输入框"/>
          <div style={{display:'flex', gap:6, alignItems:'center'}}>
            <Chip variant="dark">参考图: 3 (来自灵感板)</Chip>
            <Chip>16:9</Chip>
            <Btn sm variant="accent" style={{marginLeft:'auto'}}>⏎ 4 张</Btn>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gridTemplateRows:'1fr 1fr', gap:6, flex:1, minHeight:0}}>
            {[1,2,3,4].map(i => (
              <div key={i} className="sketchy" style={{padding:4}}>
                <Ph label={`输出 ${i}`} style={{height:'100%'}}/>
              </div>
            ))}
          </div>
          <div style={{display:'flex', gap:6}}>
            <Btn sm>★ 收藏</Btn>
            <Btn sm>↑ 钉到灵感板</Btn>
            <Btn sm style={{marginLeft:'auto'}}>导出</Btn>
          </div>
        </div>

        {/* divider */}
        <div style={{display:'flex', alignItems:'center', justifyContent:'center'}}>
          <div style={{width:4, height:'90%', background:'var(--ink)', borderRadius:2}}/>
        </div>

        {/* RIGHT — moodboard */}
        <div className="sketchy" style={{padding:12, display:'flex', flexDirection:'column', gap:10, borderTopLeftRadius:0, borderBottomLeftRadius:0, borderLeft:'none', background:'var(--paper-2)'}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <span className="cap" style={{marginBottom:0}}>灵感板 · MOOD</span>
            <span style={{fontFamily:'var(--hand)', fontSize:13, color:'var(--ink-soft)'}}>「雾隐之城」</span>
            <Btn sm style={{marginLeft:'auto'}}>+ 上传</Btn>
            <Btn sm>+ 搜索</Btn>
          </div>

          {/* freeform pinboard */}
          <div style={{position:'relative', flex:1, minHeight:0,
            background:'repeating-linear-gradient(0deg, transparent 0, transparent 24px, rgba(0,0,0,.04) 24px, rgba(0,0,0,.04) 25px), repeating-linear-gradient(90deg, transparent 0, transparent 24px, rgba(0,0,0,.04) 24px, rgba(0,0,0,.04) 25px)',
            border:'1.5px dashed var(--ink-faint)', borderRadius:4, padding:8
          }}>
            {[
              {x:10, y:12, w:130, h:90, r:-3, l:'参考 · 雾'},
              {x:160, y:6, w:110, h:130, r:2, l:'色彩参考'},
              {x:286, y:30, w:120, h:80, r:-1, l:'构图'},
              {x:20, y:120, w:90, h:90, r:4, l:'材质'},
              {x:130, y:160, w:140, h:90, r:-2, l:'角色'},
              {x:286, y:130, w:120, h:120, r:1, l:'光照参考'},
              {x:30, y:230, w:110, h:80, r:-3, l:'笔记: "晨雾感"', note:true},
            ].map((p,i) => (
              <div key={i} style={{
                position:'absolute', left:p.x, top:p.y, width:p.w, height:p.h,
                transform:`rotate(${p.r}deg)`,
                background:'var(--paper)',
                border:'1.5px solid var(--ink)',
                boxShadow:'2px 2px 0 rgba(0,0,0,.15)',
                padding:4,
                display:'flex', flexDirection:'column', gap:2,
              }}>
                {p.note ? (
                  <div style={{fontFamily:'var(--note)', fontSize:18, padding:6, color:'var(--ink)'}}>{p.l}</div>
                ) : (
                  <>
                    <Ph label="" style={{flex:1}} tight/>
                    <span className="mono" style={{fontSize:9, color:'var(--ink-faint)'}}>{p.l}</span>
                  </>
                )}
              </div>
            ))}

            {/* connection arrow showing reference flow */}
            <svg style={{position:'absolute', inset:0, pointerEvents:'none', overflow:'visible'}}>
              <path d="M 80 100 Q 120 80 100 60" stroke="var(--accent)" strokeWidth="2" fill="none" strokeDasharray="4 3"/>
            </svg>
          </div>

          <div style={{display:'flex', gap:6}}>
            <Chip variant="dark">7 项</Chip>
            <Chip>已锁定 3 张为风格参考</Chip>
            <Btn sm style={{marginLeft:'auto'}}>分享灵感板</Btn>
          </div>
        </div>
      </div>
    </div>

    <Note style={{top: 70, left: 540, maxWidth: 200}}>
      可拖动分隔条<br/>
      <span style={{fontSize:12, color:'var(--ink-soft)', fontWeight:400}}>
        策划侧重灵感板，<br/>美术侧重生成
      </span>
    </Note>

    <Note style={{top: 240, left: 14, maxWidth: 160, color:'var(--good)'}}>
      ✓ 参考图来自灵感板<br/>
      <span style={{fontSize:12, color:'var(--ink-soft)', fontWeight:400}}>
        拖拽即引用，<br/>不用重复上传
      </span>
    </Note>

    <Note style={{bottom: 240, right: 14, maxWidth: 170, color:'var(--good)'}}>
      ✓ 自由拼贴板<br/>
      <span style={{fontSize:12, color:'var(--ink-soft)', fontWeight:400}}>
        非网格 · 可旋转 ·<br/>可写便签
      </span>
    </Note>

    <Note style={{bottom: 80, left: 240, maxWidth: 200}}>
      "钉到灵感板"按钮<br/>
      <span style={{fontSize:12, color:'var(--ink-soft)', fontWeight:400}}>
        生成 → 选中 → 钉过去<br/>形成闭环
      </span>
    </Note>
  </Frame>
);

window.FrameE = FrameE;
