$engine JScript
$uname StreamLib
$dname Работа с данными в формате потока (stream)
$addin global
$addin stdlib

////////////////////////////////////////////////////////////////////////////////////////
////{ Cкрипт-библиотека StreamLib (StreamLib.js) для проекта "Снегопат"
////
//// Описание: Реализует функционал по работе с данными во внутреннем 
//// формате 1С:Предприятия - "поток" (stream).
////
//// Автор: Александр Кунташов <kuntashov@gmail.com>, http://compaud.ru/blog
////}
////////////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////////////
////{ StreamFactory
////

StreamFactory = {};

StreamFactory.CreateParser = function () {
    return new _StreamParser();
}

StreamFactory.CreateSerializer = function () {
    return new _StreamSerializer();
}

////} StreamFactory

////////////////////////////////////////////////////////////////////////////////////////
////{ StreamParser
////

function _StreamParser() {
    this._file = '';
    this.setStream('');
}

_StreamParser.prototype.setStream = function (stream) {
    this._stream = stream;
    this.pos = 0;
    this.len = this._stream.length;    
}

_StreamParser.prototype.getStream = function() {  
    return this._stream;
}

_StreamParser.prototype.readStreamFromFile = function(filepath) {    
    this._file = v8New("File", filepath);
    if (!this._file.Exist())
    {
        _logError("Файл не существует: " + this._file.FullName);
        return false;
    }
    
    var textDoc = v8New("TextDocument");
    textDoc.Read(this._file.FullName);
    
    this.setStream(textDoc.GetText());
    
    return true;
}

_StreamParser.prototype.parse = function() {
    try
    {
        return this._parse();
    }
    catch (e)
    {
        Message(e.description);
        return null;
    }
}

////////////////////////////////////////////////////////////////////////////////////////
//// Реализация парсера StreamParser.
////{

_StreamParser.prototype._parse = function() {
        
    if (!this.atEnd())
    {
        if (this.isEquals('{'))
            return this.readArray();
        
        this.errorSyntaxError('_parse:1'); 
    }
    
    this.errorUnexpectedEndOfStream('_parse:2');
}

_StreamParser.prototype.readArray = function() {
    
    var a = [];
    
    while (this.next())
    {
        if (this.isEquals('{'))
        {
            a.push(this.readArray())
        }
        else if (this.isEquals('}'))
        {
            return a;
        }
        else if (this.isEquals('"'))
        {
            a.push(this.readString());
        }
        else if (this.isNumber())
        {
            a.push(this.readNumber());
        }
        else if (this.isEquals(',') || this.isSpace()) 
        {
            // TODO: проверять ошибку: две подряд идущие запятые.
            //this.errorSyntaxError('readArray:2, coma');
        }
        else 
        {
            this.errorSyntaxError('readArray:1');
        }
    }
    
    this.errorUnexpectedEndOfStream('readArray:2');
}

_StreamParser.prototype.readNumber = function() {

    var num = this.charAt(this.pos);
    oneCrapca = true;
    isExp = false;
    
    while (this.next())
    {
        if (this.isNumber())
        {
            num += this.charAt(this.pos);
        }
        else if (this.isEquals(',') || this.isEquals('}'))
        {
            this.pos--;
            return 1 * num; // Преобразуем к числу.
        }
        else if (this.isEquals('.') && oneCrapca) {
            oneCrapca = false;
            num += this.charAt(this.pos);

        } else if ((this.isEquals('e') || this.isEquals('-') || this.isEquals('+')) && (oneCrapca == false)){
            debugger;
            //Message(this.charAt(this.pos));
            //num += this.charAt(this.pos);
            isExp = true
        } //else if((this.isEquals('-') || this.isEquals('+')) && isExp){
            //num += this.charAt(this.pos);
        //}
        else 
        {            
             this.errorSyntaxError('readNumber:1', 'цифра');
        }
    }
    this.errorUnexpectedEndOfStream('readNumber:2');
};
    
