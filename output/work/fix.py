from docx import Document
from docx.oxml.ns import qn
p='output/Huong_dan_QHTT_va_ma_nguon.docx'
d=Document(p)
for e in [d.element,d.styles.element]:
 for b in list(e.iter(qn('w:pBdr'))): b.getparent().remove(b)
 for c in e.iter(qn('w:color')):
  c.set(qn('w:val'),'000000')
  for a in ['themeColor','themeTint','themeShade']:
   c.attrib.pop(qn('w:'+a),None)
d.save(p)
