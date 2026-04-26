/* Basic mode home — friendly, light, similar to current but cleaner IA */
const BasicHome = () => {
  const [prompt, setPrompt] = React.useState('柔光晨光下的山间湖泊，极简构图，电影感');
  const [ratio, setRatio] = React.useState('1:1');
  const [style, setStyle] = React.useState('电影感');
  const [type, setType] = React.useState('场景');
  const [count, setCount] = React.useState(2);

  const styles = ['电影感','赛博朋克','极简日系','水彩插画','3D 渲染','黑白胶片'];
  const types = ['场景','角色','物品','UI 图标','插画'];
  const ratios = ['1:1','3:4','4:3','16:9','9:16'];

  return (
    <div style={{maxWidth: 1180, margin: '0 auto', padding: '32px 24px 80px'}}>
      {/* Hero prompt */}
      <div style={{textAlign:'center', marginBottom: 24}}>
        <h1 style={{fontSize: 32, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-.02em'}}>
          描述一下，<span style={{color:'var(--accent)'}}>就出图</span>
        </h1>
        <p className="muted" style={{margin: 0, fontSize: 14}}>用对话生成你想要的画面 · 模型 Lumio v2.1</p>
      </div>

      <div className="card" style={{padding: 16, boxShadow:'var(--shadow)', borderRadius: 'var(--radius-lg)'}}>
        <div style={{display:'flex', alignItems:'flex-start', gap: 10}}>
          <Icon name="sparkle" size={20} style={{color:'var(--accent)', marginTop:8, flexShrink:0}}/>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={2}
            placeholder="比如: 一只在霓虹巷里的猫，赛博朋克，雨夜"
            style={{
              flex:1, border:'none', outline:'none', resize:'none',
              fontFamily:'var(--font-ui)', fontSize: 16, lineHeight: 1.5,
              background:'transparent', color:'var(--ink)', padding:'8px 0',
            }}
          />
        </div>
        <div style={{display:'flex', alignItems:'center', gap: 10, marginTop: 10, paddingTop: 10, borderTop:'1px solid var(--line)'}}>
          <button className="btn ghost sm"><Icon name="paperclip" size={14}/> 参考图</button>
          <button className="btn ghost sm"><Icon name="mic" size={14}/> 语音</button>
          <button className="btn ghost sm"><Icon name="close" size={14}/> 负向词</button>
          <span style={{flex:1}}/>
          <span className="cap">数量</span>
          <div className="seg">
            {[1,2,4].map(n => (
              <button key={n} className={count===n?'active':''} onClick={()=>setCount(n)}>{n}</button>
            ))}
          </div>
          <button className="btn accent"><Icon name="wand" size={14}/> 生成 ({count})</button>
        </div>
      </div>

      {/* Quick options as visual cards (style picker) */}
      <div style={{marginTop: 28}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 10}}>
          <h3 style={{margin:0, fontSize: 15, fontWeight:600}}>选个风格</h3>
          <button className="btn ghost sm">查看全部 <Icon name="arrow-right" size={12}/></button>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap: 10}}>
          {styles.map((s, i) => (
            <div key={s} onClick={()=>setStyle(s)} style={{
              cursor:'pointer',
              border: style===s?'2px solid var(--accent)':'1px solid var(--line)',
              borderRadius: 'var(--radius)', overflow:'hidden',
              background:'var(--surface)',
              transform: style===s?'translateY(-2px)':'none',
              transition: 'all .15s'
            }}>
              <div className={`imgph ${['warm','cool','dim','dawn','rose','ink'][i]}`} style={{height: 86}} data-label=""/>
              <div style={{padding:'8px 10px', fontSize:12, fontWeight:600}}>{s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Type + ratio compact row */}
      <div style={{marginTop: 20, display:'grid', gridTemplateColumns:'1fr 1fr', gap: 20}}>
        <div>
          <div className="cap" style={{marginBottom:8}}>类型</div>
          <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
            {types.map(t => (
              <button key={t} onClick={()=>setType(t)} className={`chip ${type===t?'dark':'outline'}`} style={{cursor:'pointer', border:'none', padding:'6px 12px', fontSize:13}}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="cap" style={{marginBottom:8}}>画幅</div>
          <div style={{display:'flex', gap:6}}>
            {ratios.map(r => (
              <button key={r} onClick={()=>setRatio(r)} className={`chip mono ${ratio===r?'dark':'outline'}`} style={{cursor:'pointer', border:'none', padding:'6px 12px', fontSize:12, minWidth: 52, justifyContent:'center'}}>
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent results — friendly */}
      <div style={{marginTop: 36}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 12}}>
          <h3 style={{margin:0, fontSize: 15, fontWeight:600}}>你最近的作品</h3>
          <button className="btn ghost sm">作品集 <Icon name="arrow-right" size={12}/></button>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 12}}>
          {['warm','fog','dawn','rose'].map((c, i) => (
            <div key={i} className="card" style={{overflow:'hidden'}}>
              <div className={`imgph ${c}`} style={{aspectRatio:'1/1'}} data-label=""/>
              <div style={{padding:'10px 12px'}}>
                <div style={{fontSize:13, fontWeight:500, lineHeight:1.4}}>
                  {['晨雾湖泊','夜色港口','黄昏古城','少女与猫'][i]}
                </div>
                <div className="cap" style={{marginTop:4}}>2 小时前 · {ratios[i % ratios.length]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inspire / community — moved BELOW, no longer a side rail */}
      <div style={{marginTop: 36}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 12}}>
          <h3 style={{margin:0, fontSize: 15, fontWeight:600}}>社区灵感 · 点击直接套用</h3>
          <div className="seg">
            <button className="active">热门</button>
            <button>人物</button>
            <button>场景</button>
            <button>风格</button>
          </div>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap: 10}}>
          {['cool','olive','dim','warm','fog','ink'].map((c,i) => (
            <div key={i} style={{cursor:'pointer', borderRadius: 'var(--radius)', overflow:'hidden', position:'relative'}}>
              <div className={`imgph ${c}`} style={{aspectRatio:'3/4'}} data-label=""/>
              <div style={{
                position:'absolute', inset:0, display:'flex', alignItems:'flex-end',
                background:'linear-gradient(to top, rgba(0,0,0,.5), transparent 50%)',
                color:'white', padding:8, fontSize:11, fontWeight:500
              }}>
                {['雾港码头','金色草原','深夜街道','咖啡馆','晨雾','水墨'][i]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

window.BasicHome = BasicHome;
