$engine JScript
$uname winapi
$dname Библиотека доступа к WinAPI посредством dynwrapx
$addin stdlib

var api

(function()
{
    try{
    api = new ActiveXObject("DynamicWrapperX")
    }catch(e)
    {
        //Message("winapi.js: не удалось создать DynamicWrapperX. " + e.description)
        return
    }
    regs = [
    {
        lib: "USER32.DLL",
        funcs:[
            ["GetWindowRect", "i=hp", "r=l"],
            ["GetClientRect", "i=hp", "r=l"],
            ["SetFocus", "i=h", "r=l"],
            ["GetFocus", "r=l"],
            ["SendMessageW", "i=hlll", "r=l"],
            ["GetParent", "i=h", "r=l"],
            ["DrawTextW", "i=hWlpu", "r=l"],
            ["GetDC", "i=h", "r=h"],
            ["ReleaseDC", "i=hh", "r=l"],
            ["GetDesktopWindow", "r=l"],
            ["IsChild", "i=hh", "r=l"],
            ["GetWindow", "i=hl", "r=h"],
            ["IsWindowVisible", "i=h", "r=l"],
            ["GetWindowLong", "i=hl", "r=l"]
        ]
    },
    {
        lib: "GDI32.DLL",
        funcs:[
            ["SelectObject", "i=hh", "r=l"],
            ["DeleteObject", "i=h", "r=l"],
            ["CreateFont", "i=lllllllllllllw", "r=l"],
            ["GetDeviceCaps", "i=hl", "r=l"]
        ]
    }
    ]
    for(var k in regs)
    {
        for(var i in regs[k].funcs)
        {
            if(regs[k].funcs[i].length == 3)
                api.Register(regs[k].lib, regs[k].funcs[i][0], regs[k].funcs[i][1], regs[k].funcs[i][2])
            else
                api.Register(regs[k].lib, regs[k].funcs[i][0], regs[k].funcs[i][1])
        }
    }
})();

Rect = stdlib.Class.extend(
{
    construct: function(l, t, r, b)
    {
        this.left = Math.floor(l)
        this.top = Math.floor(t)
        this.right = Math.floor(r)
        this.bottom = Math.floor(b)
    },
    width: function()
    {
        return this.right - this.left
    },
    height: function()
    {
        return this.bottom - this.top
    }
})

RectApi = stdlib.Class.extend(
{
    construct: function()
    {
        this.mem = api.Space(16)
    },
    toRectJS: function()
    {
        return new Rect(api.NumGet(this.mem, 0, "l"), api.NumGet(this.mem, 4, "l"), api.NumGet(this.mem, 8, "l"), api.NumGet(this.mem, 12, "l"))
    },
    fromRectJS: function(rc)
    {
        api.NumPut(rc.left, this.mem, 0, "l")
        api.NumPut(rc.top, this.mem, 4, "l")
        api.NumPut(rc.right, this.mem, 8, "l")
        api.NumPut(rc.bottom, this.mem, 12, "l")
    }
})

function GetWindowRect(hwnd)
{
    var rect = new RectApi()
    api.GetWindowRect(hwnd, rect.mem)
    return rect.toRectJS()
}

function GetClientRect(hwnd)
{
    var rect = new RectApi()
    api.GetClientRect(hwnd, rect.mem)
    return rect.toRectJS()
}

function SetFocus(hwnd)             { return api.SetFocus(hwnd) }
function GetFocus()                 { return api.GetFocus() }
function GetParentWindow(hwnd)      { return api.GetParent(hwnd) }
function IsChild(hParent, hWnd)     { return api.IsChild(hParent, hWnd) }
function SendMessage(hwnd, msg, wParam, lParam) { return api.SendMessageW(hwnd, msg, wParam, lParam) }

// Метод позволяет создать WinAPI шрифт по данным 1Сного объекта Шрифт,
// но 1Сный шрифт должен быть абсолютным. Ведется общий список созданных
// шрифтов, т.е. если шрифт с такими параметрами уже создавался, то
// вернет уже созданный шрифт.
function CreateApiFontFromV8Font(font, hdc)
{
    var v8font = toV8Value(font)
    if(v8font.typeName(1) == "Шрифт")
    {
        var s = v8font.toStringInternal().split('\n')[1].match(/\{(.*)\}/)[1].split(',')
        if(s[1] == 0)   // Абсолютный шрифт
        {
            var fontKey = s.valueOf()
            if(arguments.callee[fontKey])
                return arguments.callee[fontKey]
            var logpixelsy = api.GetDeviceCaps(hdc, 90) // LOGPIXELSY
            var heightInPixels = Math.floor(-parseInt(s[3]) * logpixelsy / 720 + 0.5)
            var fontName = s[16].substr(1, s[16].length - 2)
            var font = api.CreateFont(heightInPixels,
                parseInt(s[4]),
                parseInt(s[5]),
                parseInt(s[6]),
                parseInt(s[7]),
                parseInt(s[8]),
                parseInt(s[9]),
                parseInt(s[10]),
                parseInt(s[11]),
                parseInt(s[12]),
                parseInt(s[13]),
                parseInt(s[14]),
                parseInt(s[15]),
                fontName)
            arguments.callee[fontKey] = font
            return font
        }
    }
    return 0
}

function DrawText(hdc, text, rect, format)
{
    var rc = new RectApi()
    rc.fromRectJS(rect)
    var count = text.length
    var ret = api.DrawTextW(hdc, text, count, rc.mem, format)
    return {result: ret, text: text, rect: rc.toRectJS()}
}

function GetDC(hwnd)            { return api.GetDC(hwnd) }
function ReleaseDC(hwnd, hdc)   { api.ReleaseDC(hwnd, hdc) }
function GetDesktopWindow()     { return api.GetDesktopWindow() }
function SelectObject(hdc, obj) { return api.SelectObject(hdc, obj) }
function DeleteObject(obj)      { return api.DeleteObject(obj) }
function GetDeviceCaps(hdc, idx){ return api.GetDeviceCaps(hdc, idx) }
function GetWindow(hwnd, cmd)   { return api.GetWindow(hwnd, cmd) }
GetWindow.cmds = {GW_HWNDFIRST: 0, GW_HWNDLAST: 1, GW_HWNDNEXT: 2, GW_HWNDPREV: 3, GW_OWNER: 4, GW_CHILD: 5}
function IsWindowVisible(hwnd)  { return api.IsWindowVisible(hwnd) }

function GetWindowLong(hwnd, idx)  { return api.GetWindowLong(hwnd, idx) }
GetWindowLong.idxs = {GWL_WNDPROC:-4, GWL_HINSTANCE:-6, GWL_HWNDPARENT: -8, GWL_STYLE:-16, GWL_EXSTYLE:-20, GWL_USERDATA:-21, GWL_ID:-12}

var wndMsg = {
    WM_CHAR : 0x0102
}
