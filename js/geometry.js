/* Hình học phẳng với phân số chính xác; độc lập với bộ giải đơn hình. */
function installGeometry(scope) {
  'use strict';
  const { Q, Z, O } = scope.LP;
  const dot = (a, x) => a[0].mul(x[0]).add(a[1].mul(x[1]));
  function boundaries(p) {
    const lines = p.a.map((a, i) => ({ a, b: p.b[i], rel: p.rel[i], label: '(' + (i + 1) + ')' }));
    p.domains.forEach((d, j) => {
      if (d !== 'free')
        lines.push({
          a: j === 0 ? [O, Z] : [Z, O],
          b: Z,
          rel: d === 'pos' ? '>=' : '<=',
          label: 'x' + (j + 1) + ' = 0',
          domain: true,
        });
    });
    return lines;
  }
  function halfplanes(lines) {
    return lines.flatMap((line) => {
      const positive = { a: line.a, b: line.b };
      const negative = { a: line.a.map((q) => q.neg()), b: line.b.neg() };
      return line.rel === '=' ? [positive, negative] : [line.rel === '<=' ? positive : negative];
    });
  }
  // Giao hai đường biên bằng định thức; song song/trùng nhau không sinh đỉnh.
  function intersection(l, r) {
    const det = l.a[0].mul(r.a[1]).sub(l.a[1].mul(r.a[0]));
    if (det.zero()) return null;
    return [
      l.b.mul(r.a[1]).sub(l.a[1].mul(r.b)).div(det),
      l.a[0].mul(r.b).sub(l.b.mul(r.a[0])).div(det),
    ];
  }
  function interval(inequalities) {
    let lo = null,
      hi = null;
    for (const [a, b] of inequalities) {
      if (a.zero()) {
        if (b.sign() < 0) return null;
        else continue;
      }
      const bound = b.div(a);
      if (a.sign() > 0) hi = hi === null || bound.cmp(hi) < 0 ? bound : hi;
      else lo = lo === null || bound.cmp(lo) > 0 ? bound : lo;
    }
    return lo !== null && hi !== null && lo.cmp(hi) > 0 ? null : { lo, hi };
  }
  function choose(range) {
    if (range.lo !== null && range.lo.sign() > 0) return range.lo;
    if (range.hi !== null && range.hi.sign() < 0) return range.hi;
    return Z;
  }
  function other(range, value) {
    if (range.lo === null) return value.sub(O);
    if (range.hi === null) return value.add(O);
    if (!range.lo.eq(value)) return range.lo;
    return !range.hi.eq(value) ? range.hi : null;
  }
  // Đổi tọa độ u = c.x, v = một tọa độ gốc rồi chiếu các nửa mặt phẳng lên u.
  // Giữ cả trường hợp miền là dải, đường thẳng hoặc cả mặt phẳng, không có đỉnh.
  function project(planes, c) {
    const first = !c[0].zero();
    const rows = planes.map(({ a, b }) =>
      first
        ? { u: a[0].div(c[0]), v: a[1].sub(a[0].mul(c[1]).div(c[0])), b }
        : { u: a[1].div(c[1]), v: a[0], b }
    );
    const upper = rows.filter((r) => r.v.sign() > 0),
      lower = rows.filter((r) => r.v.sign() < 0);
    const constraints = rows.filter((r) => r.v.zero()).map((r) => [r.u, r.b]);
    for (const p of upper)
      for (const n of lower)
        constraints.push([p.u.div(p.v).sub(n.u.div(n.v)), p.b.div(p.v).sub(n.b.div(n.v))]);
    const range = interval(constraints);
    const fiber = (u) => interval(rows.map((r) => [r.v, r.b.sub(r.u.mul(u))]));
    const point = (u, v) => (first ? [u.sub(c[1].mul(v)).div(c[0]), v] : [v, u.div(c[1])]);
    return { range, fiber, point };
  }
  function solve(raw) {
    const p = scope.LP.parseProblem(raw);
    if (p.n !== 2) throw new Error('Phương pháp hình học yêu cầu đúng 2 biến.');
    const lines = boundaries(p),
      planes = halfplanes(lines);
    const constant = p.c.every((q) => q.zero()),
      axis = constant ? [O, Z] : p.c;
    const projection = project(planes, axis);
    const r = {
      p,
      method: 'geometry',
      status: 'infeasible',
      x: null,
      value: null,
      lines,
      vertices: [],
      constantObjective: constant,
    };
    if (!projection.range) return r;
    let u = choose(projection.range),
      v = choose(projection.fiber(u));
    const feasible = projection.point(u, v);
    const keySet = new Set();
    for (let i = 0; i < lines.length; i++)
      for (let j = i + 1; j < lines.length; j++) {
        const x = intersection(lines[i], lines[j]);
        if (!x || !planes.every((h) => dot(h.a, x).cmp(h.b) <= 0)) continue;
        const key = x.map(String).join('|');
        if (!keySet.has(key)) {
          keySet.add(key);
          r.vertices.push({ x, value: scope.LP.value(p, x), lines: [i, j] });
        }
      }
    r.vertices.sort((a, b) => a.x[0].cmp(b.x[0]) || a.x[1].cmp(b.x[1]));
    let letter = 0;
    r.vertices.forEach((vertex) => {
      vertex.label = vertex.x.every((q) => q.zero()) ? 'O' : 'V' + ++letter;
    });
    r.extents = [
      [O, Z],
      [Z, O],
    ].map((c) => project(planes, c).range);
    r.bounded = r.extents.every((range) => range.lo !== null && range.hi !== null);
    const bound = p.sense === 'max' ? projection.range.hi : projection.range.lo;
    if (!constant && bound === null) {
      r.status = 'unbounded';
      r.x = feasible;
      r.value = scope.LP.value(p, feasible);
      const recession = project(
        planes.map((h) => ({ a: h.a, b: Z })),
        p.c
      );
      const directionU = p.sense === 'max' ? O : O.neg();
      r.ray = recession.point(directionU, choose(recession.fiber(directionU)));
      return r;
    }
    if (!constant) {
      u = bound;
      v = choose(projection.fiber(u));
    }
    r.status = 'optimal';
    r.x = projection.point(u, v);
    r.value = scope.LP.value(p, r.x);
    const nextV = other(projection.fiber(u), v);
    if (nextV !== null) r.alternate = projection.point(u, nextV);
    else if (constant) {
      const nextU = other(projection.range, u);
      if (nextU !== null) r.alternate = projection.point(nextU, choose(projection.fiber(nextU)));
    }
    r.multiplicity = r.alternate ? 'multiple' : 'unique';
    r.activeLines = lines
      .map((line, i) => (dot(line.a, r.x).eq(line.b) ? i : -1))
      .filter((i) => i >= 0);
    if (!scope.LP.feasible(p, r.x)) throw new Error('Không xác minh được nghiệm hình học.');
    return r;
  }
  // Phạm vi của chế độ hình học trên giao diện: chỉ nhận miền nghiệm bị chặn.
  function solveBounded(raw) {
    const p = scope.LP.parseProblem(raw);
    if (p.n !== 2) throw new Error('Phương pháp hình học yêu cầu đúng 2 biến.');
    const planes = halfplanes(boundaries(p));
    const ranges = [[O, Z], [Z, O]].map((axis) => project(planes, axis).range);
    // Miền rỗng được trả về để thông báo vô nghiệm, không chạy animation.
    return solve(raw);
  }
  scope.Geometry = { solve, solveBounded, boundaries, halfplanes, intersection, project, dot };
}
installGeometry(globalThis);
