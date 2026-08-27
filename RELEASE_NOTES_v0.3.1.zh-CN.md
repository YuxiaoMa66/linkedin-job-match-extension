# v0.3.1 —— 标题信号与 provider 起始模型

`v0.3.1` 是位于 `feature/v0.3.1-title-signals` 的测试预览，暂时不会合并到 `main`。

## 更新内容

- 关键词标题标记改为可选，默认不勾选。
- 在五个关键词输入框旁增加明确的关键词启用开关。
- 选择 OpenAI、Anthropic 或 Gemini 时，自动写入固定的低成本起始模型：
  - `gpt-5-mini`
  - `claude-haiku-4-5-20251001`
  - `gemini-3.5-flash-lite`
- `Saved models` 仍然可以编辑，用户可以替换起始模型或继续添加新的模型 ID。
- 将用户提供的功能截图加入 README 和产品说明主页。
- 扩展和 package 版本更新为 `0.3.1`。
- 从可见的默认 `Saved models` 中移除 `gpt-4o`，同时保留用户添加的模型 ID；旧配置中的 `gpt-4o` 会规范化为对应 provider 的起始模型。
- 增加 v0.1.2 以来的历史兼容读取：切换 provider、模型或评分配置后，旧的匹配和 sponsor 快照不会被重写，之前没有分析的岗位仍保持未分析。

## 兼容性

扩展目前仍只分析 LinkedIn 经典版 Jobs 搜索界面。测试前请从 AI-powered search 切回经典版，并刷新页面。

## 测试构建

```bash
npm install
npm run build
```

然后在 `chrome://extensions/` 加载生成的 `dist/` 目录。

更新时请保留原扩展目录，只替换该目录内的文件，然后在原扩展卡片上点击“重新加载”。如果加载新解压的目录，Chrome 会生成不同的扩展 ID，无法自动读取原来的 `chrome.storage.local` 数据。
