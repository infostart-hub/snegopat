//engine: JScript
//debug: no
//uname: stdcommands
//dname: Стандартные команды
//author: orefkov
//help: inplace
//descr: Аддин для работы со стандартными командами 1С

/*@
Описание различных стандартных команд Конфигуратора.
Список не полон, и пополняется по мере исследований.
Динамически формирует макросы для вызова команд, что позволяет потом назначать на них хоткеи.
Также создает удобные обертки для вызова команд из других скриптов.

Например вместо

    if (getCommandState("{F10CBB81-F679-11D4-9DD3-0050BAE2BC79}", 3).enabled)
        sendCommand("{F10CBB81-F679-11D4-9DD3-0050BAE2BC79}", 3)

можно писать

    if (stdcommands.Config.Save.getState().enabled)
        stdcommands.Config.Save.send()

Предварительно надо подключить этот скрипт к своему скрипту:

    SelfScript.AddNamedItem("stdcommands", addins.byUniqueName("stdcommands").object)

либо добавив в начало скрипта строку

	//addin: stdcommands

В TypeScript подключение осуществляется так:

    import * as stdcommands from "./commands"

Путь в импорте должен начинаться с . и быть относительным каталога вашего файла
@*/

/// <reference path="../snegopat.d.ts"/>
/// <reference path="../v8.d.ts"/>

// Описание команды
class Command {
    constructor(public num: number, public description: string) { }
    subStates: ICmdUpdateResult[];
    groupID: string;
    info: CommandDescription;

    getState(view?): ICmdUpdateResult {
        if (!view)
            view = Designer;
        delete this.subStates;
        var state = view.getCmdState(this.groupID, this.num);
        if (state && state.subCommands) {
            this.subStates = [];
            for (var i = 0; i < state.subCommands; i++)
                this.subStates.push(view.getCmdState(this.groupID, this.num, i));
        }
        return state;
    }
    send(subCommand?) {
        return sendCommand(this.groupID, this.num, subCommand);
    }
    sendToView(view, subCommand?) {
        return view.sendCommand(this.groupID, this.num, subCommand);
    }
    addHandler(obj, member) {
        events.addCommandHandler(this.groupID, this.num, obj, member)
    }
    delHandler(obj, member) {
        events.delCommandHandler(this.groupID, this.num, obj, member)
    }
}

// Описание групп команд
export var Frame = {
    groupID: "{00000000-0000-0000-0000-000000000000}",
    description: "Основные команды меню",
    FileNew: new Command(1, "Новый документ"),
    FileOpen: new Command(2, "Открыть документ"),
    FileClose: new Command(3, "Закрыть документ"),
    FileSave: new Command(4, "Сохранить документ"),
    FileSaveAs: new Command(5, "Сохранить как"),
    FileSaveCopy: new Command(6, "Сохранить копию"),
    RecentFile: new Command(8, "MRU файл"),
    CompareFiles: new Command(9, "Сравнение файлов"),
    Print: new Command(20, "Печать"),
    PrintDirect: new Command(21, "Печать на текущий принтер"),
    PrintPreview: new Command(22, "Предварительный просмотр"),
    PageSetup: new Command(23, "Параметры страницы"),
    PrintSetup: new Command(24, "Параметры печати"),
    Cut: new Command(40, "Вырезать"),
    Copy: new Command(41, "Копировать в буфер"),
    Paste: new Command(42, "Вставить из буфера"),
    PasteSpecial: new Command(43, "Специальная вставка"),
    SelectAll: new Command(44, "Выбрать все"),
    ClearSelection: new Command(45, "Очистить выделенную область"),
    Undo: new Command(46, "Отменить"),
    Redo: new Command(47, "Вернуть"),
    Search: new Command(60, "Найти"),
    SearchGlobal: new Command(68, "Глобальный поиск"),
    GroupExpandWithIncluded: new Command(101, "Развернуть группу c вложенными"),
    GroupCollapseWithIncluded: new Command(102, "Свернуть группу c вложенными"),
    GroupCollapse: new Command(103, "Свернуть группу"),
    GroupExpand: new Command(104, "Развернуть группу"),
    GroupCollapseAll: new Command(105, "Свернуть все группы"),
    GroupExpandAll: new Command(106, "Развернуть все группы"),
    Property: new Command(260, "Свойства"),
    GotoBack: new Command(324, "Вернуться назад"),
    GotoForward: new Command(325, "Перейти вперед"),
    ShowHelpAfterDot: new Command(600, "Открыть подсказку после точки"),
    ShowParams: new Command(601, "Показать параметры"),
    DebugInThinClient: new Command(810, "Запустить отладку в тонком клиенте"),
    DebugInWebClient: new Command(811, "Запустить отладку в веб-клиенте"),
    DebugInThickMng: new Command(812, "Запустить отладку в толстом клиенте (упр)"),
    DebugInThickNoMng: new Command(813, "Запустить отладку в толстом клиенте (обыч)"),
    ShowTableGrid: new Command(371, "Отображать сетку"),
    InsertObject: new Command(173, "Вставить объект..."),
    SplitCell: new Command(227, "Разбить ячейку"),
    WndList: new Command(280, "Список окон"),
};

