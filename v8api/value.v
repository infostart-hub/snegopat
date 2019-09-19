// Типы для работы со значениями 1С

:enum TypeKinds
	0		tkUndefined
	1		tkNull
	2		tkBoolean
	3		tkNumeric
	4		tkString
	5		tkDate
	100		tkObject
	1000	tkType

// Тип, описывающий тип значения 1С
:iface IType {FD7B6CC0-DC8E-11D2-B8D0-008048DA0335}
:virt
	int getTypeKind()
	const Guid& getClsid()
	uint16& getTypeString(int alias)
	void getString(v8string& out)
	bool isComType()
	bool isMutable()
	void createValue(IValue@& out)
	bool hasCtor(uint)
	void create(IValue@&out, Vector&)

// Интерфейс значения 1С
:iface IValue {FD7B6CC3-DC8E-11D2-B8D0-008048DA0335}
:virt
	IType@ getType()
	+1
	bool getBool(bool& out)
	bool getNumeric(Numeric& out)
	bool getString(v8string& out)
	bool getDate(Date& out)
	bool isEqual(IValue& in)

:iface IEnumValCreator {A89A27EA-9190-4F45-BA27-B6A3287E26A8}
:virt
	uint create(Value&out val, int eval)
	void getAll(Vector& vals)

// Простые типы значений
// Дата
:struct Date
:props
	uint64 ticks
:dlls
#if ver < 8.3
	core82.dll
#else
	core83.dll
#endif
	void ctor(int y=0, int m=0, int d=0)|??0Date@core@@QAE@HHH@Z
	void ctor(int, int, int, int, int, int)|??0Date@core@@QAE@HHHHHH@Z
#if ver < 8.3.11
	v8string toString()const|?toString@Date@core@@QBE?AV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@XZ
#else
	v8string toString()const|?toString@Date@core@@QBE?AV?$basic_string@_SU?$fix_char_traits@_S@stdx@@V?$allocator@_S@std@@@stdx@@XZ
#endif

// Число
:class Numeric
:props
	uint allocked
	uint length
	uint prec
	uint _sign
	uint data
	uint inplace1
	uint inplace2
	uint inplace3
	uint inplace4

:dlls
#if ver < 8.3
	core82.dll
#else
	core83.dll
#endif
	void ctor(const Numeric&)|??0Numeric@core@@QAE@ABV01@@Z
	void ctor(int16)|??0Numeric@core@@QAE@F@Z
	void ctor(uint16)|??0Numeric@core@@QAE@G@Z
	void ctor(int=0)|??0Numeric@core@@QAE@H@Z
	void ctor(uint)|??0Numeric@core@@QAE@I@Z
	void ctor(double)|??0Numeric@core@@QAE@N@Z
	void ctor(int64)|??0Numeric@core@@QAE@_J@Z
	void ctor(uint64)|??0Numeric@core@@QAE@_K@Z
	Numeric abs()const|?abs@Numeric@core@@QBE?AV12@XZ
	int compare(const Numeric&)const|?compare@Numeric@core@@QBEHABV12@@Z
	Numeric floor()const|?floor@Numeric@core@@QBE?AV12@XZ
	void lengthAndPrecision(uint&out len, uint&out prec)const|?lengthAndPrecision@Numeric@core@@QBEXAAI0@Z
	int64 opImplConv()const|??BNumeric@core@@QBE_JXZ
	double opImplConv()const|??BNumeric@core@@QBENXZ
	int opImplConv()const|??BNumeric@core@@QBEJXZ
	Numeric& opModAssign(const Numeric&)|??_1Numeric@core@@QAEAAV01@ABV01@@Z
	Numeric& opMulAssign(const Numeric&)|??XNumeric@core@@QAEAAV01@ABV01@@Z
	Numeric& opAddAssign(const Numeric&)|??YNumeric@core@@QAEAAV01@ABV01@@Z
	Numeric opNeg()const|??GNumeric@core@@QBE?AV01@XZ
	Numeric& opSubAssign(const Numeric&)|??ZNumeric@core@@QAEAAV01@ABV01@@Z
	Numeric& opDivAssign(const Numeric&)|??_0Numeric@core@@QAEAAV01@ABV01@@Z
	Numeric& opAssign(const Numeric&)|??4Numeric@core@@QAEAAV01@ABV01@@Z
	Numeric& pow(const Numeric&)|?pow@Numeric@core@@QAEAAV12@ABV12@@Z
	Numeric round(int)const|?round@Numeric@core@@QBE?AV12@H@Z
	Numeric round(int, int mode)const|?round@Numeric@core@@QBE?AV12@HW4NumericRoundMode@2@@Z
	int sign()const|?sign@Numeric@core@@QBEHXZ
	bool toInteger(int64&)const|?toInteger@Numeric@core@@QBE_NAA_J@Z
