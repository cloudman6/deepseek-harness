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
  'trigger.autoAria': 'Auto，当前 {model}，推理等级 {effort}',
  'menu.aria': '模型与推理等级',
  'menu.auto': 'Auto',
  'menu.autoDescription': '根据任务自动选择模型和推理等级',
  'menu.autoEffective': '实际选择',
  'menu.autoSwitched': '已切换模型与推理等级',
  'menu.autoEvidence': '实验模式 · 未经质量准入',
  'chat.autoRouteChanged': 'Auto 已切换模型和推理等级',
  'chat.autoRouteModel': '模型：{previous} → {current}',
  'chat.autoRouteEffort': '推理等级：{previous} → {current}',
  'chat.autoRouteReason': '依据：{tier} · {code}',
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
  'trigger.autoAria': 'Auto, current {model}, reasoning effort {effort}',
  'menu.aria': 'Model and reasoning effort',
  'menu.auto': 'Auto',
  'menu.autoDescription': 'Select model and reasoning effort for each task',
  'menu.autoEffective': 'Effective selection',
  'menu.autoSwitched': 'Model and reasoning effort switched',
  'menu.autoEvidence': 'Experimental · unadmitted',
  'chat.autoRouteChanged': 'Auto switched model and reasoning effort',
  'chat.autoRouteModel': 'Model: {previous} → {current}',
  'chat.autoRouteEffort': 'Reasoning effort: {previous} → {current}',
  'chat.autoRouteReason': 'Basis: {tier} · {code}',
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
