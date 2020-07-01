//engine: JScript
//uname: funcprocpanel
//dname: Панель функ/проц с группировкой по контексту компиляции
//descr: Скрипт для показа "списка процедур"
//author: Сосна Евгений <shenja@sosna.zp.ua>
//www: https://snegopat.ru/scripts/wiki?name=FuncProcPanel.js
//help: inplace
//addin: vbs
//addin: global
//addin: stdlib
//addin: stdcommands

/*@
(c) Сосна Евгений <shenja@sosna.zp.ua>

Скрипт для показа "списка процедур".
В отличии от штатной панели окон показывает список процедур/функций в табличном поле, 
сортируя в контексте выполенения процедур НаКлиенте/НаСервере.

По умолчанию показ списка методов назначается на `Ctrl+3`.
@*/

stdlib.require('SyntaxAnalysis.js', SelfScript);
stdlib.require('TextWindow.js', SelfScript);
stdlib.require('SettingsManagement.js', SelfScript);
stdlib.require('log4js.js', SelfScript);
stdlib.require("SelectValueDialog.js", SelfScript);

global.connectGlobals(SelfScript)

var logger = Log4js.getLogger(SelfScript.uniqueName);
var appender = new Log4js.BrowserConsoleAppender();
appender.setLayout(new Log4js.PatternLayout(Log4js.PatternLayout.TTCC_CONVERSION_PATTERN));
logger.addAppender(appender);
logger.setLevel(Log4js.Level.ERROR);

countopenindex = 0;
//СтруктураМетодаOnRowOutput
////////////////////////////////////////////////////////////////////////////////////////
////{ Макросы
////

SelfScript.self['macrosОткрыть окно'] = function() {
    var f = GetFuncProcPanel();
    f.Reload();
    f.Show();
}

SelfScript.self['macrosTest'] = function() {
    var f = GetFuncProcPanel();
    f.moveFuncDown();

}

function getPredefinedHotkeys(predef)
{
    predef.setVersion(3)
    predef.add("Открыть окно", "Ctrl + 3")
}

/* Возвращает название макроса по умолчанию - вызывается, когда пользователь 
дважды щелкает мышью по названию скрипта в окне Снегопата. */
function getDefaultMacros() {
    return 'Открыть окно';
}

////} Макросы


function FuncProcPanel() {
    
    FuncProcPanel._instance = this;
    
    this.form = loadScriptFormEpf(env.pathes.addins + "FuncProcPanel.epf", "Форма", this);
    this.form.КлючСохраненияПоложенияОкна = "FuncProcPanel.js"
    this.results = this.form.FunctionList;
    this.results.Columns.Add('_method');
    this.results.Columns.Add('isActive');
    //Таблица, на основании которой будет делать или дерево или просто список... 
    this.methods = this.results.Copy();

    this.watcher = new TextWindowsWatcher();
    this.watcher.startWatch();
    
    this.isForm = false; //Признак формы и необходимости строить дерево.
    this.defaultSettings = {
        'TreeView'      : false , // Группировать результаты поиска по контекстам.
        'FuncProcViewRecursive' : true, //Показывать вызовы процедур.
        'index': 0
    };
        
    this.settings = SettingsManagement.CreateManager(SelfScript.uniqueName, this.defaultSettings);
    this.settings.LoadSettings();
    this.settings.ApplyToForm(this.form);
    
    this.targetWindow = null;
    
    this.lastFilter = '';
    
    this.groupsCache = v8New("Map");
    this.Icons = {
        'Func': this.form.Controls.PicFunc.Picture,
        'Proc': this.form.Controls.PicProc.Picture,
        'Form': this.form.Controls.PicForm.Picture,
        'Forward':this.form.Controls.PicForward.Picture
    }
    this.tree = v8New("ValueTable");
    this.tree.Колонки.Добавить("Контрол");
    this.tree.Колонки.Добавить("ТипЭлемента");
    this.tree.Колонки.Добавить("Событие");
    this.tree.Колонки.Добавить("Действие");
    //Возьмем пример у Орефкова из wndpanel
    this.needHide = false;
    this.RE_CONTEXT_ATCLIENT      = new RegExp('^\\s*(AtClient|НаКлиенте)\\s*', 'i')

    this.form.Controls.InvisiblePanel.Кнопки.SelectAndHide.СочетаниеКлавиш = stdlib.v8hotkey(13,8)
    this.cache = v8New("Map");
    this.cnt = null;
    
    this.index = countopenindex;
    this.maxShows = 7;
    this.numberRow = 0;

}
FuncProcPanel.prototype.InvisiblePanelSelectAndHide = function(Button) {

    this.goToLine(this.form.Controls.FunctionList.CurrentRow)
    this.needHide = true;
}

FuncProcPanel.prototype.FunctionListMethodПриИзменении = function(Элемент){
    this.goToLine(this.form.Controls.FunctionList.CurrentRow);
    this.needHide = true;
}

FuncProcPanel.prototype.Show = function () {
    this.index = this.index + 1;
    countopenindex = countopenindex+1;
    this.numberRow = 0;


    this.form.Open();
}

FuncProcPanel.prototype.Close = function () {
    if (this.form.IsOpen())
    {
        this.form.Close();
        return true;
    }
    return false;
}

FuncProcPanel.prototype.IsOpen = function () {
    return this.form.IsOpen();
}

FuncProcPanel.prototype.GetList = function () {

    this.methods.Rows.Clear();
    this.targetWindow = this.watcher.getActiveTextWindow();
    //debugger;
    if (!this.targetWindow) {
        this.isForm = false;
    } else {
        // Проверим, что это Форма.
        // Свойство mdProp показывает, к какому свойству объекта метаданных относится окно  
        if (!this.targetWindow.textWindow.mdProp){
            this.isForm = false;
        } else {
            this.isForm = (this.targetWindow.textWindow.mdProp.name(1) == "Форма")
        }
    }
    if (this.isForm) {
        /* 
        var wnd = this.targetWindow.textWindow;
        //
        if (this.cache.Get(wnd.hwnd)==undefined) {
            var extProp = wnd.mdObj.getExtProp(wnd.mdProp.id)
            var isManagmendForm = false;
            // Сохраним текущее состояние свойства "Форма" в файл. Так как файл в saveToFile не передан, то
            // сохранение произойдет в псевдо-файл в памяти.
            var file = extProp.saveToFile()
            try{
                // создадим хранилище на базе файла. Для управляемых форм тут вывалится в catch
                var stg = v8Files.attachStorage(file)
                // Получим из хранилища содержимое под-файла form
                var form = extProp.getForm();
                isManagmendForm = false
            }catch(e)
            {
                isManagmendForm = true;
                file.seek(0, fsBegin)
                var text = file.getString(dsUtf8);
            }
            this.tree.Clear();
            if (isManagmendForm) {
                try {
                    this.CreateTreeManagmentForm(text, this.tree); 
                } catch (e) {
                        // Ошибок, еще может быть много ...
                       //Message("Ошибка парсинга "+e.description)
                };
                //this.form.Controls.TreeView.Контрол.Visible = true;
            } else {
                //debugger
                this.CreateTreeDicForm(form, this.tree)
                //this.form.Controls.FunctionList.Columns.Контрол.Visible = true;
            }
            this.cache.Insert(wnd.hwnd, this.tree.Copy())
        } else {
            this.tree = this.cache.Get(wnd.hwnd).Copy();
        }
        */
        
    }

    var contextCache = v8New("Map");
    // ассоциативный массив, с вызовами в текущем модуле.
    var Calls = {};
    if (!this.targetWindow)
        return
    if (!this.targetWindow.textWindow)
        return

    cnt = SyntaxAnalysis.AnalyseTextDocument(this.targetWindow);
    this.cnt = cnt;
    currentMethod = cnt.getActiveLineMethod();
    vtModules = cnt.getMethodsTable();
    for (var i = 0; i<vtModules.Count(); i++) {
        var thisRow = vtModules.Get(i);
        var newRow = this.methods.Rows.Add();
        newRow.LineNo = thisRow.StartLine;
        newRow.Method = thisRow.Name;
        //newRow.Context =this.isForm?thisRow.Context:" ";
        newRow.Context =thisRow.Context;
        newRow._method = thisRow._method;
        if (currentMethod!=undefined) {
            if (thisRow.Name == currentMethod.Name){
                newRow.isActive = true;
            }
        }
        if (this.isForm) {
            var filter_struct = v8New("Структура");
            //FIXME: исправить при определении наименований функций, убрать лишние ковычки "
            filter_struct.Insert("Действие", '"'+newRow.Method +'"');
            var МассивСтрок = this.tree.FindRows(filter_struct);
            if (МассивСтрок.Count()>0) {
                newRow.КонтролТип = 1;
                for (var z=0; z<МассивСтрок.Count(); z++) {
                    ЭлементСтроки = МассивСтрок.Get(z);
                    if (z>0) {
                        newRow.Контрол = newRow.Контрол+ ";"+ЭлементСтроки.Контрол;
                        newRow.ТипЭлемента = newRow.ТипЭлемента+ ";"+ЭлементСтроки.ТипЭлемента;
                    } else {
                        newRow.Контрол = (ЭлементСтроки.Контрол==undefined)? " ": ЭлементСтроки.Контрол;
                        newRow.ТипЭлемента = (ЭлементСтроки.ТипЭлемента==undefined)? " ": ЭлементСтроки.ТипЭлемента;
                    }
                }
            }
         }
        //if (this.form.FuncProcViewRecursive && !this.form.CallsView) {
        //    for (var z=0; z<thisRow._method.Calls.length; z++) {
        //        if (cnt.context.getMethodByName(thisRow._method.Calls[z])!=undefined) {
        //            if (Calls[thisRow._method.Calls[z]]==undefined) {
        //                Calls[thisRow._method.Calls[z]] = new Array();
        //                Calls[thisRow._method.Calls[z]].push(thisRow.Name);
        //            } else {
        //                Calls[thisRow._method.Calls[z]].push(thisRow.Name);
        //            }
        //        }
        //   }
       //}
        contextCache.Insert(newRow.Context , "1"); 
    }
    //FIXME: добавить настройку сортировки по алфавиту/порядку объявления...
    this.methods.Rows.Sort("Контрол, Context, Method"); //Сортировка по умолчанию по порядку.
    //if (this.form.FuncProcViewRecursive) {
    //    //Добавим локальные вызовы функций процедур. 
    //    for (var i = 0; i<this.methods.Rows.Count(); i++) {
    //        var thisRow = this.methods.Rows.Get(i);
    //        if (Calls[thisRow.Method]!=undefined){
    //            for (var y=0; y<Calls[thisRow.Method].length; y++){
    //                thisRow.Контрол = (thisRow.Контрол.length<1)? Calls[thisRow.Method][y]: thisRow.Контрол+";"+Calls[thisRow.Method][y]
    //                thisRow.КонтролТип = 2;
    //            }
    //        }
    //    }
    //}
    
    this.form.TreeView = (contextCache.Count()>1) //(this.isForm && (contextCache.Count()>1))
    //проанализруем управляемую форму...
    this.form.CurrentControl=this.form.Controls.ТекстФильтра;
    
}

