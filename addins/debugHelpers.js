//engine: JScript
//uname: debugHelpers
//dname: Отладчик:Вспомогательные команды
//author: Александр Кунташов <kuntashov@gmail.com>, http://compaud.ru/blog
//addin: stdcommands
//addin: stdlib
//addin: global

/*@
Добавляет возможность вызова консоли запросов для отладки запроса и 
некоторые другие макросы, повышающие удобство использования штатного отладчика.
@*/

stdlib.require('SettingsManagement.js', SelfScript);

global.connectGlobals(SelfScript);

var settings; // Хранит настройки скрипта (экземпляр SettingsManager'а).

////////////////////////////////////////////////////////////////////////////////////////
////{ Макросы
////

/* Открыть запрос в переменной под курсором в консоли запросов из отладчика. */
SelfScript.Self['macrosОтладить запрос модально'] = function () {
    openQueryConsole(true);
}

/* Открыть запрос в переменной под курсором в консоли запросов из отладчика. */
SelfScript.Self['macrosОтладить запрос не модально'] = function () {
    openQueryConsole(false);
}

/* Позволяет включать/выключать режим остановки по ошибке в отладчике по горячей клавише. */
SelfScript.Self['macrosВключить/выключить остановку по ошибке'] = function () {
    SelfScript.Self['StopOnErrorOpenedByMacros'] = true;
    stdcommands.CDebug.BreakOnError.send();
}

/* Установить точку останова, предварительно удалив все другие. */
SelfScript.Self['macrosУстановить точку останова и удалить все другие'] =  function () {
    stdcommands.CDebug.BrkptDel.send();
    stdcommands.CDebug.Brkpt.send();
}

SelfScript.Self['macrosНастройка'] = function () {
    var dsForm = new DebugHelperSettingsForm(settings);
    dsForm.ShowDialog();
}

function getDefaultMacros() {
    return "Настройка";
}

////} Макросы

// Обработчик показа модальных окон.
function onDoModal(dlgInfo) {

    if (dlgInfo.caption == "Остановка по ошибке" && dlgInfo.stage == openModalWnd) 
    {       
        if (SelfScript.Self['StopOnErrorOpenedByMacros']) 
        {
            dlgInfo.form.getControl("CheckBox_StopOnError").Value = !dlgInfo.form.getControl("CheckBox_StopOnError").Value;
            dlgInfo.result = 1; // Нажимаем "Ок".
            dlgInfo.cancel = true; // Окно показывать не надо.
        
            SelfScript.Self['StopOnErrorOpenedByMacros'] = undefined;
        }
    }    
    else if (dlgInfo.caption == "Выражение" && dlgInfo.stage == openModalWnd) 
    {
        if (SelfScript.Self['RunQueryConsoleCommand']) 
        {
            var params = SelfScript.Self['RunQueryConsoleCommand'];         
            delete SelfScript.Self['RunQueryConsoleCommand'];
            
            var exprCtrl = dlgInfo.form.getControl('Expression');
            if (!exprCtrl.value.match(/^\s*$/)) 
            {            
                if (!params.commandCheck) {
                    exprCtrl.value = 'ВнешниеОбработки.Создать("' + params.path + '").Отладить(' + exprCtrl.value + ', ' + (params.doModal ? 'Истина' :  'Ложь') + ')';
                } else {
                    exprCtrl.value = ''+ params.command + '(' + exprCtrl.value + ', ' + (params.doModal ? 'Истина' :  'Ложь') + ')';
                }

                var wsh = new ActiveXObject("WScript.Shell");
                
                // Посылаем нажатие Enter, чтобы отработало событие "ПриИзменении" поля ввода выражения.
                stdlib.setTimeout(function () { 
                    wsh.SendKeys("{END} {ENTER}");
                    if (!params.doModal)
                        wsh.SendKeys("%{F4}{F5}");
                        
                }, 1000);
                                    
            }
                                
        }        
    }
}

