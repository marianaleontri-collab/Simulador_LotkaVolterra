$pptxPath = "C:\Users\HP\OneDrive\Documents\Universidad\5 Semestre\EcoFlux\presentacion\EcoFlux_Presentacion.pptx"
$pdfPath  = "C:\Users\HP\OneDrive\Documents\Universidad\5 Semestre\EcoFlux\presentacion\EcoFlux_Presentacion.pdf"

$pptApp = New-Object -ComObject PowerPoint.Application
try {
    # 32 = ppSaveAsPDF
    # Open: FileName, ReadOnly, Untitled, WithWindow
    $presentation = $pptApp.Presentations.Open($pptxPath, 2, 0, 0)
    $presentation.SaveAs($pdfPath, 32)
    $presentation.Close()
    Write-Output "PDF_EXPORT_OK: $pdfPath"
}
finally {
    $pptApp.Quit()
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}
