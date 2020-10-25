//engine: JScript
//uname: AnalizeEventSubscript
//dname: Анализ подписок на события
//help: inplace
//author: orefkov
//descr: Скрипт, показывающий отчет по подпискам на события объектов метаданных
//addin: global
//addin: stdlib
//addin: stdcommands

/*@
Небольшой скрипт, консолидированно показывающий подписки на события объектов метаданных.
Подписки группируются по объекту метаданных, виду подписки.
Позволяет быстро перейти к объектам метаданных и к обработчику подписки.
@*/

global.connectGlobals(SelfScript)

var form = loadFormForScript(SelfScript);
form.Результат.Columns.Add("mdobj");

function ТаблицаПодписок() {
    var vt = v8New("ТаблицаЗначений");
    vt.Колонки.Добавить("Метаданные");
    vt.Колонки.Добавить("Объект");
    vt.Колонки.Добавить("Имя");
    vt.Колонки.Добавить("Событие");
    vt.Колонки.Добавить("Обработчик");
    vt.Колонки.Добавить("mdobj");
    vt.Колонки.Добавить("event");

    var choice = v8New("СписокЗначений");
    for (var i = 0, c = metadata.openedCount; i < c; i++) {
        var container = metadata.getContainer(i);
        try {
            if (container.rootObject.childObjectsCount("ПодпискиНаСобытия") > 0)
                choice.Add(container, container.identifier, false, container.rootObject.picture);
        } catch (e) { }
    }
    if (choice.Count() == 0) {
        MessageBox("Нет конфигураций с подписками");
        return null;
    } else if (choice.Count() == 1)
        choice = choice.Get(0);
    else
        choice = choice.ChooseItem("Выберите конфигурацию для отчета");
    if (!choice)
        return null;
    var container = choice.Value;
    var mdObj = container.rootObject;
    //debugger
    for (var i = 0, c = mdObj.childObjectsCount("ПодпискиНаСобытия") ; i < c; i++) {
        var event = mdObj.childObject("ПодпискиНаСобытия", i)
        var typeString = ЗначениеВСтрокуВнутр(event.property("Источник"))
        var typesUUIDs = typeString.replace(/\n/g, "").replace(/\{"#",f5c65050-3bbb-11d5-b988-0050bae0a95d,\{"Pattern",|\}\}|"#",/g, '').split(',')
        for (var idx in typesUUIDs) {
            var obj = container.findByTypeUUID(typesUUIDs[idx])
            var mdClassName = obj.mdclass.name(1, true)
            if (!mdClassName.length) {
                obj = container.rootObject
                mdClassName = " Конфигурация"
            }
            if (obj) {
                var row = vt.Add()
                row.Имя = event.name
                row.Событие = toV8Value(event.property("Событие")).presentation()
                row.Обработчик = toV8Value(event.property("Обработчик")).presentation()
                row.Объект = obj.name
                row.Метаданные = mdClassName
                row.mdobj = obj
                row.event = event
            }
        }
    }
    vt.Sort("Метаданные,Объект,Имя")
    form.ЭлементыФормы.Конфигурация.Заголовок = container.identifier
    return vt
}

function makeReport() {
    var source = ТаблицаПодписок()
    if (!source)
        return
    var tree = form.Результат
    tree.Rows.Clear()
    var lastMdName, lastMdRow, lastObjName, lastObjRow

    for (var rows = new Enumerator(source) ; !rows.atEnd() ; rows.moveNext()) {
        var row = rows.item()
        if (row.Метаданные !== lastMdName) {
            lastMdName = row.Метаданные
            lastMdRow = tree.Rows.Add()
            lastMdRow.Событие = lastMdName
            lastMdRow.mdobj = row.mdobj
            lastObjName = undefined
        }
        if (row.Объект !== lastObjName) {
            lastObjName = row.Объект
            lastObjRow = lastMdRow.Rows.Add()
            lastObjRow.Событие = lastObjName
            lastObjRow.mdobj = row.mdobj
        }
        var tr = lastObjRow.Rows.Add()
        tr.Событие = row.Событие
        tr.Имя = row.Имя
        tr.Обработчик = row.Обработчик
        tr.mdobj = row.event
    }
    for (var rows = new Enumerator(tree.Rows) ; !rows.atEnd() ; rows.moveNext())
        form.ЭлементыФормы.Результат.Развернуть(rows.item(), false)
}

function macrosОткрытьОтчет() {
    form.Открыть()
}

function CmdPanelСформировать(Кнопка) {
    makeReport()
}

function РезультатПриВыводеСтроки(Элемент, ОформлениеСтроки, ДанныеСтроки) {
    if (ДанныеСтроки.val.mdobj)
        ОформлениеСтроки.val.Cells.Событие.УстановитьКартинку(ДанныеСтроки.val.mdobj.picture)
}

function openModuleProc(name, container) {
    var handler = name.split(".")
    // Попробуем получить объект метаданных - общий модуль с указанным именем
    try {
        var modulMdObj = container.rootObject.childObject("ОбщиеМодули", handler[0])
    } catch (e) { }
    if (modulMdObj) {
        // Откроем общий модуль
        var txtEdt = modulMdObj.openModule("Модуль")
        if (!txtEdt) {
            Message("no module");
            return
        }
        // Распарсим текст модуля
        var parser = snegopat.parseSources(txtEdt.text)
        var idxOfMethodName = parser.strNameIdx(handler[1])  // Найдем индекс названия метода в списке идентификаторов
        if (idxOfMethodName.length) {
            var found = parser.reStream.match(new RegExp("(Pc|Fu)" + idxOfMethodName + "Lp"))
            if (found) {
                var line = parser.lexem(parser.posToLexem(found.index + 2)).line
                txtEdt.setCaretPos(line + 1, 1) // Чтобы процедура по-любому развернулась и окно проскроллилось
                txtEdt.setSelection(line, 1, line, txtEdt.line(line).length + 1)
            }
        }
    }
}

function РезультатВыбор(Элемент, ВыбраннаяСтрока, Колонка, СтандартнаяОбработка) {
    СтандартнаяОбработка.val = false
    var mdobj = ВыбраннаяСтрока.val.mdobj

    if (Колонка.val.Имя == "Обработчик")
        openModuleProc(ВыбраннаяСтрока.val.Обработчик, mdobj.container)
    else {
        try {
            if (mdobj.container == metadata.ib && !mdobj.container.treeVisible)
                stdcommands.Config.OpenDBCfg.send()
            mdobj.activateInTree()
        } catch (e) { }
    }
}
