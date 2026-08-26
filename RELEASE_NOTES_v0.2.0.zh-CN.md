# v0.2.0

`v0.2.0` 更新本地 sponsorship 数据库，并为 `LinkedIn Job Match` 增加独立的产品主页。

## 主要更新

- 根据 2026-08-26 的新数据源刷新本地 IND sponsor 名单
- 去重后内置 12,927 个唯一组织名称，合并 8 组重复行
- 增加 sponsor 数据版本校验，更新扩展后会自动忽略旧的 `chrome.storage.local` 缓存
- 新增 `docs/` 独立产品主页，展示工作流、截图、信号和本地安装路径
- 中英文 README 入口改为 GitHub 渲染页面，避免静态页面中的中文乱码

## 数据说明

- 运行时数据库只保存组织名称，源 Excel 中的 KVK 编号没有加入现有字符串数组 schema
- 数据来源和复用说明继续记录在 `DATA_ATTRIBUTION.md`
- 安装时请加载构建后的 `dist/` 目录，不要直接加载仓库源码根目录
