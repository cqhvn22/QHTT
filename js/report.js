'use strict';
window.Report = (() => {
  const esc = (v) =>
    String(v).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  const { Q, Z, O } = LP;
  const num = (q) =>
    q.d === 1n
      ? esc(q)
      : /* HTML */ `<span class="fraction" title="${esc(q.decimal())}"
          ><span>${q.n}</span><span>${q.d}</span></span
        >`;
  const named = (s) => esc(s).replace(/^x(\d+)/, '<i class="math-var">x</i><sub>$1</sub>');
  const A = (j) => /* HTML */ `<i class="math-var">A</i><sub>${j + 1}</sub>`;
  const rel = (s) => ({ '<=': '≤', '>=': '≥', '=': '=' })[s];
  const domain = (s) => ({ pos: '≥ 0', neg: '≤ 0', free: 'tự do' })[s];
  const phase = (s) =>
    ({
      direct: 'Đơn hình trực tiếp',
      bigm: 'Phương pháp M',
      phase1: 'Pha I · Tìm phương án khả thi',
      phase2: 'Tối ưu hàm mục tiêu gốc',
    })[s];
  const methodName = (r) =>
    !r.kinds.includes('giả')
      ? 'Đơn hình'
      : r.method === 'two'
        ? 'Đơn hình hai pha'
        : 'Phương pháp M';
  function cost(c) {
    if (c.eta.zero()) return num(c.delta);
    const e = c.eta,
      v = e.sign() < 0 ? e.neg() : e;
    return (
      (e.sign() < 0 ? '−' : '') +
      (v.eq(O) ? '' : num(v)) +
      'M' +
      (c.delta.zero()
        ? ''
        : (c.delta.sign() > 0 ? ' + ' : ' − ') + num(c.delta.sign() > 0 ? c.delta : c.delta.neg()))
    );
  }
  function expr(coeff, names) {
    const parts = [];
    coeff.forEach((v, j) => {
      if (v.zero()) return;
      const mag = v.sign() < 0 ? v.neg() : v;
      parts.push(
        (parts.length ? (v.sign() < 0 ? ' − ' : ' + ') : v.sign() < 0 ? '−' : '') +
          (mag.eq(O) ? '' : num(mag) + ' ') +
          named(names[j])
      );
    });
    return parts.join('') || '0';
  }
  const cn = (q) =>
    q.zero() ? '' : (q.sign() > 0 ? ' + ' : ' − ') + num(q.sign() > 0 ? q : q.neg());
  const vector = (x) =>
    /* HTML */ `<span class="vector"
      >(${x.map(num).join('<span class="separator">;</span>')})</span
    >`;
  const originals = (n) => Array.from({ length: n }, (_, j) => 'x' + (j + 1));
  // Đề bài gốc
  function problem(p) {
    return /* HTML */ `<section class="solution-section">
      <h2>Bài toán ban đầu</h2>
      <div class="math-block">
        <div class="objective-line">
          f(x) = ${expr(p.c, originals(p.n))}${cn(p.constant)} <span class="arrow">→</span>
          <b>${p.sense.toUpperCase()}</b>
        </div>
        <div class="constraints-list">
          ${p.a.length
            ? p.a
                .map(
                  (row, i) =>
                    /* HTML */ `<div>
                      <span class="row-tag">R${i + 1}</span>${expr(row, originals(p.n))}
                      ${rel(p.rel[i])} ${num(p.b[i])}
                    </div>`
                )
                .join('')
            : '<div>Không có ràng buộc tuyến tính bổ sung.</div>'}
        </div>
        <div class="domain-line">
          ${p.domains
            .map((d, j) => named('x' + (j + 1)) + ' ' + domain(d))
            .join('<span class="separator">;</span>')}
        </div>
      </div>
    </section>`;
  }
  // Dạng chính tắc và cơ sở xuất phát
  function normalization(r) {
    const first = r.steps[0],
      full = LP.zeros(r.names.length);
    if (first) first.basis.forEach((k, i) => (full[k] = first.b[i]));
    const artificial = r.kinds.map((k, j) => (k === 'giả' ? j : -1)).filter((j) => j >= 0);
    const substitutions = r.p.domains.flatMap((d, j) =>
      d === 'free'
        ? [
            `${named('x' + (j + 1))} = ${named('x' + (j + 1) + '⁺')} − ${named('x' + (j + 1) + '⁻')}`,
          ]
        : d === 'neg'
          ? [`${named('x' + (j + 1))} = −${named('x' + (j + 1) + '′')}`]
          : []
    );
    return /* HTML */ `<section class="solution-section">
      <h2>Dạng chính tắc</h2>
      ${substitutions.length
        ? /* HTML */ `<p class="math substitution">${substitutions.join('; &nbsp; ')}</p>`
        : ''}
      <div class="math-block">
        <div class="objective-line">
          f${r.method === 'bigm' && artificial.length ? '<sub>M</sub>' : ''}(x) =
          ${expr(r.objective, r.names)}${cn(r.p.constant)}${r.method === 'bigm'
            ? artificial
                .map((j) => (r.p.sense === 'max' ? ' − M' : ' + M') + named(r.names[j]))
                .join('')
            : ''}
          → ${r.p.sense.toUpperCase()}
        </div>
        ${r.canonical
          .map((row, i) => /* HTML */ `<div>${expr(row, r.names)} = ${num(r.rhs[i])}</div>`)
          .join('')}
        <div class="domain-line">Tất cả các biến trong hệ trên ≥ 0.</div>
      </div>
      ${r.method === 'two' && artificial.length
        ? /* HTML */ `<p class="math">
            Pha I: W = ${artificial.map((j) => named(r.names[j])).join(' + ')} → MIN.
          </p>`
        : ''}${first
        ? /* HTML */ `<div class="initial-basis">
            <p>
              Cơ sở xuất phát: <span class="math">J = { ${first.basis.map(A).join(', ')} }</span>
            </p>
            <p class="math">x<sup>(0)</sup> = ${vector(full)}</p>
          </div>`
        : ''}
    </section>`;
  }
  // Bảng đơn hình và thông tin biến vào / ra
  function step(r, index) {
    const t = r.steps[index],
      big = t.cost.some((c) => !c.eta.zero());
    const table = /* HTML */ `<div
      class="table-wrap"
      tabindex="0"
      aria-label="Bảng đơn hình ${index + 1}, cuộn ngang để xem đủ"
    >
      <table class="tableau">
        <thead>
          <tr>
            <th rowspan="2">Hệ số<br />c<sub>B</sub></th>
            <th rowspan="2">Cơ sở</th>
            <th rowspan="2" class="rhs">Phương án</th>
            ${t.cost
              .map(
                (c, j) =>
                  /* HTML */ `<th class="${j === t.enter ? 'enter-col' : ''}">${cost(c)}</th>`
              )
              .join('')}
          </tr>
          <tr>
            ${r.names
              .map(
                (n, j) => /* HTML */ `<th class="${j === t.enter ? 'enter-col' : ''}">${A(j)}</th>`
              )
              .join('')}
          </tr>
        </thead>
        <tbody>
          ${t.a
            .map(
              (row, i) =>
                /* HTML */ `<tr class="${i === t.leave ? 'leaving-row' : ''}">
                  <td>${cost(t.cost[t.basis[i]])}</td>
                  <td><strong>${A(t.basis[i])}</strong></td>
                  <td class="rhs">${num(t.b[i])}</td>
                  ${row
                    .map(
                      (v, j) =>
                        /* HTML */ `<td
                          class="${!t.active[j]
                            ? 'inactive'
                            : i === t.leave && j === t.enter
                              ? 'pivot'
                              : j === t.enter
                                ? 'enter-col'
                                : ''}"
                        >
                          ${t.active[j] ? num(v) : '×'}
                        </td>`
                    )
                    .join('')}
                </tr>`
            )
            .join('')}
        </tbody>
        <tfoot>
          ${big
            ? /* HTML */ `<tr>
                  <th colspan="2">δ<sub>j</sub></th>
                  <td>${num(t.value.delta)}</td>
                  ${t.delta
                    .map((v, j) => /* HTML */ `<td>${t.active[j] ? num(v.delta) : '×'}</td>`)
                    .join('')}
                </tr>
                <tr>
                  <th colspan="2">η<sub>j</sub></th>
                  <td>${num(t.value.eta)}</td>
                  ${t.delta
                    .map((v, j) => /* HTML */ `<td>${t.active[j] ? num(v.eta) : '×'}</td>`)
                    .join('')}
                </tr>`
            : /* HTML */ `<tr>
                <th colspan="2">Δ<sub>j</sub> = z<sub>j</sub> − c<sub>j</sub></th>
                <td>${t.phase === 'phase1' ? 'W' : 'f'} = ${cost(t.value)}</td>
                ${t.delta
                  .map((v, j) => /* HTML */ `<td>${t.active[j] ? cost(v) : '×'}</td>`)
                  .join('')}
              </tr>`}
        </tfoot>
      </table>
    </div>`;
    const pivot =
      t.enter >= 0 && t.leave >= 0
        ? /* HTML */ `<p class="pivot-line">
            <span class="math">${A(t.enter)}</span> vào,
            <span class="math">${A(t.basis[t.leave])}</span> ra.
          </p>`
        : '';
    return /* HTML */ `<section class="solution-section tableau-section">
      <div class="step-heading">
        <h2>Bảng ${index + 1}</h2>
        <span class="badge">${phase(t.phase)}</span>
      </div>
      ${table}${pivot}
    </section>`;
  }
  const status = (r) =>
    ({
      optimal: 'Nghiệm tối ưu',
      infeasible: 'Bài toán vô nghiệm',
      unbounded: 'Hàm mục tiêu không bị chặn',
      limit: 'Chưa có kết luận',
    })[r.status];
  // Kết luận và kiểm tra nghiệm
  function conclusion(r) {
    return /* HTML */ `<section class="solution-section">
      <h2>${status(r)}</h2>
      <div class="notice ${r.status === 'optimal' ? 'success' : 'warning'}">
        <p>${esc(r.conclusion)}</p>
        ${r.x
          ? /* HTML */ `<p class="answer math">
              ${r.status === 'optimal' ? 'x*' : 'x⁰'} = ${vector(r.x)}<br />f(${r.status ===
              'optimal'
                ? 'x*'
                : 'x⁰'})
              = ${num(r.value)}
            </p>`
          : ''}
      </div>
      ${r.status === 'optimal'
        ? /* HTML */ `<p>
            ${{
              unique: 'Nghiệm tối ưu duy nhất.',
              multiple: 'Bài toán có vô số nghiệm tối ưu.',
              unknown: 'Chưa kết luận tính duy nhất của nghiệm tối ưu.',
            }[r.multiplicity]}
          </p>`
        : ''}${r.alternate
        ? /* HTML */ `<div class="math-block">
              Một nghiệm tối ưu khác: y* = ${vector(r.alternate)}<br />x(λ) = (1 − λ)x* + λy*,
              &nbsp;0 ≤ λ ≤ 1.
            </div>
            <p class="muted">Một họ nghiệm tối ưu với 0 ≤ λ ≤ 1.</p>`
        : ''}${r.ray
        ? /* HTML */ `<div class="math-block">
            d = ${vector(r.ray)}<br />x(t) = x⁰ + t·d, &nbsp;t ≥ 0<br />f(x(t)) = ${num(r.value)} +
            t·(${num(LP.value(r.p, r.ray).sub(r.p.constant))}) →
            ${r.p.sense === 'max' ? '+∞' : '−∞'}
          </div>`
        : ''}${r.x
        ? /* HTML */ `<h3>Phương án đầy đủ (theo thứ tự cột)</h3>
            <p class="math">${vector(r.full)}</p>`
        : ''}
    </section>`;
  }
  // Ghép toàn bộ lời giải và xuất HTML độc lập
  function all(r) {
    return /* HTML */ `<div class="report-cover">
        <h1>${esc(r.p.title)}</h1>
        <p>${methodName(r)} · ${r.pivots} lần đổi cơ sở</p>
      </div>
      ${problem(r.p)}${normalization(r)}${r.steps.map((s, i) => step(r, i)).join('')}${conclusion(
        r
      )}`;
  }
  function standalone(r, css) {
    return (
      '<!doctype html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lời giải đơn hình</title><style>' +
      (window.MATH_FONT_CSS || '') +
      css +
      '</style></head><body class="exported"><main class="report">' +
      all(r) +
      '</main></body></html>'
    );
  }
  // A compact, independent print theme keeps exported HTML self-contained on file://.
  const exportCSS = /* CSS */ `
    * {
      box-sizing: border-box;
    }
    body {
      font:
        15px Arial,
        sans-serif;
      color: #303030;
      line-height: 1.65;
      margin: 0;
      background: #f5f5f5;
    }
    .report {
      max-width: 1200px;
      margin: 24px auto;
      background: white;
      padding: 30px 40px;
    }
    .solution-section {
      padding: 22px 0;
      border-bottom: 1px solid #ddd;
    }
    h1 {
      font-size: 25px;
      font-weight: 500;
    }
    h2 {
      font-size: 19px;
      margin: 0 0 14px;
      font-weight: 600;
    }
    h3 {
      font-size: 15px;
      margin-top: 24px;
    }
    .section-label {
      font-size: 10px;
      letter-spacing: 1px;
      color: #888;
    }
    .muted,
    small,
    .report-footer {
      color: #777;
      font-size: 12px;
    }
    .report-footer {
      padding-top: 20px;
    }
    .table-wrap {
      overflow: auto;
      margin: 14px 0;
    }
    table {
      border-collapse: collapse;
      white-space: nowrap;
      width: 100%;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }
    th,
    td {
      border: 1px solid #d8d8d8;
      padding: 10px 12px;
    }
    th {
      background: #f4f4f4;
      font:
        12px Arial,
        sans-serif;
    }
    td {
      font:
        17px 'Computer Modern',
        Cambria,
        serif;
    }
    thead small {
      display: block;
    }
    tfoot {
      background: #edf3fc;
    }
    .rhs {
      border-right: 2px solid #ccc;
    }
    .enter-col {
      background: #eef4fd;
    }
    .leaving-row td {
      background: #fdf1ed;
    }
    .leaving-row .enter-col {
      background: #e3edfb;
    }
    .pivot {
      background: #2d70b3 !important;
      color: white;
      font-weight: bold;
    }
    .inactive {
      background: #fafafa;
      color: #aaa;
    }
    .fraction {
      display: inline-flex;
      flex-direction: column;
      vertical-align: middle;
      text-align: center;
      line-height: 1.2;
      font-family: 'Computer Modern', Cambria, serif;
      margin: 0 0.15em;
      min-width: 1em;
    }
    .fraction > span:first-child {
      border-bottom: 1px solid currentColor;
      padding: 0 0.12em 0.12em;
    }
    .fraction > span:last-child {
      padding: 0.12em 0.12em 0;
    }
    .separator {
      margin: 0 0.45em;
    }
    .vector {
      white-space: nowrap;
    }
    .math,
    .math-block {
      font:
        19px 'Computer Modern',
        Cambria,
        serif;
      line-height: 2;
    }
    .math-var {
      font-family: 'Computer Modern Math', Cambria, serif;
      font-style: italic;
    }
    .math-block {
      padding: 12px 0;
      margin: 10px 0;
      overflow-x: auto;
    }
    .objective-line {
      font-size: 21px;
      margin-bottom: 9px;
    }
    .row-tag {
      font: 10px Arial;
      color: #999;
      margin-right: 15px;
    }
    .domain-line {
      margin-top: 10px;
      font: 13px Arial;
    }
    .step-heading {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
    }
    .badge {
      font-size: 11px;
      color: #888;
    }
    .pivot-line,
    .table-note {
      font-size: 13px;
    }
    .notice {
      border-left: 3px solid #2d70b3;
      background: #f1f6fd;
      padding: 14px 18px;
      margin: 16px 0;
    }
    .notice.warning {
      border-color: #c74440;
      background: #fff5f4;
    }
    .answer {
      font-size: 25px;
    }
    details {
      border-top: 1px solid #ddd;
      padding-top: 12px;
      margin-top: 18px;
    }
    summary {
      cursor: pointer;
      color: #2d70b3;
      font-size: 12px;
    }
    .check {
      color: #388c46;
    }
    .report sub {
      line-height: 0;
      font-size: 0.7em;
    }
    @media (max-width: 700px) {
      .report {
        margin: 0;
        padding: 18px;
      }
      .step-heading {
        display: block;
      }
    }
    @media print {
      @page {
        size: A4 landscape;
        margin: 12mm;
      }
      body {
        background: #fff;
        font-size: 10pt;
      }
      .report {
        margin: 0;
        padding: 0;
        max-width: none;
      }
      .solution-section {
        padding: 14px 0;
      }
      h2,
      h3 {
        break-after: avoid;
      }
      table {
        font-size: 9pt;
      }
      th,
      td {
        padding: 6px 5px;
      }
      td {
        font-size: 12pt;
      }
      thead {
        display: table-header-group;
      }
      tfoot {
        display: table-row-group;
      }
      tr,
      .notice {
        break-inside: avoid;
      }
      .table-wrap,
      .math-block {
        overflow: visible;
      }
      details > * {
        display: block !important;
      }
      * {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `;
  return {
    esc,
    num,
    named,
    A,
    rel,
    domain,
    phase,
    methodName,
    cost,
    expr,
    vector,
    problem,
    normalization,
    step,
    conclusion,
    status,
    all,
    standalone,
    exportCSS,
  };
})();
