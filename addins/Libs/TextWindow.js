$engine JScript
$uname TextWindow
$dname Класс TextWindow
$addin global
$addin stdlib

function GetTextWindow() {
    
    var activeWnd = snegopat.activeTextWindow();
    
    if (activeWnd)
        return new _TextWindow(activeWnd, windows.getActiveView());
        
    return null;
}

////////////////////////////////////////////////////////////////////////////////////////
//// _TextWindow
////

/** Класс-обертка вокруг ITextWindow, поддерживающий одновременно 
интерфейс объектов ITextWindow, так и ТекстовыйДокумент. */
_TextWindow = stdlib.Class.extend({

    construct : function (textWindow, view) {
        this.textWindow = textWindow;
        this._view = view;//(view && (textWindow.hwnd == view.hwnd)) ? view : undefined;
    },
    
    IsActive : function() {
        
        if (!this.textWindow)
            return false;
            
        try 
        {
            /* Окно могло быть закрыто. Тогда при обращении 
            к его свойствам произойдет ошибка. */
            var hwnd = this.textWindow.hwnd;
        }
        catch (e)
        {
            return false;
        }
        
        return true;
    },

    GetHwnd : function () {
        return this.textWindow.hwnd;
    },

    GetText : function() {
        return this.textWindow.text;
    },

    SetText : function(text) {
        this.Range(1,1,this.textWindow.linesCount).SetText(text);
    },

    ExtName : function() {
        return this.textWindow.extName;
    },

    GetCaretPos : function() {
        return this.textWindow.getCaretPos();    
    },

    SetCaretPos : function(row, col) {
        return this.textWindow.setCaretPos(row, col);    
    },

    GetSelection : function() {
        return this.textWindow.getSelection();    
    },

    SetSelection : function(beginRow, beginCol, endRow, endCol) {
        return this.textWindow.setSelection(beginRow, beginCol, endRow, endCol);    
    },

    GetSelectedText : function() {
        return this.textWindow.selectedText;
    },

    SetSelectedText : function(text) {
        this.textWindow.selectedText = text;
    },

    GetLine : function(rowNum) {
        return this.textWindow.line(rowNum);    
    },

    LinesCount : function() {
        return this.textWindow.linesCount;    
    },

    IsReadOnly : function() {
        return this.textWindow.readOnly;    
    },

    DeleteLine : function(rowNum) {
        
        if (rowNum < 1 || rowNum > this.LinesCount())
            return;

        var nextLine = this.GetLine(rowNum + 1);
        this.Range(rowNum, 1, rowNum+1, nextLine.length + 1).SetText(nextLine);
    },

    AddLine : function(strLine) {
        var linesCount = this.LinesCount();
        if (linesCount > 0)
        {
            var lastLine = this.GetLine(linesCount);
            this.Range(linesCount, 1, linesCount).SetText(lastLine + "\n" + strLine);
        }
        else 
        {
            this.Range().SetText(strLine);
        }
    },

    InsertLine : function(rowNum, strLine) {

        var linesCount = this.LinesCount();

        if (rowNum < 0 || rowNum > linesCount + 1)
            throw "_TextWindow.InsertLine(): Индекс за границами диапазона!";
            
        if (rowNum == linesCount + 1)
        {    
            this.AddLine(strLine);
        }
        else 
        {
            var curLine = this.GetLine(rowNum);
            this.Range(rowNum, 1, rowNum).SetText(strLine + "\n" + curLine);
        }
    },

    ReplaceLine : function(rowNum, strLine) {
        this.Range(rowNum, 1, rowNum).SetText(strLine);
    },

    Clear : function () {
        this.Range().SetText("");
    },

    /** RangeObject _TextWindow::Range([beginRow [,beginCol [,endRow [,endCol]]]]) */
    Range : function() {
        var tw = this.textWindow;

        /* Нумерация строк и колонок в текстовом документе - с 1. 
        Если документ пустой, то linesCount == 0, поэтому для корректной работы 
        объекта Range() приводим значения аргументов при помощи выражения (index || 1). */
        
        var beginRow = (arguments.length > 0 ? arguments[0] : 1) || 1;
        var endRow  = (arguments.length > 2 ? arguments[2] : tw.linesCount) || 1;
        
        if (beginRow > endRow)
            throw "_TextWindow: Индекс первой строки области не может быть больше индекса последней строки области!";

        var beginCol = (arguments.length > 1 ? arguments[1] : 1) || 1;
        var endCol =  (arguments.length > 3 ? arguments[3] : tw.line(endRow).length) || 1;
        
        if (beginRow == endRow && beginCol > endCol)
            throw "_TextWindow: Индекс первого символа области строки не может быть больше индекса последнего символа области!";

         // Возвращает строки области как массив.
         var getLines = function() {
            
            var lines = [];        

            /* Чтобы не ошибиться в индексах, надо помнить:
             - в строках js нумерация символов начинается с 0;
             - строки и колонки в ITextWindow нумеруются с 1;
             - в substr второй параметр - длина подстроки, которую требуется получить.*/

            ////// Область - подстрока одной строки.

            if (beginRow == endRow)
            {
                lines.push(tw.line(beginRow).substr(beginCol-1, endCol));
                return lines;
            }

            ////// Область - несколько строк.            
            
            // 1. Первая строка - от первой колонки области и до конца этой строки.
            lines.push(tw.line(beginRow).substr(beginCol - 1));
            
            // 2. Строки, начиная со второй и до предпоследней.
            for (var row=beginRow + 1; row <= endRow - 1; row++)
                lines.push(tw.line(row));

            // 3. Последняя строка - от первого символа и до последней колонки области.
            lines.push(tw.line(endRow).substr(0, endCol));

            return lines;
        };

        // Возвращает строки области в виде одной мультистроки (разделитель строк - \n).
        var getText = function() {
            return getLines().join("\n");
        };

        var setText = function(text) {        
            
            ////1. Запомнить текущую позицию курсора и выделение.        
            var curPos = tw.getCaretPos();
            var curSel = tw.getSelection();
            
            ////2. установить выделение в соответствии с координатами Range
            
            /* И снова чехарда с индексами: выделение включает символы
            вплоть до позиции каретки, т.е. если мы хотим, чтобы символ 
            в позиции endCol попал в выделение, мы каретку должны поставить
            в позицию (endCol + 1). */
            
            var _line = tw.line(endRow); if ((_line == '') || (_line.charAt(_line.length-1) == '\r')) endCol--; //ITextWindow->line() получает всё что до символа '\n', т.е если конец строки равен '\r\n' то метод вернет строку с '\r' в конце
            tw.setSelection(beginRow, beginCol, endRow, endCol+1);
            
            ////3. установить выделенный текст
            tw.selectedText = text;
            
            ////4. вернуть положение курсора в прежнюю позицию.
            tw.setSelection(curSel.beginRow, curSel.beginCol, curSel.endRow, curSel.endCol);
            tw.setCaretPos(curPos.beginRow, curPos.beginCol);
        }
        
        // Возвращаем наш псевдо - Range
        return { GetLines: getLines, GetText: getText, SetText: setText };

    },

    /** Array _TextWindow::Lines([from [,to]])*/
    GetLines : function () {

        // Если не задано ни одного параметра, то возвращаем все строки.
        // Если задан только первый параметр, то возвращается заданная строка.
        // Если заданы оба параметра, возвращаем диапазон строк.

        var beginRow, endRow;

        if (!arguments.length)
        {
            beginRow = 1;
            endRow = this.textWindow.linesCount;
        }
        else if (arguments.length == 1) 
        {
            beginRow = arguments[0];
            endRow = beginRow;
        }
        else if (arguments.length > 1)
        {
            beginRow = arguments[0];
            endRow = arguments[1];
        }
        
        return this.Range(beginRow, 1, endRow).GetLines();
    },

    /** Возвращает слово под курсором. */
    GetWordUnderCursor : function (re) {

        /*TODO: Добавить необязательный параметр: регулярное выражение для проверки символов слова. */

        var pos = this.GetCaretPos();
        var line = this.GetLine(pos.beginRow);
        var isChar = re ? re : /[\w\dА-я]/;

        var wordBegPos = pos.beginCol - 2;
        
        if (!isChar.test(line.charAt(wordBegPos)))
            return '';
            
        while (wordBegPos > 0)
        {
            if (!isChar.test(line.charAt(wordBegPos - 1)))
                break;
                
            wordBegPos--;
        }
            
        var wordEndPos = pos.beginCol - 2;
        
        while (wordEndPos < line.length - 1)
        {
            if (!isChar.test(line.charAt(wordEndPos + 1)))
                break;
                
            wordEndPos++;    
        }

        return line.substr(wordBegPos, wordEndPos - wordBegPos + 1);
    },

    /** Возвращает строковый литерал, внутри которого находится курсор. 
    FIXME: Текущая реализация некорректно отрабатывает ситуацию, когда курсор
    находится вне строкового литерала между границами двух других строковых  
    литералов (см. тест macrosTest10 в testTextWindow_GetStringUnderCursor.js). */
    GetStringUnderCursor : function () {

        var pos = this.GetCaretPos();

        var beginRow = pos.beginRow;
        var wordBegPos = pos.beginCol - 1;
        
        // Далее везде помним, что нумерация строк начинаются с 1,
        // а нумерация символов в js-строке - с 0.
        var line = this.GetLine(pos.beginRow);
        var str = '';
        
        while (true)
        {            
            if (beginRow < 1 || wordBegPos < 0)
                return null;
        
            var curChar = line.charAt(wordBegPos);
            
            /* Если встретилась двойная кавычка, то либо строка завершилась, либо
            рядом есть еще одна экранирующая двойная кавычка. */
            if (curChar == '"')
            {
                if (wordBegPos - 1 > -1 && line.charAt(wordBegPos - 1) == '"')
                {
                    str = '"' + str;
                    wordBegPos -= 2;
                    continue;
                }                    
                break;
            }
            
            /* Если встретился символ вертикальной черты, то значит нам 
            встретилась мультистрока. Добавляем перевод строки и продолжаем 
            парсинг с конца близлежайшей верхней строки. */
            if (curChar == '|')
            {
                str = "\n" + str;
                beginRow--;
                if (beginRow < 1) 
                    return null;
                    
                line = this.GetLine(beginRow);
                wordBegPos = line.length - 1;
                continue;
            }
                
            /* В остальных случаях встретился обычный символ, добавляем его к строке. */
            str = curChar + str;        
            wordBegPos--;
        }
            
        var endRow = pos.beginRow;
        var wordEndPos = pos.beginCol;
        var linesCount = this.LinesCount();
        var line = this.GetLine(endRow);
        
        // Регулярное выражение для проверки начала очередной строки в мультистроке.
        var reMultilineString = new RegExp('^\s*\|');
        
        while (true)
        {
            if (endRow > linesCount)
                return null;
                            
            if (wordEndPos >= line.length) 
            {
                /* Надо проверить, находимся ли мы в мультистроке.
                Критерий проверки: наличие вертикальной черты в самом начале следующей строки.
                Если да, мы в мультистроке, то просто переходим к обработке следующей строки.
                Если нет, то значит имеет место быть синтаксическая ошибка. */
                
                endRow++;
                if (endRow > linesCount)
                    return null;
                
                line = this.GetLine(endRow);
                
                // Если следующая строка - не продолжение мультстроки, то это ошибка.
                var match = reMultilineString.exec(line);
                if (!match) return null;

                // Добавляем перевод строки и продолжаем со следующей за вертикальной чертой позиции.
                str += "\n";
                wordEndPos = reMultilineString.lastIndex + 1;
            }
                            
            var curChar = line.charAt(wordEndPos);
            
            /* Если встретилась двойная кавычка, то либо строка завершилась, либо
            рядом есть еще одна экранирующая двойная кавычка. */
            if (curChar == '"')
            {
                if (wordEndPos + 1 < line.length && line.charAt(wordEndPos + 1) == '"')
                {
                    str += '"';
                    wordEndPos += 2;
                    continue;
                }                    
                break;
            }

            /* В остальных случаях встретился обычный символ, добавляем его к строке. */
            str += curChar;        
            wordEndPos++;        
        }

        return str;
    },

    // Возвращает отображение, соответствующее данному экземпляру объекта TextWindow.
    GetView : function () {
        if (this._view == undefined) {
            var view = null;
            var twnd = this.textWindow;
            function walkWindows(views) {
                for(var i = 0; i < views.count; i++) {
                    var v = views.item(i);
                    if (v.isContainer != vctNo)
                        v = walkWindows(v.enumChilds());                        
                    if (v && ((v.hwnd == twnd.hwnd) 
                    || (v.mdObj && v.mdObj == twnd.mdObj && v.mdProp == twnd.mdProp)))
                        return v;
                }
                return null;
            }
            this._view = walkWindows(windows.mdiView.enumChilds());
        }
        return this._view;
    }
    
}); // stdlib.Class.extend


