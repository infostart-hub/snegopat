/* com_metadata.as
    Работа с метаданными из аддинов.
*/
// Данные строки нужны только для среды разработки и вырезаются препроцессором
#pragma once
#include "../../all.h"

// Класс для реализации свойства Designer.metadata
// Предоставляет доступ к открытым в Конфигураторе контейнерам метаданных, а также статической
// информации, описывающей существующие виды классов и свойств метаданных 
class IV8MetaData {
    IV8MetaData(int) {
        &&mdService = getMDService();
        oneMDTreeItemInfo.init();
        // сразу добавим в наш список метаданные ИБ
        getContainerWrapper(getIBMDCont());
        // тут добавятся метаданные текущей конфигурации, если она открыта
        getContainerWrapper(editedMetaDataCont());
        // установим перехват на открытие контейнеров метаданных
        setTrapOnOpenConfig();
        // подпишемся на события метаданных
        getEventService().subscribe(eventMetaData, AStoIUnknown(MetaDataEvent(), IID_IEventRecipient));
        //dumpVtable(getIBMDCont());
        /*Print("Start");
        uint t1 = GetTickCount();
        walkMD(getContainerWrapper(editedMetaDataCont()).rootObject);
        t1 = GetTickCount() - t1;
        Print("End. Objects: " + mdObjCount + " time = " + t1 + " msec");*/
    }
    //[propget, helpstring("Конфигурация ИБ")]
    IV8MDContainer&& get_ib() {
        return getContainerWrapper(getIBMDCont());
    }
    //[propget, helpstring("Текущая конфигурация")]
    IV8MDContainer&& get_current() {
        return getContainerWrapper(editedMetaDataCont());
    }
    //[helpstring("Получить класс метаданных")]
    IV8MDClass&& mdClass(const string& uuid) {
        return getMDClassWrapper(mdService.mdClass(Guid(uuid)));
    }
    //[helpstring("Получить описание свойства объекта метаданных")]
    IV8MDProperty&& mdProp(const string& uuid) {
        return getMDPropWrapper(mdService.mdProp(Guid(uuid)));
    }
    //[propget, helpstring("Количество открытых контейнеров")]
    uint get_openedCount() {
        return contWrappers.length;
    }
    //[helpstring("Получить открытый контейнер")]
    IV8MDContainer&& getContainer(uint idx) {
        return idx < contWrappers.length ? contWrappers[idx] : null;
    }
};

IMDService&& mdService;

// Класс для работы с контейнером метаданных
class IV8MDContainer {
    // 1Сный объект
    protected IMDContainer&& container;
    // признак закрытости контейнера. Устанавливается при обработке события закрытия конейнера.
    bool _closed = false;
    
    IV8MDContainer(IMDContainer&& c) {
        &&container = c;
    }
    IMDContainer&& _container() { return container; }
    void _setClosed() {
        _closed = true;
        &&container = null;
    }

