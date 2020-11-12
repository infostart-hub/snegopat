//engine: JScript
//debug: no
//uname: hotkeys
//dname: Работа с хоткеями
//descr: Скрипт организует работу посистемы хоткеев снегопата
//help: inplace
//author: orefkov

/// <reference path="../snegopat.d.ts"/>
/// <reference path="../v8.d.ts"/>

import { MacrosWnd } from "./macroswnd";

/*@
Скрипт для работы с хоткеями.
@*/

type HKRow = ValueTableRow & { Команда: string, СочетаниеКлавиш: string };
type PredefRow = ValueTableRow & { Addin: string, Version: number };

export var KeyCodes = (function () {
    var _KeyCodes = {
        "Ctrl": hkCtrl, "Shift": hkShift, "Alt": hkAlt, "BkSpace": 0x8, "Tab": 0x9, "Enter": 0x0D, "Pause": 0x13, "Esc": 0x1B, "Space": 0x20,
        "PgUp": 0x21, "PgDn": 0x22, "End": 0x23, "Home": 0x24, "Left": 0x25, "Up": 0x26, "Right": 0x27, "Down": 0x28,
        "Ins": 0x2D, "Del": 0x2E, "Num0": 0x60, "Num1": 0x61, "Num2": 0x62, "Num3": 0x63, "Num4": 0x64, "Num5": 0x65, "Num6": 0x66,
        "Num7": 0x67, "Num8": 0x68, "Num9": 0x69, "Num*": 0x6A, "NumAdd": 0x6B, "Num-": 0x6D, "Num.": 0x6E, "Num/": 0x6F, "F1": 0x70,
        "F2": 0x71, "F3": 0x72, "F4": 0x73, "F5": 0x74, "F6": 0x75, "F7": 0x76, "F8": 0x77, "F9": 0x78, "F10": 0x79, "F11": 0x7A, "F12": 0x7B,
        "F13": 0x7C, "F14": 0x7D, "F15": 0x7E, "F16": 0x7F, "F17": 0x80, "F18": 0x81, "F19": 0x82, "F20": 0x83, "F21": 0x84, "F22": 0x85,
        "F23": 0x86, "F24": 0x87, ";": 0xBA, "=": 0xBB, ",": 0xBC, "-": 0xBD, ".": 0xBE, "/": 0xBF, "~": 0xC0, "[": 0xDB, "\\": 0xDC, "]": 0xDD, "\'": 0xDE,
        "0": 48, "1": 49, "2": 50, "3": 51, "4": 52, "5": 53, "6": 54, "7": 55, "8": 56, "9": 57,
        "A": 65, "B": 66, "C": 67, "D": 68, "E": 69, "F": 70, "G": 71, "H": 72, "I": 73, "J": 74,
        "K": 75, "L": 76, "M": 77, "N": 78, "O": 79, "P": 80, "Q": 81, "R": 82, "S": 83, "T": 84,
        "U": 85, "V": 86, "W": 87, "X": 88, "Y": 89, "Z": 90,
        str2code: {}, code2str: {},
        codeFromString: function (str: string): number {
            var parts = str.split('+');
            var key = 0;
            for (var i = 0; i < parts.length; i++) {
                var part = parts[i].replace(/^\s+|\s+$/g, '').toUpperCase();
                if (this.str2code.hasOwnProperty(part))
                    key |= this.str2code[part];
            }
            return key;
        },
        stringFromCode: function (code: number): string {
            var str = '';
            if (code & hkCtrl)
                str += "Ctrl + ";
            if (code & hkAlt)
                str += "Alt + ";
            if (code & hkShift)
                str += "Shift + ";
            if (this.code2str.hasOwnProperty("" + (code & 0xFFFF)))
                str += this.code2str[code & 0xFFFF];
            return str;
        }
    };
    for (var k in _KeyCodes) {
        var n = _KeyCodes[k];
        if (typeof n == "number") {
            _KeyCodes.str2code[k.toUpperCase()] = n;
            _KeyCodes.code2str[n] = k;
        }
    }
    return _KeyCodes;
})();

