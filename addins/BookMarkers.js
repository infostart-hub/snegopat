//engine: JScript
//uname: bookmarkers
//dname: Закладки
//descr: Скрипт получает список меток(определеннного формата) из модуля, чтобы быстро переходить к отмеченным местам в коде
//help: inplace
//addin: global
//addin: stdlib
//addin: stdcommands

////addin: ExtendedSearch

stdlib.require("TextWindow.js",SelfScript);

global.connectGlobals(SelfScript);


var мФормаСкрипта;
events.connect(snegopat, "onChangeTextManager", SelfScript.Self);

function onChangeTextManager(p){
	f = getBookMarkers();
	f.update();
 }

function getBookMarkers(){

if (!BookMarkers._instance)
        new BookMarkers();

    return BookMarkers._instance;
 }

//orefkov
stdlib.createMacros(SelfScript.self, "Поставить закладку",
	"Макрос вставляет комментарий-закладку вида //Закладка{}", stdcommands.TextEdit.ToggleBookmark.info.picture,
	function () {
		var tw = snegopat.activeTextWindow();
		if(!tw)
			return;
		tw.selectedText = "//Закладка{ИмяЗакладки}";
		var cs = tw.getCaretPos();
		tw.setSelection(cs.beginRow, cs.beginCol - 12, cs.beginRow, cs.beginCol - 1);
		stdcommands.TextEdit.ToggleBookmark.send();
	}, "Ctrl+B");

SelfScript.self['macrosОткрыть окно'] = function() {

	//debugger
	var f = getBookMarkers();
	f.OpenWindow = true;
	f.update();
}

function BookMarkers(){

	BookMarkers._instance = this;
	this.targetWindow = GetTextWindow();
	this.form = loadFormForScript(SelfScript, '', this)
	this.form.КлючСохраненияПоложенияОкна = SelfScript.uniqueName;
	this.watcher = new TextWindowsWatcher();
	this.OpenWindow = false;
	this.startGlobalSearch = false;
	this.form.ТаблицаЗакладокГл = мГруппыЗакладокГл.Скопировать();

	// if (!мГруппыЗакладок){

	// }
}

BookMarkers.prototype.ТаблицаЗакладокВыбор = function(Элемент, ВыбраннаяСтрока, Колонка, СтандартнаяОбработка) {
	this.goToLine(ВыбраннаяСтрока.val);
}

BookMarkers.prototype.ТаблицаЗакладокГлВыбор = function(Элемент, ВыбраннаяСтрока, Колонка, СтандартнаяОбработка) {
	this.goToLinegl(ВыбраннаяСтрока.val);
}

function СвернутьРазвернутьСтрокиДерева(Строки, Дерево, Уровень, ТекУровень, Команда){

	if(ТекУровень <= Уровень){
		for(var i=0;i<Строки.Количество();i++){
			ТекСтрока = Строки.Получить(i);
			СвернутьРазвернутьСтрокиДерева(ТекСтрока.Строки, Дерево, Уровень, ТекУровень + 1, Команда);
			if(Команда == "Свернуть")
				Дерево.Свернуть(ТекСтрока);
			else
				Дерево.Развернуть(ТекСтрока);
		}
	}

}

BookMarkers.prototype.Свернуть = function(Кнопка) {
	//debugger
	Уровень = Кнопка.val.Имя.substr(Кнопка.val.Имя.length-1,1);
	Уровень = parseInt(Уровень, 10);
	Уровень--;
	ТекУровень = 0;
	СвернутьРазвернутьСтрокиДерева(this.form.ТаблицаЗакладокГл.Строки, this.form.ЭлементыФормы.ТаблицаЗакладокГл, Уровень, ТекУровень, "Свернуть");

	ТекУровень = 1;
	СвернутьРазвернутьСтрокиДерева(this.form.ТаблицаЗакладокГл.Строки, this.form.ЭлементыФормы.ТаблицаЗакладокГл, Уровень, ТекУровень, "Развернуть");

}

BookMarkers.prototype.КоманднаяПанель1Обновить = function(Кнопка) {
	//debugger
    this.update();
}

BookMarkers.prototype.ОбновитьГлобальныеЗакладки = function(Кнопка) {
	//debugger
    this.updategl();
}
BookMarkers.prototype.ТаблицаЗакладокПриВыводеСтроки= function(Элемент, ОформлениеСтроки, ДанныеСтроки)  {

	if(ДанныеСтроки.val.Родитель == undefined)
		ОформлениеСтроки.val.Шрифт = v8New("Шрифт", ОформлениеСтроки.val.Шрифт,undefined, undefined, true);
}
BookMarkers.prototype.ПриЗакрытии = function(Кнопка) {
	//debugger
    this.OpenWindow = false;
}

