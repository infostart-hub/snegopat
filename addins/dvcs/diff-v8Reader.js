//engine: JScript
//uname: diff_v8Reader
//dname: Backend к diff просмотру (ssf, cf)
//addin: global
//addin: stdlib

global.connectGlobals(SelfScript)
var mainFolder = stdlib.getSnegopatMainFolder();

var pathTo1C = env.pathes.core + "starter.exe";
//var pathToBase = mainFolder + "\\scripts\\dvcs\\basediff";

var мФормаНастройки=null

function macrosНастрокаv8Reader(){
    var pathToForm=SelfScript.fullPath.replace(/js$/, 'ssf')
    мФормаНастройки=loadScriptForm(pathToForm, SelfScript.self) // Обработку событий формы привяжем к самому скрипту
    мФормаНастройки.ОткрытьМодально()
}

function мЗаписатьНастройки()
{
    pathToBase = мФормаНастройки.pathToBase;
    profileRoot.setValue(pflPathToBase, pathToBase)
}

function ПриОткрытии()
{
    мФормаНастройки.pathToBase=pathToBase
}

function pathToBaseНачалоВыбора(Элемент, СтандартнаяОбработка) {
    лФайл=мВыбратьКаталог()
    if(лФайл=="") return
    Элемент.val.Значение=лФайл
}

function КнЗаписатьНажатие(Кнопка) {
    мЗаписатьНастройки();
    мФормаНастройки.Закрыть();
}

function мВыбратьКаталог()
{
    ДиалогОткрытияФайла=v8New("ДиалогВыбораФайла", РежимДиалогаВыбораФайла.ChooseDirectory)
    ДиалогОткрытияФайла.Заголовок = "Выберите каталог расположения базы сравнения "
    if(ДиалогОткрытияФайла.Выбрать()==false) return ""
    return ДиалогОткрытияФайла.Каталог
}

function КнНастройкаПоУмолчаниюНажатие (Кнопка) {
    var мpathToBase = мФормаНастройки.pathToBase;
    if (мpathToBase.length <1) {
        var мpathToBase = mainFolder + "basediff";
        try {
            СоздатьКаталог(мpathToBase);
            Message("Создан каталог " + мpathToBase);
        } catch (e) {
            Message("Ошибка при созаднии каталога " + мpathToBase + " описание ошибки " + e.description) ;
            return;
        }
    }
    try {
        var cmd = '"'+pathTo1C+'" CREATEINFOBASE File="'+мpathToBase+'"; /AddInList diff1Cv8Reader /UseTemplate "'+ env.pathes.addins + "dvcs\\basediff\\v8reader.dt" +'"';
        ЗапуститьПриложение(cmd, "", true);
		мФормаНастройки.pathToBase = мpathToBase;
    } catch (e) {
        Message("Ошибка при создании базы. Загрузите dt вручную и укажите путь к базе. " + env.pathes.addins + "dvcs\\basediff\\v8reader.dt " +e.description);
        return;
    }
}

function diff_v8Reader(Path1, Path2) {

    if (pathToBase.length<1) {
        Message("Необходимо настроить путь к служебной базе для сравнения.")
        Message("Откройте настройки для скрипта Backend к diff просмотру (ssf, cf) и заполните их.")
        return
    }
    sBaseDoc = Path1.replace(/\//g, '\\');
    sNewDoc = Path2.replace(/\//g, '\\');
    var tmpfile = ПолучитьИмяВременногоФайла("txt");
    var TextDoc = v8New("TextDocument");
    TextDoc.AddLine(sBaseDoc)
    TextDoc.AddLine(sNewDoc)
    TextDoc.Write(tmpfile);
    var FSO = new ActiveXObject("Scripting.FileSystemObject");
    var cmd = '"'+pathTo1C+'" enterprise /RunModeOrdinaryApplication  /F"'+pathToBase+'" /C"'+FSO.GetAbsolutePathName(tmpfile)+'" ' ;
    ЗапуститьПриложение(cmd);
} //diff_v8Reader

function GetExtension() {
    var result = 'ssf|cf';
    try { //сделаем возможность работы в демо режиме снегопата. 
        events.connect(windows, "onDoModal", SelfScript.self, "GetExtension");
        events.disconnect(windows, "onDoModal", SelfScript.self, "GetExtension");
        } catch (e) {
            result = "ssf|cf|epf|erf";
        }
    return result;
} //GetExtension

function GetBackend() {
    return diff_v8Reader
} //GetBackend


function getDefaultMacros() {
    return 'Настрокаv8Reader'
} //getDefaultMacros

////////////////////////////////////////////////////////////////////////////////////////
////{ Инициализация скрипта
////

var pflPathToBase         = "diffv8Reader/pathToBase"
profileRoot.createValue(pflPathToBase, "", pflSnegopat);

var pathToBase = profileRoot.getValue(pflPathToBase)
////} Инициализация скрипта