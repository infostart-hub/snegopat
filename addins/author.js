//engine: JScript
//uname: author
//dname: Авторский комментарий
//author: Александр Кунташов <kuntashov@gmail.com>, http://compaud.ru/blog
//descr: Быстрая вставка аворских комментариев об изменениях кода
//help: inplace
//www: https://snegopat.ru/forum/viewtopic.php?t=111
//addin: global
//addin: stdlib

stdlib.require("TextWindow.js", SelfScript);
global.connectGlobals(SelfScript);

/*@
Cкрипт "Авторский комментарий" (author.js) для проекта "Снегопат"

Описание: Реализует возможности разметки кода по признакам модифицированности с указанием реквизитов автора.
@*/

////////////////////////////////////////////////////////////////////////////////////////
////{ Макросы
////

SelfScript.self['macrosМаркер "Добавлено"'] = function() {
    addMarker(MarkerTypes.ADDED);
}

SelfScript.self['macrosМаркер "Изменено"'] = function() {
    addMarker(MarkerTypes.CHANGED);
}

SelfScript.self['macrosМаркер "Удалено"'] = function() {
    addMarker(MarkerTypes.REMOVED);
}

SelfScript.self['macrosНастройка'] = function() {
    // form - неявно определяемая глобальная переменная.
    form = loadScriptForm(SelfScript.fullPath.replace(/js$/, 'ssf'), SelfScript.self);
    form.DoModal();
    form = null;
}

/* Возвращает название макроса по умолчанию - вызывается, когда пользователь 
дважды щелкает мышью по названию скрипта в окне Снегопата. */
function getDefaultMacros() {
    return 'Настройка';
}

////} Макросы

var MarkerTypes = {
    ADDED: "МаркерДобавлено",
    REMOVED: "МаркерУдалено",
    CHANGED:"МаркерИзменено"
};

var MarkerFormatStringParameters = {};
var pflAuthorJs = 'Авторский комментарий/Настройки';

function addMarker(markerType) {

    var w = GetTextWindow();
    if (!w) return;
            
    var sel = w.GetSelection();
    if (sel.beginRow == sel.endRow)
    {    
        // Однострочник.        
        var line = w.GetLine(sel.beginRow);
        var code = markLine(markerType, line);        
        w.ReplaceLine(sel.beginRow, code);
    }
    else 
    {
        // Блок кода.
        var endRow = sel.endCol > 1 ? sel.endRow : sel.endRow - 1;
        var block = w.Range(sel.beginRow, 1, endRow).GetText();        
        var code = markBlock(markerType, block);        
        w.Range(sel.beginRow, 1, endRow).SetText(code);
    }    
}

