﻿/*
    StockListInterceptor.as
    Перехват штатной контекстной подсказки 1С и подмена ее списком снегопата
*/
#pragma once
#include "../../all.h"

Packet stdListIntercept("stdListIntercept", hookStdList, piOnMainEnter);
string tpstr(const TextPosition& tp) {
    return "[" + tp.line + ", " + tp.col + "]";
}

bool enableHookStdList;
OptionsEntry oeEnableHookStdList("HookStdList", function(v){v = true; },
    function(v){v.getBoolean(enableHookStdList); },
    function(v){v.getBoolean(enableHookStdList); hookStdList(); return false; });
bool enableHidingRemark;
OptionsEntry oeEnableHidingRemark("EnableHidingRemark", function(v){v = true; },
    function(v){v.getBoolean(enableHidingRemark); },
    function(v){v.getBoolean(enableHidingRemark); hookStdList(); return false; });

// Перехватчик запроса состава списка
TrapVirtualStdCall trStdListIntercept;
TrapVirtualStdCall trSourceSplitLexems;

CellFormat cellFormat;

// Установка перехвата
bool hookStdList() {
    if (!enableHookStdList && !enableHidingRemark) {
        if (trStdListIntercept.state == trapEnabled)
            trStdListIntercept.swap();
        return true;
    }
    if (trStdListIntercept.state == trapNotActive) {
        IAssistList&& al;
        currentProcess().createByClsid(CLSID_AssistList, IID_IAssistList, al);
        //dumpVtable(&&al);
        trStdListIntercept.setTrap(al, IAssistList_getDataSource, IAssistList_getDataSourceTrap);

        // Теперь ставим перехват на разбор исходников 1Сом на лексемы.
        ISourceLexer&& lexer;
        currentProcess().createByClsid(CLSID_SourceLexer, IID_ISourceLexer, lexer);
        //dumpVtable(&&lexer);
        trSourceSplitLexems.setTrap(&&lexer, ISourceLexer_splitToLexems, splitToLexemsTrap);
        // И временно отключаем его
        trSourceSplitLexems.swap();
    } else if (trStdListIntercept.state == trapDisabled)
        trStdListIntercept.swap();
    return true;
}

// Функция-перехватчик запроса состава списка
uint IAssistList_getDataSourceTrap(IAssistList& pThis, IV8DataSource&&& result,
    ITextEditor& editor,
#if ver >= 8.3.8
    int i10,
#endif
    IV8Bookmark&&& bkmk,
    uint& itemsCount,
    int i1,
    int method, int i3
#if ver >= 8.3
    , int i4, int i5, int i6, int i7, int i8, int i9
#endif
) {
    //Message("Intercept list " + method + " i1=" + i1 + " i3=" + i3);
    // Сначала включим перехват парсинга строк
    if (enableHidingRemark)
        trSourceSplitLexems.swap();
    // Вызовем настоящую функцию и получим состав списка
    trStdListIntercept.swap();
    uint ures = pThis.getDataSource(result,
        editor,
    #if ver >= 8.3.8
        i10,
    #endif
        bkmk,
        itemsCount,
        i1,
        method, i3
    #if ver >= 8.3
        , i4, i5, i6, i7, i8, i9
    #endif
    );
    trStdListIntercept.swap();
    // Отключим перехват парсинга строк
    if (enableHidingRemark)
        trSourceSplitLexems.swap();
    if (method > 3 || !enableHookStdList)
        return ures;    // Запрос при показе параметров функции

    // Если есть список и он не пуст и установлено активое текстовое окно и редакторы совпадают
    if (result !is null && itemsCount > 0 && activeTextWnd !is null && activeTextWnd.ted is editor) {
        // Если мы смогли вытащить состав и показать свой список
        if (showAssistList(pThis, activeTextWnd, result, bkmk)) {
            &&result = null;    // вернем вызывающему пустой список
            &&bkmk = null;      // чтобы не мешался
        }
    }
    return ures;
}

// Это перехват разбиения одинэсом исходников на лексемы.
// Наша цель - заменить комментарии вида "//:" на пробелы.
// Таким образом, можно будет задавать типизацию комментариями вида
//: Парам = Новый Структура
// Заменять будем простым реплэйсом, нам не страшно, если и где-то внутри кавычек
// заменим, это только для контекстной подсказки
void splitToLexemsTrap(ISourceLexer& pThis, const v8string& source, Vector& lexems) {
    trSourceSplitLexems.swap();
    v8string newSource = source.str.replace("//:", "   ");
    pThis.splitToLexems(newSource, lexems);
    trSourceSplitLexems.swap();
}

