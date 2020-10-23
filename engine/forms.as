﻿/* forms.as
    Работа с формами
*/
#pragma once
#include "../../all.h"

// Открытие ssf для конструирования
void designScriptForm(const string& path) {
    IUnknown&& test;
    IConfigMngrUI&& configMngrUI;
    getMDEditService().getTemplatesMainConfigMngrUI(configMngrUI);
    IMDContainer&& container = configMngrUI.getMDCont();
    IDocumentFactory&& docFactory;
    currentProcess().createByClsid(CLSID_FormDesDocFactory, IID_IDocumentFactory, docFactory);
    if (docFactory is null)
        return;
    string fullPath;
    if (!path.isEmpty()) {
        fullPath = findFullPath(path);
        fullPath = "file://" + fullPath;
    }
    IDocument&& doc;
    docFactory.createDocument(doc, fullPath);
    if (doc is null)
        return;
    // Для начала выставим сеттинги документу
    ISettingsConsumer&& st = doc.unk;
    st.setSettings(&&container, IID_IMDContainer);
    ILangSettings&& lang;
    currentProcess().createByClsid(CLSID_SimpleLangSettings, IID_ILangSettings, lang);
    st.setSettings(&&lang, IID_ILangSettings);
    // Инициализируем дизайнер формы
    ICustomFormDesigner&& cfdp = doc.unk;
    IUnknown&& unk;
    configMngrUI.getStyleCol(unk);
    if (unk is null || 0 != unk.queryIface(IID_V8StyleCol, &&test) || test is null) {
        MsgBox("No style collection");
        return;
    }
    cfdp.setFormSettings(unk, IID_V8StyleCol);
    
    configMngrUI.getPictureCol(unk);
    if (unk is null || 0 != unk.queryIface(IID_V8PictureCol, &&test) || test is null) {
        MsgBox("No pict collection");
        return;
    }
    cfdp.setFormSettings(unk, IID_V8PictureCol);

    Vector iids;
    GuidRef&& pIids = toGuid(iids.allock(6, Guid_size));
    pIids.ref = IID_FormCopy1; &&pIids = pIids + 1;
    pIids.ref = IID_FormCopy2; &&pIids = pIids + 1;
    pIids.ref = IID_FormCopy3; &&pIids = pIids + 1;
    pIids.ref = IID_FormCopy4; &&pIids = pIids + 1;
    pIids.ref = IID_FormCopy5; &&pIids = pIids + 1;
    pIids.ref = IID_FormCopy6;

    ICopyHelperCreator&& pCHCreator = cfdp.unk;
    pCHCreator.setIids(IID_FormCopy7, iids);

    ITypesInfoProvider&& types;
    currentProcess().createByClsid(CLSID_TIProvider, IID_ITypesInfoProvider, types);
    cfdp.setFormSettings(types, IID_ITypesInfoProvider);
    cfdp.setFormSettings(container, IID_IMDContainer);
    cfdp.setFormSettings(lang, IID_ILangSettings);
    cfdp.setModuleWizardCLSID(CLSID_ModuleWizard);

    cfdp.init();
    cfdp.prepare();
    
    // Настроим модуль формы, установив ему расширение "Встроенный язык"
    IDocument&& tDoc;
    cfdp.getModule(tDoc);
    ITextManager&& textDoc = tDoc.unk;
    if (textDoc !is null) {
        // Создадим расширение "Встроенный язык"
        ITxtEdtExtender&& pTxtExt;
        currentProcess().createByClsid(gTextExtModule, IID_ITxtEdtExtender, pTxtExt);
        // Зададим ему настройки
        ISettingsConsumer&& settingsConsumer = pTxtExt.unk;
        settingsConsumer.setSettings(container, IID_IMDContainer);
        settingsConsumer.setSettings(lang, IID_ILangSettings);
        settingsConsumer.setSettings(types, IID_ITypesInfoProvider);
        getTxtEdtService().setTxtDocExtender(textDoc, pTxtExt);
        ITextManager_Operations&& to = textDoc.unk;
        to.setExtenderCLSID(gTextExtModule);
    }
    if (!path.isEmpty()) {
        URLRef&& url = toURL(doc.self - 0x98
#if ver > 8.3
                          + 36
#endif
                          );
        url.ref.dtor();
        url.ref.ctor(fullPath, false);
        doc.setTitle(path);
    }
    // Открытие формы
    doc.createView(unk);
    IFramedView&& fv = unk;
    getBkEndUI().openView(fv);
    checkSaveFormTrapped();
}

