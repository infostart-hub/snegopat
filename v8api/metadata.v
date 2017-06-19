// Метаданные
:service IMDEditService {9EAEF404-78D2-4841-8332-3C3166212DCD}
	:virt
		4
		uint getEditHelper(IMDEditHelper@&, IMDObject&object)
		10
		save void openConfig(IConfigMngrUI& mngr, IMDContainer& container)
		12
		uint getConfigMngrUI(IConfigMngrUI@&, IMDObject@+)
	  #if ver >= 8.3.5.823
		16
	  #else
		18
	  #endif
		uint getTemplatesMainConfigMngrUI(IConfigMngrUI@&)

:service IInfoBaseService {F7399BD5-100E-4D0A-A5CE-F97810ACFEE9}
	:virt
		12
	  #if ver < 8.3.4
		uint getDefault(IInfoBase@&)
	  #else
		IInfoBase@+ getDefault()
	  #endif

:service IMDService {5BB3A551-35F7-11D4-940F-008048DA11F9}
	:virt
		+1
		MDPropertyRef@ mdProp(const Guid& id)
		+1
		+1
		+1
		IMDClass@+ mdClass(const Guid& id)

:iface IConfigMngrUI {B725F668-13C8-4BFF-90B9-33E19AA42E06}
	:virt
	  #if ver < 8.3.6
		24
	  #else
		22
	  #endif
		void mdTreeShow(bool show, bool activate = true)
		bool mdTreeIsVisible()

	  #if ver < 8.3.4
		27
	  #elif ver < 8.3.6
		28
	  #elif ver < 8.3.9
		26
	  #else
	    27
	  #endif
		IMDContainer@+ getMDCont()
		+1
		uint getPictureCol(IUnknown@&)
		+2
		uint getStyleCol(IUnknown@&)
		uint getTypesInfoProvider(ITypesInfoProvider@&)
		+4
		bool isModified()
		+4
		v8string identifier()
		+3
		void activateObjInTree(const Guid& uuid, const Guid& propId, bool wndActivate)

:iface ITypesInfoProvider {936EFFDE-1F59-4498-816F-8D495E205838}
	:virt
		void typesInfo(const Guid& category, int alias, Vector& typesInfo)
		+3
		uint dataProviderInfo(IDataProviderInfo@&, const Guid& type, int k = 0)

:iface IDataProviderInfo {174FD971-DF4E-4B5E-9EC6-A05527338A45}
	:virt
		uint fieldsCount()
		uint fieldId(CompositeID&out, uint idx)
		/// идентификатор поля по умолчанию
		uint defaultField(CompositeID&out)
		/// информация о поле по идентификатору
		bool fieldInfo(const CompositeID& id, FieldInfo& info)

:iface IMDObject {12BFDDD0-36CC-11D4-940F-008048DA11F9}
	:virt
		IMDClass@+ get_mdClass()
		+1
		const Guid& get_id()
		void set_id(const Guid& id)
		void set_mdParentLink(IMDParentLink@+ site)
		IMDParentLink@+ get_mdParentLink()
		+3
		int mdPropVal(const Guid& mdPropId, Value& value)
		bool setMdPropVal(const Guid& mdPropId, const Value& value)
		bool validateMDPropValue(const Guid& mdPropId, Value& value, v8string& errString, bool)
		int mdPropVal(uint id, Value& value)
		bool setMdPropVal(uint id, const Value& value)
		bool validateMdPropVal(uint id, Value& value, v8string& errString, bool)
		+1
		uint childCount(const Guid& childMdKind)
		IMDObject@+ child(const Guid& childMdKind, const Guid& id)
		IMDObject@+ childAt(const Guid& childMdKind, uint index)
		+9
		bool isModified()
		void setModified(bool modified)
		+5

:iface IMDContainer {12BFDDD2-36CC-11D4-940F-008048DA11F9}
	:base IMDObject
	:virt
	  #if ver < 8.3.6
		+2
	  #elif ver <8.3.7.1759
	    +6
		// Артур
	  // #else
	  //   +7
	  #elif ver <8.3.10
	    +7
	  #else
	    +8
		// завершение
	  #endif
		IMDObject@+ objById(const Guid& objId)
		+4
		IMDObject@+ objByTypeId(const Guid& typeId)
	  #if ver < 8.3.6
		52
	  #elif ver <8.3.7.1759
	    56
	  #else
		57
	  #endif
		IMDContainer@+ masterContainer()

:iface IMDParentLink {6F00D0F0-4DAD-11D4-9415-008048DA11F9}
	:virt
		IMDObject@+ getMDObject()

