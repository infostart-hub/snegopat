/*  mlist.as
    Отображение списка методов модуля
*/
#pragma once
#include "../../all.h"

funcdef int_ptr DlgProc(HWND, UINT, WPARAM, LPARAM);
enum MethDialogConsts{
	editFontDelta = 8,
	ctrlDelta = 2,
	editID = 100,
	boxID = 101,
};

class MethodsDialog: SmartBoxSite {
	int_ptr dlgTemplate;
	int_ptr dlgFunc = 0;
	DlgProc&& dp;
	Rect lastPos;
	Point minSize;
	Point maxSize;

	HWND hMainWnd;
	HWND edit;
	ASWnd&& hEdit;
	SmartBoxWindow smartBox;
	array<SmartBoxItem&&>&& items;
	array<SmartBoxItem&&>&& fItems;
	uint editHeight;
	int currentLine;

	MethodsDialog() {
		&&dp = DlgProc(this.mainDialogProc);
		dlgFunc = ThunkToFunc(&&dp);
		array<uint8> dt = {
			0x80, 0x00, 0xCC, 0x86, 0x00, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x01,
			0x2C, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
		};
		dlgTemplate = malloc(dt.length);
		for (uint i = 0; i < dt.length; i++)
			mem::byte[dlgTemplate + i] = dt[i];
	}
	int show(ModuleElements&& elements, int _currentLine) {
		if (elements !is null) {
			currentLine = _currentLine;
			&&currentModule = elements;
			elements.parse();
			IWindow&& w = mainFrame.unk;
			return DialogBoxIndirectParam(GetModuleHandle(0), dlgTemplate, w.hwnd(), dlgFunc, 0);
		}
		return 0;
	}
	array<SmartBoxItem&&>&& filter() {
		uint l = GetWindowTextLength(edit);
		if (l == 0) {
			&&fItems = items;
		} else {
			&&fItems = array<SmartBoxItem&&>();
			string pattern;
			GetWindowText(edit, pattern.setLength(l), l + 1);
			StringComparator cmp;
			if (pattern.find(' ') >= 0)
				cmp.setPattern(pattern, cmContain);
			else
				cmp.setPattern(pattern, cmBeginWithOtherLangs);
			string patternUpper = pattern.makeUpper();

			for (uint i = 0; i < items.length; i++) {
				SmartBoxItem&& item = items[i];
				if (cmp.match(item.d.key) || compareUcaseLetters(item.d.descr, patternUpper))
					fItems.insertLast(item);
			}
		}
		return fItems;
	}

	void onDoSelect(SmartBoxItemBaseIface&& selItem) {
		ModuleMethodItem&& item = cast<ModuleMethodItem>(selItem);
		endDialog(item.info.line);
	}
	bool onKeydown(uint wParam, uint lParam)	{ return false; }
	bool onKillFocus(uint newWnd)				{ return false; }
	void onChar(uint wParam, uint lParam)		{}

	int_ptr mainDialogProc(HWND hWnd, UINT msg, WPARAM wParam, LPARAM lParam) {
		switch (msg) {
		case WM_INITDIALOG:
			hMainWnd = hWnd;
			initDialog();
			return 1;
		case WM_CLOSE:
			endDialog(0);
			return 1;
		case WM_SIZE:
			onSize();
			return 0;
		case WM_SIZING:
			onSizing(DWORD(wParam), toRect(lParam).ref);
			return 0;
		case WM_DESTROY:
			clear();
			return 0;
		case WM_GETMINMAXINFO:
			onMinMaxInfo(toMINMAXINFO(lParam).ref);
			return 1;
		case WM_COMMAND:
			onCommand(wParam, lParam);
			return 1;
		case WM_MOVE:
			onMove();
			return 0;
		default:
			return 0;
		}
		return 0;
	}
	
	uint EditProc(uint msg, uint w, uint l) {
		if (msg == WM_KEYDOWN) {
			if (w == VK_UP || w == VK_DOWN) {
				smartBox.navigate(w == VK_UP ? navPrev : navNext);
				return 1;
			}
		}
		return hEdit.doDefault();
	}

	private void initDialog() {
		if (minSize.x == 0)
			initSizes();
		SetWindowText(hMainWnd, "Методы модуля".cstr);
		createControls();
		SetWindowPos(hMainWnd, HWND(HWND_TOPMOST), lastPos.left, lastPos.top, lastPos.right - lastPos.left, lastPos.bottom - lastPos.top, SWP_SHOWWINDOW);
		onSize();
	}

