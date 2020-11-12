//engine: JScript
//uname: wndpanel
//dname: Панель окон
//author: Александр Орефков, Пушин Владимир <vladnet@gmail.com>
//help: inplace
//addin: global
//addin: stdlib
//addin: stdcommands

/*jslint todo: true, vars: true, indent: 4*/

/*@
Скрипт для показа "панели окон".

В отличии от штатной панели окон показывает список окон в табличном поле, сортируя
их не в порядке открытия окон, а по объектам метаданных, к которым они относятся +
по алфавиту. Также как всегда поддерживается фильтрация списка по подстроке.

Переработка для показа в дереве: Пушин Владимир <vladnet@gmail.com>
@*/

global.connectGlobals(SelfScript)

var form
var needActivate, needHide
//var api = stdlib.require('winapi.js');
var maxSortKey = 1000;
var treeView = true;
var dontSortWindows = false;

function getFullMDName(mdObj, mdProp) {
    var names = []; while (true) {
        names.unshift(mdObj.name)
        var className = mdObj.mdclass.name(1).substring(0, 3)
            if (!mdObj.parent)
                className = ""
                    names.unshift(className)
                    if (!className.length)
                        break
                        mdObj = mdObj.parent
    }
    return names.join('.') + "#" + (mdProp ? mdProp.name(1) : "")
}

WndListItem = stdlib.Class.extend({
        construct : function (view) {
            this.view = view
                this.rowInVt = null
                this.color = 0;
                this.historyKey = 0;
                this.makeSortKey();
                this.makeHistoryKey();
        },
        isAlive : function () {
            try {
                if (this.view.isAlive())
                    return true
            } catch (e) {}
            return false
        },
        makeTitle : function () {
            var result = {
                title : '',
                info : ''
            }
            if (this.isAlive()) {
                result.title = this.view.title;
                var mdObj = this.view.mdObj
                if (mdObj) {
                    var mdname = mdObj.container.identifier
                        if (result.title.indexOf(mdname) < 0)
                            result.info += mdname + " "
                }
                var obj = this.view.getObject()
                if (obj){
                    result.info += toV8Value(obj).typeName(1) + " "
                }
            }
            return result
        },
        makeHistoryKey : function(){
            maxSortKey++;
            this.historyKey = maxSortKey;
        },
        makeSortKey : function () {
            // Основной алгоритм упорядочивания окон
            var md = this.view.mdObj
                if (md) {
                    // Если окно относится к объекту метаданных. Сначала пусть идут окна
                    // основной конфигурации, далее конфигурации ИБ, затем внешние отчеты/обработки и cf-ники.
                    // При закрытой основной конфигурации metadata.current равно metadata.ib, поэтому сначала
                    // проверяем на metadata.ib
                    if(!md.parent || !md.parent.parent)
                        mdname = md.name;
                    else
                        mdname = md.parent.name
                    ИндексОбъектаМД = 0;
                    //debugger
                    ИндексОбъектаМД = СписокМетаданных.Получить(mdname);
                    //Если объекта не нашли в списке, значит он новый. Перезаполним список еще раз
                    // if(ИндексОбъектаМД == undefined){
                        // СписокМетаданных = ПолучитьСписокМетаданных();
                        // ДлинаНомераМД = СписокМетаданных.Количество().toString().length;
                        // ИндексОбъектаМД = СписокМетаданных.Найти(mdname)
                    // }
                    //Если и сейчас не нашли то просто присвоим ему самый большой номер
                    if(ИндексОбъектаМД == undefined)
                        ИндексОбъектаМД = СписокМетаданных.Количество();
                    ИндексОбъектаМД = ИндексОбъектаМД.toString();
                    while(ИндексОбъектаМД.length < ДлинаНомераМД)
                        ИндексОбъектаМД = "0" + ИндексОбъектаМД;
                    if (md.container == metadata.ib)
                        this.sortkey = "2" + ИндексОбъектаМД + "#"
                    else if (md.container == metadata.current)
                            this.sortkey = "1" + ИндексОбъектаМД +"#"
                        else
                            this.sortkey = "3#" + md.container.identifier + "#";
                        this.sortkey += getFullMDName(md, this.view.mdProp)
                } else // Дальше пусть идут всякие файлы по алфавиту
                    this.sortkey = "4#" + this.view.title
                        this.sortkey = this.sortkey.toLowerCase()
        }
    })

