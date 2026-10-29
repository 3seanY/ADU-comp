$ErrorActionPreference = 'Stop'
$artifactDir = $PSScriptRoot
$pages = Get-Content -LiteralPath (Join-Path $artifactDir 'report-content.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$output = Join-Path $artifactDir 'Family_AI_Game_Day_Project_Report.docx'
$qa = Join-Path $artifactDir 'report-qa'
$word = $null
$doc = $null
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $doc = $word.Documents.Add()
    $doc.PageSetup.PaperSize = 7
    $doc.PageSetup.TopMargin = 54
    $doc.PageSetup.BottomMargin = 54
    $doc.PageSetup.LeftMargin = 58
    $doc.PageSetup.RightMargin = 58
    $normal = $doc.Styles.Item(-1)
    $normal.Font.Name = 'Calibri'
    $normal.Font.Size = 12
    $normal.Font.Color = 0
    $normal.ParagraphFormat.SpaceAfter = 10
    $normal.ParagraphFormat.LineSpacingRule = 0
    $normal.ParagraphFormat.WidowControl = -1
    $titleStyle = $doc.Styles.Item(-63)
    $titleStyle.Font.Name = 'Calibri'
    $titleStyle.Font.Size = 26
    $titleStyle.Font.Bold = -1
    $titleStyle.Font.Color = 0
    $titleStyle.ParagraphFormat.SpaceAfter = 20
    $heading = $doc.Styles.Item(-2)
    $heading.Font.Name = 'Calibri'
    $heading.Font.Size = 22
    $heading.Font.Bold = -1
    $heading.Font.Color = 0
    $heading.ParagraphFormat.SpaceAfter = 18
    $heading.ParagraphFormat.KeepWithNext = -1
    $sub = $doc.Styles.Item(-3)
    $sub.Font.Name = 'Calibri'
    $sub.Font.Size = 13
    $sub.Font.Bold = -1
    $sub.Font.Color = 0
    $sub.ParagraphFormat.SpaceBefore = 8
    $sub.ParagraphFormat.SpaceAfter = 5
    $sub.ParagraphFormat.KeepWithNext = -1

    $parts = New-Object System.Collections.Generic.List[string]
    foreach ($page in $pages) {
        $blocks = New-Object System.Collections.Generic.List[string]
        $blocks.Add($page.title)
        foreach ($section in $page.sections) {
            $blocks.Add($section.heading)
            $blocks.Add($section.text.Replace("`n", "`r"))
        }
        $parts.Add(($blocks -join "`r"))
    }
    $doc.Content.Text = ($parts -join "`r`f") + "`r"
    $mainTitles = @($pages | ForEach-Object { $_.title })
    $subTitles = @($pages | ForEach-Object { $_.sections } | ForEach-Object { $_.heading })
    foreach ($paragraph in $doc.Paragraphs) {
        $text = $paragraph.Range.Text.Trim([char[]]"`r`f`n ")
        if ($text -eq $pages[0].title) { $paragraph.Range.Style = $titleStyle }
        elseif ($mainTitles -contains $text) { $paragraph.Range.Style = $heading }
        elseif ($subTitles -contains $text) { $paragraph.Range.Style = $sub }
    }
    $footer = $doc.Sections.Item(1).Footers.Item(1).Range
    $footer.Text = 'Family AI Game Day  |  '
    $footer.Font.Name = 'Calibri'
    $footer.Font.Size = 9
    $footer.Font.Color = 0
    $footer.ParagraphFormat.Alignment = 2
    $fieldRange = $footer.Duplicate
    $fieldRange.Collapse(0)
    $fieldRange.Fields.Add($fieldRange, 33) | Out-Null
    $doc.BuiltInDocumentProperties.Item('Title').Value = 'Family AI Game Day Project Report'
    $doc.BuiltInDocumentProperties.Item('Subject').Value = 'Project overview implementation and testing'
    $doc.BuiltInDocumentProperties.Item('Author').Value = ''
    $doc.Repaginate()
    $count = $doc.ComputeStatistics(2)
    if ($count -ne 6) { throw "Expected six pages; Word calculated $count." }
    $doc.SaveAs2($output, 16)
    $doc.ExportAsFixedFormat((Join-Path $qa 'report.pdf'), 17)
    $doc.ActiveWindow.View.Type = 3
    Add-Type -AssemblyName System.Drawing
    for ($i = 1; $i -le $count; $i++) {
        [byte[]]$bits = $doc.ActiveWindow.Panes.Item(1).Pages.Item($i).EnhMetaFileBits
        $stream = New-Object System.IO.MemoryStream(,$bits)
        $metafile = [System.Drawing.Image]::FromStream($stream)
        $width = 1000
        $height = [int]($width * $metafile.Height / $metafile.Width)
        $bitmap = New-Object System.Drawing.Bitmap($width, $height)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.Clear([System.Drawing.Color]::White)
        $graphics.DrawImage($metafile, 0, 0, $width, $height)
        $bitmap.Save((Join-Path $qa "page-$i.png"), [System.Drawing.Imaging.ImageFormat]::Png)
        $graphics.Dispose(); $bitmap.Dispose(); $metafile.Dispose(); $stream.Dispose()
    }
    Write-Output "Created $output"
    Write-Output "Verified pages: $count"
} finally {
    if ($null -ne $doc) { $doc.Close(0) }
    if ($null -ne $word) { $word.Quit() }
}
