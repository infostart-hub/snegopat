// Некоторые вещи для COM
:iface ICtx2Disp {E7210190-61F4-11D4-941D-008048DA11F9}
:virt
	IUnknown@ getContext()

:iface IConnectionPointContainer {B196B284-BAB4-101A-B69C-00AA00341D07}
	:virt
        +1
        uint FindConnectionPoint(const Guid& riid, IUnknown@&)

:struct TYPEATTR
:props
    Guid guid
    uint lcid
    uint dwReserved
    int memidConstructor
    int memidDestructor
    uint lpstrSchema
    uint cbSizeInstance
    uint typekind
    uint16 cFuncs
    uint16 cVars
    uint16 cImplTypes
    uint16 cbSizeVft
    uint16 cbAlignment
    uint16 wTypeFlags
    uint16 wMajorVerNum
    uint16 wMinorVerNum
    uint64 tdescAlias
    uint64 idldescType

:struct FUNCDESC
:props
    uint memid
    uint lprgscode
    uint lprgelemdescParam
    uint funckind
    uint invkind
    uint callconv
    uint16 cParams
    uint16 cParamsOpt
    uint16 oVft
    uint16 cScodes
	+32

:enum TYPEKIND
	TKIND_ENUM
	TKIND_RECORD
	TKIND_MODULE
	TKIND_INTERFACE
	TKIND_DISPATCH

:enum FUNCKIND
	FUNC_VIRTUAL
	FUNC_PUREVIRTUAL
	FUNC_NONVIRTUAL
	FUNC_STATIC
	FUNC_DISPATCH

:enum INVOKEKIND
	1 INVOKE_FUNC
	2 INVOKE_PROPERTYGET
	4 INVOKE_PROPERTYPUT

:global
:dlls OleAut32.dll
	stdcall uint SysAllocString(uint16&)|SysAllocString
	stdcall void SysFreeString(uint)|SysFreeString

:guid IID_ITypeInfo {00020401-0000-0000-C000-000000000046}