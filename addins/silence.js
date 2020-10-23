//engine: JScript
//uname: silence
//dname: Тишина в отсеках
//addin: stdlib
//addin: stdcommands

// (с) Александр Орефков orefkov at gmail.com
// Это небольшой скрипт для подавления некоторых сообщений Конфигуратора, бессмысленных и беспощадных.
// Пока реализовано "в-лоб", в дальнейшем надо сделать список из "регэксп + результат",
// и гуи по настройке, какие подавлять, какие нет.

// Подключение библиотеки log4js, для удобного логгирования различных событий. 
stdlib.require('log4js.js', SelfScript);
stdlib.require('SettingsManagement.js', SelfScript);
stdlib.require("SelectValueDialog.js", SelfScript);
stdlib.require('ScriptForm.js', SelfScript);
stdlib.require('TextWindow.js', SelfScript);

stdlib.require('SyntaxAnalysis.js', SelfScript);

var logger = Log4js.getLogger(SelfScript.uniqueName);
var appender = new Log4js.BrowserConsoleAppender();
// Определяем формат вывода сообщений. 
appender.setLayout(new Log4js.PatternLayout(Log4js.PatternLayout.TTCC_CONVERSION_PATTERN));
logger.addAppender(appender);
logger.setLevel(Log4js.Level.ERROR);
// logger.setLevel(Log4js.Level.DEBUG);

global.connectGlobals(SelfScript);

logger.debug("Проверка скрипта Тишина");

// # Подпишемся на событие при выводе предупреждения/вопроса
// ## подписки на события показа окон: 
// __onMessageBox__ - для модальных блокирующих окошек типа Предупреждение. 
// __onDoModal__ - для модальных окошек типа "Вопрос" , в частности для включенной "провекри синтасиса при записи"" подключаемся на событие модального окна. 
//
events.connect(windows, "onMessageBox", SelfScript.self)
if (profileRoot.getValue("ModuleTextEditor/CheckAutomatically")){
    events.connect(windows, "onDoModal", SelfScript.self);  
}