    IV8MDObject&& get_rootObject() {
        // Контейнер сам и есть корневой объект
        return getMDObjectWrapper(container);
    }
    array<V8TypeInfo&&>&& typeList(const string& typeCategories, int lang) {
        IMDEditService&& pMDE = getMDEditService();
        IConfigMngrUI&& uicfgmngr;
        pMDE.getConfigMngrUI(uicfgmngr, container);
        if (uicfgmngr is null)
            return null;
        ITypesInfoProvider&& tip;
        uicfgmngr.getTypesInfoProvider(tip);
        if (tip is null)
            return null;
        Guid g;
        if (!g.parseString(typeCategories))
            g = IID_NULL;
        Vector ti;
        tip.typesInfo(g, lang, ti);
        if (ti.size() == 0)
            return null;
        array<V8TypeInfo&&> result;
        for (TypeInfoRef&& pti = toTypeInfo(ti.start); pti < ti.end; &&pti = pti + 1) {
            V8TypeInfo tinfo;
            tinfo._name = pti.ref.name;
            tinfo._clsid = pti.ref.typeId;
            tinfo._order1 = pti.ref.priority;
            tinfo._order2= pti.ref.order;
            tinfo._picture = image2pict(pti.ref.image);
            pti.ref.dtor();
            result.insertLast(&&tinfo);
        }
        return result;
    }
    IV8MDContainer&& get_masterContainer() {
        return getContainerWrapper(getMasterContainer(container));
    }
    bool get_isModified() {
        IMDEditService&& pMDE = getMDEditService();
        IConfigMngrUI&& uicfgmngr;
        pMDE.getConfigMngrUI(uicfgmngr, container);
        if (uicfgmngr !is null)
            return uicfgmngr.isModified();
        return false;
    }
    bool get_treeVisible() {
        IMDEditService&& pMDE = getMDEditService();
        IConfigMngrUI&& uicfgmngr;
        pMDE.getConfigMngrUI(uicfgmngr, container);
        if (uicfgmngr !is null)
            return uicfgmngr.mdTreeIsVisible();
        return false;
    }
    void set_treeVisible(bool visible) {
        IMDEditService&& pMDE = getMDEditService();
        IConfigMngrUI&& uicfgmngr;
        pMDE.getConfigMngrUI(uicfgmngr, container);
        if (uicfgmngr !is null)
            uicfgmngr.mdTreeShow(visible);
    }
    IV8MDObject&& findByUUID(const string& uuid) {
        return getMDObjectWrapper(container.objById(Guid(uuid)));
    }
    IV8MDObject&& findByTypeUUID(const string& uuid) {
        IMDObject&& obj = container.objByTypeId(Guid(uuid));
        return getMDObjectWrapper(obj);
    }
    string get_identifier() {
        IMDEditService&& pMDE = getMDEditService();
        IConfigMngrUI&& uicfgmngr;
        pMDE.getConfigMngrUI(uicfgmngr, container);
        if (uicfgmngr !is null)
            return uicfgmngr.identifier();
        return string();
    }
    //metadata.current.saveToFile("e:\\test.cf")
    bool saveToFile(const string& path) {
        IV8DataFile&& tempFile = oneDesigner._v8files.createTempFile();
        if (tempFile is null)
            return false;
        IV8DataFile&& file = oneDesigner._v8files.open("file://" + path, FileOpenModes(fomTruncate | fomIn | fomOut));
        if (file is null)
            return false;
        IConfigMngr&& cfgMgr = container.getConfigMngr();
    #if test > 0
        {
            IConfigMngr&& test = cfgMgr.unk;
            if (test is null) {
                doLog("Not IConfigMngr");
                return false;
            }
        }
        dumpVtable(&&cfgMgr);
    #endif
        IInfoBaseService&& ibservice = currentProcess().getService(IID_IInfoBaseService);
        IConfigMngr&& copyMgr;
        ibservice.connectConfig(copyMgr, tempFile.file, 1, 0);
        if (copyMgr !is null) {
        #if test > 0
            {
                IConfigMngr&& test = copyMgr.unk;
                if (test is null) {
                    doLog("Not copy IConfigMngr");
                    return false;
                }
            }
            dumpVtable(&&copyMgr, "_copy");
        #endif
            cfgMgr.extractConfig(copyMgr);
            &&copyMgr = null;
            tempFile.seek(0, fsBegin);
            copy_file(file.file, tempFile.file, -1);
            return true;
        }
        return false;
    }
};

UintMap<IV8MDContainer&&> contFind;
array<IV8MDContainer&&> contWrappers;
IV8MDContainer&& getContainerWrapper(IMDContainer&& container) {
    //+ mike_a
    if(container is null)
        return null;
    uint s = container.self;
    auto find = contFind.find(s);
    if (!find.isEnd())
        return find.value;
    IV8MDContainer&& cont = IV8MDContainer(container);
    contFind.insert(s, cont);
    contWrappers.insertLast(cont);
    return cont;
}

class V8TypeInfo {
    string _name;
    string _clsid;
    int _order1;
    int _order2;
    Variant _picture;
};

