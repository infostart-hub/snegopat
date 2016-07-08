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
	void ctor(const v8string&in, const v8string&in, bool)|??0URL@core@@QAE@ABV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@0_N@Z
	//URL(const v8string&, wchar_t const*, bool)|??0URL@core@@QAE@ABV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@PB_W_N@Z
	void ctor(const v8string&in, bool p=false)|??0URL@core@@QAE@ABV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@_N@Z
	//URL(const v8string&, bool, class stlp_std::vector<unsigned int, class stlp_std::allocator<unsigned int> > const&, bool)|??0URL@core@@QAE@ABV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@_NABV?$vector@IV?$allocator@I@stlp_std@@@3@1@Z
	//URL(wchar_t const*, wchar_t const*, bool)|??0URL@core@@QAE@PB_W0_N@Z
	//URL(wchar_t const*, bool)|??0URL@core@@QAE@PB_W_N@Z
	void ctor()|??0URL@core@@QAE@XZ
	URL baseURL()const|?baseURL@URL@core@@QBE?AV12@XZ
	//void deserialize(ListInStream&)|?deserialize@URL@core@@QAEXAAVListInStream@2@@Z
	URL getRelativeURL(const URL&in)const|?getRelativeURL@URL@core@@QBE?AV12@ABV12@@Z
	//void marks(class stlp_std::vector<unsigned int, class stlp_std::allocator<unsigned int> >&)const|?marks@URL@core@@QBEXAAV?$vector@IV?$allocator@I@stlp_std@@@stlp_std@@@Z
	URL normalize()const|?normalize@URL@core@@QBE?AV12@XZ
	v8string part(int, int)const|?part@URL@core@@QBE?AV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@HH@Z
	v8string presentation()const|?presentation@URL@core@@QBE?AV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@XZ
	//void serialize(ListOutStream&)const|?serialize@URL@core@@QBEXAAVListOutStream@2@@Z
	bool equal(const URL&in, bool)const|?equal@URL@core@@IBE_NABV12@_N@Z
	URL implementCombine(const URL&in, bool)const|?implementCombine@URL@core@@IBE?AV12@ABV12@_N@Z
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
	//v8string Url_escape(const v8string&in, const v8string&in)|?escape@URL@core@@SA?AV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@ABV34@0@Z
	//URL Url_prepareURL(const v8string&in)|?prepareURL@URL@core@@SA?AV12@ABV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@@Z
	v8string Url_unescape(const v8string&in)|?unescape@URL@core@@SA?AV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@ABV34@@Z

