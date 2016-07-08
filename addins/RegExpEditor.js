//engine: JScript
//uname: _RegExpEditor
//dname: Редактор регулярных выражений
//descr: Скрипт для редактирования и проверки регулярных выражений
//author: Александр Кунташов <kuntashov@gmail.com>, http://compaud.ru/blog
//www: https://snegopat.ru/scripts/wiki?name=RegExpEditor.js
//help: inplace
//addin: global
//addin: stdlib

////////////////////////////////////////////////////////////////////////////////////////
////{ Cкрипт "Редактор регулярных выражений" (_RegExpEditor.js) для проекта "Снегопат"
////
//// Описание: Предоставляет возможности для редактирования и отладки регурялного выражения
//// в отдельной диалоговой форме.
////
//// Автор: Александр Кунташов <kuntashov@gmail.com>, http://compaud.ru/blog
////}
////////////////////////////////////////////////////////////////////////////////////////
global.connectGlobals(SelfScript);
stdlib.require('TextWindow.js', SelfScript);

////////////////////////////////////////////////////////////////////////////////////////
////{ Макросы
////

SelfScript.Self['macrosРедактировать регулярное выражение'] = function () {
    var reEditor = CreateRegExpEditor();
    reEditor.setTextWindow(GetTextWindow());    
    reEditor.open();
}

/* Возвращает название макроса по умолчанию - вызывается, когда пользователь 
дважды щелкает мышью по названию скрипта в окне Снегопата. */
function getDefaultMacros() {
    return 'Редактировать регулярное выражение';
}

////} Макросы

////////////////////////////////////////////////////////////////////////////////////////
////{ RegExpEditor
////

function CreateRegExpEditor() {
    return new _RegExpEditor();
}

function _RegExpEditor() {
    this.form = loadScriptForm(SelfScript.fullPath.replace(/js$/, 'ssf'), this);

    this.owner = null; // Элемент управления, из которого открыт редактор.    
    this.textWindow = null; // Текстовый документ, из которого открыт редактор.
    
    this.re = null;
    
    this.resTree = this.form.ResultTree;
    
    this.rootRowRegExp = this.addRow(this.resTree, '', '', 'Регулярное выражение');
    this.rowPattern = this.addRow(this.rootRowRegExp, 'RegExp', '');
    
    this.rootRowMatches = this.addRow(this.resTree, '', '', 'Совпадения');
    this.fillHelpers();
}

_RegExpEditor.prototype.open = function (owner) {
    this.owner = owner;
    if (this.owner)
        this.initRegExpFormProps(owner.Value);
        
    this.form.Open();
}

_RegExpEditor.prototype.addRow = function (parent, resultName, resultValue, groupHeader) {
    var row = parent.Rows.Add();    
    if (resultName) row.ResultName = resultName + ':';
    if (resultValue) row.ResultValue = resultValue;        
    if (groupHeader) row.GroupHeader = groupHeader;        
    return row;
}

_RegExpEditor.prototype.expandResultTree = function (expandAll) {
    for (var i=0; i<this.resTree.Rows.Count(); i++) 
        this.form.Controls.ResultTree.Expand(this.resTree.Rows.Get(i), expandAll ? true : false);
}

_RegExpEditor.prototype.expandMatches = function () {
    for (var i=0; i<this.rootRowMatches.Rows.Count(); i++)
        this.form.Controls.ResultTree.Expand(this.rootRowMatches.Rows.Get(i), true);
}

_RegExpEditor.prototype.collapseMatches = function () {
    for (var i=0; i<this.rootRowMatches.Rows.Count(); i++)
        this.form.Controls.ResultTree.Collapse(this.rootRowMatches.Rows.Get(i));
}

_RegExpEditor.prototype.getPattern = function () {
    var pattern = this.form.RegExSource;
    return pattern = pattern.replace(/\n/g, '');    
}

_RegExpEditor.prototype.getFlags = function () {
    var flags = this.form.IgnoreCase ? 'i' : '';
    flags += this.form.Global ? 'g' : '';
    flags += this.form.Multiline ? 'm' : '';
    return flags;
}

