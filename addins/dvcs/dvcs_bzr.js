//engine: JScript
//uname: dvcs_bzr
//dname: Backend dvcs к bzr
//addin: global

// (c) Сосна Евгений shenja at sosna.zp.ua
// Скрипт - Backend к bzr для отображения версионного контроля. 

global.connectGlobals(SelfScript)

// если не создаеться fso, необходимо в сделать в c:\windows\system32 
// regsvr32.exe scrrun.dll 
// после этого fso заработает. Во всем виновата корпорация добра http://social.technet.microsoft.com/Forums/ru/windowsserverru/thread/28d55900-145b-466b-93d4-74e08006c72f
var FSO = new ActiveXObject("Scripting.FileSystemObject");

var WshShell = new ActiveXObject("WScript.Shell");
var TempDir = WshShell.ExpandEnvironmentStrings("%temp%") + "\\";
var mainFolder = env.pathes.main

var СоответствиеФайловИСтатусов = [];

var PathToOutput = TempDir + "bzrstatus.txt" // Пишем 1С файл в utf-8, выводим туда статус fossil после этого читаем его. 
var PathToBat = TempDir + "bzrTrue.bat"

function bzr_getRootCatalog(path){
    var result = "";
    for (var key in СоответствиеФайловИСтатусов){
        if (path.indexOf(key)!=-1) {
            result = key
            break
        }
    }
    if (result==undefined) {
        var f = v8New("File", path);
        if (f.Exist()) {
            
            var TextDoc = v8New("TextDocument");
            TextDoc.Записать(PathToOutput, "UTF-8");
            млКаталог = f.Path;
            TextDoc.AddLine('cd /d"' +млКаталог +'"')
            TextDoc.AddLine('bzr info >> "'+PathToOutput+'"');
            TextDoc.Write(PathToBat, 'cp866');
            ErrCode = WshShell.Run('"'+PathToBat+'"', 0, 1)
            TextDoc.Read(PathToOutput, "UTF-8");
            if (TextDoc.LineCount() == 0) {
                return "" //что то пошло не так. 
            }
        
            var i=0;
            for (var i=1; i<=TextDoc.LineCount(); i++)
            {
                var r = TextDoc.GetLine(i);
                re = new RegExp(/.*root:\s(.*)/);
                var mathes = r.match(re);
                if (mathes && mathes.length) {
                    rootpath = mathes[1].replace(/\//g, '\\');
                    if (rootpath.substr(0,1) == ".") rootpath = млКаталог;
                    result = rootpath;
                    СоответствиеФайловИСтатусов[result] = {};
                    break
                }
            }
            TextDoc.Clear();
            TextDoc.Write(PathToOutput, "UTF-8");
        }
    }
    return result
} //bzr_getRootCatalog

function bzr_test(pathToCatalog) {
    
    var f = v8New("File", pathToCatalog);
    if (!f.Exist()) return false; 
    if (!f.IsDirectory()) return false;
    var f = v8New("File", FSO.BuildPath(pathToCatalog, '.bzr'));
    if (!f.Exist()) {
        return false
    }
    return true
} //bzr_test

function bzr_getStatusForCatalog(pathToCatalog, ValueTablesFiles) {

    СоответствиеФайловИСтатусов[pathToCatalog] = {};
    
    var СоответствиеСтатусов = СоответствиеФайловИСтатусов[pathToCatalog];
    var TextDoc = v8New("TextDocument");
    TextDoc.Write(PathToOutput, "UTF-8")
    var TextDoc = v8New("TextDocument");
    TextDoc.AddLine('cd /d "' +pathToCatalog+'"');
    TextDoc.AddLine('bzr status -S >> "'+PathToOutput+'"');
    TextDoc.Write(PathToBat, "cp866");
    ErrCode = WshShell.Run('"'+PathToBat+'"', 0, 1)
            //TextDoc.Read(PathToOutput, "UTF-8");
            TextDoc.Read(PathToOutput, "cp866 ");
            if (TextDoc.LineCount() == 0) {
                return false //что то пошло не так. 
            }
            var i=0;
            re = new RegExp(/.*(M|N|D|\?)\s*(.*)/);
            
            for (var i=1; i<=TextDoc.LineCount(); i++)
            {
                var r = TextDoc.GetLine(i);
                var mathes = r.match(re);
                if (mathes && mathes.length) {
                    filename = ""+mathes[2]
                    filename = filename.replace(/\//g, '\\'); 
                    switch (mathes[1]) 
                    {
                        case "M":
                        СоответствиеСтатусов[FSO.BuildPath(pathToCatalog, filename)]= "EDITED"
                        break;
                        
                        case "N":
                        СоответствиеСтатусов[FSO.BuildPath(pathToCatalog, filename)]= "ADDED"
                        break;
                        
                        case "?":
                        СоответствиеСтатусов[FSO.BuildPath(pathToCatalog, filename)]= "NOTVERSIONED"
                        break;
                        
                        case "D":
                        СоответствиеСтатусов[FSO.BuildPath(pathToCatalog, filename)]= "DELETED"
                        break;
                    }
                    continue;
                }
            }
    
        return true
} //bzr_getStatusForCatalog

function bzr_getFileStatus(pathToCatalog, pathToFile){
    var лКаталог = pathToCatalog
    var rootCatalog = bzr_getRootCatalog(pathToFile)
    
    СоответсвиеФайлов = СоответствиеФайловИСтатусов[rootCatalog];
    if (СоответсвиеФайлов == undefined) return null 
    
    return (СоответсвиеФайлов[pathToFile] == undefined) ? null : СоответсвиеФайлов[pathToFile]
    
} //bzr_getFileStatus

function bzr_add(pathToFile, param2) {
    var rootCatalog = bzr_getRootCatalog(pathToFile);
    var f = v8New("File", pathToFile);
    if (f.IsDirectory()) {
        pathToFile = '.'
    } else {
        pathToFile = '"'+pathToFile+'"'
    }
    
    var TextDoc = v8New("TextDocument");
    TextDoc.AddLine('cd /d "'+rootCatalog+'"')
    TextDoc.AddLine('bzr add ' +pathToFile);
    TextDoc.Write(PathToBat, 'cp866');
    
    TextDoc.Clear();
    ErrCode = WshShell.Run('"'+PathToBat+'"', 0, 1)
    return ErrCode
} //bzr_add

function bzr_run(pathToFile){
    var rootCatalog = bzr_getRootCatalog(pathToFile);
    var TextDoc = v8New("TextDocument");
    ЗапуститьПриложение('bzr explorer "'+rootCatalog+'"', "", false);
    TextDoc = null;
} //bzr_run

function bzr_getFileAtRevision(pathToFile, rev){
    
    var TextDoc = v8New("TextDocument");
    TextDoc.Записать(PathToOutput, "UTF-8");
    
    var f = v8New("File", pathToFile);
    if (!f.Exist()) 
    {
        Message(" файла физически не существует...") 
        return null;
    }
    var rootCatalog = bzr_getRootCatalog(pathToFile)
    if (rev.length !=0) {
        var filerev = FSO.BuildPath(TempDir, rev+f.Имя);
        TextDoc.AddLine('cd /d "' +rootCatalog +'"')
        TextDoc.AddLine('bzr cat -r '+rev +' "'+pathToFile +'" > ' + filerev)
        TextDoc.Write(PathToBat, 'cp866');
        TextDoc.Clear();
        ErrCode = WshShell.Run('"'+PathToBat+'"', 0, 1)
        return filerev;
    }
    return null
} //bzr_getFileAtRevision


function bzr_commit(pathToFile, message) {
    var rootCatalog = bzr_getRootCatalog(pathToFile);
    var tempfile = GetTempFileName("txt");
    var f = v8New("File", pathToFile);
    if (f.IsDirectory()) {
        pathToFile = ''
    } else {
        pathToFile = '"'+pathToFile+'"'
    }
    var TextDoc = v8New("TextDocument");
    TextDoc.AddLine('cd /d "'+rootCatalog+'"')
    TextDoc.AddLine('bzr commit ' +pathToFile+' --file="'+tempfile+'"');
    TextDoc.AddLine('exit');
    
    TextDoc.Write(PathToBat, 'cp866');
    
    TextDoc.Clear();
    TextDoc.SetText(message);
    TextDoc.Write(tempfile, 'utf-8');
    ErrCode = WshShell.Run('"'+PathToBat+'"', 1, 1)
    return ErrCode
} //bzr_commit

function bzr_getFilePathToDiff(param1, param2) { //текущая версия файла с предыдущей...
    
    var TextDoc = v8New("TextDocument");
    TextDoc.Записать(PathToOutput, "UTF-8");
    // возвращать будем структру, path1 и path2 
    var pathToFile = param1;
    var rootCatalog = bzr_getRootCatalog(pathToFile);
    param2.insert("path1", pathToFile);
    param2.insert("path2", "");
    
    var f = v8New("File", pathToFile);
    if (!f.Exist()) return false
    var path2 = GetTempFileName(f.Extension.substr(1));
    // Запусим shell и найдем версии файлов. 
    TextDoc.Clear();
    TextDoc.AddLine('cd /d "' +rootCatalog +'"')
    TextDoc.AddLine('bzr cat "'+pathToFile+'" > "' +path2+'"');
    TextDoc.Write(PathToBat, 'cp866');
    
    ErrCode = WshShell.Run('"'+PathToBat+'"', 0, 1)
    var f = v8New("File", path2);
    if (!f.Exist()) { // Файл будет все равно, но пустой. Думаю простят. 
        Message("Неудачная попытка создать файл с последней версией!");
    }
    
    param2.insert("path2", path2);
    
    return true
} //bzr_getFilePathToDiff

function bzr_remove(pathToFile) {
    var rootCatalog = fossil_getRootCatalog(pathToFile);
    var f = v8New("File", pathToFile);
    if (f.IsDirectory()) {
        return false
    }
    
    var TextDoc = v8New("TextDocument");
    TextDoc.AddLine('cd /d "'+rootCatalog+'"')
    TextDoc.AddLine('bzr remove "' +pathToFile+'"');
    TextDoc.Write(PathToBat, 'cp866');
    TextDoc.Clear();
    ErrCode = WshShell.Run('"'+PathToBat+'"', 0, 1)
    return ErrCode
} //bzr_remove

function bzr_revert(pathToFile, ver) {
    var rootCatalog = bzr_getRootCatalog(pathToFile);
    var TextDoc = v8New("TextDocument");
    TextDoc.Записать(PathToBat, "UTF-8");
    TextDoc.AddLine('cd /d"' +rootCatalog +'"')
    var cmd = (ver.length>0) ? 'bzr revert -r '+ver+' "' +pathToFile+'"' : 'bzr revert  "' +pathToFile+'"';
    TextDoc.AddLine(cmd);
    TextDoc.Write(PathToBat, 'cp866');
    TextDoc.Clear();
    ErrCode = WshShell.Run('"'+PathToBat+'"', 0, 1)
    return ErrCode
} //bzr_revert


function bzr_getLog(pathToFile, limit) { //если каталог, тогда информация для каталога, если файл, тогда лог для файла. 
    //Возвращаем массив со стурктурой:
    // arrary[0]['version':122333, 'comment':"Че то написали", 'author':"sosna", 'date':"2012-04-01"]
    var result = []
    f = v8New("File", pathToFile);
    if (!f.Exist()) return result
    //Проверим, есть ли он под версионным контролем у нас.
    var rootCatalog = bzr_getRootCatalog(pathToFile);
    var TextDoc = v8New("TextDocument");
    TextDoc.AddLine('cd /d "'+rootCatalog+'"');
    if (!f.IsDirectory()) {
        TextDoc.AddLine('bzr log -S --line -l '+limit+' '+pathToFile +' > "'+PathToOutput+'"');
    } else {
        TextDoc.AddLine('bzr log -S --line -l '+limit+' > "'+PathToOutput+'"');
    }
    TextDoc.Write(PathToBat, 'cp866');
    ErrCode = WshShell.Run('"'+PathToBat+'"', 0, 1)
    TextDoc.Clear();
    TextDoc.Read(PathToOutput, "cp866");
    if (TextDoc.LineCount() == 0) {
            return result 
    }
    
    var index=0;
    for (var i=1; i<=TextDoc.LineCount(); i++)
    {
        var r = TextDoc.GetLine(i);
        var re = new RegExp(/(\d*):\s(.*)\s([0-9]{4}-[0-9]{2}-[0-9]{2})\s(.*)/);
        var mathes = r.match(re);
        if (mathes && mathes.length) {
            // это первая строка, дальше пойдет id ревизи и т.д.
            result[index] = {"version":mathes[1], "comment":''+mathes[4], "date":mathes[3], "author":mathes[2]}
            index++;
        }
    }
    
return result;    
} // fossil_getLog

function bzr_getInfo(pathToFile, ver) {
    var result = {"comment":"", "files":[]}
    var rootCatalog = bzr_getRootCatalog(pathToFile);
    var TextDoc = v8New("TextDocument");
    TextDoc.AddLine('cd /d "'+rootCatalog+'"')
    TextDoc.AddLine('bzr log -S --show-ids -v -r'+ver +'  > "'+PathToOutput+'"')
    TextDoc.Write(PathToBat, 'cp866');
    ErrCode = WshShell.Run('"'+PathToBat+'"', 0, 1)
    TextDoc.Clear();
    TextDoc.Read(PathToOutput, "cp866");
    if (TextDoc.LineCount() == 0) {
        return result 
    }
    var index=0;
    for (var i=1; i<=TextDoc.LineCount(); i++)
    {
        var r = TextDoc.GetLine(i);
        re_files = new RegExp(/\s*(A|D|M)\s+(.+)\s(\S*-[0-9]{14}-\S+)/);
        var mathes = r.match(re_files);
        if (mathes && mathes.length) {
            result['files'][index] = {"version":ver, "file":''+mathes[2], "status":mathes[1], "fullpath":FSO.BuildPath(rootCatalog, mathes[2].replace(/\//g, '\\'))}
            index++;
        }
    }
    result["comment"] = TextDoc.GetText();
    return result
}

function bzr_getListBranch(pathToFile, index) {
    
    // для bzr возвращать будет отмену, при этом вызывать bzr qcoloswitch для каталога. 
    var result = false;
    var rootCatalog = bzr_getRootCatalog(pathToFile);
    var TextDoc = v8New("TextDocument");
    TextDoc.AddLine('cd /d "'+rootCatalog+'"');
    TextDoc.AddLine('bzr qcoloswitch');
    TextDoc.AddLine('exit');
    TextDoc.Write(PathToBat, 'cp866');
    ErrCode = WshShell.Run('"'+PathToBat+'"', 0, 1)
    
    return result;
    
}

function bzr_swithBranch (pathToFile, branch) {
    
    return true;
}



function Backend_bzr(command, param1, param2) {
    var result = false;
    //Message(" Backend_bzr " + command)
    switch (command) 
    {
    case "CATALOGSTATUS":
        // Добавляем в хвост подпись.
        result = bzr_getStatusForCatalog(param1, "");
        break;
    case "FILESTATUS":
        result = bzr_getFileStatus(param1, param2)
        break;
    case "GETFILESMISSUNG":
        //result = {} //Заглушка. 
        break;
    case "DIFF":
        //result = bzr_getFilePathToDiff(param1, param2)
        Message("Заглушка, еще не реализована команда DIFF");
        break;
    case "ADD":
        result = bzr_add(param1, param2)
        break;
    case "TEST":
        result = bzr_test(param1)
        break;
    case "RUN":
        result = bzr_run(param1, param2)
        break;
    case "SHOWLOG": // старое, пока оставляем. 
        //result = fossil_showlog(param1);
        break
    case "SHOWDIFF":
        result = bzr_getFilePathToDiff(param1, param2);
        break
    case "DELETE":
        result = bzr_remove(param1)
        break
    case "REVERT":
        result = bzr_revert(param1, param2);
        break
    case "COMMIT":
        result = bzr_commit(param1, param2);
        break
    case "GETFILEATREVISION":
        result = bzr_getFileAtRevision(param1, param2)
        break
    case "GETLOG":
        result = bzr_getLog(param1, param2);
        break
    case "GETINFO":
        result = bzr_getInfo(param1, param2);
        break
    case "GETLISTBRANCH":
        result = bzr_getListBranch(param1); //возвращаем result {"valuelist":v8New("ValueList"), "index": индекс ветки текущей} или false...
        break
    case "SWITHBRANCH":
        result = bzr_swithBranch(param1, param2); //выполняет действие... возвращает true || false
        break;

    }
    return result
} //Backend_bzr

function GetBackend() {
    return Backend_bzr
} //GetBackend
