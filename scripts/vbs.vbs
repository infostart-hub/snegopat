//engine: VBScript
//debug: no
//uname: vbs
//dname: Исполнитель VB-кода
//addin: global
//descr: Скрипт для вызова методов 1С, возвращающих результат через переданные по ссылке параметры
//author: orefkov
//help: inplace

'/*@ Данный скрипт есть "костыль" для JScript скриптов, когда им нужно обратиться к методам 1С,
' которые возвращают результат через переданный параметр, например - ВвестиСтроку,
' ПолеТекстовогоДокумента::ПолучитьГраницыВыделения и тд и тп. JScript никогда не передает параметры
' по ссылке и не может получить результат выполнения таких методов.
' Пример. Получение границ выделения ПоляТекстовогоДокумента с именем Код, расположенного на форме:
'
'    needMoveCaret = {br:0, bc:0, er:0, ec:0};
'    var vbs = addins.byUniqueName("vbs").object();
'    vbs.result = needMoveCaret;
'    vbs.var1 = form.ЭлементыФормы.Код;
'    vbs.DoExecute("br=0:bc=0:er=0:ec=0:var1.GetTextSelectionBounds br, bc, er, ec:result.br=br:result.bc=bc:result.er=er:result.ec=ec");
'
' ВАЖНО. VBScript, в отличии от JScript, не понимает русских букв, поэтому для вызова методов 1С используйте английские названия.@*/

global.connectGlobals(SelfScript)

result = 0
var0 = 0
var1 = 0
var2 = 0
var3 = 0
var4 = 0
var5 = 0
var6 = 0
var7 = 0
var8 = 0
var9 = 0

Function DoEval(str)
    DoEval = Eval(str)
End Function

Function DoExecute(str)
    Execute str
    DoExecute = result
End Function
