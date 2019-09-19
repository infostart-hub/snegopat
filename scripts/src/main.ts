//engine: JScript
//uname: starter
//debug: no
//descr: Самый первый скрипт, который загружает все остальные аддины
//author: orefkov
//help: inplace

/// <reference path="../snegopat.d.ts"/>
/// <reference path="../v8.d.ts"/>

/*@
Это основной скрипт для запуска работы подсистемы аддинов в снегопате.
Большая часть функционала снегопата, а также почти весь пользовательский интерфейс
реализован в виде скриптов, которые для основного движка снегопата сами являются
обычными аддинами. Основной движок снегопата сначала инициализирует свою часть,
после чего дожидается создания и отображения основного окна. После этого он загружает этот скрипт
как первый и единственный аддин, загружаемый самим снегопатом.
Все остальные аддины загружаются уже этим скриптом посредством работы со SnegAPI.
@*/

(function () {
    // Выгрузимся сами. Аддин удаляется из списка аддинов сразу, но скрипт продолжает работу
    // до выхода из функции.
    addins.unloadAddin(addins.byUniqueName(SelfScript.uniqueName));
    // проверим версию движка
    if (ScriptEngineMajorVersion() < 5 || (ScriptEngineMajorVersion() == 5 && ScriptEngineMinorVersion() < 7)) {
        MessageBox("Плохая версия скриптового движка. Обновите JScript.", mbOK, "Снегопат", 5);
        return;
    }
    // Загрузим аддины
    loadStdAddins() && loadUserAddins();

    // Загрузка стандартных аддинов
    function loadStdAddins() {
        var group = addins.sys;
        var prefix = "script:<core>scripts\\";
        return loadAddin(prefix + "vbs.vbs", group) &&
            loadAddin(prefix + "commands.js", addins.root) &&
            loadAddin(prefix + "marked.js", group) &&
            loadAddin(prefix + "std.js", group) &&
            loadAddin(prefix + "hotkeys.js", group) &&
            loadAddin(prefix + "macroswnd.js", group) &&
            loadAddin(prefix + "help.js", group) &&
            loadAddin(prefix + "repo.js", group) &&
            loadAddin(prefix + "snegopat.js", group) &&
            loadAddin(prefix + "editors.js", group) &&
            loadAddin(prefix + "snegopatwnd.js", group);
    }

    function loadUserAddins() {
        // Список загружаемых аддинов хранится в виде дерева значений в настройках снегопата
        var profileKey = "Snegopat/AddinsTree";
        var vt = v8New("ValueTree");
        vt.Columns.Add("Addin");
        vt.Columns.Add("isGroup");
        profileRoot.createValue(profileKey, vt, pflSnegopat);
        var snwnd = <any>addins.byUniqueName("snegopatwnd").object();
        (function (rows, parentGroup) {
            for (var i = 0, c = rows.count(); i < c; i++) {
                var row = rows.get(i)
                if (row.isGroup)
                    arguments.callee(row.rows, parentGroup.addGroup(row.Addin));
                else
                    loadAddin(row.Addin, parentGroup);
            }
        })(profileRoot.getValue(profileKey).Строки, addins.users);
        snwnd.addinsProfileKey = profileKey;
        snwnd.restoreWindowState();
    }

    function loadAddin(loaderStr, group) {
        //Message("Load " + loaderStr);
        if (!addins.loadAddin(loaderStr, group)) {
            Message("Ошибка загрузки аддина '" + loaderStr + "': " + addins.lastAddinError);
            return false;
        }
        return true;
    }
})();