// Вытащим состав из стокового списка и создадим свой
bool showAssistList(IAssistList& lst, TextWnd&& wnd, IV8DataSource&& ds, IV8Bookmark&& bkmk) {
    // Message("showAssistList ");
    // Получение сайта списка выносим в начало, так как в его конструкторе инициализируются
    // typeContextInfoItem
    IntelliSite&& site = getIntelliSite();

    array<SmartBoxItem&&> itemsV8;
    IGridUISource&& uisrc = cast<IUnknown>(ds);
    IAssistListInfo&& ali = cast<IUnknown>(ds);
    ITypeContextInfo&& tci = cast<IUnknown>(ali);

    Value val;
    // Это для свёртки одинаковых названий
    NoCaseSet templates, methods, props;
    IV8Bookmark&& item;
    for (ds.getLinkedBookmark(&&item, item, ltFirstChild); item !is null; ds.getLinkedBookmark(&&item, item, ltNext)) {
        cellFormat.text = "";
        cellFormat.validFields = cfText;
        uisrc.getCellFormat(item, 0, val, cellFormat);
        string name = cellFormat.text;
        imagesIdx imgidx = imgType;
        SmartBoxItem&& newItem;

        // Message("showAssistList name" +  name);
        if (ali !is null && tci !is null) {
            uint realIdx;
            ali.realIndex(ali.indexFromBkmk(item), realIdx);
            tci.info(realIdx, typeContextInfoItem, 0);
            if (typeContextInfoItem.isMethod) {
                if (!methods.insert(name))  // ключ уже был в наборе
                    continue;
                &&newItem = V8StockMethod(typeContextInfoItem.from, name, typeContextInfoItem.haveRetVal, item, lst, ds);
            } else if (typeContextInfoItem.from == tcfKeyword) {
                // Message("showAssistList typeContextInfoItem.from == tcfKeyword");
                &&newItem = V8StockKeyword(name, item, lst, ds);
            } else if (typeContextInfoItem.from == tcfTemplate) {
                // Message("showAssistList typeContextInfoItem.from == tcfTemplate");
                templates.insert(name);
                continue;
            } else {
                if (!props.insert(name)) // Ключ уже был в наборе
                    continue;
                if (typeContextInfoItem.from == tcfGlobal && sysEnums.contains(name))
                    {
                        // Message("showAssistList typeContextInfoItem.from == tcfGlobal && sysEnums.contains(name)");
                        &&newItem = V8StockEnum(name, item, lst, ds);
                    }
                else {
                    // Message("showAssistList else typeContextInfoItem.from == tcfGlobal && sysEnums.contains(name)");
                    &&newItem = V8StockProp(typeContextInfoItem.from, name, item, lst, ds);
                }
            }
        }
        else {
            // Message("showAssistList name "+ name);
        }
        itemsV8.insertLast(newItem !is null ? newItem : V8StockItemBase(name, imgidx, item, lst, ds));
    }
    // Пока вставка шаблонов не очень работает, не будем их показывать
    /*
    for (auto t = templates.begin(); t++;) {
        itemsV8.insertLast(V8TemplateItem(t.key));
    }
    */

    TextPosition caretPos;
    wnd.ted.getCaretPosition(caretPos, false);
    uint symbolsToCaret = caretPos.col - 1;
    string beginOfLine = getTextLine(wnd.textDoc.tm, caretPos.line).rtrim("\r\n").padRight(' ', symbolsToCaret);
    beginOfLine.setLength(symbolsToCaret);
    string start, selected;
    int idx = caretPos.col - 2;
    while (idx >= 0) {
        wchar_t symb = beginOfLine[idx];
        if (!is_name_symbol(symb))
            break;
        start.insert(0, symb);
        idx--;
    }
    /*
    Позиционироваться на пункте, на котором стоит 1С не будем, ибо у нас свой hotOrder для
    элементов, которые недавно вставлялись
    if (bkmk !is null) {
        uisrc.getCellFormat(bkmk, 0, val, cellFormat);
        selected = cellFormat.text;
    }*/
    site.addItemGroup(itemsV8);
    site.show(wnd, start, selected, false);
    return true;
}

// используется в числе прочих при обработке выбора типа данных для глобального метода Тип()
class V8StockItemBase : SmartBoxInsertableItem {
    string insert;
    TextPosition tpStart;

