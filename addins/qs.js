//engine: JScript
//uname: qs
//dname: Быстрый поиск
//addin: stdcommands

var ellip = String.fromCharCode(0x2026);
// Подключение аддинов, в новой версии будет автоматом через import
var stdlib = addins.byUniqueName("stdlib").object();
var global = addins.byUniqueName("global").object();
global.connectGlobals(SelfScript);
var form;
var pflPath = "addins/quickSearch/dbpath";
var dbPath = "";
var StoreModel = (function () {
    var db;
    var createStruct = "drop table if exists modules;\n        drop table if exists lines;\n        drop table if exists changed;\n        drop table if exists search;\n        create table modules(id integer primary key not null, name text unique, obj text, prop text);\n        create table lines(docid integer primary key not null, mid integer references modules(id) on delete cascade, num integer);\n        create table changed(obj text primary key not null, name text);\n        create virtual table search using fts4(tokenize=unicode61);\n        create trigger linesdelete after delete on lines begin delete from search where search.docid=old.docid;end";
    var queries = {
        qTextSearch: { q: null, t: "select offsets(search) MatchInfo, search.content Content, modules.name Module, lines.num Line, obj, prop\n            from search inner join lines on lines.docid = search.docid inner join modules on lines.mid = modules.id\n            where search match @text limit 500" },
        qAllSearch: { q: null, t: "select search.content Content, modules.name Module, lines.num Line, obj, prop\n            from search inner join lines on lines.docid = search.docid inner join modules on lines.mid = modules.id\n            where search.content like @text escape '$' limit 500" },
        qInsModule: { q: null, t: "insert into modules values(null, @text, @obj, @prop)" },
        qInsText: { q: null, t: "insert into search values(@text)" },
        qInsLine: { q: null, t: "insert into lines values(@docid, @mdid, @num)" },
        qModChanged: { q: null, t: "insert or replace into changed values(@obj, @name)" },
        qDelModules: { q: null, t: "delete from modules where name between @name and @name||char(0xfffd)" },
        qClearChanged: { q: null, t: "delete from changed" },
        qGetChanged: { q: null, t: "select obj, name from changed" }
    };
    function prepareAllQueries() {
        for (var k in queries) {
            queries[k].q = db.prepare(queries[k].t);
        }
    }
    function closeAllQueries() {
        for (var k in queries) {
            queries[k].q = undefined;
        }
    }
    function doSearch(search, type) {
        return queries[type].q.bind(1, search).exec();
    }
    var Database = (function () {
        function Database() {
        }
        Database.prototype.open = function (path) {
            this.close();
            db = sqliteOpen(path);
            try {
                db.exec("pragma encoding='utf-16le';pragma journal_mode=off;pragma foreign_keys=on");
                if (db.prepare("select exists(select * from sqlite_master where type = 'table' and name = 'search')").queryValue() == 0)
                    this.initStruct();
                prepareAllQueries();
                return true;
            }
            catch (e) {
                Message(e.description);
                this.close();
                return false;
            }
        };
        Database.prototype.close = function () {
            if (db) {
                db.close();
                db = undefined;
                closeAllQueries();
            }
        };
        Database.prototype.isOpen = function () { return !!db; };
        Database.prototype.findFullText = function (pattern) {
            return doSearch(pattern, 'qTextSearch');
        };
        Database.prototype.findAllText = function (pattern) {
            return doSearch(pattern, 'qAllSearch');
        };
        Database.prototype.initStruct = function () {
            db.exec(createStruct);
        };
        Database.prototype.insertModule = function (modName, obj, prop) {
            return queries.qInsModule.q.bind(1, modName).bind(2, obj).bind(3, prop).exec(true);
        };
        Database.prototype.insertLine = function (line, modid, num) {
            queries.qInsLine.q.bind(1, queries.qInsText.q.bind(1, line).exec(true)).bind(2, modid).bind(3, num).exec();
        };
        Database.prototype.setModuleChanged = function (obj, name) {
            queries.qModChanged.q.bind(1, obj).bind(2, name).exec();
        };
        Database.prototype.deleteModules = function (name) {
            queries.qDelModules.q.bind(1, name).exec();
        };
        Database.prototype.clearChanged = function () {
            queries.qClearChanged.q.exec();
        };
        Database.prototype.begin = function () { db.exec("begin"); };
        Database.prototype.end = function () { db.exec("analyze;end"); };
        ;
        return Database;
    })();
    ;
    return new Database;
})();
/**
 * Инициализация скрипта
 */
