$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
 $doc = $word.Documents.Open((Join-Path $PWD 'output/Huong_dan_QHTT_bo_sung_thanh_vien.docx'), $false, $true)
 $doc.ExportAsFixedFormat((Join-Path $PWD 'output/work/members-preview.pdf'), 17)
 $doc.Close(0)
} finally { $word.Quit() }