class IV8MDClass {
    protected IMDClass&& mdClass;
    protected NoCaseMap<Guid> names2props;
    protected NoCaseMap<Guid> names2childs;
    IV8MDClass(IMDClass&& c) {
        &&mdClass = c;
        IMDService&& pMDS = mdService;
        for (uint i = 0, m = mdClass.childClassesCount(); i < m; i++) {
            Guid clsId = mdClass.childClassIDAt(i);
            IMDClass&& pClass = pMDS.mdClass(clsId);
            names2childs.insert(stringFromAddress(pClass.getClassName(0)), clsId);
            names2childs.insert(stringFromAddress(pClass.getClassName(1)), clsId);
        }
        //Print("Класс " + name(1) + " props " + mdClass.propCount());
        for (uint i = 0, m = mdClass.propCount(); i < m; i++) {
            Guid propId = mdClass.getPropIDAt(i);
            MDPropertyRef&& pProp = pMDS.mdProp(propId);
            //Print("  " + propId + " - " + stringFromAddress(pProp.ref.nameRus));
            names2props.insert(stringFromAddress(pProp.ref.nameEng), propId);
            names2props.insert(stringFromAddress(pProp.ref.nameRus), propId);
        }
    }
    bool _findPropId(Variant& v, Guid&out id) {
        if (v.vt == VT_BSTR) {
            // Передали строку
            string str = stringFromAddress(v.dword);
            // Это может быть либо имя строка с гуидом свойства
            if (id.parseString(str))
                return true;
            // либо имя свойства
            auto find = names2props.find(str);
            if (!find.isEnd()) {
                id = find.value;
                return true;
            }
        } else {
            // Передали не строку, значит это индекс
            if (v.vt != VT_UI4 && !v.changeType(VT_UI4))
                return false;
            uint idx = v.dword;
            if (idx < mdClass.propCount()) {
                id = mdClass.getPropIDAt(idx);
                return true;
            }
        }
        return false;
    }
    bool _findChildId(Variant& v, Guid&out id) {
        if (v.vt == VT_BSTR) {
            // Передали строку
            string str = stringFromAddress(v.dword);
            // Это может быть либо имя строка с гуидом свойства
            if (id.parseString(str))
                return true;
            // либо имя свойства
            auto find = names2childs.find(str);
            if (!find.isEnd()) {
                id = find.value;
                return true;
            }
        } else {
            // Передали не строку, значит это индекс
            if (v.vt != VT_UI4 && !v.changeType(VT_UI4))
                return false;
            uint idx = v.dword;
            if (idx < mdClass.childClassesCount()) {
                id = mdClass.childClassIDAt(idx);
                return true;
            }
        }
        return false;
    }

    string get_id() {
        return mdClass.id;
    }
    string name(int langAliase, bool pluralForm = false) {
        return stringFromAddress(pluralForm ? mdClass.getClassName(langAliase) : mdClass.getName(langAliase));
    }
    string presentation(bool pluralForm = false) {
        v8string res;
        if (pluralForm)
            mdClass.classPresentation(res);
        else
            mdClass.presentation(res);
        return res;
    }
    uint get_propertiesCount() {
        return mdClass.propCount();
    }
    IV8MDProperty&& propertyAt(uint idx) {
        return getMDPropWrapper(mdService.mdProp(mdClass.getPropIDAt(idx)));
    }
    uint get_childsClassesCount() {
        return mdClass.childClassesCount();
    }
    IV8MDClass&& childClassAt(uint idx) {
        return getMDClassWrapper(mdService.mdClass(mdClass.childClassIDAt(idx)));
    }
};

UintMap<IV8MDClass&&> mdClasses;

IV8MDClass&& getMDClassWrapper(IMDClass&& mdc) {
    if (mdc is null)
        return null;
    uint s = mdc.self;
    auto find = mdClasses.find(s);
    if (!find.isEnd())
        return find.value;
    IV8MDClass&& mdcw = IV8MDClass(mdc);
    mdClasses.insert(s, mdcw);
    return mdcw;
}

class IV8MDProperty {
    protected MDPropertyRef&& mdProp;

    IV8MDProperty(MDPropertyRef&& mdp) {
        &&mdProp = mdp;
    }
    string get_id() {
        return mdProp.ref.id;
    }
    string name(int langAliase) {
        return stringFromAddress(langAliase == 0 ? mdProp.ref.nameEng : mdProp.ref.nameRus);
    }
    string get_description() {
        return load_module_wstring(mdProp.ref.resMod1, mdProp.ref.resID);
    }
    string get_category() {
        return load_module_wstring(mdProp.ref.resMod2, mdProp.ref.resCatID);
    }
};

UintMap<IV8MDProperty&&> mdProps;
IV8MDProperty&& getMDPropWrapper(MDPropertyRef&& mdp) {
    if (mdp is null)
        return null;
    uint s = mdp.self;
    auto find = mdProps.find(s);
    if (!find.isEnd())
        return find.value;
    IV8MDProperty&& mdpw = IV8MDProperty(mdp);
    mdProps.insert(s, mdpw);
    return mdpw;
}

// Тут я пока в раздумьях - хранить ли где-нибудь соответствие между 1Сным объектом и нашей обёрткой.
// Ведь тогда придется как-то отслеживать их время жизни. Пока буду каждый раз создавать новую
// обёртку, и добавлю метод isSame для сравнения на одинаковость объектов.
IV8MDObject&& getMDObjectWrapper(IMDObject&& obj) {
    return obj is null ? null : IV8MDObject(obj);
}

