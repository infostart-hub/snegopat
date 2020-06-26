// Описание интерфейсов работы с окнами
:iface IView {B105A780-F121-11d3-93F7-008048DA11F9}
:virt
    void drawView(HDC dc, const Rect& rect, const Rect& updateRect)
    bool setViewEnable(bool enable)
    bool isViewEnable()
    Size getViewExtent()
	+1
    +1 //void getMinMaxExtent(Size& minExtent, Size& maxExtent)

:iface IWindowView {E3F69D70-0188-11d4-9400-008048DA11F9}
:base IView
:virt
	+1
    save bool createWindow(HWND parentWindow)
    void destroyWindow()
    bool showWindow(bool show)
    bool isWindowVisible()
    void moveAfter(HWND wnd)
    void invalidateRect(const Rect& rect, bool eraseBkgnd = true)
    HWND hwnd()
    void windowRect(Rect& rect)
    COLORREF getWindowBackgroundColor()

:enum CloseAction
	DelOnClose
	HideOnClose
	NoClose

:enum ActivateType
	atActivate
	atDeactivate
	atKillFocus
	atSetFocus

:enum WndType
	wtDock
	wtFloat
	wtMDI
	wtModal

:enum WindowStyles
	1	wsNoStyle
	2	wsSysMenu
	4	wsMinimizeBox
	8	wsMaximizeBox
	16	wsHelpBox
	32	wsBorder
	64	wsCaption
	128 wsSizable
	256 wsCloseOnEscape

:enum ModalStates
	msNone
	msPseudo
	msModal

:iface IFramedView {7C27C850-A0F4-11D4-84AF-008048DA06DF}
:virt
	void setID(const Guid&in id)
  #if ver < 8.3.13
	uint getID(Guid&out)
  #else
	const Guid& _getID()
  #endif
	CloseAction closeAction()
	save void localFrame(WndType type, Guid& id, uint& style)
	// Заголовок
	v8string title()
	// Иконка
	uint icon(IUnknown@&out)
	// извещение об активизации
	save void onActivate(ActivateType action, IFramedView@ otherView)
	// установка фокуса
	void setViewFocus()
	// окончание создания
	save bool onInitialUpdate()
	// окончание создания и показ окна
	save void onFinalOpen()
	void onFinalClose()
	void onCancelClose()
	bool canCloseView()
	void onShow(bool show)
	+1
	save int mdiType()	// 0 - стандартное MDI окно, 1 - 1Сное MDI окно
	+2
  #if ver >= 8.3.13
:meths
	void getID(Guid& guid)
	{
		guid = obj._getID();
	}
	---
  #endif

:iface IDocumentView {425EE301-9DD3-11D4-84AE-008048DA06DF}
	:base IFramedView
	:virt
	// Артур
	#if ver>=8.3.10
		+1
	#endif
		uint document(IDocument@&)

:enum TopLevelFrameType
	eTLFT_Unknown
	eTLFT_Main
	eTLFT_Hidden

:enum ViewStates
	1 vsDock
	2 fsFloat
	4 vsMDI
	8 vsHardDock
	16 vsHiding

:enum ViewPlacements
	0 	vpNo
	1 	vpLeft
	2 	vpTop
	4 	vpRight
	8 	vpBottom
	16	vpCenter
	32	vpTabbed

:iface ITopLevelFrame {DE300901-A120-11d4-9429-008048DA11F9}
:virt
#if ver>=8.3.15
	
#endif
    void init(const v8string&in title, HICON icon, HWND parent, const Rect&in rect, int nCmdShow)
    bool close(bool testAbility = false)
    bool canClose()
    void cancelClose()
    int frameType()
    +1 //void openView(IFramedView@+ view, const ViewPosition& position, bool activate = true, bool show = true)
#if ver>=8.3.6
	+1
#endif
#if ver < 8.3
    bool closeView(Guid id, bool b = false)
    uint getView(IFramedView@&, Guid id)
    void activateView(Guid id)
    bool showView(Guid id, bool show)
    bool isViewVisible(Guid id)
#else
    bool closeView(const Guid& id, bool b = false)
    uint getView(IFramedView@&, const Guid& id)
    void activateView(const Guid& id)
    bool showView(const Guid& id, bool show)
    bool isViewVisible(const Guid& id)
#endif
    void enumAllViews(Vector& views)

    uint getCoreTopLevelFrame(ITopLevelFrame@&out)
    uint getShellTopLevelFrame(ITopLevelFrame@&out)
    +1
    +1
    +1
    +1
	+1
    v8string getCaption()
	v8string getTitle()
    save void setTitle(const v8string&in str)
    save void setAdditionalTitle(const v8string&in str)
	v8string getAdditionalTitle()
    +1
    uint commandReceiver(ICommandReceiver@&out)
    +1 //void setForeground()

:iface IWindow {904BC445-3226-11D4-9859-008048DA1252}
:virt
	bool createWindow(HWND parent, const Rect&in rect, bool visible)
    void destroyWindow()
    HWND hwnd()

:iface ITopLevelFrameCore {3F4ED7C1-A343-11D4-84B0-008048DA06DF}
	:virt
		void f()

:iface IContainedObject {22D22380-87E3-11D4-9425-008048DA11F9}
	:virt
	    void setSite(IClientSite@+ site)
		IClientSite@+ getSite()

