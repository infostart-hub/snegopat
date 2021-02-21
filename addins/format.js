//engine: JScript
//uname: format_script
//dname: Форматирование модуля
//author: orefkov
//descr: Несколько полезных при редактировании модулей макросов
//help: inplace
//www: https://snegopat.ru/video/format
//addin: stdlib
//addin: global

global.connectGlobals(SelfScript);

/*@
В данном скрипте собрано несколько полезных макросов, помогающих форматировать код при наборе.
@*/

// проверяет наличие различных сочитаний со знаком равно в строке. >= <= != итд
function isEqCombination(inputLine) {
    var line = { text: inputLine }
    var eqPos = line.text.indexOf("=")
    if (eqPos >= 0) {
        if (line.text.charAt(eqPos - 1) == ">" || line.text.charAt(eqPos - 1) == "<" ||
			line.text.charAt(eqPos - 1) == "=" || line.text.charAt(eqPos - 1) == "!" ||
			line.text.charAt(eqPos - 1) == "+" || line.text.charAt(eqPos - 1) == "-")
            return true
        else
            return false
    }
    else
        return false
}

function fillLine(symbol, count) {
    if (count < 0)
        return ""
    var text = ""
    while (count--)
        text += symbol
    return text
}

// минимально-необходимое размещение знака РАВНО
function getEqAdequatePosition(inputLine) {
    var tabSize = profileRoot.getValue("ModuleTextEditor/TabSize");
    var line = { text: inputLine };
    var userfulIndex = firstUsefulOnTheLeft(inputLine);
    var position = 0;
    for (var k = 0; k <= userfulIndex; k++) {
        if (line.text.charAt(k) == "\t")
            position = position + tabSize;
        else
            position = position + 1;
    }
    return position;
}

// Найти в левой части присвоения индекс первого символа, который не является пробелом или табом.
// индексы в строках идут с 0.
function firstUsefulOnTheLeft(inputLine) {
    var line = { text: inputLine };
    var eqRealPos = line.text.indexOf("=");

    if (isEqCombination(line.text))
        var searchPos = eqRealPos - 2;
    else
        searchPos = eqRealPos - 1;

    for (var k = searchPos; k >= 0; k--) {
        if (line.text.charAt(k) != "\t" && line.text.charAt(k) != " ")
            return k;
    }
    return -1;
}

// какой символ РАВНО используется в строке. <=, != итд
function eqSymbolInLine(inputLine) {
    var combination = "=";
    var line = { text: inputLine };
    var eqPos = line.text.indexOf("=");
    if (isEqCombination(line.text))
        combination = line.text.charAt(eqPos - 1) + "=";
    return combination;
}

