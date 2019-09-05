//engine: JScript
//uname: scintilla
//dname: Редактор Scintilla
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


type StyleTableRow = {Name: string, Underline: number, StyleName:string, StyleDescr: string, Font:any, FontColor:any, BgColor:any} & ValueTableRow;
type StyleTable = {Get(idx:number): StyleTableRow, Add(): StyleTableRow, Получить(idx:number): StyleTableRow} & ValueTable;
type StylesTableBox = {ТекущаяСтрока: StyleTableRow} & TableBox;
type SetupFormControls = {НадписьМеню: string, Styles: StylesTableBox} & Controls;
type SetupForm = {Styles: StyleTable, ЭлементыФормы: SetupFormControls, foldComment:any, foldCond:any, foldLoop:any, foldMultiString:any, foldPreproc:any, foldProc:any, foldTry:any} & Form;

global.connectGlobals(SelfScript)
events.connect(metadata, "MetaDataEvent", SelfScript.self, "OnMetaDataEvent");

var pflScintillaStyles = "Scintilla/Styles/";
var pflScintillaSettings = "Scintilla/Settings/";

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
		this.initForm();
    }

	initForm() {
		this.form.Styles.Очистить();
		for (var styleName in styleNames) {
		  var row = this.form.Styles.Add();
		  row.StyleName = styleName;
		  row.StyleDescr = styleNames[styleName];
		  this.fillStylesRow(row);
		}
		this.form.foldComment = profileRoot.getValue(pflScintillaSettings + "foldComment");
		this.form.foldCond = profileRoot.getValue(pflScintillaSettings + "foldCond");
		this.form.foldLoop = profileRoot.getValue(pflScintillaSettings + "foldLoop");
		this.form.foldMultiString = profileRoot.getValue(pflScintillaSettings + "foldMultiString");
		this.form.foldPreproc = profileRoot.getValue(pflScintillaSettings + "foldPreproc");
		this.form.foldProc = profileRoot.getValue(pflScintillaSettings + "foldProc");
		this.form.foldTry = profileRoot.getValue(pflScintillaSettings + "foldTry");
	}

	fillStylesRow(row){
		var style = loadStyleFromProfile(row.StyleName); //структура (Font,FontColor,BgColor)

		if(!style)
			style = defaultColorSheme[row.StyleName];

		row.Font = style.Font;
		row.FontColor = style.FontColor;
		row.BgColor = style.BgColor;
	};

    КоманднаяПанельПредпросмотр(Кнопка) {
		for(var i=0;i<this.form.Styles.Количество();i++){
			var row = this.form.Styles.Получить(i);
			scintilla_int.setStyle(row.StyleName, row.Font.Name, row.Font.Size, row.Font.Bold, row.Font.Italic, row.Font.Underline,
								   Color1CToColor(row.FontColor), Color1CToColor(row.BgColor));
		}
		scintilla_int.Preview(true);
    };

    КоманднаяПанельОК(Кнопка) {
		for(var i=0;i<this.form.Styles.Количество();i++){
			var row = this.form.Styles.Получить(i);
			var style = v8New("Структура","Font,FontColor,BgColor",row.Font,row.FontColor,row.BgColor);
            profileRoot.createValue(pflScintillaStyles + row.StyleName, style, pflSnegopat);
            profileRoot.setValue(pflScintillaStyles + row.StyleName, style);
        }
        profileRoot.createValue(pflScintillaSettings + "foldComment", false, pflSnegopat);
        profileRoot.createValue(pflScintillaSettings + "foldCond", false, pflSnegopat);
        profileRoot.createValue(pflScintillaSettings + "foldLoop", false, pflSnegopat);
        profileRoot.createValue(pflScintillaSettings + "foldMultiString", false, pflSnegopat);
        profileRoot.createValue(pflScintillaSettings + "foldPreproc", false, pflSnegopat);
        profileRoot.createValue(pflScintillaSettings + "foldProc", false, pflSnegopat);
        profileRoot.createValue(pflScintillaSettings + "foldTry", false, pflSnegopat);

        profileRoot.setValue(pflScintillaSettings + "foldComment", this.form.foldComment);
        profileRoot.setValue(pflScintillaSettings + "foldCond", this.form.foldCond);
        profileRoot.setValue(pflScintillaSettings + "foldLoop", this.form.foldLoop);
        profileRoot.setValue(pflScintillaSettings + "foldMultiString", this.form.foldMultiString);
        profileRoot.setValue(pflScintillaSettings + "foldPreproc", this.form.foldPreproc);
        profileRoot.setValue(pflScintillaSettings + "foldProc", this.form.foldProc);
        profileRoot.setValue(pflScintillaSettings + "foldTry", this.form.foldTry);
		macros_getSettings();
		this.form.Закрыть();
    };

    КоманднаяПанельПоУмолчанию(Кнопка) {
		var list = v8New("СписокЗначений");
		list.Добавить(0,"Стандартная цветовая схема");
		list.Добавить(1,"Схема №1");
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

	КоманднаяПанельОтмена(Кнопка) {
		//перечитываем настройки из сохраненных в профиле
		this.initForm();
		macros_getSettings();
		scintilla_int.Preview(false);
		this.form.Закрыть();
	}

	StylesПриВыводеСтроки(Элемент, ОформлениеСтроки, ДанныеСтроки) {
		if (ДанныеСтроки){
			if ((ДанныеСтроки.val.StyleName == "currentline") || (ДанныеСтроки.val.StyleName == "selectionhighlight")){
				ОформлениеСтроки.val.Ячейки.Font.УстановитьТекст("");
				ОформлениеСтроки.val.Ячейки.FontColor.УстановитьТекст("");
			}
		}
	}

	StylesFontПриИзменении(Элемент){
		if (this.form.ЭлементыФормы.Styles.ТекущаяСтрока.StyleName == "default"){
			var currFont = Элемент.val.Значение;
			if (Вопрос("Установить этот шрифт для остальных стилей?", РежимДиалогаВопрос.ДаНет, 0) == КодВозвратаДиалога.Нет)
				return;

			for(var i=0;i<this.form.Styles.Количество();i++){
				var row = this.form.Styles.Получить(i);
				row.Font = currFont;
			}
		}
	}

	StylesBgColorПриИзменении(Элемент) {
		if (toV8Value(Элемент.val.Значение).typeName(1) == "Цвет"){
			var valClr = Элемент.val.Значение;
			if ((valClr.Зеленый < 0) && (valClr.Красный < 0) && (valClr.Синий < 0)){
				Предупреждение("Встроенный тип 1С \"Цвет\" не поддерживается. Измените любую из составляющих цвета, чтобы он превратился в тип RGB");
				return;
			}
		}
		if (this.form.ЭлементыФормы.Styles.ТекущаяСтрока.StyleName == "default"){
			var currColor = Элемент.val.Значение;
			if (Вопрос("Установить этот цвет фона для остальных стилей?", РежимДиалогаВопрос.ДаНет, 0) == КодВозвратаДиалога.Нет)
				return;

			for(var i=0;i<this.form.Styles.Количество();i++){
				var row = this.form.Styles.Получить(i);
				row.BgColor = currColor;
				if (row.StyleName == "directive") break;
			}
		}
	}

	StylesFontColorПриИзменении(Элемент) {
		if (toV8Value(Элемент.val.Значение).typeName(1) == "Цвет") {
			var valClr = Элемент.val.Значение;
			if ((valClr.Зеленый < 0) && (valClr.Красный < 0) && (valClr.Синий < 0)) {
				Предупреждение("Встроенный тип 1С \"Цвет\" не поддерживается. Измените любую из составляющих цвета, чтобы он превратился в тип RGB");
				return;
			}
		}
	}
};

