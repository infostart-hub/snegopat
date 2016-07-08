//engine: JScript
//uname: textEditorExt
//dname: Расширение редактора текстов
//descr: Несколько макросов, полезных при редактировании текстов 
//author: Василий Фролов aka Палыч, palytsh@mail.ru
//help: inplace
//addin: global
//addin: stdlib

/*@
AUTHOR: Василий Фролов aka Палыч, palytsh@mail.ru

DATE: 02.09.2011

COMMENT: 

   1. Макросы НайтиВыделенныйТекстВниз и НайтиВыделенныйТекстВверх. 
Горячие клавиши Ctrl + Down и Ctrl + Up.

   2. Макрос КлонироватьТекст. Позволяет скопировать выделенный фрагмент 
текста без использования буфера обмена. Горячие клавиши Ctrl + D.

   3. Макросы OnPressEnterInComment, OnPressBackspaceInComment, 
OnPressDeleteInComment предназначены для более удобного редактирования 
многострочных комментариев. Вызываются неявно при нажатии соответствующих 
клавиш.
@*/

global.connectGlobals(SelfScript);

stdlib.require('TextWindow.js', SelfScript);

function getPredefinedHotkeys(predef){
    predef.setVersion(9);
    predef.add("НайтиВыделенныйТекстВниз", "Ctrl + Down");
    predef.add("НайтиВыделенныйТекстВверх", "Ctrl + Up");
    predef.add("КлонироватьТекст", "Ctrl + D");
    //FIXME: пока удалю, не работает нормально при нахождении крусора в комментарии и выбора из списка процедур. 
    //predef.add("OnPressEnterInComment", "Enter"); 
    predef.add("OnPressDeleteInComment", "Del");
    predef.add("OnPressBackspaceInComment", "BkSpace");
    predef.add("OnPressBackspaceInBracket", "BkSpace");
    predef.add("OnPressDelInBracket", "Del");
    predef.add("Преобразовать регистр: ПРОПИСНЫЕ", "Ctrl + Shift + U");
    predef.add("Преобразовать регистр: строчные", "Ctrl + U");
    predef.add("Установить кавычки", "Shift + 2");
    predef.add("Установить кавычки 2", "Shift + '");
    predef.add("Установить скобки", "Shift + 9");
    predef.add("Установить скобки 2", "Shift + 0");


}

function macrosНайтиВыделенныйТекстВниз(){
    return selectNextPattern(1);
}

function macrosНайтиВыделенныйТекстВверх(){
    return selectNextPattern(-1);
}

function macrosПоменятьОперандыПрисваиванияМестами() {
    
    var w = GetTextWindow(); 
    if (!w || windows.modalMode != msNone) return false;
    
    var selText = w.GetSelectedText();
    if (selText == '') return false;
    
    var sel = w.GetSelection();
    
    var lines = StringUtils.toLines(selText);
    for(var lineNo = 0; lineNo < lines.length; lineNo++)
        lines[lineNo] = lines[lineNo].replace(/(\s*)(\S*.+?)\s*=\s*(\S*.+)\s*;/, "$1$3=$2;");
    
    w.SetSelectedText(StringUtils.fromLines(lines));
    // Восстановим исходное выделение.
    w.SetSelection(sel.beginRow, sel.beginCol, sel.endRow, sel.endCol);
    
    if (lines.length > 1)
    {
        // Если было выделено несколько строк, выровняем в них по знакам '='.
        var formatScript = addins.byUniqueName('format_script');
        if (formatScript)
        {
            formatScript.invokeMacros('ВыровнятьЗнакиРавно');
            // И снова восстановим исходное выделение.
            w.SetSelection(sel.beginRow, sel.beginCol, sel.endRow, sel.endCol);            
        }
    }
    return true;
}

SelfScript.Self['macrosПреобразовать регистр: ПРОПИСНЫЕ'] = function() {
    return processSelectedText(function(selText){ return selText.toUpperCase(); });
}