FuncProcPanel.prototype.InvisiblePanelAddSubscriptionAtServer = function(Button){
    logger.debug("InvisiblePanelAddSubscriptionAtServer");
    //debugger;
    var curRow =  this.form.Controls.FunctionList.CurrentRow;
    if (!curRow){
        logger.error("Не выбрана строка!");
        return;
    }
        

    var Matches = this.RE_CONTEXT_ATCLIENT.exec(curRow.Context);
    if (!Matches) {
        logger.error('Текущая процедура не на клиенте '+curRow.Context);
        return;
    }

    logger.debug(curRow.Method);
    
    var name = curRow.Method;

    var newNameAtServer = name + ((curRow.Context == 'AtClient') ? 'AtServer':'НаСервере');
    var newNameAtServerNoContext = name + ((curRow.Context == 'AtClient') ? 'AtServerNoContext':'НаСервереБезКонтекста');

    var values = v8New('СписокЗначений');
    values.Add(1, newNameAtServer + '('+((curRow.Context == 'AtClient') ? '&AtServer':'&НаСервере') + ')');
    values.Add(2, newNameAtServerNoContext + '('+((curRow.Context == 'AtClient') ? '&AtServerNoContext':'&НаСервереБезКонтекста') + ')');
    
    var dlg = new SelectValueDialog("Выберите контекст создания процедуры!", values);
    if (dlg.selectValue()) {

        var name = '';
        if (dlg.selectedValue==1){
            var name = newNameAtServer;
            var context = (curRow.Context == 'AtClient') ? '&AtServer':'&НаСервере';
        } else {
            var name = newNameAtServerNoContext;
            var context = (curRow.Context == 'AtClient') ? '&AtServerNoContext':'&НаСервереБезКонтекста';
        }
    
        //Проверим есть ли такая же процедура уже созданная. 
        
        var filter_struct = v8New("Структура");
        filter_struct.Insert("Method", name);
        var МассивСтрок = this.methods.Rows.FindRows(filter_struct);
        if (МассивСтрок.Count()>0) {
            logger.error("Такая процедура уже существует!");
            return;
        }
        

        if (!this.targetWindow)
            return;
     
        if (!this.targetWindow.IsActive())
        {
            //DoMessageBox("Окно, для которого показывался список, было закрыто!\nОкно с результатами стало не актуально и будет закрыто.");
            logger.error("Окно, для которого показывался список, было закрыто!\nОкно с результатами стало не актуально и будет закрыто.");
            this.Close();
            return;
        }

        var newText = '\n'+context + '\n' + ((curRow.Context == 'AtClient')?'Procedure':'Процедура')+ ' '+name + '()\n';
        newText += '\n\n'+((curRow.Context == 'AtClient')?'EndProcedure':'КонецПроцедуры')

        this.activateEditor();
        var curLine = 0;
        var isActive = false;
        var filter_struct = v8New("Структура");
        filter_struct.Insert("Method", curRow.Method);
        var МассивСтрок = this.methods.Rows.FindRows(filter_struct);
        if (МассивСтрок.Count()>0) {
            curLine = МассивСтрок.Get(0)._method.EndLine;
            isActive = МассивСтрок.Get(0).isActive;
        }
        if (isActive){
            var pos = this.targetWindow.GetCaretPos();
            line = this.targetWindow.GetLine(pos.beginRow); //.replace(/^\s*|\s*$/g, '');

            function getTextBlockOffset(str){
                var match = str.match(/^([\s]+)/ig);
                var res = !match ? "" : match[0];
                return res;
            }

            insertLine = getTextBlockOffset(line)+ name+'();';
            curLine += 1;
            this.targetWindow.InsertLine(pos.beginRow, insertLine);
        }

        if (curLine<2){
            this.targetWindow.addLine(newText);

        } else {
            this.targetWindow.InsertLine(curLine+2, newText);    
        }
        
        
    }


}