class IV8MDObject {
    protected IMDObject&& object;
    protected IV8MDClass&& myClass;
    protected Variant pict;
    IV8MDObject(IMDObject&& obj) {
        &&object = obj.unk;
        if (object is null) {
            doLog("No md object");
        }
    }
    bool isSame(IV8MDObject&& other) {
        return other.object is object;
    }
    string get_id() {
        return object.id;
    }
    IV8MDClass&& get_mdclass() {
        if (myClass is null)
            &&myClass = getMDClassWrapper(object.mdClass);
        return myClass;
    }
    IV8MDObject&& get_parent() {
        IMDParentLink&& p = object.mdParentLink;
        return p is null ? null : getMDObjectWrapper(p.getMDObject());
    }
    Variant property(Variant propID) {
        Variant res;
        Guid propUuid;
        if (mdclass._findPropId(propID, propUuid)) {
            Value val;
            object.mdPropVal(propUuid, val);
            val2var(val, res);
        }
        return res;
    }
    bool setProperty(Variant propID, Variant value) {
        Guid propUuid;
        if (!mdclass._findPropId(propID, propUuid))
            return false;
        Value val;
        var2val(value, val);
        IMDEditHelper&& peh;
        getMDEditService().getEditHelper(peh, object);
        return peh is null ? object.setMdPropVal(propUuid, val) : peh.changeProperty(propUuid, val);
    }
    uint childObjectsCount(Variant childClassID) {
        Guid childUuid;
        return mdclass._findChildId(childClassID, childUuid) ? object.childCount(childUuid) : 0;
    }
    IV8MDObject&& childObject(Variant childClassID, Variant idx) {
        Guid childUuid;
        if (!mdclass._findChildId(childClassID, childUuid))
            return null;
        // Теперь разберемся с индексом
        IMDObject&& founded;
        uint maxIdx = object.childCount(childUuid);
        // Это может быть строка
        if (idx.vt == VT_BSTR) {
            string str = stringFromAddress(idx.dword);
            // Это может быть строка с гуидом объекта, либо его имя
            Guid id;
            bool itsGuid = id.parseString(str);
            for (uint i = 0; i < maxIdx; i++) {
                IMDObject&& child = object.childAt(childUuid, i);
                if (itsGuid) {
                    if (child.id == id) {
                        &&founded = child;
                        break;
                    }
                } else {
                    IMDBaseObj&& bo = child.unk;
                    if (bo !is null && bo.getName().str == str) {
                        &&founded = child;
                        break;
                    }
                }
            }
        } else {
            // Тогда это индекс
            if (idx.vt != VT_UI4 && !idx.changeType(VT_UI4))
                return null;
            if (idx.dword < maxIdx)
                &&founded = object.childAt(childUuid, idx.dword);
        }
        return getMDObjectWrapper(founded);
    }
    IV8MDContainer&& get_container() {
        IConfigMngrUI&& mngui;
        getMDEditService().getConfigMngrUI(mngui, object);
        if (mngui !is null) {
            IConfigMngrUI&& test1 = mngui.unk;
            if (test1 is null)
                doLog("Bad test IConfigMngrUI");
            IMDContainer&& cont = mngui.getMDCont();
            if (cont is null)
                doLog("No container");
            else {
                IMDContainer&& test2 = cont.unk;
                if (test2 is null)
                    doLog("Bad test IMDContainer");
                return getContainerWrapper(cont);
            }
        } else
            doLog("No IConfigMngrUI");
        IMDObject&& obj = object;
        IMDParentLink&& link = object.mdParentLink;
        while (link !is null) {
            &&object = link.getMDObject();
            &&link = object.mdParentLink;
        }
        IMDContainer&& cont = obj.unk;
        if (cont is null) {
            doLog("Object not container!!!");
            return null;
        }
        return getContainerWrapper(cont);
    }
    void activateInTree() {
        IConfigMngrUI&& mngui;
        getMDEditService().getConfigMngrUI(mngui, object);
        if (mngui !is null)
            mngui.activateObjInTree(object.id, IID_NULL, true);
    }
    void editProperty(Variant propID) {
        Guid propUuid;
        if (mdclass._findPropId(propID, propUuid)) {
            IMDEditHelper&& peh;
            getMDEditService().getEditHelper(peh, object);
            if (peh !is null)
                peh.editProperty(propUuid);
        }
    }
    void openEditor() {
        IMDEditHelper&& peh;
        getMDEditService().getEditHelper(peh, object);
        if (peh !is null)
            peh.openEditor();
    }
    string get_name() {
        return mdObjName(object);
    }
    array<string>&& types() {
        array<string> result;
        IMDTypedObj&& to = object.unk;
        if (to !is null) {
            Vector t;
            to.typeDomain().types(t);
            if (t.size() > 0) {
                for (GuidRef&& ptr = toGuid(t.start); ptr < t.end; &&ptr = ptr + 1)
                    result.insertLast(ptr.ref);
            }
        }
        return result;
    }
    string synonym(const string& langCode) {
        v8string n;
        IMDBaseObj&& bo = object.unk;
        if (bo is null) {
            Value val;
            object.mdPropVal(synmPropUuid, val);
            ILocalString&& ls = cast<IUnknown>(val.pValue);
            if (ls !is null)
                n = ls.localStrings().getString(langCode);
        } else
            n = bo.getSynonym(langCode);
        return n;
    }
    string get_comment() {
        v8string n;
        IMDBaseObj&& bo = object.unk;
        if (bo is null) {
            Value val;
            object.mdPropVal(descPropUuid, val);
            val.getString(n);
        } else
            n = bo.getDescr();
        return n;
    }
    bool isPropModule(Variant propIdx) {
        Guid propUuid;
        if (mdclass._findPropId(propIdx, propUuid)) {
            IMDEditHelper&& peh;
            getMDEditService().getEditHelper(peh, object);
            if (peh !is null) {
                IMDEditModuleHelper&& emh = peh.unk;
                if (emh !is null) {
                    //dumpVtable(&&emh);
                    Vector v;
                    emh.hasModule(propUuid, v);
                    if (v.end > v.start)
                        return true;
                }
            }
        }
        return false;
    }
    string getModuleText(Variant propIdx) {
        v8string res;
        Guid propUuid;
        if (mdclass._findPropId(propIdx, propUuid)) {
            IMDEditHelper&& peh;
            getMDEditService().getEditHelper(peh, object);
            if (peh !is null) {
                IMDEditModuleHelper&& emh = peh.unk;
                if (emh !is null) {
                    Vector v;
                    emh.hasModule(propUuid, v);
                    if (v.end > v.start) {
                        emh.textOfModule(propUuid, true, res);
                    }
                }
            }
        }
        return res;
    }
    void setModuleText(Variant propIdx, const string& text) {
    }
    
