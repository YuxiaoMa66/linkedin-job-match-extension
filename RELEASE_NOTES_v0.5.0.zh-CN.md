# v0.5.0 —— Indeed 列表适配

`v0.5.0` 新增了经过测试的 Indeed 列表适配，现已发布到 `main`。

## 新增内容

- 经过测试的荷兰 Indeed 支持：`https://nl.indeed.com/`
- 使用稳定的 `data-jk` / `vjk` 岗位 ID 识别当前可见 Indeed 卡片
- 支持在同一页面点击 Indeed 卡片，并等待选中详情面板完成渲染
- 读取 Indeed 的岗位标题、公司、地点和 `#jobDescriptionText` JD 正文
- 在 `Library` 中增加独立的 `Indeed` 来源，用于区分历史和收藏岗位

## 兼容性

- LinkedIn Classic Search 和 LinkedIn AI-powered Search 保持支持。
- 保留原扩展 ID 时，v0.1.2 以来的 LinkedIn、sponsor、简历、设置、手动岗位和收藏岗位数据继续使用原来的存储键。
- 没有 `sourceType` 的旧缓存记录继续按 LinkedIn 显示。
- 从未分析的岗位仍保持未分析。
- 为兼容旧版本，缓存键格式没有改变；Indeed 来源信息写入现有 summary/result 数据结构。

## 验证结果

```bash
npm run build
```

本适配已经在 Indeed 首页推荐岗位列表上完成 smoke test：成功识别可见岗位卡片，点击岗位后详情面板会切换，侧边栏会显示 Indeed 来源、缓存匹配分数、JD 语言和要求语言胶囊。可按[测试者安装说明](./TESTER_INSTALL_NOTE.zh-CN.md)重复验证。如果希望保留已有扩展数据，不要把新的解压目录作为第二个扩展加载，而应当更新 Chrome 当前已加载的原目录。

## 当前测试边界

Indeed 的 DOM 会随地区、实验版本和页面状态变化。本版本针对当前 `nl.indeed.com` 列表/详情布局；后续 Indeed 实验或搜索结果布局变化时，可能需要更新选择器。

![Indeed v0.5.0 列表分析、缓存分数和标题胶囊](./docs/assets/v0.5.0-indeed.png)