_RegExpEditor.prototype.updateRegExpObject = function () {
    
    var pattern = this.getPattern();
    
    if (!pattern)
    {
        this.clearResultTree();
        return;
    }
    
    var flags = this.getFlags();
    
    try 
    {
        this.re = new RegExp(pattern, flags);
    }
    catch (e)
    {   
        this.re = null;
        this.clearResultTree();
        this.rowPattern.ResultValue = e.description;
        return;
    }
    
    this.updateResultTree();    
}

_RegExpEditor.prototype.clearResultTree = function () {
    this.rowPattern.ResultName = 'RegExp';
    this.rowPattern.ResultValue = '';
    this.rootRowMatches.Rows.Clear();
}

_RegExpEditor.prototype.updateResultTree = function () {
    this.clearResultTree();
    if (!this.re) return;    
    
    this.rowPattern.ResultValue = this.re.toString();        
    var testString = this.form.TestString;
    var matches;
    
    while ((matches = this.re.exec(testString)) != null)
    {
        this.addMatches(matches);
        
        // Если поиск не глобальный, то останавливаемся на первом матче.
        if (!this.form.Global)
            break;
    }
    
    if (this.rootRowMatches.Rows.Count() > 0)
    {
        if (this.form.Global)
            this.rootRowMatches.GroupHeader = 'Найденные совпадения (всего ' + this.rootRowMatches.Rows.Count() + ')';
        else
            this.rootRowMatches.GroupHeader = 'Найденное совпадение';    
    }
    else 
    {
        this.rootRowMatches.GroupHeader = 'Совпадений не найдено';
    }
    
    this.expandResultTree();
}

_RegExpEditor.prototype.addMatches = function (matches) {
    var matchNumber = this.rootRowMatches.Rows.Count() + 1;
    var matchRow = this.addRow(this.rootRowMatches, 'Совпадение ' + (this.form.Global ? matchNumber : ''), matches[0]);
    var index = this.re.lastIndex - matches[0].length;
    this.addRow(matchRow, 'Индекс', index ? index : "0");
    this.addRow(matchRow, 'Длина', matches[0].length);
    this.addRow(matchRow, 'lastIndex', this.re.lastIndex);
    var groupsRow = this.addRow(matchRow, 'Группировки', matches.length - 1);
    for (var i=1; i < matches.length; i++)
        this.addRow(groupsRow, 'Группа ' + i, matches[i]);
}

_RegExpEditor.prototype.initRegExpFormProps = function (reSource, i, g, m) {
    this.form.RegExSource = reSource;
    this.form.Multiline = i ? true : false;
    this.form.Global = g ? true : false;
    this.form.IgnoreCase = m ? true : false;
    this.updateRegExpObject();
}

_RegExpEditor.prototype.setTextWindow = function (textWindow) {
    this.textWindow = textWindow;
    if (this.textWindow && this.textWindow.IsActive())
    {
        var pattern = this.textWindow.GetStringUnderCursor();
        if (pattern)
            this.initRegExpFormProps(pattern);
    }
}

////} RegExpEditor

////////////////////////////////////////////////////////////////////////////////////////
////{ RegExpEditor - Хелперы

