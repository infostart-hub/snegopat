$engine JScript
$uname SyntaxAnalysis
$dname Класс SyntaxAnalysis
$addin global
$addin stdlib

////////////////////////////////////////////////////////////////////////////////////////
////{ Cкрипт-библиотека SyntaxAnalysis (SyntaxAnalysis.js) для проекта "Снегопат"
////
//// Описание: Реализует функционал по cинтаксическому анализу исходного кода на 
//// внутреннем языке 1С:Предприятия 8.
//// 
//// Основана на исходном коде скриптлета SyntaxAnalysis.wsc для проекта OpenConf.
////
//// Автор SyntaxAnalysis.wsc: Алексей Диркс <adirks@ngs.ru>  
//// Автор порта: Александр Кунташов <kuntashov@gmail.com>, http://compaud.ru/blog
////}
////////////////////////////////////////////////////////////////////////////////////////

SyntaxAnalysis = {};

SyntaxAnalysis.AnalyseTextDocument = function (textWindow) {
    return new _1CModule(textWindow)
}

SyntaxAnalysis.Create1CModuleContextDescription = function(initValueTable) {
    return new _1CModuleContextDescription(initValueTable);
}

SyntaxAnalysis.Create1CMethodDescription = function(parentModule) {
    return new _1CMethodDescription(parentModule);
}

////////////////////////////////////////////////////////////////////////////////////////
////{ Регулярные выражения для поиска конструкций встроенного языка 1С.
////TODO: 
////    - Удалить из регулярок определения метода Далее - не имеет смысла для 8.х
////    - Описать индексы и назначения группировок, подобно тому, как сделано для RE_VAR.
SyntaxAnalysis.RE_COMMENT       = new RegExp('^\\s*((?:(?:(?:"[^"]")*)|(?:[^/]*)|(?:[^/]+/))*)(//.*)?\\s*$', "");
/* Группировки: 1: Объявление метода (процедура/функция), 2: Имя метода, 3: Список параметров метода строкой, 4: "Далее" - имеет смысл только для 7.7. */
//SyntaxAnalysis.RE_PROC          = new RegExp('^\\s*((?:procedure)|(?:function)|(?:процедура)|(?:функция))\\s+([\\wА-яёЁ\\d]+)\\s*\\(([\\wА-яёЁ\\d\\s,.="\']*)\\)\\s*((?:forward)|(?:далее))?(.*)$', "i");
SyntaxAnalysis.RE_PROC              = new RegExp('^\\s*((?:procedure)|(?:function)|(?:процедура)|(?:функция))\\s+([\\wА-яёЁ\\d]+)\\s*\\(', 'i');
SyntaxAnalysis.RE_PARAM            = new RegExp('(?:(?:Val)|(?:Знач)\\s+)?([\\wА-яёЁ\\d]+)(\\s*=\\s*(?:(?:"[^"]")|(?:[^,)]*))*)?', "ig");
SyntaxAnalysis.RE_PARAM_END     = new RegExp('([\\wА-яёЁ\\d\\s,.="\']*)\\)(.*)', 'i');
SyntaxAnalysis.RE_PROC_END      = new RegExp('((?:EndProcedure)|(?:EndFunction)|(?:КонецПроцедуры)|(?:КонецФункции))', "i");
SyntaxAnalysis.RE_VARS_DEF      = new RegExp('^\\s*(?:(?:Var)|(?:Перем))\\s*([\\wА-яёЁ\\d,=\\[\\]\\s]*)(\\s+экспорт\\s*)?([\\s;]*)(.*?)$', "i");
/* Группировки: 1: Имя переменной, 2: Определение размерности массива, 3: Экспорт, 4: Конечный символ ("," или пусто - конец строки). */
SyntaxAnalysis.RE_VAR           = new RegExp('([\\wА-яёЁ\\d]+)\\s*(\\[[\\d\\s,]*\\])?(\\s+экспорт\\s*)?(?:\\s*(?:,|;|$))', "ig");
SyntaxAnalysis.RE_VAR_ASSIGN    = new RegExp('([\\wА-яёЁ\\d.]+)\\s*=\\s*(([^;]*);)?', "g");
SyntaxAnalysis.RE_CALL          = new RegExp('([\\wА-яёЁ\\d.]+)\\s*\\(', "g");
SyntaxAnalysis.RE_SPACE         = new RegExp('\\s+', "g");
//FIXME:RE_PROC_TORMOZIT  пока не используеться, т.к. нет определения НаКлиенте, НаСервере и т.д. для тонкого клиента. 
SyntaxAnalysis.RE_PROC_TORMOZIT = new RegExp('((Процедура|Функция)(?://[^\\n]*\\n|\\s|^|$)*([А-Яа-я_A-Za-z][А-Яа-я_A-Za-z\\d]*)(?://[^\\n]*\\n|\\s|^|$)*\\(([^\\)]*)\\)((?://[^\\n]*\\n|\\s|^|$)*Экспорт)?)((?:(?:"(?:(?:"")|[^"\\n$])*(?:(?://[^\\n]*\\n|\\s|^|$)*\\|(?:(?:"")|[^"\\n$])*)*(?:"|$)|\\.Конец(?:Процедуры|Функции)|\\r|\\n|.)*?))[^А-Яа-я_A-Za-z0-9\\."]Конец(?:Процедуры|Функции)[^А-Яа-я_A-Za-z0-9]|#[^\\n]*\\n|(?://[^\\n]*\\n|\\s|^|$)', 'igm')
SyntaxAnalysis.RE_PARAM_TORMOZIT = new RegExp('(?://[^\\n]*\\n|\\s|^|$)*(Знач\\s)?(?://[^\\n]*\\n|\\s|^|$)*([А-Яа-я_A-Za-z][А-Яа-я_A-Za-z0-9]+)(?://[^\\n]*\\n|\\s|^|$)*=?((?:(?://[^\\n]*\\n|\\s|^|$)*|("(?:(?:"")|[^"\\n$])*(?:(?://[^\\n]*\\n|\\s|^|$)*\\|(?:(?:"")|[^"\\n$])*)*(?:"|$))|(?:[^,\\n$]*))+)(?:,|$)','img');
SyntaxAnalysis.RE_CONTEXT      = new RegExp('^\\s*&\\s*(AtClientAtServerNoContext|AtServerNoContext|AtClientAtServer|AtServer|AtClient|НаСервереБезКонтекста|НаКлиентеНаСервереБезКонтекста|НаКлиентеНаСервере|НаКлиенте|НаСервере)\\s*', 'i')
SyntaxAnalysis.CONTEXT = { "atclientatservernocontext"   :"AtClientAtServerNoContext",
                        "atservernocontext"             :"AtServerNoContext",
                        "atclientatserver"              :"AtClientAtServer",
                        "atserver"                      :"AtServer",
                        "atclient"                      :"AtClient",
                        "насерверебезконтекста"         :"НаСервереБезКонтекста",
                        "наклиентенасерверебезконтекста":"НаКлиентеНаСервереБезКонтекста",
                        "наклиентенасервере"            :"НаКлиентеНаСервере",
                        "наклиенте"                     :"НаКлиенте",
                        "насервере"                     :"НаСервере"
                        }
