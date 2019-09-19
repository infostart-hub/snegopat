/*  lexer.as
   Лексеры и парсеры
   Как скриптовые, так и встроенные в снегопат
*/
#pragma once
#include "../../all.h"

// Для совместимости со SnegAPI
enum Lexems {
    ltUnknown,		// Un
    ltRemark,		// Rm
    ltQuote,		// Qt
    ltDate,			// Dt
    ltNumber,		// Nu
    ltPreproc,		// Pr
    ltDirective,	// Dr
    ltLabel,		// Lb
    ltLPar,			// Lp
    ltRPar,			// Rp
    ltLBrt,			// Lr
    ltRBrt,			// Rr
    ltEqual,		// Eq
    ltComma,		// Cm
    ltSemicolon,	// Sc
    ltPlus,			// Pl
    ltMinus,		// Mn
    ltMult,			// Mu
    ltDivide,		// Dv
    ltMod,			// Mo
    ltQuestion,		// Qs
    ltPeriod,		// Pd
    ltLess,			// Ls
    ltLessEq,		// Le
    ltGrat,			// Gt
    ltGratEq,		// Ge
    ltNotEq,		// Ne
    ltName,			// Nm Idx
    ltIf,			// If
    ltThen,			// Th
    ltElsIf,		// Es
    ltEndIf,		// Ei
    ltElse,			// El
    ltFor,			// Fo
    ltEach,			// Ea
    ltIn,			// In
    ltTo,			// To
    ltWhile,		// Wl
    ltDo,			// Do
    ltEndDo,		// Ed
    ltProcedure,	// Pc
    ltFunction,		// Fu
    ltEndProcedure,	// Ep
    ltEndFunction,	// Ef
    ltVar,			// Va
    ltGoto,			// Go
    ltReturn,		// Re
    ltContinue,		// Co
    ltBreak,		// Br
    ltAnd,			// An
    ltOr,			// Or
    ltNot,			// Nt
    ltTry,			// Tr
    ltExcept,		// Ec
    ltRaise,		// Rs
    ltEndTry,		// Et
    ltNew,			// Nw
    ltExecute,		// Eu
    ltTrue,			// Tu
    ltFalse,		// Fl
    ltAddHandler,	// Ah
    ltRemoveHandler,// Rh
    ltExport,		// Ex
    ltNull,			// Nl
    ltUndefined,	// Uf
    ltVal,			// Vl
};

// Возможные варианты запуска программы, влияют на состав символов препроцессора
enum PreprocContextTypes {
    pctServer = 1,							// Сервер
    pctExtConnect = 2,						// Внешнее соединение
    pctThickClientOrdinaryApplication = 4,	// Толстый клиент обычное приложение
    pctThickClientManagedApplication = 8,	// Толстый клиент управляемое приложение
    pctThinClient = 16,						// Тонкий клиент
    pctWebClient = 32,						// Веб клиент
    pctFS_Server_ThickOrdinary = 64,		// Файловая версия, толстый клиент обычное приложение
    pctFS_Server_ThickManaged = 128,		// Файловая версия, толстый клиент управляемое приложение
    pctFS_Server_ExtCnn = 256,				// Файловая версия COM-соединение
    pctMobServer = 512,						// Мобильное Приложение Сервер
    pctMobClient = 1024,					// Мобильное Приложение Клиент

    pctCount = 11, pctLast = pctMobClient,
};

// Виды доступности методов
enum AccessModes {
    amSrv = 1,
    amThk = 2,
    amThn = 4,
    amWeb = 8,
    amExt = 16,
    amMSr = 32,
    amMCl = 64,
    amCount = 7,
};

enum ParseMethodFlags {
    allowProcedure      = 1 << 0,
    allowFunction       = 1 << 1,
    allowModuleVar      = 1 << 2,
    allowGCProp         = 1 << 3,
    allowNewTypes       = 1 << 4,
    allowObjMethods     = 1 << 5,
    allowObjProps       = 1 << 6,
    nothingToDone       = 1 << 7,
    inExpression        = 1 << 8,
    inFunction          = 1 << 9,
    inProcedure         = 1 << 10,
    inSelectHandler     = 1 << 11,
    wantCollection      = 1 << 12,
    wantHandlers        = 1 << 13,
    wantProcName        = 1 << 14,
    wantFuncName        = 1 << 15,
    wantMVarName        = 1 << 16,
    wantLVarName        = 1 << 17,
    wantParamName       = 1 << 18,
    wantTypeName        = 1 << 19,
    wantDefVal          = 1 << 20,
    inIndex             = 1 << 21,
    afterCompare        = 1 << 22,
    needFastReparse     = 1 << 23,
    allowDirective      = 1 << 24,
    hasParam            = 1 << 25,
    hasParamNew         = 1 << 26,
    noSemicolon         = 1 << 27,
};