export var Config = {
    groupID: "{F10CBB81-F679-11D4-9DD3-0050BAE2BC79}",
    description: "Конфигурация",
    Open: new Command(2, "Открыть конфигурацию"),
    Save: new Command(3, "Сохранить конфигурацию"),
    Close: new Command(4, "Закрыть конфигурацию"),
    Window: new Command(5, "Активировать окно конфигурации"),
    LoadFromFile: new Command(6, "Загрузить конфигурацию из файла"),
    SaveToFile: new Command(7, "Сохранить конфигурацию в файл"),
    FindResultWnd: new Command(8, "Активировать окно с результатми поиска"),
    SyntaxCheck: new Command(9, "Синтаксическая проверка модулей"),
    SyntaxHelper: new Command(10, "Синтакс-помощник"),
    RunEnterprise: new Command(11, "Запустить 1С-Предприятие"),
    SaveIBDataToFile: new Command(12, "Сохранить данные из ИБ в файл"),
    LoadIBDataFromFile: new Command(14, "Загрузить конфигурацию и данные из файла"),
    LoadChangedFromFile: new Command(27, "Загрузить изменённую конфигурацию из файла"),
    Update: new Command(28, "Обновить конфигурацию"),
    UpdateDBCfg: new Command(29, "Обновить конфигурацию БД"),
    CompareDBCfg: new Command(30, "Обновить/сравнить конфигурацию с конфигурацией БД"),
    SaveDBCfgToFile: new Command(31, "Сохранить конфигурацию БД в файл"),
    RevertToDBCfg: new Command(32, "Вернуться  к конфигурации БД"),
    TestAndRepair: new Command(33, "Тестирование и исправление"),
    OpenDBCfg: new Command(34, "Открыть конфигурацию БД")
};

export var CDebug = {
    groupID: "{DE680E96-5826-4E22-834D-692E307A1D9C}",
    description: "Отладчик",
    Attach: new Command(1, "Подключение"),
    Start: new Command(2, "Начать отладку"),
    Restart: new Command(3, "Перезапустить"),
    Break: new Command(4, "Прекратить"),
    Stop: new Command(5, "Остановить"),
    StepIn: new Command(6, "Шагнуть в"),
    StepTrought: new Command(7, "Шагнуть через"),
    StepOut: new Command(8, "Шагнуть из"),
    StepToCursor: new Command(9, "Идти до курсора"),
    CurrentLine: new Command(10, "Текущая строка"),
    Brkpt: new Command(11, "Точка останова"),
    BrkptCond: new Command(12, "Точка останова с условием"),
    BrkptOff: new Command(13, "Отключить точку останова"),
    BrkptDel: new Command(14, "Убрать все точки останова"),
    BrkptOffAll: new Command(15, "Отключить все точки останова"),
    BrkptList: new Command(16, "Список точек останова"),
    EvalExpr: new Command(17, "Вычислить выражение"),
    Tablo: new Command(18, "Табло"),
    CallStack: new Command(19, "Стек вызовов"),
    Performance: new Command(20, "Замер производительности"),
    BreakOnError: new Command(21, "Остановка при ошибке"),
    GoToSource: new Command(22, "Переход к строке, в которой установлена точка останова"),
    Dettach: new Command(23, "Отключиться"),
    LocalVars: new Command(28, "Локальные переменные")
};

