<p align="center">
  <img src="./docs/assets/readme-hero.png" alt="LinkedIn Job Match，在投递前看清岗位匹配度" width="100%" />
</p>

<p align="center">
  <strong>简体中文</strong>&nbsp;&nbsp;|&nbsp;&nbsp;<a href="./README.md">English</a>
</p>

<p align="center">
  <a href="https://github.com/YuxiaoMa66/linkedin-job-match-extension/tree/main"><img alt="v0.3.1" src="https://img.shields.io/badge/version-v0.3.1-9a4a30?style=flat-square" /></a>
  <img alt="Chrome Manifest V3" src="https://img.shields.io/badge/Chrome-MV3-9a4a30?style=flat-square" />
  <img alt="Vite 5" src="https://img.shields.io/badge/Vite-5-9a4a30?style=flat-square" />
  <a href="./LICENSE"><img alt="MIT 许可证" src="https://img.shields.io/badge/license-MIT-9a4a30?style=flat-square" /></a>
</p>

<p align="center">
  一个本地优先的 Chrome 扩展，把简历匹配、岗位分析历史、LinkedIn 页面信号和荷兰 sponsorship 信息放在同一套工作流里。
</p>

<p align="center">
  <a href="https://github.com/YuxiaoMa66/linkedin-job-match-extension/tree/main"><strong>使用 main 中的 v0.3.1</strong></a>
  &nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#安装方式">安装</a>
  &nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#配置方式">配置</a>
</p>

> [!NOTE]
> `v0.3.1` 现已合并进 `main`。原来的功能支线仍保留作为实现历史；当前 main 版本已经取代早期的 `v0.2.0`。

> [!IMPORTANT]
> **当前版本的 LinkedIn 兼容性限制**
>
> 当前版本只能分析 LinkedIn **经典版 Jobs 搜索界面**。暂时不支持新版 **AI-powered search** 界面。如果 LinkedIn 打开的是 AI 搜索界面，请先打开 `Learn more` 菜单，点击 `Switch back to classic search`，然后刷新 LinkedIn 页面。刷新后扩展才能重新读取经典版界面并显示分析结果。

<p align="center">
  <img src="./docs/assets/classic-search-switch.png" alt="LinkedIn 的 Learn more 菜单，其中突出显示了 Switch back to classic search" width="100%" />
</p>

## 快速开始

1. **第一次安装：** 下载构建好的 ZIP，解压后打开 `chrome://extensions/`，开启“开发者模式”，点击“加载已解压的扩展程序”，选择解压后的目录。
2. **更新已有的 v0.1.2+ 版本：** 解压新 ZIP，把文件替换到原扩展的 `Location` 中，保持目录路径不变，然后在原卡片上点击“Reload”。
3. **使用 LinkedIn 经典版 Jobs 搜索：** 如果出现 AI 搜索界面，请点击 `Learn more` → `Switch back to classic search`，然后刷新页面。
4. 在侧边栏上传简历，打开岗位或岗位列表并开始分析。