:iface IClientSite {22D22381-87E3-11D4-9425-008048DA11F9}
	:virt
	    IContainer@+ getContainer()

:iface IContainer {22D22382-87E3-11D4-9425-008048DA11F9}
	:virt
		uint objectsCount()
		IContainedObject@+ getObject(uint index)

:iface IFramedViewSite {547B35A0-A8E2-11D4-84B2-008048DA06DF}
	:virt
		+7
	    void split(IFramedView@+ other, ViewPlacements place, bool outside, int tabPos, int t = 0)
	    bool canSplit()
	    +1
	    void getViewPosition(ViewPosition&out vp)

:iface IViewContext {72B8C79E-ABD1-4FA2-8C3D-7E7F05A0F3ED}
	:virt
		uint getID(Guid&out id)

:iface IViewLayouter {3A1DACE0-8AD3-11D4-84A6-008048DA06DF}
	:virt
		+5
		void enumAllChilds(ViewContextList& childs, bool b = false)
		+5
		IFramedView@+ activeView()
		uint activeTarget(ICommandTarget@&)

:iface ITabbedLayouter {34F5E170-40BF-11D6-B229-0050BAE2BC79}
	:virt
		uint pagesCount()
		+1
		IFramedView@+ page(uint idx)

:iface IViewSplitter {59077081-A106-11D5-B1DF-0050BAE2BC79}
	:virt
		+2
		IFramedView@+ first()
		IFramedView@+ second()
		bool isHorizontal()

:iface IMDIClient {1CE1F0EE-56AF-4AE3-B56C-D89EEECEBBC3}
	:virt
		+10
		uint childrensCount()
		thiscall IViewContext@+ viewByIdx(uint index)
	:props
		0x18
		Vector childsIds

:iface IFormViewCore {B1C6A8A6-BC9F-11D4-9437-004095E12FC7}
	:virt
	+1
	+1 //IForm& getForm()
	bool updateData(bool save, int controlId)
	void endDialog(int result)
	void setFormSize(const Size& size, bool inDLU = true)

:struct ViewContextListNode
	:props
		uint next
		uint prev
		IViewContext@ view

:struct ViewContextList
	:props
		uint head
		uint end
		+4
// Для уточнения смотреть IBkEndUI::OpenView и IFramedViewSite_getViewPosition
:struct ViewPosition
:props
	ViewStates		state
	int				unk1
	bool			unk2
	ViewPlacements	area
	int				dockLine
	int				dockOffset
	Size            dockSize
	bool			canSplit
	Rect			floatRect
	Rect			MDI_Rect
	bool			MDI_maxed
	Size			autoHideSize
	int				stateAbility
	int             areaAbility
	bool			splitAbility
	v8string		MDI_ViewData
	v8string		floatViewData
	v8string		dockViewData
	v8string		autoHideViewData
	bool			center
	bool			unk3
	Rect			unk4
	int				unk5
	Size			unk6
  #if ver < 8.3.15
  #else
	bool			unk7
  #endif

:meths
	void ctor()
	{
		mem::memset(obj.self, 0, ViewPosition_size);
		obj.state = vsMDI;
		obj.area = vpTop;
		obj.dockSize.cx = 400;
		obj.dockSize.cy = 500;
		obj.canSplit = true;
		obj.floatRect.left = int(0x80000000);
		obj.floatRect.top = int(0x80000000);
		obj.floatRect.right  = 300;
		obj.floatRect.bottom = 400;
		obj.MDI_Rect.left = int(0x80000000);
		obj.MDI_Rect.top = int(0x80000000);
		obj.MDI_Rect.right = int(0x80000000);
		obj.MDI_Rect.bottom = int(0x80000000);
		obj.stateAbility = 0x7;
		obj.areaAbility = 0xF;
		obj.splitAbility = true;
		obj.unk1 = 1;
		obj.unk2 = false;
		obj.center = false;
		obj.MDI_maxed = false;
		obj.unk3 = false;
		obj.unk4.left = kEmptyRect.left;
		obj.unk4.right = kEmptyRect.right;
		obj.unk4.top = kEmptyRect.top;
		obj.unk4.bottom = kEmptyRect.bottom;
		obj.unk5 = 0;
		obj.unk6.cx = 0;
		obj.unk6.cy = 0;
	}
	---

:struct ViewContext
	:props
		Guid			id
	  #if ver < 8.3.15
		+28
	  #else
	    +32
	  #endif
		ViewPosition	vpCurrent
		+12
		ViewPosition	vpOriginal
		Size			sizeOriginal
	  #if ver < 8.3.15
		+4
	  #endif
		IUnknown@		parent

:enum ViewOffsets
  #if ver < 8.3.11
	64 ViewContextOffset
	44 FocusedViewInCoreFrame
	48 ActiveViewInCoreFrame
	96 ViewContextInView
  #elif ver < 8.3.15
	56 ViewContextOffset
	48 FocusedViewInCoreFrame
	52 ActiveViewInCoreFrame
	88 ViewContextInView
  #else
	56 ViewContextOffset
	52 FocusedViewInCoreFrame
	56 ActiveViewInCoreFrame
	88 ViewContextInView
  #endif

:guid gMDIClientID	{33ECE94C-5FB9-4540-9B97-C874FD45AE08}
