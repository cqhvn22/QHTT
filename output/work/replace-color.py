from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from lxml import etree
p=Path('output/Huong_dan_QHTT_va_ma_nguon.docx')
with ZipFile(p) as z: data={n:z.read(n) for n in z.namelist()}
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
doc=etree.fromstring(data['word/document.xml']); rel=etree.fromstring(data['word/_rels/document.xml.rels']); targets={e.get('Id'):e.get('Target') for e in rel}
blips=doc.findall('.//a:blip',ns)
assert len(blips)==3
for b,f in zip(blips,['01-giao-dien.png','02-don-hinh.png','04-do-thi.png']):
 target=targets[b.get('{'+ns['r']+'}embed')]
 data['word/'+target]=Path('output/work',f).read_bytes()
with ZipFile(p,'w',ZIP_DEFLATED) as z:
 for n,v in data.items(): z.writestr(n,v)
print('Replaced three illustrations with fresh color screenshots; all text unchanged.')
