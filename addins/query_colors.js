//engine: JScript
//uname: query_colors
//dname: Настройка цветов редактора запросов
//descr: Скрипт позволяет настраивать цвета редактора запросов
//author: orefkov
//www: https://snegopat.ru/scripts/wiki?name=query_colors.js
//help: inplace

/*@
<q>
- Видишь суслика?  
- Нет.  
- И я не вижу. А он есть.  
</q>
Просматривая различные настройки, хранящиеся в профайле 1С, наткнулся на настройку цветов для
разных категорий слов в редакторе запросов. Для модулей подобные настройки вынесены в пользовательский
интерфейс, а для запросов - нет. Этот скрипт исправляет данную несправедливость.
@*/

function macrosОткрытьОкно()
{
    form = loadScriptForm(SelfScript.fullPath.replace(/js$/i, 'ssf'), SelfScript.self)
    form.ОткрытьМодально()
    form = null
}

/* Возвращает название макроса по умолчанию - вызывается, когда пользователь 
дважды щелкает мышью по названию скрипта в окне Снегопата. */
function getDefaultMacros() {
    return 'ОткрытьОкно';
}

function ПриОткрытии()
{
    var qec = profileRoot.getFolder("SelectColorCategory")
    for(var i = 0, c = qec.valuesCount; i < c; i++)
    {
        var row = form.Категории.Добавить()
        row.Категория = qec.valueName(i)
        row.Цвет = qec.getValueAt(i)
    }
}

function Записать(Кнопка)
{
    for(var rows = new Enumerator(form.Категории); !rows.atEnd(); rows.moveNext())
    {
        var row = rows.item()
        profileRoot.setValue("SelectColorCategory/" + row.Категория, row.Цвет)
    }
    MessageBox("Для вступления изменений в силу перезапустите Конфигуратор", mbOk | mbIconInformation, "Снегопат")
}

function ЗаписатьИЗакрыть(Кнопка)
{
    Записать()
    form.Закрыть()
}

function ПриВыводеСтроки(Элемент, ОформлениеСтроки, ДанныеСтроки)
{
    ОформлениеСтроки.val.Ячейки.Показ.ЦветФона = ДанныеСтроки.val.Цвет
}
