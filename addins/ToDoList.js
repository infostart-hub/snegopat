//engine: JScript
//uname: ToDoList
//dname: Список задач
//addin: global
//addin: stdlib

stdlib.require('ScriptForm.js', SelfScript);
global.connectGlobals(SelfScript);

////////////////////////////////////////////////////////////////////////////////////////
////{ Cкрипт "Список задач" (ToDoList.js) для проекта "Снегопат"
////
//// Описание: Реализует возможность ведения списка задач, с возможностью использования 
//// активной задачи в скрипте Авторские комментарии
//// Управление задачами  осуществляется перетаскиванием элементов.
//// Элементы в ветке "Корзина" - не сохраняются между сеансами
//// 
//// Автор: Яковлев Родион. <brad@nm.ru>
////}
////////////////////////////////////////////////////////////////////////////////////////

SelfScript.self['macrosПоказать/скрыть задачи'] = function() {
	
	var varWnd = GetToDoListForm();
		
	if (varWnd.isOpen()) {
		
		varWnd.close();		
	} else {		
		
		varWnd.show();
	}
	
}

/* Возвращает название макроса по умолчанию - вызывается, когда пользователь 
дважды щелкает мышью по названию скрипта в окне Снегопата. */
function getDefaultMacros() {
	
    return 'Показать/скрыть задачи';
}

RowTypes = {
    'Active'  		: 0, 
    'Curent'     	: 1,
    'Сompleted'     : 2    
}