export var Frntend = {
    groupID: "{6B7291BF-BCD2-41AF-BAC7-414D47CC6E6A}",
    description: "Команды frnteеnd'а",
    MDReport: new Command(1, "Отчет по конфигурации"),
    SelectSubSystem: new Command(2, "Отбор по подсистемам"),
    MDSearchRefs: new Command(10, "Поиск ссылок на объекты"),
    OpenModule: new Command(11, "Открыть модуль объекта"),
    OpenManagerModule: new Command(124, "Открыть модуль менеджера"),
    OpenMainForm: new Command(5, "Открыть основную форму объекта"),
    OpenMainListForm: new Command(7, "Открыть основную форму списка"),
    OpenMainSelectForm: new Command(8, "Открыть основную форму выбора"),
    OpenMessageWindow: new Command(12, "Открыть окно сообщений"),
    ClearMessageWindow: new Command(13, "Очистить окно сообщений"),
    MethodsList: new Command(21, "Процедуры и функции модуля"),
    AddComments: new Command(22, "Добавить комментарий"),
    DeleteComments: new Command(23, "Удалить комментарий"),
    CloseMessageWindow: new Command(58, "Закрыть окно сообщений"),
    SyntaxCheck: new Command(56, "Синтакс-проверка текущего модуля"),
    OpenPicturesLib: new Command(14, "Открыть библиотеку картинок конфигурации"),
    ConfigEditLang: new Command(15, "Язык редактирования конфигурации"),
    FindRefsFrom: new Command(82, "Поиск ссылок в объекте"),
    GoToDefinition: new Command(83, "Перейти к определению"),
    QueryWizard: new Command(63, "Конструктор запроса"),
    QueryWizardParam: new Command(217, "Конструктор запроса с обработкой результата"),
    TextBlockEscapeNewline: new Command(106, "Добавить перенос строки"),
    TextBlockUnescapeNewline: new Command(107, "Удалить перенос строки")
};

export var TextEdit = {
    groupID: "{FFE26CB2-322B-11D5-B096-008048DA0765}",
    description: "Команды текстового редактора",
    ToggleBookmark: new Command(1, "Установить/снять закладку"),
    NextBookmark: new Command(2, "Перейти к следующей закладке"),
    PrevBookmark: new Command(3, "Перейти к предшествующей закладке"),
    ClearBookmarks: new Command(4, "Удалить все закладки"),
    ExtendersList: new Command(5, "Список расширений"),
    FormatSel: new Command(6, "Форматировать блок"),
    TabifySel: new Command(7, "Сдвинуть блок вправо"),
    UntabifySel: new Command(8, "Сдвинуть блок влево"),
    EndOfPage: new Command(11, "Вставить конец страницы"),
    Parameters: new Command(12, "Параметры текстового редактора"),
    GoToLine: new Command(15, "Перейти к строке"),
    SyntaxBlockEnd: new Command(16, "Найти конец синтаксического блока"),
    SynaxBlockBegin: new Command(17, "Найти начало синтаксического блока"),
    SyntaxBlockEndSel: new Command(18, "Выделить все до конца синтаксического блока"),
    SyntaxBlockBeginSel: new Command(19, "Выделить все до начала синтаксического блока"),
    SetHideMark: new Command(20, "Отметить группу строк для скрытия"),
    ClearHideMark: new Command(21, "Снять отметку скрытия с группы строк"),
    NextDiff: new Command(22, "Следующее отличие"),
    PrevDiff: new Command(23, "Предшествующее отличие"),
    SwapDiff: new Command(24, "Переставить местами сравниваемые файла"),
    TemplatesPopupList: new Command(25, "Шаблоны в контекстном меню"),
    ConfigTemplateFiles: new Command(56, "Настроить список используемых файлов шаблонов"),
    CreateNewTemplateFile: new Command(57, "Создать новый файл шаблонов"),
    Templates: new Command(58, "Шаблоны"),
    ProcessTemplate: new Command(61, "Обработка текущего слова шаблонами"),
    ShowSubstString: new Command(62, "Показывать строку автозамены в дереве шаблонов"),
    DeleteLine: new Command(63, "Удалить текущую строку"),
    FormatStringWizard: new Command(66, "Запустить конструктор форматной строки")
};

export var MngFormEdt = {
    groupID: "{28CC865A-72ED-46BD-A236-C871EDDC3DFD}",
    description: "Редактор управляемых форм",
    SwitchToForm: new Command(11, "Переключиться на закладку 'Форма'"),
    SwitchToModule: new Command(12, "Переключиться на закладку 'Модуль'"),
    SwitchToFormElements: new Command(13, "Переключиться на закладку 'Форма' и активизировать закладку 'Элементы'"),
    SwitchToFormProps: new Command(14, "Переключиться на закладку 'Форма' и активизировать закладку 'Реквизиты'"),
    SwitchToFormCommands: new Command(15, "Переключиться на закладку 'Форма' и активизировать закладку 'Команды'"),
    SwitchToFormComInterface: new Command(16, "Переключиться на закладку 'Форма' и активизировать закладку 'Командный интерфейс'"),
    SwitchToFormParameter: new Command(17, "Переключиться на закладку 'Форма' и активизировать закладку 'Параметры'")
};

export var ModulePass = {
    groupID: "{EF6D156B-12FB-4CE7-A0E9-7F0C2EDC7D06}",
    description: "Установка пароля на модуль",
    SetPassword: new Command(0, "Установить пароль на модуль")
};

