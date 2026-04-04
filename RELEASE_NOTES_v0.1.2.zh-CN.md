# v0.1.2

`v0.1.2` 让 `LinkedIn Job Match` 不再只服务于 LinkedIn 页面内分析，而是开始支持“岗位管理”和“非 LinkedIn 岗位插入分析”。

## 主要更新

- 新增 `Library` 区块，支持：
  - `History`
  - `Saved`
  - `LinkedIn`
  - `Inserted`
- 已分析岗位现在可以加星收藏，方便后续回看
- 历史与收藏都支持卡片内二级详情页和返回按钮
- 新增 `Jobs from insert` 区块，用于粘贴非 LinkedIn 来源的岗位文本
- 用户在字段提取时可以自己选择：
  - `Rule detect`
  - `Model detect`
- 插入岗位现在支持：
  - 分析
  - 重分析
  - 编辑
  - 删除
  - 收藏
  - 从历史中再次打开
- `History` 和 `Saved` 都支持删除单条记录

## 用户侧改进

- `Library` 现在位于 inserted jobs 和 list mode 之前
- `Inserted jobs` 也位于 list mode 之前
- 打开详情时不再自动把 side panel 滚动到底部
- 插入岗位区域的文案更清晰，更强调“当前插入分析”而不是历史存储
- 手动插入岗位的分析体验更接近 LinkedIn list mode

## 这个版本的意义

这个版本让扩展开始具备更强的“岗位工作台”属性：

- 用户可以分析公司官网、招聘网站或其他来源复制来的岗位
- 用户可以维护自己的收藏清单
- 用户可以回看历史结果，而不需要反复重新跑分析

## 说明

- `History` 仍然和当前简历、当前评分上下文绑定
- `Saved` 是岗位级收藏，可以独立于当前分析会话存在
- 安装时仍然需要加载构建后的 `dist/` 目录或 release 解压目录，而不是仓库源码根目录
