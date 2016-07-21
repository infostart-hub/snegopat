//engine: JScript
//uname: diff_1C
//dname: Backend к diff, типовое сравнение от 1С (mxl,txt,js,vbs)
//addin: global

global.connectGlobals(SelfScript)

function СравнениеФайлов1С(Path1, Path2) {
    var file1 = v8New("File", Path1);
    var file2 = v8New("File", Path2);
    if ((!file1.isFile()) & (!file2.isFile())) return null 
    var ext1 = file1.Extension.substr(1).toLowerCase(); //Уберем первый символ, да в нижний регистр, этоже windows
    var ext2 = file2.Extension.substr(1).toLowerCase(); //Уберем первый символ, да в нижний регистр, этоже windows
    var fc = v8New("СравнениеФайлов")
    fc.ПервыйФайл = Path1;
    fc.ВторойФайл = Path2;
    fc.СпособСравнения = СпособСравненияФайлов.Двоичное;
    if ((ext1.indexOf("mxl") >= 0) & (ext2.indexOf("mxl") >= 0)) fc.СпособСравнения = СпособСравненияФайлов.ТабличныйДокумент;
    if ((ext1.indexOf("txt") >= 0) & (ext2.indexOf("txt") >= 0)) fc.СпособСравнения = СпособСравненияФайлов.ТекстовыйДокумент;
    if ((ext1.indexOf("js") >= 0) & (ext2.indexOf("js") >= 0)) fc.СпособСравнения = СпособСравненияФайлов.ТекстовыйДокумент;
    if ((ext1.indexOf("vbs") >= 0) & (ext2.indexOf("vbs") >= 0)) fc.СпособСравнения = СпособСравненияФайлов.ТекстовыйДокумент;
    
    fc.ПоказатьРазличия();
} //СравнениеФайлов1С

function GetExtension () {
    return "mxl|txt|js|vbs";
} //GetExtension

function GetBackend() {
    return СравнениеФайлов1С
} //GetBackend
