@echo off
del ..\kioskwatcher.xpi
"C:\Program Files\7-Zip\7z.exe" a -r -tzip ..\kioskwatcher.xpi * -x!pack.bat
"C:\Program Files\7-Zip\7z.exe" l ..\kioskwatcher.xpi

