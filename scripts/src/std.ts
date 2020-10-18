//engine: JScript
//debug: no
//uname: stdlib
//dname: Стандартная библиотека
//author: orefkov and community
//descr: Библиотека для общеупотребительных стандартных функций
//help: inplace
//addin: global

/*@
В данном скрипте собраны несколько методов, полезных для сторонних разработчиков аддинов, чтобы
им не приходилось "изобретать велосипед", а также более "бесшовно" встраиваться в существующую
инфраструктуру скриптов снегопата.
    Кроме того, скрипт может служить и хорошим сборником примеров по работе со SnegAPI.
@*/

/// <reference path="../snegopat.d.ts"/>
/// <reference path="../v8.d.ts"/>
import * as stdcommands from "./commands";

global.connectGlobals(SelfScript);
/**
 * Guid'ы различных типов документов
 */
export var DocKinds = {
    Auto: '00000000-0000-0000-0000-000000000000',       // Тип файла определяется по его расширению, если не найден, то как текст
    TextOem: '74d75a51-58b7-46b0-931a-f3bac20e596e',    // простой текст - кодировка Dos/Oem
    Epf: '0e0e54cf-253b-4fc9-a895-26897e1a51f7',        // обработки
    Erf: '6d01520c-23c6-4301-86f7-e81268f07ee3',        // отчеты
    Moxel: 'e555a6fe-768f-476a-bf4b-1d945aa56099',      // табличный документ
    Config: 'c64ce8a4-a74d-40e9-996e-feadca885e11',     // файл конфигурации
    Template: '03ad782c-900b-4594-bdb7-66ed05992b8b'    // файл шаблонов
};

/**
 * Открыть файл для редактирования в 1С
 * Если тип файла не задан, то используется Auto
**/
export function openFileIn1C(path: string, docKind: string): void {
    if (arguments.length < 2)    // docKind не указан
        docKind = DocKinds.Auto;
    if (path.match(/\.ssf$/)) {
        designScriptForm(path);
        return;
    }
    var mruItem = ЗначениеИзСтрокиВнутр('{"#",36973550-6bbb-11d5-bf72-0050bae2bc79,\n' +
        '{1,\n' +
        '{"file://' + path + '",0},' + docKind + '}\n' +
        '}');

    // Получим текущий список MRU из настроек
    var mru = profileRoot.getValue("App/MRUFileList");
    // Если там уже есть наше значение, удалим его
    var hasInMru = mru.НайтиПоЗначению(mruItem);
    if (hasInMru)
        mru.Удалить(hasInMru);
    // Если список полон, удалим последний элемент
    if (mru.Количество() == 8)
        mru.Удалить(7)
    // Вставим значение для нашего файла в начало списка
    mru.Вставить(0, mruItem);
    // Сохраним MRU-список обратно в настройки
    profileRoot.setValue("App/MRUFileList", mru);
    // И зашлем команду
    var cmd = stdcommands.Frame.RecentFile;
    cmd.getState();
    cmd.send(0);
}

/**
 * Узнать, открыта ли конфигурация
 */
export function isConfigOpen(): boolean {
    var s = stdcommands.Config.Close.getState();
    return s && s.enabled;
}

/**
 * Узнать, модифицирована ли конфигурация
 */
export function isConfigModified(): boolean {
    var s = stdcommands.Config.Save.getState();
    return s && s.enabled;
}

// Узнать, отличается ли конфигурация от конфигурации ИБ
export function isConfigsDifferent() {
    var s = stdcommands.Config.UpdateDBCfg.getState();
    return s && s.enabled;
}

/**
 * Загрузить скрипт-библиотеку по имени файла или полному пути.
 * Возвращает объект, предоставляющий доступ ко всем публичным
 * функциям и переменным скрипта filename, аналогично директиве $addin.
 * Если вторым параметром передан SelfScript вызывающего скрипта,
 * то все публичные объекты и функции будут добавлены в такими же
 * именами в глобальное пространство имен скрипта.
 * Третий параметр - strict (bool) используется чтобы указать,
 * что в случае конфликтов имен необходимо выводить диагностическое
 * сообщение.
 */