//SyntaxAnalysis
//SyntaxAnalysis.RE_CRLF          = new RegExp('[\\n]+', "");
////} Регулярные выражения для поиска конструкций встроенного языка 1С.
    

SyntaxAnalysis.AnalyseParams = function(sourceCode, Meth) {
	var Matches;
    while( (Matches = SyntaxAnalysis.RE_PARAM_TORMOZIT.exec(sourceCode)) != null ) { 
        Meth.Params.push(Matches[2]);
    }
}
SyntaxAnalysis.AnalyseComments = function(sourceCode){
     var result = sourceCode;
     var Matches = SyntaxAnalysis.RE_COMMENT.exec(sourceCode);
     if( Matches != null )
        result = Matches[1];
     
     return result
}
SyntaxAnalysis.AnalyseModule = function (sourceCode, initValueTable, textWindow) {
    
    var Meth;
    var stStart = 0, stInProc = 1, stInModule = 2, stInVarsDef;
    var state = stStart, PrevState;
    var Match;
    var Context = "";

    var rootObject = metadata.current.rootObject;

    if(textWindow == undefined){

    } else {
        if (textWindow.mdCont){
            rootObject = textWindow.mdCont.rootObject;
        }
    }

    var cacheMetadata = [];
    
    var moduleContext = SyntaxAnalysis.Create1CModuleContextDescription(initValueTable);
        
    var proc_count = 0;
    var Lines = sourceCode.split("\n");
    var n = Lines.length;
    var i = 0; 
    var nextPart = '';
    while (i < n)
    {
        var str = '';
        
        if (nextPart) 
        {
            str = nextPart;
        }
        else
        {
            str = this.AnalyseComments(Lines[i]);
        }
        
        switch( state )
        {
        case stStart:        
        case stInModule:
            var Matches = SyntaxAnalysis.RE_CONTEXT.exec(str);
            if (Matches!=null) {
                Context = SyntaxAnalysis.CONTEXT[(""+Matches[1]).toLowerCase()];
            }
            Matches = SyntaxAnalysis.RE_PROC.exec(str);
            if( Matches != null )
            {
                    Meth = SyntaxAnalysis.Create1CMethodDescription(moduleContext);
                    Meth.Name = Matches[2];
                    Meth.StartLine = i;                    
                    Meth.IsProc = (Matches[1].toLowerCase() == 'процедура' || Matches[1].toLowerCase() == 'procedure');
                    
                    Meth.Context = (Context.length>0)?Context:"НаСервере"; //Пока только для тонкого клиента. 
                    str = str.substr(Matches.lastIndex);
                    var strParams = '';
                    Matches = SyntaxAnalysis.RE_PARAM_END.exec(str);
                    if (Matches!=null) {
                        strParams = Matches[1]
                    } else {
                        strParams = ''+str;
                        i++;
                        while (i<n) { 
                            str = this.AnalyseComments(Lines[i]);
                            if ((Matches = SyntaxAnalysis.RE_PARAM_END.exec(str))!=null) {
                                strParams = strParams+"\n"+Matches[1]
                                break;
                            } else {
                                strParams = strParams+"\n"+str;
                            }
                            i++;
                        }
                    }
                    this.AnalyseParams(strParams, Meth);
                    var endproc = Matches[2]
                    
                    moduleContext.addMethod(Meth); 
                    proc_count++;
                    state = stInProc;
                    if( (Match = SyntaxAnalysis.RE_PROC_END.exec(endproc)) != null )
                    {
                        state = stInModule;
                        nextPart = endproc.substr(SyntaxAnalysis.RE_PROC_END.lastIndex);
                        if (nextPart)
                            continue;
                    }
                
            }
            else if ((Matches = SyntaxAnalysis.RE_VARS_DEF.exec(str)) != null)
            {
                str = Matches[1];
                nextPart = Matches[4];
                while( (Matches = SyntaxAnalysis.RE_VAR.exec(str)) != null )
                {
                    if( PrevState == stInProc )
                        Meth.addVar(Matches[1]);
                    else
                        moduleContext.addVar(Matches[1]);
                }
                
                if (nextPart)
                    continue;
                
                str = str.replace(SyntaxAnalysis.RE_SPACE, "");
                if( str.substr(str.length-1) == ";" )
                {
                    state = PrevState;
                } 
                else if (str.substr(str.length-1) == ",")
                {
                    PrevState = state;
                    state = stInVarsDef;
                }
                break;            
            }
            break;
            
        case stInProc:
        
            Matches = SyntaxAnalysis.RE_PROC_END.exec(str);
            if( Matches != null )
            {
                if( state == stInProc ) Meth.EndLine = i;
                state = stInModule;
            }
            else if( (Matches = SyntaxAnalysis.RE_VARS_DEF.exec(str)) != null )
            {
                var exported = Matches[2];
                var semicolon = Matches[3].replace(SyntaxAnalysis.RE_SPACE, "");
                str = Matches[1];
                while( (Matches = SyntaxAnalysis.RE_VAR.exec(str)) != null )
                {
                    if( state == stInProc )
                        Meth.addVar(Matches[1]);
                    else
                        moduleContext.addVar(Matches[1]);
                }
                if( semicolon != ";" )
                {
                    PrevState = state;
                    state = stInVarsDef;
                }
            }
            else
            {
                while( (Matches = SyntaxAnalysis.RE_VAR_ASSIGN.exec(str)) != null )
                {
                    var varName = Matches[1];                    
                    
                    if( varName.indexOf(".", 0) >= 0 ) continue;
                    
                    if (state == stInProc)
                        Meth.addVar(varName, null, true); // automatic var
                    else
                        moduleContext.addVar(varName);
                }
                
                if( state == stInProc )
                {
                    while( (Matches = SyntaxAnalysis.RE_CALL.exec(str)) != null )
                    {
                        if( Matches[1].indexOf('.') >= 0 ){

                            addToCalls = false;
                            callArray =  Matches[1].split(".");

                            mdObject = rootObject;

                            if (callArray.length > 2){
                                //Это по документам, справочникам и т.д. идем.
                                //metadataName = Matches[1].slice(0, Matches[1].indexOf('.'));
                                try{
                                    mdObject = rootObject.childObject(callArray[0], callArray[1]);
                                    if(mdObjec.name.toString().length>0){
                                        addToCalls = true;
                                    }
                                        
                                } catch(e){}
                            } else if(callArray.length > 1 && callArray[0].length > 0) {
                                //Тут по общим модулям пройдемся. 
                                try{
                                    mdObject = rootObject.childObject("ОбщиеМодули", callArray[0]);
                                    if(mdObjec.name.toString().length>0){
                                        addToCalls = true;
                                    }
                                } catch(e){}
                            } 

                            //if(walkMetadata(rootObject, metadataName, cacheMetadata)){
                            if(addToCalls){
                                if(Meth.Calls.indexOf(Matches[1]) >= 0) continue;
                                Meth.Calls.push(Matches[1]);

                            }

                            //Сделаем поиск по общим модулям или под документам, вдруг там у нас статический вызов. 
                            //var mdRef = metadata.current.rootObject.childObject("Справочники", "Номенклатура")
                        }
                        if( Meth.Calls.indexOf(Matches[1]) >= 0) continue;
                        Meth.Calls.push(Matches[1]);
                    }
                }
            }
            break;  

        case stInVarsDef:
        
            while( (Matches = SyntaxAnalysis.RE_VAR.exec(str)) != null )
            {
                if( PrevState == stInProc )
                    Meth.addVar(Matches[1]);
                else
                    moduleContext.addVar(Matches[1]);
            }
            str = str.replace(SyntaxAnalysis.RE_SPACE, "");
            if( str.substr(str.length-1) == ";" )
                state = PrevState;
            break;
            
        }
        
        i++;
        nextPart = '';
    }

    return moduleContext;
}

