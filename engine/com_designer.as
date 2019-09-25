/* com_designer.as
    Объект Designer, который подключается к аддинам и служит корнем для SnegAPI.
    Его публичные свойства и методы доступны аддинам. Отдаётся им в виде IDispatch.
    Маршрутизация между IDispatch и AngelScript - осуществляется автоматически
    унутре snegopat.dll. При этом:
    числовые типы передаются как есть.
    string - конвертируются в/из BSTR
    bool -  конвертируются в/из VARIANT_BOOL
    Variant - обёртка VARIANT
    Объекты AngelScript - автоматически отдаются также как IDispatch.
    На входе если параметр имеет тип объекта AngelScript - из объектов IDispatch на входе пытается
    получить объект AngelScript, из которого он создан. При неудаче пока выдает ошибку.
    Если входной параметр имеет тип IDispatch или IUnknown - принимается как есть, при возможности.
    Объекты array<T> на выходе преобразуются в IDispatch, который имеет свойство length и метод item(idx),
    на вход не принимаются.
    Если последний параметр метода в AngelScript имеет тип array<Variant>
    snegopat.dll создает такой массив сам, и заполняет его всеми оставшимися переданными параметрами,
    то есть вызывающий может передать переменное количество параметров.
    Значения по умолчанию поддерживаются только числа, простые строки, перечисления AngelScript
    Передача параметров по ссылке особо не тестировалась, поэтому лучше считать, что они передаются
    по значению, тем более, JScript по другому и не умеет.
    Protected и private методы объектов AngelScript, а также начинающиеся с "_" - не отдаются скриптам.
    Методы, начинающиеся с "get_" / "set_" отдаются как свойства.
    Protected и private своойства, а также начинающиеся с "__" - не отдаются скриптам.
    Public свойства, начинающиеся с "_" - отдаются как read only, без начального "_".
*/
#pragma once
#include "../../all.h"

// Чистый и красивый интерфейс
class Designer {
    // Менеджер аддинов
    AddinMgr&&			_addins;
    ProfileStore&&		_profileRoot;
    Snegopat&&			_snegopat;
    IHotKeys&&			_hotkeys;
    IEventConnector&&	_events;
    IV8Windows&&		_windows;
    IV8MetaData&&		_metadata;
    V8Files&&			_v8files;
    Develop&&			_develop;
    EnvironmentData&&	_env;
    CommandService&&	_cmdService;
    //IV8Debugger     _v8debug;
    
