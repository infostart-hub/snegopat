//engine: JScript
//uname: immediate
//dname: Немедленное выполнение кода
//descr: Скрипт-консоль для выполнения кода на JScript
//author: orefkov
//help: inplace
//addin: stdlib

/*@
(c) Александр Орефков

Утилита для разработчиков скриптов. Позволяет сразу выполнить JScript код, введенный
в окне утилиты. Код берется начиная от маркера ">>> Начало кода <<<" и до конца текста.
Если маркер не найден, выполняется весь код.
Результат выполнения кода выводится тоже в это окно.
@*/

var codeMarker		= ">>> Начало кода <<<"
var oldCodeMarker	= "-------------------"
var needMoveCaret = {br:2, bc:1, er:2, ec:1}

var TD = null; // Активный текстовый документ.

// Подключим глобальные контексты
addins.byUniqueName("global").object.connectGlobals(SelfScript)

// Загрузка формы и подключение ее событий непосредственно к самому скрипту
var form = loadScriptFormEpf(SelfScript.fullPath.replace(/js$/i, "epf"), "Форма", SelfScript.self)
form.КлючСохраненияПоложенияОкна = "immediate.js"
form.ЭлементыФормы.Код.ДобавитьСтроку(codeMarker + "\n")

// Пользовательские макросы для открытия/закрытия окна, можно повесить на хоткеи
function macrosОткрытьОкно()	{	
    try {
        TD = stdlib.require('TextWindow.js').GetTextWindow();    
    }
    catch (e) {}
    form.Открыть()	
}

function macrosЗакрытьОкно()	{	form.Закрыть()	}
function macrosПереключитьОкно()
{
    if(form.Открыта())
        form.Закрыть()
    else
    {
        try {
            TD = stdlib.require('TextWindow.js').GetTextWindow();    
        }
        catch (e) {}
        form.Открыть()
    }
}

function macrosЗапуститьОтладчикСкриптов()
{
    runDebugger();
}

/* Возвращает название макроса по умолчанию - вызывается, когда пользователь 
дважды щелкает мышью по названию скрипта в окне Снегопата. */
function getDefaultMacros() {
    return 'ОткрытьОкно';
}


/*
 *    Обработчики событий формы
 */
function ОбновлениеОтображения()
{
    // Если надо восстановить положение курсора, сделаем это
    if(needMoveCaret)
    {
        form.ЭлементыФормы.Код.УстановитьГраницыВыделения(needMoveCaret.br, needMoveCaret.bc, needMoveCaret.er, needMoveCaret.ec)
        needMoveCaret = null
    }
}

function ПриЗакрытии()
{
    // Сохраним положение курсора. Так как ПолучитьГраницыВыделения возвращает результат через
    // параметры, придется задействовать VBScript
    needMoveCaret = {br:0, bc:0, er:0, ec:0}
    var vbs = addins.byUniqueName("vbs").object
    vbs.result = needMoveCaret
    vbs.var1 = form.ЭлементыФормы.Код
    vbs.DoExecute("br=0:bc=0:er=0:ec=0:var1.GetTextSelectionBounds br, bc, er, ec:result.br=br:result.bc=bc:result.er=er:result.ec=ec")
}

function runDebugger() 
{
    eval('debugger');
}

function runCode(inDebugger) 
{
    var codeText
    // Получим код для выполнения и заменим маркер начала кода на маркер старого кода
    var text = form.ЭлементыФормы.Код.ПолучитьТекст()
    var pos = text.indexOf(codeMarker)
    if(pos >= 0)
    {
        codeText = text.substr(pos + codeMarker.length)
        text = text.replace(codeMarker, oldCodeMarker)
    }
    else
    {
        codeText = text
        text = oldCodeMarker + "\n" + text
    }
    
    if (inDebugger)
        codeText = "debugger;\n" + codeText;
    
    // Добавим к тексту результат и маркер кода
    text += "\nРезультат: " + eval(codeText) + "\n" + codeMarker + "\n"
    form.ЭлементыФормы.Код.УстановитьТекст(text)
    // Поставим курсор в конце текста
    var linesCount = form.ЭлементыФормы.Код.КоличествоСтрок()
    form.ЭлементыФормы.Код.УстановитьГраницыВыделения(linesCount + 1, 1, linesCount + 1, 1)
    // Вернем фокус в окно
    form.ТекущийЭлемент = form.ЭлементыФормы.Код
}

// Собственно, само выполнение кода
function КоманднаяПанельВыполнить(Кнопка)
{
    runCode(false);
}

function КоманднаяПанельОткрытьВОтладчике (Кнопка) {
    runCode(true);
}


function КоманднаяПанельОткрытьОтладчик (Кнопка) {
    runDebugger();
}