#if ver < 8.3.11
	v8string toString()const|?toString@Numeric@core@@QBE?AV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@XZ
#else
	v8string toString()const|?toString@Numeric@core@@QBE?AV?$basic_string@_SU?$fix_char_traits@_S@stdx@@V?$allocator@_S@std@@@stdx@@XZ
#endif
:meths
	void ctor()
	{
		obj.ctor(0);
	}
	---
	void dtor()
	{
		if(obj.data != obj.self + 20)
			free(obj.data);
	}
	---

// Value
:class Value
:props
	uint vtable
	IValue@ pValue
:dlls
#if ver < 8.3
	core82.dll
#else
	core83.dll
#endif
	void ctor(const Value&in)|??0Value@core@@QAE@ABV01@@Z
	void ctor(const Date&in)|??0Value@core@@QAE@ABVDate@1@@Z
	void ctor(const Numeric&in)|??0Value@core@@QAE@ABVNumeric@1@@Z
	void ctor(int16)|??0Value@core@@QAE@F@Z
	void ctor(uint16)|??0Value@core@@QAE@G@Z
	void ctor(int)|??0Value@core@@QAE@H@Z
	void ctor(uint)|??0Value@core@@QAE@I@Z
	void ctor(double)|??0Value@core@@QAE@N@Z
	void ctor(IUnknown@)|??0Value@core@@QAE@PAUIUnknown@@@Z
	void ctor(IValue@)|??0Value@core@@QAE@PAVIValue@1@@Z
	void ctor()|??0Value@core@@QAE@XZ
	void ctor(int64)|??0Value@core@@QAE@_J@Z
	void ctor(uint64)|??0Value@core@@QAE@_K@Z
	void ctor(bool)|??0Value@core@@QAE@_N@Z
	void dtor()|??1Value@core@@QAE@XZ
	Value& opAssign(const Value&in)|??4Value@core@@QAEAAV01@ABV01@@Z
	Type type()const|?type@Value@core@@QBE?AVType@2@XZ
	void opAssign(const Date&)|?assign@GenericValue@core@@QAEXABVDate@2@@Z
	void opAssign(const Numeric&)|?assign@GenericValue@core@@QAEXABVNumeric@2@@Z
	void opAssign(int16)|?assign@GenericValue@core@@QAEXF@Z
	void opAssign(uint16)|?assign@GenericValue@core@@QAEXG@Z
	void opAssign(int)|?assign@GenericValue@core@@QAEXH@Z
	void opAssign(uint)|?assign@GenericValue@core@@QAEXI@Z
	void opAssign(double)|?assign@GenericValue@core@@QAEXN@Z
	void opAssign(IUnknown@)|?assign@GenericValue@core@@QAEXPAUIUnknown@@@Z
	void opAssign(int64)|?assign@GenericValue@core@@QAEX_J@Z
	void opAssign(uint64)|?assign@GenericValue@core@@QAEX_K@Z
	void opAssign(bool)|?assign@GenericValue@core@@QAEX_N@Z
	void clear()|?clear@GenericValue@core@@QAEXXZ
	bool opEquals(const Date&)const|?equals@GenericValue@core@@QBE_NABVDate@2@@Z
	bool opEquals(const Numeric&)const|?equals@GenericValue@core@@QBE_NABVNumeric@2@@Z
	bool opEquals(int16)const|?equals@GenericValue@core@@QBE_NF@Z
	bool opEquals(uint16)const|?equals@GenericValue@core@@QBE_NG@Z
	bool opEquals(int)const|?equals@GenericValue@core@@QBE_NH@Z
	bool opEquals(uint)const|?equals@GenericValue@core@@QBE_NI@Z
	bool opEquals(int64)const|?equals@GenericValue@core@@QBE_N_J@Z
	bool opEquals(uint64)const|?equals@GenericValue@core@@QBE_N_K@Z
	bool opEquals(bool)const|?equals@GenericValue@core@@QBE_N_N@Z
	bool getBoolean(bool&)const|?getBoolean@GenericValue@core@@QBE_NAA_N@Z
	bool getDate(Date&)const|?getDate@GenericValue@core@@QBE_NAAVDate@2@@Z
	bool getNumeric(Numeric&)const|?getNumeric@GenericValue@core@@QBE_NAAVNumeric@2@@Z