ToDoListForm = ScriptForm.extend({

    // disableAutoEvents: false,
	pflCurTask:  'Задачи/ТекущаяЗадача',
	pflTbTasks:  'Задачи/СписокЗадач',
	brCurent: null,
	brActive: null,
	brСompleted: null,	
	brRecycle: null,	
	tbTasks: null,
	inEdit: false,

    construct: function() {
		this._instance = null;
        this._super(SelfScript.fullPath.replace(/js$/, 'epf|Форма'));
		
		ToDoListForm._instance = this;
		
		tbTasks = null;
		
    },	
	
	setCurentTask: function () {
		
		var s = v8New("Структура","Задача,Описание","","");
		
		if (this.brCurent.Строки.Количество()>0)
		{	
			ЗаполнитьЗначенияСвойств(s, this.brCurent.Строки.get(0));
		}	
		
		profileRoot.setValue(this.pflCurTask, s);
		
	},
	
	getTemplTb: function () {
		
		var tb = v8New('ТаблицаЗначений');
		tb.Колонки.Добавить("Задача");
		tb.Колонки.Добавить("Описание");
		tb.Колонки.Добавить("Тип");
		
		return tb;
		
	},
	loadBranch: function (branch, arRows) {
		
		for (var i=0; i < arRows.Count(); i++)		
		{
			var tbRow = arRows.Get(i);
				
			row = branch.Строки.Добавить();
			ЗаполнитьЗначенияСвойств(row, tbRow);			
		}
	},	
	loadState: function () {
		
		//debugger
		
		var tb = this.getTemplTb();
		
		profileRoot.createValue(this.pflTbTasks, tb, pflSnegopat)    
    	tb = profileRoot.getValue(this.pflTbTasks);
		
		tbTasks.Строки.Очистить();
		
		brRoot = tbTasks.Строки.Добавить();
		brRoot.Задача = 'Задачи';
		
		this.brCurent = brRoot.Строки.Добавить();
		this.brCurent.Задача = 'Текущая';
		
		this.brActive = brRoot.Строки.Добавить();
		this.brActive.Задача = 'Активные';
		
		this.brСompleted = brRoot.Строки.Добавить();
		this.brСompleted.Задача = 'Выполненные';
		
		this.brRecycle = brRoot.Строки.Добавить();
		this.brRecycle.Задача = 'Корзина';
		
		
		struct = v8New('Структура','Тип');		
		
		struct.Тип = RowTypes.Curent;
		var retArray = tb.FindRows(struct);
		this.loadBranch(this.brCurent , retArray);
		
		struct.Тип = RowTypes.Active;
		retArray = tb.FindRows(struct);	
		this.loadBranch(this.brActive , retArray);
		
		struct.Тип = RowTypes.Сompleted;
		retArray = tb.FindRows(struct);				
		this.loadBranch(this.brСompleted , retArray);
		
		this.setCurentTask();
		
		//for (var i=0; i < tb.Count(); i++)		
		//{
		//	var tbRow = tb.Get(i);
		//		
		//	row = this.brActive.Строки.Добавить();
		//	ЗаполнитьЗначенияСвойств(row, tbRow);			
		//}		
        
    },
	
	saveBranch: function (tb, branch, rowType) {
		
		for (var i=0; i < branch.Строки.Count(); i++)		
		{
			var row = branch.Строки.Get(i);
				
			newRow = tb.Добавить();
			
			ЗаполнитьЗначенияСвойств(newRow, row);			
			
			newRow.Тип = rowType;
		}	
		
	},	
	saveState: function () {
		
		//debugger
		
		var tb = this.getTemplTb();
		
		this.saveBranch(tb, this.brCurent, RowTypes.Curent);
		this.saveBranch(tb, this.brActive, RowTypes.Active);
		this.saveBranch(tb, this.brСompleted, RowTypes.Сompleted);
		
    	profileRoot.setValue(this.pflTbTasks, tb);
		
		//saveProfile();
        
    },
	changeBranches: function (Стр1,Стр2) {
		
		ВремСтр = v8New("Структура","Задача,Описание","","");
		
		ЗаполнитьЗначенияСвойств(ВремСтр,Стр1);
		
		ЗаполнитьЗначенияСвойств(Стр1,Стр2);
		
		ЗаполнитьЗначенияСвойств(Стр2,ВремСтр);
		
	},
	Form_OnOpen: function () {
				
		//this.form.Заголовок = "!!!";
		if (!tbTasks){
			
			tbTasks = this.form.ДеревоЗадач;
			
			this.loadState();
				
		}
		
    },    
    Form_BeforeClose: function () {
		
		this.saveState();
		
        //Message('ПередЗакрытием');
    },
	
	Меню_НоваяЗадача: function(Кнопка){
		
		this.brActive.Строки.Вставить(0);
		
	},	
	
	Меню_ЗапомнитьНастройки: function(Кнопка){
		
		this.saveState();
		
		saveProfile();
		
		//Message('ЗапомнитьНастройки');
	},
	
	ДеревоЗадач_ПередУдалением: function (Элемент, Отказ){
		
		Отказ.val = true;
		
		if (Элемент.val == null) return;
		
		if (Элемент.val.ТекущаяСтрока.Уровень()==2) {
			
			Корзина = this.brRecycle;
			ВеткаУдалить = Корзина.Строки.Вставить(0);
			ЗаполнитьЗначенияСвойств(ВеткаУдалить, Элемент.val.ТекущаяСтрока);
			
			Элемент.val.ТекущаяСтрока.Родитель.Строки.Удалить(Элемент.val.ТекущаяСтрока);
		}
			
	},
	
	ДеревоЗадач_ПередНачаломДобавления: function (Элемент, Отказ, Копирование, Родитель){
		
		Отказ.val = true;
		
		if ((Родитель.val.Уровень()>0) && ((Родитель.val.Задача == this.brActive.Задача) || (Родитель.val.Родитель.Задача == this.brActive.Задача))) {
			
			this.brActive.Строки.Вставить(0);
		}
		
		//if (Родитель.val.Уровень()!=1) { Message(Родитель.val.Уровень()); Отказ.val = true;}
		//	
		//if (Родитель.val.Задача != this.brActive.Задача) { Отказ.val = true;}
		//	
		//if (Отказ.val)	Message('Новые задачи добавлять в ветку "Активные"!');
			
	},
	ДеревоЗадач_ПриНачалеРедактирования: function(Элемент, НоваяСтрока, Копирование) {
		this.inEdit = true;
	},
	ДеревоЗадач_ПриОкончанииРедактирования: function(Элемент, НоваяСтрока, ОтменаРедактирования) {
		this.inEdit = false;
	},
	ДеревоЗадач_ПриПолученииДанных: function (Элемент, ОформленияСтрок) {
		if (this.inEdit)
			return;
		
		for (var i=0; i < ОформленияСтрок.val.Count(); i++)				
		{
			ОформлениеСтроки = ОформленияСтрок.val.get(i);
			
			СтрокаДерева = ОформлениеСтроки.ДанныеСтроки;
			
			
			if (СтрокаДерева.Уровень() == 0)
			{
				СтрокаДерева.Иконка = 1;
			} 
			else if (СтрокаДерева.Уровень() == 1)
			{
				СтрокаДерева.Иконка = (СтрокаДерева.Задача == this.brRecycle.Задача)? 3: 2;
			}	
			else if (СтрокаДерева.Уровень() == 2) 
			{
			
				if (СтрокаДерева.Родитель.Задача == this.brCurent.Задача)
				{
					Шрифт = ОформлениеСтроки.Шрифт;
					ОформлениеСтроки.Шрифт = v8New('Шрифт',Шрифт,Шрифт.Имя,Шрифт.Размер,true);
					
					СтрокаДерева.Иконка = 6;
				}				
				else if (СтрокаДерева.Родитель.Задача == this.brRecycle.Задача)
				{
					СтрокаДерева.Иконка = 7;
				}	
				else if (СтрокаДерева.Родитель.Задача == this.brСompleted.Задача)
				{
					СтрокаДерева.Иконка = 4;
				}	
				else
					СтрокаДерева.Иконка = 5;
			}	
		}
	},
	
	ДеревоЗадач_НачалоПеретаскивания: function (Элемент, ПараметрыПеретаскивания, Выполнение) {
		
		var Ветка = ПараметрыПеретаскивания.val.Значение;
		
		if (Ветка.Уровень() == 1 && Ветка.Задача == this.brСompleted.Задача)
		{
			ПараметрыПеретаскивания.val.ДопустимыеДействия = ДопустимыеДействияПеретаскивания.Перемещение;
		} 
		else if (Ветка.Уровень() == 2)
		{
			ПараметрыПеретаскивания.val.ДопустимыеДействия = ДопустимыеДействияПеретаскивания.Перемещение;
		}
		else
			ПараметрыПеретаскивания.val.ДопустимыеДействия = ДопустимыеДействияПеретаскивания.НеОбрабатывать;	
		
	},
	ДеревоЗадач_ПроверкаПеретаскивания: function (Элемент, ПараметрыПеретаскивания, СтандартнаяОбработка, Строка, Колонка) {
		
		//debugger
		
		СтандартнаяОбработка.val = false;
		
		if (Строка.val == null || ПараметрыПеретаскивания.val == null) return;
			
		var Ветка = ПараметрыПеретаскивания.val.Значение;
		var ВеткаКуда = Строка.val;
		
		if (Ветка.Уровень() == 1) ПараметрыПеретаскивания.val.Действие = ДействиеПеретаскивания.Отмена;
		
		//if(ВеткаКуда.Задача == this.brCurent.Задача && Строка.val.Строки.Количество()==0)
		//if(ВеткаКуда.Задача == this.brCurent.Задача)
		//{
		//	ПараметрыПеретаскивания.val.Действие = ДействиеПеретаскивания.Перемещение;
		//} 
		//else if(ВеткаКуда.Задача == this.brActive.Задача || ВеткаКуда.Задача == this.brСompleted.Задача)
		//{
		//	ПараметрыПеретаскивания.val.Действие = ДействиеПеретаскивания.Перемещение;
		//}		
		//else if(ВеткаКуда.Задача == this.brRecycle.Задача)	 
		//{
		//	ПараметрыПеретаскивания.val.Действие = ДействиеПеретаскивания.Перемещение;
		//}		 
		//else 
		//	ПараметрыПеретаскивания.val.Действие = ДействиеПеретаскивания.Отмена;
		
	},
	ДеревоЗадач_Перетаскивание: function (Элемент, ПараметрыПеретаскивания, СтандартнаяОбработка, Строка, Колонка) {
		
		СтандартнаяОбработка.val = false;
		
		if (Строка.val == null || ПараметрыПеретаскивания.val == null) return;
			
		var Ветка = ПараметрыПеретаскивания.val.Значение;
		var ВеткаКуда = Строка.val;
		
		if (Ветка.Уровень() == 2){
			
			if ((ВеткаКуда.Уровень() > 0) && ((ВеткаКуда.Задача == this.brCurent.Задача) || (ВеткаКуда.Родитель.Задача == this.brCurent.Задача)) && (this.brCurent.Строки.Количество()>0)) {
								
				this.changeBranches(this.brCurent.Строки.get(0),Ветка);
				
				Элемент.val.ТекущаяСтрока = this.brCurent.Строки.get(0);
				
			} else if (ВеткаКуда.Уровень() == 1) {
				
				НоваяСтрока = ВеткаКуда.Строки.Вставить(0);
				ЗаполнитьЗначенияСвойств(НоваяСтрока,Ветка);
				
				Ветка.Родитель.Строки.Удалить(Ветка);			
				Элемент.val.ТекущаяСтрока = НоваяСтрока;
				
			} else if (ВеткаКуда.Уровень() == 2) {
				
				НоваяСтрока = ВеткаКуда.Родитель.Строки.Вставить(ВеткаКуда.Родитель.Строки.Индекс(ВеткаКуда));
				ЗаполнитьЗначенияСвойств(НоваяСтрока,Ветка);
				
				Ветка.Родитель.Строки.Удалить(Ветка);			
				Элемент.val.ТекущаяСтрока = НоваяСтрока;
			}	
			
			this.setCurentTask();
			
			this.saveState();
			
			saveProfile();
			
		}		
	}	
	
	
});

//{ Горячие клавиши по умолчанию.
function getPredefinedHotkeys(predef) {
    predef.setVersion(1);
    predef.add('Показать/скрыть задачи', "Ctrl + ~");   
}
//} Горячие клавиши по умолчанию.

function GetToDoListForm() {
    if (!ToDoListForm._instance)
        new ToDoListForm();
    
    return ToDoListForm._instance;
}