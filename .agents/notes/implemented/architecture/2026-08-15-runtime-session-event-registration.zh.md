# Agent Note: Runtime Session event registration

Status: implemented

[English](2026-08-15-runtime-session-event-registration.md) | 中文

## 问题

`SessionEventMap` 可通过 declaration merge 扩展，因此仓库外插件能够通过编译并追加自有事件类型。持久读取方只识别仓库内生成的事件集合。因此，必需插件事件会被 live TypeScript 程序接受，却在重启后因未知类型而被拒绝；若将其标为 ignorable，缺少插件时又会重建不完整的规范状态。运行时没有 registration identity、payload validator、schema-version 检查、namespace 冲突检测或精确 missing-plugin 诊断。

## 决策

为 `SessionStore` 增加 effect-scoped Session event namespace registry。插件注册一个全局唯一 namespace、owner id、正整数 schema version，以及 event type 到结构化 payload schema 的完整映射；该 schema 暴露 `parse(unknown): unknown`。Registration 会拒绝畸形名称、重复 namespace、不属于该 namespace 的 event type，以及与生成内置 event type 的冲突。

Attached Session 在修改日志前根据 live registration 校验每个必需仓库外 append，并为 event envelope 增加不可变 namespace/version metadata。系统持久化原始 lossless JSON snapshot；parser 输出会被忽略，因此校验无法转换持久状态。冷读取只有在 namespace 以精确持久版本注册、event type 存在于该 registration 且 payload 通过校验时才接受事件。缺少 registration、版本不兼容、registration metadata 畸形、已注册 namespace 中的未知类型和 schema 拒绝，都会在 Session 重建前产生 unsupported-format failure。明确标为 ignorable 的未知事件保留现有 skip 契约。

Registration 必须在冷 `load` 或 `prepare` 前完成。失败的冷读取不会永久缓存 failure：owner 插件注册后可以重试加载。释放注册 fiber 会移除 namespace，因此后续冷读取会 fail closed，而不会继续使用已卸载插件留下的 stale validator。

## 考虑过的替代方案

**把插件事件生成到仓库 catalog。** 否决，因为仓库外插件无法修改已安装 Harness build，要求重建 Core 会使运行时插件安装失去意义。

**把每个 namespaced event 都视为受支持。** 否决，因为 prefix 既不能证明 owner 插件已安装，也不能证明当前代码能够解释持久 payload。

**把插件事件标为 ignorable。** 对规范状态而言否决：缺少 decision、constraint 或 recovery 事件会改变重建结果，跳过它们会静默破坏语义。

**不持久化 schema version，只依赖 validation。** 否决，因为 validation error 无法区分数据损坏与插件版本不匹配，兼容代码也无法声明自己实现哪个持久 schema。

## 测试

- Live append 在日志变化前拒绝未注册、冲突或 schema-invalid 的必需插件事件，并为有效事件记录 namespace/version metadata。
- 两个第一方 persistence backend 都能重新加载有效 registered event，并在缺少 registration、版本不符、已注册 namespace 中的未知类型、metadata 畸形或 payload 无效时于重建前 fail。
- 插件注册前发起的 load 以包含 namespace 与版本的诊断失败；注册后重试可以成功。
- Registration disposal 会移除支持，重复 namespace 注册会确定性失败。
- 生成内置事件和明确标为 ignorable 的未知事件保持既有行为。

## 影响

Owner 插件缺失时，必需插件日志会有意不可用；对规范状态而言这是安全方向，但插件移除由此成为显式数据兼容操作。精确 schema version 会拒绝本可语义兼容的 reader，因此插件应当在 backward-compatible validator 下保持版本稳定，只在持久 schema 不兼容时递增。Envelope 增加可选 metadata；未发布旧 build 可能拒绝这些日志，这符合仓库 pre-release 不提供兼容承诺的立场。
