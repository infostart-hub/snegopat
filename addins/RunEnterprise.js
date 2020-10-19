//engine: JScript
//uname: RunEnterprise
//dname: Запуск 1С
//descr: выполняет запуск альтернативного режима работы
//author: Артур Аюханов aka artbear <aartbear@gmail.com>
//help: inplace
//addin: global
//addin: stdcommands

/*@
Cкрипт "Запуск 1С Предприятия" (RunEnterprise.js) для проекта "Снегопат"

Описание: макрос выполняет запуск альтернативного режима работы.
Для обычного толстого клиента альтернативным является толстый клиент управляемое приложение и наоборот.
Для смены режима исправьте значения констант режимЗапуска1 и режимЗапуска2

У меня сейчас активно юзается разработка как в обычном, так и в управляемом приложении - потихоньку начинаю переползать на упр.приложение
без этого макроса приходится вручную переключать в настройках режимы, режим запуски отладки также неудобен, т.к. запустить только один сеанс в режиме отладки

Автор: Артур Аюханов aka artbear <aartbear@gmail.com>
@*/

global.connectGlobals(SelfScript);
// stdlib.require('SettingsManagement.js', SelfScript);

function getPredefinedHotkeys(predef){
    predef.setVersion(1);
    predef.add("Альтернативный режим", "Ctrl + Alt + F5");
}

SelfScript.Self['macrosАльтернативный режим'] = function () {
    поменятьРежимЗапуска()
    
    //запустить 1С
    if(stdcommands.Config.RunEnterprise.getState().enabled)
        stdcommands.Config.RunEnterprise.send()
    
    поменятьРежимЗапуска()
}

function поменятьРежимЗапуска()
{
    var былРежимЗапуска = profileRoot.getValue(путьПрофиля)

    var новыйРежим = былРежимЗапуска;
    if(новыйРежим == режимЗапуска1)
        новыйРежим = режимЗапуска2
    else
        новыйРежим = режимЗапуска1
        
    profileRoot.setValue(путьПрофиля, новыйРежим)

    return былРежимЗапуска
}

// Дополнение 28.01.2014 Slider
function StartDebugAs( userName )
{
	путьПрофиляПользователя	= "Launch/UserNew"
	путьСпособАвторизации	= "Launch/AuthenticationTypeNew"
    var пользователь		= profileRoot.getValue(путьПрофиляПользователя);
	var авторизация			= profileRoot.getValue(путьСпособАвторизации);	
	
    profileRoot.setValue(путьПрофиляПользователя, userName );	
	profileRoot.setValue(путьСпособАвторизации, 1);		
	
	if( stdcommands.CDebug.Start.getState().enabled )
	{	
		stdcommands.CDebug.Restart.send();
	}
	
	// возвращаем настройки назад как было
	profileRoot.setValue(путьПрофиляПользователя, пользователь );	
	profileRoot.setValue(путьСпособАвторизации, авторизация );	
}


SelfScript.Self['macrosЗапуск отладки от имени (выбор при запуске)'] = function () {
	
	StartDebugAs( "" );	
}


SelfScript.Self['macrosЗапуск отладки от имени (по списку)'] = function () {
		
	путьДоСпискаПользователей		= "Launch/MRULaunchUserList"	
	var списокЗначенийПользователей	= profileRoot.getValue( путьДоСпискаПользователей );
	массив							= списокЗначенийПользователей.ВыгрузитьЗначения();
	
	быстрыйНаборКоличество		= списокЗначенийПользователей.Количество();			
	if ( быстрыйНаборКоличество > 0 )
	{
		var ListMode = v8New("ValueList");
		for ( i = 0; i < быстрыйНаборКоличество; i++ )
		{	
			пользователь = списокЗначенийПользователей.Получить( i );
			ListMode.add( i, пользователь );	   
		}
		первыйВСписке	= списокЗначенийПользователей.Получить(0);
		choice			= ListMode.ChooseItem("Выберите пользователя", первыйВСписке );
		if ( choice != undefined )
		{						
			имяВыбранногоПользователя = choice.Представление;			
			StartDebugAs( имяВыбранногоПользователя );
		}
	}	
}

SelfScript.Self['macrosЗапуск отладки от имени Администратор'] = function () {
		
	StartDebugAs("Администратор");
}
//ДополнениеКонец


SelfScript.Self['macrosНастроить режимы запуска'] = function () {

    var текущийРежимЗапуска = profileRoot.getValue(путьПрофиля);
    ////{ режимы запуска 1С, заданные в профайле
    // 1 тонкий клиент
    // 2 автоматически
    // 3 толстый клиент (управляемое приложение)
    // 4 толстый клиент (обычное приложение)
    // 5 веб-клиент
    ////}
    var ListMode = v8New("ValueList");
    ListMode.add(1, "Тонкий клиент");
    ListMode.add(2, "Автоматически");
    ListMode.add(3, "Толстый клиент (управляемое приложение)");
    ListMode.add(4, "Толстый клиент (обычное приложение)");
    ListMode.add(5, "Веб-клиент");
    
    var defaultItem = ListMode.FindByValue(текущийРежимЗапуска);
    var choice = ListMode.ChooseItem("Выберите режим запуска по умолчанию", defaultItem);
    if (choice!=undefined) {
        режимЗапуска1 = choice.value;
        if (режимЗапуска1!=текущийРежимЗапуска) profileRoot.setValue(путьПрофиля, режимЗапуска1);
    } 
    
    var defaultItem = ListMode.FindByValue(режимЗапуска2);
    var choice = ListMode.ChooseItem("Выберите альтернативный режим запуска", defaultItem);
    if (choice!=undefined) {
        режимЗапуска2 = choice.value;
    }
    
    //Сохраним режимы запуска 
    profileRoot.setValue(pflRunEnterpriseStartModeAlternative, режимЗапуска2);
    
}

var pflRunEnterpriseStartModeAlternative  = "RunEnterprise/StartAlternativeMode";
profileRoot.createValue(pflRunEnterpriseStartModeAlternative, 3, pflSnegopat); // управляемый толстый, для алтернативного режима

var путьПрофиля = "Launch/StartMode2"

var режимЗапуска1 = profileRoot.getValue(путьПрофиля);
var режимЗапуска2 = profileRoot.getValue(pflRunEnterpriseStartModeAlternative);
