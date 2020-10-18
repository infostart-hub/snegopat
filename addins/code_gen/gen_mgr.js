//engine: JScript
//uname: codegen_manager
//dname: Менеджер генераторов кода
//author: Александр Орефков orefkov@gmail.com, Сосна Евгений <shenja@sosna.zp.ua>
//help: inplace
//addin: stdlib

/*@
Скрипт - для запуска различных генераторов кода.

Данный скрипт должен быть подключаться РАНЕЕ других скриптов - генераторов кода.
@*/


var attrTypeCategory        = "{30E571BC-A897-4A78-B2E5-1EA6D48B5742}"
stdlib.require("SelectValueDialog.js", SelfScript);

// Сразу загрузим форму, т.к. ее дерево будет использоваться для хранения функций-кодогенераторов
var codeGens = [], form
form = loadScriptForm(SelfScript.fullPath.replace(/js$/, 'ssf'), SelfScript.self)
form.ИспользоватьМетаданные = 1
form.Дерево.Колонки.Добавить("caller")

// Регистрация функции кодогенератора.
function registerCodeGen(description, caller)
{
    var descr = description.split("/")
    var root = form.Дерево.Строки
    for(var i = 0; i < descr.length - 1; i++)
    {
        var row = root.Найти(descr[i], "Генератор")
        if(!row)
        {
            row = root.Добавить()
            row.Генератор = descr[i]
            row.Картинка = 0
        }
        root = row.Строки
    }
    // Сначала попробуем найти, может такая запись уже есть.
    // Это позволит перезагружать скрипты-кодогенераторы
    row = root.Найти(descr[i])
    if(!row)
    {
        row = root.Добавить()
        row.Генератор = descr[i]
    }
    row.Картинка = 1
    row.caller = caller
}

// Собственно, выбор и запуск генерации
SelfScript.Self["macrosХочу Кода!!!"] = function()
{
    var pathToForm = SelfScript.fullPath.replace(/js$/, 'ssf')
    // Обработку событий формы привяжем к самому скрипту
    if(form.ОткрытьМодально())
    {
        var mdCont = form.ИспользоватьМетаданные == 1 ? metadata.ib : metadata.current
        var caller = form.ЭлементыФормы.Дерево.ТекущиеДанные.caller
        var param = {mdCont:mdCont, text:"", caretToBegin:true}
        if(!caller(param))
            return
        var text = param.text
        var txtWnd = snegopat.activeTextWindow()
        if(!txtWnd || txtWnd.readOnly)
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
            if(param.caretToBegin)
                txtWnd.setCaretPos(sel.beginRow, sel.beginCol)
        }
    }
}

// Обработчики событий формы
function ПриОткрытии()
{
    // Если текущая конфа не открыта или не отличается от конфы ИБ,
    // то нет смысла выбирать метаданные
    if(!stdlib.isConfigOpen() || !stdlib.isConfigsDifferent())
    {
        form.ИспользоватьМетаданные = 1
        form.ЭлементыФормы.ОткрытаяКонфигурация.Доступность = false
    }
    else
        form.ЭлементыФормы.ОткрытаяКонфигурация.Доступность = true
}
function КоманднаяПанель1ОК(Кнопка)
{
    form.Закрыть(true)
}

function ДеревоПриАктивизацииСтроки(Элемент)
{
    form.ЭлементыФормы.КоманднаяПанель1.Кнопки.Ок.Доступность = !!Элемент.val.ТекущиеДанные.caller
}
function ДеревоВыбор(Элемент, ВыбраннаяСтрока, Колонка, СтандартнаяОбработка)
{
    if(Элемент.val.ТекущиеДанные.caller)
        form.Закрыть(true)
}
/////////////////////////////////////////////////////////
// Разные полезняшки для кодогенераторов

// Класс для получения названий типов объекта матаданных, т.к. штатный объект ОписаниеТипов в
// режиме Конфигуратора не выдает типы, основанные на метаданных.
function TypeFinder(mdCont)
{
    if(!mdCont)
        mdCont = metadata.current
    var types = stdlib.toArray(mdCont.typeList(attrTypeCategory, 1))
    for(var i in types)
        this[types[i].clsid] = types[i].name
}

TypeFinder.prototype.getTypeString = function(mdObj)
{
    var text = []
    var types = stdlib.toArray(mdObj.types())
    for(var i in types)
        text.push(this[types[i]]);
    return text.join(", ")
}

// Функция, обрабатывает переданный массив строк, выравнивая в них знаки "="
function formatAssign(lines)
{
    var tabSize = profileRoot.getValue("ModuleTextEditor/TabSize")
    var ll = []
    maxEqualPos = -1
    for(var l in lines)
    {
        var line = {text: lines[l]}
        line.eqRealPos = line.text.indexOf("=")
        if(line.eqRealPos >= 0)
        {
            line.eqPosInSpaces = 0
            for(var k = 0; k < line.eqRealPos; k++)
            {
                if(line.text.charAt(k) == "\t")
                    line.eqPosInSpaces += tabSize - (line.eqPosInSpaces % tabSize)
                else
                    line.eqPosInSpaces++
            }
            if(line.eqPosInSpaces > maxEqualPos)
                maxEqualPos = line.eqPosInSpaces
        }
        ll.push(line)
    }
    var text = ""
    for(var l in ll)
    {
        var line = ll[l]
        if(line.eqRealPos < 0)
            text += line.text + "\n"
        else
            text += line.text.substr(0, line.eqRealPos) + fillLine(" ", maxEqualPos - line.eqPosInSpaces) + line.text.substr(line.eqRealPos) + "\n"
    }
    return text
}