    Designer() {
        //Print("designer ctor");
        &&oneDesigner = this;
        &&_profileRoot = ProfileStore(getProfileRoot());
        &&_snegopat = Snegopat();
        &&_hotkeys = IHotKeys();
        &&_events = IEventConnector();
        &&_windows = IV8Windows();
        &&_metadata = IV8MetaData(0);
        &&_v8files = V8Files();
        &&_develop = Develop();
        &&_env = EnvironmentData();
        &&_cmdService = CommandService();
        //dumpVtable(&&getBkEndUI());
        // Инициализирем всякую всячину
        setTrapOnComExportCount();
        fillTypeNames();
        initConvertContextToVariant();
        trSelectFileName.setTrap(&&getBkEndUI(), IBkEndUI_GetFileName, GetFileNameTrap);
        // Подпишемся на кое-какие оповещения
        exitAppHandlers.insertLast(PVV(this._onExitApp));
        beforeExitAppHandlers.insertLast(PCancelExitApp(this._beforeExitApp));
        idleHandlers.insertLast(PVV(this._onIdle));
        // Теперь можно создать менеджер аддинов
        &&_addins = AddinMgr();
        // Инициализируем пакеты, ждущие нас
        initPackets(piOnDesignerInit);
        // Еще подпишемся на уведомления
        IEventService&& es = getEventService();
        es.subscribe(IID_MyMessageHandler, AStoIUnknown(MessageClickNotifier(), IID_IEventRecipient));
        es.subscribe(eventSaveModules, AStoIUnknown(SaveModulesNotifier(), IID_IEventRecipient));
    }
    // Создать объект 1С
    Variant v8New(const string& name, array<Variant>& params) {
        Variant result;
        IType&& type;
        currentProcess().createByName(name, IID_IType, type);
        if (type is null) {
            auto find = __mapTypeNames.find(name);
            if (!find.isEnd())
                currentProcess().createByClsid(find.value, IID_IType, type);
        }
        if (type !is null) {
            IValue&& pVal;
            uint pc = params.length;
            if (pc > 0) {
                ValueParamsVector args(pc);
                for (uint i = 0; i < pc; i++)
                    var2val(params[i], args.values[i]);
                type.create(pVal, args.args);
            } else
                type.createValue(pVal);
            if (pVal !is null) {
                ISettingsConsumer&& st = pVal.unk;
                if (st !is null)
                    st.setSettings(editedMetaDataCont(), IID_IMDContainer);
                Value val(pVal);
                val2var(val, result);
            }
        }
        return result;
    }
    // Сообщить
    void Message(const string& text, Variant markerOrPict = mNone, IDispatch&& clickHandler = null, Variant handlerArg=0) {
        Guid g = IID_NULL;
        IUnknown&& h = null;
        V8Picture pict;
        MessageMarker marker = mNone;
        if (markerOrPict.vt == VT_DISPATCH) {
            Value val;
            var2val(markerOrPict, val);
            IV8PictureValue&& iPictVal = cast<IUnknown>(val.pValue);
            if (iPictVal !is null)
                iPictVal.getPicture(pict);
        } else if (markerOrPict.vt == VT_UI4 || markerOrPict.changeType(VT_UI4))
            marker = MessageMarker(markerOrPict.dword);
        if (clickHandler !is null) {
            MessageClickHandler ho;
            &&ho.handler = clickHandler;
            ho.arg = handlerArg;
            &&h = AStoIUnknown(&&ho, IID_MyMessageHandler);
            g = IID_MyMessageHandler;
        }
        getBkEndUI().doMsgLine(text, marker, g, 0, h, pict);
    }
    // Предупреждение
    MsgBoxAnswers MessageBox(const string& text, MsgBoxStyles style = mbOK, const string& caption = "", uint timeout = 0) {
        return MsgBoxAnswers(MsgBox(text, style, caption, timeout));
    }
    // Получить указанный глобальный контекст
    Variant globalContext(const string& uuidStr) {
        auto fnd = __globalContextes.find(uuidStr);
        if (!fnd.isEnd())
            return fnd.value;
        Variant res;
        IGlobalContext&& gc;
        currentProcess().createByClsid(Guid(uuidStr), IID_IGlobalContext, gc);
        if (gc !is null) {
            IContext&& ctx = gc.unk;
            if (ctx !is null) {
                IGlobalContextInit&& init = gc.unk;
                if (init !is null) {
                    reinitGlobalContextes.insertLast(init);
                    init.init(getDefaultInfoBase());
                }
                convertContextToVariant(ctx, res);
                __globalContextes.insert(uuidStr, res);
            }
        }
        return res;
    }
    void designInternalForm(const string path = "") {
        ::designInternalForm(path);
    }
    void designScriptForm(const string& path = "") {
        ::designScriptForm(path);
    }
    Variant loadScriptForm(string path, IDispatch&& eventHandler, const string& eventPrefix="") {
        Value form;
        ::loadScriptForm(path, eventHandler, eventPrefix, form);
        Variant res;
        val2var(form, res);
        return res;
    }
    V8Value&& toV8Value(Variant varValue) {
        return V8Value(varValue);
    }
    //[helpstring("Получить состояние команды")]
    ICmdUpdateResult&& getCmdState(string cmdGroupUUID, uint cmdNumber, int subCommandIdx = -1) {
        return getCommandState(CommandID(Guid(cmdGroupUUID), cmdNumber), subCommandIdx);
    }
    //[helpstring("Выполнить команду")]
    bool sendCommand(string cmdGroupUUID, uint cmdNumber, int subCommandIdx = 0) {
        return sendCommandToMainFrame(CommandID(Guid(cmdGroupUUID), cmdNumber), subCommandIdx);
    }
    uint createTimer(uint msec, IDispatch&& pDisp, const string& member = "") {
        TimerHandler th;
        &&th.pDisp = pDisp;
        th.name = member;
        return setTimer(msec, TimerProc(th.handler));
    }
    void killTimer(uint timerID) {
        removeTimer(timerID);
    }
    void saveProfile() {
        getProfileService().flush();
    }
    void snPrint(const string& msg) {
        Print(msg);
    }
    void snLog(const string& msg) {
        doLog(msg);
    }
    
