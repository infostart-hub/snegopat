/* com_snegopat.as
    Реализует объект snegopat из SnegAPI.
*/
// Данные строки нужны только для среды разработки и вырезаются препроцессором
#pragma once
#include "../../all.h"

class Snegopat {
    //[helpstring("Получить активное текстовое окно")]
    ITextWindow&& activeTextWindow()
    {
        return activeTextWnd is null ? null : activeTextWnd.getComWrapper();
    }
    //[helpstring("Обработать строку шаблонов")]
    string parseTemplateString(const string& text, const string& name = "")
    {
        v8string wText = text;
        v8string wName = name.isEmpty() ? "Снегопат" : name;
        uint caret;
        v8string wResult;
        ITemplateProcessor&& tp;
        getTxtEdtService().getTemplateProcessor(tp);
        tp.processTemplate(wName, wText, wResult, caret, "");
        string result = wResult;
        if (caret <= result.length)
            result.insert(caret, symbCaret);
        return result;
    }
	// [helpstring("Показать список методов модуля")]
    bool showMethodsList()
    {
        return false;
    }
	//[helpstring("Показать выпадающий список снегопата")]
    bool showSmartBox()
    {
        // При принудительном вызове списка снегопата надо всё перепарсить
        for (uint i = 0, im = textDocStorage.openedDocs.length; i < im; i++) {
            ModuleTextProcessor&& tp = cast<ModuleTextProcessor>(textDocStorage.openedDocs[i].tp);
            if (tp !is null)
                tp.lastMethodBeginLine = 0;
        }
        for (auto it = allModuleElements.begin(); it++;)
            it.value.parsed = false;

        IntelliSite&& isite = getIntelliSite();
        if (isite.isActive())
            isite.hide();
        if (activeTextWnd !is null) {
            ModuleTextProcessor&& tp = cast<ModuleTextProcessor>(activeTextWnd.textDoc.tp);
            if (tp !is null)
                tp.activate(activeTextWnd);
        }
        return true;
    }
    IV8Lexer&& parseSources(const string& strSource, uint startLine = 1)
    {
        return IV8Lexer(strSource, startLine);
    }
	OptionsEntry&& _optionEntries = optionList;
	void updateAllEditorsSettings() {
		getEventService().notify(eTxtEdtOptionChanged);
	}
    /*
        [helpstring("Показать подсказку о параметрах метода")] HRESULT
	showParams(_ret VARIANT_BOOL* result);
		[helpstring("Листать подсказку о параметрах метода вперед")] HRESULT
	nextParams(_ret VARIANT_BOOL* result);
		[helpstring("Листать подсказку о параметрах метода назад")] HRESULT
	prevParams(_ret VARIANT_BOOL* result);
		[helpstring("Варианты в параметрах")] HRESULT
	paramsTypes(_ret SAFEARRAY(VARIANT)* result);
		[helpstring("Положение подсказки о параметрах")] HRESULT
	paramsPosition(_ret ISelection** result);
		[helpstring("Установить номер подсказки о параметрах")] HRESULT
	setParamType(_in long idx, _ret VARIANT_BOOL* result);
		[helpstring("Получить список приоритетных слов")] HRESULT
	getHotWords(_ret  SAFEARRAY(VARIANT)* result);
		[helpstring("Установить список приоритетных слов")] HRESULT
	setHotWords(_in  SAFEARRAY(VARIANT) words);
	prop_r(v8types, IDescriptionArray*, "Описание типов 1С из файла v8types.txt");
	meth(readTypeFile, "Добавить к описаниям типов типы из файла")(const string&path);
*/
};