    ITextWindow&& openModule(Variant propIdx) {
        //for test - metadata.current.rootObject.childObject("Документы", 0).childObject("Формы", 0).openModule("Форма")
        Guid propUuid;
        if (mdclass._findPropId(propIdx, propUuid)) {
            IMDEditHelper&& peh;
            getMDEditService().getEditHelper(peh, object);
            if (peh !is null) {
                IMDEditModuleHelper&& emh = peh.unk;
                if (emh !is null) {
                    Vector v;
                    emh.hasModule(propUuid, v);
                    if (v.end > v.start) {
                        ITextEditor&& textEditor;
                        ITextManager&& textMan;
                      #if ver < 8.3.10
                        emh.openModule(textMan, propUuid, true, true, textEditor);
                      #else
                        uint32 o = 0x10101;
                        emh.openModule(textMan, propUuid, o, textEditor);
                      #endif
                        if (textEditor !is null) {
                            TextDoc&& tdoc = textDocStorage.find(textMan);
                            if (tdoc !is null) {
                                TextWnd&& wnd = tdoc.findWnd(textEditor);
                                if (wnd !is null)
                                    return wnd.getComWrapper();
                            }
                        }
                    }
                }
            }
        }
        return null;
    }
    string extPropUUID(Variant propIdx) {
        Guid propUuid;
        if (mdclass._findPropId(propIdx, propUuid)) {
            IMDEditHelper&& peh;
            getMDEditService().getEditHelper(peh, object);
            if (peh !is null)
                return peh.extPropCLSID(propUuid);
        }
        return string();
    }
    IV8ExtProp&& getExtProp(Variant propIdx) {
        Guid propUuid;
        if (mdclass._findPropId(propIdx, propUuid)) {
            IMDEditHelper&& peh;
            getMDEditService().getEditHelper(peh, object);
            if (peh !is null) {
                Guid extPropID = peh.extPropCLSID(propUuid);
                if (extPropID != IID_NULL) {
                    IV8ExtProp extProp(extPropID, peh.extPropEditorCLSID(propUuid));
                    peh.extProp(extProp.object, propUuid);
                    Value val;
                    object.mdPropVal(propUuid, val);
                    if (val.pValue !is null) {
                        IMDExtObj&& extObj = val.pValue.unk;
                        URL u;
                        //u.dtor();
                        extObj.url(u);
                        extProp._url = u.url;
                    }
                    return extProp;
                }
            }
        }
        return null;
    }
    IV8DataFile&& saveToFile(IV8DataFile&& fileIn = null) {
        return saveObject(fileIn, object);
    }
    bool loadFromFile(IV8DataFile&& file) {
        return loadObject(file, object);
    }
    Variant get_picture() {
        if (pict.vt == VT_EMPTY) {
            IMDEditHelper&& peh;
            getMDEditService().getEditHelper(peh, object);
            if (peh !is null) {
                peh.getTreeItemInfo(object.mdClass.id, oneMDTreeItemInfo);
                pict = image2pict(oneMDTreeItemInfo.image);
            }
        }
        return pict;
    }
    IObjectProperties&& get_props() {
        return null;
    }
};
MDTreeItemInfo oneMDTreeItemInfo;