    EditorsManager&& get_editorsManager() {
        return editorsManager;
    }

    // Это из скриптов не вызвать
    IUnknown&& _createValue(const string& name, ValueParamsVector&& params = ValueParamsVector()) {
        IType&& type;
        currentProcess().createByName(name, IID_IType, type);
        if (type is null) {
            auto find = __mapTypeNames.find(name);
            if (!find.isEnd())
                currentProcess().createByClsid(find.value, IID_IType, type);
        }
        if (type !is null) {
            IValue&& pVal;
            uint pc = params.values.length;
            if (pc > 0)
                type.create(pVal, params.args);
            else
                type.createValue(pVal);
            return pVal.unk;
        }
        return null;
    }
    string loadResourceString(const string& moduleName, const string& stringID) {
        utf8string strModuleName = moduleName.toUtf8(), strStringID = stringID.toUtf8();
        v8string res = load_module_wstring(strModuleName.ptr, strStringID.ptr);
        return res;
    }

    Variant builtin_require(string addinFile) {
        Variant res;
        // Так как вызов этого require вставляется автоматически TypeScript'ом, то название аддина является
        // файлом, и он может быть относительным и содержать различные папки и прочее. Также в конечном
        // счёте название файла может не совпадать с уникальным именем аддина. Поэтому нам надо перебрать
        // все аддины и найти нужный.
        string fileName = "\\" + addinFile.extract(extractFileNameRex), ext = fileName.extract(extractFileExtRex);
        if (ext.isEmpty())
            fileName += ".js";
        for (uint i = 0, k = _addins.get_count(); i < k; i++) {
            Addin&& a = _addins.byIdx(i);
            if (a.get_fullPath().substr(-fileName.length).compareNoCase(fileName) == 0) {
                res.setDispatch(a.object());
                break;
            }
        }
        return res;
    }

    NoCaseMap<Guid> __mapTypeNames;
    NoCaseMap<Variant> __globalContextes;
    private array<IGlobalContextInit&&> reinitGlobalContextes;
    private void fillTypeNames() {
        Vector vec;
        SCOM_Process&& proc = currentProcess();
        proc.getCategoryClasses(vec, IID_IType);
        for (GuidRef&& ptr = toGuid(vec.start); ptr < vec.end; &&ptr = ptr + 1) {
            IType&& type;
            proc.createByClsid(ptr.ref, IID_IType, type);
            if (type !is null) {
                bool bHasCtor = false;
                for (uint i = 0; i < 15; i++) {
                    if (type.hasCtor(i)) {
                        bHasCtor = true;
                        break;
                    }
                }
                if (bHasCtor) {
                    for (uint alias = 0; alias < 2; alias++) {
                        string typeName(type.getTypeString(alias));
                        if (!typeName.isEmpty())
                            __mapTypeNames.tryInsert(typeName, ptr.ref);
                    }
                }
            }
        }
    }
    IDispatch&& _me() {
        // Диспатч для объекта создается только в первый раз и привязывается к объекту.
        // Последующие вызовы только возвращают созданный диспатч
        return createDispatchFromAS(&&this);
    }
    // Открыть базу данных sqlite
    SqliteBase&& sqliteOpen(const string& baseName = ":memory:", int flags = -1) {
        uint db = 0;
        if (flags == -1)
            flags = SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE;
        int res = sqlite3_open_v2(baseName.toUtf8().ptr, db, flags);
        if (SQLITE_OK == res)
            return SqliteBase(db);
        setComException(stringFromAddress(sqlite3_errmsg16(db)));
        if (db != 0)
            sqlite3_close(db);
        return null;
    }

