// Сервис BkEndUI
:service IBkEndUI {614E1F45-71A9-11D4-B997-008048DA0334}
:virt
//////////////////////////////////////////////////////
// Открытие окна
#if ver < 8.3.6
	9
#else
	10
#endif
  #if ver >= 8.3.18
	save void openView(IFramedView& view, const ViewPosition& pos=ViewPosition(), int openIn=0, bool activate=true, const Guid& g=IID_NULL)
  #else
	save void openView(IFramedView& view, const ViewPosition& pos=ViewPosition(), int openIn=0, bool activate=true, const Guid& g=IID_NULL, const Rect& r=kEmptyRect)
  #endif
////////////////////////////////////////////////////////
// Открыть диалог и Предупреждение
#if ver >= 8.3.9
    21
#elif ver >= 8.3.7
	20
#elif ver >= 8.3.6
    19
#elif ver >= 8.3.5
    18
#else
    17
#endif
  #if ver < 8.3.4 | ver >= 8.3.18
	save int doModal1(IFramedView& pView, int i1, int i2, int i3, int i4, int i5, int i6, int i7, int i8)
  #else
	save int doModal1(IFramedView& pView, int i1, int i2, int i3, int i4, int i5, int i6, int i7, int i8, int i9)
  #endif

#if ver < 8.3
    save int messageBox(const v8string&in text, uint type=0, uint timeout=0, uint caption=0, HWND parent=uint(-1), mbp& param=mbp(), int i1=0, int i2=0, int i3=0)
#elif ver < 8.3.12
    save int messageBox(const v8string&in text, uint type=0, uint timeout=0, uint caption=0, HWND parent=uint(-1), mbp& param=mbp(), int i1=0, int i2=0, int i3=0, int i4=0, int i5=0)
#else
    #if ver = 8.3.17.1823
     +1
    #endif
    save int messageBox(const v8string&in text, uint type=0, uint timeout=0, uint caption=0, HWND parent=0, mbp& param=mbp(), int i1=0, int i2=0, int i3=0, int i4=0, int i5=0)
#endif

	+1

  #if ver < 8.3.4 | ver >= 8.3.18
	save int doModal2(IFramedView& pView, int i1, int i2, int i3, int i4, int i5, int i6, int i7)
  #else
	save int doModal2(IFramedView& pView, int i1, int i2, int i3, int i4, int i5, int i6, int i7, int i8)
  #endif
////////////////////////////////////////////////////////
// Модальное состояние
	ModalStates currentModalState()

////////////////////////////////////////////////////////
// Сообщить
    #if ver >= 8.3.18
      51
    #elif ver >= 8.3.17.1823
        53
	#elif ver >= 8.3.10.1877
		52
	#elif ver >= 8.3.9
	    50
	#elif ver >= 8.3.7
		49
    #elif ver >= 8.3.6
        48
    #elif ver >= 8.3.5.823
        44
    #elif ver >= 8.3.3.641
        43
    #elif ver >= 8.3.2.163
        44
    #elif ver >= 8.2.18.44
        43
    #elif ver >= 8.2.16.352
        44
    #else
        43
    #endif
    save int doMsgLine(const v8string&in text, MessageMarker marker=mNone, const Guid&in g=IID_NULL, int i1=0, IUnknown@ pUnkObject=null, const V8Picture&in customMarker=V8Picture())
  #if ver < 8.3.15
		+21
  #else
        +22
  #endif
	save bool GetFileName(SelectFileName& data, int timeout, HWND parent)


:enum MessageMarker
    mNone
    mTriangle
    mExc1
    mExc2
    mExc3
    mInfo

// Это мой интерфейс для организации клика на строке в окне сообщений
:iface MyMessageHandler {AA7D47D7-FBFB-489E-ACF0-5F90A7AE4744}
	:virt
		void process()

:struct mbp
:props
#if ver < 8.3.11
    int i1
    int i2
    int p1
    int p2
    int i3
    uint8 c1
:meths
    void ctor()
    {
        obj.i1 = obj.i2 = obj.i3 = 0;
        obj.p1 = obj.p2 = obj.self;
        obj.c1 = 2;
    }
    ---
#else
    int i1
    int i2
    int p1
:meths
    void ctor()
    {
        obj.i1 = obj.p1 = obj.self + 8;
        obj.i2 = 0;
    }
    ---
#endif

:enum MsgBoxStyles
    0		mbOK
    1		mbOkCancel
    2		mbAbortRetryIgnore
    3		mbYesNoCancel
    4		mbYesNo
    5		mbRetryCancel
    0x10	mbIconError
    0x20	mbIconQuestion
    0x30	mbIconWarning
    0x40	mbIconInformation
    0		mbDefButton1
    0x100	mbDefButton2
    0x200	mbDefButton3

:enum MsgBoxAnswers
    1	mbaOK
    2	mbaCancel
    3	mbaAbort
    4	mbaRetry
    5	mbaIgnore
    6	mbaYes
    7	mbaNo

:enum SelectFileMode
	sfOpen
	sfSave
	sfFolder

:enum SelectFileFlags
	1	sfMultiSelect
	2	sfPromptCreate
	4	sfFileMustExist
	8	sfDisableChangeDir
	16	sfPromptOverwrite
	32	sfUsePreview
	
:struct SelectFileName
	:props
		SelectFileMode	mode
		uint			flags
		Vector			filter	// pair<v8string, v8string>
		v8string		filterString
		uint			filterIndex
		v8string		defExt
		v8string		initialFileName
		Vector		    selectedFiles	// v8string
		v8string		directory
		v8string		title

:global
:meths
    IBkEndUI@ getBkEndUI()
    {
        return currentProcess().getService(IID_IBkEndUI);
    }
    ---
    void Message(const string& text, MessageMarker mm=mNone)
    {
        getBkEndUI().doMsgLine(text, mm);
    }
    int MsgBox(const string& text, int type=mbOK, const string& caption="", uint timeout=0)
    {
        return getBkEndUI().messageBox(text, type, timeout, caption.isEmpty() ? 0 : caption.cstr);
    }
    ---
