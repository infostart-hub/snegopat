// keywords.as
#pragma once
#include "../../all.h"

Keywords&& oneKeywords;
Keywords&& getKeywordsGroup() {
    if (oneKeywords is null)
        &&oneKeywords = Keywords();
    return oneKeywords;
}

class Keywords {
    array<SmartBoxItem&&> keywordsEng = {
        // Порядок и состав ключевых слов отсюда и до Val - менять нельзя!
        // Так как парсер снегопата выдает номера допустимых в точке разбора ключевых слов
        // именно в этом порядке. Можно менять шаблон вставки.
        // Если на какое-то ключевое слово хочется задать несколько вариантов вставки, нужные варианты
        // добавляйте после Val, и правьте processParseResult, добавляя их в список руками.
        // Аналогично для списка русских слов, начиная с Если и до Знач.
        &&KeywordItem("If_EndIf", "If ¦ Then\nEndIf;"),
        &&KeywordItem("Then", "Then\n", formatAfterInsert),
        &&KeywordItem("ElsIf_Then", "ElsIf ¦ Then", formatAfterInsert),
        &&KeywordItem("EndIf", "EndIf;\n", formatAfterInsert),
        &&KeywordItem("Else", "Else\n", formatAfterInsert),
        &&KeywordItem("For_each_Do", "For each ¦ In  Do\nEndDo;"),
        &&KeywordItem("Each", "Each "),
        &&KeywordItem("In", "In "),
        &&KeywordItem("To", "To "),
        &&KeywordItem("While_Do", "While ¦ Do\nEndDo;"),
        &&KeywordItem("Do", "Do\n", formatAfterInsert),
        &&KeywordItem("EndDo", "EndDo;\n", formatAfterInsert),
        &&KeywordItem("Procedure_EndProcedure", "Procedure ¦()\nEndProcedure\n"),
        &&KeywordItem("Function_EndFunction", "Function ¦()\nEndFunction\n"),
        &&KeywordItem("EndProcedure", "EndProcedure\n", formatAfterInsert),
        &&KeywordItem("EndFunction", "EndFunction\n", formatAfterInsert),
        &&KeywordItem("Var", "Var ¦;"),
        &&KeywordItem("Goto", "Goto ¦;"), // todo сделать после вставки выбор меток
        &&KeywordItem("Return", "Return", null, insertForReturn),
        &&KeywordItem("Continue", "Continue;"),
        &&KeywordItem("Break", "Break;"),
        &&KeywordItem("And", "And "),
        &&KeywordItem("Or", "Or "),
        &&KeywordItem("Not", "Not "),
        &&KeywordItem("Try_Except", "Try\n\t¦\nExcept\nEndTry;"),
        &&KeywordItem("Except", "Except\n", formatAfterInsert),
        &&KeywordItem("Raise", "Raise ¦;"),
        &&KeywordItem("EndTry", "EndTry;\n", formatAfterInsert),
        &&KeywordItem("New", "New ", selectTypeAfterInsert),
        &&KeywordItem("Execute", "Execute(\"¦\");"),
        &&KeywordItem("True", "True"),
        &&KeywordItem("False", "False"),
        &&KeywordItem("AddHandler", "AddHandler ¦, ;"),
        &&KeywordItem("RemoveHandler", "RemoveHandler ¦, ;"),
        &&KeywordItem("Export", "Export"),
        &&KeywordItem("Null", "Null"),
        &&KeywordItem("Undefined", "Undefined"),
        &&KeywordItem("Val", "Val "),
        &&KeywordItem("For_To_Do", "For ¦ =  To  Do\nEndDo;"),
		null // Странный глюк, вместо последнего элемента добавляет null, поэтому добавим пустой элемент
	};
    array<SmartBoxItem&&> keywordsRus = {
        &&KeywordItem("Если_КонецЕсли", "Если ¦ Тогда\nКонецЕсли;"),
        &&KeywordItem("Тогда", "Тогда\n", formatAfterInsert),
        &&KeywordItem("ИначеЕсли_Тогда", "ИначеЕсли ¦ Тогда", formatAfterInsert),
        &&KeywordItem("КонецЕсли", "КонецЕсли;\n", formatAfterInsert),
        &&KeywordItem("Иначе", "Иначе\n", formatAfterInsert),
        &&KeywordItem("Для_каждого_Цикл", "Для Каждого ¦ Из НужнаяКоллекция__ Цикл\nКонецЦикла;"),
        &&KeywordItem("Каждого", "Каждого "),
        &&KeywordItem("Из", "Из "),
        &&KeywordItem("По", "По "),
        &&KeywordItem("Пока_Цикл", "Пока ¦ Цикл\nКонецЦикла;"),
        &&KeywordItem("Цикл", "Цикл\n", formatAfterInsert),
        &&KeywordItem("КонецЦикла", "КонецЦикла;\n", formatAfterInsert),
        &&KeywordItem("Процедура_КонецПроцедуры", "Процедура ¦()\n\n\n\nКонецПроцедуры\n"),
        &&KeywordItem("Функция_КонецФункции", "Функция ¦()\n\n\n\n\tВозврат Результат;\n\nКонецФункции\n"),
        &&KeywordItem("КонецПроцедуры", "КонецПроцедуры\n", formatAfterInsert),
        &&KeywordItem("КонецФункции", "КонецФункции\n", formatAfterInsert),
        &&KeywordItem("Перем", "Перем ¦;"),
        &&KeywordItem("Перейти", "Перейти ¦;"),
        &&KeywordItem("Возврат", "Возврат", null, insertForReturn),
        &&KeywordItem("Продолжить", "Продолжить;"),
        &&KeywordItem("Прервать", "Прервать;"),
        &&KeywordItem("И", "И "),
        &&KeywordItem("Или", "Или "),
        &&KeywordItem("Не", "Не "),
        &&KeywordItem("Попытка_Исключение", "Попытка\n\t¦\nИсключение\nКонецПопытки;"),
        &&KeywordItem("Исключение", "Исключение\n", formatAfterInsert),
        &&KeywordItem("ВызватьИсключение", "ВызватьИсключение ¦;"),
        &&KeywordItem("КонецПопытки", "КонецПопытки;\n", formatAfterInsert),
        &&KeywordItem("Новый", "Новый ", selectTypeAfterInsert),
        &&KeywordItem("Выполнить", "Выполнить( \"¦\" );"),
        &&KeywordItem("Истина", "Истина"),
        &&KeywordItem("Ложь", "Ложь"),
        &&KeywordItem("ДобавитьОбработчик", "ДобавитьОбработчик ¦, ;"),
        &&KeywordItem("УдалитьОбработчик", "УдалитьОбработчик ¦, ;"),
        &&KeywordItem("Экспорт", "Экспорт"),
        &&KeywordItem("Null", "Null"),
        &&KeywordItem("Неопределено", "Неопределено"),
        &&KeywordItem("Знач", "Знач "),
        // Здесь добавляем дополнительные варианты вставки ключевых слов.
        &&KeywordItem("Для_По_Цикл", "Для ¦ =  По  Цикл\n\n\nКонецЦикла;"),
        &&KeywordItem("Попытка_сервер", 
            "Попытка\n\n"
            "\t¦НужноНаписатьНужныйСерверныйКод\n"
            "\n"
            "Исключение\n"
                "\n"
                "\t// стандарт по исключениям https://its.1c.ru/db/v8std/content/499/hdoc\n"
                "\tИнформацияОбОшибке = ИнформацияОбОшибке();\n"
                "\t//ТекстСообщения = КраткоеПредставлениеОшибки(ИнформацияОбОшибке);\n"
                "\tПолныйТекстОшибки = ПодробноеПредставлениеОшибки(ИнформацияОбОшибке);\n"
                "\n"
                "\t//ПоказатьПредупреждение( , НСтр(\"ru = 'Операция не может быть выполнена по причине:'\") + Символы.ПС\n"
                "\t//\t+ ТекстСообщения);\n"
                "\n"
                "\tЗаписьЖурналаРегистрации(НСтр(\"ru = 'НаименованиеСобытия'\"),\n"
                    "\t\tУровеньЖурналаРегистрации.Ошибка, ,	,\n"
                    "\t\tПолныйТекстОшибки);\n"
            "\n"
                "\tВызватьИсключение;\n"
            "\n"
            "КонецПопытки;\n"
            ),
        &&KeywordItem("Попытка_фейк", "Попытка\n// вызов сервера ВыполнитьОперациюСервер()\n\t¦\nИсключение\n1234\nКонецПопытки;"),
        &&KeywordItem("Попытка_клиент_сервер", 
            //"Попытка\n// вызов сервера ВыполнитьОперациюСервер()\n\t¦\nИсключение\n1234\nКонецПопытки;"
            "// на клиенте\n"
            "Попытка\n"
            "\n"
            "\t// вызов сервера ВыполнитьОперациюСервер()\n"
            "\t¦НужноВызватьОдинСерверныйМетод\n"
            "\n"
            "Исключение\n"
            "\n"
            "\t// стандарт по исключениям https://its.1c.ru/db/v8std/content/499/hdoc\n"
            "\tИнформацияОбОшибке = ИнформацияОбОшибке();\n"
            "\tТекстСообщения = КраткоеПредставлениеОшибки(ИнформацияОбОшибке);\n"
            "\n"
            "\tПоказатьПредупреждение( , НСтр(\"ru = 'Операция не может быть выполнена по причине:'\") + Символы.ПС\n"
            "\t\t+ ТекстСообщения);\n"
            "\n"
            "КонецПопытки;\n"
            "\n"
            "// на сервере\n"
            "&НаСервере\n"
            "Процедура ВыполнитьОперациюСервер()\n"
            "\n"
            "\tПопытка\n"
            "\n"
            "\t// вызов основного серверного кода\n"
            "\tНужноНаписатьНужныйСерверныйКод\n"
            "\n"
            "\tИсключение\n"
            "\t\t// Запись события в журнал регистрации для системного администратора.\n"
            "\n"
            "\t\tИнформацияОбОшибке = ИнформацияОбОшибке();\n"
            "\t\tЗаписьЖурналаРегистрации(НСтр(\"ru = 'НаименованияСобытия'\"),\n"
            "\t\t\tУровеньЖурналаРегистрации.Ошибка, , ,\n"
            "\t\t\tПодробноеПредставлениеОшибки(ИнформацияОбОшибке));\n"
            "\n"
            "\t\tВызватьИсключение;\n"
            "\n"
            "\tКонецПопытки;\n"
            "\n"
            "КонецПроцедуры\n"
            "\n"
        ),
        &&KeywordItem("Попытка_Исключение_только_клиент", "Попытка\n\t¦\nИсключение\n1235\nКонецПопытки;"),
        null // Странный глюк, вместо последнего элемента добавляет null, поэтому добавим пустой элемент
    };
    Keywords() {
		// Уберем лишний пустой элемент
        keywordsEng.resize(keywordsEng.length - 1);
        keywordsRus.resize(keywordsRus.length - 1);
    }
    void processParseResult(ParseMethodResult&& result, IntelliSite&& isite) {
        // Здесь мы должны поставить признак исключения ключевого слова из списка, если парсер считает, что
        // оно здесь не допускается грамматикой языка. 
        bool allExclude = true; // Признак, что ни одно из слов не допускается.
        // Обходим список ключевых слов с If по Val, и спрашиваем у парсера, допустимо ли оно здесь.
        for (uint iKeyVal = kwIf, idx = 0; iKeyVal <= kwVal; iKeyVal++) {
            if (result.isKeywordAllowed(iKeyVal)) // слово допустимо, убираем признак исключения из списка и запоминаем, что список будет не пуст
                keywordsEng[idx].d.exclude = keywordsRus[idx].d.exclude = allExclude = false;
            else // Ставим слову признак исключения из списка.
                keywordsEng[idx].d.exclude = keywordsRus[idx].d.exclude = true;
            idx++;
        }
        // Все слова исключены из списка - выходим.
        if (allExclude)
            return;
        // Теперь обработаем дополнительные варианты вставки
        
        // Если можно вставить ключевое слово "Для", то в основном списке ключевых слов сделана вставка блока "Для Каждого"
        // Скопируем его признак и для блока "Для По Цикл".
        uint idxOfFor = kwFor - kwIf, idxOfExtFor = kwVal - kwIf + 1;
        keywordsEng[idxOfExtFor].d.exclude = keywordsRus[idxOfExtFor].d.exclude = keywordsEng[idxOfFor].d.exclude;

        // Есть дополнительные варианты вставки для Попытки в русском варианте, числом 4
        if (0 != (useLangs & useLangRus)) {
            uint idxOfTry = kwTry - kwIf, idxOfExtTry = kwVal - kwIf + 2;
            for (uint i = 0; i < 4; i++)
                keywordsRus[idxOfExtTry + i].d.exclude = keywordsRus[idxOfTry].d.exclude;
        }
        
        // Обработаем для Null в случае активации обоих языков. Null присутствует в обоих списках, русском и английском
        // Но в обоих пишется одинаково. Поэтому если у нас используются оба языка, то из русского списка всегда исключаем.
        if (useLangs == (useLangEng | useLangRus))
            keywordsRus[kwNull - kwIf].d.exclude = true;

        if (0 != (useLangs & useLangEng))
            isite.addItemGroup(keywordsEng);
        if (0 != (useLangs & useLangRus))
            isite.addItemGroup(keywordsRus);
    }
};

