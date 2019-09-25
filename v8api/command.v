// Описание интерфейсов работы с командами
:struct CommandID
:props
	Guid group
	uint num
:meths
	void ctor(const Guid&in group, int num)
	{
		obj.group = group;
		obj.num = num;
	}
	---

:struct Command
:props
	CommandID id
	int       param
	uint	  object
:meths
	void ctor(const CommandID&in _id, int p)
	{
		obj.id = _id;
		obj.param = p;
		obj.object = 0;
	}
	---

:iface ICommandState {E4328FC0-D97B-11d3-8A57-008048DA06DF}
:virt
	const CommandID& id()
	long param()
	IUnknown@ object()
	void enable(bool enable)
	void setCheck(bool check)
	void setText(const v8string&in text)
	+1
	void setDescription(const v8string&in text)
	void setTooltipText(const v8string&in text)

:iface ICommandTarget {9A76B5C0-D992-11d3-8A57-008048DA06DF}
:virt
    // вызов обработчика команды
    save bool onExecute(const Command&in command)
    // запрос статуса команды
    bool onQueryStatus(ICommandState@ state)
    // поиск обработчика команды без вызова
    bool request(const CommandID& id)

:iface ICommandReceiver {377A2018-C51B-4cf5-AC03-A1509266DF2D}
:virt
    // передача команды на выполнение
    save void transmitCommand(const Command&in command, bool deactivate = true)
    // запрос обновления команды
    void updateState(ICommandState@ state)
    // определяет наличие обработчика
    bool hasHandler(const CommandID&in id)

:iface IListCmdState {8F8095EE-3DF3-4B90-BD15-C06CFF6149AC}
:virt
	void setCount(uint count)

:iface ICmdSateImpl {70A10FE2-2D9D-4B4F-B157-75F15557BE9D}
:virt
    void setCommand(const CommandID& id, IUnknown@+ state)
:props
	16
	CommandID id
	ICommandState@ cmdState
	IListCmdState@ lstState

:struct KeyAccel
:props
    v8string text
    uint vkCode
    uint8 flags

:iface ICmdDescription {3A3AA3A0-DE39-11D3-8A57-008048DA06DF}
:virt
	void id(CommandID&)
	v8string text()
	uint image(IImage@&)
	uint picture(IV8Picture@&)
	const Guid& group()
  #if ver < 8.3.5
	+1
  #endif
    +1
	v8string accelText()
	v8string description()
	v8string tooltip()
	v8string presentation()

:service ICommandService {8F885821-D353-11D3-8A57-008048DA06DF}
:virt
    uint commandDescription(ICmdDescription@&, const CommandID& id)
	//+2
	//v8string groupPresentation(const Guid&)
    //void enumGroups(Vector& groupsID)
    //void enumGroupCommands(const Guid& group, Vector& descr)


:guid CLSID_CmdStateImpl {6E3B9D91-2921-4B9D-8C25-4E7884FA3B17}

:guid cmdFrameGroup {00000000-0000-0000-0000-000000000000}
:guid cmdFrntend	{6B7291BF-BCD2-41AF-BAC7-414D47CC6E6A}
:enum FrameCommands
	72  cmdFindInTree
	600 cmdFrameShowAssist
	601 cmdFrameShowParams
:enum FrntEndCommands
	63 cmdQueryWizard
