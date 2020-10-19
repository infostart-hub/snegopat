//engine: JScript
//uname: vtcreator
//dname: Конструктор ТЗ
//help: inplace
//author: orefkov
//descr: Конструктор ТЗ
//addin: global
//addin: stdlib
//addin: stdcommands

// Александр Орефков
// Это небольшой скрипт с формой для генерации текста создания ТаблицыЗначений.
// Позволяет ввести имя переменной, а также состав колонок с указанием имени,
// описания типа, заголовка, ширины.
// Для ввода описания типа используется штатный "Конструктор описания типов".
// Надо бы наверное сделать еще ввод индексов, может кто-то доделает?

global.connectGlobals(SelfScript)
form = loadScriptFormEpf(SelfScript.fullPath.replace(/js$/i, "epf"), "Форма", SelfScript.self)
form.КлючСохраненияПоложенияОкна = "vtcreator"

function macrosСоздатьТаблицуЗначений()
{
    if(!snegopat.activeTextWindow())
        form.ЭлементыФормы.НеактивностьОкна.Заголовок = "Нет активного текстового окна. Текст будет выведен в окно сообщений"
    else
        form.ЭлементыФормы.НеактивностьОкна.Заголовок = ""
    if(!form.ОткрытьМодально())
        return
    var text = form.ИмяПеременной + " = Новый ТаблицаЗначений;\n"
    // Для каждого из
    for(var rows = new Enumerator(form.СоставКолонок); !rows.atEnd(); rows.moveNext())
    {
        var row = rows.item()
        var items = new Array()
        items.push(row.Имя.length ? '"' + row.Имя + '"' : "")
        items.push(row.Тип)
        items.push(row.Заголовок.length ? '"' + row.Заголовок + '"' : "")
        items.push(row.Ширина ? "" + row.Ширина : "")
        text += form.ИмяПеременной + '.Колонки.Добавить(' + items.join(', ').replace(/(,\s)+$/, "") + ");\n"
    }
    var txtWnd = snegopat.activeTextWindow()
    if(!txtWnd)
        Message(text)
    else
    {
        // Надо получить отступ
        var sel = txtWnd.getSelection()
        var textLine = txtWnd.line(sel.beginRow)
        // Курсор может быть за концом строки
        while(textLine.length < sel.beginCol - 1)	
            textLine += ' '
        // Оставим только часть строки перед курсором
        textLine = textLine.substr(0, sel.beginCol - 1)
        var m = textLine.match(/^\s+/)
        if(m)	// Есть пробельные символы в начале строки
            text = text.replace(/\n/g, '\n' + m[0])	// Заменим переводы строк на перевод строк + отступ
        text = text.replace(/\s+$/m, '')			// СокрП
        // Вставим текст
        txtWnd.selectedText = text
        //txtWnd.setCaretPos(sel.beginRow, sel.beginCol)
    }
}

function ОтменаНажатие(Элемент)
{
    form.Закрыть(false)
}

function ОКНажатие(Элемент)
{
    form.Закрыть(true)
}

function СоставКолонокТипНачалоВыбора(Элемент, СтандартнаяОбработка)
{
    var input = snegopat.parseTemplateString('<?"Укажите тип", КонструкторОписанияТипов>')
    if(input.length)
    {
        input = input.replace(/\n|;$/g, '')
        form.ЭлементыФормы.СоставКолонок.ТекущаяСтрока.Тип = input
    }
}
