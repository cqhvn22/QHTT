from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from lxml import etree
from copy import deepcopy
src=Path(r'C:/Users/chuqu/OneDrive/Desktop/Huong_dan_QHTT_va_ma_nguon.docx')
out=Path('output/Huong_dan_QHTT_bo_sung_thanh_vien.docx')
with ZipFile(src) as z: data={n:z.read(n) for n in z.namelist()}
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}; w='{'+ns['w']+'}'
root=etree.fromstring(data['word/document.xml']); body=root.find('w:body',ns)
old=[p for p in body.findall('w:p',ns) if ''.join(p.itertext()).startswith('- Thành viên ')]
assert len(old)==5
people=[('Khiếu Như Hoàng','2023606510'),('Nguyễn Mạnh Hùng','2024601533'),('Chu Quang Hưng','2024604669'),('Vũ Thị Hương','2024609007'),('Ngô Dương Huy','2023607754'),('Nguyễn Công Huy','2024603318'),('Nguyễn Xuân Huy','2024608036'),('Trần Duy Huy','2024607410')]
index=body.index(old[0]); template=deepcopy(old[0])
for p in old: body.remove(p)
for i,(name,id) in enumerate(people):
 p=deepcopy(template)
 for child in list(p):
  if child.tag!=w+'pPr': p.remove(child)
 r=etree.SubElement(p,w+'r'); rp=etree.SubElement(r,w+'rPr'); etree.SubElement(rp,w+'sz').set(w+'val','28'); etree.SubElement(rp,w+'color').set(w+'val','000000'); etree.SubElement(r,w+'t').text=f'- {name} - Mã sinh viên: {id}'
 body.insert(index+i,p)
data['word/document.xml']=etree.tostring(root,xml_declaration=True,encoding='UTF-8',standalone=True)
with ZipFile(out,'w',ZIP_DEFLATED) as z:
 for n,v in data.items(): z.writestr(n,v)
print('Updated 8 members')