export var ProfileExchanger = (function () {
    var profileKey = "Snegopat/HotKeys";
    var profileAddinsWithKey = "Snegopat/AddinsHotKeysVersions";
    class Worker {
        constructor() {
            var vt = v8New("ТаблицаЗначений");
            vt.Колонки.Добавить("Команда");
            vt.Колонки.Добавить("СочетаниеКлавиш");
            profileRoot.createValue(profileKey, vt, pflSnegopat);
            var addinsHotKeys = v8New("Map");
            profileRoot.createValue(profileAddinsWithKey, addinsHotKeys, pflSnegopat);
        }
        loadHotkeys(): ValueTable {
            return profileRoot.getValue(profileKey);
        }
        loadPredefHotkeys(): Map {
            return profileRoot.getValue(profileAddinsWithKey);
        }
        saveHotkeys(vt: ValueTable): void {
            profileRoot.setValue(profileKey, vt);
        }
        savePredefHotkeys(map: Map): void {
            profileRoot.setValue(profileAddinsWithKey, map);
        }
    };
    return new Worker;
})();

export function applyKeysFromValueTable(vt: ValueTable): void {
    hotkeys.clearAll();
    // Открытие окна Снегопата всегда на Ctrl+Shift+M
    if (!vt.Найти('SnegopatMainScript::Открыть окно Снегопата', "Команда")) {
        var row = <HKRow><any>vt.Вставить(0);
        row.Команда = 'SnegopatMainScript::Открыть окно Снегопата';
        row.СочетаниеКлавиш = "Ctrl + Shift + M";
    }
    // Окошко макросов должно быть всегда
    if (!vt.Найти('SnegopatMainScript::ВыбратьИВыполнитьМакрос', "Команда")) {
        var row = <HKRow><any>vt.Вставить(0);
        row.Команда = 'SnegopatMainScript::ВыбратьИВыполнитьМакрос';
        row.СочетаниеКлавиш = "Ctrl + M";
    }
    for (var rowenum = new Enumerator(vt); !rowenum.atEnd(); rowenum.moveNext()) {
        var row = <HKRow><any>rowenum.item();
        var cmds = row.Команда.split("::");
        hotkeys.add(KeyCodes.codeFromString(row.СочетаниеКлавиш), cmds[0], cmds[1]);
    }
    try {
        (<any>addins.byUniqueName("macroswnd").object).MacrosWnd().onChangeAddin();
    } catch (e) { }
}

export function AddHotKey(str, addin, macros) {
    hotkeys.add(KeyCodes.codeFromString(str), addin, macros);
}

// Инициализация хоткеев
(function () {
    applyKeysFromValueTable(ProfileExchanger.loadHotkeys());
    events.connect(Designer, "onLoadAddin", SelfScript.self, "registerAddinHotkeys");
})();

export class PredefinedHotKeyReceiver {
    receiver: { macros: string, hotkeys: number[] }[] = [];
    version = 0;

    add(macros: string, hotkey: string): void {
        var pd = { macros: macros, hotkeys: [] };
        var allhk = hotkey.split("|");
        for (var k in allhk) {
            var code = KeyCodes.codeFromString(allhk[k]);
            if (code)
                pd.hotkeys.push(code);
        }
        this.receiver.push(pd);
    }
    setVersion(version: number): void {
        this.version = version;
    }
};

