// тип Url
:class URL
:props
	v8string url
	Vector vec
	bool b1
	bool b2
:dlls
#if ver < 8.3
	core82.dll
#else
	core83.dll
#endif
	void ctor(const URL&in)|??0URL@core@@QAE@ABV01@@Z
	void ctor()|??0URL@core@@QAE@XZ
	URL baseURL()const|?baseURL@URL@core@@QBE?AV12@XZ
	URL getRelativeURL(const URL&in)const|?getRelativeURL@URL@core@@QBE?AV12@ABV12@@Z
	URL normalize()const|?normalize@URL@core@@QBE?AV12@XZ
	bool equal(const URL&in, bool)const|?equal@URL@core@@IBE_NABV12@_N@Z
	URL implementCombine(const URL&in, bool)const|?implementCombine@URL@core@@IBE?AV12@ABV12@_N@Z
#if ver < 8.3.11
	void ctor(const v8string&in, const v8string&in, bool)|??0URL@core@@QAE@ABV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@0_N@Z
	void ctor(const v8string&in, bool p=false)|??0URL@core@@QAE@ABV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@_N@Z
	v8string part(int, int)const|?part@URL@core@@QBE?AV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@HH@Z
	v8string presentation()const|?presentation@URL@core@@QBE?AV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@XZ
#else
	void ctor(const v8string&in, const v8string&in, bool)|??0URL@core@@QAE@ABV?$basic_string@_SU?$fix_char_traits@_S@stdx@@V?$allocator@_S@std@@@stdx@@0_N@Z
	void ctor(const v8string&in, bool p=false)|??0URL@core@@QAE@ABV?$basic_string@_SU?$fix_char_traits@_S@stdx@@V?$allocator@_S@std@@@stdx@@_N@Z
	v8string part(int, int)const|?part@URL@core@@QBE?AV?$basic_string@_SU?$fix_char_traits@_S@stdx@@V?$allocator@_S@std@@@stdx@@HH@Z
	v8string presentation()const|?presentation@URL@core@@QBE?AV?$basic_string@_SU?$fix_char_traits@_S@stdx@@V?$allocator@_S@std@@@stdx@@XZ
#endif

:meths
	void dtor()
	{
	}
	---

// статические методы
:global
:dlls
#if ver < 8.3
	core82.dll
#else
	core83.dll
#endif
#if ver < 8.3.11
	v8string Url_unescape(const v8string&in)|?unescape@URL@core@@SA?AV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@ABV34@@Z
#else
	v8string Url_unescape(const v8string&in)|?unescape@URL@core@@SA?AV?$basic_string@_SU?$fix_char_traits@_S@stdx@@V?$allocator@_S@std@@@stdx@@ABV34@@Z
#endif