class IV8ExtProp {
    IV8ExtProp(const Guid& did, const Guid& eid) {
        dataID = did;
        editorID = eid;
    }
    protected Guid dataID, editorID;
    IUnknown&& object;
    string _url;
    string get_idData() { return dataID; }
    string get_idEditor() { return editorID; }
    string get_title() {
        IDocument&& doc = object.unk;
        if (doc !is null)
            return doc.getTitle().str;
        return string();
    }
    bool get_isReadOnly() {
        IDocument&& doc = object.unk;
        return doc is null ? true : doc.getReadOnly();
    }
    IV8DataFile&& saveToFile(IV8DataFile&& file = null) {
        return saveObject(file, object);
    }
    bool loadFromFile(IV8DataFile&& file) {
        return loadObject(file, object);
    }
    Variant getForm() {
        Variant result;
        Value val;
        ICustomFormDesigner&& dsn = object.unk;
        if (dsn is null)
            &&val.pValue = object.unk;
        else {
            IUnknown&& form;
            dsn.getForm(form);
            if (form !is null)
                &&val.pValue = form.unk;
        }
        val2var(val, result);
        return result;
    }
};

IV8DataFile&& saveObject(IV8DataFile&& file, IUnknown&& obj) {
    if (file is null) {
        IFileEx&& f;
        currentProcess().createByClsid(CLSID_MemoryFile, IID_IFileEx, f);
        &&file = IV8DataFile(f);
    }
    if (file.file is null) {
        setComException("Файл уже закрыт");
        return null;
    }
    IPersistableDocument&& pdoc = obj.unk;
    ExceptionCatcher catcher;
    CppCatch c("class core::Exception", ExceptionHandler(catcher.handle));
    if (pdoc !is null)
        pdoc.save(file.file);
    else {
        IPersistableObject&& pobj = obj.unk;
        if (pobj !is null) {
            IStreamPersistenceStorage&& stg;
            currentProcess().createByClsid(CLSID_StreamOutPersistenceStorage, IID_IStreamPersistenceStorage, stg);
            stg.setFile(file.file);
            IOutPersistenceStorage&& s = stg.unk;
            pobj.serialize(s);
            stg.close();
        }
    }
    if (catcher.hasException)
        setComException(catcher.errStr);
    return file;
}

bool loadObject(IV8DataFile&& file, IUnknown&& obj) {
    if (file is null || file.file is null) {
        setComException("Нет файла для загрузки");
        return false;
    }
    IPersistableDocument&& pdoc = obj.unk;
    ExceptionCatcher catcher;
    CppCatch c("class core::Exception", ExceptionHandler(catcher.handle));
    
    if (pdoc !is null)
        pdoc.load(file.file);
    else {
        IPersistableObject&& pobj = obj.unk;
        if (pobj !is null) {
            IStreamPersistenceStorage&& stg;
            currentProcess().createByClsid(CLSID_StreamInPersistenceStorage, IID_IStreamPersistenceStorage, stg);
            stg.setFile(file.file);
            IInPersistenceStorage&& s = stg.unk;
            pobj.deserialize(s);
            stg.close();
        }
    }
    if (catcher.hasException) {
        setComException(catcher.errStr);
        return false;
    }
    return true;
}

