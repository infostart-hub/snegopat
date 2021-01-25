//engine: JScript
//uname: Refactoring
//dname: Рефакторинг
//addin: global
//addin: stdlib
//addin: vbs

////////////////////////////////////////////////////////////////////////////////////////
////{ Cкрипт "Рефакторинг" (refactoring.js) для проекта "Снегопат"
////
//// Описание: Реализует простейшие инструменты рефакторинга.
//// Автор: Александр Кунташов <kuntashov@gmail.com
////}
////////////////////////////////////////////////////////////////////////////////////////

stdlib.require('TextWindow.js', SelfScript);
stdlib.require('SettingsManagement.js', SelfScript);

stdlib.require('SyntaxAnalysis.js', SelfScript);
//Для отладки: stdlib.require(profileRoot.getValue("Snegopat/MainFolder") + 'user\\Libs\\SyntaxAnalysis.js', SelfScript);

global.connectGlobals(SelfScript);

////////////////////////////////////////////////////////////////////////////////////////
////{ Макросы
////

SelfScript.self['macrosВыделить метод (extract method)'] = function () {
    refactor(ExtractMethodRefactoring);
}

SelfScript.self['macrosВыделить переменную (extract variable)'] = function () {

    refactor(ExtractVariableRefactoring);
}

SelfScript.self['macrosПереименовать переменную (rename variable)'] = function () {

    refactor(RenameVariableRefactoring);
}

SelfScript.self['macrosПоказать список процедур и функций модуля'] = function () {
    var tw = GetTextWindow();
    if (!tw) return;
    var module = SyntaxAnalysis.AnalyseTextDocument(tw);
    var methList = new MethodListForm(module);
    if (methList.selectMethod())
        Message(methList.SelectedMethod.Name);
}

SelfScript.self['macrosСоздать заглушку для несуществующего метода'] = function () {
    refactor(CreateMethodStubRefactoring, true);
}

SelfScript.self['macrosИз процедуры в функцию и обратно'] = function() {
	refactor(FuncToProc, true);
}


////} Макросы

function refactor(refactorerClass, withoutSelection) {

    var tw = GetTextWindow();
    if (!tw) return;

    var selText = tw.GetSelectedText();
    if (!selText && !withoutSelection)
    {
        Message("Не выделен текст, к которому применяется рефакторинг!");
        return;
    }

    var module = SyntaxAnalysis.AnalyseTextDocument(tw);
    var refactorer = new refactorerClass(module);
    refactorer.refactor(selText);
}

function FuncToProc(module) {
	this.module = module;
    this.textWindow = this.module.textWindow;
}

FuncToProc.prototype.refactor = function (selectedText) {
	var curMethod = this.module.getActiveLineMethod();
	var sel = this.textWindow.getSelection();
	if (curMethod == null)
		return;
	var endCol = 1;
	var text = this.module.getMethodSource(curMethod.Name);
	if (curMethod.IsProc) {
		text = "Функция" + text.substr(9, text.length - 23) + "КонецФункции";
		endCol = 15;
	} else {
		text = "Процедура" + text.substr(7, text.length - 19) + "КонецПроцедуры";
		endCol = 13;
	}
	this.textWindow.SetSelection(curMethod.StartLine + 1, 1, curMethod.EndLine + 1, endCol);
	this.textWindow.SetSelectedText(text);
	this.textWindow.setCaretPos(sel.beginRow, sel.beginCol);
}

////////////////////////////////////////////////////////////////////////////////////////
////{ MethodListForm
////

