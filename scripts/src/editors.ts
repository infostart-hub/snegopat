//engine: JScript
//uname: alteditors
//dname: Настройка альтернативных редакторов
//debug: no
//descr: Скрипт для выбора текстовых редакторов
//author: orefkov
//help: inplace
//addin: global

/// <reference path="../snegopat.d.ts"/>
/// <reference path="../v8.d.ts"/>

global.connectGlobals(SelfScript);
import * as stdlib from "./std";

function profileKeyName() {
    return 'Snegopat/AltEditors';
}
function initProfileKeys() {
    var editors = v8New('Map');
    profileRoot.createValue(profileKeyName(), editors, pflSnegopat);
}

type EditorsRow = {ExtName: string, EditorName: string} & ValueTableRow;
type EditorsTable = {Get(p:number): EditorsRow, Add(): EditorsRow} & ValueTable;
type EditorsForm = {AltEditors: EditorsTable, Controls: {AltEditors: TableBox} & FormItems} & Form;

class FormObject {
    form: EditorsForm;
    extentions: {[ext:string]: string[]};
    static one: FormObject;
    static getOne() {
        if (!FormObject.one)
            FormObject.one = new FormObject;
        return FormObject.one;
    }
    constructor() {
        this.form = loadScriptFormEpf(env.pathes.core + 'forms\\sn_forms.epf', 'SelectEditor', this);
        this.extentions = {};
        this.loadAltEditors();
        var activeEditors: Map = profileRoot.getValue(profileKeyName());

        for (var k in this.extentions) {
            var row = this.form.AltEditors.Add();
            row.ExtName = k;
            try{
                row.EditorName = activeEditors.Get(k);
            }catch(e){};
        }
    }
    loadAltEditors() {
        for (var i = 0; i < editorsManager.count(); i++) {
            var editor = editorsManager.editor(i);
            if (!this.extentions[editor.extention])
                this.extentions[editor.extention] = [];
            this.extentions[editor.extention].push(editor.name);
        }
    }
    CmdbarSave() {
        var s = v8New('Map');
        for (var e = new Enumerator(this.form.AltEditors); !e.atEnd(); e.moveNext()) {
            var item: EditorsRow = <any>e.item();
            editorsManager.setActiveEditor(item.ExtName, item.EditorName);
            if (item.EditorName && item.EditorName.length > 0)
                s.Insert(item.ExtName, item.EditorName);
        }
        profileRoot.setValue(profileKeyName(), s);
        //this.form.Close();
    }
    CmdbarSetup() {
        try {
            editorsManager.setup(this.form.Controls.AltEditors.CurrentData.EditorName);
        } catch(e){}
    }
    AltEditorsEditorNameНачалоВыбораИзСписка(Элемент: {val: ComboBox}, СтандартнаяОбработка) {
        try {
            var vl: ValueList = Элемент.val.ChoiceList;
            vl.Clear();
            vl.Add('');
            var ar = this.extentions[this.form.Controls.AltEditors.CurrentData.ExtName];
            for (var k in ar)
                Элемент.val.ChoiceList.Add(ar[k]);
        } catch(e){}
    }
    ПриЗакрытии() {
        FormObject.one = null;
    }
    AltEditorsEditorNameОчистка(Элемент: {val: ComboBox}, СтандартнаяОбработка) {
        this.form.Controls.AltEditors.CurrentData.EditorName = "";
    }
}

function setup() {
    FormObject.getOne().form.Open();
}

(()=>{
    initProfileKeys();
    var editors: Structure = profileRoot.getValue(profileKeyName());
    for (var e = new Enumerator(editors); !e.atEnd(); e.moveNext()) {
        var ed:KeyAndValue = <any>e.item();
        editorsManager.setActiveEditor(ed.Key, ed.Value);
    }
})();
