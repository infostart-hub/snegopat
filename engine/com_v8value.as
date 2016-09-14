/* com_v8value.as
    Обёртка для работы из аддинов со значениями 1С.
*/
// Данные строки нужны только для среды разработки и вырезаются препроцессором
#pragma once
#include "../../all.h"

class V8Value {
    Value value;
    V8Value(Variant& v) {
        var2val(v, value);
    }
    //[helpstring("Название типа")]
    string typeName(long language = 0) {
        if (value.pValue !is null)
            return string(value.pValue.getType().getTypeString(language));
        return string();
    }
    //[helpstring("Строковое представление")]
    string presentation() {
        v8string res;
        value.getString(res);
        return res;
    }
    //[propget, helpstring("Это объект?")]
    bool get_isObject() {
        IContext&& ctx = cast<IUnknown>(value.pValue);
        return ctx !is null;
    }
    //[helpstring("Список методов/свойств")]
    string contextInfo() {
        if (value.pValue is null)
            return string();
        // Получим имя типа
        array<string> result;
        IType&& type = value.pValue.getType();
        result.insertLast("Имя типа: " + string(type.getTypeString(1)));
        result.insertLast("Guid типа: " + type.getClsid());
        IPersistableObject&& pers = cast<IUnknown>(value.pValue);
        if (pers !is null)
            result.insertLast("Guid сериализации: " + pers.getCLSID());
        IContext&& ct = cast<IUnknown>(value.pValue);
        if (ct !is null) {
            result.insertLast("Объект:");
            IContextDef&& ctx = ct;
            uint n = ctx.methsCount();
            if (n > 0) {
                result.insertLast("  Методы:");
                for (uint idx = 0; idx < n; idx++)
                    result.insertLast("    " + (ctx.hasRetVal(idx) ? "функция" : "процедура") + " " + string(ctx.methName(idx, 1)) + ". [" + ctx.paramsCount(idx) + "]");
            }
            n = ctx.propsCount();
            if (n > 0) {
                result.insertLast("  Свойства:");
                for (uint idx = 0; idx < n; idx++)
                    result.insertLast("    " + string(ctx.propName(idx, 1)));
            }
        }
        return join(result, "\n");
    }
    //[helpstring("ЗначениеВСтрокуВнутр")]
    string toStringInternal() {
        v8string res;
        value.toString(res);
        return res;
    }
    //[propget, helpstring("UUID типа")]
    string typeUUID() {
        if (value.pValue !is null)
            return value.pValue.getType().getClsid();
        return string();
    }
};