#if ver < 8.3.11
	void ctor(const v8string&in)|??0Value@core@@QAE@ABV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@@Z
	void opAssign(const v8string&in)|?assign@GenericValue@core@@QAEXABV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@@Z
	void opAssign(const uint16&)|?assign@GenericValue@core@@QAEXPB_W@Z
	bool opEquals(const v8string&in)const|?equals@GenericValue@core@@QBE_NABV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@@Z
	bool opEquals(const uint16&)const|?equals@GenericValue@core@@QBE_NPB_W@Z
	bool getString(v8string&)const|?getString@GenericValue@core@@QBE_NAAV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@@Z
	void toString(v8string&)const|?toString@GenericValue@core@@QBEXAAV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@@Z
#else
	void ctor(const v8string&in)|??0Value@core@@QAE@ABV?$basic_string@_SU?$fix_char_traits@_S@stdx@@V?$allocator@_S@std@@@stdx@@@Z
	void opAssign(const v8string&in)|?assign@GenericValue@core@@QAEXABV?$basic_string@_SU?$fix_char_traits@_S@stdx@@V?$allocator@_S@std@@@stdx@@@Z
	void opAssign(const uint16&)|?assign@GenericValue@core@@QAEXPB_S@Z
	bool opEquals(const v8string&in)const|?equals@GenericValue@core@@QBE_NABV?$basic_string@_SU?$fix_char_traits@_S@stdx@@V?$allocator@_S@std@@@stdx@@@Z
	bool opEquals(const uint16&)const|?equals@GenericValue@core@@QBE_NPB_S@Z
	bool getString(v8string&)const|?getString@GenericValue@core@@QBE_NAAV?$basic_string@_SU?$fix_char_traits@_S@stdx@@V?$allocator@_S@std@@@stdx@@@Z
	void toString(v8string&)const|?toString@GenericValue@core@@QBEXAAV?$basic_string@_SU?$fix_char_traits@_S@stdx@@V?$allocator@_S@std@@@stdx@@@Z
#endif


// Type
:class Type
:props
	IType@ pType
:dlls
#if ver < 8.3
	core82.dll
#else
	core83.dll
#endif
	// AngelScript требует для классов наличия конструктора без параметров, поэтому нарисуем ему такой
	void ctor()|??0Type@core@@QAE@PAVIType@1@@Z
	void ctor(const Guid&in)|??0Type@core@@QAE@ABU_GUID@@@Z
	void ctor(const Type&in)|??0Type@core@@QAE@ABV01@@Z
	void ctor(IType@)|??0Type@core@@QAE@PAVIType@1@@Z
	void ctor(IType@, bool)|??0Type@core@@QAE@PAVIType@1@_N@Z
	void ctor(int)|??0Type@core@@QAE@W4Code@01@@Z
	void dtor()|??1Type@core@@QAE@XZ
	Type& opAssign(const Type&in)|??4Type@core@@QAEAAV01@ABV01@@Z
#if ver < 8.3.11
	void ctor(const v8string&in)|??0Type@core@@QAE@ABV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@@Z
#else
	void ctor(const v8string&in)|??0Type@core@@QAE@ABV?$basic_string@_SU?$fix_char_traits@_S@stdx@@V?$allocator@_S@std@@@stdx@@@Z
#endif

:global
:dlls
#if ver < 8.3
	core82.dll
#else
	core83.dll
#endif
#if ver < 8.3.11
	void valueFromString(const v8string&in, Value&)|?fromString@GenericValue@core@@SAXABV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@AAV12@@Z
#else
	void valueFromString(const v8string&in, Value&)|?fromString@GenericValue@core@@SAXABV?$basic_string@_SU?$fix_char_traits@_S@stdx@@V?$allocator@_S@std@@@stdx@@AAV12@@Z
#endif
	IValue@+ create_undefined_value()|?create_undefined_value@core@@YAPAVIValue@1@XZ
