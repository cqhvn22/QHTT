'use strict';
(() => {
  const $ = (s) => document.querySelector(s),
    $$ = (s) => Array.from(document.querySelectorAll(s));
  const { esc, num, vector } = Report;
  let n = 2,
    m = 2,
    result = null,
    worker = null,
    working = false,
    dirty = false,
    job = 0;
  let toastTimer,
    activeMethod = 'bigm',
    activeConstant = '0';
  let lastExampleIndex = -1,
    disposeGraph = null;
  const tabs = [],
    closedTabs = [];
  let activeTabId = null,
    nextTabId = 1;
  let autosave = false,
    sessionReady = false,
    saveTimer;

  // Dựng các bảng nhập hệ số và điều kiện dấu
  function inputs(raw) {
    n = raw.c.length;
    m = raw.a.length;
    $('#n').value = n;
    $('#m').value = m;
    $('#constraint-count').textContent = m + ' dòng';
    const wide = n > 3 ? `style="min-width:${(n + 1) * 65}px"` : '';
    $('#objective-input').innerHTML = /* HTML */ `<table class="input-table" ${wide}>
      <thead>
        <tr>
          <th aria-label="Loại hệ số"></th>
          ${raw.c.map((v, j) => /* HTML */ `<th scope="col">x<sub>${j + 1}</sub></th>`).join('')}
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">cⱼ</th>
          ${raw.c
            .map(
              (v, j) =>
                /* HTML */ `<td>
                  <input
                    type="text"
                    inputmode="text"
                    data-table="objective"
                    data-row="0"
                    data-col="${j}"
                    data-c="${j}"
                    value="${esc(v)}"
                    aria-label="Hệ số mục tiêu x${j + 1}"
                    autocomplete="off"
                    spellcheck="false"
                  />
                </td>`
            )
            .join('')}
        </tr>
        <tr class="domain-row">
          <th scope="row">miền</th>
          ${raw.domains
            .map(
              (v, j) =>
                /* HTML */ `<td>
                  <select
                    data-table="objective"
                    data-row="1"
                    data-col="${j}"
                    data-domain="${j}"
                    aria-label="Miền biến x${j + 1}"
                  >
                    ${[
                      ['pos', '≥ 0'],
                      ['neg', '≤ 0'],
                      ['free', 'Tự do'],
                    ]
                      .map(
                        ([val, label]) =>
                          /* HTML */ `<option value="${val}" ${v === val ? 'selected' : ''}>
                            ${label}
                          </option>`
                      )
                      .join('')}
                  </select>
                </td>`
            )
            .join('')}
        </tr>
      </tbody>
    </table>`;
    $('#constraint-input').innerHTML = m
      ? /* HTML */ `<table
          class="input-table"
          ${n > 2 ? `style="min-width:${(n + 2) * 58 + 35}px"` : ''}
        >
          <thead>
            <tr>
              <th scope="col">#</th>
              ${raw.c
                .map((v, j) => /* HTML */ `<th scope="col">x<sub>${j + 1}</sub></th>`)
                .join('')}
              <th class="relation" scope="col">Dấu</th>
              <th scope="col">bᵢ</th>
            </tr>
          </thead>
          <tbody>
            ${raw.a
              .map(
                (row, i) =>
                  /* HTML */ `<tr>
                    <th scope="row">${i + 1}</th>
                    ${row
                      .map(
                        (v, j) =>
                          /* HTML */ `<td>
                            <input
                              type="text"
                              data-table="constraint"
                              data-row="${i}"
                              data-col="${j}"
                              data-a="${i},${j}"
                              value="${esc(v)}"
                              aria-label="Ràng buộc ${i + 1}, hệ số x${j + 1}"
                              autocomplete="off"
                              spellcheck="false"
                            />
                          </td>`
                      )
                      .join('')}
                    <td>
                      <select
                        data-table="constraint"
                        data-row="${i}"
                        data-col="${n}"
                        data-rel="${i}"
                        aria-label="Quan hệ ràng buộc ${i + 1}"
                      >
                        ${['<=', '=', '>=']
                          .map(
                            (s) =>
                              /* HTML */ `<option
                                value="${esc(s)}"
                                ${s === raw.rel[i] ? 'selected' : ''}
                              >
                                ${Report.rel(s)}
                              </option>`
                          )
                          .join('')}
                      </select>
                    </td>
                    <td class="rhs-input">
                      <input
                        type="text"
                        data-table="constraint"
                        data-row="${i}"
                        data-col="${n + 1}"
                        data-b="${i}"
                        value="${esc(raw.b[i])}"
                        aria-label="Vế phải ràng buộc ${i + 1}"
                        autocomplete="off"
                        spellcheck="false"
                      />
                    </td>
                  </tr>`
              )
              .join('')}
          </tbody>
        </table>`
      : '<div class="field-hint" style="padding:14px;margin:0">Chưa có ràng buộc.</div>';
    $('#add-row').disabled = m >= 40;
    $('#remove-row').disabled = m === 0;
  }
  // Thu thập, nạp và kiểm tra đề bài
  function collect() {
    return {
      title: $('#problem-title').value,
      sense: $('[name=sense]:checked').value,
      constant: activeConstant,
      c: $$('[data-c]').map((e) => e.value),
      domains: $$('[data-domain]').map((e) => e.value),
      a: Array.from({ length: m }, (_, i) =>
        Array.from({ length: n }, (_, j) => $(`[data-a="${i},${j}"]`).value)
      ),
      b: $$('[data-b]').map((e) => e.value),
      rel: $$('[data-rel]').map((e) => e.value),
    };
  }
  function load(raw, method) {
    $('#problem-title').value = raw.title;
    $(`[name=sense][value=${raw.sense}]`).checked = true;
    activeConstant = raw.constant ?? '0';
    if (method) activeMethod = method;
    $('#solve-method').value = activeMethod;
    inputs(raw);
    clearError();
    markDirty();
  }
  function resize() {
    const nn = Number($('#n').value),
      mm = Number($('#m').value);
    if (!Number.isInteger(nn) || nn < 1 || nn > 20 || !Number.isInteger(mm) || mm < 0 || mm > 40)
      throw new Error('Chọn 1–20 biến và 0–40 ràng buộc.');
    if (nn === n && mm === m) return;
    const p = collect();
    p.c = Array.from({ length: nn }, (_, j) => p.c[j] ?? '0');
    p.domains = Array.from({ length: nn }, (_, j) => p.domains[j] ?? 'pos');
    p.a = Array.from({ length: mm }, (_, i) =>
      Array.from({ length: nn }, (_, j) => p.a[i]?.[j] ?? '0')
    );
    p.b = Array.from({ length: mm }, (_, i) => p.b[i] ?? '0');
    p.rel = Array.from({ length: mm }, (_, i) => p.rel[i] ?? '<=');
    inputs(p);
    markDirty();
  }
  function clearError() {
    $('#input-error').hidden = true;
    $$('[aria-invalid]').forEach((e) => e.removeAttribute('aria-invalid'));
  }
  function error(e) {
    $('#input-error').textContent = e.message || String(e);
    $('#input-error').hidden = false;
    $('#input-error').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function read() {
    resize();
    clearError();
    for (const el of [...$$('[data-c]'), ...$$('[data-a]'), ...$$('[data-b]')]) {
      try {
        LP.Q.parse(el.value);
      } catch (e) {
        el.setAttribute('aria-invalid', 'true');
        el.focus();
        throw new Error((el.getAttribute('aria-label') || 'Hệ số') + ': ' + e.message);
      }
    }
    const raw = collect();
    LP.parseProblem(raw);
    return raw;
  }
  function toast(text) {
    clearTimeout(toastTimer);
    $('#toast').textContent = text;
    $('#toast').hidden = false;
    toastTimer = setTimeout(() => ($('#toast').hidden = true), 4000);
  }
  function markDirty() {
    dirty = true;
    $('#stale-banner').hidden = !result;
    $('#print-btn').disabled = true;
    updateTabLabel();
    scheduleSave();
  }
  function setBusy(v) {
    working = v;
    $('#busy-banner').hidden = !v;
    $('#cancel-btn').hidden = !v;
    $('#solve-btn').hidden = v;
    $$('#problem-form input,#problem-form select,#problem-form button').forEach((e) => {
      if (e.id !== 'cancel-btn') e.disabled = v;
    });
    $('#new-btn').disabled = v;
    $('#open-btn').disabled = v;
    $('#save-btn').disabled = v;
    renderTabs();
    $('#print-btn').disabled = v || !result || dirty;
    if (!v) {
      $('#add-row').disabled = m >= 40;
      $('#remove-row').disabled = m === 0;
    }
  }
  // Chạy bộ giải trong Web Worker
  function startSolve() {
    if (working) return;
    let raw;
    try {
      raw = read();
      if (activeMethod === 'geometry' && raw.c.length !== 2)
        throw new Error('Phương pháp hình học yêu cầu đúng 2 biến.');
    } catch (e) {
      error(e);
      return;
    }
    const method = activeMethod,
      id = ++job;
    setBusy(true);
    const complete = (r) => {
      if (job !== id) return;
      worker?.terminate();
      worker = null;
      setBusy(false);
      showResult(r);
    };
    const fail = (e) => {
      if (job !== id) return;
      worker?.terminate();
      worker = null;
      setBusy(false);
      if (method === 'geometry') {
        clearResult();
        dirty = true;
      }
      error(e);
    };
    // A self-contained Blob worker works when index.html is opened directly from disk.
    try {
      const source = `(${installLP.toString()})(self);(${installGeometry.toString()})(self);self.onmessage=function(e){try{const r=e.data.method==='geometry'?Geometry.solveBounded(e.data.problem):new LP.Solver().solve(e.data.problem,e.data.method);self.postMessage({result:JSON.stringify(r)});}catch(err){self.postMessage({error:err.message});}};`;
      const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
      worker = new Worker(url);
      URL.revokeObjectURL(url);
      worker.onmessage = (e) =>
        e.data.error
          ? fail(new Error(e.data.error))
          : complete(JSON.parse(e.data.result, LP.revive));
      worker.onerror = (e) => {
        e.preventDefault();
        fail(
          new Error(
            'Trình duyệt không chạy được bộ tính toán nền. Hãy mở index.html bằng Chrome, Edge hoặc Firefox phiên bản có hỗ trợ Web Worker.'
          )
        );
      };
      worker.postMessage({ problem: raw, method });
    } catch (e) {
      fail(new Error('Không khởi tạo được Web Worker: ' + e.message));
    }
  }
  // Hiển thị kết quả và chuẩn bị tệp tải về
  function renderReport(r, interactive = true) {
    return r.method === 'geometry' ? GeometryView.report(r, interactive) : Report.all(r);
  }
  function showResult(r) {
    disposeGraph?.();
    disposeGraph = null;
    result = r;
    dirty = false;
    $('#stale-banner').hidden = true;
    $('#print-btn').disabled = false;
    $('#solution-subtitle').textContent = r.p.title;
    $('#solution-subtitle').hidden = false;
    const ok = r.status === 'optimal';
    $('#result-summary').innerHTML = /* HTML */ `<div
        class="summary-card ${ok ? 'primary-card' : 'warning-card'}"
      >
        <div class="summary-label">${ok ? 'GIÁ TRỊ TỐI ƯU' : 'TRẠNG THÁI BÀI TOÁN'}</div>
        <div class="summary-value">
          ${ok
            ? 'f* = ' + num(r.value)
            : { infeasible: 'Vô nghiệm', unbounded: 'Không bị chặn', limit: 'Chưa kết luận' }[
                r.status
              ]}
        </div>
        <div class="summary-foot">
          ${ok
            ? r.p.sense.toUpperCase() +
              ' · ' +
              (r.multiplicity === 'multiple'
                ? 'Nhiều nghiệm tối ưu'
                : r.multiplicity === 'unique'
                  ? 'Nghiệm duy nhất'
                  : 'Đã xác minh khả thi')
            : 'Xem kết luận bên dưới'}
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-label">${ok ? 'NGHIỆM TỐI ƯU' : 'PHƯƠNG ÁN KHẢ THI'}</div>
        <div class="summary-value math">${r.x ? vector(r.x) : '—'}</div>
        <div class="summary-foot">${r.p.n} biến của bài toán gốc</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">
          ${r.method === 'geometry' ? 'MIỀN NGHIỆM' : 'SỐ LẦN ĐỔI CƠ SỞ'}
        </div>
        <div class="summary-value">
          ${r.method === 'geometry'
            ? r.status === 'infeasible'
              ? 'Rỗng'
              : r.bounded
                ? 'Bị chặn'
                : 'Không bị chặn'
            : r.pivots +
              '<small style="font:11px var(--sans);color:#888;margin-left:7px">lần</small>'}
        </div>
        <div class="summary-foot">
          ${r.method === 'geometry' ? 'Phương pháp hình học' : Report.methodName(r)}
        </div>
      </div>`;
    $('#report').innerHTML = renderReport(r);
    if (r.method === 'geometry') disposeGraph = GeometryView.mount($('#report'), r);
    $('#report').classList.remove('is-empty');
    $('#result-summary').hidden = false;
  }
  function download(name, contents, type) {
    const blob = new Blob([contents], { type }),
      url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  // Sự kiện nhập liệu, mở/lưu bài, xuất và in
  $('#problem-form').addEventListener('submit', (e) => {
    e.preventDefault();
    startSolve();
  });
  $('#problem-form').addEventListener('input', (e) => {
    markDirty();
    if (e.target.hasAttribute('aria-invalid')) e.target.removeAttribute('aria-invalid');
  });
  $('#problem-form').addEventListener('change', (e) => {
    if (e.target.tagName === 'SELECT') markDirty();
  });
  $('#resize-btn').addEventListener('click', () => {
    try {
      resize();
      clearError();
    } catch (e) {
      error(e);
    }
  });
  $('#add-row').addEventListener('click', () => {
    $('#m').value = Math.min(40, m + 1);
    try {
      resize();
    } catch (e) {
      error(e);
    }
  });
  $('#remove-row').addEventListener('click', () => {
    $('#m').value = Math.max(0, m - 1);
    try {
      resize();
    } catch (e) {
      error(e);
    }
  });
  $('#solve-method').addEventListener('change', () => {
    activeMethod = $('#solve-method').value;
    lastExampleIndex = -1;
    markDirty();
  });
  $('#example').addEventListener('click', () => {
    if (working) return;
    const geometric = activeMethod === 'geometry';
    const sample = geometric
      ? randomGeometryExample(lastExampleIndex)
      : randomExample(lastExampleIndex);
    lastExampleIndex = sample.index;
    load(sample.problem, geometric ? 'geometry' : 'bigm');
    toast('Đã nạp bài mẫu.');
  });
  $('#cancel-btn').addEventListener('click', () => {
    job++;
    worker?.terminate();
    worker = null;
    setBusy(false);
    toast('Đã dừng tính toán.');
  });
  function exportJSON() {
    if (working) return;
    try {
      const raw = read();
      download(
        ((raw.title || 'BaiToanDonHinh')
          .replace(/[^\p{L}\p{N} _-]/gu, '')
          .slice(0, 80)
          .trim() || 'BaiToanDonHinh') + '.json',
        JSON.stringify({ format: 'DonHinhStudio-1', problem: raw, method: activeMethod }, null, 2),
        'application/json;charset=utf-8'
      );
      toast('Đã xuất JSON. Dùng Mở bài để nhập lại.');
    } catch (e) {
      error(e);
    }
  }
  $('#save-btn').addEventListener('click', exportJSON);
  $('#open-btn').addEventListener('click', () => $('#file-input').click());
  $('#file-input').addEventListener('change', async (e) => {
    try {
      const file = e.target.files[0];
      if (!file || working) return;
      if (file.size > 1000000) throw new Error('Tệp bài toán không được vượt quá 1 MB.');
      const data = JSON.parse(await file.text());
      if (data.format !== 'DonHinhStudio-1') throw new Error('Không đúng định dạng tệp bài toán.');
      const parsed = LP.parseProblem(data.problem);
      if (parsed.m > 40) throw new Error('Giao diện hỗ trợ tối đa 40 ràng buộc.');
      if (!['bigm', 'two', 'geometry'].includes(data.method))
        throw new Error('Phương pháp không hợp lệ.');
      if (working) throw new Error('Hãy đợi tính toán hoàn tất hoặc nhấn Dừng rồi mở lại tệp.');
      createTab(LP.rawProblem(parsed), data.method);
      toast('Đã mở bài toán.');
    } catch (err) {
      error(err);
    } finally {
      e.target.value = '';
    }
  });
  $('#print-btn').addEventListener('click', () => {
    if (!result || dirty) return;
    $('#print-output').innerHTML = renderReport(result, false);
    $$('#print-output details').forEach((e) => (e.open = true));
    window.print();
  });
  // Also prepare the report for the browser's Ctrl+P shortcut.
  window.addEventListener('beforeprint', () => {
    if (result && !dirty) {
      $('#print-output').innerHTML = renderReport(result, false);
      $$('#print-output details').forEach((e) => (e.open = true));
    } else
      $('#print-output').innerHTML =
        '<section class="solution-section"><h1>Cần giải bài toán trước khi in.</h1></section>';
  });
  $('#help-btn').addEventListener('click', () => $('#help-dialog').showModal());
  $('#close-help').addEventListener('click', () => $('#help-dialog').close());
  $('#help-dialog').addEventListener('click', (e) => {
    if (e.target === $('#help-dialog')) {
      const r = e.target.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
        e.target.close();
    }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      startSolve();
    }
  });
  // Dán vùng hệ số từ bảng tính
  $('#problem-form').addEventListener('paste', (e) => {
    const target = e.target,
      text = e.clipboardData?.getData('text/plain');
    if (!target.dataset.table || !text || !/[\t\n]/.test(text)) return;
    e.preventDefault();
    try {
      const rows = text.replace(/\r/g, '').replace(/\n+$/, '').split('\n'),
        r0 = Number(target.dataset.row),
        c0 = Number(target.dataset.col),
        changes = [];
      rows.forEach((row, i) =>
        row.split('\t').forEach((text, j) => {
          const el = $(
            `[data-table="${target.dataset.table}"][data-row="${r0 + i}"][data-col="${c0 + j}"]`
          );
          if (!el)
            throw new Error('Vùng dán vượt kích thước bảng. Hãy tăng số biến/ràng buộc trước.');
          let value = text.trim();
          if (el.hasAttribute('data-domain')) {
            value = {
              '>=0': 'pos',
              '≥0': 'pos',
              '<=0': 'neg',
              '≤0': 'neg',
              tựdo: 'free',
              free: 'free',
              pos: 'pos',
              neg: 'neg',
            }[value.toLowerCase().replace(/\s/g, '')];
            if (!value) throw new Error('Miền biến phải là >=0, <=0 hoặc free.');
          } else if (el.hasAttribute('data-rel')) {
            value = { '≤': '<=', '≥': '>=', '<=': '<=', '>=': '>=', '=': '=' }[value];
            if (!value) throw new Error('Dấu quan hệ phải là <=, = hoặc >=.');
          } else LP.Q.parse(value);
          changes.push([el, value]);
        })
      );
      changes.forEach(([el, value]) => (el.value = value));
      markDirty();
      clearError();
      toast('Đã dán ' + changes.length + ' ô.');
    } catch (err) {
      error(err);
    }
  });

  // Mỗi tab lưu cả dữ liệu đang nhập và kết quả gần nhất.
  function blankProblem() {
    return {
      title: '',
      sense: 'max',
      constant: '0',
      c: ['0', '0'],
      domains: ['pos', 'pos'],
      a: [
        ['0', '0'],
        ['0', '0'],
      ],
      b: ['0', '0'],
      rel: ['<=', '<='],
    };
  }
  function tabTitle(tab) {
    return tab.raw.title.trim() || `Bài toán ${tab.id}`;
  }
  function updateTabLabel() {
    const tab = tabs.find((item) => item.id === activeTabId);
    if (!tab) return;
    tab.raw.title = $('#problem-title').value;
    const button = $(`#tab-${tab.id}`);
    if (button) {
      button.textContent = tabTitle(tab);
      button.title = tabTitle(tab);
      $(`[data-close-tab="${tab.id}"]`).setAttribute('aria-label', 'Đóng ' + tabTitle(tab));
    }
  }
  function renderTabs() {
    $('#problem-tabs').innerHTML = tabs
      .map((tab) => {
        const active = tab.id === activeTabId;
        return `<div class="problem-tab${active ? ' active' : ''}" role="presentation">
        <button id="tab-${tab.id}" type="button" role="tab" class="tab-label"
          data-tab="${tab.id}" aria-selected="${active}" aria-controls="workspace-panel"
          tabindex="${active ? 0 : -1}" title="${esc(tabTitle(tab))}" ${working ? 'disabled' : ''}>${esc(tabTitle(tab))}</button>
        <button type="button" class="tab-close" data-close-tab="${tab.id}"
          aria-label="Đóng ${esc(tabTitle(tab))}" title="Đóng tab" ${working ? 'disabled' : ''}>×</button>
      </div>`;
      })
      .join('');
    $('#workspace-panel').setAttribute('aria-labelledby', 'tab-' + activeTabId);
    $('#add-tab').disabled = working;
    $('#reopen-tab').disabled = working || !closedTabs.length;
  }
  function captureTab() {
    const tab = tabs.find((item) => item.id === activeTabId);
    if (!tab) return;
    // Không dùng read(): chuyển tab vẫn giữ được ô trống hoặc phân số đang gõ dở.
    Object.assign(tab, {
      raw: collect(),
      method: activeMethod,
      result,
      dirty,
      lastExampleIndex,
      dimensions: [$('#n').value, $('#m').value],
      scroll: [$('.input-scroll').scrollTop, window.scrollY],
      error: $('#input-error').hidden ? '' : $('#input-error').textContent,
    });
  }
  function clearResult() {
    disposeGraph?.();
    disposeGraph = null;
    result = null;
    $('#result-summary').innerHTML = '';
    $('#result-summary').hidden = true;
    $('#solution-subtitle').textContent = '';
    $('#solution-subtitle').hidden = true;
    $('#report').classList.add('is-empty');
    $('#report').innerHTML =
      '<div class="empty-state"><h2>Chưa có lời giải</h2><p>Nhập dữ liệu hoặc tạo bài mẫu, sau đó nhấn <b>Giải</b>.</p></div>';
    $('#stale-banner').hidden = true;
    $('#print-btn').disabled = true;
  }
  function restoreTab(tab, focus = false) {
    activeTabId = tab.id;
    clearResult();
    load(tab.raw, tab.method);
    lastExampleIndex = tab.lastExampleIndex;
    if (tab.result) showResult(tab.result);
    dirty = tab.dirty;
    $('#stale-banner').hidden = !result || !dirty;
    $('#print-btn').disabled = !result || dirty;
    if (tab.dimensions) {
      $('#n').value = tab.dimensions[0];
      $('#m').value = tab.dimensions[1];
    }
    $('#input-error').textContent = tab.error || '';
    $('#input-error').hidden = !tab.error;
    $('#print-output').innerHTML = '';
    renderTabs();
    const button = $(`#tab-${tab.id}`);
    if (focus) button.focus({ preventScroll: true });
    // Chỉ cuộn thanh tab; không cuộn cả trang khi đưa tab đang chọn vào tầm nhìn.
    const list = $('#problem-tabs');
    const item = button.parentElement;
    if (item.offsetLeft < list.scrollLeft) list.scrollLeft = item.offsetLeft;
    else if (item.offsetLeft + item.offsetWidth > list.scrollLeft + list.clientWidth)
      list.scrollLeft = item.offsetLeft + item.offsetWidth - list.clientWidth;
    $('.input-scroll').scrollTop = tab.scroll?.[0] || 0;
    window.scrollTo(0, tab.scroll?.[1] || 0);
    scheduleSave();
  }
  function createTab(raw = blankProblem(), method = 'bigm') {
    if (working) return;
    captureTab();
    const tab = { id: nextTabId++, raw, method, result: null, dirty: false, lastExampleIndex: -1 };
    tabs.push(tab);
    restoreTab(tab);
  }
  function selectTab(id, focus = true) {
    if (working) return;
    const tab = tabs.find((item) => item.id === id);
    if (!tab) return;
    captureTab();
    restoreTab(tab, focus);
  }
  function closeTab(id) {
    if (working) return;
    const index = tabs.findIndex((tab) => tab.id === id);
    if (index < 0) return;
    captureTab();
    const [closed] = tabs.splice(index, 1);
    closedTabs.push(closed);
    if (closedTabs.length > 10) closedTabs.shift();
    if (!tabs.length) {
      activeTabId = null;
      createTab();
    } else if (id === activeTabId) restoreTab(tabs[Math.min(index, tabs.length - 1)], true);
    else {
      renderTabs();
      $(`#tab-${activeTabId}`).focus({ preventScroll: true });
    }
    scheduleSave();
    toast('Đã đóng tab. Nhấn ↶ để mở lại.');
  }
  $('#problem-tabs').addEventListener('click', (e) => {
    const close = e.target.closest('[data-close-tab]');
    const tab = e.target.closest('[data-tab]');
    if (close) closeTab(Number(close.dataset.closeTab));
    else if (tab) selectTab(Number(tab.dataset.tab));
  });
  $('#problem-tabs').addEventListener('keydown', (e) => {
    if (working || !e.target.matches('[data-tab]')) return;
    const index = tabs.findIndex((tab) => tab.id === activeTabId);
    let next;
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;
    e.preventDefault();
    selectTab(tabs[next].id);
  });
  $('#reopen-tab').addEventListener('click', () => {
    if (working || !closedTabs.length) return;
    captureTab();
    const tab = closedTabs.pop();
    tabs.push(tab);
    restoreTab(tab, true);
  });
  $('#new-btn').addEventListener('click', () => createTab());
  $('#add-tab').addEventListener('click', () => createTab());
  // Ghi sau một nhịp nhập; luôn ghi ngay trước khi trang chuyển sang nền hoặc đóng.
  function storageNotice(message = '') {
    $('#storage-notice').textContent = message;
    $('#storage-notice').hidden = !message;
  }
  function saveSession() {
    clearTimeout(saveTimer);
    if (!autosave || !sessionReady) return;
    try {
      captureTab();
      WorkspaceSession.save(tabs, closedTabs, activeTabId);
      storageNotice();
      $('#autosave-label').title = 'Đã lưu các tab và dữ liệu nhập trên trình duyệt này.';
    } catch (e) {
      storageNotice(
        'Chưa lưu được phiên làm việc. Bộ nhớ trình duyệt có thể đã đầy hoặc bị chặn. Bạn có thể xuất JSON để giữ đề.'
      );
      $('#autosave-label').title = 'Chưa lưu được thay đổi mới nhất.';
    }
  }
  function scheduleSave() {
    if (!autosave || !sessionReady) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveSession, 350);
  }
  $('#autosave-toggle').addEventListener('change', () => {
    clearTimeout(saveTimer);
    const enabled = $('#autosave-toggle').checked;
    try {
      if (enabled) {
        captureTab();
        // Chỉ xác nhận bật khi ghi thành công; bản cũ vẫn nguyên vẹn nếu hết dung lượng.
        WorkspaceSession.save(tabs, closedTabs, activeTabId);
      } else WorkspaceSession.clear();
      autosave = enabled;
      storageNotice();
      $('#autosave-label').title = enabled
        ? 'Tự động lưu các tab và dữ liệu nhập trên trình duyệt này.'
        : 'Tự động lưu đang tắt.';
      toast(
        enabled
          ? 'Đã bật tự động lưu phiên làm việc.'
          : 'Đã tắt tự động lưu và xóa bản lưu trên trình duyệt.'
      );
    } catch (e) {
      $('#autosave-toggle').checked = autosave;
      storageNotice(
        enabled
          ? 'Không bật được tự động lưu. Hãy kiểm tra quyền lưu trữ hoặc dung lượng trình duyệt.'
          : 'Không xóa được bản lưu tự động. Hãy kiểm tra quyền lưu trữ của trình duyệt rồi thử lại.'
      );
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveSession();
  });
  window.addEventListener('pagehide', saveSession);
  $('#problem-form').addEventListener('focusout', saveSession);
  // Khôi phục đề, không khôi phục Worker và không tự chạy tính toán.
  function startSession() {
    $('#autosave-toggle').checked = false;
    try {
      const saved = WorkspaceSession.load();
      if (saved) {
        const hydrate = (tab) => ({ ...tab, result: null, dirty: false });
        tabs.push(...saved.tabs.map(hydrate));
        closedTabs.push(...saved.closedTabs.map(hydrate));
        nextTabId = saved.nextTabId;
        restoreTab(tabs.find((tab) => tab.id === saved.activeTabId));
        autosave = true;
        $('#autosave-toggle').checked = true;
        $('#autosave-label').title =
          'Đã khôi phục phiên làm việc. Thay đổi tiếp theo sẽ được tự động lưu.';
      }
    } catch (e) {
      tabs.length = 0;
      closedTabs.length = 0;
      activeTabId = null;
      nextTabId = 1;
      storageNotice(
        'Không khôi phục được phiên đã lưu hoặc trình duyệt đang chặn lưu trữ. Bạn vẫn có thể nhập bài và mở JSON; bật Tự động lưu để tạo bản lưu mới.'
      );
    }
    if (!tabs.length) createTab();
    sessionReady = true;
  }
  startSession();
})();
