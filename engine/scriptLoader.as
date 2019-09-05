/* scriptLoader.as
Загрузчик скриптов
*/
#pragma once
#include "../../all.h"
Packet ScriptInit("ScriptInit", initScripts, piOnMainWindow);

bool initScripts() {
    //debugger();
    IWindow&& w = cast<IUnknown>(mainFrame);
    string nameOfInstance = getDefaultInfoBase().connectString();
    //dumpVtable(getDefaultInfoBase());
    //Print(nameOfInstance);
    initActiveScriptSubsystem(w.hwnd(), nameOfInstance);
    return true;
}

// Аддин - скрипт
class AddinScript : Addin, ScriptSite {
    protected ActiveScript script;
    protected SelfScript selfScript;
    private uint errorsCount = 0;
    AddinScript(const string& u, const string& d, const string& f) {
        uName = u;
        dName = d;
        fPath = "script:" + f;
        selfScript._fullPath = f;
    }
    void _connectSelf() {
        &&selfScript.__addin = this;
        // Подключим объект, возвращающий все объявленные в AngelScript значения перечислений
        script.addNamedItem("Enums", getEnumsDispatch(), true);
        // Подключим корень SnegAPI
        script.addNamedItem("Designer", oneDesigner._me(), true);
        // Подключим сам скрипт, для рефлексии
        script.addNamedItem("SelfScript", createDispatchFromAS(&&selfScript), false);
    }
    ActiveScript&& _script() { return script;  }
    // получить массив имен макросов
    array<string>&& macroses() {
        return script.extractMacroses();
    }
    // выполнить макрос
    Variant invokeMacros(const string& macros) {
        Variant result;
        script.invokeMacros(macros, result);
        return result;
    }
    // получить Dispatch объект
    IUnknown&& object() {
        return script.getObject();
    }
    bool onScriptError(const ScriptError& err) {
        errorsCount++;
        if (errorsCount > 5) {
            Message("Скрипт " + uName + " совершил пять ошибок и будет прерван", mInfo);
            script.abort();
            return false;
        }
        string msg = "Ошибка выполнения скрипта" +
            "\nСкрипт: " + uName +
            "\nФайл: " + fPath +
            "\nСтрока: " + err.line +
            "\nКолонка: " + err.col +
            "\nИсточник: " + err.source +
            "\nИсходный код: " + err.sourceCode +
            "\nОшибка: " + err.description;
        uint type = mbOK;
        if (err.bDebugPossible) {
            type = mbYesNo | mbIconError;
            msg += "\nЗапустить отладчик скриптов?";
        }
        return MsgBox(msg, type) == mbaYes;
    }
    void _unload() {
        &&selfScript.__addin = null;
        script.stop();
        uName.empty();
    }
};

class SelfScript {
    AddinScript&& __addin;
    string get_uniqueName()     { return __addin is null ? string() : __addin.uniqueName; }
    string get_displayName()    { return __addin is null ? string() : __addin.displayName; }
    string _fullPath;
    IUnknown&& get_self()       { return __addin is null ? null : __addin.object(); }
    void addNamedItem(const string& name, IDispatch&& unk, bool global = false) {
        if (__addin !is null)
            __addin._script().addNamedItem(name, unk, global);
    }
};