BookMarkers.prototype.search = function(text){

	this.update();

	if (!text) return

	Группы = this.form.ТаблицаЗакладок.Строки;
	for(Сч=Группы.Количество()-1; Сч>=0; Сч--){
		Группа = Группы.Получить(Сч);
		for(Сч1=Группа.Строки.Количество()-1; Сч1>=0; Сч1--){
			Строка = Группа.Строки.Получить(Сч1);
			if (!(Строка.ИмяЗакладки.indexOf(text)+1))
				Группа.Строки.Удалить(Строка)


	}
	if (Группа.Строки.Количество()==0)
		Группы.Удалить(Группа);
	else
		Группа.ИмяЗакладки = Группа.ИмяЗакладкиБезСчетчика + " (" + Группа.Строки.Количество() + ")";
	}

}

BookMarkers.prototype.СтрокаПоискаАвтоПодборТекста = function(Элемент, Текст, ТекстАвтоПодбора, СтандартнаяОбработка){

	this.search(Текст.val)

}

BookMarkers.prototype.СтрокаПоискаОкончаниеВводаТекста = function(Элемент, Текст, Значение, СтандартнаяОбработка){

	this.search(Текст.val)
}

BookMarkers.prototype.activateEditor = function () {

	if (this.targetWindow){
    var activeView = this.targetWindow.GetView() ;
    if (activeView)
        activeView.activate();}
}

BookMarkers.prototype.Close = function () {
    if (this.form.IsOpen())
    {
        this.form.Close();
        return true;
    }
    return false;
}

BookMarkers.prototype.IsOpen = function () {
    return this.form.IsOpen();
}

BookMarkers.prototype.goToLine = function (row) {

    this.form.Controls.ТаблицаЗакладок.ТекущаяСтрока = row;

    if (!this.targetWindow)
        return;

    if (!this.targetWindow.IsActive())
    {
		this.form.ТаблицаЗакладок.Очистить();
        DoMessageBox("Окно, для которого показывался список, было закрыто!");

        return;
    }
	if (!row.НомерСтроки)
		return;
 	//debugger
    // Переведем фокус в окно текстового редактора.
    this.activateEditor();
    var textline = this.targetWindow.GetLine(row.НомерСтроки)
    // Установим выделение на найденное совпадение со строкой поиска.
    this.targetWindow.SetCaretPos(row.НомерСтроки, 1);
    this.targetWindow.SetSelection(row.НомерСтроки, 1, row.НомерСтроки, textline.length+1);
}

BookMarkers.prototype.goToLinegl = function (row) {

    //this.form.Controls.ТаблицаЗакладокГл.ТекущаяСтрока = row;

    if (!row.UUID || !row.НомерСтроки)
        return;

 	//debugger
    // Переведем фокус в окно текстового редактора.
	try{
    editor = metadata.current.findByUUID(row.UUID).openModule(row.propId)}
	catch(e){return}
    var textline = editor.line(row.НомерСтроки)
    // Установим выделение на найденное совпадение со строкой поиска.
    editor.SetCaretPos(row.НомерСтроки, 1);
    editor.SetSelection(row.НомерСтроки, 1, row.НомерСтроки, textline.length+1);
}

