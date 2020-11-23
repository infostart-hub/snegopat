//engine: JScript
//uname: mdNavigator
//dname: Навигатор по метаданным
//descr: Скрипт для быстрого поиска метаданных.
//author: Евгений JohnyDeath Мартыненков, orefkov, Сосна Евгений <shenja@sosna.zp.ua>
//help: inplace
//addin: vbs
//addin: global
//addin: stdlib

stdlib.require('SyntaxAnalysis.js', SelfScript);
stdlib.require('TextWindow.js', SelfScript);
stdlib.require('ScriptForm.js', SelfScript);
stdlib.require('SettingsManagement.js', SelfScript);
stdlib.require("SelectValueDialog.js", SelfScript);
stdlib.require('log4js.js', SelfScript);
stdlib.require('TextChangesWatcher.js', SelfScript);

global.connectGlobals(SelfScript)


var logger = Log4js.getLogger(SelfScript.uniqueName);
var appender = new Log4js.BrowserConsoleAppender();
appender.setLayout(new Log4js.PatternLayout(Log4js.PatternLayout.TTCC_CONVERSION_PATTERN));
logger.addAppender(appender);
logger.setLevel(Log4js.Level.ERROR);
// // Артур
// var appender2 = new Log4js.FileAppender("w:\\somefile.log"); // file appender logs to C:\\somefile.log
// appender2.setLayout(new Log4js.PatternLayout(Log4js.PatternLayout.TTCC_CONVERSION_PATTERN));
// logger.addAppender(appender2);
// // logger.setLevel(Log4js.Level.DEBUG);
// завершение


// (c) Евгений JohnyDeath Мартыненков
// (c) Александр Орефков
// (c) Сосна Евгений <shenja@sosna.zp.ua>

var form = null
var vtMD = null;
var curMD = null;
var currentFilter = ''
var listOfFilters = v8New("ValueList")
var listOfChoices = []
var fuctionlistview = false
var vtModules = v8New("ValueTable");
vtModules.Колонки.Add("Модуль");
vtModules.Колонки.Add("Наименование");
vtModules.Колонки.Add("Module1C");
var Icons = null;
var ЦветФонаДляМодулейМенеджера = v8New("Цвет", 240, 255, 240);
var treeSubSystems = null;
var subSystemMap = v8New("Map")
var isFilterOnSubSystem = false;
var subSystemFilter = {};
var currentSubSystemFilter = "";
var recursiveSubsystems = false;
var settings; // Хранит настройки скрипта (экземпляр SettingsManager'а).

RowTypes = {
    'ProcGroup'     : 1,
    'FuncGroup'     : 2
}


function walkMdObjs(mdObj, parentName, parentID)
{
    // Получим и покажем класс объекта
    var row = {UUID : mdObj.id}
    if (!parentName.length)
        row.Name = "Конфигурация";
    else {
        row.Name = parentName + mdObj.name;
        parentName = row.Name + ".";
    }

    row.lName = row.Name.toLowerCase();
    row.parentUUID = parentID;
    parentID = row.UUID;
    vtMD.push(row)

    var mdc = mdObj.mdclass;
    // Перебираем классы потомков (например у Документа это Реквизиты, ТабличныеЧасти, Формы)
    for(var i = 0, im = mdc.childsClassesCount; i < im; i++)
    {
        var childClassName = mdc.childClassAt(i).name(1, false)
        //Реквизиты пропустим
        if (childClassName == "Реквизит") {continue}
        var newParentName = parentName + childClassName + ".";
        // Для остального переберем потомков этого класса.
        for(var chldidx = 0, c = mdObj.childObjectsCount(i); chldidx < c; chldidx++){
            var childObject = mdObj.childObject(i, chldidx);
            walkMdObjs(childObject, newParentName, parentID);
        }
    }
}

////////////////////////////////////////////////////////////////////////////////////////
////{ TextWindowsWatcher - отслеживает активизацию текстовых окон и запоминает последнее и переходим по строке.
////

TextWindowsWatcher = stdlib.Class.extend({

    construct : function(LineNo) {
        this.timerId = 0;
        this.lastActiveTextWindow = null;
        this.Line = LineNo;
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
        this.timerId = createTimer(1*300, this, 'onTimer');
    },

    stopWatch : function () {
        if (!this.timerId)
            return;
        killTimer(this.timerId);
        this.timerId = 0;
    },
    
    goToLine : function() {
        if (!this.Line)
            return
        
        wnd = this.getActiveTextWindow()
        if (wnd){
            var LineNo = this.Line;
            var textline = wnd.GetLine(LineNo+1);
            wnd.SetCaretPos(LineNo+2, 1);
            wnd.SetSelection(LineNo+1, 1, LineNo+1, textline.length-1);
        }
    },

    onTimer : function (timerId) {
        var wnd = GetTextWindow();    
        if (wnd){
            this.lastActiveTextWindow = wnd;
            this.goToLine()
        }
        this.stopWatch();
    }
    
}); 
//} end of TextWindowsWatcher class

