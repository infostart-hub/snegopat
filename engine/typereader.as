/*  typereader.as
  Чтение инфы из типов
*/
#pragma once
#include "../../all.h"


// Один глобальный приемник инфомации об элементе типа,
// чтобы не дергать каждый раз конструктор/деструктор. Даже если не удалось
// полностью правильно воссоздать деструктор и какую-то память не освобождаем,
// это произойдет только один раз. Инициализировать сразу как глобальный нельзя, так как
// модуль, в котором лежит код для инициализации  в это время еще не готов.
TypeContextInfoItem typeContextInfoItem;
ContextValueInfo    contextValueInfo;
FieldInfo           oneFieldInfo;

class BuiltinFuncItem : SmartBoxInsertableItem, MethodInsertable {
    BuiltinFuncItem(const string& name, uint pc) {
        super(name, imgPublicMethod);
        paramsCount = pc;
        isFunction = true;
    }
    void textForTooltip(string& text) {
        text = "Встроенная функция §" + d.descr;
    }
};

class TypeNameItem : SmartBoxInsertableItem {
    int hasCtorParams = -1;
    TypeNameItem(const string& name) {
        super(name, imgType);
    }
    void textForInsert(string&out text) {
        if (hasCtorParams < 0) {
            hasCtorParams = 0;
            auto fnd = oneDesigner.__mapTypeNames.find(d.descr);
            if (!fnd.isEnd()) {
                IType&& type;
                currentProcess().createByClsid(fnd.value, IID_IType, type);
                if (type !is null) {
                    for (uint i = 1; i < 10; i++) {
                        if (type.hasCtor(i)) {
                            hasCtorParams = 1;
                            break;
                        }
                    }
                }
            }
        }
        text = d.descr;
        if (hasCtorParams > 0)
            text += "¦";
        if (getIntelliSite().isLineTailEmpty())
            text += ";";
    }
    void textForTooltip(string& text) {
        text = "Тип §" + d.descr;
    }
    void afterInsert(TextWnd&& editor) override {
        if (hasCtorParams > 0) {
            IntelliSite&& isite = getIntelliSite();
            isite.addItem(ItemAfterType());
            if (d.descr == "Запрос") {
                isite.addItem(ItemAfterQueryType(0));
                isite.addItem(ItemAfterQueryType(1));
                isite.addItem(ItemAfterQueryType(2));
            }
            isite.show(editor, "");
        }
    }
};

class ItemAfterType : SmartBoxInsertableItem {
    ItemAfterType() {
        super("(...)", imgParenthesis);
        d.hotOrder = uint(-1);
    }
    void textForTooltip(string& text) {
        text = "Вставить скобки";
    }
    void textForInsert(string& out text) {
        text = "(¦)";
    }
    void afterInsert(TextWnd&& editor) {
    #if ver >= 8.3.4
        showV8MethodsParams();
    #endif
    }
};

class ItemAfterQueryType : SmartBoxInsertableItem {
    int type;
    ItemAfterQueryType(int t) {
        type = t;
        string name = "Конструктор запроса";
        if (type == 1)
            name += " + Выполнить + Выбрать";
        else if (type == 2)
            name += " + Выполнить + Выгрузить";
        super(name, imgParenthesis);
        d.hotOrder = uint(-1);
    }
    void textForTooltip(string& text) {
        text = "Вставить скобки и вызвать конструктор запроса";
    }
    void textForInsert(string& out text) {
        if (type == 0)
            text = "(¦)";
        else
            text = "(";
        d.descr = getIntelliSite().getCurrentLine();
    }
    void afterInsert(TextWnd&& editor) {
        string text;
        string queryText = oneDesigner._snegopat.parseTemplateString("<?"", ТекстЗапроса>", "Введите запрос");
        if (queryText.length > 0) {
            auto res = d.descr.match(RegExp("(?i)^\\s*(\\S+)\\s*=\\s*(?:Новый|New)\\s+(?:Запрос|Query)"));
            string varName, setParams;
            if (res.matches > 0)
                varName = res.text(0, 1);
            if (type == 1) {
                text = ");setParams\n"
                    "varNameРезультат = varName.Выполнить();\n"
                    "varNameВыборка = varNameРезультат.Выбрать();\n"
                    "Пока varNameВыборка.Следующий() Цикл\n"
                    "КонецЦикла";
            } else if (type == 2) {
                text = ");setParams\n"
                    "varNameРезультат = varName.Выполнить().Выгрузить()";
            }
            &&res = queryText.match(RegExp("&(\\S+)"));
            if (res.matches > 0) {
                NoCaseMap<int> params;
                for (uint i = 0; i < res.matches; i++) {
                    params.insert(res.text(i, 1), 0);
                }
                for (auto it = params.begin(); it++; )
                    setParams += "\nvarName.УстановитьПараметр(\"" + it.key + "\", );";
            }
            text.replace("setParams", setParams);
            text.replace("varName", varName);
            text = "\"" + queryText + "\"" + text;
        } else
            text += ")";
        insertInSelection(editor.ted, editor.textDoc.tm, editor.textDoc.itm, text, true, true);
    }
};