//{ Русскоязычные аналоги основных методов объекта Текстовый документ (TextDocument).
_TextWindow.prototype.КоличествоСтрок = _TextWindow.prototype.LinesCount;
_TextWindow.prototype.УдалитьСтроку = _TextWindow.prototype.DeleteLine;
_TextWindow.prototype.ДобавитьСтроку = _TextWindow.prototype.AddLine;
_TextWindow.prototype.Очистить = _TextWindow.prototype.Clear;
_TextWindow.prototype.ВставитьСтроку = _TextWindow.prototype.InsertLine;
_TextWindow.prototype.ЗаменитьСтроку = _TextWindow.prototype.ReplaceLine; 
_TextWindow.prototype.ПолучитьТекст = _TextWindow.prototype.GetText;
_TextWindow.prototype.УстановитьТекст = _TextWindow.prototype.SetText;
//}

//{ Методы для обратной совместимости с интерфейсом ITextWindow Снегопата предыдущих версий.
_TextWindow.prototype.document = function () { return this; };
_TextWindow.prototype.Document = function () { return this; };
_TextWindow.prototype.extName = _TextWindow.prototype.ExtName;
_TextWindow.prototype.getCaretPos = _TextWindow.prototype.GetCaretPos;
_TextWindow.prototype.setCaretPos = _TextWindow.prototype.SetCaretPos;
_TextWindow.prototype.getSelection = _TextWindow.prototype.GetSelection;
_TextWindow.prototype.setSelection = _TextWindow.prototype.SetSelection;
_TextWindow.prototype.line = _TextWindow.prototype.GetLine;
_TextWindow.prototype.linesCount = _TextWindow.prototype.LinesCount;
_TextWindow.prototype.readOnly = _TextWindow.prototype.IsReadOnly;
_TextWindow.prototype.selectedText = _TextWindow.prototype.GetSelectedText;
_TextWindow.prototype.text = _TextWindow.prototype.GetText;
_TextWindow.prototype.hwnd = _TextWindow.prototype.GetHwnd;
//}

