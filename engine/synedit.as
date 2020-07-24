/* synedit.as
    Внедрение текстового редактора "SynEdit"
*/
#pragma once
#include "../../all.h"

SynEditInfo seInfo = SynEditInfo();
Packet piSynEdit("synedit", function() { editorsManager._registerEditor(seInfo); return true; }, piOnMainEnter);

IDispatch&& addinObj;

array<TextWnd&&> synEditEditors;

int WM_USER = 0x400;
int WM_TEXTWND_CHANGED = WM_USER + 665;
int WM_ACTIVE_CHANGED = WM_USER + 667;
int WM_DO_DESTROY = WM_USER + 668;
int LM_DO_RESIZE = WM_USER + 2004;

class SynEditInfo : EditorInfo {
    string name() override {
        return "SynEdit";
    }
    string extention() override {
        return "Встроенный язык";
    }
    array<string>&& extGuids() override {
        return array<string> = {string(gTextExtModule), string(gTextExtModule1)};
    }
    void activate() override {
        Addin&& a = oneDesigner._addins.byUniqueName("SynEdit");
        if (a is null)
            &&a = oneDesigner._addins.loadAddin("dll:<addins>SynEdit\\SynEditV8.dll", oneDesigner._addins._libs);
            //&&a = oneDesigner._addins.loadAddin("dll:d:\\Misha\\Projects\\Lazarus\\Snegopat\\synedit\\SynEditV8.dll", oneDesigner._addins._libs);
        if (a is null) {
            Message("Не удалось загрузить SynEditV8");
            return;
        }
        &&addinObj = a.object();
        // find method id
        int meth;
        addinObj.findMember("setASMainObj", meth);
        // call it
        array<Variant> args(1);
        args[0].setDispatch(createDispatchFromAS(&&this));
        Variant retVar;
        addinObj.call(meth, args, retVar);
        initTextAreaModifiedTraps();
        initCaretSelectionTraps();
#if ver >= 8.3.12
        initResizeTraps();
        initFocusTrap();
#endif
        //&&eventManager = a.invokeMacros("_Get_EventManager").getDispatch();
    }
    void doSetup() override {
    }
    TextEditorDocument&& create() override {
        return SynEditDocument();
    }
    bool supportsNewWindowSystem() {
        return true;
    }
    SynEditEditor&& activeEditor() {
        SynEditEditor&& e;
        if (activeTextWnd !is null) {
            &&e = cast<SynEditEditor>(activeTextWnd.editor);
            if (e !is null) {
                return e;
            }
        }
        return null;
    }
    Variant activeSynEditEditor() {
        SynEditEditor&& e = activeEditor();
        array<Variant> args(1);
        if (e !is null) {
            args[0].setDispatch(createDispatchFromAS(&&e));
        }
        Variant res;
        res.setDispatch(createDispatchFromAS(&&e));
        return res;
    }
    bool showSmartBox() {
        IntelliSite&& isite = getIntelliSite();
        if (isite.isActive())
            isite.hide();
        if (activeTextWnd !is null) {
            ModuleTextProcessor&& tp = cast<ModuleTextProcessor>(activeTextWnd.textDoc.tp);
            if (tp !is null)
                tp.activate(activeTextWnd);
        }
        return true;
    }
#if ver >= 8.3.12
    Variant editorWindowRect(HWND hwnd) {
        Window@ wnd = toWindow(hwnd);

        Rect r1;
        Rect r2;
        Rect r3;
        Rect sr;
        wnd.getWindowRects(r1, r2, r3);
        wnd.calcShadowRect(sr);

        /*Message("R1: " + r1.left + ":" + r1.top + "x" + r1.right + ":" + r1.bottom);
        Message("R2: " + r2.left + ":" + r2.top + "x" + r2.right + ":" + r2.bottom);
        Message("R3: " + r3.left + ":" + r3.top + "x" + r3.right + ":" + r3.bottom);
        Message("SR: " + sr.left + ":" + sr.top + "x" + sr.right + ":" + sr.bottom);*/

        Rect ibr;
        wnd.calcInBorderRect(ibr, r1);
        /*Message("IR: " + ibr.left + ":" + ibr.top + "x" + ibr.right + ":" + ibr.bottom);*/

        Rect ret;
        ret.left = r1.left;
        ret.top = sr.top-4;
        ret.right = r1.right;
        ret.bottom = sr.bottom-4;

        IRect ir(ret);
        Variant res;
        res.setDispatch(createDispatchFromAS(&&ir));
        return res;
    }
#endif
    HWND twHwnd() {
        return getHwnd(activeTextWnd);
    }
};

