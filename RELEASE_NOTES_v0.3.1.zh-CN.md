# v0.3.1：标题信号与 provider 起始模型

`v0.3.1` 是当前 `main` 版本。本文件只记录发布层面的变更；完整功能说明、颜色对照、配置方式和截图请查看 [README.zh-CN.md](./README.zh-CN.md)。

## 本次发布重点

- 新增可配置的标题胶囊，分别显示 JD 语言、要求语言、KM sponsorship 和经验年限。
- 新增颜色预设、每种信号独立自定义色号和显示勾选项。
- 新增最多 5 个 JD 关键词的可选标记，支持 `Tag`、`Bracket` 和 `Spark` 三种样式。
- OpenAI、Anthropic 和 Gemini 会写入固定起始模型，但 `Saved models` 仍可编辑；旧的 `gpt-4o` 会隐藏，用户自己添加的模型 ID 不会删除。
- 增加 v0.1.2 以来的历史兼容读取。旧的匹配和 sponsor 快照不会被重写，没有分析过的岗位仍保持未分析。

## 兼容性与更新方式

扩展目前只能分析 LinkedIn 经典版 Jobs 搜索界面。如果 LinkedIn 打开 AI-powered search，请点击 `Learn more` → `Switch back to classic search`，然后刷新页面。

已有 v0.1.2 及以上版本时，请把新文件替换到原扩展的 Chrome `Location` 中，再在原卡片上点击“重新加载（Reload）”。如果把新解压的 ZIP 作为新的未打包扩展加载，Chrome 会生成独立的扩展 ID 和独立的本地存储。

## 验证方式

```bash
npm install
npm run build
```

发布包从 `main` 构建，应加载解压后的扩展目录，不要直接加载仓库源码根目录。