////////////////////////////////////////////////////////////////////////////////////////
////{ _1CModule

function _1CModule(textWindow) {
    this.textWindow = textWindow;
    this.context = SyntaxAnalysis.AnalyseModule(this.textWindow.GetText(), true, this.textWindow);
}

/* Возвращает исходный код метода по названию метода. */
_1CModule.prototype.getMethodSource = function(methodName) {
    var method = this.context.getMethodByName(methodName);
    if (!method) return undefined;
    return this.textWindow.Range(method.StartLine + 1, 1, method.EndLine + 1).GetText();
}

/* Возвращает таблицу значений с описаниями методов модуля. */
_1CModule.prototype.getMethodsTable = function() {
    return this.context._vtAllMethods.Copy();
}

/* Возвращает описание метода по номеру строки, находящейся внутри метода. */
_1CModule.prototype.getMethodByLineNumber = function (lineNo) {

    var methods = this.context.Methods;
    
    for (var i=0; i<methods.length; i++)
    {
        /* Помним, что нумерация строк начинается с 1, 
        а строки модуля в SyntaxAnalysis проиндексированы с 0. */
        if (methods[i].StartLine + 1 <= lineNo && lineNo <= methods[i].EndLine + 1)
            return methods[i];
    }
    
    return undefined;
}