    void _beforeExitApp(ExitAppCancel&& cancel) {
        array<Variant> args(1);
        args[0].setDispatch(createDispatchFromAS(&&cancel));
        _events.fireEvent(_me(), "beforeExitApp", args);
    }
    void _onExitApp() {
        _events.fireEvent(_me(), "onExitApp", array<Variant>());
    }
    void _fireAddinChanges(Addin&& a, bool load) {
        array<Variant> args(1);
        args[0].setDispatch(createDispatchFromAS(&&a));
        _events.fireEvent(_me(), load ? "onLoadAddin" : "onUnLoadAddin", args);
    }
    void _onIdle() {
        _events.fireEvent(_me(), "onIdle", array<Variant>());
    }
    void _fireCreateTextWindow(TextWnd&& wnd) {
        array<Variant> args(1);
        args[0].setDispatch(createDispatchFromAS(&&wnd.getComWrapper()));
        _events.fireEvent(_me(), "createTextWindow", args);
    }
    void _reinitGlobalContextes() {
        IInfoBase&& ib = getDefaultInfoBase();
        for (uint i = 0, im = reinitGlobalContextes.length; i < im; i++)
            reinitGlobalContextes[i].init(ib);
    }
};

Designer&& oneDesigner;

// Различные грязные детали реализации

// Так как в процессе работы скриптов различные объекты 1С преобразуются во внешние IDispatch,
// то при закрытии окна она не завершает процесс, так как считает, что на нее есть внешние ссылки
// из других процессов. Чтобы процесс благополучно завершался, немного обманем её, перехватив
// функцию com_export_count и возвращая из нее 0.
TrapSwap trComExportCount;
uint com_export_count() { return 0; }
void setTrapOnComExportCount() {
    trComExportCount.setTrapByName(
#if ver < 8.3
        "core82.dll"
#else
        "core83.dll"
#endif
        , "?com_exported_count@core@@YAIXZ", 0, com_export_count);
}


// Штатными средствами 1С конвертирует Value в Variant, в том числе и объекты.
// Однако глобальные контексты не поддерживают интерфейс IValue, поэтому штатно их нельзя
// поместить в Value и конвертнуть в Variant. В прошлом снегопате я для этого реализовывал
// свой вариант IValue, отдающий глобальный контекст, однако в новой парадигме всё надо
// делать из скрипта, поэтому сделаем так:
// создадим любой объект, поддерживающий и IContext, и IValue, перехватим его QueryInterface
// и при запросе IContext будем отдавать наш контекст
TrapVirtualStdCall trValQueryIface;
IContext&& contextForConvertToVariant;

void initConvertContextToVariant() {
    Value val;
    &&val.pValue = null;
    currentProcess().createByClsid(CLSID_TxtEdtDoc, IID_IValue, val.pValue);
    if (val.pValue is null) {
        Print("Error create value for convert context to variant");
        return;
    }
    // И перехватим у него QueryInterface
    trValQueryIface.setTrap(&&val.pValue, 0, IGlobcalContext_QI);
    // Перехват пока убираем
    trValQueryIface.swap();
}

uint IGlobcalContext_QI(IUnknown& pThis, const Guid& g, IUnknown&&& res) {
    if (g == IID_IContext) {
        // Отдадим вместо родного - свой контекст
        &&res = contextForConvertToVariant;
        res.AddRef();
        return 0;
    }
    IUnk_QI&& orig;
    trValQueryIface.getOriginal(&&orig);
    return orig(pThis, g, res);
}

void convertContextToVariant(IContext&& ctx, Variant& var) {
    &&contextForConvertToVariant = ctx;
    Value val;
    &&val.pValue = null;
    currentProcess().createByClsid(CLSID_TxtEdtDoc, IID_IValue, val.pValue);
    // Ставим перехват
    trValQueryIface.swap();
    // Вызываем штатную процедуру 1С.
    val2var(val, var);
    // Убираем перехват
    trValQueryIface.swap();
    &&contextForConvertToVariant = null;
}

// обработчик событий таймера
class TimerHandler {
    IDispatch&& pDisp;
    string name;
    void handler(uint timerID) {
        int id;
        if (name.isEmpty())
            id = 0;
        else if (!pDisp.findMember(name, id))
            return;
        array<Variant> args(1);
        val2var(Value(timerID), args[0]);
        pDisp.call(id, args);
    }
};