/*@
## Макрос ВыровнятьЗнакиРавно
Предназначен для выравнивания знаков `=`. Выстраивает знаки `=` в выделенном тексте в одну колонку.
Просто выделите строки с несколькими присваиваниями, и вызовите макрос.

Тест до:

    ОтражатьВ_НУ = СтруктураПараметров.ОтражатьВНалоговомУчете;
    ПрименениеПБУ18 = СтруктураПараметров.ПрименениеПБУ18;
    ОтражатьВ_УСН = СтруктураПараметров.ОтражатьВНалоговомУчетеУСН;
    ОтражатьВ_УСНДоходы = СтруктураПараметров.ОтражатьВНалоговомУчетеУСНДоходы;
    ГраницаОстатков = СтруктураПараметров.ГраницаОстатков;

Текст после:

    ОтражатьВ_НУ        = СтруктураПараметров.ОтражатьВНалоговомУчете;
    ПрименениеПБУ18     = СтруктураПараметров.ПрименениеПБУ18;
    ОтражатьВ_УСН       = СтруктураПараметров.ОтражатьВНалоговомУчетеУСН;
    ОтражатьВ_УСНДоходы = СтруктураПараметров.ОтражатьВНалоговомУчетеУСНДоходы;
    ГраницаОстатков     = СтруктураПараметров.ГраницаОстатков;

По-умолчанию, макрос назначается на `Ctrl + =`
@*/
stdlib.createMacros(SelfScript.self, "ВыровнятьЗнакиРавно",
    "Выравнивает знаки = в выделенном тексте в одну колонку", PictureLib.DataCompositionDataParameters, 
    function() {
        var txtWnd = snegopat.activeTextWindow()
        if (!txtWnd)
            return
        var sel = txtWnd.getSelection()
        var endRow = sel.endRow
        if (sel.endCol == 1)
            endRow--
        if (endRow <= sel.beginRow)
            return
        var tabSize = profileRoot.getValue("ModuleTextEditor/TabSize");
        var replaceTabOnInput = profileRoot.getValue("ModuleTextEditor/ReplaceTabOnInput");
        var lines = new Array() // массив информации о строках
        var maxEqualPos = -1 // максимальная позиция знака Равно
    
        // цикл по строчкам в поисках максимальной позиции знака Равно
        for (var l = sel.beginRow; l <= endRow; l++) {
            var line = { text: txtWnd.line(l) }
            line.eqRealPos = line.text.indexOf("=") // где в выделенной строчке знак равно?
            line.eqUsefulIndex = firstUsefulOnTheLeft(line.text)
            line.eqAdequatePosInSpaces = getEqAdequatePosition(line.text)
    
            if (line.eqRealPos >= 0) {
                line.shouldRender = 1
                line.eqSymbolInLine = eqSymbolInLine(line.text)
                if (line.eqAdequatePosInSpaces > maxEqualPos)
                    maxEqualPos = line.eqAdequatePosInSpaces
            }
            else
                line.shouldRender = 0
    
            lines.push(line)
        }
    
        var text = "" 				   // результирующий текст, который будет вставлен вместо выделенного	
        maxEqualPos = maxEqualPos + 1; // увеличить на 1, чтобы гарантировать один символ таба или пробела до знака РАВНО
        if (!replaceTabOnInput) {
            maxEqualPos = Math.ceil(maxEqualPos / tabSize) * tabSize;
        }
    
        // цикл по выделенным строкам
        // пересобрать строку пересчитав символы до знака РАВНО
        for (var l in lines) {
            var line = lines[l]
            var symbol = replaceTabOnInput ? ' ' : '\t' 	// что вставлять. Либо пробелы либо табы					
            var symbolsNum = (maxEqualPos - line.eqAdequatePosInSpaces) // количество символов(таб или пробел), которые именно для этой строки нужно добавить до дальнего знака равно.
    
            if (!replaceTabOnInput)
                symbolsNum = Math.ceil(symbolsNum / tabSize)
    
    
            if (line.shouldRender) {
                copyAmmount = line.eqUsefulIndex + 1
                strBeforeEq = line.text.substr(0, copyAmmount)
                strAfterEq = line.text.substr(line.eqRealPos + 1)
                additionalSymbols = fillLine(symbol, symbolsNum)
                newLine = strBeforeEq + additionalSymbols + line.eqSymbolInLine + strAfterEq + "\n"
            }
            else
                newLine = line.text + "\n"
    
            text += newLine
        }
    
        txtWnd.setSelection(sel.beginRow, 1, endRow + 1, 1)
        txtWnd.selectedText = text
        txtWnd.setCaretPos(sel.beginRow + lines.length - 1, newLine.length);
    
    },
    "Ctrl+=");

/*
 * Макрос для сдвига текста за символом | (для форматирования запросов)
 * Сдвигает текст вправо/влево вставляя/удаляя при этом заданный символ
 */
function MoveBlock(toLeft, spaceChar) {
    var txtWnd = snegopat.activeTextWindow()
    if (!txtWnd || txtWnd.readOnly)
        return
    var sel = txtWnd.getSelection()
    var endRow = sel.endRow
    //   if(sel.endCol == 1)
    endRow--
    if (endRow < sel.beginRow)
        return
    var text = ""
    for (var l = sel.beginRow; l <= endRow; l++) {
        var str = txtWnd.line(l)
        var vlRealPos = str.indexOf("|")
        if (vlRealPos >= 0) {
            if (toLeft) //to left
                str = str.replace("|" + spaceChar, "|")
            else //to right
                str = str.replace("|", "|" + spaceChar)
        }
        text += str + "\n"
    }
    txtWnd.setSelection(sel.beginRow, 1, endRow + 1, 1)
    txtWnd.selectedText = text
    txtWnd.setSelection(sel.beginRow, 1, endRow + 1, 1)
}

