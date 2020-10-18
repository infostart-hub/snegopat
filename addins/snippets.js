//engine: JScript
//uname: snippets
//dname: Шаблоны кода
//descr: Расширение возможностей механизма шаблонов кода 1С:Предприятия 8.
//author: Александр Кунташов <kuntashov@gmail.com>, http://compaud.ru/blog
//www: https://snegopat.ru/scripts/wiki?name=snippets.js
//help: inplace
//addin: global
//addin: stdlib

////////////////////////////////////////////////////////////////////////////////////////
////{ Cкрипт "Шаблоны кода" (snippets.js) для проекта "Снегопат"
////
//// Описание: Расширение возможностей механизма шаблонов кода 1С:Предприятия 8.
//// Автор: Александр Кунташов <kuntashov@gmail.com>, http://compaud.ru/blog
////}
////////////////////////////////////////////////////////////////////////////////////////

global.connectGlobals(SelfScript);
stdlib.require('TextWindow.js', SelfScript);
stdlib.require('StreamLib.js', SelfScript);
stdlib.require('SettingsManagement.js', SelfScript);
stdlib.require("SelectValueDialog.js", SelfScript);

////////////////////////////////////////////////////////////////////////////////////////
////{ Макросы
////

/* Выполняет подстановку шаблона, выбранного из выпадающего списка шаблонов. */
function macrosВыполнитьПодстановкуШаблона() {
    var sm = GetSnippetsManager();
    sm.insertSnippet();
}

/* Перезагружает список шаблонов (например, после редактирования шаблона). */
function macrosПерезагрузитьШаблоны() {
    var sm = GetSnippetsManager();
    sm.reloadTemplates();
}

/* Открывает диалог настройки скрипта. */
function macrosОткрытьНастройкиСкрипта() {
    var sm = GetSnippetsManager();
    var settingsDialog = new SettingsManagerDialog(sm.settings);
    settingsDialog.Open();
}

/* Позволяет вставлять расширенные управляющие конструкции шаблонов из списка выбора. 
Предназначен для использования в штатном редакторе шаблонов для вставки расширенных 
управляющих конструкций. */
function macrosВставитьРасширеннуюУправляющуюКонструкцию() {

    var w = GetTextWindow();
    if (!w) return;

    var sm = GetSnippetsManager();
    var params = sm.paramsManager.getAllParams();
    
    var selParam = sm.selectValue(params);
    if (selParam)
        w.SetSelectedText('<%' + selParam + '>');    
}

/* Возвращает название макроса по умолчанию - вызывается, когда пользователь 
дважды щелкает мышью по названию скрипта в окне Снегопата. */
function getDefaultMacros() {
    return 'ОткрытьНастройкиСкрипта';
}

////} Макросы

////////////////////////////////////////////////////////////////////////////////////////
////{ SnippetsManager
////

function SnippetsManager() {

    SnippetsManager._instance = this;

    this.settings = SettingsManagement.CreateManager(SelfScript.uniqueName, {'TemplateFilesList':getDefaultTemplatesList()});
    this.settings.LoadSettings();
	if (this.settings.current.TemplateFilesList.Count() == 0) {
		var row = this.settings.current.TemplateFilesList.Add();
		row.Value = ".\\core\\addins\\snippets.st";
	}
    
    this._snippets = {};
    this._snippetNames = new Array();
    
    this.paramsManager = new SnippetParametersManager();         
    
    this.loadTemplates();
}

SnippetsManager.prototype.loadTemplates = function() {
    var stFiles = this.settings.current.TemplateFilesList;
    for(var i=0; i<stFiles.Count(); i++)
        this.loadStFile(getAbsolutePath(stFiles.Get(i).Value));
}

SnippetsManager.prototype.reloadTemplates = function() {
    this._snippets = {};
    this._snippetNames = new Array();    
    this.loadTemplates();
}

SnippetsManager.prototype.loadStFile = function(filename) {
    var sp = StreamFactory.CreateParser();
    if (sp.readStreamFromFile(filename))
    {
        var arr = sp.parse()
        if (!arr) return;
        
        // Загружаем шаблоны.
        return this._loadStElement(arr[1]);
            
    }
}

SnippetsManager.prototype._loadStElement = function(stElement) {
    var elCount = stElement[0];
    var elProps = stElement[1];
    if (elProps[1] == 1)
    {
        // Это группа.
        for (var i=2; i<stElement.length; i++)
            this._loadStElement(stElement[i]);
    }
    else 
    {
        // Это элемент.
        this._addSnippet(elProps);        
    }    
}

