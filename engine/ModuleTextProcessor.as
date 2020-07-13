// ModuleTextProcessor.as
#pragma once
#include "../../all.h"

ParseMethodResult&& lastParseMethodResult;
bool enableAutoReplaces;
OptionsEntry oeEnableAutoReplaces("Autoreplace", function(v) { v = true; },
    function(v) { v.getBoolean(enableAutoReplaces); },
    function(v) { v.getBoolean(enableAutoReplaces); return false; });

bool enableSmartEnter;
OptionsEntry oeEnableSmartEnter("EnableSmartEnter", function(v) { v = true; },
    function(v) { v.getBoolean(enableSmartEnter); },
    function(v) { v.getBoolean(enableSmartEnter); return false; });

bool enableSnegoList;
OptionsEntry oeEnableSnegoList("EnableSmartList", function(v) { v = true; },
    function(v) { v.getBoolean(enableSnegoList); },
    function(v) { v.getBoolean(enableSnegoList); return false; });

uint qaCharsCount;
OptionsEntry oeQACharsCount("QuickActivateCharsCount", function(v){v = 1; },
    function(v){Numeric n; v.getNumeric(n); qaCharsCount = n; },
    function(v){Numeric n; v.getNumeric(n); qaCharsCount = n; return false; });

// Данные редактора для текстового процессора модулей. Пока хранит только флаг нужности показа списка
class ModuleEditorData : EditorData {
    bool needQuickActivate;
    ModuleEditorData() {
        needQuickActivate = true;
    }
};

// Контексты срабатывания подсказки снегопата
enum ActivateModes {
    modeNone,       // нет контекста
    modeQuote,      // внутри кавычек
    modeName,       // обычный режим, в идентификаторе
    modePreproc     // в инструкции препроцессора
};

string getTextLine(TextManager&& tm, uint line) {
    v8string s;
    IUnknown&& u;
    tm.getCashObject(u);
    tm.getLineFast(line, s, u);
    return s.str;
}

void getTextLine(TextManager&& tm, uint line, v8string& s) {
    IUnknown&& u;
    tm.getCashObject(u);
    tm.getLineFast(line, s, u);
}

bool my_is_alpha(wchar_t symbol) {
    return mem::byte[symbolClassTable + symbol] == symbAlpha;
}

bool my_is_alnum(wchar_t symbol) {
    return mem::byte[symbolClassTable + symbol] == symbAlpha || (symbol >= '0' && symbol <= '9');
}

bool is_first_name_symbol(wchar_t symbol) {
    return my_is_alpha(symbol) || '_' == symbol;
}

bool is_name_symbol(wchar_t symbol) {
    return my_is_alnum(symbol) || '_' == symbol;
}

// Выяснить контекст вызова подсказки
// также возвращает начало текущей строки до каретки и последнюю лексему в ней.
ActivateModes getActivateMode(TextManager&& tm, const TextPosition&in caretPos, string& beginOfLine, string& lastLexem) {
    uint symbolsToCaret = caretPos.col - 1;
    beginOfLine = getTextLine(tm, caretPos.line).rtrim("\r\n").padRight(' ', symbolsToCaret);
    beginOfLine.setLength(symbolsToCaret);

    lex_provider source(beginOfLine.cstr);
    lexem lex;
    do {
        source.next(lex);
    } while (!(lex.isEmpty() || source.atEnd()));

    if (lexPreproc == lex.type)
        return modePreproc;
    else if (lexRemark == lex.type || lexNumber == lex.type || lexDateOpen == lex.type || lexDate == lex.type)
        return modeNone;
    else if (lexQuoteOpen == lex.type)// Внутри строки
        return modeQuote;
    else {
        if (lexName == lex.type || lexDirective == lex.type)
            lastLexem = lex.text;
        return modeName;
    }
}

class ModuleTextProcessor : TextProcessor, ModuleTextSource {
    uint lastMethodBeginLine = 0;
    ModuleElements&& moduleElements;
    TextDoc&& td;