SelfScript.Self['macrosУстановить кавычки'] = function() {
    return processSelectedText(function(selText){ return '"'+selText+'"'; }, true);
}
var fix;
SelfScript.Self['macrosУстановить кавычки 2'] = function() {
    var w = GetTextWindow(); 
    fix = null;
    if (!w || windows.modalMode != msNone) return false;    
    
    var sel = w.GetSelection();            
    var selText = w.GetSelectedText();
    if (selText.length>0){
        fix = selText;
        events.connect(Designer, "onIdle", SelfScript.self);
    }
    return false;
    
    //return processSelectedText(function(selText){ return '"'+selText+'"'; }, true);
}

function onIdle()
{
    var w = GetTextWindow(); 
    if (!w || windows.modalMode != msNone || !fix){
        events.disconnect(Designer, "onIdle", SelfScript.self);
        return;    
    } 
    var pos = w.GetCaretPos();

    var beginRow = pos.beginRow;
    var wordBegPos = pos.beginCol - 2;

    var line = w.GetLine(pos.beginRow);
    if (wordBegPos > line.length){
    } else {
        str = line.charAt(wordBegPos);
        if (str=='"'){
            w.setSelection(pos.beginRow, pos.beginCol-1, pos.endRow, pos.endCol);
            w.SetSelectedText('"'+fix+'"');
        }   
    }
    // Отписываемся от события
    events.disconnect(Designer, "onIdle", SelfScript.self)
}


SelfScript.Self['macrosУстановить скобки'] = function() {
    return processSelectedText(function(selText){ return '('+selText+')'; }, true);
}
SelfScript.Self['macrosУстановить скобки 2'] = function() {
    return processSelectedText(function(selText){ return '('+selText+')'; }, true);
}

SelfScript.Self['macrosПреобразовать регистр: строчные'] = function() {
    return processSelectedText(function(selText){ return selText.toLowerCase(); });
}

SelfScript.Self['macrosВыделить текст в скобках'] = function() {

    var w = GetTextWindow(); 
    if (!w  || windows.modalMode != msNone) return false;    
        
    var sel = w.GetCaretPos();
    
    var startPos = { 'row' : sel.beginRow-1, 'col' : sel.beginCol-1 };
    
    var lines = w.GetLines();    
    var foundOpeningBrace = false;
    
    while (true)
    {
        var line = lines[startPos.row];
        while (startPos.col > -1) 
        {
            if (line.charAt(startPos.col) == '(')
            {
                foundOpeningBrace = true;
                break;
            }
            startPos.col--; 
        }
        
        if (foundOpeningBrace)
            break;
        
        startPos.row--;
        if (startPos.row < 0)
            break;
            
        startPos.col = lines[startPos.row].length - 1;
    }
    
    if (!foundOpeningBrace)
        return false;
        
    /* Счетчик непарных скобок. Если встречается открывающаяся скобка - прибавляем 1, 
    если закрывающая - вычитаем 1. Когда значение становится равным 0, значит мы нашли 
    парную закрывающую скобку и поиск можно прекратить. */
    var notPairedCount = 1; 
    
    var endPos = { 'row' : startPos.row, 'col' : startPos.col + 1 };
    while (endPos.row < lines.length)
    {
        var line = lines[endPos.row];
        while (endPos.col < line.length)
        {
            switch (line.charAt(endPos.col))
            {
            case '(':
                notPairedCount++;
                break;
            case ')':
                notPairedCount--;
                break;                
            default:
                break;
            }
            
            if (!notPairedCount)
                break;
            
            endPos.col++;
        }
        
        if (!notPairedCount)
            break;
            
        endPos.row++;
    }
    
    if (notPairedCount)
    {
        DoMessageBox('Не обнаружено парной скобки для скобки в позиции (' + (startPos.row + 1) + ', ' + (startPos.col + 1) + ')!');
        w.SetSelection(startPos.row + 1, startPos.col + 1, startPos.row + 1, startPos.col + 2);
        return false;
    }
    
    /* Не забываем, что у нас нумерация строк и колонок начинается с 1, 
    а индексы элементов массива и индексы символов в строке - с нуля. */
    w.SetSelection(startPos.row + 1, startPos.col + 2, endPos.row + 1, endPos.col + 1);
    return true;
}