enum LocalVarType {
    lvParam,
    lvVar,
    lvAuto 
};

enum execContextTypes {
    ecNone,
    ecAtServer,
    ecAtClient,
    ecAtClientAtServer,
    ecAtServerNoContext,
    ecAtClientAtServerNoContext,
};

// Кое-какие регэкспы. Пока нормальный парсер не портировал, используем их
RegExp quotesRex("""["\|][^"]*(?:["\n]|$)""");    // Для определения, заканчивается ли строка текста открытым литералом (т.е. без завершающей кавычки)
RegExp indentRex("^\\s*");  // Получение отступа строки
RegExp extractFileNameRex("[^\\\\/]+$");
RegExp extractFileExtRex("(?<\\.)[^\\.]*$");
RegExp whiteSpaceRex("\\s+");
RegExp ucaseLetterRex("\\p{Upper}");
RegExp scriptTagsRex("""^(?://(\w+)\:|\$(\w+))[ \t]*(.*?)\s*?\n""");
RegExp newlines("\\n");

// Проверка, завершается ли строка текста открытым литералом
bool isLineEndWithOpenQuote(const string& line) {
    auto res = line.match(quotesRex);
    return res.matches > 0 && (res.len(res.matches - 1, 0) == 1 || res.text(res.matches - 1, 0).substr(-1) != "\"");
}

// Функция для чтения содержимого текстового файла.
// Чтение осуществляется с помощью встроенного объекта 1С "ТекстовыйДокумент".
// Можно указать кодировку текста.
bool readTextFile(v8string& result, const string& path, const string& encoding = "") {
    IContext&& textDoc;
    currentProcess().createByClsid(CLSID_TxtEdtDoc, IID_IContext, textDoc);
    if (textDoc is null)
        return false;
    IContextDef&& pCtxDef = textDoc;
    int methPos = pCtxDef.findMethod("Read");
    if (methPos < 0)
        return false;
    ValueParamsVector params(3);
    params.values[0] = path;
    
    if (encoding.isEmpty())
        pCtxDef.getParamDefValue(methPos, 1, params.values[1]);
    else
        params.values[1] = encoding;
    pCtxDef.getParamDefValue(methPos, 2, params.values[2]);
   
    textDoc.callMeth(methPos, params.retVal, params.args);
    
    ITextManager&& itm = textDoc.unk;
    itm.getTextManager().save(result);
    return true;
}

class ValueParamsVector {
    Vector args;
    array<Value>&& values;
    Value retVal;

    ValueParamsVector(uint argsCount = 0) {
        &&values = array<Value>(argsCount);
        if (argsCount > 0) {
            args.allock(argsCount, sizeof_ptr);
            for (uint i = 0; i < argsCount; i++)
                mem::int_ptr[args.start + i * sizeof_ptr] = values[i].self;
        }
    }
};

class ILexem {
    protected lexem lex;
    protected IV8Lexer&& owner;
    ILexem(const lexem& l, IV8Lexer&& o) {
        lex = l;
        &&owner = o;
    }

    Lexems get_type() {
        return Lexems(lex.type);
    }
    uint get_start() {
        return lex.start;
    }
    uint get_length() {
        return lex.length;
    }
    uint get_line() {
        return lex.line;
    }
    string get_text() {
        return lex.text;
    }
};

class IV8Lexer {
    IV8Lexer(const string& t, uint sl) {
        //uint t1 = GetTickCount();
        _text = t;
        lex_provider lp(_text.cstr, sl);
        lexem lex;
        array<string> reParts;
        reParts.reserve(_text.length / 4);
        uint idxOfReStr = 0, lexNum = 0;
        while (lp.nextWithKeyword(lex)) {
            lex.type = lexType(lex.type);
            lexems.insertLast(ILexem(lex, this));
            if (lex.type != lexRemark) {
                lexemPos.insert(idxOfReStr, lexNum);
                if (lex.type == ltName) {
                    string name = lex.text;
                    int idxOfName;
                    auto find = findNames.find(name);
                    if (find.isEnd()) {
                        idxOfName = names.length;
                        names.insertLast(name);
                        findNames.insert(name, idxOfName);
                    } else
                        idxOfName = find.value;
                    reParts.insertLast("Nm" + formatInt(idxOfName, "0", 6));
                    //_reStream += "Nm" + formatInt(idxOfName, "0", 6);
                    idxOfReStr += 8;
                } else {
                    reParts.insertLast(lexAbbr.substr(2 * lex.type, 2));
                    //_reStream += lexAbbr.substr(2 * lexType(lex.type), 2);
                    idxOfReStr += 2;
                }
            }
            lexNum++;
        }
        _reStream = join(reParts, "");
        //t1 = GetTickCount() - t1;
        //Message("Text with length=" + _text.length + " parsed for " + t1 + " msec. Lexem=" + lexems.length + " names=" + names.length);
        /*for (uint i = 0, im = names.length; i < im ; i++) {
            Message(names[i]);
        }*/
    }
    protected array<ILexem&&> lexems;
    protected array<string> names;
    protected NoCaseMap<uint> findNames;
    protected UintMap<uint> lexemPos;
    string _text;
    string _reStream;
    uint get_lexemCount() {
        return lexems.length;
    }
    ILexem&& lexem(uint idx) {
        return idx < lexems.length ? lexems[idx] : null;
    }
    uint get_namesCount() {
        return names.length;
    }
    string name(uint idx) {
        return idx < names.length ? names[idx] : string();
    }
    int idxOfName(const string& name) {
        auto fnd = findNames.find(name);
        return fnd.isEnd() ? -1 : fnd.value;
    }
    int posToLexem(uint posInReStream) {
        auto find = lexemPos.find(posInReStream);
        return find.isEnd() ? -1 : find.value;
    }
    string strNameIdx(const string& name) {
        auto fnd = findNames.find(name);
        return fnd.isEnd() ? string() : "Nm" + formatInt(fnd.value, "0", 6);
    }
};