function macros_setup() {
    SetupFormObject.get().form.Open();
}

function loadStyleFromProfile(styleName){
    return profileRoot.getValue(pflScintillaStyles + styleName);
};

function macros_getSettings() {
	for (var styleName in styleNames) {
		var style = loadStyleFromProfile(styleName);
		if (!style)
			style = defaultColorSheme[styleName];

		scintilla_int.setStyle(styleName, style.Font.Name, style.Font.Size, style.Font.Bold, style.Font.Italic, style.Font.Underline,
							   Color1CToColor(style.FontColor), Color1CToColor(style.BgColor));
	}
    scintilla_int.foldComment = profileRoot.getValue(pflScintillaSettings + "foldComment");
    scintilla_int.foldCond = profileRoot.getValue(pflScintillaSettings + "foldCond");
    scintilla_int.foldLoop = profileRoot.getValue(pflScintillaSettings + "foldLoop");
    scintilla_int.foldMultiString = profileRoot.getValue(pflScintillaSettings + "foldMultiString");
    scintilla_int.foldPreproc = profileRoot.getValue(pflScintillaSettings + "foldPreproc");
    scintilla_int.foldProc = profileRoot.getValue(pflScintillaSettings + "foldProc");
    scintilla_int.foldTry = profileRoot.getValue(pflScintillaSettings + "foldTry");
}