SnippetsManager.prototype._addSnippet = function(stElement) {
    var snippet = new Snippet(stElement);

    if (!this._snippets[snippet.name])
    {
        this._snippets[snippet.name] = new Array();
        this._snippetNames.push(snippet.name);
    }
        
    this._snippets[snippet.name].push(snippet);
    
    if (snippet.hasMacros())
        this.createSnippetMacros(snippet);        
}

SnippetsManager.prototype.createSnippetMacros = function(snippet)  {
    SelfScript.self['macrosВставить шаблон ' + snippet.macrosName] = function() { 
        snippet.insert(GetTextWindow()); 
    };
}

SnippetsManager.prototype.getSnippetsByName = function(name) {
    return this._snippets[name];
}

SnippetsManager.prototype.insertSnippet = function() {
    var textWindow = GetTextWindow();
    if (!textWindow) return;
    
    var snippetName = this.selectValue(this._snippetNames);
    if (!snippetName)
        return;
    
    var snippets = this._snippets[snippetName];
    if (snippets && snippets.length)
    {
        snippets[0].insert(textWindow);
        return true;
    }
    
    return;
}

SnippetsManager.prototype.selectValue = function(values) {
    //FIXME: создавать объект Svcsvc один раз, при старте скрипта. 
    var useSvcsvc = true;
    try
    {
        var sel = new ActiveXObject('Svcsvc1.Service')
    }
    catch(e)
    {
        //Message("Не удалось создать объект 'Svcsvc.Service'. Зарегистрируйте svcsvc.dll");
        useSvcsvc = false;
    }
    //debugger;
    if(useSvcsvc){
        return sel.FilterValue(values.join("\r\n"), 1 | 4, '', 0, 0, 350, 250);         
    } else {
        var dlg = new SelectValueDialog("Выберите шаблон", values);
        dlg.form.GreedySearch = true; 
        sel = dlg.selectValue();
        return dlg.selectedValue
    }
   
}

SnippetsManager.prototype.onProcessTemplate = function(params) {
    /* При вставке шаблона штатными средствами (например, при перетаскивании шаблона из дерева шаблонов)
    удалим служебные директивы и выполним подстановку наших управляющих конструкций. */
    var res = this.paramsManager.processAddMacrosDirective(params.text);
    params.text = this.paramsManager.replaceExtendedParams(res.realTpl);
}
////} SnippetsManager

////////////////////////////////////////////////////////////////////////////////////////
////{ SnippetParametersManager
////

function SnippetParametersManager() {

    // Для использования в замыканиях.
    var sm = this;
    
    this.initExtendedParams();
}

SnippetParametersManager.prototype.initExtendedParams = function ()
{
    /* Используется для определения управляющих конструкций, значения подстановки 
    которых могут меняться в результате изменения конфигурации. */
    function f(c){return function(){try{return eval(c);}catch(e){Message(e.description);return ''}}};
    
    this._parameters = {
        
        'Конфигурация.Имя'          : f('Метаданные.Имя'),
        'Конфигурация.Синоним'      : f('Метаданные.Синоним'),
        'Конфигурация.Комментарий'  : f('Метаданные.Комментарий'),
        'Конфигурация.Поставщик'    : f('Метаданные.Поставщик'),
        
        'Конфигурация.Версия'            : f('Метаданные.Версия'),
        'Конфигурация.АвторскиеПрава'    : f('Метаданные.АвторскиеПрава'),
        'Конфигурация.КраткаяИнформация' : f('Метаданные.КраткаяИнформация'),
        
        'Конфигурация.ПодробнаяИнформация'           : f('Метаданные.ПодробнаяИнформация'),
        'Конфигурация.АдресИнформацииОКонфигурации'  : f('Метаданные.АдресИнформацииОКонфигурации'),
        'Конфигурация.АдресИнформацииОПоставщике'    : f('Метаданные.АдресИнформацииОПоставщике'),
        
        'ИмяПользователяОС': f('(new ActiveXObject("WScript.Shell")).ExpandEnvironmentStrings("%USERNAME%")')        
    };
}

SnippetParametersManager.prototype.getAllParams = function () {
    var params = new Array();
    
    for (var param in this._parameters)
        params.push(param);
        
    return params;
}

SnippetParametersManager.prototype.replaceExtendedParams = function(tpl) {
    var code = tpl;
    var params = this.getTemplateParams(tpl);
    
    for(var param in params)
        code = code.replace(new RegExp(StringUtils.addSlashes(param), 'g'), params[param]);
        
    return code;
}

