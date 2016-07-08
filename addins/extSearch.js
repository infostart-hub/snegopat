//engine: JScript
//uname: ExtendedSearch
//dname: Расширенный поиск
//descr: Реализация удобного и мощного поиска по модулям.
//author: Александр Кунташов <kuntashov@gmail.com>, http://compaud.ru/blog
//www: https://snegopat.ru/scripts/wiki?name=extSearch.js
//help: inplace
//addin: global
//addin: stdcommands
//addin: stdlib
//addin: hotkeys hks

////////////////////////////////////////////////////////////////////////////////////////
////{ Cкрипт "Расширенный поиск" (extSearch.js) для проекта "Снегопат"
////
//// Описание: Реализует поиск текста при помощи регулярных выражений в активном окне редактора.
//// Автор: Александр Кунташов <kuntashov@gmail.com>, http://compaud.ru/blog
////}
////////////////////////////////////////////////////////////////////////////////////////

/*@
Скрипт организует удобный поиск как по текущему модулю, так и глобальный поиск по конфигурации.
Глобальный поиск выполняется в **фоновом режиме!** Вы можете работать, пока он ищет.

Поддерживается поиск с помощью регулярных выражений.
Интегрирован со скриптом "Редактор регулярных выражений".

@*/

stdlib.require('TextWindow.js', SelfScript);
stdlib.require('ScriptForm.js', SelfScript);
global.connectGlobals(SelfScript);

////////////////////////////////////////////////////////////////////////////////////////
////{ Макросы
////

SelfScript.self['macrosНайти текст'] = function() {
    
    var w = GetTextWindow();
    if (!w) return false;
    
    var es = GetExtSearch();
        
    var selText = w.GetSelectedText();
    if (selText == '')
        selText = w.GetWordUnderCursor();
    
    es.setSimpleQuery(selText);    
    es.show();
        
    if (selText == '')
    {
        es.clearSearchResults();
        es.setDefaultSearchQuery();
    }
    else
        es.searchActiveDoc(true);
        
    return true;
}

SelfScript.self['macrosНайти во всех открытых документах'] = function() {
    
    var w = GetTextWindow();
    if (!w) return false;
    
    var es = GetExtSearch();
        
    var selText = w.GetSelectedText();
    if (selText == '')
        selText = w.GetWordUnderCursor();
    
    es.setSimpleQuery(selText);    
    es.show();
        
    if (selText == '')
    {
        es.clearSearchResults();
        es.setDefaultSearchQuery();
    }
    else
        es.searchOpenedWindows(true);
        
    return true;
}

SelfScript.self['macrosГлобальный поиск'] = function() {
    
    var es = GetExtSearchGlobal();

    var w = GetTextWindow();
    if (!w) {
        var selText = '';
    } else {
        var selText = w.GetSelectedText();
        if (selText == '')
            selText = w.GetWordUnderCursor();
    }
    
    es.isGlobalFind = true;
    es.activeView = windows.getActiveView();
    es.isInCurrentMdConteinerFind = false;
    es.setSimpleQuery(selText);    
    es.show();

    if (selText == '')
    {
        es.clearSearchResults();
        es.setDefaultSearchQuery();
    }
    else
        es.searchInMetadata(true);
        
    return true;
}

SelfScript.self['macrosГлобальный поиск по текущему контейнеру'] = function() {
    //Текущий контейнер метаданных определяем по активному окну. 
    //будет открыта внешняя обработка, занчит ищем глобально только по этой обработке. 
    //открыт cf файл или же cf базы данных и мы находимся в текстовом модуле определенной 
    //конфигурации, значит искать будет по текущей контейнеру. 
    
    
    var es = GetExtSearchGlobal();

    
    var w = GetTextWindow();
    if (!w) {
        var selText = '';
    } else {
        var selText = w.GetSelectedText();
        if (selText == '')
            selText = w.GetWordUnderCursor();
    }
    
    
    es.isGlobalFind = true;
    es.activeView = windows.getActiveView();
    es.isInCurrentMdConteinerFind = true;
    es.setSimpleQuery(selText);    
    es.show();

    if (selText == '')
    {
        es.clearSearchResults();
        es.setDefaultSearchQuery();
    }
    else
        es.searchInMetadata(true);
        
    return true;
}

SelfScript.self['macrosГл поиск фильтр по метаданным'] = function() {
    
    var es = GetExtSearchGlobal();
    if (es.isGlobalFind){
        md = stdlib.require(env.pathes.addins + 'mdNavigator.js');
        if (es.filterByUUID){
            es.vtMD = {};
            es.filterByUUID = null;
        }
        es.filterByUUID = md.SelectMdUUID();
    } 
    es.show();

    return true;
}

SelfScript.self['macrosОтменить глобальный поиск'] = function() {
    var es = GetExtSearchGlobal();
    if (es.startGlobalSearch){
        es.startGlobalSearch = false;
    }
}

//// МАКРОСЫ С ПРЕДВАРИТЕЛЬНЫМ ОТКРЫТИЕМ ДИАЛОГА ДЛЯ НАСТРОЙКИ ПАРАМЕТРОВ ПОИСКА

SelfScript.self['macrosНайти текст в текущем модуле (с диалогом)'] = function() {    
	openSearchDialog(SearchAreas.ActiveWindow);	
    return true;
}

SelfScript.self['macrosНайти текст в открытых окнах (с диалогом)'] = function() {    
	openSearchDialog(SearchAreas.AllOpenedWindows);	
    return true;
}

SelfScript.self['macrosГлобальный поиск (с диалогом)'] = function() {    
	openSearchDialog(SearchAreas.Global);	
    return true;
}

//// МАКРОСЫ ДЛЯ УПРАВЛЕНИЯ ОКНОМ РЕЗУЛЬТАТОВ ПОИСКА 

SelfScript.self['macrosОткрыть окно поиска'] = function() {
    debugger
    GetExtSearch().show();
}

SelfScript.self['macrosОткрыть окно глобального поиска'] = function() {
    GetExtSearchGlobal().show();
}

SelfScript.self['macrosЗакрыть окно поиска'] = function() {
    var es = GetExtSearch();
    if (es.isOpen()) {
        es.close();
        return true;
    }
	es = GetExtSearchGlobal();
	if (es.isOpen()) {
		es.close();
		return true;
	}
    return false;
}

SelfScript.self['macrosПерейти к следующему совпадению'] = function() {
    var es = GetExtSearch();
    es.show();
    es.moveRowCursor(true);
}