void designInternalForm(const string path) {
    IDocumentFactory&& dfp;
    currentProcess().createByClsid(CLSID_FormDocumentFactory, IID_IDocumentFactory, dfp);
    if (dfp !is null) {
        string fullPath;
        if (!path.isEmpty()) {
            fullPath = findFullPath(path);
            fullPath = "file://" + fullPath;
        }
        IDocument&& doc;
        dfp.createDocument(doc, fullPath);
        if (doc !is null) {
            IUnknown&& unk;
            doc.createView(unk);
            IFramedView&& fv = unk;
            getBkEndUI().openView(fv);
        }
    }
}

IStorageRW&& attachStorage(IFileEx&& file) {
    IStorageRW&& stg;
    currentProcess().createByClsid(CLSID_StorageRW, IID_IStorageRW, stg);
    ExceptionCatcher catcher;
    CppCatch c("class core::Exception", ExceptionHandler(catcher.handle));
    stg.initFromFile(file);
    if (catcher.hasException) {
        setComException(catcher.errStr);
        return null;
    }
    return stg;
}

IFileEx&& openFromStorage(IStorageRW&& stg, const string& name) {
    IFileEx&& file;
    ExceptionCatcher catcher;
    CppCatch c("class core::Exception", ExceptionHandler(catcher.handle));
    stg.open(file, name, FileOpenModes(fomIn|fomShareRead));
    if (catcher.hasException) {
        setComException(catcher.errStr);
        return null;
    }
    return unpackFile(file);
}

IFileEx&& unpackFile(IFileEx&& file) {
    IFileEx&& tmp;
    currentProcess().createByClsid(CLSID_TempFile, IID_IFileEx, tmp);
    IUnpackFile&& unpacker;
    currentProcess().createByClsid(CLSID_UnpackFile, IID_IUnpackFile, unpacker);
    unpacker.init(file);
    IFile&& w = unpacker.unk;
    copy_file(tmp, w, uint(-1));
    tmp.seek(0, fsBegin);
    return tmp;
}

IFileEx&& findForm(IFile&& form, const string& name) {
    IFileEx&& fex = form.unk;
    if (fex is null)
        return null;
    IStorageRW&& stg = attachStorage(fex);
    if (stg is null)
        return null;
    // Откроем и прочитаем файл root
    IFileEx&& root = openFromStorage(stg, "root");
    if (root is null)
        return null;
    string rootText = file_getString(root, dsUtf8);
    // выдернем из текста id файла описания метаданных, откроем его и прочитаем текст
    string mdId = rootText.match(RegExp(",([^,]+),")).text(0, 1);
    &&root = openFromStorage(stg, mdId);
    rootText = file_getString(root, dsUtf8);
    // Выдернем id'шники форм
    auto formUuids = rootText.match(RegExp("(?i)\\{d5b0e5ed-256d-401c-9c36-f630cafd8a62,\\d+,([^\\}]+)\\}")).text(0, 1).split(",");
    // Переберем файлы с этими айдишниками
    for (uint i = 0; i < formUuids.length; i++) {
        // Открываем и читаем
        &&root = openFromStorage(stg, formUuids[i]);
        rootText = file_getString(root, dsUtf8);
        // Выдёргиваем из текста название формы
        string formName = rootText.match(RegExp("(?i)\\{1,0," + formUuids[i] + "\\},\"([^\"]+)\",")).text(0, 1);
        if (formName == name)// Нашли нужную форму, вернем файл, ей соответствующий
            return openFromStorage(stg, formUuids[i] + ".0");
    }
    return null;
}

