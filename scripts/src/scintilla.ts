//engine: JScript
//uname: scintilla
//dname: Настройка редактора Scintilla
//debug: yes
//descr: Скрипт для настройки редактора Scintilla
//author: orefkov
//help: inplace
//addin: global
//addin: scintilla_int

/// <reference path="../snegopat.d.ts"/>
/// <reference path="../v8.d.ts"/>

import * as stdlib from "./std";
import * as stdcommands from "./commands";


type StyleTableRow = {Name: string, Underline: number} & ValueTableRow;
type StyleTable = {Get(idx:number): StyleTableRow, Add(): StyleTableRow} & ValueTable;
type SetupForm = {Styles: StyleTable} & Form;

class SetupFormObject {
    private static one: SetupFormObject;
    static get() {
        if (!SetupFormObject.one)
            SetupFormObject.one = new SetupFormObject;
        return SetupFormObject.one;
    }
    form: SetupForm;
    constructor() {
        this.form = loadScriptForm(env.pathes.core + 'forms\\scintilla.ssf', this);
    }
}

function macros_setup() {
    SetupFormObject.get().form.Open();
}