function getColorSheme(num){
	switch (num) {
		case 0: //стандартная цветовая схема
			var defaultFont = v8New("Шрифт","Courier New",10,false,false,false);
			var defaultBGColor = v8New("Цвет",255,255,255);

			return { //                                                      шрифт        цвет шрифта,         цвет фона
				"default"      : v8New("Структура","Font,FontColor,BgColor", defaultFont, v8New("Цвет",0,0,0), defaultBGColor),
				"keyword"      : v8New("Структура","Font,FontColor,BgColor", defaultFont, v8New("Цвет",255,0,0), defaultBGColor),
				"comment"      : v8New("Структура","Font,FontColor,BgColor", defaultFont, v8New("Цвет",0,128,0), defaultBGColor),
				"number"       : v8New("Структура","Font,FontColor,BgColor", defaultFont, v8New("Цвет",0,0,0), defaultBGColor),
				"string"       : v8New("Структура","Font,FontColor,BgColor", defaultFont, v8New("Цвет",0,0,0), defaultBGColor),
				"date"         : v8New("Структура","Font,FontColor,BgColor", defaultFont, v8New("Цвет",0,0,0), defaultBGColor),
				"identifier"   : v8New("Структура","Font,FontColor,BgColor", defaultFont, v8New("Цвет",0,0,255), defaultBGColor),
				"operator"     : v8New("Структура","Font,FontColor,BgColor", defaultFont, v8New("Цвет",255,0,0), defaultBGColor),
				"preprocessor" : v8New("Структура","Font,FontColor,BgColor", defaultFont, v8New("Цвет",150,50,0), defaultBGColor),
				"label"        : v8New("Структура","Font,FontColor,BgColor", defaultFont, v8New("Цвет",0,0,0), defaultBGColor),
				"directive"    : v8New("Структура","Font,FontColor,BgColor", defaultFont, v8New("Цвет",150,50,0), defaultBGColor),
				"brace"        : v8New("Структура","Font,FontColor,BgColor", v8New("Шрифт",defaultFont,undefined,undefined,true), v8New("Цвет",128,0,0), v8New("Цвет",236,233,216)),
				"linenumber"   : v8New("Структура","Font,FontColor,BgColor", v8New("Шрифт",defaultFont,undefined,9), ColorToColor1C(0xBBBBBB), v8New("Цвет",236,233,216)),
				"indentguide"  : v8New("Структура","Font,FontColor,BgColor", defaultFont, v8New("Цвет",192,192,192), defaultBGColor),
				"currentline"  : v8New("Структура","Font,FontColor,BgColor", defaultFont, v8New("Цвет",0,0,0), v8New("Цвет",236,233,216)),
				"selectionhighlight"  : v8New("Структура","Font,FontColor,BgColor", defaultFont, v8New("Цвет",0,0,0), v8New("Цвет",0,0,255))
			}
		case 1:
			var defaultFont = v8New("Шрифт","Consolas",11,false,false,false);
			var defaultBGColor = ColorToColor1C(0xF0FBFF);

			return {
				"default"      : v8New("Структура","Font,FontColor,BgColor", defaultFont, v8New("Цвет",0,0,0), defaultBGColor),
				"keyword"      : v8New("Структура","Font,FontColor,BgColor", defaultFont, ColorToColor1C(0xA55104), defaultBGColor),
				"comment"      : v8New("Структура","Font,FontColor,BgColor", defaultFont, ColorToColor1C(0x008000), defaultBGColor),
				"number"       : v8New("Структура","Font,FontColor,BgColor", defaultFont, ColorToColor1C(0x5a8809), defaultBGColor),
				"string"       : v8New("Структура","Font,FontColor,BgColor", defaultFont, ColorToColor1C(0x1515a3), defaultBGColor),
				"date"         : v8New("Структура","Font,FontColor,BgColor", defaultFont, ColorToColor1C(0x5a8809), defaultBGColor),
				"identifier"   : v8New("Структура","Font,FontColor,BgColor", defaultFont, ColorToColor1C(0x033E6B), defaultBGColor),
				"operator"     : v8New("Структура","Font,FontColor,BgColor", defaultFont, v8New("Цвет",0,0,0), defaultBGColor),
				"preprocessor" : v8New("Структура","Font,FontColor,BgColor", v8New("Шрифт",defaultFont,undefined,undefined,true), ColorToColor1C(0x0E4AAB), defaultBGColor),
				"label"        : v8New("Структура","Font,FontColor,BgColor", defaultFont, ColorToColor1C(0x09885a), defaultBGColor),
				"directive"    : v8New("Структура","Font,FontColor,BgColor", v8New("Шрифт",defaultFont,undefined,undefined,true), ColorToColor1C(0x2E75D9), defaultBGColor),
				"brace"        : v8New("Структура","Font,FontColor,BgColor", v8New("Шрифт",defaultFont,undefined,undefined,true), v8New("Цвет",0,0,0), ColorToColor1C(0xF7E8D7)),
				"linenumber"   : v8New("Структура","Font,FontColor,BgColor", v8New("Шрифт",defaultFont,undefined,9), ColorToColor1C(0xBBBBBB), v8New("Цвет",241,239,226)),
				"indentguide"  : v8New("Структура","Font,FontColor,BgColor", defaultFont, ColorToColor1C(0xCCCCCC), defaultBGColor),
				"currentline"  : v8New("Структура","Font,FontColor,BgColor", defaultFont, v8New("Цвет",0,0,0), ColorToColor1C(0xF7E8D7)),
				"selectionhighlight"  : v8New("Структура","Font,FontColor,BgColor", defaultFont, v8New("Цвет",0,0,0), v8New("Цвет",0,0,255))
			}
		case 2:
			return {}
	}
}