function getSignature() {
    var fmt = Settings['ФорматПодписи'];
    var ptn = /%(.+?)(?:#(.+)){0,1}%/ig;
    return fmt.replace(ptn, function (match, p1, p2, offset, s) {
        // p1 - имя управляющей конструкции.
        // p2 - параметр управляющей конструкции (для ДатаВремя).
        return MarkerFormatStringParameters[p1].call(null, p2);
    });
}

function getStartComment(markerType) {
    return "//" + Settings[markerType] + " " + getSignature();
}

function getEndComment() {

    var endComment = "//" + Settings["ЗакрывающийМаркерБлока"];
    
    if (!Settings["НеДобавлятьСигнатуруПослеЗакрывающегоМаркера"])
        endComment += " " + getSignature();

    return endComment;
}

function markLine(markerType, line) {

    // Удалим концевые пробелы в строке.
    var code = line.replace(/(.+?)\s*$/, "$1");
    
    switch (markerType) 
    {
    case MarkerTypes.ADDED:
        // Добавляем в хвост подпись.
        code = code + getStartComment(markerType);
        break;
        
    case MarkerTypes.REMOVED:
        // Закомментируем строку и в хвост добавим подпись.
        code = commentLine(code) + getStartComment(markerType);
        break;
        
    case MarkerTypes.CHANGED:
        // Маркер "Изменено" для однострочника такой же как и для блока.
        var indent = StringUtils.getIndent(code);
        code = indent + getStartComment(markerType) + "\n";
        code += prepareChangedBlock(line, indent) + "\n";            
        code += indent + getEndComment() + "\n";            
        break;
    }
        
    return code;
}

function markBlock(markerType, block) {
    
    var indent = StringUtils.getIndent(block);
    var code = indent + getStartComment(markerType) + "\n";
    
    switch (markerType) 
    {
    case MarkerTypes.ADDED:
        code += block + "\n"    
        break;
        
    case MarkerTypes.REMOVED:
        code += commentBlock(block, indent) + "\n";
        break;
        
    case MarkerTypes.CHANGED:
        code += prepareChangedBlock(block, indent) + "\n"
        break;
    }
    
    //Комментарий окончания изменений.
    code += indent + getEndComment();
   
    return code;
}

function prepareChangedBlock(block, indent) {
    
    var code = '';    
    if (!Settings["НеОставлятьКопиюКодаПриЗамене"]) 
    {
        code += commentBlock(block, indent) + "\n";
        
        if (Settings["РазделительКодаПриЗамене"])
            code += indent + "//" + Settings["РазделительКодаПриЗамене"] + "\n";                
    }
    
    code += block;
    
    return code;
}

function commentLine(line, indent) {
    // Комментарий поставим после отступа.
    if (!indent) 
        indent = '\\s+';
    return line.replace(new RegExp('^(' + indent + ')(.*)'), "$1//$2");
}

function commentBlock(block, indent) {
    var lines = StringUtils.toLines(block);
    for(var i=0; i<lines.length; i++)
        lines[i] = commentLine(lines[i], indent);
    return StringUtils.fromLines(lines);
}

function getSettings() {

    var s = v8New("Структура");
    
    /* Настройки для подписи. Общий формат подписи:
       
       //<Маркер> <Подпись>
       ... содержимое блока ...
       //<ЗакрывающийМаркерБлока> <Подпись>
       
    Для однострочника не используется завершающая часть комментария, 
    т.к. однострочник добавляется в конец строки. */
    
    // Настройки по умолчанию.
    s.Вставить("ФорматПодписи", "%ИмяПользователяОС% %ДатаВремя#ДФ=dd.MM.yyyy%");
    s.Вставить("МаркерДобавлено", "Добавлено:");
    s.Вставить("МаркерУдалено", "Удалено:");
    s.Вставить("МаркерИзменено", "Изменено:");
    s.Вставить("ЗакрывающийМаркерБлока", "/");
    s.Вставить("РазделительКодаПриЗамене", "---- Заменено на: ----");    
    // Дополнительные настройки:
    s.Вставить("НеОставлятьКопиюКодаПриЗамене", false);
    s.Вставить("НеДобавлятьСигнатуруПослеЗакрывающегоМаркера", false);
    
    profileRoot.createValue(pflAuthorJs, s, pflSnegopat)    
    s = profileRoot.getValue(pflAuthorJs);
    
    return s;
}

function parseTpl() {
    var a = [];    
    for (var i=0; i<arguments.length;  i++)
        a.push(arguments[i]);        
    return snegopat.parseTemplateString('<?"", ' + a.join(',') + '>');
}

function addFormatStringParam(name, code) {
    var paramGetter = function (p) {
        return eval(code);
    }
    MarkerFormatStringParameters[name] = paramGetter;
}

function addToSignatureFormat(form, paramName) {
    if (!form.ФорматПодписи.match(/^\s+$/))
        form.ФорматПодписи += ' ';
    form.ФорматПодписи += '%' + paramName + '%';
}

//{ Обработчики элементов управления формы
function ПриОткрытии () {
    ЗаполнитьЗначенияСвойств(form, Settings);
}

function КнопкаОкНажатие (Элемент) {
    ЗаполнитьЗначенияСвойств(Settings, form);
    profileRoot.setValue(pflAuthorJs, Settings);
    form.Close();
}

function КнопкаОтменаНажатие (Элемент) {
    form.Close();
}

function НадписьИмяПользователяНажатие (Элемент) {
    addToSignatureFormat(form, Элемент.val.Заголовок);
}

function НадписьПолноеИмяПользователяНажатие (Элемент) {
    addToSignatureFormat(form, Элемент.val.Заголовок);
}

function НадписьИмяПользователяХранилищаКонфигурацииНажатие (Элемент) {
    addToSignatureFormat(form, Элемент.val.Заголовок);
}

function НадписьИмяПользователяОСНажатие (Элемент) {
    addToSignatureFormat(form, Элемент.val.Заголовок);
}

function НадписьДатаВремяНажатие (Элемент) {
    var КонструкторФорматнойСтроки = v8New("КонструкторФорматнойСтроки");
    КонструкторФорматнойСтроки.ДоступныеТипы = v8New("ОписаниеТипов", "Дата");
    if (КонструкторФорматнойСтроки.ОткрытьМодально())
        addToSignatureFormat(form, "ДатаВремя#" + КонструкторФорматнойСтроки.Текст);
}
//} Обработчики элементов управления формы

//{ Горячие клавиши по умолчанию.
function getPredefinedHotkeys(predef) {
    predef.setVersion(1);
    predef.add('Маркер "Добавлено"', "Alt + A");
    predef.add('Маркер "Изменено"', "Alt + C");
    predef.add('Маркер "Удалено"', "Alt + D");
}
//} Горячие клавиши по умолчанию.

//{ Параметры подстановки, используемые в форматной строке подписи.
addFormatStringParam("ИмяПользователя", "parseTpl(name)")
addFormatStringParam("ПолноеИмяПользователя", "parseTpl(name)")
addFormatStringParam("ИмяПользователяХранилищаКонфигурации", "parseTpl(name)")
addFormatStringParam("ДатаВремя", "parseTpl(name, '\"' + p + '\"')")
addFormatStringParam('ИмяПользователяОС', "(new ActiveXObject('WScript.Shell')).ExpandEnvironmentStrings('%USERNAME%')");
//} Параметры подстановки, используемые в форматной строке подписи.

var Settings = getSettings();


