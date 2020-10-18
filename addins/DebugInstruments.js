//engine: JScript
//uname: DebugInstruments
//dname: Отладка с Инструментами разработчика
//author: Сосна Евгений <shenja@sosna.zp.ua>, Старых С.А.
//addin: stdlib
//addin: hotkeys
//addin: global
//addin: stdcommands

// (c) Сосна Евгений <shenja@sosna.zp.ua>
// (с) 2007, Старых С.А.
// 

/*@
Аддин, упрощающий работу из отладчика с "Инструментами разработчика"
@*/


stdlib.require('ScriptForm.js', SelfScript);
stdlib.require('TextWindow.js', SelfScript);
stdlib.require('log4js.js', SelfScript);

//stdlib.require(stdlib.getSnegopatMainFolder() + 'scripts\\epf\\epfloader.js', SelfScript);
global.connectGlobals(SelfScript);

var logger = Log4js.getLogger(SelfScript.uniqueName);
var appender = new Log4js.BrowserConsoleAppender();
appender.setLayout(new Log4js.PatternLayout(Log4js.PatternLayout.TTCC_CONVERSION_PATTERN));
logger.addAppender(appender);
logger.setLevel(Log4js.Level.ERROR);


////////////////////////////////////////////////////////////////////////////////////////
////{ Макросы
////

SelfScript.self['macrosОтладить запрос модально'] = function() {
    var sm = GetDebugInstruments();
    
    var w = GetTextWindow();
    if (!w) return false;
    
    var selText = w.GetSelectedText();
    if (selText == '')
        selText = w.GetWordUnderCursor();
    
    sm.debugQuery(selText, true);
    return true;
}

SelfScript.self['macrosОтладить запрос не модально'] = function() {
    var sm = GetDebugInstruments();
    var w = GetTextWindow();
    if (!w) return false;
    
    var selText = w.GetSelectedText();
    if (selText == '')
        selText = w.GetWordUnderCursor();
    
    sm.debugQuery(selText, false);
    return true;
}

SelfScript.self['macrosИсследовать'] = function() {
    
    var sm = GetDebugInstruments();
    
    var w = GetTextWindow();
    if (!w) return false;
    
    var selText = w.GetSelectedText();
    if (selText == '')
        selText = w.GetWordUnderCursor();
    logger.debug("macrosИсследовать");
    sm.research(selText);
    
    return true;
}


SelfScript.self['macrosПр(Присвоить)'] = function() {
    
    var sm = GetDebugInstruments();
    logger.debug('macrosПр(Присвоить)');
    var w = GetTextWindow();
    if (!w) return false;
    
    var selText = w.GetSelectedText();
    if (selText == '')
        selText = w.GetWordUnderCursor();
    sm.show();
    sm.form.Controls.Панель1.CurrentPage = sm.form.Controls.Панель1.Pages.СтраницаПр;
    if (selText.length>0){
        sm.form.Controls.TextDocumentFieldP1.SetText(selText);
    }
    //pop = sm.pop(selText, false);
    
    return true
}

SelfScript.self['macrosДу'] = function() {
    
    var sm = GetDebugInstruments();
    logger.debug('macrosДу');
    var w = GetTextWindow();
    if (!w) return false;
    
    var selText = w.GetSelectedText();
    if (selText == '')
        selText = w.GetWordUnderCursor();
    sm.show();
    sm.form.Controls.Панель1.CurrentPage = sm.form.Controls.Панель1.Pages.СтраницаДу;
    if (selText.length>0){
        sm.form.Controls.TextDocumentFieldProgText.SetText(selText);
    }
    //pop = sm.pop(selText, false);
    
    return true
}



SelfScript.self['macrosНачать трассу в технологическом журнале'] = function() {
    var sm = GetDebugInstruments();
    
    sm.startTechLog();
    
    return true;
}

SelfScript.self['macrosКончить трассу в технологическом журнале'] = function() {
    var sm = GetDebugInstruments();
    
    sm.stopTechLog();
    
    return true;
}

