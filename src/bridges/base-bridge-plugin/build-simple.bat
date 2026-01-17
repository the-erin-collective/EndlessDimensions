@echo off
echo Building Base Bridge Plugin with simple javac...

REM Create build directories
if not exist build\libs mkdir build\libs
if not exist build\classes mkdir build\classes

REM Compile Java files
echo Compiling Java source files...
dir /s /b src\main\java\*.java > sources.txt
javac -d build\classes -cp "libs\*" @sources.txt

REM Create JAR
echo Creating JAR file...
cd build\classes
jar cf ..\libs\moud-base-bridge-1.0.0-BETA.jar .
cd ..\..

REM Copy libs to JAR (manual shading simulation)
echo Adding dependencies to JAR...
cd build\libs
jar uf moud-base-bridge-1.0.0-BETA.jar ..\..\..\libs\*.jar
cd ..\..

echo Build complete! JAR created at build\libs\moud-base-bridge-1.0.0-BETA.jar

REM Cleanup
del sources.txt
