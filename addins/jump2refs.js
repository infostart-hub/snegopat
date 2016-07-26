//engine: JScript
//uname: jump2refs
//dname: Переход к ссылкам метаданных
//addin: stdlib
//addin: stdcommands

stdlib.require("SelectValueDialog.js", SelfScript);

var refs, lastObjects = [];

SelfScript.self['macrosПерейти к ссылке ИЗ'] = function ()
{
	return doJump(stdcommands.Frntend.FindRefsFrom, false);
}

SelfScript.self['macrosПерейти к ссылке НА'] = function ()
{
    return doJump(stdcommands.Frntend.MDSearchRefs, false);
}

SelfScript.self['macrosПросмотр ссылок ИЗ'] = function ()
{
    return doJump(stdcommands.Frntend.FindRefsFrom, true);
}

SelfScript.self['macrosПросмотр ссылок НА'] = function ()
{
    return doJump(stdcommands.Frntend.MDSearchRefs, true);
}

SelfScript.self['macrosПерейти обратно'] = function ()
{
    if(!lastObjects.length)
        return false
    lastObjects.pop().activateInTree()
    return true
}

// Перехват вывода в окно сообщений
function onMessage(params)
{
    refs.push(params.text)  // Запомним, что выводилось
    params.cancel = true    // Не будем реально выводить
}
// Перехват появления модального диалога
function onDoModal(dlgInfo)
{
    dlgInfo.cancel = true   // Просто сразу скажем, что в нем нажали OK
    dlgInfo.result = mbaOK
}

// Функция ищет объект метаданных в контейнере по его имени
function findObject(root, name)
{
    //Message(name)
    var names = name.split(".")     // Разобъем имя на части
    for(var idx = 0; idx < names.length - 1; idx += 2)
    {
        var mdc = root.mdclass
        for(var i = 0, c = mdc.childsClassesCount; i < c; i++)
        {
            var cc = mdc.childClassAt(i)
            if(cc.name(1, false) == names[idx]){
                root = root.childObject(i, names[idx + 1])
                break
            }
        }
    }
    return root
}

function doJump(command, forceShow)
{
    if(windows.modalMode != msNone)
        return false
    // Для начала проверим, что мы в окне метаданных
	var view = windows.getFocusedView()//windows.getActiveView()
    if(!view)
        return false
	var state = command.getState();
	if(!state || !state.enabled)
        return false
	refs = []
    // Ставим перехват на вывод в окно сообщений
	events.connect(windows, "onMessage", SelfScript.self)
    // Подавляем показ диалога
    events.connect(windows, "onDoModal", SelfScript.self)
    // Посылаем команду поиска ссылок
	command.send()
    // Убираем перехваты
    events.disconnect(windows, "onMessage", SelfScript.self)
    events.disconnect(windows, "onDoModal", SelfScript.self)
 
    if(refs.length < 2)
        return false
    
    var rootObject = view.mdObj.container.rootObject
    var currentObject = findObject(rootObject, refs[0].match(/"(.+)"/)[1])
    
    var choice
    if(refs.length == 2 && !forceShow)
        choice = refs[1]
    else
    {
        refs.splice(0, 1)
        var dlg = new SelectValueDialog("Выберите объект для перехода!", refs);
        if (dlg.selectValue())
            choice = dlg.selectedValue;
        else
            return false
    }
    var mdObj = findObject(rootObject, choice)
    mdObj.activateInTree()
    lastObjects.push(currentObject)
    return true
}

//{ Горячие клавиши по умолчанию.
function getPredefinedHotkeys(predef) {
    predef.setVersion(1);
    predef.add('Перейти к ссылке ИЗ', "Ctrl + Enter");
    predef.add('Перейти обратно', "Ctrl + Shift + Enter");
}
//} Горячие клавиши по умолчанию.
