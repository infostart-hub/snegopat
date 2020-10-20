//engine: JScript
//uname: SessionManager
//dname: Менеджер сессии
//author: Сосна Евгений <shenja@sosna.zp.ua>
//help: inplace
//addin: stdcommands
//addin: global
//addin: stdlib

////////////////////////////////////////////////////////////////////////////////////////
////{ Cкрипт- менеджер сессий для проекта "Снегопат"
////
//// Описание: Сохраняет список окон и позиции курсора при выходе из конфигуратора
//// и восстанавливает их при входе.
//// 
////
//// Автор Сосна Евгений <shenja@sosna.zp.ua>
////}
////////////////////////////////////////////////////////////////////////////////////////


stdlib.require('TextWindow.js', SelfScript);
stdlib.require("SelectValueDialog.js", SelfScript);
global.connectGlobals(SelfScript)

stdlib.require('ScriptForm.js', SelfScript);

////////////////////////////////////////////////////////////////////////////////////////
////{ Макросы
////

SelfScript.self['macrosСохранить текущие окна'] = function() {
    var sm = GetSessionManager();
    sm.saveSession();
    sm.saveSettings();
    sm.loadSettings();
    return true;
}

SelfScript.self['macrosВосстановить последнюю сессию'] = function() {
    var sm = GetSessionManager();
    sm.restoreSession("");
    return true;
}

SelfScript.self['macrosОткрыть открыть список сохраненных сессий'] = function() {
    var sm = GetSessionManager();
    sm.show();
    return true;
}
SelfScript.self['macrosОчистить всю историю'] = function() {

    var sm = GetSessionManager();
    sm.sessionTreeClear();
    return true;
}

SelfScript.self['macrosОткрыть настройку'] = function() {

    var sms = GetSessionManagerSettings();
    sms.show(true);
    sms = null;
    var sm = GetSessionManager();
    sm.reloadSettings();
    return true;
}


/* Возвращает название макроса по умолчанию - вызывается, когда пользователь
дважды щелкает мышью по названию скрипта в окне Снегопата. */
function getDefaultMacros() {
    return 'Восстановить последнюю сессию';
}

////} Макросы

