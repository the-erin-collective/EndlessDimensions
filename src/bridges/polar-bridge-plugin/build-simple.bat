@echo off
echo Building Polar Bridge Plugin (Simple Build)...

REM Create build directories
if not exist "build\libs" mkdir "build\libs"
if not exist "build\classes\java\main" mkdir "build\classes\java\main"

REM Add SLF4J to classpath (download if needed)
set CLASSPATH=%CLASSPATH%;libs\*

REM Compile Java sources
echo Compiling Java sources...
javac -d "build\classes\java\main" -cp "libs\*" src\main\java\com\moud\polar\*.java

REM Create JAR
echo Creating JAR...
jar cf "build\libs\moud-polar-bridge-1.0.0-BETA.jar" -C "build\classes\java\main" .

REM Copy plugin descriptor
echo Copying plugin descriptor...
copy "src\main\resources\plugin.json" "build\classes\java\main"

REM Create final JAR with resources
echo Creating final JAR with resources...
jar cf "build\libs\moud-polar-bridge-1.0.0-BETA.jar" -C "build\classes\java\main" .

echo Build completed!
echo Output: build\libs\moud-polar-bridge-1.0.0-BETA.jar
pause
