/* colorer.as
    Внедрение текстового редактора "Scintilla"
	http://www.scintilla.org/index.html
*/
#pragma once
#include "../../all.h"

Packet piScintilla("scintilla", function() { editorsManager._registerEditor(ScintillaInfo()); return true; }, piOnMainEnter);

int_ptr hSciDll = 0;
funcdef LRESULT ScintillaFunc(int_ptr, uint, WPARAM, LPARAM);
ScintillaFunc&& sciFunc;

enum SciMarkers {
	markCurrentLine = 10,
};

enum SciStyles {
	stKeyword = STYLE_LASTPREDEFINED + 1,
	stNumbers,
	stStrings,
	stDate,
	stIds,
	stOperators,
	stRemarks,
	stPreproc,
	stLabel,
	stDirective,
	stCurrentWord,
};

class ScintillaInfo : EditorInfo {
	string name() override {
		return "Scintilla";
	}
	string extention() override {
		return "Встроенный язык";
	}
	array<string>&& extGuids() override {
		return array<string> = {string(gTextExtModule), string(gTextExtModule1)};
	}
	void activate() override {
		if (hSciDll == 0) {
			string path = pathes._tools + "scilexer.dll";
			hSciDll = LoadLibraryEx(path.cstr, 0, LOAD_WITH_ALTERED_SEARCH_PATH);
			if (hSciDll != 0) {
				int_ptr ptr = GetProcAddress(hSciDll, "Scintilla_DirectFunction".toUtf8().ptr);
				if (ptr != 0)
					initFuncDefFromAddress(ptr, &&sciFunc);
				else
					Message("Не удалось получить Scintilla_DirectFunction");
			} else
				Message("Не удалось загрузить scilexer.dll");
			// Дальше мы загружаем скрипт, который прочитает настройки редактора
			// и передаст их в ScintillaSetup
			Addin&& a = oneDesigner._addins.byUniqueName("scintilla");
			if (a is null)
				&&a = oneDesigner._addins.loadAddin("script:<core>scripts\\scintilla.js", oneDesigner._addins._libs);
			if (a is null)
				Message("Не удалось загрузить аддин scintilla");
		}
	}
	void doSetup() override {
		Addin&& a = oneDesigner._addins.byUniqueName("scintilla");
		if (a !is null)
			a.invokeMacros("_setup");
		else
			Message("Аддин scintilla не подключен");
	}
	TextEditorDocument&& create() override {
		return ScintillaDocument();
	}
};

ScintillaInternalAddin oneSciAddin;
class ScintillaInternalAddin : BuiltinAddin {
	ScintillaInternalAddin() {
		super("scintilla_int", "Внутренний аддин для scintilla", 0);
	}
	private IDispatch&& obj;
	IUnknown&& object() {
		// Если объект еще не создали - создадим
		if (obj is null)
			&&obj = createDispatchFromAS(&&sciSetup);
		return obj;
	}
};

class SciStyleDefinition {
	int _index;
	string _name;
	string fontName = "";	// Пустое имя - шрифт по умолчанию
	int size = 0;			// Размер в сотых долях пункта. 0 - размер не указан
	int weight = 0;			// Толщина. 0 - не указана
	int underline = 0;		// Подчёркнутый. 0 - не задано, 1 - нет, 2 - да
	int italic = 0;			// Курсив. 0 - не задано, 1 - нет, 2 - да
	int eolfill = 0;		// Закрашивать фон после конца строки. 0 - не задано, 1 - нет, 2 - да
	uint fore = uint(-1);	// Цвет текста. -1 - не задан
	uint back = uint(-1);	// Цвет фона. -1 - не задан
	SciStyleDefinition(int idx, const string& n) {
		_index = idx;
		_name = n;
	}
	SciStyleDefinition(int idx, const string& n, uint f, uint b = uint(-1)) {
		_index = idx;
		_name = n;
		fore = f;
		back = b;
	}
	SciStyleDefinition(int idx, const string& n, const string& fn, int s = 0, uint f = uint(-1), uint b = uint(-1)) {
		_index = idx;
		_name = n;
		fontName = fn;
		size = s;
		fore = f;
		back = b;
	}
	void _apply(ScintillaEditor&& editor, const NoCaseMap<int>& fonts) {
		if (!fontName.isEmpty()) {
			auto fnames = (fontName + ",Courier").split(",");
			for (uint i = 0; i < fnames.length; i++) {
				string n = fnames[i];
				n.trim();
				if (fonts.contains(n)) {
					//Message("Set font in style " + _index + " to " + n);
					editor.scicall(SCI_STYLESETFONT, _index, n.toUtf8().ptr);
					break;
				}
			}
		}
		if (size > 0)
			editor.scicall(SCI_STYLESETSIZEFRACTIONAL, _index, size);
		if (weight > 0)
			editor.scicall(SCI_STYLESETWEIGHT, _index, weight);
		if (underline != 0)
			editor.scicall(SCI_STYLESETUNDERLINE, _index, underline - 1);
		if (italic != 0)
			editor.scicall(SCI_STYLESETITALIC, _index, italic - 1);
		if (eolfill != 0)
			editor.scicall(SCI_STYLESETEOLFILLED, _index, eolfill - 1);
		if (fore != uint(-1))
			editor.scicall(SCI_STYLESETFORE, _index, fore);
		if (back != uint(-1))
			editor.scicall(SCI_STYLESETBACK, _index, back);
	}
};

class ScintillaSetup {
	private array<SciStyleDefinition&&> styles;
	private void addStyle(SciStyleDefinition&& d) { styles.insertLast(d); }

	ScintillaSetup() {
		addStyle(SciStyleDefinition(STYLE_DEFAULT, "Базовый стиль", "Consolas,Courier New", 1100, 0, 0xF0FBFF));
		addStyle(SciStyleDefinition(stKeyword, "Ключевые слова", 0xA55104));
		addStyle(SciStyleDefinition(stRemarks, "Комментарии", 0x008000));
		addStyle(SciStyleDefinition(stNumbers, "Числа", 0x5a8809));
		addStyle(SciStyleDefinition(stStrings, "Строки", 0x1515a3));
		addStyle(SciStyleDefinition(stDate, "Даты", 0x5a8809));
		addStyle(SciStyleDefinition(stIds, "Идентификаторы", 0x033E6B));
		addStyle(SciStyleDefinition(stOperators, "Операторы", 0x050505));
		addStyle(SciStyleDefinition(stPreproc, "Препроцессоры", 0x0E4AAB));
		addStyle(SciStyleDefinition(stLabel, "Метка", 0x09885a));
		addStyle(SciStyleDefinition(stDirective, "Директива", 0x2E75D9));
		addStyle(SciStyleDefinition(stCurrentWord, "Слово под курсором", uint(-1), 0xFFF3E7));
		
		addStyle(SciStyleDefinition(STYLE_LINENUMBER, "Номера строк", "", 900, 0xBBBBBB));
		addStyle(SciStyleDefinition(STYLE_INDENTGUIDE, "Линии выравнивания", 0xCCCCCC));
	}
	uint get_stylesCount() const {
		return styles.length;
	}
	SciStyleDefinition&& style(uint idx) const {
		return styles[idx];
	}

	uint caretWidth = 2;
	uint indentGuide = SC_IV_LOOKBOTH;
	bool highlightCurrentLine = true;
	uint clrCurrentLine = 0xF7E8D7;
	bool showLineNumbers = true;
	int useTabs = 1;
	uint tabWidth = 4;
	
	array<string>&& enumMonoSpaceFonts() {
		NoCaseMap<int> fonts;
		enumMonoFonts(fonts);
		array<string> result;
		for (auto it = fonts.begin(); !it.isEnd(); it++)
			result.insertLast(it.key);
		result.sortAsc();
		return result;
	}

	void _apply(ScintillaEditor&& ed) {
		NoCaseMap<int> fonts;
		enumMonoFonts(fonts);
		styles[0]._apply(ed, fonts);
		ed.scicall(SCI_STYLECLEARALL);
		for (uint i = 1; i < styles.length; i++)
			styles[i]._apply(ed, fonts);
		ed.scicall(SCI_SETCARETWIDTH, caretWidth);
		if (showLineNumbers)
			ed.scicall(SCI_SETMARGINWIDTHN, 0, ed.scicall(SCI_TEXTWIDTH, STYLE_LINENUMBER, "_99999".toUtf8().ptr));

		ed.scicall(SCI_MARKERSETBACK, markCurrentLine, clrCurrentLine);
		ed.scicall(SCI_SETTABWIDTH, tabWidth);
		ed.scicall(SCI_SETUSETABS, useTabs);
		ed.scicall(SCI_SETINDENTATIONGUIDES, indentGuide);
		ed.scicall(SCI_STYLESETWEIGHT, stPreproc, 600);
		ed.scicall(SCI_STYLESETWEIGHT, stDirective, 600);
	}
};
ScintillaSetup sciSetup;


class ScintillaDocument : TextEditorDocument, TextModifiedReceiver {
	int_ptr sciDoc = 0;
	bool inTextModified = false;

	void attach(TextDoc&& td) {
		TextEditorDocument::attach(td);
		editorsManager._subscribeToTextChange(td.tm, this);
	}
	void detach() {
		editorsManager._unsubsribeFromTextChange(owner.tm, this);
		TextEditorDocument::detach();
	}
	TextEditorWindow&& createEditor() {
		return ScintillaEditor(this);
	}
	void onTextModified(TextManager& tm, const TextPosition& tpStart, const TextPosition& tpEnd, const string& newText) {
		//Message("Set text " + tpstr(tpStart) + " " + tpstr(tpEnd) + " '" + newText + "'");
		if (inTextModified)
			return;
		ScintillaEditor&& editor = firstEditor();
		inTextModified = true;
		editor.inReflection = true;
		int posStart = editor.getPosition(tpStart);
		utf8string ustr = newText.toUtf8();
		if (tpStart == tpEnd) {
			editor.scicall(SCI_INSERTTEXT, posStart, ustr.ptr);
		} else {
			int posEnd = editor.getPosition(tpEnd);
			editor.scicall(SCI_SETANCHOR, posStart);
			editor.scicall(SCI_SETCURRENTPOS, posEnd);
			editor.scicall(SCI_REPLACESEL, 0, ustr.ptr);
		}
		posStart += ustr.length;
		editor.scicall(SCI_GOTOPOS, posStart);
		int x = editor.scicall(SCI_POINTXFROMPOSITION, 0, posStart);
		int y = editor.scicall(SCI_POINTYFROMPOSITION, 0, posStart);
		SetCaretPos(x, y);
		//editor.inReflection = false;
		inTextModified = false;
	}
	ScintillaEditor&& firstEditor() {
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
	}
};

class ScintillaEditor : TextEditorWindow, SelectionChangedReceiver {
	ScintillaDocument&& owner;
	ASWnd&& wnd;
	HWND hEditor;
	int_ptr editor_ptr;
	bool inReflection = false;
	int_ptr curLineMarkerHandle = 0;
	
	ScintillaEditor(ScintillaDocument&& o) {
		&&owner = o;
	}

