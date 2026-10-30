// Báo cáo hình học và đồ thị SVG ngoại tuyến.
'use strict';
window.GeometryView = (() => {
  const { esc, num, expr, vector, rel } = Report;
  const { Z, O } = LP;
  const colors = ['#c74440', '#2d70b3', '#388c46', '#9b59b6', '#bf7834', '#169b9b'];
  const equation = (line) => expr(line.a, ['x1', 'x2']) + ' = ' + num(line.b);
  const objective = (p) =>
    expr(p.c, ['x1', 'x2']) +
    (p.constant.zero()
      ? ''
      : (p.constant.sign() > 0 ? ' + ' : ' − ') +
        num(p.constant.sign() > 0 ? p.constant : p.constant.neg()));
  function points(line) {
    const [a, b] = line.a;
    if (a.zero() && b.zero()) return [];
    if (a.zero())
      return [
        [Z, line.b.div(b)],
        [O, line.b.div(b)],
      ];
    if (b.zero())
      return [
        [line.b.div(a), Z],
        [line.b.div(a), O],
      ];
    if (line.b.zero())
      return [
        [Z, Z],
        [b, a.neg()],
      ];
    return [
      [line.b.div(a), Z],
      [Z, line.b.div(b)],
    ];
  }
  function construction(r) {
    return `<section class="solution-section"><h2>1. Xác định miền nghiệm D</h2>
      <p>D là giao của các nửa mặt phẳng và các đường thẳng thỏa mãn hệ ràng buộc, kể cả điều kiện dấu của biến.</p>
      <div class="table-wrap"><table class="geometry-table"><thead><tr><th>Đường biên</th><th>Phương trình</th><th>Hai điểm để vẽ</th><th>Phía nhận</th></tr></thead><tbody>${r.lines
        .map((line, i) => {
          const pair = points(line);
          return `<tr><td><span class="geo-swatch" style="background:${line.domain ? '#888' : colors[i % colors.length]}"></span>${esc(line.label)}</td><td class="math">${equation(line)}</td><td class="math">${pair.length ? pair.map(vector).join(' ; ') : 'Không có đường biên'}</td><td class="math">${expr(line.a, ['x1', 'x2'])} ${rel(line.rel)} ${num(line.b)}</td></tr>`;
        })
        .join('')}</tbody></table></div>
      ${r.p.domains.every((d) => d === 'pos') ? '<p>Vì x₁ ≥ 0, x₂ ≥ 0 nên D nằm trong góc phần tư thứ nhất, kể cả hai trục tọa độ.</p>' : ''}
      <p>${r.status === 'infeasible' ? 'Các điều kiện không có điểm chung: D = ∅.' : r.bounded ? 'Miền nghiệm D bị chặn.' : 'Miền nghiệm D không bị chặn. Giá trị tối ưu còn phụ thuộc hướng của hàm mục tiêu.'}</p></section>`;
  }
  function conclusion(r) {
    if (r.status === 'infeasible')
      return '<section class="solution-section"><h2>3. Kết luận</h2><div class="notice warning">D = ∅. Bài toán vô nghiệm.</div></section>';
    const direction = r.p.sense === 'max' ? r.p.c : r.p.c.map((q) => q.neg());
    const movement = r.constantObjective
      ? `Hàm mục tiêu không đổi: f(x) = ${num(r.p.constant)} trên toàn bộ D.`
      : `Vẽ đường mức f(x) = a: ${objective(r.p)} = a. Vectơ pháp tuyến n = ${vector(r.p.c)}. Tịnh tiến song song theo hướng ${vector(direction)} để ${r.p.sense === 'max' ? 'tăng' : 'giảm'} a.`;
    const sampleLevel = r.p.constant.add(LP.Q.parse('5'));
    const samplePoints = points({ a: r.p.c, b: sampleLevel.sub(r.p.constant) });
    let result;
    if (r.status === 'unbounded') {
      const slope = Geometry.dot(r.p.c, r.ray);
      result = `<div class="notice warning"><p>D chứa tia x(t) = ${vector(r.x)} + t ${vector(r.ray)}, t ≥ 0.</p><p class="math">f(x(t)) = ${num(r.value)} ${slope.sign() > 0 ? '+' : '−'} ${num(slope.sign() > 0 ? slope : slope.neg())}t → ${r.p.sense === 'max' ? '+∞' : '−∞'}.</p><p>Hàm mục tiêu không bị chặn ${r.p.sense === 'max' ? 'trên' : 'dưới'}; không có nghiệm tối ưu hữu hạn.</p></div>`;
    } else {
      let pair = null;
      for (const i of r.activeLines)
        for (const j of r.activeLines)
          if (j > i && Geometry.intersection(r.lines[i], r.lines[j])) {
            pair = [i, j];
            break;
          }
      const system = pair
        ? `<p>Điểm tối ưu được chọn là giao của ${esc(r.lines[pair[0]].label)} và ${esc(r.lines[pair[1]].label)}:</p><div class="geo-system math"><div>${equation(r.lines[pair[0]])}<br>${equation(r.lines[pair[1]])}</div><span>⇒</span><div>x₁* = ${num(r.x[0])}<br>x₂* = ${num(r.x[1])}</div></div>`
        : '<p>Chọn một điểm trên miền nghiệm tại đường mức tối ưu:</p>';
      result = `${system}<div class="notice success"><p class="math">x* = ${vector(r.x)}</p><p class="math">f${r.p.sense === 'max' ? '<sub>max</sub>' : '<sub>min</sub>'} = f(x*) = ${num(r.value)}.</p></div><p>${r.multiplicity === 'unique' ? 'Nghiệm tối ưu duy nhất.' : `Có vô số nghiệm tối ưu. Tập nghiệm tối ưu là S* = {x ∈ D: ${objective(r.p)} = ${num(r.value)}}.`}</p>${r.alternate ? `<p class="math">Một nghiệm tối ưu khác: ${vector(r.alternate)}.</p>` : ''}`;
    }
    return `<section class="solution-section"><h2>3. Đường mức và nghiệm tối ưu</h2><p class="math">${movement}</p>${samplePoints.length ? `<p class="math">Chọn a = ${num(sampleLevel)}; đường mức đi qua ${samplePoints.map(vector).join(' và ')}.</p>` : ''}${!r.constantObjective && r.status === 'optimal' ? `<p>Đường mức cuối cùng còn tiếp xúc với D theo hướng ${r.p.sense === 'max' ? 'tăng' : 'giảm'} là a = ${num(r.value)}.</p>` : ''}${result}</section>`;
  }
  function report(r, interactive = true) {
    const vertices = r.vertices
      .map(
        (v) =>
          `<tr${r.status === 'optimal' && v.value.eq(r.value) ? ' class="geo-best"' : ''}><th>${esc(v.label)}</th><td class="math">${vector(v.x)}</td><td>${v.lines.map((i) => esc(r.lines[i].label)).join(' ∩ ')}</td><td class="math">${num(v.value)}</td></tr>`
      )
      .join('');
    return `<div class="report-cover"><h1>${esc(r.p.title)}</h1><p>Phương pháp hình học · 2 biến</p></div>${Report.problem(r.p)}${construction(r)}
      <section class="solution-section"><h2>2. Biểu diễn miền nghiệm</h2>
        <div class="geo-figure">${interactive ? `<div class="geo-toolbar"><div><button type="button" data-geo-action="in" aria-label="Phóng to đồ thị">+</button><button type="button" data-geo-action="out" aria-label="Thu nhỏ đồ thị">−</button><button type="button" data-geo-action="home">Vừa khung</button></div>${!r.constantObjective && r.status !== 'infeasible' ? '<button type="button" data-geo-action="play" data-geo-play aria-pressed="true">Tạm dừng</button>' : ''}</div>` : ''}
          <div class="geo-plot"><div class="geo-canvas" data-geo-canvas tabindex="0" aria-label="Đồ thị tương tác: kéo để di chuyển, cuộn chuột để thu phóng, bấm để xem tọa độ">${svg(r, home(r), initialLevel(r))}</div>${interactive ? '<span class="geo-probe-dot" data-geo-probe-dot hidden></span><output class="geo-probe" data-geo-probe hidden></output>' : ''}</div>
          ${interactive && !r.constantObjective ? `<div class="geo-level"><label>Đường mức a = <output data-geo-value></output><input type="range" min="0" max="1000" value="500" data-geo-slider aria-label="Tịnh tiến đường mức hàm mục tiêu"></label>${r.status === 'optimal' ? '<button type="button" data-geo-action="optimum">Đường mức tối ưu</button>' : ''}</div>` : ''}
          <p class="geo-animation-status" data-geo-status></p><p class="geo-caption"><span class="geo-key"></span> Miền nghiệm D · <span class="geo-key outside"></span> Ngoài miền nghiệm${r.constantObjective ? ' · Hàm mục tiêu không đổi.' : ' · Đường tím: f(x) = a · Mũi tên: hướng ' + (r.p.sense === 'max' ? 'tăng' : 'giảm') + ' f.'}${interactive ? ' Kéo để di chuyển, cuộn chuột để thu phóng, bấm điểm để xem tọa độ. Đường mức dừng 5 giây tại tối ưu rồi chạy lại.' : ''} Hình vẽ xấp xỉ; tọa độ và kết luận dùng phân số chính xác.</p>
        </div>
        ${r.vertices.length ? `<h3>Các đỉnh của D</h3><div class="table-wrap"><table class="geometry-table"><thead><tr><th>Đỉnh</th><th>Tọa độ</th><th>Giao hai đường biên</th><th>f(x)</th></tr></thead><tbody>${vertices}</tbody></table></div>` : `<p>${r.status === 'infeasible' ? 'Không có đỉnh khả thi.' : 'D không có đỉnh. Xét đường mức và hướng di chuyển trên D để kết luận.'}</p>`}
      </section>${conclusion(r)}`;
  }
  function decimal(q) {
    const a = q.n < 0n ? -q.n : q.n;
    const ns = String(a),
      ds = String(q.d);
    return (
      (((q.n < 0n ? -1 : 1) * Number(ns.slice(0, 15))) / Number(ds.slice(0, 15))) *
      10 ** (Math.max(0, ns.length - 15) - Math.max(0, ds.length - 15))
    );
  }
  const initialLevel = (r) => (r.value ? decimal(r.value) : decimal(r.p.constant) + 5);
  function home(r) {
    const candidates = [
      [0, 0],
      ...r.vertices.map((v) => v.x.map(decimal)),
      ...(r.x ? [r.x.map(decimal)] : []),
    ];
    for (const line of r.lines) candidates.push(...points(line).map((p) => p.map(decimal)));
    const finite = candidates.filter((p) => p.every(Number.isFinite));
    let xmin = Math.min(...finite.map((p) => p[0])),
      xmax = Math.max(...finite.map((p) => p[0]));
    let ymin = Math.min(...finite.map((p) => p[1])),
      ymax = Math.max(...finite.map((p) => p[1]));
    const span = Math.max(xmax - xmin, ymax - ymin, 1);
    if (!Number.isFinite(span) || span > 1e100)
      return { xmin: -5, xmax: 10, ymin: -3, ymax: 7, limited: true };
    const cx = (xmin + xmax) / 2,
      cy = (ymin + ymax) / 2;
    const sy = Math.max((xmax - xmin) / 1.6, ymax - ymin, 2) * 1.3;
    return { xmin: cx - sy * 0.8, xmax: cx + sy * 0.8, ymin: cy - sy / 2, ymax: cy + sy / 2 };
  }
  function clip(polygon, a, b, c) {
    const out = [],
      tolerance = 1e-9 * Math.max(1, Math.abs(c));
    if (!polygon.length) return out;
    for (let i = 0; i < polygon.length; i++) {
      const p = polygon[i],
        q = polygon[(i + 1) % polygon.length];
      const fp = a * p[0] + b * p[1] - c,
        fq = a * q[0] + b * q[1] - c;
      if (fp <= tolerance) out.push(p);
      if (fp <= tolerance !== fq <= tolerance) {
        const t = fp / (fp - fq);
        out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
      }
    }
    return out;
  }
  function numeric(line) {
    const a = line.a.map(decimal),
      b = decimal(line.b),
      scale = Math.max(...a.map(Math.abs));
    return scale ? [a[0] / scale, a[1] / scale, b / scale] : [0, 0, b];
  }
  function segment(a, b, c, box) {
    const pts = [],
      epsilon = 1e-8 * Math.max(box.xmax - box.xmin, box.ymax - box.ymin);
    function add(x, y) {
      if (
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        x >= box.xmin - epsilon &&
        x <= box.xmax + epsilon &&
        y >= box.ymin - epsilon &&
        y <= box.ymax + epsilon &&
        !pts.some((p) => Math.abs(p[0] - x) + Math.abs(p[1] - y) < epsilon)
      )
        pts.push([x, y]);
    }
    if (b) for (const x of [box.xmin, box.xmax]) add(x, (c - a * x) / b);
    if (a) for (const y of [box.ymin, box.ymax]) add((c - b * y) / a, y);
    return pts.slice(0, 2);
  }
  function short(value) {
    return Number.isFinite(value) ? Number(value.toPrecision(5)).toString() : '—';
  }
  function svg(r, box, level) {
    const W = 900,
      H = 560;
    const sx = (x) => ((x - box.xmin) / (box.xmax - box.xmin)) * W;
    const sy = (y) => H - ((y - box.ymin) / (box.ymax - box.ymin)) * H;
    const xy = (p) => sx(p[0]).toFixed(3) + ',' + sy(p[1]).toFixed(3);
    const rect = [
      [box.xmin, box.ymin],
      [box.xmax, box.ymin],
      [box.xmax, box.ymax],
      [box.xmin, box.ymax],
    ];
    const finite = (row) => row.every(Number.isFinite);
    const stroke = (pair, color, width = 2, dashed = false) =>
      pair.length === 2
        ? `<line x1="${sx(pair[0][0])}" y1="${sy(pair[0][1])}" x2="${sx(pair[1][0])}" y2="${sy(pair[1][1])}" stroke="${color}" stroke-width="${width}"${dashed ? ' stroke-dasharray="7 5"' : ''}/>`
        : '';
    const texts = [],
      lines = [],
      polygons = [];
    let feasible = rect;
    for (const h of Geometry.halfplanes(r.lines)) {
      const coefficients = numeric(h);
      if (!finite(coefficients)) {
        feasible = [];
        break;
      }
      feasible = clip(feasible, ...coefficients);
    }
    if (r.status !== 'infeasible' && feasible.length)
      polygons.push(
        `<polygon points="${feasible.map(xy).join(' ')}" fill="#c9e9d0" stroke="#2e7d43" stroke-width="3" stroke-linejoin="round"/>`
      );
    const span = Math.max(box.xmax - box.xmin, box.ymax - box.ymin),
      base = 10 ** Math.floor(Math.log10(span / 12));
    const step = [1, 2, 5, 10].map((v) => v * base).find((v) => v >= span / 12) || base * 10;
    const grid = [];
    const ax = Math.min(W - 35, Math.max(10, sx(0))),
      ay = Math.min(H - 20, Math.max(18, sy(0)));
    for (
      let i = Math.ceil(box.xmin / step), end = Math.floor(box.xmax / step);
      i <= end && i < Math.ceil(box.xmin / step) + 100;
      i++
    ) {
      const x = i * step;
      grid.push(`<line x1="${sx(x)}" y1="0" x2="${sx(x)}" y2="${H}" stroke="#ddd"/>`);
      if (i)
        texts.push(
          `<text x="${sx(x) + 3}" y="${ay + 16}" font-size="12" fill="#666">${esc(short(x))}</text>`
        );
    }
    for (
      let i = Math.ceil(box.ymin / step), end = Math.floor(box.ymax / step);
      i <= end && i < Math.ceil(box.ymin / step) + 100;
      i++
    ) {
      const y = i * step;
      grid.push(`<line x1="0" y1="${sy(y)}" x2="${W}" y2="${sy(y)}" stroke="#ddd"/>`);
      if (i)
        texts.push(
          `<text x="${ax + 5}" y="${sy(y) - 5}" font-size="12" fill="#666">${esc(short(y))}</text>`
        );
    }
    r.lines.forEach((line, i) => {
      const coefficients = numeric(line);
      if (!finite(coefficients)) return;
      const pair = segment(...coefficients, box);
      lines.push(
        stroke(pair, line.domain ? '#888' : colors[i % colors.length], line.domain ? 1 : 2)
      );
      if (pair.length === 2 && !line.domain) {
        const p = pair[0].map((v, j) => v * 0.22 + pair[1][j] * 0.78);
        texts.push(
          `<text x="${sx(p[0]) + 5}" y="${sy(p[1]) - 8}" fill="${colors[i % colors.length]}" class="geo-line-label">${esc(line.label)}</text>`
        );
      }
    });
    lines.push(
      stroke(segment(1, 0, 0, box), '#555', 1.4),
      stroke(segment(0, 1, 0, box), '#555', 1.4)
    );
    if (!r.constantObjective && Number.isFinite(level)) {
      const coefficients = numeric({ a: r.p.c, b: Z });
      const scale = Math.max(...r.p.c.map((q) => Math.abs(decimal(q))));
      const c = (level - decimal(r.p.constant)) / scale;
      if (finite([...coefficients, c]))
        lines.push(stroke(segment(coefficients[0], coefficients[1], c, box), '#753bbd', 3, true));
      const direction = r.p.c.map(decimal).map((v) => v * (r.p.sense === 'max' ? 1 : -1));
      const norm = Math.hypot(...direction);
      if (norm > 0 && Number.isFinite(norm)) {
        const origin = [
          Math.min(W - 90, Math.max(80, sx(0))),
          Math.min(H - 80, Math.max(80, sy(0))),
        ];
        const dx = (direction[0] / norm) * 52,
          dy = (-direction[1] / norm) * 52;
        const tip = [origin[0] + dx, origin[1] + dy];
        lines.push(
          `<line x1="${origin[0]}" y1="${origin[1]}" x2="${tip[0]}" y2="${tip[1]}" stroke="#753bbd" stroke-width="2"/><path d="M${tip[0] - dx * 0.18 - dy * 0.1},${tip[1] - dy * 0.18 + dx * 0.1} L${tip.join(',')} L${tip[0] - dx * 0.18 + dy * 0.1},${tip[1] - dy * 0.18 - dx * 0.1}" fill="none" stroke="#753bbd" stroke-width="2"/>`
        );
        texts.push(
          `<text x="${tip[0] + 8}" y="${tip[1]}" fill="#753bbd" font-size="14">${r.p.sense === 'max' ? 'n' : '−n'}</text>`
        );
      }
    }
    function mark(x, label, best) {
      const p = x.map(decimal);
      if (!finite(p) || p[0] < box.xmin || p[0] > box.xmax || p[1] < box.ymin || p[1] > box.ymax)
        return;
      texts.push(
        `<g><title>${esc(label + ' = (' + x.join('; ') + ')')}</title><circle cx="${sx(p[0])}" cy="${sy(p[1])}" r="${best ? 6 : 4}" fill="${best ? '#753bbd' : '#24633a'}" stroke="white" stroke-width="1.5"/><text x="${sx(p[0]) + 9}" y="${sy(p[1]) - 10}" class="geo-point-label" fill="${best ? '#753bbd' : '#24633a'}">${esc(label)}</text></g>`
      );
    }
    r.vertices.forEach((v) => {
      const chosen = r.status === 'optimal' && v.x.every((q, i) => q.eq(r.x[i]));
      mark(v.x, v.label + (chosen ? ' = x*' : ''), r.status === 'optimal' && v.value.eq(r.value));
    });
    if (r.x && !r.vertices.some((v) => v.x.every((q, i) => q.eq(r.x[i]))))
      mark(r.x, r.status === 'optimal' ? 'x*' : 'x⁰', r.status === 'optimal');
    const note = box.limited
      ? 'Tỉ lệ quá lớn; dùng tọa độ chính xác trong lời giải.'
      : r.status === 'infeasible'
        ? 'D = ∅'
        : r.bounded
          ? 'D: miền màu xanh'
          : 'D: miền màu xanh, tiếp tục ngoài khung nhìn';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Đồ thị miền nghiệm và đường mức hàm mục tiêu"><title>Miền nghiệm D</title><rect width="${W}" height="${H}" fill="#f7dada"/>${polygons.join('')}${grid.join('')}${lines.join('')}${texts.join('')}<text x="${W - 25}" y="${ay - 8}" font-size="18">x₁</text><text x="${ax + 10}" y="22" font-size="18">x₂</text><text x="14" y="${H - 12}" font-size="13" fill="#444">${esc(note)}</text></svg>`;
  }
  function mount(host, r, clock = window) {
    const figure = host.querySelector('.geo-figure');
    if (!figure) return () => {};
    const $ = (s) => figure.querySelector(s);
    const canvas = $('[data-geo-canvas]'),
      slider = $('[data-geo-slider]'),
      output = $('[data-geo-value]');
    const play = $('[data-geo-play]'),
      status = $('[data-geo-status]');
    const tooltip = $('[data-geo-probe]'),
      probeDot = $('[data-geo-probe-dot]');
    let box = home(r),
      level = initialLevel(r),
      limits,
      drag = null,
      probe = null;
    let frameId = null,
      lastTime = null,
      elapsed = 0,
      targetBox = null,
      stopped = false;
    const canAnimate =
      !r.constantObjective && r.status !== 'infeasible' && Number.isFinite(level) && !box.limited;
    let playing = canAnimate && !clock.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    function range() {
      const c = r.p.c.map(decimal),
        k = decimal(r.p.constant);
      const values = [box.xmin, box.xmax].flatMap((x) =>
        [box.ymin, box.ymax].map((y) => c[0] * x + c[1] * y + k)
      );
      limits = [Math.min(...values, level), Math.max(...values, level)];
      if (!limits.every(Number.isFinite) || limits[0] === limits[1]) limits = [0, 10];
    }
    range();
    const sign = r.p.sense === 'max' ? 1 : -1;
    const margin = Math.max((limits[1] - limits[0]) * 0.25, Math.abs(level) * 0.2, 1);
    const target = r.status === 'optimal' ? initialLevel(r) : level + sign * margin;
    const values = r.vertices.map((v) => decimal(v.value)).filter(Number.isFinite);
    const candidate = values.length
      ? sign > 0
        ? Math.min(...values)
        : Math.max(...values)
      : target;
    const from = sign * (target - candidate) > 1e-9 ? candidate : target - sign * margin;
    if (playing) level = from;
    function positionProbe() {
      if (!probe || !tooltip || !probeDot) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((probe.x - box.xmin) / (box.xmax - box.xmin)) * rect.width;
      const y = ((box.ymax - probe.y) / (box.ymax - box.ymin)) * rect.height;
      const outside = x < 0 || x > rect.width || y < 0 || y > rect.height;
      tooltip.hidden = probeDot.hidden = outside;
      if (probe.html) tooltip.innerHTML = probe.html + '<small>' + esc(probe.text) + '</small>';
      else tooltip.textContent = probe.text;
      tooltip.style.left =
        Math.max(4, Math.min(rect.width - (tooltip.offsetWidth || 180) - 4, x + 14)) + 'px';
      tooltip.style.top =
        Math.max(
          4,
          Math.min(
            rect.height - (tooltip.offsetHeight || 35) - 4,
            y - (tooltip.offsetHeight || 35) - 10
          )
        ) + 'px';
      probeDot.style.left = x + 'px';
      probeDot.style.top = y + 'px';
    }
    function draw() {
      canvas.innerHTML = svg(r, box, level);
      if (output) output.textContent = short(level);
      if (slider)
        slider.value = Math.round(
          Math.max(0, Math.min(1000, ((level - limits[0]) / (limits[1] - limits[0])) * 1000))
        );
      if (play) {
        play.disabled = !canAnimate;
        play.textContent = playing ? 'Tạm dừng' : 'Chạy animation';
        play.setAttribute('aria-pressed', String(playing));
      }
      if (status)
        status.textContent = !canAnimate
          ? ''
          : playing
            ? elapsed % 12000 >= 7000
              ? r.status === 'optimal'
                ? 'Đã đến mức tối ưu · Dừng 5 giây rồi chạy lại'
                : 'Hàm mục tiêu không bị chặn · Tiếp tục được ngoài khung nhìn'
              : 'Đang tịnh tiến đường mức theo hướng ' + (sign > 0 ? 'tăng' : 'giảm') + ' f'
            : 'Đã tạm dừng · Có thể kéo thanh đường mức hoặc bấm Chạy animation';
      positionProbe();
    }
    function requestFrame() {
      if (!stopped && frameId === null && (playing || targetBox))
        frameId = clock.requestAnimationFrame(tick);
    }
    function tick(time) {
      frameId = null;
      if (stopped || canvas.isConnected === false) return;
      const dt = lastTime === null ? 0 : Math.min(100, Math.max(0, time - lastTime));
      lastTime = time;
      if (clock.document?.visibilityState !== 'hidden') {
        if (playing) {
          elapsed = (elapsed + dt) % 12000;
          const progress = Math.min(1, elapsed / 7000);
          level = from + (target - from) * progress;
        }
        if (targetBox) {
          const blend = 1 - Math.exp(-Math.max(dt, 1) / 55);
          let difference = 0;
          for (const key of ['xmin', 'xmax', 'ymin', 'ymax']) {
            const delta = targetBox[key] - box[key];
            box[key] += delta * blend;
            difference += Math.abs(delta);
          }
          if (difference < (box.xmax - box.xmin) * 1e-5) {
            box = targetBox;
            targetBox = null;
          }
          range();
        }
        draw();
      }
      requestFrame();
    }
    function zoom(factor, rx = 0.5, ry = 0.5) {
      const base = targetBox || box;
      const width = (base.xmax - base.xmin) * factor,
        height = (base.ymax - base.ymin) * factor;
      if (width < 1e-8 || width > 1e100 || !Number.isFinite(width)) return;
      const x = base.xmin + rx * (base.xmax - base.xmin),
        y = base.ymax - ry * (base.ymax - base.ymin);
      targetBox = {
        xmin: x - rx * width,
        xmax: x + (1 - rx) * width,
        ymin: y - (1 - ry) * height,
        ymax: y + ry * height,
      };
      requestFrame();
    }
    function pause() {
      playing = false;
      lastTime = null;
    }
    figure.addEventListener('click', (e) => {
      const action = e.target.closest('[data-geo-action]')?.dataset.geoAction;
      if (!action) return;
      if (action === 'home') {
        box = home(r);
        targetBox = null;
      } else if (action === 'optimum') {
        clearLineProbe();
        pause();
        level = initialLevel(r);
      } else if (action === 'play') {
        if (!canAnimate) return;
        clearLineProbe();
        playing = !playing;
        elapsed = 0;
        lastTime = null;
        if (playing) level = from;
      } else if (action === 'in' || action === 'out') zoom(action === 'in' ? 0.8 : 1.25);
      range();
      draw();
      requestFrame();
    });
    slider?.addEventListener('input', () => {
      clearLineProbe();
      pause();
      level = limits[0] + (Number(slider.value) / 1000) * (limits[1] - limits[0]);
      draw();
    });
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? rect.height : 1);
        zoom(
          Math.exp(Math.max(-0.4, Math.min(0.4, delta * 0.0015))),
          (e.clientX - rect.left) / rect.width,
          (e.clientY - rect.top) / rect.height
        );
      },
      { passive: false }
    );
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || drag) return;
      const rect = canvas.getBoundingClientRect();
      targetBox = null;
      drag = {
        level,
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
        height: rect.height,
        moved: false,
        box: { ...box },
      };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag || drag.id !== e.pointerId || !drag.width || !drag.height) return;
      drag.moved ||= Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4;
      if (!drag.moved) return;
      const dx = ((e.clientX - drag.x) / drag.width) * (drag.box.xmax - drag.box.xmin);
      const dy = ((e.clientY - drag.y) / drag.height) * (drag.box.ymax - drag.box.ymin);
      box = {
        xmin: drag.box.xmin - dx,
        xmax: drag.box.xmax - dx,
        ymin: drag.box.ymin + dy,
        ymax: drag.box.ymax + dy,
      };
      range();
      draw();
    });
    function lineAtPoint(x, y, rect, atLevel) {
      const candidates = r.lines.map((line) => ({
        line,
        label: 'Đường ' + line.label,
        html: equation(line),
      }));
      candidates.push(
        { line: { a: [O, Z], b: Z }, label: 'Trục x₂', html: 'x₁ = 0' },
        { line: { a: [Z, O], b: Z }, label: 'Trục x₁', html: 'x₂ = 0' }
      );
      if (!r.constantObjective && Number.isFinite(atLevel))
        candidates.push({
          line: { a: r.p.c, b: LP.Q.parse(String(atLevel)).sub(r.p.constant) },
          label: 'Đường mức',
          html:
            objective(r.p) +
            ' = ' +
            (r.value && atLevel === decimal(r.value) ? num(r.value) : esc(short(atLevel))),
          objective: true,
        });
      const dx = (box.xmax - box.xmin) / rect.width,
        dy = (box.ymax - box.ymin) / rect.height;
      let found = null,
        closest = 8;
      for (const item of candidates) {
        const [a, b, c] = numeric(item.line);
        const norm2 = (a * dx) ** 2 + (b * dy) ** 2;
        if (!Number.isFinite(norm2) || !norm2) continue;
        const residual = a * x + b * y - c,
          distance = Math.abs(residual) / Math.sqrt(norm2);
        if (distance <= closest) {
          closest = distance;
          found = {
            ...item,
            x: x - (residual * a * dx * dx) / norm2,
            y: y - (residual * b * dy * dy) / norm2,
          };
        }
      }
      return found;
    }
    function clearLineProbe() {
      if (!probe?.objective) return;
      probe = null;
      if (tooltip) tooltip.hidden = true;
      if (probeDot) probeDot.hidden = true;
    }
    canvas.addEventListener('pointerup', (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      if (!drag.moved) {
        const rect = canvas.getBoundingClientRect();
        const rx = (e.clientX - rect.left) / rect.width,
          ry = (e.clientY - rect.top) / rect.height;
        let x = box.xmin + rx * (box.xmax - box.xmin),
          y = box.ymax - ry * (box.ymax - box.ymin);
        const targets = [...r.vertices.map((v) => v.x), ...(r.x ? [r.x] : [])];
        const exact = targets.find(
          (p) =>
            Math.hypot(
              ((decimal(p[0]) - x) / (box.xmax - box.xmin)) * rect.width,
              ((decimal(p[1]) - y) / (box.ymax - box.ymin)) * rect.height
            ) <= 10
        );
        if (exact) {
          x = decimal(exact[0]);
          y = decimal(exact[1]);
        }
        const hit = exact ? null : lineAtPoint(x, y, rect, drag.level);
        if (hit) {
          x = hit.x;
          y = hit.y;
          if (hit.objective) {
            pause();
            level = drag.level;
          }
        }
        probe = {
          x,
          y,
          html: hit
            ? '<b>' + esc(hit.label) + '</b><span class="math">' + hit.html + '</span>'
            : null,
          objective: hit?.objective || false,
          text: exact
            ? '(' + exact.map(String).join('; ') + ')'
            : '≈ (' + short(x) + '; ' + short(y) + ')',
        };
        draw();
      }
      drag = null;
    });
    for (const event of ['pointercancel', 'lostpointercapture'])
      canvas.addEventListener(event, () => {
        drag = null;
      });
    canvas.addEventListener('keydown', (e) => {
      if (e.key === '+' || e.key === '=') zoom(0.8);
      else if (e.key === '-') zoom(1.25);
      else if (e.key === 'Escape') {
        probe = null;
        if (tooltip) tooltip.hidden = true;
        if (probeDot) probeDot.hidden = true;
      } else return;
      e.preventDefault();
    });
    draw();
    requestFrame();
    return () => {
      stopped = true;
      if (frameId !== null) clock.cancelAnimationFrame(frameId);
    };
  }
  return { report, mount, points, home, svg, decimal };
})();
