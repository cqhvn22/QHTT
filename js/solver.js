/* Exact simplex engine. Browser JavaScript only; no packages, network or build step.
 * installLP is self-contained so the UI can run the engine inside a Blob Worker.
 */
function installLP(scope) {
  'use strict';
  class Rational {
    constructor(n, d = 1n) {
      n = BigInt(n);
      d = BigInt(d);
      if (!d) throw new Error('Mẫu số phải khác 0.');
      if (d < 0n) {
        n = -n;
        d = -d;
      }
      let a = n < 0n ? -n : n,
        b = d;
      while (b) [a, b] = [b, a % b];
      this.n = n / a;
      this.d = d / a;
      Object.freeze(this);
    }
    static parse(value) {
      if (value instanceof Rational) return value;
      const s = String(value).trim().replace(/−/g, '-').replace(/,/g, '.');
      if (!s || s.length > 100) throw new Error('Hệ số phải có 1–100 ký tự.');
      if (s.includes('/')) {
        const p = s.split('/');
        if (p.length !== 2) throw new Error('Phân số không hợp lệ.');
        return Rational.parse(p[0]).div(Rational.parse(p[1]));
      }
      const match = s.match(/^([+-]?)(\d+(?:\.\d*)?|\.\d+)(?:[eE]([+-]?\d+))?$/);
      if (!match) throw new Error('Số không hợp lệ: ' + s + '. Ví dụ: -2, 0.5, 3/7.');
      const exp = Number(match[3] || 0),
        parts = match[2].split('.');
      const scale = (parts[1] || '').length - exp;
      if (!Number.isSafeInteger(scale) || Math.abs(scale) > 50)
        throw new Error('Số mũ/thang thập phân tối đa 50.');
      let num = BigInt(parts.join('')) * (match[1] === '-' ? -1n : 1n);
      return scale >= 0
        ? new Rational(num, 10n ** BigInt(scale))
        : new Rational(num * 10n ** BigInt(-scale));
    }
    add(b) {
      return new Rational(this.n * b.d + b.n * this.d, this.d * b.d);
    }
    sub(b) {
      return this.add(b.neg());
    }
    mul(b) {
      return new Rational(this.n * b.n, this.d * b.d);
    }
    div(b) {
      return new Rational(this.n * b.d, this.d * b.n);
    }
    neg() {
      return new Rational(-this.n, this.d);
    }
    sign() {
      return this.n < 0n ? -1 : this.n > 0n ? 1 : 0;
    }
    zero() {
      return this.n === 0n;
    }
    cmp(b) {
      const v = this.n * b.d - b.n * this.d;
      return v < 0n ? -1 : v > 0n ? 1 : 0;
    }
    eq(b) {
      return this.n === b.n && this.d === b.d;
    }
    toString() {
      return this.d === 1n ? String(this.n) : this.n + '/' + this.d;
    }
    decimal() {
      const sign = this.n < 0n ? '−' : '',
        a = this.n < 0n ? -this.n : this.n;
      const rounded = ((a * 100000000n * 2n) / this.d + 1n) / 2n;
      const whole = rounded / 100000000n,
        frac = String(rounded % 100000000n)
          .padStart(8, '0')
          .replace(/0+$/, '');
      return sign + whole + (frac ? ',' + frac : '');
    }
    toJSON() {
      return { $q: this.toString() };
    }
  }
  const Q = Rational,
    Z = new Q(0n),
    O = new Q(1n);
  const zeros = (n) => Array(n).fill(Z),
    copy = (a) => a.map((r) => r.slice());
  class Cost {
    constructor(eta = Z, delta = Z) {
      this.eta = eta;
      this.delta = delta;
    }
    add(b) {
      return new Cost(this.eta.add(b.eta), this.delta.add(b.delta));
    }
    sub(b) {
      return new Cost(this.eta.sub(b.eta), this.delta.sub(b.delta));
    }
    mul(b) {
      return new Cost(this.eta.mul(b), this.delta.mul(b));
    }
    cmp(b) {
      return this.eta.cmp(b.eta) || this.delta.cmp(b.delta);
    }
    toString() {
      if (this.eta.zero()) return this.delta.toString();
      const m = this.eta.eq(O) ? 'M' : this.eta.eq(O.neg()) ? '−M' : this.eta + 'M';
      return (
        m +
        (this.delta.zero()
          ? ''
          : (this.delta.sign() > 0 ? ' + ' : ' − ') +
            (this.delta.sign() > 0 ? this.delta : this.delta.neg()))
      );
    }
    toJSON() {
      return { $cost: [this.eta, this.delta] };
    }
  }
  const CZ = new Cost();
  function revive(key, value) {
    if (value && typeof value === 'object') {
      if ('$q' in value) return Q.parse(value.$q);
      if ('$cost' in value) return new Cost(...value.$cost);
    }
    return value;
  }
  function parseProblem(raw) {
    if (!raw || !Array.isArray(raw.c) || !Array.isArray(raw.a))
      throw new Error('Dữ liệu bài toán không hợp lệ.');
    const n = raw.c.length,
      m = raw.a.length;
    if (n < 1 || n > 20 || m > 60) throw new Error('Hỗ trợ 1–20 biến và tối đa 60 ràng buộc.');
    if (!['max', 'min'].includes(raw.sense)) throw new Error('Chiều tối ưu phải là max hoặc min.');
    if (
      !Array.isArray(raw.b) ||
      raw.b.length !== m ||
      !Array.isArray(raw.rel) ||
      raw.rel.length !== m ||
      !Array.isArray(raw.domains) ||
      raw.domains.length !== n
    )
      throw new Error('Kích thước dữ liệu không khớp.');
    if (
      raw.rel.some((s) => !['<=', '=', '>='].includes(s)) ||
      raw.domains.some((s) => !['pos', 'neg', 'free'].includes(s))
    )
      throw new Error('Quan hệ hoặc miền biến không hợp lệ.');
    const p = {
      n,
      m,
      title: String(raw.title || 'Bài toán quy hoạch tuyến tính').slice(0, 150),
      sense: raw.sense,
      c: raw.c.map(Q.parse),
      constant: Q.parse(raw.constant ?? '0'),
      b: raw.b.map(Q.parse),
      rel: raw.rel.slice(),
      domains: raw.domains.slice(),
      a: raw.a.map((r, i) => {
        if (!Array.isArray(r) || r.length !== n)
          throw new Error('Sai số hệ số ở ràng buộc ' + (i + 1));
        return r.map(Q.parse);
      }),
    };
    return p;
  }
  function rawProblem(p) {
    return {
      title: p.title,
      sense: p.sense,
      c: p.c.map(String),
      constant: String(p.constant),
      a: p.a.map((r) => r.map(String)),
      b: p.b.map(String),
      rel: p.rel.slice(),
      domains: p.domains.slice(),
    };
  }
  function value(p, x) {
    return p.c.reduce((v, c, j) => v.add(c.mul(x[j])), p.constant);
  }
  function feasible(p, x) {
    if (x.length !== p.n) return false;
    if (
      x.some(
        (v, j) =>
          (p.domains[j] === 'pos' && v.sign() < 0) || (p.domains[j] === 'neg' && v.sign() > 0)
      )
    )
      return false;
    return p.a.every((row, i) => {
      const s = row.reduce((v, a, j) => v.add(a.mul(x[j])), Z).cmp(p.b[i]);
      return p.rel[i] === '=' ? s === 0 : p.rel[i] === '<=' ? s <= 0 : s >= 0;
    });
  }
  const same = (a, b) => a.every((v, i) => v.eq(b[i]));
  class Limit extends Error {}
  class Solver {
    solve(raw, method = 'bigm', alternatives = true, options = {}) {
      this.p = raw.n !== undefined && raw.c[0] instanceof Q ? raw : parseProblem(raw);
      this.method = method;
      this.record = options.record !== false;
      if (!['bigm', 'two'].includes(method)) throw new Error('Phương pháp không hợp lệ.');
      this.deadline = options.deadline || Date.now() + 45000;
      this.pivots = 0;
      this.bland = false;
      this.visited = new Set();
      this.out = {
        p: this.p,
        method,
        status: null,
        multiplicity: 'unknown',
        notes: [],
        names: [],
        kinds: [],
        steps: [],
        pivots: 0,
        conclusion: '',
      };
      const r = this.out;
      try {
        this.normalize();
        const hasArt = this.art.some(Boolean);
        if (hasArt) {
          this.phase = method === 'two' ? 'phase1' : 'bigm';
          this.max = method === 'two' ? false : this.p.sense === 'max';
          this.cost = this.regularCosts();
          for (let j = 0; j < this.N; j++)
            this.cost[j] =
              method === 'two'
                ? new Cost(Z, this.art[j] ? O : Z)
                : this.art[j]
                  ? new Cost(this.max ? O.neg() : O, Z)
                  : this.cost[j];
          if (this.iterate(true, method === 'bigm') === 'infeasible') {
            r.status = 'infeasible';
            r.artificialSum = this.artSum();
            r.conclusion =
              'Tổng biến giả nhỏ nhất bằng ' +
              r.artificialSum +
              ' > 0. Miền ràng buộc của bài toán gốc rỗng.';
            return r;
          }
          this.cleanup();
        }
        this.phase = hasArt ? 'phase2' : 'direct';
        this.cost = this.regularCosts();
        this.max = this.p.sense === 'max';
        this.visited.clear();
        r.status = this.iterate(false, false);
        r.full = this.current();
        r.x = this.original(r.full);
        r.value = value(this.p, r.x);
        if (!feasible(this.p, r.x))
          throw new Error('Kiểm tra nội bộ: phương án không thỏa bài toán gốc.');
        if (r.status === 'unbounded') {
          r.conclusion =
            'Có phương án khả thi nhưng hàm mục tiêu không bị chặn ' +
            (this.max ? 'trên (+∞).' : 'dưới (−∞).') +
            ' Không có nghiệm tối ưu hữu hạn.';
          return r;
        }
        r.conclusion =
          'Mọi ước lượng Δⱼ trên các cột đang xét đều ' +
          (this.max ? '≥ 0' : '≤ 0') +
          '. Phương án hiện tại tối ưu.';
        if (alternatives) this.alternatives();
      } catch (e) {
        if (!(e instanceof Limit)) throw e;
        r.status = 'limit';
        r.conclusion = e.message + ' Chưa kết luận tối ưu, vô nghiệm hay không bị chặn.';
      }
      return r;
    }
    check() {
      if (Date.now() > this.deadline) throw new Limit('Đã chạm giới hạn 45 giây.');
      if (this.pivots >= 600) throw new Limit('Đã chạm giới hạn 600 phép đổi cơ sở.');
    }
    normalize() {
      const p = this.p,
        r = this.out,
        origins = [],
        signs = [];
      const add = (name, kind) => {
        r.names.push(name);
        r.kinds.push(kind);
      };
      p.domains.forEach((d, j) => {
        if (d === 'free') {
          add('x' + (j + 1) + '⁺', 'tách');
          origins.push(j);
          signs.push(O);
          add('x' + (j + 1) + '⁻', 'tách');
          origins.push(j);
          signs.push(O.neg());
          r.notes.push(
            'Biến tự do x' +
              (j + 1) +
              ': đặt x' +
              (j + 1) +
              ' = x' +
              (j + 1) +
              '⁺ − x' +
              (j + 1) +
              '⁻; cả hai biến mới ≥ 0.'
          );
        } else {
          add('x' + (j + 1) + (d === 'neg' ? '′' : ''), d === 'neg' ? 'đổi dấu' : 'gốc');
          origins.push(j);
          signs.push(d === 'neg' ? O.neg() : O);
          if (d === 'neg')
            r.notes.push('Đặt x' + (j + 1) + ' = −x' + (j + 1) + '′ với x' + (j + 1) + '′ ≥ 0.');
        }
      });
      const structural = origins.length,
        rel = p.rel.slice(),
        factor = p.b.map((b) => (b.sign() < 0 ? O.neg() : O));
      this.b = p.b.map((b, i) => {
        if (b.sign() < 0) {
          rel[i] = rel[i] === '<=' ? '>=' : rel[i] === '>=' ? '<=' : '=';
          r.notes.push(
            'Ràng buộc ' +
              (i + 1) +
              ': nhân hai vế với −1, quan hệ mới ' +
              rel[i] +
              ', vế phải = ' +
              b.neg() +
              '.'
          );
          return b.neg();
        }
        return b;
      });
      const slack = Array(p.m).fill(-1);
      rel.forEach((s, i) => {
        if (s !== '=') {
          slack[i] = r.names.length;
          add('x' + (r.names.length + 1), s === '<=' ? 'phụ' : 'dư');
          r.notes.push(
            'Ràng buộc ' +
              (i + 1) +
              ': ' +
              (s === '<=' ? 'cộng ' : 'trừ ') +
              r.names[slack[i]] +
              ' ≥ 0 để chuyển sang đẳng thức.'
          );
        }
      });
      const regular = r.names.length;
      this.basis = Array(p.m).fill(-1);
      const base = p.a.map((row, i) => {
        const a = zeros(regular);
        origins.forEach((j, k) => (a[k] = row[j].mul(signs[k]).mul(factor[i])));
        if (slack[i] >= 0) {
          a[slack[i]] = rel[i] === '<=' ? O : O.neg();
          if (rel[i] === '<=') this.basis[i] = slack[i];
        }
        return a;
      });
      for (let j = 0; j < regular; j++) {
        let row = -1,
          unit = true;
        for (let i = 0; i < p.m; i++)
          if (!base[i][j].zero()) {
            if (base[i][j].eq(O) && row < 0) row = i;
            else {
              unit = false;
              break;
            }
          }
        if (unit && row >= 0 && this.basis[row] < 0) this.basis[row] = j;
      }
      const artCols = [];
      this.basis.forEach((col, i) => {
        if (col < 0) {
          this.basis[i] = r.names.length;
          artCols.push(r.names.length);
          add('x' + (r.names.length + 1), 'giả');
          r.notes.push(
            'Ràng buộc ' +
              (i + 1) +
              ': thêm biến giả ' +
              r.names[this.basis[i]] +
              ' ≥ 0 để tạo cột đơn vị.'
          );
        }
      });
      this.N = r.names.length;
      this.c = zeros(this.N);
      this.map = Array.from({ length: p.n }, () => zeros(this.N));
      origins.forEach((j, k) => {
        this.c[k] = p.c[j].mul(signs[k]);
        this.map[j][k] = signs[k];
      });
      this.a = base.map((row, i) => {
        const a = zeros(this.N);
        row.forEach((v, j) => (a[j] = v));
        if (this.basis[i] >= regular) a[this.basis[i]] = O;
        return a;
      });
      this.art = Array(this.N).fill(false);
      artCols.forEach((j) => (this.art[j] = true));
      this.active = Array(this.N).fill(true);
      r.canonical = copy(this.a);
      r.rhs = this.b.slice();
      r.objective = this.c.slice();
      r.notes.push(
        'Tất cả các biến trong bảng đều không âm. Biến ngoài cơ sở bằng 0. Cột Aⱼ tương ứng với biến ghi dưới tên cột.'
      );
      r.notes.push(
        'Giữ chiều ' +
          p.sense.toUpperCase() +
          '. Dùng Δⱼ = Σ cᴮᵢaᵢⱼ − cⱼ: ' +
          (p.sense === 'max'
            ? 'MAX tối ưu khi Δⱼ ≥ 0; chọn Δⱼ âm nhỏ nhất.'
            : 'MIN tối ưu khi Δⱼ ≤ 0; chọn Δⱼ dương lớn nhất.')
      );
      if (artCols.length)
        r.notes.push(
          this.method === 'bigm'
            ? 'Phạt biến giả bằng ' +
                (p.sense === 'max' ? '−M' : '+M') +
                '. Với Δⱼ = δⱼ + ηⱼM, so sánh ηⱼ trước rồi δⱼ. M là ký hiệu, không thay bằng số hữu hạn.'
            : 'Pha I: W = tổng biến giả → MIN. Nếu W* > 0: vô nghiệm. Nếu W* = 0: khử biến giả rồi tối ưu f ở pha II.'
        );
    }
    regularCosts() {
      return this.c.map((c) => new Cost(Z, c));
    }
    artSum() {
      return this.b.reduce((s, b, i) => (this.art[this.basis[i]] ? s.add(b) : s), Z);
    }
    deltas() {
      return this.cost.map((c, j) =>
        this.basis.reduce((z, k, i) => z.add(this.cost[k].mul(this.a[i][j])), CZ).sub(c)
      );
    }
    objective() {
      return this.basis.reduce(
        (z, k, i) => z.add(this.cost[k].mul(this.b[i])),
        new Cost(Z, this.phase === 'phase1' ? Z : this.p.constant)
      );
    }
    improving(c) {
      return this.max ? c.cmp(CZ) < 0 : c.cmp(CZ) > 0;
    }
    iterate(feasibility, bigm) {
      while (true) {
        this.check();
        this.validateBasis();
        const key = this.basis.join(',');
        if (this.visited.has(key)) this.bland = true;
        this.visited.add(key);
        const d = this.deltas();
        if (feasibility && this.artSum().zero()) {
          if (!bigm || this.basis.some((j) => this.art[j]))
            this.capture(
              d,
              -1,
              -1,
              'Tổng biến giả bằng 0. Đã tìm được phương án khả thi của bài toán gốc.'
            );
          return 'optimal';
        }
        if (
          feasibility &&
          bigm &&
          !d.some(
            (v, j) =>
              this.active[j] && !this.art[j] && (this.max ? v.eta.sign() < 0 : v.eta.sign() > 0)
          )
        ) {
          this.capture(
            d,
            -1,
            -1,
            'Không thể giảm tiếp tổng biến giả; tổng biến giả = ' +
              this.artSum() +
              ' > 0. Bài toán gốc vô nghiệm.'
          );
          return 'infeasible';
        }
        let s = -1;
        for (let j = 0; j < this.N; j++)
          if (this.active[j] && !this.art[j] && this.improving(d[j])) {
            if (s < 0 || (!this.bland && (this.max ? d[j].cmp(d[s]) < 0 : d[j].cmp(d[s]) > 0)))
              s = j;
            if (this.bland) break;
          }
        if (s < 0) {
          if (feasibility && !this.artSum().zero()) {
            this.capture(d, -1, -1, 'W* = ' + this.artSum() + ' > 0. Bài toán vô nghiệm.');
            return 'infeasible';
          }
          this.capture(
            d,
            -1,
            -1,
            'Các Δⱼ đang xét đều ' +
              (this.max ? '≥ 0' : '≤ 0') +
              '. Điều kiện tối ưu được thỏa mãn.'
          );
          return 'optimal';
        }
        const row = this.leaving(s);
        if (row < 0) {
          if (feasibility) throw new Error('Lỗi nội bộ: hàm phụ không thể không bị chặn.');
          const ray = zeros(this.N);
          ray[s] = O;
          this.basis.forEach((k, i) => (ray[k] = this.a[i][s].neg()));
          this.out.ray = this.original(ray);
          this.capture(
            d,
            s,
            -1,
            'Cột A' +
              (s + 1) +
              ' cải thiện mục tiêu nhưng mọi aᵢₛ ≤ 0. Không có dòng ra; θ không bị chặn.'
          );
          return 'unbounded';
        }
        const theta = this.b[row].div(this.a[row][s]);
        const note =
          'Đưa A' +
          (s + 1) +
          ' (' +
          this.out.names[s] +
          ') vào cơ sở, Δ = ' +
          d[s] +
          '. ' +
          (this.bland
            ? 'Dùng Bland để tránh lặp cơ sở. '
            : 'Chọn ước lượng cải thiện mạnh nhất; nếu hòa, lấy chỉ số nhỏ nhất. ') +
          'θ = min{b̄ᵢ/aᵢₛ | aᵢₛ > 0} = ' +
          theta +
          '. A' +
          (this.basis[row] + 1) +
          ' ra cơ sở. Phần tử trục = ' +
          this.a[row][s] +
          '.' +
          (theta.zero() ? ' Bước thoái hóa (θ = 0): mục tiêu có thể chưa đổi.' : '');
        this.capture(d, s, row, note);
        this.pivot(row, s);
      }
    }
    leaving(s) {
      let r = -1,
        best = null;
      this.b.forEach((b, i) => {
        if (this.a[i][s].sign() > 0) {
          const t = b.div(this.a[i][s]);
          if (r < 0 || t.cmp(best) < 0 || (t.eq(best) && this.basis[i] < this.basis[r])) {
            r = i;
            best = t;
          }
        }
      });
      return r;
    }
    pivot(r, s) {
      this.check();
      const v = this.a[r][s];
      this.a[r] = this.a[r].map((a) => a.div(v));
      this.b[r] = this.b[r].div(v);
      this.a.forEach((row, i) => {
        if (i !== r) {
          const f = row[s];
          this.a[i] = row.map((a, j) => a.sub(f.mul(this.a[r][j])));
          this.b[i] = this.b[i].sub(f.mul(this.b[r]));
        }
      });
      if (this.art[this.basis[r]]) this.active[this.basis[r]] = false;
      this.basis[r] = s;
      this.out.pivots = ++this.pivots;
    }
    cleanup() {
      for (let i = 0; i < this.b.length; ) {
        this.check();
        if (!this.art[this.basis[i]]) {
          i++;
          continue;
        }
        if (!this.b[i].zero()) throw new Error('Biến giả còn dương khi kết thúc pha khả thi.');
        const s = this.a[i].findIndex((v, j) => !this.art[j] && !v.zero());
        if (s >= 0) {
          this.capture(
            this.deltas(),
            s,
            i,
            'Biến giả cơ sở bằng 0: dùng một hệ số khác 0 để đẩy biến giả ra. Đây là bước khử biến giả, không dùng phép thử tỷ số.',
            true
          );
          this.pivot(i, s);
          i++;
        } else {
          this.capture(
            this.deltas(),
            -1,
            -1,
            'Dòng ' + (i + 1) + ' trên các cột thực là 0 = 0. Loại ràng buộc phụ thuộc này.'
          );
          this.active[this.basis[i]] = false;
          this.a.splice(i, 1);
          this.b.splice(i, 1);
          this.basis.splice(i, 1);
        }
      }
      this.art.forEach((v, j) => {
        if (v) this.active[j] = false;
      });
      this.visited.clear();
    }
    current() {
      const x = zeros(this.N);
      this.basis.forEach((k, i) => (x[k] = this.b[i]));
      return x;
    }
    original(v) {
      return this.map.map((row) => row.reduce((sum, a, j) => sum.add(a.mul(v[j])), Z));
    }
    capture(delta, enter, leave, note, cleanup = false) {
      if (!this.record) return;
      this.out.steps.push({
        phase: this.phase,
        note,
        a: copy(this.a),
        b: this.b.slice(),
        basis: this.basis.slice(),
        active: this.active.slice(),
        cost: this.cost.slice(),
        delta,
        value: this.objective(),
        enter,
        leave,
        max: this.max,
        bland: this.bland,
        cleanup,
        theta: this.b.map((b, i) =>
          enter >= 0 && this.a[i][enter].sign() > 0 ? b.div(this.a[i][enter]) : null
        ),
      });
    }
    validateBasis() {
      this.basis.forEach((k, i) => {
        if (this.b[i].sign() < 0) throw new Error('Vế phải âm trong cơ sở khả thi.');
        this.a.forEach((row, t) => {
          if (!row[k].eq(i === t ? O : Z)) throw new Error('Cơ sở không phải ma trận đơn vị.');
        });
      });
    }
    alternatives() {
      const p = this.p,
        r = this.out;
      if (p.m >= 60) return;
      const face = rawProblem(p);
      face.a.push(p.c.map(String));
      face.b.push(String(r.value.sub(p.constant)));
      face.rel.push('=');
      face.constant = '0';
      try {
        for (let j = 0; j < p.n; j++)
          for (const sense of ['max', 'min']) {
            this.check();
            face.c = Array(p.n).fill('0');
            face.c[j] = '1';
            face.sense = sense;
            const other = new Solver().solve(face, 'two', false, {
              record: false,
              deadline: this.deadline,
            });
            if (other.status === 'limit') return;
            let candidate = null;
            if (other.status === 'unbounded') {
              candidate = other.x.map((v, k) => v.add(other.ray[k]));
              if (same(candidate, r.x)) candidate = candidate.map((v, k) => v.add(other.ray[k]));
            } else if (other.status === 'optimal' && !same(other.x, r.x)) candidate = other.x;
            else if (other.status !== 'optimal') throw new Error('Mặt tối ưu không khả thi.');
            if (candidate) {
              if (
                !feasible(p, candidate) ||
                !value(p, candidate).eq(r.value) ||
                same(candidate, r.x)
              )
                throw new Error('Nghiệm tối ưu thứ hai không hợp lệ.');
              r.alternate = candidate;
              r.multiplicity = 'multiple';
              return;
            }
          }
        r.multiplicity = 'unique';
      } catch (e) {
        if (!(e instanceof Limit)) throw e;
      }
    }
  }
  scope.LP = {
    Q,
    Z,
    O,
    Cost,
    CZ,
    Solver,
    parseProblem,
    rawProblem,
    value,
    feasible,
    revive,
    zeros,
  };
}
installLP(globalThis);
