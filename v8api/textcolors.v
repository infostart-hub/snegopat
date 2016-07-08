:enum ColorsKind
	ckRGB
	ckIdxWin
	ckIdxWeb
	ckIdxStyle
	ckAuto

:struct Color
:props
	int kind
	CompositeID value
:meths
	void ctor(uint r, uint g, uint b)
	{
		obj.kind = 0;
		obj.value.ctor(r | (g<<8) | (b<<16));
	}
	---

:iface IV8Color {9CD510C3-ABFC-11D4-9434-004095E12FC7}
:virt
	void setColor(const Color& color)
	void getColor(Color& color)
:guid V8Color {9CD510C5-ABFC-11D4-9434-004095E12FC7}

:enum BlockMarker
	1	bmNone	// Не блок
	2	bmBegin	// Начало блока (процедура, условие)
	4	bmInner	// Внутри блока (Иначе)
	8	bmEnd	// Конец блока
#if ver < 8.3.3
	2  groupBlockBegin
	8  groupBlockEnd
#else
	16 groupBlockBegin
	32 groupBlockEnd
#endif

:enum GroupConstant
#if ver < 8.3.3
	2  groupBlockKind
#else
	4  groupBlockKind
#endif

:struct SyntaxItemInfo
:props
	uint		start
	uint 		len
	Color    	color
	BlockMarker isBlock
	uint 		blockKind
	uint 		blockMode
	uint 		lexemCategory
	uint 		lexemType
:meths
	void ctor()
	{
		obj.start = obj.len = obj.blockKind = obj.blockMode = obj.lexemCategory = obj.lexemType = 0;
		obj.isBlock = bmNone;
	}
	---
	void ctor(const SyntaxItemInfo&in si)
	{
		obj.copy(si);
	}
	---
	void copy(const SyntaxItemInfo& si)
	{
		mem::memcpy(obj.self, si.self, SyntaxItemInfo_size);
	}
	---

:enum V8LexCategory
	vlKeyword       // Ключевое слово
	vlNumeric  		// Число
	vlString   		// Строковая константа
	vlDate     		// ДатаВремя
	vlName	    	// Идентификатор
	vlOperator      // Оператор
	vlRemark       	// Комментарий
	vlUnknown       // нераспознанное

:struct SyntaxItemInfos
:props
	uint refCount
#if ver >= 8.3.5 & ver < 8.3.7
	+4
#endif
	Vector infos

:struct BackColorsItem
:props
	uint start
	uint len
	uint color


// Интерфейс текстового расширения для задания цвета фона строки текста в редакторе
:iface ITextExtBackColors {89578B27-C06D-4cb5-AA5A-7C5A90D79D66}
:virt
	// Определить, нужно ли будет менять фон слов в строке
	save bool hasCustomBackground(int nLineNo, SyntaxItemInfos& items)
	// Получить инфу о цветах фона
	save void getColorInfo(COLORREF currentBGColor,  SyntaxItemInfos& items, Vector& res)

// Интерфейс текстового расширения для раскрашивания слов в строке текста в редакторе
:iface ITextExtColors {6A93A252-50F8-11d5-B0B3-008048DA0765}
:virt
	+2
	save void getColors(const v8string&in sourceLine, Vector& items)

:iface ITextExtention {6A93A253-50F8-11d5-B0B3-008048DA0765}
:virt
	const Guid& guid()
	v8string name()


:guid CLSID_TextExtSQL {2B4A2CFC-8A40-455e-9A6D-FD9597942421}