SelfScript.Self['macrosЗаменить табуляцию в отступах на пробелы'] = function() {
	return replaceTabsToSpacesInSelectedText();
}

function replaceTabsToSpacesInSelectedText(doNotRestoreSelection) {	
    return processSelectedText(function(selText){
        var tabSize = profileRoot.getValue("ModuleTextEditor/TabSize");
        var spaces = ''; for (var i=0; i<tabSize; i++) { spaces += ' ' };
        return selText.replace(/^((<[^>]+>|\t)+)/gm, function(match, p1, offset, s) {
            return p1.replace(/\t/g, spaces);
        });
    }, doNotRestoreSelection);
}

function selectNextPattern(dir){
    //debugger;
    var w = GetTextWindow(); //snegopat.activeTextWindow();
    if (!w || windows.modalMode != msNone) return false;
    
//debugger;    
    
    var sel = w.getSelection();
    var selText = w.selectedText();
    if (selText == '') return false;

    var row = dir < 0 ? 
        searchPatternUp(w, selText, sel.beginRow) :
        searchPatternDown(w, selText, sel.beginRow);
    
    if (!row) return false;
    var str = w.line(row);
    var col = 1 + str.indexOf(selText);
    
    w.setCaretPos(1, 1);
    w.setSelection(row, col, row, col + selText.length);
    w.setCaretPos(row, col);
    w.setSelection(row, col, row, col + selText.length);
    
    return true;
}

function searchPatternDown(doc, pattern, startRow){
    var q = 0;
    for (var i = startRow + 1; i <= doc.linesCount(); i++){
        
        if (++q > 10000) return null;
        
        var str = doc.line(i);
        var j = str.indexOf(pattern);
        if (j > -1) return i;
    }
    return null;
}

function searchPatternUp(doc, pattern, startRow){
//debugger;    
    var q = 0;
    for (var i = startRow - 1; i >= 1; i--){
        
        if (++q > 10000) return null;
        
        var str = doc.line(i);
        var j = str.indexOf(pattern);
        if (j > -1) return i;
    }
    return null;
}

function macrosКлонироватьТекст(){
    var w = GetTextWindow();//snegopat.activeTextWindow();
    if (!w || windows.modalMode != msNone) return false;
    
    var sel = w.getSelection();
    var selText = w.selectedText();
    if (selText != ''){            
        w.SetSelectedText(selText + "\n" + selText);
    }
    else{
        // Если ничего не выделено, склонируем текущую строку
        var pos = w.getCaretPos();
        w.setSelection(pos.beginRow, 1, pos.beginRow, 1 + w.line(pos.beginRow).length);
        w.SetSelectedText(w.selectedText() + "\n" + w.selectedText());
        w.setCaretPos(pos.beginRow+1, pos.beginCol);
    }
    return true;
}

function macrosOnPressEnterInComment(){
    var w = GetTextWindow();//snegopat.activeTextWindow();
    if (!w || windows.modalMode != msNone) return false;
    
    var pos = w.getCaretPos();
    var str = w.line(pos.beginRow);
    if (str.match(/^\s*\/\/\s*[^\s]+/ig)) {     

        // Если курсор установлен левее символов комментария, то не обрабатываем нажатие,
        // чтобы добавлялась пустая строка, как и ожидается.
        if (pos.beginCol <= str.search('//') + 1)
            return false;

        // Это непустой комментарий - добавляем комментарий ниже 
        // с отступом как в предыдущей строке.
        var newStr = getCommentStringHeader(str);

        // Если справа от курсора есть текст, перенесем его 
        // на новую строку комментария.
        if (str.length >= pos.endCol) {
            var tail = str.substr(pos.beginCol - 1, str.length - pos.beginCol + 1);
            w.ReplaceLine(pos.beginRow, str.substr(0, pos.beginCol - 1));    // отрезаем хвост от текущей строки
            newStr = newStr + tail.replace(/^\s*/ig, "");
        }
        var newCaretRow = 1 + pos.beginRow;
        w.InsertLine(newCaretRow, newStr);
        w.setCaretPos(newCaretRow, 1 + newStr.length);
        return true;
    }
    return false;
}

