# `/v1/images/generations` 调用文档

当前接口支持：

- 文生图
- 图生图

请求方式：

```http
POST /v1/images/generations
Authorization: Bearer sk-xxxx
Content-Type: application/json
```

## 文生图请求示例

```bash
curl -X POST 'http://127.0.0.1:8080/v1/images/generations' \
  -H 'Authorization: Bearer sk-your-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "gpt-image-2",
    "prompt": "生成一张未来城市夜景海报，霓虹灯，电影感构图",
    "n": 1,
    "size": "1024x1024",
    "response_format": "b64_json"
  }'
```

## 图生图请求示例

图生图通过扩展字段 `reference_images` 传参考图。  
每一项支持：

- 图片 URL
- `data:image/...;base64,...`
- 裸 Base64

### 1. 使用图片 URL

```bash
curl -X POST 'http://127.0.0.1:8080/v1/images/generations' \
  -H 'Authorization: Bearer sk-your-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "gpt-image-2",
    "prompt": "保留主体结构，把画面改成赛博朋克风格，增强光影和细节",
    "reference_images": [
      "https://example.com/source.png"
    ],
    "response_format": "b64_json"
  }'
```

### 2. 使用 Base64

```bash
curl -X POST 'http://127.0.0.1:8080/v1/images/generations' \
  -H 'Authorization: Bearer sk-your-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "gpt-image-2",
    "prompt": "把原图改成游戏宣传海报风格，提升层次感和冲击力",
    "reference_images": [
      "data:image/png;base64,iVBORw0KGgoAAA..."
    ],
    "response_format": "b64_json"
  }'
```

### 3. 使用多图参考

```bash
curl -X POST 'http://127.0.0.1:8080/v1/images/generations' \
  -H 'Authorization: Bearer sk-your-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "gpt-image-2",
    "prompt": "综合这三张图的人物、配色和构图，生成一张统一风格的游戏宣传海报",
    "reference_images": [
      "https://example.com/source-1.png",
      "https://example.com/source-2.png",
      "https://example.com/source-3.png"
    ],
    "response_format": "b64_json"
  }'
```
