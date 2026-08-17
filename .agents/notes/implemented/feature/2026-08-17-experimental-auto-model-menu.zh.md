# Agent Note: 实验性 Auto 模型菜单

Status: implemented

[English](2026-08-17-experimental-auto-model-menu.md) | 中文

## 问题

Phase 0P Auto 插件可以在 Host 边界选择提供方、模型和推理强度，但只有配置文件开关时，用户无法判断 Auto 是否启用、哪个选择实际进入请求，或者策略为何这样选择。Auto 路由的请求运行期间，现有模型触发器也会继续显示上一次目录值。

## 决策

维护者 fork 以可选 `dshAutoMode` Session 投影扩展现有 `conversation.input.model` 入口。投影存在时，根菜单把 Auto 放在 Model 和 Effort 之前，用标准对勾图标标记启用的 Auto 行，并显示最近的层级、原因代码、解释和 `experimental-unadmitted` 状态。紧凑触发器在投影给出的模型和推理强度前添加 Auto。

外部 Phase 0P 插件持有 Auto 状态和决定。它追加 `dsh-auto-mode/mode` 与 `dsh-auto-mode/selection` 事件，经 `ctx.sessionProjections` 折叠，并注册 `/auto [off]`。Session 投影帧在请求运行期间更新浏览器，因此菜单不会推断路由，也不会轮询模型目录。

模型选择客户端经现有命令 Remote 调用 `/auto` 或 `/auto off`。无论通过 composer 还是 `/model` 选择手工模型或推理强度，客户端都会先停用 Auto，再提交普通 `session.selectModel` 请求。投影缺席时，标准模型菜单的行为保持不变；已寻址 subagent 会话仍不可用。当建议性模型目录缺少 Auto 的有效路由时，触发器仍显示投影中的确切模型与推理强度 id，而不会隐藏请求事实。

该集成仅是维护者专用、固定 fork 的 Phase 0P 载体。它不会把 Auto 策略加入 DSH Core，不进入默认组合，不宣称官方兼容，也不会准入任何外部 seed 路由。

## 验证

组件测试固定菜单顺序、勾选状态、投影提供方／模型／推理强度、目录缺项时的显示、实时投影替换、路由解释，以及先停用 Auto 再执行手工选择的顺序。浏览器插件测试固定 `/auto` 与 `/auto off` 的命令传递、`/model` 互斥和错误映射。仓库内的无密钥完整 Web snapshot 固定 Auto 为首个已勾选行、目录缺少的投影路由、其 `strong` 原因和未准入标签。挂载外部插件的真实 Web 组合验证：运行简单任务时，可见选择会在完成前从 Flash/High 变为 Auto/Flash/Off，并显示其 `fast` 原因；手工选择 Pro 后恢复普通触发器。

## 考虑过的替代方案

**把 Auto 保留为全局启动选项。** 否决，因为它既不给用户提供会话级控制，也不提供请求确已变化的可见证据。

**在浏览器中维护推断的 Auto 状态。** 否决，因为客户端本地策略或乐观状态可能与 Host 决定分离。Session 投影是唯一展示的 Auto 事实。

**在模型菜单外增加单独的 Auto 控件。** 本原型否决该方案，因为提供方、模型和推理强度已有一个由 composer 持有的选择入口。拆分控件会隐藏它们的互斥关系，并重复状态展示。

## 后果

用户可以在原有模型选择位置选择 Auto，并在任务运行时看到有效路由和解释。交互上，手工选择具有明确优先级；外部能力缺席时，标准菜单保持不变。该 fork 在 `ui-model-selection` 中接受了 Auto 专用的可选类型与命令桥；要让此集成离开固定版本实验，生产插件生态仍需上游提供方无关的贡献约定。
