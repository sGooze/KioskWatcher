# Добавить новую (последнюю) версию в манифест

$deployServer = "https://intkiosk.rea.ru:2443/deploy/"
$deployDir = "\\rea-shed-00\deploy\"

$json = $null;
if (Test-Path .\.deploy\updatemanifest.json){
    $json = (Get-Content .\.deploy\updatemanifest.json | ConvertFrom-Json)
}
else{
    $json = @{
        "addons"=@{
            "intkiosk@rea"=@{
                "updates"=@()
            }
        }
    }
}

$version = (Get-Content .\manifest.json | ConvertFrom-Json | Select-Object -ExpandProperty version)
if (-not (Test-Path ".\web-ext-artifacts\rea_terminal_client-$version-an+fx.xpi")){
    throw "Новая версия дополнения не найдена! :("
}

$json.addons.'intkiosk@rea'.updates += @{
    version=$version;
    update_link="$($deployServer)kioskaddon-v$version.xpi"
}

ConvertTo-Json -InputObject $json -Depth 5 -Compress | Out-File -Encoding utf8 -Verbose .\.deploy\updatemanifest.json
Copy-Item -Verbose -Force .\.deploy\updatemanifest.json $deployDir
Copy-Item -Verbose -Force ".\web-ext-artifacts\rea_terminal_client-$version-an+fx.xpi" "$($deployDir)kioskaddon-v$version.xpi"