:iface IMDClass {12BFDDD1-36CC-11D4-940F-008048DA11F9}
	:virt
		Guid& get_id() 
		uint getName(int lang)				// Имя одного объекта - Документ
		int presentation(v8string& text)	// Представление одного объекта
		uint getClassName(int lang)			// Имя класса объектов - Документы
		int classPresentation(v8string&)	// Представление класса объектов
		+1
		uint propCount()
		const Guid& getPropIDAt(uint index)
		+4
	  #if ver >= 8.3
		+2
	  #endif
	  #if ver>=8.3.8
	    +1
	  #endif
		uint childClassesCount()
		save const Guid& childClassIDAt(uint index)

:iface IConfigMngr {DE9DE45C-5440-403A-840F-48AD6D581E35}
	:virt
	  #if ver <8.3.3.641
		35
	  #elif ver < 8.3.9
		38
	  #elif ver < 8.3.10
		82
	  #else
	    83
	  #endif
		IMDContainer@+ getMDCont(int i = 0)

:iface IConfigMngrUIOwner {FE226A57-F6F0-455f-9CDC-F916AC901CC2}
	:virt
		IConfigMngrUI@+ getUI()

:iface IInfoBase {D1344594-BE0C-4135-BF15-753C1C75D554}
	:virt
	  #if ver>=8.3.7 | ver=8.3.6.1945
		+2
	  #endif
		v8string connectString()

	  #if ver < 8.3
		62
	  #elif ver < 8.3.3
		63
	  #elif ver < 8.3.5
		64
	  #elif ver < 8.3.6 | ver = 8.3.6.1945
		61
	  #elif ver < 8.3.7
		59
	  #elif ver < 8.3.9
	    53
	  #else
	    54
	  #endif
		IConfigMngr@+ getConfigMgr()

:iface IMDEditHelper {888744F9-B616-11D4-9436-004095E12FC7}
	:virt
	  #if ver < 8.3.5
	    8
		void getTreeItemInfo(const Guid& id, MDTreeItemInfo& info, int k = 0)
		IMDObject@+ getMDObj()
		+4
	    void openEditor()
		+4
		bool changeProperty(const Guid& propId, const Value& value)
	    void editProperty(const Guid& propUuid)
		+3
		uint extPropEditor(IUnknown@&, const Guid& propUuid)
		const Guid& extPropEditorCLSID(const Guid& propUuid)
		uint extProp(IUnknown@&, const Guid& propUuid, bool noCached = false)
		const Guid& extPropCLSID(const Guid& propUuid)
	  #else
		13
		uint extPropEditor(IUnknown@&, const Guid& propUuid)
		const Guid& extPropEditorCLSID(const Guid& propUuid)
		uint extProp(IUnknown@&, const Guid& propUuid, bool noCached = false)
		const Guid& extPropCLSID(const Guid& propUuid)
	    22
		void getTreeItemInfo(const Guid& id, MDTreeItemInfo& info, int k = 0)
		IMDObject@+ getMDObj()
		+4
	    void openEditor()
	  #if ver < 8.3.10
		+4
	  #else
		+6
	  #endif

		bool changeProperty(const Guid& propId, const Value& value)
	    void editProperty(const Guid& propUuid)
	  #endif

:iface IMDBaseObj {D3624077-1010-45F0-A596-77ADD399D777}
	:base IMDObject
	:virt
		// Артур
	  #if ver >= 8.3.10
	    44
		#else
		//завершение
			#if ver >= 8.3.6
				+4
			#endif
			#if ver >= 8.3.7.1759
				+1
			#endif
		// Артур
	  #endif
		// завершение
		const v8string& getName()
		v8string getSynonym(const v8string&in lc)
		+1
		const v8string& getDescr()
		+5

:iface ILocalString {FD68C620-4B24-11D4-9415-008048DA11F9}
	:virt
        +1
		const LocalWString& localStrings()

:iface IMDEditModuleHelper {963CE56B-FCF9-4E6D-8EBC-374721B63ABA}
	:virt
		bool hasModule(const Guid& propId, Vector&)
		+1
		bool textOfModule(const Guid& propId, bool s, v8string&out result)
		+2
		const Guid& moduleExpandType(const Guid& propId)
		+1
		// Семён
		#if ver >= 8.3.9
		+1
		#endif
		//
		uint openModule(ITextManager@&, const Guid& propId, bool s, bool open, ITextEditor@& editor)
		

:iface IMDTypedObj {752BB41D-05DA-4FD1-A680-78DFB6C6EB1C}
	:base IMDBaseObj
	:virt
		+5
		const TypeDomainPattern& typeDomain()

:iface IMDExtObj {E80EA0D4-FE4C-446F-9567-9833A72DD396}
	:virt
	+11
    uint url(URL&)

:struct MDProperty
	:props
	  #if ver >= 8.3.5 & ver < 8.3.7
		int vt
	  #endif
		int refs
		Guid id
		uint nameEng
		uint nameRus
		int i1
		int i2
		uint resMod1
		uint resID
		uint resMod2
		uint resCatID
		IType@ pIType