////////////////////////////////////////////////////////////////////////////////////////
////{ SessionManager - Расширенный поиск в тексте модуля.
////
SessionManager = ScriptForm.extend({

    settingsRootPath : SelfScript.uniqueName,

    settings : {
        "pflBase" : {
            'SessionsHistory' : "", //Таблица значений 
            'SessionSaved'    : "",
            'AutoSave'        : true, // Автосохранение сессии.
            'HistoryDepth'    : 15, // Количество элементов истории сессий.
            'AutoRestore'     : true,
            'MarksSave'       : true,
            'MarksRestore'    : true,
            'ColorSaved'      : v8New("Цвет", 229, 229, 229)

        }
    },

    construct : function (isExtend) {

        if (isExtend == undefined) isExtend = false;
        this._super(SelfScript.fullPath.replace(/.js$/, '.epf|Форма'));

        this.form.КлючСохраненияПоложенияОкна = "SessionManager.js"
        this.sessionsList = this.form.Controls.SessionsList.Value;
        this.sessionsList.Columns.Add('_object');
        this.wndlist = new WndList;
        
        this.watcher = new TextWindowsWatcher(this.wndlist);
        this.watcher.startWatch();
        //debugger;
        this.loadSettings();

        if (!isExtend) SessionManager._instance = this;

    },
    loadSettings:function(){
        this._super();
        try{
            this.SessionTree = ValueFromStringInternal(this.form.SessionsHistory);
        } catch(e){
            this.SessionTree = v8New("ValueTree");
            this.SessionTree.Columns.Add("Name");
            this.SessionTree.Columns.Add("path");
            this.SessionTree.Columns.Add("uuid");
            this.SessionTree.Columns.Add("prop");
            this.SessionTree.Columns.Add("rootId");
            this.SessionTree.Columns.Add("sortkey");
            this.SessionTree.Columns.Add("curLine");
        }
        
        try{

            this.SessionTree.Columns.Add("curLine");
        } catch(e){  }

        try{
            this.constantSessionTree = ValueFromStringInternal(this.form.SessionSaved);
        } catch(e){
            this.constantSessionTree = v8New("ValueTree");
            this.constantSessionTree.Columns.Add("Name");
            this.constantSessionTree.Columns.Add("path");
            this.constantSessionTree.Columns.Add("uuid");
            this.constantSessionTree.Columns.Add("prop");
            this.constantSessionTree.Columns.Add("rootId");
            this.constantSessionTree.Columns.Add("sortkey");
            this.constantSessionTree.Columns.Add("curLine");
        }
        
        try{

            this.constantSessionTree.Columns.Add("curLine");
        } catch(e){  }

        this.sessions = {"SessionsHistory":this.SessionTree, 
                        "SessionSaved":this.constantSessionTree
                        }

    },
    autoRestoreSession:function(sessionName){
        if (!this.form.AutoRestore) {
            return;
        }
        this.restoreSession(sessionName);
    },

    restoreSession:function(sessionName, table){

        if (table==undefined) table = 'SessionsHistory';
        var sessionsHistory = this.sessions[table];
        
        if (sessionsHistory.Rows.Count()==0){
            return ;
        }

        if (sessionName==undefined) sessionName = ""


        if (sessionName.length>0){
            for (var i = 0; i<sessionsHistory.Rows.Count(); i++){
                session  = sessionsHistory.Rows.Get(i);
                if (session.Name == sessionName){
                    sessionRow = session;
                    break;
                }
            }
        } else {
            sessionRow = sessionsHistory.Rows.Get(sessionsHistory.Rows.Count()-1);
        }
        if (sessionRow == undefined){
            Message("Not found session");
            return;
        }
        var mdCache = []
        for (var i=0; i<sessionRow.Rows.Count(); i++){
            var md = null;
            currRow = sessionRow.Rows.Get(i);

            if (!mdCache[currRow.rootId]){
                md = mdCache[currRow.rootId];
            }
            if (currRow.rootId.indexOf(metadata.current.rootObject.id)!=-1) md = metadata.current;
            if (md == null){
                isPath = true;
                try {
                    var f = v8New('File', currRow.path);
                    if (!f.Exist())  isPath = false
                } catch (e) {
                    isPath = false;
                }
                if (!isPath)
                    continue;

                stdlib.openFileIn1C(f.FullName);
                
                this.watcher.onTimer(1);

                view = this.wndlist.find;
                for (var vkey in view){
                    var v=view[vkey]
                    if (currRow.rootId == v.rootId){
                        var mdObj = v.view.mdObj;
                        md = mdObj.container;
                        break;
                    }
                }
            }
            if (md==null) {
                continue;
            } else {
                mdCache[currRow.rootId]=md
                var mdObj = this.findMdObj(md, currRow.uuid);
                if (mdObj){
                    n = currRow.prop;
                    try{
                        text = '1';
                        if (n =="Форма"){
                            mdObj.openModule(n.toString());
                        } else {
                            mdObj.editProperty(n.toString());
                            text = mdObj.getModuleText(n.toString());
                        }
                        if (currRow.curLine && text.length>0) {
                            //попробуем обойтись без таймера... 
                            twnd = new TextWindow;
                            if (twnd.IsActive()) {
                                twnd.SetCaretPos(currRow.curLine, 1);
                                //Запишем установленную позицию курсора. 
                                var activeView = windows.getActiveView();
                                if(!this.wndlist.find.hasOwnProperty(activeView.id))
                                    {
                                        
                                        if (activeView.mdObj && activeView.mdProp){
                                            var item = new WndListItem(activeView);
                                            item.addCurPosition(currRow.curLine);
                                            this.wndlist.list.push(item);
                                            this.wndlist.find[activeView.id] = item;
                                        }
                                    }
                            }
                        }    

                    } catch(e){
                        try{
                            mdObj.editProperty(n.toString());
                        }catch(e){
                            try{
                                mdObj.openEditor();
                            }catch(e){
                                Message("Не удалось восстановить окно "+currRow.name+" prop:"+currRow.prop+" error:"+e.description);
                            }
                        }
                        //Message("Не удалось восстановить окно "+currRow.name+" prop:"+currRow.prop+" error:"+e.description);
                    }

                }
            }
        }
        //Попробуем рецепт от Орефкова, по максимизации окон. 
        var activeView = windows.getActiveView();
        if (!activeView){
            return
        }
        try {
            
            if (activeView.mdObj && activeView.position().state == vsMDI) {
                activeView.sendCommand("{c9d3c390-1eb4-11d5-bf52-0050bae2bc79}", 7);
            }
        } catch (e) {}
        
    },
    findMdObj: function(md, uuid){
        if(uuid == md.rootObject.id)
            return md.rootObject
        return md.findByUUID(uuid);
    },
    saveSession:function(sessionName, views, table){
        var dateStr = new Date().toLocaleString();
        var sessionRow = undefined;
        if (table==undefined) table = 'SessionsHistory';
        var sessionsHistory = this.sessions[table];
        //debugger;
        if (sessionName==undefined) sessionName = ""
        if (sessionName.length>0){
            for (var i = 0; i<sessionsHistory.Rows.Count(); i++){
                session  = sessionsHistory.Rows.Get(i);
                if (session.Name == sessionName){
                    //sessionRow = session;
                    sessionsHistory.Rows.Delete(session)
                    break;
                }
            }
        } else {
            sessionName = "Session "+dateStr;
        }

        //if (sessionRow == undefined){
            sessionRow = sessionsHistory.Rows.Add();
            sessionRow.Name = sessionName;
        //}
        if (views == undefined){
            //var dictViews = this.walkViews();
            var views = this.wndlist.find;
        } else {
            find = {};
            var wndlist = this.wndlist.find;
            for (var idx in views){
                view = views[idx];
                var id = view.view.id;
                if (wndlist.hasOwnProperty(id)){
                    find[id]=wndlist[id];
                }
            }
            var views = find;

        }
        for (var key in views){
            
            var item=views[key]
            newRow = sessionRow.Rows.Add();
            newRow.rootId = item.rootId;
            newRow.path = item.path;
            newRow.uuid = item.uuid;
            newRow.prop = item.prop;
            newRow.name = item.name;
            newRow.curLine = item.curLine;
            
        }

        // Не позволяем истории расти более заданной глубины.
        if (table=="SessionsHistory"){
            while (this.SessionTree.Rows.Count() > this.form.HistoryDepth){
                currRow = this.SessionTree.Rows.Get(0);
                this.SessionTree.Rows.Delete(currRow);
            }    
        }
        if (!sessionRow.Rows.Count()){
            //sessionsHistory.Rows.Delete(sessionRow);
        }
        
        //this.form.SessionsHistory = ValueToStringInternal(this.SessionTree);

    },
    saveSettings:function(){
        this.form.SessionsHistory = ValueToStringInternal(this.SessionTree);
        this.form.SessionSaved = ValueToStringInternal(this.constantSessionTree);
        this._super();
    },
    beforeExitApp:function(){
        
        this.watcher.onTimer(1);
        this.watcher.stopWatch();

        if (this.form.AutoSave){
            this.saveSession();    
        }

        this.saveSettings();
    },

    expandTree : function (collapse) {
        var tree = this.form.Controls.SessionsList;
        for (var i=0; i < this.form.SessionsList.Rows.Count(); i++)
        {
            var docRow = this.form.SessionsList.Rows.Get(i);
            collapse ? tree.Collapse(docRow) : tree.Expand(docRow, true);            
            //tree.Expand(docRow, true);
        }
    },

    showSessionsTree: function(table){
        
        for (var i = 0; i<this.sessions[table].Rows.Count(); i++){
            var currRow = this.sessions[table].Rows.Get(i);
            var newRow = this.sessionsList.Rows.Add();
            newRow.name = currRow.name;
            newRow.RowType = table;
            newRow._object = currRow;
            if (currRow.Rows.Count()>0){
                for (var y = 0; y < currRow.Rows.Count(); y++) {
                    listRow =  currRow.Rows.Get(y);
                    newListRow = newRow.Rows.Add();
                    newListRow.name = listRow.name;
                    newListRow.rootId = listRow.rootId;
                    newListRow.path = listRow.path;
                    newListRow.uuid = listRow.uuid;
                    newListRow.prop = listRow.prop; 
                    newListRow.curLine = listRow.curLine; 
                };

            };

        }
        this.expandTree(true);
        
    },

    Form_OnOpen : function () {
        this.sessionsList.Rows.Clear();
        this.showSessionsTree("SessionsHistory");
        this.showSessionsTree("SessionSaved");

    },

    Form_OnClose : function () {
        this.saveSettings();
    },

    SessionsList_Selection:function(control, selectedRow, selectedCol, defaultHandler){
        defaultHandler.val = false;
        currRow = selectedRow.val;

        if (currRow.Строки.Count()>0){
            this.restoreSession(currRow.Name, currRow.RowType);
        }
    }, 
    CmdBar_Restore:function(Button){

        for(var rows = new Enumerator(this.form.Controls.SessionsList.ВыделенныеСтроки); !rows.atEnd(); rows.moveNext()){
            var item = rows.item();
            var currRow = item._object;
            if (!currRow){
                continue;
            }
            if (!currRow.Rows.Count())
                continue;
            
            this.restoreSession(currRow.Name, item.RowType);

        }
    }, 

    CmdBar_Delete:function(Button){
        
        for(var rows = new Enumerator(this.form.Controls.SessionsList.ВыделенныеСтроки); !rows.atEnd(); rows.moveNext()){
            var item = rows.item();
            var currRow = item._object;
            if (!currRow){
                continue;
            }
            this.sessions[item.RowType].Rows.Delete(currRow);
        }
        this.sessionsList.Rows.Clear();
        this.showSessionsTree("SessionsHistory");
        this.showSessionsTree("SessionSaved");
        

    },
    CmdBar_SaveToFile:function(Button){
        Message("Еще не реализованно!");
    },

    CmdBar_RestoreFromFile:function(Button){
        Message("Еще не реализованно!");
    },

    CmdBar_ChangeRowType:function(Button){
        var values = v8New('СписокЗначений');
        values.Add("SessionSaved", 'Постоянное хранение');
        values.Add("SessionsHistory", 'Автоочищаемое хранение');
        var dlg = new SelectValueDialog("Выберите сессию", values);
        if (!dlg.selectValue()) {
            return;
        }
    
        var table = dlg.selectedValue;
        for(var rows = new Enumerator(this.form.Controls.SessionsList.ВыделенныеСтроки); !rows.atEnd(); rows.moveNext()){
            var item = rows.item();
            var currRow = item._object;
            if (!currRow)
                continue;
            if (item.RowType!=table){
                var newRow = this.sessions[table].Rows.Add();
                newRow.Name = item.Name;
                if (item.Rows.Count()>0){
                    for (var y = 0; y < item.Rows.Count(); y++) {
                        listRow =  item.Rows.Get(y);
                        newListRow = newRow.Rows.Add();
                        newListRow.name = listRow.name;
                        newListRow.rootId = listRow.rootId;
                        newListRow.path = listRow.path;
                        newListRow.uuid = listRow.uuid;
                        newListRow.prop = listRow.prop; 
                        newListRow.curLine = listRow.curLine; 
                    };
                };
                this.sessions[item.RowType].Rows.Delete(currRow);
                item._object = newRow;
            }

        }
    },

    CmdBar_Rename:function(Button){
        var Rows = this.form.Controls.SessionsList.ВыделенныеСтроки;
        if (!Rows.Count() || Rows.Count()>1) {
            Message("Необходимо выбрать одну строку верхнего уровня");
            return;
        }
        var item = Rows.Get(0);
        var currRow = item._object;
        if (!currRow){
            return;
        }
        var vbs = addins.byUniqueName("vbs").object
        vbs.var0 = currRow.Name; vbs.var1 = "Введите наименование "; vbs.var2 = 0, vbs.var3 = false;
        if (vbs.DoEval("InputString(var0, var1, var2, var3)")) {
            var message  = vbs.var0;
            if (message!=currRow.Name){
                currRow.Name = message;
                item.Name = message;
            }
        }
    },

    CmdBar_ExpandAll : function (Button) {
        this.expandTree(false);
    },
    
    CmdBar_CollapseAll : function (Button) {
        this.expandTree(true);
    },

    SessionsList_OnRowOutput : function (Control, RowAppearance, RowData) {
        var RowType = RowData.val.RowType;
        if (RowType=="SessionSaved"){
            RowAppearance.val.Cells.Name.ЦветФона = this.form.ColorSaved;
        }
    },
    

    sessionTreeClear:function(){
        this.SessionTree.Rows.Clear();
    }, 

    reloadSettings:function(){
        
        this.loadSettings();
    },

    choiceSessionName:function(){

        var values = v8New('СписокЗначений');
        for (var i=0; i<this.sessions['SessionSaved'].Rows.Count(); i++){
            var currRow=this.sessions['SessionSaved'].Rows.Get(i);
            values.Add(i, ''+currRow.Name);
        }

        values.Add("add", 'Добавить и ввести новое имя сессии');

        var dlg = new SelectValueDialog("Выберите сессию", values);
        if (dlg.selectValue()) {
            if (dlg.selectedValue=="add"){
                var vbs = addins.byUniqueName("vbs").object
                vbs.var0 = ""; vbs.var1 = "Введите наименование "; vbs.var2 = 0, vbs.var3 = false;
                if (vbs.DoEval("InputString(var0, var1, var2, var3)")) {
                    var message  = vbs.var0;
                    var name = message;
                }
            } else {
                var currRow = this.sessions['SessionSaved'].Rows.Get(dlg.selectedValue);
                var name = currRow.Name;
            }
            return (name.length>0)?name:null
        }
        return null;
    }


})

