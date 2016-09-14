/*  mlist.as
    Отображение списка методов модуля
*/
#pragma once
#include "../../all.h"

// Оформляем в виде встроенного аддина, со своим макросом
class AddinMethodsList {
    bool showMethodList() {
        // Проверим наличие активного текстового окна
        if (activeTextWnd is null)
            return false;
        // Проверим, что это текст модуля
        ModuleTextProcessor&& mtp = cast<ModuleTextProcessor>(activeTextWnd.textDoc.tp);
        if (mtp is null)
            return false;
        // Проверим, что мы не в модальном режиме
        if (getBkEndUI().currentModalState() != msNone)
            return false;
        return false;
    }
};