export var TableEdit = {
    groupID: "{505A90DD-950E-4300-874D-8675BC2120B2}",
    description: "Команды табличного редактора",
    FixupGrid: new Command(1, "Зафиксировать сетку"),
    ShowTitles: new Command(12, "Отображать заголовки"),
    ShowGroups: new Command(13, "Отображать группы"),
    Editing: new Command(14, "Редактирование"),
    ShowDescr: new Command(30, "Отображать примечания"),
    BWView: new Command(74, "Черно-белый просмотр"),
    PageViewMode: new Command(704, "Режим просмотра страниц"),
    Zoom50: new Command(540, "Масштаб 50%"),
    Zoom75: new Command(541, "Масштаб 75%"),
    Zoom100: new Command(542, "Масштаб 100%"),
    Zoom125: new Command(543, "Масштаб 125%"),
    Zoom150: new Command(544, "Масштаб 150%"),
    Zoom200: new Command(545, "Масштаб 200%"),
    RowHeight: new Command(24, "Высота строк"),
    ColumnWidth: new Command(25, "Ширина колонок"),
    Merge: new Command(7, "Объединить в группу"),
    Split: new Command(8, "Исключить из группы"),
    Names: new Command(46, "Имена..."),
    ShowNamedRowCols: new Command(76, "Отображение именованных строк/колонок"),
    ShowNamedCells: new Command(67, "Отображать именованные ячейки"),
    AttachName: new Command(77, "Назначить имя..."),
    DetachName: new Command(78, "Убрать имя"),
    Headers: new Command(45, "Колонтитулы..."),
    SetPrintArea: new Command(41, "Задать область печати"),
    DelPrintArea: new Command(42, "Удалить область печати"),
    RepeatOnEachPage: new Command(43, "Повторять на каждом листе"),
    DelRepeat: new Command(44, "Удалить повторение"),
    InsertPageBreak: new Command(16, "Вставить разрыв страницы"),
    DelPageBreak: new Command(17, "Удалить разрыв страницы"),
    Rectangle: new Command(4, "Прямоугольник"),
    Straight: new Command(5, "Прямая"),
    Oval: new Command(39, "Овал"),
    Text: new Command(6, "Текст"),
    Picture: new Command(9, "Картинка..."),
    Diagram: new Command(68, "Диаграмма"),
    GanttDiagram: new Command(69, "Диаграмма Ганта"),
    PivotDiagram: new Command(70, "Сводная диаграмма"),
    Dendrogram: new Command(71, "Дендограмма"),
    GraphicScheme: new Command(124, "Графическая схема"),
    Group: new Command(37, "Сгруппировать"),
    Ungroup: new Command(38, "Разгруппировать"),
    SelectDrawingObjs: new Command(10, "Выделение рисованных объектов"),
    InsertDescr: new Command(29, "Вставить примечание"),
    DelDescr: new Command(52, "Удалить примечание"),
    PrevDescr: new Command(111, "Предыдущее примечание"),
    NextDescr: new Command(110, "Следующее примечание"),
    DelPivotTable: new Command(101, "Удалить сводную таблицу"),
    Union: new Command(2, "Объединить"),
    Push: new Command(3, "Раздвинуть"),
    GotoCell: new Command(90, "Перейти к ячейке"),
    EditingPanel: new Command(65, "Панель редактирования"),
    FixEditingPanel: new Command(64, "Зафиксировать панель редактирования")
};

export var CfgStore = {
    groupID: "{5679B714-7E65-4ED4-92BF-6DDD604C6EA3}",
    description: "Хранилище конфигурации",
    GetFromCfgStore: new Command(150, "Получить из хранилища"),
    CaptureIntoCfgStore: new Command(151, "Захватить в хранилище"),
    StoreIntoCfgStore: new Command(152, "Поместить в хранилище"),
    CancelCaptureIntoCfgStore: new Command(153, "Отменить захват в хранилище"),
    OpenCfgStore: new Command(200, "Открыть Хранилище"),
    OpenCfgStoreHistory: new Command(206, "Открыть Историю хранилища"),
    OpenCfgStoreHistoryForObject: new Command(207, "Открыть Историю хранилища для объекта"),
    MergeCfgStoreWithObject: new Command(211, "Сравнить хранилище с конфигурацией из файла"),
    UpdateStatuses: new Command(201, "Обновить статусы объектов в хранилище"),
    UpdateConfigFromCfgStore: new Command(154, "Обновить конфигурацию из хранилища"),
    MergeConfigWithCfgStore: new Command(251, "Сравнить/объединить конфигурацию с хранилищем"),
    MergeCfgStoreWithFile: new Command(252, "Сравнить хранилище с конфигурацией из файла"),
    SaveCfgStoreToFile: new Command(250, "Сохранить конфигурацию хранилища в файл"),
    OpenCfgStoreAdmin: new Command(202, "Администрирование хранилища"),
    DisconnectFromCfgStore: new Command(102, "Отключиться от хранилища"),
    ConnectToCfgStore: new Command(101, "Подключиться к хранилищу"),
    CloseCfgStore: new Command(104, "Закрыть хранилище"),
    CreateCfgStore: new Command(100, "Создать хранилище")
};

