// Работа с WinAPI
:tdef HWND		int_ptr
:tdef HDC		int_ptr
:tdef COLORREF	uint32
:tdef HICON		int_ptr
:tdef HMENU		int_ptr
:tdef UINT		uint32
:tdef BOOL		int32
:tdef BYTE		uint8
:tdef PTR		int_ptr
:tdef DWORD		uint32
:tdef HFONT		int_ptr
:tdef HGDIOBJ	int_ptr
:tdef HMONITOR	int_ptr
:tdef WPARAM	int_ptr
:tdef LPARAM	int_ptr
:tdef LRESULT	int_ptr
:tdef LONG		int32

:enum WndMessages
	0x2		WM_DESTROY
	0x3		WM_MOVE
	0x5		WM_SIZE
	0x7		WM_SETFOCUS
	0x8		WM_KILLFOCUS
	0xF		WM_PAINT
	0x10	WM_CLOSE
	0x24	WM_GETMINMAXINFO
	0x30	WM_SETFONT
	0x4E	WM_NOTIFY
	0x83	WM_NCCALCSIZE
	0x100	WM_KEYDOWN
	0x101	WM_KEYUP
	0x102	WM_CHAR
	0x104	WM_SYSKEYDOWN
	0x110	WM_INITDIALOG
	0x111	WM_COMMAND
	0x201	WM_LBUTTONDOWN
	0x214	WM_SIZING
	0x300	EN_CHANGE

:enum WinConstants
	17		DEFAULT_GUI_FONT

