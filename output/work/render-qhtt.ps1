$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
 $doc = $word.Documents.Open((Join-Path $PWD 'output/QHTT_da_chinh_sua.docx'), $false, $true)
 $doc.ExportAsFixedFormat((Join-Path $PWD 'output/work/qhtt-preview.pdf'), 17)
 $doc.Close(0)
} finally { $word.Quit() }

