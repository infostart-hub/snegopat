// textwnd.as
/*
  Тут часть кода, работающая с текстовыми окнами
*/
#pragma once
#include "../../all.h"

TextWnd&& activeTextWnd;

// Это интерфейс обработчика событий в тексте.
// В-зависимости от назначенного текстовому документу расширения (встроенный язык, язык запросов и т.п.)
// создается соответствующий расширению текстовый процессор. Именно он и обрабатывает события в текстовом окне
interface TextProcessor {
    // Подключение/отключение к документу
    void setTextDoc(TextDoc&& textDoc);
    // Подключение нового окна редактора
    void connectEditor(TextWnd&& editor);
    // Обработка после WM_CHAR
    void afterChar(TextWnd&& editor, uint16 symbol);
    // Обработка при WM_KEYDOWN, WM_SYSKEYDOWN
    bool onKeyDown(TextWnd&& editor, uint wParam, uint lParam);
    // Из списка снегопата был вставлен элемент
    void itemInserted(TextWnd&& editor, SmartBoxInsertableItem&& item);
};

// Просто базовый интерфейс для хранения текстовым процессором данных для конкретного редактора
interface EditorData {};

// Реализация пустого текстового процессора, ничего не делает
class EmptyTextProcessor : TextProcessor {
    void setTextDoc(TextDoc&& textDoc) {}
    void connectEditor(TextWnd&& editor) { &&editor.editorData = null; }
    void afterChar(TextWnd&& editor, uint16 symbol) {}
    bool onKeyDown(TextWnd&& editor, uint wParam, uint lParam) { return false; }
    void itemInserted(TextWnd&& editor, SmartBoxInsertableItem&& item) {}
};

/*
    Основная функция вставки текста в текстовый редактор.
    Вставляет в текущее положение редактора (как-будто нажали Ctrl+V)
    При необходимости дополняет многострочный текст нужным отступом,
    взависимости от вставляемого положения.
    При необходимости сбрасывает кэш парсера строк 1С.
    В-принципе, необходимость возникает всегда :)
    иначе очень весёлые глюки. Хотя когда нужно сделать несколько вставок подряд,
    кэш можно сбросить только после последней вставки.
*/
void insertInSelection(ITextEditor&& pEditor, TextManager&& pTM, ITextManager&& pITM, const string& txt, bool bClearCache, bool needIndent) {
    string text(txt);
    TextPosition tpStart, tpCaretAfter;
    pEditor.getSelection(tpStart, tpCaretAfter, false);
    // Далее надо определить конечное положение селекшена, конечное положение каретки,
    // и сделать по необходимости отступы
    if (text.find('\n') < 0) {  // Однострочный текст, с ним проще
        tpCaretAfter = tpStart;
        int caret = text.find(symbCaret);
        if (caret >= 0) {
            tpCaretAfter.col += caret;
            text.remove(caret);
        } else
            tpCaretAfter.col += text.length;
    } else {
        if (needIndent) {
            // Формируем отступ. Для этого к каждой строке вставляемого текста, начиная со второй
            // нужно добавить такой-же отступ, как у строки в редакторе
            v8string wline;
            pTM.getLine(tpStart.line, wline);   // получили существующую строку текста в формате 1С
            string indent = wline.str.rtrim("\r\n").padRight(' ', tpStart.col - 1).match(indentRex).text(0, 0);
            if (indent.length > 0)
                text.replace("\n", "\n" + indent);
        }
        // Находим конечное положение
        tpCaretAfter = tpStart;
        for (int i = 0, l = text.length; i < l; i++) {
            uint16 symbol = text[i];
            if ('\n' == symbol) {
                tpCaretAfter.line++;
                tpCaretAfter.col = 1;
            } else if (symbCaret == symbol) {
                text.remove(i);
                break;
            } else
                tpCaretAfter.col++;
        }
    }
    // Вставляем текст
    pEditor.setSelectionText(text);
    pEditor.setCaretPosition(tpCaretAfter, false);
    pEditor.scrollToCaretPos();

    if (bClearCache) {
        ITextParserCache&& pCache = pITM.unk;
        //if (pCache !is null)
            pCache.clearCache();
    }
    // Обновляем все другие окна этого текста
    ITextManager_Operations&& vu = pITM.unk;
    //if (vu !is null)
        vu.updateAllViews();
}

TextProcessor&& createTextProcessor(const Guid& g) {
    if (g == gTextExtModule || g == gTextExtModule1) {
        return ModuleTextProcessor();
    }
    return EmptyTextProcessor();
}

