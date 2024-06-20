//engine: JScript
//uname: EscapePassword
//dname: Автоотмена ввода пароля при поиске
//author:Александр Синиченко <sinichenko@yandex.ru>
//descr: Автоотмена ввода пароля при поиске
//help: inplace
//addin: global
//addin: stdcommands
//addin: stdlib

global.connectGlobals(SelfScript);
events.connect(windows, "onDoModal", SelfScript.self, "hookPasswordWindow")

function hookPasswordWindow(dlgInfo) {

	if (dlgInfo.caption == "Введите пароль" && dlgInfo.stage == 0) {
		dlgInfo.cancel = true;
		dlgInfo.result = mbaCancel;  
    }
	
}