SelfScript.self['require'] = function(filename: string, scriptCaller, strict?:boolean) {
    var fullPath = filename;

    /* Задан полный путь или уникальное имя скрипта?
     * Проверяем по наличию указания буквы диска в начале пути
     * или двойного слеша (при адресации скрипта на сетевом ресурсе).
     */

    var isFullPath = fullPath.match(/^(\w\:|\\\\)/);

    /* Если задано только имя файла, то ищем скрипт-библиотеку по имени файла
     * в каталоге Scripts\Libs каталога Снегопата.
     * TODO: Нужен ли "правильный" алгоритм поиска библиотеки, в рабочем каталоге
     * и в путях, прописанных в переменной среды PATH?
     */

    if (!isFullPath) {
        var f: File = v8New("Файл", env.pathes.addins + "Libs\\" + filename);

        if (!f.Существует() || !f.ЭтоФайл()) {
            Message("require: Не найден скрипт " + filename);
            throw "require: Не найден скрипт " + filename;
        }
        fullPath = f.ПолноеИмя;
    }

    /* Формируем полный путь загрузки скрипта,
     * включающий в себя протокол.
     */

    var fullLoadString = "script:" + fullPath;

    /* Проверяем, не загружен ли скрипт уже (по полному пути)
     * и загружаем, если это не так.
     */

    var lib = addins.byFullPath(fullLoadString);

    if (!lib) {
        /* Среди групп аддинов первого уровня ищем группу для
         * скриптов-библиотек. Если такой группы нет, то создадим ее.
         */

        var libGroup = addins.libs;

        // Загружаем скрипт.
        try {
            lib = addins.loadAddin(fullLoadString, libGroup);
        }
        catch (e) {
            Message("require: Скрипт-библиотека не загружен: " + fullPath);
            // Пробрасываем исключение наверх.
            throw e;
        }
        if (!lib || lib == undefined) {
            Message("Ошибка загрузки аддина " + addins.lastAddinError);
            throw addins.lastAddinError;
        }
    }

    /* Если вторым параметром передан вызывающий скрипт (SelfScript),
     * то добавим в его пространство имен содержимое пространства имен
     * библиотеки.
     *
     * Важно! Импортируем только публичные объекты и функции, используя
     * популярное у js-разработчиков соглашение: имена приватных методов
     * и функций начинаются с префикса "_" (подчеркивание, underscore).
     */
    var re_do_not_include = /^(macros|_|gc\d)/i;
    if (scriptCaller) {
        for (var name in lib.object) {
            if (name != 'Designer' && name != 'SelfScript' && !re_do_not_include.test(name)) {
                if (scriptCaller.self[name]) {
                    if (strict) {
                        var error = 'Ошибка импорта "' + filename + '":' + "\n\t" + 'Имя "'
                            + name + '" уже присутствует в глобальном пространстве имен скрипта '
                            + scriptCaller.uniqueName + ' и не будет импортировано.';
                        Message(error);
                    }
                    //FIXME: Бросать исключение?
                    continue;
                }
                var type = typeof lib.object[name];
                if (type == 'object' || type == 'function')
                    scriptCaller.addNamedItem(name, lib.object[name]);
            }
        }
    }
    // require() должен вести себя как и директива $addin
    return lib.object;
}

export function ts_require(filename: string, scriptCaller, strict?: boolean) {
    (<any>SelfScript.self).require(filename, scriptCaller, strict);
}


/**
 * Возвращает UUID объекта метаданных из объекта - ссылки на объект метаданных
 */
export function getUuidFomMDRef(mdRefValue): string {
    return "{" + toV8Value(mdRefValue).toStringInternal().split("\n")[1].split(",")[1];
}

/**
 * Возвращает путь к корневому каталогу Снегопата.
 */
export function getSnegopatMainFolder(): string {
    return env.pathes.main;
}

/**
 * Выполняет заданную функцию с задержкой в delay миллисекунд.
 * Аргументы:
 * 	func - функция, которую необходимо выполнить,
 * 	delay - задержка перед выполнением функции в миллисекундах.
 * Аналог одноименной функции, доступной в объектной модели браузеров.
*/
export function setTimeout(func, delay) {

    function DelayedFunc(func) {
        this.timerId = 0;
        this.func = func;
        this.callDelayed = function () {
            killTimer(this.timerId);
            this.func.call(null);
        }
    }

    var df = new DelayedFunc(func);
    df.timerId = createTimer(delay, df, 'callDelayed');
}

//Defines the top level Class
export var Class = function () { }