function readMDtoVT()
{
    logger.info("Старт обхода метаданных")
    if (!curMD)
        curMD = metadata.current;
    vtMD = []
    walkMdObjs(curMD.rootObject, "", "");
    logger.info("Прочитали метаданные, количество "+vtMD.length);
}

function fillTableProcedur(filter)
{
    var isGoToLine = false;
    logger.debug("fillTableProcedur");
    //Определим надо ли нам заполнять таблицу и надо ли вообще ее показывать...
    var curRow = form.ЭлементыФормы.ТаблицаМетаданных.ТекущаяСтрока
    var propsModules = [
    {propName: "Модуль",            title: "Открыть модуль",        hotkey: 13, modif: 0},
    {propName: "МодульОбъекта",     title: "Модуль объекта",        hotkey: 13, modif: 0},
    {propName: "Форма",             title: "Открыть модуль",        hotkey: 13, modif: 0},
    {propName: "МодульМенеджера",   title: "Модуль менеджера",      hotkey: 13, modif: 4},
    {propName: "МодульНабораЗаписей",      title: "Открыть модуль",        hotkey: 13, modif: 0}
    ]
    
    var curency = "1234567890"
    if (filter.length > 0 && curency.indexOf(filter.charAt(0)) !=-1) {
        isGoToLine = true;
        vtModules.Clear();
        
        try {
            lineNo = parseInt(filter);
        } catch(e) {
            lineNo  = 0;
        }
        logger.debug("is go to Line "+isGoToLine + " number "+lineNo)
    }        
    if(curRow && vtModules.Count()==0)
    {
        logger.debug(curRow.UUID);
        var mdObj = findMdObj(curRow.UUID)
        if(mdObj)
        {
            enabled = true;
            // Переберем свойства объекта, и добавим команды для их обработки
            var mdc = mdObj.mdclass
            for(var i = 0, c = mdc.propertiesCount; i < c; i++)
            {
                var mdPropName = mdc.propertyAt(i).name(1);
                for(var k in propsModules)
                {
                    if(propsModules[k].propName == mdPropName)
                    {
                        var text = mdObj.getModuleText(mdPropName);
                        if (!isGoToLine) {
                            
                                parseModule = SyntaxAnalysis.AnalyseModule(text, true);
                                for (var z=0; z<parseModule._vtAllMethods.Count(); z++){
                                    var НоваяСтрока = vtModules.Add();
                                    var RowMethod = parseModule._vtAllMethods.Get(z);
                                    НоваяСтрока.Модуль = mdPropName;
                                    НоваяСтрока.Наименование = RowMethod.Name;
                                    НоваяСтрока.Module1C = RowMethod._method;
                                }

                            
                            } else {
                                lines = text.split('\n');
                                if (lines.length>0){
                                    var НоваяСтрока = vtModules.Add();
                                    НоваяСтрока.Модуль = mdPropName;
                                    НоваяСтрока.Наименование = mdPropName;
                                    
                                    НоваяСтрока.Module1C = {
                                        'StartLine':0,
                                        'IsProc':true
                                    };
                                    
                                    for (var i = 0; i < lines.length; i++) {
                                        
                                        var НоваяСтрока = vtModules.Add();
                                        НоваяСтрока.Модуль = mdPropName;
                                        НоваяСтрока.Наименование = "" + i + " : "+lines[i];
                                        
                                        НоваяСтрока.Module1C = {
                                            'StartLine':i,
                                            'IsProc':true
                                        };
                                        
                                    }
                                    
                            }
                            
                        }

                    }
                }
            }
        }
    }
    
    if (!form.ЭлементыФормы.ТаблицаПроцедур.Visible) {
        form.ЭлементыФормы.ТаблицаПроцедур.Visible = true;
    }
    var filters = filter.split(' ');
    form.ТаблицаПроцедур.clear();
    for (var i=0; i<vtModules.Count(); i++){
        var CurRow = vtModules.Get(i);
        Method = CurRow.Наименование.toLowerCase();
        var needAdd = true;
        if (filter.length>0){
            for(var s in filters)
            {
                if(Method.indexOf(filters[s]) < 0) {
                    needAdd = false
                    break;
                }
            }
        }
        if(!needAdd) continue
        
        var newRow = form.ТаблицаПроцедур.Add();
        newRow.Модуль = CurRow.Модуль;
        newRow.Наименование = CurRow.Наименование;
        newRow.RowNumber = CurRow.Module1C.StartLine;
        newRow.RowType = CurRow.Module1C.IsProc ? RowTypes.ProcGroup : RowTypes.FuncGroup;
    }
    if(form.ТаблицаПроцедур.Количество())
        form.ЭлементыФормы.ТаблицаПроцедур.ТекущаяСтрока = form.ТаблицаПроцедур.Получить(0)
}

