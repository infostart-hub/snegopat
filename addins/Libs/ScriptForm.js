$engine JScript
$uname ScriptFormClass
$dname Класс ScriptForm
$addin stdlib

////////////////////////////////////////////////////////////////////////////////////////
////{ Cкрипт-библиотека ScriptForm (ScriptForm.js) для проекта "Снегопат"
////
//// Описание: Базовый класс ScriptForm для наследования при реализации
//// форм скрипта. Поддерживает автоматическое назначение обработчиков событий
//// формы и элементов управления формы. Пример использования см. в скрипте
////    Tests\ScriptFormExample\ScriptFormClassExample.js
////
//// Классы, наследующие от ScriptForm сами могут быть использованы в качестве
//// родителей. При этом будут унаследованы все обработчики событий из родительского
//// класса, если их не переопределить в дочернем.
////
//// Автор: Александр Кунташов <kuntashov@gmail.com>, http://compaud.ru/blog
////}
////////////////////////////////////////////////////////////////////////////////////////

ScriptForm = stdlib.Class.extend({

    //{ Свойства
    
    // Отключить автоназначение обработчиков событий.
    disableAutoEvents: false,
    
    // Путь к сохраняемым настройкам в хранилище настроек.
    settingsRootPath : '',
    
    /* Настройки: сохраняемые реквизиты формы.
    Ключ - имя значение перечисления ProfileStoreType, тип хранилища, 
    в котором хранить настройки. Значение - ассоциативный массив. 
    Ключ - имя реквизита формы, который сохранять. 
    Значение - значение настройки по умолчанию. */
    settings : {
        //pflSnegopat: {/* FormPropName : DefaultValue, ... */},
        //pflBase: {},
        //pflBaseUser: {},
        //pflCompBase: {},
        //pflCompBaseUser: {},
        //pflComputer: {},
        //pflSeanse: {}
    },

    //} Свойства

    construct: function (formPath) {

	    this.form = null;
    	this.handlers = {};
        
        this.loadForm(formPath);        
    },
    
    show: function (modal) {
        return modal ? this.form.DoModal() : this.form.Open();
    },    
        
    close: function (retVal) {
        if (this.isOpen())
            this.form.Close(retVal);
    },
        
    isOpen: function () {
        return this.form.IsOpen();
    },
        
    addHandler: function (eventName, handler) {
    
        if (!this.hasEventHandler(eventName))
            this.initEvenHandler(eventName);            
        
        this.handlers[eventName].push(handler);
    },
    
    fireEvent : function (eventName, eventArgs) {
    
        if (!this.hasEvent(eventName))
            this.throwError('Неизвестное имя события: ' + eventName + '!');
    
        this.fire(eventName, eventArgs);
    },

    hasEvent : function (eventName) {
        return !!ScriptForm.FORM_EVENTS[eventName];
    },
    
    throwError: function (error) {
        Message(error);
        throw new Error(error);
    },
   
    // Возвращает маccив всех кнопок коммандной панели с заданным именем.
    // При поиске кнопки командной панели кешируются, чтобы повторный поиск
    // кнопок в этой же командной панели выполнялся максимально быстро.
    getCommandBarButtonsByName: function(cmdBar, btName) {
 
        // Если ни одной командной панели еще не обрабатывалось, то 
        // проинициализируем кэш кнопок командных панелей.
        if (!this._cmdBarsCache)
            this._cmdBarsCache = {};
            
        // Если командная панель обрабатывается впервые, 
        // то заполним кэш кнопок этой командной панели.
        if (!this._cmdBarsCache[cmdBar.Name]) {
     
            // Чтобы не импортировать весь глобальный контекст.
            var CommandBarButtonType = globalContext("{D041F9A0-476B-4558-8EFC-D895DC695E72}").CommandBarButtonType;
            
            // Рекурсивно кэширует кнопки командной панели в ассоциативном массиве
            // со следующей структурой:
            //  { ИмяКнопки => [Массив кнопок с одинаковым именем], ... }
            function fillBtCache(buttons, cache) {
                for (var i=0; i<buttons.Count(); i++) 
                {
                    var bt = buttons.Get(i);
                    if (bt.ButtonType == CommandBarButtonType.Action) 
                    {
                        if (!cache[bt.Name])
                            cache[bt.Name] = new Array();
                        cache[bt.Name].push(bt);
                    }
                    else if (bt.ButtonType == CommandBarButtonType.Popup)
                    {
                        fillBtCache(bt.Buttons, cache);
                    }
                }
                return cache;
            }
            
            this._cmdBarsCache[cmdBar.Name] = fillBtCache(cmdBar.Buttons, {});
        }
        
        return this._cmdBarsCache[cmdBar.Name][btName];            
    },
   
    //{ Чтение/сохранение сохраняемых значений (реквизитов формы).
    hasSettings : function () {
        return this.settingsRootPath && this.settings;
    },
    
    loadSettings : function () {
        
        if (!this.hasSettings())
            return false;
			
		var _reuseDefaults = false; // Пока так обходим неприятный баг с настройками.
        if (!this._defaultSettings) {
        	this._defaultSettings = {};			
        	for(var prop in this.settings) {
	        	if (this.settings[prop].DefaultSettings) { 
					this._defaultSettings[prop] = this.settings[prop].DefaultSettings
					_reuseDefaults = true;
				}
				else {
					this._defaultSettings[prop] = this.settings[prop];
				}
        	}
        }
		
		if (_reuseDefaults) {
			this.settings = this._defaultSettings;
		}
		            
        var sm = stdlib.require('SettingsManagement.js').SettingsManagement;
        for (var pflType in this._defaultSettings) 
        {
            var defaults = this._defaultSettings[pflType];
            // Имя ключа = строка - имя значения перечисления. Выполняя строку получаем необходимое значение. 
            var pflTypeValue = eval(pflType);
					
            var settings = sm.CreateManager(this.settingsRootPath, defaults, pflTypeValue);
            
            settings.LoadSettings();
            if (this.form)
                settings.ApplyToForm(this.form);            
    
            this.settings[pflType] = settings;
        }
        
        return true;
    },
    
    saveSettings : function () {
        
        if (!this.hasSettings())
            return false;
        
        for (var pflType in this.settings)
        {
            settings = this.settings[pflType];
            settings.ReadFromForm(this.form);
            settings.SaveSettings();
        }
        
        return true;
    },
	
	restoreDefaultSettings: function () {
		this.settings = this._defaultSettings;
	},
    //} Чтение/сохранение сохраняемых значений (реквизитов формы).
    
    //{ Приватные методы
    loadForm: function (path) {
        this.form = loadScriptForm(path, this);
        // Автоматически подключим обработчики событий.
        if (!this.disableAutoEvents) 
        {
            // Автоматически подключаем обработчики событий формы.
            // Метод объекта считается обработчиком события формы, если
            // его имя имеет форму Form_ИмяСобытия.
            for (var event in ScriptForm.FORM_EVENTS) 
            {
                if (typeof this['Form_' + event] == 'function') 
                {
                    this.initEvenHandler(event);
                    this.handlers[event].push(this['Form_' + event]);
                }   
            }
      
            // Автоматически подключаемся к обработчикам событий элементов формы.
            // Метод объекта считается обработчиком события элемента формы, если
            // его имя имеет форму ИмяЭлементаУправления_ИмяСобытия.
            // Имена обработчиков событий элементов управления колонок табличного 
            // поля должны иметь имя вида ИмяТабличногоПоля_ИмяКолонки_ИмяСобытия.
            // Имена обработчиков событий нажатия кнопок командной панели 
            // должны формироваться в виде ИмяКоманднойПанели_ИмяКнопки.
            for(var fname in this) 
            {
                if (typeof this[fname] == 'function')
                {
                    var matches = fname.match(/([^_]+?)_([^_]+)(?:_(.+))?/);
                    if (matches && matches[1] && matches[1] != 'Form') 
                    {
                        var ctrl = this.form.Controls.Find(matches[1]);
                        if (ctrl && !matches[3])
                        {
                            var tName = toV8Value(ctrl).typeName();
                            if (tName == 'КомманднаяПанель' || tName == 'CommandBar') 
                            {
                                // Обработчик нажатия кнопки командной панели (ИмяКоманднойПанели_ИмяКнопки).
                                var buttons = this.getCommandBarButtonsByName(ctrl, matches[2]);
                                if (buttons) { 
                                    var action = v8New('Action', fname);
                                    for (var i=0; i<buttons.length; i++) 
                                    {
                                        // По непонятной причине при установке свойства Action 
                                        // возникает исключение "Объект не поддерживает это свойство или метод",
                                        // но свойство все равно устанавливается, поэтому для обхода проблемы
                                        // исключение проглатываем.
                                        try {
                                            buttons[i].Action = action;
                                        } catch(e){ /*Message(e.description);*/}
                                    }
                                }
                            }
                            else
                            {
                                // Событие элемента управления на форме (ИмяЭлементаУправления_ИмяСобытия).
                                ctrl.SetAction(matches[2], v8New('Action', fname));                            
                            }
                        }
                        else if (ctrl)
                        {
                            // Событие элемента управления колонки табличного поля (ИмяТабПоля_ИмяКолонки_ИмяСобытия).
                            var col = ctrl.Columns.Find(matches[2]);
                            col.Control.SetAction(matches[3], v8New('Action', fname));
                        }
                    }
                }
            }

        }
    },
    
    hasEventHandler : function (eventName) {
        return this.hasEvent(eventName) && this.handlers && this.handlers[eventName];
    },
    
    initEvenHandler : function (eventName) {
        
        if (!this.hasEvent(eventName))
            this.throwError('Неизвестное имя события: ' + eventName + '!');
                        
        var ed = ScriptForm.FORM_EVENTS[eventName];
        
        // Генерируем программный код, создающий проксирующий обработчик события формы вида
        // new Function("a0", "a1", "this.fire(\"BeforeOpen\", arguments)");        
        var ff = 'new Function(';        
        for (var i=0; i<ed.args.length; i++)
            ff += '"a' + i.toString() + '",';
        ff += '"this.fire(\\\"' + eventName + '\\\", arguments)");';
        
        // Создаем проксирующий обработчик события нашей формы
        // и устанавл
        // иваем в качестве обработчика события.
        
        this[this.hName(eventName)] = eval(ff);
                
        this.handlers[eventName] = new Array();        
        this.form.SetAction(eventName, v8New('Action', this.hName(eventName)));
        
    }, 

    hName: function (eventName) {
        return '__' + eventName;
    },
      
    fire: function (eventName, eventArgs) {
        // Вызываем все обработчики, подписанные на событие.
        for (var i=0; i<this.handlers[eventName].length; i++)
            this.handlers[eventName][i].apply(this, eventArgs);    
    }    
    //} Приватные методы    
});