WndList = stdlib.Class.extend({
        construct : function () {
            this.list = []// Массив - список окон
            this.find = {}
            // Для поиска окна по его id
            this.lastFilter = ''
                this.activeView = null
        },
        // Функция для удаления устаревших, закрытых окон из нашего списка
        removeOldViews : function (vt) {
            var removed = false
                for (var i = this.list.length; i--; ) {
                    var item = this.list[i]

                        if (!item.isAlive()) {
                            //debugger
                            try { // попытаемся получить Родителя если не сможем значит строки уже нет
                                var test = item.rowInVt.Родитель
                            } catch (e) {
                                this.list.splice(i, 1)
                                removed = true
                                return true
                            }
                            if (item.rowInVt) {
                                if (item.rowInVt.Rows.Count() == 0)
                                    if (item.rowInVt.Родитель == undefined)
                                        vt.Rows.Delete(item.rowInVt)
                                    else {
                                            лРодитель = item.rowInVt.Родитель;
                                            лРодитель.Rows.Delete(item.rowInVt);
                                            if (лРодитель.Rows.Count() == 0 && (!лРодитель.Окно || !лРодитель.Окно.view.visible))
                                                vt.Rows.Delete(лРодитель)
                                        }

                            }

                            delete this.find[item.view.id]
                            this.list.splice(i, 1)
                            removed = true
                        }
                        else
                            try{
                            //debugger
                            if(!item.rowInVt){}
                            else if(item.rowInVt!=undefined){
                                        if (item.rowInVt.Родитель == undefined){
                                            tTtitle = item.rowInVt.Окно.view.title;
                                            if (item.rowInVt.Заголовок != tTtitle)
                                            //debugger
                                                item.rowInVt.Заголовок = tTtitle
                                        }
                                }
                            } catch(e) {
                                //debugger
                            }
                }
                return removed
        },
        // Функция для добавления новых окон в список.
        // Перебирает все MDI-окна, и те, которых нет в списке, добавляет туда
        // Также определяет активное окно
        addNewViews : function () {
            //debugger
            var views = []// Массив всех конечных отображений

            var childs = windows.mdiView.enumChilds(); // Получим список MDI-окон
            (function (views, list) // Далее надо каждое MDI-окно "раскрутить" до конечных отображений,
            { // т.к. MDI-окно может быть контейнером для одного или нескольких отображений
                for (var i = 0; i < views.count; i++) {
                    var v = views.item(i);
                    if (v.isContainer != vctNo) // Окно - контейнер. Рекурсивно раскрутим его потомков
                        arguments.callee(v.enumChilds(), list)
                    else // Окно не контейнер. Добавим в общий список
                        list.push(v)
                }
            })(childs, views)
            var added = false
                // Перебираем весь список окон
                for (var idx in views) {
                    var v = views[idx]
                        if (!this.find.hasOwnProperty(v.id)) {
                            var item = new WndListItem(v)
                                this.list.push(item)
                                this.find[v.id] = item
                                added = true
                        }
                }
                if (added) // Что-то добавилось, отсортируем список
                    if (dontSortWindows){
                        // this.list.sort(function (i1, i2) {
                        //  return i1.historyKey.localeCompare(i2.historyKey)
                        // });

                    } else {
                        this.list.sort(function (i1, i2) {
                            return i1.sortkey.localeCompare(i2.sortkey)
                        });
                    }

                    var activeView = null
                    if (childs.count > 0) {
                            activeView = childs.item(0)
                            while (activeView.activeChild)
                                activeView = activeView.activeChild
                            activeView = this.find[activeView.id]
                    }
                    return {
                        added : added,
                        activeView : activeView
                    }
        },
        filterList : function (filterString, vtControl) {
            ЗаполнитьПовторно = false;
            vt = vtControl.Value
            needUpdateColors = false;
            //needUpdateColors = this.removeOldViews(vt)
            this.removeOldViews(vt);
            filterString = filterString.toLowerCase()
            var addedResults = this.addNewViews()
            if (addedResults.added || filterString != this.lastFilter) {
                needUpdateColors = true
                this.lastFilter = filterString
                var filters = filterString.split(/\s+/)
                var idxInVt = 0
                for (var vidx in this.list) {
                    var item = this.list[vidx]
                    var needAdd = true
                    var title = item.makeTitle().title.toLowerCase()
                    for (var idx in filters) {
                        if (title.indexOf(filters[idx]) < 0) {
                            needAdd = false
                            break
                        }
                    }
                if (needAdd) {
                    if (!item.rowInVt) {
                        лЗаголовок = item.makeTitle().title;
                        лПозицияДвоеточия = лЗаголовок.indexOf(': ')
                        //debugger
                        if (лПозицияДвоеточия == -1 || item.view.mdObj == undefined) {
                            if (treeView){
                                СтрокаРодитель = vt.Rows.Найти(лЗаголовок, "Заголовок", true)
                                if (!СтрокаРодитель) {
                                    if (лЗаголовок.indexOf('Общий модуль') == -1 && treeView) {
                                        СтрокаРодитель = vt.Rows.Insert(idxInVt)
                                        СтрокаРодитель.ПолеСортировки = item.sortkey;
                                        item.rowInVt = СтрокаРодитель
                                    }

                                } else {
                                    СтрокаРодитель.Окно = item;
                                    item.rowInVt = СтрокаРодитель;
                                }
                            }
                            else {
                                item.rowInVt = vt.Rows.Add();
                                лЗаголовок = лЗаголовок;
                            }
                        } else {
                            //debugger
                            if(item.view.title.indexOf("Общий реквизит")+1){
                                лЗаголовокДляПоиска = "Общий реквизит"
                                лПозицияДвоеточия = -1;
                                лЗаголовок = treeView?лЗаголовок.replace("Общий реквизит ", ""):лЗаголовок;
                                лЗаголовок = лЗаголовок.replace(": Состав", "");
                            }
                            else {
                                mname = item.view.mdObj.parent.name
                                if (mname.indexOf("ВнешняяОбработка") == -1 && mname.indexOf("ВнешнийОтчет") == -1)
                                    лЗаголовокДляПоиска = лЗаголовок.substr(0, лПозицияДвоеточия);
                                else
                                    лЗаголовокДляПоиска = mname;
                            }

                            if(лЗаголовокДляПоиска.indexOf("Общий модуль")+1){
                                лЗаголовокДляПоиска = "Общий модуль";
                                лПозицияДвоеточия = -1;
                                лЗаголовок = treeView?лЗаголовок.replace("Общий модуль ", ""):лЗаголовок;
                                лЗаголовок = лЗаголовок.replace(": Модуль", "");
                            }
                            if(treeView){
                                лРодитель = vt.Rows.Найти(лЗаголовокДляПоиска, "Заголовок", true)
                                if (лРодитель == undefined){
                                    лРодитель = vt.Rows.Найти(лЗаголовокДляПоиска + " *", "Заголовок", true)
                                    if (лРодитель == undefined) {
                                        лРодитель = vt.Rows.Insert(idxInVt)
                                        лРодитель.Заголовок = лЗаголовокДляПоиска;
                                        лРодитель.ПолеСортировки = item.sortkey;
                                    }
                                }

                                item.rowInVt = лРодитель.Rows.Insert(idxInVt)
                                лЗаголовок = лЗаголовок.substr(лПозицияДвоеточия + 1)
                            }
                            else {
                                item.rowInVt = vt.Rows.Add();
                                лЗаголовок = лЗаголовок.substr(лПозицияДвоеточия + 1)
                            }
                        }
                        item.rowInVt.Окно = item
                        item.rowInVt.Заголовок = лЗаголовок;
                        item.rowInVt.ПолеСортировки = dontSortWindows?item.historyKey:item.sortkey;
                    }
                    idxInVt++;

                } else if (item.rowInVt) {
                    try {
                        vt.Rows.Delete(item.rowInVt)
                    } catch (e) {}
                        item.rowInVt = null
                }
            }

        }
        if(needUpdateColors && vt.Rows.Count()) {
            vt.Rows.Сортировать("ПолеСортировки");
        }

        // Теперь отследим активное окно
        oldActiveView = this.activeView
        if (addedResults.activeView != oldActiveView) {
            this.activeView = addedResults.activeView
                if (oldActiveView && oldActiveView.rowInVt)
                    //vtControl.RefreshRows(oldActiveView.rowInVt)
                    if (addedResults.activeView && addedResults.activeView.rowInVt) {
                        //vtControl.RefreshRows(addedResults.activeView.rowInVt)
                        if(vtControl.ТекущаяСтрока != undefined && vtControl.ТекущаяСтрока.Окно){
                            if(vtControl.ТекущаяСтрока.Окно.sortkey != addedResults.activeView.sortkey)
                                vtControl.ТекущаяСтрока = addedResults.activeView.rowInVt}
                        else
                            vtControl.ТекущаяСтрока = addedResults.activeView.rowInVt
                    }
        }
            //needUpdateColors = false;
    }
})