	LRESULT scicall(uint msg, WPARAM w = 0, LPARAM l = 0) {
		return sciFunc(editor_ptr, msg, w, l);
	}
	void attach(TextWnd&& tw) override {
		TextEditorWindow::attach(tw);
		
		tw.wnd.setMessages(array<uint> = {WM_SETFOCUS, WM_DESTROY, WM_SIZE, WM_NOTIFY, WM_NCCALCSIZE, WM_CHAR, WM_KEYDOWN, WM_SYSKEYDOWN});
		hEditor = CreateWindowEx(0, "Scintilla".cstr, 0, WS_CHILD | WS_VISIBLE | WS_CLIPCHILDREN | WS_CLIPSIBLINGS,
			0, 0, 0, 0, tw.hWnd, 0, hSciDll, 0);
		editor_ptr = SendMessage(hEditor, SCI_GETDIRECTPOINTER);
		Rect rc;
		GetClientRect(txtWnd.hWnd, rc);
		if (rc.right > 0) { // Окно уже имеет размер, надо развернуться
			// Форсим пересчёт размера клиентской части
			SetWindowPos(tw.hWnd, 0, 0, 0, 0, 0, SWP_NOSIZE | SWP_NOMOVE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED);
			onSizeParent();	// Разворачиваемся
		}
		owner.connect(this);
		initWindowSettings();
		&&wnd = attachWndToFunction(hEditor, WndFunc(this.ScnWndProc), array<uint> = {WM_SETFOCUS, WM_KILLFOCUS, WM_CHAR, WM_KEYDOWN, WM_SYSKEYDOWN, WM_RBUTTONDOWN});
		editorsManager._subscribeToSelChange(tw.ted, this);
	}
	
	void detach() override {
		txtWnd.wnd.setMessages(txtWnd.defaultMessages());
		editorsManager._unsubsribeFromSelChange(txtWnd.ted, this);
		DestroyWindow(hEditor);
		TextEditorWindow::detach();
	}

	LRESULT wndProc(uint msg, WPARAM w, LPARAM l) override {
		switch (msg) {
		case WM_SETFOCUS:
			SetFocus(hEditor);
			return 0;
		case WM_SIZE:
			onSizeParent();
			break;
		case WM_NCCALCSIZE:
			return 0;	// чтобы убрать 1Сные скроллеры
		case WM_NOTIFY:
			return l != 0 ? onNotifyParent(toSCNotification(l).ref) : 0;
		case WM_CHAR:
		case WM_KEYDOWN:
		case WM_SYSKEYDOWN:
			return SendMessage(hEditor, msg, w, l);
		}
		return txtWnd.wnd.doDefault();
	}
	void createCaret(uint lineHeight) override {
		CreateCaret(hEditor, 0, 2, lineHeight);
	}
	void showCaret() override {
		ShowCaret(hEditor);
	}
	void getFontSize(Size& fontSize) override {
		fontSize.cy = scicall(SCI_TEXTHEIGHT, 0);
	}
	uint getTextWidth(const string& text, const Size& fontSize) override {
		return scicall(SCI_TEXTWIDTH, STYLE_DEFAULT, text.toUtf8().ptr);
	}
	// Вызывается после изменения выделения в штатном текстовом редакторе
	void onSelectionChanged(ITextEditor&&, const TextPosition& tpStart, const TextPosition& tpEnd) override {
		if (inReflection)	// идёт смена выделения, инициализированная нами
			return;
		// Установка этого флага блокирует уведомление штатного редактора об изменении выделения
		// в сцинтилле, чтобы избежать лишнего цикла
		inReflection = true;
		int posColStart = getPosition(tpStart);
		// если выделение "пустое", то просто переместим каретку
		if (tpStart == tpEnd) {
			scicall(SCI_GOTOPOS, posColStart);
			int x = scicall(SCI_POINTXFROMPOSITION, 0, posColStart);
			int y = scicall(SCI_POINTYFROMPOSITION, 0, posColStart);
			SetCaretPos(x, y);
		} else {
			// Иначе установим выделение
			int posColEnd = getPosition(tpEnd);
			scicall(SCI_SETSEL, posColStart, posColEnd);
		}
		inReflection = false;
	}
	void onScrollToCaretPos(ITextEditor&& editor) override {
		scicall(SCI_SCROLLCARET);
	}
	bool getCaretPosForIS(ITEIntelliSence& teis, Point& caretPos, uint& lineHeight) override {
		GetCaretPos(caretPos);
		lineHeight = scicall(SCI_TEXTHEIGHT, 0);
		return true;
	}
	void checkSelectionInIdle(ITextEditor&& editor) override {
		if (inReflection)
			inReflection = false;
		TextPosition tpStart, tpEnd, tpCaret;
		editor.getSelection(tpStart, tpEnd);
		editor.getCaretPosition(tpCaret);
		int posStart = getPosition(tpStart), posEnd;
		if (tpStart == tpEnd)
			posEnd = posStart;
		else {
			if (tpCaret == tpStart) {
				posEnd = posStart;
				posStart = getPosition(tpEnd);
			} else
				posEnd = getPosition(tpEnd);
		}
		int posAnchor = scicall(SCI_GETANCHOR);
		int posCurrent = scicall(SCI_GETCURRENTPOS);
		if (posStart != posAnchor || posEnd != posCurrent) {
			inReflection = true;
			if (posStart == posEnd) {
				scicall(SCI_GOTOPOS, posStart);
			} else {
				// Иначе установим выделение
				scicall(SCI_SETSEL, posStart, posEnd);
			}
			inReflection = false;
		}
		updateCurrentLineMarker();
	}

	LRESULT ScnWndProc(uint msg, WPARAM w, LPARAM l) {
		switch (msg) {
		case WM_SETFOCUS:
			&&activeTextWnd = txtWnd;
			break;
		case WM_KILLFOCUS:
			&&activeTextWnd = null;
			break;
		case WM_CHAR:
		{
			if ((w == VK_RETURN || w == VK_SPACE) && inReflection)
				return 0;
			LRESULT res = wnd.doDefault();
			txtWnd.onChar(w);
			return res;
		}
		case WM_KEYDOWN:
		case WM_SYSKEYDOWN:
			if (checkForSubst(w) || txtWnd.onKeyDown(w, l))
				return 0;
			break;
		case WM_RBUTTONDOWN:
			return SendMessage(txtWnd.hWnd, msg, w, l);
		}
		return wnd.doDefault();
	}
	bool checkForSubst(WPARAM w) {
		if (w == VK_RETURN || w == VK_SPACE) {
			int posSelStart = scicall(SCI_GETANCHOR);
			int posSelEnd = scicall(SCI_GETCURRENTPOS);
			if (posSelStart == posSelEnd) {
				TextPosition caretPos;
				calcPosition(posSelStart, caretPos);
				ITemplateProcessor&& tp;
				getTxtEdtService().getTemplateProcessor(tp);
				string cline = getTextLine(txtWnd.textDoc.tm, caretPos.line).substr(0, caretPos.col - 1);
				v8string line;
				if (tp.needSubstitute(v8string(cline), txtWnd.textDoc.tm, line)) {
					CommandID subst(cmdGroupTxtEdt, cmdProcessTemplate);
					if ((commandState(subst) & cmdStateEnabled) != 0)
						sendCommandToMainFrame(subst);
					inReflection = true;
					return true;
				}
			}
		}
		return false;
	}

