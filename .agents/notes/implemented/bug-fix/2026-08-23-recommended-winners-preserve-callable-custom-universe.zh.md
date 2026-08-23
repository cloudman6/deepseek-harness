# Agent Note: Recommended 首选保留 Custom 可调用全集

Status: implemented

[English](2026-08-23-recommended-winners-preserve-callable-custom-universe.md) | 中文

## 问题

把每条可调用且精确绑定的路线都视为 Recommended，会使默认路线集合与完整 Custom 选择全集无法区分。页面虽然可以标记每个档位的一个首选，但 Auto 默认仍会准入所有排序较后的路线；如果 Host 投影要求 Custom 准入项必须属于 Recommended 子集，用户也无法添加另一条可调用且精确绑定的路线。

## 决策

`route-admission-projection/v2` 发布三个相互独立的动态 key 集合：当前所有可调用、策略合格且精确绑定的路线；每个非空档位中按价格、延迟和稳定身份排序得到的 Recommended 首选；当前模式实际准入的集合。任何集合都没有固定条目数。

Recommended 准入每档首选。进入 Custom 时复制这些首选，之后用户可以增减当前可调用集合中的任何 key。Host 会分别验证 Recommended 和 admitted key 都是可调用集合的子集，不再要求 admitted key 必须属于 Recommended。已存储但不可用的用户意图仍会显示，并且不能参与路由。

外部插件拥有首选计算和集合标识。Host 桥接服务负责持久化用户意图并校验有界投影，不会引入 AA 排序或处理档位策略。

## 曾考虑的替代方案

- **在 Recommended 中保留所有可调用路线，只展示首选标记** —— 否决，因为该标记无法描述 Auto 默认实际准入的集合。
- **发布固定 Recommended 路线清单或固定数量** —— 否决，因为 Host 可用性、binding、策略合格性和非空档位会随环境及 Evidence Pack 变化。
- **只允许 Custom 选择 Recommended 路线** —— 否决，因为这会取消用户在不编辑证据或 Host 配置的前提下启用另一条精确可调用 binding 的能力。

## 后果

默认集合在每个非空档位中最多包含一条路线，而 Custom 选择全集会继续跟踪当前所有可调用且精确绑定的路线。模型、effort、provider、binding 和 Host 变化都可以在不改变 schema 的前提下改变两个数量。浏览器可以分别显示已启用、可调用、binding 和排除项数量；命名 `route-admission-policy/v1` 的历史 Session 事件仍可读取。

## 验证

Host 测试证明进入 Custom 时只复制 Recommended，随后可以启用第二条不在 Recommended 中的可调用 key。客户端测试会把不在 Recommended 中的可调用路线渲染成未勾选的 Custom 控件。外部插件测试证明 Recommended 只准入首选、Custom 可准入任意可调用路线、集合标识动态生成，并保留旧策略版本回放。