(function () {
    profileRoot.createValue(pflPath, "", pflCompBaseUser); // База для поиска создаётся своя на каждого пользователя каждой базы 1С на этом компе
    dbPath = profileRoot.getValue(pflPath);
    if (dbPath.length) {
        StoreModel.open(dbPath);
    }
    events.connect(metadata, "MetaDataEvent", SelfScript.self);
})();
// Отслеживание событий метаданных для поддержания актуальности поисковой базы
function MetaDataEvent(mdp) {
    if (!StoreModel.isOpen())
        return;
    if (mdp.kind == mdeChangeProp) {
    }
    /*    if (mdp.kind == mdeAfterSave) {
            Message("qs md saved");
            if (db)
                db.exec("delete from changed");
        } else if (db && mdp.obj && mdp.prop && mdp.obj.isPropModule(mdp.prop.id) && mdp.container == metadata.current) {
            var s = mdObjFullName(mdp.obj) + ":" + mdp.prop.name(1);
            Message("qs md changed " + s);
            qAddChanged.bind(1, mdp.obj.id).bind(2, mdp.prop.id).bind(3, s).exec();
        }*/
}
/**
 * Начальное заполнение базы данных. Всё старое содержимое удаляется
 */
function prepareBase() {
    if (!StoreModel.isOpen())
        return;
    StoreModel.begin();
    StoreModel.initStruct();
    processMetaDataObject(metadata.current.rootObject);
    StoreModel.end();
    MessageBox("Готово");
}
function processMetaDataObject(from) {
    var props = {};
    stdlib.forAllMdObjects(metadata.current.rootObject, function (mdObj) {
        var mdc = mdObj.mdclass;
        var pm = props[mdc.id];
        if (!pm) {
            pm = [];
            for (var i = 0, k = mdc.propertiesCount; i < k; i++) {
                if (mdObj.isPropModule(i))
                    pm.push(i);
            }
            props[mdc.id] = pm;
        }
        if (pm.length) {
            var objectName = mdObjFullName(mdObj);
            for (var p in pm) {
                var modtext = mdObj.getModuleText(pm[p]);
                if (modtext.length) {
                    var mdp = mdc.propertyAt(pm[p]);
                    var modid = StoreModel.insertModule(objectName + "." + mdp.name(1), mdObj.id, mdp.id);
                    var lines = modtext.split("\n");
                    for (var num = 0; num < lines.length; num++) {
                        var line = lines[num];
                        if (line.length)
                            StoreModel.insertLine(line, modid, 1 + num);
                    }
                }
            }
        }
    });
}
function CmdPanelprepare() {
    if (DoQueryBox("Начальное заполнение поисковой базы может занять длительное время. Поизвести его?", QuestionDialogMode.YesNo) != DialogReturnCode.Yes)
        return;
    if (dbPath.length) {
        if (DoQueryBox("Создать новую поисковую базу?", QuestionDialogMode.YesNo) == DialogReturnCode.Yes) {
            StoreModel.close();
            dbPath = "";
        }
    }
    if (!dbPath.length) {
        var sel = v8New("FileDialog", FileDialogMode.Save);
        sel.Directory = stdlib.getSnegopatMainFolder();
        sel.Title = "Укажите расположение файла базы данных для поиска в этой базе";
        sel.Filter = "Базы данных sqlite (*.db)|*.db|Все файлы|*";
        sel.FullFileName = ibName() + ".db";
        sel.DefaultExt = "db";
        if (!sel.Choose())
            return;
        dbPath = sel.FullFileName;
        form.Controls.dbPath.Заголовок = dbPath;
        profileRoot.setValue(pflPath, dbPath);
    }
    StoreModel.open(dbPath);
    prepareBase();
}
function bytesInUtf8(code) {
    if (code < 0x80)
        return 1;
    else if (code < 0x800)
        return 2;
    else if (code < 0x10000)
        return 3;
    else if (code < 0x200000)
        return 4;
    else if (code < 0x4000000)
        return 5;
    return 6;
}
var MatchFromFullText = (function () {
    function MatchFromFullText() {
    }
    MatchFromFullText.prototype.getMatchInfo = function (row) {
        /**
         * Функция offsets в fts4 sqlite выдает смещение и длину в байтах в utf8 строке.
         * Поэтому придётся перебирать строку посимвольно, чтобы пересчитать в utf-16.
         */
        var res = { start: 0, len: 0 };
        var d = row.MatchInfo.split(' ');
        if (d.length > 3) {
            var start = parseInt(d[2]);
            var len = parseInt(d[3]);
            var idx = 0;
            var text = row.Content;
            while (start > 0) {
                res.start++;
                start -= bytesInUtf8(text.charCodeAt(idx));
                idx++;
            }
            while (len > 0) {
                res.len++;
                len -= bytesInUtf8(text.charCodeAt(idx));
                idx++;
            }
        }
        return res;
    };
    return MatchFromFullText;
})();
;
var MatchFromAllText = (function () {
    function MatchFromAllText(pattern) {
        this.rex = new RegExp(pattern.replace(/\$(_|%|\$)/g, "$1").replace(/[\\\*\+\?\|\{\[\(\)\^\$\.\#]/g, "\\$&").replace("%", ".*").replace("_", "."), "i");
    }
    MatchFromAllText.prototype.getMatchInfo = function (row) {
        var res = { start: 0, len: 0 };
        var m = row.Content.match(this.rex);
        if (m) {
            res.start = m.index;
            res.len = m[0].length;
        }
        return res;
    };
    return MatchFromAllText;
})();
;
function CmdPanelexecute() {
    if (!StoreModel.isOpen())
        return;
    var searchText = form.searchField.replace(/^\s+|\s+$/g, "").toLowerCase();
    if (!searchText.length)
        return;
    var result;
    var Matcher;
    switch (form.searchType) {
        case "Полнотекстовый":
            result = StoreModel.findFullText(searchText);
            Matcher = new MatchFromFullText;
            break;
        case "Обычный":
            Matcher = new MatchFromAllText(searchText);
            result = StoreModel.findAllText("%" + searchText + "%");
            break;
    }
    if (!result)
        return;
    //result.ChooseRow("Результат");
    result.Sort("Module");
    form.searchResult.Rows.Clear();
    for (var idx = 0; idx < result.Count(); idx++) {
        var row = result.Get(idx);
        var parts = row.Module.split('.');
        var parentRows = form.searchResult.Rows;
        for (var p = 0; p < 2; p++) {
            var ins = parentRows.Find(parts[0], "Module");
            if (!ins) {
                ins = parentRows.Add();
                ins.Module = parts[0];
            }
            parentRows = ins.Rows;
            parts.splice(0, 1);
            if (parts.length < 2)
                break;
        }
        ins = parentRows.Add();
        ins.Module = parts.join('.');
        ins.Line = row.Line;
        var mi = Matcher.getMatchInfo(row);
        var text = "";
        var len = 50;
        if (mi.start < len) {
            len = mi.start;
        }
        else if (mi.start > len)
            text = ellip;
        text += row.Content.substr(mi.start - len, len) + "▸" + row.Content.substr(mi.start, mi.len) + "◂";
        var tail = row.Content.substr(mi.start + mi.len);
        if (tail.length > 50)
            tail = tail.substr(0, 50) + ellip;
        text += tail;
        ins.Text = text;
        ins.data = { obj: row.obj, prop: row.prop, content: row.Content, start: mi.start, len: mi.len };
    }
    for (var r = 0; r < form.searchResult.Rows.Count(); r++)
        form.Controls.searchResult.Expand(form.searchResult.Rows.Get(r), true);
    if (result.Count() == 500)
        MessageBox("Показаны только первые 500 найденных строк");
}
function CmdPanelrefreshModules() {
    /*
    if (!openSearchBase() || !prepareQueries())
        return;
    var qInsertModule = db.prepare("insert into modules values(null,@name)");
    var qInsertText = db.prepare("insert into search values(@text)");
    var qInsertLine = db.prepare("insert into lines values(@mid,$num,@docid)");
    var qFindWord = db.prepare("select coalesce((select id from words where word=@word), -1)");
    var qInsWord = db.prepare("insert into words values(null, @word)");
    var qInsWordInModules = db.prepare("insert into wordsInModules values(@wid, @module, @line)");
    
    db.exec("begin");
    qDelChanged.exec();
    var changed = db.exec("select * from changed");
    for (var i = 0; i < changed.Count(); i++) {
        var module = changed.Get(i);
        var mdObj = metadata.current.findByUUID(module.obj);
        if (mdObj) {
            var objectName = mdObjFullName(mdObj) + ":" + metadata.mdProp(module.prop).name(1);
            var modtext = mdObj.getModuleText(module.prop);
            if (modtext.length) {
                var modid = qInsertModule.bind(1, objectName).exec(true);
                var lines:string[] = modtext.split("\n");
                for (var num=0; num < lines.length; num++) {
                    var line = lines[num];
                    if (line.length) {
                        var docid = qInsertText.bind(1, line).exec(true);
                        qInsertLine.bind(1, modid).bind(2, 1 + num).bind(3, docid).exec();
                    }
                }
                var parser = snegopat.parseSources(modtext.toLowerCase());
                for (var l = 0, m = parser.lexemCount; l < m; l++) {
                    var lexem = parser.lexem(l);
                    if (lexem.type == ltName) {
                        var wid = qFindWord.bind(1, lexem.text).queryValue();
                        if (wid == -1) {
                            wid = qInsWord.bind(1, lexem.text).exec(true);
                        }
                        qInsWordInModules.bind(1, wid).bind(2, modid).bind(3, lexem.line).exec();
                    }
                }
            }
        }
    }
    db.exec("end");
    */
}
/**
 * Открытие окна скрипта
 */
function macrosОткрыть() {
    if (!form) {
        form = loadScriptForm(SelfScript.fullPath.replace(/js$/, "ssf"), SelfScript.self);
        form.Controls.dbPath.Заголовок = dbPath;
        form.searchResult.Columns.Add("data");
    }
    form.Open();
}
function searchResultВыбор(Элемент, row, Колонка, СтандартнаяОбработка) {
    СтандартнаяОбработка.val = false;
    if (!row.val.data)
        return;
    var mdObj = metadata.current.findByUUID(row.val.data.obj);
    if (mdObj && mdObj.isPropModule(row.val.data.prop)) {
        var te = mdObj.openModule(row.val.data.prop);
        // Артур вручную переключаюсь на закладку Модуль
        if (stdcommands.MngFormEdt.SwitchToModule.getState() && stdcommands.MngFormEdt.SwitchToModule.getState().enabled)
                stdcommands.MngFormEdt.SwitchToModule.send() 
        te = snegopat.activeTextWindow()       
        // Артур завершение
        if (te) {
            te.setCaretPos(row.val.Line + 1, 1);
            te.setSelection(row.val.Line, row.val.data.start + 1, row.val.Line, row.val.data.start + 1 + row.val.data.len);
        }
    }
}
function ibName() {
    var baseName = profileRoot.getValue("CmdLine/IBName").replace(/^\s*|\s*$/g, '');
    if (!baseName || !baseName.length)
        baseName = ibnameFromConnectionString(InfoBaseConnectionString());
    return baseName;
}
function ibnameFromConnectionString(cnnString) {
    if (!cnnString.length)
        return "";
    // удобно юзать из профиля CmdLine\IBName
    var Path1C = profileRoot.getValue("Dir/AppData") + "..\\1CEStart\\ibases.v8i";
    var file = v8New("File", Path1C);
    if (!file.Exist() || file.IsDirectory()) {
        Message("Файл <" + Path1C + "> не существует.");
        return;
    }
    var textDoc = v8New("ТекстовыйДокумент");
    textDoc.Read(Path1C);
    var re_baseName = /^\s*\[\s*(.+)\s*\]\s*$/ig; // имя базы без учета начальных и конечных пробелов
    var re_connectString = /Connect=.*/ig; // строка соединения
    var lineCount = textDoc.LineCount();
    var currName = "";
    for (var lineNum = 1; lineNum <= lineCount; lineNum++) {
        var line = textDoc.GetLine(lineNum);
        if (line.match(re_baseName))
            currName = RegExp.$1.replace(/^\s*|\s*$/g, '');
        else if (line.match(re_connectString) && -1 != line.indexOf(cnnString))
            return currName;
    }
    return "";
}
function mdObjFullName(object) {
    if (!object)
        return "no_object";
    var names = [];
    for (;;) {
        var link = object.parent;
        if (!link)
            break;
        names.push(object.name);
        var clsName = object.mdclass.name(1);
        if (clsName.length)
            names.push(clsName);
        object = link;
    }
    if (names.length == 0)
        return object.mdclass.name(1);
    names.reverse();
    return names.join(".");
}