    V8StockItemBase(const string& d, imagesIdx img, IV8Bookmark&& b, IAssistList&& l, IV8DataSource&& vd) {
        super(d, img);
        uint caretPos;
        v8string ins;
        l.textByBookmark(vd, b, ins, tpStart, caretPos);
        insert = ins;
        if (caretPos < insert.length)
            insert.insert(caretPos, symbCaret);
        // Message("V8StockItemBase insert " + insert);
    }
    void updateInsertPosition(TextWnd& wnd, TextPosition& start, TextPosition& end, bool& notIndent) override {
        start = tpStart;

        TextPosition caretPos;
        wnd.ted.getCaretPosition(caretPos, false);

        string currleft = getTextLine(wnd.textDoc.tm, caretPos.line).substr(0, caretPos.col - 1);
        string currright = getTextLine(wnd.textDoc.tm, caretPos.line).substr(caretPos.col - 1);

        // Message("V8StockItemBase updateInsertPosition currleft " + currleft);
        // Message("V8StockItemBase updateInsertPosition currright " + currright);

        if(currleft.match(typeMethodOnLeft).matches > 0){
            end.col ++; //убираем лишнюю кавычку справа при вставке
            insert = insert.substr(0, insert.length - 1) + "¦\"" ;//имена вставки всегда приходят в кавычках, поэтому сейчас вставляю курсор внутрь
            if(currright.match(quoteOnRight).matches == 0){ // если не внутри Тип("¦")
                insert += ")";
                //выкинуть правую скобку, если она есть, чтобы правая скобка в разных кейсах ставилась верно всегда
                bool haveBracketOnRight = currright.match(closedBracketOnRight).matches > 0; 
                if (haveBracketOnRight){
                    end.col ++;
                }

                if (getTextLine(wnd.textDoc.tm, end.line).substr(end.col - 1).replace(indentRex, "").isEmpty())   // Если остаток строки пустой,
                    insert += ";";
            }
        }
    }
    void textForInsert(string&out text) {
        text = insert;
        // Message("V8StockItemBase textForInsert text " + text);
    }
    void textForTooltip(string& text)  // Получить тултип элемента
    {
        text = getCategory() + " " + d.descr;
    }
    string getCategory() {
        return "Элемент списка";
    }
};

class V8StockKeyword : V8StockItemBase {
    V8StockKeyword(const string& d, IV8Bookmark&& b, IAssistList&& l, IV8DataSource&& vd) {
        super(d, imgKeyword, b, l, vd);
    }
    string getCategory() { return "Ключевое слово"; }
    void updateInsertPosition(TextWnd& wnd, TextPosition& start, TextPosition& end, bool& notIndent) override {
        V8StockItemBase::updateInsertPosition(wnd, start, end, notIndent);
        if (d.key == "если") {
            insert = "Если ¦ Тогда\nКонецЕсли;";
        } else if (d.key == "для") {
            insert = "Для ¦ Цикл\nКонецЦикла;";
        } else if (d.key == "пока") {
            insert = "Пока ¦ Цикл\nКонецЦикла;";
        } else if (d.key == "попытка") {
            insert = "Попытка\n\t¦\nИсключение\nКонецПопытки;";
        } else if (d.key == "процедура") {
            insert = "Процедура ¦()\nКонецПроцедуры";
        } else if (d.key == "функция") {
            insert = "Функция ¦()\nКонецФункции";
        } else if (d.key == "возврат") {
            insert = "Возврат ¦;";
        } else if (d.key == "иначеесли")
            insert = "ИначеЕсли ¦ Тогда";
        notIndent = true;
    }
    void afterInsert(TextWnd&& editor) {
        if ("\nконецесли\nтогда\nиначе\nиначеесли\nконеццикла\nконецпроцедуры\nконецфункции\nвозврат\n"
            "исключение\nконецпопытки\n".find("\n" + d.key + "\n") >= 0) {
            // выделим текущую строку и пошлем команду форматирования блока,
            // после чего вернем каретку в прежнее место
            TextPosition caretPos;
            editor.ted.getCaretPosition(caretPos, false);
            string lineOfText = getTextLine(editor.textDoc.tm, caretPos.line);
            int indent = lineOfText.match(indentRex).text(0, 0).length;
            TextPosition begSel = caretPos, endSel = caretPos;
            endSel.col = 1;
            endSel.line++;
            editor.ted.setSelection(begSel, endSel, true, false);
            sendCommandToMainFrame(CommandID(cmdGroupTxtEdt, cmdTxtFormatBlock));
            lineOfText = getTextLine(editor.textDoc.tm, caretPos.line);
            indent -= lineOfText.match(indentRex).text(0, 0).length;
            caretPos.col -= indent;
            editor.ted.setCaretPosition(caretPos, false);
        } else if ("новый" == d.key)
            showV8Assist();
    }
};

class V8StockMethod : V8StockItemBase {
    bool isFunction;
    