	void initWindowSettings() {
		scicall(SCI_SETMODEVENTMASK, SC_MOD_INSERTTEXT | SC_MOD_DELETETEXT);
		scicall(SCI_SETLEXER, SCLEX_CONTAINER);
		scicall(SCI_SETMARGINMASKN, 1, scicall(SCI_GETMARGINMASKN, 1) & ~(1 << markCurrentLine));
		scicall(SCI_SETTECHNOLOGY, SC_TECHNOLOGY_DIRECTWRITE);
		//scicall(SCI_SETBUFFEREDDRAW, 1);
		sciSetup._apply(this);
	}
	void onSizeParent() {
		Rect rc;
		GetClientRect(txtWnd.hWnd, rc);
		MoveWindow(hEditor, 0, 0, rc.right, rc.bottom, 1);
	}
	LRESULT onNotifyParent(SCNotification& scn) {
		if (scn.nmhdr.hwndFrom != hEditor)
			return txtWnd.wnd.doDefault();
		switch (scn.nmhdr.code) {
		case SCN_STYLENEEDED:
			stylishText(scn);
			break;
		case SCN_UPDATEUI:
			if ((scn.updated & SC_UPDATE_SELECTION) != 0) {
				updateSelectionInParent();
				updateCurrentLineMarker();
			}
			break;
		case SCN_MODIFIED:
			if ((scn.modificationType & (SC_MOD_INSERTTEXT | SC_MOD_DELETETEXT)) != 0)
				updateTextInParent(scn);
			break;
		}
		return 0;
	}
	void updateSelectionInParent() {
		if (inReflection)
			return;
		inReflection = true;
		TextPosition tpStart, tpEnd;
		int posStart = scicall(SCI_GETANCHOR), posEnd = scicall(SCI_GETCURRENTPOS);
		calcPosition(posStart, tpStart);
		if (posEnd == posStart) {
			txtWnd.ted.setCaretPosition(tpStart);
			//Message("set caret " + tpstr(tpStart));
		} else {
			calcPosition(posEnd, tpEnd);
			txtWnd.ted.setSelection(tpStart, tpEnd, posEnd < posStart);
			//Message("set sel " + tpstr(tpStart) + " - " + tpstr(tpEnd));
		}
		inReflection = false;
	}
	void updateTextInParent(SCNotification& scn) {
		//Message(((scn.modificationType & SC_MOD_INSERTTEXT) != 0 ? "insert in " : "delete at ") + scn.position + " length=" + scn.length + " linesAdded=" + scn.linesAdded);
		if (GetFocus() == hEditor && !owner.inTextModified) {	// Обрабатываем уведомление только от окна в фокусе
			owner.inTextModified = true;
			inReflection = true;
			TextManager&& tm = txtWnd.textDoc.tm;
			ITextEditor&& ed = txtWnd.ted;
			TextPosition tpStart, tpEnd;
			calcPosition(scn.position, tpStart);
			string text;
			text.fromUtf8(utf8string(scn.text, scn.length));
			tpEnd = tpStart;
			if (scn.linesAdded != 0) {
				for (uint k = 0; k < text.length; k++) {
					if (text[k] == '\n') {
						tpEnd.line++;
						tpEnd.col = 1;
					} else
						tpEnd.col++;
				}
			} else
				tpEnd.col += text.length;

			if ((scn.modificationType & SC_MOD_INSERTTEXT) != 0) {
				ed.setCaretPosition(tpStart);
				tpStart = tpEnd;
			} else {
				ed.setSelection(tpStart, tpEnd, false);
				text.empty();
			}
			ed.setSelectionText(text);
			ed.setCaretPosition(tpStart);
			owner.inTextModified = false;
			inReflection = false;
		}
	}
	void stylishText(SCNotification& scn) {
		uint startPos = scicall(SCI_POSITIONFROMLINE, scicall(SCI_LINEFROMPOSITION, scicall(SCI_GETENDSTYLED)));
		int len = scn.position - startPos;
		Sci_TextRange tr;
		tr.chrg.cpMin = startPos;
		tr.chrg.cpMax = scn.position;
		tr.lpstrText = mem::malloc(len + 1);
		scicall(SCI_GETTEXTRANGE, 0, tr.self);
		string text;
		text.fromUtf8(utf8string(tr.lpstrText, len));
		mem::free(tr.lpstrText);
		lex_provider lp(text.cstr);
		lexem lex;
		scicall(SCI_STARTSTYLING, startPos);
		startPos = text.cstr;
		for (;;) {
			lp.nextWithKeyword(lex);
			if (lex.type == 0)
				break;
			len = lex.text.toUtf8().length;
			if (lex.start > startPos) {
				scicall(SCI_SETSTYLING, (lex.start - startPos) / 2, STYLE_DEFAULT);
				startPos = lex.start;
			}
			int style = STYLE_DEFAULT;
			int type = lexType(lex.type);
			if (type > ltName) {
				if (lex.start > text.cstr && mem::word[lex.start - 2] == '.')
					style = stIds;
				else
					style = stKeyword;
			} else if (type < ltName) {
				if (type > ltLabel)
					style = stOperators;
				else if (type == ltRemark)
					style = stRemarks;
				else if (type == ltQuote)
					style = stStrings;
				else if (type == ltDate)
					style = stDate;
				else if (type == ltNumber)
					style = stNumbers;
				else if (type == ltPreproc)
					style = stPreproc;
				else if (type == ltDirective)
					style = stDirective;
				else
					style = stLabel;
			} else
				style = stIds;
			scicall(SCI_SETSTYLING, len, style);
			startPos += lex.length * 2;
		}
	}
	int_ptr getLineText(int line) {
		int lineLen = scicall(SCI_LINELENGTH, line);
		int_ptr ptr = malloc(lineLen + 1);
		scicall(SCI_GETLINE, line, ptr);
		return ptr;
	}
	// Пересчёт из координат штатного редактора в позицию документа сцинтиллы
	int getPosition(const TextPosition& tp) {
		int col = tp.col - 1;
		int pos = scicall(SCI_POSITIONFROMLINE, tp.line - 1);
		if (col > 0) {
			v8string line;
			getTextLine(txtWnd.textDoc.tm, tp.line, line);
			int_ptr ptr = line.cstr;
			for (int idx = 0; idx < col; idx++)
				pos += utf16ToUt8Length(ptr);
		}
		return pos;
	}
	// Пересчёт из позиции документа сцинтиллы в текстовые координаты штатного редактора
	void calcPosition(int pos, TextPosition& tp) {
		int line = scicall(SCI_LINEFROMPOSITION, pos);
		int lineStart = scicall(SCI_POSITIONFROMLINE, line);
		tp.line = line + 1;
		tp.col = 1;
		if (pos > lineStart) {
			v8string l;
			getTextLine(txtWnd.textDoc.tm, tp.line, l);
			int_ptr ptr = l.cstr;
			while (lineStart < pos) {
				tp.col++;
				lineStart += utf16ToUt8Length(ptr);
			}
		}
	}
	void updateCurrentLineMarker() {
		int cl = scicall(SCI_LINEFROMPOSITION, scicall(SCI_GETCURRENTPOS));
		if (curLineMarkerHandle != 0) {
			int oldLine = scicall(SCI_MARKERLINEFROMHANDLE, curLineMarkerHandle);
			if (oldLine == cl)
				return;
			scicall(SCI_MARKERDELETEHANDLE, curLineMarkerHandle);
		}
		curLineMarkerHandle = scicall(SCI_MARKERADD, cl, markCurrentLine);
	}
};

string tpstr(const TextPosition& tp) {
	return "[" + tp.line + ", " + tp.col + "]";
}

uint utf16ToUt8Length(int_ptr& ptr) {
	uint16 s = mem::word[ptr];
	ptr += 2;
	if (s < 0x80)
		return 1;
	else if (s < 0x800)
		return 2;
	else if (s >= 0xD800 && s <= 0xDFFF) {
		// Вроде бы ни сцинтилла, ни штатный редактор не умеют полноценный utf-16 и не понимают символы > 0xFFFF,
		// но на всякий случай тут сделаю как надо по стандарту
		uint32 ss = s & 0x3FF;
		s = mem::word[ptr];
		ptr += 2;
		ss = (ss << 10) | (s & 0x3FF);
		if (ss < 0x200000)
			return 4;
		else if (ss < 0x4000000)
			return 5;
		else
			return 6;
	} else
		return 3;
}

int_ptr enumFontCallback = 0;

void enumMonoFonts(NoCaseMap<int>& fonts) {
	LOGFONT logfont;
	for (uint i = 0; i < LOGFONT_size; i++)
		mem::byte[logfont.self + i] = 0;
	logfont.lfCharSet = 1;
	logfont.lfPitchAndFamily = 1; // FIXED_PITCH;
	HDC hdc = GetDC(0);
	if (enumFontCallback == 0)
		enumFontCallback = ThunkToFunc(&&FontNameProc);
	EnumFontFamiliesEx(hdc, logfont, enumFontCallback, fonts, 0);
	ReleaseDC(0, hdc);
}

int FontNameProc(LOGFONT& lf, int_ptr lpntme, int FontType, NoCaseMap<int>& names) {
	if ((lf.lfPitchAndFamily & 1) != 0)
		names.insert(stringFromAddress(mem::addressOf(lf.lfFaceNameStart)), 1);
	return 1;
}

