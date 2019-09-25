// Описание элемента.
:enum TypeContextInfoItemFrom
	tcfContext
	tcfGlobal
	tcfCmnModule
	tcfModuleSelf
	tcfTemplate
	tcfKeyword

:struct TypeContextInfoItem
#if ver >= 8.3.4
:meths
	void init()
	{
		// Забьем все нулями
		mem::memset(obj.self, 0, TypeContextInfoItem_size);
		// Инициализируем строки
		//obj.name.ctor();
		//obj.str1.ctor();
		//obj.str2.ctor();
		// Инициализируем TypeDomainPattern'ы
		obj.typeDomain._ctor(IID_NULL);
		obj.providedTypeDomain._ctor(IID_NULL);
		// Инициализация первого списка
	  #if ver < 8.3.11
		obj.lst_8 = obj.lst_12 = mem::addressOf(obj.lst_0);
		obj.lst_4 = obj.lst_16 = 0;
	  #else
	    obj.lst_4 = 0;
		obj.lst_0 = malloc(16);
		mem::dword[obj.lst_0] = obj.lst_0;
		mem::dword[obj.lst_0 + 4] = obj.lst_0;
		mem::dword[obj.lst_0 + 8] = obj.lst_0;
		mem::byte[obj.lst_0 + 0xD] = 1;
		mem::byte[obj.lst_0 + 0xC] = 1;
	  #endif
	}
	---
:props
	v8string name
	bool isMethod
	bool haveRetVal
	uint params
	int from
	TypeDomainPattern typeDomain
	// Какой-то список или хэшмап
	uint lst_0
	uint lst_4
  #if ver < 8.3.11
	uint lst_8
	uint lst_12
	uint lst_16
	uint unk1
  #endif
	uint flag1
  #if ver >= 8.3.11.3133
	+8
  #endif
	uint flag0_1
	uint flag0_2
	Guid objectId
	Guid mdPropId
	bool isTypeSource
	TypeDomainPattern providedTypeDomain
	v8string str1
	v8string str2
	bool byte_0
	Vector someVector
	+100
#else
 // если меньше 8.3.4
:meths
	void init()
	{
		obj.name.ctor();
		obj.sourceString.ctor();
		obj.tooltip.ctor();
		obj.typeDomain._ctor(IID_NULL);
		obj.providedTypeDomain._ctor(IID_NULL);
		obj.zero1 = obj.zero2 = obj.flag1 = obj.buf1_0 = obj.buf1_1 = 0;
		obj.buf1_2 = obj.buf1_3 = mem::addressOf(obj.buf1_0);
	}
	---
:props
	v8string name
	bool isMethod
	bool haveRetVal
	uint params
	int from
	TypeDomainPattern typeDomain
	uint buf1_0
	uint buf1_1
	uint buf1_2
	uint buf1_3
	uint zero1
	uint zero2
	uint flag1
	v8string sourceString
	Guid objectId
	Guid mdPropId
	bool isTypeSource
	TypeDomainPattern providedTypeDomain
	v8string tooltip
#endif

:iface ITypeContextInfo {CAF67C02-2EB2-453D-B2CE-7EDFA5FD2033}
:virt
	// Количество элементов.
	uint count()
	void info(uint index, TypeContextInfoItem& item, int lang)


:struct TypeNameInfo
:props
	v8string name
	Guid uuid

:iface ITypeNameInfo {AEF5BA31-D1CF-4C2C-988B-70F314A29761}
:virt
	uint count()
	void info(uint idx, TypeNameInfo& item, int lang)
	const v8string& name(uint idx, int lang)

:iface ISettingsConsumer {3D66048F-819E-4BD0-B50B-F963E0F0B668}
:virt
	void setSettings(IUnknown@+ value, const Guid& kind)

:iface IContextDef {FD7B6CC1-DC8E-11D2-B8D0-008048DA0335}
:virt
    int propsCount()
    const uint16& propName(int prop, int lang)
    bool isPropReadable(int prop)
    bool isPropWritable(int prop)
    int findProp(const v8string&in pszPropName)
    int methsCount()
    const uint16& methName(int meth, int lang)
    int paramsCount(int meth)
    bool isParamIn(int meth, int param)
    bool isParamOut(int meth, int param)
    bool getParamDefValue(int meth, int param, Value& defVal)
    bool hasRetVal(int meth)
    int  findMethod(const v8string&in methName)