    V8StockMethod(int from, const string& d, bool isFunc, IV8Bookmark&& b, IAssistList&& l, IV8DataSource&& vd) {
        imagesIdx idx;
        if (from == tcfModuleSelf)
            idx = imgPublicMethod;
        else if (from == tcfCmnModule)
            idx = imgCmnModule;
        else if (from == tcfContext)
            idx = imgCtxMethod;
        else
            idx = imgMethodWithKey;
        super(d, idx, b, l, vd);

        isFunction = isFunc;

        // Message("V8StockMethod " + getCategory() + ", " + d + ", isFunction " + isFunction); 
    }
    string getCategory() {
        string type = "Процедура";
        if (isFunction)
            type = "Функция";
        switch (d.image) {
            case imgPublicMethod:
                return type + " модуля";
            case imgCtxMethod:
                return type + " контекста";
            case imgCmnModule:
                return type + " общего модуля";
        }
        if (builtinFuncs.contains(d.descr))
            return "Встроенная функция";
        if (isFunction)
            return "Глобальная функция";
        else
            return "Глобальный метод";
    }
    void updateInsertPosition(TextWnd& wnd, TextPosition& start, TextPosition& end, bool& notIndent) override {

        // Message("before V8StockItemBase::updateInsertPosition insert " + insert);
        V8StockItemBase::updateInsertPosition(wnd, start, end, notIndent);

        // TODO есть пересечение кода с MethodInsertable::updateInsertPosition
        TextPosition caretPos;
        wnd.ted.getCaretPosition(caretPos, false);

        wchar_t lastSymbol = insert[insert.length - 1];
        if (lastSymbol == '(')
            insert += "¦";
        if (lastSymbol == '(' || lastSymbol == ')') {
            if (getTextLine(wnd.textDoc.tm, end.line).substr(end.col - 1).replace(indentRex, "").isEmpty())   // Если остаток строки пустой,
                if (lastSymbol == '(')
                    insert += ");";
                else
                    insert += ";";
            else {
                string lastExpr = getTextLine(wnd.textDoc.tm, caretPos.line).substr(caretPos.col - 1)
                    .replace(endLineRex, "");
                array<string>&& tail = lastExpr.split(whiteSpaceRex);
                if (tail.length > 0) {
                    lastExpr = tail[0];
                }
                insert += lastExpr + ")";
                end.col += lastExpr.length;
    
                // Message("in V8StockMethod::updateInsertPosition lastExpr " + lastExpr);
            }
        }

    }

#if ver >= 8.3.4
    void afterInsert(TextWnd&& wnd) {
        showV8MethodsParams();
    }
#endif
};

class V8StockProp : V8StockItemBase {
    V8StockProp(int from, const string& d, IV8Bookmark&& b, IAssistList&& l, IV8DataSource&& vd) {
        imagesIdx idx;
        if (from == tcfModuleSelf)
            idx = imgPublicVar;
        else if (from == tcfCmnModule)
            idx = imgCmnModule;
        else if (from == tcfContext)
            idx = imgCtxVar;
        else
            idx = imgVarWithKey;
        super(d, idx, b, l, vd);
    }
    string getCategory() {
        switch (d.image) {
        case imgPublicVar:
            return "Переменная модуля";
        case imgCmnModule:
            return "Общий модуль";
        case imgCtxVar:
            return "Свойство контекста";
        }
        return "Глобальное свойство";
    }
    void updateInsertPosition(TextWnd& wnd, TextPosition& start, TextPosition& end, bool& notIndent) override {
        V8StockItemBase::updateInsertPosition(wnd, start, end, notIndent);
        if (d.image == imgCmnModule)
            insert += ".";
    }
    void afterInsert(TextWnd&& editor) {
        if (d.image == imgCmnModule)
            showV8Assist();
    }
}

class V8StockEnum : V8StockItemBase {
    V8StockEnum(const string& d, IV8Bookmark&& b, IAssistList&& l, IV8DataSource&& vd) {
        super(d, imgEnums, b, l, vd);
    }
    string getCategory() {
        return "Системное перечисление";
    }
    void updateInsertPosition(TextWnd& wnd, TextPosition& start, TextPosition& end, bool& notIndent) override {
        V8StockItemBase::updateInsertPosition(wnd, start, end, notIndent);
        insert += ".";
    }
    void afterInsert(TextWnd&& editor) {
        showV8Assist();
    }
}

class V8TemplateItem : SmartBoxInsertableItem {
    V8TemplateItem(const string& d) {
        super(d, imgType);
    }
    void textForInsert(string&out text) {
        text = d.descr.dup().replace("[", "").replace("]", "");
    }
    void textForTooltip(string& text) {
        text = "Шаблон §" + d.descr;
    }
};
