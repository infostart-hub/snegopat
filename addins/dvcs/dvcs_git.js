//engine: JScript
//uname: dvcs_git
//dname: Backend dvcs к git
//addin: stdlib
//addin: global

// (c) Сосна Евгений shenja at sosna.zp.ua
// Скрипт - Backend к bzr для отображения версионного контроля. 

global.connectGlobals(SelfScript)

stdlib.require('log4js.js', SelfScript);

var logger = Log4js.getLogger(SelfScript.uniqueName);
var appender = new Log4js.BrowserConsoleAppender();
appender.setLayout(new Log4js.PatternLayout(Log4js.PatternLayout.TTCC_CONVERSION_PATTERN));
logger.addAppender(appender);
logger.setLevel(Log4js.Level.ERROR);

var mainFolder = stdlib.getSnegopatMainFolder();

var FSO = new ActiveXObject("Scripting.FileSystemObject");
var WshShell = new ActiveXObject("WScript.Shell");
var TempDir = WshShell.ExpandEnvironmentStrings("%temp%") + "\\";

BackendGit = stdlib.Class.extend({

    construct : function() {
        this.mainFolder = mainFolder;
        this.pathToBin = "git";
        this.CatalogAndFilesStatus = [];
      this.pathToTempOutput = TempDir+"gitstatus.txt" // Пишем 1С файл в utf-8, выводим туда статус fossil после этого читаем его. 
		this.pathToCmd = TempDir + "gitcmd.bat";

		BackendGit._instance = this;

    },

    getRootCatalog : function(path){

    	var result = "";
	    for (var key in this.CatalogAndFilesStatus){
	        if (path.indexOf(key)!=-1) {
	            result = key
	            break;
	        }
    	}
    	if ((result == undefined) && (result.length==0)){
    		var f = v8New("File", path);
	        if (f.Exist()) {
	            
	            var TextDoc = v8New("TextDocument");
	            TextDoc.Записать(this.pathToTempOutput, "UTF-8");
	            млКаталог = f.Path;
	            TextDoc.AddLine('cd /d"' +млКаталог +'"')
	            TextDoc.AddLine('git rev-parse --show-toplevel > "'+this.pathToTempOutput+'"'); // http://stackoverflow.com/questions/957928/is-there-a-way-to-get-the-git-root-directory-in-one-command
	            TextDoc.Write(this.pathToCmd, 'cp866');
	            ErrCode = WshShell.Run('"'+this.pathToCmd+'"', 0, 1)
	            TextDoc.Read(this.pathToTempOutput, "UTF-8");
	            if (TextDoc.LineCount() == 0) {
                    logger.error("root catalog not found, комманда не выполнилась ");
                    logger.error(this.pathToTempOutput);
	                return "" //что то пошло не так. 
	            }
	        
	            var i=0;
	            for (var i=1; i<=TextDoc.LineCount(); i++)
	            {
	                var r = TextDoc.GetLine(i); // тут будет первая линия. 
	                if (r.substr(0,5).indexOf("fatal") != -1){

	                	rootpath = r.replace(/\//g, '\\');
	                	result = rootpath;
	                	this.CatalogAndFilesStatus[result] = {};
	                	break
	                }
	            }
	            TextDoc.Clear();
	            TextDoc.Write(this.pathToTempOutput, "UTF-8");
	        }
    	}
        logger.debug("root catalog for "+path + " is "+result)
	    return result;
    },

    getStatusForCatalog : function(pathToCatalog){
        if (!this.CatalogAndFilesStatus ) {
            Message("not defined");
            this.CatalogAndFilesStatus=[]
        }
        logger.trace("getStatusForCatalog");
    	this.CatalogAndFilesStatus[pathToCatalog] = {};
    	var СоответствиеСтатусов = this.CatalogAndFilesStatus[pathToCatalog];
    	var TextDoc = v8New("TextDocument");
    	TextDoc.Write(this.pathToTempOutput, "UTF-8");
    	TextDoc.AddLine('cd /d "' +pathToCatalog+'"');
    	TextDoc.AddLine('git status -s -u --porcelain > "'+this.pathToTempOutput+'"');
    	TextDoc.Write(this.pathToCmd, "cp866");
    	ErrCode = WshShell.Run('"'+this.pathToCmd+'"', 0, 1);
    	TextDoc.Read(this.pathToTempOutput, "UTF-8");
        if (TextDoc.LineCount() == 0) {
                logger.error("получение статуса файлов для каталогов сломалось.")
                logger.error(pathToCatalog);
                logger.error(this.pathToTempOutput);
                return false //что то пошло не так. 
        }
        var i=0;
        re = new RegExp(/^(\sM|\sA|\sD|\?\?|R|C|U)\s{1,2}(.*)$/);
        for (var i=1; i<=TextDoc.LineCount(); i++)
        {
	        var r = TextDoc.GetLine(i);
            logger.trace(r);
	        var mathes = r.match(re);
	        if (mathes && mathes.length) {
	            filename = ""+mathes[2] 
	            filename = filename.replace(/\//g, '\\'); 
                filename = filename.replace(/"/g, ''); //FIXME: для линукс версии это неправильно. 
                logger.trace("match to file "+ filename +" is "+ mathes[1])
	            switch (mathes[1]) 
	            {
	                case " M":
	                СоответствиеСтатусов[FSO.BuildPath(pathToCatalog, filename)]= "EDITED"
	                break;
	                
	                case " A":
	                СоответствиеСтатусов[FSO.BuildPath(pathToCatalog, filename)]= "ADDED"
	                break;
	                
	                case "??":
	                СоответствиеСтатусов[FSO.BuildPath(pathToCatalog, filename)]= "NOTVERSIONED"
	                break;
	                
	                case " D":
	                СоответствиеСтатусов[FSO.BuildPath(pathToCatalog, filename)]= "DELETED"
	                break;

	                case " R":
	                СоответствиеСтатусов[FSO.BuildPath(pathToCatalog, filename)]= "rename";
	                break;

	                case " C":
	                СоответствиеСтатусов[FSO.BuildPath(pathToCatalog, filename)]= "copied";
	                break;

	                case " U":
	                СоответствиеСтатусов[FSO.BuildPath(pathToCatalog, filename)]= "update";
	                break;
	            }
	            continue;
	        }
        }

        //TODO: тут получим имя ветки текущей.
        var TextDoc = v8New("TextDocument");
        //TextDoc.Write(this.pathToTempOutput, "UTF-8");
        TextDoc.Write(this.pathToCmd, "UTF-8");
        TextDoc.AddLine('cd /d "' +pathToCatalog+'"');
        TextDoc.AddLine('git branch --no-color -l > "'+this.pathToTempOutput+'"');
        //TextDoc.Write(this.pathToCmd, "cp866");
        ErrCode = WshShell.Run('"'+this.pathToCmd+'"', 0, 1);
        TextDoc.Read(this.pathToTempOutput, "UTF-8");
        if (TextDoc.LineCount() == 0) {
                return false //что то пошло не так. 
        }
        var i=0;
        re = new RegExp(/.*(\*)\s*(.*)/);
        for (var i=1; i<=TextDoc.LineCount(); i++) {
            var r = TextDoc.GetLine(i);
            var mathes = r.match(re);
            if (mathes && mathes.length) {
                branchname = ""+mathes[2];
                СоответствиеСтатусов[pathToCatalog]=branchname;
                break;
            }
        }

	    return true
	},

	getFileStatus : function(pathToCatalog, pathToFile){
		var лКаталог = pathToCatalog;
		var rootCatalog = this.getRootCatalog(pathToFile);

	    СоответсвиеФайлов = this.CatalogAndFilesStatus[rootCatalog];
	    if (СоответсвиеФайлов == undefined) {
            logger.debug("Не найденно соответсвие статусов файлов для каталога "+rootCatalog);
            return null 
        }
	    
	    return (СоответсвиеФайлов[pathToFile] == undefined) ? null : СоответсвиеФайлов[pathToFile]
	},

	test : function(pathToCatalog){

	    var f = v8New("File", pathToCatalog);
    	if (!f.Exist()) return false; 
    	if (!f.IsDirectory()) return false;
    	var f = v8New("File", FSO.BuildPath(pathToCatalog, '.git'));
    	if (!f.Exist()) {
        	return false
    	}
    	return true
	},

    add : function(pathToFile, param2) {
        var rootCatalog = this.getRootCatalog(pathToFile);
        var f = v8New("File", pathToFile);
        if (f.IsDirectory()) {
            pathToFile = '.'
        } else {
            pathToFile = '"'+pathToFile+'"'
        }
        
        var TextDoc = v8New("TextDocument");
        TextDoc.AddLine('cd /d "'+rootCatalog+'"')
        TextDoc.AddLine('git add ' +pathToFile);
        TextDoc.Write(this.pathToCmd, 'cp866');
        
        TextDoc.Clear();
        ErrCode = WshShell.Run('"'+this.pathToCmd+'"', 0, 1)
        return ErrCode
    } ,

    getFileAtRevision : function(pathToFile, rev){
        var TextDoc = v8New("TextDocument");
        TextDoc.Записать(this.pathToTempOutput, "UTF-8");
        
        var f = v8New("File", pathToFile);
        if (!f.Exist()) 
        {
            Message(" файла физически не существует...") 
            return null;
        }
        if ((!rev) || (rev.length==0)) {
            rev = "HEAD"
        }
        var rootCatalog = this.getRootCatalog(pathToFile)
        if (rev.length !=0) {
            var filerev = FSO.BuildPath(TempDir, rev+f.Имя);
            TextDoc.AddLine('cd /d "' +rootCatalog +'"')
            TextDoc.AddLine('git show --no-color '+rev +':"'+pathToFile.replace(rootCatalog+'\\', '') +'" > ' + filerev)
            TextDoc.Write(this.pathToCmd, 'cp866');
            TextDoc.Clear();
            ErrCode = WshShell.Run('"'+this.pathToCmd+'"', 0, 1)
            return filerev;
        }
        return null
    }, //getFileAtRevision

    getFilePathToDiff : function(param1, param2) { //текущая версия файла с предыдущей...
        
        var TextDoc = v8New("TextDocument");
        TextDoc.Записать(this.pathToTempOutput, "UTF-8");
        // возвращать будем структру, path1 и path2 
        var pathToFile = param1;
        var rootCatalog = this.getRootCatalog(pathToFile);
        param2.insert("path1", pathToFile);
        param2.insert("path2", "");
        
        var f = v8New("File", pathToFile);
        if (!f.Exist()) return false
        //var path2 = GetTempFileName(f.Extension.substr(1));
        var path2 = this.getFileAtRevision(pathToFile, "HEAD");
        if (path2 == null) {
            Message("Неудачная попытка создать файл с последней версией!");
        } else {
            // Запустим shell и найдем версии файлов. 
            var f = v8New("File", path2);
            if (!f.Exist()) { // Файл будет все равно, но пустой. Думаю простят. 
                Message("Не создался файл, где-то тут ошибочка. ") ;
            }    
        }
        param2.insert("path2", path2);
        
        return true
    }, //getFilePathToDiff

    getLog : function(pathToFile, limit) { 
        //если каталог, тогда информация для каталога, если файл, тогда лог для файла. 
        //Возвращаем массив со стурктурой:
        // arrary[0]['version':122333, 'comment':"Че то написали", 'author':"sosna", 'date':"2012-04-01"]
        var result = [];
        f = v8New("File", pathToFile);
        if (!f.Exist()) return result;
        var rootCatalog = this.getRootCatalog(pathToFile);
        var TextDoc = v8New("TextDocument");
        TextDoc.AddLine('cd /d "'+rootCatalog+'"');
        var textLimit = limit>0?'-'+limit : '';
        TextDoc.AddLine('git log --date=iso --encoding=UTF-8 --pretty=format:"%%h%%x09%%an%%x09%%ad%%x09%%s" '+textLimit+' '+pathToFile.replace(rootCatalog+'\\', '')+' >"'+this.pathToTempOutput+'"');
        TextDoc.Write(this.pathToCmd, 'cp866');
        ErrCode = WshShell.Run('"'+this.pathToCmd+'"', 0, 1)
        TextDoc.Clear();
        TextDoc.Read(this.pathToTempOutput, "UTF-8");
        
        if (TextDoc.LineCount() == 0) {
            return result 
        }
        var index=0;
        for (var i=1; i<=TextDoc.LineCount(); i++)
        {
            var r = TextDoc.GetLine(i);
            var re = new RegExp(/^(.*)\t(.*)\t(.*)\t(.*)$/);
            var mathes = r.match(re);
            if (mathes && mathes.length) {
                result[index] = {"version":mathes[1], "comment":''+mathes[4], "date":mathes[3], "author":mathes[2]}
                index++;
            }
        }
        // git log --date=iso --encoding=UTF-8 --pretty=format:"%h%x09%an%x09%ad%x09%s"
        return result;    
    }, // getLog

    getInfo : function(pathToFile, ver){

        var result = {"comment":"", "files":[]}
        var rootCatalog = this.getRootCatalog(pathToFile);
        var TextDoc = v8New("TextDocument");
        TextDoc.AddLine('cd /d "'+rootCatalog+'"')
        TextDoc.AddLine(' git log --no-color --encoding=UTF-8 --raw --date=iso --pretty=fuller --parents -1 '+ver +' > "'+this.pathToTempOutput+'"')
        TextDoc.Write(this.pathToCmd, 'cp866');
        ErrCode = WshShell.Run('"'+this.pathToCmd+'"', 0, 1)
        TextDoc.Clear();
        TextDoc.Read(this.pathToTempOutput, "UTF-8");
        if (TextDoc.LineCount() == 0) {
            return result 
        }
        var index=0;
        for (var i=1; i<=TextDoc.LineCount(); i++)
        {
            var r = TextDoc.GetLine(i);
            re_files = new RegExp(/^:\d+\s+\d+\s+[0-9a-f.]+\s+[0-9a-f.]+\s+(\w)\t(.+)$/);
            var mathes = r.match(re_files);
            if (mathes && mathes.length) {
                result['files'][index] = {"version":ver, "file":''+mathes[2], "status":mathes[1], "fullpath":FSO.BuildPath(rootCatalog, mathes[2].replace(/\//g, '\\'))}
                index++;
            }
        }
        result["comment"] = TextDoc.GetText();

        return result
    },

    commit : function(pathToFile, message) {
        var rootCatalog = this.getRootCatalog(pathToFile);
        var tempfile = GetTempFileName("txt");
        var f = v8New("File", pathToFile);
        if (f.IsDirectory()) {
            pathToFile = ' -a'
        } else { 
            pathToFile = '"'+pathToFile.replace(rootCatalog+'\\', '')+'"'
        }
        var TextDoc = v8New("TextDocument");
        TextDoc.Write(this.pathToCmd);
        TextDoc.AddLine('cd /d "'+rootCatalog+'"')
        TextDoc.AddLine('git commit ' +pathToFile+' --file="'+tempfile+'"');
        TextDoc.AddLine('exit');
        
        TextDoc.Write(this.pathToCmd, 'cp866');
        
        TextDoc.Clear();
        TextDoc.SetText(message);
        TextDoc.Write(tempfile, 'UTF-8');
        ErrCode = WshShell.Run('"'+this.pathToCmd+'"', 1, 1)
        return ErrCode
    }, //commit



    run : function(pathToFile){
        var rootCatalog = this.getRootCatalog(pathToFile);
        var TextDoc = v8New("TextDocument");
        TextDoc.AddLine('cd /d "'+rootCatalog+'"');
        TextDoc.AddLine('start cmd.exe')
        TextDoc.Write(this.pathToCmd, 'cp866');
    
        ЗапуститьПриложение(this.pathToCmd, "", true);
        TextDoc = null;
    } //run



}); // 


function backend_git (command, param1, param2) {
    var result = false;
    git = GetBackendGit();

    switch (command) 
    {
    case "CATALOGSTATUS":
        // Добавляем в хвост подпись.
        result = git.getStatusForCatalog(param1, "");
        break;
    case "FILESTATUS":
    	result = git.getFileStatus(param1, param2);
        break;
    case "TEST":
        result = git.test(param1);
        break;
    case "ADD":
        result = git.add(param1, param2)
        break;
    case "GETFILEATREVISION":
        result = git.getFileAtRevision(param1, param2);
        break;
    case "SHOWDIFF":
        result = git.getFilePathToDiff(param1, param2);
        break;
    case "GETLOG":
        result = git.getLog(param1, param2);
        break
    case "GETINFO":
        result = git.getInfo(param1, param2);
        break
    case "COMMIT":
        result = git.commit(param1, param2);
        break;
    
    }
    return result
} //Backend_bzr

function GetBackend() {
    return backend_git
} //GetBackend

function GetBackendGit() {
    if (!BackendGit._instance)
        new BackendGit();
    
    return BackendGit._instance;
}

