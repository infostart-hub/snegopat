/* pathes.as
    Установка путей к различным папкам снегопата.
    Устанавливаются следующие пути:
    main - путь к корневой папке снегопата
    core - путь к папке с движком снегопата
    addins - путь к официальному репозитарию аддинов
    tools - путь к папке с разными вспомогательными инструментами
    data - путь к папке с данными
    help - путь к папке со сформированными файлами справки
    custom - путь к пользовательскому репозитарию аддинов
    tmp - путь к папке временных файлов
    Путь main - всегда показывает на каталог снегопата.
    Путь tmp - всегда на папку с временными файлами.
    К остальным папкам пути устанавливаются в каталоге снегопата,
    однако для них можно задать альтернативные пути:
    - либо в командной строке указать -sn-path-xxx=путь
    - либо установить переменную окружения sn_path_xxx
    Если альтернативный путь начинается с точки, перед ним добавляется путь
    к папке снегопата.
*/
#pragma once
#include "../../all.h"

void initPathes() {
    &&pathes = Pathes();
}

Pathes&& pathes;
string cmdLine;

class Pathes {
    string _main;
    string _core;
    string _addins;
    string _tools;
    string _data;
    string _help;
    string _custom;
    string _repo;
    string _tmp;

    Pathes() {
        _main = myFolder;
        _tmp.setLength(GetTempPath(500, _tmp.setLength(500)));
        cmdLine = stringFromAddress(GetCommandLine());
        setPath(_core, "core");
        setPath(_addins, "addins", "core\\addins");
        setPath(_tools, "tools", "core\\tools");
        setPath(_data, "data");
        setPath(_help, "help");
        setPath(_custom, "custom");
        setPath(_repo, "repo");
    }
    private void setPath(string& s, const string& name, const string& def = string()) {
        string path;
        RegExp re("-sn-path-" + name + "\\s*=\\s*(?:\"([^\"]+)\"|(\\S+))");
        auto fnd = re.match(cmdLine);
        if (fnd.matches > 0) {
            path = fnd.text(0, 1);
            if (path.isEmpty())
                path = fnd.text(0, 2);
            //Print("from cmd line " + name + " set to " + path);
        } else {
            string exp;
            string env = "%sn_path_" + name + "%";
            exp.setLength(ExpandEnvironmentStrings(env.cstr, exp.setLength(300), 300));
            //Print("exp=" + exp);
            if (exp[0] != '%') {
                path = exp;
                //Print("from env " + name + " set to " + path);
            }
        }
        if (path.isEmpty()) {
            s = _main + (def.length > 0 ? def : name);
            //Print("set " + name + " to default " + s);
        } else
            s = (path[0] == '.' ? _main : "") + path;
        if (s[s.length - 1] != '\\')
            s += "\\";
        //Print(name + " set to " + s);
    }
};