_RegExpEditor.prototype.fillHelpers = function () {
    this.form.RegExpHelpers.Clear();
    this.addHelper('\\s', 'Найдет любой пробельный символ, включая пробел, табуляцию, переводы строки и другие юникодные пробельные символы.');
    this.addHelper('\\S', 'Найдет любой символ, кроме пробельного.');
    this.addHelper('\\w', 'Найдет любой словесный (латинский алфавит) символ, включая буквы, цифры и знак подчеркивания. Эквивалентно [A-Za-z0-9_].');
    this.addHelper('\\W', 'Найдет любой не-(лат.)словесный символ. Эквивалентно [^A-Za-z0-9_].');
    this.addHelper('\\d', 'Находит цифру из любого алфавита. Испльзуйте [0-9], чтобы найти только обычные цифры.');
    this.addHelper('\\D', 'Найдет нецифровой символ (все алфавиты). [^0-9] - эквивалент для обычных цифр.');
    this.addHelper('\\n', 'Спецсимвол перевода строки.');
    this.addHelper('.', '(Десятичная точка) обозначает любой символ, кроме перевода строки: \\n \\r \\u2028 или \\u2029.');
    this.addHelper('\\', 'Для обычных символов - делает их специальными. Например, выражение /s/ ищет просто символ "s". А если поставить \\ перед s, то /\\s/ уже обозначает пробельный символ.И наоборот, если символ специальный, например *, то \\ сделает его просто обычным символом "звездочка".');    
    this.addHelper('^', 'Обозначает начало входных данных. Если установлен флаг многострочного поиска ("m"), то также сработает при начале новой строки.');
    this.addHelper('$', 'Обозначает конец входных данных. Если установлен флаг многострочного поиска, то также сработает в конце строки.');
    this.addHelper('*', 'Обозначает повторение 0 или более раз.');
    this.addHelper('+', 'Обозначает повторение 1 или более раз. Эквивалентно {1,}.');
    this.addHelper('?', 'Обозначает, что элемент может как присутствовать, так и отсутствовать.');
    this.addHelper('{n}', 'Где n - положительное целое число. Находит ровно n повторений предшествующего элемента.');
    this.addHelper('{n,}', 'Где n - положительное целое число. Находит n и более повторений элемента.');
    this.addHelper('{n,m}', 'Где n и m - положительные целые числа. Находят от n до m повторений элемента.');
    this.addHelper('(x)', 'Запоминающая группировка. Находит шаблон x и запоминает.');
    this.addHelper('(?:x)', 'Незапоминающая группировка. Находит шаблон x, но не запоминает.');
    this.addHelper('x(?=y)', 'Находит x, только если за x следует y.');
    this.addHelper('x(?!y)', 'Находит x, только если за x не следует y. Например, /\d+(?!\.)/ найдет число, только если за ним не следует десятичная точка.');
    this.addHelper('x|y', 'Находит x или y.');
    this.addHelper('[xyz]', 'Набор символов. Находит любой из перечисленных символов. Вы можете указать промежуток, используя тире. Например, [abcd] - то же самое, что [a-d].');
    this.addHelper('[^xyz]', 'Любой символ, кроме указанных в наборе. Вы также можете указать промежуток. Например, [^abc] - то же самое, что [^a-c].');
    this.addHelper('[\\b]', 'Находит символ backspace. (Не путать с \\b.)');
    this.addHelper('\\b', 'Находит границу слов (латинских), например пробел. (Не путать с [\b]).');
    this.addHelper('\\B', 'Обозначает не границу слов.');
    this.addHelper('\\cX', 'Где X - буква от A до Z. Обозначает контрольный символ в строке. Например, /\\cM/ обозначает символ Ctrl-M.');
    this.addHelper('\\f', 'Спецсимвол form-feed.');
    this.addHelper('\\v', 'Спецсимвол вертикальной табуляции.');
    this.addHelper('\\m', 'Где m - целое число. Обратная ссылка на m-ю запомненную группировку.');
    this.addHelper('\\0', 'Спецсимвол NUL. Не добавляйте в конец другие цифры.');
    this.addHelper('\\xHH', 'Найдет символ с кодом HH (2 шестнадцатиричных цифры)');
    this.addHelper('\\uHHHH', 'Найдет символ с кодом HHHH (4 шестнадцатиричных цифры).');
    this.addHelper('^[^/]*(искомаяСтрока)', 'Найдет строку, которая не находится в комментариях. Например, ^[^/]*(\\s*Функция\\s*) найдет все определения функций');

    //this.addHelper('([\\w-\\.]+)@((?:[\\w]+\\.)+)([a-zA-Z]{2,4})', 'Ищет в тексте адрес электропочты (email).', 'Примеры');
    //this.addHelper('\{[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}\}', 'Ищет GUID', 'Примеры');
    //this.addHelper('(\d+)(((.|,)\d+)+)?', 'Ищет в тексте числа');    
    //this.addHelper('', '');    
}

