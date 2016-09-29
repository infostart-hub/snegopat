//engine: JScript
//uname: help
//dname: Справка снегопата
//debug: no
//descr: Скрипт для организации работы справочной системы снегопата
//author: orefkov
//help: inplace
//addin: global

/// <reference path="../snegopat.d.ts"/>
/// <reference path="../v8.d.ts"/>

global.connectGlobals(SelfScript);
import * as stdlib from "./std";
import {AddinInfo, AddinsFolder} from "./repo";

/*@
Скрипт организует работу справочной системы снегопата.
Основной формат для справочной информации в снегопате - markdown.
Вся документация хранится в этом формате, а для отображения преобразуется
в html-формат.
@*/

/**
 * Введём несколько интерфейсов и типов для удобства
 */
interface TopicInfo {
    id: number;     // id топика в базе справки
    parentId: number;
    path: string;   // путь к отображаемому файлу
    title: string;  // заголовок топика
};

interface FileInfo {
    path: string;
    mtime: number;
    firstTopic: number;
};

type TopicInfoRow = TopicInfo & {level: number} & ValueTableRow;
type TopicsTable = { Get(p: number): TopicInfoRow, Add(): TopicInfoRow } & ValueTable;
type SearchTable = { Get(p: number): {path: string, fullTitle: string} & ValueTableRow } & ValueTable;

export interface HelpFolder {
    title: string;
    path: string;
    folder?: boolean;
    topics: HelpFolder[];
    row?: ValueTreeRow;
};

/**
 * Обёртка над поисковой базой данных
 */