// Загрузчик скриптов
class ScriptLoader : AddinLoader {
    NoCaseMap<string> mapEngineNames;
    ScriptLoader() {
        super();
        mapEngineNames.insert("js", "JScript");
        mapEngineNames.insert("vbs", "VBScript");
    }
    string proto()                  { return "script"; }
    bool canUnload(Addin&& addin)   { return true; }
    Addin&& load(const string& uri) {
        string fullPath = findFullPath(uri);

        if (fullPath.isEmpty()) {
            oneAddinMgr._lastAddinError = "Не удалось найти файл " + uri;
            return null;
        }
        v8string textOfFile;
        readTextFile(textOfFile, fullPath);
        string source = textOfFile;
        if (source.isEmpty()) {
            oneAddinMgr._lastAddinError = "Не удалось получить текст файла " + fullPath;
            return null;
        }
        array<array<string>&&> tags;
        uint firstLine = 0;
        extractTags(tags, source, firstLine);
        // Теперь надо получить уникальное имя и т.п.
        string uName = fullPath.extract(extractFileNameRex), dName, engine;
        array<array<any>&&> connectedAddins;
        bool noDebug = false;

        for (uint it = 0; it < tags.length; it++) {
            string tag = tags[it][0], val = tags[it][1];

            if (tag == "engine")
                engine = val;
            else if (tag == "uname")
                uName = val;
            else if (tag == "dname")
                dName = val;
            else if (tag == "nodebug" || (tag == "debug" && val == "no"))
                noDebug = true;
            else if (tag == "addin") {
                array<string>&& tail = val.split(whiteSpaceRex);
                if (tail.length > 0) {
                    Addin&& a = oneAddinMgr.byUniqueName(tail[0]);
                    if (a !is null) {
                        IUnknown&& obj = a.object();
                        if (obj !is null) {
                            connectedAddins.insertLast(array<any> = {
                                any(&&obj),
                                any(tail.length > 1 ? tail[1] : tail[0]),
                                any(tail.length > 2 ? (tail[2] == "global") : false)
                            });
                        } else {
                            oneAddinMgr._lastAddinError = "Аддин " + tail[0] + " не содержит объекта";
                            return null;
                        }
                    } else {
                        oneAddinMgr._lastAddinError = "Аддин " + tail[0] + " не найден";
                        return null;
                    }
                }
            }
        }
        if (engine.isEmpty()) {
            string fileExt = fullPath.match(extractFileExtRex).text(0, 0);
            auto fnd = mapEngineNames.find(fileExt);
            if (fnd.isEnd()) {
                engine = getEngineNameByFileExt(fileExt);
                if (!engine.isEmpty())
                    mapEngineNames.insert(fileExt, engine);
            } else
                engine = fnd.value;
            if (engine.isEmpty()) {
                oneAddinMgr._lastAddinError = "Не удалось получить имя скриптового движка для скрипта " + fullPath;
                return null;
            }
        }
        if (dName.isEmpty())
            dName = uName;
        AddinScript ads(uName, dName, fullPath);
        &&ads.__loader = this;
        ActiveScript&& script = ads._script();
        //noDebug = false;
        if (engine == "JScript" && firstLine > 0) {
            source.replace("(this && this.__extends) ||", "");
            source.insert(0, "var exports=SelfScript.self;var require=function(s){return builtin_require(s);};\n");
            firstLine--;
        }
        if (script.prepare(engine, source, firstLine, noDebug ? "" : uName, ads) != 0)
            return null;
        ads._connectSelf();
        // Подключим аддины, которые скрипт просил
        for (uint k = 0, km = connectedAddins.length; k < km; k++) {
            array<any>&& a = connectedAddins[k];
            IUnknown&& obj;
            string name;
            bool global;
            a[0].retrieve(&&obj);
            a[1].retrieve(name);
            a[2].retrieve(global);
            script.addNamedItem(name, obj, global);
        }
        return ads;
    }
    bool run(Addin&& addin) {
        uint res = cast<AddinScript>(addin)._script().run();
        if (res > 0) {
            Message("не удалось запустить скрипт " + addin.uniqueName);
            oneAddinMgr._lastAddinError = "Не удалось запустить скрипт " + addin.uniqueName + " из " + addin.fullPath;
            return false;
        }
        return true;
    }
    bool unload(Addin&& addin) {
        cast<AddinScript>(addin)._unload();
        if (!unloadIdleHandlerSet) {
            idleHandlers.insertLast(unloadDelayedScripts);
            unloadIdleHandlerSet = true;
        }
        return true;
    }
    string nameOfLoadCommand() { return "Загрузить скрипт|script"; }
    string selectLoadURI() {
        // Сделаем всё штатным 1Сным диалогом выбора файла
        IContext&& selModes = oneDesigner._createValue("ПеречислениеРежимДиалогаВыбораФайла");
        ValueParamsVector args(1);
        selModes.getPropVal(selModes.staticContextDef().findProp("Открытие"), args.values[0]);
        IContext&& selDlg = oneDesigner._createValue("ДиалогВыбораФайла", args);
        IContextDef&& def = selDlg.staticContextDef();
        selDlg.setPropVal(def.findProp("Заголовок"), Value("Выберите файл скрипта"));
        selDlg.setPropVal(def.findProp("ПредварительныйПросмотр"), Value(false));
        selDlg.setPropVal(def.findProp("Фильтр"), Value("Файлы скриптов (*.js;*.vbs)|*.js;*.vbs|Все файлы|*"));
        Value retVal;
        selDlg.callMeth(def.findMethod("Выбрать"), retVal, Vector());
        bool res = false;
        if (retVal.getBoolean(res) && res) {
            selDlg.getPropVal(def.findProp("ПолноеИмяФайла"), retVal);
            v8string path;
            retVal.getString(path);
            return "script:" + path;
        }
        return string();
    }
};
ScriptLoader oneScriptLoader;
bool unloadIdleHandlerSet = false;

void extractTags(array<array<string>&&>& tags, string& sources, uint& firstLineIdx) {
    uint startPos = 0;
    if (sources.length > 13 && sources.substr(0, 14) == "\"use strict\";\n")
        startPos = 14;
    for (;;) {
        auto match = scriptTagsRex.match(sources, 1, startPos);
        if (match.matches == 0 || match.begin(0, 0) != startPos)
            break;
        firstLineIdx++;
        string key = match.text(0, 1);
        if (key.isEmpty())
            key = match.text(0, 2);
        tags.insertLast(array<string> = { key, match.text(0, 3) });
        startPos += match.len(0, 0);
    }
    if (startPos > 0)
        sources.remove(0, startPos);
}