_RegExpEditor.prototype.addHelper = function (pattern, hint, category) {
    var row = this.form.RegExpHelpers.Add();
    row.Pattern = pattern;
    row.Hint = hint;
    row.category = category ? category : 'Справочные';
}
////} _RegExpEditor - Хелперы

////////////////////////////////////////////////////////////////////////////////////////
////{ _RegExpEditor - Обработчики событий формы
////

_RegExpEditor.prototype.OnOpen = function () {
    if (!this.textWindow && !this.owner)
        this.form.Controls.btOk.Visible = false;
}

_RegExpEditor.prototype.RegExSourceOnChange = function (Control) {
    this.updateRegExpObject();
}

_RegExpEditor.prototype.IgnoreCaseOnChange = function (Control) {
    this.updateRegExpObject();
}

_RegExpEditor.prototype.GlobalOnChange = function (Control) {
    this.updateRegExpObject();
}

_RegExpEditor.prototype.MultilineOnChange = function (Control) {
    this.updateRegExpObject();
}

_RegExpEditor.prototype.ResultTreeOnRowOutput = function (Control, RowAppearance, RowData) {
    var isHeader = (RowData.val.Parent == undefined);
    RowAppearance.val.Cells.GroupHeader.Visible = isHeader;
    RowAppearance.val.Cells.ResultValue.Visible = !isHeader;
    RowAppearance.val.Cells.ResultName.Visible = !isHeader;
}

_RegExpEditor.prototype.TestStringOnChange = function (Control) {
    this.updateRegExpObject();
}

_RegExpEditor.prototype.TreeCmdBarExpandAll = function (Control) {
    this.expandMatches();
}

_RegExpEditor.prototype.TreeCmdBarCollapseAll = function (Control) {
    this.collapseMatches();
}

_RegExpEditor.prototype.TreeCmdBarUpdateResults = function (Control) {
    this.updateRegExpObject();
}

_RegExpEditor.prototype.RegExpHelpersSelection = function (Control, SelectedRow, Column, DefaultHandler) {
	this.form.RegExSource += SelectedRow.val.Pattern;
}

_RegExpEditor.prototype.RegExpHelpersOnActivateRow = function (Control) {
    var curRow = this.form.Controls.RegExpHelpers.CurrentData;
    this.form.HelpersHint = curRow ? curRow.Hint : '';
}

_RegExpEditor.prototype.btHelpClick = function (Элемент) {
    RunApp('http://snegopat.ru/');
}

_RegExpEditor.prototype.btOkClick = function (Элемент) {
    
    var pattern = this.getPattern();
    
    if (this.textWindow && this.textWindow.IsActive()) 
    {
        /* Т.е. текст вставляется в модуль как строковый литерал, 
        то необходимо экранировать двойные кавычки. */
        pattern = pattern.replace(/\"/g, '""');
        this.textWindow.SetSelectedText(pattern);
    }
    else if (this.owner) 
    {
        this.owner.Value = pattern;
    }
    
    this.form.Close();
    this.form = null;
}

_RegExpEditor.prototype.CmdBarAddSlashes = function (Кнопка) {
    this.form.RegExSource = this.form.RegExSource.replace(/\\/g, '\\\\');
}

_RegExpEditor.prototype.CmdBarRemoveSlashes = function (Кнопка) {
    this.form.RegExSource = this.form.RegExSource.replace(/\\\\/g, '\\');
}

_RegExpEditor.prototype.CmdBarAddDoubleQuotes = function (Кнопка) {
    this.form.RegExSource = this.form.RegExSource.replace(/"/g, '""');
}

_RegExpEditor.prototype.CmdBarRemoveDoubleQuotes = function (Кнопка) {
    this.form.RegExSource = this.form.RegExSource.replace(/""/g, '"');
}

_RegExpEditor.prototype.CmdBarRemoveNewLines = function (Кнопка) {
    this.form.RegExSource = this.form.RegExSource.replace(/\r|\n/g, '');
}
////} RegExpEditor - Обработчики событий формы
