/*  winapi.as
Различные константы WinAPI
*/
#pragma once
#include "../../all.h"

enum WinApiConst {
    KEYEVENTF_EXTENDEDKEY = 1,
    KEYEVENTF_KEYUP = 2,
    KEYEVENTF_SCANCODE = 8,

    MAPVK_VK_TO_VSC = 0,
    MAPVK_VSC_TO_VK = 1,
    MAPVK_VK_TO_CHAR = 2,
    MAPVK_VSC_TO_VK_EX = 3,

    SW_HIDE = 0,
    SW_SHOWNORMAL = 1,
    SW_NORMAL = 1,
    SW_SHOWMINIMIZED = 2,
    SW_SHOWMAXIMIZED = 3,
    SW_MAXIMIZE = 3,
    SW_SHOWNOACTIVATE = 4,
    SW_SHOW = 5,
    SW_MINIMIZE = 6,
    SW_SHOWMINNOACTIVE = 7,
    SW_SHOWNA = 8,
    SW_RESTORE = 9,
    SW_SHOWDEFAULT = 10,
    SW_FORCEMINIMIZE = 11,
    SW_MAX = 11,

    WS_OVERLAPPED = 0x00000000,
    WS_POPUP = int(0x80000000),
    WS_CHILD = 0x40000000,
    WS_MINIMIZE = 0x20000000,
    WS_VISIBLE = 0x10000000,
    WS_DISABLED = 0x08000000,
    WS_CLIPSIBLINGS = 0x04000000,
    WS_CLIPCHILDREN = 0x02000000,
    WS_MAXIMIZE = 0x01000000,
    WS_CAPTION = 0x00C00000,     /* WS_BORDER | WS_DLGFRAME  */
    WS_BORDER = 0x00800000,
    WS_DLGFRAME = 0x00400000,
    WS_VSCROLL = 0x00200000,
    WS_HSCROLL = 0x00100000,
    WS_SYSMENU = 0x00080000,
    WS_THICKFRAME = 0x00040000,
    WS_GROUP = 0x00020000,
    WS_TABSTOP = 0x00010000,
    ES_NOHIDESEL = 0x0100,
    ES_AUTOHSCROLL = 0x0080,
    WS_EX_CLIENTEDGE = 0x00000200,

    SWP_NOSIZE = 0x0001,
    SWP_NOMOVE = 0x0002,
    SWP_NOZORDER = 0x0004,
    SWP_NOREDRAW = 0x0008,
    SWP_NOACTIVATE = 0x0010,
    SWP_FRAMECHANGED = 0x0020,  /* The frame changed: send WM_NCCALCSIZE */
    SWP_SHOWWINDOW = 0x0040,
    SWP_HIDEWINDOW = 0x0080,
    SWP_NOCOPYBITS = 0x0100,
    SWP_NOOWNERZORDER = 0x0200,  /* Don't do owner Z ordering */
    SWP_NOSENDCHANGING = 0x0400,  /* Don't send WM_WINDOWPOSCHANGING */

    HWND_TOP = 0,
    HWND_BOTTOM = 1,
    HWND_TOPMOST = -1,
    HWND_NOTOPMOST = - 2,

    LOGPIXELSX    = 88,    /* Logical pixels/inch in X                 */
    LOGPIXELSY    = 90,    /* Logical pixels/inch in Y                 */

    MONITOR_DEFAULTTONULL       = 0,
    MONITOR_DEFAULTTOPRIMARY    = 1,
    MONITOR_DEFAULTTONEAREST    = 2,

    SM_CXSCREEN = 0,
    SM_CYSCREEN = 1,

    PAGE_EXECUTE_READWRITE = 0x40,

    DONT_RESOLVE_DLL_REFERENCES =        0x00000001,
    LOAD_LIBRARY_AS_DATAFILE    =        0x00000002,
    LOAD_WITH_ALTERED_SEARCH_PATH=       0x00000008,
    LOAD_IGNORE_CODE_AUTHZ_LEVEL =      0x00000010,
    LOAD_LIBRARY_AS_IMAGE_RESOURCE=      0x00000020,
    LOAD_LIBRARY_AS_DATAFILE_EXCLUSIVE=  0x00000040,
    LOAD_LIBRARY_REQUIRE_SIGNED_TARGET=  0x00000080,

    GWL_STYLE = -16,
    GWL_EXSTYLE = -20,

    WMSZ_LEFT =          1,
    WMSZ_RIGHT=          2,
    WMSZ_TOP  =          3,
    WMSZ_TOPLEFT=        4,
    WMSZ_TOPRIGHT=       5,
    WMSZ_BOTTOM  =       6,
    WMSZ_BOTTOMLEFT=     7,
    WMSZ_BOTTOMRIGHT=    8,
};

enum CodePages {
    CP_ACP         = 0,           // default to ANSI code page
    CP_OEMCP       = 1,           // default to OEM  code page
    CP_MACCP       = 2,           // default to MAC  code page
    CP_THREAD_ACP  = 3,           // current thread's ANSI code page
    CP_SYMBOL      = 42,          // SYMBOL translations
    CP_UTF7        = 65000,       // UTF-7 translation
    CP_UTF8        = 65001,       // UTF-8 translation
};