:iface IContext {FD7B6CC2-DC8E-11D2-B8D0-008048DA0335}
:base IContextDef
:virt
    IContextDef@+ staticContextDef()
    bool getPropVal(int prop, Value& value)
    bool setPropVal(int prop, const Value& value)
    bool callMeth(int meth, Value& pRetVal, Vector& params)

:iface IAssistantData {171BFE39-267E-4690-BD45-4C4B5F5EF973}
	:virt
	+3	
	uint object(IUnknown@&)
	+1
	IUnknown@+ extObject()
	+1
	thiscall const Guid& propUuid()

:struct ContextValueInfo
:props
	v8string nameEng
	v8string nameRus
	TypeDomainPattern typeDomainPattern
	bool isMutable
	uint zero1
	uint zero2
	uint pZero1
	uint pZero2
	uint zero3
:meths
	void init()
	{
		obj.nameEng.ctor();
		obj.nameRus.ctor();
		obj.typeDomainPattern.ctor();
		obj.zero1 = obj.zero2 = obj.zero3 = 0;
		obj.pZero1 = obj.pZero2 = mem::addressOf(obj.zero1);
	}
	---
	void done()
	{
		obj.nameEng.dtor();
		obj.nameRus.dtor();
		obj.typeDomainPattern.dtor();
	}
	---

:iface IContextDefExt {D74E91C1-6F7C-4D4F-A8C8-6C109BDAA941}
:virt
    bool isCollection()
    void getCollectionItemInfo(ContextValueInfo& valueInfo)
    bool notIndexable(int nPropPos)
    void propInfo(int prop, ContextValueInfo& valueInfo)
    void methRetInfo(int meth, ContextValueInfo& valueInfo)
    uint propContext(IUnknown@&, int prop)
    uint methRetContext(IUnknown@&, int meth)
    bool propIsTypeProvider(int prop, TypeDomainPattern& typeDomainPattern)
    bool methIsTypeProvider(int meth, TypeDomainPattern& typeDomainPattern)

:iface IAssistListInfo {DEE6D279-28B7-4782-82BB-39A6C02E5A81}
:virt
	uint realIndex(uint idx, uint&out realIdx, uint&out p1=void)
	+2
	uint indexFromBkmk(IV8Bookmark& pBkmk)

:iface IAssistList {E185016F-CD2C-422b-8D77-F9D5F5234BAE}
:virt
#if ver >= 8.3.5
	+1
#endif
#if ver < 8.3
	save uint getDataSource(IV8DataSource@&, ITextEditor& ted, IV8Bookmark@& pBkmk, uint& itemsCount,int i1,int i2,int i3)
#elif ver < 8.3.8
	save uint getDataSource(IV8DataSource@&, ITextEditor& ted, IV8Bookmark@& pBkmk, uint& itemsCount,int i1,int i2,int i3,int i4,int i5,int i6,int i7,int i8,int i9)
#else
	save uint getDataSource(IV8DataSource@&, ITextEditor& ted, int i10, IV8Bookmark@& pBkmk, uint& itemsCount,int i1,int i2,int i3,int i4,int i5,int i6,int i7,int i8,int i9)
#endif
	+1
#if ver < 8.3
	void textByBookmark(IV8DataSource& ds, IV8Bookmark& bkmk, v8string& text, TextPosition& tpBegin, uint&out caretPos)
#else
	void textByBookmark(IV8DataSource& ds, IV8Bookmark& bkmk, v8string& text, TextPosition& tpBegin, uint&out caretPos, bool&out=void)
#endif


:guid BuiltinFuncInfo		{74A84AED-6626-4de2-8FF7-ABFBB327FC3C}
:guid TypeNameInfoSource	{131F8087-C467-4b65-BDE3-7B898FB55AD2}
:guid IID_IGlobalContextDef {D751C9CA-B011-4e2c-8D8D-39652A5A6BCE}
:guid CLSID_AssistList		{A9ABB8D9-71F5-4914-A5C4-EF4B2A04BB88}