function macrosПоказать() {
    form.Filter = ""

    form.Открыть();
    form.CurrentControl = form.Controls.WndList
    if (activateSearchElement) {
        form.CurrentControl = form.Controls.Filter;
    }
}

function macrosПоказатьСкрыть() {
    form.Filter = ""

    if (form.Открыта())
        if (form.ВводДоступен())
        {
            form.Закрыть();
            return;
        }
        else
            form.Активизировать();
    else
        form.Открыть();
    form.CurrentControl = form.Controls.WndList
    if (activateSearchElement) {
        form.CurrentControl = form.Controls.Filter;
    }
}

function macrosПереключитьВидимостьОкнаСвойств() {
    windows.propsVisible = !windows.propsVisible
}

/* Возвращает название макроса по умолчанию - вызывается, когда пользователь
дважды щелкает мышью по названию скрипта в окне Снегопата. */
function getDefaultMacros() {
    return 'Показать';
}

function updateWndList() {
    // Получим текущий текст из поля ввода
    var newText = windows.getInputFieldText(form.Controls.Filter).replace(/^\s*|\s*$/g, '')
    WndList.One.filterList(newText, form.Controls.WndList)
}

function onIdle() {
    updateWndList()
    if (needHide) {
        needHide = false
            // Теперь спрячем наше окно.
            // Для прячущегося окна нельзя делать form.Close, т.к. тогда оно пропадет совсем, не оставив кнопки на панели
            if (form.СостояниеОкна != ВариантСостоянияОкна.Прячущееся)
                form.Close()
    }
    if (needActivate) {
        try {
            needActivate.activate()
        } catch (e) {}
        needActivate = null
    }
}