// Функция заполнения списка объектов метаданных
// Если есть строка фильтра, выводит объекты, удовлетворяющие фильтру,
// иначе выводит список последних выбранных объектов
function fillTable(newFilter)
{
    currentFilter = newFilter
    if (currentFilter.indexOf(":")!=-1){
        //form.ТаблицаМетаданных.Clear();
        form.ЭлементыФормы.Панель1.ТекущаяСтраница = form.ЭлементыФормы.Панель1.Страницы.Страница2;
    }else {
        form.ЭлементыФормы.Панель1.ТекущаяСтраница = form.ЭлементыФормы.Панель1.Страницы.Страница1;
        form.ТаблицаМетаданных.Clear();
    }
    var mode = ''
    var formTitle = 'Навигатор метаданных';
    if(!currentFilter.length & !isFilterOnSubSystem)
    {
        mode = "Недавно используемые объекты:"
        for(var k in listOfChoices)
        {
            var row = form.ТаблицаМетаданных.Add()
            row.Name = listOfChoices[k].Name
            row.UUID = listOfChoices[k].UUID
        }
        form.ЭлементыФормы.Подсистема.Видимость = false;
    } 
    else
    {
        if (form.ТаблицаМетаданных.Columns.Find("Rate") == undefined){
            var КвалификаторЧисла = v8New("КвалификаторыЧисла", 25, 10, ДопустимыйЗнак.Любой);
            form.ТаблицаМетаданных.Columns.Add("Rate", v8New("ОписаниеТипов", "Число", КвалификаторЧисла));
        }

        if (currentFilter.indexOf(":")!=-1){

            fuctionlistview = true;
            var filters = currentFilter.substr(0, currentFilter.indexOf(":"));
            var filtersProc = currentFilter.substr(currentFilter.indexOf(":")+1);
            //Уже все есть, надо только вызвать нашу функцию. 
            fillTableProcedur(filtersProc);
            return;
        } else {
            var filtersToUpdate = currentFilter.split(' ')
            var filters = new Array();
            
            for(var s in filtersToUpdate)
            { 
                camelString = filtersToUpdate[s];
                logger.debug("string "+camelString+" length "+camelString.length);
                if (camelString.toUpperCase() == camelString){
                    //filters.push(camelString.toLowerCase());
                    for (var i=0; i<camelString.length; i++){
                        logger.trace("chart:"+camelString.charAt(i))
                        filters.unshift(camelString.charAt(i));
                    }

                } else {
                    filters.push(camelString.toLowerCase());
                }
            }

            logger.debug(filters);

            var filtersProc = "";
            fuctionlistview = false;
        }
        
        //var filters = currentFilter.split(' ')
        //var filters = currentFilter.substr(0, cur
        outer: for(var k in vtMD)
        {   
            var lNameLength = 500;
            var maxIndex = 0;
            var rate = 0;
            if (isFilterOnSubSystem){
                if (!subSystemFilter.hasOwnProperty(vtMD[k].UUID) && !subSystemFilter.hasOwnProperty(vtMD[k].parentUUID)){
                    continue;
                }
            }
            var filtersLenth = (!filters.length)?1:filters.length
            var surcharge = lNameLength/filtersLenth;
            for(var s in filters)
            {

                if (filters[s].toUpperCase() == filters[s] ){
                    var index = vtMD[k].Name.indexOf(filters[s]);
                } else {
                    var index = vtMD[k].lName.indexOf(filters[s])    
                }

                
                if (vtMD[k].lName.indexOf('приход')!=-1){
                    logger.trace('search '+filters[s] + 'index '+index + " name "+vtMD[k].Name);
                    logger.trace(filters[s].toUpperCase() + " "+filters[s]);
                    logger.trace(vtMD[k].Name.indexOf(filters[s]));
                }
                
                if( index < 0 && filters[s]!='*') {
                    continue outer
                } else {
                    //Посчитаем рейтинг...
                    percent = (100*index)/lNameLength;
                    if (percent < maxIndex) 
                        rate +=surcharge;
                    rate = rate + percent;
                    maxIndex = percent
                }
            }
            var row = form.ТаблицаМетаданных.Add()
            row.Name = vtMD[k].Name
            row.UUID = vtMD[k].UUID
            row.Rate = rate;
        }
        form.ТаблицаМетаданных.Sort("Rate, Name");
        mode+= (!currentFilter.length)?"":"фильтр '" + currentFilter + "' (" + form.ТаблицаМетаданных.Количество() + " шт.):"
        if (isFilterOnSubSystem){
            form.ЭлементыФормы.Подсистема.Видимость = true;
            form.ЭлементыФормы.Подсистема.Заголовок  = "    "+currentSubSystemFilter+((recursiveSubsystems)?" (рекурсивно)":"");
            formTitle+=" подсистема "+currentSubSystemFilter+((recursiveSubsystems)?" (рекурсивно)":"");
        }
    }
    form.ЭлементыФормы.Режим.Заголовок = mode;
    form.Заголовок = formTitle;
    if(form.ТаблицаМетаданных.Количество())
        form.ЭлементыФормы.ТаблицаМетаданных.ТекущаяСтрока = form.ТаблицаМетаданных.Получить(0)
}

