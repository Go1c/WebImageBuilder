/* Gallery + Explore + Learn — shared simple pages */

const GalleryPage = ({ mode }) => {
  const filters = mode === 'pro' ? ['全部','场景','角色','道具','UI','特效'] : ['全部','人物','场景','风格','收藏'];
  return (
    <div style={{maxWidth: 1280, margin:'0 auto', padding:'24px 24px 60px'}}>
      <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 16}}>
        <div>
          <h1 style={{margin:0, fontSize:24, fontWeight:700, letterSpacing:'-.01em'}}>作品集</h1>
          <div className="muted" style={{fontSize:13, marginTop:2}}>
            {mode==='pro' ? '所有项目内的资产，按更新时间' : '你保存的所有作品'}
          </div>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button className="btn sm"><Icon name="search" size={13}/> 搜索</button>
          <button className="btn sm"><Icon name="sliders" size={13}/> 筛选</button>
          {mode==='pro' && <button className="btn sm"><Icon name="download" size={13}/> 批量导出</button>}
        </div>
      </div>

      <div style={{display:'flex', gap: 6, marginBottom: 16}}>
        {filters.map((f, i) => (
          <button key={f} className={`chip ${i===0?'dark':'outline'}`} style={{cursor:'pointer', border:'none', padding:'6px 14px', fontSize:13}}>{f}</button>
        ))}
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap: 12}}>
        {Array.from({length: 15}).map((_, i) => {
          const colors = ['fog','dawn','olive','warm','rose','cool','dim','ink'];
          const ratios = [3/4, 1, 16/9, 4/3, 9/16];
          return (
            <div key={i} className="card" style={{overflow:'hidden', cursor:'pointer'}}>
              <div className={`imgph ${colors[i % colors.length]}`}
                style={{aspectRatio: ratios[i % ratios.length]}} data-label=""/>
              <div style={{padding:'8px 10px'}}>
                <div style={{fontSize:12, fontWeight:500}}>
                  {['晨雾湖泊','古城轮廓','蒸汽船码头','少女剪影','咖啡馆','黄昏','雨夜','森林','机甲','空间站'][i % 10]}
                </div>
                {mode==='pro'
                  ? <div className="cap" style={{marginTop:3}}>{['雾隐之城','星域旅人','雾林祭典'][i%3]} · SCN-{String(i+1).padStart(2,'0')}</div>
                  : <div className="cap" style={{marginTop:3}}>{i+1} 天前</div>
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ExplorePage = ({ mode }) => (
  <div style={{maxWidth: 1280, margin:'0 auto', padding:'24px 24px 60px'}}>
    <div style={{marginBottom: 20}}>
      <h1 style={{margin:0, fontSize:24, fontWeight:700, letterSpacing:'-.01em'}}>探索</h1>
      <div className="muted" style={{fontSize:13, marginTop:2}}>
        {mode==='pro' ? '社区项目 · 风格预设 · ComfyUI 工作流' : '社区作品 · 灵感发现'}
      </div>
    </div>

    <div className="seg" style={{marginBottom: 16}}>
      {(mode==='pro' ? ['热门项目','风格预设','工作流','prompt 配方'] : ['热门','风格','人物','场景','故事'])
        .map((t,i) => <button key={t} className={i===0?'active':''}>{t}</button>)}
    </div>

    {/* featured */}
    <div className="card" style={{
      display:'grid', gridTemplateColumns:'1.4fr 1fr', overflow:'hidden', marginBottom: 20
    }}>
      <div className="imgph dawn" style={{minHeight: 260}} data-label=""/>
      <div style={{padding: 24, display:'flex', flexDirection:'column', gap: 10, justifyContent:'center'}}>
        <span className="chip accent" style={{alignSelf:'flex-start'}}>本周精选</span>
        <h2 style={{margin:0, fontSize: 22, fontWeight:700}}>{mode==='pro' ? '《废土档案》— 30 张概念图' : '晨雾系列'}</h2>
        <p className="muted" style={{margin:0, fontSize:13, lineHeight:1.6}}>
          {mode==='pro'
            ? '独立工作室 Helix 用 Lumio 完成了一整组废土城市的视觉开发，含风格锁、调色板和分镜流程。'
            : '由 Mio 创作 · 融合东方水墨与电影感构图，第 1 名作品已被收藏 1.2k 次。'}
        </p>
        <div style={{display:'flex', gap:8, marginTop: 6}}>
          {mode==='pro'
            ? <>
                <button className="btn primary sm"><Icon name="download" size={12}/> Fork 这个项目</button>
                <button className="btn sm"><Icon name="arrow-right" size={12}/> 查看详情</button>
              </>
            : <>
                <button className="btn primary sm"><Icon name="wand" size={12}/> 用同款风格生成</button>
                <button className="btn sm"><Icon name="star" size={12}/> 收藏</button>
              </>
          }
        </div>
      </div>
    </div>

    {/* grid */}
    <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 14}}>
      {Array.from({length: 8}).map((_, i) => {
        const colors = ['fog','olive','rose','dim','warm','cool','dawn','ink'];
        return (
          <div key={i} className="card" style={{overflow:'hidden'}}>
            <div className={`imgph ${colors[i]}`} style={{aspectRatio:'4/3'}} data-label=""/>
            <div style={{padding: 12}}>
              <div style={{fontSize:13, fontWeight:600}}>
                {mode==='pro'
                  ? ['赛博东方 · 项目模板','古早恐怖游戏','可爱机甲','像素 RPG','日式恐怖','废土生存','卡通 3D','低多边形'][i]
                  : ['雾港码头','金色草原','深夜街道','咖啡馆','晨雾','水墨','胶片','童趣'][i]}
              </div>
              <div className="muted" style={{fontSize:11, marginTop:4, display:'flex', gap:8}}>
                <span><Icon name="user" size={10} style={{verticalAlign:-1, marginRight:2}}/>{['Helix','Mio','Aki','Ren','Kai','Lin','Tao','Jin'][i]}</span>
                <span><Icon name="star" size={10} style={{verticalAlign:-1, marginRight:2}}/>{120 + i*47}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const LearnPage = ({ mode }) => (
  <div style={{maxWidth: 980, margin:'0 auto', padding:'32px 24px 80px'}}>
    <h1 style={{margin:0, fontSize:24, fontWeight:700, letterSpacing:'-.01em'}}>教程</h1>
    <div className="muted" style={{fontSize:13, marginTop:2, marginBottom:20}}>
      {mode==='pro' ? '从单张到游戏概念美术管线' : '从零开始描述出你想要的画面'}
    </div>
    <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap: 14}}>
      {(mode==='pro' ? [
        ['项目 / 世界观工作流','5 分钟', '建立风格锁 + 调色板 + 章节分组', 'fog'],
        ['批量 + Seed 派生','7 分钟', '一次出 4 张，迭代到满意为止', 'dawn'],
        ['ComfyUI 互通','10 分钟', '导入/导出 JSON 工作流', 'ink'],
        ['团队协作 + 评审','6 分钟', '把项目分享给主美，做版本回退', 'olive'],
      ] : [
        ['写好你的第一个 prompt','3 分钟','三段式: 主体 + 风格 + 氛围', 'warm'],
        ['垫图 / 参考图怎么用','4 分钟', '上传 1-3 张参考，控制构图与配色', 'rose'],
        ['尺寸 + 比例怎么选','3 分钟', '头像 vs 桌面 vs 短视频封面', 'cool'],
        ['保存与分享','2 分钟', '作品集 / 二维码 / 社区上传', 'dim'],
      ]).map(([title, time, desc, color], i) => (
        <div key={i} className="card" style={{display:'grid', gridTemplateColumns:'140px 1fr', overflow:'hidden', cursor:'pointer'}}>
          <div className={`imgph ${color}`} style={{position:'relative'}} data-label="">
            <div style={{position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center'}}>
              <div style={{width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,.9)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                <Icon name="play" size={14} stroke={2.5}/>
              </div>
            </div>
          </div>
          <div style={{padding:14}}>
            <div className="cap">{time}</div>
            <div style={{fontSize:15, fontWeight:600, marginTop:4}}>{title}</div>
            <div className="muted" style={{fontSize:13, marginTop:4, lineHeight:1.5}}>{desc}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

Object.assign(window, { GalleryPage, ExplorePage, LearnPage });
