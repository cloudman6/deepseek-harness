# Agent Note: Auto 路线 admission 设置

Status: implemented

[English](2026-08-23-auto-route-admission-settings.md) | 中文

## 问题

外部 Auto 插件可以派生 Active Catalog，但用户无法看到 Recommended 准入了哪些精确 binding，也无法在不编辑插件配置的前提下限制这些候选。若把用户开关解释成 binding 激活，就会混合三项相互独立的事实：AA 证据有效性、Host 当前可调用性和用户 admission。

## 决策

维护方提供的 Web 组合现在挂载一个可选 Host 桥接包和一个独立 Settings 分区。桥接包只拥有 `dsh-auto-mode` Settings 命名空间、不同 Recommended 集合的有界观察历史和三个直接 Remote。外部插件仍是投影提供方，并独占 Evidence Pack 编译与路线解析。

Recommended 是当前所有 Host 可调用、策略合格且精确绑定的路线。Custom 会原子地复制这个当前集合作为初始值，随后以精确 Evidence Route Key id 存储候选限制。它绝不修改 `valid`、`quarantined`、可调用或不可用等证据状态。缺失或陈旧的 Custom key 会继续保存并展示，但不能参与路由。某一档可以为空；既有升级或明确失败策略负责处理该条件。

浏览器接收有界投影，而不是完整 AA 快照。投影展示 active 与不可用 binding、各档首选、排除项、指标及其字段标识、能力分界，以及 Pack／快照／策略版本。它不包含 AA 凭据、获取 payload、原始快照或完整有效请求配置。Settings 变更只影响后续模型调用；当前调用已经冻结的路线保持不变。

外部插件会在 selection 和 resolution-failure 事件中记录 admission 模式及精确的 Recommended／admitted 集合标识。维护方提供的客户端接受 selection schema version 3，同时保留 version 1 和 2 以回放历史会话。

## 曾考虑的替代方案

- **允许用户设置 binding 状态** —— 否决，因为证据有效性和 Host 可用性是派生事实，不是偏好。
- **存储 provider/model 字符串** —— 否决，因为别名和可选推理控制项并不构成精确证据身份。
- **向浏览器发送完整 Evidence Pack** —— 否决，因为 UI 只需要窄化的解释投影，不需要获取或再分发数据。
- **要求每档至少一条路线** —— 否决，因为这会静默改变已经接受的升级和无路线行为。

## 后果

用户现在可以检查精确 Recommended 结果并限制 Auto，同时不会弱化证据检查或改变 Manual 模式。外部插件缺失时，桥接包仍会明确报告能力缺失。该页面表示调用时快照，不会实时订阅后台 Pack 或 Host 路线变化；重新打开、重试或写入会刷新它。

## 验证

Host 单元测试和真实 Loader 组合测试覆盖 Settings 默认值、Custom 原子初始化、路线校验、有界观察历史、不可用意图、提供方 teardown 与 Remote 形状。组件与 slot 测试覆盖所有可见状态、版本依据、Custom 交互、故障封装、本地化行为与 dispose。随附 Web e2e 验证页面存在，并在外部提供方缺失时快速失败；外部插件测试验证 active 投影，以及 assessor 和用户任务目录都使用 admitted 集合。