function checkCurrentMetadata() {
    try {
        var t = curMD.rootObject.id;
    } catch (e) {
        curMD = metadata.current;
    }
}

function findMdObj(uuid) {
    checkCurrentMetadata();
    if(uuid == curMD.rootObject.id)
        return curMD.rootObject
    return curMD.findByUUID(uuid);
}

function withSelected(func)
{
    var curRow = form.ЭлементыФормы.ТаблицаМетаданных.ТекущаяСтрока
    if(!curRow)
        return
    for(var rows = new Enumerator(form.Controls.ТаблицаМетаданных.ВыделенныеСтроки); !rows.atEnd(); rows.moveNext())
        func(rows.item().Окно)
}

// Единый метод обработки выбора пользователя.
// Параметром передается функтор, который непосредственно выполняет действие.
function doAction(func)
{
    var isMultiSelect = (form.Controls.ТаблицаМетаданных.ВыделенныеСтроки.Count() > 1)?true:false;
    var curRow = form.ЭлементыФормы.ТаблицаМетаданных.ТекущаяСтрока
    if(!curRow)
        return
    var mdObj = findMdObj(curRow.UUID);
    if(!mdObj)
    {
        //MessageBox("Объект '" + curRow.Name + "' не найден.");
        logger.error("Объект '" + curRow.Name + "' не найден.");
        if (!isMultiSelect)
            return
    }
    // Сохраним текущий фильтр в списке
    if(form.ТекстФильтра.length)
    {
        addToHistory(form.ТекстФильтра);
        
    }
    if (!isMultiSelect){
        // Сохраним текущий объект в списке
        var row = {Name: curRow.Name, UUID: curRow.UUID}
        for(var k in listOfChoices)
        {
            if(listOfChoices[k].UUID == row.UUID)
            {
                listOfChoices.splice(k, 1)
                break
            }
        }
        listOfChoices.unshift(row)
        if(listOfChoices.length > 15)
            listOfChoices.pop()
            
    }
    // Очистим фильтр и закроем форму, указав как результат объект и функтор
    form.ТекстФильтра = ''
    form.ТекущийЭлемент = form.ЭлементыФормы.ТекстФильтра
    var res = {mdObj:mdObj, func:func};
    if (isMultiSelect){
        var res = [];
        for(var rows = new Enumerator(form.Controls.ТаблицаМетаданных.ВыделенныеСтроки); !rows.atEnd(); rows.moveNext()){

            var mdObj = findMdObj(rows.item().UUID);
            
            if(!mdObj)
            {
                //Message("Объект '" + curRow.Name + "' не найден.");
                logger.error("Объект '" + curRow.Name + "' не найден.");
                continue;
            }
            res.push({mdObj:mdObj, func:func});
        }

    }

    fillTable('');
    form.Close(res);
    
    
}

function addToHistory(query) {
        
        if (!query) 
            return;
        
        // Добавляем в историю только если такой поисковой строки там нет.
        if (!listOfFilters){
            listOfFilters = v8New("ValueList");
        }
        var history = listOfFilters;
        if (history.FindByValue(query))
            return;
            
        if (history.Count())
            history.Insert(0, query);
        else
            history.Add(query);
           
        // Не позволяем истории расти более заданной глубины.
        while (history.Count() > 20)
            history.Delete(history.Count() - 1);
    }
// Описание команд для обработки свойств
var propsCommands = [
    {propName: "Модуль",            title: "Открыть модуль",        hotkey: 13, modif: 0},
    {propName: "МодульНабораЗаписей",      title: "Открыть модуль",        hotkey: 13, modif: 0},
    {propName: "Картинка",          title: "Открыть картинку",      hotkey: 13, modif: 0},
    {propName: "Форма",             title: "Открыть форму",         hotkey: 13, modif: 0},
    {propName: "МодульОбъекта",     title: "Модуль объекта",        hotkey: 13, modif: 0},
    {propName: "МодульМенеджера",   title: "Модуль менеджера",      hotkey: 13, modif: 4},
    {propName: "Макет",             title: "Открыть макет",         hotkey: 13, modif: 0},
    {propName: "Права",             title: "Открыть права",         hotkey: 13, modif: 0},
]

