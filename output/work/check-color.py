from pdf2image import convert_from_path
from PIL import Image
pop=r'C:/Users/chuqu/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin'
canvas=Image.new('RGB',(1800,850),'white')
for i,n in enumerate([3,5,6]):
 im=convert_from_path('output/work/preview.pdf',dpi=90,first_page=n,last_page=n,poppler_path=pop)[0]
 im.thumbnail((600,850));canvas.paste(im,(600*i,0))
canvas.save('output/work/color-check.png')
