//engine: JScript
//uname: SnegopatMainScript
//dname: Снегопат
//debug: no
//addin: global
//descr: Скрипт с основными макросами снегопата
//author: orefkov
//help: inplace

/// <reference path="../snegopat.d.ts"/>
/// <reference path="../v8.d.ts"/>

/*@
В этом скрипте находятся основные макросы, которые предоставляет сам снегопат.
Он загружается из стартового скрипта предпоследним из служебных аддинов.
@*/

global.connectGlobals(SelfScript);

import * as macroswnd   from "./macroswnd";
import * as stdlib      from "./std";
import * as stdcommands from "./commands";

stdlib.createMacros(SelfScript.self, "ВыбратьИВыполнитьМакрос",
    "Выбрать макрос из списка и выполнить его", stdcommands.CDebug.Start.info.picture,
    function () {
        var macrosesWnd = macroswnd.MacrosWnd();
        if (macrosesWnd.isOpened())
            return false;
        var res = macrosesWnd.selectMacros();
        if (res) {
            var a = addins.byUniqueName(res.addin);
            if (a)
                return a.invokeMacros(res.macros);
            Message("Аддин с именем " + res.addin + " не найден");
        }
    });

// Создадим макросы для вставок текста
(function(textBefore, textAfter, hotKey, activateHint?) {
    var nameOfinsert = textBefore;
    if (textAfter.length)
        nameOfinsert += "..." + textAfter;
    var nameOfMacros = "Редактирование\\Вставить " + nameOfinsert;
    stdlib.createMacros(SelfScript.self, nameOfMacros, "Вставить " + nameOfinsert + " в текущей позиции редактируемого текста",
        stdcommands.TextEdit.Templates.info.picture,
        (function (txtBefore, txtAfter, aHint) {
            return function () {
                return replaceSelInTxtWnd(txtBefore, txtAfter, aHint);
            }
        })(textBefore, textAfter, activateHint),
        hotKey);
    return arguments.callee;
})("<", "", "Alt + ,")
    (">", "", "Alt + .")
    ("@", "", "Alt + 2")
    ("#", "", "Alt + 3", false)
    ("$", "", "Alt + 4")
    ("^", "", "Alt + 6")
    ("&", "", "Alt + 7", false)
    ("Null", "", "Alt + N")
    ("~", "", "Alt + ~")
    ("[", "]", "Alt + [")
    ("{", "}", "Alt + Shift + [")
    ("]", "", "Alt + ]")
    ("}", "", "Alt + Shift + ]")
    ("'", "'", "Alt + '")
    ('"', '"', "Alt + Shift + '")
    ("=", "", "Alt + =");

stdlib.createMacros(SelfScript.self, "Разработка\\Сдампить SnegAPI в snegopat.d.ts",
    "Сформировать файл описания SnegAPI в формате TypeScript", undefined,
    function () {
        develop.dumpSnegApiToDts();
        MessageBox("Готово");
    });

stdlib.createMacros(SelfScript.self, "Разработка\\Сдампить типы 1С в v8.d.ts",
    "Сформировать файл описания типов 1С в формате TypeScript", undefined,
    function () {
        develop.dumpV8typesToDts();
        MessageBox("Готово");
    });

stdlib.createMacros(SelfScript.self, "Разработка\\Переключить трассировку команд",
    "Включает/выключает вывод отладочных сообщений при прохождении команд в главном окне 1С", undefined,
    function () {
        develop.cmdTrace = !develop.cmdTrace;
        MessageBox("Трассировка команд в" + (develop.cmdTrace ? "" : "ы") + "ключена", mbOK, "Снегопат", 1)
    });

/*stdlib.createMacros(SelfScript.self, "Разработка\\TestCommand",
    "Открыть форму для исследования команд", undefined,
    function () {
        stdcommands.TestForm.open();
    });
*/

stdlib.createMacros(SelfScript.self, "Открыть окно Снегопата",
    "Открытие основного окна Снегопата", (<any>PictureLib).НастройкаСписка,
    function () { (<any>addins.byUniqueName("snegopatwnd").object()).openWnd(); }
    );

stdlib.createMacros(SelfScript.self, "Показать список методов модуля",
    "Открыть диалог со списком методов редактируемого модуля",
    stdcommands.Frntend.MDReport.info.picture,
    function () { snegopat.showMethodsList },
    "Ctrl + 1|Ctrl + Alt + P"
    );

stdlib.createMacros(SelfScript.self, "Вернуться назад",
    "Перейти назад по истории окон", stdcommands.Frame.GotoBack.info.picture,
    function () { stdcommands.Frame.GotoBack.send(); },
    "Alt+Left");

stdlib.createMacros(SelfScript.self, "Перейти вперёд",
    "Перейти вперёд по истории окон", stdcommands.Frame.GotoForward.info.picture,
    function () { stdcommands.Frame.GotoForward.send; },
    "Alt+Right");

stdlib.createMacros(SelfScript.self, "ПоказатьВыпадающийСписокСнегопата",
    "Принудительно вызвать список снегопата, всё перепарсив", stdcommands.Config.SyntaxHelper.info.picture,
    function () { return snegopat.showSmartBox(); },
    "Ctrl+Alt+Space");

function replaceSelInTxtWnd(textBefore: any, textAfter: string, activateHint: any) {
    var txtWnd = snegopat.activeTextWindow()
    if (!txtWnd) {
        if (textBefore.length > 0 && !textAfter) {
            var h = winApi.getFocus();
            for (var i = 0; i < textBefore.length; i++)
                winApi.sendMessage(h, WM_CHAR, textBefore.charCodeAt(i), 0);
        }
        return false
    }
    var oldText = txtWnd.selectedText
    var newText = textBefore
    if (textAfter.length)
        newText += oldText + textAfter
    txtWnd.selectedText = newText
    if (textAfter.length) {
        var cp = txtWnd.getCaretPos()
        txtWnd.setCaretPos(cp.beginRow, cp.beginCol - textAfter.length)
    }
    if (activateHint)
        snegopat.showSmartBox();
    return true
}

stdlib.createMacros(SelfScript.self, "Перейти к определению",
    "Перейти к определению символа под курсором (аналог F12)",
    stdcommands.Frntend.GoToDefinition.info.picture,
    function () {
        if (snegopat.activeTextWindow() && windows.modalMode == msNone) {
            var st = stdcommands.Frntend.GoToDefinition.getState();
            if (st && st.enabled) {
                // Будем также подавлять появление дополнительного диалога
                var handler = events.connect(windows, "onDoModal", function (dlgInfo) {
                    if (dlgInfo.stage == beforeDoModal) {
                        dlgInfo.cancel = true
                        dlgInfo.result = 1
                    }
                }, "-");
                var res = stdcommands.Frntend.GoToDefinition.send();
                events.disconnectNode(handler);
                return res;
            }
        }
        return false;
    },
    "Ctrl + Enter"
);

/*

function macrosПоказатьПараметры() {
    //return snegopat.showParams()
}

function macrosЛистатьПараметрыВперед() {
    //return snegopat.nextParams()
}

function macrosЛистатьПараметрыНазад() {
    //return snegopat.prevParams()
}
*/

// Метод вызывается при регистрации хоткеев аддина
function getPredefinedHotkeys(predef) {
    predef.setVersion(7);
    stdlib.getAllPredefHotKeys(SelfScript.self, predef);
}