function AlignByComma(byFirst) {
	
	var txtWnd = snegopat.activeTextWindow()
	if (!txtWnd)
		return
	var sel = txtWnd.getSelection()
	var endRow = sel.endRow
	if (sel.endCol == 1)
		endRow--
	if (endRow <= sel.beginRow)
		return
	var tabSize = profileRoot.getValue("ModuleTextEditor/TabSize")
	var replaceTabOnInput = profileRoot.getValue("ModuleTextEditor/ReplaceTabOnInput");
	var lines = new Array()
	var maxEqualPos = -1
	for (var l = sel.beginRow; l <= endRow; l++) {
		var line = { text: txtWnd.line(l) }
		if (byFirst)
			line.eqRealPos = line.text.indexOf(",")
		else
			line.eqRealPos = line.text.lastIndexOf(",");
		if (line.eqRealPos >= 0) {
			line.eqPosInSpaces = 0
			for (var k = 0; k < line.eqRealPos; k++) {
				if (line.text.charAt(k) == "\t")
					line.eqPosInSpaces += tabSize - (line.eqPosInSpaces % tabSize)
				else
					line.eqPosInSpaces++
			}
			if (line.eqPosInSpaces > maxEqualPos)
				maxEqualPos = line.eqPosInSpaces
		}
		lines.push(line)
	}
	var text = ""
	if (!replaceTabOnInput) {
		maxEqualPos = Math.ceil(maxEqualPos / tabSize) * tabSize;
	}
	for (var l in lines) {

		var line = lines[l]

		var symbol = replaceTabOnInput ? ' ' : '\t';
		var count = (maxEqualPos - line.eqPosInSpaces);
		if (!replaceTabOnInput) {
			count = Math.ceil(count / tabSize);
		}

		//count = (count==0) ? 1 : count;

		var t1 = line.text.substr(0, line.eqRealPos + 1)
		var t2 = line.text.substr(line.eqRealPos + 1).replace(/^\s+/, "")
		var newLine = t1 + fillLine(" ", maxEqualPos - line.eqPosInSpaces + 1) + t2 + "\n"
		text += newLine;

	}
	txtWnd.setSelection(sel.beginRow, 1, endRow + 1, 1)
	txtWnd.selectedText = text
	txtWnd.setCaretPos(sel.beginRow + lines.length - 1, newLine.length);
}

/*@
## Макрос СдвинутьБлокВлевоНаПробел
Макрос позволяет сдвинуть текст в многострочных литералах "за палкой" влево на один пробел.
По-умолчанию назначается на `Ctrl+;`.

Текст до:

    |    выбрать
    |    из

Текст после:

    |   выбрать
    |   из

[Видео](https://snegopat.ru/video/move_blocks)
@*/
stdlib.createMacros(SelfScript.self, "СдвинутьБлокВлевоНаПробел",
    "Сдвигает блок текста в многострочных литералах влево на пробел", PictureLib.MoveLeft, 
    function() //hotkey: ctrl+;
    {
        MoveBlock(true, " ")
    },
    "Ctrl+;");

/*@
## Макрос СдвинутьБлокВправоНаПробел
Макрос позволяет сдвинуть текст в многострочных литералах "за палкой" вправо на один пробел.
По-умолчанию назначается на `Ctrl+'`.

Текст до:

    |   выбрать
    |   из

Текст после:

    |    выбрать
    |    из

[Видео](https://snegopat.ru/video/move_blocks)
@*/
stdlib.createMacros(SelfScript.self, "СдвинутьБлокВправоНаПробел",
    "Сдвигает блок текста в многострочных литералах вправо на пробел", PictureLib.MoveRight, 
    function() //hotkey: ctrl+'
    {
        MoveBlock(false, " ")
    }, "Ctrl+'");

/*@
## Макрос СдвинутьБлокВлевоНаТаб
Макрос позволяет сдвинуть текст в многострочных литералах "за палкой" влево на один Tab.
По-умолчанию назначается на `Ctrl+Shift+;`.

Текст до:

    |    выбрать
    |    из

Текст после:

    |выбрать
    |из

[Видео](https://snegopat.ru/video/move_blocks)
@*/
stdlib.createMacros(SelfScript.self, "СдвинутьБлокВлевоНаТаб",
    "Сдвигает блок текста в многострочных литералах влево на Tab", PictureLib.MoveLeft, 
    function() //hotkey: ctrl+shift+;
    {
        MoveBlock(true, "\t")
    }, "Ctrl+Shift+;");
    
/*@
## Макрос СдвинутьБлокВправоНаТаб
Макрос позволяет сдвинуть текст в многострочных литералах "за палкой" вправо на один Tab.
По-умолчанию назначается на `Ctrl+Shift+'`.

Текст до:

    |выбрать
    |из

Текст после:

    |    выбрать
    |    из

[Видео](https://snegopat.ru/video/move_blocks)
@*/
stdlib.createMacros(SelfScript.self, "СдвинутьБлокВправоНаТаб",
    "Сдвигает блок текста в многострочных литералах вправо на Tab", PictureLib.MoveRight, 
    function() //hotkey: ctrl+shift+'
    {
        MoveBlock(false, "\t")
    }, "Ctrl+Shift+'");

