/*  Snegopat Engine main file
   Основная точка входа. Вызывается в момент, когда snegopat.dll средствами WinAPI
   отловил создание окна заставки 1С, но она еще не показана. Все 1С-ные дллки загружены.
   однако часть функций вызывать еще небезопасно, так как часть инициализации 1С происходит
   после создания основного окна. Поэтому сейчас надо инициализировать то, что нужно и можно
   до создания основного окна, и отлавливать его создание, дабы запустить всё остальное
*/
#pragma once
#include "../../all.h"

string sv8ver;

void main() {
    sv8ver = "" + (int(v8ver >> 48) & 0xFFFF) + "." + (int(v8ver >> 32) & 0xFFFF) + "." +
        (int(v8ver >> 16) & 0xFFFF) + "." + (int(v8ver >> 0) & 0xFFFF);
#if test = 1
    dumpVtable(currentProcess());
#endif
    initSymbolClassTable();
    initPathes();
    initSnegopatProfile();
    initWorkWithMainFrame();
}


// Заполняем таблицу, в которой указан класс символа. Таблица используется в snegopat.dll, но
// для заполнения используются функции V*.
void initSymbolClassTable()
{
    for (uint k = 0; k <= 32; k++)
        mem::byte[symbolClassTable + k] = symbSpace;
    for (uint k = 33; k < 0x10000; k++) {
        if (is_space(k))
            mem::byte[symbolClassTable + k] = symbSpace;
        else if (is_alpha(k))
            mem::byte[symbolClassTable + k] = symbAlpha;
    }
}

TrapVirtualStdCall trProfileOpen;
// Подключение к дереву настроек файла snegopat.pfl
// Для обеспечения портабельности файл лежит в каталоге снегопата, поэтому
// этот каталог должен быть доступен для записи.
void initSnegopatProfile()
{
	trProfileOpen.setTrap(getProfileService(), IProfileService_open, IProfileService_openTrap);
}

void IProfileService_openTrap(IProfileService& ps) {
	trProfileOpen.swap();
	IProfileSource&& snegopatProfileSource;
	currentProcess().createByClsid(CLSID_FileProfileSrc, IID_IProfileSource, snegopatProfileSource);
#if test = 1
	dumpVtable(&&snegopatProfileSource);
	dumpVtable(getProfileService());
	dumpVtable(getProfileRoot());
#endif
	CreateDirectory(pathes._data.cstr, 0);
	snegopatProfileSource.init("file://" + pathes._data + "snegopat.pfl");
	getProfileService().attachSource(snegopatProfileSource, gpflSnegopat);
	ps.open();
	initAllOption();
	// Инициализируем пакеты
	initPackets(piOnMainEnter);
}

Packet pktTxtWork("TxtWork", setTextHooks, piOnMainEnter);
bool enableTextWork;
OptionsEntry oeEnableTextWork("EnableTextWork", function(v){v = true; },
	function(v){v.getBoolean(enableTextWork); },
	function(v){v.getBoolean(enableTextWork); setTextHooks(); if (enableTextWork) Message("Подсказка снегопата заработает только во вновь открытых окнах"); return false; });

// Установка различных перехватов, связанных с текстовыми окнами/документами
bool setTextHooks()
{
	if (!enableTextWork) {
		disableAllTextTraps();
		textDocStorage.disableTextWork();
		return true;
	}
    // Надо установить перехват на создании окон Text control и text view.
    // Объект TextCtrl можно создать прямо сейчас и установить перехват в его виртуальной таблице
	if (trTxtEdtCtrl_createWnd.state == trapNotActive) {
		IWindowView&& wnd;
		currentProcess().createByClsid(CLSID_TxtEdtCtrl, IID_IWindowView, wnd);
		if (wnd is null)
			Print("Не удалось создать TxtEdtCtrl IWindowView");
		else {
			trTxtEdtCtrl_createWnd.setTrap(&&wnd, IWindowView_createWindow, TxtEdtCtrl_createWindow);
			ICommandTarget&& tgt = wnd.unk;
			if (tgt is null)
				Print("Не удалось получить ICommandTarget из TxtEdtCtrl IWindowView");
			else // Ставим перехват на получение окном текстового контрола команды
				trTxtCtrCommand_onExecute.setTrap(&&tgt, ICommandTarget_onExecute, TxtCtrCommand_onExecute);
		}
		// Теперь установим перехват на назначение текстового расширения текстовому документу
		IDocument&& doc;
		currentProcess().createByClsid(CLSID_TxtEdtDoc, IID_IDocument, doc);
		if (doc is null)
			Print("Не удалось создать TxtEdtDoc IDocument");
		else {
			ITextManager_Operations&& to = doc.unk;
			if (to is null)
				Print("Не удалось получить ITextManager_Operations из TxtEdtDoc");
			else
				trTxtMgr_setExtender.setTrap(&&to, ITextManager_Operations_setExtenderCLSID, TxtMgrOper_setExtender);
			// Далее устанавливаем перехват на TxtEdtDoc::createView
			// он нужен только один раз, чтобы получить готовый объект TxtEdtView, т.к. создать его сейчас
			// самостоятельно ещё рано, программа вылетит.
			trTxtEdtDoc_createView.setTrap(&&doc, IDocument_createView, TxtDoc_createView);
		}
	} else if (trTxtEdtCtrl_createWnd.state == trapDisabled) {
		trTxtEdtCtrl_createWnd.swap();
		trTxtCtrCommand_onExecute.swap();
		trTxtMgr_setExtender.swap();
		if (trTxtEdtView_createWnd.state == trapDisabled)
			trTxtEdtView_createWnd.swap();
		else if (trTxtEdtView_createWnd.state == trapNotActive && trTxtEdtDoc_createView.state == trapDisabled)
			trTxtEdtDoc_createView.swap();
	}
	textDocStorage.enableTextWork();
	return true;
}

