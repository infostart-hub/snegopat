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

typedef uint color;
color clrNone = color(-1);

color rgb(uint r, uint g, uint b) {
	return r | (g << 8) | (b << 16);
}

enum SciMarkers {
	markBookmark,
	markBreakPoint,
	markBreakPointConditional,
	markBreakPointDisabled,
	markDebugArrow,
	//maskCurrentLine = 1 << markCurrentLine,
};



enum SciMargins {
	smLineNumbers = 0,
	smMarks = 1,
	smFolding = 2,
};

enum SciIndicators {
	indFolding = INDIC_CONTAINER,
	indSelectedWordHighlight
}

enum SciStyles {
	stKeyword = STYLE_LASTPREDEFINED + 1,
	stNumber,
	stString,
	stDate,
	stIdentifier,
	stOperator,
	stRemark,
	stPreproc,
	stLabel,
	stDirective,
	stPairedBrace,
	stCurrentLine,
	stSelectionHighlight
};

enum SciLineStates {
	LS_CUSTOMBLOCK = 1,
	LS_COMMENTLINE = 2,
	LS_METHOD = 4,
	LS_CONDITION = 8,
	LS_LOOP = 16,
	LS_METHODBODY = 32,
	LS_SUBCONDITION = 64,
	LS_CUSTOMBLOCKEND = 128,
	LS_MULTILINESTRING = 256,
	LS_TRY = 512,
	LS_PREPROC = 1024
};


ScintillaDesignerEventsHandler oneSciEventsHandler;
IDispatch&& sciEventsHandlerDisp;
NoCaseMap<BreakPointDef> breakpoints;
NoCaseMap<uint> bookmarks;
array<ScintillaEditor&&> openedSciEditors;
ScintillaEditor&& lastActiveScintillaEditor = null;

class BreakPointDef {
	uint line; //номер строки модуля
	bool isEnabled; //активная или отключенная
	bool isCondition; //с условием или обычная
	BreakPointDef() {}
	BreakPointDef(uint _line, bool _isEnabled, bool _isCondition) {
		line = _line; isEnabled = _isEnabled; isCondition = _isCondition;
	}
};

class ScintillaDesignerEventsHandler {

	ScintillaDesignerEventsHandler(){&&sciEventsHandlerDisp = createDispatchFromAS(&&this);}
	bool commandCancelled;
	bool toggleAllBreakpointsState = false;
	bool breakPointConditionIsEmpty;
	bool debugMode = false;
	bool afterDebugStep = false;
	bool debugStopProcessed = false;

	ScintillaEditor&& activeScintillaEditor() {
		if (activeTextWnd is null) return null;
		ScintillaEditor&& e = cast<ScintillaEditor>(activeTextWnd.editor);
		if (e is null) return null;
		return e;
	}

	void OnToggleBreakPoint(CmdHandlerParam& cmd, array<Variant>& params) {
		if (cmd._isBefore){
			commandCancelled = false;
		} else {
			if (commandCancelled == false) {
				ScintillaEditor&& activeSciEditor = this.activeScintillaEditor(); if (activeSciEditor is null) return;
				int curSciLine = activeSciEditor.swnd.currentLine();
				CommandState&& st = getMainFrameCommandState(CommandID(Guid("{DE680E96-5826-4E22-834D-692E307A1D9C}"), 13), 0);
				activeSciEditor.swnd.deleteAllBreakPointMarks(curSciLine);
				if (st.cmdState.bEnable) { //команда "отключить точку останова" активна, значит на текущей строке есть точка 
					activeSciEditor.swnd.addMarker(curSciLine, markBreakPoint);
					breakpoints.insert(activeSciEditor.breakPointKey + (curSciLine+1), BreakPointDef(curSciLine + 1, true, false));
				} else { 
					breakpoints.remove(activeSciEditor.breakPointKey + (curSciLine + 1));
				}
			}
		}
	}

	void OnDeleteAllBreakPoints(CmdHandlerParam& cmd, array<Variant>& params) {
		if (!cmd._isBefore) {
			for (uint i = 0; i < openedSciEditors.length; i++){
				ScintillaEditor&& e = openedSciEditors[i];
				if (e is null) continue;
				e.swnd.markerDeleteAll(markBreakPoint);
				e.swnd.markerDeleteAll(markBreakPointDisabled);
				e.swnd.markerDeleteAll(markBreakPointConditional);
			}
			breakpoints.clear();
		}
	}

	void OnToggleBreakPointState(CmdHandlerParam& cmd, array<Variant>& params) {
		if (!cmd._isBefore) {
			ScintillaEditor&& activeSciEditor = this.activeScintillaEditor(); if (activeSciEditor is null) return;
			int curSciLine = activeSciEditor.swnd.currentLine();
			int newMarker = -1;
			BreakPointDef&& bp = activeSciEditor.getBreakPointAtLine(curSciLine + 1); if (bp is null) return;

			if (bp.isEnabled) 
				newMarker = markBreakPointDisabled;
			else {
				newMarker = markBreakPoint;
				if (bp.isCondition)
					newMarker = markBreakPointConditional;
			}

			if (newMarker != -1) {
				activeSciEditor.swnd.deleteAllBreakPointMarks(curSciLine);
				activeSciEditor.swnd.addMarker(curSciLine, newMarker);
				bp.isEnabled = (newMarker != markBreakPointDisabled);
			}
		}
	}

	void OnToggleAllBreakPointsState(CmdHandlerParam& cmd, array<Variant>& params) {
		if (!cmd._isBefore) {
			for (auto it = breakpoints.begin(); it++;) {
				BreakPointDef&& bpDef = it.value;
				bpDef.isEnabled = toggleAllBreakpointsState;
			}
			for (uint i = 0; i < openedSciEditors.length; i++) {
				ScintillaEditor&& e = openedSciEditors[i];
				if (e is null) continue;
				e.updateBreakPoints();
			}
			toggleAllBreakpointsState = !toggleAllBreakpointsState;
		}
	}

	void OnToggleBreakPointCondition(CmdHandlerParam& cmd, array<Variant>& params) {
		if (cmd._isBefore) {
			commandCancelled = false;
			breakPointConditionIsEmpty = false;
			oneDesigner._events.connect(dspWindows, "onDoModal", sciEventsHandlerDisp, "OnWindowsDoModal");
		} else {
			oneDesigner._events.disconnect(dspWindows, "onDoModal", sciEventsHandlerDisp, "OnWindowsDoModal");
			if (commandCancelled == false) {
				ScintillaEditor&& activeSciEditor = this.activeScintillaEditor(); if (activeSciEditor is null) return;
				int curSciLine = activeSciEditor.swnd.currentLine();
				BreakPointDef&& bp = activeSciEditor.getBreakPointAtLine(curSciLine + 1); if (bp is null) return;
				int newMarker = (breakPointConditionIsEmpty ? markBreakPoint : markBreakPointConditional);
				if (!bp.isEnabled) newMarker = markBreakPointDisabled;
				activeSciEditor.swnd.deleteAllBreakPointMarks(curSciLine);
				activeSciEditor.swnd.addMarker(curSciLine, newMarker);
				bp.isCondition = (newMarker == markBreakPointConditional);
			}
		}
	}

	void OnToggleBookmark(CmdHandlerParam& cmd, array<Variant>& params) {
		if (!cmd._isBefore) {
			ScintillaEditor&& activeSciEditor = this.activeScintillaEditor(); if (activeSciEditor is null) return;
			int curSciLine = activeSciEditor.swnd.currentLine();
			if ((activeSciEditor.swnd.markerGet(curSciLine) & (1 << markBookmark)) != 0) {
				activeSciEditor.swnd.markerDelete(curSciLine, markBookmark);
				bookmarks.remove(activeSciEditor.breakPointKey + (curSciLine + 1));
			} else {
				activeSciEditor.swnd.addMarker(curSciLine, markBookmark);
				bookmarks.insert(activeSciEditor.breakPointKey + (curSciLine + 1), curSciLine + 1);
			}
		}
	}

	void OnDeleteAllBookmarks(CmdHandlerParam& cmd, array<Variant>& params) {
		if (!cmd._isBefore) {
			for (uint i = 0; i < openedSciEditors.length; i++) {
				ScintillaEditor&& e = openedSciEditors[i];
				if (e is null) continue;
				e.swnd.markerDeleteAll(markBookmark);
			}
			bookmarks.clear();
		}
	}

	void OnDebugStep(CmdHandlerParam& cmd, array<Variant>& params) {
		if (!cmd._isBefore) {
			afterDebugStep = true;
			debugStopProcessed = false;
			ScintillaEditor&& activeSciEditor = this.activeScintillaEditor(); if (activeSciEditor is null) return;
			TextPosition tpCaret;
			activeSciEditor.txtWnd.ted.getCaretPosition(tpCaret);
			activeSciEditor.swnd.goToPos(activeSciEditor.getPosition(tpCaret));
		}
	}

	void OnDebugContinue(CmdHandlerParam& cmd, array<Variant>& params) {
		if (!cmd._isBefore) {
			debugStopProcessed = false;
			clearDebugArrowInAllScintillaEditors();
		}
	}

	void OnGotoDefinition(CmdHandlerParam& cmd, array<Variant>& params) {
		if (!cmd._isBefore) {
			ScintillaEditor&& activeSciEditor = this.activeScintillaEditor(); if (activeSciEditor is null) return;
			if (activeSciEditor.swnd.currentPos() != activeSciEditor.swnd.anchorPos()) {
				int selStartLine = activeSciEditor.swnd.lineFromPos(activeSciEditor.swnd.selectionStart());
				int firstVisibleLine = activeSciEditor.swnd.firstVisibleLine();
				if (selStartLine < firstVisibleLine) {
					//скроллим редактор, чтобы первая строка выделения стала видимой
					activeSciEditor._scicall(SCI_LINESCROLL,0, selStartLine - firstVisibleLine);
				}
			}
		}
	}

	void OnGlobalSearch(CmdHandlerParam& cmd, array<Variant>& params) {
		ScintillaEditor&& activeSciEditor = this.activeScintillaEditor(); //команда вызвана хоткеем
		if (activeSciEditor is null) &&activeSciEditor = lastActiveScintillaEditor; //команда вызвана кнопкой тулбара
		if (activeSciEditor is null) return;

		if (cmd._isBefore) {
			//без этого в окно поиска автоматом не устанавливается выделенный в модуле текст
			activeSciEditor.needFocus = true;
			SetFocus(activeSciEditor.txtWnd.hWnd);
		} else {
			activeSciEditor.needFocus = false;
			SetFocus(activeSciEditor.swnd.hEditor);
		}
	}
	

	void OnWindowsMessageBox(IMsgBoxHook& mbh, array<Variant>& params) {
	}

	void OnWindowsDoModal(IDoModalHook& dlgInfo, array<Variant>& params) {
		//порядок вызова: beforeDoModal = 0, afterInitial  = 3, openModalWnd  = 1, afterDoModal  = 2 - после закрытия модального диалога

		DoModalHookStages stage = dlgInfo._stage;
		string strCaption = dlgInfo.get_caption();
		//Message("OnDoModal: stage " + int(stage) + " caption " + strCaption);
		if (stage == afterDoModal) {
			if (strCaption.find("Условие останова") >= 0) {
				if (dlgInfo.result == 2) {
					commandCancelled = true;
				} else {
					IV8Form&& form = dlgInfo.get_form(); if (form is null) { Message("form is null"); return; }
					Variant ctrlName; ctrlName.vt = VT_UI4; ctrlName.dword = 0;
					IV8Control&& control = form.getControl(ctrlName); if (control is null) { Message("control is null"); return; }
					Variant ctrlVal = control.get_value();
					if (ctrlVal.vt == VT_BSTR) {
						string strCond = stringFromAddress(ctrlVal.dword); strCond.trim();
						if (strCond.isEmpty()) breakPointConditionIsEmpty = true; //нажали ОК, но текст не ввели - надо установить обычную точку
					}
				}
			}
		}
	}

	void clearDebugArrowInAllScintillaEditors() {
		for (uint i = 0; i < openedSciEditors.length; i++) {
			ScintillaEditor&& e = openedSciEditors[i];
			if (e is null) continue;
			e.swnd.markerDeleteAll(markDebugArrow);
		}
	}

	void OnIdle(array<Variant>& params) {
		CommandState&& st = getMainFrameCommandState(CommandID(Guid("{DE680E96-5826-4E22-834D-692E307A1D9C}"), 4), 0); //"Завершить отладку"
		if (st is null) return;
		//Message("команда " + (st.cmdState.bEnable ? "активна":"не активна"));

		if ((st.cmdState.bEnable == true) && (debugMode == false)) { //вошли в режим отладки
			//Message("вошли в режим отладки");
		} else if ((st.cmdState.bEnable == false) && (debugMode == true)) { //вышли
			//Message("вышли из режима отладки");
			clearDebugArrowInAllScintillaEditors();
		}

		if (debugMode) {
			if ((afterDebugStep == false) && (debugStopProcessed == false)) {
				CommandState&& st2 = getMainFrameCommandState(CommandID(Guid("{DE680E96-5826-4E22-834D-692E307A1D9C}"), 10), 0);
				if (st2 !is null) {
					if (st2.cmdState.bEnable == true) {
						//доступна команда "Текущая строка", значит остановились в точке останова
						ScintillaEditor&& activeSciEditor = this.activeScintillaEditor(); if (activeSciEditor is null) return;
						activeSciEditor.swnd.addMarker(-1, markDebugArrow);
						debugStopProcessed = true;
					}
				}
			}
		}

		if (afterDebugStep) {
			//Message("шагнули");
			clearDebugArrowInAllScintillaEditors(); //могли перейти в другой модуль
			ScintillaEditor&& activeSciEditor = this.activeScintillaEditor(); if (activeSciEditor is null) return;
			TextPosition tpCaret;
			activeSciEditor.txtWnd.ted.getCaretPosition(tpCaret);
			activeSciEditor.swnd.goToPos(activeSciEditor.getPosition(tpCaret));
			activeSciEditor.swnd.addMarker(-1, markDebugArrow);
		}
		
		afterDebugStep = false;
		debugMode = st.cmdState.bEnable;
	}