FuncProcPanel.prototype.CreateTreeManagmentForm = function(text, tree){
    var РегулярноеВыражение = new RegExp(/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/i);
    //debugger;

    function ОпределитьТипЭлемента(ТипЭлемента, ИндексТипаЭлемента) {
        var ПолученныйТипЭлемента = "";
        if (ТипЭлемента=="77ffcc29-7f2d-4223-b22f-19666e7250ba") {
            switch (ИндексТипаЭлемента) 
            {
            case "1":
                ПолученныйТипЭлемента="Поле надписи";
                break
            case "2":
                ПолученныйТипЭлемента="Поле ввода";
                break
            case "3" :
                ПолученныйТипЭлемента="Поле флажка";
                break
            case "4":
                ПолученныйТипЭлемента="Поле картинки";
                break
            case "5":
                ПолученныйТипЭлемента="Поле переключателя";
                break
            case "6":
                ПолученныйТипЭлемента="Поле табличного документа";
                break
            case "7":
                ПолученныйТипЭлемента="Поле текстового документа";
                break
            case "15":
                ПолученныйТипЭлемента="Поле HTML документа";
                break
            default:
                ПолученныйТипЭлемента= ТипЭлемента+"_"+ИндексТипаЭлемента;
                break;
            }
        }
        if (ТипЭлемента=="cd5394d0-7dda-4b56-8927-93ccbe967a01") {
            switch (ИндексТипаЭлемента) 
                {
                case "0":
                    ПолученныйТипЭлемента="Группа - командная панель";
                    break
                case "1":
                    ПолученныйТипЭлемента="Группа подменю";
                    break;
                case "2":
                    ПолученныйТипЭлемента="Группа колонок";
                    break;
                case "3" :
                    ПолученныйТипЭлемента="Группа - страницы";
                    break;
                case "4" :
                    ПолученныйТипЭлемента="Группа - страница";
                    break;
                case "5" :
                    ПолученныйТипЭлемента="Обычная группа";
                    break;
                case "6" :
                    ПолученныйТипЭлемента="Группа кнопок";
                    break;
                default:
                    ПолученныйТипЭлемента= ТипЭлемента+"_"+ИндексТипаЭлемента;
                    break;
                }
        }
        if (ТипЭлемента=="a9f3b1ac-f51b-431e-b102-55a69acdecad") {
            switch (ИндексТипаЭлемента) 
                {
                case "0":
                    ПолученныйТипЭлемента = "Кнопка командной панели" ;
                    break;
                case "1" :
                    ПолученныйТипЭлемента="Кнопка (обычная кнопка)";
                    break
                case "2" :
                    ПолученныйТипЭлемента="Кнопка (гиперссылка)";
                    break
                default:
                    ПолученныйТипЭлемента= ТипЭлемента+"_"+ИндексТипаЭлемента;
                    break
                }
        }
        if (ТипЭлемента=="3d3cb80c-508b-41fa-8a18-680cdf5f1712") {
            switch (ИндексТипаЭлемента) 
                {
                case "0":
                    ПолученныйТипЭлемента = "Декорация (надпись)" ;
                    break;
                case "1" :
                    ПолученныйТипЭлемента = "Декорация (картинка)";
                    break;
                default:
                    ПолученныйТипЭлемента= ТипЭлемента+"_"+ИндексТипаЭлемента;
                    break;
                }
        };
        if (ТипЭлемента=="143c00f7-a42d-4cd7-9189-88e4467dc768") {
          switch (ИндексТипаЭлемента) 
                {
                case "0":
                    ПолученныйТипЭлемента = "Табличное поле" ;
                    break;
                case "1" :
                    ПолученныйТипЭлемента = "Таблица (Табличное поле)";
                    break;
                case "2" :
                    ПолученныйТипЭлемента = "Таблица (поле списка)";
                    break;
                default:
                    ПолученныйТипЭлемента= ТипЭлемента+"_"+ИндексТипаЭлемента;
                    break;
                }  
        }


        return ПолученныйТипЭлемента;
    }

    function ЗагрузитьПодчиненные(Узел, НоваяСтрока, НомерСтроки, tree, МассивКоманд) {
        //debugger
        var КоличествоПодчиненныхЭлементов=parseInt(Узел.ДочерниеУзлы.Item(НомерСтроки).ТекстовоеСодержимое);
        var РегулярноеВыражение = new RegExp(/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/i);
        var ТипЭлемента = undefined;
        for (var i=1; i<=КоличествоПодчиненныхЭлементов*2; i++) {
            var ИсследуемыйУзел=Узел.ДочерниеУзлы.Item(НомерСтроки+i);
            if (ИсследуемыйУзел.ИмяУзла=="data") {
                ТипЭлемента = ИсследуемыйУзел.ТекстовоеСодержимое;
            } else {
                НоваяСтрока = tree.add();
                var ДопИндекс = (ИсследуемыйУзел.ДочерниеУзлы.Item(4).ТекстовоеСодержимое=="0") ? 0:1
                if (ТипЭлемента=="143c00f7-a42d-4cd7-9189-88e4467dc768" || ТипЭлемента=="a9f3b1ac-f51b-431e-b102-55a69acdecad"){
                    НоваяСтрока.Контрол = ИсследуемыйУзел.ДочерниеУзлы.Item(6).ТекстовоеСодержимое;
                } else {
                    НоваяСтрока.Контрол = ИсследуемыйУзел.Дочерниеузлы.Item(6+ДопИндекс).ТекстовоеСодержимое;
                }
                if (ТипЭлемента=="143c00f7-a42d-4cd7-9189-88e4467dc768" || ТипЭлемента=="a9f3b1ac-f51b-431e-b102-55a69acdecad") {
                    ИндексТипаЭлемента = (ТипЭлемента=="a9f3b1ac-f51b-431e-b102-55a69acdecad") ? ИсследуемыйУзел.Дочерниеузлы.Item(5).ТекстовоеСодержимое:ИсследуемыйУзел.Дочерниеузлы.Item(7).ТекстовоеСодержимое
                } else{
                    ИндексТипаЭлемента=ИсследуемыйУзел.Дочерниеузлы.Item(5+ДопИндекс).ТекстовоеСодержимое;
                }
                НоваяСтрока.ТипЭлемента=ОпределитьТипЭлемента(ТипЭлемента,ИндексТипаЭлемента);
                ДобавитьСобытияЭлементу(НоваяСтрока,ТипЭлемента,ИндексТипаЭлемента,ИсследуемыйУзел.ДочерниеУзлы, tree, МассивКоманд);
                if (ИсследуемыйУзел.ДочерниеУзлы.Количество()>22 && (ТипЭлемента=="cd5394d0-7dda-4b56-8927-93ccbe967a01" || ТипЭлемента=="143c00f7-a42d-4cd7-9189-88e4467dc768")){
                    for (var z=22; z<ИсследуемыйУзел.ДочерниеУзлы.Количество();z++) {
                        var Matches1=undefined;
                        var Match1 = undefined;
                        if (ИсследуемыйУзел.ДочерниеУзлы.Item(z).ИмяУзла=="data") {
                            Matches1=РегулярноеВыражение.exec(ИсследуемыйУзел.ДочерниеУзлы.Item(z).ТекстовоеСодержимое);
                            if (Matches1 && Matches1.length) {
                                if (Matches1[0]!="00000000-0000-0000-0000-000000000000"){
                                    ЗагрузитьПодчиненные(ИсследуемыйУзел, НоваяСтрока,z-1, tree, МассивКоманд);
                                    break
                                }
                            }
                        }

                    }
                }
            }

        }
    }
    
    function ДобавитьСобытияЭлементу(НоваяСтрока,ТипЭлемента,ИндексТипаЭлемента,ДочерниеУзлы, tree, СоответствиеКоманд) {
        //debugger;
        if(ТипЭлемента=="cd5394d0-7dda-4b56-8927-93ccbe967a01") {
            if (ИндексТипаЭлемента!="3") {
             return
             } else {
                if (ДочерниеУзлы.Item(21).ДочерниеУзлы.Item(2).ТекстовоеСодержимое!="0") {
                    УзелРазбора=ДочерниеУзлы.Item(21).ДочерниеУзлы.Item(2);
                    УзелСобытия=УзелРазбора.ДочерниеУзлы.Item(1);
                    НоваяСтрока.Событие=УзелСобытия.ТекстовоеСодержимое;
                    НоваяСтрока.Действие=УзелСобытия.СледующийСоседний.ТекстовоеСодержимое;
                }
             }
        }
        if (ТипЭлемента=="77ffcc29-7f2d-4223-b22f-19666e7250ba"){
            if (ДочерниеУзлы.Item(41).ТекстовоеСодержимое!="0") {
                var УзелРазбора=ДочерниеУзлы.Item(41);
                var КоличествоСобытий=parseInt(УзелРазбора.ПервыйДочерний.ТекстовоеСодержимое);
                ЗаполнитьСобытия(НоваяСтрока, УзелРазбора, КоличествоСобытий, tree);
            }
            //FIXME:  поле флажка (3) еще нет определения 
            //if (ИндексТипаЭлемента!="1"  && ИндексТипаЭлемента!="4" ) {
            if (ИндексТипаЭлемента=="2" ) {
                if(ДочерниеУзлы.Item(40).ДочерниеУзлы.Item(36).ТекстовоеСодержимое!="0") {
                    var УзелРазбора=ДочерниеУзлы.Item(40).ДочерниеУзлы.Item(36);
                    var КоличествоСобытий=parseInt(УзелРазбора.ПервыйДочерний.ТекстовоеСодержимое);
                    var УзелСобытия=УзелРазбора.ДочерниеУзлы.Item(1);
                    ЗаполнитьСобытия(НоваяСтрока, УзелРазбора, КоличествоСобытий, tree);
                }
            }
            if (ИндексТипаЭлемента=="4") {
                if(ДочерниеУзлы.Item(40).ДочерниеУзлы.Item(16).ТекстовоеСодержимое!="0") {
                    var УзелРазбора=ДочерниеУзлы.Item(40).ДочерниеУзлы.Item(16);
                    var КоличествоСобытий=parseInt(УзелРазбора.ПервыйДочерний.ТекстовоеСодержимое);
                    ЗаполнитьСобытия(НоваяСтрока,УзелРазбора,КоличествоСобытий, tree);
                } 
            }
        }
        if (ТипЭлемента=="143c00f7-a42d-4cd7-9189-88e4467dc768") {
            var УзелРазбора=ДочерниеУзлы.Item(56);
            var КоличествоСчетчик=parseInt(ДочерниеУзлы.Item(55).ТекстовоеСодержимое)*2-1;
            УзелРазбора = ПропуститьСтроки(КоличествоСчетчик, УзелРазбора);
            if (УзелРазбора.ТекстовоеСодержимое!="0") {
                var КоличествоСобытий = parseInt(УзелРазбора.ПервыйДочерний.ТекстовоеСодержимое);
                ЗаполнитьСобытия(НоваяСтрока, УзелРазбора, КоличествоСобытий, tree);
            }
            var КоличествоСчетчик=2;
            var РегулярноеВыражение = new RegExp(/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/i);
            УзелРазбора = ПропуститьСтроки(КоличествоСчетчик,УзелРазбора);
            if (УзелРазбора.ТекстовоеСодержимое!="0"){
                for (var y=22; y<=УзелРазбора.ДочерниеУзлы.Количество()-1; y++){

                    var Matches1=undefined;
                    var Match1=undefined;
                    if (УзелРазбора.ДочерниеУзлы.Item(y).ИмяУзла=="data") {
                        Matches1=РегулярноеВыражение.exec(Узел.ДочерниеУзлы.Item(y).ТекстовоеСодержимое);
                        if (Matches1 && Matches1.length) {
                            if (Matches1[0]!="00000000-0000-0000-0000-000000000000"){
                                var НоваяСтрока = tree.add();
                                НоваяСтрока.Контрол = "Контекстное меню";
                                НоваяСтрока.ТипЭлемента = "Контекстное меню"
                                ЗагрузитьПодчиненные(УзелРазбора, НоваяСтрока,y-1, tree, СоответствиеКоманд);
                                break
                            }
                        }
                    }
                }
            }
            var КоличествоСчетчик=1;
            УзелРазбора = ПропуститьСтроки(КоличествоСчетчик,УзелРазбора);
            if (УзелРазбора.ТекстовоеСодержимое!="0") {
                for (var y=22; y<=УзелРазбора.ДочерниеУзлы.Количество()-1; y++){
                    var Matches1=undefined;
                    var Match1=undefined;
                    if (УзелРазбора.ДочерниеУзлы.Item(y).ИмяУзла=="data") {
                        Matches1=РегулярноеВыражение.exec(УзелРазбора.ДочерниеУзлы.Item(y).ТекстовоеСодержимое);
                        if (Matches1 && Matches1.length) {
                            if (Matches1[0]!="00000000-0000-0000-0000-000000000000"){
                                
                                var НоваяСтрока = tree.add();
                                НоваяСтрока.Контрол = "Командная панель";
                                НоваяСтрока.ТипЭлемента = "Командная панель"
                                ЗагрузитьПодчиненные(УзелРазбора, НоваяСтрока,y-1, tree, СоответствиеКоманд);
                                break
                            }
                        }
                    }
                }
            } 
        }
        if (ТипЭлемента=="3d3cb80c-508b-41fa-8a18-680cdf5f1712") {
            if (ИндексТипаЭлемента=="1") {
                if(ДочерниеУзлы.Item(19).ДочерниеУзлы.Item(10).ТекстовоеСодержимое!="0") {
                    УзелРазбора=ДочерниеУзлы.Item(19).ДочерниеУзлы.Item(10);
                    КоличествоСобытий=parseInt(УзелРазбора.ПервыйДочерний.ТекстовоеСодержимое);
                    ЗаполнитьСобытия(НоваяСтрока,УзелРазбора,КоличествоСобытий, tree);
                }
            } else {
                if (ДочерниеУзлы.Item(19).ДочерниеУзлы.Item(5).ТекстовоеСодержимое!="0") {
                    var УзелРазбора=ДочерниеУзлы.Item(19).ДочерниеУзлы.Item(5);
                    var КоличествоСобытий=parseInt(УзелРазбора.ПервыйДочерний.ТекстовоеСодержимое);
                    ЗаполнитьСобытия(НоваяСтрока,УзелРазбора,КоличествоСобытий, tree);
                } 
            }  
        }
        if (ТипЭлемента=="a9f3b1ac-f51b-431e-b102-55a69acdecad"){
            //debugger
            var КомандаКнопки= СоответствиеКоманд.Получить(ДочерниеУзлы.Item(9).ТекстовоеСодержимое);
            if (КомандаКнопки!=undefined){
                НоваяСтрока.Событие=КомандаКнопки['ИмяКоманды'];
                НоваяСтрока.Действие=КомандаКнопки['Действие'];
            }
        }
        
    }

    function StringInternalInXml (вхСтрока){
     //{ Получение одной длинной строки
        var выхХМЛТело = вхСтрока.replace(/\n/g, "#%");
        выхХМЛТело = выхХМЛТело.replace(/\r/g, "#%");
     //}

     //{ Заменяем символы, критичные для XML
        // & на "&amp;"
        // < на "&lt;"
        // > на "&gt;"
        выхХМЛТело = выхХМЛТело.replace(/&/g,"&amp;");
        выхХМЛТело = выхХМЛТело.replace(/</g,"&lt;");
        выхХМЛТело = выхХМЛТело.replace(/>/g,"&gt;");
     //}

        //Решаем проблему с кавычками:
        выхХМЛТело=выхХМЛТело.replace(/\"\"/g,"^$^$");
        выхХМЛТело=выхХМЛТело.replace(/\"/g,"\n^$");
        //выхХМЛТело =СтрЗаменить(выхХМЛТело,"""",Символы.ПС+"^$");
        //Обрабатываем документ построчно:
        КавычкаОткрыта=true;
        новХМЛТело="";
        var ТекстДок=v8New("ТекстовыйДокумент");
        ТекстДок.УстановитьТекст(выхХМЛТело);
        //Message("+============================================")
        //Message(""+выхХМЛТело);
        //Message("+============================================++++++++++++++")
        var Максимум=ТекстДок.LineCount();
        var ВременнаяПеременная="";
        var МассивБлоков=v8New('Массив');
        var РазмерСекции=500;
        var НомерСтроки=1;
        //Message(""+Максимум);
        for (var y = 1; y<=Math.ceil(Максимум/500)+1; y++){
        
            while(НомерСтроки<=РазмерСекции && НомерСтроки<=Максимум) {
                КавычкаОткрыта=!КавычкаОткрыта;
                //СтрокаДляВыводаСостояния="Построение XML формы:    ";
                //ИзобразитьИндикаторВСтрокеСостояния(СтрокаДляВыводаСостояния,НомерСтроки,Максимум);
                //выхСтрока=СтрПолучитьСтроку(выхХМЛТело,НомерСтроки);
                выхСтрока=ТекстДок.ПолучитьСтроку(НомерСтроки);
                if (КавычкаОткрыта){

                    //{Решаем проблему с получением модуля в управляемой форме
                        выхСтрока=выхСтрока.replace(/#%/g,'\r');
                    //}
                    ВременнаяПеременная=ВременнаяПеременная+выхСтрока;
                    НомерСтроки++;
                    continue;
                }
                //{ Замена одинарных символов
                    выхСтрока = выхСтрока.replace(/,/g,"</data><data>");
                    выхСтрока = выхСтрока.replace(/{/g,"<elem><data>");
                    выхСтрока = выхСтрока.replace(/}/g,"</data></elem>");
                //}
                ВременнаяПеременная=ВременнаяПеременная+выхСтрока+'\n';

                НомерСтроки++;
            }
            РазмерСекции=РазмерСекции+500;
            //Message(""+ВременнаяПеременная);
            МассивБлоков.Добавить(ВременнаяПеременная);
            ВременнаяПеременная="";
        }
        новХМЛТело="";
        for (var y=0; y<МассивБлоков.Count(); y++){
            новХМЛТело=новХМЛТело+МассивБлоков.Get(y);
        }
         //{ Восстановление кавычек
            новХМЛТело=новХМЛТело.replace(/\n\^\$/g,"^$");
            новХМЛТело=новХМЛТело.replace(/\^\$/g,'"');
            новХМЛТело=новХМЛТело.replace(/#%/g,"");
        //}

        //{ Удаление лишних блоков
            новХМЛТело = новХМЛТело.replace(/<data><elem>/g,"<elem>");
            новХМЛТело = новХМЛТело.replace(/<\/elem><\/data>/g,"</elem>");
        //}

        //{ Добавление переносов строк для удобства поиска различий
            новХМЛТело = новХМЛТело.replace(/<\/elem>/g,"</elem>\n");
            новХМЛТело = новХМЛТело.replace(/<\/data>/g,"</data>\n");
        //}
        
        //Message("**********************************************************************")
        //Message(новХМЛТело)
        return новХМЛТело;

    }
    
    function ЗаполнитьСобытия(НоваяСтрока,УзелРазбора,КоличествоСобытий, tree) {
        var m=1;
        while (m <=КоличествоСобытий){
            if(m==1){
                var УзелСобытия=УзелРазбора.ДочерниеУзлы.Item(1);
                if (НоваяСтрока.Событие==undefined ||  НоваяСтрока.Событие=="") {
                    НоваяСтрока.Событие=УзелСобытия.ТекстовоеСодержимое;
                    НоваяСтрока.Действие=УзелСобытия.СледующийСоседний.ТекстовоеСодержимое;
                    } else {
                            НоваяСтрокаНов=tree.Добавить();
                            НоваяСтрокаНов.Контрол = НоваяСтрока.Контрол;
                            НоваяСтрокаНов.ТипЭлемента = НоваяСтрока.ТипЭлемента;
                            НоваяСтрокаНов.Событие=УзелСобытия.ТекстовоеСодержимое;
                            НоваяСтрокаНов.Действие=УзелСобытия.СледующийСоседний.ТекстовоеСодержимое;
                }
            } else {
                        var Индекс=m*2-1;
                        УзелСобытия=УзелРазбора.ДочерниеУзлы.Item(Индекс);
                        НоваяСтрокаНов=tree.Добавить();
                        НоваяСтрокаНов.Контрол = НоваяСтрока.Контрол;
                        НоваяСтрокаНов.ТипЭлемента = НоваяСтрока.ТипЭлемента;
                        НоваяСтрокаНов.Событие=УзелСобытия.ТекстовоеСодержимое;
                        НоваяСтрокаНов.Действие=УзелСобытия.СледующийСоседний.ТекстовоеСодержимое;
            }
        
        m++;
        }
    }
    
    function СформироватьСписокКоманд(ДокументDOM) {
        var СоответствиеКоманд=v8New('Соответствие');
        var РазыменовательПИ = v8New('РазыменовательПространствИменDOM', ДокументDOM);
        var ИмяЭлемента="/elem[1]/elem[4]/elem/data[3]"; 
        var РезультатXPath=ДокументDOM.ВычислитьВыражениеXPath(ИмяЭлемента, ДокументDOM, РазыменовательПИ, ТипРезультатаDOMXPath.УпорядоченныйИтераторУзлов);
        while (true){

            var Узел=РезультатXPath.ПолучитьСледующий();
            if (Узел==undefined) 
                break
            

            var Структура=v8New('Структура',"ИмяКоманды,Действие");
            Структура.Вставить("ИмяКоманды",Узел.РодительскийУзел.ДочерниеУзлы.Item(2).ТекстовоеСодержимое);
            Структура.Вставить("Действие",Узел.ТекстовоеСодержимое);
            СоответствиеКоманд.Вставить(Узел.РодительскийУзел.ДочерниеУзлы.Item(1).ТекстовоеСодержимое,Структура);
        }
        return СоответствиеКоманд;
    }

    function ПропуститьСтроки(КоличествоСчетчик,УзелРазбора) {
       var p=0;
       if (КоличествоСчетчик==0) 
            return УзелРазбора;
            
       while(p<=КоличествоСчетчик){
            УзелРазбора = УзелРазбора.СледующийСоседний;
            p++;
            }
       return УзелРазбора;
       }
    
    var МассивФормы = StringInternalInXml(text)
    
    function ПолучитьДокументDOMФормы(МассивФормы) {
        var ЧтениеXML = v8New('ЧтениеXML');
        ЧтениеXML.УстановитьСтроку(МассивФормы);
        var ПостроительDOM = v8New('ПостроительDOM');
        ДокументDOM = ПостроительDOM.Прочитать(ЧтениеXML); 
        return ДокументDOM
    }
    var ДокументDOM=ПолучитьДокументDOMФормы(МассивФормы);
    var РазыменовательПИ = v8New('РазыменовательПространствИменDOM',ДокументDOM);
    var ИмяЭлемента="/elem[1]/elem[1]/node()";
    var РезультатXPath=ДокументDOM.ВычислитьВыражениеXPath(ИмяЭлемента, ДокументDOM, РазыменовательПИ, ТипРезультатаDOMXPath.УпорядоченныйИтераторУзлов);
    var МассивКоманд=СформироватьСписокКоманд(ДокументDOM);
    var Счетчик=1;
    //debugger;
    РазбиратьОбработчикиФормы=undefined;
    while (true){
        var Узел=РезультатXPath.ПолучитьСледующий();
        if (Узел==undefined)
            break

        if (Узел.ИмяУзла=="data") {
            var ТекстовоеСодержимое = Узел.ТекстовоеСодержимое;
            Matches = РегулярноеВыражение.exec(ТекстовоеСодержимое);
            if (Matches!=null && Matches[0]!="00000000-0000-0000-0000-000000000000"){
                    ТипЭлемента=Узел.ТекстовоеСодержимое;
                    break
            }
        }
        if (Счетчик==19 ) {
            var СтрокаФормы=tree.Добавить();
            СтрокаФормы.Контрол="УправляемаяФорма";
            СтрокаФормы.ТипЭлемента="УправляемаяФорма";
            var УзелРазбора=Узел.СледующийСоседний;
            var КоличествоСчетчик=parseInt(Узел.ТекстовоеСодержимое)*2-1;
            УзелРазбора = ПропуститьСтроки(КоличествоСчетчик,УзелРазбора);
            if (УзелРазбора.ТекстовоеСодержимое!="0") {
                    КоличествоСобытий=parseInt(УзелРазбора.ПервыйДочерний.ТекстовоеСодержимое);
                    ЗаполнитьСобытия(СтрокаФормы,УзелРазбора,КоличествоСобытий, tree);
            }
            //debugger
            var КоличествоСчетчик=2;
            УзелРазбора = ПропуститьСтроки(КоличествоСчетчик,УзелРазбора);
            if (УзелРазбора.ТекстовоеСодержимое!="0") {
                for (var y=22; y<=УзелРазбора.ДочерниеУзлы.Количество()-1; y++){

                    var Matches1=undefined;
                    var Match1=undefined;
                    if (УзелРазбора.ДочерниеУзлы.Item(y).ИмяУзла=="data") {
                        Matches1=РегулярноеВыражение.exec(УзелРазбора.ДочерниеУзлы.Item(y).ТекстовоеСодержимое);
                        if (Matches1 && Matches1.length) {
                            if (Matches1[0]!="00000000-0000-0000-0000-000000000000"){
                                var НоваяСтрока = tree.add();
                                НоваяСтрока.Контрол = "Командная панель";
                                НоваяСтрока.ТипЭлемента = "Командная панель"
                                ЗагрузитьПодчиненные(УзелРазбора, НоваяСтрока,y-1, tree, МассивКоманд);
                                break
                            }
                        }
                    }
                }
            } 
        }
        Счетчик++;
    }
    //debugger
    КоличествоПодчиненныхЭлементов=parseInt(Узел.ПредыдущийСоседний.ТекстовоеСодержимое);
    for (var i=1; i<=КоличествоПодчиненныхЭлементов*2; i++) {
        if (Узел==undefined)
            break

        Узел=Узел.СледующийСоседний;
        if (Узел==undefined)
            break

        if (Узел.ИмяУзла=="data"){
            var ТипЭлемента=Узел.ТекстовоеСодержимое;
        } else {
            var ДопИндекс = (Узел.ДочерниеУзлы.Item(4).ТекстовоеСодержимое=="0") ? 0:1
            
            var НаименованиеЭлемента=(ТипЭлемента=="143c00f7-a42d-4cd7-9189-88e4467dc768" || ТипЭлемента=="a9f3b1ac-f51b-431e-b102-55a69acdecad") ? Узел.ДочерниеУзлы.Item(6).ТекстовоеСодержимое : Узел.Дочерниеузлы.Item(6+ДопИндекс).ТекстовоеСодержимое;
            var ИндексТипаЭлемента = ""
            if (ТипЭлемента=="143c00f7-a42d-4cd7-9189-88e4467dc768" || ТипЭлемента=="a9f3b1ac-f51b-431e-b102-55a69acdecad") {
                ИндексТипаЭлемента = (ТипЭлемента=="a9f3b1ac-f51b-431e-b102-55a69acdecad") ? Узел.Дочерниеузлы.Item(5).ТекстовоеСодержимое:Узел.Дочерниеузлы.Item(7).ТекстовоеСодержимое
            } else{
                ИндексТипаЭлемента=Узел.Дочерниеузлы.Item(5+ДопИндекс).ТекстовоеСодержимое;
            } 
            
            НоваяСтрока=tree.Добавить();
            НоваяСтрока.Контрол=НаименованиеЭлемента;
            НоваяСтрока.ТипЭлемента=ОпределитьТипЭлемента(ТипЭлемента,ИндексТипаЭлемента);
            ДобавитьСобытияЭлементу(НоваяСтрока,ТипЭлемента,ИндексТипаЭлемента,Узел.ДочерниеУзлы, tree, МассивКоманд);
            if (Узел.ДочерниеУзлы.Количество()>22 && (ТипЭлемента=="cd5394d0-7dda-4b56-8927-93ccbe967a01" || ТипЭлемента=="143c00f7-a42d-4cd7-9189-88e4467dc768")){
                for (var z=22; z<Узел.ДочерниеУзлы.Количество();z++) {
                    var Matches1=undefined;
                    var Match1 = undefined;
                    if (Узел.ДочерниеУзлы.Item(z).ИмяУзла=="data") {
                        Matches1=РегулярноеВыражение.exec(Узел.ДочерниеУзлы.Item(z).ТекстовоеСодержимое);
                        if (Matches1 && Matches1.length) {
                            if (Matches1[0]!="00000000-0000-0000-0000-000000000000"){
                                ЗагрузитьПодчиненные(Узел, НоваяСтрока,z-1, tree, МассивКоманд);
                                break
                            }
                        }
                    }

                }
            }
        }
    }

}


FuncProcPanel.prototype.CreateTreeDicForm = function(form, tree) {

    function СоставитьСписокОбработчиковСобытий() {
        var Список=v8New('СписокЗначений');
        Список.Добавить("АвтоПодборТекста");
        Список.Добавить("ВнешнееСобытие");
        Список.Добавить("Выбор");
        Список.Добавить("ВыборЗначения");
        Список.Добавить("Нажатие");
        Список.Добавить("НачалоВыбора");
        Список.Добавить("НачалоВыбораИзСписка");
        Список.Добавить("НачалоПеретаскивания");
        Список.Добавить("ОбновлениеОтображения");
        Список.Добавить("ОбработкаАктивизацииОбъекта");
        Список.Добавить("ОбработкаВыбора");
        Список.Добавить("ОбработкаЗаписиНовогоОбъекта");
        Список.Добавить("ОбработкаОповещения");
        Список.Добавить("ОкончаниеВводаТекста");
        Список.Добавить("ОкончаниеПеретаскивания");
        Список.Добавить("Открытие");
        Список.Добавить("Очистка");
        Список.Добавить("ПередЗакрытием");
        Список.Добавить("ПередНачаломДобавления");
        Список.Добавить("ПередНачаломИзменения");
        Список.Добавить("ПередОкончаниемРедактирования");
        Список.Добавить("ПередОткрытием");
        Список.Добавить("ПередУдалением");
        Список.Добавить("Перетаскивание");
        Список.Добавить("ПослеУдаления");
        Список.Добавить("ПриАктивизации");
        Список.Добавить("ПриАктивизацииКолонки");
        Список.Добавить("ПриАктивизацииСтроки");
        Список.Добавить("ПриАктивизацииЯчейки");
        Список.Добавить("ПриВыводеСтроки");
        Список.Добавить("ПриЗакрытии");
        Список.Добавить("ПриИзменении");
        Список.Добавить("ПриИзмененииФлажка");
        Список.Добавить("ПриНачалеРедактирования");
        Список.Добавить("ПриОкончанииРедактирования");
        Список.Добавить("ПриОткрытии");
        Список.Добавить("ПриПовторномОткрытии");
        Список.Добавить("ПриПолученииДанных");
        Список.Добавить("ПриСменеСтраницы");
        Список.Добавить("ПриСменеТекущегоРодителя");
        Список.Добавить("ПроверкаПеретаскивания");
        Список.Добавить("ПередИзменениемРодителя");
        Список.Добавить("ПередРазворачиванием");
        Список.Добавить("ПередСворачиванием");
        Список.Добавить("ПередУстановкойПометкиУдаления");
        Список.Добавить("Регулирование");
        return Список;
    }
    
    function ЗагрузитьКнопки(Элемент,re, tree) {
        for (var i =0 ; i<Элемент.Кнопки.Количество(); i++) {
            var Кнопка = Элемент.Кнопки.Получить(i);
            НоваяСтрока=tree.Добавить();
            НоваяСтрока.Контрол=Кнопка.Имя;
            НоваяСтрока.ТипЭлемента = ValueToStringInternal(Кнопка);
            НоваяСтрока.Событие="Действие";
            text = tov8value(Кнопка.Действие).tostringinternal();
            var Matches = re.exec(text);
            if (Matches && Matches.length) {
                НоваяСтрока.Действие=Matches[1];
            } else {
                НоваяСтрока.Действие = text;
            }
            if(Кнопка.Кнопки!=undefined) {
                if (Кнопка.Кнопки.Количество()>0) 
                    ЗагрузитьКнопки(Кнопка, re, tree)
            }
        }
    }
    
    var СписокОбработчиковСобытий=СоставитьСписокОбработчиковСобытий();
    var re = new RegExp(/{"#",\w{8}-\w{4}-\w{4}-\w{4}-\w{12},\n{\d,\d,\w{8}-\w{4}-\w{4}-\w{4}-\w{12},\n{\d,(.*),\n/i);
    var НоваяСтрока=tree.Добавить();
    НоваяСтрока.Контрол="Форма";
    //debugger
    for (var i=0; i<СписокОбработчиковСобытий.Count(); i++) {
        Событие = СписокОбработчиковСобытий.Get(i).Значение;
        try{
            var Действие=form.ПолучитьДействие(Событие);
            if (Действие!=undefined) {
                if (НоваяСтрока.Событие!=undefined) {
                    НоваяСтрока = tree.add();
                    НоваяСтрока.Контрол = "Форма";
                }
                text = tov8value(Действие).tostringinternal();
                var Matches = re.exec(text);
                if (Matches && Matches.length) {
                    НоваяСтрока.Действие=Matches[1];
                } else {
                    НоваяСтрока.Действие = text;
                }
                НоваяСтрока.Событие=Событие;
                
                
                //Message(""+Событие+" "+tov8value(Действие).tostringinternal());
                
            }
        } catch (e) {}
        
     }
    
    for(var i=0; i<form.ЭлементыФормы.Count(); i++) {
        //var control = form.getControl(i)
        var element = form.ЭлементыФормы.Get(i);
        var НоваяСтрока = tree.add();
        НоваяСтрока.Контрол = element.Имя;
        for (var z=0; z<СписокОбработчиковСобытий.Count(); z++) {
            Событие = СписокОбработчиковСобытий.Get(z).Значение;
            try{
                var Действие=element.ПолучитьДействие(Событие);
                if (Действие!=undefined) {
                    if (НоваяСтрока.Событие!=undefined) {
                        НоваяСтрока = tree.add();
                        НоваяСтрока.Контрол = element.Name;
                    }
                    //Message(""+Событие+" "+tov8value(Действие).tostringinternal());
                    text = tov8value(Действие).tostringinternal();
                    var Matches = re.exec(text);
                    if (Matches && Matches.length) {
                        НоваяСтрока.Действие=Matches[1];
                    } else {
                        НоваяСтрока.Действие = text;
                   }
                    НоваяСтрока.Событие=Событие;
                    
                    //НоваяСтрока.Действие=Действие.toString();
                }
            } catch (e) {}
        }
        stringinetrnal = ValueToStringInternal(element);
        if (stringinetrnal.indexOf('{"#",75746124-44d6-4292-8887-ed80e2aada87}')>=0) {
            for (var z = 0; z<element.Columns.Count(); z++) {
                var Column = element.Columns.Get(z);
                var НоваяСтрока = tree.add();
                НоваяСтрока.Контрол = Column.Name;
                НоваяСтрока.ТипЭлемента = ValueToStringInternal(Column);
                if (Column.ЭлементУправления == undefined) 
                    continue
                 
                for (var y=0; y<СписокОбработчиковСобытий.Count(); y++) {
                    Событие = СписокОбработчиковСобытий.Get(y).Значение;
                    
                    try{
                        var Действие=Column.ЭлементУправления.ПолучитьДействие(Событие);
                        if (Действие!=undefined) {
                            if (НоваяСтрока.Событие!=undefined) {
                                НоваяСтрока = tree.add();
                                НоваяСтрока.Контрол = Column.Name;
                            }
                            //Message(""+Событие+" "+tov8value(Действие).tostringinternal());
                            text = tov8value(Действие).tostringinternal();
                            var Matches = re.exec(text);
                            if (Matches && Matches.length) {
                                НоваяСтрока.Действие=Matches[1];
                            } else {
                                НоваяСтрока.Действие = text;
                           }
                            НоваяСтрока.Событие=Событие;
                            
                            //НоваяСтрока.Действие=Действие.toString();
                        }
                    } catch (e) {}
                }
            }
        }
        if (stringinetrnal.indexOf('{"#",7783f716-79fb-446d-9aae-94ba2f2e3957}')>=0) {
            ЗагрузитьКнопки(element, re, tree);
        }
    }
}

FuncProcPanel.prototype.beforeExitApp = function () {
    this.watcher.stopWatch();
}
FuncProcPanel.prototype.OnOpen = function() {
    this.GetList();
    this.form.ТекстФильтра = '';
    this.viewFunctionList(this.form.ТекстФильтра);
    events.connect(Designer, "onIdle", this)
}

FuncProcPanel.prototype.Reload = function() {

    if (this.IsOpen()) {

        this.results.Rows.Clear();
        this.methods.Rows.Clear();
        this.groupsCache.Clear();
        this.lastFilter='';
        this.isForm=false;
        this.GetList();
        this.form.ТекстФильтра = '';
        this.viewFunctionList(this.form.ТекстФильтра);
    }
}

FuncProcPanel.prototype.OnClose= function() {
    this.results.Rows.Clear();
    this.methods.Rows.Clear();
    this.groupsCache.Clear();
    this.lastFilter='';
    this.isForm=false;
    this.settings.ReadFromForm(this.form);
    this.settings.SaveSettings();
    
    events.disconnect(Designer, "onIdle", this)
}
FuncProcPanel.prototype.CmdBarTreeView = function (Button) {
    this.form.TreeView = !this.form.TreeView;
    Button.val.Check = this.form.TreeView;
    this.form.Controls.FunctionList.Columns.Method.ShowHierarchy = this.form.TreeView;
    this.viewFunctionList(this.ТекстФильтра);
}
FuncProcPanel.prototype.expandTree = function () {
    if (this.form.TreeView)
    {
        for (var rowNo=0; rowNo < this.results.Rows.Count(); rowNo++)
            this.form.Controls.FunctionList.Expand(this.results.Rows.Get(rowNo), true);
    }
}

FuncProcPanel.prototype.getGroupRow = function (methodData) {

    if (!this.form.TreeView)
        return this.results;

    var groupRow = this.groupsCache.Get(methodData);
    if (!groupRow) 
    {
        groupRow = this.results.Rows.Add();
        groupRow.Method = methodData;
        this.groupsCache.Insert(methodData, groupRow); 
    }
    return groupRow;
}

FuncProcPanel.prototype.Filter = function(filterString){
    filterString = filterString.toLowerCase()
    if (filterString!=this.lastFilter){
        this.lastFilter = filterString;
        this.viewFunctionList(filterString);
    }
}

FuncProcPanel.prototype.viewFunctionList = function(newFilter) {
    
    //FIXME: тут undefined не должно быть... но почему-то есть.
    currentFilter = (newFilter!=undefined)?newFilter:'' //Шаманство, надо у Орефкова спросить, почему тут undefined 
    
    this.results.Rows.Clear();
    this.groupsCache.Clear();
    var filters = currentFilter.split(/\s+/)
    
    for (var i = 0; i<this.methods.Rows.Count(); i++) {
        
        var thisRow = this.methods.Rows.Get(i);
        var needAdd = true;
        var Method = thisRow.Method.toLowerCase()
        if (currentFilter.length>0) {
            for(var s in filters)
            {
                if(Method.indexOf(filters[s]) < 0) {
                    needAdd = false
                    break;
                }
            }
        }
        if(!needAdd) continue
        
        var groupRow = this.getGroupRow(thisRow.Context);
        var newRow = groupRow.Rows.Add();
        newRow.LineNo = thisRow.LineNo;
        newRow.Method = thisRow.Method;
        newRow.Context = thisRow.Context;
        newRow.Контрол = thisRow.Контрол;
        newRow.ТипЭлемента = thisRow.ТипЭлемента;
        newRow.КонтролТип = thisRow.КонтролТип;
        newRow.RowType = thisRow._method.IsProc ? RowTypes.ProcGroup : RowTypes.FuncGroup;
        if (thisRow.isActive){
            this.form.Controls.FunctionList.CurrentRow = newRow;
        }
    }
    this.expandTree();
    this.form.Controls.FunctionList.Columns.Context.Visible = !this.form.TreeView;
    this.form.Controls.FunctionList.Columns.Context.Visible = (this.form.Controls.FunctionList.Columns.Context.Visible && this.groupsCache.Count() >0) ? true:false
    this.form.Controls.FunctionList.Columns.Контрол.Visible = (this.isForm || this.form.FuncProcViewRecursive);
    this.form.Controls.CmdBar.Кнопки['TreeView'].Check = this.form.TreeView;
    this.form.Controls.CmdBar.Кнопки['ВыводитьВызовы'].Check = this.form.FuncProcViewRecursive;
    //this.form.Controls.cmdBarCalls.Visible = this.form.FuncProcViewRecursive;
    this.form.Controls.СтруктураМетода.Visible = this.form.FuncProcViewRecursive;
    this.form.Controls.Разделитель1.Visible = this.form.FuncProcViewRecursive;
    if(this.form.FuncProcViewRecursive) {
    this.form.Controls.FunctionList.УстановитьПривязку(ГраницаЭлементаУправления.Низ,this.form.Controls.Разделитель1,ГраницаЭлементаУправления.Низ);
    this.form.Controls.FunctionList.Высота =this.form.Controls.Разделитель1.Верх-61;}
        else{
    this.form.Controls.FunctionList.УстановитьПривязку(ГраницаЭлементаУправления.Низ,this.form.Панель,ГраницаЭлементаУправления.Низ);
    this.form.Controls.FunctionList.Высота =this.form.Высота-61;
}

    
}

FuncProcPanel.prototype.CmdBarActivate = function(Button){
    this.goToLine(this.form.Controls.FunctionList.CurrentRow);
}

FuncProcPanel.prototype.CmdBarДействиеВывестиВызовы = function(Button){
    var curRow = this.form.Controls.FunctionList.CurrentRow;
    this.form.Controls.CmdBar.Кнопки['ДействиеВывестиВызовы'].Check = !this.form.Controls.CmdBar.Кнопки['ДействиеВывестиВызовы'].Check;
    if (this.form.Controls.CmdBar.Кнопки['ДействиеВывестиВызовы'].Check && this.form.Controls.СтруктураМетода.visible){
        this.showCallers(curRow);
    }
}

FuncProcPanel.prototype.showCallers = function(curRow){

    if(!curRow){
        return;
    }
    else {

    callers = {};
    for (var i = 0; i<this.methods.Rows.Count(); i++) {
        var thisRow = this.methods.Rows.Get(i);
        if (thisRow.Method == curRow.Method) continue;

        
        curMethod = thisRow._method; 
        if (curMethod.Calls.length > 0){
            for (var j=0; j<curMethod.Calls.length; j++){

                caller = curMethod.Calls[j];
                //Message(""+caller);

                if(caller.indexOf(curRow.Method)>=0){
                    
                    callers[curMethod.Name] = 1;        
                }
                //if(!callers.indexOf(caller) >= 0) continue;
            }
        }
    }

    needCreate = true;
    for (var i = 0; i<this.form.СтруктураМетода.Rows.Count(); i++) {
        var newRow = this.methods.Rows.Get(i);
        if (newRow.Имя == "Используют в"){
            needCreate = false;
            newRow.Rows.Clear();
            break;
        }
    }

    if (needCreate){
        var newRow = this.form.СтруктураМетода.Rows.Add();
    }
    newRow.Имя = "Используют в";
    newRow.Индекс = 6;

    for(var k in callers){
        var newParamRow = newRow.Rows.Add();
        newParamRow.Имя = k;
        newParamRow.Индекс = 10;
       }
    }
    if (newRow.Rows.Count()>0){
        this.form.Controls.СтруктураМетода.Expand(newRow, false);    
    }
    
}

FuncProcPanel.prototype.CmdBarReloadFunc = function(Button){

    var wnd = this.targetWindow.textWindow; //вручную выбрали обновление, значит сделаем долгий анализ формы. 
    if (this.cache.Get(wnd.hwnd)!=undefined) {
        this.cache.Delete(wnd.hwnd)
    }
    this.Reload();
}

FuncProcPanel.prototype.activateEditor = function () {
    
    var activeView = this.targetWindow.GetView() ;
    if (activeView)
        activeView.activate();
    //if (!snegopat.activeTextWindow())
    //    stdcommands.Frame.GotoBack.send();
}

FuncProcPanel.prototype.goToLine = function (row) {

    this.form.Controls.FunctionList.CurrentRow = row;

    if (!this.targetWindow)
        return;
 
    if (!this.targetWindow.IsActive())
    {
        DoMessageBox("Окно, для которого показывался список, было закрыто!\nОкно с результатами стало не актуально и будет закрыто.");
        this.Close();
        return;
    }
 
    // Переведем фокус в окно текстового редактора.
    this.activateEditor();
    var textline = this.targetWindow.GetLine(row.LineNo+1)
    // Установим выделение на найденное совпадение со строкой поиска.
    this.targetWindow.SetCaretPos(row.LineNo+2, 1);
    this.targetWindow.SetSelection(row.LineNo+1, 1, row.LineNo+1, textline.length+1);
}

FuncProcPanel.prototype.FuncProcOnRowOutput = function(Control, RowAppearance, RowData) {
    var cell = RowAppearance.val.Cells.Method;
    
    switch (RowData.val.RowType)
    {
    case RowTypes.FuncGroup:
        cell.SetPicture(this.Icons.Func);
        break;
    
    case RowTypes.ProcGroup:
        cell.SetPicture(this.Icons.Proc);
        break;
        
    default:
        break;
    }
    
    var cell = RowAppearance.val.Cells.Контрол;
    //FIXME: поменять RowTypes.FuncGroup на свой, сейчас совпадают, в дальнейшем может и нет. 
    switch (RowData.val.КонтролТип)
    {
    case RowTypes.FuncGroup:
        cell.SetPicture(this.Icons.Forward);
        break;
    
    case RowTypes.ProcGroup:
        cell.SetPicture(this.Icons.Form);
        break;
        
    default:
        break;
    }
    

                
    //if (RowData.val._method.IsProc !== undefined)
    //    RowAppearance.val.Cells.Method.SetPicture(RowData.val._method.IsProc ? this.Icons.Proc : this.Icons.Func);
    
}

FuncProcPanel.prototype.FuncProcOnSelection = function(Элемент, ВыбраннаяСтрока, Колонка, СтандартнаяОбработка) {
    this.goToLine(ВыбраннаяСтрока.val);
    СтандартнаяОбработка.val = false; // Это для того чтобы после нажатия на строку курсор не уходит с табличного поля, и при новой активизации формы можно было курсором посмотреть другие значения
    this.needHide = true;
}

FuncProcPanel.prototype.moveFunc = function(func, forward){

 
    // Переведем фокус в окно текстового редактора.
    this.activateEditor();

    function getMethod(methods, name) {
        var filter_struct = v8New("Структура");
        
        filter_struct.Insert("Method", name);
        var МассивСтрок = methods.Rows.FindRows(filter_struct);
        if (МассивСтрок.Count()<=0) {
            logger.error("Такой процедуры не существует!");
            return;
        }

        return МассивСтрок.Get(0)._method;

    }

    var curRowMethod = getMethod(this.methods, func.Method);
    if(!curRowMethod)
        return;

    if (!this.targetWindow)
        return;
 
    if (!this.targetWindow.IsActive())
    {
        //DoMessageBox("Окно, для которого показывался список, было закрыто!\nОкно с результатами стало не актуально и будет закрыто.");
        logger.error("Окно, для которого показывался список, было закрыто!\nОкно с результатами стало не актуально и будет закрыто.");
        //this.Close();
        return;
    }


    this.moveRowCursor(forward);

    var newRow = this.form.Controls.FunctionList.CurrentRow;
    var newRowMethod = getMethod(this.methods, newRow.Method);

    if (!newRowMethod)
        return;

    var newLine = 0;
    if(forward){
        newLine = newRowMethod.EndLine + 1;
        newLine = newLine > this.targetWindow.LinesCount() ? this.targetWindow.LinesCount() : newLine;
    } else {
        newLine = newRowMethod.StartLine;
    }

    curText = this.targetWindow.Range(curRowMethod.StartLine,0,curRowMethod.EndLine).GetText();
    //this.targetWindow.Range(curRow.LineNo,,curRow.Method.EndLine).SetT

    this.targetWindow.InsertLine(newLine, curText);

    var clear = this.targetWindow.Range(curRowMethod.StartLine,0,curRowMethod.EndLine);
    clear.SetText("");

    this.GetList();

}

FuncProcPanel.prototype.moveFuncUp = function(){

}

FuncProcPanel.prototype.moveFuncDown = function(){

    var row;     
    var curRow = this.form.Controls.FunctionList.CurrentRow;
    
    if (!curRow)
    {
        return
    }

    this.moveFunc(curRow, false);

}

FuncProcPanel.prototype.onIdle = function(){
    this.updateList();
    var mayBeClosed = this.form.СостояниеОкна != ВариантСостоянияОкна.Прячущееся && this.form.СостояниеОкна != ВариантСостоянияОкна.Прикрепленное;
    if (mayBeClosed) {
        if (this.needHide || windows.getActiveView().title != "Список Процедур/Функций")
            this.form.Close();
    }
    this.needHide = false;
}

FuncProcPanel.prototype.updateList = function()
{
    // Получим текущий текст из поля ввода
    FuncPanel = GetFuncProcPanel();
    var newText = windows.getInputFieldText(this.form.Controls.ТекстФильтра);
    this.Filter(newText);
}

FuncProcPanel.prototype.moveRowCursor = function (forward) {
    var curRow = this.form.Controls.FunctionList.ТекущаяСтрока
    if (!this.results.Rows.Count())
        return;
     
    var row;     
    var curRow = this.form.Controls.FunctionList.CurrentRow;
    
    if (!curRow)
    {
        row = this.results.Rows.Get(0);
        if (this.form.TreeView)
            row = row.Rows.Get(0);
            
        this.form.Controls.FunctionList.CurrentRow = row;     
        return;
    }

    function getNextRow(curRow, rows) {
        
        var curIndex = rows.indexOf(curRow);
        
        // Обеспечим возможность пролистывать результаты поиска по кругу.
        if (forward && curIndex == rows.Count()-1)
            curIndex = -1;
        else if (!forward && curIndex == 0)
            curIndex = rows.Count();
            
        return rows.Get(curIndex + (forward ? 1 : -1));
    }
    
    if (this.form.TreeView)
    {        
        if (curRow.Parent)
        {
            var rows = curRow.Parent.Rows;
            var curIndex = rows.IndexOf(curRow);
            
            if (forward && curIndex == rows.Count()-1)
            {
                var groupRow = getNextRow(curRow.Parent, this.results.Rows);
                row = groupRow.Rows.Get(0);
            }
            else if (!forward && curIndex == 0)
            {
                var groupRow = getNextRow(curRow.Parent, this.results.Rows);
                row = groupRow.Rows.Get(groupRow.Rows.Count() - 1);            
            }
            else
            {
                row = getNextRow(curRow, rows);
            }
        }
        else
        {
            if (forward)
            {
                row = curRow.Rows.Get(0); 
            }
            else 
            {
                var groupRow = getNextRow(curRow, this.results.Rows);
                row = groupRow.Rows.Get(groupRow.Rows.Count() - 1);
            }
        }
    }
    else
    {               
        row = getNextRow(curRow, this.results.Rows);
    }
    
    this.form.Controls.FunctionList.CurrentRow = row;     
 }

FuncProcPanel.prototype.ТекстФильтраРегулирование = function(Элемент, Направление, СтандартнаяОбработка) {
    
    var forward = (-1 == Направление.val);
    this.moveRowCursor(forward);
    
    СтандартнаяОбработка.val = false
}

FuncProcPanel.prototype.ТекстФильтраОкончаниеВводаТекста = function(Элемент, Текст, Значение, СтандартнаяОбработка){
    //Message("Элемент, Текст, Значение, СтандартнаяОбработка");
    //var curRow = this.form.Controls.FunctionList.ТекущаяСтрока;
    //if (curRow==undefined) return
    //if (!curRow)
    //    this.goToLine(curRow)
    
}
FuncProcPanel.prototype.СтруктураМетодаПриВыводеСтроки = function(Элемент, ОформлениеСтроки, ДанныеСтроки){
    var cell = ОформлениеСтроки.val.Cells.Имя;
    
    var index = ДанныеСтроки.val.Индекс;

    try{
        cell.ИндексКартинки = index;
        cell.ОтображатьКартинку = true;    
    } catch(e){}

    if (this.numberRow>3){
        var rowNumber = ДанныеСтроки.val.НомерСтроки;
        
        if(rowNumber == 2 || rowNumber == 1){
            ОформлениеСтроки.val.ЦветФона = v8New("Цвет", 0, 130, 209);
        } 
        if (rowNumber==4 || rowNumber==3){
            ОформлениеСтроки.val.ЦветФона = v8New("Цвет", 255, 209, 0);
        }

    }
    
}

FuncProcPanel.prototype.СтруктураМетодаВыбор = function(Элемент, ВыбраннаяСтрока, Колонка, СтандартнаяОбработка){
    СтандартнаяОбработка.val = false;
    this.goToFunction(ВыбраннаяСтрока.val);
    
}

FuncProcPanel.prototype.getMethod = function(methods, name) {
    var filter_struct = v8New("Структура");
    
    filter_struct.Insert("Method", name);
    var МассивСтрок = methods.Rows.FindRows(filter_struct);
    if (МассивСтрок.Count()<=0) {
        //logger.error("Такой процедуры не существует!");
        return;
    }

    return МассивСтрок.Get(0)._method;
}

FuncProcPanel.prototype.walkMethods = function(row, method, req){

    req++;
    if (req > 5)
        return;
    
    var curRowMethod = this.getMethod(this.methods, method);
    if(!curRowMethod){
       return;
    }

    if(curRowMethod.Calls.length>0){
        //var newRow = row.Rows.Add();
        for(var i=0; i<curRowMethod.Calls.length; i++){
            callMethod = this.getMethod(this.methods, curRowMethod.Calls[i]);
            if (curRowMethod.Calls[i].indexOf(".")>=0 || callMethod!=null){
                var newParamRow = row.Rows.Add();

                if(countopenindex > this.maxShows && this.numberRow<=4 && this.form.index==0){
                    this.numberRow = this.numberRow+1;
                    newParamRow.НомерСтроки = this.numberRow;
                }

                newParamRow.Имя = curRowMethod.Calls[i];
                newParamRow.Индекс = 0;
                if (callMethod!=null){
                    newParamRow.Индекс = (callMethod.isProc)?0:1;
                }
                if (this.getMethod(this.methods, curRowMethod.Calls[i])){
                    this.walkMethods(newParamRow, newParamRow.Имя, req)
                }
            }
        }

    }

}

FuncProcPanel.prototype.goToFunction = function(row){
    
    nameMethod = row.Имя;
    var Родитель = row.Родитель;
    if (!Родитель)
        return;
    
    var callArray = [];
    findByName = false;

    if (nameMethod.indexOf(".")>=0){


        function getMdObj(rootObject, callArray){
            
            found = false;
            mdObject = null;
            if (callArray.length > 2){
                
                //Это по документам, справочникам и т.д. идем.
                //metadataName = Matches[1].slice(0, Matches[1].indexOf('.'));
                try{
                    mdObject = rootObject.childObject(callArray[0], callArray[1]);
                    found = true;
                } catch(e){
                    
                }
            } else if(callArray.length > 1 ) {
                //Тут по общим модулям пройдемся. 
                try{
                    mdObject = rootObject.childObject("ОбщиеМодули", callArray[0]);
                    found = true;
                } catch(e){
                    
                }
            } 
            //Message(""+found + ""+mdObject.name);
            if (found){
                return mdObject;
            }

            return;
        }

        var firstRootObject = metadata.current.rootObject;
        var secondRootObject = null;
        if (this.targetWindow.mdCont){
            secondRootObject = this.targetWindow.mdCont.rootObject;
            if (secondRootObject.id = firstRootObject.id){
                secondRootObject = null;
            }
        }

        callArray = nameMethod.toString().split(".");

        var mdObject = null;
        if (secondRootObject){
            //Message("secondRootObject"+secondRootObject.name);
            mdObject = getMdObj(secondRootObject, callArray);
        }

        if(!mdObject && firstRootObject){
            mdObject = getMdObj(firstRootObject, callArray);   
        }

        var propsModules = [
        {propName: "Модуль",            title: "Открыть модуль",        hotkey: 13, modif: 0},
        {propName: "МодульМенеджера",   title: "Модуль менеджера",      hotkey: 13, modif: 4},
        {propName: "МодульНабораЗаписей",      title: "Открыть модуль",        hotkey: 13, modif: 0},
        
        {propName: "МодульОбъекта",     title: "Модуль объекта",        hotkey: 13, modif: 0},
        {propName: "Форма",             title: "Открыть модуль",        hotkey: 13, modif: 0}
        
        ]



        if (mdObject){

            var mdc = mdObject.mdclass
            for(var i = 0, c = mdc.propertiesCount; i < c; i++)
            {
                var mdPropName = mdc.propertyAt(i).name(1);
                for(var k in propsModules)
                {
                    if(propsModules[k].propName == mdPropName)
                    {
                        var text = mdObject.getModuleText(mdPropName);
                        parseModule = SyntaxAnalysis.AnalyseModule(text, true);
                        var method = parseModule._methodsByName[callArray[callArray.length-1]];
                        if (method){

                            if(Родитель.Имя == "Используют в"){
                               //curRowMethodName = nameMethod;
                               nameMethod = curRow.Method;
                            } else{
                                //curRowMethodName = Родитель.Имя;
                                nameMethod = row.Имя;
                            }

                            (new TextWindowsWatcherGoToLine(method.StartLine, nameMethod)).startWatch();
                            mdObject.openModule(mdPropName);
                            return;

                        }
                    }
                }
            }
        } else {
            //Спозицонируемся куда просят. 
            findByName = true;

            //Message("Не найден объект метаданных для "+nameMethod.toString());
        }


    } else {
        var method = this.getMethod(this.methods, nameMethod);
        if(method!=undefined && Родитель.Имя !="Используют в"){
            if (!this.targetWindow){
                Message("Не найденно целевое окно. ");
                return;
            }
         
            if (!this.targetWindow.IsActive())
            {
                Message("Окно, для которого показывался список, было закрыто!\nОкно с результатами стало не актуально и будет закрыто.");
                this.Close();
                return;
            }
         
            // Переведем фокус в окно текстового редактора.
            this.activateEditor();
            var textline = this.targetWindow.GetLine(method.StartLine+1)
            // Установим выделение на найденное совпадение со строкой поиска.
            this.targetWindow.SetCaretPos(method.StartLine+2, 1);
            this.targetWindow.SetSelection(method.StartLine+1, 1, method.StartLine+1, textline.length+1);

            return;
        } else {
            findByName = true;
        }
    }

    if (findByName){

        var curRow = this.form.Controls.FunctionList.CurrentRow;

        curRowMethodName = "";
        if (Родитель.Имя == "Параметры" || Родитель.Имя == "Вызывает"){
            curRowMethodName = curRow.Method;
        } else if(Родитель.Имя == "Используют в"){
            curRowMethodName = nameMethod;
            nameMethod = curRow.Method;
        } else{
            curRowMethodName = Родитель.Имя;
            nameMethod = row.Имя;
        }

        
        var curRowMethod = this.getMethod(this.methods, curRowMethodName);
        if(!curRowMethod){
           return;
        }

        if(!this.targetWindow || !this.targetWindow.IsActive())
            return;

        function foundMethod(nameMethod, es){
            var lines = StringUtils.toLines(es.targetWindow.GetText());
            for(var lineIx=curRowMethod.StartLine; lineIx < curRowMethod.EndLine; lineIx++)
            {
                var line = lines[lineIx];
                var index = line.indexOf(nameMethod);
                if (index>=0){
                    // Переведем фокус в окно текстового редактора.
                    es.activateEditor();
                    es.targetWindow.SetCaretPos(lineIx+1, line.indexOf(nameMethod));
                    es.targetWindow.SetSelection(lineIx+1, index+1, lineIx+1, index+1+nameMethod.length);
                    return true;
                }
            }    

            return false;
        }

        if (!foundMethod(nameMethod+"(", this))
            foundMethod(nameMethod, this);

    }
}

FuncProcPanel.prototype.FunctionListПриАктивизацииСтроки = function(Элемент){

    function getMethod(methods, name) {
        var filter_struct = v8New("Структура");
        
        filter_struct.Insert("Method", name);
        var МассивСтрок = methods.Rows.FindRows(filter_struct);
        if (МассивСтрок.Count()<=0) {
            //logger.error("Такой процедуры не существует!");
            return ;
        }
        return МассивСтрок.Get(0)._method;
    }

    var Кнопка = this.form.Controls.InvisiblePanel.Кнопки.AddSubscriptionAtServer;
    Кнопка.Доступность = this.isForm;
    //Заполним дерево вызовов колонки. 
    if (this.form.Controls.СтруктураМетода.visible){

        this.form.СтруктураМетода.Rows.Clear();
         var curRow = this.form.Controls.FunctionList.CurrentRow;
         if (!curRow)
            return;
         var curRowMethod = getMethod(this.methods, curRow.Method);
         if(!curRowMethod){
            return;
         }
         if (curRowMethod.Params.length>0){
            var newRow = this.form.СтруктураМетода.Rows.Add();
            newRow.Имя = "Параметры";
            newRow.Индекс = 3

            for(var i=0; i<curRowMethod.Params.length; i++){
                var newParamRow = newRow.Rows.Add();
                newParamRow.Имя = curRowMethod.Params[i];
                newParamRow.Индекс = 4;
            }
         }


         if(curRowMethod.Calls.length>0){
            var newRow = this.form.СтруктураМетода.Rows.Add();
            newRow.Имя = "Вызывает";
            newRow.Индекс = 7

            for(var i=0; i<curRowMethod.Calls.length; i++){
                
                callMethod = getMethod(this.methods, curRowMethod.Calls[i]);
                if (curRowMethod.Calls[i].indexOf(".")>=0 || callMethod!=null){
                    var newParamRow = newRow.Rows.Add();
                    
                    if(countopenindex > this.maxShows && this.numberRow<=4 && this.form.index==0){
                        this.numberRow = this.numberRow + 1;
                        newParamRow.НомерСтроки = this.numberRow;
                    }

                    newParamRow.Имя = curRowMethod.Calls[i];
                    newParamRow.Индекс = 0;
                    if (callMethod!=null){
                        newParamRow.Индекс = (callMethod.isProc)?1:0;
                    }
                    if (getMethod(this.methods, curRowMethod.Calls[i])){
                        this.walkMethods(newParamRow, newParamRow.Имя, 1)
                    }
                }
            }  

            this.form.Controls.СтруктураМетода.Expand(newRow, false);
            if(countopenindex > this.maxShows && this.numberRow>3){
                this.index = 0;
                countopenindex = 0;
                this.form.index = 0;
            }

        }

        if (this.form.Controls.CmdBar.Кнопки['ДействиеВывестиВызовы'].Check){
            this.showCallers(curRow);
        }

    }

}

FuncProcPanel.prototype.CmdBarВыводитьВызовы = function(Button) {
    this.form.FuncProcViewRecursive = !this.form.FuncProcViewRecursive;
    this.GetList();
    Button.val.Check = this.form.FuncProcViewRecursive;
    this.viewFunctionList(this.ТекстФильтра);
}

////////////////////////////////////////////////////////////////33////////////////////////
////{ TextWindowsWatcher - отслеживает активизацию текстовых окон и запоминает последнее.
////

function TextWindowsWatcher() {
    this.timerId = 0;
    this.lastActiveTextWindow = null;
    this.startWatch();
}

TextWindowsWatcher.prototype.getActiveTextWindow = function () {
    if (this.lastActiveTextWindow && this.lastActiveTextWindow.IsActive())
        return this.lastActiveTextWindow;
    return null;
}

TextWindowsWatcher.prototype.startWatch = function () {
    if (this.timerId)
        this.stopWatch();
    this.timerId = createTimer(500, this, 'onTimer');
}

TextWindowsWatcher.prototype.stopWatch = function () {
    if (!this.timerId)
        return;
    killTimer(this.timerId);
    this.timerId = 0;
}

TextWindowsWatcher.prototype.onTimer = function (timerId) {
    var wnd = GetTextWindow();    
    if (wnd)
        this.lastActiveTextWindow = wnd;
    else if (this.lastActiveTextWindow && !this.lastActiveTextWindow.IsActive())
        this.lastActiveTextWindow = null;
}
//} TextWindowsWatcher 

////////////////////////////////////////////////////////////////////////////////////////
////{ StartUp
////
function GetFuncProcPanel() {
    if (!FuncProcPanel._instance)
        new FuncProcPanel();
    
    return FuncProcPanel._instance;
}

RowTypes = {
    'ProcGroup'     : 1,
    'FuncGroup'     : 2
}

events.connect(Designer, "beforeExitApp", GetFuncProcPanel());
////}

////////////////////////////////////////////////////////////////////////////////////////
////{ TextWindowsWatcherGoToLine - отслеживает активизацию текстовых окон и запоминает последнее и переходим по строке.
////

TextWindowsWatcherGoToLine = stdlib.Class.extend({

    construct : function(LineNo, LineToFind) {
        this.timerId = 0;
        this.lastActiveTextWindow = null;
        this.Line = LineNo;
        if (LineToFind == undefined){
            this.Name = "";
        } else {
            this.Name = LineToFind;    
        }
        this.startWatch();
    },

    getActiveTextWindow : function () {
        if (this.lastActiveTextWindow && this.lastActiveTextWindow.IsActive())
            return this.lastActiveTextWindow;
        return null;
    },

    startWatch : function () {
        if (this.timerId)
            this.stopWatch();
        this.timerId = createTimer(1*300, this, 'onTimer');
    },

    stopWatch : function () {
        if (!this.timerId)
            return;
        killTimer(this.timerId);
        this.timerId = 0;
    },
    
    goToLine : function() {
        if (!this.Line)
            return
        
        wnd = this.getActiveTextWindow()
        if (wnd){
            var LineNo = this.Line;

            var lines = StringUtils.toLines(wnd.GetText());
            for(var lineIx = LineNo; lineIx < lines.length; lineIx++)
            {
                var line = lines[lineIx];
                var index = line.indexOf(this.Name);
                if (index>=0){
                    // Переведем фокус в окно текстового редактора.
                    wnd.SetCaretPos(lineIx+1, index+1);
                    wnd.SetSelection(lineIx+1, index+1, lineIx+1, index+1+this.Name.length);
                    return;
                }
            }

            var textline = wnd.GetLine(LineNo+1);
            wnd.SetCaretPos(LineNo+2, 1);
            wnd.SetSelection(LineNo+1, 1, LineNo+1, textline.length+1);
        }
    },

    onTimer : function (timerId) {
        var wnd = GetTextWindow();    
        if (wnd){
            this.lastActiveTextWindow = wnd;
            this.goToLine()
        }
        this.stopWatch();
    }
    
}); 
//} end of TextWindowsWatcherGoToLine class

function getMacrosInfo(name, info) {
    if (name == "Открыть окно") {
        info.descr = "Открытие окна со списком методов модуля";
        info.picture = stdcommands.Frntend.MethodsList.info.picture;
    }
}