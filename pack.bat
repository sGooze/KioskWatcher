@echo off
set SERVERDIR=\\rea-shed-00\deploy\

rem del ..\kioskwatcher.xpi
rem "C:\Program Files\7-Zip\7z.exe" a -r -tzip ..\kioskwatcher.xpi * -x!.gitignore -x!pack.bat -xr!.vscode\ -xr!deploy\ -xr!.git\
rem "C:\Program Files\7-Zip\7z.exe" l ..\kioskwatcher.xpi


rem powershell -noprofile -command "Copy-Item -Force .\.deploy\updatemanifest.json %SERVERDIR% "
rem powershell -noprofile -command ""Copy-Item -Force ".\web-ext-artifacts\rea_terminal_client-$(cat .\manifest.json | ConvertFrom-Json | select -ExpandProperty version)-an+fx.xpi" "%SERVERDIR%kioskaddon-v$(cat .\manifest.json | ConvertFrom-Json | select -ExpandProperty version).xpi" ""

cmd /c web-ext sign --api-key=user:16202113:430 --api-secret=b01abb72540efa0441e44ea9a99122e1ab6e3feb31d98d1a884453852c9d9455 --ignore-files ./pack.bat ./.deploy/ ./deploy.ps1
powershell -noprofile -executionpolicy bypass -file .\deploy.ps1