function OnMetaDataEvent(mde) {
	scintilla_int.callOnMetaDataEvent(mde);
}

//{ МАКРОСЫ 
SelfScript.self['macrosСвернуть/развернуть текущий блок'] = function() {
	scintilla_int.callToggleFold();
}
SelfScript.self['macrosСвернуть/развернуть текущий блок с вложенными'] = function() {
	scintilla_int.callToggleFold(true);
}
SelfScript.self['macrosСбросить маркеры модифицированности строк'] = function() {
	scintilla_int.callResetModifiedLineStates();
}
SelfScript.self['macrosПрокрутка на строку вниз'] = function() {
	scintilla_int.callLineScroll(1);
}
SelfScript.self['macrosПрокрутка на строку вверх'] = function() {
	scintilla_int.callLineScroll(-1);
}
SelfScript.self['macrosПерейти к следующей модифицированной строке'] = function() {
	scintilla_int.callGotoModifiedLine(1);
}
SelfScript.self['macrosПерейти к предыдущей модифицированной строке'] = function() {
	scintilla_int.callGotoModifiedLine(-1);
}
//}

function ColorToColor1C(clr){
	return v8New("Цвет",clr & 255,clr >> 8 & 255,clr >> 16);
}

function Color1CToColor(clr){
	return clr.r | (clr.g << 8) | (clr.b << 16);
}

function rgb(r, g, b) {
	return r | (g << 8) | (b << 16);
}
var styleNames = {
	"default" : "Базовый стиль",
	"keyword" : "Ключевое слово",
	"comment" : "Комментарий",
	"number" : "Число",
	"string" : "Строка",
	"date" : "Дата",
	"identifier" : "Идентификатор",
	"operator" : "Оператор",
	"preprocessor" : "Препроцессор",
	"label" : "Метка",
	"directive" : "Директива",
	"brace" : "Парная скобка",
	"linenumber" : "Номера строк",
	"indentguide" : "Линии выравнивания",
	"currentline" : "Цвет фона текущей строки",
	"selectionhighlight" : "Цвет фона подсветки выделенного слова"
}

var defaultColorSheme = getColorSheme(0);
