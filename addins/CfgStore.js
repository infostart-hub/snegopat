//engine: JScript
//uname: CfgStore
//dname: Хранилище
//addin: global
//addin: stdcommands
//addin:	 stdlib

////////////////////////////////////////////////////////////////////////////////////////
////{ Cкрипт "Хранилище" (CfgStore.js) для проекта "Снегопат"
////
//// Описание:
////	Есть макрос Захватить объект в хранилище (временно хоткей "Ctrl + Alt + T")
////	макрос захватывает любой текущий объект (модуль, форму, макет, сам объект и т.п.) в хранилище.
////	Важно: захват всегда идет без рекурсии, только текущий объект, имхо это более правильно при редактировании текущего объекта.
////	для внешних объектов макрос ничего не делает.
////
//// Автор: Артур Аюханов <aartbear@gmail.com>
////}
////////////////////////////////////////////////////////////////////////////////////////

stdlib.require('ScriptForm.js', SelfScript);
stdlib.require('log4js.js', SelfScript);
stdlib.require('SyntaxAnalysis.js', SelfScript);
stdlib.require('TextWindow.js', SelfScript);

global.connectGlobals(SelfScript)

var logger = Log4js.getLogger(SelfScript.uniqueName);
var appender = new Log4js.BrowserConsoleAppender();
appender.setLayout(new Log4js.PatternLayout(Log4js.PatternLayout.TTCC_CONVERSION_PATTERN));
appenders = [];
appenders.push(appender);
logger.onlog = new Log4js.CustomEvent();
logger.onclear = new Log4js.CustomEvent();

logger.setAppenders(appenders);
logger.setLevel(Log4js.Level.ERROR);


function getPredefinedHotkeys(predef){
    predef.setVersion(1);
    predef.add("Захватить объект в хранилище", "Ctrl + Alt + T");
}

function CaptureIntoCfgStore(mdObj){
    if (!mdObj)
        return
    try{
	if (mdObj != metadata.current.rootObject)
            res1 = mdObj.activateInTree();

        res2 = events.connect(windows, "onDoModal", SelfScript.self, "hookCaptureCfgStoreWindow")
        isEventConnected = true

        res = stdcommands.CfgStore.CaptureIntoCfgStore.send() // true если успешно

        if(isEventConnected)
            events.disconnect(windows, "onDoModal", SelfScript.self, "hookCaptureCfgStoreWindow")
    } catch (e) {
        Message("Ошибка : " + e.description)
    }
}

isEventConnected = false

SelfScript.self['macrosЗахватить объект в хранилище'] = function() {

    try{ //иногда вылетают странные исключения :( при работе с элементами форм
        view = windows.getActiveView();
        if (!view || !view.mdObj || view.mdObj.container != metadata.current) return false;
        CaptureIntoCfgStore(view.mdObj);
        if(view)
            view.activate();
    }catch(e)
    {
        Message("Ошибка : " + e.description)
    }

    return true;
}

SelfScript.self['macrosПоместить объект в хранилище'] = function() {

    try{ //иногда вылетают странные исключения :( при работе с элементами форм
        view = windows.getActiveView();
        if (!view || !view.mdObj || view.mdObj.container != metadata.current) return false;


	if (view.mdObj != metadata.current.rootObject)
            res1 = view.mdObj.activateInTree();

        isEventConnected = true

        res = stdcommands.CfgStore.StoreIntoCfgStore.send() // true если успешно

    }catch(e)
    {
        Message("Ошибка : " + e.description)
    }

    return true;
}


function hookCaptureCfgStoreWindow(dlgInfo){
   if(dlgInfo.stage == openModalWnd)
   {
        try{ //иногда вылетают странные исключения :( при работе с элементами форм
            dlgInfo.form.getControl("GetRecursive").value = false;

            events.disconnect(windows, "onDoModal", SelfScript.self, "hookCaptureCfgStoreWindow")
            isEventConnected = false

            //new ActiveXObject("WScript.Shell").SendKeys("^{ENTER}")
            // Более идеологически верный способ
            dlgInfo.cancel = true
            dlgInfo.result = mbaOK
        }catch(e)
        {
            Message("Ошибка : " + e.description)
        }
   }
}

function hookCfgStorWindow(dlgInfo){
    if(dlgInfo.stage == openModalWnd)
        {
            try{ //иногда вылетают странные исключения :( при работе с элементами форм
                //FIXME: добавить английский заголовок и других языков.
                reCaptionCfgStore = /Захват\sобъектов\sв\sхранилище\sконфигурации/ig
                if (reCaptionCfgStore.test(dlgInfo.Caption)){
                    md = metadata.current;
                    if (!md){
                        return;
                    }
                    nameMd = md.rootObject.name;
                    reRootObject = new RegExp(nameMd, 'ig');
                    reviseObjectList = toV8Value(dlgInfo.form.getControl("ReviseObjectList").value);
                    reviesObjectText = reviseObjectList.toStringInternal();
                    if (reRootObject.test(reviesObjectText)){
                        dlgInfo.form.getControl("GetRecursive").value = false;
                    }
                }
            }catch(e){
                 Message("Ошибка : " + e.description)
            }
       }
}

