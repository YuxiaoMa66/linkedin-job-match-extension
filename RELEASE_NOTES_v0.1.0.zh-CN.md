# v0.1.0

`LinkedIn Job Match` 的首个公开版本。

## 亮点

- 简历会持续保留，直到用户主动删除或替换
- 支持 LinkedIn 单岗位页和列表页分析
- 直接在 LinkedIn 原生页面显示匹配分数角标
- 支持 OpenAI、Gemini、Poe、Anthropic、OpenRouter 和 Custom endpoint
- 按 `jobId + resumeHash` 做本地缓存
- 支持荷兰 sponsorship 判断和 `KM` 标签
- 支持显示 JD 语言、经验要求、岗位语言要求
- 支持重新分析当前岗位和当前显示的岗位列表

## 安装方式

1. 下载 release 压缩包
2. 解压到本地
3. 打开 `chrome://extensions/`
4. 开启开发者模式
5. 点击“加载已解压的扩展程序”
6. 选择解压后的扩展目录

## 说明

- 扩展中不包含任何真实 API key
- 分析结果会随 provider 和 model 的不同而变化
- sponsorship 数据来源于公开的 IND recognised sponsor register，并已附带来源说明
