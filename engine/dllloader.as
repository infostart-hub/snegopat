/* dllloader.as
Загрузчик аддинов-длл
*/
#pragma once
#include "../../all.h"

funcdef uint GetAddinInfo(uint&, uint&);
funcdef void InitAddin(IDispatch&&);
funcdef uint GetMacroses();
funcdef void InvokeMacros(uint, Variant&);
funcdef void GetObject(IUnknown&&&);

// Аддин - длл
class AddinDll : Addin {
    protected uint module;
	protected GetMacroses&& getMacroses;
	protected InvokeMacros&& invMacros;
	protected GetObject&& getObject;
    AddinDll(uint m, const string& u, const string& d, const string& f, AddinLoader&& l) {
		&&__loader = l;
		module = m;
        uName = u;
        dName = d;
        fPath = "dll:" + f;
		uint ptr = GetProcAddress(module, "getMacroses".toUtf8().ptr);
		if (ptr != 0)
			initFuncDefFromAddress(ptr, 0, &&getMacroses);
		ptr = GetProcAddress(module, "invokeMacros".toUtf8().ptr);
		if (ptr != 0)
			initFuncDefFromAddress(ptr, 0, &&invMacros);
		ptr = GetProcAddress(module, "getObject".toUtf8().ptr);
		if (ptr != 0)
			initFuncDefFromAddress(ptr, 0, &&getObject);
	}
	bool init() {
		uint ptr = GetProcAddress(module, "initAddin".toUtf8().ptr);
		if (ptr != 0) {
			InitAddin&& ia;
			initFuncDefFromAddress(ptr, 0, &&ia);
			ia(oneDesigner._me());
		}
		return true;
	}
    // получить массив имен макросов
    array<string>&& macroses() {
		if (getMacroses !is null) {
			uint res = getMacroses();
			if (res > 0) {
				string m = stringFromAddress(res);
				SysFreeString(res);
				return m.split("\n");
			}
		}
		return null;
    }
    // выполнить макрос
    Variant invokeMacros(const string& macros) {
        Variant result;
		if (invMacros !is null)
			invMacros(macros.cstr, result);
        return result;
    }
    // получить Dispatch объект
    IUnknown&& object() {
		IUnknown&& unk;
		if (getObject !is null)
			getObject(unk);
        return unk;
    }
};

// Загрузчик скриптов
class DllLoader : AddinLoader {
    DllLoader() {
		super();
    }
    string proto()                  { return "dll"; }
    bool canUnload(Addin&& addin)   { return false; }
    Addin&& load(const string& uri) {
        string fullPath = findFullPath(uri);
        if (fullPath.isEmpty()) {
            oneAddinMgr._lastAddinError = "Не удалось найти файл " + uri;
            return null;
        }
		uint module = LoadLibraryEx(fullPath.cstr, 0, LOAD_WITH_ALTERED_SEARCH_PATH);
		if (module == 0) {
			oneAddinMgr._lastAddinError = "Не удалось загрузить файл " + fullPath;
			return null;
		}
		string un, dn;
		uint ptr = GetProcAddress(module, "addinInfo".toUtf8().ptr);
		if (ptr != 0) {
			GetAddinInfo&& getAddinInfo;
			initFuncDefFromAddress(ptr, 0, &&getAddinInfo);
			uint bun = 0, bdn = 0;
			getAddinInfo(bun, bdn);
			if (bun != 0) {
				un = stringFromAddress(bun);
				SysFreeString(bun);
			}
			if (bdn != 0) {
				dn = stringFromAddress(bdn);
				SysFreeString(bdn);
			}
		}
		if (un.isEmpty())
			un = fullPath.extract(extractFileNameRex);
		if (dn.isEmpty())
			dn = un;
        return AddinDll(module, un, dn, fullPath, this);
    }
    bool run(Addin&& addin) {
		AddinDll&& ad = cast<AddinDll>(addin);
		return ad !is null && ad.init();
    }
    bool unload(Addin&& addin) {
        return false;
    }
    string nameOfLoadCommand() { return "Загрузить dll|dll"; }
    string selectLoadURI() {
        // Сделаем всё штатным 1Сным диалогом выбора файла
        IContext&& selModes = oneDesigner._createValue("ПеречислениеРежимДиалогаВыбораФайла");
        ValueParamsVector args(1);
        selModes.getPropVal(selModes.staticContextDef().findProp("Открытие"), args.values[0]);
        IContext&& selDlg = oneDesigner._createValue("ДиалогВыбораФайла", args);
        IContextDef&& def = selDlg.staticContextDef();
        selDlg.setPropVal(def.findProp("Заголовок"), Value("Выберите файл dll"));
        selDlg.setPropVal(def.findProp("ПредварительныйПросмотр"), Value(false));
        selDlg.setPropVal(def.findProp("Фильтр"), Value("Файлы dll (*.dll)|*.dll|Все файлы|*"));
        Value retVal;
        selDlg.callMeth(def.findMethod("Выбрать"), retVal, Vector());
        bool res = false;
        if (retVal.getBoolean(res) && res) {
            selDlg.getPropVal(def.findProp("ПолноеИмяФайла"), retVal);
            v8string path;
            retVal.getString(path);
            return "dll:" + path;
        }
        return string();
    }
};
DllLoader oneDllLoader;