function fileExists(path) {

    if (path) 
    {
        var f = v8New('File', path);
        return f.IsFile() && f.Exist();
    }
    
    return false;
}

function getAbsolutePath(path) {

    // Путь относительный?
    if (path.match(/^\.{1,2}[\/\\]/))
    {
        // Относительные пути должны задаваться относительно главного каталога Снегопата.
        var mainFolder = env.pathes.main;
        return mainFolder + path;
    }
    
    return path;
}

function openQueryConsole(doModal) {

    var path = getAbsolutePath(settings.current.QueryConsolePath);
    var query = settings.current.QueryCommand;
    if (!settings.current.UseCommand) {
        
        if (!fileExists(path))
        {
            DoMessageBox('Путь к обработке КонсольЗапросов не задан. Укажите путь в диалоге настроек скрипта.');
            
            var dsForm = new DebugHelperSettingsForm(settings);
            if (!dsForm.ShowDialog())
            {
                Message('Консоль не будет открыта, т.к. путь к консоли не задан, либо файла по указанному пути не существует!');
                return;
            }
        }
    }
    
    SelfScript.Self['RunQueryConsoleCommand'] = { 'path': path, 'doModal': doModal, "command": query, "commandCheck":settings.current.UseCommand};
    stdcommands.CDebug.EvalExpr.send();
}

////////////////////////////////////////////////////////////////////////////////////////
////{ Форма настройки скрипта - DebugHelperSettingsForm
////

function DebugHelperSettingsForm(settings) {
    this.settings = settings;
    this.form = loadScriptForm(env.pathes.addins + "debugHelpers.settings.ssf", this);
}

DebugHelperSettingsForm.prototype.ShowDialog = function () {
    return this.form.DoModal();
}

DebugHelperSettingsForm.prototype.saveSettings = function () {
    
    if (!this.form.UseCommand) {
        var path = getAbsolutePath(this.form.QueryConsolePath);
        Message("path: " + path);
        //Уберем проверку, а вдруг снегопат перенесли и случайно открыли настройку. 
        /* if (!fileExists(path))
        {
            DoMessageBox('Указанный файл не существует! Настройки не могут быть сохранены.');
            return;
        } */
    } 
    
    this.settings.ReadFromForm(this.form);
    this.settings.SaveSettings();
}

DebugHelperSettingsForm.prototype.QueryConsolePathStartChoice = function (Элемент, СтандартнаяОбработка) {
	// Вставить содержимое обработчика.
}

DebugHelperSettingsForm.prototype.CmdBarOK = function (Кнопка) {
    if (this.saveSettings())
        this.form.Close(true);
}

DebugHelperSettingsForm.prototype.CmdBarSave = function (Кнопка) {
	this.saveSettings();
}

DebugHelperSettingsForm.prototype.OnOpen = function () {
	this.settings.ApplyToForm(this.form);
}

DebugHelperSettingsForm.prototype.BeforeClose = function (Cancel, DefaultHandler) {
    
    if (this.form.Modified)
    {
        var answer = DoQueryBox("Настройки были изменены! Сохранить настройки?", QuestionDialogMode.YesNoCancel);
        switch (answer)
        {
        case DialogReturnCode.Yes:
            DefaultHandler.val = false;
            if (this.saveSettings())
                this.form.Close(true);
            break;
            
        case DialogReturnCode.No:
            DefaultHandler.val = false;
            this.form.Close(false);
            break;
            
        case DialogReturnCode.Cancel:
            Cancel.val = true;
            break;
        }
    }
}

////
////} Форма настройки скрипта - DebugHelperSettingsForm
////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////
////{ Start up
////

settings = SettingsManagement.CreateManager('debugHelpers', { 'QueryConsolePath': '' , 'QueryCommand': '', 'UseCommand':'false'})
settings.LoadSettings();

events.connect(windows, "onDoModal", SelfScript.Self)

////
////} Start up
////////////////////////////////////////////////////////////////////////////////////////