enum SciEnums {
	INVALID_POSITION = -1,
	SCI_START = 2000,
	SCI_OPTIONAL_START = 3000,
	SCI_LEXER_START = 4000,
	SCI_ADDTEXT = 2001,
	SCI_ADDSTYLEDTEXT = 2002,
	SCI_INSERTTEXT = 2003,
	SCI_CHANGEINSERTION = 2672,
	SCI_CLEARALL = 2004,
	SCI_DELETERANGE = 2645,
	SCI_CLEARDOCUMENTSTYLE = 2005,
	SCI_GETLENGTH = 2006,
	SCI_GETCHARAT = 2007,
	SCI_GETCURRENTPOS = 2008,
	SCI_GETANCHOR = 2009,
	SCI_GETSTYLEAT = 2010,
	SCI_REDO = 2011,
	SCI_SETUNDOCOLLECTION = 2012,
	SCI_SELECTALL = 2013,
	SCI_SETSAVEPOINT = 2014,
	SCI_GETSTYLEDTEXT = 2015,
	SCI_CANREDO = 2016,
	SCI_MARKERLINEFROMHANDLE = 2017,
	SCI_MARKERDELETEHANDLE = 2018,
	SCI_GETUNDOCOLLECTION = 2019,
	SCWS_INVISIBLE = 0,
	SCWS_VISIBLEALWAYS = 1,
	SCWS_VISIBLEAFTERINDENT = 2,
	SCWS_VISIBLEONLYININDENT = 3,
	SCI_GETVIEWWS = 2020,
	SCI_SETVIEWWS = 2021,
	SCI_POSITIONFROMPOINT = 2022,
	SCI_POSITIONFROMPOINTCLOSE = 2023,
	SCI_GOTOLINE = 2024,
	SCI_GOTOPOS = 2025,
	SCI_SETANCHOR = 2026,
	SCI_GETCURLINE = 2027,
	SCI_GETENDSTYLED = 2028,
	SC_EOL_CRLF = 0,
	SC_EOL_CR = 1,
	SC_EOL_LF = 2,
	SCI_CONVERTEOLS = 2029,
	SCI_GETEOLMODE = 2030,
	SCI_SETEOLMODE = 2031,
	SCI_STARTSTYLING = 2032,
	SCI_SETSTYLING = 2033,
	SCI_GETBUFFEREDDRAW = 2034,
	SCI_SETBUFFEREDDRAW = 2035,
	SCI_SETTABWIDTH = 2036,
	SCI_GETTABWIDTH = 2121,
	SCI_CLEARTABSTOPS = 2675,
	SCI_ADDTABSTOP = 2676,
	SCI_GETNEXTTABSTOP = 2677,
	SC_CP_UTF8 = 65001,
	SCI_SETCODEPAGE = 2037,
	SC_IME_WINDOWED = 0,
	SC_IME_INLINE = 1,
	SCI_GETIMEINTERACTION = 2678,
	SCI_SETIMEINTERACTION = 2679,
	MARKER_MAX = 31,
	SC_MARK_CIRCLE = 0,
	SC_MARK_ROUNDRECT = 1,
	SC_MARK_ARROW = 2,
	SC_MARK_SMALLRECT = 3,
	SC_MARK_SHORTARROW = 4,
	SC_MARK_EMPTY = 5,
	SC_MARK_ARROWDOWN = 6,
	SC_MARK_MINUS = 7,
	SC_MARK_PLUS = 8,
	SC_MARK_VLINE = 9,
	SC_MARK_LCORNER = 10,
	SC_MARK_TCORNER = 11,
	SC_MARK_BOXPLUS = 12,
	SC_MARK_BOXPLUSCONNECTED = 13,
	SC_MARK_BOXMINUS = 14,
	SC_MARK_BOXMINUSCONNECTED = 15,
	SC_MARK_LCORNERCURVE = 16,
	SC_MARK_TCORNERCURVE = 17,
	SC_MARK_CIRCLEPLUS = 18,
	SC_MARK_CIRCLEPLUSCONNECTED = 19,
	SC_MARK_CIRCLEMINUS = 20,
	SC_MARK_CIRCLEMINUSCONNECTED = 21,
	SC_MARK_BACKGROUND = 22,
	SC_MARK_DOTDOTDOT = 23,
	SC_MARK_ARROWS = 24,
	SC_MARK_PIXMAP = 25,
	SC_MARK_FULLRECT = 26,
	SC_MARK_LEFTRECT = 27,
	SC_MARK_AVAILABLE = 28,
	SC_MARK_UNDERLINE = 29,
	SC_MARK_RGBAIMAGE = 30,
	SC_MARK_BOOKMARK = 31,
	SC_MARK_CHARACTER = 10000,
	SC_MARKNUM_FOLDEREND = 25,
	SC_MARKNUM_FOLDEROPENMID = 26,
	SC_MARKNUM_FOLDERMIDTAIL = 27,
	SC_MARKNUM_FOLDERTAIL = 28,
	SC_MARKNUM_FOLDERSUB = 29,
	SC_MARKNUM_FOLDER = 30,
	SC_MARKNUM_FOLDEROPEN = 31,
	SC_MASK_FOLDERS = int(0xFE000000),
	SCI_MARKERDEFINE = 2040,
	SCI_MARKERSETFORE = 2041,
	SCI_MARKERSETBACK = 2042,
	SCI_MARKERSETBACKSELECTED = 2292,
	SCI_MARKERENABLEHIGHLIGHT = 2293,
	SCI_MARKERADD = 2043,
	SCI_MARKERDELETE = 2044,
	SCI_MARKERDELETEALL = 2045,
	SCI_MARKERGET = 2046,
	SCI_MARKERNEXT = 2047,
	SCI_MARKERPREVIOUS = 2048,
	SCI_MARKERDEFINEPIXMAP = 2049,
	SCI_MARKERADDSET = 2466,
	SCI_MARKERSETALPHA = 2476,
	SC_MAX_MARGIN = 4,
	SC_MARGIN_SYMBOL = 0,
	SC_MARGIN_NUMBER = 1,
	SC_MARGIN_BACK = 2,
	SC_MARGIN_FORE = 3,
	SC_MARGIN_TEXT = 4,
	SC_MARGIN_RTEXT = 5,
	SCI_SETMARGINTYPEN = 2240,
	SCI_GETMARGINTYPEN = 2241,
	SCI_SETMARGINWIDTHN = 2242,
	SCI_GETMARGINWIDTHN = 2243,
	SCI_SETMARGINMASKN = 2244,
	SCI_GETMARGINMASKN = 2245,
	SCI_SETMARGINSENSITIVEN = 2246,
	SCI_GETMARGINSENSITIVEN = 2247,
	SCI_SETMARGINCURSORN = 2248,
	SCI_GETMARGINCURSORN = 2249,
	STYLE_DEFAULT = 32,
	STYLE_LINENUMBER = 33,
	STYLE_BRACELIGHT = 34,
	STYLE_BRACEBAD = 35,
	STYLE_CONTROLCHAR = 36,
	STYLE_INDENTGUIDE = 37,
	STYLE_CALLTIP = 38,
	STYLE_LASTPREDEFINED = 39,
	STYLE_MAX = 255,
	SC_CHARSET_ANSI = 0,
	SC_CHARSET_DEFAULT = 1,
	SC_CHARSET_BALTIC = 186,
	SC_CHARSET_CHINESEBIG5 = 136,
	SC_CHARSET_EASTEUROPE = 238,
	SC_CHARSET_GB2312 = 134,
	SC_CHARSET_GREEK = 161,
	SC_CHARSET_HANGUL = 129,
	SC_CHARSET_MAC = 77,
	SC_CHARSET_OEM = 255,
	SC_CHARSET_RUSSIAN = 204,
	SC_CHARSET_OEM866 = 866,
	SC_CHARSET_CYRILLIC = 1251,
	SC_CHARSET_SHIFTJIS = 128,
	SC_CHARSET_SYMBOL = 2,
	SC_CHARSET_TURKISH = 162,
	SC_CHARSET_JOHAB = 130,
	SC_CHARSET_HEBREW = 177,
	SC_CHARSET_ARABIC = 178,
	SC_CHARSET_VIETNAMESE = 163,
	SC_CHARSET_THAI = 222,
	SC_CHARSET_8859_15 = 1000,
	SCI_STYLECLEARALL = 2050,
	SCI_STYLESETFORE = 2051,
	SCI_STYLESETBACK = 2052,
	SCI_STYLESETBOLD = 2053,
	SCI_STYLESETITALIC = 2054,
	SCI_STYLESETSIZE = 2055,
	SCI_STYLESETFONT = 2056,
	SCI_STYLESETEOLFILLED = 2057,
	SCI_STYLERESETDEFAULT = 2058,
	SCI_STYLESETUNDERLINE = 2059,
	SC_CASE_MIXED = 0,
	SC_CASE_UPPER = 1,
	SC_CASE_LOWER = 2,
	SC_CASE_CAMEL = 3,
	SCI_STYLEGETFORE = 2481,
	SCI_STYLEGETBACK = 2482,
	SCI_STYLEGETBOLD = 2483,
	SCI_STYLEGETITALIC = 2484,
	SCI_STYLEGETSIZE = 2485,
	SCI_STYLEGETFONT = 2486,
	SCI_STYLEGETEOLFILLED = 2487,
	SCI_STYLEGETUNDERLINE = 2488,
	SCI_STYLEGETCASE = 2489,
	SCI_STYLEGETCHARACTERSET = 2490,
	SCI_STYLEGETVISIBLE = 2491,
	SCI_STYLEGETCHANGEABLE = 2492,
	SCI_STYLEGETHOTSPOT = 2493,
	SCI_STYLESETCASE = 2060,
	SC_FONT_SIZE_MULTIPLIER = 100,
	SCI_STYLESETSIZEFRACTIONAL = 2061,
	SCI_STYLEGETSIZEFRACTIONAL = 2062,
	SC_WEIGHT_NORMAL = 400,
	SC_WEIGHT_SEMIBOLD = 600,
	SC_WEIGHT_BOLD = 700,
	SCI_STYLESETWEIGHT = 2063,
	SCI_STYLEGETWEIGHT = 2064,
	SCI_STYLESETCHARACTERSET = 2066,
	SCI_STYLESETHOTSPOT = 2409,
	SCI_SETSELFORE = 2067,
	SCI_SETSELBACK = 2068,
	SCI_GETSELALPHA = 2477,
	SCI_SETSELALPHA = 2478,
	SCI_GETSELEOLFILLED = 2479,
	SCI_SETSELEOLFILLED = 2480,
	SCI_SETCARETFORE = 2069,
	SCI_ASSIGNCMDKEY = 2070,
	SCI_CLEARCMDKEY = 2071,
	SCI_CLEARALLCMDKEYS = 2072,
	SCI_SETSTYLINGEX = 2073,
	SCI_STYLESETVISIBLE = 2074,
	SCI_GETCARETPERIOD = 2075,
	SCI_SETCARETPERIOD = 2076,
	SCI_SETWORDCHARS = 2077,
	SCI_GETWORDCHARS = 2646,
	SCI_BEGINUNDOACTION = 2078,
	SCI_ENDUNDOACTION = 2079,
	INDIC_PLAIN = 0,
	INDIC_SQUIGGLE = 1,
	INDIC_TT = 2,
	INDIC_DIAGONAL = 3,
	INDIC_STRIKE = 4,
	INDIC_HIDDEN = 5,
	INDIC_BOX = 6,
	INDIC_ROUNDBOX = 7,
	INDIC_STRAIGHTBOX = 8,
	INDIC_DASH = 9,
	INDIC_DOTS = 10,
	INDIC_SQUIGGLELOW = 11,
	INDIC_DOTBOX = 12,
	INDIC_SQUIGGLEPIXMAP = 13,
	INDIC_COMPOSITIONTHICK = 14,
	INDIC_COMPOSITIONTHIN = 15,
	INDIC_FULLBOX = 16,
	INDIC_TEXTFORE = 17,
	INDIC_IME = 32,
	INDIC_IME_MAX = 35,
	INDIC_MAX = 35,
	INDIC_CONTAINER = 8,
	INDIC0_MASK = 0x20,
	INDIC1_MASK = 0x40,
	INDIC2_MASK = 0x80,
	INDICS_MASK = 0xE0,
	SCI_INDICSETSTYLE = 2080,
	SCI_INDICGETSTYLE = 2081,
	SCI_INDICSETFORE = 2082,
	SCI_INDICGETFORE = 2083,
	SCI_INDICSETUNDER = 2510,
	SCI_INDICGETUNDER = 2511,
	SCI_INDICSETHOVERSTYLE = 2680,
	SCI_INDICGETHOVERSTYLE = 2681,
	SCI_INDICSETHOVERFORE = 2682,
	SCI_INDICGETHOVERFORE = 2683,
	SC_INDICVALUEBIT = 0x1000000,
	SC_INDICVALUEMASK = 0xFFFFFF,
	SC_INDICFLAG_VALUEFORE = 1,
	SCI_INDICSETFLAGS = 2684,
	SCI_INDICGETFLAGS = 2685,
	SCI_SETWHITESPACEFORE = 2084,
	SCI_SETWHITESPACEBACK = 2085,
	SCI_SETWHITESPACESIZE = 2086,
	SCI_GETWHITESPACESIZE = 2087,
	SCI_SETSTYLEBITS = 2090,
	SCI_GETSTYLEBITS = 2091,
	SCI_SETLINESTATE = 2092,
	SCI_GETLINESTATE = 2093,
	SCI_GETMAXLINESTATE = 2094,
	SCI_GETCARETLINEVISIBLE = 2095,
	SCI_SETCARETLINEVISIBLE = 2096,
	SCI_GETCARETLINEBACK = 2097,
	SCI_SETCARETLINEBACK = 2098,
	SCI_STYLESETCHANGEABLE = 2099,
	SCI_AUTOCSHOW = 2100,
	SCI_AUTOCCANCEL = 2101,
	SCI_AUTOCACTIVE = 2102,
	SCI_AUTOCPOSSTART = 2103,
	SCI_AUTOCCOMPLETE = 2104,
	SCI_AUTOCSTOPS = 2105,
	SCI_AUTOCSETSEPARATOR = 2106,
	SCI_AUTOCGETSEPARATOR = 2107,
	SCI_AUTOCSELECT = 2108,
	SCI_AUTOCSETCANCELATSTART = 2110,
	SCI_AUTOCGETCANCELATSTART = 2111,
	SCI_AUTOCSETFILLUPS = 2112,
	SCI_AUTOCSETCHOOSESINGLE = 2113,
	SCI_AUTOCGETCHOOSESINGLE = 2114,
	SCI_AUTOCSETIGNORECASE = 2115,
	SCI_AUTOCGETIGNORECASE = 2116,
	SCI_USERLISTSHOW = 2117,
	SCI_AUTOCSETAUTOHIDE = 2118,
	SCI_AUTOCGETAUTOHIDE = 2119,
	SCI_AUTOCSETDROPRESTOFWORD = 2270,
	SCI_AUTOCGETDROPRESTOFWORD = 2271,
	SCI_REGISTERIMAGE = 2405,
	SCI_CLEARREGISTEREDIMAGES = 2408,
	SCI_AUTOCGETTYPESEPARATOR = 2285,
	SCI_AUTOCSETTYPESEPARATOR = 2286,
	SCI_AUTOCSETMAXWIDTH = 2208,
	SCI_AUTOCGETMAXWIDTH = 2209,
	SCI_AUTOCSETMAXHEIGHT = 2210,
	SCI_AUTOCGETMAXHEIGHT = 2211,
	SCI_SETINDENT = 2122,
	SCI_GETINDENT = 2123,
	SCI_SETUSETABS = 2124,
	SCI_GETUSETABS = 2125,
	SCI_SETLINEINDENTATION = 2126,
	SCI_GETLINEINDENTATION = 2127,
	SCI_GETLINEINDENTPOSITION = 2128,
	SCI_GETCOLUMN = 2129,
	SCI_COUNTCHARACTERS = 2633,
	SCI_SETHSCROLLBAR = 2130,
	SCI_GETHSCROLLBAR = 2131,
	SC_IV_NONE = 0,
	SC_IV_REAL = 1,
	SC_IV_LOOKFORWARD = 2,
	SC_IV_LOOKBOTH = 3,
	SCI_SETINDENTATIONGUIDES = 2132,
	SCI_GETINDENTATIONGUIDES = 2133,
	SCI_SETHIGHLIGHTGUIDE = 2134,
	SCI_GETHIGHLIGHTGUIDE = 2135,
	SCI_GETLINEENDPOSITION = 2136,
	SCI_GETCODEPAGE = 2137,
	SCI_GETCARETFORE = 2138,
	SCI_GETREADONLY = 2140,
	SCI_SETCURRENTPOS = 2141,
	SCI_SETSELECTIONSTART = 2142,
	SCI_GETSELECTIONSTART = 2143,
	SCI_SETSELECTIONEND = 2144,
	SCI_GETSELECTIONEND = 2145,
	SCI_SETEMPTYSELECTION = 2556,
	SCI_SETPRINTMAGNIFICATION = 2146,
	SCI_GETPRINTMAGNIFICATION = 2147,
	SC_PRINT_NORMAL = 0,
	SC_PRINT_INVERTLIGHT = 1,
	SC_PRINT_BLACKONWHITE = 2,
	SC_PRINT_COLOURONWHITE = 3,
	SC_PRINT_COLOURONWHITEDEFAULTBG = 4,
	SCI_SETPRINTCOLOURMODE = 2148,
	SCI_GETPRINTCOLOURMODE = 2149,
	SCFIND_WHOLEWORD = 0x2,
	SCFIND_MATCHCASE = 0x4,
	SCFIND_WORDSTART = 0x00100000,
	SCFIND_REGEXP = 0x00200000,
	SCFIND_POSIX = 0x00400000,
	SCFIND_CXX11REGEX = 0x00800000,
	SCI_FINDTEXT = 2150,
	SCI_FORMATRANGE = 2151,
	SCI_GETFIRSTVISIBLELINE = 2152,
	SCI_GETLINE = 2153,
	SCI_GETLINECOUNT = 2154,
	SCI_SETMARGINLEFT = 2155,
	SCI_GETMARGINLEFT = 2156,
	SCI_SETMARGINRIGHT = 2157,
	SCI_GETMARGINRIGHT = 2158,
	SCI_GETMODIFY = 2159,
	SCI_SETSEL = 2160,
	SCI_GETSELTEXT = 2161,
	SCI_GETTEXTRANGE = 2162,
	SCI_HIDESELECTION = 2163,
	SCI_POINTXFROMPOSITION = 2164,
	SCI_POINTYFROMPOSITION = 2165,
	SCI_LINEFROMPOSITION = 2166,
	SCI_POSITIONFROMLINE = 2167,
	SCI_LINESCROLL = 2168,
	SCI_SCROLLCARET = 2169,
	SCI_SCROLLRANGE = 2569,
	SCI_REPLACESEL = 2170,
	SCI_SETREADONLY = 2171,
	SCI_NULL = 2172,
	SCI_CANPASTE = 2173,
	SCI_CANUNDO = 2174,
	SCI_EMPTYUNDOBUFFER = 2175,
	SCI_UNDO = 2176,
	SCI_CUT = 2177,
	SCI_COPY = 2178,
	SCI_PASTE = 2179,
	SCI_CLEAR = 2180,
	SCI_SETTEXT = 2181,
	SCI_GETTEXT = 2182,
	SCI_GETTEXTLENGTH = 2183,
	SCI_GETDIRECTFUNCTION = 2184,
	SCI_GETDIRECTPOINTER = 2185,
	SCI_SETOVERTYPE = 2186,
	SCI_GETOVERTYPE = 2187,
	SCI_SETCARETWIDTH = 2188,
	SCI_GETCARETWIDTH = 2189,
	SCI_SETTARGETSTART = 2190,
	SCI_GETTARGETSTART = 2191,
	SCI_SETTARGETEND = 2192,
	SCI_GETTARGETEND = 2193,
	SCI_SETTARGETRANGE = 2686,
	SCI_GETTARGETTEXT = 2687,
	SCI_TARGETFROMSELECTION = 2287,
	SCI_TARGETWHOLEDOCUMENT = 2690,
	SCI_REPLACETARGET = 2194,
	SCI_REPLACETARGETRE = 2195,
	SCI_SEARCHINTARGET = 2197,
	SCI_SETSEARCHFLAGS = 2198,
	SCI_GETSEARCHFLAGS = 2199,
	SCI_CALLTIPSHOW = 2200,
	SCI_CALLTIPCANCEL = 2201,
	SCI_CALLTIPACTIVE = 2202,
	SCI_CALLTIPPOSSTART = 2203,
	SCI_CALLTIPSETPOSSTART = 2214,
	SCI_CALLTIPSETHLT = 2204,
	SCI_CALLTIPSETBACK = 2205,
	SCI_CALLTIPSETFORE = 2206,
	SCI_CALLTIPSETFOREHLT = 2207,
	SCI_CALLTIPUSESTYLE = 2212,
	SCI_CALLTIPSETPOSITION = 2213,
	SCI_VISIBLEFROMDOCLINE = 2220,
	SCI_DOCLINEFROMVISIBLE = 2221,
	SCI_WRAPCOUNT = 2235,
	SC_FOLDLEVELBASE = 0x400,
	SC_FOLDLEVELWHITEFLAG = 0x1000,
	SC_FOLDLEVELHEADERFLAG = 0x2000,
	SC_FOLDLEVELNUMBERMASK = 0x0FFF,
	SCI_SETFOLDLEVEL = 2222,
	SCI_GETFOLDLEVEL = 2223,
	SCI_GETLASTCHILD = 2224,
	SCI_GETFOLDPARENT = 2225,
	SCI_SHOWLINES = 2226,
	SCI_HIDELINES = 2227,
	SCI_GETLINEVISIBLE = 2228,
	SCI_GETALLLINESVISIBLE = 2236,
	SCI_SETFOLDEXPANDED = 2229,
	SCI_GETFOLDEXPANDED = 2230,
	SCI_TOGGLEFOLD = 2231,
	SC_FOLDACTION_CONTRACT = 0,
	SC_FOLDACTION_EXPAND = 1,
	SC_FOLDACTION_TOGGLE = 2,
	SCI_FOLDLINE = 2237,
	SCI_FOLDCHILDREN = 2238,
	SCI_EXPANDCHILDREN = 2239,
	SCI_FOLDALL = 2662,
	SCI_ENSUREVISIBLE = 2232,
	SC_AUTOMATICFOLD_SHOW = 0x0001,
	SC_AUTOMATICFOLD_CLICK = 0x0002,
	SC_AUTOMATICFOLD_CHANGE = 0x0004,
	SCI_SETAUTOMATICFOLD = 2663,
	SCI_GETAUTOMATICFOLD = 2664,
	SC_FOLDFLAG_LINEBEFORE_EXPANDED = 0x0002,
	SC_FOLDFLAG_LINEBEFORE_CONTRACTED = 0x0004,
	SC_FOLDFLAG_LINEAFTER_EXPANDED = 0x0008,
	SC_FOLDFLAG_LINEAFTER_CONTRACTED = 0x0010,
	SC_FOLDFLAG_LEVELNUMBERS = 0x0040,
	SC_FOLDFLAG_LINESTATE = 0x0080,
	SCI_SETFOLDFLAGS = 2233,
	SCI_ENSUREVISIBLEENFORCEPOLICY = 2234,
	SCI_SETTABINDENTS = 2260,
	SCI_GETTABINDENTS = 2261,
	SCI_SETBACKSPACEUNINDENTS = 2262,
	SCI_GETBACKSPACEUNINDENTS = 2263,
	SC_TIME_FOREVER = 10000000,
	SCI_SETMOUSEDWELLTIME = 2264,
	SCI_GETMOUSEDWELLTIME = 2265,
	SCI_WORDSTARTPOSITION = 2266,
	SCI_WORDENDPOSITION = 2267,
	SCI_ISRANGEWORD = 2691,
	SC_IDLESTYLING_NONE = 0,
	SC_IDLESTYLING_TOVISIBLE = 1,
	SC_IDLESTYLING_AFTERVISIBLE = 2,
	SC_IDLESTYLING_ALL = 3,
	SCI_SETIDLESTYLING = 2692,
	SCI_GETIDLESTYLING = 2693,
	SC_WRAP_NONE = 0,
	SC_WRAP_WORD = 1,
	SC_WRAP_CHAR = 2,
	SC_WRAP_WHITESPACE = 3,
	SCI_SETWRAPMODE = 2268,
	SCI_GETWRAPMODE = 2269,
	SC_WRAPVISUALFLAG_NONE = 0x0000,
	SC_WRAPVISUALFLAG_END = 0x0001,
	SC_WRAPVISUALFLAG_START = 0x0002,
	SC_WRAPVISUALFLAG_MARGIN = 0x0004,
	SCI_SETWRAPVISUALFLAGS = 2460,
	SCI_GETWRAPVISUALFLAGS = 2461,
	SC_WRAPVISUALFLAGLOC_DEFAULT = 0x0000,
	SC_WRAPVISUALFLAGLOC_END_BY_TEXT = 0x0001,
	SC_WRAPVISUALFLAGLOC_START_BY_TEXT = 0x0002,
	SCI_SETWRAPVISUALFLAGSLOCATION = 2462,
	SCI_GETWRAPVISUALFLAGSLOCATION = 2463,
	SCI_SETWRAPSTARTINDENT = 2464,
	SCI_GETWRAPSTARTINDENT = 2465,
	SC_WRAPINDENT_FIXED = 0,
	SC_WRAPINDENT_SAME = 1,
	SC_WRAPINDENT_INDENT = 2,
	SCI_SETWRAPINDENTMODE = 2472,
	SCI_GETWRAPINDENTMODE = 2473,
	SC_CACHE_NONE = 0,
	SC_CACHE_CARET = 1,
	SC_CACHE_PAGE = 2,
	SC_CACHE_DOCUMENT = 3,
	SCI_SETLAYOUTCACHE = 2272,
	SCI_GETLAYOUTCACHE = 2273,
	SCI_SETSCROLLWIDTH = 2274,
	SCI_GETSCROLLWIDTH = 2275,
	SCI_SETSCROLLWIDTHTRACKING = 2516,
	SCI_GETSCROLLWIDTHTRACKING = 2517,
	SCI_TEXTWIDTH = 2276,
	SCI_SETENDATLASTLINE = 2277,
	SCI_GETENDATLASTLINE = 2278,
	SCI_TEXTHEIGHT = 2279,
	SCI_SETVSCROLLBAR = 2280,
	SCI_GETVSCROLLBAR = 2281,
	SCI_APPENDTEXT = 2282,
	SCI_GETTWOPHASEDRAW = 2283,
	SCI_SETTWOPHASEDRAW = 2284,
	SC_PHASES_ONE = 0,
	SC_PHASES_TWO = 1,
	SC_PHASES_MULTIPLE = 2,
	SCI_GETPHASESDRAW = 2673,
	SCI_SETPHASESDRAW = 2674,
	SC_EFF_QUALITY_MASK = 0xF,
	SC_EFF_QUALITY_DEFAULT = 0,
	SC_EFF_QUALITY_NON_ANTIALIASED = 1,
	SC_EFF_QUALITY_ANTIALIASED = 2,
	SC_EFF_QUALITY_LCD_OPTIMIZED = 3,
	SCI_SETFONTQUALITY = 2611,
	SCI_GETFONTQUALITY = 2612,
	SCI_SETFIRSTVISIBLELINE = 2613,
	SC_MULTIPASTE_ONCE = 0,
	SC_MULTIPASTE_EACH = 1,
	SCI_SETMULTIPASTE = 2614,
	SCI_GETMULTIPASTE = 2615,
	SCI_GETTAG = 2616,
	SCI_LINESJOIN = 2288,
	SCI_LINESSPLIT = 2289,
	SCI_SETFOLDMARGINCOLOUR = 2290,
	SCI_SETFOLDMARGINHICOLOUR = 2291,
	SCI_LINEDOWN = 2300,
	SCI_LINEDOWNEXTEND = 2301,
	SCI_LINEUP = 2302,
	SCI_LINEUPEXTEND = 2303,
	SCI_CHARLEFT = 2304,
	SCI_CHARLEFTEXTEND = 2305,
	SCI_CHARRIGHT = 2306,
	SCI_CHARRIGHTEXTEND = 2307,
	SCI_WORDLEFT = 2308,
	SCI_WORDLEFTEXTEND = 2309,
	SCI_WORDRIGHT = 2310,
	SCI_WORDRIGHTEXTEND = 2311,
	SCI_HOME = 2312,
	SCI_HOMEEXTEND = 2313,
	SCI_LINEEND = 2314,
	SCI_LINEENDEXTEND = 2315,
	SCI_DOCUMENTSTART = 2316,
	SCI_DOCUMENTSTARTEXTEND = 2317,
	SCI_DOCUMENTEND = 2318,
	SCI_DOCUMENTENDEXTEND = 2319,
	SCI_PAGEUP = 2320,
	SCI_PAGEUPEXTEND = 2321,
	SCI_PAGEDOWN = 2322,
	SCI_PAGEDOWNEXTEND = 2323,
	SCI_EDITTOGGLEOVERTYPE = 2324,
	SCI_CANCEL = 2325,
	SCI_DELETEBACK = 2326,
	SCI_TAB = 2327,
	SCI_BACKTAB = 2328,
	SCI_NEWLINE = 2329,
	SCI_FORMFEED = 2330,
	SCI_VCHOME = 2331,
	SCI_VCHOMEEXTEND = 2332,
	SCI_ZOOMIN = 2333,
	SCI_ZOOMOUT = 2334,
	SCI_DELWORDLEFT = 2335,
	SCI_DELWORDRIGHT = 2336,
	SCI_DELWORDRIGHTEND = 2518,
	SCI_LINECUT = 2337,
	SCI_LINEDELETE = 2338,
	SCI_LINETRANSPOSE = 2339,
	SCI_LINEDUPLICATE = 2404,
	SCI_LOWERCASE = 2340,
	SCI_UPPERCASE = 2341,
	SCI_LINESCROLLDOWN = 2342,
	SCI_LINESCROLLUP = 2343,
	SCI_DELETEBACKNOTLINE = 2344,
	SCI_HOMEDISPLAY = 2345,
	SCI_HOMEDISPLAYEXTEND = 2346,
	SCI_LINEENDDISPLAY = 2347,
	SCI_LINEENDDISPLAYEXTEND = 2348,
	SCI_HOMEWRAP = 2349,
	SCI_HOMEWRAPEXTEND = 2450,
	SCI_LINEENDWRAP = 2451,
	SCI_LINEENDWRAPEXTEND = 2452,
	SCI_VCHOMEWRAP = 2453,
	SCI_VCHOMEWRAPEXTEND = 2454,
	SCI_LINECOPY = 2455,
	SCI_MOVECARETINSIDEVIEW = 2401,
	SCI_LINELENGTH = 2350,
	SCI_BRACEHIGHLIGHT = 2351,
	SCI_BRACEHIGHLIGHTINDICATOR = 2498,
	SCI_BRACEBADLIGHT = 2352,
	SCI_BRACEBADLIGHTINDICATOR = 2499,
	SCI_BRACEMATCH = 2353,
	SCI_GETVIEWEOL = 2355,
	SCI_SETVIEWEOL = 2356,
	SCI_GETDOCPOINTER = 2357,
	SCI_SETDOCPOINTER = 2358,
	SCI_SETMODEVENTMASK = 2359,
	EDGE_NONE = 0,
	EDGE_LINE = 1,
	EDGE_BACKGROUND = 2,
	SCI_GETEDGECOLUMN = 2360,
	SCI_SETEDGECOLUMN = 2361,
	SCI_GETEDGEMODE = 2362,
	SCI_SETEDGEMODE = 2363,
	SCI_GETEDGECOLOUR = 2364,
	SCI_SETEDGECOLOUR = 2365,
	SCI_SEARCHANCHOR = 2366,
	SCI_SEARCHNEXT = 2367,
	SCI_SEARCHPREV = 2368,
	SCI_LINESONSCREEN = 2370,
	SCI_USEPOPUP = 2371,
	SCI_SELECTIONISRECTANGLE = 2372,
	SCI_SETZOOM = 2373,
	SCI_GETZOOM = 2374,
	SCI_CREATEDOCUMENT = 2375,
	SCI_ADDREFDOCUMENT = 2376,
	SCI_RELEASEDOCUMENT = 2377,
	SCI_GETMODEVENTMASK = 2378,
	SCI_SETFOCUS = 2380,
	SCI_GETFOCUS = 2381,
	SC_STATUS_OK = 0,
	SC_STATUS_FAILURE = 1,
	SC_STATUS_BADALLOC = 2,
	SC_STATUS_WARN_START = 1000,
	SC_STATUS_WARN_REGEX = 1001,
	SCI_SETSTATUS = 2382,
	SCI_GETSTATUS = 2383,
	SCI_SETMOUSEDOWNCAPTURES = 2384,
	SCI_GETMOUSEDOWNCAPTURES = 2385,
	SC_CURSORNORMAL = -1,
	SC_CURSORARROW = 2,
	SC_CURSORWAIT = 4,
	SC_CURSORREVERSEARROW = 7,
	SCI_SETCURSOR = 2386,
	SCI_GETCURSOR = 2387,
	SCI_SETCONTROLCHARSYMBOL = 2388,
	SCI_GETCONTROLCHARSYMBOL = 2389,
	SCI_WORDPARTLEFT = 2390,
	SCI_WORDPARTLEFTEXTEND = 2391,
	SCI_WORDPARTRIGHT = 2392,
	SCI_WORDPARTRIGHTEXTEND = 2393,
	VISIBLE_SLOP = 0x01,
	VISIBLE_STRICT = 0x04,
	SCI_SETVISIBLEPOLICY = 2394,
	SCI_DELLINELEFT = 2395,
	SCI_DELLINERIGHT = 2396,
	SCI_SETXOFFSET = 2397,
	SCI_GETXOFFSET = 2398,
	SCI_CHOOSECARETX = 2399,
	SCI_GRABFOCUS = 2400,
	CARET_SLOP = 0x01,
	CARET_STRICT = 0x04,
	CARET_JUMPS = 0x10,
	CARET_EVEN = 0x08,
	SCI_SETXCARETPOLICY = 2402,
	SCI_SETYCARETPOLICY = 2403,
	SCI_SETPRINTWRAPMODE = 2406,
	SCI_GETPRINTWRAPMODE = 2407,
	SCI_SETHOTSPOTACTIVEFORE = 2410,
	SCI_GETHOTSPOTACTIVEFORE = 2494,
	SCI_SETHOTSPOTACTIVEBACK = 2411,
	SCI_GETHOTSPOTACTIVEBACK = 2495,
	SCI_SETHOTSPOTACTIVEUNDERLINE = 2412,
	SCI_GETHOTSPOTACTIVEUNDERLINE = 2496,
	SCI_SETHOTSPOTSINGLELINE = 2421,
	SCI_GETHOTSPOTSINGLELINE = 2497,
	SCI_PARADOWN = 2413,
	SCI_PARADOWNEXTEND = 2414,
	SCI_PARAUP = 2415,
	SCI_PARAUPEXTEND = 2416,
	SCI_POSITIONBEFORE = 2417,
	SCI_POSITIONAFTER = 2418,
	SCI_POSITIONRELATIVE = 2670,
	SCI_COPYRANGE = 2419,
	SCI_COPYTEXT = 2420,
	SC_SEL_STREAM = 0,
	SC_SEL_RECTANGLE = 1,
	SC_SEL_LINES = 2,
	SC_SEL_THIN = 3,
	SCI_SETSELECTIONMODE = 2422,
	SCI_GETSELECTIONMODE = 2423,
	SCI_GETLINESELSTARTPOSITION = 2424,
	SCI_GETLINESELENDPOSITION = 2425,
	SCI_LINEDOWNRECTEXTEND = 2426,
	SCI_LINEUPRECTEXTEND = 2427,
	SCI_CHARLEFTRECTEXTEND = 2428,
	SCI_CHARRIGHTRECTEXTEND = 2429,
	SCI_HOMERECTEXTEND = 2430,
	SCI_VCHOMERECTEXTEND = 2431,
	SCI_LINEENDRECTEXTEND = 2432,
	SCI_PAGEUPRECTEXTEND = 2433,
	SCI_PAGEDOWNRECTEXTEND = 2434,
	SCI_STUTTEREDPAGEUP = 2435,
	SCI_STUTTEREDPAGEUPEXTEND = 2436,
	SCI_STUTTEREDPAGEDOWN = 2437,
	SCI_STUTTEREDPAGEDOWNEXTEND = 2438,
	SCI_WORDLEFTEND = 2439,
	SCI_WORDLEFTENDEXTEND = 2440,
	SCI_WORDRIGHTEND = 2441,
	SCI_WORDRIGHTENDEXTEND = 2442,
	SCI_SETWHITESPACECHARS = 2443,
	SCI_GETWHITESPACECHARS = 2647,
	SCI_SETPUNCTUATIONCHARS = 2648,
	SCI_GETPUNCTUATIONCHARS = 2649,
	SCI_SETCHARSDEFAULT = 2444,
	SCI_AUTOCGETCURRENT = 2445,
	SCI_AUTOCGETCURRENTTEXT = 2610,
	SC_CASEINSENSITIVEBEHAVIOUR_RESPECTCASE = 0,
	SC_CASEINSENSITIVEBEHAVIOUR_IGNORECASE = 1,
	SCI_AUTOCSETCASEINSENSITIVEBEHAVIOUR = 2634,
	SCI_AUTOCGETCASEINSENSITIVEBEHAVIOUR = 2635,
	SC_MULTIAUTOC_ONCE = 0,
	SC_MULTIAUTOC_EACH = 1,
	SCI_AUTOCSETMULTI = 2636,
	SCI_AUTOCGETMULTI = 2637,
	SC_ORDER_PRESORTED = 0,
	SC_ORDER_PERFORMSORT = 1,
	SC_ORDER_CUSTOM = 2,
	SCI_AUTOCSETORDER = 2660,
	SCI_AUTOCGETORDER = 2661,
	SCI_ALLOCATE = 2446,
	SCI_TARGETASUTF8 = 2447,
	SCI_SETLENGTHFORENCODE = 2448,
	SCI_ENCODEDFROMUTF8 = 2449,
	SCI_FINDCOLUMN = 2456,
	SCI_GETCARETSTICKY = 2457,
	SCI_SETCARETSTICKY = 2458,
	SC_CARETSTICKY_OFF = 0,
	SC_CARETSTICKY_ON = 1,
	SC_CARETSTICKY_WHITESPACE = 2,
	SCI_TOGGLECARETSTICKY = 2459,
	SCI_SETPASTECONVERTENDINGS = 2467,
	SCI_GETPASTECONVERTENDINGS = 2468,
	SCI_SELECTIONDUPLICATE = 2469,
	SC_ALPHA_TRANSPARENT = 0,
	SC_ALPHA_OPAQUE = 255,
	SC_ALPHA_NOALPHA = 256,
	SCI_SETCARETLINEBACKALPHA = 2470,
	SCI_GETCARETLINEBACKALPHA = 2471,
	CARETSTYLE_INVISIBLE = 0,
	CARETSTYLE_LINE = 1,
	CARETSTYLE_BLOCK = 2,
	SCI_SETCARETSTYLE = 2512,
	SCI_GETCARETSTYLE = 2513,
	SCI_SETINDICATORCURRENT = 2500,
	SCI_GETINDICATORCURRENT = 2501,
	SCI_SETINDICATORVALUE = 2502,
	SCI_GETINDICATORVALUE = 2503,
	SCI_INDICATORFILLRANGE = 2504,
	SCI_INDICATORCLEARRANGE = 2505,
	SCI_INDICATORALLONFOR = 2506,
	SCI_INDICATORVALUEAT = 2507,
	SCI_INDICATORSTART = 2508,
	SCI_INDICATOREND = 2509,
	SCI_SETPOSITIONCACHE = 2514,
	SCI_GETPOSITIONCACHE = 2515,
	SCI_COPYALLOWLINE = 2519,
	SCI_GETCHARACTERPOINTER = 2520,
	SCI_GETRANGEPOINTER = 2643,
	SCI_GETGAPPOSITION = 2644,
	SCI_INDICSETALPHA = 2523,
	SCI_INDICGETALPHA = 2524,
	SCI_INDICSETOUTLINEALPHA = 2558,
	SCI_INDICGETOUTLINEALPHA = 2559,
	SCI_SETEXTRAASCENT = 2525,
	SCI_GETEXTRAASCENT = 2526,
	SCI_SETEXTRADESCENT = 2527,
	SCI_GETEXTRADESCENT = 2528,
	SCI_MARKERSYMBOLDEFINED = 2529,
	SCI_MARGINSETTEXT = 2530,
	SCI_MARGINGETTEXT = 2531,
	SCI_MARGINSETSTYLE = 2532,
	SCI_MARGINGETSTYLE = 2533,
	SCI_MARGINSETSTYLES = 2534,
	SCI_MARGINGETSTYLES = 2535,
	SCI_MARGINTEXTCLEARALL = 2536,
	SCI_MARGINSETSTYLEOFFSET = 2537,
	SCI_MARGINGETSTYLEOFFSET = 2538,
	SC_MARGINOPTION_NONE = 0,
	SC_MARGINOPTION_SUBLINESELECT = 1,
	SCI_SETMARGINOPTIONS = 2539,
	SCI_GETMARGINOPTIONS = 2557,
	SCI_ANNOTATIONSETTEXT = 2540,
	SCI_ANNOTATIONGETTEXT = 2541,
	SCI_ANNOTATIONSETSTYLE = 2542,
	SCI_ANNOTATIONGETSTYLE = 2543,
	SCI_ANNOTATIONSETSTYLES = 2544,
	SCI_ANNOTATIONGETSTYLES = 2545,
	SCI_ANNOTATIONGETLINES = 2546,
	SCI_ANNOTATIONCLEARALL = 2547,
	ANNOTATION_HIDDEN = 0,
	ANNOTATION_STANDARD = 1,
	ANNOTATION_BOXED = 2,
	ANNOTATION_INDENTED = 3,
	SCI_ANNOTATIONSETVISIBLE = 2548,
	SCI_ANNOTATIONGETVISIBLE = 2549,
	SCI_ANNOTATIONSETSTYLEOFFSET = 2550,
	SCI_ANNOTATIONGETSTYLEOFFSET = 2551,
	SCI_RELEASEALLEXTENDEDSTYLES = 2552,
	SCI_ALLOCATEEXTENDEDSTYLES = 2553,
	UNDO_MAY_COALESCE = 1,
	SCI_ADDUNDOACTION = 2560,
	SCI_CHARPOSITIONFROMPOINT = 2561,
	SCI_CHARPOSITIONFROMPOINTCLOSE = 2562,
	SCI_SETMOUSESELECTIONRECTANGULARSWITCH = 2668,
	SCI_GETMOUSESELECTIONRECTANGULARSWITCH = 2669,
	SCI_SETMULTIPLESELECTION = 2563,
	SCI_GETMULTIPLESELECTION = 2564,
	SCI_SETADDITIONALSELECTIONTYPING = 2565,
	SCI_GETADDITIONALSELECTIONTYPING = 2566,
	SCI_SETADDITIONALCARETSBLINK = 2567,
	SCI_GETADDITIONALCARETSBLINK = 2568,
	SCI_SETADDITIONALCARETSVISIBLE = 2608,
	SCI_GETADDITIONALCARETSVISIBLE = 2609,
	SCI_GETSELECTIONS = 2570,
	SCI_GETSELECTIONEMPTY = 2650,
	SCI_CLEARSELECTIONS = 2571,
	SCI_SETSELECTION = 2572,
	SCI_ADDSELECTION = 2573,
	SCI_DROPSELECTIONN = 2671,
	SCI_SETMAINSELECTION = 2574,
	SCI_GETMAINSELECTION = 2575,
	SCI_SETSELECTIONNCARET = 2576,
	SCI_GETSELECTIONNCARET = 2577,
	SCI_SETSELECTIONNANCHOR = 2578,
	SCI_GETSELECTIONNANCHOR = 2579,
	SCI_SETSELECTIONNCARETVIRTUALSPACE = 2580,
	SCI_GETSELECTIONNCARETVIRTUALSPACE = 2581,
	SCI_SETSELECTIONNANCHORVIRTUALSPACE = 2582,
	SCI_GETSELECTIONNANCHORVIRTUALSPACE = 2583,
	SCI_SETSELECTIONNSTART = 2584,
	SCI_GETSELECTIONNSTART = 2585,
	SCI_SETSELECTIONNEND = 2586,
	SCI_GETSELECTIONNEND = 2587,
	SCI_SETRECTANGULARSELECTIONCARET = 2588,
	SCI_GETRECTANGULARSELECTIONCARET = 2589,
	SCI_SETRECTANGULARSELECTIONANCHOR = 2590,
	SCI_GETRECTANGULARSELECTIONANCHOR = 2591,
	SCI_SETRECTANGULARSELECTIONCARETVIRTUALSPACE = 2592,
	SCI_GETRECTANGULARSELECTIONCARETVIRTUALSPACE = 2593,
	SCI_SETRECTANGULARSELECTIONANCHORVIRTUALSPACE = 2594,
	SCI_GETRECTANGULARSELECTIONANCHORVIRTUALSPACE = 2595,
	SCVS_NONE = 0,
	SCVS_RECTANGULARSELECTION = 1,
	SCVS_USERACCESSIBLE = 2,
	SCVS_NOWRAPLINESTART = 4,
	SCI_SETVIRTUALSPACEOPTIONS = 2596,
	SCI_GETVIRTUALSPACEOPTIONS = 2597,
	SCI_SETRECTANGULARSELECTIONMODIFIER = 2598,
	SCI_GETRECTANGULARSELECTIONMODIFIER = 2599,
	SCI_SETADDITIONALSELFORE = 2600,
	SCI_SETADDITIONALSELBACK = 2601,
	SCI_SETADDITIONALSELALPHA = 2602,
	SCI_GETADDITIONALSELALPHA = 2603,
	SCI_SETADDITIONALCARETFORE = 2604,
	SCI_GETADDITIONALCARETFORE = 2605,
	SCI_ROTATESELECTION = 2606,
	SCI_SWAPMAINANCHORCARET = 2607,
	SCI_MULTIPLESELECTADDNEXT = 2688,
	SCI_MULTIPLESELECTADDEACH = 2689,
	SCI_CHANGELEXERSTATE = 2617,
	SCI_CONTRACTEDFOLDNEXT = 2618,
	SCI_VERTICALCENTRECARET = 2619,
	SCI_MOVESELECTEDLINESUP = 2620,
	SCI_MOVESELECTEDLINESDOWN = 2621,
	SCI_SETIDENTIFIER = 2622,
	SCI_GETIDENTIFIER = 2623,
	SCI_RGBAIMAGESETWIDTH = 2624,
	SCI_RGBAIMAGESETHEIGHT = 2625,
	SCI_RGBAIMAGESETSCALE = 2651,
	SCI_MARKERDEFINERGBAIMAGE = 2626,
	SCI_REGISTERRGBAIMAGE = 2627,
	SCI_SCROLLTOSTART = 2628,
	SCI_SCROLLTOEND = 2629,
	SC_TECHNOLOGY_DEFAULT = 0,
	SC_TECHNOLOGY_DIRECTWRITE = 1,
	SC_TECHNOLOGY_DIRECTWRITERETAIN = 2,
	SC_TECHNOLOGY_DIRECTWRITEDC = 3,
	SCI_SETTECHNOLOGY = 2630,
	SCI_GETTECHNOLOGY = 2631,
	SCI_CREATELOADER = 2632,
	SCI_FINDINDICATORSHOW = 2640,
	SCI_FINDINDICATORFLASH = 2641,
	SCI_FINDINDICATORHIDE = 2642,
	SCI_VCHOMEDISPLAY = 2652,
	SCI_VCHOMEDISPLAYEXTEND = 2653,
	SCI_GETCARETLINEVISIBLEALWAYS = 2654,
	SCI_SETCARETLINEVISIBLEALWAYS = 2655,
	SC_LINE_END_TYPE_DEFAULT = 0,
	SC_LINE_END_TYPE_UNICODE = 1,
	SCI_SETLINEENDTYPESALLOWED = 2656,
	SCI_GETLINEENDTYPESALLOWED = 2657,
	SCI_GETLINEENDTYPESACTIVE = 2658,
	SCI_SETREPRESENTATION = 2665,
	SCI_GETREPRESENTATION = 2666,
	SCI_CLEARREPRESENTATION = 2667,
	SCI_STARTRECORD = 3001,
	SCI_STOPRECORD = 3002,
	SCI_SETLEXER = 4001,
	SCI_GETLEXER = 4002,
	SCI_COLOURISE = 4003,
	SCI_SETPROPERTY = 4004,
	KEYWORDSET_MAX = 8,
	SCI_SETKEYWORDS = 4005,
	SCI_SETLEXERLANGUAGE = 4006,
	SCI_LOADLEXERLIBRARY = 4007,
	SCI_GETPROPERTY = 4008,
	SCI_GETPROPERTYEXPANDED = 4009,
	SCI_GETPROPERTYINT = 4010,
	SCI_GETSTYLEBITSNEEDED = 4011,
	SCI_GETLEXERLANGUAGE = 4012,
	SCI_PRIVATELEXERCALL = 4013,
	SCI_PROPERTYNAMES = 4014,
	SC_TYPE_BOOLEAN = 0,
	SC_TYPE_INTEGER = 1,
	SC_TYPE_STRING = 2,
	SCI_PROPERTYTYPE = 4015,
	SCI_DESCRIBEPROPERTY = 4016,
	SCI_DESCRIBEKEYWORDSETS = 4017,
	SCI_GETLINEENDTYPESSUPPORTED = 4018,
	SCI_ALLOCATESUBSTYLES = 4020,
	SCI_GETSUBSTYLESSTART = 4021,
	SCI_GETSUBSTYLESLENGTH = 4022,
	SCI_GETSTYLEFROMSUBSTYLE = 4027,
	SCI_GETPRIMARYSTYLEFROMSTYLE = 4028,
	SCI_FREESUBSTYLES = 4023,
	SCI_SETIDENTIFIERS = 4024,
	SCI_DISTANCETOSECONDARYSTYLES = 4025,
	SCI_GETSUBSTYLEBASES = 4026,
	SC_MOD_INSERTTEXT = 0x1,
	SC_MOD_DELETETEXT = 0x2,
	SC_MOD_CHANGESTYLE = 0x4,
	SC_MOD_CHANGEFOLD = 0x8,
	SC_PERFORMED_USER = 0x10,
	SC_PERFORMED_UNDO = 0x20,
	SC_PERFORMED_REDO = 0x40,
	SC_MULTISTEPUNDOREDO = 0x80,
	SC_LASTSTEPINUNDOREDO = 0x100,
	SC_MOD_CHANGEMARKER = 0x200,
	SC_MOD_BEFOREINSERT = 0x400,
	SC_MOD_BEFOREDELETE = 0x800,
	SC_MULTILINEUNDOREDO = 0x1000,
	SC_STARTACTION = 0x2000,
	SC_MOD_CHANGEINDICATOR = 0x4000,
	SC_MOD_CHANGELINESTATE = 0x8000,
	SC_MOD_CHANGEMARGIN = 0x10000,
	SC_MOD_CHANGEANNOTATION = 0x20000,
	SC_MOD_CONTAINER = 0x40000,
	SC_MOD_LEXERSTATE = 0x80000,
	SC_MOD_INSERTCHECK = 0x100000,
	SC_MOD_CHANGETABSTOPS = 0x200000,
	SC_MODEVENTMASKALL = 0x3FFFFF,
	SC_UPDATE_CONTENT = 0x1,
	SC_UPDATE_SELECTION = 0x2,
	SC_UPDATE_V_SCROLL = 0x4,
	SC_UPDATE_H_SCROLL = 0x8,
	SCEN_CHANGE = 768,
	SCEN_SETFOCUS = 512,
	SCEN_KILLFOCUS = 256,
	SCK_DOWN = 300,
	SCK_UP = 301,
	SCK_LEFT = 302,
	SCK_RIGHT = 303,
	SCK_HOME = 304,
	SCK_END = 305,
	SCK_PRIOR = 306,
	SCK_NEXT = 307,
	SCK_DELETE = 308,
	SCK_INSERT = 309,
	SCK_ESCAPE = 7,
	SCK_BACK = 8,
	SCK_TAB = 9,
	SCK_RETURN = 13,
	SCK_ADD = 310,
	SCK_SUBTRACT = 311,
	SCK_DIVIDE = 312,
	SCK_WIN = 313,
	SCK_RWIN = 314,
	SCK_MENU = 315,
	SCMOD_NORM = 0,
	SCMOD_SHIFT = 1,
	SCMOD_CTRL = 2,
	SCMOD_ALT = 4,
	SCMOD_SUPER = 8,
	SCMOD_META = 16,
	SC_AC_FILLUP = 1,
	SC_AC_DOUBLECLICK = 2,
	SC_AC_TAB = 3,
	SC_AC_NEWLINE = 4,
	SC_AC_COMMAND = 5,
	SCN_STYLENEEDED = 2000,
	SCN_CHARADDED = 2001,
	SCN_SAVEPOINTREACHED = 2002,
	SCN_SAVEPOINTLEFT = 2003,
	SCN_MODIFYATTEMPTRO = 2004,
	SCN_KEY = 2005,
	SCN_DOUBLECLICK = 2006,
	SCN_UPDATEUI = 2007,
	SCN_MODIFIED = 2008,
	SCN_MACRORECORD = 2009,
	SCN_MARGINCLICK = 2010,
	SCN_NEEDSHOWN = 2011,
	SCN_PAINTED = 2013,
	SCN_USERLISTSELECTION = 2014,
	SCN_URIDROPPED = 2015,
	SCN_DWELLSTART = 2016,
	SCN_DWELLEND = 2017,
	SCN_ZOOM = 2018,
	SCN_HOTSPOTCLICK = 2019,
	SCN_HOTSPOTDOUBLECLICK = 2020,
	SCN_CALLTIPCLICK = 2021,
	SCN_AUTOCSELECTION = 2022,
	SCN_INDICATORCLICK = 2023,
	SCN_INDICATORRELEASE = 2024,
	SCN_AUTOCCANCELLED = 2025,
	SCN_AUTOCCHARDELETED = 2026,
	SCN_HOTSPOTRELEASECLICK = 2027,
	SCN_FOCUSIN = 2028,
	SCN_FOCUSOUT = 2029,
	SCN_AUTOCCOMPLETED = 2030,