////////////////////////////////////////////////////////////////////////////////////////
////{ SessionManagerSettings - Настройки менеджера сессий. 
////
SessionManagerSettings = ScriptForm.extend({

    settingsRootPath : SelfScript.uniqueName,

    settings : {
        "pflBase" : {
            'SessionsHistory' : "", //Таблица значений 
            'SessionSaved'    : "",
            'AutoSave'        : false, // Автосохранение сессии.
            'HistoryDepth'    : 15, // Количество элементов истории сессий.
            'AutoRestore'     : true,
            'MarksSave'       : true,
            'MarksRestore'    : true,
            'ColorSaved'      : v8New("Цвет", 229, 229, 229)

        }
    },

    construct : function () {

        this._super(SelfScript.fullPath.replace(/.js$/, '.epf|ФормаНастройки'));

        this.loadSettings();

        SessionManagerSettings._instance = this;

    },
    loadSettings:function(){
        this._super();
        try{
            this.SessionTree = ValueFromStringInternal(this.form.SessionsHistory);
        } catch(e){
            this.SessionTree = v8New("ValueTree");
            this.SessionTree.Columns.Add("Name");
            this.SessionTree.Columns.Add("path");
            this.SessionTree.Columns.Add("uuid");
            this.SessionTree.Columns.Add("prop");
            this.SessionTree.Columns.Add("rootId");
            this.SessionTree.Columns.Add("sortkey");
            this.SessionTree.Columns.Add("curLine");
        }
        
        try{

            this.SessionTree.Columns.Add("curLine");
        } catch(e){  }

    },

    saveSettings:function(){
        this.form.SessionsHistory = ValueToStringInternal(this.SessionTree);
        this._super();
    },

    Ok_Click:function(Button){
        this.saveSettings();
        this.form.Close();
    }, 

    Close_Click:function(Button){
        this.form.Close();
    }

})