Lexems lexType(uint t) {
    switch (t) {
    case lexRemark:      // комментарий
        return ltRemark;
    case lexQuote:       // в кавычках
    case lexQuoteOpen:   // в открытых кавычках (нет завершающей кавычки)
        return ltQuote;
    case lexDate:        // дата
    case lexDateOpen:    // дата без завершающего апострофа
        return ltDate;
    case lexNumber:      // число
        return ltNumber;
    case lexPreproc:     // инструкция препроцессора
        return ltPreproc;
    case lexDirective:   // директива выполнения
        return ltDirective;
    case lexLabel:       // метка
        return ltLabel;
    case lexLPar:        // (
        return ltLPar;
    case lexRPar:        // )
        return ltRPar;
    case lexLBrt:        // [
        return ltLBrt;
    case lexRBrt:        // ]
        return ltRBrt;
    case lexEqual:       // =
        return ltEqual;
    case lexComma:       // ,
        return ltComma;
    case lexSemicolon:   // ;
        return ltSemicolon;
    case lexPlus:        // +
        return ltPlus;
    case lexMinus:       // -
        return ltMinus;
    case lexMult:        // *
        return ltMult;
    case lexDivide:      // /
        return ltDivide;
    case lexMod:         // %
        return ltMod;
    case lexQuestion:    // ?
        return ltQuestion;
    case lexPeriod:      // .
        return ltPeriod;
    case lexLess:        // <
        return ltLess;
    case lexLessEq:      // <=
        return ltLessEq;
    case lexGrat:        // >
        return ltGrat;
    case lexGratEq:      // >=
        return ltGratEq;
    case lexNotEq:       // <>
        return ltNotEq;
    case lexName:        // идентификатор
        return ltName;
        // Ключевые слова
    case kwIf:
        return ltIf;
    case kwThen:
        return ltThen;
    case kwElsIf:
        return ltElsIf;
    case kwEndIf:
        return ltEndIf;
    case kwElse:
        return ltElse;
    case kwFor:
        return ltFor;
    case kwEach:
        return ltEach;
    case kwIn:
        return ltIn;
    case kwTo:
        return ltTo;
    case kwWhile:
        return ltWhile;
    case kwDo:
        return ltDo;
    case kwEndDo:
        return ltEndDo;
    case kwProcedure:
        return ltProcedure;
    case kwFunction:
        return ltFunction;
    case kwEndProcedure:
        return ltEndProcedure;
    case kwEndFunction:
        return ltEndFunction;
    case kwVar:
        return ltVar;
    case kwGoto:
        return ltGoto;
    case kwReturn:
        return ltReturn;
    case kwContinue:
        return ltContinue;
    case kwBreak:
        return ltBreak;
    case kwAnd:
        return ltAnd;
    case kwOr:
        return ltOr;
    case kwNot:
        return ltNot;
    case kwTry:
        return ltTry;
    case kwExcept:
        return ltExcept;
    case kwRaise:
        return ltRaise;
    case kwEndTry:
        return ltEndTry;
    case kwNew:
        return ltNew;
    case kwExecute:
        return ltExecute;
    case kwTrue:
        return ltTrue;
    case kwFalse:
        return ltFalse;
    case kwAddHandler:
        return ltAddHandler;
    case kwRemoveHandler:
        return ltRemoveHandler;
    case kwExport:
        return ltExport;
    case kwNull:
        return ltNull;
    case kwUndefined:
        return ltUndefined;
    case kwVal:
        return ltVal;
    }
    return ltUnknown;
}