TextDocStorage textDocStorage;

class TextDocStorage {
    array<TextDoc&&> openedDocs;

    TextDoc&& find(ITextManager&& itm) {
        for (uint idx = 0, size = openedDocs.length(); idx < size; idx++) {
            if (openedDocs[idx].itm is itm)
                return openedDocs[idx];
        }
        return null;
    }
    TextDoc&& find(TextManager&& tm) {
        for (uint idx = 0, size = openedDocs.length(); idx < size; idx++) {
            if (openedDocs[idx].tm is tm)
                return openedDocs[idx];
        }
        return null;
    }
    void store(TextDoc&& tdoc) { openedDocs.insertLast(&&tdoc); }
    void remove(TextDoc&& doc) {
        for (uint idx = 0, size = openedDocs.length(); idx < size; idx++) {
            if (openedDocs[idx] is doc) {
                openedDocs.removeAt(idx);
                break;
            }
        }
    }
	void disableTextWork() {
		for (uint i = 0; i < openedDocs.length; i++) {
			TextDoc&& td = openedDocs[i];
			td.setTextExtenderType(IID_NULL);
		}
	}
	void enableTextWork() {
		for (uint i = 0; i < openedDocs.length; i++) {
			TextDoc&& td = openedDocs[i];
			ITextManager_Operations&& to = cast<IUnknown>(td.itm);
			Guid textExtender;
			to.getExtenderCLSID(textExtender);
			td.setTextExtenderType(textExtender);
		}
	}
};

// Вызывается из перехвата при создании окна текстового редактора
void onCreateTextWnd(IWindowView&& pWnd, bool bControl) {
    if (bControl) {
        IControlDesign&& ctrl = pWnd.unk;
        if (ctrl !is null && ctrl.getMode() != ctrlRunning)
            return; // С контролами на формах не работаем
    }
    TextWnd wnd(pWnd, bControl);
    ITextManager&& itm;
    wnd.ted.getITextManager(itm);
    TextDoc&& tdoc = textDocStorage.find(itm);
    if (tdoc is null) {
        //Print("Text doc not found");
        &&tdoc = TextDoc();
        &&tdoc.itm = itm;
        &&tdoc.tm = itm.getTextManager();
        ITextManager_Operations&& to = itm.unk;
        Guid textExtender;
        to.getExtenderCLSID(textExtender);
        tdoc.setTextExtenderType(textExtender);
        textDocStorage.store(tdoc);
    } //else Print("Found old text doc");
    tdoc.attachView(wnd);
    if (oneDesigner !is null)
        oneDesigner._fireCreateTextWindow(wnd);
}

// Вызывается из перехвата при смене расширения текстового редактора
// (т.е. в меню текст выбрали тип текста - Встроеный язык, язык запросов, и т.п.)
void changeTextExtender(ITextManager&& itm, const Guid& textExtender) {
    TextDoc&& tdoc = textDocStorage.find(itm);
    if (tdoc !is null)
        tdoc.setTextExtenderType(textExtender);
}

NoCaseMap<TextDocMdInfo&&> openedMdObjects;
string keyForSearchOpenedMD(IMDObject&& obj, const Guid& propUuid) {
    return "" + obj.self + "|" + propUuid;
}

class TextDocMdInfo {
    TextDocMdInfo(IAssistantData&& data, TextDoc&& doc) {
        &&owner = doc;
        IUnknown&& unk;
        data.object(unk);
        &&object = unk;
        &&extObject = data.extObject();
        mdPropUuid = data.propUuid();
        if (object !is null)
            &&container = getMDObjectWrapper(object).get_container()._container();
        openedMdObjects.insert(keyForSearchOpenedMD(object, mdPropUuid), this);
    }
    void detach() {
        openedMdObjects.remove(keyForSearchOpenedMD(object, mdPropUuid));
        &&owner = null;
		&&object = null;
		&&container = null;
		&&extObject = null;
    }
    TextDoc&& owner;
    IMDObject&& object;
    IMDContainer&& container;
    IUnknown&& extObject;
    Guid mdPropUuid;
};