在同一目录更新可以保留扩展 ID，因此设置、简历、收藏/手动岗位和兼容历史都能继续使用。把新目录作为未打包扩展加载会生成独立的扩展 ID 和独立的 `chrome.storage.local`；详细原因和处理步骤见[安装方式](#安装方式)。

## 看清岗位，再决定是否投入时间

匹配分数和岗位信号直接显示在 LinkedIn 页面里，侧边栏则集中保存简历、证据、历史、收藏和重新分析入口。

![当前版本 LinkedIn 经典版搜索和岗位详情中的标题信号](./docs/assets/v0.3.1-linkedin-title-capsules.png)

想先看视觉化介绍，可以打开[产品主页](./docs/index.html)。

## 放进同一套工作流的信息

| 能力 | 带来的变化 |
| --- | --- |
| 简历与岗位匹配 | 支持单岗位、LinkedIn 搜索结果列表和手动粘贴的其他来源岗位。 |
| LinkedIn 页面内信号 | 在岗位标题附近显示匹配分数，以及可配置的 JD 语言、要求语言、经验年限、sponsorship 和 JD 关键词胶囊框。 |
| 可复用的判断历史 | 复用兼容缓存，区分 LinkedIn 与手动插入岗位历史，并收藏值得继续跟进的岗位。 |
| 多模型服务商 | 支持 OpenAI、Anthropic、Gemini、OpenRouter、Poe 和自定义 OpenAI 兼容接口。 |
| 荷兰 sponsorship 信息 | 使用内置 IND 衍生数据集检查组织名称，当前包含 12,927 个唯一名称。 |

## v0.3.1 更新重点

- 新增可配置的标题胶囊，分别显示 JD 语言、要求语言、KM sponsorship 和经验年限
- 新增颜色预设、每种信号独立色号和勾选项，可以控制显示内容，避免标题信息过多
- 新增最多 5 个 JD 关键词的可选标记，支持 `Tag`、`Bracket`、`Spark` 三种样式；修改设置时会复用已缓存的 JD 片段
- OpenAI、Anthropic 和 Gemini 会写入固定起始模型，但 `Saved models` 仍可编辑；旧的 `gpt-4o` 会隐藏，用户自己添加的模型 ID 不会删除
- 保留 v0.1.2 以来兼容的匹配和 sponsor 历史，并继续明确只能使用经典版 LinkedIn 搜索，切回后需要刷新页面

简洁的版本记录请看 [v0.3.1 更新说明](./RELEASE_NOTES_v0.3.1.zh-CN.md)。

## v0.3.1 参考说明

### 标题胶囊颜色说明

默认方案为每种标题信息使用一种颜色。匹配分数角标独立计算颜色，不属于下面的标题胶囊。

| 标题胶囊 | 示例 | 默认颜色 | 色盲友好颜色 |
| --- | --- | --- | --- |
| KM sponsorship | `KM` | 蓝色 `#2563EB` | 蓝色 `#0072B2` |
| JD 语言 | `JD: English` | 紫色 `#7C3AED` | 朱红色 `#D55E00` |
| 要求语言 | `Lang: English / Dutch` | 青绿色 `#0F766E` | 绿色 `#009E73` |
| 经验年限 | `Exp: 3y+` | 琥珀色 `#B45309` | 橙色 `#E69F00` |
| JD 关键词 | `KEY: SQL` | 玫红色 `#BE123C` | 淡紫色 `#CC79A7` |

进入设置页的 `Title signals` 区块，在下拉菜单中选择颜色方案。色盲友好方案使用更容易区分的色相；自定义模式可以为每一个胶囊分别输入十六进制色号。四种基础信息通过勾选框控制；关键词标记默认关闭，只有开启后并且已分析 JD 匹配到关键词时才会显示。

### 产品画面

下面保留两张关键画面，说明实际使用结果，不把更新日志变成重复的截图图库：

![每个胶囊独立的自定义颜色](./docs/assets/v0.3.1-custom-colors.png)

关键词标记默认关闭。开启后，如果已读取的 JD 命中已配置关键词，匹配词会作为独立标题胶囊显示。

![使用 Spark 样式显示已命中的 JD 关键词](./docs/assets/v0.3.1-keyword-match.png)

### 固定的 provider 起始模型

provider 切换不会动态获取模型。本版本在选择 provider 时，会把下面的起始模型写入可编辑的 `Saved models`：

| Provider | 起始模型 | 官方参考 |
| --- | --- | --- |
| OpenAI | `gpt-5-mini` | [OpenAI pricing](https://developers.openai.com/api/docs/pricing) |
| Anthropic | `claude-haiku-4-5-20251001` | [Claude models overview](https://docs.anthropic.com/en/docs/about-claude/models/overview) |
| Gemini | `gemini-3.5-flash-lite` | [Gemini 3.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite) |

`Saved models` 文本框仍然可以自由编辑；可以保留起始模型、替换它，或点击 `Add active model` 继续添加新的模型 ID。

## v0.2.0 更新重点

- 根据 2026-08-26 的新数据源刷新本地 IND sponsor 数据库
- 去重后内置 12,927 个唯一组织名称
- 增加 sponsor 数据版本校验，更新扩展后会自动忽略旧的本地缓存
- 新增 `docs/` 独立产品主页，展示工作流、截图、信号和本地安装路径
- 中文文档入口改为 GitHub 渲染页面，避免静态页面中的中文乱码

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

### 3. 经典版 Jobs 搜索列表分析

在 LinkedIn 经典版 Jobs 搜索结果页中，扩展可以：

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

### 7. 可配置标题胶囊与 JD 关键词

进入 `Settings → Title signals` 后可以：

- 选择默认或色盲友好颜色方案
- 为每一种胶囊单独输入自定义色号
- 分别勾选 KM、JD 语言、要求语言和经验年限
- 可选开启关键词标题标记，输入最多 5 个 JD 关键词，并选择标题中的标记样式

关键词扫描使用已分析岗位中保存的 JD 文本片段。保存设置后，当前 LinkedIn 页面会刷新标题角标。

### 8. 多 provider 模型支持

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

### 方式二：从 GitHub Release 资产安装

1. 下载 release 压缩包
2. 解压文件
3. 打开 `chrome://extensions/`
4. 开启开发者模式
5. 点击“加载已解压的扩展程序”
6. 选择解压后的扩展目录

一个很常见的错误是：

- 用户下载了 GitHub 仓库源码压缩包，然后直接加载源码根目录。
- 这样虽然扩展界面可能可以打开，但如果没有加载 `dist/`，`PDF` 或 `DOCX` 简历解析就可能失败。

如果要从源码构建当前版本，请使用 `main` 支线并按方式一操作。GitHub Release 资产可以在源码合并后单独发布。

### 更新现有扩展，避免生成第二个插件

为了保留简历、设置、收藏岗位、手动插入岗位以及从 v0.1.2 开始的历史匹配结果，请始终在 Chrome 已经加载的原目录内更新：

1. 打开 `chrome://extensions/`，进入现有扩展的“详细信息”，记下 `位置（Location）`。
2. 把新的 ZIP 解压到一个临时目录。
3. 将解压后的扩展文件复制到原来的 `Location` 中并替换旧文件；保留原来的父目录和路径不变。
4. 回到 `chrome://extensions/`，点击原扩展卡片上的“重新加载（Reload）”。

不要对新解压的目录再次点击“加载已解压的扩展程序”，也不要把它作为一个新的未打包扩展拖进去。Chrome 会为新目录分配不同的扩展 ID 和独立的 `chrome.storage.local`，看起来就会像安装了第二个插件。如果已经出现重复卡片，只删除重复的那一个，然后回到原目录更新。

本版本不会清除 `ljm_config`、`persistentResume`、`ljm_saved_positions_v1`、`ljm_manual_jobs_v1` 或 v3 匹配缓存。相同简历下，从 v0.1.2 开始的已分析结果仍可显示，包括旧记录中的 sponsor 和匹配快照；从未分析的岗位仍保持“未分析”。原有缓存的过期规则仍然有效。Chrome 不会把另一个扩展 ID 的本地存储自动开放给新扩展，因此换一个新目录本身无法安全迁移旧数据。

## 配置方式

打开侧边栏后：

1. 上传 `PDF`、`DOCX` 或 `TXT` 简历
2. 进入 `Settings`
3. 选择 provider
4. 填写该 provider 对应的 `Base URL`
5. 填写该 provider 对应的 `API key`
6. 选择 `Active model`；选择 OpenAI、Anthropic 或 Gemini 时，`Saved models` 会自动写入本版本固定的低成本起始模型
7. 按需要编辑 `Saved models`，或点击 `Add active model` 添加多个模型
8. 选择 `Analysis mode`
9. 选择是否 `I need employer sponsorship`
10. 按需要开启 `Full custom scoring`
11. 在 `Title signals` 中选择需要显示的标题胶囊
12. 如有需要，选择颜色方案、为每个胶囊输入自定义色号，开启关键词标记，并添加最多 5 个 JD 关键词
13. 保存设置

## 隐私与数据处理

- 简历内容保存在本地扩展存储中
- API key 保存在本地扩展存储中
- 已分析岗位缓存可能保存一段有上限的本地 JD 片段，用于在修改关键词后重新计算标题标记
- 模型请求只会发送到用户当前选择的 provider
- sponsorship 判断使用项目内置的本地 sponsor 数据集

关于数据来源与署名建议，请看 [DATA_ATTRIBUTION.md](./DATA_ATTRIBUTION.md)。

## License

本项目采用 [MIT License](./LICENSE) 发布。
