from pathlib import Path
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from PIL import Image
root=Path.cwd(); work=root/'output/work'; doc=Document()
s=doc.sections[0]; s.page_width=Cm(21); s.page_height=Cm(29.7); s.top_margin=s.bottom_margin=Cm(2); s.left_margin=s.right_margin=Cm(2)
for name in ['Normal','Title','Heading 1','Heading 2','Caption']:
 st=doc.styles[name]; st.font.name='Times New Roman'; st.font.size=Pt(14); st.font.color.rgb=RGBColor(0,0,0)
 st.paragraph_format.first_line_indent=Cm(1.27); st.paragraph_format.space_after=Pt(6)
 st.paragraph_format.line_spacing=1.15
for name in ['Title','Heading 1','Heading 2']: doc.styles[name].font.bold=True
code=doc.styles.add_style('Ma nguon',1); code.font.name='Consolas'; code.font.size=Pt(14); code.font.color.rgb=RGBColor(0,0,0)
code.paragraph_format.first_line_indent=Cm(1.27); code.paragraph_format.space_after=Pt(0); code.paragraph_format.line_spacing=1
code.paragraph_format.widow_control=False
# Allow long source strings to wrap without inserting characters.
settings=doc.settings.element; compat=settings.find(qn('w:compat'))
if compat is None: compat=OxmlElement('w:compat'); settings.append(compat)
compat.append(OxmlElement('w:doNotUseHTMLParagraphAutoSpacing'))
def p(t='',style=None): return doc.add_paragraph(t,style)
def h(t): return p(t,'Heading 1')
def page(): doc.add_page_break()
def pic(name,caption):
 im=Image.open(work/name).convert('L'); dest=work/('bw-'+name); im.save(dest)
 a=p(); a.paragraph_format.first_line_indent=Cm(1.27); a.add_run().add_picture(str(dest),width=Cm(15.4)); a.paragraph_format.keep_with_next=True
 p(caption,'Caption')
