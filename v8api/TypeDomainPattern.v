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
	void addType(const Guid&)|?addType@TypeDomainPattern@core@@QAEXABU_GUID@@@Z
	long hash()const|?hash@TypeDomainPattern@core@@QBEJXZ
	bool isSubset(const TypeDomainPattern&)const|?isSubset@TypeDomainPattern@core@@QBE_NABV12@@Z
	void merge(const TypeDomainPattern&)|?merge@TypeDomainPattern@core@@QAEXABV12@@Z
	TypeDomainPattern& opAdd(const TypeDomainPattern&)|??4TypeDomainPattern@core@@QAEAAV01@ABV01@@Z
#if ver < 8.3.11
	void ctor(const Vector&)|??0TypeDomainPattern@core@@QAE@ABV?$vector@U_GUID@@V?$allocator@U_GUID@@@stlp_std@@@stlp_std@@@Z
	void addTypes(const Vector&)|?addTypes@TypeDomainPattern@core@@QAEXABV?$vector@U_GUID@@V?$allocator@U_GUID@@@stlp_std@@@stlp_std@@@Z
	bool containsType(const Guid&)const|?containsType@TypeDomainPattern@core@@QBE_NABU_GUID@@@Z
	uint types(Vector&)const|?types@TypeDomainPattern@core@@QBE?AV?$vector@U_GUID@@V?$allocator@U_GUID@@@stlp_std@@@stlp_std@@XZ
	uint typesCount()const|?typesCount@TypeDomainPattern@core@@QBEIXZ
#else
	void ctor(const Vector&)|??0TypeDomainPattern@core@@QAE@ABV?$vector@U_GUID@@V?$allocator@U_GUID@@@std@@@std@@@Z
	void addTypes(const Vector&)|?addTypes@TypeDomainPattern@core@@QAEXABV?$vector@U_GUID@@V?$allocator@U_GUID@@@std@@@std@@@Z
	bool containsType(const Guid&)const|?contains@TypeDomainPattern@core@@QBE_NABU_GUID@@@Z
	uint types(Vector&)const|?types@TypeDomainPattern@core@@QBE?AV?$vector@U_GUID@@V?$allocator@U_GUID@@@std@@@std@@XZ
	uint typesCount()const|?size@TypeDomainPattern@core@@QBEIXZ
#endif

:meths
	void ctor()
	{
		obj._ctor(IID_NULL);		
	}
	---
