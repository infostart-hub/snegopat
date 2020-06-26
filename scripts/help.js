//engine: JScript
//uname: help
//dname: Справка снегопата
//debug: no
//descr: Скрипт для организации работы справочной системы снегопата
//author: orefkov
//help: inplace
//addin: global
exports.__esModule = true;
/// <reference path="../snegopat.d.ts"/>
/// <reference path="../v8.d.ts"/>
global.connectGlobals(SelfScript);
var stdlib = require("./std");
;
;
;
/**
 * Обёртка над поисковой базой данных
 */
var Store = (function () {
    var db;
    var cStruct = "pragma journal_mode=off;pragma encoding='utf-16le';pragma foreign_keys=on;\n        begin;\n        create table if not exists files(path text primary key not null, mtime integer not null, firstTopic integer) without rowid;\n        create table if not exists topics(id integer primary key not null, parentId integer references topics on delete cascade,\n            path text unique not null, title text not null, unique(parentId,id));\n        create table if not exists indexes(topicid integer references topics on delete cascade, content text);\n        create virtual table if not exists search using fts4(tokenize=unicode61);\n        create trigger if not exists ondelfiles before delete on files begin delete from topics where topics.id=old.firstTopic; end;\n        create trigger if not exists ondeltopics before delete on topics begin delete from search where search.docid=old.id; end;\n        end";
    var queries = {
        sFile: { q: null, t: "select path, mtime, firstTopic from files where path=@path" },
        iFile: { q: null, t: "insert into files values(@path, @mtime, @firstTopic)" },
        dFile: { q: null, t: "delete from files where path=@path" },
        sTopics: { q: null, t: "with recursive tt(level, id, parentid, title, path) as\n            (select 0, id, parentid, title, path from topics where id=@id\n            union all select tt.level + 1, t.id, t.parentid, t.title, t.path from topics t inner join tt on t.parentid = tt.id order by 1 desc\n            ) select level, id, title, path from tt" },
        iTopic: { q: null, t: "insert into topics values(@id, @parentId, @path, @title)" },
        iSearch: { q: null, t: "insert into search values(@text)" },
        sSearch: { q: null, t: "select path, (select group_concat(title, '::') from (\n            with recursive tt(pid, title) as\n            (select parentid, title from topics where id=out.id\n            union all select t.parentid, t.title from topics t inner join tt on t.id = tt.pid\n            ) select * from tt order by 1\n            )) fullTitle\n            from search inner join topics out on search.docid=out.id where search match @text" }
    };
    function prepareQueries() {
        for (var k in queries)
            queries[k].q = db.prepare(queries[k].t);
    }
    function closeQueries() {
        for (var k in queries) {
            if (queries[k].q) {
                queries[k].q.close();
                queries[k].q = null;
            }
        }
    }
    return {
        isOpen: function () {
            return !!db;
        },
        open: function (path) {
            this.close();
            try {
                db = sqliteOpen(path);
                db.exec(cStruct);
                prepareQueries();
                return true;
            }
            catch (e) {
                Message(e.description);
                this.close();
                return false;
            }
        },
        close: function () {
            if (db) {
                closeQueries();
                db.close();
                db = null;
            }
        },
        begin: function () {
            db.exec("begin");
        },
        end: function () {
            db.exec("end");
        },
        findFile: function (path) {
            return queries.sFile.q.bind(1, path).queryRow();
        },
        insertFile: function (info) {
            queries.iFile.q.bind(1, info.path).bind(2, info.mtime).bind(3, info.firstTopic).exec();
        },
        deleteFile: function (info) {
            queries.dFile.q.bind(1, info.path).exec();
        },
        selectTopics: function (id) {
            return queries.sTopics.q.bind(1, id).exec();
        },
        insertTopic: function (info) {
            queries.iTopic.q.bind(1, info.id).bind(2, info.parentId).bind(3, info.path).bind(4, info.title).exec(true);
        },
        insertSearchContent: function (text) {
            return queries.iSearch.q.bind(1, text).exec(true);
        },
        searchTopics: function (text) {
            return queries.sSearch.q.bind(1, text).exec();
        }
    };
})();
/**
 * Данный класс предназначен для работы со справочной системой снегопата.
 * Он осуществляет:
 * - первоначальный разбор структуры каталогов справки.
 * - преобразование исходных файлов в html формат посредством markdown-обработчика для
 *   их отображения в справочной системе
 * - внесение текстов из справочных файлов в базу данных для полнотекстового поиска
 * - поддержание актуальности преобразованных html файлов и текста в поисковой базе
 *   при обновлениях файлов.
 * Должен уметь по запросу обработать любой из запрашиваемых файлов и встроить его в
 * справочную систему.
 * Должен уметь по пути файла определять, входит ли он в справочную систему и в какой
 * ее узел.
 * Файлы справки могут находится в одном из подкаталогов следующих каталогов:
 *  - core
 *  - addins
 *  - custom
 */
