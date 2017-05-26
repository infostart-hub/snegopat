#if ver < 8.2.19 | (ver > 8.3.0 & ver < 8.3.4)
#error Unsupported version of 1C
#endif

:guid IID_NULL {00000000-0000-0000-0000-000000000000}
:tdef long int32


// Описание интерфейсов работы с процессом
:service SCOM_Process {EBF766A9-F32C-11D3-9851-008048DA1252}
:virt
    +1
    bool createByName(const v8string&in clsName, const Guid&in iid, IUnknown@&out ppObject)
    bool createByClsid(const Guid&in clsid, const Guid&in iid, IUnknown@&out ppObject)
    bool aggregateInstance(const Guid&in clsid, IUnknown@ pOuter, IUnknown@&out ptr)
    +1
    int getCategoryClasses(Vector& clsids, const Guid& clsid)
    +3
    bool registerService(const Guid&in, const Guid&in)
    +1
    IUnknown@+ getService(const Guid&in idService)
    +2
    uint32 loadComponent(uint32 name)


:struct Exception
	:props
		Guid		id
		v8string	descr
		uint		ptr

:global
:dlls
#if ver < 8.3
    core82.dll
#else
    core83.dll
#endif
    SCOM_Process@ currentProcess()|?current_process@core@@YAPAVSCOM_Process@1@XZ
	void val2var(const Value&, Variant&)|?value_to_variant_val@core@@YAXABVGenericValue@1@AAUtagVARIANT@@@Z
	v8string load_module_wstring(uint charNameModule, uint charResID)|?load_module_wstring@core@@YA?AV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@PBD0@Z
#if ver < 8.3.6
	void var2val(const Variant&, Value&, int i=0)|?variant_to_value@core@@YAXAAUtagVARIANT@@AAVGenericValue@1@H@Z
#else
	void var2val(const Variant&, Value&, int=0, bool=false)|?variant_to_value@core@@YAXAAUtagVARIANT@@AAVGenericValue@1@H_N@Z
#endif

:global
:dlls
#if ver < 8.3
	stl82.dll
	uint malloc(uint)|?__stl_new@stlp_std@@YAPAXI@Z
	void free(uint)|?__stl_delete@stlp_std@@YAXPAX@Z
#else
	nuke83.dll
	uint malloc(uint)|?alloc@details@nuke@@YAPAXI@Z
	void free(uint)|?free@details@nuke@@YAXPAX@Z
#endif

:iface IGlobalContext {151C4C40-37A4-48EA-990C-14B584EF8A6C}
:virt
//Артур	void none()
    0

:iface IGlobalContextInit {845491E6-70AF-4495-B4E2-D77AC794E797}
:virt
    void init(IInfoBase& infoBase)

