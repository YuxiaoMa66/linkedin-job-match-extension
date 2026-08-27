# 测试者安装说明 —— v0.4.0

`v0.4.0` 现已合并进 `main`；本版本新增 LinkedIn AI-powered / semantic Jobs 搜索支持，同时保留 Classic Search 支持。

如果简历上传失败，最常见的原因是加载了错误的扩展目录。

正确安装方式：

1. 打开 `chrome://extensions/`
2. 开启“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择构建后的 `dist/` 目录，或者 GitHub release 解压后的扩展目录

请不要直接加载仓库源码根目录。

如果加载的是源码根目录而不是 `dist/`，扩展界面可能仍然可以打开，但 `PDF` 或 `DOCX` 简历上传会因为解析文件缺失而失败。

## 更新现有安装并保留数据

为了保留从 v0.1.2 开始的数据，不要把新 ZIP 解压后作为另一个目录加载：

1. 在 `chrome://extensions/` 打开现有扩展的“详细信息”，复制 `位置（Location）`。
2. 修改前先备份原来的扩展文件夹。
3. 将 `linkedin-job-match-v0.4.0.zip` 解压到临时目录。
4. 将解压包里面的内容复制到原来的 `Location` 中并替换旧文件。保持原目录路径不变，不要再嵌套一个 `dist/` 文件夹。
5. 在原扩展卡片上点击“重新加载（Reload）”。
6. 刷新 LinkedIn 标签页，再重新打开侧边栏。

用“加载已解压的扩展程序”加载新目录会生成不同的扩展 ID 和独立的本地存储。只要保留原目录和原 ID，本版本会保留原有配置、简历、收藏/手动岗位以及 v0.1.2 以来的缓存快照；之前没有分析的岗位不会被错误变成已分析。

原因是 Chrome 会按照扩展 ID 隔离 `chrome.storage.local`。ZIP 本身不能直接更新未打包扩展；把文件替换到原来的 `Location`，才能继续使用原扩展条目和本地数据。

## v0.4.0 测试重点

1. 打开 LinkedIn AI-powered Jobs 搜索页面，URL 通常包含 `origin=SEMANTIC_SEARCH_LANDING_PAGE`。
2. 扩展重新加载后刷新页面，确认侧边栏显示 `Jobs on this page` 和检测到的岗位卡片。
3. 确认已有分析的岗位显示缓存匹配分数和标题胶囊。
4. 从侧边栏点击多个岗位，确认选中岗位详情和 JD 会随岗位切换。
5. 点击重新分析当前显示的岗位，刷新 LinkedIn 后再次确认列表可以读取。
6. 打开侧边栏 `Settings`，确认 v0.3.1 的标题信号、关键词、颜色和 provider 设置仍然可用。
7. 把 LinkedIn 切回 Classic Search 并刷新一次，验证 Classic fallback。

![v0.4.0 AI-powered LinkedIn 搜索中的缓存列表分析和标题胶囊](./docs/assets/v0.4.0-ai-powered-search.png)
