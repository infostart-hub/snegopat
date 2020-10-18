//engine: JScript
//uname: choiceHelpTopic
//dname: Выбрать главу справки
//addin: stdlib

// (c) Александр Орефков
// Скрипт позволяет быстрее выбрать нужную главу справки, когда одному слову
// соответствует несколько разделов

stdlib.require("SelectValueDialog.js", SelfScript);

СhoiceHelpTopic = stdlib.Class.extend({

    construct : function () {    
        СhoiceHelpTopic._instance = this;
        events.connect(windows, "onDoModal", this)
    },

    onDoModal:function(dlgInfo){
        if(dlgInfo.caption == "Выбор главы")
        {
			if (dlgInfo.stage == afterInitial) {
				var grid = dlgInfo.form.getControl("tblTopics").extInterface
				var sel = this.choiceNative(grid);
				if(sel)
				{
					grid.currentRow = sel
					this.inFinalOpen = true;
				} else
					this.inFinalOpen = false;
			} else if (dlgInfo.stage == openModalWnd && this.inFinalOpen) {
				dlgInfo.form.sendEvent(dlgInfo.form.getControl('btnShow').id, 0)
			}
        }
    },

    setFilter:function(str){
        replaces = [
            [/Прикладные объекты\//, 'Прикл.объект\/'],
            [/Интерфейс \(управляемый\)\//, 'Интерф.упр\/'],
            [/Универсальные коллекции значений\//, 'Унив.колл.знач\/'],
            [/Общие объекты\//, 'Общ.объек\/'],
            [/\/Система компоновки данных\//, '\/СКД\/'],
            [/\/Схема компоновки данных\//, '\/Схема КД\/'],
            [/\/Настройки компоновки данных\//, '\/Настройки КД\/'],
            [/Общее описание встроенного языка\//, 'Общ.опис.встр.яз\/'],
            [/Встроенные функции\//, 'Встр.функц.\/'],
            [/\/Функции работы со значениями типа/, '\/Функц.раб.знач.типа '],
            [/\/Универсальные объекты/, '\/Универ.объект'],
            [/\/Управляемая форма/, '\/Упр.форма']
        ]
        for(var k in replaces)
            str = str.replace(replaces[k][0], replaces[k][1])
        return str
    },
    choiceNative:function(grid) {
        var choices = v8New('СписокЗначений');
        for(var k = grid.dataSource.root.firstChild; k ; k = k.next)
            choices.Add(k, this.setFilter(k.getCellValue(0)));

        var dlg = new SelectValueDialog("Выберите главу", choices);
        dlg.form.GreedySearch = true;
        if (dlg.selectValue())
            return dlg.selectedValue
        return null
    }
})

function GetСhoiceHelpTopic() {
    if (!СhoiceHelpTopic._instance)
        new СhoiceHelpTopic();
    return СhoiceHelpTopic._instance;
}

var cht = GetСhoiceHelpTopic();
