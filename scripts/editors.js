//engine: JScript
//uname: alteditors
//dname: Настройка альтернативных редакторов
//debug: yes
//descr: Скрипт для выбора текстовых редакторов
//author: orefkov
//help: inplace
//addin: global
/// <reference path="../snegopat.d.ts"/>
/// <reference path="../v8.d.ts"/>
global.connectGlobals(SelfScript);
function profileKeyName() {
    return 'Snegopat/AltEditors';
}
function initProfileKeys() {
    var editors = v8New('Map');
    profileRoot.createValue(profileKeyName(), editors, pflSnegopat);
}
var FormObject = (function () {
    function FormObject() {
        this.form = loadScriptForm(env.pathes.core + 'forms\\editors.ssf', this);
        this.extentions = {};
        this.loadAltEditors();
        var activeEditors = profileRoot.getValue(profileKeyName());
        for (var k in this.extentions) {
            var row = this.form.AltEditors.Add();
            row.ExtName = k;
            try {
                row.EditorName = activeEditors.Get(k);
            }
            catch (e) { }
            ;
        }
    }
    FormObject.prototype.loadAltEditors = function () {
        for (var i = 0; i < editorsManager.count(); i++) {
            var editor = editorsManager.editor(i);
            if (!this.extentions[editor.extention])
                this.extentions[editor.extention] = [];
            this.extentions[editor.extention].push(editor.name);
        }
    };
    FormObject.prototype.CmdbarSave = function () {
        var s = v8New('Map');
        for (var e = new Enumerator(this.form.AltEditors); !e.atEnd(); e.moveNext()) {
            var item = e.item();
            editorsManager.setActiveEditor(item.ExtName, item.EditorName);
            if (item.EditorName && item.EditorName.length > 0)
                s.Insert(item.ExtName, item.EditorName);
        }
        profileRoot.setValue(profileKeyName(), s);
        this.form.Close();
    };
    FormObject.prototype.CmdbarSetup = function () {
        try {
            editorsManager.setup(this.form.Controls.AltEditors.CurrentData.EditorName);
        }
        catch (e) { }
    };
    FormObject.prototype.AltEditorsEditorNameНачалоВыбораИзСписка = function (Элемент, СтандартнаяОбработка) {
        try {
            var vl = Элемент.val.ChoiceList;
            vl.Clear();
            vl.Add('');
            var ar = this.extentions[this.form.Controls.AltEditors.CurrentData.ExtName];
            for (var k in ar)
                Элемент.val.ChoiceList.Add(ar[k]);
        }
        catch (e) { }
    };
    return FormObject;
})();
function setup() {
    var f = new FormObject;
    f.form.DoModal();
}
(function () {
    initProfileKeys();
    var editors = profileRoot.getValue(profileKeyName());
    for (var e = new Enumerator(editors); !e.atEnd(); e.moveNext()) {
        var ed = e.item();
        editorsManager.setActiveEditor(ed.Key, ed.Value);
    }
})();
