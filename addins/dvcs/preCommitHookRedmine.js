//engine: JScript
//uname: PreCommitHookRedmine
//dname: Хук перед помещением в хранилище  
//addin: stdlib
//addin: stdcommands

// (c) Сосна Евгений <shenja@sosna.zp.ua>
// Зроблено в Україні. 

stdlib.require('TextWindow.js', SelfScript);
stdlib.require('ScriptForm.js', SelfScript);
stdlib.require('log4js.js', SelfScript);

global.connectGlobals(SelfScript);

var logger = Log4js.getLogger(SelfScript.uniqueName);
var appender = new Log4js.BrowserConsoleAppender();
appender.setLayout(new Log4js.PatternLayout(Log4js.PatternLayout.TTCC_CONVERSION_PATTERN));
logger.addAppender(appender);
logger.setLevel(Log4js.Level.ERROR);

SelfScript.self['macrosНастройка'] = function() {
    PreCommitHookRedmine = GetPreCommitHookRedmine();
    PreCommitHookRedmine.show();
}

SelfScript.self['macrosУстановитьТекст'] = function(){
    PreCommitHookRedmine = GetPreCommitHookRedmine();
    PreCommitHookRedmine.setText();
}


PreCommitHookRedmine = ScriptForm.extend({

    settingsRootPath : SelfScript.uniqueName,
    
    settings : {
        pflBase : {
            'usePreCommitHook': false,
            'redmineAddress' : "",
            'redmineQuery': "" ,
            'port':80,
            'settings_commit_ref_keywords': "refs"
        }
    },

    construct : function () {
        
        this._super(SelfScript.fullPath.replace(/.js$/, '.epf|Форма')); //Загрузим форму с настройками
        this.loadSettings(); //Загрузим сохраненные настройки. 
        
        PreCommitHookRedmine._instance = this;
    }, 
    
    loadSettings: function(){
        this._super();

        if(this.form.usePreCommitHook){
            events.connect(windows, "onDoModal", this, "hookCfgStorWindow")
        }else {
            try{
                events.disconnect(windows, "onDoModal", this, "hookCfgStorWindow");
            } catch(e){
                //Message("Ошибка :"+e.description);
            }
        }

               
    },

    hookCfgStorWindow:function(dlgInfo){
        if(dlgInfo.stage == openModalWnd)
        {
            try{ //иногда вылетают странные исключения :( при работе с элементами форм
                //FIXME: добавить английский заголовок и других языков. 
                reCaptionCfgStore = /Помещение\sобъектов\sв\sхранилище\sконфигурации/ig
                if (reCaptionCfgStore.test(dlgInfo.Caption)){
                    ctr = dlgInfo.form.getControl("EnrollComment");
                    ctr.value = this.getText();
                }
            } catch(e){}

        }
    },

    getText:function(){
        
        var re = new RegExp("<entry>\\n\\s*<title>(.{1,}\\s#(\\d{1,})\\s\\(.*\\)):(.*)</title>", "gmi");

        var tempfile = ПолучитьИмяВременногоФайла();
        var text = "";
        try{

            var http = v8New("HTTPСоединение", this.form.redmineAddress, this.form.port);
            http.get(this.form.redmineQuery, tempfile);


            var TextDoc = v8New("TextDocument");
            TextDoc.Read(tempfile, "UTF-8");    
            textFull = TextDoc.GetText();
            logger.debug("full text:"+textFull);
            
            var matches;
            logger.debug("re:"+re);
            
        } catch(e){
            Message(""+e.description);
        }

        while ((matches = re.exec(textFull)) != null)
            {
                logger.debug(matches[0]);
                issue = matches[2];
                issueText = matches[3];

                text = text +"("+this.form.settings_commit_ref_keywords+" #"+issue+") :"+issueText + "\n";

            }
      return text;
    },

    setText : function(){
        text = this.getText();
        if (text.length > 0){
            var wnd = GetTextWindow();
            if (!wnd){
                Message(text);
            } else{

                wnd.SetText(text);
            }
        }
    },

    Ok_Click:function(Button){
        this.saveSettings();
        this.loadSettings();
        this.form.Close();
    }, 

    Close_Click:function(Button){
        this.form.Close();
    }

})


function GetPreCommitHookRedmine() {
    if (!PreCommitHookRedmine._instance)
        new PreCommitHookRedmine();
    
    return PreCommitHookRedmine._instance;
}

GetPreCommitHookRedmine();