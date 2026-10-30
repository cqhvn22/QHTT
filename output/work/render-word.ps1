$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
 $doc = $word.Documents.Open((Join-Path $PWD 'output/Huong_dan_QHTT_va_ma_nguon.docx'), $false, $true)
 $doc.ExportAsFixedFormat((Join-Path $PWD 'output/work/preview.pdf'), 17)
 $doc.Close(0)
} finally { $word.Quit() }
