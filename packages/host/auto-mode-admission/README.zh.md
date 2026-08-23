# @deepseek-ai/dsh-host-auto-mode-admission

[English](README.md) | 中文

外部 `dsh-auto-mode` 插件与 Host Settings 之间的可选 DSH Web 桥接包。它拥有 `dsh-auto-mode` Settings 命名空间，其中用户字段为 `mode`（`recommended` 或 `custom`）和 `customEvidenceRouteKeyIds`。有上限的 `recommendedObservations` 历史由 Host 拥有，仅用于审计，绝不参与路线合格性判断。

该服务发布由 Typert 生成的直接 Remote，用于读取当前适合浏览器展示的有界投影、切换模式，以及启用或停用一条当前可调用且精确绑定的路线。投影会把当前完整可调用集合与 Recommended 首选路线分开。首次进入 Custom 时会原子地复制当前 Recommended 集合。此后在 Recommended 与 Custom 之间切换会保留已存储的选择，包括用户明确留下的空集合，同时仍可增减任何可调用且精确绑定的路线。Custom key 后续变为不可用或从 Evidence Pack 中消失时仍会保存在设置里，但不能参与路由。外部插件仍独占证据获取、binding 编译、Host 路线物化、分档策略和候选解析；本包既不读取 AA，也不修改派生的 binding 状态。

提供方注册跟随调用方 fiber。外部插件缺失或卸载后，`view` 会明确返回 `provider-unavailable`，不会把缓存目录伪装成当前状态。Settings 变更只影响后续模型调用，绝不会修改当前调用已经冻结的路线。

## 模型体验

间接影响：通过外部 Auto 插件为下一个模型步骤选择路线；本包不注册提示词、工具、消息或提供方请求。

#### KV Cache 影响

Admission 变更可能让后续模型调用选择另一条路线，从而进入不同的提供方缓存域。本包不会改动已经冻结的请求或提示词前缀。

## 已知限制与暂缓事项

- **可选提供方** —— 随附 Web 组合包含本桥接包，但必须由外部 Auto 插件注册投影提供方后，路线行才可用。
- **有界本地审计** —— 只保留最近八个不同的 Recommended 集合观察记录。这是本地解释历史，不是遥测或 AA 获取日志。