_StreamParser.prototype.readString = function() {
    
    var str = '';
    
    while (this.next())
    {        
        if (this.isEquals('"'))
        {
            if (!this.next())
                 this.errorUnexpectedEndOfStream('readString:1');
            
            /* Проверим следующий символ после кавычки. В синтаксически верном файле потока
            следующим символом может быть: еще одна ковычка - это означает экранированную кавычку,
            запятая или закрывающая фигурная скобка или несколько пробельных символов, а потом 
            запятая или закрывающая фигурная скобка - это значит строка закончилась. */
            if (this.isEquals('"'))
            {
                str += '"';
            }
            else 
            {
                while (this.isSpace() && this.next())
                    ; // Пропускаем пробельные символы.
                
                if (this.atEnd())
                    this.errorUnexpectedEndOfStream('readString:3');
                
                if (this.isEquals(',') || this.isEquals('}'))
                {
                    this.pos--;
                    return str;
                }
                
                this.errorSyntaxError('readString:4');                    
            }
        }
        else
        {
            str += this.charAt(this.pos);
        }
    }
    debugger;
    this.errorSyntaxError('readString:6');
    this.errorUnexpectedEndOfStream('readString:5');
}

_StreamParser.prototype.atEnd = function () {
    return (this.pos == this._stream.length);
};

_StreamParser.prototype.next = function () {                
    this.pos++;
    if (this.atEnd()){
        debugger;
    }

    return !this.atEnd();          
};  

_StreamParser.prototype.charAt = function (index) {
    return this._stream.charAt(index);
};
        
_StreamParser.prototype.isEquals = function (ch) {
    if (this.atEnd())
        return false;
        
    return (ch == this.charAt(this.pos))
};
        
_StreamParser.prototype.isSpace = function() {
    var ch = this.charAt(this.pos); 
    return (ch == ' ' || ch == "\t" || ch == "\r" || ch == "\n");
};
        
_StreamParser.prototype.isNumber = function() {
    var ch = this.charAt(this.pos);
    return ch == '0' || ch == '1' || ch == '2' || ch == '3' || ch == '4'
        || ch == '5' || ch == '6' || ch == '7' || ch == '8' || ch == '9';
}
       
//} Реализация парсера StreamParser.

////////////////////////////////////////////////////////////////////////////////////////
//// Обработка ошибок алгоритма парсинга в StreamParser.
////{

function _StreamParserSyntaxErrorException(description, errorPos, methodId) {
    this.methodId = methodId;
    this.description = description;
    this.errorPos = errorPos;
}

function _StreamParserUnexpectedEndOfStreamExeption(description, methodId) {
    this.methodId = methodId;
    this.description = description;
}

_StreamParser.prototype.errorSyntaxError = function (methodId) {
    var desc = this._methodIdRepr(methodId)
        + "Ошибка разбора потока: синтаксическая ошибка в позиции [" + this.pos + "]: "
        + this._getErrorContext();
        
    _logError(desc);
    
    throw new _StreamParserSyntaxErrorException(desc, this.pos, methodId);
},

_StreamParser.prototype.errorUnexpectedEndOfStream = function(methodId) {
    var desc = this._methodIdRepr(methodId) + "Ошибка разбора потока: Неожиданный конец потока!";
    
    _logError(desc);
    
    throw new _StreamParserUnexpectedEndOfStreamExeption(desc, methodId);
}

/* Возвращает контекст ошибки: строку, в которой произошла ошибки и строки выше и ниже
этой строки. Перед позицией, в которой обнаружена ошибка будет добавлен маркер '<!>', 
выделенный дополнительно пробелами слева и справа (по одному пробелу). */
_StreamParser.prototype._getErrorContext = function() {
    
    var linesBefore = 1;
    var linesAfter = 1;
    
    var context = ' <!> '; // Маркер позиции ошибки.
    
    // Символы левее ошибки, включая одну строку выше строки с ошибкой.
    for (var i=this.pos-1; linesBefore >= 0 && i >= 0; i--)
    {      
        var ch = this.charAt(i);
        context = ch + context;
        
        if (ch == "\n")
            linesBefore--;                
    }
    
    // Символы правее ошибки, включая одну строку ниже строки с ошибкой.
    for (var i=this.pos; linesAfter >= 0 && i<this.len; i++)
    {
        var ch = this.charAt(i);
        context = context + ch;
        
        if (ch == "\n")
            linesAfter--;                
    }
    
    return context;
}

_StreamParser.prototype._methodIdRepr = function(methodId) {
    return (methodId ? ("[" + methodId + "]: ") : "" );
}

function _logError(message) {
    Message('StreamParser: ' + message);
}

//} Обработка ошибок алгоритма парсинга в StreamParser.

////} StreamParser