////////////////////////////////////////////////////////////////////////////////////////
////{ TextWindowsWatcher - отслеживает активизацию текстовых окон и запоминает последнее.
////

TextWindowsWatcher = stdlib.Class.extend({

    construct : function(wndlist) {
        this.timerId = 0;
        this.lastActiveTextWindow = null;
        if (!wndlist) {
            wndlist = new WndList;
        }
        this.wndlist = wndlist;
        this.oldActiveViewId = 0;
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
        var activeView = windows.getActiveView();
        if (!activeView){
            this.wndlist.removeOldViews();
            return;
        }
        if (activeView.id == this.oldActiveViewId){
            return;
        }
        this.oldActiveViewId = activeView.id;

        var wnd = GetTextWindow();    
        if (wnd)
            this.lastActiveTextWindow = wnd;
        else if (this.lastActiveTextWindow && !this.lastActiveTextWindow.IsActive())
            this.lastActiveTextWindow = null;
        this.wndlist.removeOldViews();
        this.wndlist.addNewViews(this.getActiveTextWindow());
    }
    
}); // end of TextWindowsWatcher class

//} TextWindowsWatcher 


WndListItem = stdlib.Class.extend(
{
    construct: function(view)
    {
        this.view = view
        this.rowInVt = null
        this.color = 0
        this.makeSortKey();
        this.make();
        this.curLine = 0;
    },
    make:function(){
        var mdObj = this.view.mdObj;
        var mdname = mdObj.container.identifier;
        var mdProp = this.view.mdProp;
        this.rootId = mdObj.container.rootObject.id;
        this.path = mdname.replace(/\*|[|]/g, '');
        this.uuid = mdObj.id;
        this.prop = mdProp.name(1);
        this.name = this.getMdName(mdObj)+(mdProp ? mdProp.name(1) : "");
    },
    isAlive: function()
    {
        try{
            if(this.view.hwnd && this.view.position().state == vsMDI)
                return true
        }catch(e){}
        return false
    },
    makeTitle: function()
    {
        var result = {title : '', info: ''}
        if(this.isAlive())
        {
            result.title = this.view.title
            var mdObj = this.view.mdObj
            if(mdObj)
            {
                var mdname = mdObj.container.identifier
                if(result.title.indexOf(mdname) < 0)
                    result.info += mdname + " "
            }
            var obj = this.view.getObject()
            if(obj)
                result.info += toV8Value(obj).typeName(1) + " "
        }
        return result
    },
    makeSortKey : function()
    {
        // Основной алгоритм упорядочивания окон
        var md = this.view.mdObj
        if(md)
        {
            // Если окно относится к объекту метаданных. Сначала пусть идут окна
            // основной конфигурации, далее конфигурации ИБ, затем внешние отчеты/обработки и cf-ники.
            // При закрытой основной конфигурации metadata.current равно metadata.ib, поэтому сначала
            // проверяем на metadata.ib
            if(md.container == metadata.ib)
                this.sortkey = "2#"
            else if(md.container == metadata.current)
                this.sortkey = "1#"
            else
                this.sortkey = "3#" + md.container.identifier + "#"
            this.sortkey += this.getMdName(md);
        }
        else    // Дальше пусть идут всякие файлы по алфавиту
            this.sortkey = "4#" + this.view.title
        this.sortkey = this.sortkey.toLowerCase()
    },
    getMdName:function(mdObj)
    {
        if (mdObj.parent && mdObj.parent.mdClass.name(1) != 'Конфигурация')
            return this.getMdName(mdObj.parent) + '.' + mdObj.mdClass.name(1) + ' ' + mdObj.name;
        var cname = mdObj.mdClass.name(1);
        return  (cname ? cname + ' ' : '') + mdObj.name;
    },
    addCurPosition:function(curLine)
    {
        if (this.curLine!=curLine)
            this.curLine = curLine;
    }

})