uint TxtDoc_createView(IDocument& doc, uint pView)
{
    trTxtEdtDoc_createView.swap();
    IUnknown&& unk;
    doc.createView(unk);
    IWindowView&& wnd = unk;

    if (wnd is null)
        Print("Не удалось создать TxtEdtView IWindowView");
    else {
        trTxtEdtView_createWnd.setTrap(&&wnd, IWindowView_createWindow, TxtEdtView_createWindow);
        ICommandTarget&& tgt = wnd.unk;
        if (tgt is null)
            Print("Не удалось получить ICommandTarget из TxtEdtWnd IWindowView");
        else // Ставим перехват на получение окном текстового контрола команды
            trTxtEdtCommand_onExecute.setTrap(&&tgt, ICommandTarget_onExecute, TxtEdtCommand_onExecute);
    }
    if (unk !is null)
        unk.AddRef();
    mem::dword[pView] = mem::addressOf(unk);
    return pView;
}

TrapVirtualStdCall trTxtEdtDoc_createView;
TrapVirtualStdCall trTxtEdtView_createWnd;
TrapVirtualStdCall trTxtEdtCtrl_createWnd;
TrapVirtualStdCall trTxtEdtCommand_onExecute;
TrapVirtualStdCall trTxtCtrCommand_onExecute;
TrapVirtualStdCall trTxtMgr_setExtender;

void disableAllTextTraps() {
	if (trTxtEdtDoc_createView.state == trapEnabled)
		trTxtEdtDoc_createView.swap();
	if (trTxtEdtView_createWnd.state == trapEnabled)
		trTxtEdtView_createWnd.swap();
	if (trTxtEdtCtrl_createWnd.state == trapEnabled)
		trTxtEdtCtrl_createWnd.swap();
	if (trTxtEdtCommand_onExecute.state == trapEnabled)
		trTxtEdtCommand_onExecute.swap();
	if (trTxtCtrCommand_onExecute.state == trapEnabled)
		trTxtCtrCommand_onExecute.swap();
	if (trTxtMgr_setExtender.state == trapEnabled)
		trTxtMgr_setExtender.swap();
}


funcdef bool WV_CreateWindow(IWindowView&, HWND parentWindow);
bool TxtEdtCtrl_createWindow(IWindowView& view, HWND parentWindow)
{
#if test = 1
    dumpVtable(&&view, "_TxtEdtCtrl_createWindow");
#endif
    WV_CreateWindow&& orig;
    trTxtEdtCtrl_createWnd.getOriginal(&&orig);
    bool res = orig(view, parentWindow);
    onCreateTextWnd(view, true);
    return res;
}

bool TxtEdtView_createWindow(IWindowView& view, HWND parentWindow)
{
#if test = 1
    dumpVtable(&&view, "_TxtEdtView_createWindow");
#endif
    WV_CreateWindow&& orig;
    trTxtEdtView_createWnd.getOriginal(&&orig);
    bool res = orig(view, parentWindow);
    onCreateTextWnd(view, false);
    return res;
}

bool TxtEdtCommand_onExecute(ICommandTarget& tgt, const Command& command)
{
#if test = 1
    dumpVtable(&&tgt, "_TxtEdtCommand_onExecute");
#endif
    return checkCommandAndHideSmartBox(tgt, command, trTxtEdtCommand_onExecute);
}

bool TxtCtrCommand_onExecute(ICommandTarget& tgt, const Command& command)
{
#if test = 1
    dumpVtable(&&tgt, "_TxtCtrCommand_onExecute");
#endif
    return checkCommandAndHideSmartBox(tgt, command, trTxtCtrCommand_onExecute);
}

int TxtMgrOper_setExtender(ITextManager_Operations& to, const Guid& clsid)
{
#if test = 1
    dumpVtable(&&to, "_TxtMgrOper_setExtender");
#endif
    trTxtMgr_setExtender.swap();
    int res = to.setExtenderCLSID(clsid);
    trTxtMgr_setExtender.swap();
    ITextManager&& itm = to.unk;
    changeTextExtender(itm, clsid);
    return res;
}