	private void initSizes() {
		screenGeometry(hMainWnd, lastPos);
		int cxScreen = lastPos.right - lastPos.left;
		int cyScreen = lastPos.bottom - lastPos.top;
		minSize.x = cxScreen / 5;
		minSize.y = cyScreen / 6;
		maxSize.x = cxScreen / 5 * 4;
		maxSize.y = cyScreen / 5 * 4;

		lastPos.left += cxScreen * 3 / 8;
		lastPos.right = lastPos.left + cxScreen / 4;

		lastPos.top += cyScreen / 6;
		lastPos.bottom = lastPos.top + cyScreen * 2 / 3;
	}
	private void createControls() {
		HFONT hFont = GetStockObject(DEFAULT_GUI_FONT);
		LOGFONT lf;
		GetObjectW(hFont, uint(LOGFONT_size), lf.self);
		lf.lfHeight *= 10;
		Size sz;
		getLogFontSizes(lf, sz);
		editHeight = sz.cy + editFontDelta;
		edit = CreateWindowEx(WS_EX_CLIENTEDGE, "Edit".cstr, 0, WS_CHILD | WS_VISIBLE | WS_CLIPCHILDREN | WS_CLIPSIBLINGS | ES_NOHIDESEL
			| ES_AUTOHSCROLL | WS_TABSTOP, 0, 0, lastPos.right - lastPos.left, editHeight, hMainWnd, editID, 0, 0);
		SendMessage(edit, WM_SETFONT, hFont, 0);
		&&hEdit = attachWndToFunction(edit, WndFunc(this.EditProc), array<uint> = {WM_KEYDOWN});

		smartBox.createWindow(this, WS_VISIBLE | WS_CHILD | WS_CLIPCHILDREN | WS_CLIPSIBLINGS | WS_TABSTOP, WS_EX_CLIENTEDGE, hMainWnd, boxID);
		// Теперь надо узнать размер клиентской части окна и сделать так, чтобы в него помещалось целое
		// количество элементов списка
		Rect clientRect(0, 0, 100, 100);
		AdjustWindowRectEx(clientRect, GetWindowLong(hMainWnd, GWL_STYLE), 0, GetWindowLong(hMainWnd, GWL_EXSTYLE));
		int innerHeight = (lastPos.bottom - lastPos.top) - (clientRect.bottom - clientRect.top - 100);
		innerHeight -= editHeight + ctrlDelta + (smartBox.fullHeight(1) - smartBox.rowHeight);
		int d = innerHeight % smartBox.rowHeight;
		lastPos.bottom -= d;

		int curentIdx = prepareItems();
		smartBox.setItems(filter());
		smartBox.setCurrentIdx(curentIdx);
	}

	private int prepareItems() {
		&&items = array<SmartBoxItem&&>();
		array<int> idxs = {elProcEx, elFuncEx, elProc, elFunc};
		int maxLine = 0;
		ModuleMethodItem&& currentMethod;
		for (uint k = 0; k < idxs.length; k++) {
			array<SmartBoxItem&&>&& els = currentModule.smartItems[idxs[k]];
			for (uint i = 0; i < els.length; i++) {
				ModuleMethodItem&& item = cast<ModuleMethodItem>(els[i]);
				if (item !is null) {
					items.insertLast(item);
					int line = item.info.line;
					if (line <= currentLine && line > maxLine) {
						maxLine = line;
						&&currentMethod = item;
					}
				}
			}
		}
		sortItemsArray(items, true);
		for (uint i = 0; i < items.length; i++) {
			if (items[i] is currentMethod)
				return i;
		}
		return -1;
	}

	private void onSize() {
		Rect rc;
		GetClientRect(hMainWnd, rc);
		MoveWindow(edit, 0, 0, rc.right, editHeight, 1);
		int t = editHeight + ctrlDelta;
		MoveWindow(smartBox.hwnd, 0, t, rc.right, rc.bottom - t, 1);
	}
	private void onSizing(DWORD side, Rect& pRect) {
		if (WMSZ_LEFT == side || WMSZ_RIGHT == side)
			return;

		Rect clientRect(0, 0, 100, 100);
		AdjustWindowRectEx(clientRect, GetWindowLong(hMainWnd, GWL_STYLE), 0, GetWindowLong(hMainWnd, GWL_EXSTYLE));
		int innerHeight = (pRect.bottom - pRect.top) - (clientRect.bottom - clientRect.top - 100);
		innerHeight -= editHeight + ctrlDelta + (smartBox.fullHeight(1) - smartBox.rowHeight);
		int d = innerHeight % smartBox.rowHeight;
		if (d > 0) {
			if (side >= WMSZ_BOTTOM)
				pRect.bottom -= d;
			else
				pRect.top += d;
		}
	}

	private void onMinMaxInfo(MINMAXINFO& mmi) {
		mmi.ptMaxTrackSize.x = maxSize.x;
		mmi.ptMaxTrackSize.y = maxSize.y;
		mmi.ptMinTrackSize.x = minSize.x;
		mmi.ptMinTrackSize.y = minSize.y;
	}

	private void onMove() {
		smartBox.onParentPosChange();
	}

	private void onCommand(WPARAM w, LPARAM l) {
		if (w & 0xFFFF == mbaCancel) {
			endDialog(0);
		} else if (w & 0xFFFF == mbaOK) {
			if (smartBox.currentIdx < fItems.length) {
				ModuleMethodItem&& item = cast<ModuleMethodItem>(fItems[smartBox.currentIdx]);
				endDialog(item.info.line);
			}
		} else if (edit == l) {
			if (EN_CHANGE == (w >> 16))
				onChangeEdit();
		}
	}
	private void onChangeEdit() {
		smartBox.setItems(filter());
		smartBox.setCurrentIdx(0);
	}

	private void endDialog(int res) {
		GetWindowRect(hMainWnd, lastPos);
		EndDialog(hMainWnd, int_ptr(res));
	}

	private void clear() {
		hMainWnd = 0;
		&&hEdit = null;
		&&items = null;
		&&fItems = null;
	}
};
MethodsDialog&& methodsDialog;