function withSelected(func) {
    for (var rows = new Enumerator(form.Controls.WndList.ВыделенныеСтроки); !rows.atEnd(); rows.moveNext())
        func(rows.item().Окно)
}

function WndListВыбор(Элемент, ВыбраннаяСтрока, Колонка, СтандартнаяОбработка) {
    СтандартнаяОбработка.val = false;
    if (Элемент.val.ТекущаяСтрока != undefined && Элемент.val.ТекущаяСтрока.Окно != undefined && Элемент.val.ТекущаяСтрока.Окно.view.visible) {
        if(!мАктивироватьПриВыбореСтроки)
            needActivate = ВыбраннаяСтрока.val.Окно.view
    }
    else {
        if(Элемент.val.ТекущаяСтрока.Строки.Количество()>0){
            if(!Элемент.val.ТекущаяСтрока.Строки.Получить(0).Окно.view)
                return
            лТекущаяВью=Элемент.val.ТекущаяСтрока.Строки.Получить(0).Окно.view
            if(!лТекущаяВью.isAlive()) return
            лТекущаяВью.mdObj.parent.openEditor()
            лТекущаяВью.mdObj.openEditor()
        }
    }

}

function WndListПриАктивизацииСтроки(Элемент) {
    if(мАктивироватьПриВыбореСтроки)
        if (Элемент.val.ТекущаяСтрока != undefined && Элемент.val.ТекущаяСтрока.Окно != undefined) {
            needActivate = Элемент.val.ТекущаяСтрока.Окно.view
        }
}

var boldFontV8, fontWin, boldFontWin

