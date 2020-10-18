//engine: JScript
//uname: selectColumn
//dname: Выбор колонки табличного поля
//descr: Быстрый ввод названий колонок табличных полей из обычной формы
//author: orefkov
//help: inplace
//addin: stdlib

stdlib.require("SelectValueDialog.js", SelfScript);
/*@
(c) Александр Орефков

Небольшой скрипт, позволяющий быстро вставить в код название любой из колонок табличных
 полей, расположенных на обычной форме
Требует для работы svcsvc
@*/

function v8ver()
{
	var ver = env.v8Version.split('.');
	for(var k in ver)
		ver[k] = parseInt(ver[k])
	return ver
}

SelfScript.self['macrosВыбрать колонку ТабличногоПоля'] = function()
{
    var useSvcsvc = true;
    try{
        var sel = new ActiveXObject('Svcsvc.Service')
    }catch(e)
    {
        //Message("Не удалось создать объект 'Svcsvc.Service'. Зарегистрируйте svcsvc.dll")
        //return
        useSvcsvc = false;
    }
    // Получаем активное текстовое окно
    var wnd = snegopat.activeTextWindow()
    if(!wnd)
        return
    // Проверим, что это Форма.
    // Свойство mdProp показывает, к какому свойству объекта метаданных относится окно
    if(wnd.mdProp.name(1) != "Форма")
        return
    // Получим само свойство "Форма". Это "внешнее" свойство, т.е. оно храниться отдельно от
    // самого объекта метаданных.
    // При получении можно указывать гуид свойства, или его имя, или порядковый номер
    var extProp = wnd.mdObj.getExtProp(wnd.mdProp.id)
    // Сохраним текущее состояние свойства "Форма" в файл. Так как файл в saveToFile не передан, то
    // сохранение произойдет в псевдо-файл в памяти.
    var file = extProp.saveToFile()
    // Для обычных форм формат файла формы является "файлом файлов", storage. Поэтому будем
    // рассматривать его как storage. Для управляемых форм - это не так, там обычный текст utf-8
    try{
        // создадим хранилище на базе файла. Для управляемых форм тут вывалится в catch
        var stg = v8Files.attachStorage(file)
        // Получим из хранилища содержимое под-файла form
        var text = stg.open("form", fomIn).getString(dsUtf8)
        //Message(text)
        // Простым регэкспом выдернем встречающиеся колонки
		var ver = v8ver()
		var is835 = ver[1] > 3 || (ver[1] == 3 && ver[2] >= 5)
        var re = is835 ? /\{7,3,0,\d,\d+\},\d,0,0,4,0,"(.+)"/g : /\{6,3,0,\d\},\d,0,0,4,0,"(.+)"/g
        var columns = {}
        while(re.exec(text))
            columns[RegExp.$1] = 1
        var arrOfColumns = []
        for(var k in columns)
            arrOfColumns.push(k)
        if (useSvcsvc){
            var choice = sel.FilterValue(arrOfColumns.join("\r\n"), 1 | 4);    
        } else {
            var dlg = new SelectValueDialog("Выбор колонки табличного поля", arrOfColumns);
            sel = dlg.selectValue();
            var choice = '';
            if (sel){
                choice = dlg.selectedValue;
            }
        }
        
        if(choice.length)
        {
            wnd.selectedText = choice
            return true
        }
    }catch(e)
    {
        // Сюда попадаем, если это управляемая форма. Ее можно прочитать так
        //file.seek(0, fsBegin)
        //Message(file.getString(dsUtf8))
    }
}
