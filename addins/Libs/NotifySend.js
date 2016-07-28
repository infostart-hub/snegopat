//engine: JScript
//uname: NotifySend
//dname: Библиотека сообщений пользователю
//addin: stdcommands
//addin: global
//addin: stdlib
//help: inplace
//author: Сосна Евгений <shenja@sosna.zp.ua>

// (c) Сосна Евгений <shenja@sosna.zp.ua>
/*@
Библиотека для посылки сообщений пользователю.
@*/

stdlib.require('SettingsManagement.js', SelfScript);
global.connectGlobals(SelfScript)

var settings; // Хранит настройки скрипта (экземпляр SettingsManager'а).

SelfScript.Self['macrosНастройка'] = function () {
    var dsForm = GetNotifySend(settings);
    dsForm.ShowDialog();
}

function getDefaultMacros() {
    return "Настройка";
}

////////////////////////////////////////////////////////////////////////////////////////
////{ NotifySend
////
function GetNotifySend() {

    if (!_NotifySend._instance)
        new _NotifySend(settings);
    
    return _NotifySend._instance;
}

function _NotifySend(settings) {
    // this.settings = { 
                    // 'TimeEvent': 0,  //Время сообщения по умолчанию.
                    // "TypeEvent":"", // Тип сообщения по умолчанию 
                    // "TypeCMDMessage" : "", //оставлю на будущее, для вызова сообщений в linux
                    // "MessagePovider":"TrayTip"
                    // }
    this.settings = settings;
    var pathToForm = SelfScript.fullPath.replace(/js$/, 'ssf')
    this.form = loadScriptForm(pathToForm, this) // Обработку событий формы привяжем к самому скрипту
    this.provider = this.initprovider();
    //Message("this.settings.MessagePovider" + this.settings.current.MessagePovider)

    _NotifySend._instance = this
    
}

_NotifySend.prototype.initprovider = function(provider) { 
    if (provider == undefined) provider = this.settings.MessagePovider;
    var result = null;
    switch (provider) 
    {
    case "TrayTip":
        result = new _TrayTipProvider()
        break;
    case "Встроенный1С":
        var Icons = {
            'Warning': this.form.Controls.Предупреждение.Picture,
            'Error': this.form.Controls.Ошибка.Picture,
            'Info': this.form.Controls.Информация.Picture
        }
        result  = new _InternalProvider(Icons);
        break;
    default:
        result  = new _TrayTipProvider()
        break;
    }
    
    return result;
}

_NotifySend.prototype.Warning = function(Title, Text, Timeout, Type) {
    this.Check(Title, Text, Timeout, "Warning");
    this.provider.SendMessage(this.title, this.text, this.time, this.type);
}

_NotifySend.prototype.Info = function(Title, Text, Timeout, Type) {
    this.Check(Title, Text, Timeout, "Info");
    this.provider.SendMessage(this.title, this.text, this.time, this.type);
}

_NotifySend.prototype.Error = function(Title, Text, Timeout, Type) {
    this.Check(Title, Text, Timeout, "Error");
    this.provider.SendMessage(this.title, this.text, this.time, this.type);
}

_NotifySend.prototype.Message = function(Title, Text, Timeout, Type) {
    this.Check(Title, Text, Timeout, Type);
    this.provider.SendMessage(this.title, this.text, this.time, this.type);
}

_NotifySend.prototype.Check = function(Title, Text, Timeout, Type) {
    this.title = Title; this.text = Text, this.time = Timeout, this.type = Type;
    if (this.time==undefined) this.time = this.settings.current["TimeEvent"]
    if (this.text == undefined) this.text = "";
    if (this.title == undefined) this.title = "";
    
    if ((this.title.length > 62) && (this.text.length==0)) {
        this.text = this.text.substr(62);
        this.title = this.title.substr(0, 62);
    }
    if (this.type == undefined) this.type = this.settings.current["TypeEvent"];
    
}

_NotifySend.prototype.SendMessage = function(title, text, timeout, type) {
    
    title = title.replace(/\\/g, "\\\\").substr(0, 62);
    text = text.replace(/\n/g, "~n").replace(/\t/g, "~t").replace(/"/g, "~q");
    var cmd = '"' + env.pathes.tools +'TrayTip.exe" "'+title+'" "'+ text +'" ' +timeout+' '+type;
    ЗапуститьПриложение(cmd, "", false);
}

_NotifySend.prototype.ShowDialog = function () {
    return this.form.DoModal();
}

_NotifySend.prototype.saveSettings = function () {
    this.form.MessagePovider = this.form.Controls.МетодОповещения.Значение;
    this.settings.ReadFromForm(this.form);
    this.settings.SaveSettings();
    this.provider = this.initprovider(this.form.MessagePovider);
}

_NotifySend.prototype.CmdBarOK = function (Кнопка) {
    this.saveSettings()
    this.form.Close(true);
}

_NotifySend.prototype.CmdBarSave = function (Кнопка) {
	this.saveSettings();
}

_NotifySend.prototype.OnOpen = function () {
    this.settings.ApplyToForm(this.form);
    var СписокВыбора = v8New("ValueList");
    СписокВыбора.Добавить("TrayTip");
    СписокВыбора.Добавить("Встроенный1С");
    this.form.Controls.МетодОповещения.СписокВыбора = СписокВыбора;
    if (this.form.Controls.МетодОповещения.СписокВыбора.findByValue(this.form.MessagePovider)!=undefined)
        this.form.Controls.МетодОповещения.Значение = this.form.MessagePovider;

}

_NotifySend.prototype.BeforeClose = function (Cancel, DefaultHandler) {
    
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

_NotifySend.prototype.МетодОповещенияПриИзменении = function(Элемент) {
    this.form.MessagePovider = Элемент.Значение;
}


////
////} NotifySend
////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////
////{ TrayTipProvider 
////

function _TrayTipProvider() {
    this.test = "";
}

_TrayTipProvider.prototype.SendMessage = function(title, text, timeout, type) {
    title = title.replace(/\\/g, "\\\\").substr(0, 62);
    text = text.replace(/\n/g, "~n").replace(/\t/g, "~t").replace(/"/g, "~q");
    var cmd = '"' + env.pathes.tools+'TrayTip.exe" "'+title+'" "'+ text +'" ' +timeout+' '+type;
    ЗапуститьПриложение(cmd, "", false);
}

////
////} TrayTipProvider
////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////
////{ InternalProvider 
////

function _InternalProvider(picture) {
    this.picture = picture;
}

_InternalProvider.prototype.SendMessage = function(title, text, timeout, type) {
    var pic = this.picture[type];
    pic = pic ? pic : '';
    ПоказатьОповещениеПользователя(title, "e1cib/app/Обработка", text, pic)
}

////
////} InternalProvider
////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////
////{ Start up
////

settings = SettingsManagement.CreateManager('NotifySend', { 
                    'TimeEvent': 10,  //Время сообщения по умолчанию.
                    "TypeEvent":"Info", // Тип сообщения по умолчанию 
                    "MessagePovider":"TrayTip" // провайдер сообщений, может быть как traytip, так и встроенный
                    })
settings.LoadSettings();

////
////} Start up
////////////////////////////////////////////////////////////////////////////////////////
