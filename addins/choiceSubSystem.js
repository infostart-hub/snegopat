//engine: JScript
//uname: choiseSubSystem
//dname: Выбрать подсистему
//addin: stdlib
//addin: hotkeys hk
//addin: stdcommands
//addin: vbs

// (c) Сосна Евгений <shenja@sosna.zp.ua>
// (c) Александр Орефков <orefkov@gmail.com>
// Скрипт позволяет быстрее выбрать нужную подсистему при отборе по подсистемам

//dem Исправил шапку, обернул в try{} строчку кода, где выпадала ошибка, что Объект не поддерживает метод или свойство

/// <reference path="./snegopat.d.ts" />
/// <reference path="./v8.d.ts" />

//import * as stdlib from "./std/std";
//import * as stdcommands from "./std/commands";
//import * as hk from "./std/hotkeys";

stdlib.require("SelectValueDialog.js", SelfScript);
stdlib.require('SettingsManagement.js', SelfScript);
global.connectGlobals(SelfScript);

////////////////////////////////////////////////////////////////////////////////////////
////{ Макросы
////

SelfScript.self['macrosНастройка'] = function() {
    var sm = GetSubSystemFilter();
    sm.changeSettings();
    return true;
}

// Макросы для возможности повесить команду отбора подсистем на хоткей
SelfScript.self['macrosВключить отбор по подсистемам']  = function() { return activateSubSystemSelect(false) }
SelfScript.self['macrosОтключить отбор по подсистемам'] = function() { return activateSubSystemSelect(true)  }
// Макросы начинающиеся с _ не показываются в списке диалога макросов
// Но нужны, чтобы повесить их на хоткеи в диалоге
SelfScript.self['macros_FindSubSystem'] = function() { GetSubSystemFilter().findSubSystem() }
SelfScript.self['macros_ToggleChilds']  = function() { GetSubSystemFilter().toggleCheckChilds() }
SelfScript.self['macros_ToggleParents'] = function() { GetSubSystemFilter().toggleCheckParents() }

// Функция для посылания команды отбора по подсистемам
// Посылать эту команду в основное окно бесполезно, надо именно
// в то окно, которое может ее обработать
function activateSubSystemSelect(bForClear)
{
    var mdTreeView = null
    // Получим активное окно
    var view = windows.getActiveView()
    if(view)
    {
        // Проверим, обрабатывает ли окно команду отключения отбора подсистем
        var state = stdcommands.Frntend.SelectSubSystem.getState(view)
        if(state && state.enabled)
            mdTreeView = view
    }
    if(!mdTreeView)
    {
        // Активное окно не обрабатывает команду отключения отбора подсистем
        // Значит, надо активировать окно конфигурации, если она открыта
        if(stdlib.isConfigOpen())
        {
            stdcommands.Config.Window.send()
            mdTreeView = windows.getActiveView()
        }
        else
            return false// Конфигурация не открыта, нечего и отбирать
    }
    if(bForClear)
        GetSubSystemFilter().DisableSelection = true
    stdcommands.Frntend.SelectSubSystem.sendToView(mdTreeView)
    if(view.id != mdTreeView.id)
        view.activate()
    return true
}

/* Возвращает название макроса по умолчанию - вызывается, когда пользователь 
дважды щелкает мышью по названию скрипта в окне Снегопата. */
function getDefaultMacros() {
    return 'Настройка';
}

////} Макросы