/* Возвращает описание метода, которому принадлежит текущая строка 
(строка, в которой находится курсор). */
_1CModule.prototype.getActiveLineMethod = function () {
    var pos = this.textWindow.GetCaretPos();
    return this.getMethodByLineNumber(pos.beginRow);
}

////} _1CModule

////////////////////////////////////////////////////////////////////////////////////////
////{ _1CModuleContextDescription

function _1CModuleContextDescription(initValueTable) {

    // Массив всех методов модуля.
    this.Methods = new Array();
        
    // Ассоциативный массив Имя метода -> _1CMethodDescription
    this._methodsByName = {};
    
    // Массив всех явным образом объявленных переменных модуля.
    this.ModuleVars = new Array();        
    
    // Ассоциативный массив Имя переменной -> Тип переменной (пока тип всегда null).
    this._moduleVarsTypes = {};
    
    this._vtAllMethods = null;
    if (initValueTable) 
    {
        var v8Type_String = v8New('TypeDescription', 'Строка', undefined, v8New('StringQualifiers', 255));
        var v8Type_Number = v8New('TypeDescription', 'Число', v8New('NumberQualifiers', 10, 0));
        var v8Type_Boolean = v8New('TypeDescription', 'Булево');
    
        this._vtAllMethods = v8New('ValueTable');
        var cols = this._vtAllMethods.Columns;
        // Добавляем колонки.
        cols.Add('Name', v8Type_String, 'Имя процедуры/функции');
        cols.Add('IsProc', v8Type_Boolean, 'Процедура');
        cols.Add('StartLine', v8Type_Number, 'N первой строки');
        cols.Add('EndLine', v8Type_Number, 'N последней строки');
        cols.Add('Context', v8Type_String, 'Контекст компиляции модуля');
        
        cols.Add('_method'); // _1CMethodDescription
    }
}

