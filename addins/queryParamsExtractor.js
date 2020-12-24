//engine: JScript
//uname: queryParamsExtractor
//dname: Извлечение параметров запроса
//descr: Выделяет параметры из текста запроса
//author: Василий Фролов aka Палыч, palytsh@mail.ru
//help: inplace

////addin: global

//global.connectGlobals(SelfScript)

/*@
AUTHOR: Василий Фролов aka Палыч, palytsh@mail.ru

DATE: 02.09.2011

COMMENT: 
	Макрос ExtractParameters позволяет сформировать код установки 
значений параметров запроса. 
Использование: в программном модуле выделить фрагмент вида 

        з = новый Запрос("текст запроса");

    или фрагмент вида
        з.Текст = "текст запроса";
	
и вызвать макрос (по-умолчанию Ctrl + Shift + Q). Код описания параметров 
запроса будет вставлен в модуль ниже выделенного блока.

@*/

function getPredefinedHotkeys(predef){
	predef.setVersion(1);
	predef.add("ExtractParameters", "Ctrl + Shift + Q");
}

function autoExtract(wnd, sel)
{
    var text = '', vName = '', indent = ''
    for(var idx = sel.beginRow - 1; idx > 0; idx--)
    {
        var line = wnd.line(idx)
        if(line.match(/^\s*[\|"]/))      // Строка начинается с | или "
            text = line + '\n' + text;
        else if(!line.match(/^\s*$/))     // Не пустая строка
        {
            var m = line.match(/([^\s]+)\.(?:Текст|Text)\s*=/i)
            if(m)
                vName = m[1]
            indent = line.match(/^\s*/)[0]
            break
        }
    }
    var params = {}
    var re = /&([^*\s+-/\(\)\{\}\"]+)/ig
    while(re.exec(text))
        params[RegExp.$1.toLowerCase()] = RegExp.$1
    text = ''
    for(var k in params)
        text = text + indent + vName + '.УстановитьПараметр("' + params[k] + '", );\n'
    if(!text.length)
        return false
    wnd.setSelection(sel.beginRow, 1, sel.beginRow, 1)
    wnd.selectedText = text
    wnd.setCaretPos(sel.beginRow, text.match(/\);\n/).index + 1)
    return true
}

function macrosExtractParameters(){
	var w = snegopat.activeTextWindow();
	if (!w) return false;
	
	var sel = w.getSelection();
	var selText = w.selectedText;
	if (selText == '') return autoExtract(w, sel);

	var qParams = getQueryParams(selText);
	if (!qParams) return false;
	
	var qVarName = getQueryVarName(selText);
	var offset = getTextBlockOffset(w.line(sel.endRow - 1));
        //var offset = getTextBlockOffset(w.document.ПолучитьСтроку(sel.endRow - 1));
	
	var paramsText = "";
	for (var i = 0; i < qParams.length; i++){
		paramsText += '\n' + offset + qVarName + //'\r\n'
			'.УстановитьПараметр("' + qParams[i] + '", );';
	};
	
    selText += paramsText + '\n'; //'\r\n';
    w.selectedText = selText;
        //w.document.ВставитьСтроку(sel.endRow, paramsText + '\r\n');

	return true;
}


function getQueryParams(str){
	var matches = str.match(/&([^*\s+-/\(\)\{\}\"]+)/ig);
	if (!matches) return null;

        if (!Array.prototype.indexOf) {
          Array.prototype.indexOf = function (obj, fromIndex) {
            if (fromIndex == null) {
                fromIndex = 0;
            } else if (fromIndex < 0) {
                fromIndex = Math.max(0, this.length + fromIndex);
            }
            for (var i = fromIndex, j = this.length; i < j; i++) {
                if (this[i] === obj)
                    return i;
            }
            return -1;
          };
        }
	
	var res = new Array();
    var arrUpperCase = new Array();
	for (var i = 0; i < matches.length; i++){
        param = matches[i].replace(/^&/ig, "");
        paramU = param.toUpperCase();
        if(-1 == arrUpperCase.indexOf(paramU)){
            res.push(param);
            arrUpperCase.push(paramU);
        }
                //res.push(matches[i].replace(/^&/ig, ""));
	}
	return res;
}

function getQueryVarName(str){
	var matches = str.match(/([^\.\s]+)((\.текст\s*=\s*)|(\s*=\s*новый\s*запрос))/ig); // или "Имя.Текст =" или "Имя = Новый Запрос"
        //var matches = str.match(/([^\s]+)\s*=\s*новый\s*запрос/ig);
	var res = !matches ? "" : RegExp.$1.replace(/\s*/ig, "");
	return res;
}

function getTextBlockOffset(str){
	var match = str.match(/^([\s]+)/ig);
	var res = !match ? "" : match[0];
	return res;
}