class IObjectProperties {
    int get_count() {
        return 0;
    }
    string propName(int idx) {
        return "";
    }
    Variant getValue(Variant idx) {
        return Variant();
    }
    void setValue(Variant idx, Variant val) {
    }
    void activateProperty(Variant idx) {
    }
};

IMDContainer&& getIBMDCont() {
#if test = 0
    return getDefaultInfoBase().getConfigMgr().getMDCont();
#else
    IInfoBase&& ib = getDefaultInfoBase();
    if (!checkInterface(&&ib))
        return null;
    IConfigMngr&& mng = ib.getConfigMgr();
    if (!checkInterface(&&mng))
        return null;
    IMDContainer&& mdcont = mng.getMDCont();
    if (!checkInterface(&&mdcont))
        return null;
    return mdcont;
#endif
}

IMDContainer&& editedMetaDataCont() {
#if test = 0
    IConfigMngrUI&& pmdUI;
    getMDEditService().getTemplatesMainConfigMngrUI(pmdUI);
    return pmdUI.getMDCont();
#else
    IMDEditService&& mdes = getMDEditService();
    if (!checkInterface(&&mdes))
        return null;
    IConfigMngrUI&& pmdUI;
    mdes.getTemplatesMainConfigMngrUI(pmdUI);
    if (!checkInterface(&&pmdUI))
        return null;
    IMDContainer&& mdcont = pmdUI.getMDCont();
    if (!checkInterface(&&mdcont))
        return null;
    return mdcont;
#endif
}

string mdObjName(IMDObject&& object) {
    v8string n;
    IMDBaseObj&& bo = object.unk;
    if (bo is null) {
        Value val;
        object.mdPropVal(namePropUuid, val);
        val.getString(n);
    } else {
        n = bo.getName();
    }
    return n;
}

string mdObjFullName(IMDObject&& object) {
    if (object is null)
        return "no_object";
    array<string> names;
    for (;;) {
        IMDParentLink&& link = object.mdParentLink;
        if (link is null)
            break;
        names.insertLast(mdObjName(object));
        string clsName = stringFromAddress(object.mdClass.getName(1));
        if (!clsName.isEmpty())
            names.insertLast(clsName);
        &&object = link.getMDObject();
    }
    if (names.length == 0)
        return stringFromAddress(object.mdClass.getName(1));
    names.reverse();
    return join(names, ".");
}

string mdPropName(const Guid& mdPropID) {
    return stringFromAddress(mdService.mdProp(mdPropID).ref.nameRus);
}

TrapVirtualStdCall trOpenConfig;
void setTrapOnOpenConfig() {
    trOpenConfig.setTrap(getMDEditService(), IMDEditService_openConfig, trapOpenConfig);
}
void trapOpenConfig(IMDEditService& pService, IConfigMngrUI& mngr, IMDContainer& container) {
    // Перехват на открытие контейнера метаданных. Помимо конфигурации ИБ и рабочей базы
    // это также все открываемые cf, epf, erf файлы, так как они содержат свои контейнеры
    // метаданных.
    // Создаем для открываемой конфгурации объект и добавляем его в список
    IV8MDContainer&& cont = getContainerWrapper(container);
    trOpenConfig.swap();
    pService.openConfig(mngr, container);
    trOpenConfig.swap();
    //Print("Open container " + cont.get_identifier());
    //Message("Opened " + oneDesigner._metadata.get_openedCount());
}

enum MetaDataEvents {
    //[helpstring("Добавление")]
    mdeAdd = 0,
    //[helpstring("Изменение свойства")]	
    mdeChangeProp,
    //[helpstring("Удаление")]			
    mdeDelete,
    //[helpstring("Изменение объекта")]	
    mdeChange,
    //[helpstring("Перед сохранением")]	
    mdeSave,
    //[helpstring("Закрытие UI")]			
    mdeClose,
    //[helpstring("После сохранения")]	
    mdeAfterSave,
    //[helpstring("Открытие UI")]			
    mdeOpen,
};

class IV8MetaDataEvent {
    MetaDataEvents      _kind;
    bool                _request;
    IV8MDObject&&       _obj;
    IV8MDObject&&       _parentObj;
    IV8MDProperty&&     _prop;
    bool                result;
    IV8MDContainer&&    _container;
}