	SCLEX_CONTAINER = 0,
	SCLEX_NULL = 1,
	SCLEX_PYTHON = 2,
	SCLEX_CPP = 3,
	SCLEX_HTML = 4,
	SCLEX_XML = 5,
	SCLEX_PERL = 6,
	SCLEX_SQL = 7,
	SCLEX_VB = 8,
	SCLEX_PROPERTIES = 9,
	SCLEX_ERRORLIST = 10,
	SCLEX_MAKEFILE = 11,
	SCLEX_BATCH = 12,
	SCLEX_XCODE = 13,
	SCLEX_LATEX = 14,
	SCLEX_LUA = 15,
	SCLEX_DIFF = 16,
	SCLEX_CONF = 17,
	SCLEX_PASCAL = 18,
	SCLEX_AVE = 19,
	SCLEX_ADA = 20,
	SCLEX_LISP = 21,
	SCLEX_RUBY = 22,
	SCLEX_EIFFEL = 23,
	SCLEX_EIFFELKW = 24,
	SCLEX_TCL = 25,
	SCLEX_NNCRONTAB = 26,
	SCLEX_BULLANT = 27,
	SCLEX_VBSCRIPT = 28,
	SCLEX_BAAN = 31,
	SCLEX_MATLAB = 32,
	SCLEX_SCRIPTOL = 33,
	SCLEX_ASM = 34,
	SCLEX_CPPNOCASE = 35,
	SCLEX_FORTRAN = 36,
	SCLEX_F77 = 37,
	SCLEX_CSS = 38,
	SCLEX_POV = 39,
	SCLEX_LOUT = 40,
	SCLEX_ESCRIPT = 41,
	SCLEX_PS = 42,
	SCLEX_NSIS = 43,
	SCLEX_MMIXAL = 44,
	SCLEX_CLW = 45,
	SCLEX_CLWNOCASE = 46,
	SCLEX_LOT = 47,
	SCLEX_YAML = 48,
	SCLEX_TEX = 49,
	SCLEX_METAPOST = 50,
	SCLEX_POWERBASIC = 51,
	SCLEX_FORTH = 52,
	SCLEX_ERLANG = 53,
	SCLEX_OCTAVE = 54,
	SCLEX_MSSQL = 55,
	SCLEX_VERILOG = 56,
	SCLEX_KIX = 57,
	SCLEX_GUI4CLI = 58,
	SCLEX_SPECMAN = 59,
	SCLEX_AU3 = 60,
	SCLEX_APDL = 61,
	SCLEX_BASH = 62,
	SCLEX_ASN1 = 63,
	SCLEX_VHDL = 64,
	SCLEX_CAML = 65,
	SCLEX_BLITZBASIC = 66,
	SCLEX_PUREBASIC = 67,
	SCLEX_HASKELL = 68,
	SCLEX_PHPSCRIPT = 69,
	SCLEX_TADS3 = 70,
	SCLEX_REBOL = 71,
	SCLEX_SMALLTALK = 72,
	SCLEX_FLAGSHIP = 73,
	SCLEX_CSOUND = 74,
	SCLEX_FREEBASIC = 75,
	SCLEX_INNOSETUP = 76,
	SCLEX_OPAL = 77,
	SCLEX_SPICE = 78,
	SCLEX_D = 79,
	SCLEX_CMAKE = 80,
	SCLEX_GAP = 81,
	SCLEX_PLM = 82,
	SCLEX_PROGRESS = 83,
	SCLEX_ABAQUS = 84,
	SCLEX_ASYMPTOTE = 85,
	SCLEX_R = 86,
	SCLEX_MAGIK = 87,
	SCLEX_POWERSHELL = 88,
	SCLEX_MYSQL = 89,
	SCLEX_PO = 90,
	SCLEX_TAL = 91,
	SCLEX_COBOL = 92,
	SCLEX_TACL = 93,
	SCLEX_SORCUS = 94,
	SCLEX_POWERPRO = 95,
	SCLEX_NIMROD = 96,
	SCLEX_SML = 97,
	SCLEX_MARKDOWN = 98,
	SCLEX_TXT2TAGS = 99,
	SCLEX_A68K = 100,
	SCLEX_MODULA = 101,
	SCLEX_COFFEESCRIPT = 102,
	SCLEX_TCMD = 103,
	SCLEX_AVS = 104,
	SCLEX_ECL = 105,
	SCLEX_OSCRIPT = 106,
	SCLEX_VISUALPROLOG = 107,
	SCLEX_LITERATEHASKELL = 108,
	SCLEX_STTXT = 109,
	SCLEX_KVIRC = 110,
	SCLEX_RUST = 111,
	SCLEX_DMAP = 112,
	SCLEX_AS = 113,
	SCLEX_DMIS = 114,
	SCLEX_REGISTRY = 115,
	SCLEX_BIBTEX = 116,
	SCLEX_SREC = 117,
	SCLEX_IHEX = 118,
	SCLEX_TEHEX = 119,
	SCLEX_JSON = 120,

};

