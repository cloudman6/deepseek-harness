/** Simplified Chinese copy for the Auto route-admission Settings section. */
export const zh = {
  nav: 'Auto 模式', title: 'Auto 路由', intro: '依据 AA 能力分档，在满足任务等级的候选中优先选择价格更低、其次延迟更低的路线。',
  evidenceNotice: '这是启发式路由依据，不是项目 Benchmark，也不保证某项任务的质量。设置从下一轮模型调用开始生效。',
  recommended: 'Recommended', recommendedHelp: '每个非空能力档位默认启用价格、延迟和稳定 ID 排序后的档内首选路线。',
  custom: 'Custom', customHelp: '从 Recommended 集合开始，可在当前所有可调用且精确绑定的路线中任意增减；不会修改证据 binding。',
  loading: '正在读取 Auto 路由…', unavailable: 'Auto Mode 插件尚未提供路由目录。', error: '无法读取 Auto 路由。', retry: '重试',
  readOnly: 'Settings 当前只读。', saving: '正在保存…', saved: '已保存，将从下一轮模型调用生效。', saveError: '保存失败，已重新读取当前配置。',
  recommendedChanged: 'Recommended 集合已变化', added: '新增', removed: '移除',
  coverage: '当前候选', admittedRoutes: '条已启用路线', callableRoutes: '条可调用路线', bindings: '条 binding', exclusions: '条排除记录',
  light: 'Light', standard: 'Standard', deep: 'Deep', unassigned: '未分档与不可用', emptyLevel: '该档当前没有可用路线；运行时会按既定规则向更高档升级或明确失败。',
  winner: '档内首选', recommendedTag: 'Recommended', enabled: '已启用', disabled: '未启用', unavailableTag: '当前不可用', excluded: '已排除',
  capability: 'AA 能力', price: '归一化价格', latency: '延迟', unavailableValue: '无数据',
  evidence: '证据', host: 'Host', admission: '用户候选', exactKey: 'Evidence Route Key', record: 'AA record', reason: '原因',
  versions: '依据与版本', pack: 'Evidence Pack', snapshot: 'AA Snapshot', policy: 'Route Policy', admissionPolicy: 'Admission Policy', bindingRegistry: 'Binding Registry',
  capabilityBasis: '能力字段', priceBasis: '价格字段', latencyBasis: '延迟字段', bands: '能力分界',
  exclusionsTitle: '排除详情', noExclusions: '没有排除记录。', showDetails: '显示技术详情', hideDetails: '隐藏技术详情',
  unresolvedCustom: '以下 Custom 选择已保留，但当前 Evidence Pack 中没有对应 binding，因此不会参与路由：',
} as const

/** English copy for the Auto route-admission Settings section. */
export const en: Record<keyof typeof zh, string> = {
  nav: 'Auto Mode', title: 'Auto routing', intro: 'Uses AA capability bands, then prefers lower price and lower latency among routes that satisfy the required task level.',
  evidenceNotice: 'This is heuristic routing evidence, not a project Benchmark or a task-quality guarantee. Changes apply from the next model call.',
  recommended: 'Recommended', recommendedHelp: 'Enable the first route in each non-empty capability level after price, latency, and stable-ID ordering.',
  custom: 'Custom', customHelp: 'Start from Recommended, then add or remove any current callable exact-bound route; evidence bindings are unchanged.',
  loading: 'Loading Auto routes…', unavailable: 'The Auto Mode plugin has not supplied a route catalog.', error: 'Could not load Auto routes.', retry: 'Retry',
  readOnly: 'Settings is read-only.', saving: 'Saving…', saved: 'Saved. The change applies from the next model call.', saveError: 'Save failed; the current configuration was reloaded.',
  recommendedChanged: 'Recommended set changed', added: 'Added', removed: 'Removed',
  coverage: 'Current candidates', admittedRoutes: 'enabled routes', callableRoutes: 'callable routes', bindings: 'bindings', exclusions: 'exclusions',
  light: 'Light', standard: 'Standard', deep: 'Deep', unassigned: 'Unassigned and unavailable', emptyLevel: 'This level has no available route; runtime follows the existing upward-escalation or explicit-failure rule.',
  winner: 'Level winner', recommendedTag: 'Recommended', enabled: 'Enabled', disabled: 'Not enabled', unavailableTag: 'Unavailable', excluded: 'Excluded',
  capability: 'AA capability', price: 'Normalized price', latency: 'Latency', unavailableValue: 'No data',
  evidence: 'Evidence', host: 'Host', admission: 'User admission', exactKey: 'Evidence Route Key', record: 'AA record', reason: 'Reason',
  versions: 'Basis and versions', pack: 'Evidence Pack', snapshot: 'AA Snapshot', policy: 'Route Policy', admissionPolicy: 'Admission Policy', bindingRegistry: 'Binding Registry',
  capabilityBasis: 'Capability field', priceBasis: 'Price field', latencyBasis: 'Latency field', bands: 'Capability bands',
  exclusionsTitle: 'Exclusion details', noExclusions: 'No exclusions.', showDetails: 'Show technical details', hideDetails: 'Hide technical details',
  unresolvedCustom: 'These Custom selections are preserved, but have no binding in the current Evidence Pack and cannot route:',
}

/** Stable message-key vocabulary shared by the component and locale registry. */
export type AutoModeLocaleKey = keyof typeof zh