var notify = true;
RE_PROC              = new RegExp('^\\s*((?:procedure)|(?:function)|(?:процедура)|(?:функция))\\s+([\\wА-яёЁ\\d]+)\\s*\\(', 'i');
// # onMessageBox
//  Функция - обработчик
// ## Параметры
// __param__ - словарь содержащий все параметры Предупреждения
// ``` 1c
// Message(param.caption + " | " + param.text + " | " + param.type + " | " + param.timeout)
//```
function onMessageBox(param)
{
logger.debug("onMessageBox param.text" + param.text);

    // При отработке события перехват с MessageBox'а снимается, и в обработчике
    // можно смело его вызывать, не боясь зацикливания. Например мы сами хотим узнать ответ
    // пользователя и в зависимости от него выполнить какие-то действия
    // param.result = MessageBox(param.text, param.type, param.caption, param.timeout)
    // param.cancel = true
    if(param.text == "Внимание!!! Месторасположение информационной базы изменилось.\nПродолжить?" ||
		param.text == "Не найден текст запроса.\nСоздать новый запрос?") {
        param.result = mbaYes
        param.cancel = true
        return;
    }
    
    // сообщения типа "Объект Роль.Менеджер заблокирован." или "Объект Справочник.СохраненныеНастройки заблокирован."
    reRoleBlock = /Объект\s*[\d\wzа-яё]+\.[\d\wzа-яё\.]+\s*заблокирован\./ig
    if(reRoleBlock.test(param.text)){
        Message(param.text)
        param.result = mbaYes
        param.cancel = true
        return;
    }
    
    // сообщения типа "Объединение конфигураций завершено."
    reConfigUnionEnd = /объединение\s+конфигураций\s+завершено\./ig
    if(reConfigUnionEnd.test(param.text)){
        param.result = mbaYes
        param.cancel = true
        Message(param.text)
        return;
    }
	
	if (DebugModeHelper._instance && DebugModeHelper._instance.settings.current.use) {
		if (param.text == "Приложение запущено. Перезапустить?") {
			DebugModeHelper._instance.first = true;
			param.result = mbaYes;
			param.cancel = true;
			Message(param.text);
			return;
		// } else if(text == "Редактируемая конфигурация отличается от конфигурации базы данных.\nОбновить конфигурацию базы данных?" && this.first) {
		} else if(param.text.indexOf("отличается от конфигурации базы данных.\nОбновить конфигурацию базы данных?") != -1 && DebugModeHelper._instance.first) {
			DebugModeHelper._instance.first = false;
			param.result = mbaYes;
			param.cancel = true;
			Message(param.text);
			return;
		}
	}
}
// Перехватываем модальное окошко и если в первом контроле в тексте содержиться 
// фраза "При проверке модуля обнаружены ошибки!" тогда подавляем данно сообщение с выводом в трее неблокируюещего 
// сообщения о наличии ошибок. 
function onDoModal(dlgInfo){
logger.debug("onDoModal dlgInfo.Caption" + dlgInfo.Caption);

    if(dlgInfo.stage == openModalWnd)
    {
        if (dlgInfo.Caption == "Конфигуратор"){

            for(var c = 0; c < dlgInfo.form.controlsCount; c++)
            {
                if (c > 2){
	               //Опытным путем подобранно, что больше чем 2 контрола нет на форме, соответственно если больше, то это не наша форма. 
                    return;
                }
                var ctr = dlgInfo.form.getControl(c);
                
                //Определим текстовое значение, если не заполненно, значит это не наш случай. 
                var text = "" + ctr.value;
                if (!text){
                    continue;
                }
logger.debug("onDoModal ctr.value" + text);

                if (text.indexOf("При проверке модуля обнаружены ошибки!")!=-1){
                    try{
			         //Создадим объект sendkeys и отправим нажатие ENTER
                     //TODO: исправить на нативное нажатие кнопки. 
                        new ActiveXObject("WScript.Shell").SendKeys("{ENTER}");
                        if (notify)
                        {
			             //Создается объект notify для возможности отправить сообщение. 
			             //анализируем параметры системы и версии 1С, для версий выше 8.2.13 пользуемся стандартным сообщением пользователю. 
                          var notifysend = stdlib.require('NotifySend.js').GetNotifySend();
                          var СистемнаяИнформация = v8New("СистемнаяИнформация");
                          var версия = СистемнаяИнформация.ВерсияПриложения;
                          if (версия.indexOf("8.2.13")==-1){
                              notifysend.provider = notifysend.initprovider("Встроенный1С");
                          }
                          notifysend.Error("Сохраняем ", "При сохранении есть ошибки \n имей ввиду", 3);
                          notify = false;
                          stdlib.setTimeout(function () {
                              notify = true;
                          }, 3000);
                        }
                    } catch (e){
                };
                return
                }
            }
       }
    }
}

