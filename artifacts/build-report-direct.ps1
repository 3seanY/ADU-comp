$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$pages = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'report-content.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$output = Join-Path $PSScriptRoot 'Family_AI_Game_Day_Project_Report.docx'
function Escape-Xml([string]$text) { return [System.Security.SecurityElement]::Escape($text) }
function Paragraph([string]$text, [string]$style = 'Normal', [bool]$pageBreak = $false) {
    $break = if ($pageBreak) { '<w:pageBreakBefore/>' } else { '' }
    $runs = @($text -split "`n" | ForEach-Object { '<w:r><w:t xml:space="preserve">' + (Escape-Xml $_) + '</w:t></w:r>' }) -join '<w:r><w:br/></w:r>'
    return '<w:p><w:pPr><w:pStyle w:val="' + $style + '"/>' + $break + '</w:pPr>' + $runs + '</w:p>'
}
$body = New-Object System.Text.StringBuilder
for ($index = 0; $index -lt $pages.Count; $index++) {
    $style = if ($index -eq 0) { 'Title' } else { 'Heading1' }
    [void]$body.Append((Paragraph $pages[$index].title $style ($index -gt 0)))
    foreach ($section in $pages[$index].sections) {
        [void]$body.Append((Paragraph $section.heading 'Heading2'))
        [void]$body.Append((Paragraph $section.text))
    }
}
$document = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>' + $body.ToString() + '<w:sectPr><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1080" w:right="1160" w:bottom="1080" w:left="1160" w:header="540" w:footer="540"/><w:cols w:space="720"/></w:sectPr></w:body></w:document>'
$styles = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:color w:val="000000"/><w:sz w:val="24"/><w:lang w:val="en-GB"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="180" w:line="250" w:lineRule="auto"/><w:widowControl/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:after="360"/></w:pPr><w:rPr><w:b/><w:color w:val="000000"/><w:sz w:val="48"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:after="320"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="000000"/><w:sz w:val="42"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="120" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="000000"/><w:sz w:val="27"/></w:rPr></w:style>
</w:styles>
'@
$footer = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">Family AI Game Day  |  </w:t></w:r><w:fldSimple w:instr="PAGE"><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>
'@
$entries = @{
    '[Content_Types].xml' = '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>'
    '_rels/.rels' = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdDocument" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rIdCore" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'
    'word/document.xml' = $document
    'word/styles.xml' = $styles
    'word/footer1.xml' = $footer
    'word/_rels/document.xml.rels' = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>'
    'docProps/core.xml' = '<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Family AI Game Day Project Report</dc:title><dc:subject>Project overview implementation and testing</dc:subject><dc:description>Six section project report</dc:description></cp:coreProperties>'
}
$file = [System.IO.File]::Open($output, [System.IO.FileMode]::Create)
$zip = New-Object System.IO.Compression.ZipArchive($file, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($name in $entries.Keys) {
        [xml]$validateXml = $entries[$name]
        $entry = $zip.CreateEntry($name)
        $stream = $entry.Open()
        $bytes = [System.Text.UTF8Encoding]::new($false).GetBytes($entries[$name])
        $stream.Write($bytes, 0, $bytes.Length)
        $stream.Dispose()
    }
} finally { $zip.Dispose(); $file.Dispose() }
$verify = [System.IO.Compression.ZipFile]::OpenRead($output)
try {
    $reader = [System.IO.StreamReader]::new($verify.GetEntry('word/document.xml').Open())
    [xml]$xml = $reader.ReadToEnd()
    $reader.Dispose()
    $ns = [System.Xml.XmlNamespaceManager]::new($xml.NameTable)
    $ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
    if ($xml.SelectNodes('//w:pageBreakBefore', $ns).Count -ne 5) { throw 'Page break validation failed' }
    if ($xml.SelectNodes('//w:pStyle[@w:val="Heading1"]', $ns).Count -ne 5) { throw 'Heading validation failed' }
    Write-Output 'Validated DOCX package and six explicit page sections.'
    Write-Output $output
} finally { $verify.Dispose() }
