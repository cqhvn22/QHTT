/* Examples 1–3 follow Bai2.pdf, slides 20, 29 and 34. */
window.EXAMPLES = (() => {
  const make = (title, c, a, b, rel, sense = 'max', domains = null) => ({
    title,
    c: c.split(' '),
    a: a.map((r) => r.split(' ')),
    b: b ? b.split(' ') : [],
    rel: rel.split('').map((v) => ({ L: '<=', E: '=', G: '>=' })[v]),
    sense,
    constant: '0',
    domains: domains || c.split(' ').map(() => 'pos'),
  });
  return [
    make('01 · Kế hoạch sản xuất', '4 5', ['2 1', '1 2', '0 1'], '8 7 3', 'LLL'),
    make(
      '02 · Chính tắc — phương pháp M',
      '2 1 -1 -1',
      ['1 -1 2 -1', '2 1 -3 1', '1 1 1 1'],
      '2 6 7',
      'EEE'
    ),
    make(
      '03 · Ràng buộc hỗn hợp ≤, =, ≥',
      '1 4 -3',
      ['2 1 3', '4 -3 -2', '1 2 -1'],
      '7 9 2',
      'LGE'
    ),
    make('04 · Tối thiểu hóa với ràng buộc ≥', '2 3', ['1 1', '1 3'], '4 6', 'GG', 'min'),
    make(
      '05 · Biến tự do và biến không dương',
      '1 -1',
      ['1 1', '-1 0', '0 -1'],
      '2 1 2',
      'ELL',
      'max',
      ['free', 'neg']
    ),
    make('06 · Ràng buộc có vế phải âm', '1', ['-1', '1'], '-2 5', 'LL'),
    make('07 · Bài toán vô nghiệm', '1', ['1', '1'], '1 2', 'LG'),
    make('08 · Hàm mục tiêu không bị chặn', '1 1', ['1 -1'], '1', 'G'),
    make('09 · Vô số nghiệm tối ưu', '1 1', ['1 1'], '4', 'L'),
    make('10 · Ràng buộc phụ thuộc', '1 1', ['1 1', '2 2'], '2 4', 'EE'),
    make(
      '11 · Suy biến và chống chu trình',
      '10 -57 -9 -24',
      ['1/2 -11/2 -5/2 9', '1/2 -3/2 -1/2 1', '1 0 0 0'],
      '0 0 1',
      'LLL'
    ),
    make(
      '12 · Đề cương, ví dụ 2.5 — theo đề gốc',
      '3 -1 -2',
      ['-1 3 1', '3 -4 8', '4 -2 0'],
      '7 10 12',
      'LLL'
    ),
  ];
})();

// Chọn ngẫu nhiên, không lặp lại bài vừa nạp. Tên nội bộ không đưa lên giao diện.
window.randomExample = (previousIndex = -1) => {
  const candidates = EXAMPLES.map((_, index) => index).filter(
    (index) => EXAMPLES.length === 1 || index !== previousIndex
  );
  const index = candidates[Math.floor(Math.random() * candidates.length)];
  const problem = JSON.parse(JSON.stringify(EXAMPLES[index]));
  problem.title = 'Bài toán mẫu';
  return { index, problem };
};

// Mẫu hai biến dùng riêng cho chế độ hình học.
window.GEOMETRY_EXAMPLES = [
  {
    c: ['2', '5'],
    a: [
      ['1', '2'],
      ['2', '1'],
      ['0', '1'],
    ],
    b: ['8', '10', '3'],
    rel: ['<=', '<=', '<='],
    sense: 'max',
  },
  {
    c: ['2', '5'],
    a: [
      ['1', '2'],
      ['2', '1'],
      ['0', '1'],
      ['1', '0'],
      ['0', '1'],
    ],
    b: ['8', '10', '3', '8', '7'],
    rel: ['>=', '>=', '>=', '<=', '<='],
    sense: 'min',
  },
  { c: ['1', '1'], a: [['1', '1']], b: ['4'], rel: ['<='], sense: 'max' },
  { c: ['1', '1'], a: [['1', '-1'], ['1', '1']], b: ['1', '6'], rel: ['>=', '<='], sense: 'max' },
  {
    c: ['1', '2'],
    a: [
      ['1', '1'],
      ['1', '1'],
    ],
    b: ['6', '3'],
    rel: ['<=', '>='],
    sense: 'min',
  },
  { c: ['3', '1'], a: [['1', '1']], b: ['4'], rel: ['='], sense: 'min' },
];
window.randomGeometryExample = (previousIndex = -1) => {
  const pool = GEOMETRY_EXAMPLES.map((_, i) => i).filter((i) => i !== previousIndex);
  const index = pool[Math.floor(Math.random() * pool.length)];
  return {
    index,
    problem: {
      title: 'Bài toán mẫu',
      constant: '0',
      domains: ['pos', 'pos'],
      ...JSON.parse(JSON.stringify(GEOMETRY_EXAMPLES[index])),
    },
  };
};
