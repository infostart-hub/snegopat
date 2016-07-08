$engine JScript
$uname diff_1C
$dname Backend к diff, типовое сравнение от 1— (mxl,txt,js,vbs)
$addin global

global.connectGlobals(SelfScript)

function —равнение‘айлов1—(Path1, Path2) {
    var file1 = v8New("File", Path1);
    var file2 = v8New("File", Path2);
    if ((!file1.isFile()) & (!file2.isFile())) return null 
    var ext1 = file1.Extension.substr(1).toLowerCase(); //”берем первый символ, да в нижний регистр, этоже windows
    var ext2 = file2.Extension.substr(1).toLowerCase(); //”берем первый символ, да в нижний регистр, этоже windows
    var fc = v8New("—равнение‘айлов")
    fc.ѕервый‘айл = Path1;
    fc.¬торой‘айл = Path2;
    fc.—пособ—равнени€ = —пособ—равнени€‘айлов.ƒвоичное;
    if ((ext1.indexOf("mxl") >= 0) & (ext2.indexOf("mxl") >= 0)) fc.—пособ—равнени€ = —пособ—равнени€‘айлов.“абличныйƒокумент;
    if ((ext1.indexOf("txt") >= 0) & (ext2.indexOf("txt") >= 0)) fc.—пособ—равнени€ = —пособ—равнени€‘айлов.“екстовыйƒокумент;
    if ((ext1.indexOf("js") >= 0) & (ext2.indexOf("js") >= 0)) fc.—пособ—равнени€ = —пособ—равнени€‘айлов.“екстовыйƒокумент;
    if ((ext1.indexOf("vbs") >= 0) & (ext2.indexOf("vbs") >= 0)) fc.—пособ—равнени€ = —пособ—равнени€‘айлов.“екстовыйƒокумент;
    
    fc.ѕоказать–азличи€();
} //—равнение‘айлов1—

function GetExtension () {
    return "mxl|txt|js|vbs";
} //GetExtension

function GetBackend() {
    return —равнение‘айлов1—
} //GetBackend