BookMarkers.prototype.update = function(){

	var text = "";
	strlabel = "//Закладка{";
	//var re = new RegExp('//Закладка{([^}]+)}|//\s*FIXME:(.*)|//\s*TODO:(.*)','igm');
	//debugger
	this.targetWindow = this.watcher.getActiveTextWindow();

	if (!this.OpenWindow) return;
	form = this.form;
	if (!form.Открыта())
			form.Открыть();

	if (this.targetWindow){
		// Проверим, не открывается ли это какое-либо дочернее окно из конструктора запросов.
		if (this.targetWindow.textWindow.mdCont == null)
		return;


		//debugger
		var ЗаголовокФормы = "";
		var text1 = this.targetWindow.textWindow.mdCont.rootObject.name;
		var text2 = this.targetWindow.textWindow.mdObj.name;
		if (text2.indexOf("Форма")>=0) ЗаголовокФормы = text1;
			else ЗаголовокФормы = text2;
		form.Заголовок = "Закладки " + ЗаголовокФормы;
		if (!form.Открыта())
			form.Открыть();

		var lines = StringUtils.toLines(this.targetWindow.textWindow.text);

		ДеревоЗакладок = v8New("ДеревоЗначений");
		ДеревоЗакладок.Колонки.Добавить("ИмяЗакладки");
		ДеревоЗакладок.Колонки.Добавить("ИмяЗакладкиБезСчетчика");
		ДеревоЗакладок.Колонки.Добавить("НомерСтроки");

		ТекГруппы = ДеревоЗакладок.Строки;

		for (var i=0; i<мГруппыЗакладок.Количество(); i++){
		re = new RegExp(мГруппыЗакладок.Get(i).РегулярноеВыражение,'igm');
		НоваяГруппа = ТекГруппы.Добавить();
		НоваяГруппа.ИмяЗакладки = мГруппыЗакладок.Get(i).ИмяГруппы;
		НоваяГруппа.ИмяЗакладкиБезСчетчика = НоваяГруппа.ИмяЗакладки;

		for(var lineIx = 1; lineIx < lines.length; lineIx++)
			{
			text = lines[lineIx];
			while((Matches = re.exec(text)) != null) {
				str1 = text.substr(Matches.index+strlabel.length, Matches.lastIndex - (Matches.index+strlabel.length));
                str1 = ""+Matches[1];
				str1 = str1.replace("}", "")
				НоваяСтрока = НоваяГруппа.Строки.Добавить()
				НоваяСтрока.НомерСтроки = "" + (lineIx+1);
				НоваяСтрока.ИмяЗакладки = str1;
				НоваяСтрока.ИмяЗакладкиБезСчетчика = str1;
				}
				}
		}

		i = ТекГруппы.Количество()-1;
		while(i>=0)
		if (!мПоказыватьПустыеГруппы && ТекГруппы.Get(i).Строки.Количество()==0) {
		ТекГруппы.Удалить(ТекГруппы.Get(i));
		i--;}
		else{
		ТекИмяЗакладки = ТекГруппы.Get(i).ИмяЗакладки;
		ТекГруппы.Get(i).ИмяЗакладки = ТекИмяЗакладки + " (" + ТекГруппы.Get(i).Строки.Количество() + ")";
		ТекГруппы.Get(i).ИмяЗакладкиБезСчетчика = ТекИмяЗакладки;
		i--;
		}

		if (ДеревоИзменилось(form.ТаблицаЗакладок, ДеревоЗакладок))
		form.ТаблицаЗакладок = ДеревоЗакладок;

		//Обновление глобальных закладок по данному модулю
		СтруктураОтбора = v8New("Структура");
		СтруктураОтбора.Вставить("ИспользоватьВГлобальномПоиске", true);
		ГруппыГлобальногоПоиска = мГруппыЗакладок.Скопировать(мГруппыЗакладок.НайтиСтроки(СтруктураОтбора));
		ГлЗакладки = this.form.ТаблицаЗакладокГл;
		//debugger
		MmdObj = this.targetWindow.textWindow.mdObj;
		ТекОбъект = getMdName(MmdObj);
		UUID = MmdObj.id;
		propId = this.targetWindow.textWindow.mdProp.id;
		БылиИзменения = false;
		if(ДеревоЗакладок.Строки.Количество() > 0 && ГруппыГлобальногоПоиска.Количество() > 0){
			for(i=0; i<ДеревоЗакладок.Строки.Количество();i++){
				ТекСтрока = ДеревоЗакладок.Строки.Получить(i);
				ЕстьСтрока = ГруппыГлобальногоПоиска.Найти(ТекСтрока.ИмяЗакладкиБезСчетчика, "ИмяГруппы");
				if(ЕстьСтрока == undefined)
					continue;

				НайденнаяСтрокаГлЗакладки = ГлЗакладки.Строки.Найти(ТекСтрока.ИмяЗакладкиБезСчетчика, "ИмяЗакладкиБезСчетчика");
				if(НайденнаяСтрокаГлЗакладки == undefined)
					НайденнаяСтрокаГлЗакладки = ГлЗакладки.Строки.Добавить();
				БылиИзменения = true;
				try{
					var index = 0 + ГруппыГлобальногоПоиска.Индекс(ЕстьСтрока);
					НайденнаяСтрокаГлЗакладки.СтрокаСортировки = index.toString();
				} catch (e) {}

				НайденнаяСтрокаГлЗакладки.ИмяЗакладки = ТекСтрока.ИмяЗакладкиБезСчетчика;
				НайденнаяСтрокаГлЗакладки.ИмяЗакладкиБезСчетчика = ТекСтрока.ИмяЗакладкиБезСчетчика;
				СтрокаОбъекта = НайденнаяСтрокаГлЗакладки.Строки.Найти(ТекОбъект, "ИмяОбъекта");
				if(СтрокаОбъекта == undefined){
					СтрокаОбъекта = НайденнаяСтрокаГлЗакладки.Строки.Добавить();
					БылиИзменения = true;
					СтрокаОбъекта.ИмяОбъекта = ТекОбъект;
					СтрокаОбъекта.ИмяЗакладки = ТекОбъект;
					СтрокаОбъекта.ИмяЗакладкиБезСчетчика = ТекОбъект;
				}
				БылиИзменения = true;
				//Запомним строку на которой стояли
				//debugger
				ЗапомнилиИндекс = -1;
				ТекущаяСтрокаГлЗакладки = this.form.Controls.ТаблицаЗакладокГл.ТекущаяСтрока;
				if(ТекущаяСтрокаГлЗакладки != undefined && ТекущаяСтрокаГлЗакладки.Родитель != undefined && ТекущаяСтрокаГлЗакладки.Родитель.Родитель != undefined)
					if(ТекущаяСтрокаГлЗакладки.Родитель.ИмяЗакладки == СтрокаОбъекта.ИмяЗакладки && ТекущаяСтрокаГлЗакладки.Родитель.Родитель.ИмяЗакладки == СтрокаОбъекта.Родитель.ИмяЗакладки)
						ЗапомнилиИндекс = СтрокаОбъекта.Строки.Индекс(ТекущаяСтрокаГлЗакладки);
				СтрокаОбъекта.Строки.Очистить();
				for(j=0; j<ТекСтрока.Строки.Количество();j++){
					ТекСтрокаЗакладка = ТекСтрока.Строки.Получить(j);
						НоваяСтрокаГлЗакладки1 = СтрокаОбъекта.Строки.Добавить();
						НоваяСтрокаГлЗакладки1.ИмяЗакладки = ТекСтрокаЗакладка.ИмяЗакладки;
						НоваяСтрокаГлЗакладки1.ИмяЗакладкиБезСчетчика = ТекСтрокаЗакладка.ИмяЗакладкиБезСчетчика;
						НоваяСтрокаГлЗакладки1.ИмяОбъекта = ТекСтрокаЗакладка.ТекОбъект;
						НоваяСтрокаГлЗакладки1.НомерСтроки = ТекСтрокаЗакладка.НомерСтроки;
						НоваяСтрокаГлЗакладки1.UUID = UUID;
						НоваяСтрокаГлЗакладки1.propId = propId;
				}
				if(ЗапомнилиИндекс>=0)
					this.form.Controls.ТаблицаЗакладокГл.ТекущаяСтрока = СтрокаОбъекта.Строки.Получить(ЗапомнилиИндекс);

			}
		}
		//А теперь удалим мертвые закладки
		for(i=0; i<ГлЗакладки.Строки.Количество();i++){
			ТекСтрокаЗакладкиГл = ГлЗакладки.Строки.Получить(i);
			СтрокаОбъектЗакладкиГл = ТекСтрокаЗакладкиГл.Строки.Найти(ТекОбъект, "ИмяОбъекта");
			if(СтрокаОбъектЗакладкиГл == undefined)
				continue;
			СтрокаЗакладокТекущегоОбъекта = ДеревоЗакладок.Строки.Найти(ТекСтрокаЗакладкиГл.ИмяЗакладкиБезСчетчика, "ИмяЗакладкиБезСчетчика");
			if(СтрокаЗакладокТекущегоОбъекта == undefined){ //вот она мертвая глобальная закладка, надо грохнуть
				ТекСтрокаЗакладкиГл.Строки.Удалить(СтрокаОбъектЗакладкиГл);
				БылиИзменения = true;
				continue;
			}
		}

		//Подсчитаем количество объектов
		for(i=ГлЗакладки.Строки.Количество()-1; i>=0;i--){
			ТекСтрокаЗакладкиГл = ГлЗакладки.Строки.Получить(i);
			if(ТекСтрокаЗакладкиГл.Строки.Количество() == 0)
				ГлЗакладки.Строки.Удалить(ТекСтрокаЗакладкиГл);
			else
				ТекСтрокаЗакладкиГл.ИмяЗакладки = ТекСтрокаЗакладкиГл.ИмяЗакладкиБезСчетчика + " (" + ТекСтрокаЗакладкиГл.Строки.Количество() + ")";
		}

		if(ГлЗакладки.Строки.Количество() != 0) 	ГлЗакладки.Строки.Сортировать("СтрокаСортировки");
		///ГлЗакладки.Строки.Сортировать("СтрокаСортировки");

		if(БылиИзменения)
			profileRoot.setValue(pflBookMarkersTabGl, ГлЗакладки)

	}

}