WndList = stdlib.Class.extend({
    construct: function()
    {
        this.list = []  // Массив - список окон
        this.find = {}  // Для поиска окна по его id
        this.lastFilter = ''
        this.activeView = null
    },
    // Функция для удаления устаревших, закрытых окон из нашего списка
    removeOldViews: function()
    {
        var removed = false
        for(var i = this.list.length; i--;)
        {
            var item = this.list[i]
            if(!item.isAlive())
            {
                delete this.find[item.view.id]
                this.list.splice(i, 1)

                removed = true
            }
        }
        return removed
    },
    // Функция для добавления новых окон в список.
    // Перебирает все MDI-окна, и те, которых нет в списке, добавляет туда
    // Также определяет активное окно
    addNewViews: function(twnd)
    {
        var views = []      // Массив всех конечных отображений
        var childs = windows.mdiView.enumChilds();   // Получим список MDI-окон
        (function(views, list)  // Далее надо каждое MDI-окно "раскрутить" до конечных отображений,
        {                       // т.к. MDI-окно может быть контейнером для одного или нескольких отображений
            for(var i = 0; i < views.count; i++)
            {
                var v = views.item(i)
                if(v.isContainer != vctNo)  // Окно - контейнер. Рекурсивно раскрутим его потомков
                    arguments.callee(v.enumChilds(), list)
                else    // Окно не контейнер. Добавим в общий список
                    list.push(v)
            }
        })(childs, views)
        var added = false
        // Перебираем весь список окон
        for(var idx in views)
        {
            var v = views[idx]
            if(!this.find.hasOwnProperty(v.id))
            {
                //Нам интеерстны только объекты метаднных, на данном этапе.
                if (v.mdObj && v.mdProp){
                    var item = new WndListItem(v)
                    this.list.push(item)
                    this.find[v.id] = item
                    added = true
                }
            }
            if (twnd!=null){
                twndView = twnd.GetView();
                try {
                    if ((twnd!=null) && (v.id == twndView.id)){
                        item = this.find[v.id];
                        item.addCurPosition(twnd.GetCaretPos().beginRow);
                    }
                } catch (e) {}
                

            }
        }
        if(added)   // Что-то добавилось, отсортируем список
            //this.list.sort(function(i1, i2){return i1.sortkey.localeCompare(i2.sortkey)})
        var activeView = null
        if(childs.count > 0)
        {
            activeView = childs.item(0)
            while(activeView.activeChild)
                activeView = activeView.activeChild
            activeView = this.find[activeView.id]
        }
        return {added: added, activeView: activeView}
    }
})