SelfScript.self['macrosПерейти к предыдущему совпадению'] = function() {
    var es = GetExtSearch();
    es.show();
    es.moveRowCursor(false);
}

SelfScript.self['macrosСвернуть группировки'] = function() {
    var es = GetExtSearch();
    es.expandTree(true);
}

SelfScript.self['macrosРазвернуть группировки'] = function() {
    var es = GetExtSearch();
    es.expandTree(false);
}

/* Возвращает название макроса по умолчанию - вызывается, когда пользователь 
дважды щелкает мышью по названию скрипта в окне Снегопата. */
function getDefaultMacros() {
    return 'Открыть окно поиска';
}

////} Макросы

////////////////////////////////////////////////////////////////////////////////////////
////{ ExtSearch - Расширенный поиск в тексте модуля.
////

var RowTypes = {
    'SearchResult'  : 0, // Строка результата поиска.
    'ProcGroup'     : 1, // Строка группы-процедуры (в режиме группировки по процедурам и функциям).
    'FuncGroup'     : 2, // Строка группы-функции (в режиме группировки по процедурам и функциям).
    'SearchDoc'     : 3  // Строка документа, в котором производится поиск.
}

var RE = {
    METHOD_START : /^\s*((?:procedure)|(?:function)|(?:процедура)|(?:функция))\s+([\wА-яёЁ\d]+)\s*\(/i,
    METHOD_END : /((?:EndProcedure)|(?:EndFunction)|(?:КонецПроцедуры)|(?:КонецФункции))/i
}

var SearchAreas = {
	'ActiveWindow' 		: 0, // В текущем модуле
	'AllOpenedWindows' 	: 1, // Во всех открытых окнах
	'Global'			: 2, // Глобально (во всех модулях основной конфигурации)
	'CurrentContainer'	: 3  // В текущем открытом контейнере (внешней обработке, конфигурации ИБ и т.п.)
};

/* Осуществляет поиск с предварительным открытием диалогового окна. */
function openSearchDialog(initSearchArea) {
	
	if (!initSearchArea)
		initSearchArea = SearchAreas.ActiveWindow;
	
	var w = GetTextWindow();
    if (!w) return false;
            
    var selText = w.GetSelectedText();
    if (selText == '')
        selText = w.GetWordUnderCursor();
		
    var sDlg = new ExtSearchDialog(selText, initSearchArea);
		
	if (sDlg.show(true) == true) 
	{
		var searchQuery = sDlg.getSearchQueryParams();
		
	    if (searchQuery.Query == '')
	    {
			var es = GetExtSearch();
	        es.clearSearchResults();
	        es.setDefaultSearchQuery();
	    }
		else
		{	
			switch(sDlg.getSearchArea()) 
			{
			case SearchAreas.AllOpenedWindows:
				var es = GetExtSearch();
				es.setQuery(searchQuery);
				es.show();
				es.searchOpenedWindows(true);
				break;
				
			case SearchAreas.CurrentContainer:
			    var es = GetExtSearchGlobal();
			    es.isGlobalFind = true;
			    es.activeView = windows.getActiveView();
			    es.isInCurrentMdConteinerFind = true;
				es.setQuery(searchQuery);
			    es.show();
				es.searchInMetadata(true);
				break;
				
			case SearchAreas.Global:
			    var es = GetExtSearchGlobal();
			    es.isGlobalFind = true;
			    es.activeView = windows.getActiveView();
			    es.isInCurrentMdConteinerFind = false;
				es.setQuery(searchQuery);
			    es.show();
				es.searchInMetadata(true);			
				break;
				
			case SearchAreas.ActiveWindow:
			default:
				var es = GetExtSearch();
				es.setQuery(searchQuery);
				es.show();
	        	es.searchActiveDoc(true);
				break;
			}
		}
	}
}

/* Реализует диалог настройки параметров поиска.*/
ExtSearchDialog = ScriptForm.extend({

    settingsRootPath : SelfScript.uniqueName,
    
    settings : {
        pflSnegopat : {
            'IsRegExp'      : false, // Поиск регулярными выражениями.
            'CaseSensetive' : false, // Учитывать регистр при поиске.
            'WholeWords'    : false, // Поиск слова целиком.
            'SearchHistory' : v8New('ValueList'), // История поиска.
            'HistoryDepth'  : 15, // Количество элементов истории поиска.
            'TreeView'      : false // Группировать результаты поиска по методам.            
        }
    },

    construct : function (query, initSearchArea) {	
        this._super(env.pathes.addins + "extSearch.ssf");                
        this.form.КлючСохраненияПоложенияОкна = "extSearch.dialog.js"
        this.loadSettings();
		this.form.Query = query;
		this.form.SearchArea = initSearchArea;		
	},
	
	getSearchQueryParams: function () {
		var params = v8New('Structure');
		params.Insert('Query', 			this.form.Query);
		params.Insert('WholeWords', 	this.form.WholeWords);
		params.Insert('CaseSensetive',	this.form.CaseSensetive);
		params.Insert('IsRegExp', 		this.form.IsRegExp);
		return params;
	},
	
	getSearchArea: function () {
		return this.form.SearchArea;
	},
	
    Form_OnClose : function () {
        this.saveSettings();
    },
	
    Query_StartListChoice : function (control, defaultHandler) {
        control.val.ChoiceList = this.form.SearchHistory;
    },
	
	btFind_Click: function (btn) {
		this.close(true);
	},
	
	btCancel_Click: function (btn) {
		this.close(false);
	},
	
    IsRegExp_OnChange : function(Элемент) {
        if (this.form.IsRegExp)
            this.form.WholeWords = false;
    },

    WholeWords_OnChange : function(Элемент) {
        if (this.form.WholeWords)
            this.form.IsRegExp = false;
    }
}); // end of ExtSearchDialog

ExtSearch = ScriptForm.extend({

    settingsRootPath : SelfScript.uniqueName,
    
    settings : {
        pflSnegopat : {
            'IsRegExp'      : false, // Поиск регулярными выражениями.
            'CaseSensetive' : false, // Учитывать регистр при поиске.
            'WholeWords'    : false, // Поиск слова целиком.
            'SearchHistory' : v8New('ValueList'), // История поиска.
            'HistoryDepth'  : 15, // Количество элементов истории поиска.
            'TreeView'      : false // Группировать результаты поиска по методам.            
        }
    },

    construct : function (isExtend) {
        
        if (isExtend == undefined) isExtend = false;
        this._super(env.pathes.addins + "extSearch.results.ssf");
                
        this.form.КлючСохраненияПоложенияОкна = "extSearch.js"
        this.results = this.form.Controls.SearchResults.Value;
        this.results.Columns.Add('_method');
        this.results.Columns.Add('groupsCache');
        this.results.Columns.Add('_object');
        this.results.Columns.Add('_match');
        this.results.Columns.Add('SortMetadata');
        
        this.watcher = new TextWindowsWatcher();
        this.watcher.startWatch();
          
        this.loadSettings();
        
        this.targetWindow = null;
        
        this.Icons = {
            'Func': this.form.Controls.PicFunc.Picture,
            'Proc': this.form.Controls.PicProc.Picture
        }
        
        this.SearchDocRowFont = v8New('Font', undefined, undefined, true);
        this.isGlobalFind = false;
        
        this.SetControlsVisible();
        if (!isExtend) ExtSearch._instance = this;
    
    },
    
    setSimpleQuery : function (query) {
        this.form.Query = query;
        this.form.IsRegExp = false;
        this.form.CaseSensetive = false;
        this.addToHistory(query);
    },
	
	setQuery : function (searchQueryParams) {
        this.form.Query 		= searchQueryParams.Query;
        this.form.IsRegExp 		= searchQueryParams.IsRegExp;
        this.form.CaseSensetive = searchQueryParams.CaseSensetive;
		this.form.WholeWords	= searchQueryParams.WholeWords;
        this.addToHistory(this.form.Query);
    },

    expandTree : function (collapse) {
        var tree = this.form.Controls.SearchResults;
        for (var i=0; i < this.results.Rows.Count(); i++)
        {        
            var docRow = this.results.Rows.Get(i);
            if (this.form.TreeView)
            {
                for (var j=0; j < docRow.Rows.Count(); j++)
                {
                    var row = docRow.Rows.Get(j);
                    collapse ? tree.Collapse(row) : tree.Expand(row, true);
                }
            }
            else
            {
                collapse ? tree.Collapse(docRow) : tree.Expand(docRow, true);            
            }
        }
    },
        
    getWindowObject : function (view) {
       
        if (view.mdObj && view.mdProp) 
            return new MdObject(view.mdObj, view.mdProp, view.title);
            
        var obj = view.getObject();
        if (obj && toV8Value(obj).typeName(0) == 'TextDocument')
            return new TextDocObject(obj, view.title);        
            
        if (obj) Message('Неподдерживаемый тип объекта для поиска: ' + toV8Value(obj).typeName(0));
        
        return null;
    },
    
    searchOpenedWindows: function (fromHotKey) {

        var activeWindow = this.watcher.getActiveTextWindow();
        if (!activeWindow) return;
        
        var activeView = activeWindow.GetView();
        if (!activeView) return;

        this.clearSearchResults();
                     
        this.re = this.buildSearchRegExpObject();
        if (!this.re) return;
        
        var activeWndResRow = null;
        
        var es = this;
        (function (views) {        
            for(var i = 0; i < views.count; i++) 
            {
                var v = views.item(i);
                if(v.isContainer != vctNo)
                {
                    // Если окно - контейнер, то обходим рекурсивно его потомков.
                    arguments.callee(v.enumChilds());
                    continue;
                }
                                
                var obj = es.getWindowObject(v);
                if (!obj) continue;
                
                var docRow = es.search(obj, es.re);
                if (v == activeView)
                    activeWndResRow = docRow;
            }
        })(windows.mdiView.enumChilds());
        
        this.showSearchResult(activeWndResRow, fromHotKey);
    },

    searchActiveDoc : function (fromHotKey) {
        
        this.clearSearchResults();
        
        var activeWindow = this.watcher.getActiveTextWindow();
        if (!activeWindow) return;
             
        this.re = this.buildSearchRegExpObject();
        if (!this.re) return;

        var obj = this.getWindowObject(activeWindow.GetView());
        if (!obj) return;
        
        var docRow = this.search(obj, this.re);
        
        this.showSearchResult(docRow, fromHotKey);
    },

    buildSearchRegExpObject : function () {
    
        var pattern = this.form.Query;
        var reFlags = '';
        
        if (!this.form.IsRegExp) 
        {
            pattern = StringUtils.addSlashes(pattern);
            
            if (this.form.WholeWords)
                pattern = "([^\\w\\dА-я]|^)" + pattern + "([^\\w\\dА-я]|$)";
        }
        else
        {
            if(pattern.replace("\\\\", "").search(/\\r|\\n/) != -1)
                reFlags = 'gm';
        }
        if(!this.form.CaseSensetive)
            reFlags += 'i';
        
        var re = null;
        
        try 
        {
            re = new RegExp(pattern, reFlags);
        }
        catch (e)
        {
            DoMessageBox("В регулярном выражении допущена ошибка: \n" + e.message);
            return null;
        }
    
        return re;
    },
    
    search : function (obj, re) {
          
        var docRow = this.results.Rows.Add();
        docRow.FoundLine = obj.getTitle();
        docRow._object = obj;
        docRow.RowType = RowTypes.SearchDoc;
        if (!obj.sort) obj.sort = 999;
        var strSort = "0000000000"+(obj.sort + this.results.Rows.Count());
        strSort = strSort.substr(strSort.length-10);
        docRow.SortMetadata = strSort;

        docRow.groupsCache = v8New('Map');
        if(!re.multiline)
        {
            var curMethod = { 
                'Name'      : 'Раздел описания переменных',
                'IsProc'    : undefined,
                'StartLine' : 0
            }
                                    
            var lines = StringUtils.toLines(obj.getText());
            for(var lineIx=0; lineIx < lines.length; lineIx++)
            {
                var line = lines[lineIx];
                
                // Проверим, не встретилось ли начало метода.
                var matches = line.match(RE.METHOD_START);
                if (matches && matches.length)
                {
                    curMethod = {
                        'Name'      : matches[2],
                        'IsProc'    : matches[1].toLowerCase() == 'процедура' || matches[1].toLowerCase() == 'procedure',
                        'StartLine' : lineIx
                    }
                }
                
                matches = line.match(re);
                if (matches && matches.length)
                    this.addSearchResult(docRow, line, lineIx + 1, matches, curMethod);
                   
                // Проверим, не встретился ли конец метода.
                matches = line.match(RE.METHOD_END);
                if (matches && matches.length)
                {
                    curMethod = {
                        'Name'      : '<Текст вне процедур и функций>',
                        'IsProc'    : undefined,
                        'StartLine' : lineIx
                    }
                }
            }    
        }
        else
        {
            //debugger
            // Это многострочный поиск
            // Для начала надо вообще проверить, находится ли что-нибудь
            var text = obj.getText()
            var results = [], r
            while(r = re.exec(text))
                results.push(r)
            if(results.length)  // Что-то нашли. Теперь надо получить номера строк для каждого вхождения
            {
                this.form.TreeView = false;
                var idx = 0, lineNum = 0, currentRes = results[idx], beginIdx = currentRes.index
                // Для исключение ситуации, когда текст найден в последней строке, не заканчивающейся переводом строки,
                // добавим к тексту перевод строки
                text += '\n';
                re = /.*\n/g
                while(r = re.exec(text))
                {
                    lineNum++
                    if(r.index <= beginIdx && r.lastIndex > beginIdx)
                    {
                        currentRes.index -= r.index
                        currentRes.lastIndex -= r.index
                        // Для отображения результата многострочного поиска преобразуем строку
                        currentRes.realResult = currentRes[0]
                        currentRes[0] = currentRes[0].replace(/^\s+/, '').replace(/\n\s*/g, ' \u00BB ').substr(0, 50) + '\n'
                        this.addSearchResult(docRow, r[0], lineNum, results[idx]);
                        idx++;
                        if(idx == results.length)
                            break;
                        currentRes = results[idx]
                        beginIdx = currentRes.index
                    }
                }
            }
        }
        
        if (this.form.TreeView && docRow.Rows.Count() > 0)
        {
            var lastGroup = this.results.Rows.Get(this.results.Rows.Count() - 1);
            if (lastGroup.FoundLine == '<Текст вне процедур и функций>')
                lastGroup.FoundLine = "Раздел основной программы";
        }
        
        if (!docRow.Rows.Count())
        {
            this.results.Rows.Delete(docRow);
            docRow = null;
        }
        
        return docRow;
    },

    showResult: function(docRow, fromHotKey){
        this.results.Rows.Sort('SortMetadata, FoundLine', false);
        // Запомним строку поиска в истории.
        this.addToHistory(this.form.Query);

        if (fromHotKey == true)
        { 
            // Для того чтобы курсор не прыгал при поиске текущего слова, 
            // тут бы еще добавить чтобы активизировалась именно текущая строка
            this.form.Open();
            this.form.CurrentControl=this.form.Controls.SearchResults;
            if (docRow) 
            {
                var curLineRow = this.getRowForTheCurrentLine(docRow);  
                if (curLineRow)
                    this.form.Controls.SearchResults.CurrentRow = curLineRow;            
            }
        }
        else if (docRow)
        {
            if (this.form.TreeView)
                this.goToLine(docRow.Rows.Get(0).Rows.Get(0));
            else
                this.goToLine(docRow.Rows.Get(0));        
        }

    },
    
    showSearchResult: function (docRow, fromHotKey) {
        
        this.showResult(docRow, fromHotKey);
        this.expandTree();
        
        if (this.results.Rows.Count() == 0) 
        {
            DoMessageBox('Совпадений не найдено!');
            return;
        }

        this.SetControlsVisible();    
    },
    
    getRowForTheCurrentLine: function(docRow) {
        var twnd = docRow._object.activate();
        return docRow.Rows.Find(twnd.GetCaretPos().beginRow, "LineNo", true);
    },

    getGroupRow: function (docRow, methodData) {

        if (!this.form.TreeView || this.re.multiline)
            return docRow;

        var groupRow = docRow.groupsCache.Get(methodData);
        if (!groupRow) 
        {
            groupRow = docRow.Rows.Add();
            groupRow.FoundLine = (!methodData.Name)?"":methodData.Name;
            groupRow.Method = (!methodData.Name)?"":methodData.Name;
            groupRow._object = docRow._object;
            
            if (methodData.IsProc !== undefined)
                groupRow.RowType = methodData.IsProc ? RowTypes.ProcGroup : RowTypes.FuncGroup;
                
            groupRow.lineNo = methodData.StartLine + 1;
            groupRow._method = methodData;
            groupRow.SortMetadata = methodData.SortMetadata;
            
            docRow.groupsCache.Insert(methodData, groupRow); 
        }
        return groupRow;
    },
    
    addSearchResult : function (docRow, line, lineNo, matches, methodData) {

        var groupRow = this.getGroupRow(docRow, methodData);

        var resRow = groupRow.Rows.Add();
        resRow.FoundLine = line;
        resRow.lineNo = lineNo;
        resRow._object = docRow._object;
        if(undefined != methodData)
            resRow.Method = methodData.Name;

        resRow._method = methodData;
        resRow._match = matches
            
        if (this.form.WholeWords)
            resRow.ExactMatch = matches[0].replace(/^[^\w\dА-я]/, '').replace(/[^\w\dА-я]$/, '');
        else
            resRow.ExactMatch = matches[0];
    },
    
    goToLine : function (row) {

        this.form.Controls.SearchResults.CurrentRow = row;    

        // Откроем и/или активируем окно объекта, в котором выполнялся поиск.
        var targetWindow = row._object.activate();
     
        if (!targetWindow.IsActive())
        {
            DoMessageBox("Окно, для которого выполнялся поиск, было закрыто!\nОкно поиска с результатами стало не актуально и будет закрыто.");
            this.clearSearchResults();
            this.Close();
            return;
        }
     
        // Найдем позицию найденного слова в строке.
        //debugger
        var lineStart = row.LineNo, colStart, lineEnd = lineStart, colEnd
        if(row.ExactMatch.substr(row.ExactMatch.length - 1) == '\n')
        {
            // результат многострочного поиска
            var text = row._match.realResult
            colStart = row._match.index + 1
            colEnd = colStart
            for(var k = 0; k < text.length; k++)
            {
                if(text.charAt(k) == '\n')
                {
                    lineEnd++
                    colEnd = 1;
                }
                else
                    colEnd++
            }
        }
        else
        {
            var searchPattern = this.form.WholeWords ? "(?:[^\\w\\dА-я]|^)" + row.ExactMatch + "([^\\w\\dА-я]|$)" : StringUtils.addSlashes(row.ExactMatch); 
            var re = new RegExp(searchPattern, 'g');
            var matches = re.exec(row.FoundLine);

            colStart = 1;
            if (matches) 
            {        
                colStart = re.lastIndex - row.ExactMatch.length + 1;
                
                if (this.form.WholeWords && matches.length > 1)        
                    colStart -= matches[1].length; 
            }
            colEnd = colStart + row.ExactMatch.length
        }
        
        // Установим выделение на найденное совпадение со строкой поиска.
        targetWindow.SetCaretPos(lineStart, colEnd);
        targetWindow.SetSelection(lineStart, colStart, lineEnd, colEnd);
    },

    moveRowCursor : function (forward) {
        
        if (!this.results.Rows.Count())
            return;
                          
        var row = this.form.Controls.SearchResults.CurrentRow;
        
        if (!row)
        {
            row = this.results.Rows.Get(0).Get(0);
            if (this.form.TreeView)
                row = row.Rows.Get(0);
                
            this.goToLine(row);    
            return;
        }
        
        if (forward) 
        {
            if (row.RowType == RowTypes.SearchResult)
            {    
                while (row)
                {
                    var rows = row.Parent ? row.Parent.Rows : this.results.Rows;
                    var index = rows.IndexOf(row);
            
                    if (index < rows.Count() - 1)
                    {
                        row = rows.Get(index + 1);
                        break;
                    }
                    
                    if (!row.Parent)
                        break;
                   
                    row = row.Parent;                    
                 }
            }
            
            while (row.Rows.Count() > 0)
                row = row.Rows.Get(0);                        
        }
        else
        {   
            if (row.RowType == RowTypes.SearchResult)
            {    
                while (row) 
                {
                    var rows = row.Parent ? row.Parent.Rows : this.results.Rows;
                    var index = rows.IndexOf(row);
            
                    if (index > 0)
                    {
                        row = rows.Get(index - 1);
                        break;
                    }
                    
                    if (!row.Parent)
                        break;
                    
                    row = row.Parent;                    
                 }
            }
            
            while (row.Rows.Count() > 0)
                row = row.Rows.Get(row.Rows.Count() - 1);                        
        }
        
        this.goToLine(row);
    },
    
    clearSearchResults : function () {
        this.results.Rows.Clear();
    },
    
    setDefaultSearchQuery : function () {
        this.form.CurrentControl=this.form.Controls.Query;
    },
    
    addToHistory : function (query) {
        
        if (!query) 
            return;
        
        // Добавляем в историю только если такой поисковой строки там нет.
        var history = this.form.SearchHistory;
        if (history.FindByValue(query))
            return;
            
        if (history.Count())
            history.Insert(0, query);
        else
            history.Add(query);
           
        // Не позволяем истории расти более заданной глубины.
        while (history.Count() > this.form.HistoryDepth)
            history.Delete(history.Count() - 1);
    },
    
    getRegExpEditorScriptPath : function () {
        var mainFolder = profileRoot.getValue("Snegopat/MainFolder");
        var scriptPath = mainFolder + "scripts\\RegExpEditor.js";
        var f = v8New('File', scriptPath);
        if (f.Exist())
            return scriptPath;
        return '';
    },
    
    Form_OnOpen : function () {   
        if (!this.getRegExpEditorScriptPath())
            this.form.Controls.Query.ChoiceButton = false;
        
        this.SetControlsVisible();
    },

    Form_OnClose : function () {
        this.saveSettings();
    },

    CmdBar_BtPrev : function (control) {
        this.moveRowCursor(false);
    },

    CmdBar_BtNext : function (control) {
        this.moveRowCursor(true);
    },
    
    Query_OnChange : function (control) {
        if (this.form.Query != '')
                this.searchActiveDoc();
    },

    Query_StartListChoice : function (control, defaultHandler) {
        control.val.ChoiceList = this.form.SearchHistory;
    },

    BtSearch_Click : function (control) {

        if (this.form.Query == '')
        {
            DoMessageBox('Не задана строка поиска');
            return;
        }
        
        this.searchActiveDoc();
    },

    CmdBarOptions_BtAbout : function (control) {
        RunApp('http://snegopat.ru/scripts/wiki?name=extSearch.js');
    },

    SearchResults_Selection : function (control, selectedRow, selectedCol, defaultHandler) {
        this.goToLine(selectedRow.val);
        defaultHandler.val = false; // Это для того чтобы после нажатия на строку курсор не уходит с табличного поля, и при новой активизации формы можно было курсором посмотреть другие значения
    },
    
    beforeExitApp : function () {
        this.watcher.stopWatch();
    },

    IsRegExp_OnChange : function(Элемент) {
        if (this.form.IsRegExp)
            this.form.WholeWords = false;

        this.SetControlsVisible()
    },

    WholeWords_OnChange : function(Элемент) {
        if (this.form.WholeWords)
            this.form.IsRegExp = false;

        this.SetControlsVisible();
    },
    
    Query_StartChoice : function (Control, DefaultHandler) {
        var reEditorPath = this.getRegExpEditorScriptPath();
        if (reEditorPath)
        {
            DefaultHandler.val = false;
            reEditorAddin = stdlib.require(reEditorPath);
            if (reEditorAddin)
            {
                this.form.IsRegExp = true;
                var reEditor = reEditorAddin.CreateRegExpEditor();
                reEditor.open(Control.val);
            }        
        }
    },
    
    SearchResults_OnRowOutput : function (Control, RowAppearance, RowData) {
        
        var cell = RowAppearance.val.Cells.FoundLine;
        
        switch (RowData.val.RowType)
        {
        case RowTypes.FuncGroup:
            cell.SetPicture(this.Icons.Func);
            break;
        
        case RowTypes.ProcGroup:
            cell.SetPicture(this.Icons.Proc);
            break;

        case RowTypes.SearchDoc:
            RowAppearance.val.Cells.LineNo.SetText('');
            RowAppearance.val.Font = this.SearchDocRowFont;
            RowAppearance.val.TextColor = WebColors.DarkBlue;
            break;
            
        default:
            break;
        }
        
        if (RowData.val._method && RowData.val._method.IsProc !== undefined)
            RowAppearance.val.Cells.Method.SetPicture(RowData.val._method.IsProc ? this.Icons.Proc : this.Icons.Func);
        
    },
    
    switchView : function (setTreeView) {
        
        var results = this.results.Copy();
        
        this.clearSearchResults();
        
        for (var docRowIx = 0; docRowIx < results.Rows.Count(); docRowIx++)
        {
            var oldDocRow = results.Rows.Get(docRowIx);
            var docRow = this.results.Rows.Add();
            FillPropertyValues(docRow, oldDocRow);
            docRow.groupsCache = v8New('Map');
            
            if (setTreeView)
            {
                for (var i=0; i<oldDocRow.Rows.Count(); i++)
                {
                    var row = oldDocRow.Rows.Get(i);
                    var groupRow = this.getGroupRow(docRow, row._method);
                    var resRow = groupRow.Rows.Add();
                    FillPropertyValues(resRow, row);
                }
            }
            else
            {
                for (var i=0; i<oldDocRow.Rows.Count(); i++)
                {
                    var groupRow = oldDocRow.Rows.Get(i);
                    for (var j=0; j<groupRow.Rows.Count(); j++)
                    {
                        var row = groupRow.Rows.Get(j);
                        var resRow = docRow.Rows.Add();
                        FillPropertyValues(resRow, row);
                    }
                }
            }    
        }
        this.expandTree();        
        this.SetControlsVisible();
    },
    
    CmdBar_TreeView : function (Button) {
        this.form.TreeView = !this.form.TreeView;
        Button.val.Check = this.form.TreeView;
        //this.form.Controls.SearchResults.Columns.FoundLine.ShowHierarchy = this.form.TreeView;
        this.switchView(this.form.TreeView);
    },
    
    CmdBar_ExpandAll : function (Button) {
        this.expandTree(false);
    },
    
    CmdBar_CollapseAll : function (Button) {
        this.expandTree(true);
    },

    SetControlsVisible : function() {
        
        var ctr = this.form.Controls;
        //ctr.SearchResults.Columns.FoundLine.ShowHierarchy = this.form.TreeView;    
        ctr.CmdBar.Buttons.TreeView.Check = this.form.TreeView;
        this.form.Controls.SearchResults.Columns.Method.Visible = !this.form.TreeView;
        this.form.Controls.SearchResults.Columns.ExactMatch.Visible = this.form.IsRegExp;

        var buttons = this.form.Controls.CmdBar.Buttons;
        buttons.ExpandAll.Enabled = this.form.TreeView;
        buttons.Actions.Buttons.ExpandAll.Enabled = this.form.TreeView;
        buttons.CollapseAll.Enabled = this.form.TreeView;
        buttons.Actions.Buttons.CollapseAll.Enabled = this.form.TreeView;

        this.form.caption = "Расширенный поиск в модуле";
    }
  
}); // end of ExtSearch class

ExtSearchGlobal = ExtSearch.extend({

    settingsRootPath : SelfScript.uniqueName+"Global", // тест, пускай у нас и настройки будут глобальными. 
    
    settings : {
        pflSnegopat : {
            'IsRegExp'      : false, // Поиск регулярными выражениями.
            'CaseSensetive' : false, // Учитывать регистр при поиске.
            'WholeWords'    : false, // Поиск слова целиком.
            'SearchHistory' : v8New('ValueList'), // История поиска.
            'HistoryDepth'  : 15, // Количество элементов истории поиска.
            'TreeView'      : false // Группировать результаты поиска по методам.            
        }
    },

    construct : function () {
    
        this._super(true);

        this._instance = null;

        this.form.КлючСохраненияПоложенияОкна = "extGlobalSearch.js";

        this.isGlobalFind = true;
        //TODO: признак автомтически назначаемого хоткей, если уже назначен на отмену поиска, автоматом не будет назначаться. 
        this.dynamicHotKey = true; 
        for(var i = 0; i < hotkeys.count; i++)
        {
            var hk = hotkeys.item(i);
            Команда = hk.addin + "::" + hk.macros
            if (Команда.indexOf("ExtendedSearch::Отменить глобальный поиск")!=-1){
                this.dynamicHotKey = false;
                break;
            }
        }
        
        this.expandetRows = {};
        
        this.SetControlsVisible();
        //FIXME: вынести в настройку. 
        this.countRowsInIdleSearch = 25; //Количество объектов поиска в фоне(для слабеньких машин ставим меньше, для формула1 - как удобней)
        this.re = new RegExp(/(([а-яa-z0-9]{1,})\s[а-яa-z0-9]{1,})(\.|\:)/i);
            
        this.filterByUUID = null;

        ExtSearchGlobal._instance = this;
    },

    searchByUuid: function(row, sort) {
        mdObj = findMdObj(this.currentMdContainer, row.UUID);
        if (sort == undefined) sort = 999;
        var docRow = null;
        if (mdObj){
            var obj = this.getWindowObject({
                                mdObj:mdObj,
                                mdProp:row.mdProp,
                                title:row.title});
            obj.sort = sort+1;
            docRow = this.search(obj, this.re);
        }
        return docRow;
    },
    
    searchInMetadata : function(fromHotKey){

        var md = null;
        var objTitle = "";
        var activeWindow = this.watcher.getActiveTextWindow();
        if (!activeWindow) { 
        } else {
            var activeView = activeWindow.GetView();
            var obj = this.getWindowObject(activeView);
            if (obj!=null){
                objTitle = obj.getTitle();
                var matches = this.re.exec(objTitle);
                if (matches!=null){
                    objTitle = matches[1];
                } else {
                    if (objTitle.indexOf(":")!=-1){
                        objTitle = objTitle.substr(0, objTitle.indexOf(":"));
                    }
                }
            }
        }

        md = this.getCurrentMd();
        if (!md) return;

        this.currentMdContainer = md;
        this.clearSearchResults();
        this.re = this.buildSearchRegExpObject();
        if (!this.re) return;
        
        this.curCaption = windows.caption; //а вдруг, еще кто-то не пользуется configCaption... 
        
        this.startGlobalSearch = true;
        if (!this.vtMD){
            this.vtMD = {};
        }
        this.reatingMdObjects = {"ОбщийМодуль":2, 
                                "Конфигурация":3,
                                "ПланОбмена":4,
                                "ОбщаяФорма":5
                            };
        if (objTitle.length>0){
            this.reatingMdObjects[objTitle]=1; //Самый высокий рейтинг...     
        }
        

        this.readMdToVt(this.currentMdContainer);
        this.expandetRows = {};
        this.curId = 0;
        if (this.dynamicHotKey) 
            hks.AddHotKey("Ctrl+Shift+BkSpace", "ExtendedSearch", "Отменить глобальный поиск");
        events.connect(Designer, "onIdle", this);
       
        //this.showSearchResult(docRow, fromHotKey);
        //windows.caption = curCaption;
    },

    getCurrentMd:function(){
        var md ;
        if (this.isInCurrentMdConteinerFind ) {
            if (!this.activeView){
                var activeWindow = this.watcher.getActiveTextWindow();    
                if (!activeWindow){
                } else {
                    var activeView = activeWindow.GetView();    
                }
            } else {

                var activeView = this.activeView;    
            }
            //Определим объект конфигурации по текущему окну. 
            if (!activeView) {
            } else {
                if (activeView.mdObj && activeView.mdProp) {
                    md = activeView.mdObj.container;
                } else if (activeView.mdObj) {
                    md = activeView.mdObj.container;
                }
            } 
            
        }
        
        if (!md) {
            md = metadata.current;   
        }

        return md;
    },
    
    onIdle:function(){
        if (!this.startGlobalSearch) {
            windows.caption = this.curCaption;
            events.disconnect(Designer, "onIdle", this);
            this.showSearchResult(docRow, false);
            this.expandetRows = {};
            
            if (this.dynamicHotKey) {
                for(var i = 0; i < hotkeys.count; i++)
                {
                    var hk = hotkeys.item(i);
                    Команда = hk.addin + "::" + hk.macros
                    if (Команда.indexOf("ExtendedSearch::Отменить глобальный поиск")!=-1){
                        try {
                            hotkeys.remove(i);
                        } catch (e) {}
                    }
                }
            }
            return;
        }
        var currentId = this.currentMdContainer.rootObject.id;
        if (this.vtMD[currentId].Count()<1) {
            this.startGlobalSearch = false;
            events.disconnect(Designer, "onIdle", this);
            return;
        }
        
        var count = 0;
        var docRow = null;
        while (count < this.countRowsInIdleSearch){
            if (this.curId<this.vtMD[currentId].Count()){
                //docRow = this.searchByUuid(this.vtMD[currentId][this.curId]);
                var currRow = this.vtMD[currentId].Get(this.curId);
                docRow = this.searchByUuid(currRow, this.curId);
                windows.caption = currRow.mdName;
            } else {
                this.startGlobalSearch = false;
                break;
            }
            this.curId ++;
            count++;
        }
        this.showSearchResult(null, false);
        
    },
    
    readMdToVt:function(MdContainer){
        var currentId = MdContainer.rootObject.id; 
        if (!this.vtMD[currentId]){
            var docRow = null; 
            //this.vtMD[currentId] = [];
            this.vtMD[currentId]=v8New("ValueTable");
            this.vtMD[currentId].Columns.Add("UUID");
            this.vtMD[currentId].Columns.Add("mdProp");
            this.vtMD[currentId].Columns.Add("mdName");
            this.vtMD[currentId].Columns.Add("title");
            this.vtMD[currentId].Columns.Add("sortTitle");
            this.vtMD[currentId].Columns.Add("sort");
            this.vtMD[currentId].Columns.Add("LineNumber");

            var es = this;
            //Реквизиты пропустим
            var ignoredMdClass = {
                "Реквизиты":"",
                "Макеты" : "" ,
                "ОбщиеКартинки" : "" ,
                "Элементы стиля" : "" ,
                "Подсистемы" : "" ,
                "Языки" : "" ,
                "Стили" : "" ,
                "Интерфейсы" : "" ,
                "ПараметрыСеанса" : "" ,
                "Роли" : "" ,
                "ОбщиеМакеты" : "" ,
                "КритерииОтбора" : "" ,
                "ОбщиеРеквизиты" : "" ,
                "ТабличныеЧасти" : "" ,
                "Параметры" : "" 
                };
                
            var LineNumber = 0; //Для сортировки модулей функций по порядку обхода, а не по алфавиту.
            
            (function (mdObj){
                if (!es.startGlobalSearch) {return} 
                
                var mdc = mdObj.mdclass;
            
                function getMdName(mdObj) {                             
                    if (mdObj.parent && mdObj.parent.mdClass.name(1) != 'Конфигурация')
                        return getMdName(mdObj.parent) + '.' + mdObj.mdClass.name(1) + ' ' + mdObj.name;
                    var cname = mdObj.mdClass.name(1);
                    return  (cname ? cname + ' ' : '') + mdObj.name;
                }
                var mdName = getMdName(mdObj)
                
                for(var i = 0, c = mdc.propertiesCount; i < c; i++){
                    var mdProp = mdc.propertyAt(i);
                    var mdPropName = mdc.propertyAt(i).name(1);

                    if (mdObj.isPropModule(mdProp.id)){
                        //var row = {UUID : mdObj.id}
                        var row = es.vtMD[currentId].Add();
                        row.UUID = mdObj.id;
                        row.mdProp = mdProp;
                        row.mdName = mdName;
                        
                        LineNumber++;
                        var title = mdName + ': ' + mdPropName;
                        row.title = title;

                        row.sort = 9;
                        row.LineNumber = LineNumber;
                        var matches;

                        var re = new RegExp(/(([а-яa-z0-9]{1,})\s[а-яa-z0-9]{1,})(\.|:)/i);
                        
                        matches = re.exec(mdName);
                        if (matches!=null){
                            row.sortTitle = matches[1];

                            if (!es.reatingMdObjects[matches[1]]){
                                if (!es.reatingMdObjects[matches[2]]) {
                                    row.sort = 9; 
                               } else {
                                    row.sort = es.reatingMdObjects[matches[2]];
                               }
                            } else {
                                row.sort = es.reatingMdObjects[matches[1]];   
                            }
                                
                            
                        }                        
                        
                    }
                }
                // Перебираем классы потомков (например у Документа это Реквизиты, ТабличныеЧасти, Формы)
                for(var i = 0; i < mdc.childsClassesCount; i++)
                {
                    var childMdClass = mdc.childClassAt(i)
                    
                    if (!(ignoredMdClass[childMdClass.name(1, true)]==undefined)){
                        continue;
                    }
                    
                    // Для остального переберем потомков этого класса.
                    for(var chldidx = 0, c = mdObj.childObjectsCount(i); chldidx < c; chldidx++){
                        var childObject = mdObj.childObject(i, chldidx);
                        arguments.callee(childObject);
                    }
                }
                })(MdContainer.rootObject)
            
        } else {
            for (var key in this.reatingMdObjects){
                if (this.reatingMdObjects[key]<2) {
                    var filter = v8New("Structure");
                    filter.Insert("sort", 1);
            
                    var findRows = this.vtMD[currentId].FindRows(filter);
                    if (findRows.Count()>0){
                        for (var i=0; i<findRows.Count(); i++){
                            var currRow = findRows.Get(i);
                            if (currRow.sortTitle != key){
                                currRow.sort = 9;
                            }
                        }
                    }

                    var filter = v8New("Structure");
                    filter.Insert("sortTitle", key);
                    var findRows = this.vtMD[currentId].FindRows(filter);
                    if (findRows.Count()>0){
                        for (var i=0; i<findRows.Count(); i++){
                            var currRow = findRows.Get(i);
                            if (currRow.sortTitle != key){
                                currRow.sort = (!this.reatingMdObjects[key]) ? 9: this.reatingMdObjects[key];
                            }
                        }
                    }                    
                }
                
                
            }
            
        }

        if (this.filterByUUID){
            var arrayToFilter = v8New('Array');
            var firstElement = false;
            for (var k in this.filterByUUID){
                firstElement = true;
                var filter = v8New("Structure");
                filter.Insert("UUID", k);
                var findRows = this.vtMD[currentId].FindRows(filter);
                if (findRows.Count()>0){
                    for (var i=0; i<findRows.Count(); i++){
                        arrayToFilter.Add(findRows.Get(i));
                    }
                }
            }
            if (firstElement)
                this.vtMD[currentId] = this.vtMD[currentId].Copy(arrayToFilter);

        }
        this.vtMD[currentId].Sort("sort, LineNumber, title");

    },
    

    Query_OnChange : function(Control){

        return;

    },

    BtSearch_Click : function (control) {

        if (this.form.Query == '')
        {
            DoMessageBox('Не задана строка поиска');
            return;
        }

        this.searchInMetadata(true);
    },


    SetControlsVisible : function(){
        this._super();
        if (this.isGlobalFind){
            this.form.caption = "Расширенный поиск в модуле (глобальный)";
        }
    }, 

    showSearchResult: function (docRow, fromHotKey) {
        this.showResult(docRow, fromHotKey);
        this.expandTree();
    },
    
    expandTree : function (collapse) {
        var tree = this.form.Controls.SearchResults;
        for (var i=0; i < this.results.Rows.Count(); i++)
        {        
            var docRow = this.results.Rows.Get(i);
            if (this.form.TreeView)
            {
                for (var j=0; j < docRow.Rows.Count(); j++)
                {
                    var row = docRow.Rows.Get(j);
                    if (this.expandetRows[""+row.LineNo+row.FoundLine]){
                        continue;
                    }
                    collapse ? tree.Collapse(row) : tree.Expand(row, true);
                    if (this.startGlobalSearch){
                        this.expandetRows[""+row.LineNo+row.FoundLine] = "1";
                    }
                }
            }
            else
            {
                if (this.expandetRows[""+docRow.LineNo+docRow.FoundLine]){
                    continue;
                }
                collapse ? tree.Collapse(docRow) : tree.Expand(docRow, true);            
                
                if (this.startGlobalSearch){
                    this.expandetRows[""+docRow.LineNo+docRow.FoundLine] = "1";
                }
            }
        }
    }
     


})

////} ExtSearch

////////////////////////////////////////////////////////////////////////////////////////
////{ Вспомогательные объекты.
////

MdObject = stdlib.Class.extend({           
    construct: function (obj, prop, title) {
        this.obj = obj;
        this.prop = prop;
        this.title = title;
    },
    getText: function() {
        return this.obj.getModuleText(this.prop.id);
    },
    activate: function() {
        this.obj.openModule(this.prop.id);
        return GetTextWindow();
    },
    getTitle: function() {
        if (!this.title)
        {
            function getMdName(mdObj) {                             
                if (mdObj.parent && mdObj.parent.mdClass.name(1) != 'Конфигурация')
                    return getMdName(mdObj.parent) + '.' + mdObj.mdClass.name(1) + ' ' + mdObj.name;
                var cname = mdObj.mdClass.name(1);
                return  (cname ? cname + ' ' : '') + mdObj.name;
            }
            this.title = getMdName(this.obj) + ': ' + this.prop.name(1);
        }
        return this.title;
    }
});

TextDocObject = stdlib.Class.extend({
    construct: function (txtDoc, title) {
        this.obj = txtDoc;
        this.title = title;
    },
    getText: function() {
        return this.obj.GetText();
    },
    activate: function() {
        this.obj.Show();
        return GetTextWindow();
    },
    getTitle: function() {
        if (!this.title)
            this.title = this.obj.UsedFileName;
        return this.title;
    }
});

function findMdObj(currentmd, uuid)
{
    if(uuid == currentmd.rootObject.id)
        return currentmd.rootObject
    return currentmd.findByUUID(uuid);
}
////
////} Вспомогательные объекты.
////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////
////{ TextWindowsWatcher - отслеживает активизацию текстовых окон и запоминает последнее.
////

TextWindowsWatcher = stdlib.Class.extend({

    construct : function() {
        this.timerId = 0;
        this.lastActiveTextWindow = null;
        this.startWatch();
    },

    getActiveTextWindow : function () {
        if (this.lastActiveTextWindow && this.lastActiveTextWindow.IsActive())
            return this.lastActiveTextWindow;
        return null;
    },

    startWatch : function () {
        if (this.timerId)
            this.stopWatch();
        this.timerId = createTimer(500, this, 'onTimer');
    },

    stopWatch : function () {
        if (!this.timerId)
            return;
        killTimer(this.timerId);
        this.timerId = 0;
    },

    onTimer : function (timerId) {
        var wnd = GetTextWindow();    
        if (wnd)
            this.lastActiveTextWindow = wnd;
        else if (this.lastActiveTextWindow && !this.lastActiveTextWindow.IsActive())
            this.lastActiveTextWindow = null;
    }
    
}); // end of TextWindowsWatcher class

//} TextWindowsWatcher 

////////////////////////////////////////////////////////////////////////////////////////
////{ StartUp
////
function GetExtSearch() {
    if (!ExtSearch._instance)
        new ExtSearch();
    
    return ExtSearch._instance;
}

function GetExtSearchGlobal() {
    if (!ExtSearchGlobal._instance)
        new ExtSearchGlobal();
    
    return ExtSearchGlobal._instance;
}


events.connect(Designer, "beforeExitApp", GetExtSearch());
events.connect(Designer, "beforeExitApp", GetExtSearchGlobal());
////}

function getMacrosInfo(name, info) {
    if (name == "Найти текст") {
        info.descr =  "Поиск текста в открытом документе";
        info.picture = stdcommands.Frame.Search.info.picture;
    } else if (name == "Глобальный поиск") {
        info.descr =  "Запустить поиск по конфигурации";
        info.picture = stdcommands.Frame.SearchGlobal.info.picture;
    }
}