    void getModuleSourceText(v8string& text) {
        td.tm.save(text);
    }
    // Подключение к и отключение от текстового документа
    void setTextDoc(TextDoc&& textDoc) {
        //Print("ModuleTextProcessor connect to doc");
        if (textDoc !is null) { // Подключение к текстовому документу
            // Проверим, не является ли он каким-либо модулем объекта метаданных
            // и если да, то надо поискать, не создан ли уже для него парсер структуры
            // модуля. Например, мы открыли для редактирования общий модуль со свойством "Глобальный".
            if (textDoc.mdInfo is null) {    // Просто текст, для которого выбрали расширение "Встроенный язык"
                &&moduleElements = ModuleElements();    // Просто создадим новый парсер структуры модуля
                &&moduleElements.source = this;
            } else // Получим возможно уже существующий парсер модуля с установкой ему себя как источник текста модуля
                &&moduleElements = getModuleElementsParser(textDoc.mdInfo.object, textDoc.mdInfo.mdPropUuid, this);
        } else {    // Нас отключают от документа перед его закрытием
            if (td !is null && td.mdInfo !is null) // Если мы подключались к парсеру модуля, удалим его
                removeModuleElementsParser(moduleElements, td.mdInfo.object, td.mdInfo.mdPropUuid);
            &&moduleElements = null;
        }
        &&td = textDoc;
    }

    void connectEditor(TextWnd&& editor) { &&editor.editorData = ModuleEditorData(); }
    bool onChar(TextWnd&& editor, wchar_t symbol) {
        return enableSmartEnter && symbol == '\r' && (GetKeyState(VK_SHIFT) & 0x8000) == 0 && beforeSmartEnter(editor);
    }
    void afterChar(TextWnd&& editor, wchar_t symbol) {
        if (editor !is activeTextWnd)
            return;
        if (!enableAutoReplaces && !enableSmartEnter && (!enableSnegoList || (symbol != 0 && qaCharsCount == 0)))
            return;
        bool bItsNameSymbol = is_name_symbol(symbol);
        ModuleEditorData&& pData = cast<ModuleEditorData>(editor.editorData);
        if (!bItsNameSymbol)
            pData.needQuickActivate = true;
        TextPosition caretPos;
        //dumpVtable(&&editor.ted);

        editor.ted.getCaretPosition(caretPos, false);
        if ('\r' == symbol) {
            if (enableSmartEnter)
                smartEnter(caretPos, editor);
            return;
        }
        string lineBegin, lastLexem;
        ActivateModes mode = getActivateMode(editor.textDoc.tm, caretPos, lineBegin, lastLexem);
        if (modeName == mode && doAutoReplace(symbol, lineBegin, caretPos, editor))
            return;
        if (!enableSnegoList || (symbol != 0 && qaCharsCount == 0))
            return;

        if ((modeName == mode && bItsNameSymbol && pData.needQuickActivate && lastLexem.length >= qaCharsCount) || symbol == 0) {
            activateInModule(editor, lastLexem, caretPos, mode, symbol);
        }/* else if (modeQuote == mode)
            activateInString(pEditor, caretPos);
        else if (modePreproc == mode)
            activateInPreproc(pEditor, caretPos);
        else if ('(' == symbol || ',' == symbol)
            ParamShow::get().activate();
        */
    }
    bool onKeyDown(TextWnd&& editor, WPARAM wParam, LPARAM lParam) {
        switch (wParam) {
        case VK_LEFT:       case VK_RIGHT:      case VK_UP:
        case VK_DOWN:       case VK_PRIOR:      case VK_NEXT:
        case VK_HOME:       case VK_END:        case VK_RETURN:
        case VK_BACK:
            cast<ModuleEditorData>(editor.editorData).needQuickActivate = true;
            break;
        case VK_DELETE:
            moduleElements.parsed = false;
            break;
        /*
        case VK_ESCAPE:
            ParamShow::get().hide();
            break;
        */
        }
        return false;
    }
    bool beforeSmartEnter(TextWnd&& editor) {
        // Реализация "умного" перемещения каретки при нажатии Enter в определённых конструкциях
        bool eatEnter = false;
        TextPosition caretPos;
        editor.ted.getCaretPosition(caretPos, false);
        v8string line;
        getTextLine(editor.textDoc.tm, caretPos.line, line);
        string strLine = line, lineBefore = strLine.substr(0, caretPos.col - 1), lineAfter = strLine.substr(caretPos.col - 1);
        if (!lineBefore.isEmpty() && !lineAfter.isEmpty() && (is_space(lineBefore[lineBefore.length - 1]) || is_space(lineAfter[0]))) {
            lexem lex;
            lex_provider lexSrc(lineBefore.cstr);
            int mode = 0;
            // Проверим, с чего начинается строка
            lexSrc.nextWithKeyword(lex);
            if (lex.type == kwFor) {
                // С "Для"
                lexSrc.nextWithKeyword(lex);
                // Потом "Каждого"
                mode = lex.type == kwEach ? 2 : 1;
            } else if (lex.type == kwIf || lex.type == kwElsIf) {
                // "Если" или "ИначеЕсли"
                mode = 3;
            } else if (lex.type == kwWhile) // "Пока"
                mode = 4;
            if (mode != 0) {
                // Посмотрим, что за слово за кареткой
                lexSrc.setSource(lineAfter.cstr);
                lexSrc.nextWithKeyword(lex);
                int newCol = 0;
                if ((mode == 3 && lex.type == kwThen)       // Мы после "Если" или "ИначеЕсли" и перед "Тогда"
                    || (mode != 3 && lex.type == kwDo)) {   // Мы перед "Цикл"
                    newCol = strLine.length;
                } else if ((mode == 1 && (lex.type == lexEqual || lex.type == kwTo))   // Мы в "Для" и перед "=" или "По"
                    || (mode == 2 && lex.type == kwIn)) {   // Мы в "Для Каждого" и перед "Из"
                    newCol = caretPos.col + (lex.start - lexSrc.start) / 2 + lex.length + 1;
                    eatEnter = true;
                }
                if (newCol > 0) {
                    caretPos.col = newCol;
                    editor.ted.setCaretPosition(caretPos);
                }
            }
        }
        return eatEnter;
    }
    void itemInserted(TextWnd&& editor, SmartBoxInsertableItem&& item) {
        if (item !is null)
            cast<ModuleEditorData>(editor.editorData).needQuickActivate = true;
    }