function MethodListForm(module) {

    this.module = module;
    this.originalMethodList = module.getMethodsTable();

    this.form = loadFormForScript(SelfScript, 'MethodListForm', this);
    this.SelectedMethod = undefined;

    this.settings = SettingsManagement.CreateManager(SelfScript.uniqueName + "/MethodListForm", {
        'DoNotFilter': false, 'SortByName' : false
    });

    this.settings.LoadSettings();

    var methListForm = this;
    this.tcWatcher = new TextChangesWatcher(this.form.Controls.SearchText, 3, function(t){methListForm.fillMethodList(t)});

    this.icons = {
        'Proc': this.form.Controls.picProc.Picture,
        'Func': this.form.Controls.picFunc.Picture
    }

    this.fillMethodList();
}

MethodListForm.prototype.selectMethod = function () {
    this.SelectedMethod = this.form.DoModal();
    return this.SelectedMethod ? true : false;
}

MethodListForm.prototype.MethodListSelection = function (Control, SelectedRow, Column, DefaultHandler) {
    this.form.Close(SelectedRow.val._method);
}

MethodListForm.prototype.MethodListOnRowOutput = function (Control, RowAppearance, RowData) {
    var nameCell = RowAppearance.val.Cells.Name;
    nameCell.SetPicture( RowData.val.IsProc ? this.icons.Proc : this.icons.Func);
}

MethodListForm.prototype.CmdBarSortByName = function (button) {
    button.val.Check = !button.val.Check;
    this.form.SortByName = button.val.Check;
    this.sortMethodList(button.val.Check);
}

MethodListForm.prototype.CmdBarDoNotFilter = function (button) {
    button.val.Check = !button.val.Check;
    this.form.DoNotFilter = button.val.Check;
    this.fillMethodList(this.form.SearchText);
}

MethodListForm.prototype.CmdBarMainОК = function (Кнопка) {
    var SelectedRow = this.form.Controls.MethodList.CurrentRow;
    if (SelectedRow)
        this.form.Close(SelectedRow._method);
    else
        this.form.CurrentControl = this.form.Controls.SearchText;
}

MethodListForm.prototype.OnOpen = function () {

    this.settings.ApplyToForm(this.form);

    this.form.Controls.CmdBar.Buttons.SortByName.Check = this.form.SortByName;
    this.form.Controls.CmdBar.Buttons.DoNotFilter.Check = this.form.DoNotFilter;

    this.loadedOnOpen = true;
    this.tcWatcher.start();
}

MethodListForm.prototype.BeforeClose = function (Cancel, StandardHandler) {
    this.tcWatcher.stop();
    this.saveSettings();
}

MethodListForm.prototype.fillMethodList = function (newText) {

    if (!newText || newText.match(/^\s*$/))
    {
        if (this.loadedOnOpen)
            this.loadedOnOpen = false;
        else
            this.form.Controls.MethodList.Value = this.originalMethodList.Copy();
    }
    else
    {
        var a = newText.split(/\s+/);
        for (var i=0; i<a.length; i++)
            a[i] = StringUtils.addSlashes(a[i]);

        var re = new RegExp(a.join(".*?"), 'i');

        if (this.form.DoNotFilter)
        {
            var currentRow = undefined;

            var methList = this.originalMethodList.Copy();
            for (var rowNo = 0; rowNo < methList.Count(); rowNo++)
            {
                var row = methList.Get(rowNo);
                if (re.test(row.Name))
                {
                    currentRow = row;
                    break;
                }
            }

            this.form.Controls.MethodList.Value = methList;
            if (currentRow)
                this.form.Controls.MethodList.CurrentRow = currentRow;
        }
        else
        {
            var methList = this.form.Controls.MethodList.Value;
            methList.Clear();
            for (var rowNo = 0; rowNo < this.originalMethodList.Count(); rowNo++)
            {
                var row = this.originalMethodList.Get(rowNo);
                if (re.test(row.Name))
                    FillPropertyValues(methList.Add(), row);
            }
        }
    }

    this.sortMethodList(this.form.SortByName);
}

MethodListForm.prototype.sortMethodList = function (sortByName) {
    this.form.MethodList.Sort(sortByName ? 'Name' : 'StartLine');
}