////////////////////////////////////////////////////////////////////////////////////////
////{ StartUp
////
function GetSessionManager() {
    if (!SessionManager._instance)
        new SessionManager();

    return SessionManager._instance;
}

function GetSessionManagerSettings() {
    if (!SessionManagerSettings._instance)
        new SessionManagerSettings();

    return SessionManagerSettings._instance;
}

FirstRunSession = stdlib.Class.extend({
    construct: function()
    {
        this.isModal = false;
        this.timerCount = 0;
        this.timerId = 0;
        this.isFirstMessage = true;
        this.startWatch();
    }, 

    onDoModal: function(dlgInfo){
        if(dlgInfo.stage == beforeDoModal){
            this.isModal = true;
        }
        else if (dlgInfo.stage == afterDoModal) {
            this.isModal = false;
            if (!this.timerId){
                //Подождем 2 секунды пока проинициализируется SciColorer. 
                this.timerId = createTimer(2000, this, 'onTimer');        
            }
        } 
    }, 

    disconnectOnModal: function() {
        try {
            events.disconnect(windows, "onDoModal", this);
        } catch (e) { }
    }, 

    onTimer:function (Id) {

        se = GetSessionManager();
        if (this.isModal) {
            if (windows.modalMode == msNone)
                this.isModal = false;
        }
        if (!this.isModal){
            se.autoRestoreSession();    
            this.disconnectOnModal();
        } 
        else if (this.isFirstMessage) {
            //Сообщим полезную информацию. 
            try {
                var notify = stdlib.require("NotifySend.js").GetNotifySend();
                notify.Info("Менеджер сессий ждет...", "Открыто модальное окошко,\n как закроешь, запусти вручную восстановление сессии! \n \(если само не восстановиться \)", 5);
                notify = null;        
            } catch(e){}
            this.isFirstMessage = false;
            
        }
        if (!this.timerId)
            return;
        killTimer(this.timerId);
        this.timerId = 0;
        this.timerCount++;
        if (this.timerCount>3){
            this.disconnectOnModal();
        }
    },

    startWatch:function(){
        // Подцепляемся к событию показа модальных окон. Если со временем появится событие подключения к хранилищу,
        // то надо будет делать это в том событии, и после отключаться от перехвата модальных окон.
        events.connect(windows, "onDoModal", this);
        //Подождем 2 секунды пока проинициализируется SciColorer. 
        this.timerId = createTimer(2000, this, 'onTimer');

    }
})

var first = new FirstRunSession();

events.connect(Designer, "beforeExitApp", GetSessionManager());
////}