:enum VirtualKeyCodes
	0x01 	VK_LBUTTON
	0x02 	VK_RBUTTON
	0x03	VK_CANCEL
	0x04	VK_MBUTTON
	0x05	VK_XBUTTON1
	0x06	VK_XBUTTON2
	0x08	VK_BACK
	0x09	VK_TAB
	0x0C	VK_CLEAR
	0x0D	VK_RETURN
	0x10	VK_SHIFT
	0x11	VK_CONTROL
	0x12	VK_MENU
	0x13	VK_PAUSE
	0x14	VK_CAPITAL
	0x15	VK_KANA
	0x15	VK_HANGEUL
	0x15	VK_HANGUL
	0x17	VK_JUNJA
	0x18	VK_FINAL
	0x19	VK_HANJA
	0x19	VK_KANJI
	0x1B	VK_ESCAPE
	0x1C	VK_CONVERT
	0x1D	VK_NONCONVERT
	0x1E	VK_ACCEPT
	0x1F	VK_MODECHANGE
	0x20	VK_SPACE
	0x21	VK_PRIOR
	0x22	VK_NEXT
	0x23	VK_END
	0x24	VK_HOME
	0x25	VK_LEFT
	0x26	VK_UP
	0x27	VK_RIGHT
	0x28	VK_DOWN
	0x29	VK_SELECT
	0x2A	VK_PRINT
	0x2B	VK_EXECUTE
	0x2C	VK_SNAPSHOT
	0x2D	VK_INSERT
	0x2E	VK_DELETE
	0x2F	VK_HELP
	0x5B	VK_LWIN
	0x5C	VK_RWIN
	0x5D	VK_APPS
	0x5F	VK_SLEEP
	0x60	VK_NUMPAD0
	0x61	VK_NUMPAD1
	0x62	VK_NUMPAD2
	0x63	VK_NUMPAD3
	0x64	VK_NUMPAD4
	0x65	VK_NUMPAD5
	0x66	VK_NUMPAD6
	0x67	VK_NUMPAD7
	0x68	VK_NUMPAD8
	0x69	VK_NUMPAD9
	0x6A	VK_MULTIPLY
	0x6B	VK_ADD
	0x6C	VK_SEPARATOR
	0x6D	VK_SUBTRACT
	0x6E	VK_DECIMAL
	0x6F	VK_DIVIDE
	0x70	VK_F1
	0x71	VK_F2
	0x72	VK_F3
	0x73	VK_F4
	0x74	VK_F5
	0x75	VK_F6
	0x76	VK_F7
	0x77	VK_F8
	0x78	VK_F9
	0x79	VK_F10
	0x7A	VK_F11
	0x7B	VK_F12
	0x7C	VK_F13
	0x7D	VK_F14
	0x7E	VK_F15
	0x7F	VK_F16
	0x80	VK_F17
	0x81	VK_F18
	0x82	VK_F19
	0x83	VK_F20
	0x84	VK_F21
	0x85	VK_F22
	0x86	VK_F23
	0x87	VK_F24
	0x90	VK_NUMLOCK
	0x91	VK_SCROLL
	0x92	VK_OEM_NEC_EQUAL
	0x92	VK_OEM_FJ_JISHO
	0x93	VK_OEM_FJ_MASSHOU
	0x94	VK_OEM_FJ_TOUROKU
	0x95	VK_OEM_FJ_LOYA
	0x96	VK_OEM_FJ_ROYA
	0xA0	VK_LSHIFT
	0xA1	VK_RSHIFT
	0xA2	VK_LCONTROL
	0xA3	VK_RCONTROL
	0xA4	VK_LMENU
	0xA5	VK_RMENU
	0xA6	VK_BROWSER_BACK
	0xA7	VK_BROWSER_FORWARD
	0xA8	VK_BROWSER_REFRESH
	0xA9	VK_BROWSER_STOP
	0xAA	VK_BROWSER_SEARCH
	0xAB	VK_BROWSER_FAVORITES
	0xAC	VK_BROWSER_HOME
	0xAD	VK_VOLUME_MUTE
	0xAE	VK_VOLUME_DOWN
	0xAF	VK_VOLUME_UP
	0xB0	VK_MEDIA_NEXT_TRACK
	0xB1	VK_MEDIA_PREV_TRACK
	0xB2	VK_MEDIA_STOP
	0xB3	VK_MEDIA_PLAY_PAUSE
	0xB4	VK_LAUNCH_MAIL
	0xB5	VK_LAUNCH_MEDIA_SELECT
	0xB6	VK_LAUNCH_APP1
	0xB7	VK_LAUNCH_APP2
	0xBA    VK_OEM_1 		// ';:' for US
	0xBB   	VK_OEM_PLUS 	// '+' any country
	0xBC   	VK_OEM_COMMA	// ',' any country
	0xBD   	VK_OEM_MINUS	// '-' any country
	0xBE   	VK_OEM_PERIOD	// '.' any country
	0xBF   	VK_OEM_2		// '/?' for US
	0xC0   	VK_OEM_3		// '`~' for US
	0xDB  	VK_OEM_4		//  '[{' for US
	0xDC  	VK_OEM_5		//  '\|' for US
	0xDD  	VK_OEM_6		//  ']}' for US
	0xDE  	VK_OEM_7		//  ''"' for US
	0xDF	VK_OEM_8
	0xE5	VK_PROCESSKEY
	0xE6	VK_ICO_CLEAR
	0xE7	VK_PACKET
	0xE9	VK_OEM_RESET
	0xEA	VK_OEM_JUMP
	0xEB	VK_OEM_PA1
	0xEC	VK_OEM_PA2
	0xED	VK_OEM_PA3
	0xEE	VK_OEM_WSCTRL
	0xEF	VK_OEM_CUSEL
	0xF0	VK_OEM_ATTN
	0xF1	VK_OEM_FINISH
	0xF2	VK_OEM_COPY
	0xF3	VK_OEM_AUTO
	0xF4	VK_OEM_ENLW
	0xF5	VK_OEM_BACKTAB
	0xF6	VK_ATTN
	0xF7	VK_CRSEL
	0xF8	VK_EXSEL
	0xF9	VK_EREOF
	0xFA	VK_PLAY
	0xFB	VK_ZOOM
	0xFC	VK_NONAME
	0xFD	VK_PA1
	0xFE	VK_OEM_CLEAR