MethodListForm.prototype.saveSettings = function () {
    this.settings.ReadFromForm(this.form);
    this.settings.SaveSettings();
}

////} MethodListForm

////////////////////////////////////////////////////////////////////////////////////////
////{ CreateMethodStubRefactoring
////

function CreateMethodStubRefactoring(module) {

    this.module = module;
    this.textWindow = this.module.textWindow;
}

CreateMethodStubRefactoring.prototype.refactor = function (selectedText) {

    var fullMethodCall, parts, methodName, moduleName, methodSignature, matches;

    fullMethodCall = this.textWindow.GetWordUnderCursor(/[\.\w\dА-я]/);
    if (!fullMethodCall)
        return;

    parts = fullMethodCall.split('.');

    var isCallFromModule = parts.length > 1;

    if (isCallFromModule) {
        // TODO: Поддержку модулей менеджеров и (?) модулей менеджерв
        // (если получиться определять тип)
        moduleName = parts[0];
        methodName = parts[1];
    }
    else {
        moduleName = '';
        methodName = parts[0];
    }

    // Экранируем точку (хотя не обязательно, она матчит любой символ, в том числе и саму себя).
    var escDot = function(s) { return s.replace('.', '\\.'); }

    var method_call_proc = new RegExp("(?:;\\s*|^\\s*)" + escDot(fullMethodCall) + '(\\(.*?\\))');
    var method_call_func = new RegExp(escDot(fullMethodCall) + "(\\(.*?\\))");

    var line = this.textWindow.GetLine(this.textWindow.GetCaretPos().beginRow);

    var matches = line.match(method_call_proc);
    var isProc = (matches != null);

    if (!isProc) {
        matches = line.match(method_call_func);
        if (!matches)
            return;
    }

    methodSignature = methodName + matches[1] + (isCallFromModule ? ' Экспорт' : '');

    var procTemplate = "\n"
    + "Процедура ИмяМетода()\n"
    + "\t//TODO: Добавьте исходный код процедуры.\n"
    + "КонецПроцедуры\n";

    var funcTemplate = "\n"
    + "Функция ИмяМетода()\n"
    + "\t//TODO: Добавьте исходный код функции.\n"
    + "\tВозврат Неопределено;\n"
    + "КонецФункции\n";

    var stubCode = isProc ? procTemplate : funcTemplate;
    stubCode = stubCode.replace('ИмяМетода()', methodSignature);

    var insertLineIndex = 0, textWindow = null;

    if (isCallFromModule) {
        var mdModule = metadata.current.rootObject.childObject("ОбщиеМодули", moduleName);
        if (!mdModule) {
            Message("Общий модуль " + moduleName + " не найден!");
            return;
        }
        mdModule.openModule("Модуль");

        textWindow = GetTextWindow();
        if (!textWindow) {
            Message("Не найдет активный текстовый документ общего модуля " + moduleName);
            return;
        }

        insertLineIndex = textWindow.LinesCount();
        module = SyntaxAnalysis.AnalyseTextDocument(textWindow);
        if (module.context.Methods.length) {
            var lastMethod = module.context.Methods[ module.context.Methods.length - 1 ];
            insertLineIndex = lastMethod.EndLine + 1;
        }
    }
    else {
        textWindow = this.textWindow;
        var curMethod = this.module.getActiveLineMethod();
        insertLineIndex = curMethod.EndLine + 1;
    }

    textWindow.InsertLine(insertLineIndex + 1, stubCode);
    textWindow.SetCaretPos(insertLineIndex + 3, 1);
}

////} CreateMethodRefactoring

////////////////////////////////////////////////////////////////////////////////////////
////{ RenameVariableRefactoring
////
function RenameVariableRefactoring(module) {
    this.module = module;
    this.form = loadFormForScript(SelfScript, 'ExtractVariableForm', this);
    this.ReturnValue = this.form.Name;
}

