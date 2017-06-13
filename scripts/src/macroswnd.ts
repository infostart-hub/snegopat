//engine: JScript
//uname: macroswnd
//dname: Показ окна макросов
//debug: no
//descr: Отображение окна макросов
//author: orefkov
//help: inplace

/// <reference path="../snegopat.d.ts"/>
/// <reference path="../v8.d.ts"/>
import * as stdlib from "./std";
import * as hks from "./hotkeys";
/*@

Данный скрипт позволяет выбрать для выполнения один из зарегистрированных в снегопате макросов.

Макросы сгруппированы в дерево, в зависимости от предоставляющих их аддинов.
Аддины, не содержащие макросов - не отображаются.
Если в аддине всего один макрос, он выводится сразу, без создания узла аддина, при этом
название макроса дополняется названием его аддина.

Если в системе хоткеев снегопата для данного макроса зарегистрирован хоткей - он отображается
в колонке справа от макроса. Для макросов, вызывающих стандартные команды 1С - также отображается
их стандартный хоткей (при его наличии), хотя он и не зарегистрирован в системе хоткеев снегопата.

При активации строки макроса, если для него есть краткое описание, оно отображается в нижней
части окна.

Макросы в пределах одного аддина также могут быть дополнительно сгруппированы в поддерево.
Это происходит, если в названии макроса есть символы "\" - тогда ими название разделяется
на название групп.

Среди макросов можно осуществлять поиск, используя поле ввода, расположенное над деревом макросов.
При этом поиск осуществляется фильтрацией - в отбор попадают макросы, чъе название содержит
введённые в поле поиска слова (части слов), разделённые пробелом. При поиске название аддина
добавляется к названию макроса. Результат поиска отображается в плоском виде, без разделения
на группы. При очистке поля поиска - список макросов переходит обратно к отображению в виде
дерева и становится активным.
@*/

enum TypeofObjects { Macros, Addin, Group };

interface Macros {
    addin?: string;
    macros?: string;
    group?: string;
};

class RowInfo implements Macros {
    addin: string;
    macros: string;
    group: string;
    info: { picture: any, hotkey: string, descr: string } = { picture: undefined, hotkey:"", descr:"" };

    constructor(public type: TypeofObjects, { addin="", macros="", group="" } : Macros){
        this.addin = addin;
        this.macros = macros;
        this.group = group;
    }
    key(): string {
        return this.addin + "::" + this.macros;
    }
};

type MacrosFormControls = FormItems & { MacrosTree: TableBox, Description: Label};
type MacrosForm = Form & { MacrosTree: ValueTree, Controls: MacrosFormControls };
type MacrosTreeRow = ValueTreeRow & { Addin: string, Картинка: number, Хоткей: string, rowInfo: RowInfo };

