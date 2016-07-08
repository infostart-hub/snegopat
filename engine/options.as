/* options.as
    Работа с настройками
*/
#pragma once
#include "../../all.h"

funcdef bool OnApplyOption(const Value& newVal);
funcdef void OptionDefVal(Value& val);

class OptionsEntry {
	OptionsEntry&& _next;
	string _name;
	string _profile;
	bool doApply(Variant& newVal)
	{
		Value val;
		var2val(newVal, val);
		getProfileRoot().setValue(_profile, val);
		return apply(val);
	}
	private OptionDefVal&& defval;
	private OptionDefVal&& init;
	private OnApplyOption&& apply;

	OptionsEntry(const string& n, OptionDefVal&& dv, OptionDefVal&& i, OnApplyOption&& ap) {
		_name = n;
		_profile = "Snegopat/Settings/" + n;
		&&defval = dv;
		&&init = i;
		&&apply = ap;
		&&_next = optionList;
		&&optionList = this;
	}
};

OptionsEntry&& optionList;

void initAllOption() {
	Value val;
	IProfileFolder&& pRoot = getProfileRoot();
	OptionsEntry&& ptr = optionList;
	while (ptr !is null) {
		ptr.defval(val);
		pRoot.createValue(ptr._profile, gpflSnegopat, val);
		pRoot.getValue(ptr._profile, val);
		ptr.init(val);
		&&ptr = ptr._next;
	}
}
