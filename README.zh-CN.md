**中文** | [English](./README.md)

# LinkedIn Job Match

`LinkedIn Job Match` 是一个基于 Chrome Manifest V3 的浏览器扩展，用来更快地筛选 LinkedIn 岗位，也支持把其他来源的岗位手动粘贴进来分析。它会比较简历和岗位描述的匹配度，在 LinkedIn 页面内直接展示分数和标签，并基于本地 IND 衍生数据给出荷兰 sponsorship / KM 相关信号。

当前版本信息：

- 扩展名称：`LinkedIn Job Match`
- 当前 manifest 版本：`0.1.2`
- 技术栈：`Chrome Extension MV3 + Vite + Vanilla JavaScript`

## 扩展示意

![扩展卡片截图](./Screenshot/plugin.png)

## 这个项目能做什么

这个扩展的目标是减少重复看 JD、反复比简历的时间成本。它可以：

- 读取 LinkedIn 单岗位页和搜索列表页的岗位信息
- 将上传的简历持久保存在本地，直到用户主动替换或删除
- 通过多个 LLM provider 计算岗位匹配分数
- 按简历、评分配置、Prompt 版本和模型配置缓存分析结果
- 在 LinkedIn 原生页面里直接注入分数和元信息标签
- 检测 JD 语言、岗位要求经验年限、岗位要求语言
- 基于本地 IND sponsor 数据判断荷兰 sponsorship / KM 信号
- 收藏已经分析过的岗位
- 区分查看 LinkedIn 岗位历史和手动插入岗位历史
- 支持手动粘贴其他来源的岗位信息并在同一个 side panel 中分析

## v0.1.2 更新重点

- 新增 `Library` 区块，支持：
  - `History`
  - `Saved`
  - `LinkedIn`
  - `Inserted`
- 已分析岗位现在可以收藏，方便后续回看
- 历史和收藏列表都支持卡片内二级详情页和返回按钮
- `Inserted jobs` 独立成区块，放在 `List mode` 上方
- 用户可以粘贴非 LinkedIn 岗位文本，并选择：
  - `Rule detect`
  - `Model detect`
- 插入岗位支持分析、重分析、编辑、收藏、删除，并进入独立历史
- `History` 和 `Saved` 都支持删除单条记录
- 打开详情时不再自动把 side panel 滚动到底部

## 核心功能

### 1. 简历持久保存

上传后的简历会保存在 `chrome.storage.local` 中，在以下场景不会丢失：

- 刷新页面
- 关闭再打开侧边栏
- 重启浏览器

只有在以下情况下才会替换当前简历：

- 用户主动删除当前简历
- 用户上传新的简历

### 2. 单岗位分析

在 LinkedIn 单岗位详情页中，扩展会尝试读取：

- 职位标题
- 公司
- 地点
- JD 正文

然后在侧边栏中展示结果。如果同一个岗位已经针对当前简历和当前评分配置分析过，则优先复用缓存。

### 3. 列表模式分析

在 LinkedIn 搜索结果页中，扩展可以：

- 识别当前页面可见岗位
- 自动分析前 `N` 个岗位
- 加载当前页更多岗位
- 对已有历史结果的岗位直接复用缓存
- 重新分析当前岗位或当前显示的岗位
- 点击列表项，在 side panel 内打开二级详情页

### 4. Library：历史与收藏

新的 `Library` 区块可以让用户：

- 在 `History` 和 `Saved` 之间切换
- 在 `LinkedIn` 和 `Inserted` 之间切换
- 打开历史分析详情
- 删除单条历史记录
- 删除单条收藏记录

### 5. 手动插入岗位

`Jobs from insert` 区块用于分析其他来源的岗位文本。

用户可以：

- 粘贴原始岗位文本
- 选择 `Rule detect` 用本地规则提取字段
- 选择 `Model detect` 用模型辅助结构化字段
- 检查并修改提取后的字段
- 保存并分析这个插入岗位
- 后续再次打开它的分析结果

### 6. LinkedIn 原生角标与标签

扩展会在 LinkedIn 原生界面中注入这些信息：

- 总体匹配分数
- `KM` sponsorship 标记
- JD 语言
- 岗位要求经验年限
- 岗位要求语言

### 7. 多 provider 模型支持

设置页支持为不同 provider 分别维护独立配置，例如：

- `OpenAI`
- `Anthropic`
- `Gemini`
- `OpenRouter`
- `Poe`
- `Custom`

每个 provider 都会分别保存自己的：

- Base URL
- API key
- Active model
- Saved models
- Timeout
- Retry 设置

## 截图

### LinkedIn 页面整体工作流