:global
:dlls user32.dll
	stdcall BOOL SetWindowText(HWND, int_ptr)|SetWindowTextW
	stdcall int GetWindowTextLength(HWND hWnd)|GetWindowTextLengthW
	stdcall int GetWindowText(HWND hWnd, int_ptr lpString, int nMaxCount)|GetWindowTextW
	stdcall void keybd_event(BYTE bVk, BYTE bScan, DWORD dwFlags, PTR dwExtraInfo)|keybd_event
	stdcall UINT MapVirtualKey(UINT uCode, UINT uMapType)|MapVirtualKeyW
	stdcall HWND SetFocus(HWND hWnd)|SetFocus
	stdcall HWND GetFocus()|GetFocus
	stdcall LRESULT SendMessage(HWND,UINT,WPARAM=0,LPARAM=0)|SendMessageW
	stdcall BOOL PostMessage(HWND,UINT,WPARAM=0,LPARAM=0)|PostMessageW
	stdcall BOOL DestroyWindow(HWND hWnd)|DestroyWindow
	stdcall BOOL ShowWindow(HWND hWnd,int nCmdShow)|ShowWindow
	stdcall BOOL UpdateWindow(HWND hWnd)|UpdateWindow
	stdcall uint16 GetKeyState(int nVirtKey)|GetKeyState
	stdcall BOOL SetWindowPos(HWND hWnd, HWND hWndInsertAfter,int X,int Y,int cx,int cy,UINT uFlags)|SetWindowPos
	stdcall HDC GetDC(HWND hWnd)|GetDC
	stdcall BOOL GetCaretPos(Point&out lpPoint)|GetCaretPos
	stdcall HWND GetDesktopWindow()|GetDesktopWindow
	stdcall int ReleaseDC(HWND hWnd, HDC hDC)|ReleaseDC
	stdcall int GetSystemMetrics(int nIndex)|GetSystemMetrics
	stdcall BOOL ClientToScreen(HWND hWnd, Point& lpPoint)|ClientToScreen
	stdcall BOOL ScreenToClient(HWND hWnd, Point& lpPoint)|ScreenToClient
	stdcall BOOL CreateCaret(HWND hWnd, int_ptr hBitmap, int nWidth, int nHeight)|CreateCaret
	stdcall BOOL SetCaretPos(int X, int Y)|SetCaretPos
	stdcall BOOL ShowCaret(HWND hWnd)|ShowCaret
	stdcall BOOL DestroyCaret()|DestroyCaret
	stdcall int GetClassName(HWND hWnd, int_ptr lpClassName, int nMaxCount)|GetClassNameW
	stdcall HWND FindWindow(int_ptr lpClassName, int_ptr lpWindowName)|FindWindowW
	stdcall BOOL IsWindowVisible(HWND hWnd)|IsWindowVisible
	stdcall BOOL PeekMessage(MSG& lpMsg, HWND hWnd,UINT wMsgFilterMin,UINT wMsgFilterMax,UINT wRemoveMsg)|PeekMessageW
	stdcall int_ptr DialogBoxIndirectParam(int_ptr hInstance, int_ptr hDialogTemplate, HWND hWndParent, int_ptr lpDialogFunc, LPARAM dwInitParam)|DialogBoxIndirectParamW
	stdcall BOOL EndDialog(HWND hDlg, int_ptr nResult)|EndDialog
	stdcall BOOL GetWindowRect(HWND hWnd, Rect& lpRect)|GetWindowRect
	stdcall HWND CreateWindowEx(DWORD dwExStyle, int_ptr lpClassName, int_ptr lpWindowName, DWORD dwStyle, int X, int Y, int nWidth, int nHeight, HWND hWndParent, HMENU hMenu, int_ptr hInstance, int_ptr lpParam)|CreateWindowExW
	stdcall BOOL MoveWindow(HWND hWnd, int X, int Y, int nWidth, int nHeight, BOOL bRepaint)|MoveWindow
	stdcall BOOL GetClientRect(HWND hWnd, Rect& lpRect)|GetClientRect
	stdcall BOOL AdjustWindowRectEx(Rect& lpRect, DWORD dwStyle, BOOL bMenu, DWORD dwExStyle)|AdjustWindowRectEx
	stdcall LONG GetWindowLong(HWND hWnd, int nIndex)|GetWindowLongW