    // Вызывается при нажатии Enter'а.
    void smartEnter(TextPosition& caretPos, TextWnd&& editor) {
        v8string lineOver;
        v8string line;
        IUnknown&& cashObj;
        TextManager&& tm = editor.textDoc.tm;
        tm.getCashObject(cashObj);
        tm.getLineFast(caretPos.line - 1, lineOver, cashObj);
        lex_provider lexSrc(lineOver.cstr);
        lexem lex;
        while (lexSrc.next(lex)) {
            if (lexQuoteOpen == lex.type) {
                tm.getLineFast(caretPos.line, line, cashObj);
                if (line.str.ltrim().substr(0, 1) != "|") {
                    // Надо вставить |
                    // Получим пробельные символы для автоотступа
                    string str = lineOver.str.ltrim();
                    string indent;
                    if (str[0] == '|' || str[0] == '\"')
                        indent = str.substr(1).rtrim("\r\n").match(indentRex).text(0, 0);
                    insertInSelection(editor.ted, editor.textDoc.tm, editor.textDoc.itm, "|" + indent, true, false);
                } else {
                    caretPos.col++;
                    editor.ted.setCaretPosition(caretPos, false);
                }
                break;
            } else if (lexRemark == lex.type && (GetKeyState(VK_SHIFT) & 0x8000) != 0) {
                insertInSelection(editor.ted, editor.textDoc.tm, editor.textDoc.itm, "// ", true, false);
                break;
            }
        }
    }