SelfScript.self['macrosПерехват рекурсивного захвата корня'] = function() {
    result = events.connect(windows, "onDoModal", SelfScript.self, "hookCfgStorWindow")
}

SelfScript.self['macrosСтоп перехвата рекурсивного захвата корня'] = function() {
    try{
        result = events.disconnect(windows, "onDoModal", SelfScript.self, "hookCfgStorWindow")
    } catch(e){
        Message("Ошибка :"+e.description);
    }
}


FilterCurrentUserInCfgStore = stdlib.Class.extend({
    construct : function () {
        this.groupId = "{6B7291BF-BCD2-41AF-BAC7-414D47CC6E6A}";
        this.numId = 53;
        this.count = 3;
        this.re = new RegExp(/Хранилище конфигурации/);
        this.Form = null;
        FilterCurrentUserInCfgStore._instance = this;
        stdcommands.CfgStore.OpenCfgStore.addHandler(this, "OpenCfgStore");
    },

    OpenCfgStore:function (cmd) {
		if(!cmd.isBefore)
	    {
	        logger.debug("OpenCfgStore is before start")
            try {
                this.count = 3;
                //start timer
                stdlib.setTimeout(function(){
                    var filter = GetFilterCurrentUserInCfgStore();
                    filter.setFilter();
                }, 2000);
             } catch (e) { }
	    }  else {
	        //Message("Удалить лишние файлы.");
            logger.debug("OpenCfgStore is after start")
	    }
	},

    setFilter:function(){
         this.foundWindows(windows.mdiView.enumChilds());
         this.count--;

         logger.debug("count "+this.count);

        if(!this.Form && this.count > 0){
            logger.debug("Не нашли формы, но еще раз запустим таймер "+this.count);
            stdlib.setTimeout(function(){
                var filter = GetFilterCurrentUserInCfgStore();
                filter.setFilter();
            }, 2000);

            return;
            
        } else {
            this.count = 0;
        }

        if(!this.Form){
            logger.error("Не найденна форма хранилища")
            return;
        }

        events.connect(windows, "onDoModal", this, "setCfgWndFilter");
        this.Form.sendCommand(this.groupId, this.numId);


    },

    setCfgWndFilter:function(dlgInfo){
        logger.debug(dlgInfo.stage);
        if(dlgInfo.stage == openModalWnd){
            try{ //иногда вылетают странные исключения :( при работе с элементами форм
                //FIXME: добавить английский заголовок и других языков.
                reCaptionCfgStore = /Отбор\sобъектов\sхранилища/ig
                if (reCaptionCfgStore.test(dlgInfo.Caption)){
                    dlgInfo.form.getControl("FilterType").value = 2
                    dlgInfo.cancel = true
                    dlgInfo.result = mbaOK
                }
            }catch(e){
                    logger.error("Ошибка : " + e.description);
            }
        } else if(dlgInfo.stage == afterDoModal){
            try {
                events.disconnect(windows, "onDoModal", this, "setCfgWndFilter");
            } catch (e) {
                logger.error("Ошибка disconnect: " + e.description);
            }
        }
    },

    foundWindows:function(childs){
                // При посылке команды окно стает активным, чтобы не нарушить порядок окон, переберем их
                // в обратном порядке

                for(var i = childs.count; i-- ; )
                {
                    var view = childs.item(i)
                    if(view.isContainer != vctNo)
                        this.foundWindows(view.enumChilds())
                    else
                    {
                        // Возможно, это окно формы, но не открыто на вкладке модуля

                        var r = view.title;
                        logger.debug("find "+r+"re "+this.re);

                        var mathes = r.match(this.re);
                        if (mathes && mathes.length) {
                            this.title = r
                            var caption = ''+windows.caption;
                            if (view.getInternalForm()){
                                logger.debug("found "+r);
                                this.Form = view.getInternalForm();
                                return;
                            }


                        }
                        //if(view.mdObj && view.mdProp && view.mdObj.isPropModule(view.mdProp.id))
                        //    view.mdObj.openModule(view.mdProp.id)  // переключим на вкладку модуля
                    }
                }
    }

})

function GetFilterCurrentUserInCfgStore() {
    if (!FilterCurrentUserInCfgStore._instance)
        new FilterCurrentUserInCfgStore();
    return FilterCurrentUserInCfgStore._instance;
}

var fuCfgStroe = GetFilterCurrentUserInCfgStore();

//stdlib.setTimeout(function() { events.connect(windows, "onDoModal", SelfScript.self, "hookCfgStorWindow"); }, 3000);