Class["extend"] = function (def) {

    var classDef = <any>function () {
        if (arguments[0] !== Class) { this.construct.apply(this, arguments); }
    };

    var _super = this.prototype;
    var proto = new this(Class);

    for (var n in def) {
        var item = def[n];
        if (typeof def[n] == "function" && /\b_super\b/.test(def[n])) {
            /* Алгоритм, реализующий возможность из переопределенного в потомке
             * метода к методу базового класса просто вызывая this._super(...).
             *
             * Как это работает. Регулярное выражение в условии выше - проверка,
             * используется ли в исходном коде определения метода вызов this._super()
             * (это своего рода оптимизация, чтобы не делать обертки для всех
             * переопределенных методов, а только для тех, которые используют
             * вызов _super().
             *
             * Если this._super() используется, то "оборачиваем" исходный метод в
             * специальную анонимную функцию, суть работы которой в следующем:
             *
             *  1. временно скопировать в свойство this._super объекта  функцию,
             *  прототипа предварительно запомнив предыдущее значение свойства;
             *
             *  2. вызывать оригинальную функцию (ту, которую мы обернули); благодаря
             *  тому, что в п. 1, т.е. к моменту вызова мы сохранили в this._super
             *  одноименную функцию прототипа, то внутри вызова оригинальной функции
             *  обращение к this._super() будет означать вызов метода прототипа (и
             *  именно того, который и переопределяет оригинальный метод).
             *
             *  3. возвращаем исходное значение свойства this._super
             *
             * "Обертка" создается при помощи другой анонимной функции с параметрами
             * name и fn, вызываемой сразу в месте создания - просто, чтобы создать,
             * замыкание в котором будут захвачены значения локальных переменных
             * _super (в ней - прототип), name - имя оборачиваемого метода и fn -
             * собственно оборачиваемый метод.
             */

            proto[n] = (function (name, fn) {
                return function () {

                    // 1.
                    var tmp = this._super;

                    // Add a new ._super() method that is the same method
                    // but on the super-class
                    this._super = _super[name];

                    // 2.
                    // The method only need to be bound temporarily, so we
                    // remove it when we're done executing
                    var ret = fn.apply(this, arguments);

                    // 3.
                    this._super = tmp;

                    return ret;
                };
            })(n, def[n]);
        }
        else {
            proto[n] = item;
        }
    }

    classDef.prototype = proto;
    // Enforce the constructor to be what we expect
    classDef.prototype.constructor = Class;
    //Give this new class the same static extend method
    classDef.extend = this.extend;

    return classDef;
};

// Вызов базового метода:
// this._super(<Параметры базового метода>)

/**
 * Функция создает 1Совский объект СочетаниеКлавиш напрямую на основе виртуального кода клавиши и
 * модификаторов Ctrl Alt Shift. В отличии от штатного конструктора позволяет обойтись без перечисления
 * "Клавиша" и назначить любую кнопку, а не только перечисленные в нём.
 * Модификаторы: Shift - 4, Ctrl - 8, Alt - 16
 * Любезно взято с http://infostart.ru/public/22214/
 */
export function v8hotkey(vkCode: number, modif: number) {
    return ЗначениеИзСтрокиВнутр('{"#",69cf4251-8759-11d5-bf7e-0050bae2bc79,1,\n{0,' + vkCode + ',' + modif + '}\n}');
}

/**
 * Функция из переданной обычной строки создает объект 1С, типа LocalWString, который используется
 * во многих свойствах объектов 1С. Объект не доступен в языке 1С.
 */
export function LocalWString(str) {
    return ЗначениеИзСтрокиВнутр('{"#",87024738-fc2a-4436-ada1-df79d395c424,\n{1,"#","' + str.replace(/"/g, '""') + '"}\n}"');
}


/**
 * forAllMdObjects(root, callback)
 * Функция для обхода всех вложенных объектов метаданных, начиная с заданного
 * параметром root. Для каждого объекта будет вызван метод, переданный в
 * параметре callback. Сам объект будет передан параметром в callback.
 *
 * Пример использования, найти все объекты с непустым модулем менеджера:
 * stdlib.forAllMdObjects(metadata.current.rootObject, function(mdObj){
 *         try{
 *             if(mdObj.getModuleText("МодульМенеджера").length)
 *                 Message(mdObj.mdclass.name(1) + "." + mdObj.name)
 *         }catch(e){}
 *     })
 */
