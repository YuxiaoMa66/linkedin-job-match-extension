# v0.1.1

`v0.1.1` 是 `LinkedIn Job Match` 第一次比较完整的评分系统与评估控制升级。

## 主要更新

- 统一的 `Analysis mode`，包含 4 个预设：
  - `Strict`
  - `Balanced`
  - `Potential`
  - `Sponsorship-first`
- 新增 `I need employer sponsorship` 开关，由用户明确控制 sponsorship 是否应该影响评分
- 荷兰 sponsorship 判断改成规则优先，不再完全依赖模型自由打分
- sponsorship 状态在 UI 中直接展示：
  - `Supported`
  - `Hard blocker`
  - `Conflicting signals`
  - `Not needed`
- 新增 `Enable full custom scoring`
  - 自定义权重
  - 完整 `Full custom prompt`
  - 附加 prompt instructions
- 更清楚地展示：
  - `Raw score`
  - 最终分数
  - sponsorship 硬性门槛
  - timing 与 diagnostics
- 缓存隔离升级，纳入：
  - 简历
  - 评分配置
  - Prompt 版本
  - 模型配置

## 用户侧改进

- 更清楚地区分原始分数和最终分数
- 当最终分数被强制压成 `0` 时，会直接显示 `Blocked`
- provider 之间的设置继续保持相互独立
- 在保留简单 preset 流程的同时，给高级用户更强的控制能力
- 如果加载了错误的扩展目录，简历上传失败提示会更直白

## v0.1.1 中的 sponsorship 行为

- 在 `Balanced`、`Strict`、`Potential` 中，sponsorship 只是一个评分维度，不会默认把整体分数直接压成 `0`
- 在 `Sponsorship-first` 中，明确的不兼容 sponsorship 情况可以成为硬性门槛
- 如果 JD 明确写了不提供 sponsorship，那么 `Sponsorship Fit` 会直接变成 `0`
- 如果 JD 和 IND registry 给出冲突信号，扩展会显示 `Conflicting signals`，而不是假装结论是明确的

## 说明

- 由于缓存上下文现在更严格，旧版本缓存可能不会继续复用
- 这个版本的重点是评分质量、控制能力和可解释性，不是一次大的 UI 重做
- 如果手动安装扩展，请加载构建后的 `dist/` 目录或 release 解压后的扩展目录，不要直接加载仓库源码根目录