这张图展示了分数角标、语言与经验标签、当前岗位上下文，以及列表模式下的分析结果。

![主界面截图](./Screenshot/example%20v0.1.1.png)

### 分析模式与评分控制

这几张图展示了最近这版的评分设置和高级控制项。

![Analysis mode 截图](./Screenshot/Analysis%20mode.png)

![Analysis preference 截图](./Screenshot/Analysis%20preference%20setting.png)

![Full custom scoring 截图](./Screenshot/full%20custom%20scoring%20setting.png)

### Library：历史与收藏

这张图展示了 `Library` 中的历史和收藏切换视图。

![Library 截图](./Screenshot/history%20and%20save.png)

### Inserted jobs

这张图展示了 `Jobs from insert` 区块，用于粘贴其他来源的岗位并分析。

![Inserted jobs 截图](./Screenshot/insert.png)

### sponsorship 需要与不需要

这两张图展示了当用户明确表示“需要 sponsorship”或“不需要 sponsorship”时，逻辑如何变化。

![需要 sponsorship 截图](./Screenshot/if%20need%20sponsorship.png)

![不需要 sponsorship 截图](./Screenshot/ifnot%20need%20sponsorship.png)

### Breakdown 详细评分

这张图展示了逐项评分的结构化输出。

![Breakdown 截图](./Screenshot/breakdown.png)

### 设置页与 provider 切换

这些图展示了 provider 配置、模型切换、连通性测试等内容。

![设置页截图](./Screenshot/settings.png)

![Provider 切换截图](./Screenshot/provider%20switch.png)

![连通性测试截图](./Screenshot/Test%20Connection.png)

### 侧边栏详情页

这张图展示了点击岗位后在 side panel 内打开的二级详情页。

![详细分析截图](./Screenshot/specific%20jd%20match%20detail.png)

### Chrome 加载流程

这张图可以用于说明如何在 `chrome://extensions/` 中开启开发者模式并加载扩展。

![Chrome 加载流程截图](./Screenshot/chrome%20procedure.png)

## 仓库结构

```text
assets/                  扩展图标与静态资源
data/                    IND sponsor 数据与更新脚本
public/                  构建时复制的公开资源
Screenshot/              README 截图
src/background/          service worker、缓存、配置、模型集成
src/content/             LinkedIn 页面提取与角标注入
src/prompts/             prompt 模板
src/shared/              常量与校验辅助
src/sidepanel/           侧边栏 UI
manifest.json            Chrome 扩展清单
package.json             脚本与依赖
setup_public.js          构建前资源准备脚本
vite.config.js           Vite 构建配置
```

## 安装方式

重要提醒：

- 不要直接把项目源码根目录当成扩展加载。
- 一定要加载构建后的 `dist/` 目录，或者使用 GitHub release 包并加载解压后的扩展目录。
- 如果加载了错误目录，界面可能还能打开，但简历上传时会因为解析文件缺失而失败。

### 方式一：从源码运行

```bash
npm install
npm run build
```

然后：

1. 打开 `chrome://extensions/`
2. 开启开发者模式
3. 点击“加载已解压的扩展程序”
4. 选择 `dist/` 目录

参考截图：

![Chrome 加载流程截图](./Screenshot/chrome%20procedure.png)

### 方式二：从 GitHub Release 安装

1. 下载 release 压缩包
2. 解压文件
3. 打开 `chrome://extensions/`
4. 开启开发者模式
5. 点击“加载已解压的扩展程序”
6. 选择解压后的扩展目录

一个很常见的错误是：

- 用户下载了 GitHub 仓库源码压缩包，然后直接加载源码根目录。
- 这样虽然扩展界面可能可以打开，但如果没有加载 `dist/`，`PDF` 或 `DOCX` 简历解析就可能失败。

## 配置方式

打开侧边栏后：

1. 上传 `PDF`、`DOCX` 或 `TXT` 简历
2. 进入 `Settings`
3. 选择 provider
4. 填写该 provider 对应的 `Base URL`
5. 填写该 provider 对应的 `API key`
6. 选择 `Active model`
7. 按需要维护多个 `Saved models`
8. 选择 `Analysis mode`
9. 选择是否 `I need employer sponsorship`
10. 按需要开启 `Full custom scoring`
11. 保存设置

## 隐私与数据处理

- 简历内容保存在本地扩展存储中
- API key 保存在本地扩展存储中
- 模型请求只会发送到用户当前选择的 provider
- sponsorship 判断使用项目内置的本地 sponsor 数据集

关于数据来源与署名建议，请看 [DATA_ATTRIBUTION.md](./DATA_ATTRIBUTION.md)。

## License

本项目采用 [MIT License](./LICENSE) 发布。