class GlobalContextMethod : SmartBoxInsertableItem, MethodInsertable {
    GlobalContextMethod(const string& name, uint pc, bool isf) {
        super(name, imgMethodWithKey);
        paramsCount = pc;
        isFunction = isf;
    }
    void textForTooltip(string& text) {
        text = "Метод глобального контекста §" + d.descr;
    }
};

class GlobalContextProp : SmartBoxInsertableItem {
    GlobalContextProp(const string& name) {
        super(name, imgVarWithKey);
    }
    void textForTooltip(string& text) {
        text = "Свойство глобального контекста §" + d.descr;
    }
};

class SysEnum : SmartBoxInsertableItem {
    SysEnum(const string& name) {
        super(name, imgEnums);
    }
    void textForTooltip(string& text) {
        text = "Системное перечисление §" + d.descr;
    }
    void textForInsert(string&out text) {
        text = d.descr + ".";
    }
    void afterInsert(TextWnd&& editor) {
        showV8Assist();
    }
};

class ExtContextMethod : SmartBoxInsertableItem, MethodInsertable {
    string context;
    ExtContextMethod(const string& name, uint pc, bool isf, const string& ctx) {
        super(name, imgCtxMethod);
        paramsCount = pc;
        isFunction = isf;
        context = ctx;
    }
    void textForTooltip(string& text) {
        text = "Метод " + context + "::" + d.descr + "()";
    }
};

class ExtContextProp : SmartBoxInsertableItem {
    string context;
    ExtContextProp(const string& name, const string& ctx) {
        super(name, imgCtxVar);
        context = ctx;
    }
    void textForTooltip(string& text) {
        text = "Свойство " + context + "::" + d.descr;
    }
};

enum typeOfStockGroups {
    stockBuiltin,           // Встроенные в язык методы
    stockTypeNames,         // Имена типов для Новый
    stockGlobalProc,        // Процедуры глобального контекста
    stockGlobalFunc,        // Функции глобального контекста
    stockGlobalFuncInExpr,  // Функции глобального контекста, имеющие смысл только в выражениях (пока пусто)
    stockGlobalProps,       // Свойства глобального контекста
    stockSysEnums,          // Системные перечисления
    stockLast
};

enum langGroups { langEng, langRus, langCmn, langLast };

enum StockContextGroups {
    scgProcedure,
    scgFunction,
    scgProperty,
    scgLast
};

// Тут будут лежать все предподготовленные группы стоковых элементов,
// разбитые по сортам и языкам
grid<array<SmartBoxItem&&>> v8stock(stockLast, langLast);
// Тут будут перечислены имена всех глобальных свойств, будут нужны для выявления
// локальных переменных.
NoCaseSet existingGlobalProps,
    // системных перечислений
    sysEnums,
    // встроенных функций
    builtinFuncs;

void addStockGroups(IntelliSite& site, typeOfStockGroups ts) {
    if (useLangs & useLangEng != 0)
        site.addItemGroup(v8stock[ts, langEng]);
    if (useLangs & useLangRus != 0)
        site.addItemGroup(v8stock[ts, langRus]);
    site.addItemGroup(v8stock[ts, langCmn]);
}

void addAllStock(IntelliSite& site) {
    for (uint i = 0; i < stockLast; i++) {
        for (uint l = 0; l < langLast; l++) {
            site.addItemGroup(v8stock[i, l]);
        }
    }
}

void addBuiltinFunc(IntelliSite& site) {
    addStockGroups(site, stockBuiltin);
}

void addTypeNames(IntelliSite& site) {
    addStockGroups(site, stockTypeNames);
}