class MetaDataEvent {
    void onEvent(const Guid&in eventID, MDEventInfo& info, IUnknown& obj) {
        //Message("Metadata event " + int(info.kind));
        // Обработка событий метаданных.
        // Надо послать оповещение подписчикам
        IDispatch&& mdd = createDispatchFromAS(&&oneDesigner._metadata);
        if (oneDesigner._events._hasHandlers(mdd, "MetaDataEvent")) {
            IV8MetaDataEvent mde;
            mde._kind = MetaDataEvents(info.kind);
            mde._request = info.request;
            mde.result = info.result;
            &&mde._obj = getMDObjectWrapper(info.object);
            &&mde._parentObj = getMDObjectWrapper(info.parent);
            &&mde._prop = getMDPropWrapper(mdService.mdProp(info.changedPropId));
            if (mde._obj !is null)
                &&mde._container = mde._obj.get_container();
            if (mde._container is null && info.parent !is null)
                &&mde._container = mde._parentObj.get_container();

            array<Variant> args(1);
            args[0].setDispatch(createDispatchFromAS(&&mde));
            oneDesigner._events.fireEvent(mdd, "MetaDataEvent", args);
            info.result = mde.result;
        }
        // Отдельно отработаем закрытие контейнера. Удалим соответствующий
        if (info.kind == emdClose && !info.request) {
            // объект-обёртку из нашего списка.
            //Print("Close container");
            IMDContainer&& container = cast<IMDContainer>(info.object);
            contFind.remove(container.self);
            for (uint i = 0, im = contWrappers.length; i < im; i++) {
                IV8MDContainer&& cont = contWrappers[i];
                if (cont._container() is container) {
                    //Print("Remove at " + i + " " + cont.get_identifier());
                    cont._setClosed();
                    contWrappers.removeAt(i);
                    break;
                }
            }
            //Print("Opened " + oneDesigner._metadata.get_openedCount());
        }
    }
};

NoCaseMap<Variant> pictCache;

Variant image2pict(IUnknown&& img) {
    Variant res;
    IImage&& image = img;
    if (image is null)
        return res;
    string key;
    IV8Picture&& iPict;
    GlyphRef&& gl;
    IGlyph&& glyph = image.unk;
    if (glyph !is null) {
        &&gl = toGlyph(image.self);
        &&iPict = toIV8Picture(mem::dword[gl.ref.block.self + pictOffset]);
        key = "," + gl.ref.size.cx + "," + gl.ref.size.cy + "," + gl.ref.point.x + "," + gl.ref.point.y;
    } else
        &&iPict = toIV8Picture(mem::int_ptr[image.self + pictOffset]);
    iPict.AddRef();
    key = "" + iPict.self + key;
    auto find = pictCache.find(key);
    if (!find.isEnd())
        return find.value;
    V8Picture v8pict;
    v8pict.kind = 3;
    &&v8pict.picture = iPict;
    if (gl !is null) {
        v8pict.isGlyph = true;
        v8pict.szGlyph.cx = gl.ref.size.cx;
        v8pict.szGlyph.cy = gl.ref.size.cy;
        v8pict.ptGlyph.x = gl.ref.point.x;
        v8pict.ptGlyph.y = gl.ref.point.y;
    } else
        v8pict.isGlyph = false;
    IV8PictureValue&& iv8pict;
    currentProcess().createByClsid(CLSID_V8PictureValue, IID_IV8PictureValue, iv8pict);
    iv8pict.setPicture(v8pict);
    Value val;
    &&val.pValue = iv8pict.unk;
    val2var(val, res);
    pictCache.insert(key, res);
    return res;
}

IMDContainer&& getMasterContainer(IMDContainer&& cont) {
    //dumpVtable(&&cont);
    for (IMDContainer&& master = cont.masterContainer(); master !is null; &&master = cont.masterContainer())
        &&cont = master;
    return cont;
}

// Тестовая процедура обхода дерева метаданных
uint mdObjCount = 0;
void walkMD(IV8MDObject&& obj) {
    mdObjCount++;
    string test = obj.name;
    //Message(obj.name);
    IV8MDClass&& mdc = obj.mdclass;
    for (uint k = 0, km = mdc.childsClassesCount; k < km; k++) {
        Variant mdcIdx;
        mdcIdx.vt = VT_UI4;
        mdcIdx.dword = k;
        for (uint i = 0, im = obj.childObjectsCount(mdcIdx); i < im; i++) {
            Variant mdoIdx;
            mdoIdx.vt = VT_UI4;
            mdoIdx.dword = i;
            walkMD(obj.childObject(mdcIdx, mdoIdx));
        }
    }
}

