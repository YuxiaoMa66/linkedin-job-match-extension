# v0.4.0：支持 AI-powered LinkedIn 搜索

v0.4.0 新增了经过实际测试的 LinkedIn AI-powered / semantic Jobs 搜索适配器，同时保留原有 Classic Search 工作流。

## 更新内容

- 读取 AI-powered 搜索界面中当前页面可见的岗位卡片。
- 从每张卡片提取稳定岗位 ID、标题、公司和地点。
- 批量分析时可以聚焦 AI-powered 岗位卡片，并等待详情面板切换。
- 从 `About the job` 区块读取当前岗位的标题、公司、地点和 JD。
- 继续复用原有匹配缓存、标题胶囊、sponsor 信号、历史和收藏岗位流程。
- 保留 Classic Search 选择器作为 fallback，同一个扩展支持两种 LinkedIn 界面。
- 在项目说明中加入经过验证的 AI-powered 搜索截图。

![v0.4.0 AI-powered LinkedIn 搜索中的缓存列表分析和标题胶囊](./docs/assets/v0.4.0-ai-powered-search.png)

## 兼容性与刷新

AI-powered 界面通过 semantic 搜索 URL 标记（`origin=SEMANTIC_SEARCH_LANDING_PAGE`）和当前卡片结构识别。LinkedIn 两种界面都可能以单页应用方式重新渲染，因此更新扩展或在 AI-powered 与 Classic Search 之间切换后，请刷新 LinkedIn 标签页。

## 更新现有扩展并保留数据

对于已经安装的 v0.1.2 及以上版本：

1. 打开 `chrome://extensions/`，进入现有扩展的“详细信息”，复制 `位置（Location）` 路径。
2. 修改前先备份原来的扩展文件夹。
3. 将 `linkedin-job-match-v0.4.0.zip` 解压到临时目录。
4. 将解压包里面的内容复制到原来的 `Location` 中并替换旧文件。保持原目录路径不变，不要嵌套一个新的 `dist/` 文件夹。
5. 回到 `chrome://extensions/`，点击原扩展卡片上的“重新加载（Reload）”。
6. 刷新 LinkedIn 标签页，再重新打开侧边栏。

不要把解压后的包作为第二个未打包扩展重新加载。Chrome 会按照扩展 ID 隔离 `chrome.storage.local`；新目录会生成不同的 ID 和独立存储。替换原来的 `Location`，才能保留原扩展条目、API 设置、简历、收藏/手动岗位和兼容历史。

本版本不会重写旧记录。相同简历下，v0.1.2 以来的已分析结果和旧 sponsor 快照仍可显示；从未分析的岗位仍保持未分析状态。原有缓存过期规则继续有效。

## 第一次安装

1. 下载下面的 `linkedin-job-match-v0.4.0.zip` 资产。
2. 解压文件。
3. 打开 `chrome://extensions/`，开启“开发者模式”，点击“加载已解压的扩展程序”。
4. 选择包含 `manifest.json` 的解压目录。

## 验证方式

```bash
npm install
npm run build
```

发布包从 `main` 构建，应加载解压后的扩展目录，不要直接加载仓库源码根目录。