ProcedurCreateHelper = ScriptForm.extend({

    settingsRootPath : SelfScript.uniqueName,
    
    settings : {
        pflSnegopat : {
            'use'      : true, // Использовать... 
            'defaultContext': 0, //0 - на клиенте, 1 - на сервере без контекста, 2 - на сервере.' : false, // Учитывать регистр при поиске.
            'useAltenate'   : false, // Использовать алтернативный вариант. 
            'position'      : "afterProcedure", // Позиция создания "afterProcedure" - после созданной процедуры, "atLastContext" - после после последнего контекстного вызова.  "beforeProcedure"
            'time'          : 3 //Время в секундах для показа формы. 
        }
    },

    construct : function () {  
        this._super(SelfScript);
        this.form.КлючСохраненияПоложенияОкна = "silence.dialog"
        this.loadSettings();
        this.timerId = null;
        this.textwindow = null;
        this.timerFormId = 0;
        this.count = 0;
        this.firstRefresh = true;
        ProcedurCreateHelper._instance = this;
    }, 

    loadSettings : function(){
        this._super();

        if (this.form.use || this.form.useAltenate){
            events.connect(windows, "onDoModal", this, "onDoModalAtClient");
        } else {
            try{
                events.disconnect(windows, "onDoModal", this, "onDoModalAtClient");    
            } catch(e){};
        }
    }, 

    Form_OnClose : function () {
        this.saveSettings();
    },

    Form_BeforeClose : function(Cancel){

    },

    Form_OnOpen : function() {
        this.firstRefresh = true;
        valueList = v8New("ValueList");
        valueList.add("afterProcedure", "После процедуры");
        valueList.add("beforeProcedure", "Перед процедурой");
        valueList.add("atLastContext", "После процедур контекста");
        this.form.Controls.PositionCreate.СписокВыбора = valueList;

        var valueItem = this.form.Controls.PositionCreate.СписокВыбора.FindByValue(this.form.position);
        if(!valueItem){
            this.form.position = "afterProcedure";
        }
        
        this.form.Controls.PositionCreate.Значение = this.form.position;
        
        this.form.Controls.defaultContext.Значение = this.form.defaultContext;
        
        if (this.count == 27){
            this.form.Controls.ServerNoContext.ButtonBackColor = v8New("Цвет", 0, 130, 209);
            this.form.Controls.Server.ButtonBackColor = v8New("Цвет", 255, 209, 0);
        }

        //this.form.CurrentControl = this.form.Controls.clear;
    },

    PositionCreate_OnChange:function(el){
        this.form.position = el.value;
    },

    Form_ObjectActivationProcessing:function(ActiveObject, Source){
        if (this.timerFormId > 0){
            killTimer(this.timerFormId);
            this.timerFormId = 0;
        }
    },

    Form_RefreshDisplay:function(){

        if (this.firstRefresh){
            this.firstRefresh = false;
            return;
        }

        if (this.timerFormId > 0){
            killTimer(this.timerFormId);
            this.timerFormId = 0;
        }  
    },

    onDoModalAtClient : function(dlgInfo){
logger.debug("onDoModalAtClient dlgInfo.Caption" + dlgInfo.Caption);

         if(dlgInfo.stage == afterInitial) //beforeDoModal afterInitial
        {
            if (dlgInfo.Caption == "Конфигуратор"){
                if (dlgInfo.form.controlsCount != 7){
                    return;
                }
                var crt = dlgInfo.form.getControl(1);
logger.debug("onDoModalAtClient crt.name" + crt.name);
                if (crt.name == "OnlyClient"){

                    if(!this.form.useAltenate){
                        crt.value = this.form.defaultContext;
                    } else {
                        //TODO: добавить проверку "Сервер" и "Сервер без контекста"
                        dlgInfo.form.sendEvent(dlgInfo.form.getControl(6).id, 0);
                        this.timerId = createTimer(500, this, 'onTimer');
                    }
                }

           }
        }
    }, 

    onTimer : function(timerId){

        var activeView = windows.getActiveView();
        if (!activeView){
            return;
        }
        
        var wnd = GetTextWindow();    
        if (wnd){
            this.lastActiveTextWindow = wnd;
            killTimer(this.timerId);
            this.timerId = 0;
        } else if (this.lastActiveTextWindow && !this.lastActiveTextWindow.IsActive()){
            this.lastActiveTextWindow = null;
        }

        this.analiseTextAndView(this.lastActiveTextWindow);


    }, 

    analiseTextAndView:function(textWindow){
        if (!textWindow){
            this.close();
            return;
        }

        var canCreate = false;

        curPos = (textWindow.GetCaretPos().beginRow) - 1;
        curPos = curPos == 0?1:curPos;
        this.beginRow = textWindow.GetCaretPos().beginRow;

        var str = textWindow.GetLine(curPos);
logger.debug("analiseTextAndView str" + str);
        Matches = RE_PROC.exec(str);
        if( Matches != null )
        {
            this.form.Controls.НадписьНазвание.Заголовок = Matches[2];
            this.selectedText = textWindow.GetSelectedText();
logger.debug("analiseTextAndView this.selectedText" + this.selectedText);
            canCreate = true;
            if (this.isOpen() && this.form.Panel.Pages.CurrentPage == this.form.Panel.Pages.Settings){ //Если открыто окно с настройками, тогда не показываем варианты создания. 
                canCreate = false;
            } 

       }

        if (canCreate){
            this.show();
            pch.form.Panel.CurrentPage = pch.form.Panel.Pages.Find("Job");
            this.timerFormId = createTimer(this.form.time*1000, this, 'onTimerToClose');
            var view = textWindow.GetView();
            if (view){
                view.activate();
            }
        } else {
            this.close();
        }
    },

    onTimerToClose:function(timerId){
        killTimer(this.timerFormId);
        this.timerFormId = 0;
        
        if (this.form.CurrentControl.Name != "ServerNoContext"){
            return;
        }
        this.close();
    }, 

    getPositionForAddLines : function(wnd, context, localCnt){
        //Message(""+context);
        maxPosition = 0;
        maxProcedure = "";
        if (localCnt == undefined){

            cnt = SyntaxAnalysis.AnalyseTextDocument(wnd);
            //currentMethod = cnt.getActiveLineMethod();
        } else {
            cnt = localCnt;
        }

        
        vtModules = cnt.getMethodsTable();
        for (var i = 0; i<vtModules.Count(); i++) {
            var thisRow = vtModules.Get(i);
            curContext = thisRow.Context;
            curContext = curContext.replace("НаСервереБезКонтекста", "atServerNoContext", "ig");
            curContext = curContext.replace("НаСервере", "atServer", "ig");
            if (curContext.length == 0){
                curContext = "atServer"
            }
            

            if (curContext.indexOf(context) ==-1){
                //Message("Пропустим "+curContext + " "+context + " позиция "+curContext.indexOf(context));
                continue;
            }

            //Message("name "+thisRow.Name + "context " + thisRow.Context + " " +thisRow.StartLine+" " + thisRow.EndLine + " " + thisRow._method.EndLine);

            maxPosition = (maxPosition > thisRow._method.EndLine+2) ? maxPosition : thisRow._method.EndLine+2;

        }

        return maxPosition;

    },

    createFunction : function(context, position){

        this.count++; 
        if (this.lastActiveTextWindow && !this.lastActiveTextWindow.IsActive()){
            this.lastActiveTextWindow = null;
            Message("Не возможно создать процедуру, окно уже закрыто");
            return;
        } else {
            view = this.lastActiveTextWindow.GetView();
            if (view){
                view.activate();
            }
        }

        var activeView = windows.getActiveView();
        if (!activeView){
            Message("Нет активных окон.");
            return;
        }
        
        var wnd = GetTextWindow();    
        if (!wnd){
            Message("Нет активного текстового окна.") ;
            return;
        }

        if (wnd.GetHwnd() != this.lastActiveTextWindow.GetHwnd()){
            Message("Нет активное текстовое окно не совпадает с сохраненным") ; //FIXME: добавить проверку метаданных. 
            return;   
        }

        //Определим новое название процедуры. 
        var newName = this.form.Controls.НадписьНазвание.Заголовок + ((context == 'atServer') ? 'НаСервере':'НаСервереБезКонтекста');
        logger.debug("new name :"+newName);

        var newProcedure = '\n'+((context == 'atServer') ? '&НаСервере':'&НаСервереБезКонтекста') + '\n' + 'Процедура'+ ' '+ newName + '()\n    \nКонецПроцедуры';

        //Первое определим положение курсора, если все в той же процедуре и выделенный текст, тогда будем заменять новым названием.
        // если курсор выделяет какой либо текст, значит надо заменить, его. 

        isSelection = false;
        lineToInsertName = 0;
        selection = null;
        lineToInsertProcedure = 0;


        selection = wnd.GetSelection();
        selectedText = wnd.GetSelectedText();
        if (selectedText == this.selectedText && wnd.GetCaretPos().beginRow == this.beginRow){
            isSelection = true;
            lineToInsertName = wnd.GetCaretPos().beginRow
            if (position == "afterProcedure"){
                lineToInsertProcedure = this.beginRow + 2;
            } else if(position == "beforeProcedure"){
                lineToInsertProcedure = this.beginRow - 2;
            } else {
                //Вот тут 
                lineToInsertProcedure = this.getPositionForAddLines(wnd, context)
            }
        } else {
            //Найдем по названию метода последнюю строку, добавим туда вызов. 
            cnt = SyntaxAnalysis.AnalyseTextDocument(wnd);
            currentMethod = cnt.getActiveLineMethod();

            method = cnt.getMethodByName(this.form.Controls.НадписьНазвание.Заголовок)

            if(!method){
                Message("Не обнаружили метод... ");
                return;
            }

            if (currentMethod.Name == method.Name){
                lineToInsertName = wnd.GetCaretPos().beginRow;
            } else {
                lineToInsertName = method.EndLine - 1; 
            }

            if (position == "afterProcedure"){
                lineToInsertProcedure = method.StartLine - 2;
            } else if(position == "beforeProcedure"){
                lineToInsertProcedure = this.EndLine + 1;
            } else {
                //Вот тут 
                lineToInsertProcedure = this.getPositionForAddLines(wnd, context, cnt)
            }
        }

        lineToInsertProcedure = lineToInsertProcedure==0?1:lineToInsertProcedure;
        lineToInsertName = lineToInsertName==0?1:lineToInsertName;

        //Определим позицию куда вставлять новый текст процедуры. 

        if (isSelection){
            wnd.SetSelectedText(newName + "()");
        } else {
            wnd.InsertLine(lineToInsertName, newName+"()");
        }

        wnd.InsertLine(lineToInsertProcedure, newProcedure);
        //Теперь расчитаем позицию для установки курсора. 
        wnd.SetCaretPos(lineToInsertProcedure + 3, 4);

        
    },

    ServerNoContext_Click:function(btn){
        this.createFunction("atServerNoContext", this.form.Controls.PositionCreate.Value);
        this.close();
    }, 

    Server_Click:function(btn){
        this.createFunction("atServer", this.form.Controls.PositionCreate.Value);
        this.close();
    }

})


