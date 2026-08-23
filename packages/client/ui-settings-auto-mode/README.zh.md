# @deepseek-ai/dsh-client-ui-settings-auto-mode

[English](README.md) | 中文

用于路线 admission 的 Web 设置 **Auto 模式**分区。分区挂载后会懒读取维护方提供的 Host 桥接服务，并明确展示 Recommended 与 Custom 两种模式。Recommended 会启用外部价格、延迟和稳定身份排序在每个非空档位中的首选路线。页面还会展示其他所有可调用、不可用或已排除的 binding、排除原因、AA 能力／归一化价格／延迟指标、能力分界，以及生成结果所用的 Evidence Pack、快照、binding 注册表、路线策略与 admission 策略标识。

首次使用 Custom 时从当前 Recommended 集合开始。此后在 Recommended 与 Custom 之间切换会保留已保存的 Custom 选择，包括用户明确留下的空集合。所有同时满足精确绑定和 Host 当前可调用的行都提供复选框，包括 Recommended 之外的可调用路线；修改复选框只约束 Auto 候选，不会改变证据状态。当前 Evidence Pack 已不再包含的已存储 key 仍会显示为保留但不可路由的用户意图。空档、Settings 只读、提供方缺失、Recommended 集合变化、加载、重试、保存中、成功与通用失败状态都会明确展示。界面文案说明 AA 数据是启发式证据，不是项目 Benchmark 或具体任务质量保证，并说明变更从下一次模型调用开始生效。

组件通过自身 slot 注入接口接收三个窄化的 Remote 回调。它不导入 Host 实现、不拥有订阅机制，也不向浏览器暴露 AA 凭据、原始快照、获取响应或完整有效请求配置。

## 模型体验

间接影响：用户的 admission 选择会改变外部 Auto 插件后续模型调用的候选集合；本包不注册面向模型的内容。

#### KV Cache 影响

后续调用可能使用另一条已准入路线和另一个提供方缓存域。渲染或查看本设置页不会影响模型输入或 KV Cache。

## 已知限制与暂缓事项

- **调用时投影** —— 页面在挂载、重试和自身写入后刷新。保持页面打开时，它不会订阅后台 Evidence Pack 或 Host 路线变化。
- **不编辑证据** —— 用户只能限制当前精确绑定且可调用的路线；不能修改 AA 字段、能力分界、binding 身份、派生证据状态或价格／延迟排序。