_1CModuleContextDescription.prototype.addMethod = function (method) {

    if (this._methodsByName[method.name])
        Message('Метод ' + method.name + 'уже был объявлен ранее в этом модуле!');
        
    this.Methods.push(method);
    this._methodsByName[method.Name] = method;
    
    // Добавляем метод в таблицу значений.
    if (this._vtAllMethods) 
    {
        var methRow = this._vtAllMethods.Add();
        methRow.Name = method.Name;
        methRow.IsProc = method.IsProc;
        methRow.StartLine = method.StartLine;
        methRow.EndLine = method.EndLine;
        methRow.Context = method.Context;
        methRow._method = method;
    }
}

_1CModuleContextDescription.prototype.getMethodByName = function (name) {
    return this._methodsByName[name];
}

_1CModuleContextDescription.prototype.addVar = function (name, type, auto) {
    if (this._moduleVarsTypes[name] === undefined)
    {
        this._moduleVarsTypes[name] = (type === undefined) ? null : type;
        this.ModuleVars.push(name);
    }
}

_1CModuleContextDescription.prototype.getVarType = function (name) {
    return this._moduleVarsTypes[name];
}

////} _1CModuleContextDescription

////////////////////////////////////////////////////////////////////////////////////////
////{ _1CMethodDescription

function _1CMethodDescription(parentModule) {
        
    // Идентификатор (имя) метода.
    this.Name = "";
    
    // Тип метода. Если истина - то это Процедура, иначе - это функция.
    this.IsProc = false;

    // Массив параметров метода.
    this.Params = new Array();
    
    // Массив явным образом объявленных переменных.
    this.DeclaredVars = new Array();
    
    // Массив автоматических локальных переменных (не объявленных явным образом).
    this.AutomaticVars = new Array();
    
    // Список вызовов: массив методов, вызываемых из данного метода.
    this.Calls = new Array();
    
    // Номер строки объявления метода.
    this.StartLine = 0;
    
    // Номер строки завершения объявления метода.
    this.EndLine = 0;
    
    // Ассоциативный массив Имя переменной -> Тип переменной (пока тип всегда null).
    this._varsTypes = {};
    
    // Контекст модуля, в котором объявлен данный метод (_1CModuleContextDescription).
    this.parentModule = parentModule;
}

_1CMethodDescription.prototype.addVar = function (name, type, auto) {
        
    if (this._varsTypes[name] === undefined)
    {    
        if (this.Params.indexOf(name) >= 0) 
            return;
            
        if (this.parentModule && this.parentModule.getVarType(name) !== undefined) 
            return;
    
        this._varsTypes[name] = (type === undefined) ? null : type;
        
        if (auto)
            this.AutomaticVars.push(name);
        else
            this.DeclaredVars.push(name);
    }
}

_1CMethodDescription.prototype.getVarType = function (name) {
    return this._varsTypes[name];
}


////} _1CMethodDescription

////////////////////////////////////////////////////////////////////////////////////////
////{ Вспомогательные функции объекта Array
if(!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(searchElement, fromIndex) {
        for(var i = fromIndex||0, length = this.length; i<length; i++)
            if(this[i] === searchElement) return i;
        return -1
    };
};
////} Вспомогательные функции объекта Array