// Функция настройки команд для текущего выбранного объекта
function updateCommands()
{
    // Сначала удалим непостоянные команды
    var cmdBar = form.ЭлементыФормы.Команды
    var buttons = cmdBar.Кнопки
    for(var k = buttons.Count() - 7; k > 0; k--)
        buttons.Delete(7)
    // Получим текущую выбранную строку
    var curRow = form.ЭлементыФормы.ТаблицаМетаданных.ТекущаяСтрока
    var enabled = false
    if(curRow)
    {
        var mdObj = findMdObj(curRow.UUID)
        if(mdObj)
        {
            enabled = true;
            // Переберем свойства объекта, и добавим команды для их обработки
            var mdc = mdObj.mdclass
            for(var i = 0, c = mdc.propertiesCount; i < c; i++)
            {
                var mdPropName = mdc.propertyAt(i).name(1);
                for(var k in propsCommands)
                {
                    if(propsCommands[k].propName == mdPropName)
                    {
                        var cmd = buttons.Add(mdPropName, ТипКнопкиКоманднойПанели.Действие,
                            propsCommands[k].title, v8New("Действие", "openProperty"))
                        cmd.СочетаниеКлавиш = stdlib.v8hotkey(propsCommands[k].hotkey, propsCommands[k].modif)
                        cmd.ToolTip = cmd.Description = propsCommands[k].title
                        break
                    }
                }
            }
        }
    }
    buttons.Get(2).Enabled = enabled
    buttons.Get(3).Enabled = enabled
    buttons.Get(5).Enabled = enabled
    buttons.Get(6).Enabled = true;
    buttons.Get(6).Пометка = isFilterOnSubSystem;
    if (vtModules.Count()>0){
        vtModules.Clear();
    }
}

SelfScript.self['macrosОткрыть объект метаданных'] = function()
{
    //debugger
    if(!vtMD)
        readMDtoVT();
    if(!form)
    {

        form = loadFormForScript(SelfScript)
        form.КлючСохраненияПоложенияОкна = "mdNavigator"
        Icons = {
        'Func': form.Controls.PicFunc.Picture,
        'Proc': form.Controls.PicProc.Picture
        }

        // Заполним таблицу изначально
        fillTable('');

    }
    else
        currentFilter = form.ТекстФильтра.replace(/^\s*|\s*$/g, '').toLowerCase()
    
    updateCommands()

    // Будем отлавливать изменение текста с задержкой 300 мсек
    var tc = new TextChangesWatcher(form.ЭлементыФормы.ТекстФильтра, 3, fillTable, false);
    tc.start()
    var wnd = GetTextWindow();    
    if (wnd){
        var selText = wnd.GetSelectedText();
        selText = selText.replace(/^\s*|\s*$/g, '');
        if (selText.length>0){
            if (currentFilter.length==0){
                form.ЭлементыФормы.ТекстФильтра.Значение = selText;
            }
        }
    }

    var res = form.ОткрытьМодально()
    tc.stop()
    if(res){
        // Если что-то выбрали, вызовем обработчик
        logger.info(res);
        var typeName = Object.prototype.toString.call(res);
        if (typeName === '[object Array]') {
            for (var i=0; i<res.length; i++) {
                res[i].func(res[i].mdObj);
            }
        } else if (typeName === '[object Object]') {    

            res.func(res.mdObj)
        }  
    } 
}

function SelectMdUUID(){
    
    var result = [];
    if(!vtMD)
        readMDtoVT();
    if(!form)
    {

        form = loadFormForScript(SelfScript)
        form.КлючСохраненияПоложенияОкна = "mdNavigator"
        Icons = {
        'Func': form.Controls.PicFunc.Picture,
        'Proc': form.Controls.PicProc.Picture
        }

        // Заполним таблицу изначально
        fillTable('');

    }
    else
        currentFilter = form.ТекстФильтра.replace(/^\s*|\s*$/g, '');
    
    updateCommands()

    // Будем отлавливать изменение текста с задержкой 300 мсек
    var tc = new TextChangesWatcher(form.ЭлементыФормы.ТекстФильтра, 3, fillTable)
    tc.start()
    var wnd = GetTextWindow();    
    if (wnd){
        var selText = wnd.GetSelectedText();
        selText = selText.replace(/^\s*|\s*$/g, '');
        if (selText.length>0){
            if (currentFilter.length==0){
                form.ЭлементыФормы.ТекстФильтра.Значение = selText;
            }
        }
    }

    var res = form.ОткрытьМодально()
    tc.stop()
    if(res){
        //debugger;
        // Если что-то выбрали, вызовем обработчик
        logger.info(res);
        var typeName = Object.prototype.toString.call(res);
        if (typeName === '[object Array]') {
            for (var i=0; i<res.length; i++) {
                result[res[i].mdObj.id] = true;
                //res[i].func(res[i].mdObj);
            }
        } else if (typeName === '[object Object]') {    
            result[res.mdObj.id] = true;
            //res.func(res.mdObj)
        }  
    }
    
    return result;
}

