# Agent Note: Pre-assembly step preparation

Status: implemented

[English](2026-08-15-pre-assembly-step-preparation.md) | 中文

## 问题

Agent loop 会在 step 前领取排队消息，但 `system-prompt/assemble` 当前早于第一个能够接收这些消息的 Agent waterfall。插件可以在 `agent/request` 替换 provider 与 model，但此时依赖 provider 的 prompt section 和 tool 已完成组装。只有其他 owner 在组装前选好模型时，`installModelSelection()` 才能保证 assembly 与 request 一致；它无法根据刚领取的输入派生选择。因此，policy 插件不能同时检查当前消息并保证 prompt assembly 与模型调用使用同一个选择。

## 决策

在 inbox claim 后、`system-prompt/assemble` 前立即增加 agent-scoped `agent/prepare-step` waterfall。Payload 携带原样冻结的已领取消息、稳定 turn/step 编号和 live cancellation signal。Decision 为 `enter` 或 `reject`；拒绝会关闭已领取消息所属 turn，不执行 prompt assembly、不打开 step boundary，也不调用模型。该 waterfall 不重写消息。现有 `agent/pre-step` 继续位于 assembly 之后，并保留 context projection 和消息重写语义。

Model-selection owner 可以在 preparation 期间更新现有 selection state。随后，`installModelSelection()` 在 prompt assembly 期间捕获该状态，并在 `agent/request` 复用；preparation hook 不引入另一套 model-selection API 或 policy vocabulary。

## 考虑过的替代方案

**把 `agent/pre-step` 移到 assembly 前。** 否决，因为现有 listener 会接收从 assembled prompt 投影出的 runtime context，并可重写完整 entered message list。移动该事件会改变既有输入和时序契约。

**让 `agent/request` 拥有语义选择。** 否决，因为 request waterfall 在依赖 provider 的 prompt 和 tool assembly 之后运行，改变模型会让模型收到为其他模型组装的 prompt。

**把 pending message 传给 `system-prompt/assemble`。** 否决，因为 prompt contributor 应当组装 prompt material，而不应拥有 step admission 或 lifecycle 决策。这还会让每个 prompt listener 直接接触用户输入，而实际上只有 policy owner 需要该信息。

## 测试

- Contract test 证明 preparation 在任何 assembly listener 前观察当前冻结的已领取消息，并携带稳定 turn/step 坐标和 Agent scope。
- Preparation rejection 不产生 prompt assembly、`step/start` 或模型调用。
- Preparation 期间取消会阻止后续 assembly 与 request 工作。
- Preparation 期间选择的模型在依赖 provider 的 assembly 与 `agent/request` 中完全一致。
- 现有 `agent/pre-step` 测试继续通过，其 payload 及相对 assembly 的顺序不变。

## 影响

安装 listener 后，新的 awaited waterfall 会为每个 proposed step 增加 policy latency。执行无界远程工作的 listener 可能在 assembly 前延迟 turn，因此 cancellation signal 和插件自有的 latency policy 仍是公共契约的一部分。Claim 继续发生在 preparation 前；reject 会有意消费已领取 batch 并记录 blocked turn，不会恢复 inbox。