//{ Объект TextWindow - альтернатива использованию GetTextWindow().
// Вместо 
// 	var twnd = GetTextWindow();
// 	if (twnd !== null) ...
// Позволяет использовать объектную технику:
// 	var twnd = new TextWindow();
// 	if (twnd.IsActive()) ...
TextWindow = _TextWindow.extend({
    construct : function () {
        var activeWnd = snegopat.activeTextWindow();	    
        if (activeWnd)
            this._super(activeWnd, windows.getActiveView());	        
    }	
});
//}

////////////////////////////////////////////////////////////////////////////////////////
//// StringUtils
////

//{ Вспомогательные методы для работы со строками и текстовыми блоками.
StringUtils = {
    
    /* Получить отступ блока текста (по первой строке блока).
     Возвращает строку - пробельные символы, формирующие отступ. */
    getIndent: function (code) {
        var matches = code.match(/(^\s+?)(\S|\n|\r)/);
        
        if (matches)
            return matches[1].replace(/\n|\r/, '');
            
        return '';
    },

    /* Увеличивает отступ у текстового блока, добавляя строку пробельных символов,
    переданных в качестве значения второго параметра ind. 
    Возвращает текстовый блок с добавленным отступом. */
    shiftRight: function(code, ind) {
        if (ind)
            return ind + code.replace(/\n/gm, "\n" + ind);
            
        return code;
    },

    /* Уменьшает отступ у текстового блока, удаляя строку пробельных символов,
    совпадающую со строкой, переданной в качестве значения второго параметра ind.
    Возвращает текстовый блок с уменьшенным отступом. */
    shiftLeft: function(code, ind) {
        if (ind)
        {
            var re = new RegExp("^" + ind, 'gm');
            return code.replace(re, "");
        }
            
        return code;
    },

    /* Проверяет, оканчивается ли строка str подстрокой suffix.
    Возвращает true, если хвост строки совпадает с suffix, и false в противном случае. */ 
    endsWith: function(str, suffix)  {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    },
    
    /* Разбивает переданный блок текста на строки и возвращает массив строк. */
    toLines: function(code, nl) {
        return code.split(nl ? nl : "\n");
    },
    
    /* Объединяет массив строк в строку - блок текста. */
    fromLines: function(linesArray, nl) {
        return linesArray.join(nl ? nl : "\n");
    },
    
    /* Экранирует все символы в строке. */
    addSlashes: function(str) {
        return str.replace(/([^\d\w\sА-я])/g, "\\$1");
    }

}
//} Вспомогательные методы для работы со строками и текстовыми блоками.