export function forAllMdObjects(root: IV8MDObject, callback) {
    callback(root);
    var mdc = root.mdclass;
    for (var i = 0; i < mdc.childsClassesCount; i++) {
        var childMdClass = mdc.childClassAt(i);
        for (var chldidx = 0, c = root.childObjectsCount(i); chldidx < c; chldidx++)
            forAllMdObjects(root.childObject(i, chldidx), callback);
    }
}

/**
 * Преобразует объект, возвращаемый snegopat.dll как обёртка для AngelScript'овского array в массив JScript
 */
export function toArray(snArray) {
    var k = [];
    if (snArray && snArray.length) {
        for (var i = 0, im = snArray.length; i < im; i++)
            k.push(snArray.item(i));
    }
    return k;
}

/**
 * Класс TextChangesWatcher
 * Автор:  Александр Орефков
 *
 * Класс для отслеживания изменения текста в поле ввода, для замены
 * события АвтоПодборТекста. Штатное событие плохо тем, что не возникает
 * - при установке пустого текста
 * - при изменении текста путем вставки/вырезания из/в буфера обмена
 * - при отмене редактирования (Ctrl+Z)
 * не позволяет регулировать задержку
 *
 * Параметры конструктора
 *  field - элемент управления поле ввода, чье изменение хотим отслеживать
 *  ticks - величина задержки после ввода текста в десятых секунды (т.е. 3 - 300 мсек)
 *  invoker - функция обратного вызова, вызывается после окончания изменения текста,
 *   новый текст передается параметром функции
 */
export class TextChangesWatcher {
    lastText: string;
    noChangesTicks: number;
    timerID: number;

    constructor(public field, public ticks, public invoker, public toLowerCase: boolean = true) { }

    // Начать отслеживание изменения текста
    start() {
        this.lastText = this.field.Значение.replace(/^\s*|\s*$/g, '');
        if (this.toLowerCase)
            this.lastText = this.lastText.toLowerCase();
        this.noChangesTicks = this.ticks + 1;
        this.timerID = createTimer(100, this, "onTimer");
    }

    // Остановить отслеживание изменения текста
    stop() {
        killTimer(this.timerID);
    }

    // Обработчик события таймера
    onTimer() {
        // Получим текущий текст из поля ввода
        var newText = windows.getInputFieldText(this.field).replace(/^\s*|\s*$/g, '');
        if (this.toLowerCase)
            newText = newText.toLowerCase();
        // Проверим, изменился ли текст по сравению с прошлым разом
        if (newText != this.lastText) {
            // изменился, запомним его
            this.lastText = newText;
            this.noChangesTicks = 0;
        } else {
            // Текст не изменился. Если мы еще не сигнализировали об этом, то увеличим счетчик тиков
            if (this.noChangesTicks <= this.ticks) {
                if (++this.noChangesTicks > this.ticks)     // Достигли заданного количества тиков.
                    this.invoker(newText)                   // Отрапортуем
            }
        }
    }
};

/**
 * Функция добавляет в SelfScript.self переданную функцию, оформляя её как макрос с указанным именем.
 * Также привязывает к макросу его описание и иконку. Также добавляет при необходимости функцию,
 * которую вызывает окно списка макросов для получения информации о макросе.
 */
export function createMacros(script, name: string, descr: string, picture, macros: Function, predefHotKey?: string): void {
    script["macros" + name] = macros;
    script["macros" + name].descr = { descr: descr, picture: picture, predef: predefHotKey };
    if (!script.getMacrosInfo) {
        script.getMacrosInfo = function (n, i) {
            try {
                var d = script["macros" + n].descr;
                i.descr = d.descr;
                i.picture = d.picture;
            } catch (e) { }
        }
    }
}

export function getAllPredefHotKeys(script, predef) {
    for (var k in script) {
        try {
            if (k.match(/^macros/) && script[k].descr.predef) {
                predef.add(k.substr(6), script[k].descr.predef);
            }
        } catch (e) { }
    }
}

export function isFileExist(path: string): boolean {
    var file: File = v8New("File", path);
    return file.Exist() && !file.IsDirectory();
}

export function isFolderExist(path: string): boolean {
    var file: File = v8New("File", path);
    return file.Exist() && file.IsDirectory();
}