/*@
## Макрос УдалитьКонцевыеПробелы
Макрос удаляет white-space символы в конце строк, а также заменяет все переводы строк CR LF на LF.
@*/
stdlib.createMacros(SelfScript.self, "УдалитьКонцевыеПробелы",
    "Убрать пробелы в конце строк", PictureLib.Char, 
    function() {
        var txtWnd = snegopat.activeTextWindow()
        if (!txtWnd || txtWnd.readOnly)
            return
        var replaces = 0, symbols = 0, crnl = 0
        var text = txtWnd.text.replace(/[ \t]+\r*\n/g, function (str) {
            replaces++
            symbols += str.length - 1
            if (str.length > 2 && str.charAt(str.length - 2) == '\r')
                crnl++, symbols--
            return '\n'
        }
        )
        if (replaces) {
            Message("Исправлено cтрок: " + replaces + "\nУбрано символов: " + symbols + "\nУбрано CR: " + crnl)
            var caretPos = txtWnd.getCaretPos()
            txtWnd.setSelection(1, 1, txtWnd.linesCount + 1, 1)
            txtWnd.selectedText = text;
            txtWnd.setCaretPos(caretPos.beginRow, caretPos.beginCol)
        }
        else
            Message("Все чисто")
    });

/*@
## Макрос ВыровнятьПоПервойЗапятой
Макрос для выравнивания текста по первой запятой. Выстраивает текст в выделенных строках после знака `,` в одну колонку.
[Видео](https://snegopat.ru/video/align_by_colon)

@*/
stdlib.createMacros(SelfScript.self, "ВыровнятьПоПервойЗапятой",
    "Выровнять текст в выделенных строках по первой запятой", PictureLib.Char, 
    function () {
        AlignByComma(true);
    });
	
/*@
## Макрос ВыровнятьПоПоследнейЗапятой
Макрос для выравнивания текста по последней запятой. Выстраивает текст в выделенных строках после знака `,` в одну колонку.
[Видео](https://snegopat.ru/video/align_by_colon)

@*/
stdlib.createMacros(SelfScript.self, "ВыровнятьПоПоследнейЗапятой",
    "Выровнять текст в выделенных строках по последней запятой", PictureLib.Char, 
    function () {
		AlignByComma(false);
    });

/*@
## Макрос ВыровнятьКомментарии
Макрос для выравнивания комментариев. Выстраивает текст комментариев в выделенных строках в одну колонку.
[Видео](https://snegopat.ru/video/align_by_colon)
@*/
stdlib.createMacros(SelfScript.self, "ВыровнятьКомментарии",
    "Выровнять текст комментариев в выделенных строках в одну колонку", PictureLib.Char, 
    function () {
        var txtWnd = snegopat.activeTextWindow()
        if (!txtWnd)
            return
        var sel = txtWnd.getSelection()
        var endRow = sel.endRow
        if (sel.endCol == 1)
            endRow--
        if (endRow <= sel.beginRow)
            return
        var tabSize = profileRoot.getValue("ModuleTextEditor/TabSize")
        var replaceTabOnInput = profileRoot.getValue("ModuleTextEditor/ReplaceTabOnInput");
        var lines = new Array()
        var maxEqualPos = -1
        for (var l = sel.beginRow; l <= endRow; l++) {
            var line = { text: txtWnd.line(l) }
            line.eqRealPos = line.text.indexOf("//")
            if (line.eqRealPos >= 0) {
                line.eqPosInSpaces = 0
                for (var k = 0; k < line.eqRealPos; k++) {
                    if (line.text.charAt(k) == "\t")
                        line.eqPosInSpaces += tabSize - (line.eqPosInSpaces % tabSize)
                    else
                        line.eqPosInSpaces++
                }
                if (line.eqPosInSpaces > maxEqualPos)
                    maxEqualPos = line.eqPosInSpaces
            }
            lines.push(line)
        }
        var text = ""
        if (!replaceTabOnInput) {
            maxEqualPos = Math.ceil(maxEqualPos / tabSize) * tabSize;
        }
        for (var l in lines) {
    
            var line = lines[l]
    
            var symbol = replaceTabOnInput ? ' ' : '\t';
            var count = (maxEqualPos - line.eqPosInSpaces);
            if (!replaceTabOnInput) {
                count = Math.ceil(count / tabSize);
            }
    
            //count = (count==0) ? 1 : count;
    
            var t1 = line.text.substr(0, line.eqRealPos)
            var t2 = line.text.substr(line.eqRealPos).replace(/^\s+/, "")
            var newLine = t1 + fillLine(" ", maxEqualPos - line.eqPosInSpaces) + t2 + "\n"
            text += newLine;
    
        }
        txtWnd.setSelection(sel.beginRow, 1, endRow + 1, 1)
        txtWnd.selectedText = text
        txtWnd.setCaretPos(sel.beginRow + lines.length - 1, newLine.length);
    });


function getPredefinedHotkeys(predef) {
    predef.setVersion(0);
    stdlib.getAllPredefHotKeys(SelfScript.self, predef);
}