:global
:dlls gdi32.dll
	stdcall HFONT CreateFontIndirect(LOGFONT& lplf)|CreateFontIndirectW
	stdcall HGDIOBJ SelectObject(HDC hdc,HGDIOBJ h)|SelectObject
	stdcall BOOL GetTextExtentPoint32(HDC hdc, uint32 lpString, int c, Size&)|GetTextExtentPoint32W
    stdcall BOOL DeleteObject(HGDIOBJ ho)|DeleteObject
	stdcall int GetDeviceCaps(HDC hdc,int index)|GetDeviceCaps
	stdcall int_ptr GetStockObject(int i)|GetStockObject
	stdcall int GetObjectW(int_ptr h, uint c, int_ptr pv)|GetObjectW

:global
:dlls kernel32.dll
	stdcall void Sleep(uint)|Sleep
	stdcall DWORD GetTickCount()|GetTickCount
	stdcall BOOL VirtualProtect(int_ptr address, uint size, uint newProtect, uint&out oldProtect=void)|VirtualProtect
	stdcall int MultiByteToWideChar(UINT CodePage, DWORD dwFlags, int_ptr lpMultiByteStr, int cbMultiByte, int_ptr lpWideCharStr, int cchWideChar)|MultiByteToWideChar
	stdcall int WideCharToMultiByte(UINT CodePage, DWORD dwFlags, int_ptr lpWideCharStr, int cchWideChar, int_ptr lpMultiByteStr, int cbMultiByte, uint lpDefaultChar, bool& lpUsedDefaultChar)|WideCharToMultiByte
	stdcall int_ptr GetCommandLine()|GetCommandLineW
	stdcall DWORD ExpandEnvironmentStrings(int_ptr lpSrc, int_ptr buffer, DWORD nSize)|ExpandEnvironmentStringsW
	stdcall DWORD GetTempPath(DWORD nBufferLength, int_ptr lpBuffer)|GetTempPathW
	stdcall BOOL CreateDirectory(int_ptr lpPathName, int_ptr=0)|CreateDirectoryW
	stdcall int_ptr LoadLibraryEx(int_ptr lpLibFileName, int_ptr=0, uint dwFlags=0)|LoadLibraryExW
	stdcall int_ptr GetProcAddress(int_ptr hModule, int_ptr lpProcName)|GetProcAddress
	stdcall void DebugBreak()|DebugBreak
	stdcall int_ptr GetModuleHandle(int_ptr lpModuleName)|GetModuleHandleW
	stdcall DWORD GetLastError()|GetLastError


:struct LOGFONT
:props
    int		lfHeight
    int		lfWidth
    int		lfEscapement
    int		lfOrientation
    int		lfWeight
    uint8	lfItalic
    uint8	lfUnderline
    uint8	lfStrikeOut
    uint8	lfCharSet
    uint8	lfOutPrecision
    uint8	lfClipPrecision
    uint8	lfQuality
    uint8	lfPitchAndFamily
	uint16	lfFaceNameStart
	+60
	uint16	lfFaceNameEnd

:struct MONITORINFO
:props
    uint cbSize
    Rect rcMonitor
    Rect rcWork
    uint dwFlags

:struct MSG
:props
	uint hwnd
	uint message
	uint wParam
	uint lParam
	uint time
	uint ptx
	uint pty

:struct MINMAXINFO
:props
    Point ptReserved
    Point ptMaxSize
    Point ptMaxPosition
    Point ptMinTrackSize
    Point ptMaxTrackSize
