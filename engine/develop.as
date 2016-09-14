/* develop.as
    Разные штуки для разработчиков и исследователей
*/
#pragma once
#include "../../all.h"

// Объект этого класса будет доступен как свойство develop объекта Designer

class Develop {
    bool cmdTrace = false;

    void dumpV8typesToDts() {
        V8Dumper d;
        d.dump();
    }
	void dumpSnegApiToDts() {
		dumpSnegApi();
	}
};

class V8Dumper {
    string content;
    NoCaseMap<string> typeGuidToNames;
	NoCaseSet allNames;
    array<string> newNames;

    void dump() {
        // Откроем файл для дампа
        IFile&& file;
        URL url("file://" + myFolder + "v8.d.ts");
        IFileSystem&& fs = getFSService();
        {
            ExceptionCatcher catcher;
            CppCatch c("class core::Exception", ExceptionHandler(catcher.handle));
            fs.openURL(file, url, fomOut | fomTruncate);
            if (catcher.hasException) {
                Print("dont open file");
                return;
            }
        }
        // Пропишем то, что подключаем сами
        content = "interface V8Global{ connectGlobals(obj);}\ndeclare var global: V8Global;\n";
        // Переберём подключенные глобальные контексты
        for (auto it = oneDesigner.__globalContextes.begin(); it++;) {
            IContext&& ctx;
            currentProcess().createByClsid(Guid(it.key), IID_IContext, ctx);
            dumpContextDef(ctx.staticContextDef(), "", "");
        }
		// Переберём все типы
		Vector vec;
		SCOM_Process&& proc = currentProcess();
		proc.getCategoryClasses(vec, IID_IType);
		for (GuidRef&& ptr = toGuid(vec.start); ptr < vec.end; &&ptr = ptr + 1)
			getGuidTypeName(ptr.ref);
        // Теперь создадим специализации для v8new
        dumpV8New();
        utf8string str = content.toUtf8();
        file.write(str.ptr, str.length);
        dumpSnegApi();
    }
    void dumpContextDef(IContextDef&& ctx, const string& name0, const string& name1) {
		if (!name1.isEmpty() && !allNames.insert(name0))
			return;
		if (!name1.isEmpty() && name1 != name0 && !allNames.insert(name1))
			return;
		NoCaseSet propNames;
        // Попробуем получить имена
        string prefixVar, prefixFunc;
        array<string> lines;
        if (!name0.isEmpty()) {
            lines.insertLast("interface " + name0 + " {");
            prefixVar = prefixFunc = "\t";
        } else {
            prefixVar = "declare var ";
            prefixFunc = "declare function ";
        }
        if (ctx !is null) {
            IContextDefExt&& extCtx = cast<IUnknown>(ctx);
            if (extCtx is null) {
                IContext&& c = cast<IUnknown>(ctx);
                if (c !is null)
                    &&extCtx = cast<IUnknown>(c.staticContextDef());
            }
            // Переберём свойства
            for (uint idx = 0, m = ctx.propsCount(); idx < m; idx++) {
                string prop0(ctx.propName(idx, 0)), prop1(ctx.propName(idx, 1)), typeName;
                if (extCtx !is null) {
                    ContextValueInfo cvi;
                    cvi.init();
                    extCtx.propInfo(idx, cvi);
                    getTypeName(cvi.typeDomainPattern, typeName);
                    cvi.done();
                }
                lines.insertLast(prefixVar + prop0 + typeName + ";");
				propNames.insert(prop0);
				if (!prop1.isEmpty() && prop1 != prop0) {
					lines.insertLast(prefixVar + prop1 + typeName + ";");
					propNames.insert(prop1);
				}
            }
            // Переберём методы
            for (uint idx = 0, m = ctx.methsCount(); idx < m; idx++) {
                string meth0(ctx.methName(idx, 0)), meth1(ctx.methName(idx, 1)), typeName;
				if (propNames.contains(meth0) || propNames.contains(meth1))
					continue;
                if (ctx.hasRetVal(idx)) {
                    if (extCtx !is null) {
                        ContextValueInfo cvi;
                        cvi.init();
                        extCtx.methRetInfo(idx, cvi);
                        getTypeName(cvi.typeDomainPattern, typeName);
                        cvi.done();
                    }
                } else
                    typeName = ": void";
                string decl = "(" + (ctx.paramsCount(idx) > 0 ? "... params" : "") + ")" + typeName + ";";
                lines.insertLast(prefixFunc + meth0 + decl);
                if (!meth1.isEmpty() && meth1 != meth0)
                    lines.insertLast(prefixFunc + meth1 + decl);
            }
        }
        if (!name0.isEmpty())
            lines.insertLast("}");
        if (!name1.isEmpty() && name1 != name0)
            lines.insertLast("declare type " + name1 + " = " + name0 + ";");
        content += join(lines, "\n") + "\n";
    }
    
