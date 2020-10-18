//engine: JScript
//uname: logview
//dname: Просмотр истории изменений
//addin: global
//addin: extfiles
//addin: stdcommands
//addin: stdlib


// (c) Сосна Евгений shenja at sosna.zp.ua
// Скрипт - просмотр истории для версионного контроля.

global.connectGlobals(SelfScript)

var мФормаЖурнала=null
var Backend = null
var RootPath = null
var RootFile = null



function macrosЖурнал(){
    var Form = CreateLogViewForm();
    Form.open();
    /* var pathToForm=SelfScript.fullPath.replace(/js$/, 'ssf')
    мФормаЖурнала=loadScriptForm(pathToForm, SelfScript.self) // Обработку событий формы привяжем к самому скрипту
    мФормаЖурнала.Открыть(); */
}

function CreateLogViewForm() {
    return new _LogView();
}

function _LogView() {

    this.form = loadScriptForm(SelfScript.fullPath.replace(/js$/, 'ssf'), this);
    this.backend = null;
    this.rootpath = null;

    this.timeline = this.form.timeline;
    this.listfiles = this.form.СписокИзминенийФайлов;

    this.listtocompare = [];
    this.LimitRevisions = мКвоРевизийПоУмолчанию;

}

_LogView.prototype.open = function (caller, path) {
    this.backend = caller;
    this.rootpath = path;
    this.form.КвоРевизийПоУмолчанию = this.LimitRevisions;
    this.form.Caption = "Просмотр истории "+ this.rootpath;
    
    if ((this.backend) && (this.rootpath))
        this.init()

    this.form.Open();
}

_LogView.prototype.init = function () {

    this.timeline.Очистить();
    result = this.backend("GETLOG", this.rootpath, this.LimitRevisions);
    for (var i=0; i<result.length; i++) {
        НоваяСтрока = this.timeline.Добавить();
        НоваяСтрока.Версия = result[i]['version']
        НоваяСтрока.Коментарий = result[i]['comment']
        НоваяСтрока.Автор = result[i]['author']
        НоваяСтрока.Дата = result[i]['date']
    }
}

_LogView.prototype.listfilesBeforeEdit = function (Элемент, Отказ) {
    Отказ = true;
}

_LogView.prototype.timelineПриАктивизацииСтроки = function (Элемент) {
    this.listfiles.Очистить();
    this.form.ЭлементыФормы.ПолеТекстовогоДокумента1.УстановитьТекст("");
    //мФормаЖурнала.СписокИзминенийФайлов.Очистить();
    if ((this.backend) && (this.rootpath)) {
        var ТекущаяСтрока = this.form.ЭлементыФормы.timeline.ТекущиеДанные;
        if (ТекущаяСтрока) {
            var result = this.backend("GETINFO", this.rootpath, ТекущаяСтрока.Версия);
            this.form.ЭлементыФормы.ПолеТекстовогоДокумента1.УстановитьТекст(result['comment']);
            var files = result['files'];
            for (var i=0; i<files.length; i++) {
                НоваяСтрока = this.listfiles.Добавить();
                НоваяСтрока.Версия = files[i]['version'];
                НоваяСтрока.Файл = files[i]['file'];
                НоваяСтрока.Статус = files[i]['status'];
                НоваяСтрока.ИмяФайла = files[i]['fullpath'] // минимальные действия на форме.
            }
        }
    }
}

_LogView.prototype.КПСравненияКПСохранитьВерсию = function (Элемент) {
    //Диалог для выбора сохранения файла...
    var ТекущаяСтрока = this.form.ЭлементыФормы.СписокИзминенийФайлов.ТекущиеДанные;
    if (ТекущаяСтрока) {
        var мКаталог = "";
        var f = v8New("File", ТекущаяСтрока.ИмяФайла);
        if (f.Exist()){
            if  (!f.IsDirectory()) {
                мКаталог = f.Path;
            } else {
                мКаталог = ТекущаяСтрока.ИмяФайла;
            }
        }
        path = this.backend("GETFILEATREVISION", ТекущаяСтрока.ИмяФайла, ТекущаяСтрока.Версия);
        var f = v8New("File", path);
        if (!f.Exist()) {
            Message("Не возможно получить файл из системы версионного контрорля! "+ ТекущаяСтрока.ИмяФайла);
            return;
        }

        ДиалогСохраненияФайла=v8New("ДиалогВыбораФайла", РежимДиалогаВыбораФайла.Save);
        ДиалогСохраненияФайла.Каталог = мКаталог;
        ДиалогСохраненияФайла.ПолноеИмяФайла = мКаталог + f.Name;
        ДиалогСохраненияФайла.Заголовок = "Выберете путь для сохранения файла"
        if(ДиалогСохраненияФайла.Выбрать()==false) return ""
        try {
            ПереместитьФайл(path, ДиалогСохраненияФайла.ПолноеИмяФайла);
        } catch (e) {
            Message("Не удалось сохранить файла по пути " + ДиалогСохраненияФайла.ПолноеИмяФайла + " по причине "+e.description)
        }
    }
}

_LogView.prototype.КПСравненияКПДобавитьКСравнению = function (Элемент) {
    var ТекущаяСтрока = this.form.ЭлементыФормы.СписокИзминенийФайлов.ТекущиеДанные;
    if (ТекущаяСтрока) {
        var i = this.listtocompare.length;
        if (i > 2) {
            //Не должно так быть, удалим весь массив и грязно поругаемся.
            this.listtocompare= [];
            Message("Исключительная ситуация при добавлении файлов в список сравнения, пока больше 2х не поддерживается 1С");
            return;
        }
        i = i>0? 1:0; //номер индекса в массиве.
        this.listtocompare[i] = {'version':ТекущаяСтрока.Версия, 'file':ТекущаяСтрока.ИмяФайла};
        if (i>0) {
            //вызовем сравнение файлов...
            if (this.backend) {
                path1 = this.backend("GETFILEATREVISION", this.listtocompare[0]['file'], this.listtocompare[0]['version']);
                path2 = this.backend("GETFILEATREVISION", this.listtocompare[1]['file'], this.listtocompare[1]['version']);
                extfiles.СравнитьФайлы(path1, path2);
            }

            this.listtocompare = [];
        }
    }
}

_LogView.prototype.КПСравненияКПСравнить = function (Элемент) {
    var ТекущаяСтрока = this.form.ЭлементыФормы.СписокИзминенийФайлов.ТекущиеДанные;
    if (ТекущаяСтрока) {
        if (this.backend) {
            path1 = this.backend("GETFILEATREVISION", ТекущаяСтрока.ИмяФайла, ТекущаяСтрока.Версия)
            path2 = ТекущаяСтрока.ИмяФайла;
            extfiles.СравнитьФайлы(path1, path2);
        }
    }
}

_LogView.prototype.КнОбновитьНажатие = function (Элемент) {
    this.LimitRevisions = this.form.КвоРевизийПоУмолчанию; //Надо придумать настройку для сохранения.
    this.init(); 
}

function getDefaultMacros() {
    return 'Журнал'
} //getDefaultMacros


////////////////////////////////////////////////////////////////////////////////////////
////{ Инициализация скрипта
////

var pflLogViewLimitOfRevisions         = "LogView/LimitRevisions"
profileRoot.createValue(pflLogViewLimitOfRevisions, 30, pflSnegopat);

var мКвоРевизийПоУмолчанию = profileRoot.getValue(pflLogViewLimitOfRevisions)
////} Инициализация скрипта