// Обертка для передачи строки в массиве Variant
// Там, похоже, только IDispatch можно передавать...
class strWrapper {
    string _val;
    strWrapper(const string& str) {
        _val = str;
    }
}

// Обертка над TextManager
class textManagerWrapper {
    uint _id;
    textManagerWrapper(const TextManager& tm) {
        _id = tm.self;
    }
}

// Обертка над TextPosition
class ITextPos {
    int line;
    int col;
    ITextPos(const TextPosition& pos) {
        line = pos.line;
        col = pos.col;
    }
}

// Обертка над Rect
class IRect {
    long left;
    long right;
    long top;
    long bottom;
    IRect(const Rect& r) {
        left = r.left;
        right = r.right;
        top = r.top;
        bottom = r.bottom;
    }
}

class SynEditDocument : TextEditorDocument, TextModifiedReceiver {
    int_ptr sciDoc = 0;
    bool inTextModified = false;
    SynEditEditor&& sEditor;

    void attach(TextDoc&& td) {
        TextEditorDocument::attach(td);
        editorsManager._subscribeToTextChange(td.tm, this);
    }
    void detach() {
        editorsManager._unsubsribeFromTextChange(owner.tm, this);
        TextEditorDocument::detach();
    }
    TextEditorWindow&& createEditor() {
        &&sEditor = SynEditEditor(this);
        return sEditor;
    }
    void onTextModified(TextManager& tm, const TextPosition& tpStart, const TextPosition& tpEnd, const string& newText) {
        //Message("Set text " + tpstr(tpStart) + " " + tpstr(tpEnd) + " '" + newText + "'");
        array<Variant> args(4);
        args[0].setDispatch(createDispatchFromAS(&&strWrapper(newText)));
        args[1].setDispatch(createDispatchFromAS(&&ITextPos(tpEnd)));
        args[2].setDispatch(createDispatchFromAS(&&ITextPos(tpStart)));
        args[3].setDispatch(createDispatchFromAS(&&textManagerWrapper(tm)));
        oneDesigner._events.fireEvent(oneDesigner._me(), "SynEditonTextModified", args);
    }
};

funcdef long FuncSynEditWndProc(HWND hWnd, UINT msg, long wParam, long lParam);
FuncSynEditWndProc&& synEditWndProc;
bool synEditWndProcInitDone = false;
int_ptr focusedWindow = 0;

class SynEditEditor : TextEditorWindow, SelectionChangedReceiver {
    HWND synEditHwnd;
    HWND synEditEditorHwnd;

    SynEditEditor(SynEditDocument&& o) {
    }

