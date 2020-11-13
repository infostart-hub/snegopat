//engine: JScript
//uname: stg_autoconnect
//dname: Авто-подключение к хранилищу
//addin: stdcommands
//addin: global
//addin: stdlib
//author: Александр Орефков orefkov at gmail.com
//help: inplace
//www: https://snegopat.ru/scripts/wiki?name=stg_autoconnect.js

global.connectGlobals(SelfScript)
/*@
Это небольшой скрипт для подстановки пути/имени/пароля в диалоге подключения к хранилищу.
Данные сохраняется в профайле база/пользователь.
При первом подключении к хранилищу скрипт предлагает запомнить введенные данные,
и в дальнейшем сразу подставляет их при подключении к хранилищу.
Если вам надо ввести другие данне, выполните макрос "СброситьСохраненныеДанные"
@*/

// Зададим пути хранения настроек
var pflPath = "StgAutoConnect/"
var pflData = pflPath + "data"                      // Данные
var pflShowMessage = pflPath + "ShowMessage"        // Показывать сообщение при подстановке
var pflCurrentBasePath = pflPath + "CurrentBasePath"; // Храним путь к базе данных, если поменялась, тогда будем спрашивать точно надо подключится.
var pflAutoRecursiveCheckOut = pflPath + "AutoRecursiveCheckOut"; // Опция автоматической установки флажка "захватывать рекурсивно"
var pflAutoOpenCfgStore = pflPath + "AutoOpenCfgStore";
var pflCfgViewList = pflPath + "CfgViewList";
var prevConnectSuccessed = true;
var prevCaption = "";

// Настройку отображения сообщений будем хранить едино для всех баз, в профиле Снегопата
profileRoot.createValue(pflShowMessage, true, pflSnegopat);
profileRoot.createValue(pflAutoOpenCfgStore, false, pflSnegopat);
profileRoot.createValue(pflCfgViewList, false, pflSnegopat);
// Подцепляемся к событию показа модальных окон. Если со временем появится событие подключения к хранилищу,
// то надо будет делать это в том событии, и после отключаться от перехвата модальных окон.
events.connect(windows, "onDoModal", SelfScript.self)

function cnnString()
{
    КаталогИБ = НСтр(СтрокаСоединенияИнформационнойБазы(), "File")
    if(КаталогИБ)
        return КаталогИБ
    else
        return НСтр(СтрокаСоединенияИнформационнойБазы(), "Srvr") + ":" + НСтр(СтрокаСоединенияИнформационнойБазы(), "Ref")
}

var count = 0;

function doAutoConnect(dlgInfo, matches)
{
	repoTitle = matches[2];
	repoParam = "Конфигурация";
	
	if (!(matches[2]=="конфигурации"))
	{
		repoTitle = repoTitle + matches[3];
		repoParam = "Расширение:"+matches[3];
	}

	if (count > 16) {
			prevConnectSuccessed = true;
			count = 0;
	}

	if (dlgInfo.stage == afterInitial)
	{

		count++;

		if (prevCaption == repoTitle)//не удалось авторизоваться
		{
			prevConnectSuccessed = false
		}
		else
		{
			prevCaption = repoTitle;
			prevConnectSuccessed = true;
		}

		var data0 = profileRoot.getValue(pflData);
		if (!(data0))
			data0 = v8New("Соответствие");
		var data = data0.Получить(repoParam);
		if(data)
		{
			if (!prevConnectSuccessed)
			{
				if(MessageBox("Авто-соединение с хранилищем "+repoTitle+" было неудачным. Сбросить сохраненные данные?", mbYesNo | mbDefButton1 | mbIconQuestion, "Снегопат") == mbaYes)
				{
					var data0 = profileRoot.getValue(pflData);
					if (data0)
						data0.Удалить(repoParam);
				}
				prevConnectSuccessed = true;
			}
			else
			{
				var currentBasePath = profileRoot.getValue(pflCurrentBasePath);
				if (!currentBasePath)
					currentBasePath = cnnString();

				if (currentBasePath.toLowerCase() != cnnString().toLowerCase()){
					var questionStirng = " Для базы сохранена другая строка подключения. \n";
					questionStirng += "Текущий путь:"+cnnString()+"\n";
					questionStirng += "Сохраненный путь:"+currentBasePath+" \n";
					questionStirng += "\t ВНИМАНИЕ ВОПРОС \n"+"Продолжить автоподключение?";
					if(MessageBox( questionStirng, mbYesNo | mbDefButton1 | mbIconQuestion, "Авто-соединение к хранилищу "+repoTitle+" !") == mbaNo)
						return;
				}
				// Если есть сохраненные данные, то вводим их
				dlgInfo.form.getControl("UserName").value = data.login
				dlgInfo.form.getControl("UserPassword").value = data.password
				dlgInfo.form.getControl("DepotPath").value = data.path
				dlgInfo.cancel = true   // Отменяем показ диалога
				dlgInfo.result = 1      // Как будто в нем нажали Ок
				if(profileRoot.getValue(pflShowMessage))    // Информируем пользователя, если он хочет
					Message("Авто-подключение к хранилищу "+repoTitle+" '" + data.path + "' пользователем '" + data.login + "'")
			}
		}
	}
	else if(dlgInfo.stage == afterDoModal && dlgInfo.result == 1 && dlgInfo.cancel == false)
	{
		// Предложим сохранить введенные данные
		if(MessageBox("Подставлять введенные значения автоматически при последующих подключениях?",
			mbYesNo | mbDefButton1 | mbIconQuestion) == mbaYes)
		{
			// Сохраним их
			var data0 = profileRoot.getValue(pflData);
			if (!(data0))
				data0 = v8New("Соответствие");
			var data = v8New("Структура", "login,password,path",
				dlgInfo.form.getControl("UserName").value,
				dlgInfo.form.getControl("UserPassword").value,
				dlgInfo.form.getControl("DepotPath").value);
			data0.Вставить(repoParam, data);
			var currentBasePath = cnnString();
			profileRoot.createValue(pflData, false, pflBaseUser)    // Храним отдельно для базы/пользователя
			profileRoot.createValue(pflCurrentBasePath, false, pflBaseUser);
			profileRoot.setValue(pflData, data0)
			profileRoot.setValue(pflCurrentBasePath, currentBasePath)
		}
	}
}