export class TestForm {
    public static one: TestForm;
    static open() {
        if (!TestForm.one)
            new TestForm;
        TestForm.one.form.Open();
    }
    form: Form & { CommandTree: ValueTree, OnlyState: boolean, TraceCommands: boolean };
    constructor() {
        type CommandRow = ValueTreeRow & { Command: string, object: any };
        TestForm.one = this;
        this.form = loadScriptForm(env.pathes.core + "forms\\commands.ssf", this);
        this.form.CommandTree.Колонки.Добавить("object")
        for (var i in SelfScript.self) {
            var prop = <Object>SelfScript.self[i];
            if (prop instanceof Object && prop.hasOwnProperty("groupID")) {
                var row = <CommandRow><any>this.form.CommandTree.Rows.Add();
                row.Command = prop['description'];
                for (var k in prop) {
                    var cmd: Command = prop[k];
                    if (cmd instanceof Command) {
                        var crow = <CommandRow><any>row.Rows.Add();
                        crow.Command = cmd.description;
                        crow.object = cmd;
                    }
                }
            }
        }
    }
    CommandTreeSelection(Control, RowSelected, Column, StandardProcessing) {
        var cmd: Command = RowSelected.val.object;
        if (!cmd)
            return;
        this.form.Close();
        var state = cmd.getState();
        logCmdState(cmd, state, <TextDocument>this.form.Controls.Get("Output"));

        if (cmd.subStates) {
            for (var k = 0; k < cmd.subStates.length; k++)
                logCmdState(cmd, cmd.subStates[k], <TextDocument>this.form.Controls.Get("Output"), k);
        }
        if (!this.form.OnlyState)
            RowSelected.val.object.send();
        this.form.Open();

        function logCmdState(cmd: Command, state: ICmdUpdateResult, textDoc: TextDocument, subState?) {
            textDoc.ДобавитьСтроку("----------------------");
            textDoc.ДобавитьСтроку(cmd.description + " " + cmd.groupID + " " + cmd.num + (subState != undefined ? "/" + subState : ""))
            if (state) {
                textDoc.ДобавитьСтроку("Доступна: " + state.enabled)
                textDoc.ДобавитьСтроку("Пометка:  " + state.checked)
                textDoc.ДобавитьСтроку("Текст:    " + state.text)
                textDoc.ДобавитьСтроку("Описание: " + state.description)
                textDoc.ДобавитьСтроку("Тултип:   " + state.tooltip)
                textDoc.ДобавитьСтроку("Подкоманд:" + state.subCommands)
            }
            else
                textDoc.ДобавитьСтроку("Нет обработчика")
        }
    }
    TraceCommandsПриИзменении(Элемент) {
        develop.cmdTrace = this.form.TraceCommands;
    }
    ОбновлениеОтображения() {
        this.form.TraceCommands = develop.cmdTrace;
    }
}

// Создадим макросы для всех команд, для возможности привязки к хоткеям
(function () {
    var self = SelfScript.self;
    for (var i in self) {
        var prop: Object = self[i];
        if (prop instanceof Object && prop.hasOwnProperty("groupID")) {
            var name: string = prop['description'] + "\\", groupID: string = prop['groupID'];
            for (var k in prop) {
                var cmd: Command = prop[k];
                if (cmd instanceof Command) {
                    cmd.groupID = groupID;
                    cmd.info = cmdService.getCommandDescription(groupID, cmd.num)
                    var objName = i + "." + k;
                    var macrosName = "macros" + name + (cmd.description ? cmd.description : k);
                    self[macrosName] = new Function("return " + objName + ".send()");
                    self[macrosName].descr = cmd.info;
                }
            }
        }
    }
})();

function getMacrosInfo(name: string, info) {
    try {
        var descr = SelfScript.self["macros" + name].descr;
        if (descr) {
            info.picture = descr.picture;
            info.hotkey = descr.accel;
            info.descr = descr.description;
        }
    } catch (e) { }
}