    void attach(TextWnd&& tw) override {
        TextEditorWindow::attach(tw);
        editorsManager._subscribeToSelChange(tw.ted, this);
        array<Variant> args(2);
        args[0].setDispatch(createDispatchFromAS(&&this));
        args[1].setDispatch(createDispatchFromAS(&&tw.getComWrapper()));
        oneDesigner._events.fireEvent(oneDesigner._me(), "SynEditcreateTextWindow", args);
        synEditEditors.insertLast(tw);
    }
    void detach() override {
        for (uint idx = 0, size = synEditEditors.length; idx < size; idx++) {
            if (synEditEditors[idx] is txtWnd) {
                synEditEditors.removeAt(idx);
                break;
            }
        }
        editorsManager._unsubsribeFromSelChange(txtWnd.ted, this);
        TextEditorWindow::detach();
    }
    void setSynEditHwnd(HWND hwnd, HWND editorHwnd, uint wndProc) {
        synEditHwnd = hwnd;
        synEditEditorHwnd = editorHwnd;
        if (!synEditWndProcInitDone) {
            initFuncDefFromAddress(wndProc, &&synEditWndProc);
            synEditWndProcInitDone = true;
        }
    }
    bool isEditorFocused() {
        if (activeTextWnd !is null) {
            if (focusedWindow == activeTextWnd.hWnd) {
                return true;
            }
        }
        return false;
    }
    void onFocused() {
        &&activeTextWnd = txtWnd;
    }
    void onUnfocused() {
        &&activeTextWnd = null;
    }
    // Вызывается после изменения выделения в штатном текстовом редакторе
    void onSelectionChanged(ITextEditor&, const TextPosition& tpStart, const TextPosition& tpEnd) override {
        array<Variant> args(2);
        args[0].setDispatch(createDispatchFromAS(&&ITextPos(tpStart)));
        args[1].setDispatch(createDispatchFromAS(&&ITextPos(tpEnd)));
        oneDesigner._events.fireEvent(oneDesigner._me(), "SynEditOnSelectionChanged", args);
    }
    void onScrollToCaretPos(ITextEditor& editor) override {
        //Message("onScrollToCaretPos");
    }
    bool getCaretPosForIS(ITEIntelliSence& teis, Point& caretPos, uint& lineHeight) override {
        //Message("getCaretPosForIS");
        GetCaretPos(caretPos);
        lineHeight = 24;
        return true;
    }
    void checkSelectionInIdle(ITextEditor& editor) override {
        //SendMessage(txtWnd.hWnd, WM_TEXTWND_CHANGED, 1);
    }
    void selectionChanged() {
        #if ver < 8.3.12
        SendMessage(txtWnd.hWnd, WM_TEXTWND_CHANGED, 0);
        #else
        SendMessage(synEditHwnd, WM_TEXTWND_CHANGED, 0);
        #endif
    }
    void onActivate() {
        SendMessage(synEditHwnd, WM_ACTIVE_CHANGED, 1);
    }
    void onDeactivate() {
        SendMessage(synEditHwnd, WM_ACTIVE_CHANGED, 0);
    }
    void handleReposition() {
        SendMessage(synEditHwnd, LM_DO_RESIZE, 0);
    }
    void onDestroy() {
        SendMessage(synEditHwnd, WM_DO_DESTROY, 0);
    }
    void doFocus() {
        array<Variant> args(1);
        args[0].setDispatch(createDispatchFromAS(&&this));
        oneDesigner._events.fireEvent(oneDesigner._me(), "SynEditDoFocusEditor", args);
        //SendMessage(synEditHwnd, WM_TEXTWND_CHANGED, 2);
    }
    bool dispatchMessage(MSG& msg, int_ptr p1) {
        bool CtrlShiftPressed = ((GetKeyState(VK_SHIFT) & 0x8000) > 0) && ((GetKeyState(VK_CONTROL) & 0x8000) > 0);
        if (CtrlShiftPressed && (msg.wParam == VK_SPACE)) {
            return false;
        }
        bool sendToEditor = false;
        if (msg.hwnd == synEditEditorHwnd) {
            sendToEditor = true;
        } else if (isEditorFocused()) {
            sendToEditor = true;
            PostMessage(synEditHwnd, WM_SETFOCUS, 0, 0);
        }
        if (sendToEditor && msg.message != WM_CHAR) {
            if (msg.message == WM_KEYDOWN || msg.message == WM_KEYUP) {
                if (msg.wParam == VK_APPS) {
                    SendMessage(hRealMainWnd, WM_SETFOCUS, 0, 0);
                    sendToEditor = false;
                }
            }
        }
        if (sendToEditor && (msg.message == WM_CHAR || msg.message == WM_KEYDOWN || msg.message == WM_KEYUP)) {
            if (synEditWindowProc(synEditEditorHwnd, msg.message, msg.wParam, msg.lParam) > 0) {
                return true;
            }
        }
        return false;
    }
    long synEditWindowProc(HWND hWnd, UINT msg, long wParam, long lParam) {
        return synEditWndProc(hWnd, msg, wParam, lParam);
    }
}

#if ver >= 8.3.12
TrapSwap trFocusTrap;
funcdef void FuncSetFocus(IWindow& w);
TrapSwap trGetFocusTrap;
funcdef int_ptr FuncGetFocus();

