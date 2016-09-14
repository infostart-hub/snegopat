/* com_textwindow.as
    Обёртка для работы из аддинов с текстовым окном 1С.
*/
// Данные строки нужны только для среды разработки и вырезаются препроцессором
#pragma once
#include "../../all.h"

class Selection {
    int beginRow;
    int beginCol;
    int endRow;
    int endCol;
    Selection(const TextPosition& begin, const TextPosition& end) {
        beginRow = begin.line;
        beginCol = begin.col;
        endRow = end.line;
        endCol = end.col;
    }
};

// Класс для скриптов
class ITextWindow {
    private TextWnd&& wnd;
    ITextWindow(TextWnd&& w) {
        &&wnd = w;
    }
    void _disconnect() {
        &&wnd = null;
        array<Variant> args(1);
        IDispatch&& me = createDispatchFromAS(&&this);
        args[0].setDispatch(me);
        oneDesigner._events.fireEvent(me, "TextWindowClosed", args);
        oneDesigner._events.removeMyListeners(me);
    }
    bool get_isAlive() {
        return wnd !is null;
    }
    //[propget, helpstring("Возвращает текст этого окна")]
    string get_text() {
        if (wnd !is null) {
            v8string text;
            wnd.textDoc.tm.save(text);
            return text;
        }
        return string();
    }
    //[helpstring("Получить границы выделенного текста")]
    Selection&& getSelection() {
        if (wnd !is null) {
            TextPosition begin, end;
            wnd.ted.getSelection(begin, end, false);
            return Selection(begin, end);
        }
        return null;
    }
    //[helpstring("Установить границы выделенного текста")]
    void setSelection(int beginRow, int beginCol, int endRow, int endCol) {
        if (wnd !is null) {
            TextPosition begin, end;
            bool caretInStart;
            if (beginRow < endRow || (beginRow == endRow && beginCol <= endCol)) {
                begin.line = beginRow;
                begin.col = beginCol;
                end.line = endRow;
                end.col = endCol;
                caretInStart = false;
            } else {
                begin.line = endRow;
                begin.col = endCol;
                end.line = beginRow;
                end.col = beginCol;
                caretInStart = true;
            }
            ITextEditor&& pTE = wnd.ted;
            pTE.setCaretPosition(begin, false);
            pTE.setCaretPosition(end, false);
            pTE.setSelection(begin, end, caretInStart, false);
            //if (!m_isME) {
            ITextManager_Operations&& vu = cast<IUnknown>(wnd.textDoc.itm);
            if (vu !is null)
                vu.updateAllViews();
            //}
        }
    }
    //[propget, helpstring("Получить/установить выделенный текст")]
    string get_selectedText() {
        if (wnd !is null) {
            v8string res;
            wnd.ted.getSelectionText(res);
            return res;
        }
        return string();
    }
    //[propput, helpstring("Получить/установить выделенный текст")]
    void set_selectedText(const string& text) {
        if (wnd !is null) {
            wnd.ted.setSelectionText(text);
            ITextParserCache&& cache = cast<IUnknown>(wnd.textDoc.itm);
            if (cache !is null)
                cache.clearCache();
        }
    }
    //[helpstring("Получить положение курсора")]
    Selection&& getCaretPos() {
        if (wnd !is null) {
            TextPosition tp;
            wnd.ted.getCaretPosition(tp, false);
            return Selection(tp, tp);
        }
        return null;
    }
    //[helpstring("Установить положение курсора")]
    void setCaretPos(int row, int col) {
        if (wnd !is null) {
            wnd.ted.setCaretPosition(TextPosition(row, col), false);
            wnd.ted.scrollToCaretPos();
        }
    }
    //[propget, helpstring("Количество строк")]
    uint get_linesCount() {
        if (wnd !is null)
            return wnd.textDoc.tm.getLinesCount();
        return 0;
    }
    //[helpstring("Текст строки по номеру (нумерация с 1)")]
    string line(int lineNumber) {
        if (wnd !is null) {
            v8string l;
            wnd.textDoc.tm.getLine(lineNumber, l);
            return l.str.rtrim("\n");
        }
        return string();
    }
    //[propget, helpstring("Текст только для чтения")]
    bool get_readOnly() {
        if (wnd !is null) {
            if (wnd.isControl) {
                IContext&& ctx = cast<IUnknown>(wnd.textDoc.itm);
                if (ctx !is null) {
                    Value val;
                    ctx.getPropVal(0, val); // Это свойство "ТолькоЧтение"
                    bool res = true;
                    val.getBoolean(res);
                    return res;
                }
            } else {
                IDocument&& doc = cast<IUnknown>(wnd.textDoc.itm);
                if (doc !is null)
                    return doc.getReadOnly();
            }
        }
        return true;
    }
    //[propget, helpstring("HWND окна")]
    uint get_hwnd() {
        return wnd is null ? 0 : wnd.hWnd;
    }
    //[propget, helpstring("Адрес внутреннего менеджера текста")]
    uint get_textMgr() {
        return wnd is null ? 0 : wnd.textDoc.tm.self;
    }
    //[propget, helpstring("Выбранное расширение редактора")]
    string extName() {
        if (wnd !is null) {
            ITextManager_Operations&& to = cast<IUnknown>(wnd.textDoc.itm);
            if (to !is null) {
                Guid extGuid;
                to.getExtenderCLSID(extGuid);
                ITxtEdtExtender&& ext;
                getTxtEdtService().getExtender(ext, wnd.textDoc.itm, extGuid);
                return ext.getName();
            }
        }
        return string();
    }
    // Это на пробу, что выйдет. Возвращает одинэсный объект ТекстовыйДокумент
    Variant get_textDocument() {
        Variant res;
        if (wnd !is null) {
            Value val;
            &&val.pValue = cast<IUnknown>(wnd.textDoc.itm);
            val2var(val, res);
        }
        return res;
    }
    //[propget, helpstring("Включить/отключить режим массированого изменения текста")]
    bool _multyEdit; // todo Пока не делаю, присутствует для совместимости
    // Это пока не делаем, это метаданные. Присутствуют для совместимости
    //[propget, helpstring("Контейнер метаданных, если есть")]
    IV8MDContainer&& get_mdCont() {
        if (wnd !is null && wnd.textDoc.mdInfo !is null)
            return getContainerWrapper(wnd.textDoc.mdInfo.container);
        return null;
    }
    //[propget, helpstring("Объект метаданных, если есть")]
    IV8MDObject&& get_mdObj() {
        if (wnd !is null && wnd.textDoc.mdInfo !is null)
            return getMDObjectWrapper(wnd.textDoc.mdInfo.object);
        return null;
    }
    //[propget, helpstring("Свойство объекта метаданных, если есть")]
    IV8MDProperty&& get_mdProp() {
        if (wnd !is null && wnd.textDoc.mdInfo !is null)
            return getMDPropWrapper(mdService.mdProp(wnd.textDoc.mdInfo.mdPropUuid));
        return null;
    }
    //[propget, helpstring("Внешний объект")]
    Variant get_extObject() {
        Variant res;
        if (wnd !is null && wnd.textDoc.mdInfo !is null) {
            Value val;
            &&val.pValue = wnd.textDoc.mdInfo.extObject;
            if (val.pValue !is null)
                val2var(val, res);
        }
        return res;
    }
};
