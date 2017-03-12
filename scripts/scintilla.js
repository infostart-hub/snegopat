//engine: JScript
//uname: scintilla
//dname: Настройка редактора Scintilla
//debug: yes
//descr: Скрипт для настройки редактора Scintilla
//author: orefkov
//help: inplace
//addin: global
//addin: scintilla_int
global.connectGlobals(SelfScript);
var pflScintillaStyles = "Scintilla/Styles";
var pflScintillaSettings = "Scintilla/Settings";
var SetupFormObject = (function () {
    function SetupFormObject() {
        this.form = loadScriptForm(env.pathes.core + 'forms\\scintilla.ssf', this);
        this.initForm();
    }
    SetupFormObject.get = function () {
        if (!SetupFormObject.one)
            SetupFormObject.one = new SetupFormObject;
        return SetupFormObject.one;
    };
    SetupFormObject.prototype.initForm = function () {
        this.form.Styles.Очистить();
        for (var styleName in styleNames) {
            var row = this.form.Styles.Add();
            row.StyleName = styleName;
            row.StyleDescr = styleNames[styleName];
            this.fillStylesRow(row);
        }
        /* var settings = profileRoot.getValue(pflScintillaSettings);
        if (settings){
            for(var values=new Enumerator(settings); !values.atEnd(); values.moveNext()) {
                try{
                    var structItem = values.item();
                    this.form[structItem.key] = structItem.value;
                }catch(e){}
            }
        } */
    };
    SetupFormObject.prototype.fillStylesRow = function (row) {
        var style = loadStyleFromProfile(row.StyleName); //структура (Font,FontColor,BgColor)
        if (!style)
            style = defaultColorSheme[row.StyleName];
        row.Font = style.Font;
        row.FontColor = style.FontColor;
        row.BgColor = style.BgColor;
    };
    ;
    SetupFormObject.prototype.КоманднаяПанельПредпросмотр = function (Кнопка) {
        for (var i = 0; i < this.form.Styles.Количество(); i++) {
            var row = this.form.Styles.Получить(i);
            scintilla_int.setStyle(row.StyleName, row.Font.Name, row.Font.Size, row.Font.Bold, row.Font.Italic, row.Font.Underline, Color1CToColor(row.FontColor), Color1CToColor(row.BgColor));
        }
        scintilla_int.Preview(true);
    };
    ;
    SetupFormObject.prototype.КоманднаяПанельОК = function (Кнопка) {
        for (var i = 0; i < this.form.Styles.Количество(); i++) {
            var row = this.form.Styles.Получить(i);
            var style = v8New("Структура", "Font,FontColor,BgColor", row.Font, row.FontColor, row.BgColor);
            profileRoot.createValue(pflScintillaStyles + "/" + row.StyleName, style, pflSnegopat);
            profileRoot.setValue(pflScintillaStyles + "/" + row.StyleName, style);
        }
        /* var settings = v8New("Структура");
        for(var i=0;i<this.form.ЭлементыФормы.Количество();i++){
            var elem = this.form.ЭлементыФормы.Получить(i);
            if (elem.Name.indexOf("sett") == 0){
                try{
                    var val = this.form[elem.Name];
                    settings.Insert(elem.Name,val);
                }catch(e){}
            }
        }
        profileRoot.createValue(pflScintillaSettings, settings, pflSnegopat);
        profileRoot.setValue(pflScintillaSettings, settings); */
        macros_getSettings();
        this.form.Закрыть();
    };
    ;
    SetupFormObject.prototype.КоманднаяПанельПоУмолчанию = function (Кнопка) {
        var list = v8New("СписокЗначений");
        list.Добавить(0, "Стандартная цветовая схема");
        list.Добавить(1, "Схема №1");
        var sel = this.form.ВыбратьИзМеню(list, this.form.ЭлементыФормы.НадписьМеню);
        if (sel) {
            var colorSheme = getColorSheme(sel.Значение);
            this.form.Styles.Очистить();
            for (var styleName in styleNames) {
                var style = colorSheme[styleName];
                var row = this.form.Styles.Add();
                row.StyleName = styleName;
                row.StyleDescr = styleNames[styleName];
                row.Font = style.Font;
                row.FontColor = style.FontColor;
                row.BgColor = style.BgColor;
            }
        }
    };
    ;
    SetupFormObject.prototype.КоманднаяПанельОтмена = function (Кнопка) {
        //перечитываем настройки из сохраненных в профиле
        this.initForm();
        macros_getSettings();
        scintilla_int.Preview(false);
        this.form.Закрыть();
    };
    SetupFormObject.prototype.StylesПриВыводеСтроки = function (Элемент, ОформлениеСтроки, ДанныеСтроки) {
        if (ДанныеСтроки) {
            if ((ДанныеСтроки.val.StyleName == "currentline") || (ДанныеСтроки.val.StyleName == "selectionhighlight")) {
                ОформлениеСтроки.val.Ячейки.Font.УстановитьТекст("");
                ОформлениеСтроки.val.Ячейки.FontColor.УстановитьТекст("");
            }
        }
    };
    SetupFormObject.prototype.StylesFontПриИзменении = function (Элемент) {
        if (this.form.ЭлементыФормы.Styles.ТекущаяСтрока.StyleName == "default") {
            var currFont = Элемент.val.Значение;
            if (Вопрос("Установить этот шрифт для остальных стилей?", РежимДиалогаВопрос.ДаНет, 0) == КодВозвратаДиалога.Нет)
                return;
            for (var i = 0; i < this.form.Styles.Количество(); i++) {
                var row = this.form.Styles.Получить(i);
                row.Font = currFont;
            }
        }
    };
    SetupFormObject.prototype.StylesBgColorПриИзменении = function (Элемент) {
        if (this.form.ЭлементыФормы.Styles.ТекущаяСтрока.StyleName == "default") {
            var currColor = Элемент.val.Значение;
            if (Вопрос("Установить этот цвет фона для остальных стилей?", РежимДиалогаВопрос.ДаНет, 0) == КодВозвратаДиалога.Нет)
                return;
            for (var i = 0; i < this.form.Styles.Количество(); i++) {
                var row = this.form.Styles.Получить(i);
                row.BgColor = currColor;
                if (row.StyleName == "directive")
                    break;
            }
        }
    };
    return SetupFormObject;
})();
;
function macros_setup() {
    SetupFormObject.get().form.Open();
}
function loadStyleFromProfile(styleName) {
    return profileRoot.getValue(pflScintillaStyles + "/" + styleName);
}
;
function macros_getSettings() {
    for (var styleName in styleNames) {
        var style = loadStyleFromProfile(styleName);
        if (!style)
            style = defaultColorSheme[styleName];
        scintilla_int.setStyle(styleName, style.Font.Name, style.Font.Size, style.Font.Bold, style.Font.Italic, style.Font.Underline, Color1CToColor(style.FontColor), Color1CToColor(style.BgColor));
    }
    /* var settings = profileRoot.getValue(pflScintillaSettings);
    if (settings){ //структура
        for(var values=new Enumerator(settings); !values.atEnd(); values.moveNext()) {
            var structItem = values.item();
            var val = structItem.value;
            var typeName = toV8Value(val).typeName(1);
            if (typeName == "Цвет") val = Color1CToColor(val);
            scintilla_int[structItem.key] = val;
        }
    } */
}
function getColorSheme(num) {
    switch (num) {
        case 0:
            var defaultFont = v8New("Шрифт", "Courier New", 10, false, false, false);
            var defaultBGColor = v8New("Цвет", 255, 255, 255);
            return {
                "default": v8New("Структура", "Font,FontColor,BgColor", defaultFont, v8New("Цвет", 0, 0, 0), defaultBGColor),
                "keyword": v8New("Структура", "Font,FontColor,BgColor", defaultFont, v8New("Цвет", 255, 0, 0), defaultBGColor),
                "comment": v8New("Структура", "Font,FontColor,BgColor", defaultFont, v8New("Цвет", 0, 128, 0), defaultBGColor),
                "number": v8New("Структура", "Font,FontColor,BgColor", defaultFont, v8New("Цвет", 0, 0, 0), defaultBGColor),
                "string": v8New("Структура", "Font,FontColor,BgColor", defaultFont, v8New("Цвет", 0, 0, 0), defaultBGColor),
                "date": v8New("Структура", "Font,FontColor,BgColor", defaultFont, v8New("Цвет", 0, 0, 0), defaultBGColor),
                "identifier": v8New("Структура", "Font,FontColor,BgColor", defaultFont, v8New("Цвет", 0, 0, 255), defaultBGColor),
                "operator": v8New("Структура", "Font,FontColor,BgColor", defaultFont, v8New("Цвет", 255, 0, 0), defaultBGColor),
                "preprocessor": v8New("Структура", "Font,FontColor,BgColor", defaultFont, v8New("Цвет", 150, 50, 0), defaultBGColor),
                "label": v8New("Структура", "Font,FontColor,BgColor", defaultFont, v8New("Цвет", 0, 0, 0), defaultBGColor),
                "directive": v8New("Структура", "Font,FontColor,BgColor", defaultFont, v8New("Цвет", 150, 50, 0), defaultBGColor),
                "brace": v8New("Структура", "Font,FontColor,BgColor", v8New("Шрифт", defaultFont, undefined, undefined, true), v8New("Цвет", 128, 0, 0), v8New("Цвет", 236, 233, 216)),
                "linenumber": v8New("Структура", "Font,FontColor,BgColor", v8New("Шрифт", defaultFont, undefined, 9), ColorToColor1C(0xBBBBBB), v8New("Цвет", 236, 233, 216)),
                "indentguide": v8New("Структура", "Font,FontColor,BgColor", defaultFont, v8New("Цвет", 192, 192, 192), defaultBGColor),
                "currentline": v8New("Структура", "Font,FontColor,BgColor", defaultFont, v8New("Цвет", 0, 0, 0), v8New("Цвет", 236, 233, 216)),
                "selectionhighlight": v8New("Структура", "Font,FontColor,BgColor", defaultFont, v8New("Цвет", 0, 0, 0), v8New("Цвет", 0, 0, 255))
            };
        case 1:
            var defaultFont = v8New("Шрифт", "Consolas", 11, false, false, false);
            var defaultBGColor = ColorToColor1C(0xF0FBFF);
            return {
                "default": v8New("Структура", "Font,FontColor,BgColor", defaultFont, v8New("Цвет", 0, 0, 0), defaultBGColor),
                "keyword": v8New("Структура", "Font,FontColor,BgColor", defaultFont, ColorToColor1C(0xA55104), defaultBGColor),
                "comment": v8New("Структура", "Font,FontColor,BgColor", defaultFont, ColorToColor1C(0x008000), defaultBGColor),
                "number": v8New("Структура", "Font,FontColor,BgColor", defaultFont, ColorToColor1C(0x5a8809), defaultBGColor),
                "string": v8New("Структура", "Font,FontColor,BgColor", defaultFont, ColorToColor1C(0x1515a3), defaultBGColor),
                "date": v8New("Структура", "Font,FontColor,BgColor", defaultFont, ColorToColor1C(0x5a8809), defaultBGColor),
                "identifier": v8New("Структура", "Font,FontColor,BgColor", defaultFont, ColorToColor1C(0x033E6B), defaultBGColor),
                "operator": v8New("Структура", "Font,FontColor,BgColor", defaultFont, v8New("Цвет", 0, 0, 0), defaultBGColor),
                "preprocessor": v8New("Структура", "Font,FontColor,BgColor", v8New("Шрифт", defaultFont, undefined, undefined, true), ColorToColor1C(0x0E4AAB), defaultBGColor),
                "label": v8New("Структура", "Font,FontColor,BgColor", defaultFont, ColorToColor1C(0x09885a), defaultBGColor),
                "directive": v8New("Структура", "Font,FontColor,BgColor", v8New("Шрифт", defaultFont, undefined, undefined, true), ColorToColor1C(0x2E75D9), defaultBGColor),
                "brace": v8New("Структура", "Font,FontColor,BgColor", v8New("Шрифт", defaultFont, undefined, undefined, true), v8New("Цвет", 0, 0, 0), ColorToColor1C(0xF7E8D7)),
                "linenumber": v8New("Структура", "Font,FontColor,BgColor", v8New("Шрифт", defaultFont, undefined, 9), ColorToColor1C(0xBBBBBB), v8New("Цвет", 241, 239, 226)),
                "indentguide": v8New("Структура", "Font,FontColor,BgColor", defaultFont, ColorToColor1C(0xCCCCCC), defaultBGColor),
                "currentline": v8New("Структура", "Font,FontColor,BgColor", defaultFont, v8New("Цвет", 0, 0, 0), ColorToColor1C(0xF7E8D7)),
                "selectionhighlight": v8New("Структура", "Font,FontColor,BgColor", defaultFont, v8New("Цвет", 0, 0, 0), v8New("Цвет", 0, 0, 255))
            };
        case 2:
            return {};
    }
}
function ColorToColor1C(clr) {
    return v8New("Цвет", clr & 255, clr >> 8 & 255, clr >> 16);
}
function Color1CToColor(clr) {
    return clr.r | (clr.g << 8) | (clr.b << 16);
}
function rgb(r, g, b) {
    return r | (g << 8) | (b << 16);
}
var styleNames = {
    "default": "Базовый стиль",
    "keyword": "Ключевое слово",
    "comment": "Комментарий",
    "number": "Число",
    "string": "Строка",
    "date": "Дата",
    "identifier": "Идентификатор",
    "operator": "Оператор",
    "preprocessor": "Препроцессор",
    "label": "Метка",
    "directive": "Директива",
    "brace": "Парная скобка",
    "linenumber": "Номера строк",
    "indentguide": "Линии выравнивания",
    "currentline": "Цвет фона текущей строки",
    "selectionhighlight": "Цвет фона подсветки выделенного слова"
};
var defaultColorSheme = getColorSheme(0);