var Store = (function () {
    var db: SqliteBase;
    var cStruct =
       `pragma journal_mode=off;pragma encoding='utf-16le';pragma foreign_keys=on;
        begin;
        create table if not exists files(path text primary key not null, mtime integer not null, firstTopic integer) without rowid;
        create table if not exists topics(id integer primary key not null, parentId integer references topics on delete cascade,
            path text unique not null, title text not null, unique(parentId,id));
        create table if not exists indexes(topicid integer references topics on delete cascade, content text);
        create virtual table if not exists search using fts4(tokenize=unicode61);
        create trigger if not exists ondelfiles before delete on files begin delete from topics where topics.id=old.firstTopic; end;
        create trigger if not exists ondeltopics before delete on topics begin delete from search where search.docid=old.id; end;
        end`;
    var queries = {
        sFile: { q: <SqliteQuery>null, t: `select path, mtime, firstTopic from files where path=@path` },
        iFile: { q: <SqliteQuery>null, t: `insert into files values(@path, @mtime, @firstTopic)` },
        dFile: { q: <SqliteQuery>null, t: `delete from files where path=@path` },
        sTopics: { q: <SqliteQuery>null, t:
           `with recursive tt(level, id, parentid, title, path) as
            (select 0, id, parentid, title, path from topics where id=@id
            union all select tt.level + 1, t.id, t.parentid, t.title, t.path from topics t inner join tt on t.parentid = tt.id order by 1 desc
            ) select level, id, title, path from tt` },
        iTopic: { q: <SqliteQuery>null, t: `insert into topics values(@id, @parentId, @path, @title)` },
        iSearch: { q: <SqliteQuery>null, t: `insert into search values(@text)` },
        sSearch: { q: <SqliteQuery>null, t:
           `select path, (select group_concat(title, '::') from (
            with recursive tt(pid, title) as
            (select parentid, title from topics where id=out.id
            union all select t.parentid, t.title from topics t inner join tt on t.id = tt.pid
            ) select * from tt order by 1
            )) fullTitle
            from search inner join topics out on search.docid=out.id where search match @text` },
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
        isOpen: function (): boolean {
            return !!db;
        },
        open: function (path: string): boolean {
            this.close();
            try {
                db = sqliteOpen(path);
                db.exec(cStruct);
                prepareQueries();
                return true;
            } catch (e) { Message(e.description); this.close(); return false; }
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
        findFile: function (path: string): FileInfo {
            return queries.sFile.q.bind(1, path).queryRow();
        },
        insertFile: function (info: FileInfo): void {
            queries.iFile.q.bind(1, info.path).bind(2, info.mtime).bind(3, info.firstTopic).exec();
        },
        deleteFile: function (info: FileInfo): void {
            queries.dFile.q.bind(1, info.path).exec();
        },
        selectTopics: function (id: number): TopicsTable{
            return <any>queries.sTopics.q.bind(1, id).exec();
        },
        insertTopic: function (info: TopicInfo): void {
            queries.iTopic.q.bind(1, info.id).bind(2, info.parentId).bind(3, info.path).bind(4, info.title).exec(true);
        },
        insertSearchContent: function (text: string): number {
            return queries.iSearch.q.bind(1, text).exec(true);
        },
        searchTopics: function(text: string): SearchTable {
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
class HelpSystem {
    root: HelpFolder = { title: "Документация", path: "", folder: true, topics: [] };
    allFiles = {};
    allTopics = {};
    addinsHelp = {};
    constructor() {
        CreateDirectory(env.pathes.help);
        if (!stdlib.isFolderExist(env.pathes.help)) {
            Message("Не удалось создать папку для справочной системы - " + env.pathes.help +
                "\nВозможно, нет прав на запись?", mExc3);
            return;
        }
        if (!Store.open(env.pathes.help + "help.db"))
            return;
    }
    createDocs() {
        Store.begin();
        this.processFolder(env.pathes.core + "docs\\", "core", "", "Снегопат", this.root);
        this.processFolder(env.pathes.addins, "addins", "docs\\", "Официальный репозитарий", this.root);
        this.processFolder(env.pathes.custom, "custom", "docs\\", "Пользовательский репозитарий", this.root);
        Store.end();
    }
    processFolder(baseFolder: string, typeOfFolder: string, relPath: string, title: string, parent: HelpFolder) {
        var fullPathToFolder = baseFolder + relPath;
        var fullPathToCache = env.pathes.help + typeOfFolder + "\\" + relPath;
        CreateDirectory(fullPathToCache);
        if (!stdlib.isFolderExist(fullPathToCache)) {
            Message("Не удалось создать папку для справочной системы - " + fullPathToCache +
                "\nВозможно, нет прав на запись?", mExc3);
            return;
        }
        var me: HelpFolder = { title: title, path: fullPathToFolder, folder: true, topics: [] };
        // Получим все файлы и папки в этой папке
        var files: File[] = [], folders: File[] = [];
        for (var filesArray = FindFiles(fullPathToFolder, "*", false), idx = 0; idx < filesArray.Count(); idx++) {
            var file = <File>filesArray.Get(idx);
            (file.IsDirectory() ? folders : files).push(file);
        }
        // Отсортируем их по имени
        function sortByNames(i1: File, i2: File) { return i1.Name.toLowerCase().localeCompare(i2.Name.toLowerCase()) }
        folders.sort(sortByNames);
        files.sort(sortByNames);
        // Переберём вложенные папки
        for (var i in folders) {
            var f = folders[i];
            if (f.Name.charAt(0) != ".")    // каталоги с точки пропускаем
                this.processFolder(baseFolder, typeOfFolder, relPath + f.Name, f.Name.replace(/^\d+\s*/, ""), me);
        }
        // переберём файлы
        for (var i in files) {
            var f = files[i];
            if (f.Name.charAt(0) != "." && /\.md|\.markdown|\.txt|\.html/.test(f.Extension)) // В папках автоматически включаем файлы только этих типов
                this.processFile(baseFolder, typeOfFolder, f, f.BaseName.replace(/^\d+\s*/, ""), me);
        }
        if (me.topics.length)
            parent.topics.push(me);
    }
    processFile(baseFolder: string, typeOfFolder: string, file: File, title: string, parent: HelpFolder, ai?: AddinInfo) {
        var canonicName = typeOfFolder + file.FullName.substr(baseFolder.length - 1);
        // Для начала проверим, не обрабатывался ли этот файл
        if (canonicName in this.allFiles)
            return;
        var fileSrcMtime = (new Date(<any>file.GetModificationUniversalTime())).getTime();
        var fileInfo = Store.findFile(canonicName);
        var topics: TopicsTable;
        if (fileInfo) {
            // Файл уже парсился ранее. Надо проверить, не обновился ли он с последнего парсинга
            var needRefresh = false;
            topics = Store.selectTopics(fileInfo.firstTopic);
            if (fileSrcMtime > fileInfo.mtime)
                needRefresh = true;
            else {
                // Файл не обновился, проверим, что первый топик на месте
                if(topics.Count()) {
                    var topic = <TopicInfo><any>topics.Get(0);
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
            fileInfo = { path: canonicName, mtime: fileSrcMtime, firstTopic: topics ? topics.Get(0).id : 0};
            Store.insertFile(fileInfo);
        }
        this.allFiles[canonicName] = fileInfo;
        if (topics && topics.Count()) {
            var tr = topics.Get(0);
            var me: HelpFolder = { title: tr.title, path: tr.path, topics: [] }, currentParent = me, lastInserted = me;
            var stack: HelpFolder[] = [], level = 1;
            var topicPath = tr.path.toLowerCase();
            this.allTopics[topicPath] = me;
            if (ai) {
                ai.helpPath = topicPath;
                this.addinsHelp[ai.tags.uname] = topicPath;
            }
            for(var i = 1; i < topics.Count(); i++) {
                var row = topics.Get(i);
                var fi: HelpFolder = { title: row.title, path: row.path, topics: [] };
                this.allTopics[fi.path.toLowerCase()] = fi;
                if (row.level > level) {
                    stack.push(currentParent);
                    currentParent = lastInserted;
                } else if (row.level < level) {
                    currentParent = stack[row.level - 1];
                    stack.splice(row.level - 1, stack.length);
                }
                level = row.level;
                currentParent.topics.push(fi);
                lastInserted = fi;
            }
            parent.topics.push(me);
        }
    }
    searchTopics(text: string): SearchTable {
        return Store.searchTopics(text);
    }
    addinHelpPath(uname: string): string {
        return this.addinsHelp[uname];
    }
    createAddinsDocs(repoRoot: AddinsFolder) {
        //var root: HelpFolder = { title: "Описания аддинов", path: "", folder: true, topics: [] };
        CreateDirectory(env.pathes.help + "core");
        this.processFile(env.pathes.core + "docs\\", "core", v8New("File", env.pathes.core + "docs\\00 firststep.md"), "", this.root);
        var old = repoRoot.name;
        repoRoot.name = "Описание аддинов";
        var pThis = this;
        Store.begin();
        (function walkRepoFolder(repo: AddinsFolder, help: HelpFolder) {
            var mf: HelpFolder = { title: repo.name, folder: true, path: repo.path, topics: [] };
            for (var idx = 0; idx < repo.childs.length; idx++)
                walkRepoFolder(repo.childs[idx], mf);
            for (var idx = 0; idx < repo.addins.length; idx++) {
                var ai = repo.addins[idx];
                if (ai.helpPath.length) {
                    var file: File = v8New("File", ai.helpPath);
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
    }
};

function createTopics(file: File, canonicName: string, title: string, ai?: AddinInfo): TopicsTable {
    var vt = <TopicsTable>v8New("ValueTable");
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
    } else if (inplace || file.Extension == ".markdown" || file.Extension == ".md") {
        splitTopics = true;
        if (inplace) {
            var head = "# " + title + "\n";
            if (ai.tags.descr.length)
                head += ai.tags.descr + "  \n";
            head += `<table width="100%" cellspacing="0" cellpadding="5">
                <tr style="border: none;"><td style="text-align:right;font-weight:bold;color: #CCC;border: none;">uname</td><td style="border: none;" width="95%">${ai.tags.uname}</td></tr>`;
            if (ai.tags.author.length)
                head += `<tr style="border: none;"><td style="text-align:right;font-weight: bold;color: #CCC;border: none;">Автор</td><td style="border: none;">${ai.tags.author}</td></tr>`;
            if (ai.tags.version.length)
                head += `<tr style="border: none;"><td style="text-align:right;font-weight: bold;color: #CCC;border: none;">Версия</td><td style="border: none;">${ai.tags.version}</td></tr>`;
            if (ai.tags.www.length)
                head += `<tr style="border: none;"><td style="text-align:right;font-weight: bold;color: #CCC;border: none;">www</td><td style="border: none;">
                    <a href="#" onclick="document.body.fireEvent('onhelp', document.createEventObject())" id="wwwsite">${ai.tags.www}</a>
                    </td></tr>`;
            text = head + "</table>\n\n---\n" + text;
        }
        parsed = (<any>addins.byUniqueName("marked").object()).marked.parse(text);
        tit = parsed.match(/<h\d.*?>(.+?)<\/h\d>/i);
    } else {
        parsed = `<pre>${text}</pre>`;
    }
    if (tit)
        title = tit[1];
    // Поправим ссылки на картинки
    var baseFolder = "file://" + file.Path.replace(/\\/g, "/");
    parsed = parsed.replace(/(<img\s+[^>]*?src\s*=\s*")\./gi, "$1" + baseFolder + ".");
    var topicTexts: {level:number, parsed: string, text: string, path:string, title: string, id?: number, parentId?: number}[] = [];
    var names={};
    // Разобъем на топики
    var reHeader: RegExp, found: RegExpExecArray;
    if (splitTopics && (reHeader = /<h([123]).*?>(.+?)<\/h/gi) && (found = reHeader.exec(parsed)) && found[1] == '1') {
        var reAnchor = /<a\s+.*?\s*name\s*=\s*"(.+?)"/gi;
        for (var idx = 0;;idx++) {
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
            topicTexts.push({level: level, parsed: topicText, text: dehtml(topicText), path: canonicName + idx + ".html", title: found[2]});
            while (reAnchor.exec(topicText))
                names[RegExp.$1] = file.Name  + idx + ".html";
            if (!next)
                break;
            found = next;
        }
    } else {
        topicTexts.push({level: 0, text: text, parsed: parsed, path: canonicName + ".html", title: title});
    }
    var lastInserted = null, currentLevel = -1, currentParent = null;
    var stack = [];
    for (idx = 0; idx < topicTexts.length; idx++) {
        var topic = topicTexts[idx];
        if (topic.level > currentLevel) {
            if (topic.level)
                stack.push(currentParent);
            currentParent = lastInserted;
        } else if (topic.level < currentLevel) {
            currentParent = stack[topic.level];
            stack.splice(topic.level, stack.length);
        }
        currentLevel = topic.level;
        topic.parsed = topic.parsed.replace(/(<a\s+.*?\s*?href=")#(.+?)"/gi, function(str, str1, str2) {
            return str1 + (str2 in names ? names[str2] : "") + "#" + str2 + '"';
        });
        var tinfo: TopicInfo = {id: Store.insertSearchContent(dehtml(topic.text)), parentId: currentParent, path: topic.path, title: topic.title};
        Store.insertTopic(tinfo);
        lastInserted = tinfo.id;
        if (needHead)
            topic.parsed = `<html><head>
            <link rel="stylesheet" href="file:///${env.pathes.core.replace(/\\/g, '/')}www/md.css" type="text/css"/>
            <title>${topic.title}</title></head><body>${topic.parsed}</body>`;
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

function dehtml(text: string) : string {
    return text.replace(/<head>.*?<\/head>|<script>.*?<\/script>|<\w+.*?>|<\/\w+>/gm, " ");
}

var helpSystem: HelpSystem;
export function getHelpSystem() {
    if (!helpSystem)
        helpSystem = new HelpSystem;
    return helpSystem;
}