	void OnFoldUnfoldAll(CmdHandlerParam& cmd, array<Variant>& params) {
		if (!cmd._isBefore) {
			ScintillaEditor&& activeSciEditor = this.activeScintillaEditor(); if (activeSciEditor is null) return;
			if (cmd._cmdNumber == 105) { //свернуть все
				activeSciEditor.foldUnfoldAll(true);
			} else if (cmd._cmdNumber == 106) { //развернуть все
				activeSciEditor.foldUnfoldAll(false);
			}
		}
	
	}

	

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
			if (a is null) {
				&&a = oneDesigner._addins.loadAddin("script:<core>scripts\\scintilla.js", oneDesigner._addins._libs);
				if (a is null)
					Message("Не удалось загрузить аддин scintilla: " + oneDesigner._addins._lastAddinError);
				else 
					a.invokeMacros("_getSettings");
			}
			loadBreakPointsFromProfile();
			loadBookmarksFromProfile();
			connectEvents();
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

	void connectEvents(){
		oneDesigner._events.addCommandHandler("{DE680E96-5826-4E22-834D-692E307A1D9C}", 11, sciEventsHandlerDisp, "OnToggleBreakPoint"); //точка останова уст/снять    
		oneDesigner._events.addCommandHandler("{DE680E96-5826-4E22-834D-692E307A1D9C}", 12, sciEventsHandlerDisp, "OnToggleBreakPointCondition"); //точка останова с условием уст/снять
		oneDesigner._events.addCommandHandler("{DE680E96-5826-4E22-834D-692E307A1D9C}", 13, sciEventsHandlerDisp, "OnToggleBreakPointState"); //точка останова выкл/вкл
		oneDesigner._events.addCommandHandler("{DE680E96-5826-4E22-834D-692E307A1D9C}", 14, sciEventsHandlerDisp, "OnDeleteAllBreakPoints"); //убрать все точки останова
		oneDesigner._events.addCommandHandler("{DE680E96-5826-4E22-834D-692E307A1D9C}", 15, sciEventsHandlerDisp, "OnToggleAllBreakPointsState"); //отключить/включить все точки останова
		oneDesigner._events.addCommandHandler("{FFE26CB2-322B-11D5-B096-008048DA0765}", 1, sciEventsHandlerDisp, "OnToggleBookmark"); //установить/снять закладку
		oneDesigner._events.addCommandHandler("{FFE26CB2-322B-11D5-B096-008048DA0765}", 4, sciEventsHandlerDisp, "OnDeleteAllBookmarks"); //убрать все закладки

		oneDesigner._events.addCommandHandler("{DE680E96-5826-4E22-834D-692E307A1D9C}", 6, sciEventsHandlerDisp, "OnDebugStep"); //шагнуть в
		oneDesigner._events.addCommandHandler("{DE680E96-5826-4E22-834D-692E307A1D9C}", 7, sciEventsHandlerDisp, "OnDebugStep"); //шагнуть через
		oneDesigner._events.addCommandHandler("{DE680E96-5826-4E22-834D-692E307A1D9C}", 8, sciEventsHandlerDisp, "OnDebugStep"); //шагнуть из
		oneDesigner._events.addCommandHandler("{DE680E96-5826-4E22-834D-692E307A1D9C}", 9, sciEventsHandlerDisp, "OnDebugStep"); //идти до курсора
		oneDesigner._events.addCommandHandler("{DE680E96-5826-4E22-834D-692E307A1D9C}", 10, sciEventsHandlerDisp, "OnDebugStep"); //текущая строка
		oneDesigner._events.addCommandHandler("{DE680E96-5826-4E22-834D-692E307A1D9C}", 2, sciEventsHandlerDisp, "OnDebugContinue"); //продолжить отладку

		oneDesigner._events.addCommandHandler("{6B7291BF-BCD2-41AF-BAC7-414D47CC6E6A}", 21, sciEventsHandlerDisp, "OnGotoDefinition"); //список процедур
		oneDesigner._events.addCommandHandler("{6B7291BF-BCD2-41AF-BAC7-414D47CC6E6A}", 83, sciEventsHandlerDisp, "OnGotoDefinition"); //перейти к определению

		oneDesigner._events.addCommandHandler("{00000000-0000-0000-0000-000000000000}", 68, sciEventsHandlerDisp, "OnGlobalSearch"); //глобальный поиск
		oneDesigner._events.addCommandHandler("{00000000-0000-0000-0000-000000000000}", 69, sciEventsHandlerDisp, "OnGlobalSearch"); //глобальная замена

		oneDesigner._events.addCommandHandler("{00000000-0000-0000-0000-000000000000}", 105, sciEventsHandlerDisp, "OnFoldUnfoldAll"); //свернуть все
		oneDesigner._events.addCommandHandler("{00000000-0000-0000-0000-000000000000}", 106, sciEventsHandlerDisp, "OnFoldUnfoldAll"); //развернуть все

		oneDesigner._events.connect(oneDesigner._me(), "onIdle", sciEventsHandlerDisp, "OnIdle");
	}

	void loadBreakPointsFromProfile() {

		IProfileFolder&& pflRoot = getProfileRoot();
		Value val;
		if (pflRoot.getValue("Debug/Breakpoints", val)) {
			v8string strInt;
			val.toString(strInt);
			//Message(strInt.str);
			array<string>&& arrPflStrings = strInt.str.split("\n");
			for (uint i = 0; i < arrPflStrings.length; i++) {
				string strCurrent = arrPflStrings[i];
				if ((strCurrent.substr(0, 7) == "{\"\",0},") || // {"",0},8571f235-102d-4e1e-9f93-f3c271dddb55,32e087ab-1491-49b6-aba7-43571b41ac2b,0} 
				   (strCurrent.substr(0, 7) == "{\"file:")) {   // {"file://C:/ВнешняяОбработка1.epf", 0}, d747b3b0-3043-4ba4-912f-70af7b12852a,a637f77f-3840-441d-a1c3-699c8c5cb7e0,0}
					array<string>&& arrMdObjGuidsString = strCurrent.split(",");
					if (arrMdObjGuidsString.length > 2){
						string strGuidObj = "{" + arrMdObjGuidsString[2] + "}";  strGuidObj.makeLower();
						string strGuidProp = "{" + arrMdObjGuidsString[3] + "}"; strGuidProp.makeLower();
						//Message(strGuidObj + strGuidProp);
						i++; if (i >= arrPflStrings.length)return;
						string strBPcount = arrPflStrings[i]; //количество точек останова, {4,
						int commaPos = strBPcount.find(',');
						if (commaPos>1) {
							strBPcount = strBPcount.substr(1, commaPos - 1);
							//Message(strBPcount);
							uint bpCount = parseInt(strBPcount);
							for (uint ii = 0; ii < bpCount; ii++) {
								i++; if (i >= arrPflStrings.length)return;
								string strBP = arrPflStrings[i].substr(1); // {14,1,"",0,2}, номер строки, активность, условие
								array<string>&& arrBP = strBP.split(",");
								if (arrBP.length > 2) {
									uint lineNum = parseInt(arrBP[0]);
									bool isEnabled = arrBP[1] == "1";
									bool isCondition = arrBP[2] != "\"\"";
									//Message("строка " + lineNum + (isEnabled ? " включена " : " отключена ") + (isCondition ? " с условием " : " обычная "));
									breakpoints.insert(strGuidObj + strGuidProp + lineNum, BreakPointDef(lineNum, isEnabled, isCondition));
								}
							}
						}
					}
				}
			}
		}
		//for (auto it = breakpoints.begin(); it++;) {
		//	string strGuid = it.key;
		//	BreakPointDef&& bpDescr = it.value;
		//	Message("key: " + strGuid + ", value: " + "строка " + bpDescr.line + (bpDescr.isEnabled ? " включена" : " отключена") + (bpDescr.isCondition ? " с условием" : " обычная"));
		//}
	}

