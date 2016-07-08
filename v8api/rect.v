// тип Point
:struct Point
:props
	int x
	int y
:meths
	void ctor()
	{
		obj.x = obj.y = 0;
	}
	---

// тип SIZE
:class Size
:props
	int cx
	int cy
:meths
	void ctor()
	{
	}
	---
	void dtor()
	{
	}
	---

// Тип Rect
:struct Rect
:props
	int left
	int top
	int right
	int bottom
:meths
	void ctor()
	{
	}
	---
:dlls
#if ver < 8.3
	core82.dll
#else
	core83.dll
#endif
	//void ctor(const Point&in, const Point&in)|??0Rect@core@@QAE@ABUtagPoint@@0@Z
	//void ctor(const Point&in, const Size&in)|??0Rect@core@@QAE@ABUtagPoint@@ABUtagSIZE@@@Z
	void ctor(int, int, int, int)|??0Rect@core@@QAE@HHHH@Z
	Rect& combine(const Rect&in)|?combine@Rect@core@@QAEAAU12@ABU12@@Z
	Rect& inflate(int, int)|?inflate@Rect@core@@QAEAAU12@HH@Z
	Rect& intersect(const Rect&in)|?intersect@Rect@core@@QAEAAU12@ABU12@@Z
	Rect& normalize()|?normalize@Rect@core@@QAEAAU12@XZ
	Rect& offset(int, int)|?offset@Rect@core@@QAEAAU12@HH@Z
	void swap(Rect&)|?swap@Rect@core@@QAEXAAU12@@Z

:global
:dlls
#if ver < 8.3
	core82.dll
#else
	core83.dll
#endif
	prop Rect kEmptyRect|?kEmptyRect@core@@3URect@1@B
