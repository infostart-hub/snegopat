//engine: JScript
//uname: pflview
//dname: Просмотр профайла 1С
//descr: Скрипт для просмотра дерева сохранённых настроек 1С
//help: inplace
//author: orefkov

/*@
Этот скрипт выводит в дерево значений содержимое профайла - хранилища настроек.

Профайл представляет из себя набор папок, подпапок и значений, наподобие реестра Windows
Несмотря на то, что весь профайл представляется единым деревом, он представляет
собой объединение нескольких физических хранилищ - файлов pfl. Хранилища задают,
на каком уровне разделяются хранящиеся значения - на уровне компьютера,
базы данных, пользователя, сеанса, и их сочетаний. (см. метод createValue объекта Profile)

Корневая папка доступна через свойство объекта Designer - profileRoot
Для каждого значения задается хранилище, в котором оно должно храниться.
То есть если например, для значения задано хранилище "Компьютер", оно будет единым
для всех пользователей всех баз на этом компьютере. Если хранилище - "база данных", то
оно единое для всех пользователей этой базы данных, в другой базе данных оно может быть
другим, и тд и тп. Есть хранилище - сеанс. Значения в нем сохраняются только в памяти
на время работы, и после сеанса не сохраняются.

Узнать, к какому хранилищу относиться значение - пока невозможно.
1С сохраняет в файл только те значения, которые были изменены во время работы.
Например, для цветов раскраски языка расширений нет пользовательских настроек,
поэтому в файлах pfl они не видны, тк никогда не изменялись во время работы.
Однако при работе 1С они есть в профайле и содержат свои дефолтные значения.
Создать свое значение можно методом createValue объекта Profile,
установить значение - методом setValue.

К значениям, хранящимся в подпапках, можно сразу обратиться из вышестоящей папке,
указав полный путь от этой папке через слэш:

    profileRoot.getValue("App/Name")
    profileRoot.createValue("Snegopat/MySettings/MyValue", 0, pflSnegopat)
    profileRoot.setValue("Snegopat/MySettings/MyValue", 10)

Снегопат добавляет еще одно хранилище - файл snegopat.pfl в папке data.
@*/

addins.byUniqueName("global").object.connectGlobals(SelfScript)

var form

function walkProfile(pflFolder, parentRow)
{
    //form.ЭлементыФормы.ProfileTree.НачальноеОтображениеДерева = v8New("ПеречислениеНачальноеОтображениеДерева").РаскрыватьВсеУровни
    
    var myRow = parentRow.Строки.Добавить()
    myRow.Key = pflFolder.name
    for(var i = 0, c= pflFolder.foldersCount; i < c; i++)
        walkProfile(pflFolder.getFolderAt(i), myRow)
    for(var i = 0, c = pflFolder.valuesCount; i < c; i++)
    {
        var row = myRow.Строки.Добавить()
        row.Key = pflFolder.valueName(i)
        var val = pflFolder.getValueAt(i)
        row.Value = val
        row.ValueInternal = ЗначениеВСтрокуВнутр(val)
    }
}

function macrosПоказатьПрофайл()
{
    refreshAll()
        // if(!form)
        // {
            // form = loadScriptForm(SelfScript.fullPath.replace(/js$/i, 'ssf'), SelfScript.self)
            // walkProfile(profileRoot, form.ProfileTree)
        // }
    form.Открыть()
}

function refreshAll()
{
    if(!form)
    {
        form = loadScriptForm(SelfScript.fullPath.replace(/js$/i, 'ssf'), SelfScript.self)
            //walkProfile(profileRoot, form.ProfileTree)
    }
    walkProfile(profileRoot, form.ProfileTree)
}

/* Возвращает название макроса по умолчанию - вызывается, когда пользователь 
дважды щелкает мышью по названию скрипта в окне Снегопата. */
function getDefaultMacros() {
    return 'ПоказатьПрофайл';
}

function КоманднаяПанельРазвернутьВсеГруппы(Кнопка)
{
    for(var rowsArray = new Enumerator(form.ProfileTree.Строки);
        !rowsArray.atEnd(); rowsArray.moveNext())
    {
        var row = rowsArray.item();
        form.ЭлементыФормы.ProfileTree.Развернуть(row, true)
    }
}

function КоманднаяПанельСвернутьВсеГруппы(Кнопка)
{
    // первый уровень всегда оставляем открытым
    row0 = form.ProfileTree.Строки.Получить(0)
    for(var rowsArray = new Enumerator(row0.Строки);
        !rowsArray.atEnd(); rowsArray.moveNext())
    {
        var row = rowsArray.item();
        form.ЭлементыФормы.ProfileTree.Свернуть(row)
    }
}

function КоманднаяПанельОбновить(Кнопка)
{
    if(form)
        form.ProfileTree.Строки.Очистить()
    refreshAll()
    // if(form)
        // form.Обновить()
}
