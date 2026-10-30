from pathlib import Path
from pdf2image import convert_from_path,pdfinfo_from_path
from PIL import Image,ImageDraw
p=Path('output/work'); pop=r'C:/Users/chuqu/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin'
info=pdfinfo_from_path(str(p/'preview.pdf'),poppler_path=pop); print(info['Pages'])
out=p/'pages'; out.mkdir(exist_ok=True)
paths=convert_from_path(str(p/'preview.pdf'),dpi=75,output_folder=str(out),fmt='png',paths_only=True,poppler_path=pop,thread_count=4)
for batch in range(0,len(paths),24):
 sheet=Image.new('RGB',(1200,6*300),'#dddddd'); d=ImageDraw.Draw(sheet)
 for j,f in enumerate(paths[batch:batch+24]):
  im=Image.open(f); im.thumbnail((290,275)); x=(j%4)*300;y=(j//4)*300;sheet.paste(im,(x,y+22));d.text((x+4,y+4),str(batch+j+1),fill='black')
 sheet.save(p/f'contact-{batch//24+1}.png')
print('Rendered',len(paths),'pages')
