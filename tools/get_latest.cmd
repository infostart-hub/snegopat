<!-- :
:: Данный файл служит для получения репозитария снегопата и его последующего обновления,
:: если вас чем-то не устраивает (или не доступна) закладка "Обновление" в окне снегопата.
@echo off
if "%1"=="proxy" (
	start "" mshta.exe "%~f0"
	exit /b
)
set curdir=%cd%
cd /d "%~dp0..\.."

if not exist data mkdir data
if not exist repo mkdir repo
if not exist data\cntlm.ini copy nul data\cntlm.ini > nul
if not exist data\proxy.cmd start "" /w mshta.exe "%~f0"
if exist data\proxy.cmd (
	call data\proxy.cmd
) else (
	copy nul data\proxy.cmd > nul
)
:: Работа с прокси
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
set "psCommand=powershell -Command "$pword = read-host 'Укажите пароль для прокси' -AsSecureString ; ^
$BSTR=[System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pword); ^
[System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)""
for /f "usebackq delims=" %%p in (`%psCommand%`) do set proxyPass=%%p
goto :setproxy
:vispwd
call:echocolor Red "Во время ввода пароль будет видимым!!!"
set /p proxyPass=Введите пароль для прокси: 
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
	call:echocolor Red "Не удалось запустить cntlm.exe"
	goto :end
)
call:echocolor DarkYellow "Запущен cntlm прокси для %proxyAddress% на порту %ntlmPort%"
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
set /p name="Укажите логин на snegopat.ru: "
if "%name%"=="$$$" (
	call:echocolor Red "Не указан логин"
	goto :end
)

:cloneCore
if exist repo\sn.fossil goto :openCore
echo.
call:echocolor Blue "Клонирование репозитария снегопата"
call:echocolor Blue "----------------------------------"
core\tools\fossil clone "http://%name%@snegopat.ru/reborn" -A %name% repo\sn.fossil
if errorlevel 1 (
	echo.
	call:echocolor Red "----------------------------------------------------"
	call:echocolor Red "!!! Не удалось клонировать репозитарий Снегопата !!!"
	call:echocolor Red "----------------------------------------------------"
	goto :end
)

:openCore
cd core
if exist _fossil_ goto :updateCore
echo.
call:echocolor Blue "Открытие репозитария"
call:echocolor Blue "--------------------"
tools\fossil open ..\repo\sn.fossil
if errorlevel 1 (
	echo.
	call:echocolor Red "-----------------------------------------------"
	call:echocolor Red "!!! Не удалось открыть основной репозитарий !!!"
	call:echocolor Red "-----------------------------------------------"
	goto :end
)

:updateCore
echo.
call:echocolor Blue "Обновление основного репозитария"
call:echocolor Blue "--------------------------------"
tools\fossil set autosync off
:: Тут приходится извращатся. Fossil в случае ошибок обмена с сервером не выдает ошибочный код завершения
:: а кидает сообщения в stderr. Поэтому мы таким хитрым образом запускаем fossil, записывая вывод в переменную,
:: но меняя местами его stdout и stderr, получая в итоге в переменную stderr
for /f "tokens=*" %%a in ('tools\fossil pull ^3^>^&1 ^1^>^&2 ^2^>^&3') do set pullErrors=%%a
if not "%pullErrors%"=="" (
	echo.
	call:echocolor Red "%pullErrors%"
	echo.
	call:echocolor Red "--------------------------------------------------------------"
	call:echocolor Red "!!! Не удалось получить обновление из внешнего репозитария !!!"
	call:echocolor Red "--------------------------------------------------------------"
	tools\fossil set autosync on
	goto :end
)
echo.
tools\fossil update
if errorlevel 1 (
	echo.
	call:echocolor Red "---------------------------------------------------"
	call:echocolor Red "!!! Не удалось выполнить обновление репозитария !!!"
	call:echocolor Red "---------------------------------------------------"
) else (
	echo.
	call:echocolor Green "--------------------------"
	call:echocolor Green "!!! Все прошло успешно !!!"
	call:echocolor Green "--------------------------"
)
tools\fossil set autosync on