:enum EventMetaDataKind
	emdAddChild
	emdPropChanged
	emdDeleteChild
	emdChanged
	emdSave
	emdClose
	emdAfterSave

:struct FieldInfo
	:props
		v8string name1
		v8string name2
		v8string description
		TypeDomainPattern typeDomain
		bool readOnly
	:meths
		void init()
		{
			/*
			obj.readOnly = false
			obj.name1._ctor();
			obj.name2._ctor();
			obj.description._ctor();*/
			mem::memset(obj.self, 0, FieldInfo_size);
			obj.typeDomain._ctor(IID_NULL);
		}
		---

:struct MDEventInfo
	:props
		bool request
		bool result
		EventMetaDataKind kind
		IMDObject@ object
		IMDObject@ parent
		Guid id
		Guid changedPropId

:struct TypeInfo
	:props
		Guid typeId
		v8string name
		int priority
		int order
		IGlyph@ image
		uint i1
		bool compaundType
		bool unMergeable
		v8string str
	  #if ver >= 8.3.5
	    +4
	  #endif
	:meths
		void dtor()
		{
			obj.name._dtor();
			obj.str._dtor();
			&&obj.image = null;
		}
		---

:struct MDTreeItemInfo
	:props
		Guid			id
		v8string		text
		IMDEditHelper@	editHelper
		IImage@			image
		+40
	:meths
		void init()
		{
			mem::memset(obj.self, 0, MDTreeItemInfo_size);
		}
		---


:global
	:meths
		IMDEditService@ getMDEditService()
		{
			return currentProcess().getService(IID_IMDEditService);
		}
		---
		IInfoBase@ getDefaultInfoBase()
		{
			IInfoBaseService@ srv = currentProcess().getService(IID_IInfoBaseService);
			IInfoBase@ res;
		  #if ver < 8.3.4
			srv.getDefault(res);
		  #else
			@res = srv.getDefault();
		  #endif
			return res;
		}
		---
		IMDService@ getMDService()
		{
			return currentProcess().getService(IID_IMDService);
		}
		---

:guid eventMetaData		{2282FCC8-BF58-47F6-A420-3FFEB8F193E5}
:guid eventSaveModules	{9C023C90-0144-497D-9ED9-B2949DD557C4}
// ID класса метаданных "ОбщийМодуль"
:guid mdClassCmnModule	{0FE48980-252D-11D6-A3C7-0050BAE0A776}
// ID свойства метаданных "Имя"
:guid namePropUuid		{CF4ABEA2-37B2-11D4-940F-008048DA11F9}
// ID свойства метаданных "Синоним"
:guid synmPropUuid		{CF4ABEA3-37B2-11D4-940F-008048DA11F9}
// ID свойства метаданных "Комментарий"
:guid descPropUuid		{CF4ABEA4-37B2-11D4-940F-008048DA11F9}
// ID свойства метаданных "Модуль менеджера"
:guid gModOfMgr			{D1B64A2C-8078-4982-8190-8F81AEFDA192}
// ID свойства метаданных "Модуль"
:guid gModule			{D5963243-262E-4398-B4D7-FB16D06484F6}
// ID свойств метаданных общих модулей
:guid gcmIsGlobal		{7DBB2BC7-6BAE-4B81-91CB-681317272A0B}	// Глобальный
:guid gcmClMngApp		{74CE8A02-ABD2-46A6-8544-8CFBB4E8C6E0}	// КлиентУправляемоеПриложение
:guid gcmServer			{6275A02E-96F0-4347-975A-2D661E6A0675}	// Сервер
:guid gcmExtCon			{D12660A6-7298-4AE2-A332-B95A6459A280}	// Внешнее соединение
:guid gcmClStdApp		{436AF77A-E846-4084-818B-740A3378518E}	// КлиентОбычноеПриложение
:guid gcmCallSrv		{C474BAB9-D13A-4FBD-BFB0-9214D6DC2FDE}	// Вызов сервера
:guid gcmPriviged		{334033A1-6BDA-4DBA-BC6D-0095D1B66F0B}	// Привелигированный
:guid gcmReuseRetVal	{07DDEE68-6FC0-4B88-9616-7792446D12B8}	// ПовторноеИспользованиеВозвращаемыхЗначений
// Некоторые свойства объекта "Конфигурация"
:guid gMainRunMode		{C6C6CDEC-9DE1-431F-B17A-E442EEBF86C1}	// основной режим запуска
:guid gModStdApp		{A78D9CE3-4E0C-48D5-9863-AE7342EEDF94}	// модуль обычного приложения
:guid gModMngApp		{D22E852A-CF8A-4F77-8CCB-3548E7792BEA}	// модуль управляемого приложения
:guid gModSeance		{9B7BBBAE-9771-46F2-9E4D-2489E0FFC702}	// модуль сеанса
:guid gModExtCon		{A4A9C1E2-1E54-4C7F-AF06-4CA341198FAC}	// модуль внешнего соединения