RenameVariableRefactoring.prototype.refactor = function (selectedText) {

    var sel = this.module.textWindow.GetSelection();
	this.form.Заголовок = "Переименование переменной";
	this.form.Name = selectedText;
    if (this.form.DoModal())
        this.renameVariable(selectedText);
}

RenameVariableRefactoring.prototype.BtVarOKClick = function (Control) {

    if (!this.form.Name.match(/^[_\wА-я](?:[_\w\dА-я]*)$/))
    {
        DoMessageBox("Имя метода должно быть правильным идентификатором!");
        return;
    }

    this.form.Close(true);
}

RenameVariableRefactoring.prototype.BtVarCancelClick = function (Control) {
    this.form.Close(false);
}

RenameVariableRefactoring.prototype.NameОкончаниеВводаТекста = function (Элемент, Текст, Значение, СтандартнаяОбработка){
	return
    if (!Текст.val.match(/^[_\wА-я](?:[_\w\dА-я]*)$/))
    {
        DoMessageBox("Имя метода должно быть правильным идентификатором!");
        return;
    }
    Элемент.val.Значение = Текст.val;
    this.form.Close(true);
}

function getRegExpVar(curVar)
{
		curVar.replace(/\\/g, "\\");
		curVar.replace(/\./g, "\.");
		curVar.replace(/\(/g, "\(");
		curVar.replace(/\)/g, "\)");
		curVar.replace(/\+/g, "\+");
		curVar.replace(/\*/g, "\*");
		curVar.replace(/\?/g, "\?");
		curVar.replace(/\^/g, "\^");
		curVar.replace(/\[/g, "\[");
		curVar.replace(/\]/g, "\]");

	try{return new RegExp("[\\,(\\[\\s=\\+\\-\\/\\*]" + curVar + "(?![\\wА-Яа-я\"])", 'ig')}
	catch(e){return new RegExp("NEVERFIND", '')}
}

