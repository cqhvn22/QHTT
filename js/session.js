// Lưu đề và các tab; không lưu HTML hay tự chạy lại bộ giải.
'use strict';
window.WorkspaceSession = (() => {
  const KEY = 'simplex.workspace.v1';
  const isText = (value) => typeof value === 'string';
  const textArray = (value, size) =>
    Array.isArray(value) && value.length === size && value.every(isText);
  const validId = (value) =>
    Number.isSafeInteger(value) && value > 0 && value < Number.MAX_SAFE_INTEGER - 1;
  function draft(tab) {
    const p = tab?.raw;
    if (
      !validId(tab?.id) ||
      !p ||
      !isText(p.title) ||
      !['max', 'min'].includes(p.sense) ||
      !isText(p.constant) ||
      !Array.isArray(p.c) ||
      p.c.length < 1 ||
      p.c.length > 20 ||
      !textArray(p.c, p.c.length) ||
      !textArray(p.domains, p.c.length) ||
      !p.domains.every((v) => ['pos', 'neg', 'free'].includes(v)) ||
      !Array.isArray(p.a) ||
      p.a.length > 40 ||
      !p.a.every((row) => textArray(row, p.c.length)) ||
      !textArray(p.b, p.a.length) ||
      !textArray(p.rel, p.a.length) ||
      !p.rel.every((v) => ['<=', '=', '>='].includes(v)) ||
      !['bigm', 'two', 'geometry'].includes(tab.method)
    )
      throw new Error('Dữ liệu phiên đã lưu không hợp lệ.');
    return {
      id: tab.id,
      raw: {
        title: p.title,
        sense: p.sense,
        constant: p.constant,
        c: p.c,
        domains: p.domains,
        a: p.a,
        b: p.b,
        rel: p.rel,
      },
      method: tab.method,
      dimensions: textArray(tab.dimensions, 2)
        ? tab.dimensions
        : [String(p.c.length), String(p.a.length)],
      scroll:
        Array.isArray(tab.scroll) &&
        tab.scroll.length === 2 &&
        tab.scroll.every((v) => Number.isFinite(v) && v >= 0)
          ? tab.scroll
          : [0, 0],
      lastExampleIndex: Number.isInteger(tab.lastExampleIndex) ? tab.lastExampleIndex : -1,
    };
  }
  function decode(data) {
    if (
      data?.version !== 1 ||
      data.enabled !== true ||
      !Array.isArray(data.tabs) ||
      !data.tabs.length ||
      !Array.isArray(data.closedTabs) ||
      data.closedTabs.length > 10
    )
      throw new Error('Không đọc được phiên làm việc đã lưu.');
    const tabs = data.tabs.map(draft),
      closedTabs = data.closedTabs.map(draft);
    const ids = [...tabs, ...closedTabs].map((tab) => tab.id);
    if (new Set(ids).size !== ids.length || !tabs.some((tab) => tab.id === data.activeTabId))
      throw new Error('Danh sách tab đã lưu không hợp lệ.');
    return { tabs, closedTabs, activeTabId: data.activeTabId, nextTabId: Math.max(...ids) + 1 };
  }
  function load(storage = localStorage) {
    const value = storage.getItem(KEY);
    return value === null ? null : decode(JSON.parse(value));
  }
  function save(tabs, closedTabs, activeTabId, storage = localStorage) {
    const data = {
      version: 1,
      enabled: true,
      tabs: tabs.map(draft),
      closedTabs: closedTabs.map(draft),
      activeTabId,
    };
    storage.setItem(KEY, JSON.stringify(data));
  }
  function clear(storage = localStorage) {
    storage.removeItem(KEY);
  }
  return { load, save, clear };
})();