function ВыделитьИмяФайлаИзПолногоПути(пПуть, СРасширением) {
    if (СРасширением)
        var expr = /.*\\([\W\w\-\.]+)/;
    else
        var expr = /.*\/([\W\w\-\.]+)\.[^#?\s]+?$/;
    if (пПуть.match(expr))
        return RegExp.$1
        return пПуть
}

function WndListПриВыводеСтроки(Элемент, ОформлениеСтрокиЗн, ДанныеСтрокиЗн) {
    //function WndListПриПолученииДанных(Элемент, ОформлениеСтрок) {

    //debugger
    //for(di=0; di<ОформлениеСтрок.val.Количество();di++){
    //  ОформлениеСтроки = ОформлениеСтрок.val.Получить(di);
    //  ДанныеСтроки = ОформлениеСтроки.ДанныеСтроки;

    ДанныеСтроки = ДанныеСтрокиЗн.val;
    ОформлениеСтроки = ОформлениеСтрокиЗн.val;

    if (!ДанныеСтроки || !ДанныеСтроки.Заголовок)
        return;
    var cell = ОформлениеСтроки.Ячейки.Окно
    var item = ДанныеСтроки.Окно
    if (!item || !item.view || !item.view.isAlive()) {
        cell.УстановитьТекст(ДанныеСтроки.Заголовок);
        ТипОбъекта = ДанныеСтроки.Заголовок.substr(0, 3);
        if (ТипОбъекта.indexOf("Док") + 1)
            TypePicture = БиблиотекаКартинок.Документ;
        else if (ТипОбъекта.indexOf("Отч") + 1)
            TypePicture = БиблиотекаКартинок.Отчет;
        else if (ТипОбъекта.indexOf("Обр") + 1)
            TypePicture = БиблиотекаКартинок.Обработка;
        else if (ТипОбъекта.indexOf("Спр") + 1)
            TypePicture = БиблиотекаКартинок.Справочник;
        try {
            cell.УстановитьКартинку(TypePicture)
        } catch (e) {};
        return
    }
    if (item.view.icon != undefined)
        cell.УстановитьКартинку(item.view.icon)

    var cellinfo = ОформлениеСтроки.Ячейки.Инфо;
    var TypePicture = v8New("Картинка");
    var strwindow = item.view.title;
    if (strwindow.indexOf("Документ ") + 1)
        TypePicture = БиблиотекаКартинок.Документ;
    else if (strwindow.indexOf("Отчет ") + 1)
        TypePicture = БиблиотекаКартинок.Отчет;
    else if (strwindow.indexOf("Обработка ") + 1)
        TypePicture = БиблиотекаКартинок.Обработка;
    else if (strwindow.indexOf("Справочник ") + 1)
        TypePicture = БиблиотекаКартинок.Справочник;

    try {
        cellinfo.УстановитьКартинку(TypePicture)
    } catch (e) {}

    var title = item.makeTitle()
    var titlestr = title.title
    titlestr2 = ВыделитьИмяФайлаИзПолногоПути(titlestr, true)
    if (ДанныеСтроки.Родитель != undefined)
        cell.УстановитьТекст(ДанныеСтроки.Заголовок)
    else
        cell.УстановитьТекст(titlestr2)
    if (titlestr2 != titlestr)
        cellinfo.УстановитьТекст("[" + titlestr + "]")
    else
        cellinfo.УстановитьТекст(title.info)
}

function FilterРегулирование(Элемент, Направление, СтандартнаяОбработка) {
    var curRow = form.Controls.WndList.ТекущаяСтрока;
    var wndList = form.Controls.WndList.Value;
    if (!curRow) {
        if (form.WndList.Rows.Количество())
            form.Controls.WndList.ТекущаяСтрока = form.WndList.Rows.Получить(-1 == Направление.val ? 0 : form.WndList.Rows.Количество() - 1)
                return
    }
    var curRowIdx = form.WndList.Rows.Индекс(curRow),
    newRowIdx = curRowIdx

        if (-1 == Направление.val) {
            if (curRowIdx != form.WndList.Rows.Количество() - 1)
                newRowIdx++
        } else {
            if (curRowIdx > 0)
                newRowIdx--
        }
        if (newRowIdx != curRowIdx)
            form.Controls.WndList.ТекущаяСтрока = form.WndList.Rows.Получить(newRowIdx)
                СтандартнаяОбработка.val = false
}

function ПриОткрытии() {
    updateWndList()
    events.connect(Designer, "onIdle", SelfScript.self)
    form.Controls.Cmds.Кнопки.SaveSession.Доступность = мИспользоватьСессии;
    form.Controls.Cmds.Кнопки.RestoreSession.Доступность = мИспользоватьСессии;
    form.Controls.Cmds.Кнопки.TreeView.Check = treeView;

}
function ПриЗакрытии() {
    events.disconnect(Designer, "onIdle", SelfScript.self)
}

function find1LevelMdObj(mdObj) {
    if (mdObj.mdclass.name(1).length) {
        while (mdObj.parent && mdObj.parent.parent)
            mdObj = mdObj.parent
    }
    return mdObj
}

function CmdsActivate(Кнопка) {
    if (form.Controls.WndList.ТекущаяСтрока && form.Controls.WndList.ТекущаяСтрока.Окно)
        needActivate = form.Controls.WndList.ТекущаяСтрока.Окно.view
}

function closeSelected() {

    try{withSelected(function(item){item.view.close()})} catch (e){}

}

function closewindows() {
    //debugger
    ВыделенныеСтроки = form.Controls.WndList.ВыделенныеСтроки;
    ВсегоВыделеноСтрок = ВыделенныеСтроки.Количество();
    for (i = ВсегоВыделеноСтрок - 1; i >= 0; i--) {
        try{ТекСтрока = ВыделенныеСтроки.Получить(i)} catch(e) {continue}

        for (i1 = ТекСтрока.Строки.Количество() - 1; i1 >= 0; i1--) {
            ТекСтрока1 = ТекСтрока.Строки.Получить(i1);
            try {
                ТекСтрока1.Окно.view.close()
            } catch (e) {}
            try {
                ТекСтрока.Строки.Удалить(ТекСтрока1);
            } catch (e) {}

        }
        try {
            ТекСтрока.Окно.view.close()} catch(e){}
        try{
            if(ТекСтрока.Родитель == undefined)
                form.WndList.Строки.Удалить(ТекСтрока);
            else
                {
                лРодитель = ТекСтрока.Родитель;
                лРодитель.Строки.Удалить(ТекСтрока);
                if((лРодитель.Строки.Количество() == 0 && !лРодитель.Окно) || (лРодитель.Строки.Количество() = 0 && лРодитель.Окно.view && !лРодитель.Окно.view.isAlive()))
                    form.WndList.Строки.Удалить(лРодитель);
                }
        } catch (e) {}

        try{
            withSelected(function(item){item.view.close()})
        } catch (e){}
    }
}

function CmdsClose(Кнопка) {
    closewindows()
}

function CmdsOpenModule(Кнопка) {
    if (!form.Controls.WndList.ТекущаяСтрока)
        return;
    try {
        form.Controls.WndList.ТекущаяСтрока.Окно.view.mdObj.openModule("МодульОбъекта");
        return
    } catch (e) {}
    try {
        form.Controls.WndList.ТекущаяСтрока.Окно.view.mdObj.parent.openModule("МодульОбъекта");
        return
    } catch (e) {}
    try {
        form.Controls.WndList.ТекущаяСтрока.Строки.Получить(0).Окно.view.mdObj.parent.openModule("МодульОбъекта");
        return
    } catch (e) {}
    try {
        form.Controls.WndList.ТекущаяСтрока.Строки.Получить(0).Окно.view.mdObj.openModule("МодульОбъекта");
        return
    } catch (e) {}
}

function CmdsOpenManagerModule(Кнопка) {
    if (!form.Controls.WndList.ТекущаяСтрока)
        return;
    try {
        form.Controls.WndList.ТекущаяСтрока.Окно.view.mdObj.openModule("МодульМенеджера");
        return
    } catch (e) {}
    try {
        form.Controls.WndList.ТекущаяСтрока.Окно.view.mdObj.parent.openModule("МодульМенеджера")
    } catch (e) {}
    try {
        form.Controls.WndList.ТекущаяСтрока.Строки.Получить(0).Окно.view.mdObj.parent.openModule("МодульМенеджера");
        return
    } catch (e) {}
    try {
        form.Controls.WndList.ТекущаяСтрока.Строки.Получить(0).Окно.view.mdObj.openModule("МодульМенеджера");
        return
    } catch (e) {}
}

function CmdsOpenForm(Кнопка) {
    if (!form.Controls.WndList.ТекущаяСтрока)
        return;
    Окно = form.Controls.WndList.ТекущаяСтрока.Окно;
    try {
        mdObj = Окно.view.mdObj;
        mdObj.childObject("Формы", stdlib.getUuidFomMDRef(mdObj.property("ОсновнаяФормаОбъекта"))).openModule("Форма");
        return
    } catch (e) {}
    try {
        mdObj = Окно.view.mdObj;
        mdObj.childObject("Формы", stdlib.getUuidFomMDRef(mdObj.property("ОсновнаяФорма"))).openModule("Форма");
        return
    } catch (e) {}
    try {
        form.Controls.WndList.ТекущаяСтрока.Окно.view.mdObj.openModule("Форма");
        return
    } catch (e) {}

    Строки = form.Controls.WndList.ТекущаяСтрока.Строки;
    try {
        mdObj = Строки.Получить(0).Окно.view.mdObj;
        mdObj.childObject("Формы", stdlib.getUuidFomMDRef(mdObj.property("ОсновнаяФормаОбъекта"))).openModule("Форма");
        return
    } catch (e) {}
    try {
        mdObj = Строки.Получить(0).Окно.view.mdObj;
        mdObj.childObject("Формы", stdlib.getUuidFomMDRef(mdObj.property("ОсновнаяФорма"))).openModule("Форма");
        return
    } catch (e) {}
    try {
        Строки.Получить(0).Окно.view.mdObj.openModule("Форма");
        return
    } catch (e) {}

}

function CmdsSave(Кнопка) {
    withSelected(function (item) {
        stdcommands.Frame.FileSave.sendToView(item.view)
        form.Controls.WndList.ОбновитьСтроки(item.rowInVt)
    })
}

function CmdsFindInTree(Кнопка) {
    if (form.Controls.WndList.ТекущаяСтрока) {
        if (!form.Controls.WndList.ТекущаяСтрока.Окно)
            mdObj = form.Controls.WndList.ТекущаяСтрока.Строки.Получить(0).Окно.view.mdObj.parent;
        else
            mdObj = form.Controls.WndList.ТекущаяСтрока.Окно.view.mdObj;
        if (mdObj)
            mdObj.activateInTree()
    }
}
function CmdsMinimizeAll(Кнопка) {
    var views = windows.mdiView.enumChilds()
        for (var k = 0; k < views.count; k++)
            views.item(k).sendCommand("{c9d3c390-1eb4-11d5-bf52-0050bae2bc79}", 6)
}

function CmdsPrint(Кнопка) {
    withSelected(function (item) {
        stdcommands.Frame.Print.sendToView(item.view)
    })
}

function CmdsSaveSession(Кнопка) {
    if (!sessionManager)
        return
        nameSession = sessionManager.choiceSessionName();
    if (!nameSession)
        return;
    var views = {};
    for (var rows = new Enumerator(form.Controls.WndList.ВыделенныеСтроки); !rows.atEnd(); rows.moveNext()) {
        item = rows.item().Окно;
        views[item.view.id] = item;
    }
    sessionManager.saveSession(nameSession, views, 'SessionSaved');
}

function CmdsRestoreSession(Кнопка) {
    if (!sessionManager)
        return
        nameSession = sessionManager.choiceSessionName();
    if (!nameSession)
        return;
    sessionManager.restoreSession(nameSession, 'SessionSaved');
}

function НастройкиПриОткрытии() {
    мФормаНастройки.ДляВнешнихФайловОтображатьТолькоИмяФайла = мДляВнешнихФайловОтображатьТолькоИмяФайла
    мФормаНастройки.ИспользоватьСессии = мИспользоватьСессии;
    мФормаНастройки.ПриОткрытииФормыАктивизироватьСтрокуПоиска = activateSearchElement;
    мФормаНастройки.АктивироватьОкноПриВыбореСтроки = мАктивироватьПриВыбореСтроки;
}

function CmdsConfig(Кнопка) {
        мФормаНастройки = loadFormForScript(SelfScript, "ФормаНастройки") // Обработку событий формы привяжем к самому скрипту
        мФормаНастройки.ОткрытьМодально()
}

function мЗаписатьНастройки() {
    мДляВнешнихФайловОтображатьТолькоИмяФайла = мФормаНастройки.ДляВнешнихФайловОтображатьТолькоИмяФайла
        мИспользоватьСессии = мФормаНастройки.ИспользоватьСессии;
    activateSearchElement = мФормаНастройки.ПриОткрытииФормыАктивизироватьСтрокуПоиска;
    мАктивироватьПриВыбореСтроки = мФормаНастройки.АктивироватьОкноПриВыбореСтроки;

    profileRoot.setValue(pflOnlyNameForExtFiles, мДляВнешнихФайловОтображатьТолькоИмяФайла);
    profileRoot.setValue(pflUseSessions, мИспользоватьСессии);
    profileRoot.setValue(pflActivateSearch, activateSearchElement);
    profileRoot.setValue(pflActivateOneClick, мАктивироватьПриВыбореСтроки);

    if (!sessionManager && мИспользоватьСессии) {
        //Message("test load settings")
        loadSessionManager();
    }
}

function CmdsConfigSaveClose(Кнопка) {
    мЗаписатьНастройки()
    мФормаНастройки.Закрыть()
}

function CmdsConfigSave(Кнопка) {
    мЗаписатьНастройки()
}

function InvisiblePanelSelectAndHide(Кнопка) {
    if (form.Controls.WndList.ТекущаяСтрока) {
        needActivate = form.Controls.WndList.ТекущаяСтрока.Окно.view
            needHide = true
    }
}

function WndListПередНачаломДобавления(Элемент, Отказ, Копирование) {
    Отказ.val = true
}

function WndListПередУдалением(Элемент, Отказ) {
    //Отказ.val = true
    closewindows();
}

function CmdsTreeView(Button){
    treeView = !treeView;
    Button.val.Check = treeView;
    for (var i = WndList.One.list.length; i--; ) {
        var item = WndList.One.list[i];
        item.rowInVt = null;
    };
    if (treeView){
        dontSortWindows = false;
    }

    vt = form.Controls.WndList.Value;

    if (vt.Rows.Count()){
        vt.Rows.Clear();
    }
    WndList.One.lastFilter = "abracadabra";

    updateWndList();
    //form.Controls.WndList.ОбновитьСтроки();
}

function CmdshistorySort(Button){
    dontSortWindows = !dontSortWindows;
    Button.val.Check = dontSortWindows;
    oldteeView = treeView;

    if (dontSortWindows && oldteeView){
        treeView = false;
    }
    form.Controls.Cmds.Кнопки.TreeView.Check = treeView;


    for (var i = WndList.One.list.length; i--; ) {
        var item = WndList.One.list[i];
        item.rowInVt = null;
    };

    vt = form.Controls.WndList.Value;

    if (vt.Rows.Count()){
        vt.Rows.Clear();
    }
    WndList.One.lastFilter = "abracadabra";

    updateWndList();
}

(function () {
    // Инициализация скрипта
    WndList.One = new WndList
        form = loadFormForScript(SelfScript)
        form.КлючСохраненияПоложенияОкна = "wndpanel"
        form.WndList.Columns.Окно.ТипЗначения = v8New("ОписаниеТипов")
        var hk = [
            ["Activate", 13, 0],
            ["Close", 115, 8],
            ["Save", "S".charCodeAt(0), 8],
            ["Print", "P".charCodeAt(0), 8],
            ["FindInTree", "T".charCodeAt(0), 8]
        ]
        for (var k in hk)
            form.Controls.Cmds.Кнопки.Найти(hk[k][0]).СочетаниеКлавиш = stdlib.v8hotkey(hk[k][1], hk[k][2])
                form.Controls.InvisiblePanel.Кнопки.SelectAndHide.СочетаниеКлавиш = stdlib.v8hotkey(13, 8)
})()

function loadSessionManager() {
    try {
        sessionManager = stdlib.require(env.pathes.addins + "SessionManager.js").GetSessionManager();
    } catch (e) {
        Message("Невозможно загрузить Менеджер сессий " + e.description());
    };
}

function macrosОткрытьОкно() {

    мФормаСкрипта = null;
        if (!мФормаСкрипта) {
            мФормаСкрипта = loadFormForScript(SelfScript) // Обработку событий формы привяжем к самому скрипту
            мФормаСкрипта.КлючСохраненияПоложенияОкна = SelfScript.uniqueName;
            //мФормаСкрипта.Заголовок = "Список Процедур/Функций" //+мВерсияСкрипта
        }
        мФормаСкрипта.Открыть()
}

function ДобавитьОбъектыВСписок(Массив, i1, КлассОбъектов){

    for (i=0; i<md.childObjectsCount(КлассОбъектов);i++){
        ИмяОбъекта = md.childObject(КлассОбъектов, i).name;
        Массив.Вставить(ИмяОбъекта, Массив.Количество());
        i1++
        //Message("" +i1 + ":  " + КлассОбъектов + ":" +  ИмяОбъекта);
    }

}

function ПолучитьСписокМетаданных(){

    md = Designer.metadata.current.rootObject;
    mdclass = md.mdclass;
    Массив = v8New("Соответствие");
    var i1 = 1;

    ДобавитьОбъектыВСписок(Массив, i1, "ОбщиеМодули")
    ДобавитьОбъектыВСписок(Массив, i1, "Роли")
    ДобавитьОбъектыВСписок(Массив, i1, "ПланыОбмена")
    ДобавитьОбъектыВСписок(Массив, i1, "КритерииОтбора")
    ДобавитьОбъектыВСписок(Массив, i1, "ПодпискиНаСобытия")
    ДобавитьОбъектыВСписок(Массив, i1, "ОбщиеФормы")
    ДобавитьОбъектыВСписок(Массив, i1, "ОбщиеКоманды")
    ДобавитьОбъектыВСписок(Массив, i1, "ГруппыКоманд")
    ДобавитьОбъектыВСписок(Массив, i1, "Интерфейсы")
    ДобавитьОбъектыВСписок(Массив, i1, "ОбщиеМакеты")
    ДобавитьОбъектыВСписок(Массив, i1, "Справочники")
    ДобавитьОбъектыВСписок(Массив, i1, "Документы")
    ДобавитьОбъектыВСписок(Массив, i1, "ЖурналыДокументов")
    ДобавитьОбъектыВСписок(Массив, i1, "Перечисления")
    ДобавитьОбъектыВСписок(Массив, i1, "Отчеты")
    ДобавитьОбъектыВСписок(Массив, i1, "Обработки")
    ДобавитьОбъектыВСписок(Массив, i1, "ПланыВидовХарактеристик")
    ДобавитьОбъектыВСписок(Массив, i1, "ПланыСчетов")
    ДобавитьОбъектыВСписок(Массив, i1, "ПланыВидовРасчета")
    ДобавитьОбъектыВСписок(Массив, i1, "РегистрыСведений")
    ДобавитьОбъектыВСписок(Массив, i1, "РегистрыНакопления")
    ДобавитьОбъектыВСписок(Массив, i1, "РегистрыБухгалтерии")
    ДобавитьОбъектыВСписок(Массив, i1, "РегистрыРасчета")
    ДобавитьОбъектыВСписок(Массив, i1, "БизнесПроцессы")
    ДобавитьОбъектыВСписок(Массив, i1, "Задачи")

    return Массив;

}

var pflOnlyNameForExtFiles = "WndPanel/OnlyNameForExtFiles"
var pflUseSessions = "WndPanel/UseSessions";
var pflActivateSearch = "WndPanel/ActivateSearch";
var pflActivateOneClick = "WndPanel/ActivateOneClick";

profileRoot.createValue(pflOnlyNameForExtFiles, false, pflSnegopat)
profileRoot.createValue(pflUseSessions, false, pflSnegopat)
profileRoot.createValue(pflActivateSearch, false, pflSnegopat)
profileRoot.createValue(pflActivateOneClick, false, pflSnegopat)

var мДляВнешнихФайловОтображатьТолькоИмяФайла = profileRoot.getValue(pflOnlyNameForExtFiles);
var мИспользоватьСессии = profileRoot.getValue(pflUseSessions);
var activateSearchElement = profileRoot.getValue(pflActivateSearch);
var мАктивироватьПриВыбореСтроки = profileRoot.getValue(pflActivateOneClick);

var СписокМетаданных = ПолучитьСписокМетаданных();
var ДлинаНомераМД = СписокМетаданных.Количество().toString().length;
sessionManager = null;

var needUpdateColors = true;

if (мИспользоватьСессии) {
    loadSessionManager();
}

//macrosОткрытьОкно()
macrosПоказать()