// static
ScriptForm.FORM_EVENTS = {
    // ПередОткрытием(Отказ, СтандартнаяОбработка)
    BeforeOpen: { args: ['Отказ', 'СтандартнаяОбработка'] },
    
    // ПриОткрытии()
    OnOpen: { args: [] },
    
    // ПриПовторномОткрытии(СтандартнаяОбработка)
    OnReopen: { args: ['СтандартнаяОбработка'] },
    
    // ОбновлениеОтображения()
    RefreshDisplay: { args: [] },
    
    // ПередЗакрытием(Отказ, СтандартнаяОбработка)
    BeforeClose: { args: ['Отказ', 'СтандартнаяОбработка'] },
    
    // ПриЗакрытии()
    OnClose: { args: [] },
    
    // ОбработкаВыбора(ЗначениеВыбора, Источник)
    ChoiceProcessing: { args: ['ЗначениеВыбора', 'Источник'] },
    
    // ОбработкаАктивизацииОбъекта(АктивныйОбъект, Источник)
    ObjectActivationProcessing: { args: ['АктивныйОбъект', 'Источник'] },
    
    // ОбработкаЗаписиНовогоОбъекта(Объект, Источник) 
    NewObjectWriteProcessing: { args: ['Объект', 'Источник'] },

    // ОбработкаОповещения(ИмяСобытия, Параметр, Источник)
    NotificationProcessing: { args: ['ИмяСобытия', 'Параметр', 'Источник'] },

    // ОбработкаВнешнегоСобытия(Источник, Событие, Данные)
    ExternalEvent: { args: ['Источник', 'Событие', 'Данные'] },

    // ОбработкаПроверкиЗаполнения(Отказ, ПроверяемыеРеквизиты)
    FillCheckProcessing: { args: ['Отказ', 'ПроверяемыеРеквизиты'] },

    // ПриСменеСтраницы(ТекущаяСтраница)
    OnCurrentPageChange: { args: ['ТекущаяСтраница'] }    
}