IFile&& loadFormFile(string path, string formName) {
    path = findFullPath(path);
    if (path.isEmpty())
        return null;
    path = "file://" + path;
    IFile&& file;
    ExceptionCatcher catcher;
    CppCatch c("class core::Exception", ExceptionHandler(catcher.handle));
    getFSService().openURL(file, URL(path), fomIn | fomShareRead);
    if (catcher.hasException) {
        setComException(catcher.errStr);
        return null;
    }
    if (file !is null && !formName.isEmpty()) {
        IFileEx&& tmp;
        currentProcess().createByClsid(CLSID_TempFile, IID_IFileEx, tmp);
        copy_file(tmp, file, -1);
        &&file = findForm(tmp, formName);
    }
    return file;
}

// Объект, который будем передавать как языковые настройки открываемой форме скрипта.
class RuLangSettings {
    int_ptr currentLanguage(v8string& str) {
        str.ctor();
        str = "ru";
        return str.self;
    }
    int_ptr defaultLanguage(v8string& str) {
        str.ctor();
        str = "ru";
        return str.self;
    }
    int mainLang() {
        return 1;
    }
    void languages(Vector& langs) {
        langs.ctor();
    }
};

IUnknown&& oneLangSettings;

bool loadScriptForm(IFile&& file, IDispatch&& eventHandler, const string& eventPrefix, Value& out result, bool epf) {
    if (file is null)
        return false;
    ICustomForm&& customForm;
    currentProcess().createByClsid(CLSID_CustomForm, IID_ICustomForm, customForm);
    if (customForm is null)
        return false;
    ICustomFormLoader&& loader;
    currentProcess().createByClsid(CLSID_CustomFormLoader, IID_ICustomFormLoader, loader);
    if (loader is null)
        return false;
    loader.loadCustomForm(file, customForm);

    IControlDesign&& des = customForm.unk;
    des.setMode(ctrlRunning);

    ISettingsConsumer&& st = customForm.unk;
    IConfigMngrUI&& configMngrUI;
    getMDEditService().getTemplatesMainConfigMngrUI(configMngrUI);
    //dumpVtable(&&configMngrUI);
    IMDContainer&& container = configMngrUI.getMDCont();
    st.setSettings(container, IID_IMDContainer);
    ILangSettings&& lang;
    if (epf) {
        //configMngrUI.getLangSettings(lang);
        if (oneLangSettings is null)
            &&oneLangSettings = AStoIUnknown(RuLangSettings(), IID_ILangSettings);
        &&lang = oneLangSettings;
    } else
        currentProcess().createByClsid(CLSID_SimpleLangSettings, IID_ILangSettings, lang);
    st.setSettings(&&lang, IID_ILangSettings);

    IUnknown&& unk;
    configMngrUI.getStyleCol(unk);
    st.setSettings(unk, IID_V8StyleCol);
    configMngrUI.getPictureCol(unk);
    st.setSettings(unk, IID_V8PictureCol);
    ITypesInfoProvider&& types;
    currentProcess().createByClsid(CLSID_TIProvider, IID_ITypesInfoProvider, types);
    st.setSettings(types, IID_ITypesInfoProvider);
    customForm.setRuntimeModule(AStoIUnknown(ScriptRuntimeModule(eventHandler, eventPrefix), IID_IRuntimeModule));
    IForm&& form = customForm.unk;
    form.prepareForm();
    patchMyFormVtable(customForm.unk);
    &&result.pValue = customForm.unk;
    return true;
}

//загрузка формы по скрипту и имени формы (если не стандартная)
bool loadFormForScript(SelfScript&& selfScript, string formName, IDispatch&& eventHandler, const string& eventPrefix, Value& out result) {

	string path = selfScript._fullPath;
	doLog("path = " + path);
	doLog("formName = " + formName);
	string pathToForm = path;
	pathToForm.replace(RegExp(".js$"), ".epf", 1);
	
	string fullPath = findFullPath(pathToForm);
	
	if (!fullPath.isEmpty())
	{
		doLog("Load EPF");
		doLog("pathToForm = " + pathToForm);
		return loadScriptForm(loadFormFile(pathToForm, formName.isEmpty()?"Форма":formName), (eventHandler is null)?selfScript.self:eventHandler, eventPrefix, result, true);
	}
	else//оставим поддержку SSF на всякий случай
	{
		doLog("Load SSF");
		pathToForm = path;
		pathToForm.replace(RegExp(".js$"), (formName.isEmpty()?"":("." + formName))+".ssf", 1);
		doLog("pathToForm = " + pathToForm);
		return loadScriptForm(loadFormFile(pathToForm, ""), (eventHandler is null)?selfScript.self:eventHandler, eventPrefix, result, false);
	}
	
}