SelfScript.self['macrosВыбрать контейнер метаданных для поиска'] = function(){

    choice = v8New("СписокЗначений");
        for(var i = 0, c = metadata.openedCount; i < c; i++)
        {
            var container = metadata.getContainer(i)
            choice.Add(container, container.identifier)
        }

        if(choice.Count() == 0)
        {
            return 
        } else if(choice.Count() == 1){
            choice = choice.Get(0)
        } else {
            choice = choice.ChooseItem("Выберите конфигурацию для поиска");
        }
            
        if(!choice)
            return false; 

        var container = choice.Value
        curMD = container;
        vtMD = null;
        readMDtoVT();
}


/*
 * Обработчики событий формы
 */

// Это для пермещения вверх/вниз текущего выбора
function ТекстФильтраРегулирование(Элемент, Направление, СтандартнаяОбработка)
{
    
    if (form.ЭлементыФормы.Панель1.ТекущаяСтраница == form.ЭлементыФормы.Панель1.Страницы.Страница1){
        var curTableForm = form.ЭлементыФормы.ТаблицаМетаданных;
        var curTable = form.ТаблицаМетаданных;
    } else {
        var curTableForm = form.ЭлементыФормы.ТаблицаПроцедур;
        var curTable = form.ТаблицаПроцедур;
    }
    
    if(!curTableForm.ТекущаяСтрока)
        return
    var curRow = curTable.Индекс(curTableForm.ТекущаяСтрока), newRow = curRow
    
    if(-1 == Направление.val)
    {
        if(curRow != curTable.Количество() - 1)
            newRow++
    }
    else
    {
        if(curRow > 0)
            newRow--
    }
    if(newRow != curRow)
        curTableForm.ТекущаяСтрока = curTable.Получить(newRow)
    СтандартнаяОбработка.val = false
}

// Выбор из списка фильтров
function ТекстФильтраНачалоВыбора(Элемент, СтандартнаяОбработка)
{
    СтандартнаяОбработка.val = false
    if(listOfFilters.Count())
    {
        //var vl = v8New("СписокЗначений")
        //for(var k in listOfFilters)
        //    vl.Add(listOfFilters[k])
        var res = form.ВыбратьИзСписка(listOfFilters, Элемент.val)
        if(res){
            form.ТекстФильтра = res.Значение;

            if (form.ТекстФильтра.length){
                new ActiveXObject("WScript.Shell").SendKeys("{END}");
            }
        }
    }
}

// Изменение текущей строки - обновить команды
function ТаблицаМетаданныхПриАктивизацииСтроки(Элемент)
{
    updateCommands()
}

// Команда "Обновить МД"
function КомандыОбновитьМД(Кнопка)
{
    checkCurrentMetadata();
    readMDtoVT()
    if(currentFilter.length)
        fillTable(currentFilter)
}

// Команда "Открыть в дереве"
function КомандыАктивировать(Кнопка)
{
    doAction(function(mdObj){mdObj.activateInTree()})
}

// Команда "Редактировать"
function КомандыРедактировать(Кнопка)
{
    doAction(function(mdObj){mdObj.openEditor()})
}

function КомандыCaptureIntoCfgStore(Кнопка){
    doAction(function(mdObj){
        try {
            var cfgStore = stdlib.require(env.pathes.addins+"CfgStore.js");
            cfgStore.CaptureIntoCfgStore(mdObj);
        } catch (e){
            Message(""+e.description())
        }
    });
}

function fillSubSystemUUIDRecursive(row){
    if (recursiveSubsystems){
        for (var i=0; i<row.Rows.Count(); i++){
            var curRow = row.Rows.Get(i);
            fillSubSystemUUIDRecursive(curRow);
        }
    }
    var arrayСостав = subSystemMap.Get(row.Имя);
    for (var i=0; i<arrayСостав.Count(); i++){
        var uuid = arrayСостав.Get(i);
        subSystemFilter[uuid]=true;
    }    
}