void prepareV8StockItems() {
    //uint t1 = GetTickCount();
    // Инициализируем переменные для приема данных
    typeContextInfoItem.init();
    contextValueInfo.init();
    cellFormat.init();
    oneFieldInfo.init();
    // Прочитаем информацию о встроенных функциях
    readBuiltinFuncs();
    // О создаваемых типах для Новый
    readTypeNames();
    // Глобальные методы и свойства
    readGlobals();
    //uint t2 = GetTickCount();
    //Message("V8Stock прочитано за " + (t2 - t1) + " msec");
}

// Получение информации о встроенных функциях
void readBuiltinFuncs() {
    ITypeContextInfo&& taInfo;
    currentProcess().createByClsid(BuiltinFuncInfo, IID_ITypeContextInfo, taInfo);
    for (uint i = 0, items = taInfo.count(); i < items; i++) {
        taInfo.info(i, typeContextInfoItem, 0);
        // Если в настройках 1С включено "Отображать ключевые слова в списке",
        // то сюда приходят и все ключевые слова. Чтобы их не навставлять в список,
        // проверяем, что это функция
        if (typeContextInfoItem.isMethod) {
            string nameEng = typeContextInfoItem.name;
            uint params = typeContextInfoItem.params;
            taInfo.info(i, typeContextInfoItem, 1);
            string nameRus = typeContextInfoItem.name;
            builtinFuncs.insert(nameEng);
            builtinFuncs.insert(nameRus);
            if (nameEng == nameRus)
                v8stock[stockBuiltin, langCmn].insertLast(BuiltinFuncItem(nameEng, params));
            else {
                v8stock[stockBuiltin, langEng].insertLast(BuiltinFuncItem(nameEng, params));
                v8stock[stockBuiltin, langRus].insertLast(BuiltinFuncItem(nameRus, params));
            }
        }
    }
}

// Чтение названий имен типов для Новый
void readTypeNames() {
    ITypeNameInfo&& tInfo;
    currentProcess().createByClsid(TypeNameInfoSource, IID_ITypeNameInfo, tInfo);
    for (uint i = 0, mi = tInfo.count(); i < mi; i++) {
        string nameEng = tInfo.name(i, 0);
        string nameRus = tInfo.name(i, 1);
        if (nameEng == nameRus) {
            v8stock[stockTypeNames, langCmn].insertLast(TypeNameItem(nameEng));
        } else {
            v8stock[stockTypeNames, langEng].insertLast(TypeNameItem(nameEng));
            v8stock[stockTypeNames, langRus].insertLast(TypeNameItem(nameRus));
        }
    }
}

void readGlobals() {
    // Получим все классы, входящие в категорию "глобальный контекст"
    Vector vecs;
    currentProcess().getCategoryClasses(vecs, IID_IGlobalContextDef);
    if (vecs.start == vecs.end)
        return;
    // Некоторые методы и свойства дублируются в разных контекстах, видимо
    // это разные реализации для разных режимов работы. Поэтому надо отслеживать дубли.
    NoCaseSet allMethods;
    GuidRef&& pClsid = toGuid(vecs.start);
    // Будем по очереди создавать все глобальные контексты
    while (pClsid < vecs.end) {
        IContextDef&& ctx;
        currentProcess().createByClsid(pClsid.ref, IID_IContextDef, ctx);
        IContextDefExt&& ext = ctx.unk;
        // Переберем методы
        for (uint i = 0, im = ctx.methsCount(); i < im; i++) {
            bool isFunc = ctx.hasRetVal(i);
            int pc = ctx.paramsCount(i);
            typeOfStockGroups ts = isFunc ? stockGlobalFunc : stockGlobalProc;
            string nameEng(ctx.methName(i, 0));
            string nameRus(ctx.methName(i, 1));
            if (nameRus == nameEng) {
                if (allMethods.insert(nameEng)) // Такого ключа еще не было в наборе
                    v8stock[ts, langCmn].insertLast(GlobalContextMethod(nameEng, pc, isFunc));
            } else {
                if (allMethods.insert(nameEng))
                    v8stock[ts, langEng].insertLast(GlobalContextMethod(nameEng, pc, isFunc));
                if (allMethods.insert(nameRus)) // Такого ключа еще не было в наборе
                    v8stock[ts, langRus].insertLast(GlobalContextMethod(nameRus, pc, isFunc));
            }
        }
        // Переберем свойства
        for (uint i = 0, im = ctx.propsCount(); i < im; i++) {
            // Попробуем выяснить, а вдруг это перечисление
            CreateSmartBoxItem&& creator = createGlobalPropItem;
            typeOfStockGroups ts = stockGlobalProps;
            if (ext !is null) {
                ext.propInfo(i, contextValueInfo);
                if (!contextValueInfo.isMutable && 1 == contextValueInfo.typeDomainPattern.typesCount()) {
                    Vector tt;
                    contextValueInfo.typeDomainPattern.types(tt);
                    IType&& type;
                    currentProcess().createByClsid(toGuid(tt.start).ref, IID_IType, type);
                    if (type !is null) {
                        IValue&& val;
                        type.createValue(val);

                        if (val !is null) {
                            IEnumValCreator&& eval = val.unk;
                            if (eval !is null) {
                                &&creator = createSysEnumItem;
                                ts = stockSysEnums;
                                sysEnums.insert(contextValueInfo.nameEng.str);
                                sysEnums.insert(contextValueInfo.nameRus.str);
                            }
                        }
                    }
                }
            }
            string nameEng(ctx.propName(i, 0));
            string nameRus(ctx.propName(i, 1));
            if (nameEng == nameRus) {
                if (existingGlobalProps.insert(nameEng))
                    v8stock[ts, langCmn].insertLast(creator(nameEng));
            } else {
                if (existingGlobalProps.insert(nameEng))
                    v8stock[ts, langEng].insertLast(creator(nameEng));
                if (existingGlobalProps.insert(nameRus))
                    v8stock[ts, langRus].insertLast(creator(nameRus));
            }
        }
        &&pClsid = pClsid + 1;
    }
}