// Класс, который хранит различную инфу о текстовом документе.
// Важно, у одного текстового документа может быть открыто несколько окон
class TextDoc {
    ITextManager&&   itm;
    TextManager&&    tm;
    TextProcessor&&  tp;
    array<TextWnd&&> views;
    TextDocMdInfo&&  mdInfo;
    ~TextDoc() {
        //Print("delete TextDoc");
    }
    void attachView(TextWnd&& wnd) {
        &&wnd.textDoc = this;
        views.insertLast(&&wnd);
        tp.connectEditor(wnd);
    }
    void detachView(TextWnd&& wnd) {
        if (wnd is activeTextWnd)
            &&activeTextWnd = null;
        for (uint idx = 0, size = views.length(); idx < size; idx++) {
            if (views[idx] is wnd) {
                views.removeAt(idx);
                break;
            }
        }
        if (views.length() == 0) { // Закрыли последнее окно
			tp.setTextDoc(null);
			&&tp = null;
			if (mdInfo !is null)
                mdInfo.detach();
            textDocStorage.remove(this);
        }
    }
    void setTextExtenderType(const Guid& g) {
        if (mdInfo is null && (g == gTextExtModule || g == gTextExtModule1)) {
            ITxtEdtExtender&& ext;
            getTxtEdtService().getExtender(ext, itm, g);
            ISettingsConsumer&& st = ext.unk;
            IAssistantData&& data;
			//dumpVtable(&&ext);
			//dumpVtable(&&st);
			//Print("cons=" + st.self + " offset=" + (st.self + ModuleTxtExtSettingsMap));
            for (uint node = mem::dword[st.self + ModuleTxtExtSettingsMap]; node != 0; node = mem::dword[node]) {
                GuidRef&& pg = toGuid(node + 4);
                if (pg.ref == IID_IAssistantData) {
                    &&data = toIUnknown(mem::dword[node + 20]);
                    data.AddRef();
                    break;
                }
            }
            if (data !is null)
                &&mdInfo = TextDocMdInfo(data, this);
        }
		if (tp !is null)
			tp.setTextDoc(null);
        &&tp = createTextProcessor(g);
        tp.setTextDoc(this);
        for (uint k = 0, m = views.length(); k < m; k++)
            tp.connectEditor(views[k]);
    }
    TextWnd&& findWnd(ITextEditor&& editor) {
        for (uint i = 0, im = views.length; i < im; i++) {
            TextWnd&& wnd = views[i];
            if (wnd.ted is editor)
                return wnd;
        }
        return null;
    }
};

class TextWnd {
    ASWnd&&        wnd;            // сабклассер текстового окна, перенаправляет указанные события оконной процедуры в скриптовый обработчик
    HWND           hWnd;           // WinAPI хэндл окна
    ITextEditor&&  ted;            // Интерфейс редактора 1С
    TextDoc&&      textDoc;        // Родительский объект, общий для всех окон одного текста
    EditorData&&   editorData;     // Данные, нужные для текстового процессора
    bool           isControl;      // Является ли окно тектовым контролом или полноценным view
    ITextWindow&&  iwnd;           // Скриптовая обертка
    
    TextWnd(IWindowView&& v, bool isCtrl) {
        isControl = isCtrl;
        hWnd = v.hwnd();
        &&wnd = attachWndToFunction(hWnd, WndFunc(this.WndProc),
            array<uint> = { WM_KEYDOWN, WM_SYSKEYDOWN, WM_CHAR, WM_DESTROY, WM_SETFOCUS, WM_KILLFOCUS});
        &&ted = v.unk;
    }
    // Это функция обработчик оконных сообщений сабклассированного окна
    uint WndProc(uint msg, uint w, uint l) {
        switch (msg) {
        case WM_SETFOCUS:
            &&activeTextWnd = this;
            break;
        case WM_KILLFOCUS:
            &&activeTextWnd = null;
            break;
        case WM_DESTROY:
            if (textDoc !is null)
                textDoc.detachView(this);
            if (iwnd !is null)      // Если есть скриптовая обёртка
                iwnd._disconnect();  // отвяжемся от неё
            break;
        case WM_KEYDOWN:
        case WM_SYSKEYDOWN:
            return onKeyDown(w, l);
        case WM_CHAR:
            return onChar(w);
        }
        return wnd.doDefault();
    }
    ~TextWnd() {
        //Print("delete TextWnd");
    }
    uint onKeyDown(uint w, uint l) {
        if (!textDoc.tp.onKeyDown(this, w, l))
            return wnd.doDefault();
        return 0;
    }
    uint onChar(uint16 symb) {
        // сначала дадим отработать штатным механизмам
        uint res = wnd.doDefault();
        // Дальше работает текстовый процессор, назначенный этому тексту
        textDoc.tp.afterChar(this, symb);
        return res;
    }
    ITextWindow&& getComWrapper() {
        if (iwnd is null)
            &&iwnd = ITextWindow(this);
        return iwnd;
    }
};
