# v0.3.0 —— 标题信号测试预览

`v0.3.0` 目前发布在 `feature/v0.3.0-title-signals` 支线供测试，暂时不会合并到 `main`。

## 更新内容

- 在 LinkedIn 岗位标题中分别显示 JD 语言和要求语言胶囊框
- KM sponsorship 与经验年限继续作为独立标题信号显示
- 新增默认、色盲友好和自定义颜色三套方案
- 自定义颜色支持为 KM、JD 语言、要求语言、经验年限和 JD 关键词分别输入色号
- 新增四种基础标题信号的勾选控制
- 新增最多 5 个 JD 关键词匹配，并提供 Tag、Bracket、Spark 三种标记样式
- 保存一段有上限的本地 JD 片段，以便修改设置后重新计算关键词标记
- README 和产品主页增加新显示设置的说明

## 兼容性提醒

扩展目前仍只支持 LinkedIn 经典版 Jobs 搜索界面。如果 LinkedIn 打开的是 AI-powered search，请点击 `Learn more → Switch back to classic search`，然后刷新页面。

## 测试方式

```bash
npm install
npm run build
```

在 `chrome://extensions/` 开启开发者模式，加载生成的 `dist/` 文件夹，然后打开 `Settings → Title signals`。
