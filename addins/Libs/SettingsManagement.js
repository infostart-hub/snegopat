$engine JScript
$uname SettingsManagement
$dname Библиотека SettingsManagement
$addin global
$addin stdlib

////////////////////////////////////////////////////////////////////////////////////////
////{ ФабрикаОбъектов
////

SettingsManagement = stdlib.Class.extend({});

SettingsManagement.CreateManager = function (rootPath, defaults, pflStoreType) {
    return new _SettingsManager(rootPath, defaults, pflStoreType);
}

////}

////////////////////////////////////////////////////////////////////////////////////////
////{ SettingsManager(script, defaults)
////

_SettingsManager = stdlib.Class.extend({

    construct : function(rootPath, defaults, pflStoreType) {
        this.rootPath = rootPath;
        this.pflStoreType = pflStoreType || pflSnegopat;
        
        var emptySettings = {};
        this.DefaultSettings = defaults || emptySettings;
            
        for(var setting in this.DefaultSettings)
            profileRoot.createValue(this.GetFullSettingPath(setting), this.DefaultSettings[setting], this.pflStoreType);
                    
        this.current = {};
        
        for(var setting in this.DefaultSettings)
            this.current[setting] = profileRoot.getValue(this.GetFullSettingPath(setting));
    },

    ReadFromForm : function(form) {
        for(var setting in this.current)
            this.current[setting] = form[setting];
    },

    ApplyToForm : function(form) {
		if (!form)
			throw "Не задан объект формы";

        for(var setting in this.current)
        {
            var value = this.current[setting];
            
            if (value === undefined || value === null)
                value = this.DefaultSettings[setting];
			
			try {
				form[setting] = value;
			} catch (e) {
				throw "Не удалось установить свойство " + setting + " при загрузке настроек формы";
			}
        }
    },

    GetFullSettingPath : function(settingName) {
        return this.rootPath + "/" + settingName;
    },

    LoadSettings : function() {
        this.current = {};
        
        for(var setting in this.DefaultSettings)
            this.current[setting] = profileRoot.getValue(this.GetFullSettingPath(setting));
            
        return this.current;
    },

    SaveSettings : function() {
        for(var setting in this.current)
            profileRoot.setValue(this.GetFullSettingPath(setting), this.current[setting]);
    }
});
////} SettingsManager

