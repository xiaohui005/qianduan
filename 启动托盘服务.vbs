Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "pythonw.exe tray_app.py", 0, False
Set WshShell = Nothing
