/* synedit.as
    Внедрение текстового редактора "SynEdit"
*/
#pragma once
#include "../../all.h"

Packet piSynEdit("synedit", function() { editorsManager._registerEditor(SynEditInfo()); return true; }, piOnMainEnter);

IDispatch&& addinObj;

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
		Addin&& a = oneDesigner._addins.byUniqueName("SynEditV8");
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
		//&&eventManager = a.invokeMacros("_Get_EventManager").getDispatch();
	}
	void doSetup() override {
		/*Addin&& a = oneDesigner._addins.byUniqueName("scintilla");
		if (a !is null)
			a.invokeMacros("_setup");
		else
			Message("Аддин scintilla не подключен");*/
	}
	TextEditorDocument&& create() override {
		return SynEditDocument();
	}
	Variant activeSynEditEditor() {
		SynEditEditor&& e;
		array<Variant> args(1);
		if (activeTextWnd !is null) {
			&&e = cast<SynEditEditor>(activeTextWnd.editor);
			if (e !is null) {
				args[0].setDispatch(createDispatchFromAS(&&e));
			}
		}
		Variant res;
		res.setDispatch(createDispatchFromAS(&&e));
        return res;
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

// Обертка над TextPosition
class ITextPos {
	int line;
	int col;
	ITextPos(const TextPosition& pos) {
		line = pos.line;
		col = pos.col;
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
		args[3].setDispatch(createDispatchFromAS(&&ITextPos(tpStart)));//TextManager will be here...
		oneDesigner._events.fireEvent(oneDesigner._me(), "SynEditonTextModified", args);
	}
/*	ScintillaEditor&& firstEditor() {
		if (activeTextWnd !is null) {
			ScintillaEditor&& e = cast<ScintillaEditor>(activeTextWnd.editor);
			if (e !is null)
				return e;
		}
		return cast<ScintillaEditor>(owner.views[0].editor);
	}

	void connect(ScintillaEditor&& se) {
		if (sciDoc == 0) {
			v8string text;
			owner.tm.save(text);
			se.scicall(SCI_SETCODEPAGE, SC_CP_UTF8, 0);
			se.scicall(SCI_SETTEXT, 0, text.str.toUtf8().ptr);
			sciDoc = se.scicall(SCI_GETDOCPOINTER);
		} else
			se.scicall(SCI_SETDOCPOINTER, 0, sciDoc);
	}*/
};

class SynEditEditor : TextEditorWindow, SelectionChangedReceiver {
	int WM_USER = 0x400;
	int WM_TEXTWND_CHANGED = WM_USER + 665;

	SynEditEditor(SynEditDocument&& o) {
	}
	void attach(TextWnd&& tw) override {
		TextEditorWindow::attach(tw);
		editorsManager._subscribeToSelChange(tw.ted, this);
		array<Variant> args(2);
        args[0].setDispatch(createDispatchFromAS(&&this));
        args[1].setDispatch(createDispatchFromAS(&&tw.getComWrapper()));
        oneDesigner._events.fireEvent(oneDesigner._me(), "SynEditcreateTextWindow", args);
	}
	void detach() override {
		editorsManager._unsubsribeFromSelChange(txtWnd.ted, this);
		TextEditorWindow::detach();
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
		//Message("checkSelectionInIdle");
		SendMessage(txtWnd.hWnd, WM_TEXTWND_CHANGED, 1);
		return;
	}
}


// onChangeTextManager hook

TrapSwap trTextAreaModified;

void initTextAreaModifiedTraps() {
	if (trTextAreaModified.state == trapNotActive) {
	#if ver<8.3
		string dll = "core82.dll";
	#else
		string dll = "core83.dll";
	#endif
	//onTextAreaModified(bool,class core::TextPosition const &,class core::TextPosition const &,
	//					class core::TextPosition const &,class core::TextPosition const &)
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