SelfScript.self['macrosПоп модально'] = function() {
    var sm = GetDebugInstruments();
    
    var w = GetTextWindow();
    if (!w) return false;
    
    var selText = w.GetSelectedText();
    if (selText == '')
        selText = w.GetWordUnderCursor();
    
    pop = sm.pop(selText, true);
    
    Message(""+pop);
    
    return true
}

SelfScript.self['macrosПоп не модально'] = function() {
    var sm = GetDebugInstruments();
    
    var w = GetTextWindow();
    if (!w) return false;
    
    var selText = w.GetSelectedText();
    if (selText == '')
        selText = w.GetWordUnderCursor();
    
    pop = sm.pop(selText, false);
    
    Message(""+pop);
    
    return true
}

SelfScript.self['macrosНастройка'] = function() {
    var sm = GetDebugInstruments();
    sm.changeSettings();
    return true;
}



SelfScript.self['macrosУстановить точку останова по условию ='] = function(){
    var sm = GetDebugInstruments();
    exp = sm.getDebuggerExpr();
    if (!exp)
        return false;
    sm.setDebuggerOnif(""+exp.expression+"="+exp.expressionvalue);
    return true;

    // if (!form.ЭлементыФормы.ПеременныеОтладки.ТекущаяСтрока) {
    //     logger.error("Не определенна текущая строка для выражения");
    //     return;
    // }
    
    // events.connect(windows, "onDoModal", SelfScript.self, "hookBrkptCond");
    // var state = stdcommands.CDebug.BrkptCond.getState();
    // var curRow = form.ЭлементыФормы.ПеременныеОтладки.ТекущаяСтрока;
    // var curValue = ''+curRow.Значение;
    // var name = fullName(curRow);
    // valueBrkptCond = ""+ name + " = "+curValue;
    // stdcommands.CDebug.BrkptCond.send();
    // events.disconnect(windows, "onDoModal", SelfScript.self, "hookBrkptCond");
    
}


/* Возвращает название макроса по умолчанию - вызывается, когда пользователь 
дважды щелкает мышью по названию скрипта в окне Снегопата. */
function getDefaultMacros() {
    return 'Настройка';
}

////} Макросы

