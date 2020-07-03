//engine: JScript
//uname: codegen_create_refs
//dname: Генератор Справочников
//author: Александр Орефков orefkov@gmail.com, Сосна Евгений <shenja@sosna.zp.ua>
//help: inplace
//addin: codegen_manager
//addin: stdlib
//addin: vbs

/*@
Скрипт - генератор кода создания нового справочника.

Для работы совместно со скриптом - менеджером генераторов кода.
Менеджер генераторов кода должен быть подключен раньше этого скрипта.
@*/

var СтандартныеРеквизиты    = ["Код", "Наименование", "Родитель", "Владелец", "ПометкаУдаления", "Ссылка"]
codegen_manager.registerCodeGen("Справочники/Новый/Элемент с заполнением всех реквизитов", genarateNewRefsElement);
codegen_manager.registerCodeGen("Справочники/Новый/Группа с заполнением всех реквизитов", genarateNewRefsGroup);

function genarateNewRefsElement(param)
{
    // Для начала выберем вид справочника
    var docKind = snegopat.parseTemplateString('<?"Выберите вид справочника", Справочник>')
    if(!docKind.length)
        return false
    vbs.result = "спр" + docKind
    var varName = vbs.DoExecute('InputString result, "Укажите название переменной"')
    
    // Получим список возможных типов
    var tf = new codegen_manager.TypeFinder()
        
    var mdObj = param.mdCont.rootObject.childObject("Справочники", docKind)
    
    var defLangID = stdlib.getUuidFomMDRef(param.mdCont.rootObject.property("ОсновнойЯзык"))
    //var defLangMD = metadata.current.rootObject.childObject("Языки", defLangID)
    var defLangMD = param.mdCont.findByUUID(defLangID)
    var syn = mdObj.synonym(defLangMD.property("КодЯзыка"))
    if(!syn.length)
        syn = docKind
    
    var text = '//{ Создание справочника "' + syn + '" в ' + varName +'\n' + varName + ' = Справочники.' + docKind + '.СоздатьЭлемент();\n'
    // Обработаем стандартные реквизиты справочника. 
    text += processStandartAttribs(" Заполнение стандартных реквизитов", "", "", СтандартныеРеквизиты,varName, mdObj, tf);
 
    // Обработаем реквизиты справочника
    text += processAttribs(" Заполнение реквизитов", "", "", varName, mdObj, tf)
    // Обработаем табличные части
    var tabPartsCount = mdObj.childObjectsCount("ТабличныеЧасти")
    if(tabPartsCount)
    {
        var lineVarName = varName + "Строка",
            indent = profileRoot.getValue("ModuleTextEditor/ReplaceTabOnInput") ? codegen_manager.fillLine(" ", profileRoot.getValue("ModuleTextEditor/TabSize")) : "\t"
        if(tabPartsCount > 1)
            text += "//{  Заполнение табличных частей\n"
        for(var i = 0; i < tabPartsCount; i++)
        {
            var tp = mdObj.childObject("ТабличныеЧасти", i)
            var propVal = toV8Value(tp.property("Использование"));
            if (propVal.presentation() == "ДляГруппы"){
                continue;
            }
            text += processAttribs("  Заполнение табличной части " + tp.name,
                "Для Каждого Из Цикл\n" + indent + lineVarName + " = " + varName + "." + tp.name + ".Добавить();\n" , "КонецЦикла;\n",
                indent + lineVarName, tp, tf)
        }
        if(tabPartsCount > 1)
            text += "//}  Заполнение табличных частей\n"
    }
    text += varName + ".Записать();"
    text += "//} Создание справочника " + docKind + " в " + varName
    param.text = text
    return true
}

