/**
 * `model` namespace dictionaries.
 *
 * `trigger.selectAria` reads identically to `trigger.fallback` today and is
 * still a separate key: the visible fallback label and the accessible name of
 * an unset trigger are free to diverge per locale, and folding it into
 * `trigger.aria` would announce the degenerate "Select model, current Select
 * model".
 */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'command.description': '选择本会话使用的模型',
  'option.loadError': '目录加载失败：{message}',
  'trigger.fallback': '选择模型',
  'trigger.selectAria': '选择模型',
  'trigger.aria': '选择模型，当前 {model}',
  'trigger.ariaEffort': '选择模型，当前 {model}，推理等级 {effort}',
  'trigger.autoAriaModel': 'Auto，当前 {model}',
  'trigger.autoAria': 'Auto，当前 {model}，推理等级 {effort}',
  'menu.aria': '模型与推理等级',
  'menu.auto': 'Auto',
  'menu.autoDescription': '根据任务处理级别自动选择可用路由',
  'menu.autoEffective': '实际选择',
  'menu.autoSwitched': '已更新 Auto 路由',
  'menu.autoHandlingLevel': '任务处理级别：',
  'menu.autoBasis': '依据：{basis} · {code}',
  'menu.autoEvidence': 'AA 启发式路由 · 未经项目 Benchmark 验证',
  'level.light': '轻量',
  'level.standard': '常规',
  'level.deep': '深度',
  'basis.aaMatched': 'AA 数据',
  'basis.configuredDeepFallback': '配置的深度 fallback',
  'chat.autoRouteChanged': 'Auto 已更新路由',
  'chat.autoRouteModelStable': '模型：{current}',
  'chat.autoRouteModelChanged': '模型：{previous} → ',
  'chat.autoRouteEffortStable': '推理等级：{current}',
  'chat.autoRouteEffortChanged': '推理等级：{previous} → ',
  'chat.autoRouteLevelStable': '任务处理级别：{current}',
  'chat.autoRouteLevelChanged': '任务处理级别：{previous} → ',
  'chat.autoRouteReason': '依据：{basis} · {code}',
  'menu.model': '模型',
  'menu.effort': '推理等级',
  'effort.providerDefault': 'Default',
  'status.loading': '正在刷新模型列表…',
  'error.action': '模型操作失败：{message}',
  'error.auto': 'Auto 操作失败：{message}',
  'action.reload': '重新加载',
  'warning.groupLoad': '{name} 加载失败：{message}',
  'empty.models': '没有可用的模型。',
  'blocked.composer': '当前模型不可用，请先选择模型',
  'empty.efforts': '当前模型未提供推理等级。',
} satisfies Record<string, string>

/** The model namespace key union. */
export type ModelKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'command.description': 'Select the model for this conversation',
  'option.loadError': 'Catalog failed to load: {message}',
  'trigger.fallback': 'Select model',
  'trigger.selectAria': 'Select model',
  'trigger.aria': 'Select model, current {model}',
  'trigger.ariaEffort': 'Select model, current {model}, reasoning effort {effort}',
  'trigger.autoAriaModel': 'Auto, current {model}',
  'trigger.autoAria': 'Auto, current {model}, reasoning effort {effort}',
  'menu.aria': 'Model and reasoning effort',
  'menu.auto': 'Auto',
  'menu.autoDescription': 'Select an available route for the required task-handling level',
  'menu.autoEffective': 'Effective selection',
  'menu.autoSwitched': 'Auto route updated',
  'menu.autoHandlingLevel': 'Task-handling level: ',
  'menu.autoBasis': 'Basis: {basis} · {code}',
  'menu.autoEvidence': 'AA-informed heuristic · not project-Benchmark validated',
  'level.light': 'Light',
  'level.standard': 'Standard',
  'level.deep': 'Deep',
  'basis.aaMatched': 'AA data',
  'basis.configuredDeepFallback': 'configured Deep fallback',
  'chat.autoRouteChanged': 'Auto route updated',
  'chat.autoRouteModelStable': 'Model: {current}',
  'chat.autoRouteModelChanged': 'Model: {previous} → ',
  'chat.autoRouteEffortStable': 'Reasoning effort: {current}',
  'chat.autoRouteEffortChanged': 'Reasoning effort: {previous} → ',
  'chat.autoRouteLevelStable': 'Task-handling level: {current}',
  'chat.autoRouteLevelChanged': 'Task-handling level: {previous} → ',
  'chat.autoRouteReason': 'Basis: {basis} · {code}',
  'menu.model': 'Model',
  'menu.effort': 'Effort',
  'effort.providerDefault': 'Default',
  'status.loading': 'Refreshing model list…',
  'error.action': 'Model operation failed: {message}',
  'error.auto': 'Auto operation failed: {message}',
  'action.reload': 'Reload',
  'warning.groupLoad': '{name} failed to load: {message}',
  'empty.models': 'No models available.',
  'blocked.composer': 'This model is unavailable — select one to continue',
  'empty.efforts': 'This model provides no reasoning effort levels.',
} satisfies Record<ModelKey, string>
