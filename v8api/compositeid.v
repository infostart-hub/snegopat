// тип CompositeID
:struct CompositeID
:props
	int id
	Guid uuid
	bool emptyUuid

:dlls
#if ver < 8.3
	core82.dll
#else
	core83.dll
#endif
	void ctor()|??0CompositeID@core@@QAE@XZ
	void ctor(const Guid&)|??0CompositeID@core@@QAE@ABU_GUID@@@Z
	void ctor(uint)|??0CompositeID@core@@QAE@J@Z
	void ctor(uint, const Guid&)|??0CompositeID@core@@QAE@JABU_GUID@@@Z
	bool opEquals(const CompositeID&in)const|??8CompositeID@core@@QBE_NABV01@@Z

