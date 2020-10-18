// debugger.v - интерфейсы для работы с отладчиком 1С

:iface ICalcValueCreator {77BABCB2-0E4A-4B4D-B218-F28B3A74A5CC}
:virt
	uint create(IUnknown@&, const v8string&in)

:iface IExecutionStateMediumInStream {BE1E3DC5-1FF6-4120-993E-6A0F9EF3AFA9}
:virt
    void setFile(IFileEx& pIFileEx)
	+1
    uint getInStorage(IInPersistenceStorage@&)
	//DWORD pad[5];
    //IFileExPtr m_pIFileEx_storage;

:iface IExternalCalculatorDebugger {1A7E4120-9F11-43C5-AF53-F0ED888D86C9}
:virt
	void f()

:iface IExternalCalculatorOwner {673CF811-F9B3-4747-8407-AA30A25E8413}
:virt
	save void setExternalCalculator(IUnknown& pIExternalCalculator)

:iface IDebugger {6CA6815D-DC3C-42BC-A46A-35C3C59B831C}
:virt
	+1
	uint getBigObject(IUnknown@&)

:service IDebugService {8105BA7A-D799-478D-BDE8-3F845797F921}
:virt
	+1
	IDebugger& getDebugger()

:guid CLSID_WatchWindow				{50239294-9ADB-43DB-9DF0-D4BBEE96D0C2}
:guid CLSID_Watch					{8DD82116-E77A-4A16-8AE4-A7FCC7DC3C0E}
:guid CalcValueCreator				{DF127E4F-755A-4C16-9899-FCF04CA2A368}
:guid DebuggerCommandTarget			{7A747695-3436-432F-BD9C-0E164E2FB90C}
:guid kExecutionStateEvent			{C088C651-35F3-4728-8313-F95428B9FAFA}
:guid kExecutionStateMediumOpen		{F810BCEA-6FED-46D6-BD40-286D1818A61F}
:guid kExecutionStateMediumClose	{59B96CCC-E2C2-4560-A61B-8380DF2D8E14}
:guid kRestartApplication			{DF7121DA-0A9A-4285-9E63-B17828185A60}
:guid kDebuggerAppWaitStart			{FE7C6DDD-7C99-42F8-BA14-CDD30EDF2EF1}
:guid kDebuggerAppWaitStop			{71501A9D-CD34-427D-81B6-562491BEF945}
:guid kDebuggerGetDebugProcessMode	{4FBE3EC9-44F2-43D4-BC14-27D0EFC233AF}
:guid kDebuggerStopDebugMode		{B468F4DC-E2FB-4524-A7A5-FAC6F2B8ECE0}
:guid kSomeEvent3					{822859BE-249C-4B93-8EA4-27F165EFF662}
:guid kSomeEvent6					{5B5F928D-DF2D-4804-B2D0-B453163A2C4C}
