:class TypeDomainPattern
:props
	uint ptr
:dlls
#if ver < 8.3
	core82.dll
#else
	core83.dll
#endif
	void dtor()|??1TypeDomainPattern@core@@QAE@XZ
	void ctor(const Guid&)|??0TypeDomainPattern@core@@QAE@ABU_GUID@@@Z
	void _ctor(const Guid&)|??0TypeDomainPattern@core@@QAE@ABU_GUID@@@Z
	void _dtor()|??1TypeDomainPattern@core@@QAE@XZ
	void ctor(const TypeDomainPattern&)|??0TypeDomainPattern@core@@QAE@ABV01@@Z
	void ctor(const Vector&)|??0TypeDomainPattern@core@@QAE@ABV?$vector@U_GUID@@V?$allocator@U_GUID@@@stlp_std@@@stlp_std@@@Z
	void addType(const Guid&)|?addType@TypeDomainPattern@core@@QAEXABU_GUID@@@Z
	void addTypes(const Vector&)|?addTypes@TypeDomainPattern@core@@QAEXABV?$vector@U_GUID@@V?$allocator@U_GUID@@@stlp_std@@@stlp_std@@@Z
	bool containsType(const Guid&)const|?containsType@TypeDomainPattern@core@@QBE_NABU_GUID@@@Z
	//void deserialize(ListInStream&)|?deserialize@TypeDomainPattern@core@@QAEXAAVListInStream@2@@Z
	//const DateQualifiers& getDateQualifiers()const|?getDateQualifiers@TypeDomainPattern@core@@QBEABVDateQualifiers@2@XZ
	//const NumericQualifiers& getNumericQualifiers()const|?getNumericQualifiers@TypeDomainPattern@core@@QBEABVNumericQualifiers@2@XZ
	//const StringQualifiers& getStringQualifiers()const|?getStringQualifiers@TypeDomainPattern@core@@QBEABVStringQualifiers@2@XZ
	long hash()const|?hash@TypeDomainPattern@core@@QBEJXZ
	bool isSubset(const TypeDomainPattern&)const|?isSubset@TypeDomainPattern@core@@QBE_NABV12@@Z
	void merge(const TypeDomainPattern&)|?merge@TypeDomainPattern@core@@QAEXABV12@@Z
	TypeDomainPattern& opAdd(const TypeDomainPattern&)|??4TypeDomainPattern@core@@QAEAAV01@ABV01@@Z
	//bool operator==(const Guid&)const|??8TypeDomainPattern@core@@QBE_NABU_GUID@@@Z
	//bool operator==(const TypeDomainPattern&)const|??8TypeDomainPattern@core@@QBE_NABV01@@Z
	//void serialize(ListOutStream&)const|?serialize@TypeDomainPattern@core@@QBEXAAVListOutStream@2@@Z
	//void setDateQualifiers(const DateQualifiers&)|?setDateQualifiers@TypeDomainPattern@core@@QAEXABVDateQualifiers@2@@Z
	//void setNumericQualifiers(const NumericQualifiers&)|?setNumericQualifiers@TypeDomainPattern@core@@QAEXABVNumericQualifiers@2@@Z
	//void setStringQualifiers(const StringQualifiers&)|?setStringQualifiers@TypeDomainPattern@core@@QAEXABVStringQualifiers@2@@Z
	uint types(Vector&)const|?types@TypeDomainPattern@core@@QBE?AV?$vector@U_GUID@@V?$allocator@U_GUID@@@stlp_std@@@stlp_std@@XZ
	uint typesCount()const|?typesCount@TypeDomainPattern@core@@QBEIXZ
:meths
	void ctor()
	{
		obj._ctor(IID_NULL);		
	}
	---
