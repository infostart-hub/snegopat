:: ����� 䠩� �㦨� ��� ����祭�� ९������ ᭥����� � ��� ��᫥���饣� ����������,
:: �᫨ ��� 祬-� �� ���ࠨ���� (��� �� ����㯭�) �������� "����������" � ���� ᭥�����.
@echo off
set curdir=%cd%
cd /d "%~dp0..\.."

if not exist data mkdir data
if not exist repo mkdir repo
if not exist data\cntlm.ini copy nul data\cntlm.ini > nul
if not exist data\proxy.cmd start "" /w mshta.exe "%~dp0proxy.hta"
if exist data\proxy.cmd (
	call data\proxy.cmd
) else (
	copy nul data\proxy.cmd > nul
)
:: ����� � �ப�
if not "%useProxy%"=="true" goto :start
if "%proxyNtlm%"=="true" goto :ntlm
if "%proxyUser%"=="" (
	set proxyPass=
	goto :setproxy
)
set userDelim=@
set proxyUser=%proxyUser%:
if "%notStorePass%"=="false" goto :setproxy
if not exist %Windir%\System32\WindowsPowerShell\v1.0\Powershell.exe goto :vispwd
set "psCommand=powershell -Command "$pword = read-host '������ ��஫� ��� �ப�' -AsSecureString ; ^
$BSTR=[System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pword); ^
[System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)""
for /f "usebackq delims=" %%p in (`%psCommand%`) do set proxyPass=%%p
goto :setproxy
:vispwd
call:echocolor Red "�� �६� ����� ��஫� �㤥� ������!!!"
set /p proxyPass=������ ��஫� ��� �ப�: 
cls
goto :setproxy
:ntlm
set CYGWIN=nodosfilewarning
if "%notStorePass%"=="true" (
	set proxyPass=-I
	<nul set /p ksksk=Enter proxy 
) else (
	if not "%proxyPass%"=="" set proxyPass=-p "%proxyPass%"
)
core\tools\cntlm\cntlm -c data\cntlm.ini -s -a %ntlmAuth% -l %ntlmPort% %proxyPass% -u "%proxyUser%" %proxyAddress%
if errorlevel 1 (
	call:echocolor Red "�� 㤠���� �������� cntlm.exe"
	goto :end
)
call:echocolor DarkYellow "����饭 cntlm �ப� ��� %proxyAddress% �� ����� %ntlmPort%"
set proxyUser=
set proxyPass=
set proxyAddress=127.0.0.1:%ntlmPort%
:setproxy
set http_proxy=http://%proxyUser%%proxyPass%%userDelim%%proxyAddress%
if not "%proxyPass%"=="" set proxyPass=******
call:echocolor DarkYellow "http_proxy = http://%proxyUser%%proxyPass%%userDelim%%proxyAddress%"

:start

if not exist repo\sn.fossil goto :getLogin
goto :cloneCore
:getLogin
set name=$$$
set /p name="������ ����� �� snegopat.ru: "
if "%name%"=="$$$" (
	call:echocolor Red "�� 㪠��� �����"
	goto :end
)

:cloneCore
if exist repo\sn.fossil goto :openCore
echo.
call:echocolor Blue "�����஢���� ९������ ᭥�����"
call:echocolor Blue "----------------------------------"
core\tools\fossil clone "http://%name%@snegopat.ru/new" -A %name% repo\sn.fossil
if errorlevel 1 (
	echo.
	call:echocolor Red "----------------------------------------------------"
	call:echocolor Red "!!! �� 㤠���� �����஢��� ९����਩ �������� !!!"
	call:echocolor Red "----------------------------------------------------"
	goto :end
)

:openCore
cd core
if exist _fossil_ goto :updateCore
echo.
call:echocolor Blue "����⨥ ९������"
call:echocolor Blue "--------------------"
tools\fossil open ..\repo\sn.fossil
if errorlevel 1 (
	echo.
	call:echocolor Red "-----------------------------------------------"
	call:echocolor Red "!!! �� 㤠���� ������ �᭮���� ९����਩ !!!"
	call:echocolor Red "-----------------------------------------------"
	goto :end
)

:updateCore
echo.
if not exist ..\data\snegopat.pfl copy tools\start.pfl ..\data\snegopat.pfl > nul
call:echocolor Blue "���������� �᭮����� ९������"
call:echocolor Blue "--------------------------------"
tools\fossil set autosync off
:: ��� ��室���� ��������. Fossil � ��砥 �訡�� ������ � �ࢥ஬ �� �뤠�� �訡��� ��� �����襭��
:: � ������ ᮮ�饭�� � stderr. ���⮬� �� ⠪�� ���� ��ࠧ�� ����᪠�� fossil, �����뢠� �뢮� � ��६�����,
:: �� ����� ���⠬� ��� stdout � stderr, ������ � �⮣� � ��६����� stderr
for /f "tokens=*" %%a in ('tools\fossil pull ^3^>^&1 ^1^>^&2 ^2^>^&3^|tools\fecho') do set pullErrors=%%a
:: �᫨ ��஫� �� ��࠭﫨, fossil ����訢��� ���� ��஫�, �뢮�� ᮮ�饭�� � stderr
if "%pullErrors:~0,13%"=="password for" set pullErrors=
if not "%pullErrors%"=="" (
	echo.
	call:echocolor Red "%pullErrors%"
	echo.
	call:echocolor Red "--------------------------------------------------------------"
	call:echocolor Red "!!! �� 㤠���� ������� ���������� �� ���譥�� ९������ !!!"
	call:echocolor Red "--------------------------------------------------------------"
	tools\fossil set autosync on
	goto :end
)
echo.
tools\fossil update
if errorlevel 1 (
	echo.
	call:echocolor Red "---------------------------------------------------"
	call:echocolor Red "!!! �� 㤠���� �믮����� ���������� ९������ !!!"
	call:echocolor Red "---------------------------------------------------"
) else (
	echo.
	call:echocolor Green "--------------------------"
	call:echocolor Green "!!! �� ��諮 �ᯥ譮 !!!"
	call:echocolor Green "--------------------------"
)
tools\fossil set autosync on

:end
cd /d "%curdir%"
if "%proxyNtlm%"=="true" (
	taskkill /F /IM cntlm.exe >nul 2>&1
	call:echocolor DarkYellow "��⠭����� cntlm �ப�"
)
pause
exit /b

:echocolor
if exist %Windir%\System32\WindowsPowerShell\v1.0\Powershell.exe (
	%Windir%\System32\WindowsPowerShell\v1.0\Powershell.exe write-host -foregroundcolor %1 %2
) else (
	echo %2
)
goto:eof