const string lexAbbr = "UnRmQtDtNuPrDrLbLpRpLrRrEqCmScPlMnMuDvMoQsPdLsLeGtGeNeNmIfThEsEiElFoEaInToWlDoEdPcFuEpEfVaGoReCoBrAnOrNtTrEcRsEtNwEuTuFlAhRhExNlUfVl";

// Метод получает текст текущего метода до текущей позиции каретки.
// Началом метода считаются либо ключевые слова Процедура/Функция, либо текст после слов КонецПроцуры/КонецФункции, либо всё от начала модуля.
// После нахождения начала метода к нему также ищется директива, а также определяется первая виртуальная лексема для парсера текста.
LexemTypes getMethodText(TextManager& pTextManager, uint& line, uint col, bool bOnlyMeths, string&out methodText, execContextTypes&out directive) {
    directive = ecNone;
    uint startLine = line;
    array<string> lines;
    IUnknown&& cashObject;
    pTextManager.getCashObject(cashObject);
    lex_provider lexSrc;
    lexem lex;
    v8string wline;
    pTextManager.getLineFast(line, wline, cashObject);
    col--;
    string currLine = wline.str.rtrim("\r\n").padRight(' ', col);
    currLine.setLength(col);
    int typeOfMethodBegin = 0;
    // Ищем строку с началом метода
    for (;;) {
        // Парсим строку
        lexSrc.setSource(currLine.cstr);
        while (lexSrc.nextWithKeyword(lex)) {
            if (lex.type == kwProcedure || lex.type == kwFunction) {
                typeOfMethodBegin = 1;
                int pos = lex.start - lexSrc.start;
                if (pos > 0) {
                    lines.insertLast(currLine.substr(pos));
                    currLine = currLine.substr(0, pos);
                } else {
                    lines.insertLast(currLine);
                    currLine.empty();
                }
                break;
            } else if (lex.type == kwEndProcedure || lex.type == kwEndFunction) {
                lines.insertLast(currLine.substr(lex.start - lexSrc.start) + lex.length);
                typeOfMethodBegin = 2;
                break;
            }
        }
        if (typeOfMethodBegin > 0)
            break;
        lines.insertLast(currLine);
        if (--line == 0)
            break;
        pTextManager.getLineFast(line, wline, cashObject);
        currLine = wline.str;
    }
    if (typeOfMethodBegin == 1) {   // Начинается с Процедура/Функция
        // возможно есть директива перед методом
        string textBeforeMethod = "";
        uint testLine = line;
        for (;;) {
            // Найдем последнюю лексему в строке
            lexSrc.setSource(currLine.cstr);
            lexem lastLexem;
            while (lexSrc.nextWithKeyword(lex)) {
                if (lex.type == lexRemark)
                    break;
                else
                    lastLexem = lex;
            }
            if (!lastLexem.isEmpty()) {
                // В строке последней была значащая лексема
                if (lastLexem.type == lexDirective) {
                    directive = execContextTypes(parseDirective(lastLexem));
                    if (directive != ecNone) {
                        lines.insertLast(currLine.substr(lastLexem.start - lexSrc.start) + textBeforeMethod);
                        line = testLine;
                    }
                }
                break;
            }
            textBeforeMethod += currLine;
            testLine--;
            if (testLine == 0)
                break;
            pTextManager.getLineFast(testLine, wline, cashObject);
            currLine = wline.str;
        }
    }
    lines.reverse();
    methodText = join(lines, "");
    // Теперь надо выяснить первую виртуальную лексему
    if (bOnlyMeths)     // В модуле всё-равно возможны только методы
        return onlyMeths;
    else if (typeOfMethodBegin == 1) // Мы и так внутри метода, виртуальную лексему не надо
        return lexUnknown;
    else if (typeOfMethodBegin == 2) {
        // А вот тут мы находимся за каким-то методом.
        // Надо проверить следующие строки. Если в них начало метода,
        // то разрешить только методы, иначе методы и стэйтменты
        uint maxLine = pTextManager.getLinesCount();
        while (++startLine <= maxLine) {
            pTextManager.getLineFast(startLine, wline, cashObject);
            lexSrc.setSource(wline.cstr);
            while (lexSrc.nextWithKeyword(lex)) {
                if (lex.type == lexRemark || lex.type == lexPreproc)
                    continue;
                else if (lex.type == kwProcedure || lex.type == kwFunction || lex.type == lexDirective)
                    return onlyMeths;
                else
                    return onlyMethsAndStatements;
            }
        }
        return onlyMethsAndStatements;
    } else // Мы в начале модуля - разрешить только переменные и методы
        return onlyVarsAndMethods;
}