void initFocusTrap() {
    if (trFocusTrap.state == trapNotActive) {
        string dll = "wbase83.dll";
        trFocusTrap.setTrapByName(dll, "?set_focus@wbase@@YAXPAVIWindow@1@@Z", asCALL_CDECL, SetFocusTrap);
    } else if (trFocusTrap.state == trapDisabled) {
        trFocusTrap.swap();
    }

    if (trGetFocusTrap.state == trapNotActive) {
        string dll = "wbase83.dll";
        trGetFocusTrap.setTrapByName(dll, "?get_focus@wbase@@YAPAVIWindow@1@XZ", asCALL_CDECL, GetFocusTrap);
    } else if (trGetFocusTrap.state == trapDisabled) {
        trGetFocusTrap.swap();
    }
}

void SetFocusTrap(IWindow& w) {
    FuncSetFocus&& orig;

    /*if (w !is null) {
        IWindowView&& wv = w.unk;
        TextWnd&& tw = textDocStorage.find(wv.hwnd());
        if (tw !is null) {
            SynEditEditor&& editor = cast<SynEditEditor>(tw.editor);
            if (editor !is null) {
                editor.doFocus();
                return;
            }
        }
    }*/

    trFocusTrap.getOriginal(&&orig);
    trFocusTrap.swap();
    orig(w);
    trFocusTrap.swap();

}

int_ptr GetFocusTrap() {
    FuncGetFocus&& orig;

    trGetFocusTrap.getOriginal(&&orig);
    trGetFocusTrap.swap();
    int_ptr ret = orig();
    focusedWindow = ret;
    trGetFocusTrap.swap();

    return ret;

}

TrapSwap trResizeTrap;
funcdef void FuncTopLevelWindowOnSize(HWND w, int_ptr zPos, Rect& r, int i1);
TrapSwap trReposition;
funcdef void FuncReposition(HWND w, int_ptr zPos, Rect& r, int i1);

void initResizeTraps() {
    if (trResizeTrap.state == trapNotActive) {
    #if ver<8.3
        string dll = "wbase82.dll";
    #else
        string dll = "wbase83.dll";
    #endif
        trResizeTrap.setTrapByName(dll, "?reposition@BaseWindow@wbase@@QAEXABVZPos@2@PBURect@core@@H@Z", asCALL_THISCALL, TopLevelWindowOnSize);
    } else if (trResizeTrap.state == trapDisabled) {
        trResizeTrap.swap();
    }

    if (trReposition.state == trapNotActive) {
    #if ver<8.3
        string dll = "wbase82.dll";
    #else
        string dll = "wbase83.dll";
    #endif
        trReposition.setTrapByName(dll, "?reposition@BaseWindow@wbase@@QAEXABVZPos@2@PBURect@core@@H@Z", asCALL_THISCALL, V8RepositionTrap);
    } else if (trReposition.state == trapDisabled) {
        trReposition.swap();
    }

}

void V8RepositionTrap(HWND w, int_ptr zPos, Rect& r, int i1) {
    FuncReposition&& orig;

    trReposition.getOriginal(&&orig);
    trReposition.swap();
    orig(w, zPos, r, i1);
    trReposition.swap();

    // HWND is some other window here... so just resize'em all
    for (uint idx = 0, size = synEditEditors.length; idx < size; idx++) {
        SynEditEditor&& editor = cast<SynEditEditor>(synEditEditors[idx].editor);
        editor.handleReposition();
    }

}

void TopLevelWindowOnSize(HWND w, int_ptr zPos, Rect& r, int i1) {
    FuncTopLevelWindowOnSize&& orig;

    trResizeTrap.getOriginal(&&orig);
    trResizeTrap.swap();
    orig(w, zPos, r, i1);
    trResizeTrap.swap();

    for (uint idx = 0, size = synEditEditors.length; idx < size; idx++) {
        if (synEditEditors[idx].hWnd == w) {
            SynEditEditor&& editor = cast<SynEditEditor>(synEditEditors[idx].editor);
            if (editor !is null) {
                editor.handleReposition();
            }
        }
    }

}
#endif

// onChangeTextManager hook

TrapSwap trTextAreaModified;