SnippetParametersManager.prototype.getTemplateParams = function(tpl)
{
    var params = {};
    // <%Конфигурация.Имя> и т.п.
    var matches = tpl.match(/\<\%([\wА-я]+|[\wА-я]+\.[\wА-я]+)\>/gi);
    for (var i=0; matches && i<matches.length; i++)
    {
        var key = matches[i];
        var prm = key.substr(2, key.length - 3);
        params[key] = this.calcParamValue(prm);
    }
        
    return params;
}

SnippetParametersManager.prototype.calcParamValue = function(key)
{
    var param = this._parameters[key];
    
    if (!param)
        return '';
        
    if (typeof param == 'function')
        return param.call();
        
    return param;
}

/* Обрабатывает служебную директиву шаблона <%Макрос: Имя макроса> */
SnippetParametersManager.prototype.processAddMacrosDirective = function (tpl) {
    var lines = StringUtils.toLines(tpl);
    var result = { 'macrosName':'', 'realTpl':'' };
    if (lines.length > 1)
    {
        // Пример директивы для snippets.js
        //<%Макрос "Авторский комментарий: Добавление">
        var matches = lines[0].match(/\<\%Макрос\s+\"(.+?)\"\>/);
        if (matches)
        {
            result.macrosName = matches[1];
            // Строку с директивой удаляем из шаблона.
            lines = lines.slice(1);
        }
    }
    result.realTpl = StringUtils.fromLines(lines);
    return result;
}

////} SnippetParametersManager

////////////////////////////////////////////////////////////////////////////////////////
////{ Snippet
////
function Snippet(stElement) {
// ["Имя шаблона 2",0,1,"","Шаблон, включаемый в контекстно меню"]

    this.name = stElement[0];
    this.includeInContextMenu = (stElement[2] == 1);
    this.replacementString = stElement[3];
    
    this.macrosName = '';
    this.template = '';
    
    this._initTemplateText(stElement[4]);
}

Snippet.prototype._initTemplateText = function(tpl) {
   var sm = GetSnippetsManager();        
   var res = sm.paramsManager.processAddMacrosDirective(tpl);  
   this.macrosName = res.macrosName;
   this.template = res.realTpl;
}

Snippet.prototype.hasMacros = function() {
    return (this.macrosName != '');
}

/* Вычисляет относительные координаты положения маркера курсора в шаблоне.
Возвращает анонимный объект с двумя свойствами row - индекс строки и 
col - индекс колонки в строке. Нумерация строк и колонок - с 0.
Возвращает null, если маркер не найден. */
Snippet.prototype.getCursorCoord = function (tpl, selectedRowsCount) {    
    
    /* Если есть выделенный текст, то позиция курсора может быть указана
    в управляющей конструкции путем добавления символа "|" перед
    первым символом подсказки, например <?"|Введите условие">.
    Если выделенного текста нет, то позиция курсора определяется при
    помощи стандартной управляющей конструкции <?>. */
    var stdMarker = '<?>';
    var altMarker = '<?"|';
    
    var curMarker = selectedRowsCount ? altMarker : stdMarker;
    
    var lines = StringUtils.toLines(tpl);    

    // Для определения взаимного расположения стандартного и альтернативного маркера.
    var stdMarkerRow = -1;
    var altMarkerRow = -1;
    
    var coords = null;
    
    for (var row=0; row<lines.length; row++)
    {
        if (stdMarkerRow < 0 && lines[row].indexOf(stdMarker) >=0) 
            stdMarkerRow = row;
            
        if (altMarkerRow < 0 && lines[row].indexOf(altMarker) >=0)
            altMarkerRow = row;
        
        var col = lines[row].indexOf(curMarker);
        if (col >= 0)
        {
            coords = { 'row': row, 'col': col };
            /* Если маркер альтернативной позиции курсора ниже основного, то при
            расчете координаты строки надо учесть высоту выделенного блока. */
            if (curMarker == altMarker && stdMarkerRow > -1 && altMarkerRow > stdMarkerRow)
                coords.row += selectedRowsCount - 1;
                
            return coords;            
        }
    }
 
    return null;
}

/* Выполняет подстановку значений в шаблон. */
Snippet.prototype.parseTemplateString = function (tpl) {
        
    var sm = GetSnippetsManager();
        
    tpl = sm.paramsManager.replaceExtendedParams(tpl);  
    
    /* Используем штатный интерпретатор шаблонов 1С,
    доступ к которому нам предоставляет Снегопат. */    
    return snegopat.parseTemplateString(tpl);
}

/* Выполняет подстановку шаблона в текст */
Snippet.prototype.insert = function (textWindow) {
//debugger;
    var code = this.template;
    
    // Определить, есть ли выделенный текст, который надо будет подставить вместо <?>.
    var selection = this.getSelection(textWindow);
    var selectedText = textWindow.GetSelectedText();
    var isSelected = (selectedText != "");    
    
    /* Если в хвосте есть перевод строки (выделены с shift'ом строки и в итоге курсор  
    стоит на следующей строке), то нам этот перевод строки нельзя включать в выделенный
    текст, а надо перенести после вставленного сниппета. */
    var isTrailingNL = StringUtils.endsWith(selectedText, "\n");
    if (isTrailingNL)
        selectedText = selectedText.substr(0, selectedText.length - 1);
        
    /* Определим и запомним отступ. Если выделен текст, то отступ определяем
    по первой строке выделенного блока. В противном случае используем отступ строки,
    в которой был установлен курсор на момент вставки шаблона. */
    var ind = '';
    if (isSelected)
    {
        ind = StringUtils.getIndent(selectedText);
    }
    else 
    {
        var leftPart = textWindow.Range(selection.beginRow, 1, selection.beginRow, selection.beginCol).GetText();
        ind = leftPart.match(/^\s*$/) ? leftPart : '';
    }
     
    var cursorCoords = this.getCursorCoord(code, isSelected ? StringUtils.toLines(selectedText).length : 0);
     
    // Если был выделен текст, то подставим его вместо <?>.
    if (isSelected)
    {
        // Удалим исходный отступ.
        selectedText = StringUtils.shiftLeft(selectedText, ind);
        
        // Отступ, установленный в шаблоне перед <?> надо распространить на весь выделенный текст.
        var re = /^([ |\t]+)\<\?\>/m;
        var matches = code.match(re);
        
        if (matches)
        {
            selectedText = StringUtils.shiftRight(selectedText, matches[1]);
            code = code.replace(re, selectedText);
        }
        else
        {        
            code = code.replace(/\<\?\>/, selectedText);
        }
        
        /* Удалим альтернативный маркер позиции курсора (если он присутствует), причем
        вместе с управляющей конструкцией, чтобы подстановка по шаблону для нее не выполнялась. */
        code = code.replace(/\<\?\"\|.*?\".*?\>/, '');
    }
    else
    {
        /* Если в момент вставки шаблона не было выделено текста, то удалим штатный маркер 
        позиции курсора (если вдруг он присутствует), курсор мы будем позиционировать самостоятельно. */
        code = code.replace(/\<\?\>/, '');
    }
        
    // Выполним подстановку шаблонов 1С.
    code = this.parseTemplateString(code); 
        
    // Применим отступ к полученному коду сниппета.
    code = StringUtils.shiftRight(code, ind);
    
    /* Если вставляется многострочный блок в текущую позицию курсора и никакого 
    текста не выделено, то надо очистить отступ в первой строке вставляемого  
    блока, чтобы он не дублировался. */
    if (!isSelected && ind != '')
        code = code.replace(new RegExp('^' + ind), '');
    
    // Вернем перевод строки в конец вставляемого текста (если он был в конце выделенного блока).
    if (isTrailingNL)
        code += "\n";
        
    // Заменить выделенный текст или вставить текст в текущую позицию.
    textWindow.SetSelectedText(code);
    
    /* Если в тексте был найден маркер положения курсора, то выполним 
    установку курсора в позицию маркера, рассчитав его абсолютные координаты. */    
    if (cursorCoords)
    {
        var row = selection.beginRow + cursorCoords.row;
        var col = selection.beginCol + cursorCoords.col + ind.length - (isSelected ? 0 : 1);
        textWindow.SetCaretPos(row, col);
    }
}

/* Корректирует текущее выделение блока и возвращает выделение (ISelection).
Корректировка заключается в изменении  колонки в первой строке и 
номера последней строки:
    - если первая строка выделена не с начала, но левее выделения в первой строке только
    пробельные символы, то выделение начинаем с первого символа первой строки;
    - если все символы из последней строки, попавшие в выделение - пробельные, то
    эту строку исключаем из выделения. */
Snippet.prototype.getSelection = function (textWindow) {
    
    var sel = textWindow.GetSelection();
    if (sel.beginRow != sel.endRow) 
    {
        var beginCol = sel.beginCol;
        
        /* Если левее начала выделения только пробельные символы, 
        то считаем началом блока начало строки. */
        var leftPart = textWindow.GetLine(sel.beginRow).substr(0, beginCol - 1);
        if (leftPart.match(/^\s+$/))
            beginCol = 1;
                
        /* В последней строке выделения от начала строки и до конца
        выделения - пустая строка, то исключим эту строку из выделения. */
        var endRow = sel.endRow;//sel.endCol > 1 ? sel.endRow : sel.endRow - 1;
        leftPart = textWindow.GetLine(endRow).substr(0, sel.endCol - 1);
        if (!leftPart || leftPart.match(/^\s+$/))
            endRow--;
        
        // Корректируем выделение выделение блока.
        textWindow.SetSelection(sel.beginRow, beginCol, endRow, textWindow.GetLine(endRow).length + 1);
        sel = textWindow.GetSelection();
    }
    
    return sel;
}

////} Snippet

////////////////////////////////////////////////////////////////////////////////////////
////{ SettingsManagerDialog
////

function SettingsManagerDialog(settings) {
    this.settings = settings;
    this.form = loadScriptFormEpf(SelfScript.fullPath.replace(/\.js$/, '_settings.epf'), "Форма", this);
	if (!this.form) {
		throw "Шаблоны кода не смогли загрузить форму";
	}
    this.settings.ApplyToForm(this.form);
}

SettingsManagerDialog.prototype.Open = function() {
  this.form.Open();
}

SettingsManagerDialog.prototype._saveSettings = function() {
    
    this.settings.ReadFromForm(this.form);
    this.settings.SaveSettings();
    this.form.Modified = false;
    
    // Перезагрузим шаблоны после изменения настроек.
    var sm = GetSnippetsManager();
    sm.reloadTemplates();
}

SettingsManagerDialog.prototype.CmdBarSaveAndClose = function(button) {
    this._saveSettings();
    this.form.Close();
}

SettingsManagerDialog.prototype.CmdBarSave = function (button) {
    this._saveSettings();
}

SettingsManagerDialog.prototype.CmdBarClose = function (button) {        
    this.form.Close();
}

SettingsManagerDialog.prototype.CmdBarAbout = function (button) {
    RunApp('http://snegopat.ru/scripts/wiki?name=snippets.js');
}

SettingsManagerDialog.prototype.selectTemplateFiles = function (multiselect) {

    var dlg = v8New('FileDialog',  FileDialogMode.Open);
    dlg.Multiselect = multiselect ? true : false;
    dlg.CheckFileExist = true;
    dlg.Filter = "Файлы шаблонов (*.st)|*.st|Все файлы|*";
    
    if (dlg.Choose())
        return multiselect ? dlg.SelectedFiles : dlg.FullFileName;
        
    return null;
}

SettingsManagerDialog.prototype.CmdBarStListAddStFile = function (button) {

    var selected = this.selectTemplateFiles(true);    
    if (selected)
    {
        this.form.Modified = true;
        
        for (var i=0; i<selected.Count(); i++)
            this.form.TemplateFilesList.Add().Value = selected.Get(i);
    }
}

SettingsManagerDialog.prototype.CmdBarStListDeleteStFile = function (button) {
    var curRow = this.form.Controls.TemplateFilesList.CurrentRow;
    if (curRow)
    {
        this.form.TemplateFilesList.Delete(curRow);
        this.form.Modified = true;        
    }
}

SettingsManagerDialog.prototype.TemplateFilesListValueStartChoice = function (Control, DefaultHandler) {

    DefaultHandler.val = false;

    var fname = this.selectTemplateFiles(false);    
    if (fname)
    {
        this.form.Modified = true;
        Control.val.Value = fname;
    }    
}

SettingsManagerDialog.prototype.OnOpen = function() {
}

SettingsManagerDialog.prototype.BeforeClose = function(Cancel, StandardHandler) {

    StandardHandler.val = false;

    if (this.form.Modified)
    {
        var answ = DoQueryBox("Настройки были изменены. Сохранить?", QuestionDialogMode.YesNoCancel);
        
        if (answ == DialogReturnCode.Cancel)
        {
            Cancel.val = true;
            return;
        }
            
        if (answ == DialogReturnCode.Yes)
            this._saveSettings();                
    }	
    
    Cancel.val = false;
}

////} SettingsManagerDialog 

////{ Вспомогательные функции. 
function getDefaultTemplatesList() {
    var tplList = v8New('ValueTable');
    tplList.Columns.Add('Value');
    return tplList;
}

function getAbsolutePath(path) {

    // Путь относительный?
    if (path.match(/^\.{1,2}[\/\\]/))
    {
        // Относительные пути должны задаваться относительно главного каталога Снегопата.
        return env.pathes.main + path;
    }
    
    return path;
}

////} Вспомогательные функции. 

////////////////////////////////////////////////////////////////////////////////////////
////{ Startup
////
function GetSnippetsManager() {
    if (!SnippetsManager._instance)
        new SnippetsManager();
        
    return SnippetsManager._instance;
}

events.connect(snegopat, "onProcessTemplate", GetSnippetsManager());

////} Startup 