funcdef void FMakeInsert(KeywordItem&, string&);
funcdef void FAfterInsert(KeywordItem&, TextWnd&&);

class KeywordItem : SmartBoxInsertableItem {
    string insertStr;
    FMakeInsert&& fInsert;
    FAfterInsert&& fAfterInsert;
    KeywordItem(const string& name, const string& ins, FAfterInsert&& fai = null, FMakeInsert&& fi = null) {
        super(name, imgKeyword);
        insertStr = ins;
        &&fInsert = fi;
        &&fAfterInsert = fai;
    }
    void textForTooltip(string& text) {
        text = "Вставка ключевого слова §" + d.descr;
    }
    void textForInsert(string&out text) {
        text = insertStr;
        if (fInsert !is null)
            fInsert(this, text);
    }
    void updateInsertPosition(TextWnd& wnd, TextPosition& start, TextPosition& end, bool& notIndent) {
    }
    void afterInsert(TextWnd&& editor) {
        if (fAfterInsert !is null)
            fAfterInsert(this, editor);
    }
};

void formatAfterInsert(KeywordItem& item, TextWnd&& editor) {
    TextPosition caretPos;
    editor.ted.getCaretPosition(caretPos, false);
    string lineOfText = getTextLine(editor.textDoc.tm, caretPos.line);
    int indent = lineOfText.match(indentRex).text(0, 0).length;
    TextPosition begSel = caretPos, endSel = caretPos;
    endSel.col = 1;
    endSel.line++;
    if (item.insertStr.find('\n') >= 0)
        begSel.line--;
    editor.ted.setSelection(begSel, endSel, true, false);
    sendCommandToMainFrame(CommandID(cmdGroupTxtEdt, cmdTxtFormatBlock));
    lineOfText = getTextLine(editor.textDoc.tm, caretPos.line);
    indent -= lineOfText.match(indentRex).text(0, 0).length;
    caretPos.col -= indent;
    editor.ted.setCaretPosition(caretPos, false);
}