RenameVariableRefactoring.prototype.renameVariable = function(source) {

    var tw = this.module.textWindow;
    var sel = tw.GetSelection();


	moduleVars = this.module.context.ModuleVars;
	isModuleVar = false;
	for(i=0;i<moduleVars.length;i++)
	{
		mVar = moduleVars[i];
		if(mVar == source)
		{
			isModuleVar = true;
			StartLine = 0;
			break;
		}
	}
	if (isModuleVar)
		Lines = tw.GetLines();
	else
	{
		Method = this.module.getActiveLineMethod();
		Lines = tw.GetLines(Method.StartLine, Method.EndLine);
		StartLine = Method.StartLine - 1;
	}

	var re = getRegExpVar(source)
	for(i=0;i<Lines.length;i++)
	{
		line = Lines[i];

			if(!line || line.match(/(^\s*[\|"\|])|(^\s*\/\/)/))
				continue
			while((Matches = re.exec(line)) != null)
				{
				line = line.substr(0,Matches.index + 1) + this.form.Name + line.substring(Matches.lastIndex);
				tw.ReplaceLine(StartLine+i+1, line);
				}

	}
	//Заменим текст на переменную
    tw.SetSelection(sel.beginRow, sel.beginCol, sel.endRow, sel.beginCol + this.form.Name.length);
}


////////////////////////////////////////////////////////////////////////////////////////
////{ ExtractVariableRefactoring
////
function ExtractVariableRefactoring(module) {
    this.module = module;
    this.form = loadFormForScript(SelfScript, 'ExtractVariableForm', this);
    this.ReturnValue = this.form.Name;
}

ExtractVariableRefactoring.prototype.refactor = function (selectedText) {

    var sel = this.module.textWindow.GetSelection();

    if (this.form.DoModal())
        this.extractVariable(selectedText);
}

ExtractVariableRefactoring.prototype.BtVarOKClick = function (Control) {

    if (!this.form.Name.match(/^[_\wА-я](?:[_\w\dА-я]*)$/))
    {
        DoMessageBox("Имя метода должно быть правильным идентификатором!");
        return;
    }

    this.form.Close(true);
}

ExtractVariableRefactoring.prototype.BtVarCancelClick = function (Control) {
    this.form.Close(false);
}

ExtractVariableRefactoring.prototype.NameОкончаниеВводаТекста = function (Элемент, Текст, Значение, СтандартнаяОбработка){
    /*
    if (!Текст.val.match(/^[_\wА-я](?:[_\w\dА-я]*)$/))
    {
        DoMessageBox("Имя метода должно быть правильным идентификатором!");
        return;
    }
    Элемент.val.Значение = Текст.val;
    this.form.Close(true);
    */
}

ExtractVariableRefactoring.prototype.extractVariable = function(source) {

    var tw = this.module.textWindow;
    var sel = tw.GetSelection();

	//Заменим текст на переменную
    tw.SetSelection(sel.beginRow, sel.beginCol, sel.endRow, sel.endCol);
    tw.SetSelectedText(this.form.Name);

	//Добавим определение переменной строкой выше
	var srcIndent = StringUtils.getIndent(tw.GetLine(sel.beginRow));
	tw.InsertLine(sel.beginRow, srcIndent + this.form.Name + " = " + source + ";");
}

////////////////////////////////////////////////////////////////////////////////////////
////{ ExtractMethodRefactoring
////

function ExtractMethodRefactoring(module) {
    this.module = module;
    this.form = loadFormForScript(SelfScript, 'ExtractMethodForm', this);
    this.Params = this.form.Params;
    this.ReturnValue = this.form.ReturnValue;
    this.SignaturePreview = this.form.SignaturePreview;
}

ExtractMethodRefactoring.prototype.getVarRe = function (varName) {
    return new RegExp("([^\\w\\dА-я\.]|^)" + varName.replace(/[\(\)\+\*\?\{\}\[\]]/g, "\\$&") + "([^\\w\\dА-я]|$)", 'i');
}

function GetProcVars(selectedText){

	var VarArr = [];
	var VarArr1 = [];
	re = new RegExp('\\((\\D.*)\\)', 'ig');
	while((Matches = re.exec(selectedText)) != null) {
		str1 = ""+Matches[1];
		if(!str1)
			continue
		VarArr1 = str1.split(',');
		for(i=0;i<VarArr1.length;i++)
			VarArr.push(VarArr1[i])
	}

	re = new RegExp('\\[(\\D.*)\\]', 'ig');
	while((Matches = re.exec(selectedText)) != null) {
		str1 = ""+Matches[1];
		if(!str1)
			continue
		VarArr.push(str1);

	}

	return VarArr;

}

ExtractMethodRefactoring.prototype.refactor = function (selectedText) {

    var sel = this.module.textWindow.GetSelection();

	//debugger
    // 0. Определить переменные внутри выделенного блока кода (распарсить его).
    var extContext = this.getCodeContext(selectedText);
    var extVars = extContext.AutomaticVars;

    // 1. Определить локальные переменные части кода метода выше выделяемого кода.
    // 2. Определить параметры метода, из которого выделяется код.
    var curMethod = this.module.getActiveLineMethod();

    var codeBefore = this.module.textWindow.Range(curMethod.StartLine, 1, sel.beginRow-1).GetText();
    var contextBefore = this.getCodeContext(codeBefore);

    // 3. Определить, какие 1+2 инициализируются в 0 (AutomaticVars), а какие используются
    this.fillParams(contextBefore.AutomaticVars, extVars, selectedText);
    this.fillParams(curMethod.Params, extVars, selectedText);

    //4. Добавим переменные, которые нашли внутри скобок () и []
	procVars = GetProcVars(selectedText);
	this.fillParams(procVars, extVars, selectedText);

    // 5. Те переменные, которые используются в остальной части кода - возвращаемые значения.
	if(sel.endRow < curMethod.EndLine){
		var codeAfter = this.module.textWindow.Range(sel.endRow + 1, 1, curMethod.EndLine).GetText();
		var contextAfter = this.getCodeContext(codeAfter);

		this.fillReturnValues(contextAfter.AutomaticVars, extVars, codeAfter);
     }

    if (this.form.DoModal())
        this.extractMethod(selectedText);
}

ExtractMethodRefactoring.prototype.fillParams = function (extArgs, extVars, source) {
    for (var i=0; i<extArgs.length; i++)
    {
        var varName = extArgs[i];
        var re = this.getVarRe(varName);
        if (re.test(source) && extVars.indexOf(varName) == -1)
            this.addParam(varName, true, false);
    }
}

ExtractMethodRefactoring.prototype.fillReturnValues = function (extArgs, extVars, source) {
    //debugger;
    for (var i=0; i<extVars.length; i++)
    {
        var varName = extVars[i];
        var re = this.getVarRe(varName);
        if (re.test(source) && extArgs.indexOf(varName) == -1)
            this.addReturnValue(varName);
    }
}

ExtractMethodRefactoring.prototype.getCodeContext = function (code) {
    var extractedCode = "Процедура ВыделенныйМетод()\n" + code + "\nКонецПроцедуры";
    var extractedContext = SyntaxAnalysis.AnalyseModule(extractedCode, false);
    return extractedContext.getMethodByName("ВыделенныйМетод");
}

ExtractMethodRefactoring.prototype.addParam = function (paramName, isParam, isVal) {
    if (!this.Params.Find(paramName, 'Name'))
    {
        var paramRow = this.Params.Add();
        paramRow.Name = paramName;
        paramRow.isParam = isParam ? true : false;
        paramRow.isVal = isVal ? true : false;
    }
}

ExtractMethodRefactoring.prototype.addReturnValue = function (varName) {
    if (!this.ReturnValue.Find(varName, 'Name'))
    {
        var row = this.ReturnValue.Add();
        row.Name = varName;
    }
}

ExtractMethodRefactoring.prototype.BtOKClick = function (Control) {

    if (!this.form.Name.match(/^[_\wА-я](?:[_\w\dА-я]*)$/))
    {
        DoMessageBox("Имя метода должно быть правильным идентификатором!");
        return;
    }

    this.form.Close(true);
}

ExtractMethodRefactoring.prototype.BtCancelClick = function (Control) {
    this.form.Close(false);
}

ExtractMethodRefactoring.prototype.extractMethod = function(source) {

    var tw = this.module.textWindow;
    var sel = tw.GetSelection();

    var params = new Array;
    for (var i=0; i<this.Params.Count(); i++)
    {
        var paramRow = this.Params.Get(i);
        if (paramRow.IsParam)
            params.push((paramRow.IsVal ? 'Знач ' : '') + paramRow.Name);
    }

    // Откорректируем отступ.
    var srcIndent = StringUtils.getIndent(source);
    source = StringUtils.shiftLeft(source, srcIndent);
    source = StringUtils.shiftRight(source, "\t");

    // Сформируем исходный код определения выделенного метода.
    var newMethod = this.form.IsProc ? 'Процедура' : 'Функция';
    newMethod += ' ' + this.form.Name + '(' + params.join(', ') + ')';
    if (this.form.Exported)
        newMethod += " Экспорт";

    newMethod += "\n\n" + this.prepareSource(source) + "\n\n";

    if (this.form.IsProc)
    {
        newMethod += 'КонецПроцедуры';

    }
    else
    {
        var retVal = "Неопределено";
        if (this.ReturnValue.Count() > 0) {
            retVal = this.ReturnValue.Get(0).Name;
        }
        newMethod += "\tВозврат " + retVal + ";";
        newMethod += "\n\n" + 'КонецФункции';
    }

    // Получим метод, внутри которого мы находимся.
    var curMethod = this.module.getActiveLineMethod();

    // Добавим в модуль определение выделенного метода.
    tw.InsertLine(curMethod.EndLine + 2, "\n" + newMethod);

    // Заменим выделенный код на вызов нового метода.
    var methCall = this.form.Name + '(' + params.join(', ').replace(new RegExp("Знач ",'g'),"") + ");\n";


    if (!this.form.IsProc && this.ReturnValue.Count() > 0) {
        retVal = this.ReturnValue.Get(0).Name;
        methCall = retVal + ' = ' + methCall;
    }

    tw.SetSelection(sel.beginRow, sel.beginCol, sel.endRow, sel.endCol);
    tw.SetSelectedText(srcIndent + methCall);
}

ExtractMethodRefactoring.prototype.prepareSource = function(source) {

    var lines = StringUtils.toLines(source);
    if (lines.length < 2)
        return source;

    var startIndex = 0;
    while (startIndex < lines.length && lines[startIndex].match(/^\s*$/))
        startIndex++;

    var endIndex = lines.length - 1;
    while (endIndex > 0 && lines[endIndex].match(/^\s*$/))
        endIndex--;

    if (startIndex <= endIndex)
        return StringUtils.fromLines(lines.splice(startIndex, endIndex - startIndex + 1));

    return source;
}

////} ExtractMethodRefactoring

////////////////////////////////////////////////////////////////////////////////////////
////{ TextChangesWatcher (Александр Орефков)
////

// Класс для отслеживания изменения текста в поле ввода, для замены
// события АвтоПодборТекста. Штатное событие плохо тем, что не возникает
// - при установке пустого текста
// - при изменении текста путем вставки/вырезания из/в буфера обмена
// - при отмене редактирования (Ctrl+Z)
// не позволяет регулировать задержку
// Параметры конструктора
// field - элемент управления поле ввода, чье изменение хотим отслеживать
// ticks - величина задержки после ввода текста в десятых секунды (т.е. 3 - 300 мсек)
// invoker - функция обратного вызова, вызывается после окончания изменения текста,
//  новый текст передается параметром функции
function TextChangesWatcher(field, ticks, invoker)
{
    this.ticks = ticks
    this.invoker = invoker
    this.field = field
}

// Начать отслеживание изменения текста
TextChangesWatcher.prototype.start = function()
{
    this.lastText = this.field.Значение.replace(/^\s*|\s*$/g, '').toLowerCase()
    this.noChangesTicks = 0
    this.timerID = createTimer(100, this, "onTimer")
}
// Остановить отслеживание изменения текста
TextChangesWatcher.prototype.stop = function()
{
    killTimer(this.timerID)
}
// Обработчик события таймера
TextChangesWatcher.prototype.onTimer = function()
{
    // Получим текущий текст из поля ввода
    vbs.var0 = this.field
    vbs.DoExecute("var0.GetTextSelectionBounds var1, var2, var3, var4")
    this.field.УстановитьГраницыВыделения(1, 1, 1, 10000)
    var newText = this.field.ВыделенныйТекст.replace(/^\s*|\s*$/g, '').toLowerCase()
    this.field.УстановитьГраницыВыделения(vbs.var1, vbs.var2, vbs.var3, vbs.var4)
    // Проверим, изменился ли текст по сравению с прошлым разом
    if(newText != this.lastText)
    {
        // изменился, запомним его
        this.lastText = newText
        this.noChangesTicks = 0
    }
    else
    {
        // Текст не изменился. Если мы еще не сигнализировали об этом, то увеличим счетчик тиков
        if(this.noChangesTicks <= this.ticks)
        {
            if(++this.noChangesTicks > this.ticks)  // Достигли заданного количества тиков.
                this.invoker(newText)               // Отрапортуем
        }
    }
}

////
////} TextChangesWatcher (Александр Орефков)
////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////
////{ Вспомогательные функции
////



////} Вспомогательные функции