    void dumpV8New() {
        for (uint i = 0; i < newNames.length; i++)
            newNames[i] = "declare function v8New(name:\"" + newNames[i] + "\",... params): " + newNames[i] + ";";
        content += join(newNames, "\n") + "\n";
    }
    void getTypeName(TypeDomainPattern& types, string& typeName) {
        typeName = "";
        Vector tt;
        types.types(tt);
        if (tt.start != 0) {
            bool hasAny = false;
            for (GuidRef&& guid = toGuid(tt.start); guid < tt.end; &&guid = guid + 1) {
                string oneType = getGuidTypeName(guid.ref);
                if (!oneType.isEmpty()) {
                    if (!typeName.isEmpty())
                        typeName += " | ";
                    typeName += oneType;
                } else
                    hasAny = true;
            }
            if (!typeName.isEmpty()) {
                typeName.insert(0, ": ");
                if (hasAny)
                    typeName += " | any";
            }
        }
    }
    string getGuidTypeName(const Guid& guid) {
        string strGuid = guid;
        auto fnd = typeGuidToNames.find(strGuid);
        if (!fnd.isEnd())
            return fnd.value;
        IType&& type;
        currentProcess().createByClsid(guid, IID_IType, type);
        string typeName = "";
        if (type !is null) {
            switch (type.getTypeKind()) {
            case tkBoolean:
                typeName = "boolean";
                break;
            case tkNumeric:
                typeName = "number";
                break;
            case tkString:
                typeName = "string";
                break;
            case tkDate:
                typeName = "Date";
                break;
            case tkObject:
            {
                string name0(type.getTypeString(0)),
                    name1(type.getTypeString(1));
                if ("Array" ==  name0)
                    name0 += "V8";
                else if ("FormItems" == name0)
                    name1 += "Упр";
                typeName = name0;
                typeGuidToNames.insert(strGuid, typeName);
				IContextDef&& ctx = cast<IUnknown>(type);
				if (ctx is null) {
					IValue&& val;
					type.createValue(val);
					if (val !is null) {
						&&ctx = cast<IUnknown>(val);
						if (ctx is null) {
							IContext&& cont = cast<IUnknown>(val);
							if (cont !is null) {
								&&ctx = cont.staticContextDef();
								if (ctx is null)
									&&ctx = cont;
							}
						}
					}
				}
				if (string(",CommonModule,MngSrvDataCompositionAreaTemplateField,ConfigurationMetadataObject,DataCompositionAppearanceTemplateLib,GraphicalSchemaItemSwitchCases,UnknownObject,CommandGroup,Action,").find("," + name0 + ",") >= 0)
					&&ctx = null;
                // Проверим, можно ли создать объект этого типа в Новый
                bool creatable = false;
				if (ctx !is null) {
					for (uint k = 0; k < 10; k++) {
						if (type.hasCtor(k)) {
							creatable = true;
							break;
						}
					}
				}
				if (creatable) {
                    newNames.insertLast(name0);
                    newNames.insertLast(name1);
                } else
                    name1.empty();
                dumpContextDef(ctx, name0, name1);
            }
            }
        }
        typeGuidToNames.insert(strGuid, typeName);
        return typeName;
    }
};