    bool doAutoReplace(wchar_t symbol, const string&in lineBegin, TextPosition&in caretPos, TextWnd&& pTxtWnd) {
        if (!enableAutoReplaces)
            return false;
        //	Делаем автозамены: ? ++ -- += -= *= /= %= 
        uint len = lineBegin.length;
        
        if ('?' == symbol) {
            IntelliSite&& ist = getIntelliSite();
            ist.addItem(Delimeters::getDelimeter(Delimeters::question));
            ist.show(pTxtWnd, "");
            return true;
        }
        // Для начала определим, надо ли вообще делать автозамену
        if (len < 3)
            return false;
        wchar_t prevSymbol = lineBegin[len - 2];
        string replSymbol1 = "", replSymbol2 = "";
        if ('+' == symbol && '+' == prevSymbol) {
            replSymbol1 = "+";
            replSymbol2 = "1";
        } else if ('-' == symbol && '-' == prevSymbol) {
            replSymbol1 = "-";
            replSymbol2 = "1";
        } else if ('=' == symbol && "+-*/%".find(prevSymbol) >= 0) {
            replSymbol1.insert(0, prevSymbol);
            replSymbol2.insert(0, symbCaret);
        } else
            return false;
        // Дальше надо определить, нужно ли добавлять пробелы и получить идентификатор для вставки
        string spaceSymbol = "";
        int endOfName = len - 3;
        // ищем конец имени перед заменой
        while (endOfName >= 0 && is_space(lineBegin[endOfName])) {
            endOfName--;
            spaceSymbol = " ";
        }
        if (endOfName < 0)
            return false;
        // ищем начало имени
        int startOfName = endOfName;
        while (startOfName >= 0 && !is_space(lineBegin[startOfName]) && lineBegin[startOfName] != ';')
            startOfName--;
        startOfName++;
        if (startOfName > endOfName || !is_first_name_symbol(lineBegin[startOfName]))
            return false;
        // выделяем  имя
        string id = lineBegin.substr(startOfName, endOfName - startOfName + 1);
        // формируем строку замены
        string replace = "=" + spaceSymbol + id + spaceSymbol + replSymbol1 + spaceSymbol + replSymbol2;
        // получаем часть строки после положения каретки, и проверяем, не пустая ли она
        // регэксп в конце нужен, так как в юникоде помимо пробела и табуляции могут быть и другие
        // whitespace символы. В оригинале снегопата тут в цикле каждый символ проверяется на whitespace
        string endOfLine = getTextLine(pTxtWnd.textDoc.tm, caretPos.line).substr(caretPos.col - 1).rtrim(" \t\r\n").replace(indentRex, "");
        if (endOfLine.isEmpty())    // Если остаток строки пустой,
            replace += ";";         // добавим запяточку
        // Собственно, сделаем вставку
        TextPosition tpStart = caretPos;
        tpStart.col -= 2;
        pTxtWnd.ted.setSelection(tpStart, caretPos, false, false);
        insertInSelection(pTxtWnd.ted, pTxtWnd.textDoc.tm, pTxtWnd.textDoc.itm, replace, true, false);
        return true;
    }
    void activateInModule(TextWnd&& editor, const string&in lastLexem, TextPosition& caretPos, ActivateModes mode, wchar_t symbol) {
        // Для начала получим текст текущего метода
        uint line = caretPos.line, col = caretPos.col;
        string methodText;
        execContextTypes directive;
        LexemTypes firstLexem = getMethodText(editor.textDoc.tm, line, col, false, methodText, directive);

        // Теперь проверим, не нужно ли перепарсить структуру модуля
        if (lastMethodBeginLine != line) {
            moduleElements.parsed = false;
            lastMethodBeginLine = line;
        }
        // Распарсим структуру модуля (в большинстве случаев он уже распарсен и это не займёт время)
        moduleElements.parse();
        // Далее подробно распарсим текст метода до текущего положения каретки
        ParseMethodResult&& parseResult = parseMethodText(methodText.cstr, line, firstLexem, moduleElements.preprocContextForLine(line));
        // отключим дальнейшую автоактивацию
        cast<ModuleEditorData>(editor.editorData).needQuickActivate = false;
        if (parseResult.isFlagSet(nothingToDone))
            return;
        if (parseResult.isFlagSet(allowObjMethods | allowObjProps)) {
            // После точки пока не работаем, вызовем штатную подсказку
            showV8Assist();
            return;
        }
        // Уточним возможные виды доступности в текущей точке взависимости от директив препроцессора
        // и директивы выполнения текущего метода
        parseResult.allowedAccesses = fixupAccessModes(preprocContextesToAccessModes(parseResult.allowedPreprocContextes), directive);
        // Установим наш парсер модуля как текущий активный
        &&currentModule = moduleElements;
        // Получим обработчик списка снегопата
        IntelliSite&& isite = getIntelliSite();    // Должно быть первым, ибо при этом инициализируются разные глобальные штуки
        // Начнем обрабатывать результат парсинга текста метода, наполняя список
        // Для начала надо наполнить методами и переменными, если они тут допустимы
        if (0 != (parseResult.flags & (allowProcedure | allowFunction | allowModuleVar | allowGCProp))) {
            NoCaseSet varNames, methNames;  // Здесь будем хранить имена переменных и методов, которые уже добавлены в список
            // Имена параметров и явных локальных переменных перекрывают всё
            addLocalVariables(parseResult, isite, varNames);
            // сначала надо добавить в список методы и явные переменные текущего модуля
            moduleElements.processParseResultForCurrentModule(parseResult, isite, methNames, varNames);
            // затем добавляем методы и свойства расширения модуля (от метаданных и формы)
            ExtContextData data(td.mdInfo);
            data.processParseResult(parseResult, isite, methNames, varNames);
            // Затем добавляем стоковые методы и свойства
            addV8stock(parseResult, isite, methNames, varNames);
            // затем обрабатываем глобальные и общие модули
            addCommonModules(parseResult, isite, methNames, varNames);
            // а уж потом проверим авто-локальные переменные метода
            addAutoLocalVariables(parseResult, isite, varNames);
        }
        // Добавим ключевые слова
        getKeywordsGroup().processParseResult(parseResult, isite);
        // Добавим разделители
        if (parseResult.isFlagSet(wantDefVal)) {
            isite.addItem(Delimeters::getDelimeter(Delimeters::quote));
            isite.addItem(Delimeters::getDelimeter(Delimeters::date));
        }
        // Добавим типы
        addTypes(parseResult, isite);
        // Для вставки некоторых элементов нужна информация о результатах парсинга
        &&lastParseMethodResult = parseResult;
        // покажем список
        isite.show(editor, lastLexem);
    }
    void activate(TextWnd&& editor) {
        if (!enableSnegoList)
            return;
        ModuleEditorData&& pData = cast<ModuleEditorData>(editor.editorData);
        if (pData is null)
            return;
        pData.needQuickActivate = true;
        afterChar(editor, 0);
    }
    IMDContainer&& myMainContainer() {
        return td.mdInfo is null ? editedMetaDataCont() : getMasterContainer(td.mdInfo.container);
    }
    void addCommonModules(ParseMethodResult&& result, IntelliSite&& isite, NoCaseSet& methNames, NoCaseSet& propNames) {
        TextDocMdInfo&& mdInfo = td.mdInfo;
        // Надо узнать основной режим запуска - обычный или управляемый
        IMDContainer&& myContainer = myMainContainer();
        IMDObject&& rootObj = myContainer.unk;
        bool runModeIsManaged = getRunModeIsManaged(rootObj);
        // Добавим элементы из одного из глобальных модулей
        if (mdInfo !is null && !(mdInfo.mdPropUuid == gModStdApp || // Модуль обычного приложения
            mdInfo.mdPropUuid == gModMngApp ||                    // Модуль управляемого приложения
            mdInfo.mdPropUuid == gModExtCon ||                    // Модуль внешнего соединения
            mdInfo.mdPropUuid == gModSeance)) {                     // Модуль сеанса
            ModuleElements&& globalModuleParser = getModuleElementsParser(rootObj, runModeIsManaged ? gModMngApp : gModStdApp);
            globalModuleParser.parse();
            globalModuleParser.processParseResultForOtherModule(result, isite, methNames, propNames);
        }
        // Теперь переберём общие модули.
        for (uint i = 0, im = rootObj.childCount(mdClassCmnModule); i < im; i++) {
            IMDObject&& obj = rootObj.childAt(mdClassCmnModule, i);
            if (mdInfo is null || obj.id != mdInfo.object.id) {
                Value val;
                obj.mdPropVal(gcmIsGlobal, val);
                bool isGlobal;
                val.getBoolean(isGlobal);
                if (isGlobal) {
                    ModuleElements&& me = getModuleElementsParser(obj, gModule);
                    me.parse();
                    me.processParseResultForOtherModule(result, isite, methNames, propNames);
                } else {
                    string nameOfModule = mdObjName(obj);
                    if (propNames.insert(nameOfModule))
                        isite.addItem(CommonModuleItem(nameOfModule));
                }
            }
        }
    }
};


