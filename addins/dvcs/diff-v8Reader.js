$engine JScript
$uname diff_v8Reader
$dname Backend к diff просмотру (ssf, cf)
$addin global

global.connectGlobals(SelfScript)

var mainFolder = profileRoot.getValue("Snegopat/MainFolder")

var pathTo1C = mainFolder + "\\core\\starter.exe";
//var pathToBase = mainFolder + "\\scripts\\dvcs\\basediff";

var м‘ормаЌастройки=null

function macrosЌастрокаv8Reader(){
    var pathToForm=SelfScript.fullPath.replace(/js$/, 'ssf')
    м‘ормаЌастройки=loadScriptForm(pathToForm, SelfScript.self) // ќбработку событий формы прив€жем к самому скрипту
    м‘ормаЌастройки.ќткрытьћодально()
}

function м«аписатьЌастройки()
{
    pathToBase = м‘ормаЌастройки.pathToBase;
    profileRoot.setValue(pflPathToBase, pathToBase)
}

function ѕриќткрытии()
{
    м‘ормаЌастройки.pathToBase=pathToBase
}

function pathToBaseЌачало¬ыбора(Ёлемент, —тандартна€ќбработка) {
    л‘айл=м¬ыбрать аталог()
    if(л‘айл=="") return
    Ёлемент.val.«начение=л‘айл
}

function  н«аписатьЌажатие( нопка) {
    м«аписатьЌастройки();
    м‘ормаЌастройки.«акрыть();
}

function м¬ыбрать аталог()
{
    ƒиалогќткрыти€‘айла=v8New("ƒиалог¬ыбора‘айла", –ежимƒиалога¬ыбора‘айла.ChooseDirectory)
    ƒиалогќткрыти€‘айла.«аголовок = "¬ыберите каталог расположени€ базы сравнени€ "
    if(ƒиалогќткрыти€‘айла.¬ыбрать()==false) return ""
    return ƒиалогќткрыти€‘айла. аталог
}

function  нЌастройкаѕо”молчаниюЌажатие ( нопка) {
    var мpathToBase = м‘ормаЌастройки.pathToBase;
    if (мpathToBase.length <1) {
        var мpathToBase = mainFolder + "basediff";
        try {
            —оздать аталог(мpathToBase);
            Message("—оздан каталог " + мpathToBase);
        } catch (e) {
            Message("ќшибка при созаднии каталога " + мpathToBase + " описание ошибки " + e.description) ;
            return;
        }
    }
    try {
        var cmd = '"'+pathTo1C+'" CREATEINFOBASE File="'+мpathToBase+'"; /AddInList diff1Cv8Reader /UseTemplate "'+mainFolder + "scripts\\dvcs\\basediff\\v8reader.dt" +'"';
        «апуститьѕриложение(cmd, "", true);
		м‘ормаЌастройки.pathToBase = мpathToBase;
    } catch (e) {
        Message("ќшибка при создании базы. «агрузите dt вручную и укажите путь к базе. " + mainFolder + "scripts\\dvcs\\basediff\\v8reader.dt " +e.description);
        return;
    }
}

function diff_v8Reader(Path1, Path2) {

    if (pathToBase.length<1) {
        Message("Ќеобходимо настроить путь к служебной базе дл€ сравнени€.")
        Message("ќткройте настройки дл€ скрипта Backend к diff просмотру (ssf, cf) и заполните их.")
        return
    }
    sBaseDoc = Path1.replace(/\//g, '\\');
    sNewDoc = Path2.replace(/\//g, '\\');
    var tmpfile = ѕолучить»м€¬ременного‘айла("txt");
    var TextDoc = v8New("TextDocument");
    TextDoc.AddLine(sBaseDoc)
    TextDoc.AddLine(sNewDoc)
    TextDoc.Write(tmpfile);
    var FSO = new ActiveXObject("Scripting.FileSystemObject");
    var cmd = '"'+pathTo1C+'" enterprise /RunModeOrdinaryApplication  /F"'+pathToBase+'" /C"'+FSO.GetAbsolutePathName(tmpfile)+'" ' ;
    «апуститьѕриложение(cmd);
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
    return 'Ќастрокаv8Reader'
} //getDefaultMacros

////////////////////////////////////////////////////////////////////////////////////////
////{ »нициализаци€ скрипта
////

var pflPathToBase         = "diffv8Reader/pathToBase"
profileRoot.createValue(pflPathToBase, "", pflSnegopat);

var pathToBase = profileRoot.getValue(pflPathToBase)
////} »нициализаци€ скрипта