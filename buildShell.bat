cd /d %~dp0
::目标平台
set input=%1
::工作空间工程地址
set projectPath=%2
npm install&&npm run build&&node ./dist/index.js --input %input% --projectPath %projectPath%