var HelpSystem = /** @class */ (function () {
    function HelpSystem() {
        this.root = { title: "Документация", path: "", folder: true, topics: [] };
        this.allFiles = {};
        this.allTopics = {};
        this.addinsHelp = {};
        CreateDirectory(env.pathes.help);
        if (!stdlib.isFolderExist(env.pathes.help)) {
            Message("Не удалось создать папку для справочной системы - " + env.pathes.help +
                "\nВозможно, нет прав на запись?", mExc3);
            return;
        }
        if (!Store.open(env.pathes.help + "help.db"))
            return;
    }
    HelpSystem.prototype.createDocs = function () {
        Store.begin();
        this.processFolder(env.pathes.core + "docs\\", "core", "", "Снегопат", this.root);
        this.processFolder(env.pathes.addins, "addins", "docs\\", "Официальный репозитарий", this.root);
        this.processFolder(env.pathes.custom, "custom", "docs\\", "Пользовательский репозитарий", this.root);
        Store.end();
    };
    HelpSystem.prototype.processFolder = function (baseFolder, typeOfFolder, relPath, title, parent) {
        var fullPathToFolder = baseFolder + relPath;
        var fullPathToCache = env.pathes.help + typeOfFolder + "\\" + relPath;
        CreateDirectory(fullPathToCache);
        if (!stdlib.isFolderExist(fullPathToCache)) {
            Message("Не удалось создать папку для справочной системы - " + fullPathToCache +
                "\nВозможно, нет прав на запись?", mExc3);
            return;
        }
        var me = { title: title, path: fullPathToFolder, folder: true, topics: [] };
        // Получим все файлы и папки в этой папке
        var files = [], folders = [];
        for (var filesArray = FindFiles(fullPathToFolder, "*", false), idx = 0; idx < filesArray.Count(); idx++) {
            var file = filesArray.Get(idx);
            (file.IsDirectory() ? folders : files).push(file);
        }
        // Отсортируем их по имени
        function sortByNames(i1, i2) { return i1.Name.toLowerCase().localeCompare(i2.Name.toLowerCase()); }
        folders.sort(sortByNames);
        files.sort(sortByNames);
        // Переберём вложенные папки
        for (var i in folders) {
            var f = folders[i];
            if (f.Name.charAt(0) != ".")
                this.processFolder(baseFolder, typeOfFolder, relPath + f.Name, f.Name.replace(/^\d+\s*/, ""), me);
        }
        // переберём файлы
        for (var i in files) {
            var f = files[i];
            if (f.Name.charAt(0) != "." && /\.md|\.markdown|\.txt|\.html/.test(f.Extension))
                this.processFile(baseFolder, typeOfFolder, f, f.BaseName.replace(/^\d+\s*/, ""), me);
        }
        if (me.topics.length)
            parent.topics.push(me);
    };
    HelpSystem.prototype.processFile = function (baseFolder, typeOfFolder, file, title, parent, ai) {
        var canonicName = typeOfFolder + file.FullName.substr(baseFolder.length - 1);
        // Для начала проверим, не обрабатывался ли этот файл
        if (canonicName in this.allFiles)
            return;
        var fileSrcMtime = (new Date(file.GetModificationUniversalTime())).getTime();
        var fileInfo = Store.findFile(canonicName);
        var topics;
        if (fileInfo) {
            // Файл уже парсился ранее. Надо проверить, не обновился ли он с последнего парсинга
            var needRefresh = false;
            topics = Store.selectTopics(fileInfo.firstTopic);
            if (fileSrcMtime > fileInfo.mtime)
                needRefresh = true;
            else {
                // Файл не обновился, проверим, что первый топик на месте
                if (topics.Count()) {
                    var topic = topics.Get(0);
                    if (!stdlib.isFileExist(env.pathes.help + topic.path)) {
                        needRefresh = true;
                    }
                }
            }
            if (needRefresh) {
                // Обновился. Надо удалить инфу о нем из базы
                Store.deleteFile(fileInfo);
                fileInfo = null;
                // Удалить файлы из кэша
                for (var i = 0; i < topics.Count(); i++)
                    DeleteFiles(env.pathes.help + topics.Get(i).path);
                topics = null;
            }
        }
        if (!fileInfo) {
            topics = createTopics(file, canonicName, title, ai);
            fileInfo = { path: canonicName, mtime: fileSrcMtime, firstTopic: topics ? topics.Get(0).id : 0 };
            Store.insertFile(fileInfo);
        }
        this.allFiles[canonicName] = fileInfo;
        if (topics && topics.Count()) {
            var tr = topics.Get(0);
            var me = { title: tr.title, path: tr.path, topics: [] }, currentParent = me, lastInserted = me;
            var stack = [], level = 1;
            var topicPath = tr.path.toLowerCase();
            this.allTopics[topicPath] = me;
            if (ai) {
                ai.helpPath = topicPath;
                this.addinsHelp[ai.tags.uname] = topicPath;
            }
            for (var i = 1; i < topics.Count(); i++) {
                var row = topics.Get(i);
                var fi = { title: row.title, path: row.path, topics: [] };
                this.allTopics[fi.path.toLowerCase()] = fi;
                if (row.level > level) {
                    stack.push(currentParent);
                    currentParent = lastInserted;
                }
                else if (row.level < level) {
                    currentParent = stack[row.level - 1];
                    stack.splice(row.level - 1, stack.length);
                }
                level = row.level;
                currentParent.topics.push(fi);
                lastInserted = fi;
            }
            parent.topics.push(me);
        }
    };
    HelpSystem.prototype.searchTopics = function (text) {
        return Store.searchTopics(text);
    };
    HelpSystem.prototype.addinHelpPath = function (uname) {
        return this.addinsHelp[uname];
    };
    HelpSystem.prototype.createAddinsDocs = function (repoRoot) {
        //var root: HelpFolder = { title: "Описания аддинов", path: "", folder: true, topics: [] };
        CreateDirectory(env.pathes.help + "core");
        this.processFile(env.pathes.core + "docs\\", "core", v8New("File", env.pathes.core + "docs\\00 firststep.md"), "", this.root);
        var old = repoRoot.name;
        repoRoot.name = "Описание аддинов";
        var pThis = this;
        Store.begin();
        (function walkRepoFolder(repo, help) {
            var mf = { title: repo.name, folder: true, path: repo.path, topics: [] };
            for (var idx = 0; idx < repo.childs.length; idx++)
                walkRepoFolder(repo.childs[idx], mf);
            for (var idx = 0; idx < repo.addins.length; idx++) {
                var ai = repo.addins[idx];
                if (ai.helpPath.length) {
                    var file = v8New("File", ai.helpPath);
                    if (file.Exist() && file.IsFile()) {
                        var folderForCache = env.pathes.help + repo.typeOfRepo + file.Path.substr(repo.basePath.length - 1);
                        if (!stdlib.isFolderExist(folderForCache)) {
                            CreateDirectory(folderForCache);
                            if (!stdlib.isFolderExist(folderForCache)) {
                                Message("Не удалось создать каталог для справки " + folderForCache);
                                return;
                            }
                        }
                        pThis.processFile(repo.basePath, repo.typeOfRepo, file, ai.name(), mf, ai);
                    }
                }
            }
            if (mf.topics.length)
                help.topics.push(mf);
        })(repoRoot, this.root);
        Store.end();
        repoRoot.name = old;
    };
    return HelpSystem;
}());
;
function createTopics(file, canonicName, title, ai) {
    var vt = v8New("ValueTable");
    vt.Columns.Add("level");
    vt.Columns.Add("id");
    vt.Columns.Add("parentId");
    vt.Columns.Add("path");
    vt.Columns.Add("title");
    // Прочитаем текст файла
    var td = v8New("TextDocument");
    td.Read(file.FullName);
    var text = td.GetText(), parsed = "", needHead = true, splitTopics = false;
    var inplace = ai && ai.tags.help == "inplace";
    if (inplace) {
        var lines = [];
        var re = /\/\*@([\s\S]*?)@\*\//g;
        while (re.exec(text))
            lines.push(RegExp.$1.replace(/\n'/gm, "\n"));
        text = lines.join('\n');
    }
    // Далее нам надо разбить текст на топики, поправить ссылки внутри страницы
    if (file.Extension == ".html" && !inplace) {
        parsed = text;
        text = dehtml(parsed);
        var tit = parsed.match(/<title>(.+?)<\/title>/i);
        needHead = false;
    }
    else if (inplace || file.Extension == ".markdown" || file.Extension == ".md") {
        splitTopics = true;
        if (inplace) {
            var head = "# " + title + "\n";
            if (ai.tags.descr.length)
                head += ai.tags.descr + "  \n";
            head += "<table width=\"100%\" cellspacing=\"0\" cellpadding=\"5\">\n                <tr style=\"border: none;\"><td style=\"text-align:right;font-weight:bold;color: #CCC;border: none;\">uname</td><td style=\"border: none;\" width=\"95%\">" + ai.tags.uname + "</td></tr>";
            if (ai.tags.author.length)
                head += "<tr style=\"border: none;\"><td style=\"text-align:right;font-weight: bold;color: #CCC;border: none;\">\u0410\u0432\u0442\u043E\u0440</td><td style=\"border: none;\">" + ai.tags.author + "</td></tr>";
            if (ai.tags.version.length)
                head += "<tr style=\"border: none;\"><td style=\"text-align:right;font-weight: bold;color: #CCC;border: none;\">\u0412\u0435\u0440\u0441\u0438\u044F</td><td style=\"border: none;\">" + ai.tags.version + "</td></tr>";
            if (ai.tags.www.length)
                head += "<tr style=\"border: none;\"><td style=\"text-align:right;font-weight: bold;color: #CCC;border: none;\">www</td><td style=\"border: none;\">\n                    <a href=\"#\" onclick=\"document.body.fireEvent('onhelp', document.createEventObject())\" id=\"wwwsite\">" + ai.tags.www + "</a>\n                    </td></tr>";
            text = head + "</table>\n\n---\n" + text;
        }
        parsed = addins.byUniqueName("marked").object().marked.parse(text);
        tit = parsed.match(/<h\d.*?>(.+?)<\/h\d>/i);
    }
    else {
        parsed = "<pre>" + text + "</pre>";
    }
    if (tit)
        title = tit[1];
    // Поправим ссылки на картинки
    var baseFolder = "file://" + file.Path.replace(/\\/g, "/");
    parsed = parsed.replace(/(<img\s+[^>]*?src\s*=\s*")\./gi, "$1" + baseFolder + ".");
    var topicTexts = [];
    var names = {};
    // Разобъем на топики
    var reHeader, found;
    if (splitTopics && (reHeader = /<h([123]).*?>(.+?)<\/h/gi) && (found = reHeader.exec(parsed)) && found[1] == '1') {
        var reAnchor = /<a\s+.*?\s*name\s*=\s*"(.+?)"/gi;
        for (var idx = 0;; idx++) {
            var level = parseInt(found[1]) - 1;
            var next = reHeader.exec(parsed);
            if (topicTexts.length && (level == 0 || level > topicTexts[topicTexts.length - 1].level + 1)) {
                // Это нам поломает структуру топиков, не должно быть более одного заглавного хедера
                // или повышения уровня топика более чем не 1.
                level = 1;
                next = null;
            }
            var end = next ? next.index : parsed.length;
            var topicText = parsed.substring(found.index, end);
            topicTexts.push({ level: level, parsed: topicText, text: dehtml(topicText), path: canonicName + idx + ".html", title: found[2] });
            while (reAnchor.exec(topicText))
                names[RegExp.$1] = file.Name + idx + ".html";
            if (!next)
                break;
            found = next;
        }
    }
    else {
        topicTexts.push({ level: 0, text: text, parsed: parsed, path: canonicName + ".html", title: title });
    }
    var lastInserted = null, currentLevel = -1, currentParent = null;
    var stack = [];
    for (idx = 0; idx < topicTexts.length; idx++) {
        var topic = topicTexts[idx];
        if (topic.level > currentLevel) {
            if (topic.level)
                stack.push(currentParent);
            currentParent = lastInserted;
        }
        else if (topic.level < currentLevel) {
            currentParent = stack[topic.level];
            stack.splice(topic.level, stack.length);
        }
        currentLevel = topic.level;
        topic.parsed = topic.parsed.replace(/(<a\s+.*?\s*?href=")#(.+?)"/gi, function (str, str1, str2) {
            return str1 + (str2 in names ? names[str2] : "") + "#" + str2 + '"';
        });
        var tinfo = { id: Store.insertSearchContent(dehtml(topic.text)), parentId: currentParent, path: topic.path, title: topic.title };
        Store.insertTopic(tinfo);
        lastInserted = tinfo.id;
        if (needHead)
            topic.parsed = "<html><head>\n            <link rel=\"stylesheet\" href=\"file:///" + env.pathes.core.replace(/\\/g, '/') + "www/md.css\" type=\"text/css\"/>\n            <title>" + topic.title + "</title></head><body>" + topic.parsed + "</body>";
        td.SetText(topic.parsed);
        td.Write(env.pathes.help + topic.path, "UTF-8");
        var row = vt.Add();
        row.level = topic.level;
        row.id = tinfo.id;
        row.parentId = tinfo.parentId;
        row.title = tinfo.title;
        row.path = tinfo.path;
    }
    return vt;
}
function dehtml(text) {
    return text.replace(/<head>.*?<\/head>|<script>.*?<\/script>|<\w+.*?>|<\/\w+>/gm, " ");
}
var helpSystem;
function getHelpSystem() {
    if (!helpSystem)
        helpSystem = new HelpSystem;
    return helpSystem;
}
exports.getHelpSystem = getHelpSystem;