bool loadScriptFormEpf(string path, string formName, IDispatch&& eventHandler, const string& eventPrefix, Value& out result) {
    return loadScriptForm(loadFormFile(path, formName), eventHandler, eventPrefix, result, true);
}

bool loadScriptForm(string path, IDispatch&& eventHandler, const string& eventPrefix, Value&out result) {
    return loadScriptForm(loadFormFile(path, ""), eventHandler, eventPrefix, result, false);
}

// Реализация интерфейса IRuntimeModule. Объект назначается форме в качестве рантайм-модуля
// и пробрасывает вызовы событий из формы в объект-обработчик событий.
class ScriptRuntimeModule {
    IDispatch&& pEventObject;
    string eventPrefix;

    ScriptRuntimeModule(IDispatch&& pObj, const string& prefix) {
        &&pEventObject = pObj;
        eventPrefix = prefix;
    }
    void init(IContext&){}
    // Свойства не пробрасываем, только методы
    int findProp(const v8string&){return 0;}
    void setPropVal(int, const Value&){}
    void getPropVal(int, Value&){}
    // Поиск номера метода
    int findMeth(const v8string& name) {
        if (pEventObject !is null) {
            int result;
            if (pEventObject.findMember(eventPrefix + name, result)) {
                //Message("find " + name + " as " + result);
                return result;
            }
        }
        return -1;
    }
    // получение количества параметров. Не все IDispatch поддерживают это.
    // JScript и VBScript - поддерживают.
    int getParamsCount(int meth) {
        int ret;
        if (pEventObject !is null && pEventObject.getParamsCount(meth, ret))
            return ret;
        return 0;
    }
    // Вызов метода. В params приходит вектор, содержащий указатели на Value
    bool call(int meth, Value& retVal, Vector& params, bool
	#if ver >= 8.3.9.2016
		, int
	#endif
	) {
        if (pEventObject is null)
            return false;
        uint paramsCount = params.count(4);
        //MsgBox("Call " + meth + " pc=" + paramsCount);
        // Для передачи в IDispatch::invoke нужно переложить аргументы в массив Variant.
        // Однако так как JScript не работает с аргуменами по ссылке, а только по значению,
        // то никакие изменения самих аргуметов в скрипте обратно им не будут переданы,
        // что не позволяет к примеру устанавливать "Отказ=", или "СтандартнаяОбработка=".
        // Поэтому каждый аргумент обернём в объект, который через свойство val будет изменять
        // оригинальный аргумент.
        // Параметры в IDispatch::Invoke передаются в обратном порядке.
        array<Variant> args(paramsCount);
        for (uint i = 0, k = paramsCount - 1; i < paramsCount; i++) {
            args[k].setDispatch(createDispatchFromAS(&&ParamsWrapper(toValue(mem::dword[params.start + i * 4]))));
            k--;
        }
        Variant retVar;
        if (pEventObject.call(meth, args, retVar)) {
            var2val(retVar, retVal);
            return true;
        }
        return false;
    }
    //uint context(IContext&&& ctx)
    uint context(uint p) {
        //&&ctx = null;
        mem::dword[p] = 0;
        return p;
    }
};

// Обёртка для имитации передачи аргументов в скрипты по-ссылке
class ParamsWrapper {
    ValueRef&& value;
    ParamsWrapper(ValueRef&& v) {
        &&value = v;
    }
    Variant get_val() {
        Variant ret;
        val2var(value.ref, ret);
        return ret;
    }
    void set_val(Variant& newVal) {
        var2val(newVal, value.ref);
    }
};