// Класс для разбора информации о назначенном модулю объекте метаданных и объекте-расширении модуля.
// Цель - вытащить методы и свойства этих объектов, которые становятся доступными в модуле напрямую,
// без указания имён объектов. Также получить список модулей, чьи методы также становятся доступными
// напрямую.
class ExtContextData {
    array<array<SmartBoxItem&&>> store;
    array<array<any>&&> extModules;

    ExtContextData(TextDocMdInfo&& mdInfo) {
        store.resize(scgLast);
        if (mdInfo is null || mdInfo.object is null)
            return;
        // Нужно получить поставщик информации о типах для этой конфигурации
        IMDEditService&& mdes = getMDEditService();
        IConfigMngrUI&& uicfgmngr;
        mdes.getConfigMngrUI(uicfgmngr, mdInfo.object);
        if (uicfgmngr is null)
            return;
        ITypesInfoProvider&& tip;
        uicfgmngr.getTypesInfoProvider(tip);
        if (tip is null)
            return;
        // Прочитаем инфу из объекта-расширения модуля
        if (mdInfo.extObject !is null) {
            // Все методы и свойства объекта-расширения доступны в модуле напрямую
            readUnknown(mdInfo.extObject, store, "Форма");
            // Если объект - поставщик полей и у него есть основной реквизит - он тоже доступен напрямую
            IDataProviderInfo&& pExtDPI = mdInfo.extObject;
            if (pExtDPI !is null) {
                CompositeID fieldId;
                pExtDPI.defaultField(fieldId);
                if (pExtDPI.fieldInfo(fieldId, oneFieldInfo)) {
                    // Получим список типов этого реквизита
                    Vector types;
                    oneFieldInfo.typeDomain.types(types);
                    if (types.start != 0) {
                        for (GuidRef&& pType = toGuid(types.start); pType < types.end; &&pType = pType + 1) {
                            // Свойства и методы этого типа доступны напрямую
                            readType(pType.ref, tip, store, "ОсновнойРеквизитФормы");
                            // Однако тип может быть типом из метаданных, с модулями, расширяющими тип (напр., модуль объекта)
                            // Методы таких модулей также доступны напрямую
                            IMDObject&& pObj = mdInfo.container.objByTypeId(pType.ref);
                            if (pObj !is null) {
                                // Проверим, есть ли вообще в объекте модули
                                IMDEditHelper&& meh;
                                mdes.getEditHelper(meh, pObj);
                                IMDEditModuleHelper&& mdemh = meh.unk;
                                if (mdemh !is null) {
                                    // переберем свойства метаданных объекта, проверяя, не расширяет ли оно этот тип
                                    IMDClass&& pClass = pObj.mdClass;
                                    for (uint x = 0, cnt = pClass.propCount(); x < cnt; x++) {
                                        Guid propID = pClass.getPropIDAt(x);
                                        if (mdemh.moduleExpandType(propID) == pType.ref) {
                                            addExtModule(pObj, propID);
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    // Для обычной формы также становятся доступны методы расширения элемента управления основного реквизита формы
                    ICustomForm&& pCustomForm = mdInfo.extObject;
                    if (pCustomForm !is null) {
                        IUnknown&& pControlExt;
                        pCustomForm.getFormController(pControlExt, fieldId);
                        if (pControlExt !is null)
                            readUnknown(pControlExt, store, "РасширениеЭУОсновногоРеквизитаФормы");
                    }
                }
            }
        }
        if (mdInfo.object !is null) {
            // Проверим, расширяет ли модуль какое-либо свойство объекта
            // В этом случае тип доступен в модуле
            IMDEditHelper&& meh;
            mdes.getEditHelper(meh, mdInfo.object);
            IMDEditModuleHelper&& mdemh = meh.unk;
            if (mdemh !is null) {
                Guid typeID = mdemh.moduleExpandType(mdInfo.mdPropUuid);
                if (typeID != IID_NULL)
                    readType(typeID, tip, store, "Объект");
            }
        }
    }
    protected void addExtModule(IMDObject&& mdObj, const Guid& mdProp) {
        extModules.insertLast(array<any> = {any(&&mdObj), any(mdProp)});
    }
    void processParseResult(ParseMethodResult&& res, IntelliSite&& isite, NoCaseSet& methNames, NoCaseSet& propNames) {
        // Сначала добавим то, что есть
        if (res.isFlagSet(allowProcedure))
            isite.addItemGroup(checkAccess(checkNamesInSet(resetExclude(store[scgProcedure]), methNames), res.allowedAccesses));
        if (res.isFlagSet(allowFunction))
            isite.addItemGroup(checkAccess(checkNamesInSet(resetExclude(store[scgFunction]), methNames), res.allowedAccesses));
        if (res.isFlagSet(allowGCProp))
            isite.addItemGroup(checkAccess(checkNamesInSet(resetExclude(store[scgProperty]), propNames), res.allowedAccesses));
        // Теперь надо перебрать модули, которые напрямую доступны в этом модуле
        for (uint i = 0, im = extModules.length; i < im; i++) {
            IMDObject&& obj;
            Guid prop;
            array<any>&& extMod = extModules[i];
            extMod[0].retrieve(&&obj);
            extMod[1].retrieve(prop);
            ModuleElements&& me = getModuleElementsParser(obj, prop);
            me.parse();
            me.processParseResultForOtherModule(res, isite, methNames, propNames);
        }
    }
};

uint fixupAccessModes(uint currentModes, execContextTypes direcrive) {
    switch (direcrive) {
    case ecNone:
        return currentModes;
    case ecAtServer:
        return currentModes & amSrv;
    case ecAtClient:
        return currentModes & (amThn | amThk | amWeb);
    case ecAtClientAtServer:
        return currentModes & (amSrv | amThn | amThk | amWeb);
    case ecAtServerNoContext:
        return currentModes & amSrv;
    case ecAtClientAtServerNoContext:
        return currentModes & (amSrv | amThn | amThk | amWeb);
    }
    return currentModes;
}

bool getRunModeIsManaged(IMDObject&& mdRoot) {
    Value val;
    mdRoot.mdPropVal(gMainRunMode, val);
    v8string res;
    /*
    // Забраковываем как не работающее при не русской локализации
    val.getString(res);
    return res.str == "Управляемое приложение";
    */
    val.toString(res);  // Это ЗначениеВСтрокуВнутр, смотрим предпоследний символ
    return res.str.substr(-2, 1)[0] == '1';
}

void addLocalVariables(ParseMethodResult&& result, IntelliSite&& isite, NoCaseSet& propNames) {
    bool needAddItems = result.isFlagSet(allowModuleVar);
    for (uint i = 0, im = result.localVarsCount(); i < im; i++) {
        LocalVarItem&& lv = result.localVar(i);
        if (lv.type != lvAuto) {
            propNames.insert(lv.name);
            if (needAddItems)
                isite.addItem(LocalVarSmartItem(lv));
        }
    }
}

void addAutoLocalVariables(ParseMethodResult&& result, IntelliSite&& isite, NoCaseSet& propNames) {
    if (!result.isFlagSet(allowModuleVar))
        return;
    for (uint i = 0, im = result.localVarsCount(); i < im; i++) {
        LocalVarItem&& lv = result.localVar(i);
        if (lv.type == lvAuto && !propNames.contains(lv.name))
            isite.addItem(LocalVarSmartItem(lv));
    }
}

void addV8stock(ParseMethodResult&& result, IntelliSite&& isite, NoCaseSet& methNames, NoCaseSet& propNames) {
    if (result.isFlagSet(allowProcedure)) {
        isite.addItemGroup(checkAccess(checkNamesInSet(resetExclude(v8stock[stockGlobalProc, langCmn]), methNames), result.allowedAccesses));
        if (0 != (useLangs & useLangEng))
            isite.addItemGroup(checkAccess(checkNamesInSet(resetExclude(v8stock[stockGlobalProc, langEng]), methNames), result.allowedAccesses));
        if (0 != (useLangs & useLangRus))
            isite.addItemGroup(checkAccess(checkNamesInSet(resetExclude(v8stock[stockGlobalProc, langRus]), methNames), result.allowedAccesses));
    }
    if (result.isFlagSet(allowFunction)) {
        isite.addItemGroup(checkAccess(checkNamesInSet(resetExclude(v8stock[stockGlobalFunc, langCmn]), methNames), result.allowedAccesses));
        if (0 != (useLangs & useLangEng))
            isite.addItemGroup(checkAccess(checkNamesInSet(resetExclude(v8stock[stockGlobalFunc, langEng]), methNames), result.allowedAccesses));
        if (0 != (useLangs & useLangRus))
            isite.addItemGroup(checkAccess(checkNamesInSet(resetExclude(v8stock[stockGlobalFunc, langRus]), methNames), result.allowedAccesses));
        if (result.isFlagSet(inExpression)) {
            isite.addItemGroup(checkAccess(checkNamesInSet(resetExclude(v8stock[stockGlobalFuncInExpr, langCmn]), methNames), result.allowedAccesses));
            if (0 != (useLangs & useLangEng))
                isite.addItemGroup(checkAccess(checkNamesInSet(resetExclude(v8stock[stockGlobalFuncInExpr, langEng]), methNames), result.allowedAccesses));
            if (0 != (useLangs & useLangRus))
                isite.addItemGroup(checkAccess(checkNamesInSet(resetExclude(v8stock[stockGlobalFuncInExpr, langRus]), methNames), result.allowedAccesses));
            isite.addItemGroup(checkAccess(checkNamesInSet(resetExclude(v8stock[stockBuiltin, langCmn]), methNames), result.allowedAccesses));
            if (0 != (useLangs & useLangEng))
                isite.addItemGroup(checkAccess(checkNamesInSet(resetExclude(v8stock[stockBuiltin, langEng]), methNames), result.allowedAccesses));
            if (0 != (useLangs & useLangRus))
                isite.addItemGroup(checkAccess(checkNamesInSet(resetExclude(v8stock[stockBuiltin, langRus]), methNames), result.allowedAccesses));
        }
    }
    if (result.isFlagSet(allowGCProp)) {
        isite.addItemGroup(checkAccess(checkNamesInSet(resetExclude(v8stock[stockGlobalProps, langCmn]), propNames), result.allowedAccesses));
        if (0 != (useLangs & useLangEng))
            isite.addItemGroup(checkAccess(checkNamesInSet(resetExclude(v8stock[stockGlobalProps, langEng]), propNames), result.allowedAccesses));
        if (0 != (useLangs & useLangRus))
            isite.addItemGroup(checkAccess(checkNamesInSet(resetExclude(v8stock[stockGlobalProps, langRus]), propNames), result.allowedAccesses));
        if (result.isFlagSet(inExpression)) {
            isite.addItemGroup(checkAccess(checkNamesInSet(resetExclude(v8stock[stockSysEnums, langCmn]), propNames), result.allowedAccesses));
            if (0 != (useLangs & useLangEng))
                isite.addItemGroup(checkAccess(checkNamesInSet(resetExclude(v8stock[stockSysEnums, langEng]), propNames), result.allowedAccesses));
            if (0 != (useLangs & useLangRus))
                isite.addItemGroup(checkAccess(checkNamesInSet(resetExclude(v8stock[stockSysEnums, langRus]), propNames), result.allowedAccesses));
        }
    }
}

void addTypes(ParseMethodResult&& result, IntelliSite&& isite) {
    if (result.isFlagSet(allowNewTypes))
        addTypeStores(isite, result.allowedAccesses);
}

void addTypeStores(IntelliSite&& isite, uint allowedAccesses) {
    isite.addItemGroup(checkAccess(resetExclude(v8stock[stockTypeNames, langCmn]), allowedAccesses));
    if (0 != (useLangs & useLangEng))
        isite.addItemGroup(checkAccess(resetExclude(v8stock[stockTypeNames, langEng]), allowedAccesses));
    if (0 != (useLangs & useLangRus))
        isite.addItemGroup(checkAccess(resetExclude(v8stock[stockTypeNames, langRus]), allowedAccesses));
    isite.addItem(Delimeters::getDelimeter(Delimeters::parenthesisWithBackSpace));
}

void showV8Assist() {
    CommandID assist(cmdFrameGroup, cmdFrameShowAssist);
    if ((commandState(assist) & cmdStateEnabled) != 0)
        sendCommandToMainFrame(assist);
}

#if ver >= 8.3.4
void showV8MethodsParams() {
    bool isAutoParams = true;
    Value vAutoParams;
    if (getProfileRoot().getValue("TextAssist/BracketAutoAssist", vAutoParams) &&
        vAutoParams.getBoolean(isAutoParams) && isAutoParams) {
        CommandID assist(cmdFrameGroup, cmdFrameShowParams);
        if ((commandState(assist) & cmdStateEnabled) != 0)
            sendCommandToMainFrame(assist);
    }
}
#endif
