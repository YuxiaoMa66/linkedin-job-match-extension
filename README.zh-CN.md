**中文** | [English](./README.md)

# LinkedIn Job Match

`LinkedIn Job Match` 是一个基于 Chrome Manifest V3 的浏览器扩展，用来比较用户简历与 LinkedIn 岗位描述之间的匹配度，并将荷兰 sponsorship 信号直接显示在 LinkedIn 页面中。

当前版本信息：

- 扩展名称：`LinkedIn Job Match`
- 当前 manifest 版本：`0.1.0`
- 技术栈：`Chrome Extension MV3 + Vite + Vanilla JavaScript`

## 扩展展示

这是扩展当前在 Chrome 中的展示样式：

![扩展卡片截图](./Screenshot/plugin.png)

## 项目简介

这个项目的目标是帮助用户在 LinkedIn 上更高效地筛选岗位。

它可以：

- 在 LinkedIn 单岗位页和搜索列表页提取岗位信息
- 将用户上传的简历长期保存在本地，直到主动替换
- 通过多种 LLM provider 计算岗位匹配分数
- 按 `jobId + resumeHash` 缓存历史分析结果
- 直接在 LinkedIn 原生页面中打上角标和标签
- 检测 JD 语言、岗位要求经验年限、岗位要求语言
- 基于本地 IND sponsor 数据做荷兰 sponsorship 判断

## 主要功能

### 1. 简历持久保存

上传后的简历会保存到 `chrome.storage.local` 中，在以下情况不会丢失：

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

然后在侧边栏中显示分析结果。如果当前岗位已经针对当前简历分析过，则优先读取缓存结果，而不是重复调用模型。

### 3. 列表模式分析

在 LinkedIn 搜索列表页中，扩展可以：

- 识别当前页面可见岗位
- 自动分析前 `N` 个岗位
- 加载当前页更多岗位
- 对已有历史结果的岗位直接复用缓存
- 支持重新分析当前岗位或当前显示的岗位
- 点击列表中的岗位，在侧边栏内打开二级详情视图

### 4. LinkedIn 页面内角标与标签

扩展会直接在 LinkedIn 原生界面中注入以下信息：

- 总体匹配分数
- `KM` sponsorship 标签
- JD 语言
- 岗位要求经验年限
- 岗位要求语言

### 5. 多 provider 模型支持

设置页支持为不同 provider 维护独立配置，例如：

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

### LinkedIn 页面与侧边栏整体效果

这张图展示了最核心的使用场景：

- LinkedIn 左侧原生列表中的分数角标
- 语言、经验、`KM` 等元信息标签
- 侧边栏中的当前岗位上下文
- list mode 中的缓存结果展示

![主界面截图](./Screenshot/example.png)

### 设置页

这张图展示了用户如何配置：

- provider
- Base URL
- API key
- Active model
- Saved models

![设置页截图](./Screenshot/settings.png)

### Provider 切换

这张图展示了插件支持在多个 provider 之间切换，并保持各自独立配置。

![Provider 切换截图](./Screenshot/provider%20switch.png)

### 连通测试

这张图展示了在真正开始分析前，可以先验证当前 provider 与 model 是否可用。

![连通测试截图](./Screenshot/Test%20Connection.png)

### 批量分析进度

这张图展示了列表模式下批量分析时的进度反馈。

![批量分析截图](./Screenshot/clicking%20analyze%20or%20re-analyze.png)

### 详情二级页

项目中也支持点击列表项后，在侧边栏内部打开岗位详情分析页。

![详细分析截图](./Screenshot/specific%20jd%20match%20detail.png)

### Chrome 加载流程

这张图可以直接用于说明如何在 `chrome://extensions/` 中开启开发者模式并加载已解压扩展。

![Chrome 加载流程截图](./Screenshot/chrome%20procedure.png)

## 仓库结构

```text
assets/                  扩展图标与静态资源
data/                    IND sponsor 数据与更新脚本
public/                  构建时复制的公开资源
Screenshot/              README 使用的截图
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

如果你后续发布了 release zip：

1. 下载 release 压缩包
2. 解压文件
3. 打开 `chrome://extensions/`
4. 开启开发者模式
5. 点击“加载已解压的扩展程序”
6. 选择解压后的扩展目录

## 配置方式

打开侧边栏后：

1. 上传 `PDF`、`DOCX` 或 `TXT` 简历
2. 进入 `Settings`
3. 选择 provider
4. 填写该 provider 对应的 `Base URL`
5. 填写该 provider 对应的 `API key`
6. 选择 `Active model`
7. 需要时可维护多个 `Saved models`
8. 可选设置自动分析前 `N` 个岗位
9. 点击保存

## 缓存规则

缓存键由以下两部分组成：

- `jobId`
- `resumeHash`

这样可以避免用户更换简历后误用旧结果。

其他缓存行为：

- 已分析岗位优先读取历史记录
- 明显损坏的低质量缓存结果会被过滤
- 超过 30 天的岗位历史记录会自动删除

## 隐私与数据处理

- 简历内容保存在本地扩展存储中
- API key 保存在本地扩展存储中
- 请求只会发送到用户当前选择的模型 provider
- sponsorship 判断使用项目内置的本地数据集

关于数据来源与署名建议，请看 [DATA_ATTRIBUTION.md](./DATA_ATTRIBUTION.md)。

## 发布说明

这个文件夹是我为公开 GitHub 仓库整理出来的干净上传版本。

它刻意不包含：

- `node_modules`
- 本地日志文件
- 临时调试文件
- 已构建好的 `dist/`

推荐发布流程：

1. 把这个文件夹里的内容上传到 GitHub 仓库
2. 仓库本身只作为源码仓库
3. 本地执行 `npm run build`
4. 将 `dist/` 压缩为 zip
5. 把这个 zip 上传到 GitHub Releases

## License

本项目采用 `MIT` License，见 [LICENSE](./LICENSE)。