:end
cd /d "%curdir%"
if "%proxyNtlm%"=="true" (
	taskkill /F /IM cntlm.exe >nul 2>&1
	call:echocolor DarkYellow "Остановлен cntlm прокси"
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
-->
<html>
<head>
<meta charset="cp866">
<title>Настройки прокси сервера для fossil</title>
<HTA:APPLICATION ID="myapp"
     APPLICATIONNAME="get_latest"
     BORDER="thick"
     BORDERSTYLE="normal"
     CAPTION="yes"
     ICON=""
     contextmenu="no"
     scroll="auto"
     MAXIMIZEBUTTON="no"
     MINIMIZEBUTTON="no"
     SHOWINTASKBAR="no"
     SINGLEINSTANCE="no"
     SYSMENU="yes"
     VERSION="20160707"
     WINDOWSTATE="normal"/>
<style>
body, input, table {
	font-family: Helvetica, arial, freesans, clean, sans-serif;
	font-size: 14px;
	line-height: 1.6;
	background-color: #FFF;
}
table {
	width: 100%;
}
.lbl {
	text-align:right;
	width: 50%;
}
input {
	height: 20pt;
	border-radius: 5px;
}
</style>
</head>
<body scroll="auto">
	<script language='javascript' >
	(function() {
		var w = 700, h = 500;
		window.moveTo((window.screen.width - w) / 2, (window.screen.height - h) / 2);
		window.resizeTo(w, h);
	})();
	
	function $(id) { return document.getElementById(id);}
	</script>
	<div>
		<input type="checkbox" name="useProxy"
			title="Включите, если вы ходите в интернет через прокси-сервер.">Использовать прокси-сервер</input>
	</div>
	<table cellspacing="2px" cellpadding="3px">
		<tr>
			<td class="lbl">Адрес прокси-сервера</td>
			<td><input type="text" name="proxyAddress" size="30" title="Адрес прокси сервера в виде имясервера:порт. При открытии пытается считаться из реестра."/></td>
		</tr>
		<tr>
			<td class="lbl">&nbsp;</td>
			<td><input type="button" value="Проверить" size="30" onclick="testProxy()"
				title="Пытается связаться с сервером снегопата через укзанный прокси без авторизации. Определяет, отвечает ли вообще прокси, требует ли авторизации, какие методы авторизации поддерживает."/>
			</td>
		</tr>
		<tr>
			<td class="lbl">Имя пользователя на прокси</td>
			<td>
				<input type="text" name="proxyUser" size="30"
				title="Если прокси требует авторизации, укажите здесь имя пользователя для прокси. Если прокси требует NTLM-авторизацию, то при необходимости указания домена, имя пользователя указывается в виде имяпользователя@домен"/>
			</td>
		</tr>
		<tr>
			<td class="lbl">Пароль на прокси</td>
			<td><input type="password" name="proxyPass" size="30"/ title="Здесь вводится пароль для авторизации на прокси."></td>
		</tr>
		<tr>
			<td class="lbl">Не хранить пароль, а запрашивать при старте</td>
			<td><input type="checkbox" name="notStorePass"
				title="Включите, если не хотите сохранять пароль в файле настроек. Тогда он будет запрашиваться при каждом запуске."/>
			</td>
		</tr>
		<tr>
			<td class="lbl">Сервер использует NTLM-авторизацию</td>
			<td><input type="checkbox" name="proxyNtlm"
				title="Если ваш прокси требует обязательную NTLM (Windows) авторизацию, то включите эту опцию. Тогда для fossil будет запущен промежуточный прокси 'cntlm', который будет авторизоваться вместо него на этом прокси."/>
			</td>
		</tr>
		<tr>
			<td class="lbl">Тип NTLM-авторизации</td>
			<td><input type="text" name="ntlmAuth" size="30" title="Подвид NTLM-авторизации на вашем прокси. Для выяснения нажмите кнопку 'Определить'"/></td>
		</tr>
		<tr>
			<td class="lbl">&nbsp;</td>
			<td><input type="button" value="Определить" size="30" onclick="detectNtlm()" title="Запускает определение подвида NTLM-авторизации. Для выполнения должны быть введены верные имя и пароль на прокси."/></td>
		</tr>
		<tr>
			<td class="lbl">Локальный порт для NTLM-прокси</td>
			<td><input type="number" name="ntlmPort" value="3129" title="Номер локального порта, на котором будет работать промежуточный прокси cntlm. Fossil будет обращаться к этому порту. Укажите любой свободный порт."/></td>
		</tr>
	</table>
	<hr>
	<div style="float:right">
		<button onclick='storeSettings()' title="Сохраняет настройки в файл data\proxy.cmd">Сохранить</button>
	</div>
	<script>
	var myFolder = myapp.commandLine.replace(/\\[^\\]+$/, "").replace('"', "") + '\\';
	var wsh = new ActiveXObject("WScript.Shell");
	var env = wsh.Environment("Process");
	var fso = new ActiveXObject('Scripting.FileSystemObject');
	var remoteUrl = "http://snegopat.ru/reborn/";
	
	(function(){
		var pathToSettings = myFolder + "..\\..\\data\\proxy.cmd";
		if (fso.FileExists(pathToSettings)) {
			var file = fso.OpenTextFile(pathToSettings, 1);
			var lines = file.ReadAll().replace(/\r\n/g,'\n').split('\n');
			file.Close();
			for (var k in lines) {
				var m = lines[k].match(/^set\s+([^=]+)=(.*)/i)
				if (m) {
					var field = $(m[1]);
					if (field) {
						if (field.type == 'checkbox') {
							field.checked = m[2]=='true';
						} else
							field.value = m[2];
					}
				}
			}
		}
	})();
	
	(function(){
		var directTestSuccess = false;
		// Проверим прямой доступ
		try {
			var http = new ActiveXObject('MSXML2.ServerXMLHTTP.6.0');
		} catch(e) {
			alert("Не удалось создать объект MSXML2.ServerXMLHTTP.6.0 для проверки прокси-сервера");
		}
		http.setProxy(1);	// без прокси
		http.open('get', remoteUrl);
		http.onreadystatechange = function() {
			if (http.readyState == 4 && http.status == 200) {
				directTestSuccess = true;
				alert("Внешний сайт доступен без прокси");
				$('useProxy').checked = false;
			}
		}
		try {
			http.send(null);
		} catch(e) {
			alert("Не удалось проверить прямое соединение: " + e.description);
		}

		var key = wsh.RegRead("HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings\\ProxyServer");
		if (key.length) {
			var keys = key.split(';');
			key = '';
			for (var i = 0; i < keys.length ; i++) {
				var tt = keys[i].match(/^(?:https?:\/\/|)([A-Za-z0-9_\.\-]+:\d+)$/);
				if (tt) {
					key = tt[1];
					break;
				}
			}
		}
		if (key.length) {
			$('proxyAddress').value = key;
			if (!directTestSuccess)
				$('useProxy').checked = true;
		}
	})();
	function testProxy() {
		try {
			var http = new ActiveXObject('MSXML2.ServerXMLHTTP.6.0');
		} catch(e) {
			alert("Не удалось создать объект MSXML2.ServerXMLHTTP.6.0 для проверки прокси-сервера");
		}
		http.setProxy(2, $('proxyAddress').value);
		http.open('get', remoteUrl);
		http.onreadystatechange = function() {
			if (http.readyState == 4) {
				if (http.status == 200) {
					alert("Прокси-сервер ответил, авторизации не требует");
				} else if (http.status == 407) {
					var authMetods = [];
					var headers = http.getAllResponseHeaders().split('\n');
					for (var i in headers) {
						var h = headers[i].match(/^Proxy-Authenticate:\s+(\S+)/i);
						if (h)
							authMetods.push(h[1]);
					}
					alert("Прокси-сервер ответил, требует авторизации, поддерживает " + authMetods.join(', '));
				} else {
					alert("Прокси-сервер ответил " + http.status + ": " + http.statusText);
				}
			}
		}
		try {
			http.send(null);
		} catch(e) {
			alert("Не удалось проверить прокси-сервер: " + e.description);
		}
	}
	
	function detectNtlm() {
		var proxyAddress = $('proxyAddress').value;
		if (!proxyAddress) {
			alert("Не задан адрес прокси сервера");
			return;
		}
		var proxyUser = $("proxyUser").value;
		if (!proxyUser) {
			alert("Не задано имя пользователя");
			return;
		}
		var proxyPass = $("proxyPass").value;
		if (!proxyPass) {
			alert("Не указан пароль пользователя");
			return;
		}
		var pathToCntlmIni = myFolder + "..\\..\\data\\cntlm.ini";
		if (!fso.FileExists(pathToCntlmIni)) {
			var file = fso.CreateTextFile(pathToCntlmIni);
			file.Close();
		}
		env('CYGWIN') = 'nodosfilewarning';
		var run = '"' + myFolder + 'cntlm\\cntlm.exe" -c "' + pathToCntlmIni + '" -I -M ' + remoteUrl + ' -u "' + proxyUser + '" ' + proxyAddress;
		var exec = wsh.Exec(run);
		exec.StdIn.Write(proxyPass + '\n');
		var out = exec.StdOut;
		var text = '';
		while(!out.atEndOfStream)
			text += out.ReadAll();
		var found = text.match(/Config profile\s+\d\/\d... OK \(.+\)\n-{3,}.+\n([\s\S]+)\n-{3,}/);
		if (found) {
			text = found[1];
			found = text.match(/^Auth\s+(.+)$/m);
			if (found) {
				var file = fso.CreateTextFile(pathToCntlmIni);
				file.Write(text);
				file.Close();
				$('ntlmAuth').value = found[1];
				alert("Режим прокси-сервера определён как " + found[1]+ '.\nХэши пароля сохранены в файл настроек cntlm.ini');
				$('proxyPass').value = '';
				$('notStorePass').checked = false;
				return;
			}
		}
		alert("Не удалось определить режим сервера. Программа выдала:\n" + text + '\nВозможно, прокси-сервер не запущен или вы ввели неверные имя/пароль');
	}
	function storeSettings() {
		var file = fso.CreateTextFile(myFolder + "..\\..\\data\\proxy.cmd", true);
		var fields = ['useProxy', 'notStorePass', 'proxyAddress', 'proxyUser', 'proxyNtlm', 'ntlmAuth', 'ntlmPort'];
		if (!$('notStorePass').checked)
			fields.push('proxyPass');
		for (var k in fields) {
			var f = $(fields[k]);
			var v = f.type == "checkbox" ? f.checked : f.value;
			file.WriteLine("set " + fields[k] + "=" + v);
		}
		file.Close();
		close(0);
	}
	</script>
</body>
</html>