void initTextAreaModifiedTraps() {
    if (trTextAreaModified.state == trapNotActive) {
    #if ver<8.3
        string dll = "core82.dll";
    #else
        string dll = "core83.dll";
    #endif
        trTextAreaModified.setTrapByName(dll, "?onTextAreaModified@TextManager@core@@UAEX_NABVTextPosition@2@111@Z", asCALL_THISCALL, textAreaModified_trap);
    } else if (trTextAreaModified.state == trapDisabled) {
        trTextAreaModified.swap();
    }
}

void disableTextAreaModifiedTrap() {
    if (trTextAreaModified.state == trapEnabled) {
        trTextAreaModified.swap();
    }
}

void textAreaModified_trap(TextManager& tm, bool b, TextPosition& beforeStart, TextPosition& beforeEnd, TextPosition& afterStart, TextPosition& afterEnd) {
    notifyTextAreaModified(tm, b, Selection(beforeStart, beforeEnd), Selection(afterStart, afterEnd));
    trTextAreaModified.swap();
    tm.onTextAreaModified(b, beforeStart, beforeEnd, afterStart, afterEnd);
    trTextAreaModified.swap();
}

void notifyTextAreaModified(TextManager& tm, bool b, Selection&& before, Selection&& after) {
    array<Variant> args(3);
    args[0].setDispatch(createDispatchFromAS(&&after));
    args[1].setDispatch(createDispatchFromAS(&&before));
    args[2].setDispatch(createDispatchFromAS(&&before));//TextManager will be here...
    oneDesigner._events.fireEvent(oneDesigner._me(), "onChangeTextManager", args);
}

TrapSwap trCaretSelection;
#if ver >= 8.3.12
funcdef int FuncSetCaretPos(HWND w, int i1, int i2);
TrapSwap trSetCaretPos;
#endif

void initCaretSelectionTraps() {
    if (trCaretSelection.state == trapNotActive) {
    #if ver<8.3
        string dll = "core82.dll";
    #else
        string dll = "core83.dll";
    #endif
        trCaretSelection.setTrapByName(dll, "?onSelectionRecalculateFinished@TextManager@core@@UAEXXZ", asCALL_THISCALL, onSelectionRecalculateFinished_trap);
    } else if (trCaretSelection.state == trapDisabled) {
        trCaretSelection.swap();
    }
#if ver >= 8.3.12
    if (trSetCaretPos.state == trapNotActive) {
        string dll = "wbase83.dll";
        trSetCaretPos.setTrapByName(dll, "?SetCaretPos@BaseWindow@wbase@@QAEHHH@Z", asCALL_THISCALL, SetCaretPos_trap);
    } else if (trSetCaretPos.state == trapDisabled) {
        trSetCaretPos.swap();
    }
#endif
}

void disableCaretSelectionTrap() {
    if (trCaretSelection.state == trapEnabled) {
        trCaretSelection.swap();
    }
}

void onSelectionRecalculateFinished_trap(TextManager& tm) {
    trCaretSelection.swap();
    for (uint idx = 0, size = synEditEditors.length; idx < size; idx++) {
        if (&&synEditEditors[idx].textDoc.tm == &&tm) {
            SynEditEditor&& editor = cast<SynEditEditor>(synEditEditors[idx].editor);
            if (editor !is null) {
                editor.selectionChanged();
            }
        }
    }
    tm.onSelectionRecalculateFinished();
    trCaretSelection.swap();
}

#if ver >= 8.3.12
int SetCaretPos_trap(HWND w, int i1, int i2) {
    FuncSetCaretPos&& orig;

    trSetCaretPos.getOriginal(&&orig);
    trSetCaretPos.swap();
    int ret = orig(w, i1, i2);
    trSetCaretPos.swap();

    for (uint idx = 0, size = synEditEditors.length; idx < size; idx++) {
        if (synEditEditors[idx].hWnd == w) {
            SynEditEditor&& editor = cast<SynEditEditor>(synEditEditors[idx].editor);
            if (editor !is null) {
                PostMessage(editor.synEditHwnd, WM_TEXTWND_CHANGED, 1, 0);
            }
        }
    }
    return ret;
}
#endif