// real singleton
export var MacrosWnd = (function(){
    class MacrosWnd {
        form: MacrosForm;
        lastMacros: string = "";
        lastMacrosRow: MacrosTreeRow;
        filled: boolean = false;
        mode: TypeofObjects = TypeofObjects.Macros;
        pattern: string[] = null;
        hotkeys: Object = {};
        MacrosTreeCtrl;
        tc: stdlib.TextChangesWatcher;

        constructor() {
            this.form = loadScriptForm(env.pathes.core + "forms\\macroses.ssf", this);
            this.form.MacrosTree.Columns.Add("rowInfo");
            var ctrls: any = this.form.Controls;
            this.MacrosTreeCtrl = ctrls.MacrosTree;
            ctrls.Cmds.Кнопки.СделатьВыбор.СочетаниеКлавиш = stdlib.v8hotkey(13, 0);
            var self = this;
            this.tc = new stdlib.TextChangesWatcher((<any>this.form.Controls).Pattern, 3, (pattern) => self.update(pattern));
            events.connect(Designer, "onLoadAddin", this, "onChangeAddin");
            events.connect(Designer, "onUnLoadAddin", this, "onChangeAddin");
        }
        isOpened(): boolean {
            return this.form.IsOpen();
        }
        onChangeAddin(): void {
            this.filled = false;
        }

        processAddinsGroup(rows: ValueTreeRowCollection, group: AddinGroup) {
            for (var child = group.child; child; child = child.next) {
                if (!this.pattern) {
                    var row = <MacrosTreeRow><any>rows.Добавить();
                    row.Addin = child.name;
                    row.rowInfo = new RowInfo(TypeofObjects.Group, { group: child.name });
                    row.Картинка = 0;
                    this.processAddinsGroup(row.Строки, child);
                    if (row.Строки.Количество() == 0)
                        rows.Удалить(row)
                    else if (child.name == "Пользовательские аддины")
                        this.MacrosTreeCtrl.Развернуть(row);
                }
                else
                    this.processAddinsGroup(rows, child);
            }
            if (this.mode == TypeofObjects.Group)
                return;

            for (var i = 0, count = group.addinsCount; i < count; i++) {
                var addin = group.addin(i);
                if (this.mode == TypeofObjects.Addin) {
                    // Надо просто вставить строку с аддином
                    var row = <MacrosTreeRow><any>rows.Добавить();
                    row.Addin = addin.displayName;
                    row.rowInfo = new RowInfo(TypeofObjects.Addin, { addin: addin.uniqueName });
                    row.Картинка = 2;
                } else {
                    // Надо вставлять макросы. Если макрос один, надо вставить сразу, иначе - создать узел для аддина
                    var macroses = stdlib.toArray(addin.macroses());
                    var prefix = addin.displayName + "::";
                    // Надо убрать из списка скрытые макросы и макросы, не попадающие в поиск.
                    for (var kk = macroses.length; kk--;) {
                        if (macroses[kk].substr(0, 1) == "_" || !testPattern(this.pattern, prefix + macroses[kk]))
                            macroses.splice(kk, 1)
                    }
                    // Если нет макросов, то нечего и вставлять
                    if (!macroses.length)
                        continue;
                    var parentRows: ValueTreeRowCollection; // Сюда будем вставлять макросы
                    // Если в аддине всего один макрос, либо осуществляется поиск - макрос вставляется сразу,
                    // с добавлением имени аддина.
                    if (this.pattern || macroses.length == 1)
                        parentRows = rows;
                    else {
                        // �?наче создается узел для аддина, и макросы добавляются в него, без добавления имени аддина
                        prefix = "";
                        var row = <MacrosTreeRow><any>rows.Добавить();
                        row.Addin = addin.displayName;
                        row.rowInfo = new RowInfo(TypeofObjects.Addin, { addin: addin.uniqueName });
                        row.Картинка = 2;
                        parentRows = row.Строки;
                    }
                    for (var m in macroses) {
                        var mname = macroses[m];
                        var ins = prefix.length == 0 ? insertSubGroups(parentRows, mname) : { rows: parentRows, name: prefix + mname };
                        var macrosRow = <MacrosTreeRow><any>ins.rows.Добавить();
                        macrosRow.Addin = ins.name;
                        macrosRow.Картинка = 1;
                        var rowInfo = new RowInfo(TypeofObjects.Macros, { addin: addin.uniqueName, macros: mname });
                        try {
                            if (addin.object && addin.object["getMacrosInfo"])
                                addin.object["getMacrosInfo"](mname, rowInfo.info);
                        } catch(e){}
                        var key = rowInfo.key();
                        macrosRow.rowInfo = rowInfo;
                        if (this.hotkeys.hasOwnProperty(key))
                            macrosRow.Хоткей = this.hotkeys[key];
                        else if (rowInfo.info.hotkey.length > 0)
                            macrosRow.Хоткей = rowInfo.info.hotkey;
                        if (key == this.lastMacros)
                            this.lastMacrosRow = macrosRow;
                    }
                }
            }
        }
        update(pattern: string) {
            pattern = pattern.replace(/\s+/g, ' ').replace(/^\s|\s$/g, '')
            if (pattern.length)
                this.pattern = pattern.toLowerCase().split(' ');
            else
                this.pattern = null
            var currentRow = <MacrosTreeRow>this.MacrosTreeCtrl.ТекущаяСтрока;
            this.lastMacros = currentRow ? currentRow.rowInfo.key() : "";
            this.lastMacrosRow = null;

            this.form.MacrosTree.Строки.Очистить();
            this.processAddinsGroup(this.form.MacrosTree.Строки, addins.root);

            if (this.lastMacrosRow)
                this.MacrosTreeCtrl.ТекущаяСтрока = this.lastMacrosRow;
            else if (this.form.MacrosTree.Строки.Количество() > 0)
                this.MacrosTreeCtrl.ТекущаяСтрока = this.form.MacrosTree.Строки.Get(0);
            if (!pattern.length)
                this.form.ТекущийЭлемент = this.MacrosTreeCtrl;
        }

        PatternРегулирование(Элемент, Направление, СтандартнаяОбработка): void {
            var tp = this.MacrosTreeCtrl, cr = tp.ТекущаяСтрока;
            if (cr) {
                cr = (-1 == Направление.val ? findNextRowInTree : findPrevRowInTree)(cr, tp);
                if (cr)
                    tp.ТекущаяСтрока = cr;
            }
            СтандартнаяОбработка.val = false;
        }

        CmdsСделатьВыбор(): void {
            var tp = this.MacrosTreeCtrl;
            if (!tp.ТекущаяСтрока)
                return
            var selected = (<MacrosTreeRow>tp.ТекущаяСтрока).rowInfo;
            if (this.mode == TypeofObjects.Macros) {
                if (selected.type != TypeofObjects.Macros) {
                    if (tp.ТекущаяСтрока.Строки.Количество() > 0) {
                        if (tp.Развернут(tp.ТекущаяСтрока))
                            tp.Свернуть(tp.ТекущаяСтрока);
                        else
                            tp.Развернуть(tp.ТекущаяСтрока);
                    }
                    return;
                } else
                    this.lastMacros = selected.key();
            }
            this.form.Закрыть(selected);
        }

        MacrosTreeВыбор() {
            this.CmdsСделатьВыбор();
        }

        ПриОткрытии() {
            this.tc.start()
        }

        ПриЗакрытии() {
            this.tc.stop()
        }

        MacrosTreeOnRowOutput(Control, RowAppearance, RowData) {
            var rowInfo:RowInfo = RowData.val.rowInfo;
            if (rowInfo.info.picture)
                RowAppearance.val.Cells.Addin.SetPicture(rowInfo.info.picture);
        }
        MacrosTreeПриАктивизацииСтроки(ctrl: { val: TableBox }) {
            if (ctrl.val.CurrentRow && (<MacrosTreeRow>ctrl.val.CurrentRow).rowInfo)
                this.form.Controls.Description.Caption = (<MacrosTreeRow>ctrl.val.CurrentRow).rowInfo.info.descr.replace("&", "&&");
        }

        fillMacrosesTree(mode: TypeofObjects) {
            this.mode = mode;
            var caption;
            switch (this.mode) {
                case TypeofObjects.Macros:
                    caption = "макрос";
                    break;
                case TypeofObjects.Addin:
                    caption = "аддин";
                    break;
                case TypeofObjects.Group:
                    caption = "группу";
                    break;
            }
            this.form.Заголовок = "Выберите " + caption;
            this.form.MacrosTree.Строки.Очистить();
            this.lastMacrosRow = null;
            this.hotkeys = {};
            for (var i = 0; i < hotkeys.count; i++) {
                var hk = hotkeys.item(i);
                this.hotkeys[new RowInfo(TypeofObjects.Macros, { addin: hk.addin, macros: hk.macros }).key()] = hks.KeyCodes.stringFromCode(hk.key);
            }
            this.processAddinsGroup(this.form.MacrosTree.Строки, addins.root);
            if (this.lastMacrosRow) {
                this.MacrosTreeCtrl.ТекущаяСтрока = this.lastMacrosRow;
                this.lastMacrosRow = null;
            }
            this.filled = true;
        }
        doSelect(mode: number): Macros {
            if (!this.filled || this.mode != mode)
                this.fillMacrosesTree(mode)
            return this.form.ОткрытьМодально();
        }

        selectMacros(): Macros {
            return this.doSelect(TypeofObjects.Macros);
        }

        selectAddins() {
            return this.doSelect(TypeofObjects.Addin);
        }

        selectGroups() {
            return this.doSelect(TypeofObjects.Group);
        }
    }

    function testPattern(p: string[], s: string): boolean {
        s = s.toLowerCase();
        for (var k in p)
            if (-1 == s.indexOf(p[k]))
                return false
        return true
    }

    function findNextRowInTree(row, tree) {
        if (tree.Развернут(row))
            return row.Строки.Получить(0)
        for (; ;) {
            var parentRows = row.Parent ? row.Parent.Строки : row.Owner().Строки
            var rowIdx = parentRows.�?ндекс(row)
            if (rowIdx < parentRows.Количество() - 1)
                return parentRows.Получить(rowIdx + 1)
            row = row.Parent
            if (!row)
                break
        }
        return null
    }

    function findPrevRowInTree(row, tree) {
        var parentRows = row.Parent ? row.Parent.Строки : row.Owner().Строки
        var rowIdx = parentRows.�?ндекс(row)
        if (0 == rowIdx)
            return row.Parent
        row = parentRows.Получить(rowIdx - 1)
        for (; ;) {
            if (!tree.Развернут(row))
                return row
            parentRows = row.Строки
            row = parentRows.Получить(parentRows.Количество() - 1)
        }
    }
    var _one: MacrosWnd;
    return function() {
        if (!_one)
            _one = new MacrosWnd();
        return _one;
    }
    function insertSubGroups(parentRows: ValueTreeRowCollection, macrosName: string): { rows: ValueTreeRowCollection, name: string } {
        for (; ;) {
            var k = macrosName.indexOf("\\");
            if (k < 0)
                return { rows: parentRows, name: macrosName };
            var subGroupName = macrosName.substr(0, k);
            var row = <MacrosTreeRow><any>parentRows.Find(subGroupName, "Addin");
            if (!row) {
                row = <MacrosTreeRow><any>parentRows.Add();
                row.Картинка = 0;
                row.Addin = subGroupName;
                row.rowInfo = new RowInfo(TypeofObjects.Group, {});
            }
            parentRows = row.Rows;
            macrosName = macrosName.substr(k + 1);
        }
    }
})();