function genarateNewRefsGroup(param)
{
    // Для начала выберем вид справочника
    var docKind = snegopat.parseTemplateString('<?"Выберите вид справочника", Справочник>')
    if(!docKind.length)
        return false
    vbs.result = "спр" + docKind
    var varName = vbs.DoExecute('InputString result, "Укажите название переменной"')
    
    // Получим список возможных типов
    var tf = new codegen_manager.TypeFinder()
        
    var mdObj = param.mdCont.rootObject.childObject("Справочники", docKind)
    //Проверим поддерживает ли справочник иерархию. 
    var isHierarchical = toV8Value(mdObj.property("Иерархический"));
    if (isHierarchical.presentation() == "Ложь"){
        Message("Справочник "+docKind+" не иерархический ");
        return;
    }

    var defLangID = stdlib.getUuidFomMDRef(param.mdCont.rootObject.property("ОсновнойЯзык"))
    //var defLangMD = metadata.current.rootObject.childObject("Языки", defLangID)
    var defLangMD = param.mdCont.findByUUID(defLangID)
    var syn = mdObj.synonym(defLangMD.property("КодЯзыка"))
    if(!syn.length)
        syn = docKind
    
    var text = '//{ Создание справочника "' + syn + '" в ' + varName +'\n' + varName + ' = Справочники.' + docKind + '.СоздатьГруппу();\n'
    // Обработаем стандартные реквизиты справочника. 
    text += processStandartAttribs(" Заполнение стандартных реквизитов", "", "", СтандартныеРеквизиты,varName, mdObj, tf);
    // Обработаем реквизиты объекта
    text += processAttribsGroups(" Заполнение реквизитов", "", "", varName, mdObj, tf)
    // Обработаем табличные части
    var tabPartsCount = mdObj.childObjectsCount("ТабличныеЧасти")
    if(tabPartsCount)
    {
        var lineVarName = varName + "Строка",
            indent = profileRoot.getValue("ModuleTextEditor/ReplaceTabOnInput") ? codegen_manager.fillLine(" ", profileRoot.getValue("ModuleTextEditor/TabSize")) : "\t"
        if(tabPartsCount > 1)
            text += "//{  Заполнение табличных частей\n"
        for(var i = 0; i < tabPartsCount; i++)
        {
            var tp = mdObj.childObject("ТабличныеЧасти", i);
            var propVal = toV8Value(tp.property("Использование"));
            if (propVal.presentation() == "ДляЭлемента"){
                continue;
            }
            text += processAttribs("  Заполнение табличной части " + tp.name,
                "Для Каждого Из Цикл\n" + indent + lineVarName + " = " + varName + "." + tp.name + ".Добавить();\n" , "КонецЦикла;\n",
                indent + lineVarName, tp, tf)
        }
        if(tabPartsCount > 1)
            text += "//}  Заполнение табличных частей\n"
    }
    text += "//} Создание справочника " + docKind + " в " + varName
    param.text = text
    return true
}

function processStandartAttribs(comment, header, footer, attributes, line, obj, tf) {
    var lines = []
    for (var key in attributes) {
        var l = line + "." + attributes[key] + " = ; // " //+ tf.getTypeString(attr) 
        lines.push(l);
    }
    if(lines.length)
        return "//{ " + comment + "\n" + header + codegen_manager.formatAssign(lines) + footer + "//} " + comment + "\n"
    else
        return ""
}

function processAttribs(comment, header, footer, line, obj, tf)
{
    var lines = []
    for(var i = 0, cnt = obj.childObjectsCount("Реквизиты"); i < cnt; i++)
    {
        var attr = obj.childObject("Реквизиты", i)
        try {
            var propVal = toV8Value(attr.property("Использование"));
            if (propVal.presentation() == "ДляГруппы"){
                continue;
            }    
        } catch (e) {}
        
        var l = line + "." + attr.name + " = ; // " + tf.getTypeString(attr) 
        var c = attr.comment
        if(c.length)
            l += " / " + c
        lines.push(l)
    }
    if(lines.length)
        return "//{ " + comment + "\n" + header + codegen_manager.formatAssign(lines) + footer + "//} " + comment + "\n"
    else
        return ""
}


function processAttribsGroups(comment, header, footer, line, obj, tf)
{
    var lines = []
    for(var i = 0, cnt = obj.childObjectsCount("Реквизиты"); i < cnt; i++)
    {
        var attr = obj.childObject("Реквизиты", i);
        try {
            var propVal = toV8Value(attr.property("Использование"));
            if (propVal.presentation() == "ДляЭлемента"){
                continue;
            }    
        } catch (e) {}
        var l = line + "." + attr.name + " = ; // " + tf.getTypeString(attr)
        var c = attr.comment
        if(c.length)
            l += " / " + c
        lines.push(l)
    }
    if(lines.length)
        return "//{ " + comment + "\n" + header + codegen_manager.formatAssign(lines) + footer + "//} " + comment + "\n"
    else
        return ""
}