void insertForReturn(KeywordItem& item, string& text) {
    text += (lastParseMethodResult.isFlagSet(inProcedure) ? "" : " ¦") + ";";
}

void selectTypeAfterInsert(KeywordItem& item, TextWnd&& editor) {
    IntelliSite&& ist = getIntelliSite();
    addTypeStores(ist, lastParseMethodResult.allowedAccesses);
    ist.show(editor, "");
}

class DirectiveItem : SmartBoxInsertableItem {
    DirectiveItem(const string& name) {
        super(name, imgKeyword);
        d.key = d.key.substr(1);
    }
    void textForTooltip(string& text) {
        text = "Вставка директивы §" + d.descr;
    }
    void textForInsert(string&out text) {
        text = d.descr + "\n";
    }
};

enum DirectivesSet {
    dirSetNone,
    dirSetForm,
    dirSetCommand,
    dirSetCommonModule
};

class DirecivesSet {
    DirectiveItem atServerE("&AtServer"),
        atClientE("&AtClient"),
        atClientAtServerE("&AtClientAtServer"),
        atServerNoContextE("&AtServerNoContext"),
        atClientAtServerNoContextE("&AtClientAtServerNoContext"),
        atServerR("&НаСервере"),
        atClientR("&НаКлиенте"),
        atClientAtServerR("&НаКлиентеНаСервере"),
        atServerNoContextR("&НаСервереБезКонтекста"),
        atClientAtServerNoContextR("&НаКлиентеНаСервереБезКонтекста");
    array<SmartBoxItem&&> formsEng = { &&atClientE, &&atServerE, &&atServerNoContextE, &&atClientAtServerNoContextE };
    array<SmartBoxItem&&> formsRus = { &&atClientR, &&atServerR, &&atServerNoContextR, &&atClientAtServerNoContextR };
    array<SmartBoxItem&&> cmdsEng = { &&atClientE, &&atServerE, &&atClientAtServerE };
    array<SmartBoxItem&&> cmdsRus = { &&atClientR, &&atServerR, &&atClientAtServerR };
    array<SmartBoxItem&&> cmnmEng = { &&atClientE, &&atServerE };
    array<SmartBoxItem&&> cmnmRus = { &&atClientR, &&atServerR };

    void processResult(ParseMethodResult&& parseResult, DirectivesSet ds, IntelliSite&& isite) {
        if (parseResult.isFlagSet(allowDirective)) {
            switch (ds) {
            case dirSetNone:
                break;
            case dirSetForm:
                if (0 != (useLangs & useLangEng))
                    isite.addItemGroup(formsEng);
                if (0 != (useLangs & useLangRus))
                    isite.addItemGroup(formsRus);
                break;
            case dirSetCommand:
                if (0 != (useLangs & useLangEng))
                    isite.addItemGroup(cmdsEng);
                if (0 != (useLangs & useLangRus))
                    isite.addItemGroup(cmdsRus);
                break;
            case dirSetCommonModule:
                if (0 != (useLangs & useLangEng))
                    isite.addItemGroup(cmnmEng);
                if (0 != (useLangs & useLangRus))
                    isite.addItemGroup(cmnmRus);
                break;
            }
        }
    }
};

DirecivesSet direcivesSet;