DebugInstruments = ScriptForm.extend({

    settingsRootPath : SelfScript.uniqueName,
    
    settings : {
        pflBase : {
            'pathToEpf': ".\\ИрМобильные\\ирМобильные.epf", // Путь к файлу внешней обработки, по умолчанию в корне снегопата. 
            'useEpf'   : false, //По умолчанию используем встроенные.  
            'queryCommand' : "Отладить", 
            'startTechLog' : "ТехН",
            'stopTechLog': "ТехК",
            'poopCommand': "Поп",
            'researchCommand': "Исследовать",
            'duCommand':"Ду",
            'prCommand' : "Пр",
            'perCommand' : "Пер",
            'operateCommand' : "Оперировать"
        }
    },

    construct : function () {
        
        this._super(env.pathes.addins + "DebugInstruments.ssf");


        this.loadSettings();
        this.lastModalForm = null;

        DebugInstruments._instance = this;

    }, 
    
    loadSettings : function(){
        this._super();
        if (this.form.useEpf){
            try {
                if (!fileExists(getAbsolutePath(this.form.pathToEpf))){
                    var notifysend = stdlib.require('NotifySend.js').GetNotifySend();
                    var СистемнаяИнформация = v8New("СистемнаяИнформация");
                    var версия = СистемнаяИнформация.ВерсияПриложения;
                    if (версия.indexOf("8.2.13")==-1){
                      notifysend.provider = notifysend.initprovider("Встроенный1С");
                    }
                    notifysend.Error("Не нашли ", "Не смогли найти файл внешней обработки \n путь "+getAbsolutePath(this.form.pathToEpf), 3);
                    notify = false;
                    stdlib.setTimeout(function () {
                      notify = true;
                    }, 3000);
                }
           } catch (e) {
                logger.error("Не смогли найти файл внешней обработки \n путь "+getAbsolutePath(this.form.pathToEpf));
                logger.error(" "+e.description);
           }
        }

        try{
            events.disconnect(windows, "onDoModal", this)
        } catch (e) {}

        //events.connect(windows, "onDoModal", this);
        stdcommands.CDebug.EvalExpr.addHandler(this, "onEvalExpr")
    },
    
    v8debugEval:function(command){
        var result = null;
        if (!this.isDebugEvalEnabled()){
            return result;
        }
        try {
            result = v8debug.eval(command);
        } catch(e) {
            logger.error(e.description)
        }
        return result;
        
    },
    
    isDebugEvalEnabled: function(){
        // Команда "Шагнуть в" неактивна - значит, мы не в останове. Считать переменные нельзя, возможен вылет
        var state = stdcommands.CDebug.StepIn.getState()
        return state && state.enabled
    },
    
    exprText : function(text){
        var expText = '';
        if (!text) text = ''
        
        if (this.form.useEpf){
            var f = v8New('File', getAbsolutePath(this.form.pathToEpf));
            if (f.IsFile() && f.Exist()){
                expText = 'ВнешниеОбработки.Создать("' +f.FullName +'").'
            }
        }
        return expText + text;
    },
    
    debugQuery : function(text, doModal){
        if (!this.isDebugEvalEnabled())
            return
        
        exprCtrl = ''+ this.form.queryCommand + '(' + text + ', ' + (doModal ? 'Истина' :  'Ложь') + ')';
        
        exprCtrl = this.exprText(exprCtrl);
        var result = '';
        // Рассчитаем отладочное значение в строке
        var expr = this.v8debugEval(exprCtrl);
        if (!expr){
            if (expr.value.length>0){
                logger.error(expr.value);
            }
        }
    },
    
    startTechLog : function (){
        if (!this.isDebugEvalEnabled())
            return
        
        exprCtrl = ''+ this.form.startTechLog + '()';
        
        exprCtrl = this.exprText(exprCtrl);
        
        var result = '';
        // Рассчитаем отладочное значение в строке
        var expr = this.v8debugEval(exprCtrl);
        if (!expr){
            if (expr.value.length>0){
                logger.error(expr.value);
            }
        }
    },
    
    stopTechLog : function (){
        if (!this.isDebugEvalEnabled())
            return
        
        exprCtrl = ''+ this.form.stopTechLog + '()';
        
        exprCtrl = this.exprText(exprCtrl);
        
        var result = '';
        // Рассчитаем отладочное значение в строке
        var expr = this.v8debugEval(exprCtrl);
        if (!expr){
            if (expr.value.length>0){
                logger.error(expr.value);
            }
        }
    },
    
    research : function(text, doModal){
        
        if (!this.isDebugEvalEnabled())
            return
        if (!doModal) doModal = true;
        
        if (text.length==0){
            exp = this.getDebuggerExpr();
            if (!exp){
                text = exp.expression;
            }
        }
        exprCtrl = ''+ this.form.researchCommand + '(' + text + ', ' + (doModal ? 'Истина' :  'Ложь') + ')';
        
        exprCtrl = this.exprText(exprCtrl);
        
        logger.debug('research');
        logger.debug(exprCtrl);
        var result = '';
        
        // Рассчитаем отладочное значение в строке
        var expr = this.v8debugEval(exprCtrl);
        
        if (!expr)
            return result;
        
        if (!expr.value.match(/^\s*$/))
            result = ''+expr.value;
        
        logger.debug(result);
        return result;
    },
    
    pop : function(text, doModal){
        
        if (!this.isDebugEvalEnabled())
            return
        
        exprCtrl = ''+ this.form.poopCommand + '("' + text.replace(/"/g, '""') + '" , ' + (doModal ? '1' :  '0') + ')';
        
        exprCtrl = this.exprText(exprCtrl);
        
        logger.debug('pop');
        logger.debug(exprCtrl);
        
        var result = '';
        // Рассчитаем отладочное значение в строке
        var expr = this.v8debugEval(exprCtrl)
        
        if (!expr)
            return result;
        
        if (!expr.value.match(/^\s*$/))
            result = ''+expr.value;
        logger.debug('result:'+result);
        return result;
    },
    
    pr : function(p1, p2){
        if (!this.isDebugEvalEnabled()){
            logger.error('Мы не в режиме отладки, выходим из процедуры')
            return
        }
        
        
        exprCtrl = ''+ this.form.prCommand + '(' + p1 + ', ' + p2.replace(/"/g, '""') + ')';
        
        exprCtrl = this.exprText(exprCtrl);
        
        logger.debug('pr');
        logger.debug(exprCtrl);
        
        result = '';
        
        // Рассчитаем отладочное значение в строке
        var expr = this.v8debugEval(exprCtrl);
        if (!expr)
            return result;
        
        //var expr = this.v8debugEval(exprCtrl)
        
        if (!expr.value.match(/^\s*$/))
            result = ''+expr.value;

        return result;
    },
    
    operate:function(text){
        
        exprCtrl = ''+ text;
        
        exprCtrl = this.exprText(exprCtrl);
        
        logger.debug('operate');
        logger.debug(exprCtrl);
        
        result = '';
        
        // Рассчитаем отладочное значение в строке
        var expr = this.v8debugEval(exprCtrl);
        if (!expr)
            return result;
        
        //var expr = this.v8debugEval(exprCtrl)
        if (!expr.sucessed){
            logger.error('Ошибка выполнения комманды '+expr +' \n Ошибка:'+expr.value);
        }
        if (!expr.value.match(/^\s*$/))
            result = ''+expr.value;

        return result;
    },
    
    du : function(progText, p1, p2, p3, p4){
        //Ду(Знач ТекстПрограммы, п1 = 0, п2 = 0, п3 = 0, п4 = 0)
        
        if (!p1) p1='0';
        if (!p2) p2='0';
        if (!p3) p3='0';
        if (!p4) p4='0';
        
                
        
        
        exprCtrl = ''+ this.form.duCommand + '("' + progText.replace(/"/g, '""') + '" , '+p1 + ','+p2+ ',' + p3 + ','+ p4+')';
        
        exprCtrl = this.exprText(exprCtrl);
        
        logger.debug('du');
        logger.debug(exprCtrl);
        
        result = '';
        
        // Рассчитаем отладочное значение в строке
        var expr = this.v8debugEval(exprCtrl);
        if (!expr){
            logger.debug('Результат вычисления неудачный');
            return result;
        }

        
        //var expr = this.v8debugEval(exprCtrl)
        logger.trace(expr);
        if (!expr.value.match(/^\s*$/))
            result = ''+expr.value;

        return result;
        
    },

    getDebuggerExpr:function(){

        if (windows.modalMode != msModal)
            return false;

         if (!this.grid)
            return false;


        var row = this.grid.currentRow;
        if(!row) row = this.grid.dataSource.root.firstChild;
        var expressionvalue = row.getCellValue(1);
        debugger;
        if (!!this.lastModalForm){
            var control = this.lastModalForm.getControl("Expression");
            var expression = control.value;
        } else {
            var expression = row.getCellValue(0);            
        }



        return {
            "expression":expression, 
            "expressionvalue":expressionvalue           
        };

    },

    setDebuggerOnif:function(exp, autoclose){
        if (!exp)
            return false;

        if (!autoclose) autoclose = true;
        this.autocloseExpression = autoclose;

        if (windows.modalMode == msModal && !!this.lastModalForm){
            this.lastModalForm.sendEvent(this.lastModalForm.getControl('ButtonClose').id, 0);
        }
        wnd =new TextWindow();
        if (!wnd)
            return false;
        
        var state = stdcommands.CDebug.BrkptCond.getState();
        if (state && state.enabled){
            this.valueBrkptCond = exp;
            var es = this

            stdlib.setTimeout(function(){
                events.connect(windows, "onDoModal", es, "hookBrkptCond1");       
                stdcommands.CDebug.BrkptCond.send();
                events.disconnect(windows, "onDoModal", es, "hookBrkptCond1");    
            }, 1000);
            
        }
        
        

    },
    
    hookBrkptCond1:function(dlgInfo){
        try{
            if(dlgInfo.stage == beforeDoModal && dlgInfo.form.getControl(0).name == "Condition")
            {
                dlgInfo.form.getControl("Condition").value = this.valueBrkptCond;

                dlgInfo.cancel = !this.autocloseExpression?false:true;
                dlgInfo.result = mbaOk;
            } 
        } catch(e){}
        
    },

    onEvalExpr:function(cmd) {
        if(cmd.isBefore)    // Вызывается до обработки команды 1С
            events.connect(windows, "onDoModal", this, "onDoModal")
        else                // вызывается после обработки команды 1С
        {
            try{
                events.disconnect(windows, "onDoModal", this, "onDoModal");
            } catch(e){};
            
            this.grid = null
            this.lastModalForm = null; 
        }
    },

    onDoModal:function (dlgInfo) {
        try{
            if(dlgInfo.stage == afterInitial){
                if (dlgInfo.form.getControl(0).name == "Expression"){
                    this.grid = dlgInfo.form.getControl('ResultGrid').extInterface;
                    this.lastModalForm = dlgInfo.form;
                    return true;
                } else {
                    return;
                }
                
            }
        }catch(e){
            //Message(e)
        }
        return false;
    },

    
    beforeExitApp : function () {
        //this.watcher.stopWatch();
    }, 
    
    ButtonPR_Click : function (Button){
        var p1 = this.form.Controls.TextDocumentFieldP1.GetText();
        var p2 = this.form.Controls.TextDocumentFieldP2.GetText();
        logger.debug('ButtonPR_Click');
        logger.debug('p1:'+p1 + '\n p2:'+p2);
        result = this.pr(p1, p2);
        Message(''+result);
    },
    
    ButtonDuCalculate_Click : function(Button){
        var text = this.form.Controls.TextDocumentFieldProgText.GetText();
        
        var p1 = this.form.Controls.TextDocumentFieldDuP1.GetText();
        var p2 = this.form.Controls.TextDocumentFieldDuP2.GetText();
        var p3 = this.form.Controls.TextDocumentFieldDuP3.GetText();
        var p4 = this.form.Controls.TextDocumentFieldDuP4.GetText();
        
        logger.debug('ButtonDuCalculate_Click');
        logger.debug('text:'+text);
        logger.debug('p1:'+p1 +' p2:'+p2+' p3:'+p3+' p4:'+p4);
        
        result = this.du(text, p1, p2, p3, p4);
        if (result.length>0){
            Message(''+result);
        }

    },
    
    ButtonPop_Click:function(Button){
        var text = this.form.Controls.TextDocumentFieldOpText.GetText();
        this.form.Controls.TextDocumentFieldOpTextCalculate.SetText(this.pop(text, true));
        
    },
    
    ButtonOpCalculate_Click:function(Button){
        var text = this.form.Controls.TextDocumentFieldOpTextCalculate.GetText();
        result = this.operate(text);
    },
    
    changeSettings : function(){
        this.show(false);
    },
    
    saveSettings_Click : function(Button){
        this.saveSettings();
        this.loadSettings();
    },
    
    Cancel_Click : function(Button){
        this.close();
    },
    
    pathToEpf_StartChoice:function(Control, DefaultHandler){
        ДиалогОткрытияФайла=v8New("ДиалогВыбораФайла", РежимДиалогаВыбораФайла.Открытие)
        ДиалогОткрытияФайла.ПолноеИмяФайла = ""+Control.val.Значение;
        ДиалогОткрытияФайла.Заголовок = "Выберите внешнюю обработку"
        if(ДиалогОткрытияФайла.Выбрать()==false) {
            
        } else {
            Control.val.Значение = ДиалогОткрытияФайла.ПолноеИмяФайла;
        }
    } 

})





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

function fileExists(path) {

    if (path) 
    {
        var f = v8New('File', path);
        return f.IsFile() && f.Exist();
    }
    
    return false;
}

function pathExists(path) {

    if (path) 
    {
        var f = v8New('File', path);
        return f.Exist();
    }
    
    return false;
}



function getAbsolutePath(path) {

    // Путь относительный?
    if (path.match(/^\.{1,2}[\/\\]/))
    {
        // Относительные пути должны задаваться относительно главного каталога Снегопата.
        var mainFolder = profileRoot.getValue("Snegopat/MainFolder");
        return mainFolder + path;
    }
    
    return path;
}

function GetDebugInstruments() {
    if (!DebugInstruments._instance)
        new DebugInstruments();
    
    return DebugInstruments._instance;
}



//var cht = GetFormatModule();
events.connect(Designer, "beforeExitApp", GetDebugInstruments());