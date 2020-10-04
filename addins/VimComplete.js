//engine: JScript
//uname: VimComplete
//dname: Автодополнение в стиле Vim
//descr: Автодополнение слов в стиле редактора Vim
//author: Александр Кунташов
//version: 1.4
//www: https://snegopat.ru/scripts/wiki?name=VimComplete.js
//help: inplace
//addin: global
//addin: stdlib

stdlib.require('TextWindow.js', SelfScript);

/*@
Скрипт:  VimComplete.js  
Версия:  1.4  
Автор:   Александр Кунташов  
Описание:  
    Атодополнение слов в стиле редактора Vim
@*/

/*@
Макрос СледующееСлово()

Подбирает часть слова слева от курсора и пытается дополнить его,
ища вперед по тексту слова, с такой же левой частью. Подставляет 
первое подходящее. Следующий вызов макроса подставит следующее за 
первым найденным словом и так далее по кругу (дойдя до последней строки 
модуля поиск продолжится с первой строки). 
    
Макрос macrosПредыдущееСлово()

Тоже самое, только поиск слов осуществляется в обратном направлении.

В классическом Vim используются следующие хоткеи:

    Ctrl + N  для дополнения с поиском вперед (следующее слово, Next word)
    Ctrl + P  для дополнения с поиском назад  (предыдущее слово, Previous word)
@*/

////////////////////////////////////////////////////////////////////////////////////////
//// Макросы
////

function macrosСледующееСлово() // Ctrl + N
{
    return completeWord();
}

function macrosПредыдущееСлово() // Ctrl + P
{
//debugger;
    return completeWord(true);
}

////////////////////////////////////////////////////////////////////////////////////////
//// Реализация функционала скрипта.
////

var CurDoc = null;
var VimComplete = new VimAutoCompletionTool();

function completeWord(lookBackward)
{
    CurDoc = GetTextWindow();
    if (!CurDoc) 
        return false;
	
    VimComplete.completeWord(lookBackward);
    CurDoc = null;
    return true;
}

/* Возвращает часть слова слева от текущего положения курсора */
function getLeftWord(doc)
{
    var cl, word = '';
    var pos = doc.GetCaretPos();
    cl = doc.GetLine(pos.beginRow);
    
    /* ВАЖНО! Помним про индексацию: а именно, что позиция курсора индексируется с 1. 
    Символы же в JavaScript-строке - с 0. Координата предыдущего символа от курсора в терминах 
    позиции каретки = (beginCol - 1). Поскольку индексация в строке с 0, то индекс символа 
    в строке будет вычисляться как ((beginCol - 1) - 1) = (beginCol - 2). */ 
    
    for (var i = pos.beginCol - 2; 
        (i >= 0) && cl.charAt(i).match(/[\wА-Яа-я]/i); 
        word = cl.charAt(i--) + word)
        ;    
    return word;
}

// Примитивный класс для выделения слов в строке, их фильтрации и последовательному перебору. 
function Line(str)
{
    var s = str;
    var words = null;     

    this.reset = function () 
    {
        words = s.split(/[^\wА-я]+/);
    }
    
    this.assert = function (ix) 
    {
        return ((typeof(words) == "object") && (ix >= 0) && (ix < words.length));                  
    }
    
    this.word = function (ix) 
    {
        if (this.assert(ix)) return words[ix];
    }
    
    this.count = function ()
    {
        return words.length;        
    }
    
	this.words = function ()
	{
		return words;
	}
    
	/* возвращает объект-итератор с единственным методом next() 
	c помощью которого осуществляется перебор строк (до тех пор, 
	пока не вернет значение undefined, означающее конец списка) */
	this.iterator = function (r)
	{
		var collection = this;
		return {
			collection	: collection,
			iterator	: r ? collection.count() : (-1),														 
			next		: function(reverse)
		    {        
				return this.collection.word( this.iterator += (reverse?(-1):1) );
		    }   
		}
	}
    
	/* фильтрует элементы, оставляя только те, значения которых
	   матчат шаблон pattern */
    this.filter = function (pattern, unique)
    {
        var used = {};
        if (this.assert(0)) {
            var nw = new Array();
            for (var i=0; i<this.count(); i++) {
                if (this.word(i).match(pattern)) {					
                    if (unique) {
                        if (!used[this.word(i)]) {
                            used[this.word(i)] = true;
                            nw[nw.length] = this.word(i);
                        }
                    }
                    else {
                       nw[nw.length] = this.word(i);
                    }
                }
            }
            words = nw;
            return true;
        }
        return false;
    }        
   
    this.reset(); // инициализация
}