class MessageClickHandler {
    IDispatch&& handler;
    Variant arg;
    void process() {
        array<Variant> args = { arg };
        handler.call(0, args);
    }
};

class MessageClickNotifier {
    void onEvent(const Guid&in eventID, long val, IUnknown& obj) {
        MyMessageHandler&& h = obj;
        if (h !is null)
            h.process();
    }
};

class SaveModulesNotifier {
    void onEvent(const Guid&in eventID, long val, IUnknown& obj) {
        // Надо по-новой инициализировать открытые глобальные контексты, которым это надо
        oneDesigner._reinitGlobalContextes();
    }
};

enum SelectFileResult {
    sfrNormal = 0,
    sfrSelected = 1,
    sfrCanceled = 2,
};

class ISelectFileData {
    protected SelectFileNameRef&& data;
    ISelectFileData(SelectFileNameRef&& d) {
        &&data = d;
        result = sfrNormal;
    }
    SelectFileMode get_mode()       { return data.ref.mode; }
    uint get_flags()                { return data.ref.flags; }
    uint get_filtersCount()         { return data.ref.filter.count(2 * v8string_size); }
    string filterDescr(uint idx)    { return tov8string(data.ref.filter.start + idx * 2 * v8string_size).ref.str; }
    string filterVal(uint idx)      { return tov8string(data.ref.filter.start + (idx * 2 + 1) * v8string_size).ref.str; }
    int get_filter()                { return data.ref.filterIndex; }
    void set_filter(int idx)        { data.ref.filterIndex = idx; }
    string get_defExt()             { return data.ref.defExt.str; }
    string get_initialFileName()    { return data.ref.initialFileName.str; }
    string get_folder()             { return data.ref.directory.str; }
    void set_folder(string fld)     { data.ref.directory = fld; }
    string get_title()              { return data.ref.title.str; }
    void set_title(string ttl)      { data.ref.title = ttl; }
    uint get_filesCount()           { return data.ref.selectedFiles.count(v8string_size); }
    string selectedFile(uint idx)   { return tov8string(data.ref.selectedFiles.start + idx * v8string_size).ref.str; }
    void addSelectedFile(string fileName) {
        VectorV8StringPushBack(data.ref.selectedFiles, fileName);
    }
    SelectFileResult result;
};

void VectorV8StringPushBack(Vector& v, const v8string&in str) {
    if (v.end + v8string_size > v.allocked) {
        // места больше нет, надо перевыделить память и переместить строки
        // строки в V8 перемещать можно простым копированием памяти
        int_ptr oldSize = v.allocked - v.start, newSize = oldSize + v8string_size * 3;
        int_ptr newData = v8malloc(newSize);
        if (oldSize != 0) {
            mem::memcpy(newData, v.start, oldSize);
            v.dtor();
        }
        v.start = newData;
        v.end = v.start + oldSize;
        v.allocked = v.start + newSize;
    }
    tov8string(v.end).ref.ctor1(str);
    v.end += v8string_size;
}

class EnvironmentData {
    string   _sVersion = snegoVersion;
    string   _v8Version = sv8ver;
    uint64   _v8ver = v8ver;
    string   _snMainFolder = myFolder;
    string   _ownerName = ownerName;
    string   _BuildDateTime = BuildDateTime;
    Pathes&& _pathes = pathes;
};

TrapVirtualStdCall trSelectFileName;
bool GetFileNameTrap(IBkEndUI& pBkEndUI, SelectFileName& data, int timeout, HWND parent) {
    // В момент обработки событий снимем перехват, чтобы можно было воспользоваться штатным диалогом открытия файлов
    trSelectFileName.swap();
    // Оповестим о событии
    ISelectFileData fd(toSelectFileName(data.self));
    array<Variant> args(1);
    args[0].setDispatch(createDispatchFromAS(&&fd));
    oneDesigner._events.fireEvent(oneDesigner._me(), "onSelectFile", args);
    bool res;
    if (fd.result == sfrNormal)
        res = pBkEndUI.GetFileName(data, timeout, parent);
    else if (fd.result == sfrCanceled)
        res = false;
    else
        res = true;
    // восстановим перехват
    trSelectFileName.swap();
    return res;
}
