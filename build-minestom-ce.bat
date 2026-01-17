@echo off
cd /d "d:\dev\github\EndlessDimensions\libs\minestom-ce-extensions"
call "d:\dev\github\EndlessDimensions\gradlew.bat" clean build publishToMavenLocal --console=plain
cd /d "d:\dev\github\EndlessDimensions"