for t in ['TRƯỜNG ................................................','KHOA ....................................................','LỚP .......................................................']: p(t)
p('HƯỚNG DẪN CÀI ĐẶT VÀ SỬ DỤNG','Title'); p('WEBSITE GIẢI QUY HOẠCH TUYẾN TÍNH','Title')
p('Kèm toàn bộ mã nguồn sản phẩm')
p('Tên nhóm: ........................................................')
p('Thành viên tham gia nhóm','Heading 1')
for i in range(1,6): p(f'- Thành viên {i}: ..................................................\n  Mã sinh viên: ....................................................')
p('Giảng viên: ......................................................'); p('Ngày nộp: ........ / ........ / ................')
page(); h('1 Giới thiệu sản phẩm')
p('Website QHTT dùng để nhập và giải bài toán quy hoạch tuyến tính. Tài liệu hướng dẫn mở chương trình trên máy tính, nhập bài toán, xem lời giải, lưu dữ liệu và in kết quả. Phần cuối chứa toàn bộ mã nguồn của sản phẩm.')
p('- Đơn hình: hỗ trợ bài toán Max hoặc Min, từ 1 đến 20 biến và tối đa 40 ràng buộc.')
p('- Hình học: dùng cho bài toán có đúng 2 biến và miền nghiệm bị chặn.')
p('- Cho phép nhập số nguyên, số thập phân, phân số và chọn miền của từng biến. Không hỗ trợ biến nguyên, biến nhị phân hoặc hàm phi tuyến.')
h('2 Cài đặt và mở chương trình')
p('- Bước 1: Sao chép hoặc giải nén toàn bộ thư mục DonHinhWeb vào máy tính.')
p('+ Giữ nguyên tệp index.html và hai thư mục css, js cùng cấp. Không chỉ sao chép riêng tệp index.html.')
p('- Bước 2: Nhấp chuột phải vào index.html, chọn Open with và chọn Microsoft Edge hoặc Google Chrome.')
p('- Bước 3: Kiểm tra trang hiển thị khung Bài toán và khung Lời giải. Trình duyệt phải cho phép JavaScript hoạt động.')
p('- Chương trình chạy trực tiếp trong trình duyệt, không cần cài cơ sở dữ liệu, máy chủ hoặc thư viện bổ sung. Các tài nguyên dùng để chạy đã nằm trong thư mục sản phẩm.')
p('- Sau khi đã có đủ tệp, có thể sử dụng ngoại tuyến. Khi chuyển sang máy khác, sao chép cả thư mục sản phẩm.')
page(); h('3 Làm quen với giao diện'); pic('01-giao-dien.png','Hình 1 Giao diện khi mở chương trình')
p('- Bên trái là vùng nhập dữ liệu: phương pháp, tiêu đề, số biến, số ràng buộc, hàm mục tiêu và điều kiện ràng buộc.')
p('- Bên phải là vùng lời giải và nút In / lưu PDF. Thanh trên cùng có Mở bài, Lưu và Tự động lưu.')
p('- Nhấn dấu + hoặc Bài mới để mở một tab bài toán trống. Nhấn Tạo bài mẫu nếu muốn thử nhanh; sau đó nhấn Giải.')
p('- Có thể kéo thanh ngăn giữa hai vùng để thay đổi độ rộng. Nhấp đúp thanh ngăn để đặt lại.')
page(); h('4 Nhập và giải một bài toán')
p('Ví dụ: Tìm Max f = 3x1 + 2x2 với x1 + x2 ≤ 4, x1 ≤ 2, x2 ≤ 3 và x1, x2 ≥ 0.')
p('- Bước 1: Chọn phương pháp Đơn hình, nhập tiêu đề Ví dụ hướng dẫn.')
p('- Bước 2: Đặt Số biến là 2, Ràng buộc là 3 rồi nhấn Áp dụng.')
p('- Bước 3: Chọn Max. Nhập hàng hệ số mục tiêu lần lượt là 3 và 2. Chọn miền của cả hai biến là ≥ 0.')
p('- Bước 4: Nhập các dòng ràng buộc theo thứ tự hệ số x1, hệ số x2, dấu và vế phải bᵢ.')
p('+ Dòng 1: 1, 1, ≤, 4.')
p('+ Dòng 2: 1, 0, ≤, 2.')
p('+ Dòng 3: 0, 1, ≤, 3.')
p('- Bước 5: Nhấn Giải hoặc Ctrl + Enter. Kết quả đúng của ví dụ là x1 = 2, x2 = 2 và f tối ưu = 10.')
p('- Dùng 0 cho hệ số không có. Phân số nhập dạng 3/7; số thập phân nhập dạng 0.5. Không nhập tên biến vào ô hệ số.')
p('- Nếu cần, chọn Min, thay dấu ràng buộc hoặc đổi miền biến thành ≤ 0 hay Tự do theo đề bài. Có thể thêm ràng buộc hoặc xóa dòng cuối bằng nút tương ứng.')
p('- Khi sửa dữ liệu, nhấn Giải lần nữa để cập nhật lời giải. Nhấn Dừng nếu muốn ngừng phép tính đang chạy.')
page(); h('5 Đọc kết quả đơn hình'); pic('02-don-hinh.png','Hình 2 Nhập ví dụ và xem kết quả đơn hình')
p('- Phần đầu hiển thị giá trị tối ưu, nghiệm tối ưu và số lần đổi cơ sở. Cuộn vùng lời giải để xem phần chuẩn hóa, các bảng tính và kết luận.')
p('- Nếu kết quả là vô nghiệm, kiểm tra lại ràng buộc và điều kiện dấu. Nếu hàm mục tiêu không bị chặn, bài toán không có nghiệm tối ưu hữu hạn.')
p('- Nếu chương trình thông báo chạm giới hạn tính toán, chưa thể kết luận bài toán tối ưu, vô nghiệm hay không bị chặn. Hãy kiểm tra hoặc đơn giản hóa dữ liệu.')
page(); h('6 Sử dụng phương pháp hình học'); pic('04-do-thi.png','Hình 3 Đồ thị miền nghiệm của bài toán ví dụ')
p('- Giữ dữ liệu ví dụ, chọn Hình học (2 biến), nhấn Giải rồi cuộn đến đồ thị. Kết quả vẫn là (2; 2), giá trị tối ưu 10.')
p('- Cuộn chuột để thu phóng; kéo đồ thị để di chuyển; bấm điểm hoặc đường thẳng để xem thông tin. Nhấn Vừa khung để đặt lại vùng nhìn.')
p('- Nhấn Tạm dừng hoặc kéo thanh a để điều khiển đường mức. Nhấn Đường mức tối ưu để xem vị trí tối ưu.')
p('- Phương pháp này yêu cầu đúng 2 biến. Nếu miền nghiệm không bị chặn, chương trình thông báo và không hiển thị lời giải hình học; có thể chuyển sang Đơn hình để giải.')
page(); h('7 Lưu mở và in kết quả')
p('- Lưu bài: nhấn Lưu để tải tệp JSON của tab hiện tại về máy. Tệp lưu đề bài và phương pháp, không phải bản in lời giải.')
p('- Mở lại: nhấn Mở bài, chọn tệp JSON đã lưu. Bài toán được mở trong tab mới; nhấn Giải để tính kết quả.')
p('- Tự động lưu: đánh dấu Tự động lưu để giữ các tab và dữ liệu nhập trên trình duyệt hiện tại.')
p('+ Mở lại bằng cùng trình duyệt và cùng địa chỉ ứng dụng. Lời giải cần được tính lại bằng nút Giải.')
p('+ Tắt tùy chọn sẽ xóa bản lưu tự động nhưng giữ các tab đang mở. Nên dùng Lưu để có bản JSON riêng khi cần chuyển máy hoặc sao lưu.')
p('- In hoặc lưu PDF: giải bài toán trước, nhấn In / lưu PDF, chọn máy in hoặc Save as PDF trong hộp thoại in rồi xác nhận.')
p('- Quản lý tab: bấm tên tab để chuyển bài; nhấn × để đóng tab; nhấn ↶ để mở lại tab vừa đóng. Chương trình giữ tối đa 10 tab đã đóng để mở lại.')
h('8 Xử lý một số lỗi thường gặp')
p('- Trang mất bố cục hoặc nút không chạy: kiểm tra thư mục css, js có đi kèm index.html hay không, rồi mở lại bằng trình duyệt.')
p('- Báo dữ liệu không hợp lệ: kiểm tra ô trống, phân số có mẫu bằng 0, dấu quan hệ, số biến và số ràng buộc.')
p('- Không tạo được bộ tính toán nền: mở bằng trình duyệt có hỗ trợ Web Worker và cho phép chạy JavaScript.')
p('- Không khôi phục được bài: kiểm tra đã bật Tự động lưu và đang dùng đúng trình duyệt, đúng địa chỉ. Nếu có tệp JSON, dùng Mở bài để nạp lại.')
p('- Nút In / lưu PDF chưa dùng được: nhấn Giải và đợi lời giải hoàn tất trước khi in.')
page(); h('9 Toàn bộ mã nguồn sản phẩm')
p('Mã nguồn được chép theo từng tệp bên dưới, gồm HTML, CSS và JavaScript. Tệp math-fonts.js chứa cả dữ liệu phông chữ nhúng. Các ký tự, nội dung và thứ tự dòng của từng tệp được giữ nguyên; dòng dài được Word tự xuống dòng khi hiển thị.')
files=[root/'index.html',root/'css/style.css']+sorted((root/'js').glob('*.js'))
for f in files: p('- '+f.relative_to(root).as_posix())
manifest=[]
for f in files:
 page(); h(f.relative_to(root).as_posix())
 text=f.read_text(encoding='utf-8-sig'); lines=text.splitlines()
 for line in lines: p(line,'Ma nguon')
 manifest.append((f.relative_to(root).as_posix(),len(lines)))
footer=s.footer.paragraphs[0]; footer.alignment=WD_ALIGN_PARAGRAPH.CENTER; footer.paragraph_format.first_line_indent=Cm(0)
r=footer.add_run(); fld=OxmlElement('w:fldSimple'); fld.set(qn('w:instr'),'PAGE'); r._r.addnext(fld)
doc.core_properties.title='Hướng dẫn cài đặt và sử dụng website giải quy hoạch tuyến tính'; doc.core_properties.author=''
out=root/'output/Huong_dan_QHTT_va_ma_nguon.docx'; doc.save(out)
# Verify exact source lines and the requested formatting.
loaded=Document(out); actual=[x.text for x in loaded.paragraphs if x.style.name=='Ma nguon']; expected=[]
for f in files: expected.extend(f.read_text(encoding='utf-8-sig').splitlines())
assert actual==expected
assert all(loaded.styles[n].font.size.pt==14 for n in ['Normal','Title','Heading 1','Caption','Ma nguon'])
assert not any('•' in x.text for x in loaded.paragraphs if x.style.name!='Ma nguon')
print(out); print(manifest); print('Verified source lines:',len(actual))
