# 周月年计划与重要日期设计研究

调研日期：2026-10-26

## 参考资料

1. Atlassian：OKR 与周期目标
   <https://www.atlassian.com/agile/agile-at-scale/okr>
2. Todoist：Weekly Review 周复盘
   <https://www.todoist.com/productivity-methods/weekly-review>
3. Nielsen Norman Group：Progressive Disclosure 渐进披露
   <https://www.nngroup.com/articles/progressive-disclosure/>
4. Material Design 3：Motion
   <https://m3.material.io/styles/motion/overview>
5. Apple Human Interface Guidelines：Motion
   <https://developer.apple.com/design/human-interface-guidelines/motion>
6. Asana：OKR 目标与关键结果
   <https://asana.com/resources/okr-meaning>
7. Microsoft Planner：任务与计划协作
   <https://support.microsoft.com/en-us/planner>

以上链接在本次调研中均可访问。

## 采用的方案

### 1. 日、周、月、年分层

日计划保留具体执行时间；周、月、年计划使用独立范围，不再混入每日列表。

- 周计划适合安排本周复习、训练和练习频率。
- 月计划适合课程、项目、习惯和阶段成果。
- 年计划适合长期目标、资格认证和年度里程碑。

用户可在整理确认页手动修改计划层级。

### 2. 两种范围计算

每个大计划可以按两种方式计算：

- 按日历：本周周一到周日、本月第一天到最后一天、本年 1 月 1 日到 12 月 31 日。
- 从今天起：从基准日期开始计算 7 天、1 个月或 1 年。

界面上使用“按日历”和“从今天起”两个短标签，避免复杂解释。

### 3. 渐进披露

主页只显示两个紧凑状态栏：

- 左上：重要日期。
- 右上：大计划。

状态栏默认收起。展开后：

- 重要日期按时间排序，显示关联的截止计划。
- 大计划按周、月、年顺序展示。

这种方式减少主页信息密度，同时保持核心信息一眼可见。

### 4. 里程碑和倒排计划

重要事件不是普通计划。它保存日期和事件名称，并能关联多个截止计划。

例如：

- “11 月 5 日有项目评审。”
- “在那之前完成方案和预算。”

系统保存“项目评审”为重要日期，并把“完成方案和预算”归入该日期之前的截止计划。

### 5. 快速完成

主页展开某一天后，每条待完成计划左侧提供圆形状态按钮。点击后执行“完成并删除”，不需要额外确认，减少重复任务清理成本。

### 6. 动效

采用 140 至 190ms 的短动效：

- 状态栏高度从 `0fr` 平滑过渡到 `1fr`。
- 箭头旋转 180 度。
- 展开面板只改变透明度和网格行高，不计算固定高度。
- 快速完成按钮使用约 130ms 的缩放和颜色反馈。
- 支持 `prefers-reduced-motion`，系统减少动态效果时自动关闭长动画。

## 数据兼容

- 原有 `zhangzihao-plans-v1` 任务继续读取。
- 旧计划自动按日计划处理。
- 重要日期使用独立存储键，避免破坏原计划数据。
- 原有导入、语音识别、提取和本地持久化逻辑保持可用。
