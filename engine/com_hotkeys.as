/* com_hotkeys.as
    Работа с коллекцией хоткеев из скриптов.
*/
// Данные строки нужны только для среды разработки и вырезаются препроцессором
#pragma once
#include "../../all.h"

// Хоткей
class IHotKey {
    protected uint hotKey = 0, id = 0;
    string _addin;
    string _macros;
    //[propget, helpstring("Строковое представление хоткея")]
    string get_presentation()
    {
        return hotKeyPresentation(hotKey);
    }
    uint get_key()
    {
        return hotKey;
    }
    //[propput, helpstring("Код клавиши")]
    void set_key(uint newVal)
    {
        if (id > 0) {
            removeHotKey(id);
            id = 0;
        }
        hotKey = newVal;
        if (newVal > 0)
            id = addHotKey(hotKey, HotKeyHandler(this.handler));
    }
    //[helpstring("Задать команду хоткея")]
    void setCommand(const string& newAddin, const string& Macros)
    {
        _addin = newAddin;
        _macros = Macros;
    }
    uint _setTempHotKey(uint key)
    {
        hotKey = key;
        id = addTempHotKey(key, HotKeyHandler(this.handler));
        return id;
    }
    protected bool handler()
    {
        Addin&& addin = oneAddinMgr.byUniqueName(_addin);
        if (addin is null) {
            Message("Аддин " + _addin + " не найден");
            return false;
        }
        Variant res = addin.invokeMacros(_macros);
        if (res.vt == VT_BOOL && res.word == VARIANT_FALSE)
            return false;
        return true;
    }
};

// Коллекция хоткеев
class IHotKeys{
    protected array<IHotKey&&> hotkeys;
    //[propget, helpstring("Получить хоткей")]
    IHotKey&& item(uint Idx)
    {
        if (Idx < hotkeys.length)
            return hotkeys[Idx];
        return null;
    }
    //[propget, helpstring("Количество хоткеев")]
    uint get_count()
    {
        return hotkeys.length;
    }
    //[helpstring("Удалить хоткей")]
    void remove(uint Idx)
    {
        if (Idx < hotkeys.length) {
            hotkeys[Idx].set_key(0);
            hotkeys.removeAt(Idx);
        }
    }
    //[helpstring("Добавить хоткей")]
    IHotKey&& add(uint Key, const string& addinName, const string& Macros)
    {
        IHotKey hk;
        hk.setCommand(addinName, Macros);
        hk.set_key(Key);
        hotkeys.insertLast(hk);
        return hk;
    }
    //[helpstring("Очистить все хоткеи")]
    void clearAll()
    {
        hotkeys.resize(0);
        clearAllHotKeys();
    }
    // Добавить временный хоткей
    uint addTemp(uint Key, const string& addinName, const string& Macros)
    {
        IHotKey hk;
        hk.setCommand(addinName, Macros);
        return hk._setTempHotKey(Key);
    }
    // Удалить временный хоткей
    void removeTemp(uint hkID)
    {
        removeHotKey(hkID);
    }
    uint addTempFunction(uint Key, IDispatch&& disp, const string& name = "")
    {
        TempHotKeyFunction thk;
        return thk.assignKey(Key, disp, name);
    }
	string hotKeyToString(uint code)
	{
		return hotKeyPresentation(code);
	}
};

class TempHotKeyFunction {
    IDispatch&& pDisp;
    string name;
    uint assignKey(uint Key, IDispatch&& disp, const string& n)
    {
        &&pDisp = disp;
        name = n;
        return addTempHotKey(Key, HotKeyHandler(this.handler));
    }
    bool handler()
    {
        int dispid;
        if (name.isEmpty())
            dispid = 0;
        else if (!pDisp.findMember(name, dispid))
            return false;
        Variant res;
        if (pDisp.call(dispid, array<Variant>(), res)) {
            Value val;
            var2val(res, val);
            bool ret = false;
            if (val.getBoolean(ret) && ret)
                return true;
        }
        return false;
    }
};