function VimAutoCompletionTool()
{
    var srcDocPath;	// путь до исходного документа (используется для идентификации документов)
    var srcLine;	// исходная строка документа
    var srcCol;		// первая позиция в строке перед исходным словом
    var srcWord;	// исходное слово (которое пытаемся дополнить)
    var lastWord;	// последнее использованное в подстановке слово
    var curLineIx;	// индекс текущей строки (из которой берутся соответствия)
    var words;		// список слов-соответствий текущей строки
    
    var backwardSearch;	// обратный поиск (по умолчанию поиск прямой, "вперед")
    var pattern;		// шаблон (регулярное выражение), описывающий соответствие исходному слову 
    
    var counter;	// счетчик соответствий
    var total;		// общее число соответствий

    /* выполняет (ре)инициализацию объекта, если это необходимо */
    this.setup = function (lookBackward)
    {
        var word = getLeftWord(CurDoc);		
        if (this.isNewLoop(CurDoc, word)) { // реинициализация			
            srcDocPath	= CurDoc.GetHwnd();  
			var caretPos = CurDoc.GetCaretPos();
			srcLine = caretPos.beginRow;
			srcCol = (caretPos.beginCol - 1) - word.length;            
            srcWord = word;            
            lastWord	= word; // чтобы корректно сделать первую подстановку
            curLineIx = srcLine;            
            pattern = new RegExp("^" + word, "i");     
            // начинаем искать соответствия начиная с исходной строки
            words = this.parseLine(lookBackward ? this.leftPart() : this.rightPart());  
            // счетчики
            counter = 0;
            total = null;
        }               
        backwardSearch = lookBackward;
    }
    
	/* условие необходимости произвести переинициализацию переменных членов объекта VimAutoCompletionTool */
    this.isNewLoop = function (doc, word)
    {
        var pos = doc.GetCaretPos();
        
        return !(words && (srcDocPath == doc.GetHwnd()) 
            && (srcLine == pos.beginRow) && (lastWord == word)
            && (srcCol == (pos.beginCol - 1 - word.length)));         
    }
    
	/* проверяет, не выходит ли индекс строки за допустимые границы */
    this.assert = function (lIx)
    {
        return (CurDoc && (1 <= lIx) && (lIx <= CurDoc.LinesCount()));
    }
    
	/* берет следующее соответствие и подставляет его на место исходного слова */
    this.completeWord = function (lookBackward)
    {       
		this.setup(lookBackward);
        while (true) {  
            var word = words.next(lookBackward);
            if (word) {
                this.complete(word);
                return;
            }
            words = this.nextLine();
        }
    }
    
	/* строит и возвращает список соответсвующих слов для следующей по порядку строки */
    this.nextLine = function ()
    {                   
        curLineIx += (backwardSearch ? -1 : 1); 
		if (backwardSearch) {
			if (curLineIx < 1) {
				curLineIx = CurDoc.LinesCount();
			}
		} 
		else {
            if (curLineIx > CurDoc.LinesCount()) {
                curLineIx = 1;
            }
         }
        return this.parseLine(this.curLine());               
    }
    
	/* "разбирает" переданную в качестве параметра строку на слова и фильтрует их 
    в соотвествии с шаблоном, который описывает подходящие соответствия для исходного слова */
    this.parseLine = function (srcLine)
    {
        var w = new Line(srcLine);
        w.filter(pattern, true);               
        return w.iterator(backwardSearch);
    }
    
	/* выполняет подстановку очередного соответствия вместо исходного слова */
    this.complete = function (word)
    {        
        CurDoc.ReplaceLine(srcLine, this.leftPart() + word + this.rightPart());
        CurDoc.SetCaretPos(srcLine, srcCol + word.length + 1); // Снова помним про индексы!
            
        lastWord = word;

        counter += backwardSearch ? -1 : 1;          
        if ((curLineIx == srcLine)&&(lastWord == srcWord)) {
            if ((!total)&&counter) {                                
                total = Math.abs(counter) - 1;                     
            }
            counter = 0;
        }
     }
     
    /* возвращает текущую строку */
    this.curLine = function ()
    {
        var str = "";
        if (this.assert(curLineIx)) {
            /* поскольку исходная строка у нас постоянно меняется,
            ее "собираем" отдельно, возвращая на место исходное слово */
            if (curLineIx == srcLine) {
                str = this.leftPart() + srcWord + this.rightPart();           
            }
            else {
                str = CurDoc.GetLine(curLineIx);
            }           
        }
        return str;
    }

    /* левая половина строки, содержащей исходное слово; само исходное слово не включается */
    this.leftPart = function ()
    {
        return CurDoc.Range(srcLine, 1, srcLine, srcCol).GetText();
    }
    
    /* правая половина строки, содержащей исходное слово; само исходное слово не включается */
    this.rightPart = function ()
    {   
        return CurDoc.Range(srcLine, srcCol + lastWord.length + 1, srcLine, CurDoc.GetLine(srcLine).length + 1).GetText();
    }
}