// Это обход бага 1С. Так как разработчики не учитывали, что файл формы может сохранятся
// не в составе родительского контейнера, а сам по себе, то для записи в файл для формы
// используется дефолтная процедура сериализации. Она открывает файл в режиме fomOut,
// т.е. только для записи. Однако в процессе сохранения формы часть данных читается из
// файла, а так как он открывается только на запись, то 1С зависает при попытке чтения
// из файла. Чтобы это обойти, мы перехватим процедуру открытия файла, и файлы с расширением
// ssf будем при записи открывать на чтение/запись. Именно поэтому при создании формы скрипта
// ее надо сохранять исключительно с расширением ssf - snegopat script form.
TrapVirtualStdCall trFileOpenUrl;
bool saveFormTrapped = false;
uint FileSystem_openURL(IFileSystem& fs, IFile&&&file, const URL& url, int mode) {
    string path = url.url;
    if ((mode & fomOut) != 0) {
        if (url.url.str.substr(-4).compareNoCase(".ssf") == 0)
            mode |= fomIn | fomShareRead | fomShareWrite;
    }
    // Тут мы вызываем штатную процедуру открытия файла. Основной затык в том,
    // что в случае ошибки открытия штатная функция выбрасывает C++ исключение,
    // core::Exception, только в данном случае это не та ошибка, которую должен
    // отловить и загасить snegopat.dll. Это часть штатного механизма, так как выше
    // 1С ставит свой обработчик данного исключения. Поэтому мы должны сообщить
    // snegopat.dll, что данное исключение надо не отлавливать и гасить, а передавать
    // дальше, наверх, 1С сама с ним разберётся.
    trFileOpenUrl.swap();
    ExceptionCatcher catcher;
    catcher.bypass = true;
    CppCatch c("class core::Exception", ExceptionHandler(catcher.handle));
    uint res = fs.openURL(file, url, mode);
    trFileOpenUrl.swap();
    return res;
}
void checkSaveFormTrapped() {
    if (!saveFormTrapped) {
        saveFormTrapped = true;
        IFileSystem&& fs = getFSService();
        trFileOpenUrl.setTrap(&&fs, IFileSystem_openURL, FileSystem_openURL);
        exitAppHandlers.insertLast(function() { trFileOpenUrl.swap(); });
    }
}

// Это функции для переопределения двух методов поведения окна.
// Мы хотим, чтобы для наших форм использовалась стандартная MDI схема,
// а также чтобы они не закрывались по Esc.
// Для этого при создании первой формы мы создадим свою копию виртуальной таблицы
// для IFramedView с покером и куртизанками, то бишь поменяем в ней две функции
// и последующие формы будем сразу перенаправлять на патченную таблицу
uint customFormVtable = 0;
TrapVirtualStdCall trMdiScheme;
TrapVirtualStdCall trFormStyle;

// Покер
funcdef void FlocalFrame(IFramedView&, WndType, Guid&, uint&);
void localFrameTrap(IFramedView& v, WndType type, Guid& id, uint& style) {
    FlocalFrame&& original;
    trFormStyle.getOriginal(&&original);
    original(v, type, id, style);
    if (type != wtModal)
        style &= ~wsCloseOnEscape;
}
// Куртизанки
int mdiTypeTrap(IFramedView&) {
    return 0;
}

void patchMyFormVtable(IFramedView&& view) {
    // Для начала создадим при необходимости копию таблицы
    if (customFormVtable == 0) {
        customFormVtable = malloc(30 * 4);  // 30 функций достаточно
        uint realVtable = mem::dword[view.self];
        // Скопируем реальную таблицу
        mem::memcpy(customFormVtable, realVtable, 30 * 4);
        // Перенаправим объект на копию
        mem::dword[view.self] = customFormVtable;
        // Перехватим две функции
        trMdiScheme.setTrap(view, IFramedView_mdiType, mdiTypeTrap);
        trFormStyle.setTrap(view, IFramedView_localFrame, localFrameTrap);
    } else {
        // Просто перенаправим таблицу
        mem::dword[view.self] = customFormVtable;
    }
}