function macrosOnPressDeleteInComment(){
    var w = GetTextWindow();//snegopat.activeTextWindow();
    if (!w || windows.modalMode != msNone) return false;

    if (w.selectedText() != ""){
        return false;    /// TODO: обработать этот вариант.
    }
    
    var pos = w.getCaretPos();
    
    if (pos.beginRow == w.linesCount) return false;
    
    var str = w.line(pos.beginRow);
    
    if (!isCommentString(str)) return false;
    
    if (pos.endCol > str.length){
        // Курсор стоит в самом конце строки и при нажатии 
        // Delete следующая строка должна приклеиться в конец текущей.
        var newTail = w.line(1 + pos.beginRow);
        
        if (!isCommentString(newTail)) return false;
        
        newTail = newTail.replace(/^\s*\/\/*\/\s*/ig, ""); 
        if (str.match(/[^\s]$/ig)) newTail = " " + newTail;
        
        w.ReplaceLine(pos.beginRow, str + newTail);
        w.DeleteLine(1 + pos.beginRow);
        w.setCaretPos(pos.beginRow, pos.beginCol);
        return true;
    }
    return false;
}

function macrosOnPressBackspaceInComment(){
    var w = GetTextWindow();//snegopat.activeTextWindow();
    if (!w || windows.modalMode != msNone) return false;

    if (w.selectedText() != ""){
        return false;    /// TODO: обработать этот вариант.
    }
    
    var pos = w.getCaretPos();
    if (pos.beginRow == 1) return false;    // И так уже стоим в первой строке.
    
    // Обрабатываем только если стоим  в самом начале строки и 
    // если эта и предыдущая строки являются комментариями.
    if (pos.beginCol > 1) return false;
    
    var str = w.line(pos.beginRow);
    if (!isCommentString(str)) return false;
    
    var prevStr = w.line(pos.beginRow - 1);
    if (!isCommentString(prevStr)) return false;
    
    // Курсор стоит в самом начале строки и при нажатии 
    // Backspace текущая строка должна приклеиться в конец предыдущей.
    var newTail = str.replace(/^\s*\/\/*\/\s*/ig, ""); 
    if (prevStr.match(/[^\s]$/ig)) newTail = " " + newTail;
    
    w.setSelection(pos.beginRow - 1, 1, pos.beginRow, 
        w.line(pos.beginRow).length + 1);
    w.SetSelectedText(prevStr + newTail);
    
    w.setCaretPos(pos.beginRow - 1, 1 + prevStr.length);
    
    return true;
}

