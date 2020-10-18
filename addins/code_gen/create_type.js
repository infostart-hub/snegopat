//engine: JScript
//uname: codegen_create_type
//dname: Генератор Описания типов... 
//author: Александр Орефков orefkov@gmail.com, Сосна Евгений <shenja@sosna.zp.ua>
//help: inplace
//www: https://www.youtube.com/watch?v=ybQkiLsfCCw
//addin: codegen_manager
//addin: stdlib
//addin: vbs

/*@
Скрипт - генератор типизирующих комментариев, для "обмана" подсказки 1С.
Типизирующие комментарии действуют при включенноё настройке Снегопата
"Убирать символы //: при разборе модуля штатной подсказкой".
Видео-демонстрация на https://www.youtube.com/watch?v=ybQkiLsfCCw

Для работы совместно со скриптом - менеджером генераторов кода.
Менеджер генераторов кода должен быть подключен раньше этого скрипта.
@*/

codegen_manager.registerCodeGen("Типизирующий коммент/Справочник", genarateNewRefs);
codegen_manager.registerCodeGen("Типизирующий коммент/Документ", genarateNewDoc);
codegen_manager.registerCodeGen("Типизирующий коммент/ПроизвольныйТип", genarateNewType);

function getWordUnderCursor(){
    extSearch = stdlib.require(env.pathes.addins + 'extSearch.js').GetExtSearch();
    selText = ''
    w = extSearch.watcher.getActiveTextWindow();
    if (!w) return ''
    var selText = w.GetSelectedText();
    if (selText == '')
        selText = w.GetWordUnderCursor();

    return selText
    
}

function genarateNewRefs(param)
{
    // Для начала выберем вид справочника
    var docKind = snegopat.parseTemplateString('<?"Выберите вид справочника", Справочник>')
    if(!docKind.length)
        return false
    selText = getWordUnderCursor();
    if (!selText.length){
        selText ="спр" + docKind 
    }
    vbs.result = selText
    var varName = vbs.DoExecute('InputString result, "Укажите название переменной"')
    //param.text = "#Если _ Тогда\n" + varName + ' = Справочники.' + docKind + '.СоздатьЭлемент();\n#КонецЕсли'
	param.text = "//: " + varName + ' = Справочники.' + docKind + '.СоздатьЭлемент();'
    return true
}

function genarateNewDoc(param)
{
    // Для начала выберем вид документа
    var docKind = snegopat.parseTemplateString('<?"Выберите вид документа", Документ>')
    if(!docKind.length)
        return false
    selText = getWordUnderCursor();
    if (!selText.length){
        selText ="док" + docKind 
    }
    vbs.result = selText
    var varName = vbs.DoExecute('InputString result, "Укажите название переменной"')
    param.text = "//: " + varName + ' = Документы.' + docKind + '.СоздатьДокумент();'
    return true
}

function genarateNewType(param)
{
    // Для начала выберем вид тип
    var docKind = snegopat.parseTemplateString('<?"Выберите тип ", КонструкторОписанияТипов>')
    if(!docKind.length)
        return false
    selText = getWordUnderCursor();
    if (!selText.length){
        selText ="Элемент"
    }
    vbs.result = selText
    var varName = vbs.DoExecute('InputString result, "Укажите название переменной"')

    var re = new RegExp('(Новый\\s)ОписаниеТипов\\("([^"]{1,})"\\)', 'i');
    var matches = re.exec(docKind);
    if (matches && matches.length) 
    {
        param.text = "//: " + varName + ' = ' + matches[1] + ''+matches[2]+';'
        return true
    }
    return false;
}