SubSystemFilter = stdlib.Class.extend({
    settingsRootPath : 'subSystemFilter',
    defaultSettings : {
            LastChoices: undefined,
            MaxLastChoices: 5
    },

    construct : function () {    
        this.settings = SettingsManagement.CreateManager(this.settingsRootPath, this.defaultSettings);
        this.loadSettings();
        SubSystemFilter._instance = this;
    },

    loadSettings:function(){
        this.settings.LoadSettings();
        if(!this.settings.current.LastChoices)
            this.settings.current.LastChoices = v8New("СписокЗначений")
        events.connect(windows, "onDoModal", this)
    },

    changeSettings : function(){
        var s = this.settings.current
        vbs.result = s.MaxLastChoices
        if(vbs.DoEval('InputNumber(result, "Максимальный размер быстрого списка", 1, 0)'))
        {
            s.MaxLastChoices = vbs.result
            var cnt = s.LastChoices.Count()
            while(cnt > s.MaxLastChoices)
                s.LastChoices.Delete(--cnt)
            this.settings.SaveSettings()
        }
    },
	
	inFinalOpen: 0,

    onDoModal:function(dlgInfo){
        //7OH
        var reCaptionCfgStore = /Отбор\sпо\sподсистемам/ig
        if (!reCaptionCfgStore.test(dlgInfo.Caption))
            return;
		//debugger

		try{ 
            var form = dlgInfo.form
            var treeSubSystem   = form.getControl('eMDTreeCtrl')
            var checkParents    = form.getControl('eParentCheck')
            var checkChilds     = form.getControl('eChildCheck')
        }catch(e)   { 
			Message(e.description);
			return
		}
        // Если это не диалог отбора подсистем, то сюда уже не попадем
        if(dlgInfo.stage == afterInitial)
        {
			this.inFinalOpen = 0;
            if(this.DisableSelection)
            {
                delete this.DisableSelection
                // Это мы открыли окно диалога для отключения отбора
                // Имитируем нажатие кнопки "Отключить"
                //form.sendEvent(form.getControl('eClear').id, 0)
				// С версии 8.3.16.1359 так делать нельзя, и посылать команды нажатия кнопок диалога
				// можно только после открытия окна.
				this.inFinalOpen = 1;
                return
            }
            // Вытащим список подсистем
            var subSystemList = this.fillSubSystemList(treeSubSystem)
            // Запросим ввод нашим списком
			
            var result = this.filterDialog(subSystemList)
            if(!result)    // Нажали отмену
			{        
				dlgInfo.cancel = true;
                dlgInfo.result = 0;
                return
            }
            
			// Если просто нажали Ок, то результат будет строка грида
            // иначе результат будет объект с полями mode и val
			
		   // почему то перестало работать !result.mode - падает с ошибкой "объект не поддерживает этот метод или свойство".
		   // пришлось завернуть в попытку
		   try{
				if (!result.mode)
					result = {mode:0, row: result}
		   } catch (e) {result = {mode:0, row: result} }
		   
            if(result.mode != 5)    // Не "Открыть стандартный"
            {
                if(result.mode == 4)    // Отключить
                {
                    //form.sendEvent(form.getControl('eClear').id, 0)
					this.inFinalOpen = 1;
                    return
                }
                // Тут осталось с выбором. Ставим галочки если надо
                checkParents.value  = (result.mode & 1) != 0    // С родителями
                checkChilds.value   = (result.mode & 2) != 0    // С потомками
                
                var grid = treeSubSystem.extInterface
                // Снимаем метки со всех подсистем
                var root = grid.dataSource.root.firstChild
                grid.currentRow = root
                grid.checkCell(root, 0, 0)
				
                // Активируем строку
                grid.currentRow = result.row
                // Ставим пометку на выбранной подсистеме
                grid.checkCell(result.row, 0, 1)
				form.sendEvent(treeSubSystem.id, 17, 1)
                this.saveChoice(result.row)
                // Нажмем Ok - перенесем в обработку открытия окна диалога
                // form.sendEvent(form.getControl('eOK').id, 0)
				this.inFinalOpen = 2;
                return
            }
            // Сюда попадаем, если выбрали "Открыть стандартный"
            // Запомним контролы и список для работы макросов
			this.data = {subSystemList: subSystemList, form: form, treeSubSystem: treeSubSystem,
                checkParents: checkParents, checkChilds: checkChilds}
            // TODO Артур - в 2.0.2.0 не работает hotkeys.addTemp, и ххх.props всегда пусто :(
            // this.hotKeys  = [
            //     hotkeys.addTemp(hk.codeFromString('Ctrl+F'), SelfScript.uniqueName, "_FindSubSystem"),
            //     hotkeys.addTemp(hk.codeFromString('Ctrl+Q'), SelfScript.uniqueName, "_ToggleChilds"),
            //     hotkeys.addTemp(hk.codeFromString('Ctrl+W'), SelfScript.uniqueName, "_ToggleParents")
            // ]
            // checkChilds.props.setValue("Заголовок", stdlib.LocalWString("Включать объекты подчиненных подсистем (Ctrl + Q)"))
            // checkChilds.props.setValue("Подсказка", stdlib.LocalWString("Ctrl + Q"))
            // checkChilds.props.setValue("Положение заголовка", 1)
            // checkParents.props.setValue("Заголовок", stdlib.LocalWString("Включать объекты родительских подсистем (Ctrl + W)"))
            // checkParents.props.setValue("Подсказка", stdlib.LocalWString("Ctrl + W"))
            // checkParents.props.setValue("Положение заголовка", 1)
            // treeSubSystem.props.setValue("Подсказка", stdlib.LocalWString("Для поиска подсистемы нажмите Ctrl + F"))
		} else if (dlgInfo.stage == openModalWnd) {
			// Окно диалога открылось, если нужно, пошлем команду нажатия нужной кнопки
			if (this.inFinalOpen == 1)
				form.sendEvent(form.getControl('eClear').id, 0)
			else if (this.inFinalOpen == 2)
				form.sendEvent(form.getControl('eOK').id, 0);
        } else if(dlgInfo.stage == afterDoModal) {
            for(var k in this.hotKeys)
                hotkeys.removeTemp(this.hotKeys[k])
            delete this.hotKeys
            delete this.data
        }
    },
    // Функция при открытии диалога отбора подсистем заполняет наш список значений с подсистемами,
    // вытаскивая их состав из грида на форме
    fillSubSystemList: function(treeSubSystem) {
        // Заполним список подсистем
        var valuelist = v8New("СписокЗначений");
        var lastChoices = this.settings.current.LastChoices
        var hotPos = [];
        (function forAllRows(parent, indent, fullPath)
        {
            for(var row = parent.firstChild; row; row = row.next)
            {
                var name = row.getCellAppearance(0).text
                valuelist.Add(row, indent + name);
                var fullName = fullPath + (fullPath.length ? "." : "") + name
                var found = lastChoices.FindByValue(fullName)
                if(found)
                    hotPos.push({idx: lastChoices.IndexOf(found), name: fullName, row: row})
                forAllRows(row, indent + '    ', fullName)
            }
        })(treeSubSystem.extInterface.dataSource.root, '', '')
        if(hotPos.length)
        {
            hotPos.sort(function(a, b){return a.idx - b.idx})
            for(var k in hotPos)
                valuelist.Insert(k, hotPos[k].row, hotPos[k].name);
        }
        return valuelist
    },
    filterDialog: function(subSystemList){
        function makeButton(id, text, tooltip, hotkey, modif, mode) {
            return {
                id:id,
                handler: function(dlg, val, btn){if(val || btn.Name.charAt(0)=='e') dlg.form.Закрыть({mode: mode, row:val})},
                params: {Text: text, ToolTip:tooltip, Description: tooltip, Shortcut: stdlib.v8hotkey(hotkey, modif)}
            }
        }
        var dlg = new SelectValueDialog("Какую подсистему желаете отобрать?", subSystemList);
        dlg.AddCmdButton([
            {id:'>', params: {Text: 'Дополнительно'}, buttons:
                [
                    makeButton('withParents', "С родителями", "Выбрать подсистему и включить объекты родительских подсистем", 13, 4/*"Shift+Enter"*/, 1),
                    makeButton('withChilds', "С потомками", "Выбрать подсистему и включить объекты подчинённых подсистем", 13, 16/*"Alt+Enter"*/, 2),
                    makeButton('withPC', "С родителями и потомками", "Выбрать подсистему и включить объекты подчинённых и родительских подсистем", 13, 20, 3),
                    makeButton('eClear', "Отключить", "Отключить отбор подсистем", 'Z'.charCodeAt(0), 8/*Ctrl + Z*/, 4)
                ]
            },
            makeButton('eStd', "Открыть стандартный", "Открыть стандартный диалог для отбора нескольких подсистем", 0x25, 8, 5),
            {id:'|'}
            ])
		
		return dlg.selectValue() ? dlg.selectedValue : null;
    },
    findSubSystem: function () {
        if(!this.data)
            return
        var dlg = new SelectValueDialog("Какую подсистему желаете отобрать?", this.data.subSystemList);
        if(dlg.selectValue())
        {
            var row = dlg.selectedValue
            var grid = this.data.treeSubSystem.extInterface

            // Активируем строку
            grid.currentRow = row
            // Ставим пометку на выбранной подсистеме
            grid.checkCell(row, 0, 1)

			this.data.form.sendEvent(this.data.treeSubSystem.id, 17, 1)
			
            this.saveChoice(row)
        }
    },
    toggleCheckParents: function()
    {
        if(this.data)
            this.data.checkParents.value = !this.data.checkParents.value
    },
    toggleCheckChilds: function()
    {
        if(this.data)
            this.data.checkChilds.value = !this.data.checkChilds.value
    },
    // Сохранение выбранной подсистемы в списке недавно выбранных
    saveChoice: function(row)
    {
        // Для начала сформируем полное имя подсистемы
        var fullName = ""
        while(row)
        {
            fullName = row.getCellAppearance(0).text + (fullName.length ? "." : "") + fullName
            row = row.parent
        }
        var vl = this.settings.current.LastChoices
        // Теперь надо вставить полученную строку в начало списка.
        // Если она уже есть, сдвинем ее
        var found = vl.FindByValue(fullName)
        if(found)
        {
            var idx = vl.IndexOf(found)
            if(0 != idx) {
                vl.Move(idx, -idx)
                this.settings.SaveSettings()
            }
            return
        }
        vl.Insert(0, fullName)
        if(vl.Count() > this.settings.current.MaxLastChoices)
            vl.Delete(this.settings.current.MaxLastChoices)
        this.settings.SaveSettings()
    }
})

function GetSubSystemFilter() {
    if (!SubSystemFilter._instance)
        new SubSystemFilter();
    
    return SubSystemFilter._instance;
}

var cht = GetSubSystemFilter();