// # DebugSilence
// 
// Во время активной разработки очень часто приходится перезапускать предприятие, открытое в режиме отладки 
// при этом каждый раз от пользователя ждут различных действий, таких как подтверждение перезапуска предприятия и подтверждения обновления базы данных. По факту получается для перезаска отладки неоходимо нажать F5 , потом ответить утвердительно на вопрос "Перезапустить предприятие", и снова ответь на вопрос "Обнвоить ли базу данных!". 
// Если посчитать сколько в день приходиться нажимать F5 потом enter, enter, то в итоге родился такой скрипт, который анализирует текущее состояние базы (отличаются конфигурации), при этом у нас включен режим отладки - значит мы в режиме отладки что-то подправили и теперь пытаемся перезапустить предприяте.
DebugModeHelper = stdlib.Class.extend({

    settingsRootPath : 'sillenceDebugModeHelper',
    defaultSettings : {
            // use: false
            use: true // АРтур
    },

    construct : function () {    
        DebugModeHelper._instance = this;
        
        this.settings = SettingsManagement.CreateManager(this.settingsRootPath, this.defaultSettings);
        this.loadSettings();
        //events.connect(windows, "onDoModal", this);
        //stdcommands.CDebug.Start.addHandler(this, "onRestartDebug");
        this.first = false;
    },

    loadSettings:function(){
        this.settings.LoadSettings();
        if(!this.settings.current.use)
            this.settings.current.use = false;
this.settings.current.use = true; // АРтур

        if (this.settings.current.use==true){
            stdcommands.CDebug.Start.addHandler(this, "onRestartDebug");
        } else {
            try{
                stdcommands.CDebug.Start.delHandler(this, "onRestartDebug");
            } catch (e) {}
             try{
                events.disconnect(windows, "onDoModal", this, "onDoModalRestart");
            } catch (e) {}

        }

    },

    changeSettings : function(){

        var values = v8New('СписокЗначений');
        values.add("on", "Включить перехват");
        values.add("off", "Выключить перехват");

        var name = "Перехват вопросов о перезапуске, сейчас "+ ((this.settings.use == true) ? " включен": " выключен");
        var dlg = new SelectValueDialog(name, values);
         if (dlg.selectValue()) {
             if (dlg.selectedValue=="on") {
                this.settings.current.use = true;
            } else if (dlg.selectedValue == "off") {
                this.settings.current.use = false;
            }
this.settings.current.use = true; // Артур
        }

        this.settings.SaveSettings();
        this.loadSettings();
    },

     //Перехватим событие о старте отладки . 
     onRestartDebug:function(cmd){
logger.debug("onRestartDebug ");
        if (!this.settings.current.use) {
            return;
        }
        if(cmd.isBefore)
        {   
            if (stdlib.isConfigsDifferent() && this.isDebugEnabled()){
                this.first = false;
                events.connect(windows, "onDoModal", this, "onDoModalRestart");    
            }
        }  else {
            try{
                events.disconnect(windows, "onDoModal", this, "onDoModalRestart");
            } catch (e) {}
        }
    },
    
    
    // Определим находимся ли в режиме отладки или нет. 
    isDebugEnabled:function()
    {
logger.debug("isDebugEnabled ");
        // Команда "Перезапустить " неактивна - значит, мы не в режиме отладки.
        var state = stdcommands.CDebug.Restart.getState()
        return state && state.enabled
    },


    onDoModalRestart:function(dlgInfo){
        
logger.debug("onDoModalRestart dlgInfo.caption " + dlgInfo.caption);
        if(dlgInfo.caption == "Конфигуратор" && dlgInfo.stage == afterInitial)
        {
            try{
                var text = dlgInfo.form.getControl(0).value;
logger.debug("onDoModalRestart dlgInfo.form.getControl(0).value " + text);
                if (text == "Приложение запущено. Перезапустить?") {
                    if (stdlib.isConfigsDifferent()){
                        this.first = true;
                        dlgInfo.form.sendEvent(dlgInfo.form.getControl(2).id, 0);
                    }
                // } else if(text == "Редактируемая конфигурация отличается от конфигурации базы данных.\nОбновить конфигурацию базы данных?" && this.first) {
                } else if(text.indexOf("отличается от конфигурации базы данных.\nОбновить конфигурацию базы данных?") != -1 && this.first) {
                    this.first = false;
                    dlgInfo.form.sendEvent(dlgInfo.form.getControl(2).id, 0);
                }
            } catch (e){
                logger.debug(e.description);

            };
        }
    }
})

function GetDebugModeHelper() {
    if (!DebugModeHelper._instance)
        new DebugModeHelper();
    return DebugModeHelper._instance;
}


function GetProcedurCreateHelper() {
    if (!ProcedurCreateHelper._instance)
        new ProcedurCreateHelper();
    return ProcedurCreateHelper._instance;
}


// ### Инициализия класса . 
//
//  Для отключения, достаточно только закомментировать данную строкоу.  
// TODO: добавить включение, выключение данного поведения. 
var dbg = GetDebugModeHelper();
var pch = GetProcedurCreateHelper();

SelfScript.self['macrosВкл/выкл вопросов при перезапуске во время отладки'] = function(){
    dbg.changeSettings();
    return true;

}


SelfScript.self['macrosНастройка создания обработчиков '] = function() {

    pch.show();
    pch.form.Panel.CurrentPage = pch.form.Panel.Pages.Find("Settings");
}