function registerAddinHotkeys(addin: Addin) {
    // Запросим у аддина предопределенные хоткеи
    if (!addin.object || !addin.object["getPredefinedHotkeys"])
        return;
    var predefHotKeys = new PredefinedHotKeyReceiver();
    try {
        addin.object["getPredefinedHotkeys"](predefHotKeys);
    } catch (e) { return; }
    // Проверим, регистрировал ли этот аддин свои хоткеи
    var addinsHotKey = ProfileExchanger.loadPredefHotkeys();
    if (addinsHotKey.Get(addin.uniqueName) == predefHotKeys.version)
        return;
    // Аддин еще не регистрировал свои хоткеи
    // Будем добавлять
    // Для начала считаем уже установленные хоткеи
    var existHotKeys = ProfileExchanger.loadHotkeys();
    for (var i in predefHotKeys.receiver) {
        var hk = predefHotKeys.receiver[i];
        if (!hk.hotkeys.length)
            continue;
        var macrosName = addin.uniqueName + "::" + hk.macros;
        if (existHotKeys.Найти(macrosName, "Команда"))
            continue    // Для макроса уже есть хоткей
        // Теперь найдём первый хоткей, неконфликтующий с уже существующими хоткеями
        var hotKey = 0, hotKeyStr = "";
        for (var k in hk.hotkeys) {
            hotKeyStr = KeyCodes.stringFromCode(hk.hotkeys[k]);
            if (!existHotKeys.Найти(hotKeyStr, "СочетаниеКлавиш")) {
                // Такой хоткей еще не используется
                hotKey = hk.hotkeys[k];
                break;
            }
        }
        var msg: string = "";
        if (!hotKey) {
            // Все заданные аддином сочетания клавиш конфликтуют с кем либо
            // Значит, добавим первый хоткей из списка и выдадим предупреждение
            hotKey = hk.hotkeys[0];
            hotKeyStr = KeyCodes.stringFromCode(hotKey);
            var rowEx = <HKRow><any>existHotKeys.Найти(hotKeyStr, "СочетаниеКлавиш");
            msg = "   Конфликтует с '" + rowEx.Команда + "'";
        }
        hotkeys.add(hotKey, addin.uniqueName, hk.macros);
        Message("Аддин '" + addin.uniqueName + "' добавил хоткей  '" + hotKeyStr + "' для макроса '" + hk.macros + "'", mInfo);
        if (msg.length)
            Message(msg, mExc1);
        // Добавим в таблицу сущестующих хоткеев
        var rowhk = <HKRow><any>existHotKeys.Добавить();
        rowhk.Команда = macrosName;
        rowhk.СочетаниеКлавиш = hotKeyStr;
    }
    // Теперь сохраним все
    addinsHotKey.Insert(addin.uniqueName, predefHotKeys.version);
    ProfileExchanger.saveHotkeys(existHotKeys);
    ProfileExchanger.savePredefHotkeys(addinsHotKey);
    saveProfile();
}

type SelectFormsControls = FormItems & { Key: TextBox };
type SelectForm = Form & { Ctrl: boolean, Alt: boolean, Shift: boolean, Controls: SelectFormsControls, key: string };

export class SelectHotKey {
    form: SelectForm;
    constructor(owner) {
        this.form = loadScriptFormEpf(env.pathes.core + "forms\\sn_forms.epf", "SelectHotkey", this);
        this.form.FormOwner = owner;
    }
    select(current: string) {
        var hk = KeyCodes.codeFromString(current);
        this.form.Ctrl = (hk & hkCtrl) != 0;
        this.form.Alt = (hk & hkAlt) != 0;
        this.form.Shift = (hk & hkShift) != 0;
        hk &= 0xFFFF;
        // заполняем список выбора
        for (var k in KeyCodes.code2str) {
            if (<any>k < 256) {
                var str = KeyCodes.code2str[k];
                this.form.Controls.Key.СписокВыбора.Добавить(str);
                if (<any>k == hk)
                    this.form.key = str;
            }
        }
        return this.form.ОткрытьМодально();
    }
    OKНажатие(): void {
        if (!this.form.key.length) {
            MessageBox("Не задана клавиша");
            return;
        }
        var result = "";
        if (this.form.Ctrl)
            result += "Ctrl + ";
        if (this.form.Alt)
            result += "Alt + ";
        if (this.form.Shift)
            result += "Shift + ";
        result += this.form.key;
        this.form.Закрыть(result);
    }
}