funcdef SmartBoxItem&& CreateSmartBoxItem(const string& name);
SmartBoxItem&& createGlobalPropItem(const string& name) { return GlobalContextProp(name); }
SmartBoxItem&& createSysEnumItem(const string& name) { return SysEnum(name); }

// Функция чтения состава какого-либо стокового контекста и создания для него групп элементов для списка
void readContextDef(IContextDef&& pDef, array<array<SmartBoxItem&&>>& store, const string& context) {
    for (uint i = 0, im = pDef.methsCount(); i < im; i++) {
        uint lang = useLangs;
        string nameEn(pDef.methName(i, 0));
        string nameRu(pDef.methName(i, 1));
        if (nameRu.isEmpty() || nameRu == nameEn)
            lang = 1;
        bool isFunc = pDef.hasRetVal(i);
        uint si = isFunc ? scgFunction : scgProcedure;
        if (0 != (lang & useLangEng))
            store[si].insertLast(ExtContextMethod(nameEn, pDef.paramsCount(i), isFunc, context));
        if (0 != (lang & useLangRus))
            store[si].insertLast(ExtContextMethod(nameRu, pDef.paramsCount(i), isFunc, context));
    }

    for (uint i = 0, im = pDef.propsCount(); i < im; i++) {
        uint lang = useLangs;
        string nameEn(pDef.propName(i, 0));
        string nameRu(pDef.propName(i, 1));
        if (nameRu.isEmpty() || nameRu == nameEn)
            lang = 1;
        if (0 != (lang & useLangEng))
            store[scgProperty].insertLast(ExtContextProp(nameEn, context));
        if (0 != (lang & useLangRus))
            store[scgProperty].insertLast(ExtContextProp(nameRu, context));
    }
}


// Функция пробует заполучить из неизвестного интерфейса контекстные интерфейсы и прочитать их
void readUnknown(IUnknown&& pUnk, array<array<SmartBoxItem&&>>& store, const string& context) {
    IContextDef&& def = pUnk;
    if (def is null) {
        IContext&& ctx = pUnk;
        if (ctx !is null)
            &&def = ctx;
    }
    if (def !is null)
        readContextDef(def, store, context);
}

void readType(const Guid& clsid, ITypesInfoProvider& pTIP, array<array<SmartBoxItem&&>>& store, const string& context) {
    IDataProviderInfo&& dpi;
    pTIP.dataProviderInfo(dpi, clsid);
    if (dpi !is null)
        readUnknown(dpi, store, context);
    else {
        IUnknown&& pUnk;
        if (currentProcess().createByClsid(clsid, IID_IUnknown, pUnk)) {
            if (pUnk !is null)
                readUnknown(pUnk, store, context);
        }
    }
}