function КомандыFilterOnSubSystem(Кнопка){
    var selectedRow = null;
    if (!treeSubSystems)
        walkSubSystems();
    if (treeSubSystems.Rows.Count()>0){
        var curRow = treeSubSystems.Rows.Get(0);
        var indent = "";
        var valuelist = v8New("ValueList");
        (function (row,valuelist,indent) {
            for (var i = 0; i<row.Rows.Count(); i++){
                var curRow = row.Rows.Get(i);
                valuelist.Add(curRow, ""+indent+curRow.Имя);

                if (curRow.Rows.Count()>0){
                    arguments.callee(curRow, valuelist, indent+"    ");
                }
            }
        
        })(curRow, valuelist, indent);    

        var dlg = new SelectValueDialogMdNavigator("Какую подсистему желаете отобрать?", valuelist, form.Controls.PicRecursive.Picture);
        dlg.form.sortByName = recursiveSubsystems; //Тут переорпределяем кнопку сортировки по алфавиту на кнопку рекурсивного обхода. 
        
        result = dlg.selectValue(null, currentSubSystemFilter);
        selectedRow = dlg.selectedValue;
        
        recursiveSubsystems = dlg.form.sortByName;
    }
    
    if (!selectedRow){
        isFilterOnSubSystem = false;
        currentSubSystemFilter = "";
    } else{
        subSystemFilter = {};
        currentSubSystemFilter = selectedRow.Имя;
        isFilterOnSubSystem = true;
        fillSubSystemUUIDRecursive(selectedRow);
    }

    if(currentFilter.length)
        fillTable(currentFilter);
    else
        fillTable('');

    updateCommands();
}

// Команда открытия свойств
function openProperty(Кнопка)
{
    var n = Кнопка.val.Name
    if (form.ЭлементыФормы.Панель1.ТекущаяСтраница == form.ЭлементыФормы.Панель1.Страницы.Страница1){
        doAction(function(mdObj){mdObj.editProperty(n)})
    } else {
        var CurRow = form.ЭлементыФормы.ТаблицаПроцедур.ТекущаяСтрока;
        if (CurRow) {
            startTextWindowWather(CurRow.RowNumber);
            var n = CurRow.Модуль;
            if (n=="Форма"){
                doAction(function(mdObj){mdObj.openModule(n.toString())})
            } else {
                doAction(function(mdObj){mdObj.editProperty(n.toString())})
            }
        }
    }
    /*
    doAction(function(mdObj)
    {
        var ep = mdObj.getExtProp(n);
        var file = ep.saveToFile(v8files.open("file://c:\\temp\\test.data", fomOut));
        file.close()
    })
    */
}
// Двойной щелчок по таблице
function ТаблицаМетаданныхВыбор(Элемент, ВыбраннаяСтрока, Колонка, СтандартнаяОбработка)
{
    doAction(function(mdObj){mdObj.activateInTree()})
}

function ТаблицаМетаданныхПриВыводеСтроки(Элемент, ОформлениеСтроки, ДанныеСтроки)
{
    var mdObj = findMdObj(ДанныеСтроки.val.UUID);
    try{ОформлениеСтроки.val.Ячейки.Name.УстановитьКартинку(mdObj.picture)}catch(e){}
}


function ТаблицаПроцедурПриВыводеСтроки(Элемент, ОформлениеСтроки, ДанныеСтроки)
{
    //var mdObj = findMdObj(ДанныеСтроки.val.UUID);
    
    var cell = ОформлениеСтроки.val.Cells.Наименование;
    if (Icons!=null) {
        switch (ДанныеСтроки.val.RowType)
        {
        case RowTypes.FuncGroup:
            cell.SetPicture(Icons.Func);
            break;
        
        case RowTypes.ProcGroup:
            cell.SetPicture(Icons.Proc);
            break;
            
        default:
            break;
        }
    }
    if (ДанныеСтроки.val.Модуль == "МодульМенеджера"){
        ОформлениеСтроки.val.BackColor = ЦветФонаДляМодулейМенеджера;
    }
    //ОформлениеСтроки.val.Ячейки.Name.УстановитьКартинку(mdObj.picture)
}

function startTextWindowWather(line){
    (new TextWindowsWatcher(line)).startWatch();
}

function ТаблицаПроцедурВыбор(Элемент, ВыбраннаяСтрока, Колонка, СтандартнаяОбработка)
{
    
    startTextWindowWather(ВыбраннаяСтрока.val.RowNumber);
    var n = ВыбраннаяСтрока.val.Модуль;
    if (n=="Форма"){
        doAction(function(mdObj){mdObj.openModule(n.toString())})
    } else {
        doAction(function(mdObj){mdObj.editProperty(n.toString())})
    }
    
}

