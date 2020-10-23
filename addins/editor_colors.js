//engine: JScript
//uname: editor_colors
//dname: Настройка профилей цветов редактора
//descr: Быстрая настройка цветовых профилей редактора модулей
//author: Сосна Евгений <shenja@sosna.zp.ua>, orefkov
//www: https://snegopat.ru/scripts/wiki?name=Editor_colors.js
//help: inplace
//addin: global
exports.__esModule = true;
/*
 * (c) Сосна Евгений <shenja@sosna.zp.ua>
 *  По мотивам http://infostart.ru/public/122391/
 * Есть 3 схемы по умолчанию : типовая, темная, светлая.
 */
/*@
Скрипт позволяет быстро сохранить настройку цветовой схемы редактора модулей,
применить различные предопределённые схемы, восстановить сохранённые.

В наличии 3 схемы по умолчанию : типовая, темная, светлая.
@*/
/// <reference path="./snegopat.d.ts" />
/// <reference path="./v8.d.ts" />
var stdlib = require("./std/std");
var stdcommands = require("./std/commands");
var SettingsManagement;
stdlib.ts_require('SettingsManagement.js', SelfScript);
global.connectGlobals(SelfScript);
var settings; // Хранит настройки скрипта (экземпляр SettingsManager'а).
var colorsCatgories = {
    "Keywords": 'Ключевые слова',
    "Numerics": 'Константы типа "Число"',
    "Strings": 'Константы типа "Строка"',
    "Dates": 'Константы типа "Дата"',
    "Identifiers": 'Идентификаторы',
    "Operators": 'Операторы',
    "Comments": 'Комментарии',
    "Preprocessor": 'Препроцессор',
    "Others": 'Прочее',
    "Background": 'Фон',
    "CurrentToken": 'Текущий идентификатор',
    "CurrentSelection": 'Выбранный идентификатор',
    "PairLexeme": 'Границы блока',
    "SearchResult": 'Цвет фона результатов поиска',
    "AutoAssistBackground": 'Цвет фона контекстной подсказки'
};
function applyColorCategory(ColorTable) {
    var store = getModuleProfileStore();
    // Для Каждого Из по javascript'овски по ТаблицаЗначений
    for (var rows = new Enumerator(ColorTable); !rows.atEnd(); rows.moveNext()) {
        var row = rows.item();
        store.setValue(row.Категория, row.Цвет);
    }
    snegopat.updateAllEditorsSettings();
}
function getModuleProfileStore() {
    return profileRoot.getFolder("ModuleColorCategory");
}
function loadColorsFromProfile() {
    var res = {};
    var store = getModuleProfileStore();
    for (var i in colorsCatgories)
        res[i] = profileRoot.getValue("ModuleColorCategory/" + i);
    return res;
}
function createColorTable(colors) {
    var ValueTable = v8New("ValueTable");
    ValueTable.Колонки.Добавить("Категория");
    ValueTable.Колонки.Добавить("Цвет");
    for (var i in colorsCatgories) {
        var row = ValueTable.Add();
        row.Категория = i;
        row.Цвет = colors[i];
    }
    return ValueTable;
}
stdlib.createMacros(SelfScript.self, 'Применить цветовую схему', 'Выбрать и применить одну из тем для штатного редактора модулей', stdcommands.Frame.FileOpen.info.picture, function () {
    var form = { "ListForProfileColors": v8New("ValueList") };
    settings.ApplyToForm(form);
    if (form.ListForProfileColors.Count() > 0) {
        var choice = form.ListForProfileColors.ChooseItem("Выберите цветовую схему");
        if (choice != undefined)
            applyColorCategory(choice.Value);
    }
});
stdlib.createMacros(SelfScript.self, 'Сохранить текущую цветовую схему', 'Сохраняет текущую цветовую схему штатного редактора модулей как новую схему', stdcommands.Frame.FileSave.info.picture, function () {
    var form = { "ListForProfileColors": v8New("ValueList") };
    settings.ApplyToForm(form);
    var nameProfile = '';
    var vbs = addins.byUniqueName("vbs").object;
    vbs.var0 = "Текущая схема";
    vbs.var1 = "Введите новое имя схемы";
    vbs.var2 = 0, vbs.var3 = false;
    if (vbs.DoEval("InputString(var0, var1, var2, var3)"))
        nameProfile = vbs.var0;
    if (nameProfile.length > 0) {
        var ValueTable = createColorTable(loadColorsFromProfile());
        form.ListForProfileColors.Add(ValueTable, nameProfile);
        settings.ReadFromForm(form);
        settings.SaveSettings();
    }
});
stdlib.createMacros(SelfScript.self, 'Редактировать цветовую схему', 'Редактировать ранее сохранённую цветовую схему штатного редактора модулей', stdcommands.Frntend.OpenModule.info.picture, function () {
    var form = { "ListForProfileColors": v8New("ValueList") };
    settings.ApplyToForm(form);
    if (form.ListForProfileColors.Count() > 0) {
        var choice = form.ListForProfileColors.ChooseItem("Выберите цветовую схему");
        if (choice != undefined) {
            var dsForm = new ColorEditorForm(choice.Value);
            var result = dsForm.ShowDialog();
            if (result) {
                choice.Value = result;
                settings.ReadFromForm(form);
                settings.SaveSettings();
            }
        }
    }
});
function setupColors(colors) {
    for (var i in colors) {
        var clr = colors[i];
        colors[i] = v8New("Color", clr[0], clr[1], clr[2]);
    }
    return colors;
}
function createStandardColorTheme() {
    return createColorTable(setupColors({
        "Keywords": [255, 0, 0],
        "Numerics": [0, 0, 0],
        "Strings": [0, 0, 0],
        "Dates": [0, 0, 0],
        "Identifiers": [0, 0, 255],
        "Operators": [255, 0, 0],
        "Comments": [0, 128, 0],
        "Preprocessor": [150, 50, 0],
        "Others": [0, 0, 0],
        "Background": [255, 255, 255],
        "CurrentToken": [200, 200, 200],
        "CurrentSelection": [200, 200, 200],
        "PairLexeme": [230, 230, 230],
        "SearchResult": [243, 238, 205],
        "AutoAssistBackground": [255, 250, 217]
    }));
}
stdlib.createMacros(SelfScript.self, 'Удалить цветовую схему', 'Выбрать одну из сохранённых схем и удалить её', stdcommands.CfgStore.DisconnectFromCfgStore.info.picture, function () {
    var form = { "ListForProfileColors": v8New("ValueList") };
    settings.ApplyToForm(form);
    if (form.ListForProfileColors.Count() > 0) {
        var choice = form.ListForProfileColors.ChooseItem("Выберите цветовую схему для удаления");
        if (choice != undefined) {
            form.ListForProfileColors.Delete(choice);
            settings.ReadFromForm(form);
            settings.SaveSettings();
        }
    }
});
stdlib.createMacros(SelfScript.self, 'Вернуть стандартные настройки схем', 'Удаляет все сохранённые схемы и восстанавливает три предопределенных темы', stdcommands.Config.RevertToDBCfg.info.picture, function () {
    var form = { "ListForProfileColors": getDefaultThemeSettings() };
    settings.ReadFromForm(form);
    settings.SaveSettings();
});
/* Возвращает название макроса по умолчанию - вызывается, когда пользователь
дважды щелкает мышью по названию скрипта в окне Снегопата. */
function getDefaultMacros() {
    return 'Применить цветовую схему';
}
////////////////////////////////////////////////////////////////////////////////////////
////{ Форма редактирования цветов схемы
////
var ColorEditorForm = /** @class */ (function () {
    function ColorEditorForm(settings) {
        this.settings = settings;
        this.form = loadFormForScript(SelfScript, "", this);
    }
    ColorEditorForm.prototype.ShowDialog = function () {
        return this.form.DoModal();
    };
    ColorEditorForm.prototype.ПриОткрытии = function () {
        var qec = this.settings;
        for (var i = 0; i < qec.Количество(); i++) {
            var row = this.form.Категории.Добавить();
            row.Категория = qec.Get(i).Категория;
            row.Имя = colorsCatgories[row.Категория];
            row.Цвет = qec.Get(i).Цвет;
        }
    };
    ColorEditorForm.prototype.Save = function () {
        this.settings.Clear();
        for (var rows = new Enumerator(this.form.Категории); !rows.atEnd(); rows.moveNext()) {
            var row = rows.item();
            var newrow = this.settings.Add();
            newrow.Категория = row.Категория;
            newrow.Цвет = row.Цвет;
        }
    };
    ColorEditorForm.prototype.Записать = function (Кнопка) {
        return this.Save();
    };
    ColorEditorForm.prototype.ЗаписатьИЗакрыть = function (Кнопка) {
        this.Save();
        this.form.Close(this.settings);
    };
    ColorEditorForm.prototype.ПриВыводеСтроки = function (Элемент, ОформлениеСтроки, ДанныеСтроки) {
        ОформлениеСтроки.val.Ячейки.Показ.ЦветФона = ДанныеСтроки.val.Цвет;
    };
    return ColorEditorForm;
}());
////
////} Форма редактирования цветов схемы
////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////
////{ Start up
////
function getDefaultThemeSettings() {
    var СписокТем = v8New("ValueList");
    //Светлая схема.
    var ValueTable = createColorTable(setupColors({
        "Keywords": [210, 76, 21],
        "Numerics": [182, 137, 0],
        "Strings": [76, 164, 156],
        "Dates": [133, 153, 0],
        "Identifiers": [37, 139, 211],
        "Operators": [212, 47, 51],
        "Comments": [147, 161, 161],
        "Preprocessor": [213, 53, 132],
        "Others": [137, 154, 51],
        "Background": [255, 251, 240],
        "CurrentToken": [200, 200, 200],
        "CurrentSelection": [200, 200, 200],
        "PairLexeme": [230, 230, 230],
        "SearchResult": [243, 238, 205],
        "AutoAssistBackground": [255, 250, 217]
    }));
    СписокТем.Add(ValueTable, "Светлая цветовая схема");
    //Темная цветовая схема.
    ValueTable = createColorTable(setupColors({
        "Keywords": [210, 76, 21],
        "Numerics": [182, 137, 0],
        "Strings": [76, 164, 156],
        "Dates": [133, 153, 0],
        "Identifiers": [37, 139, 211],
        "Operators": [212, 47, 51],
        "Comments": [147, 161, 161],
        "Preprocessor": [213, 53, 132],
        "Others": [137, 154, 51],
        "Background": [0, 43, 54],
        "CurrentToken": [200, 200, 200],
        "CurrentSelection": [200, 200, 200],
        "PairLexeme": [230, 230, 230],
        "SearchResult": [243, 238, 205],
        "AutoAssistBackground": [255, 250, 217]
    }));
    СписокТем.Add(ValueTable, "Тёмная цветовая схема");
    // Штатная схема.
    СписокТем.Add(createStandardColorTheme(), "Настройки по умолчанию от 1С");
    return СписокТем;
}
settings = SettingsManagement.CreateManager('ProfileEditorColors', { 'ListForProfileColors': getDefaultThemeSettings() });
settings.LoadSettings();
// У тех, кто пользовался скриптом раньше, в сохранённых темах нет значений для новых категорий цветов.
// Добавим их, чтобы сохранённые схемы можно было полноценно редактировать
(function () {
    var form = { "ListForProfileColors": v8New("ValueList") };
    settings.ApplyToForm(form);
    var changed = false;
    var store = getModuleProfileStore();
    // "Для Каждого Из" по СпискуЗначений
    var deletedThemes = [];
    for (var it = new Enumerator(form.ListForProfileColors); !it.atEnd(); it.moveNext()) {
        var val = it.item();
        var vt = val.Value;
        // В прошлой версии скрипта если пользователь выбирал "Редактировать схему", а потом закрывал окно редактора без записи,
        // то в настройках под именем схемы вместо ТаблицыЗначений сохранялось пустое значение.
        // В этом случае если это одна из стандартных схем, восстановим настройки по умолчанию.
        // Иначе удалим эту схему.
        var isVt = false;
        try {
            isVt = !!vt.Columns.Find("Категория");
        }
        catch (e) { }
        if (!isVt) {
            var defThemes = getDefaultThemeSettings();
            var theme = defThemes.FindByID(val.GetID());
            if (theme)
                val.Value = theme.Value;
            else
                deletedThemes.push(val);
            changed = true;
            continue;
        }
        for (var k in colorsCatgories) {
            if (!vt.Find(k, "Категория")) {
                var row = vt.Add();
                row.Категория = k;
                row.Цвет = store.getValue(k);
                changed = true;
            }
        }
    }
    for (var i = 0; i < deletedThemes.length; i++)
        form.ListForProfileColors.Delete(deletedThemes[i]);
    if (changed) {
        settings.ReadFromForm(form);
        settings.SaveSettings();
    }
})();
////
////} Start up
////////////////////////////////////////////////////////////////////////////////////////