// Обработчик показа модальных окон.
function onDoModal(dlgInfo)
{
    var matches = dlgInfo.caption.match(/^(Соединение с хранилищем )(конфигурации|расширения )(.*)/i);

    if(matches && matches.length && matches[2])
    {
		doAutoConnect(dlgInfo, matches);
    }
    else if(dlgInfo.stage == openModalWnd && (dlgInfo.caption == "Захват объектов в хранилище конфигурации" ||
        dlgInfo.caption == "Помещение объектов в хранилище конфигурации"))
    {
        //for(var i = 0; i < dlgInfo.form.controlsCount; i++)
        //    Message(dlgInfo.form.getControl(i).name)
        dlgInfo.form.getControl("GetRecursive").value = getRecursiveCheckoutOption();
    }
}

function onIdle()
{
    prevConnectSuccessed = true
    events.disconnect(Designer, "onIdle", SelfScript.self)
}

function getRecursiveCheckoutOption(){
    var currentValue = profileRoot.getValue(pflAutoRecursiveCheckOut);

    if(currentValue == null){
        // Такой опции не записано. Для обратной совместимости, для тех, кому нравился рекурсивный захват по-умолчанию
        // мы всегда будем возвразать true
        currentValue = true;
    }

    return currentValue;
}


SelfScript.self["macrosСбросить cохраненные данные"] = function()
{
    profileRoot.deleteValue(pflData);
    profileRoot.deleteValue(pflCurrentBasePath);

}

SelfScript.self["macrosПоказывать сообщение при подключении"] = function()
{
    profileRoot.setValue(pflShowMessage, true)
}

SelfScript.self["macrosНе показывать сообщение при подключении"] = function()
{
    profileRoot.setValue(pflShowMessage, false)
}

SelfScript.self["macrosНастроить автоматический рекурсивный захват"] = function()
{
    var mbYes = 6;
    var mbNo = 7;
    var valueSet = null;

    var answer = MessageBox("Включить автоматическую установку флага \"Захватывать рекурсивно\"", 4, "Настройка флажка \"Рекурсивно\"");

    if(answer == mbYes)
        valueSet = true;
    else if(answer == mbNo)
        valueSet = false;

    if(answer != null){
        // Пользователь не отказался от выбора и хочет поменять опцию
        profileRoot.createValue(pflAutoRecursiveCheckOut, true, pflComputer);
        profileRoot.setValue(pflAutoRecursiveCheckOut, valueSet);
        saveProfile();
    }
}

function macrosНастройка() {
    var form = loadFormForScript(SelfScript, "", {
        ПриОткрытии: function() {
            form.showMessage = profileRoot.getValue(pflShowMessage);
            form.fRecursive = profileRoot.getValue(pflAutoRecursiveCheckOut);
            form.autoOpenCfgStore = profileRoot.getValue(pflAutoOpenCfgStore);
            form.CfgStoreViewInList = profileRoot.getValue(pflCfgViewList);
        },
        CmdBarЗаписать: function() {
            profileRoot.setValue(pflShowMessage, form.showMessage);
            profileRoot.setValue(pflAutoRecursiveCheckOut, form.fRecursive);
            profileRoot.setValue(pflAutoOpenCfgStore, form.autoOpenCfgStore);
            profileRoot.setValue(pflCfgViewList, form.CfgStoreViewInList);
            form.Close();
        }
    });
    form.ОткрытьМодально();
}

(function() {
	if (stdlib.isConfigOpen()) {
		var data = profileRoot.getValue(pflData);
		if (data) {
			if (toV8Value(data).typeName(1) == "Структура")
			{
				data0 = v8New("Соответствие");
				data0.Вставить("Конфигурация", data);
				profileRoot.setValue(pflData, data0);
				Message("Сохранённые данные для входа в хранилище конвертированы в данные входа в хранилище Конфигурации");
			}
		}
		var no = profileRoot.getValue(pflAutoOpenCfgStore);
		if (profileRoot.getValue(pflAutoOpenCfgStore)) {
			var s = stdcommands.CfgStore.OpenCfgStore.getState();
			if (!s)
				Message("Команда открытия хранилища не найдена");
			else if (!s.enabled)
				Message("Команда открытия хранилища не доступна");
			else
				stdcommands.CfgStore.OpenCfgStore.send();
		}
		if (profileRoot.getValue(pflCfgViewList)) {
			var n = events.connect(Designer, "onIdle", function() {
				var v = windows.getActiveView();
				if (v && v.title == "Хранилище конфигурации") {
					v.getInternalForm().sendCommand(stdcommands.CfgStore.groupID, 203, 1);
					events.disconnectNode(n);
				}
			}, '-');
		}
	}
})();