function parseSubSystems (mdObj, row){
        // Получим и покажем класс объекта
        var mdc = mdObj.mdclass;
        //var mdPropName = mdc.propertyAt(0);
        var Имя = toV8Value(mdObj.property(0)).presentation();
        var Состав = toV8Value(mdObj.property("Content")).toStringInternal();
        var newRow = row.Rows.Add();
        newRow.Имя = ""+Имя;
        var arrayСостав = v8New("Array");
        //newRowContent = newRow.Rows.Add();
        arrayСостав.Add(mdObj.id);
        //newRowContent.Состав = mdObj.id; //Добавим самих себя в состав.
        var listUUID = v8New("ValueList");
        var re = new RegExp(/\{"#",157fa490-4ce9-11d4-9415-008048da11f9,\n\{1,(\w{8}-\w{4}-\w{4}-\w{4}-\w{12})\}/igm);
        while ((matches = re.exec(Состав)) != null){
            arrayСостав.Add( "{"+matches[1].toUpperCase()+"}");
            //newRowContent = newRow.Rows.Add();
            //newRowContent.Состав = "{"+matches[1].toUpperCase()+"}";
        }
        subSystemMap.Insert(newRow.Имя, arrayСостав);
        
        // Перебираем классы потомков (например у Документа это Реквизиты, ТабличныеЧасти, Формы)
        for(var i = 0; i < mdc.childsClassesCount; i++)
        {
            var childMdClass = mdc.childClassAt(i)
            
            for(var chldidx = 0, c = mdObj.childObjectsCount(i); chldidx < c; chldidx++)
                parseSubSystems(mdObj.childObject(i, chldidx), newRow)
        }
}

function walkSubSystems(){
        
    var md = curMD;
    treeSubSystems = v8New("ValueTree");
    treeSubSystems.Columns.Add("Имя");
    if (!md){
        return;
    }

        try{
            if(md.rootObject.childObjectsCount("Подсистемы") > 0)
                var newRow = treeSubSystems.Rows.Add();
                newRow.Имя = "Подсистемы";
                var mdObj = md.rootObject;
                for(var i = 0, c = mdObj.childObjectsCount("Подсистемы"); i < c; i++){
                    mdSubs = mdObj.childObject("Подсистемы", i);
                    parseSubSystems(mdSubs, newRow);
                }
                
        }catch(e){
           Message("Не удалось распарсить подсистемы"+e.description);
        }
        //return tree;
}

SelectValueDialogMdNavigator = SelectValueDialog.extend({
    //Меняем картинку у кнопки SortByName и в дальнейшем в логике учитываем ее как recursiveSubsystems
    construct : function (caption, values, pic) {
        this._super(caption, values);
        if (pic == undefined) pic = null
        this.pic = pic; //Сюда передаем картинку. 
    },

    selectValue: function (values, currentFilter) {
        if (!this.pic){

        } else {
            try{
                this.form.Controls.CmdBar.Buttons.SortByName.Picture = this.pic;    
            } catch (e) {}
        }
        var currSearch = this.form.DoNotFilter;
        this.form.DoNotFilter = true;
        this.updateList(currentFilter);
        this.form.DoNotFilter = currSearch;
        this.form.Controls.CmdBar.Buttons.SortByName.ToolTip = "Рекурсивно обходить все вложенные подсистемы";
        this._super(values);
    },

    sortValuesList: function (sortByName, vt) {
        if (!vt) {
            vt = this.form.ValuesList;
        }
        vt.Sort('Order');
    }

})

SelfScript.self['macrosНастройка фильтра для подсистем'] = function(){
    var values = v8New('СписокЗначений');
    values.Add(1, 'Отбирать состав только текущей подсистемы');
    values.Add(2, 'Рекурсивно обходить дерево подсистем');
    var dlg = new SelectValueDialog("Выберете вариант фильтра по подсистеме!", values);
    if (dlg.selectValue()) {
        settings.current.recursiveSubsystems = (dlg.selectedValue==2)?true:false;
        recursiveSubsystems = settings.current.recursiveSubsystems;
        settings.SaveSettings();                        
    }    
}


/* Возвращает название макроса по умолчанию - вызывается, когда пользователь 
дважды щелкает мышью по названию скрипта в окне Снегопата. */
function getDefaultMacros()
{
    return 'Открыть объект метаданных';
}

// Создадим макросы для открытия модулей конфигурации
(function()
{
    var mdObj = metadata.current.rootObject
    var mdc = mdObj.mdclass
    for(var i = 0, c = mdc.propertiesCount; i < c; i++)
    {
        var mdProp = mdc.propertyAt(i)
        if(mdObj.isPropModule(mdProp.id))
        {
            var descr = mdProp.description.split('\n')[0].toLowerCase()
            SelfScript.self["macrosОткрыть " + descr] = new Function('metadata.current.rootObject.openModule("' + mdProp.id + '")')
        }
    }
})()
logger.info('Чтение настроек. ');
settings = SettingsManagement.CreateManager('mdNavigator', { 'listOfFilters': v8New('ValueList'), 'recursiveSubsystems': false}, pflBase);
settings.LoadSettings();

logger.info(settings.current);

listOfFilters = settings.current.listOfFilters;
recursiveSubsystems = settings.current.recursiveSubsystems;
function beforeExitApp(){
    settings.current.listOfFilters = listOfFilters;
    settings.current.recursiveSubsystems = recursiveSubsystems;

    settings.SaveSettings();
}

events.connect(Designer, "beforeExitApp", SelfScript.self);