function formatAssignInplace(lines, startIdx)
{
    var tabSize = profileRoot.getValue("ModuleTextEditor/TabSize")
    var ll = []
    maxEqualPos = -1
    for(var l = startIdx; l < lines.length; l++)
    {
        var line = {text: lines[l]}
        line.eqRealPos = line.text.indexOf("=")
        if(line.eqRealPos >= 0)
        {
            line.eqPosInSpaces = 0
            for(var k = 0; k < line.eqRealPos; k++)
            {
                if(line.text.charAt(k) == "\t")
                    line.eqPosInSpaces += tabSize - (line.eqPosInSpaces % tabSize)
                else
                    line.eqPosInSpaces++
            }
            if(line.eqPosInSpaces > maxEqualPos)
                maxEqualPos = line.eqPosInSpaces
        }
        ll.push(line)
    }
    for(var l =0; l < ll.length; l++)
    {
        var line = ll[l]
        if(line.eqRealPos >= 0)
            lines[startIdx + l] = line.text.substr(0, line.eqRealPos) + fillLine(" ", maxEqualPos - line.eqPosInSpaces) + line.text.substr(line.eqRealPos)
    }
}


// Получить строку одинаковых символов указанной длины
function fillLine(symbol, count)
{
    var text = ""
    if(count < 17)
    {
        while(count--)
            text += symbol
    }
    else
    {
        var part = fillLine(symbol, Math.floor(count / 2))
        text = part + part
        if(count % 2)
            text += symbol
    }
    return text
}

AdditionalParams = stdlib.Class.extend({
    construct: function(){},
    getParams: function(data)
    {
        this.form = loadScriptForm(SelfScript.fullPath.replace(/\\[^\\]*$/, '\\gen_param.ssf'), this);
        this.form.comments = true
        this.form.VarName = data.VarName
        this.form.Attribs.Колонки.Добавить("Object")
        for(var k in data.items)
        {
            var item = data.items[k]
            var row = this.form.Attribs.Строки.Добавить();
            row.Name = item.name
            row.Checked = 1
            row.Object = item
            for(var i in item.items)
            {
                var r = item.items[i]
                var rr = row.Строки.Добавить();
                rr.Name = r.name
                rr.Checked = 1
                rr.Object = r
            }
            this.form.ЭлементыФормы.Attribs.Развернуть(row, true)
        }
        if(this.form.ОткрытьМодально())
        {
            data.VarName = this.form.VarName
            data.comments = this.form.comments
            for(var k = 0, c = this.form.Attribs.Строки.Количество(); k < c; k++)
            {
                var r = this.form.Attribs.Строки.Get(k)
                r.Object.checked = r.Checked
                for(var i = 0, x = r.Строки.Количество(); i < x; i++)
                {
                    var rr = r.Строки.Get(i)
                    rr.Object.checked = rr.Checked
                }
            }
            return data
        }
        return null
    },
    OnOK: function()
    {
        this.form.Закрыть(true)
    },
    AttribsПриИзмененииФлажка: function(Элемент, Колонка)
    {
        var cr = Элемент.val.ТекущаяСтрока
        if(cr.Checked == 2)
            cr.Checked = 0
        if(cr.Parent)   // Это подчиненная строка
        {
            // Далее определим, какое состояние должно быть у родительской строки
            var cnt = cr.Parent.Строки.Количество(), prev = cr.Parent.Строки.Get(0).Checked
            for(var k = 1; k < cnt; k++)
            {
                var c = cr.Parent.Строки.Get(k).Checked
                if(c != prev)
                {
                    prev = 2
                    break;
                }
            }
            cr.Parent.Checked = prev
        }
        else
        {
            var cnt = cr.Строки.Количество()
            for(var k = 0; k < cnt; k++)
                cr.Строки.Get(k).Checked = cr.Checked
        }
    }
})

function selectMetaKind(mdCont, mdKinds, title)
{
    var vl = v8New("ValueList")
    for(var k = 0, c = mdCont.rootObject.childObjectsCount(mdKinds); k < c; k++)
    {
        var obj = mdCont.rootObject.childObject(mdKinds, k)
        vl.Add(obj.name, obj.name, false, obj.picture)
    }
    var dlg = new SelectValueDialog("Выберите вид " + title);
    dlg.form.Controls.ValuesList.Columns.Picture.Visible = true
    if(dlg.selectValue(vl))
        return dlg.selectedValue
    return ''
}
