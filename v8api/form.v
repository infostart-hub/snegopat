:iface IDocumentFactory {EA26B900-A5D1-11D4-942A-008048DA11F9}
:virt
    uint createDocument(IDocument@&, const v8string&in initData)

:iface ILangSettings {3B095890-1DDE-47E8-A225-FD77D7B31310}
:virt
	v8string currentLanguage()
	v8string defaultLanguage()
	int mainLang()
	void languages(Vector& langs)

:iface ICustomFormDesigner {525A1AA8-51E4-4185-989B-11740ABA7221}
:virt
    void init()
    void setFormSettings(IUnknown& settings, const Guid& iid)
    void prepare()
    uint getForm(IUnknown@&)
    uint getModule(IDocument@&)
    +1
    void setModuleWizardCLSID(const Guid& id)

:iface ICopyHelperCreator {3BAE0A18-CE8B-4126-ABD6-AA387D917832}
:virt
	void setIids(const Guid& guid,  const Vector& iids)

:iface ICustomForm {D7F21E7F-C920-417B-948B-D884ECCA5F40}
:virt
	21
	uint getFormController(IUnknown@&, CompositeID&)
	54
	void setRuntimeModule(IUnknown& runtimeModule)


:iface ICustomFormLoader {5DD393EE-FFAE-4CA7-BECD-805B7C2FF928}
:virt
	void loadCustomForm(IFile& file, ICustomForm& form)

:iface IRuntimeModule {59A65E28-FAE2-446D-9EE7-53712452A615}
:virt
	void init(IContext& context)
    int findProp(const v8string& name)
    void setPropVal(int prop, const Value& value)
    void getPropVal(int prop, Value& value)
    int findMeth(const v8string& name)
    int getParamsCount(int meth)
    bool call(int meth, Value& ret, Vector& params, bool)
    uint context(IContext@&)

:iface IForm {63E6DC41-7D8E-11D4-9423-008048DA11F9}
:virt
    void prepareForm()
    bool setLayouter(const Guid& guid)
    +1 //ILayouter* getLayouter()
    +1 //uint addControl(const Guid& guid, bool visible, uint uint, uint layouterId)
    +1 //uint addFVControl(const Guid& guid, bool visible, uint uint, uint layouterId)
    +1 //void removeControl(uint uint)
    uint getControlID(IUnknown& control)
    uint getControlID(uint index)
    uint controlsCount()
    bool setControlData(uint controlId, const Value& value)
    bool getControlData(uint controlId, Value& value)
	uint getControl(IUnknown@&out res, uint controlId, const Guid& iid)
    uint getActiveControlId()
    bool activateControl(uint controlId)
    bool activateNextControl(bool cycle, bool skip = false, const uint& startID = 0)
    bool activatePrevControl(bool cycle)
    bool activateFirstControl(bool skip = false)
    bool activateLastControl()
    uint getNextControlId(uint controlId)
    uint getPrevControlId(uint controlId)
    +1 //ILayouter* getControlLayouter(uint uint)
    bool isControlVisible(uint controlId)
    bool isControlEnable(uint controlId)
    v8string getTitle()
    void setTitle(const v8string& title)
    +1 //const LocalWString& getTitleLocalString()
    +1 //void setTitleLocalString(const LocalWString& title)
    Size getFormSize(bool inDLU = true)
    void setFormSize(const Size& size, bool inDLU = true)
    +1 //void setFormSizeUnconditionally(const Size& size, bool inDLU = true)
    bool onCtrlChangeData(uint controlId)
    bool setCtrlDirty(uint controlId, bool dirty)
    bool getCtrlDirty(uint controlId)
    +1 //void setEnterButtonBehaviour(EnterButtonBehaviour behaviour)
    +1 //EnterButtonBehaviour getEnterButtonBehaviour()
    +1 //void setContextHelp(const URL& help)
    URL getContextHelp()
    void onContextHelp()

:iface IFormCtrl {1E7F6215-C9DF-11D4-943C-004095E12FC7}
:virt
    bool setCode(const v8string& code)
    const v8string& getCode()
    void setTabPos(uint tabPos)
    uint getTabPos()
    bool getDefaultButton()
    void setDefaultButton(bool defaultButton)
    void setCommandSourceID(uint id)
    uint getCommandSourceID()
    void setModifyData(bool modifyData)
    bool getModifyData()
    void setSkipOnInput(bool skipOnInput)
    bool getSkipOnInput()
    void setFirstInGroup(bool flag)
    bool getFirstInGroup()

:iface IFormDialog {9CD510C0-ABFC-11D4-9434-004095E12FC7}
:virt
	bool requestChangeData(uint controlId)
	bool processEvents(uint controlId, uint eventId, Vector& params)
	bool processChangeData(uint controlId)
	+1	//void doDataExchange(DataExchange& ddx)
	bool onExecuteCommand(const Command& command)
	bool onQueryCommandStatus(ICommandState& state)
	bool requestCommand(const CommandID& id)
	bool onExecuteControlCommand(const uint& controlID, const Command& command)
	bool onQueryControlCommandStatus(const uint& controlID, ICommandState& state)
	bool requestControlCommand(const uint& controlID, const CommandID& id)
	+1 //bool preTranslateMessage(const MSG& msg)


:guid CLSID_FormDesDocFactory		{2E9E612F-0D59-4C07-B7CA-3F7E90991BB4}
:guid CLSID_FormDocumentFactory		{7390B8F7-EF6C-4E31-BFB0-96FCEDFFB2CA}
:guid CLSID_CoreTypesInfoProvider	{534F47B5-EF47-4ABA-BF9F-7BC1FF7467AF}
:guid CLSID_SimpleLangSettings		{2E59719E-D8ED-453C-AD13-7B4DB178375B}
:guid CLSID_ModuleWizard			{93FE3BE7-77EA-4756-B52F-94D313DA4980}
:guid CLSID_Layouter				{12735FB0-15FD-11d4-9403-008048DA11F9}
:guid IID_V8StyleCol				{260B6E67-E606-4A19-ABA2-2793F41F42AA}
:guid IID_V8PictureCol				{7565FDF9-36F1-48D2-A034-72A5C2FE1A0D}
:guid IID_FormCopy1					{AC946F52-8B2A-11D5-B99C-0050BAE0A95D}
:guid IID_FormCopy2					{AC946F54-8B2A-11D5-B99C-0050BAE0A95D}
:guid IID_FormCopy3					{AC946F56-8B2A-11D5-B99C-0050BAE0A95D}
:guid IID_FormCopy4					{1DBD06DD-D07E-4903-BC44-749C429DD1E8}
:guid IID_FormCopy5					{AC946F5C-8B2A-11D5-B99C-0050BAE0A95D}
:guid IID_FormCopy6					{9EDA32E0-7D9F-4D6C-8E77-C74D0E6D0E4C}
:guid IID_FormCopy7					{38485B6B-D8DB-4744-AE03-BCEB96EB30BB}
:guid CLSID_TIProvider				{68874996-BA64-4C08-A452-341D470A4B9F}
:guid CLSID_CustomForm				{D5CA80B3-5363-41A9-B71B-99BD9B17F35A}
:guid CLSID_CustomFormLoader		{5A3A5EB5-9C8E-41F5-A15B-3F4720ED0ACB}
