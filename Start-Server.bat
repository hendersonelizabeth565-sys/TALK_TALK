@echo off
echo Starting TalkTalk Login Server...
start cmd /k "cd /d %~dp0 && npm start"
timeout /t 2 /nobreak
start http://localhost:8000