function getMdName(mdObj) {
                    if (mdObj.parent && mdObj.parent.mdClass.name(1) != 'Конфигурация')
                        return getMdName(mdObj.parent) + '.' + mdObj.mdClass.name(1) + ' ' + mdObj.name;
                    var cname = mdObj.mdClass.name(1);
                    return  (cname ? cname + ' ' : '') + mdObj.name;
                }

function readMdToVt(){
        var currentId = metadata.current.rootObject.id;

            var docRow = null;
            //this.vtMD[currentId] = [];
            vtMD = v8New("ValueTable");
            vtMD.Columns.Add("UUID");
            vtMD.Columns.Add("mdProp");
            vtMD.Columns.Add("mdName");
            vtMD.Columns.Add("title");
            vtMD.Columns.Add("sortTitle");
            vtMD.Columns.Add("sort");
            vtMD.Columns.Add("LineNumber");

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

                var mdc = mdObj.mdclass;

                var mdName = getMdName(mdObj)

				var reatingMdObjects = {"ОбщийМодуль":2,
                                "Конфигурация":3,
                                "ПланОбмена":4,
                                "ОбщаяФорма":5}

                for(var i = 0, c = mdc.propertiesCount; i < c; i++){
                    var mdProp = mdc.propertyAt(i);
                    var mdPropName = mdc.propertyAt(i).name(1);

                    if (mdObj.isPropModule(mdProp.id)){
                        //var row = {UUID : mdObj.id}
                        var row = vtMD.Add();
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

                            if (!reatingMdObjects[matches[1]]){
                                if (!reatingMdObjects[matches[2]]) {
                                    row.sort = 9;
                               } else {
                                    row.sort = reatingMdObjects[matches[2]];
                               }
                            } else {
                                row.sort = reatingMdObjects[matches[1]];
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
                })(metadata.current.rootObject)

      vtMD.Sort("sort, LineNumber, title");

	return vtMD;
}

BookMarkers.prototype.updategl = function(){

	//debugger
	this.startGlobalSearch = true;
	//events.connect(Designer, "onIdle", this);

	var text = "";
	strlabel = "//Закладка{";
	//var re = new RegExp('//Закладка{([^}]+)}|//\s*FIXME:(.*)|//\s*TODO:(.*)','igm');
	//debugger
	//this.targetWindow = this.watcher.getActiveTextWindow();

	if (!this.OpenWindow) return;
	if (!form.Открыта())
		form.Открыть();


	СтруктураОтбора = v8New("Структура");
	СтруктураОтбора.Вставить("ИспользоватьВГлобальномПоиске", true);
	ГруппыГлобальногоПоиска = мГруппыЗакладок.НайтиСтроки(СтруктураОтбора);
	if(ГруппыГлобальногоПоиска.Количество()==0)
		return

	vtMD = readMdToVt();
	ВсегоОбъектов = vtMD.Count();

	var form = this.form;
	container = metadata.current;
	ДеревоЗакладок = v8New("ДеревоЗначений");
	ДеревоЗакладок.Колонки.Добавить("ИмяЗакладки");
	ДеревоЗакладок.Колонки.Добавить("ИмяЗакладкиБезСчетчика");
	ДеревоЗакладок.Колонки.Добавить("НомерСтроки");
	ДеревоЗакладок.Колонки.Добавить("ИмяОбъекта");
	ДеревоЗакладок.Колонки.Добавить("UUID");
	ДеревоЗакладок.Колонки.Добавить("propId");

	ТекГруппы = ДеревоЗакладок.Строки;

	for (var gz=0; gz<ГруппыГлобальногоПоиска.Количество(); gz++){
		re = new RegExp(ГруппыГлобальногоПоиска.Get(gz).РегулярноеВыражение,'igm');
		НоваяГруппа = ТекГруппы.Добавить();
		НоваяГруппа.ИмяЗакладки = ГруппыГлобальногоПоиска.Get(gz).ИмяГруппы;
		НоваяГруппа.ИмяЗакладкиБезСчетчика = НоваяГруппа.ИмяЗакладки;


		for(mm=0;mm<ВсегоОбъектов;mm++){
			var strVtMD = vtMD.Получить(mm);
			try{curtext = container.findByUUID(strVtMD.UUID).getModuleText(strVtMD.mdProp.id)}
			catch(e){curtext = container.rootobject.getModuleText(strVtMD.mdProp.id)}

			groupnum = gz +1;
			objnum = mm+1;
			//Message("Группа " + groupnum + " из " + ГруппыГлобальногоПоиска.Количество() + ". Объект " + objnum + " из " + ВсегоОбъектов + "   " + strVtMD.mdName);

			var lines = StringUtils.toLines(curtext);
			НовыйОбъект = НоваяГруппа.Строки.Добавить();
			НовыйОбъект.ИмяЗакладки = strVtMD.mdName;
			НовыйОбъект.ИмяЗакладкиБезСчетчика = strVtMD.mdName;
			НовыйОбъект.ИмяОбъекта = strVtMD.mdName;
			НовыйОбъект.UUID = strVtMD.UUID;

			for(var lineIx = 1; lineIx < lines.length; lineIx++)
			{
			text = lines[lineIx];
			while((Matches = re.exec(text)) != null) {
				str1 = text.substr(Matches.index+strlabel.length, Matches.lastIndex - (Matches.index+strlabel.length));
                str1 = ""+Matches[1];
				str1 = str1.replace("}", "")
				НоваяСтрока = НовыйОбъект.Строки.Добавить()
				НоваяСтрока.НомерСтроки = "" + (lineIx+1);
				НоваяСтрока.ИмяЗакладки = str1;
				НоваяСтрока.ИмяЗакладкиБезСчетчика = str1;
				НоваяСтрока.UUID = strVtMD.UUID;
				НоваяСтрока.ИмяОбъекта = strVtMD.mdName;
				НоваяСтрока.propId = strVtMD.mdProp.id;
				}
			}
			if(НовыйОбъект.Строки.Количество()==0)
				НоваяГруппа.Строки.Удалить(НовыйОбъект);
		}
		if(НоваяГруппа.Строки.Количество()==0)
				ТекГруппы.Удалить(НоваяГруппа);

			//
			// while(i>=0){
				// j = ТекГруппы.Get(i).Строки.Количество()-1;
				// while(j>=0){
					// if (!мПоказыватьПустыеГруппы && ТекГруппы.Get(i).Строки.Get(j).Строки.Количество()==0) {
						// ТекГруппы.Get(i).Строки.Удалить(ТекГруппы.Get(i).Строки.Get(j));
					// j--;}
				// }
				// if (!мПоказыватьПустыеГруппы && ТекГруппы.Get(i).Строки.Количество()==0) {
					// ТекГруппы.Удалить(ТекГруппы.Get(i));
					// i--;
				// }
				// else{



	}
	i = ТекГруппы.Количество()-1;
	while(i>=0){
	ТекИмяЗакладки = ТекГруппы.Get(i).ИмяЗакладки;
	ТекГруппы.Get(i).ИмяЗакладки = ТекИмяЗакладки + " (" + ТекГруппы.Get(i).Строки.Количество() + ")";
	ТекГруппы.Get(i).ИмяЗакладкиБезСчетчика = ТекИмяЗакладки;
	i--}

	form.ТаблицаЗакладокГл = ДеревоЗакладок;
	this.startGlobalSearch = false;
	profileRoot.setValue(pflBookMarkersTabGl, ДеревоЗакладок)
}

// onIdle:function(){
        // if (this.startGlobalSearch) {
			// windows.caption = this.curCaption;
            // events.disconnect(Designer, "onIdle", this);
		// }
// }

function ДеревоИзменилось(ДеревоЗакладокСтарое, ДеревоЗакладок){

	//debugger
	if (ДеревоЗакладокСтарое.Строки.Количество() !== ДеревоЗакладок.Строки.Количество())
		return true;
	for (var Сч=0; Сч < ДеревоЗакладок.Строки.Количество(); Сч++){
		Строка1 = ДеревоЗакладок.Строки.Получить(Сч);
		Строка2 = ДеревоЗакладокСтарое.Строки.Получить(Сч);

		if (Строка1.НомерСтроки!==Строка2.НомерСтроки || Строка1.ИмяЗакладки!==Строка2.ИмяЗакладки)
			return true;

		if (Строка1.Строки.Количество() !== Строка2.Строки.Количество())
		return true;

		for (var Сч1=0; Сч1 < Строка1.Строки.Количество(); Сч1++){
		Строка11 = Строка1.Строки.Получить(Сч1);
		Строка21 = Строка2.Строки.Получить(Сч1);
		if (Строка11.НомерСтроки!==Строка21.НомерСтроки || Строка11.ИмяЗакладки!==Строка21.ИмяЗакладки)
			return true;}

	}

	return false;
}

//function createTextWindow(textWnd) {
//
//	//debugger
//	// Проверим, не открывается ли это какое-либо дочернее окно из конструктора запросов.
//	if (textWnd.extName == "Язык запросов")
//		return;
//
//	// различные диалоги из скриптов
//	if (!textWnd.extName.length || (textWnd.readOnly && !textWnd.text.length && textWnd.extName == "Встроенный язык"))
//		return;
//
//	try
//	{
//		//text = textWnd.GetText();
//		f = getBookMarkers();
//		f.update();
//	}
//	catch (e)
//	{
//		// do nothing
//	}
//}

////////////////////////////////////////////////////////////////33////////////////////////
////{ TextWindowsWatcher - отслеживает активизацию текстовых окон и запоминает последнее.
////

function TextWindowsWatcher() {
    this.timerId = 0;
    this.lastActiveTextWindow = null;
    this.startWatch();
}

TextWindowsWatcher.prototype.getActiveTextWindow = function () {
    if (this.lastActiveTextWindow && this.lastActiveTextWindow.IsActive())
        return this.lastActiveTextWindow;
    return null;
}

TextWindowsWatcher.prototype.startWatch = function () {
    if (this.timerId)
        this.stopWatch();
    this.timerId = createTimer(500, this, 'onTimer');
}

TextWindowsWatcher.prototype.stopWatch = function () {
    if (!this.timerId)
        return;
    killTimer(this.timerId);
    this.timerId = 0;
}

TextWindowsWatcher.prototype.onTimer = function (timerId) {
    var wnd = GetTextWindow();
    if (wnd){
		if (this.lastActiveTextWindow){
			if (wnd.textWindow.textMgr != this.lastActiveTextWindow.textWindow.textMgr){
			this.lastActiveTextWindow = wnd;
			//debugger
			f = getBookMarkers();
			f.update();
			f.activateEditor();}}
		else {this.lastActiveTextWindow = wnd;
			f = getBookMarkers();
			f.update();
			f.activateEditor();}
		}
    else if (this.lastActiveTextWindow && !this.lastActiveTextWindow.IsActive())
        this.lastActiveTextWindow = null;
}
//} TextWindowsWatcher


////////////////////////////////////////////////////////////////////////////////////////
////{ TextWindowsWatcherGoToLine - отслеживает активизацию текстовых окон и запоминает последнее и переходим по строке.
////

TextWindowsWatcherGoToLine = stdlib.Class.extend({

    construct : function(LineNo, LineToFind) {
        this.timerId = 0;
        this.lastActiveTextWindow = null;
        this.Line = LineNo;
        if (LineToFind == undefined){
            this.Name = "";
        } else {
            this.Name = LineToFind;
        }
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

            var lines = StringUtils.toLines(wnd.GetText());
            for(var lineIx = LineNo; lineIx < lines.length; lineIx++)
            {
                var line = lines[lineIx];
                var index = line.indexOf(this.Name);
                if (index>=0){
                    // Переведем фокус в окно текстового редактора.
                    wnd.SetCaretPos(lineIx+1, index+1);
                    wnd.SetSelection(lineIx+1, index+1, lineIx+1, index+1+this.Name.length);
                    return;
                }
            }

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
//} end of TextWindowsWatcherGoToLine class

BookMarkers.prototype.КоманднаяПанель1Настройки = function(Элемент) {
    мФормаНастройки=loadFormForScript(SelfScript, "Настройка") // Обработку событий формы привяжем к самому скрипту
    мФормаНастройки.ОткрытьМодально()
}

function мЗаписатьНастройки() {

    мАвтозапуск = мФормаНастройки.Автозапуск;
    мГруппыЗакладок = мФормаНастройки.ГруппыЗакладок.Скопировать();
	мПоказыватьПустыеГруппы = мФормаНастройки.ПоказыватьПустыеГруппы;

    RE_EXTENSIONS = null; // Регулярку надо переформировать.

    profileRoot.setValue(pflBookMarkersOpenOnStart, мАвтозапуск)
    profileRoot.setValue(pflBookMarkersTab, мГруппыЗакладок)

	f = getBookMarkers();
	f.update();

}

function КпШапкаЗаписатьИЗакрыть(Кнопка) {
    мЗаписатьНастройки()
    мФормаНастройки.Закрыть()
}

function КпШапкаЗаписать(Кнопка) {
    мЗаписатьНастройки()
}

function НастройкиПриОткрытии() {
    мФормаНастройки.Автозапуск=мАвтозапуск;
    мФормаНастройки.ГруппыЗакладок = мГруппыЗакладок.Скопировать();
	мФормаНастройки.ПоказыватьПустыеГруппы = мПоказыватьПустыеГруппы;
}

function СформироватьТзГруппПоУмолчанию() {

    var ТЗ = v8New("ТаблицаЗначений");
    ТЗ.Колонки.Добавить("ИмяГруппы");
	ТЗ.Колонки.Добавить("РегулярноеВыражение");
	ТЗ.Колонки.Добавить("ИспользоватьВГлобальномПоиске");

    function НоваяГруппа(ТекИмяГруппы, ТекВыражение, ГлобПоиск) {
	НоваяСтрока = ТЗ.Добавить();
	НоваяСтрока.ИмяГруппы = ТекИмяГруппы;
	НоваяСтрока.РегулярноеВыражение = ТекВыражение;
	НоваяСтрока.ИспользоватьВГлобальномПоиске = ГлобПоиск;
	}

    НоваяГруппа("Закладки", "//Закладка{([^}]+)}", false);
	НоваяГруппа("FIXME", "//\\s*FIXME:(.*)", true);
	НоваяГруппа("TODO", "//\\s*TODO:(.*)", true);

;

    return ТЗ;
}

function СформироватьТзГруппГлПоУмолчанию(){

	ДЗ = v8New("ДеревоЗначений");
	return ДЗ;

}

//orefkov
function getPredefinedHotkeys(predef) {
    predef.setVersion(0);
    stdlib.getAllPredefHotKeys(SelfScript.self, predef);
}

////////////////////////////////////////////////////////////////////////////////////////
////{ Инициализация скрипта
////
var pflBookMarkersOpenOnStart  = "BookMarkers/OpenOnStart"
var pflBookMarkersEmptyGroups  = "BookMarkers/EmptyGroups "
var pflBookMarkersTab     = "BookMarkers/Tab"
var pflBookMarkersTabGl    = "BookMarkers/TabGl"

// Восстановим настройки
profileRoot.createValue(pflBookMarkersOpenOnStart, false, pflSnegopat)
profileRoot.createValue(pflBookMarkersEmptyGroups, false, pflSnegopat)
profileRoot.createValue(pflBookMarkersTab, СформироватьТзГруппПоУмолчанию(), pflSnegopat)
profileRoot.createValue(pflBookMarkersTabGl, СформироватьТзГруппГлПоУмолчанию(), pflSnegopat)

мФормаНастройки = null
var мАвтозапуск = profileRoot.getValue(pflBookMarkersOpenOnStart)
var мПоказыватьПустыеГруппы = profileRoot.getValue(pflBookMarkersEmptyGroups)
var мГруппыЗакладок = profileRoot.getValue(pflBookMarkersTab)
var мГруппыЗакладокГл = profileRoot.getValue(pflBookMarkersTabGl)

if(мГруппыЗакладок.Колонки.Найти("ИспользоватьВГлобальномПоиске")==undefined)
    мГруппыЗакладок.Колонки.Добавить("ИспользоватьВГлобальномПоиске");
try{
    мГруппыЗакладокГл.Колонки.Добавить("СтрокаСортировки");
    мГруппыЗакладокГл.Колонки.Добавить("ИмяЗакладкиБезСчетчика");
    мГруппыЗакладокГл.Колонки.Добавить("ИмяЗакладки");
    мГруппыЗакладокГл.Колонки.Добавить("ИмяОбъекта");
    мГруппыЗакладокГл.Колонки.Добавить("НомерСтроки");
    мГруппыЗакладокГл.Колонки.Добавить("UUID");
    мГруппыЗакладокГл.Колонки.Добавить("propId");
}catch(e){}

if(мАвтозапуск==true){
f = getBookMarkers();
f.OpenWindow = true;
f.update();	}
