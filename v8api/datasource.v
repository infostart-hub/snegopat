/// Перечисление типов данных
:enum DataSource_SourceType
	stTable
	stTree

:enum LinkType
	ltParent
	ltFirstChild
	ltLastChild
	ltPrev
	ltNext
	ltSelf

:struct LineInfo
:props
	bool hasChild
	int level
	bool expandable
	IV8Bookmark@ bookmark

:iface IV8DataSource {8E7D2FE9-E045-4032-8CF3-3AAC9071AD01}
:virt
	DataSource_SourceType getSourceType()
	bool getLineInfo(IV8Bookmark& bkmk, LineInfo& lineInfo)
	bool getCellValue(IV8Bookmark& bkmk, uint colId, Value& val)
	uint getLinkedBookmark(IV8Bookmark@&out, IV8Bookmark@ bkmk, LinkType lt)

:iface IGridUISource {01CC8CDD-A3B3-4fa3-AFD5-7FE636FF4BB2}
:virt
    bool getCellFormat(IV8Bookmark& bkmk, uint colId, Value& value, CellFormat& cellFormat)

:struct ImageInfo
:props
	uint image	// IUnknown
	Point posInPicture
	uint paintStyle
:meths
	void init()
	{
		obj.image = 0;
		Point__ctor(obj.posInPicture);
		obj.paintStyle = 0;
	}
	---

:enum CellFormatValidFields
	0x0001	cfText       // текст
	0x0002	cfImage      // изображение
	0x0004	cfAddImage   // доп.изображение
	0x0008	cfCheck      // флажок
	0x0010	cfAddCheck   // доп.пометка
	0x0020	cfBkgColor   // цвет фона
	0x0040	cfTextColor  // цвет текста
	0x0080	cfReadOnly   // 
	0x0100	cfHorAlign   // горизонтальное выравнивание
	0x0200	cfTextFont   // шрифт текста
	0x0400	cfTooltipText// текст подсказки
	0x0800	cfVisible    // видимость ячейки
	0x1000	cfHeight     // высота ячейки
	0x2000	cfAutoHeight // авто высота ячейки
	0x4000	cfHyperLink  // гипер-ссылка

:enum CheckState
	csNotChecked
	csChecked
	csGrayed

:enum HAlign
	ehaLeft
	ehaCenter
	ehaRight
	ehaJustify
	ehaAuto

:enum VAlign
	evaTop
	evaCenter
	evaBottom

:struct CellFormat
:props
	v8string	text
	CheckState	state
	ImageInfo   image           // картинка
	ImageInfo   extImage        // дополнительная картинка
	Color       clrBkg          // цвет ячейки
	Color       clrText         // цвет текста
	Font        font            // шрифт текста
	bool        readOnly        // только чтение
	HAlign      horAlign        // горизонтальное выравнивание
	VAlign      verAlign        // вертикальное выравнивание
	v8string	tooltip         // текст подсказки
	bool        showAddCheck    // видимость дополнительной пометки
	bool        visible         // видимость ячейки
	uint16      height          // высота ячейки
	bool        autoHeight      // авто высота ячейки
	bool        hyperLink       // гипер-ссылка
	uint        v8Style         // стиль V8
	uint16      validFields
	+256
:meths
	void init()
	{
		obj.validFields = cfText;
		obj.text._ctor();
		obj.tooltip._ctor();
		ImageInfo__init(obj.image);
		ImageInfo__init(obj.extImage);
		obj.state = csNotChecked;
		obj.readOnly = false;
		//obj.horAlign = ehaLeft;
		//obj.verAlign = evaTop;
		obj.showAddCheck = false;
		//obj.v8Style = 0;
		obj.visible = false;
		obj.height = 1;
		obj.autoHeight = false;
		obj.hyperLink = false;
	}
	---

:iface IV8Bookmark {379295BF-7FC0-4B26-9B8B-B14505719EDC}
:virt
	void fake()
