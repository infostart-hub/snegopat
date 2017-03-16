//engine: JScript
//uname: codegen_create_doc
//dname: Генератор Документов
//author: Александр Орефков orefkov@gmail.com
//help: inplace
//addin: codegen_manager
//addin: stdlib

/*@
Скрипт - генератор кода создания нового документа.
Для работы совместно со скриптом - менеджером генераторов кода.
Менеджер генераторов кода должен быть подключен раньше этого скрипта.
@*/

codegen_manager.registerCodeGen("Документы/Новый/С заполнением всех реквизитов", genarateNewDoc)

function genarateNewDoc(param)
{
    // Для начала выберем вид документа
    var docKind = codegen_manager.selectMetaKind(param.mdCont, "Документы", "документа")
    if(!docKind.length)
        return false
    var mdObj = param.mdCont.rootObject.childObject("Документы", docKind)
    // Получим список возможных типов
    var tf = new codegen_manager.TypeFinder(param.mdCont)
    // Приготовим данные для диалога запроса параметров
    var data = {
        VarName: "док" + docKind,
        items:[
            {
                name: 'Стандартные реквизиты',
                comment: 'Заполнение стандартных реквизитов',
                header: '',
                footer: '',
                items:[
                    {name:'Номер', comment: 'Присвоение номера документа', text: "%%.Номер = ;"},
                    {name:'Дата', comment: 'Присвоение даты документа', text: "%%.Дата = ;"},
                    {name:'ПометкаУдаления', comment:'', text: "%%.ПометкаУдаления = ;"},
                    {name:'Ссылка', comment:'', text: "%%.Ссылка = ;"},
                    {name:'Проведен', comment:'', text: "%%.Проведен = ;"}
                ]
            }
        ]
    }
    processAttribs(data.items, 'Реквизиты документа', 'Заполнение реквизитов документа', '', '', '%%', mdObj, tf)
    var tabPartsCount = mdObj.childObjectsCount("ТабличныеЧасти")
    if(tabPartsCount)
    {
        var indent = profileRoot.getValue("ModuleTextEditor/ReplaceTabOnInput") ? codegen_manager.fillLine(" ", profileRoot.getValue("ModuleTextEditor/TabSize")) : "\t"
        for(var i = 0; i < tabPartsCount; i++)
        {
            var tp = mdObj.childObject("ТабличныеЧасти", i)
            processAttribs(data.items, 'Табличная часть ' + tp.name, "  Заполнение табличной части " + tp.name,
                "Для Каждого Из Цикл\n" + indent + "%%Строка = %%." + tp.name + ".Добавить();" , "КонецЦикла;",
                indent + "%%Строка", tp, tf)
        }
    }
    var res = new codegen_manager.AdditionalParams().getParams(data)
    if(!res)
        return false
    var lines = []
    if(res.comments)
    {
        var defLangID = stdlib.getUuidFomMDRef(param.mdCont.rootObject.property("ОсновнойЯзык"))
        var defLangMD = param.mdCont.findByUUID(defLangID)
        var syn = mdObj.synonym(defLangMD.property("КодЯзыка"))
        if(!syn.length)
            syn = docKind
        lines.push('//{ Создание документа "' + syn + '" в %%')
    }
    lines.push('%% = Документы.' + docKind + '.СоздатьДокумент();')
    for(var k in res.items)
        processItem(lines, res.items[k], res.comments)
    if(res.comments)
        lines.push('//} Конец создания документа "' + syn + '" в %%')
    param.text = lines.join('\n').replace(/%%/g, res.VarName) + '\n'
    return true
}

function processAttribs(dest, name, comment, header, footer, line, obj, tf)
{
    var item = {
        name: name,
        comment: comment,
        header: header,
        footer: footer,
        items:[]
    }
    function getComment(attr)
    {
        var l = tf.getTypeString(attr)
        var c = attr.comment
        if(c.length)
            l += " / " + c
        return l
    }
    for(var i = 0, cnt = obj.childObjectsCount("Реквизиты"); i < cnt; i++)
    {
        var attr = obj.childObject("Реквизиты", i)
        item.items.push({
            name: attr.name,
            text: line + "." + attr.name + " = ;",
            comment: getComment(attr)
        })
    }
    if(item.items.length)
        dest.push(item)
}

function processItem(lines, item, needComment)
{
    if(item.checked)
    {
        if(needComment)
            lines.push('//{ ' + item.comment);
        if(item.header.length)
            lines.push(item.header)
        var startLine = lines.length
        for(var k in item.items)
        {
            var e = item.items[k]
            if(e.checked)
                lines.push(e.text + (needComment ? ' // ' + e.comment : ''))
        }
        codegen_manager.formatAssignInplace(lines, startLine)
        if(item.footer.length)
            lines.push(item.footer)
        if(needComment)
            lines.push('//} ' + item.comment);
    }
}