	void loadBookmarksFromProfile() {

		IProfileFolder&& pflRoot = getProfileRoot();
		Value val;
		if (pflRoot.getValue("Debug/Bookmarks", val)) {
			v8string strInt;
			val.toString(strInt);
			//Message(strInt.str);
			array<string>&& arrPflStrings = strInt.str.split("\n");
			for (uint i = 0; i < arrPflStrings.length; i++) {
				string strCurrent = arrPflStrings[i];
				if ((strCurrent.substr(0, 7) == "{\"\",0},") || // {"",0},8571f235-102d-4e1e-9f93-f3c271dddb55,32e087ab-1491-49b6-aba7-43571b41ac2b,0} 
					(strCurrent.substr(0, 7) == "{\"file:")) {   // {"file://C:/ВнешняяОбработка1.epf", 0}, d747b3b0-3043-4ba4-912f-70af7b12852a,a637f77f-3840-441d-a1c3-699c8c5cb7e0,0}
					array<string>&& arrMdObjGuidsString = strCurrent.split(",");
					if (arrMdObjGuidsString.length > 2) {
						string strGuidObj = "{" + arrMdObjGuidsString[2] + "}";  strGuidObj.makeLower();
						string strGuidProp = "{" + arrMdObjGuidsString[3] + "}"; strGuidProp.makeLower();
						//Message(strGuidObj + strGuidProp);
						i++; if (i >= arrPflStrings.length)return;
						string strBPcount = arrPflStrings[i]; //количество закладок, {4,
						int commaPos = strBPcount.find(',');
						if (commaPos>1) {
							strBPcount = strBPcount.substr(1, commaPos - 1);
							//Message(strBPcount);
							uint bpCount = parseInt(strBPcount);
							for (uint ii = 0; ii < bpCount; ii++) {
								i++; if (i >= arrPflStrings.length)return;
								string strBP = arrPflStrings[i].substr(1); // {14,1,"",0,2}, номер строки
								array<string>&& arrBP = strBP.split(",");
								if (arrBP.length > 2) {
									uint lineNum = parseInt(arrBP[0]);
									bookmarks.insert(strGuidObj + strGuidProp + lineNum, lineNum);
								}
							}
						}
					}
				}
			}
		}
		//for (auto it = bookmarks.begin(); it++;) {
		//	Message("key: " + it.key + ", value: " + it.value);
		//}
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

class ScintillaWindow {
	HWND hEditor;
	int_ptr editor_ptr;

	void create(HWND hWndParent, uint dwStyle, uint dwExStyle = 0, uint ctrlId = 0, int X = 0, int Y = 0, int nWidth = 0, int nHeight = 0) {
		hEditor = CreateWindowEx(dwExStyle, "Scintilla".cstr, 0, dwStyle, X, Y, nWidth, nHeight, hWndParent, ctrlId, hSciDll, 0);
		editor_ptr = SendMessage(hEditor, SCI_GETDIRECTPOINTER);
	}
	void destroy() {
		DestroyWindow(hEditor);
	}

	int length() const {
		return sciFunc(editor_ptr, SCI_GETLENGTH, 0, 0);
	}

	uint textHeight(int line = 0) const {
		return sciFunc(editor_ptr, SCI_TEXTHEIGHT, 0, 0);
	}
	uint textWidth(const string& text, int styleIdx = STYLE_DEFAULT) const {
		return sciFunc(editor_ptr, SCI_TEXTWIDTH, styleIdx, text.toUtf8().ptr);
	}
	void goToPos(int pos) {
		sciFunc(editor_ptr, SCI_GOTOPOS, pos, 0);
	}
	int xFromPos(int pos) const {
		return sciFunc(editor_ptr, SCI_POINTXFROMPOSITION, 0, pos);
	}
	int yFromPos(int pos) const {
		return sciFunc(editor_ptr, SCI_POINTYFROMPOSITION, 0, pos);
	}
	void setSelection(int from, int to) {
		sciFunc(editor_ptr, SCI_SETSEL, from, to);
	}
	void scrollToCaret() {
		sciFunc(editor_ptr, SCI_SCROLLCARET, 0, 0);
	}
	int anchorPos() const {
		return sciFunc(editor_ptr, SCI_GETANCHOR, 0, 0);
	}
	void setAnchorPos(int pos) {
		sciFunc(editor_ptr, SCI_SETANCHOR, pos, 0);
	}
	int currentPos() const {
		return sciFunc(editor_ptr, SCI_GETCURRENTPOS, 0, 0);
	}
	void setCurrentPos(int pos) {
		sciFunc(editor_ptr, SCI_SETCURRENTPOS, pos, 0);
	}
	void setModEventMask(uint mask) {
		sciFunc(editor_ptr, SCI_SETMODEVENTMASK, mask, 0);
	}
	void setLexer(int lexer) {
		sciFunc(editor_ptr, SCI_SETLEXER, lexer, 0);
	}
	void setMarginType(int margin, int type) {
		sciFunc(editor_ptr, SCI_SETMARGINTYPEN, margin, type);
	}
	void setMarginMask(int margin, uint set, uint reset = 0) {
		int mask = (sciFunc(editor_ptr, SCI_GETMARGINMASKN, margin, 0) | set) & ~reset;
		sciFunc(editor_ptr, SCI_SETMARGINMASKN, margin, mask);
	}
	void setTechnology(int tech) {
		sciFunc(editor_ptr, SCI_SETTECHNOLOGY, tech, 0);
	}
	void setBufferedDraw(int flag) {
		sciFunc(editor_ptr, SCI_SETBUFFEREDDRAW, flag, 0);
	}
	void setStyleFont(int styleIdx, const string& fontName) {
		sciFunc(editor_ptr, SCI_STYLESETFONT, styleIdx, fontName.toUtf8().ptr);
	}
	void setStyleSize(int styleIdx, int size) {
		sciFunc(editor_ptr, SCI_STYLESETSIZEFRACTIONAL, styleIdx, size);
	}
	void setStyleWeight(int styleIdx, int weight) {
		sciFunc(editor_ptr, SCI_STYLESETWEIGHT, styleIdx, weight);
	}
	void setStyleUnderline(int styleIdx, int underline) {
		sciFunc(editor_ptr, SCI_STYLESETUNDERLINE, styleIdx, underline);
	}
	void setStyleItalic(int styleIdx, int italic) {
		sciFunc(editor_ptr, SCI_STYLESETITALIC, styleIdx, italic);
	}
	void setStyleEolFilled(int styleIdx, int eolfill) {
		sciFunc(editor_ptr, SCI_STYLESETEOLFILLED, styleIdx, eolfill);
	}
	void setStyleFore(int styleIdx, color fore) {
		sciFunc(editor_ptr, SCI_STYLESETFORE, styleIdx, fore);
	}
	void setStyleBack(int styleIdx, color back) {
		sciFunc(editor_ptr, SCI_STYLESETBACK, styleIdx, back);
	}
	void styleClearAll() {
		sciFunc(editor_ptr, SCI_STYLECLEARALL, 0, 0);
	}
	void setCaretWidth(int caretWidth) {
		sciFunc(editor_ptr, SCI_SETCARETWIDTH, caretWidth, 0);
	}
	void setMarginWidth(int margin, int width) {
		sciFunc(editor_ptr, SCI_SETMARGINWIDTHN, margin, width);
	}
	void setMarkerFore(int marker, color clr) {
		sciFunc(editor_ptr, SCI_MARKERSETFORE, marker, clr);
	}
	void setMarkerBack(int marker, color clr) {
		sciFunc(editor_ptr, SCI_MARKERSETBACK, marker, clr);
	}
	void setTabWidth(int tabWidth) {
		sciFunc(editor_ptr, SCI_SETTABWIDTH, tabWidth, 0);
	}
	void setUseTabs(int flag) {
		sciFunc(editor_ptr, SCI_SETUSETABS, flag, 0);
	}
	void setIndentGuides(int flag) {
		sciFunc(editor_ptr, SCI_SETINDENTATIONGUIDES, flag, 0);
	}
	void insertText(int pos, int_ptr text) {
		sciFunc(editor_ptr, SCI_INSERTTEXT, pos, text);
	}
	void replaceSel(int_ptr text) {
		sciFunc(editor_ptr, SCI_REPLACESEL, 0, text);
	}
	void setCodePage(int cp) {
		sciFunc(editor_ptr, SCI_SETCODEPAGE, cp, 0);
	}
	void setText(int_ptr text) {
		sciFunc(editor_ptr, SCI_SETTEXT, 0, text);
	}
	int_ptr docPointer() {
		return sciFunc(editor_ptr, SCI_GETDOCPOINTER, 0, 0);
	}
	void setDocPointer(int_ptr doc) {
		sciFunc(editor_ptr, SCI_SETDOCPOINTER, 0, doc);
	}
	int posFromLine(int line) const {
		return sciFunc(editor_ptr, SCI_POSITIONFROMLINE, line, 0);
	}
	int lineFromPos(int pos) const {
		return sciFunc(editor_ptr, SCI_LINEFROMPOSITION, pos, 0);
	}
	int posEndStyled() const {
		return sciFunc(editor_ptr, SCI_GETENDSTYLED, 0, 0);
	}
	int lineLength(int line) const {
		return sciFunc(editor_ptr, SCI_LINELENGTH, line, 0);
	}
	uint charAt(int pos) const {
		return sciFunc(editor_ptr, SCI_GETCHARAT, pos, 0);
	}
	MemoryBuffer&& textRange(int from, int len) const {
		Sci_TextRange tr;
		tr.chrg.cpMin = from;
		tr.chrg.cpMax = from + len;
		MemoryBuffer buf(len + 1);
		tr.lpstrText = buf.bytes;
		sciFunc(editor_ptr, SCI_GETTEXTRANGE, 0, tr.self);
		return buf;
	}
	string text(int from, int len) {
		return string(utf8string(textRange(from, len).bytes, len));
	}
	void startStyling(int pos) {
		sciFunc(editor_ptr, SCI_STARTSTYLING, pos, 0);
	}
	void setStyle(int len, int style) {
		sciFunc(editor_ptr, SCI_SETSTYLING, len, style);
	}
	int lineFromMarkHandle(int_ptr markHandle) const {
		return sciFunc(editor_ptr, SCI_MARKERLINEFROMHANDLE, markHandle, 0);
	}
	void deleteMarkHandle(int_ptr markHandle) {
		sciFunc(editor_ptr, SCI_MARKERDELETEHANDLE, markHandle, 0);
	}
	int_ptr addMarker(int line, int marker) {
		if (line == -1) line = currentLine();
		return sciFunc(editor_ptr, SCI_MARKERADD, line, marker);
	}
	void defineMarker(int mark, int symbol) {
		sciFunc(editor_ptr, SCI_MARKERDEFINE, mark, symbol);
	}
	void setFoldMarginColour(int useSettings, color clr) {
		sciFunc(editor_ptr, SCI_SETFOLDMARGINCOLOUR, useSettings, clr);
	}
	void setProperty(const string& name, const string& val) {
		sciFunc(editor_ptr, SCI_SETPROPERTY, name.toUtf8().ptr, val.toUtf8().ptr);
	}
	void setAutoFold(int val) {
		sciFunc(editor_ptr, SCI_SETAUTOMATICFOLD, val, 0);
	}
	void foldSetLevel(int line, int level) {
		sciFunc(editor_ptr, SCI_SETFOLDLEVEL, line, level);
	}
	int foldLevel(int line) const {
		return sciFunc(editor_ptr, SCI_GETFOLDLEVEL, line, 0);
	}
	void foldSetFlag(int flag) {
		sciFunc(editor_ptr, SCI_SETFOLDFLAGS, flag, 0);
	}
	void toggleFold(int line) {
		sciFunc(editor_ptr, SCI_TOGGLEFOLD, line, 0);
	}
	void foldExpandSet(int line, int expanded) {
		sciFunc(editor_ptr, SCI_SETFOLDEXPANDED, line, expanded);
	}
	int foldIsExpanded(int line) {
		return sciFunc(editor_ptr, SCI_GETFOLDEXPANDED, line, 0);
	}
	void marginSetClickable(int margin, int clickable) {
		sciFunc(editor_ptr, SCI_SETMARGINSENSITIVEN, margin, clickable);
	}
	void indStyleSet(int indicatorNumber, int indicatorStyle) {
		sciFunc(editor_ptr, SCI_INDICSETSTYLE, indicatorNumber, indicatorStyle);
	}
	void indForeSet(int indicatorNumber, color clr) {
		sciFunc(editor_ptr, SCI_INDICSETFORE, indicatorNumber, clr);
	}
	void indAlphaSet(int indicatorNumber, int alpha) {
		sciFunc(editor_ptr, SCI_INDICSETALPHA, indicatorNumber, alpha);
	}
	void indAlphaOutlineSet(int indicatorNumber, int alpha) {
		sciFunc(editor_ptr, SCI_INDICSETOUTLINEALPHA, indicatorNumber, alpha);
	}
	void indUnderSet(int indicatorNumber, int under) {
		sciFunc(editor_ptr, SCI_INDICSETUNDER, indicatorNumber, under);
	}
	void indHoverStyleSet(int indicatorNumber, int indicatorStyle) {
		sciFunc(editor_ptr, SCI_INDICSETHOVERSTYLE, indicatorNumber, indicatorStyle);
	}
	void indHovreForeSet(int indicatorNumber, color clr) {
		sciFunc(editor_ptr, SCI_INDICSETHOVERFORE, indicatorNumber, clr);
	}
	void indFlagSet(int indicatorNumber, int flags) {
		sciFunc(editor_ptr, SCI_INDICSETFLAGS, indicatorNumber, flags);
	}
	void indCurrentSet(int indicator) {
		sciFunc(editor_ptr, SCI_SETINDICATORCURRENT, indicator, 0);
	}
	void indValueSet(int value) {
		sciFunc(editor_ptr, SCI_SETINDICATORVALUE, value, 0);
	}
	void indFillRange(int position, int fillLength) {
		sciFunc(editor_ptr, SCI_INDICATORFILLRANGE, position, fillLength);
	}
	void indClearRange(int position, int clearLength) {
		sciFunc(editor_ptr, SCI_INDICATORCLEARRANGE, position, clearLength);
	}
	int indAllOnFor(int position) {
		return sciFunc(editor_ptr, SCI_INDICATORALLONFOR, position, 0);
	}
	int indValueAt(int indicator, int position) {
		return sciFunc(editor_ptr, SCI_INDICATORVALUEAT, indicator, position);
	}
	int indStart(int indicator, int position) {
		return sciFunc(editor_ptr, SCI_INDICATORSTART, indicator, position);
	}
	int indEnd(int indicator, int position) {
		return sciFunc(editor_ptr, SCI_INDICATOREND, indicator, position);
	}
	string lineOfText(int line) {
		MemoryBuffer&& m = textRange(posFromLine(line), lineLength(line));
		return string().fromUtf8(utf8string(m.bytes, m._length)).rtrim("\r\n");
	}
	int linesOnScreen() {
		return sciFunc(editor_ptr, SCI_LINESONSCREEN, 0, 0);
	}
	int firstVisibleLine() {
		return sciFunc(editor_ptr, SCI_GETFIRSTVISIBLELINE, 0, 0);
	}
	int docLineFromVisibleLine(int line) {
		return sciFunc(editor_ptr, SCI_DOCLINEFROMVISIBLE, line, 0);
	}
	int lineEndPosition(int line) {
		return sciFunc(editor_ptr, SCI_GETLINEENDPOSITION, line, 0);
	}
	int selectionStart() {
		return sciFunc(editor_ptr, SCI_GETSELECTIONSTART, 0, 0);
	}
	int selectionEnd() {
		return sciFunc(editor_ptr, SCI_GETSELECTIONEND, 0, 0);
	}
	int findText(int searchFlags, LPARAM textToFindStructPtr) {
		return sciFunc(editor_ptr, SCI_FINDTEXT, searchFlags, textToFindStructPtr);
	}
	bool isRangeWord(int start, int end) {
		return sciFunc(editor_ptr, SCI_ISRANGEWORD, start, end) != 0;
	}
	void setUsePopup(int allowPopUp) {
		sciFunc(editor_ptr, SCI_USEPOPUP, allowPopUp, 0);
	}
	int markerGet(int line) {
		return sciFunc(editor_ptr, SCI_MARKERGET, line, 0);
	}
	void markerDelete(int line, int markerNumber) {
		if (line == -1) line = currentLine();
		sciFunc(editor_ptr, SCI_MARKERDELETE, line, markerNumber);
	}
	void markerDeleteAll(int markerNumber) {
		sciFunc(editor_ptr, SCI_MARKERDELETEALL, markerNumber, 0);
	}
	int currentLine() {
		return lineFromPos(currentPos());
	}
	void deleteAllBreakPointMarks(int line) {
		markerDelete(line, markBreakPoint);
		markerDelete(line, markBreakPointDisabled);
		markerDelete(line, markBreakPointConditional);
	}
	void markerDefinePixMaps() {
		sciFunc(editor_ptr, SCI_MARKERDEFINEPIXMAP, markBreakPoint, mem::addressOf(xpm_breakpoint[0]));
		sciFunc(editor_ptr, SCI_MARKERDEFINEPIXMAP, markBreakPointDisabled, mem::addressOf(xpm_breakpoint_disabled[0]));
		sciFunc(editor_ptr, SCI_MARKERDEFINEPIXMAP, markBreakPointConditional, mem::addressOf(xpm_breakpoint_condition[0]));
		sciFunc(editor_ptr, SCI_MARKERDEFINEPIXMAP, markBookmark, mem::addressOf(xpm_bookmark[0]));
		sciFunc(editor_ptr, SCI_MARKERDEFINEPIXMAP, markDebugArrow, mem::addressOf(xpm_debug_arrow[0]));
	}
	void setLineState(int line, int state){
		if (line < 0)line = 0;
		sciFunc(editor_ptr, SCI_SETLINESTATE, line, state);
	}
	int getLineState(int line) {
		return sciFunc(editor_ptr, SCI_GETLINESTATE, line, 0);
	}
	int getLineCount() {
		return sciFunc(editor_ptr, SCI_GETLINECOUNT, 0, 0);
	}
	int getStyleAt(int pos) {
		return sciFunc(editor_ptr, SCI_GETSTYLEAT, pos, 0);
	}
	void ensureLineVisible(int line = -1) {
		if (line == -1) line = currentLine();
		sciFunc(editor_ptr, SCI_ENSUREVISIBLE, line, 0);
		
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
	void _apply(ScintillaWindow& swnd, const NoCaseMap<int>& fonts) {
		if (!fontName.isEmpty()) {
			auto fnames = (fontName + ",Courier").split(",");
			for (uint i = 0; i < fnames.length; i++) {
				string n = fnames[i];
				n.trim();
				if (fonts.contains(n)) {
					swnd.setStyleFont(_index, n);
					break;
				}
			}
		}
		if (size > 0)
			swnd.setStyleSize(_index, size);
		if (weight > 0)
			swnd.setStyleWeight(_index, weight);
		if (underline != 0)
			swnd.setStyleUnderline(_index, underline - 1);
		if (italic != 0)
			swnd.setStyleItalic(_index, italic - 1);
		if (eolfill != 0)
			swnd.setStyleEolFilled(_index, eolfill - 1);
		if (fore != clrNone)
			swnd.setStyleFore(_index, fore);
		if (back != clrNone)
			swnd.setStyleBack(_index, back);
	}
};

class ScintillaSetup {
	private array<SciStyleDefinition&&> styles;
	private void addStyle(SciStyleDefinition&& d) { styles.insertLast(d); }

	ScintillaSetup() {
		addStyle(SciStyleDefinition(STYLE_DEFAULT, "Базовый стиль", "Consolas,Courier New", 1100, 0, 0xF0FBFF));
		addStyle(SciStyleDefinition(stKeyword, "Ключевые слова", 0xA55104));
		addStyle(SciStyleDefinition(stRemark, "Комментарии", 0x008000));
		addStyle(SciStyleDefinition(stNumber, "Числа", 0x5a8809));
		addStyle(SciStyleDefinition(stString, "Строки", 0x1515a3));
		addStyle(SciStyleDefinition(stDate, "Даты", 0x5a8809));
		addStyle(SciStyleDefinition(stIdentifier, "Идентификаторы", 0x033E6B));
		addStyle(SciStyleDefinition(stOperator, "Операторы", 0x050505));
		addStyle(SciStyleDefinition(stPreproc, "Препроцессоры", 0x0E4AAB));
		addStyle(SciStyleDefinition(stLabel, "Метка", 0x09885a));
		addStyle(SciStyleDefinition(stDirective, "Директива", 0x2E75D9));
		addStyle(SciStyleDefinition(STYLE_BRACELIGHT, "Парная скобка", uint(-1), rgb(155, 155, 255)));
		addStyle(SciStyleDefinition(STYLE_LINENUMBER, "Номера строк", "", 900, 0xBBBBBB));
		addStyle(SciStyleDefinition(STYLE_INDENTGUIDE, "Линии выравнивания", 0xCCCCCC));
		addStyle(SciStyleDefinition(stCurrentLine, "Цвет фона текущей линии", 0xF7E8D7));
		addStyle(SciStyleDefinition(stSelectionHighlight, "Цвет фона подсветки выделенного слова", rgb(0, 0, 255)));
		
		stylesByName.insert("default", STYLE_DEFAULT);
		stylesByName.insert("keyword", stKeyword);
		stylesByName.insert("comment", stRemark);
		stylesByName.insert("number", stNumber);
		stylesByName.insert("string", stString);
		stylesByName.insert("date", stDate);
		stylesByName.insert("identifier", stIdentifier);
		stylesByName.insert("operator", stOperator);
		stylesByName.insert("preprocessor", stPreproc);
		stylesByName.insert("label", stLabel);
		stylesByName.insert("directive", stDirective);
		stylesByName.insert("brace", STYLE_BRACELIGHT);
		stylesByName.insert("linenumber", STYLE_LINENUMBER);
		stylesByName.insert("indentguide", STYLE_INDENTGUIDE);
		stylesByName.insert("currentline", stCurrentLine);
		stylesByName.insert("selectionhighlight", stSelectionHighlight);
	}

	uint caretWidth = 2;
	uint indentGuide = SC_IV_LOOKBOTH;
	bool highlightCurrentLine = true;
	bool showLineNumbers = true;
	int useTabs = 1;
	uint tabWidth = 4;
	bool useFolding = true;
	NoCaseMap<int> stylesByName;
	color clrCurrentLine;
	color clrSelectedWordHighlight;
	bool highlightFoldHeader = false;

	bool foldComment = true;
	bool foldCond = false;
	bool foldLoop = false;
	bool foldMultiString = false;
	bool foldPreproc = false;
	bool foldProc = true;
	bool foldTry = false;

	uint get_stylesCount() const {
		return styles.length;
	}
	SciStyleDefinition&& style(uint idx) const {
		return styles[idx];
	}
	SciStyleDefinition&& styleByNum(int num) const {
		for (uint i = 0; i < styles.length; i++)
			if (styles[i]._index == num) return styles[i];
		return null;
	}
	SciStyleDefinition&& styleByName(string name) const {
		auto found = stylesByName.find(name);
		if (found.isEnd()) {
			Message("Не найден стиль с именем " + name);
			return null;
		}
		return styleByNum(found.value);
	}
	void setStyle(string styleName, string name="", int size=0, bool bold=0, bool italic=0, bool underline=0, int color=clrNone, int bgColor=clrNone) {
		SciStyleDefinition&& style = styleByName(styleName);
		if (style is null) return;
		style.fontName = name;
		style.size = size * 100;
		style.weight = (bold ? SC_WEIGHT_SEMIBOLD : SC_WEIGHT_NORMAL);
		style.italic = (italic ? 2 : 1);
		style.underline = (underline ? 2 : 1);
		style.fore = color;
		style.back = bgColor;
	}

	void _apply(ScintillaWindow& swnd) {
		NoCaseMap<int> fonts;
		enumMonoFonts(fonts);
		//styles[0]._apply(swnd, fonts);
		swnd.styleClearAll();
		for (uint i = 0; i < styles.length; i++)
			styles[i]._apply(swnd, fonts);

		clrCurrentLine = styleByNum(stCurrentLine).back;
		clrSelectedWordHighlight = styleByNum(stSelectionHighlight).back;

		//если цвет текущей строки равен цвету фона редактора тогда выключаем подсветку текущей строки
		highlightCurrentLine = (clrCurrentLine != styleByNum(STYLE_DEFAULT).back);
		
		swnd.setStyleEolFilled(stString, 1);
		//sciFunc(swnd.editor_ptr, SCI_SETVIEWEOL, 1, 0);
		sciFunc(swnd.editor_ptr, SCI_SETEOLMODE, SC_EOL_LF, 0);
		
		swnd.setCaretWidth(caretWidth);
		_setupMarks(swnd);
		if (showLineNumbers)
			_setupLineNumbers(swnd);
		if (useFolding)
			_setupFolding(swnd);

		swnd.setTabWidth(tabWidth);
		swnd.setUseTabs(useTabs);
		swnd.setIndentGuides(indentGuide);
		swnd.setUsePopup(0);

		swnd.indStyleSet(indSelectedWordHighlight, INDIC_ROUNDBOX);
		swnd.indForeSet(indSelectedWordHighlight, clrSelectedWordHighlight);
		swnd.indAlphaSet(indSelectedWordHighlight, 125); // SC_ALPHA_OPAQUE/2
		sciFunc(swnd.editor_ptr, SCI_SETENDATLASTLINE, 0, 0);
		if (highlightCurrentLine) {
			sciFunc(swnd.editor_ptr, SCI_SETCARETLINEVISIBLE, 1,0);
			sciFunc(swnd.editor_ptr, SCI_SETCARETLINEBACK, clrCurrentLine,0);
		}
	}
	void Preview(bool msg) {
		if (openedSciEditors.length > 0) {
			for (uint i = 0; i < openedSciEditors.length; i++) {
				ScintillaEditor&& e = openedSciEditors[i];
				if (e is null) continue;
				_apply(e.swnd);
			}
		} else if (msg) {
			Message("Для предпросмотра откройте любое окно редактора модуля");
		}
	}
	array<string>&& enumMonoSpaceFonts() {
		NoCaseMap<int> fonts;
		enumMonoFonts(fonts);
		array<string> result;
		for (auto it = fonts.begin(); !it.isEnd(); it++)
			result.insertLast(it.key);
		result.sortAsc();
		return result;
	}

	void _setupMarks(ScintillaWindow& swnd) {
		swnd.setMarginType(smMarks, SC_MARGIN_SYMBOL);
		swnd.setMarginWidth(smMarks, 24);
		swnd.setMarginMask(smMarks, uint(-1), uint(SC_MASK_FOLDERS) /*| maskCurrentLine*/);
		swnd.marginSetClickable(smMarks, 1);
		swnd.markerDefinePixMaps();
	}
	void _setupLineNumbers(ScintillaWindow& swnd) {
		swnd.setMarginType(smLineNumbers, SC_MARGIN_NUMBER);
		swnd.setMarginWidth(smLineNumbers, swnd.textWidth("_99999", STYLE_LINENUMBER));
	}
	void _setupFolding(ScintillaWindow& swnd) {
		swnd.setProperty("fold", "1");
		swnd.setMarginWidth(smFolding, 14);
		swnd.setMarginType(smFolding, SC_MARGIN_SYMBOL);
		swnd.setMarginMask(smFolding, uint(SC_MASK_FOLDERS), 0);
		swnd.marginSetClickable(smFolding, 1);
		swnd.indStyleSet(indFolding, INDIC_ROUNDBOX);//INDIC_PLAIN
		swnd.indForeSet(indFolding, 0xBB0000);

		//swnd.foldSetFlag(SC_FOLDFLAG_LEVELNUMBERS);
		//swnd.foldSetFlag(SC_FOLDFLAG_LINESTATE);
		//swnd.setFoldMarginColour(1, styles[0].back);

		/*
								     Themes
		SC_MARKNUM_*	Arrow		Plus/minus	Circle tree				Box tree
		FOLDEROPEN		ARROWDOWN	MINUS		CIRCLEMINUS				BOXMINUS
		FOLDER			ARROW		PLUS		CIRCLEPLUS				BOXPLUS
		FOLDERSUB		EMPTY		EMPTY		VLINE					VLINE
		FOLDERTAIL		EMPTY		EMPTY		LCORNERCURVE			LCORNER
		FOLDEREND		EMPTY		EMPTY		CIRCLEPLUSCONNECTED		BOXPLUSCONNECTED
		FOLDEROPENMID	EMPTY		EMPTY		CIRCLEMINUSCONNECTED	BOXMINUSCONNECTED
		FOLDERMIDTAIL	EMPTY		EMPTY		TCORNERCURVE			TCORNER
		*/
		swnd.defineMarker(SC_MARKNUM_FOLDEROPEN,	SC_MARK_BOXMINUS);
		swnd.defineMarker(SC_MARKNUM_FOLDER,		SC_MARK_BOXPLUS);
		swnd.defineMarker(SC_MARKNUM_FOLDERSUB,		SC_MARK_VLINE);
		swnd.defineMarker(SC_MARKNUM_FOLDERTAIL,	SC_MARK_LCORNER);
		swnd.defineMarker(SC_MARKNUM_FOLDEROPENMID,	SC_MARK_BOXMINUSCONNECTED);
		swnd.defineMarker(SC_MARKNUM_FOLDEREND,		SC_MARK_BOXPLUSCONNECTED);
		swnd.defineMarker(SC_MARKNUM_FOLDERMIDTAIL, SC_MARK_TCORNER);

		int foldMarksLineColor = rgb(128, 128, 128); // styleByNum(STYLE_LINENUMBER).fore;
		int foldMakrsBackColor = styleByNum(STYLE_DEFAULT).back; //sciFunc(swnd.editor_ptr, SCI_GETMARGINBACKN, smFolding, 0);
		swnd.setMarkerFore(SC_MARKNUM_FOLDEROPEN, foldMakrsBackColor);
		swnd.setMarkerBack(SC_MARKNUM_FOLDEROPEN, foldMarksLineColor);
		swnd.setMarkerFore(SC_MARKNUM_FOLDER, foldMakrsBackColor);
		swnd.setMarkerBack(SC_MARKNUM_FOLDER, foldMarksLineColor);
		swnd.setMarkerFore(SC_MARKNUM_FOLDEREND, foldMakrsBackColor);
		swnd.setMarkerBack(SC_MARKNUM_FOLDEREND, foldMarksLineColor);
		swnd.setMarkerFore(SC_MARKNUM_FOLDEROPENMID, foldMakrsBackColor);
		swnd.setMarkerBack(SC_MARKNUM_FOLDEROPENMID, foldMarksLineColor);
		
		swnd.setMarkerBack(SC_MARKNUM_FOLDERSUB, foldMarksLineColor);
		swnd.setMarkerBack(SC_MARKNUM_FOLDERTAIL, foldMarksLineColor);
		swnd.setMarkerBack(SC_MARKNUM_FOLDERMIDTAIL, foldMarksLineColor);
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
		ScintillaWindow&& swnd = editor.swnd;
		inTextModified = true;
		editor.inReflection = true;
		int posStart = editor.getPosition(tpStart);
		utf8string ustr = newText.toUtf8();
		if (tpStart == tpEnd) {
			swnd.insertText(posStart, ustr.ptr);
		} else {
			int posEnd = editor.getPosition(tpEnd);
			swnd.setAnchorPos(posStart);
			swnd.setCurrentPos(posEnd);
			swnd.replaceSel(ustr.ptr);
		}
		posStart += ustr.length;
		swnd.goToPos(posStart);
		SetCaretPos(swnd.xFromPos(posStart), swnd.yFromPos(posStart));
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

	void connect(ScintillaWindow&& swnd) {
		if (sciDoc == 0) {
			v8string text;
			owner.tm.save(text);
			swnd.setCodePage(SC_CP_UTF8);
			swnd.setText(text.str.toUtf8().ptr);
			sciDoc = swnd.docPointer();
		} else
			swnd.setDocPointer(sciDoc);
	}
};

class ScintillaEditor : TextEditorWindow, SelectionChangedReceiver {
	ScintillaDocument&& owner;
	ASWnd&& wnd;
	ScintillaWindow swnd;
	bool inReflection = false;
	int_ptr curLineMarkerHandle = 0;
	bool selectedWordHighlighted = false;
	string breakPointKey;
	bool needFocus = false;
	
	ScintillaEditor(ScintillaDocument&& o) {
		&&owner = o;
	}

	LRESULT _scicall(uint msg, WPARAM w = 0, LPARAM l = 0) {
		return sciFunc(swnd.editor_ptr, msg, w, l);
	}
	void attach(TextWnd&& tw) override {
		TextEditorWindow::attach(tw);
		
		tw.wnd.setMessages(array<uint> = {WM_SETFOCUS, WM_DESTROY, WM_SIZE, WM_NOTIFY, WM_NCCALCSIZE, WM_CHAR, WM_KEYDOWN, WM_SYSKEYDOWN, 0x0084, 0x0085});
		swnd.create(tw.hWnd, WS_CHILD | WS_VISIBLE | WS_CLIPCHILDREN | WS_CLIPSIBLINGS);
		Rect rc;
		GetClientRect(txtWnd.hWnd, rc);
		if (rc.right > 0) { // Окно уже имеет размер, надо развернуться
			// Форсим пересчёт размера клиентской части
			SetWindowPos(tw.hWnd, 0, 0, 0, 0, 0, SWP_NOSIZE | SWP_NOMOVE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED);
			onSizeParent();	// Разворачиваемся
		}
		owner.connect(swnd);
		breakPointKey = getBreakPointKey();
		initWindowSettings();
		stylishText(swnd.length());
		&&wnd = attachWndToFunction(swnd.hEditor, WndFunc(this.ScnWndProc), array<uint> = {WM_SETFOCUS, WM_KILLFOCUS, WM_CHAR, WM_KEYDOWN, WM_SYSKEYDOWN, WM_RBUTTONDOWN});
		editorsManager._subscribeToSelChange(tw.ted, this);
		openedSciEditors.insertLast(&&this);
		initialFolding();
	}
	
	void detach() override {
		txtWnd.wnd.setMessages(txtWnd.defaultMessages());
		editorsManager._unsubsribeFromSelChange(txtWnd.ted, this);
		swnd.destroy();
		&&lastActiveScintillaEditor = null;
		TextEditorWindow::detach();
		int found = openedSciEditors.findByRef(&&this);
		if (found >= 0) { openedSciEditors.removeAt(found); /*Message("remove");*/}
	}

	LRESULT wndProc(uint msg, WPARAM w, LPARAM l) override {
		switch (msg) {
		case WM_SETFOCUS:
			if (!needFocus) {
				//Message("editor WM_SETFOCUS: send focus to swnd");
				SetFocus(swnd.hEditor);
			} //else Message("editor WM_SETFOCUS: send focus to swnd blocked");
			return 0;
		case WM_SIZE:
			onSizeParent();
			break;
		case WM_NCCALCSIZE: 
			return 0; // чтобы убрать 1Сные скроллеры
		case 0x0084: //WM_NCHITTEST:
		case 0x0085: //WM_NCPAINT:
			return 0;
		case WM_NOTIFY:
			return l != 0 ? onNotifyParent(toSCNotification(l).ref) : 0;
		case WM_CHAR:
		case WM_KEYDOWN:
		case WM_SYSKEYDOWN:
			return SendMessage(swnd.hEditor, msg, w, l);
		}
		return txtWnd.wnd.doDefault();
	}
	void createCaret(uint lineHeight) override {
		CreateCaret(swnd.hEditor, 0, 2, lineHeight);
	}
	void showCaret() override {
		ShowCaret(swnd.hEditor);
	}
	void getFontSize(Size& fontSize) override {
		fontSize.cy = swnd.textHeight();
	}
	uint getTextWidth(const string& text, const Size& fontSize) override {
		return swnd.textWidth(text);
	}
	// Вызывается после изменения выделения в штатном текстовом редакторе
	void onSelectionChanged(ITextEditor&, const TextPosition& tpStart, const TextPosition& tpEnd) override {
		//Message("onSelectionChanged 1");
		if (inReflection)	// идёт смена выделения, инициализированная нами
			return;
		//Message("onSelectionChanged 2");
		// Установка этого флага блокирует уведомление штатного редактора об изменении выделения
		// в сцинтилле, чтобы избежать лишнего цикла
		inReflection = true; //Message("inReflection true 1");
		int posColStart = getPosition(tpStart);
		// если выделение "пустое", то просто переместим каретку
		if (tpStart == tpEnd) {
			swnd.goToPos(posColStart);
			SetCaretPos(swnd.xFromPos(posColStart), swnd.yFromPos(posColStart));
		} else {
			// Иначе установим выделение
			swnd.setSelection(posColStart, getPosition(tpEnd));
		}
		inReflection = false;
		swnd.ensureLineVisible();
		swnd.scrollToCaret();
	}
	void onScrollToCaretPos(ITextEditor& editor) override {
		swnd.scrollToCaret();
	}
	bool getCaretPosForIS(ITEIntelliSence& teis, Point& caretPos, uint& lineHeight) override {
		GetCaretPos(caretPos);
		lineHeight = swnd.textHeight();
		return true;
	}
	void checkSelectionInIdle(ITextEditor& editor) override {
		//Message("checkSelectionInIdle");
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
		int posAnchor = swnd.anchorPos();
		int posCurrent = swnd.currentPos();
		if (posStart != posAnchor || posEnd != posCurrent) {
			inReflection = true; //Message("inReflection true 2");
			if (posStart == posEnd) {
				swnd.goToPos(posStart);
			} else {
				// Иначе установим выделение
				swnd.setSelection(posStart, posEnd);
			}
			//Message("ensureLineVisible");
			swnd.ensureLineVisible();
			inReflection = false;
			
		}
	}

	LRESULT ScnWndProc(uint msg, WPARAM w, LPARAM l) {
		switch (msg) {
		case WM_SETFOCUS:
			//Message("scintilla WM_SETFOCUS: activeTextWnd = txtWnd");
			&&activeTextWnd = txtWnd;
			&&lastActiveScintillaEditor = null;
			break;
		case WM_KILLFOCUS: {
			//Message("scintilla WM_KILLFOCUS: activeTextWnd = null");
			&&activeTextWnd = null;
			//при нажатии кнопки на тулбаре фокус с редактора уходит, запомним себя для использования в обработчике команды
			&&lastActiveScintillaEditor = this;

			//string className;
			//uint hWndReceiveFocus = w;
			//if (hWndReceiveFocus > 0) {
			//	className.setLength(GetClassName(hWndReceiveFocus, className.setLength(300), 300));
			//	if (className == "V8CommandBar") {
			//		&&lastActiveScintillaEditor = this;
			//	}
			//}

			break;
		}
		case WM_CHAR:
		{
			if ((w == VK_RETURN || w == VK_SPACE) && inReflection) 
				return 0;
			
			LRESULT res = wnd.doDefault();
			if (w == VK_RETURN)
				autoIndent();
			txtWnd.onChar(w);
			return res;
		}
		case WM_KEYDOWN:
		case WM_SYSKEYDOWN:
			if (checkForSubst(w) || txtWnd.onKeyDown(w, l))
				return 0;
			break;
		}
		return wnd.doDefault();
	}
	bool checkForSubst(WPARAM w) {
		 
		//разобраться
		//при нажатии пробела и срабатывании шаблона и появлении диалога пробел вставляется в сцинтиллу но не вставляется в редактор

		//if (w == VK_RETURN || w == VK_SPACE) {
		//	//if (swnd.getLineState(swnd.currentLine()) & LS_COMMENTLINE == 0) {
		//	int curStyle = swnd.getStyleAt(swnd.currentPos()-1);
		//	if ((curStyle == stIds) || (curStyle == stKeyword) || (curStyle == STYLE_DEFAULT)) {
		//		int posSelStart = swnd.anchorPos();
		//		int posSelEnd = swnd.currentPos();
		//		if (posSelStart == posSelEnd) {
		//			TextPosition caretPos;
		//			calcPosition(posSelStart, caretPos);
		//			ITemplateProcessor&& tp;
		//			getTxtEdtService().getTemplateProcessor(tp);
		//			string cline = getTextLine(txtWnd.textDoc.tm, caretPos.line).substr(0, caretPos.col - 1);
		//			v8string line;
		//			if (tp.needSubstitute(v8string(cline), txtWnd.textDoc.tm, line)) {
		//				CommandID subst(cmdGroupTxtEdt, cmdProcessTemplate);
		//				if ((commandState(subst) & cmdStateEnabled) != 0)
		//					sendCommandToMainFrame(subst);
		//				inReflection = true;
		//				return true;
		//			}
		//		}
		//	}
		//}
		return false;
	}
	void autoIndent() {
		int line = swnd.lineFromPos(swnd.currentPos());
		if (line < 1)
			return;
		string currentLine = swnd.lineOfText(line);
		string prevLine;
		for (int pp = line - 1; pp >= 0; pp--) {
			prevLine = swnd.lineOfText(pp);
			if (!prevLine.isEmpty())
				break;
		}
		/*Message("Line = " + line);
		Message(currentLine);
		Message(prevLine);*/
		int currentLevel = 0;
		lexem lex;
		lex_provider lp(prevLine.cstr);
		while (lp.nextWithKeyword(lex)) {
			switch (lexType(lex.type)) {
			case ltIf:
			case ltFor:
			case ltWhile:
			case ltTry:
			case ltProcedure:
			case ltFunction:
			case ltElsIf:
			case ltElse:
			case ltExcept:
				currentLevel++;
				break;
			case ltEndIf:
			case ltEndDo:
			case ltEndTry:
			case ltEndProcedure:
			case ltEndFunction:
				if (currentLevel > 0)
					currentLevel--;
				break;
			}
		}
		lp.setSource(currentLine.cstr);
		if (lp.nextWithKeyword(lex)) {
			switch (lexType(lex.type)) {
			case ltElsIf:
			case ltElse:
			case ltExcept:
			case ltEndIf:
			case ltEndDo:
			case ltEndTry:
			case ltEndProcedure:
			case ltEndFunction:
				currentLevel--;
				break;
			}
		}
		//Message("cl=" + currentLevel);
		string indent = prevLine.match(indentRex).text(0, 0);
		if (currentLevel > 0) {
			if (sciSetup.useTabs == 1)
				indent.padRight('\t', indent.length + currentLevel);
			else
				indent.padRight(' ', indent.length + currentLevel * sciSetup.tabWidth);
		} else if (currentLevel < 0) {
			currentLevel = -currentLevel;
			string re;
			if (sciSetup.useTabs == 1)
				re = "\\t{" + currentLevel + "}";
			else
				re = " {" + (currentLevel * sciSetup.tabWidth) + "}";
			indent.replace(RegExp(re), "", 1);
		}
		string indentCurrent = currentLine.match(indentRex).text(0, 0);
		int start = swnd.posFromLine(line);
		swnd.setSelection(start, start + indentCurrent.length);
		swnd.replaceSel(indent.toUtf8().ptr);
		swnd.goToPos(start + indent.length);
	}

	void initWindowSettings() {
		swnd.setModEventMask(SC_MOD_INSERTTEXT | SC_MOD_DELETETEXT);
		swnd.setLexer(SCLEX_CONTAINER);
		swnd.setTechnology(SC_TECHNOLOGY_DIRECTWRITE);
		//swnd.setBufferedDraw(1);
		sciSetup._apply(swnd);
		updateBreakPoints();
		updateBookMarks();
	}
	void onSizeParent() {
		Rect rc;
		GetClientRect(txtWnd.hWnd, rc);
		MoveWindow(swnd.hEditor, 0, 0, rc.right, rc.bottom, 1);
	}
	
	void highlightSelectedWord(){
		
		int selStartPos = swnd.selectionStart();
		int selEndPos = swnd.selectionEnd();
		bool needClear = false;
		
		if (selStartPos != selEndPos){
			if (swnd.lineFromPos(selStartPos) == swnd.lineFromPos(selEndPos)){
				if (swnd.isRangeWord(selStartPos,selEndPos)){
					int selectedRangeLength = selEndPos - selStartPos;
					//string selectedText = swnd.text(selStartPos, selectedRangeLength);
					//Message("selectedText " + selectedText);
					int firstVisibleLine = swnd.firstVisibleLine();
					int linesOnScreen = swnd.linesOnScreen();
					
					MemoryBuffer&& selectedRangeBuf = swnd.textRange(selStartPos, selectedRangeLength);
					selectedRangeBuf.set_byte(selectedRangeLength, '\0');
					Sci_TextToFind tf;
					tf.lpstrText = selectedRangeBuf.bytes;
					
					for (int i=0; i<linesOnScreen; i++){
						int docLine = swnd.docLineFromVisibleLine(firstVisibleLine+i);
						int posLineStart = swnd.posFromLine(docLine); 
						int posLineEnd = swnd.lineEndPosition(docLine);
						//string currentLine = swnd.text(posLineStart, posLineEnd-posLineStart);
						//Message("currentLine " + currentLine);
						tf.chrg.cpMin = posLineStart;
						tf.chrg.cpMax = posLineEnd;
						int posFound = swnd.findText(SCFIND_WHOLEWORD,tf.self);
						while (posFound != -1){ //если несколько значений в одной строке
							//Message("founded: " + swnd.text(posFound, selectedRangeLength));
							if (posFound != selStartPos) {//само выделенное слово не раскрашиваем
								selectedWordHighlighted = true;
								swnd.indCurrentSet(indSelectedWordHighlight);
								swnd.indFillRange(posFound, selectedRangeLength);
							}
							tf.chrg.cpMin = posFound + selectedRangeLength;
							if (tf.chrg.cpMin >= posLineEnd) break;
							posFound = swnd.findText(SCFIND_WHOLEWORD,tf.self);
						}
					}
				} else needClear = true;
			} else needClear = true;
		} else needClear = true;
		
		if (needClear && selectedWordHighlighted){
			swnd.indCurrentSet(indSelectedWordHighlight);
			swnd.indClearRange(0, swnd.length());
			selectedWordHighlighted = false;
		}
	}

	void highlightPairBracket(){
		int curPos = swnd.currentPos();
		int matchPos = _scicall(SCI_BRACEMATCH, curPos-1);
		if (matchPos >= 0) {
			//Message("found " + curPos + " - " + matchPos);
			_scicall(SCI_BRACEHIGHLIGHT, curPos-1, matchPos);
		} else
			_scicall(SCI_BRACEHIGHLIGHT, uint(-1), uint(-1));
	}

	string getBreakPointKey() {
		//Message("id из ScintillaEditor " + string(txtWnd.textDoc.mdInfo.object.id)); //не такой гуид как через ComWrapper
		string strThisMdObjGuid;
		IV8MDObject&& mdoThis = txtWnd.getComWrapper().get_mdObj();
		if (mdoThis is null) return strThisMdObjGuid;
		strThisMdObjGuid = mdoThis.get_id();
		//для модулей приложения в профиле хранится гуид конфигурации, а не свой
		IV8MDObject&& mdoRoot = oneDesigner._metadata.get_current().get_rootObject();
		if (mdoThis.get_name() == mdoRoot.get_name()) {
			strThisMdObjGuid = mdoRoot.get_id();
			//Message("guid changed to root");
		}

		strThisMdObjGuid = strThisMdObjGuid + string(txtWnd.textDoc.mdInfo.mdPropUuid);
		strThisMdObjGuid.makeLower();
		//Message("id из ScintillaEditor " + strThisMdObjGuid);
		return strThisMdObjGuid;
	}

	void updateBreakPoints() {
		if (breakPointKey.isEmpty()) return;
		swnd.markerDeleteAll(markBreakPoint);
		swnd.markerDeleteAll(markBreakPointDisabled);
		swnd.markerDeleteAll(markBreakPointConditional);
		for (auto it = breakpoints.begin(); it++;) {
			if (it.key.find(breakPointKey) == 0){
				BreakPointDef&& bpDef = it.value;
				if (!bpDef.isEnabled)
					swnd.addMarker(bpDef.line - 1, markBreakPointDisabled);
				else if (bpDef.isCondition)
					swnd.addMarker(bpDef.line - 1, markBreakPointConditional);
				else
					swnd.addMarker(bpDef.line - 1, markBreakPoint);
			}
		}
	}

	void updateBookMarks() {
		if (breakPointKey.isEmpty()) return;
		swnd.markerDeleteAll(markBookmark);
		for (auto it = bookmarks.begin(); it++;) {
			if (it.key.find(breakPointKey) == 0) {
				swnd.addMarker(it.value - 1, markBookmark);
			}
		}
	}

	BreakPointDef&& getBreakPointAtLine(int line) {
		auto found = breakpoints.find(breakPointKey + line);
		return found.isEnd() ? null : found.value;
	}

	LRESULT onNotifyParent(SCNotification& scn) {
		if (scn.nmhdr.hwndFrom != swnd.hEditor)
			return txtWnd.wnd.doDefault();
		switch (scn.nmhdr.code) {
		case SCN_STYLENEEDED:
			stylishText(scn.position);
			break;
		case SCN_UPDATEUI:
			if ((scn.updated & SC_UPDATE_SELECTION) != 0) {
				updateSelectionInParent();
				//updateCurrentLineMarker();
			}
			highlightSelectedWord();
			highlightPairBracket();
			break;
		case SCN_MODIFIED:
			if ((scn.modificationType & (SC_MOD_INSERTTEXT | SC_MOD_DELETETEXT)) != 0)
				updateTextInParent(scn);
			break;
		case SCN_MARGINCLICK:
			if (scn.margin == smFolding) {
				//int level = swnd.foldLevel(swnd.lineFromPos(scn.position));
				//Message("Level is " + (level & SC_FOLDLEVELNUMBERMASK) + ((level & SC_FOLDLEVELHEADERFLAG) != 0 ? " header" : ""));
				toggleFold(swnd.lineFromPos(scn.position));
			} else if (scn.margin == smMarks) {
				swnd.setCurrentPos(scn.position);
				swnd.setAnchorPos(scn.position);
				TextPosition tp; 
				calcPosition(scn.position, tp);
				txtWnd.ted.setCaretPosition(tp);
				sendCommandToMainFrame(CommandID(Guid("{DE680E96-5826-4E22-834D-692E307A1D9C}"), 11)); //toggle breakpoint
			}
		}
		return 0;
	}
	void toggleFold(int line) {
		swnd.toggleFold(line);

		if (sciSetup.highlightFoldHeader) {
			int expanded = swnd.foldIsExpanded(line);
			int posStart = swnd.posFromLine(line), posEnd = posStart + swnd.lineLength(line);
			swnd.indCurrentSet(indFolding);
			if (expanded == 0) {
				while (posStart < posEnd && swnd.charAt(posStart) <= ' ')
					posStart++;
				posEnd--;
				while (posEnd > posStart && swnd.charAt(posEnd) <= ' ')
					posEnd--;
				swnd.indFillRange(posStart, posEnd - posStart + 1);
			} else {
				swnd.indClearRange(posStart, posEnd - posStart);
			}
		}

	}
	void updateSelectionInParent() {
		//Message("updateSelectionInParent 1");
		if (inReflection)
			return;
		//Message("updateSelectionInParent 2");
		inReflection = true; //Message("inReflection true 3");
		TextPosition tpStart, tpEnd;
		int posStart = swnd.anchorPos(), posEnd = swnd.currentPos();
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
		if (GetFocus() == swnd.hEditor && !owner.inTextModified) {	// Обрабатываем уведомление только от окна в фокусе
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
			swnd.ensureLineVisible();
			swnd.scrollToCaret();
		}
	}
	bool inStylish = false;
	void stylishText(int position) {
		if (inStylish)
			return;
		//Message("stylishText start pos: " + swnd.posEndStyled() + " end pos: " + position);
		inStylish = true;
		uint line = swnd.lineFromPos(swnd.posEndStyled());
		if (line > 0) line--; //захватим предыдущую строку
		//Message("stylishText start line: " + (line+1) + " end line: " + (swnd.lineFromPos(position)+1));
		FoldingProcessor foldingProcessor(this, line);
		uint startPos = swnd.posFromLine(line);
		int len = position - startPos;
		string text = swnd.text(startPos, len);
		lex_provider lp(text.cstr, line);
		lexem lex;
		swnd.startStyling(startPos);
		startPos = text.cstr;
		bool wasPoint = false;
		int lexemIdxInLine = 0;
		uint prevLine = line;
		swnd.setLineState(line, 0);
		int style = STYLE_DEFAULT;
		uint linesCount = txtWnd.textDoc.tm.getLinesCount();
		for (;;) {
			lp.nextWithKeyword(lex);
			if (lex.line > linesCount) break; //на пустом модуле лексер глючит и выдает случайный номер строки

			int type = lexType(lex.type);
			//Message("line " + (lex.line + 1) + ", lexemIdxInLine " + lexemIdxInLine + ", type " + type + ", text " + lex.text + ", start " + lex.start);
			
			if (lex.line > prevLine) {
				if ((style == stString) && ((swnd.getLineState(prevLine) & LS_MULTILINESTRING) != 0)) {
					//последняя лексема предыдущей строки была "многосточный текст", 
					//раскрасим символы перевода строки в стиль stString, чтобы сработал механизм SCI_STYLESETEOLFILLED
					string strPrevLine = getTextLine(txtWnd.textDoc.tm, prevLine+1);//нумерация с 1
					//string strMsg = strPrevLine.dup(); strMsg = strMsg.replace("\r", "\\r"); strMsg = strMsg.replace("\n", "\\n"); Message("prev line: " + strMsg);
					if (strPrevLine.find("\r\n") > 0) {
						//Message("RN");
						swnd.setStyle(2, stString); //в байтах utf-8, \r\n по байту на символ
						startPos = startPos + 4; //в байтах string, 2 байта на символ
					} else if (strPrevLine.find("\n") > 0) {
						//Message("N");
						swnd.setStyle(1, stString);
						startPos = startPos + 2;
					}
				}
				lexemIdxInLine = 0;
				prevLine = lex.line;
				swnd.setLineState(lex.line, 0);
			}

			foldingProcessor.preprocType = 0;
			if (lexemIdxInLine == 0) {
				switch (type) {
				case ltRemark:
					swnd.setLineState(lex.line, LS_COMMENTLINE);
					break;
				case ltTry:
					swnd.setLineState(lex.line, LS_TRY);
					break;
				case ltIf:
				case ltElse:
				case ltElsIf:
					swnd.setLineState(lex.line, LS_CONDITION);
					break;
				case ltWhile:
				case ltFor:
					swnd.setLineState(lex.line, LS_LOOP);
					break;
				case ltProcedure:
				case ltFunction:
					swnd.setLineState(lex.line, LS_METHOD);
					break;
				case ltPreproc: {
					//Message("line " + (lex.line + 1) + ", lexemIdxInLine " + lexemIdxInLine + ", type " + type + ", text " + lex.text);
					swnd.setLineState(lex.line, LS_PREPROC);
					string strPreproc = lex.text;
					strPreproc.makeLower();
					if ((strPreproc.substr(0, 5) == "#если") || (strPreproc.substr(0, 8) == "#область")) {
						foldingProcessor.preprocType = 1;
					} else if ((strPreproc.substr(0, 10) == "#конецесли") || (strPreproc.substr(0, 13) == "#конецобласти")) {
						foldingProcessor.preprocType = 2;
					}
				}
				break;
				}
			}

			if (type == ltQuote) {
				//Message("line " + (lex.line + 1) + ", lexemIdxInLine " + lexemIdxInLine + ", type " + type + ", text " + lex.text);
				string strStr = lex.text;
				if ((lexemIdxInLine == 0) && (strStr[0] == '|')) {
					swnd.setLineState(lex.line, LS_MULTILINESTRING);
				} else {
					int quoteCount = 0;
					if (strStr[0] == '\"') {
						for (uint i = 0; i < strStr.length; i++) {
							int ch = strStr[i];
							if (ch == '\"') quoteCount++;
							if (ch == '\n') break;
						}
					}
					if ((quoteCount % 2) == 0) { //в строке четное кол-во кавычек, значит строка закрытая
						//Message("четное колво кавычек");
					} else {
						swnd.setLineState(lex.line, LS_MULTILINESTRING);
						//Message("нечетное колво кавычек");
					}
				}
			}
			
			foldingProcessor.lexemIdxInLine = lexemIdxInLine;
			foldingProcessor.process(lex.line, type);

			len = lex.text.toUtf8().length;
			if (lex.start > startPos) {
				swnd.setStyle((lex.start - startPos) / 2, STYLE_DEFAULT); //пробельные символы в utf-8 по одному байту
				startPos = lex.start;
			}
			
			if (type > ltName) {
				if (wasPoint)
					style = stIdentifier;
				else
					style = stKeyword;
			} else if (type < ltName) {
				if (type > ltLabel)
					style = stOperator;
				else if (type == ltRemark)
					style = stRemark;
				else if (type == ltQuote)
					style = stString;
				else if (type == ltDate)
					style = stDate;
				else if (type == ltNumber)
					style = stNumber;
				else if (type == ltPreproc)
					style = stPreproc;
				else if (type == ltDirective)
					style = stDirective;
				else
					style = stLabel;
			} else
				style = stIdentifier;

			swnd.setStyle(len, style);
			startPos += lex.length * 2;

			wasPoint = type == ltPeriod;
			lexemIdxInLine++;
			if (lex.type == 0 || lp.atEnd()) {
				foldingProcessor.setLevelForProcessedLine();
				break;
			}
		}
		swnd.setStyle(position - swnd.posEndStyled(), style);
		inStylish = false;
	}
	// Пересчёт из координат штатного редактора в позицию документа сцинтиллы
	int getPosition(const TextPosition& tp) {
		int col = tp.col - 1;
		int pos = swnd.posFromLine(tp.line - 1);
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
		int line = swnd.lineFromPos(pos);
		int lineStart = swnd.posFromLine(line);
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
	//void updateCurrentLineMarker() {
	//	if (sciSetup.highlightCurrentLine) {
	//		int cl = swnd.lineFromPos(swnd.currentPos());
	//		if (curLineMarkerHandle != 0) {
	//			int oldLine = swnd.lineFromMarkHandle(curLineMarkerHandle);
	//			if (oldLine == cl)
	//				return;
	//			swnd.deleteMarkHandle(curLineMarkerHandle);
	//		}
	//		curLineMarkerHandle = swnd.addMarker(cl, markCurrentLine);
	//	}
	//}

	void initialFolding() {
		int lineCount = swnd.getLineCount();
		for (int line = 0; line < lineCount; line++){
			int level = swnd.foldLevel(line);
			if ((level & SC_FOLDLEVELHEADERFLAG) != 0){
				bool stateComment = ((swnd.getLineState(line) & LS_COMMENTLINE) != 0);
				bool stateProc = ((swnd.getLineState(line) & LS_METHOD) != 0);
				bool stateCond = ((swnd.getLineState(line) & LS_CONDITION) != 0);
				bool stateLoop = ((swnd.getLineState(line) & LS_LOOP) != 0);
				bool stateMultiString = ((swnd.getLineState(line) & LS_MULTILINESTRING) != 0);
				bool stateTry = ((swnd.getLineState(line) & LS_TRY) != 0);
				bool statePreproc = ((swnd.getLineState(line) & LS_PREPROC) != 0);

				if (sciSetup.foldComment && stateComment) swnd.toggleFold(line);
				if (sciSetup.foldProc && stateProc) swnd.toggleFold(line);
				if (sciSetup.foldCond && stateCond) swnd.toggleFold(line);
				if (sciSetup.foldLoop && stateLoop) swnd.toggleFold(line);
				if (sciSetup.foldMultiString && stateMultiString) swnd.toggleFold(line);
				if (sciSetup.foldTry && stateTry) swnd.toggleFold(line);
				if (sciSetup.foldPreproc && statePreproc) swnd.toggleFold(line);
			}
		}
	}

	void foldUnfoldAll(bool fold){
		if (fold) 
			initialFolding();
		else 
			sciFunc(swnd.editor_ptr, SCI_FOLDALL, SC_FOLDACTION_EXPAND, 0);
		
	}
};

class FoldingProcessor {
	int line;
	int level;
	int currentLineLevel;
	bool needHeader = false;
	ScintillaEditor&& edt;
	ScintillaWindow&& swnd;
	int lexemIdxInLine;
	int initLine;
	uint preprocType; //1 - открывающий (#Если, #Область), 2 - закрывающий (#КонецЕсли, #КонецОбласти)
	int lastProcessedMultiline = -1;

	FoldingProcessor(ScintillaEditor& e, uint& _line) {
		// Парсить будем со строки, либо содержащей точку свёртки первого уровня, либо начало модуля
		&&edt = e;
		&&swnd = e.swnd;
		//for (; !(swnd.foldLevel(_line) == (SC_FOLDLEVELBASE & SC_FOLDLEVELHEADERFLAG) || _line == 0); _line--);
		//currentLineLevel = level = SC_FOLDLEVELBASE;
		line = _line;
		currentLineLevel = level = (swnd.foldLevel(line) & SC_FOLDLEVELNUMBERMASK);
		//Message("Init line=" + (line+1) + " level=" + level);
		initLine = line;
	}
	void setLevelForProcessedLine() {
		int l = level;
		int flag = 0;
		if (currentLineLevel > level || needHeader)
			flag = SC_FOLDLEVELHEADERFLAG;
		if (needHeader) {
			l--;
			needHeader = false;
		}
		if (l < SC_FOLDLEVELBASE) l = SC_FOLDLEVELBASE;
		//if (flag == 0 && 0 == swnd.foldIsExpanded(line)) edt.toggleFold(line);
		swnd.foldSetLevel(line, l | flag);
		//Message("SetLevel line=" + (line+1) + " level=" + l);
		if (currentLineLevel < SC_FOLDLEVELBASE) currentLineLevel = SC_FOLDLEVELBASE;
		level = currentLineLevel;
	}
	void setLevelForEmptyLines(int currentLexemLine) {
		if (line != currentLexemLine) {
			while (++line < currentLexemLine) {
				swnd.foldSetLevel(line, level);
				swnd.setLineState(line, 0);
			}
		}
	}
	void calcLevelChange(int lexType) {
		if ((lexType >= ltIf && lexType <= ltEndTry) || lexType==ltRemark || lexType == ltPreproc || lexType == ltQuote) {
			switch (lexType) {
			case ltIf:
			case ltFor:
			case ltWhile:
			case ltTry:
				currentLineLevel++;
				break;
			case ltProcedure:
			case ltFunction:
				//level = 1024;
				//currentLineLevel = 1025;
				currentLineLevel++;
				break;
			case ltElsIf:
			case ltElse:
			case ltExcept:
				needHeader = true;
				//Message("needHeader line " + (line + 1));
				if (line == initLine) { currentLineLevel++; level++; }
				break;
			case ltEndIf:
			case ltEndDo:
			case ltEndTry:
				currentLineLevel--;
				break;
			case ltEndProcedure:
			case ltEndFunction:
				//level = 1025;
				//currentLineLevel = 1024;
				currentLineLevel--;
				break;
			case ltRemark:
				if (lexemIdxInLine == 0) {
					bool prevLineIsComment = ((swnd.getLineState(line - 1) & LS_COMMENTLINE) != 0);
					if (!prevLineIsComment) {
						currentLineLevel++;
						//Message("comment start, line=" + (line + 1) + " level=" + currentLineLevel);
					}

					bool nextLineIsComment = false;
					//if (swnd.getLineCount() >= (line+1 + 1)) {
					if ((line + 1) <= (swnd.getLineCount()-1)) {
						string strNextLine = swnd.lineOfText(line + 1);
						strNextLine.ltrim();
						if (strNextLine.beginFrom("//")) {
							nextLineIsComment = true;
						}
					}
					if (!nextLineIsComment) {
						currentLineLevel--;
						//Message("comment end, line=" + (line + 1) + " level=" + currentLineLevel);
					}
				}
				break;

			case ltPreproc:
				if (preprocType == 1) currentLineLevel++;
				if (preprocType == 2) currentLineLevel--;
				break;

			case ltQuote:
				if ((line > lastProcessedMultiline) && ((swnd.getLineState(line) & LS_MULTILINESTRING) != 0)) {
					bool prevLineIsMultiString = ((swnd.getLineState(line - 1) & LS_MULTILINESTRING) != 0);
					if (!prevLineIsMultiString) {
						currentLineLevel++;
						//Message("MultiString start, line=" + (line + 1) + " level=" + currentLineLevel);
					}

					bool nextLineIsMultiString = false;
					if ((line + 1) <= (swnd.getLineCount() - 1)) {
						string strNextLine = swnd.lineOfText(line + 1);
						strNextLine.ltrim();
						if (strNextLine.beginFrom("|")) {
							nextLineIsMultiString = true;
						}
					}
					if (!nextLineIsMultiString) {
						currentLineLevel--;
						//Message("MultiString end, line=" + (line + 1) + " level=" + currentLineLevel);
					}
					lastProcessedMultiline = line;
				}
				break;
			}
		} 
		
	}
	void process(int lexLine, int lexType) {
		
		if (lexLine != line)
			setLevelForProcessedLine();
		setLevelForEmptyLines(lexLine);
		calcLevelChange(lexType);
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


uint WideStringToAnsiString(string str) {
	bool useDef;
	int len = WideCharToMultiByte(CP_ACP, 0, str.cstr, str.length, 0, 0, 0, useDef);
	uint bytes = malloc(len + 1);
	WideCharToMultiByte(CP_ACP, 0, str.cstr, str.length, bytes, len, 0, useDef);
	mem::byte[bytes + len] = '\0';
	return bytes; //не забывать потом free(bytes);
}

array<uint> xpm_breakpoint = { //в оригинале это char* []
	WideStringToAnsiString("15 15 65 1"),
	WideStringToAnsiString(" 	c None"),
	WideStringToAnsiString(".	c #D6D7D5"),
	WideStringToAnsiString("+	c #D3DEDF"),
	WideStringToAnsiString("@	c #CABEBE"),
	WideStringToAnsiString("#	c #CE9A98"),
	WideStringToAnsiString("$	c #D2827E"),
	WideStringToAnsiString("%	c #CB7571"),
	WideStringToAnsiString("&	c #D39791"),
	WideStringToAnsiString("*	c #DF827B"),
	WideStringToAnsiString("=	c #E88C82"),
	WideStringToAnsiString("-	c #E57F75"),
	WideStringToAnsiString(";	c #E5756F"),
	WideStringToAnsiString(">	c #D76057"),
	WideStringToAnsiString(",	c #C0504A"),
	WideStringToAnsiString("'	c #BC8081"),
	WideStringToAnsiString(")	c #DCDEDC"),
	WideStringToAnsiString("!	c #D18E8B"),
	WideStringToAnsiString("~	c #ED8F85"),
	WideStringToAnsiString("{	c #ED9589"),
	WideStringToAnsiString("]	c #EE9E96"),
	WideStringToAnsiString("^	c #E7827D"),
	WideStringToAnsiString("/	c #E17971"),
	WideStringToAnsiString("(	c #DE6158"),
	WideStringToAnsiString("_	c #BE443E"),
	WideStringToAnsiString(":	c #B26E6E"),
	WideStringToAnsiString("<	c #F0A69A"),
	WideStringToAnsiString("[	c #ED9791"),
	WideStringToAnsiString("}	c #E67A72"),
	WideStringToAnsiString("|	c #E27266"),
	WideStringToAnsiString("1	c #D55851"),
	WideStringToAnsiString("2	c #B33731"),
	WideStringToAnsiString("3	c #D7E4E5"),
	WideStringToAnsiString("4	c #DD7C77"),
	WideStringToAnsiString("5	c #F4AAA4"),
	WideStringToAnsiString("6	c #D95C53"),
	WideStringToAnsiString("7	c #CA4A40"),
	WideStringToAnsiString("8	c #9A2626"),
	WideStringToAnsiString("9	c #BCB4B4"),
	WideStringToAnsiString("0	c #AD2825"),
	WideStringToAnsiString("a	c #AA6A6A"),
	WideStringToAnsiString("b	c #DF6761"),
	WideStringToAnsiString("c	c #863436"),
	WideStringToAnsiString("d	c #BF6861"),
	WideStringToAnsiString("e	c #CE4440"),
	WideStringToAnsiString("f	c #791D21"),
	WideStringToAnsiString("g	c #D55349"),
	WideStringToAnsiString("h	c #C73E37"),
	WideStringToAnsiString("i	c #A72421"),
	WideStringToAnsiString("j	c #7D292D"),
	WideStringToAnsiString("k	c #9D1713"),
	WideStringToAnsiString("l	c #986265"),
	WideStringToAnsiString("m	c #BB3D37"),
	WideStringToAnsiString("n	c #820A0A"),
	WideStringToAnsiString("o	c #D6524E"),
	WideStringToAnsiString("p	c #D95751"),
	WideStringToAnsiString("q	c #CF453B"),
	WideStringToAnsiString("r	c #AC3026"),
	WideStringToAnsiString("s	c #8F0F0B"),
	WideStringToAnsiString("t	c #8E565A"),
	WideStringToAnsiString("u	c #DFE9E4"),
	WideStringToAnsiString("v	c #9C4E51"),
	WideStringToAnsiString("w	c #87474D"),
	WideStringToAnsiString("x	c #9C5A5B"),
	WideStringToAnsiString("y	c #9A5E63"),
	WideStringToAnsiString("z	c #700E17"),
	WideStringToAnsiString("   +@#$%%#@+   "),
	WideStringToAnsiString("   &*==-;>,')  "),
	WideStringToAnsiString("  !~{]{~^/(_:) "),
	WideStringToAnsiString("+&=]<<][=}|12:3"),
	WideStringToAnsiString("@4{]<5][~}|6789"),
	WideStringToAnsiString("#}{]<<]{=}|670a"),
	WideStringToAnsiString("%-~[]][~^/b670c"),
	WideStringToAnsiString("d;^~{{~^}|b1e0f"),
	WideStringToAnsiString("db}--^-}|b6ghij"),
	WideStringToAnsiString("'1||//;|b6ge2kl"),
	WideStringToAnsiString("@_6(bbb(6gem0n9"),
	WideStringToAnsiString("3:mo16pogqmrstu"),
	WideStringToAnsiString("  v2heehh20sw+ "),
	WideStringToAnsiString("   x8i00iknw)  "),
	WideStringToAnsiString("   39yjzft9u   ") 
};

array<uint> xpm_breakpoint_disabled = {
	WideStringToAnsiString("15 15 56 1"),
	WideStringToAnsiString(" 	g None"),
	WideStringToAnsiString(".	g #D6D6D6"),
	WideStringToAnsiString("+	g #DCDCDC"),
	WideStringToAnsiString("@	g #C9C9C9"),
	WideStringToAnsiString("#	g #AEAEAE"),
	WideStringToAnsiString("$	g #9B9B9B"),
	WideStringToAnsiString("%	g #8F8F8F"),
	WideStringToAnsiString("&	g #ADADAD"),
	WideStringToAnsiString("*	g #9F9F9F"),
	WideStringToAnsiString("=	g #A8A8A8"),
	WideStringToAnsiString("-	g #949494"),
	WideStringToAnsiString(";	g #828282"),
	WideStringToAnsiString(">	g #6E6E6E"),
	WideStringToAnsiString(",	g #DDDDDD"),
	WideStringToAnsiString("'	g #A6A6A6"),
	WideStringToAnsiString(")	g #ABABAB"),
	WideStringToAnsiString("!	g #B1B1B1"),
	WideStringToAnsiString("~	g #B9B9B9"),
	WideStringToAnsiString("{	g #A2A2A2"),
	WideStringToAnsiString("]	g #969696"),
	WideStringToAnsiString("^	g #858585"),
	WideStringToAnsiString("/	g #646464"),
	WideStringToAnsiString("(	g #838383"),
	WideStringToAnsiString("_	g #C0C0C0"),
	WideStringToAnsiString(":	g #B3B3B3"),
	WideStringToAnsiString("<	g #919191"),
	WideStringToAnsiString("[	g #7A7A7A"),
	WideStringToAnsiString("}	g #555555"),
	WideStringToAnsiString("|	g #E1E1E1"),
	WideStringToAnsiString("1	g #999999"),
	WideStringToAnsiString("2	g #C4C4C4"),
	WideStringToAnsiString("3	g #7F7F7F"),
	WideStringToAnsiString("4	g #6B6B6B"),
	WideStringToAnsiString("5	g #424242"),
	WideStringToAnsiString("6	g #BEBEBE"),
	WideStringToAnsiString("7	g #484848"),
	WideStringToAnsiString("8	g #898989"),
	WideStringToAnsiString("9	g #808080"),
	WideStringToAnsiString("0	g #696969"),
	WideStringToAnsiString("a	g #333333"),
	WideStringToAnsiString("b	g #757575"),
	WideStringToAnsiString("c	g #626262"),
	WideStringToAnsiString("d	g #3E3E3E"),
	WideStringToAnsiString("e	g #343434"),
	WideStringToAnsiString("f	g #747474"),
	WideStringToAnsiString("g	g #5B5B5B"),
	WideStringToAnsiString("h	g #252525"),
	WideStringToAnsiString("i	g #767676"),
	WideStringToAnsiString("j	g #4C4C4C"),
	WideStringToAnsiString("k	g #2C2C2C"),
	WideStringToAnsiString("l	g #666666"),
	WideStringToAnsiString("m	g #E7E7E7"),
	WideStringToAnsiString("n	g #636363"),
	WideStringToAnsiString("o	g #595959"),
	WideStringToAnsiString("p	g #6D6D6D"),
	WideStringToAnsiString("q	g #717171"),
	WideStringToAnsiString("   +@#$%%#@+   "),
	WideStringToAnsiString("   &*==*-;>-,  "),
	WideStringToAnsiString("  ')!~!){]^/(, "),
	WideStringToAnsiString("+&=~__~:=$<[}(|"),
	WideStringToAnsiString("@1!~_2~:)$<3456"),
	WideStringToAnsiString("#$!~__~!=$<3473"),
	WideStringToAnsiString("%*):~~:){]83477"),
	WideStringToAnsiString("9-{)!!){$<8[07a"),
	WideStringToAnsiString("98$**{*$<83bc5d"),
	WideStringToAnsiString("-[<<]]-<83b0}ef"),
	WideStringToAnsiString("@/3^888^3b0g7h6"),
	WideStringToAnsiString("|(gi[3[ib0gjklm"),
	WideStringToAnsiString("  n}c00cc}7ko+ "),
	WideStringToAnsiString("   p55775eho,  "),
	WideStringToAnsiString("   |6qdhal6m   ") 
};

array<uint> xpm_breakpoint_condition = {
	WideStringToAnsiString("16 16 66 1"),
	WideStringToAnsiString(" 	c None"),
	WideStringToAnsiString(".	c #951013"),
	WideStringToAnsiString("+	c #791920"),
	WideStringToAnsiString("@	c #871B1B"),
	WideStringToAnsiString("#	c #A4231F"),
	WideStringToAnsiString("$	c #83383B"),
	WideStringToAnsiString("%	c #B2312D"),
	WideStringToAnsiString("&	c #9C3A3C"),
	WideStringToAnsiString("*	c #C23931"),
	WideStringToAnsiString("=	c #AF3E3B"),
	WideStringToAnsiString("-	c #545C61"),
	WideStringToAnsiString(";	c #954C4E"),
	WideStringToAnsiString(">	c #C7403B"),
	WideStringToAnsiString(",	c #D34843"),
	WideStringToAnsiString("'	c #B8514C"),
	WideStringToAnsiString(")	c #596B76"),
	WideStringToAnsiString("!	c #517085"),
	WideStringToAnsiString("~	c #D6524B"),
	WideStringToAnsiString("{	c #D0554D"),
	WideStringToAnsiString("]	c #4C789C"),
	WideStringToAnsiString("^	c #70787A"),
	WideStringToAnsiString("/	c #BE6760"),
	WideStringToAnsiString("(	c #DE6357"),
	WideStringToAnsiString("_	c #3E88C1"),
	WideStringToAnsiString(":	c #A87173"),
	WideStringToAnsiString("<	c #5286B0"),
	WideStringToAnsiString("[	c #668396"),
	WideStringToAnsiString("}	c #9F777A"),
	WideStringToAnsiString("|	c #E06761"),
	WideStringToAnsiString("1	c #4091C9"),
	WideStringToAnsiString("2	c #4996CB"),
	WideStringToAnsiString("3	c #E2756C"),
	WideStringToAnsiString("4	c #CC7B77"),
	WideStringToAnsiString("5	c #8D908B"),
	WideStringToAnsiString("6	c #5A9BCA"),
	WideStringToAnsiString("7	c #7497B0"),
	WideStringToAnsiString("8	c #6C9BBE"),
	WideStringToAnsiString("9	c #E7827A"),
	WideStringToAnsiString("0	c #779FB9"),
	WideStringToAnsiString("a	c #6DA1C6"),
	WideStringToAnsiString("b	c #BA9090"),
	WideStringToAnsiString("c	c #69A2D0"),
	WideStringToAnsiString("d	c #CF8D8C"),
	WideStringToAnsiString("e	c #DD8A85"),
	WideStringToAnsiString("f	c #E98B7B"),
	WideStringToAnsiString("g	c #EA8E83"),
	WideStringToAnsiString("h	c #A0A29B"),
	WideStringToAnsiString("i	c #76ACD7"),
	WideStringToAnsiString("j	c #EE938E"),
	WideStringToAnsiString("k	c #CFA3A0"),
	WideStringToAnsiString("l	c #EE9C93"),
	WideStringToAnsiString("m	c #AEAFA9"),
	WideStringToAnsiString("n	c #8DB7DB"),
	WideStringToAnsiString("o	c #B5B6A7"),
	WideStringToAnsiString("p	c #F0A89D"),
	WideStringToAnsiString("q	c #97BDD9"),
	WideStringToAnsiString("r	c #BCBCB4"),
	WideStringToAnsiString("s	c #AAC8DD"),
	WideStringToAnsiString("t	c #CAC9C7"),
	WideStringToAnsiString("u	c #CFCFBB"),
	WideStringToAnsiString("v	c #C0D4E1"),
	WideStringToAnsiString("w	c #D9DAC3"),
	WideStringToAnsiString("x	c #DAE5E9"),
	WideStringToAnsiString("y	c #E2ECE7"),
	WideStringToAnsiString("z	c #EFF0D9"),
	WideStringToAnsiString("A	c #F9FCFB"),
	WideStringToAnsiString("     rrmmmr     "),
	WideStringToAnsiString("   r8aqssq88o   "),
	WideStringToAnsiString("  m7svvssvvs7h  "),
	WideStringToAnsiString(" r7ssssssssss[o "),
	WideStringToAnsiString("z[innqxAAxsnqi)u"),
	WideStringToAnsiString("o<cnnxAssAxnnc]o"),
	WideStringToAnsiString("h_cciqqinvxic6_h"),
	WideStringToAnsiString("^__ccciisAqcc__h"),
	WideStringToAnsiString("5__26ccnAqc62__5"),
	WideStringToAnsiString("5<_1222qx221___5"),
	WideStringToAnsiString("o<211111111112!o"),
	WideStringToAnsiString("w-c2622xx2122c^z"),
	WideStringToAnsiString(" o!i26266622i!u "),
	WideStringToAnsiString("  h)i66ccc6i!m  "),
	WideStringToAnsiString("   m-0qssq0-r   "),
	WideStringToAnsiString("    um---5hw    ")
};

array<uint> xpm_debug_arrow = {
	WideStringToAnsiString("15 15 6 1"),
	WideStringToAnsiString(" 	c None"),
	WideStringToAnsiString(".	c #A48B6F"),
	WideStringToAnsiString("+	c #C3A185"),
	WideStringToAnsiString("@	c #BDA88D"),
	WideStringToAnsiString("#	c #FFE5CF"),
	WideStringToAnsiString("$	c #784C2A"),
	WideStringToAnsiString("               "),
	WideStringToAnsiString("        .      "),
	WideStringToAnsiString("        $.     "),
	WideStringToAnsiString("        $$.    "),
	WideStringToAnsiString("        $#$.   "),
	WideStringToAnsiString("     $$$+##$.  "),
	WideStringToAnsiString("     $######$. "),
	WideStringToAnsiString("     $#######$."),
	WideStringToAnsiString("     $######$. "),
	WideStringToAnsiString("     $$$+##$.  "),
	WideStringToAnsiString("        $#$.   "),
	WideStringToAnsiString("        $$.    "),
	WideStringToAnsiString("        $.     "),
	WideStringToAnsiString("        .      "),
	WideStringToAnsiString("               ")
};

array<uint> xpm_bookmark = {
	WideStringToAnsiString("15 15 87 1"),
	WideStringToAnsiString(" 	c None"),
	WideStringToAnsiString(".	c #A9ABA8"),
	WideStringToAnsiString("+	c #2374F8"),
	WideStringToAnsiString("@	c #1163F6"),
	WideStringToAnsiString("#	c #0061F2"),
	WideStringToAnsiString("$	c #1259EC"),
	WideStringToAnsiString("%	c #0357E1"),
	WideStringToAnsiString("&	c #0056D9"),
	WideStringToAnsiString("*	c #0054D6"),
	WideStringToAnsiString("=	c #1851CE"),
	WideStringToAnsiString("-	c #1952C8"),
	WideStringToAnsiString(";	c #005DE7"),
	WideStringToAnsiString(">	c #759EEC"),
	WideStringToAnsiString(",	c #A2BAE6"),
	WideStringToAnsiString("'	c #92B9F5"),
	WideStringToAnsiString(")	c #9ABCF3"),
	WideStringToAnsiString("!	c #97B5F3"),
	WideStringToAnsiString("~	c #98B7F4"),
	WideStringToAnsiString("{	c #8EB3F6"),
	WideStringToAnsiString("]	c #85B0F8"),
	WideStringToAnsiString("^	c #7BADFB"),
	WideStringToAnsiString("/	c #78A7FC"),
	WideStringToAnsiString("(	c #4E88EC"),
	WideStringToAnsiString("_	c #265EF2"),
	WideStringToAnsiString(":	c #A0BDEE"),
	WideStringToAnsiString("<	c #8CADF7"),
	WideStringToAnsiString("[	c #86B1F9"),
	WideStringToAnsiString("}	c #8BACF6"),
	WideStringToAnsiString("|	c #6EA6FF"),
	WideStringToAnsiString("1	c #5E96F5"),
	WideStringToAnsiString("2	c #1447AF"),
	WideStringToAnsiString("3	c #1664F7"),
	WideStringToAnsiString("4	c #8AABF5"),
	WideStringToAnsiString("5	c #8CB0F3"),
	WideStringToAnsiString("6	c #82AAFA"),
	WideStringToAnsiString("7	c #77A6FB"),
	WideStringToAnsiString("8	c #75A2FD"),
	WideStringToAnsiString("9	c #679DFD"),
	WideStringToAnsiString("0	c #5990F6"),
	WideStringToAnsiString("a	c #1146A7"),
	WideStringToAnsiString("b	c #005EF7"),
	WideStringToAnsiString("c	c #84AFF7"),
	WideStringToAnsiString("d	c #7DAFFD"),
	WideStringToAnsiString("e	c #80A8F7"),
	WideStringToAnsiString("f	c #77A4FF"),
	WideStringToAnsiString("g	c #6DA5FE"),
	WideStringToAnsiString("h	c #669AFF"),
	WideStringToAnsiString("i	c #568BF8"),
	WideStringToAnsiString("j	c #0B45A5"),
	WideStringToAnsiString("k	c #8FB4F7"),
	WideStringToAnsiString("l	c #8EAFF9"),
	WideStringToAnsiString("m	c #83AEF6"),
	WideStringToAnsiString("n	c #79A8FD"),
	WideStringToAnsiString("o	c #6BA0FF"),
	WideStringToAnsiString("p	c #6297FE"),
	WideStringToAnsiString("q	c #4689FA"),
	WideStringToAnsiString("r	c #1C419C"),
	WideStringToAnsiString("s	c #84ABFB"),
	WideStringToAnsiString("t	c #689EFF"),
	WideStringToAnsiString("u	c #5595FF"),
	WideStringToAnsiString("v	c #18409A"),
	WideStringToAnsiString("w	c #165AED"),
	WideStringToAnsiString("x	c #8FB7F3"),
	WideStringToAnsiString("y	c #5E91FF"),
	WideStringToAnsiString("z	c #4287F8"),
	WideStringToAnsiString("A	c #163F93"),
	WideStringToAnsiString("B	c #5293FF"),
	WideStringToAnsiString("C	c #4D83F6"),
	WideStringToAnsiString("D	c #0C3C8F"),
	WideStringToAnsiString("E	c #005AE2"),
	WideStringToAnsiString("F	c #4F8FFF"),
	WideStringToAnsiString("G	c #2168ED"),
	WideStringToAnsiString("H	c #5B87EE"),
	WideStringToAnsiString("I	c #6B96F8"),
	WideStringToAnsiString("J	c #588FF4"),
	WideStringToAnsiString("K	c #2475F2"),
	WideStringToAnsiString("L	c #084EB5"),
	WideStringToAnsiString("M	c #0161EC"),
	WideStringToAnsiString("N	c #1350C5"),
	WideStringToAnsiString("O	c #0047B4"),
	WideStringToAnsiString("P	c #0A44AB"),
	WideStringToAnsiString("Q	c #0042A2"),
	WideStringToAnsiString("R	c #113C9D"),
	WideStringToAnsiString("S	c #004098"),
	WideStringToAnsiString("T	c #093A94"),
	WideStringToAnsiString("U	c #023992"),
	WideStringToAnsiString("V	c #1F4BB4"),
	WideStringToAnsiString(" +@#$%%%&&*=-; "),
	WideStringToAnsiString("+>,')!!~{{]^/(&"),
	WideStringToAnsiString("_:<[[{{{}}^/|12"),
	WideStringToAnsiString("3[[4<55]667890a"),
	WideStringToAnsiString("b'cd]66effg9hij"),
	WideStringToAnsiString("_kl<mnn|oo9hpqr"),
	WideStringToAnsiString("b~s6/88otthpuqv"),
	WideStringToAnsiString("b~^7|88otthpuqv"),
	WideStringToAnsiString("wx|oo99hhhpuyzA"),
	WideStringToAnsiString("%{ooohhpuuuByCD"),
	WideStringToAnsiString("wx|oo99hhhpuyzA"),
	WideStringToAnsiString("%{ooohhpuuuByCD"),
	WideStringToAnsiString("E}99hppuyyyFFCD"),
	WideStringToAnsiString("GHIJiiiqzzCCCKL"),
	WideStringToAnsiString(" MNOPjjQRRSTUV ")
 };


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
	SCI_SETMARGINBACKN = 2250,
	SCI_GETMARGINBACKN = 2251,
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