function isCommentString(str){
    return null != str.match(/^\s*\/\//ig);
}

function getTextBlockOffset(str){
    var match = str.match(/^([\s]+)/ig);
    var res = !match ? "" : match[0];
    return res;
}

function getCommentStringHeader(str){
    var match = str.match(/^([\s]*\/\/*\/[\s]?)*/ig);
    var res = !match ? "" : match[0];
    return res;
}

function processSelectedText(selTextHandler, doNotRestoreSelection) {
    
    var w = GetTextWindow(); 
    if (!w || windows.modalMode != msNone) return false;    
    
    var sel = w.GetSelection();            
    var selText = w.GetSelectedText();
    if (selText.length==0){
        return false;
    }
    
    try 
    {
        selText = selTextHandler.call(null, selText);
    }
    catch (e)
    {
       Message(e.description);
       return false;
    }        
    
    w.SetSelectedText(selText);
    
    // Восстановим исходное выделение.
    if (!doNotRestoreSelection)
        w.SetSelection(sel.beginRow, sel.beginCol, sel.endRow, sel.endCol);
    return true;
}

SelfScript.Self['macrosУстановить символ | в строке/выделении'] = function() {
   
    var w = GetTextWindow(); //Получим активное текстовое окно
    if (!w || windows.modalMode != msNone) return false;   
   
    // Проверем есть ли выделенный текс, если нет, то выделим текущую строку , в результате обработаем выделенный текст и вернем на место.
    var selText = w.GetSelectedText();
    if (selText.length==0) {
        var pos = w.getCaretPos();
        w.setSelection(pos.beginRow, 1, pos.beginRow, 1 + w.line(pos.beginRow).length);
        var text = w.GetSelectedText();
    } else {
        var text = selText;
    }
    w.SetSelectedText(setSymbolInBeginnLine(text, "| "));
    return true;
}

function setSymbolInBeginnLine(text, symbol){
    var result = "";
    var Lines = text.split('\n');
    if (Lines.length == 0 && str.indexOf(symbol) == -1){
        result = result+text.replace(/^\s*/, "$&"+""+symbol+"");
    }
    for (var i=0; i<Lines.length; i++){
        var str = Lines[i];
        if (str.indexOf(symbol) == -1)
            str = str.replace(/^\s*/, "$&"+""+symbol+"");
           
        result = result+str+(((Lines.length-1)==i)?"":"\n");
    }
    return result
}

function macrosOnPressBackspaceInBracket(){
    var w = GetTextWindow();//snegopat.activeTextWindow();
    if (!w || windows.modalMode != msNone) return false;

    if (w.selectedText() != ""){
        return false;    /// TODO: обработать этот вариант.
    }
    
    var pos = w.getCaretPos();
    
    var beginRow = pos.beginRow;
    var wordBegPos = pos.beginCol - 1;
    var line = w.GetLine(pos.beginRow);
    var curChar = line.charAt(wordBegPos);
    if (wordBegPos>0) {
        var wordBacksp = wordBegPos-1;
        if (curChar==")" && line.charAt(wordBacksp)=="(") {
            //debugger;
            w.SetSelection(pos.beginRow, wordBacksp+1, pos.beginRow, wordBegPos+2);
            w.SetSelectedText("");
            w.setCaretPos(pos.beginRow, (line.charAt(wordBegPos+1)==";")?wordBegPos+1:wordBacksp+1);
            return true;
        } else {
            if (wordBacksp>0 
                && line.charAt(wordBacksp)==")" 
                && line.charAt(wordBacksp-1)=="("){
                w.SetSelection(pos.beginRow, wordBacksp, pos.beginRow, wordBegPos+1);
                w.SetSelectedText("");
                w.setCaretPos(pos.beginRow, (line.charAt(wordBacksp+1)==";")?wordBacksp+1:wordBacksp);
                return true;
            }
        }
    }

    return false;
    
}
function macrosOnPressDelInBracket(){
    var w = GetTextWindow();//snegopat.activeTextWindow();
    if (!w || windows.modalMode != msNone) return false;

    if (w.selectedText() != ""){
        return false;    /// TODO: обработать этот вариант.
    }
    
    var pos = w.getCaretPos();
    
    var beginRow = pos.beginRow;
    var wordBegPos = pos.beginCol - 1;
    var wordAfterPos = pos.beginCol;
    var line = w.GetLine(pos.beginRow);
    if (line.length < wordAfterPos || wordBegPos-1 < 0) return false;
    
    
    var curChar = line.charAt(wordBegPos); 
    if (curChar == ")" && line.charAt(wordBegPos-1)=="(")  {
        w.SetSelection(pos.beginRow, wordBegPos, pos.beginRow, wordBegPos+2);
        w.SetSelectedText("");
        //w.setCaretPos(pos.beginRow, (line.charAt(wordBegPos+1)==";")?wordBegPos+1:wordBegPos);
        w.setCaretPos(pos.beginRow, wordBegPos);
        return true;
    } else {
            if (curChar == "(" 
            && line.charAt(wordAfterPos)==")") {
            
            w.SetSelection(pos.beginRow, wordBegPos+1, pos.beginRow, wordBegPos+3);
            w.SetSelectedText("");
            w.setCaretPos(pos.beginRow, wordBegPos+1);
            //w.setCaretPos(pos.beginRow, (line.charAt(wordAfterPos+1)==";")?wordBegPos+2:wordBegPos+1);
            return true;
        }
    }
    
    return false;
    
}


