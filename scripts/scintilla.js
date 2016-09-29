//engine: JScript
//uname: scintilla
//dname: Настройка редактора Scintilla
//debug: yes
//descr: Скрипт для настройки редактора Scintilla
//author: orefkov
//help: inplace
//addin: global
//addin: scintilla_int
var SetupFormObject = (function () {
    function SetupFormObject() {
        this.form = loadScriptForm(env.pathes.core + 'forms\\scintilla.ssf', this);
    }
    SetupFormObject.get = function () {
        if (!SetupFormObject.one)
            SetupFormObject.one = new SetupFormObject;
        return SetupFormObject.one;
    };
    return SetupFormObject;
})();
function macros_setup() {
    SetupFormObject.get().form.Open();
}
