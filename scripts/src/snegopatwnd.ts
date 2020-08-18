//engine: JScript
//uname: snegopatwnd
//dname: Показ окна Снегопата
//addin: global
//debug: no
//author: orefkov
//descr: Скрипт для работы с окном снегопата
//help: inplace

/// <reference path="../snegopat.d.ts"/>
/// <reference path="../v8.d.ts"/>

/*@
Скрипт обеспечивает работу основного окна снегопата.
@*/

global.connectGlobals(SelfScript);
import * as stdlib from "./std";
import * as helpsys from "./help";
import * as repo from "./repo";
import * as snmain from "./snegopat";
import * as hks from "./hotkeys";
import * as macroswnd from "./macroswnd";

var wndStateProfilePath = "Snegopat/WndOpened";
var clrLoadedAddin = v8New("Color", 0, 150, 0);
// Данное значение устанавливается основным загрузчиком аддинов и указывает раздел,
// где сохраняется список загружаемых аддинов
var addinsProfileKey: string;

/**
 * подсистема разделения на страницы
 */
interface Page {
	connect(form);
	enter();
	exit();
};

var FormDriver = (function () {
	var currentPage;
	var instances = {};
	var form: Form;
	return {
		switchPage: function (pageNum: number) {
			if (currentPage) {
				var i: Page = instances[currentPage];
				i.exit();
			}
			currentPage = form.Panel.Pages.Get(pageNum).Name;
			if (currentPage in instances)
				i = instances[currentPage];
			else {
				i = instances[currentPage] = new SelfScript.self[currentPage + "Page"];
				for (var p in i) {
					if (/^handler(.+)/.exec(p))
						this[RegExp.$1] = (function (obj, met) { return function () { obj[met].apply(obj, arguments); } })(i, p);
				}
				i.connect(form);
			}
			i.enter();
		},
		open: function () {
			if (!form) {
				form = loadScriptFormEpf(env.pathes.core + "forms\\sn_forms.epf", "MainWindow", this);
				form.UniqueKey = form.WindowOptionsKey = "SnegopatMainForm";
				this.switchPage(0);
				events.connect(Designer, "beforeExitApp", function () { profileRoot.setValue(wndStateProfilePath, form.IsOpen()) }, "-");
			}
			form.Open();
		},
		OnCurrentPageChange: function (Control, CurrentPage) {
			this.switchPage(CurrentPage.val);
		}
	}
})();

export function openWnd() {
	FormDriver.open();
}

type AddinsControls = FormItems & {
	LoadedAddins: TableBox, AllAddins: TableBox, AddinInfo: HTMLDocumentField,
	CmdBar: CommandBar, CmdBar2: CommandBar, Panel1: Panel, LoadList: TableBox
};
type AddinsTreeRow = { Addin: string, picture: number, object: Addin | AddinGroup } & ValueTreeRow;
type AllAddinsRow = { Addin: string, Descr: string, ai: repo.AddinInfo } & ValueTreeRow;
type AddinsTree = { Get(p: number): AddinsTreeRow } & ValueTree;
type AllAddinsTree = { Get(p: number): AllAddinsRow } & ValueTree;
type AddinsForm = { Controls: AddinsControls, AllAddins: AllAddinsTree, LoadedAddins: AddinsTree, LoadList: ValueTree } & Form;
type LoadRow = { Addin: string, isGroup: boolean } & ValueTreeRow;
type UserListRow = { LoadStr: string, Dname: string, isGroup: boolean } & ValueTreeRow;
type UserListTree = { Get(p: number): UserListRow } & ValueTree;

class AddinsPage implements Page {
	form: AddinsForm;
	menu: CommandBarButtons;
	btnMoveAddin: CommandBarButton;
	btnUnloadAddin: CommandBarButton;
	btnRestartAddin: CommandBarButton;
	loaderButtons: CommandBarButton[];
	idleNode: HandlerNode;
	lastInfoControl: string = "";
	loadedGroup: AddinGroup;
	reloadRow: AddinsTreeRow;

	connect(form) {
		this.form = form;
		this.form.LoadedAddins.Columns.Add("object");
		this.form.AllAddins.Columns.Add("ai");
		this.form.LoadList.Columns.Add("isGroup");
		var buttons: CommandBarButtons = this.form.Controls.CmdBar.Buttons;
		this.btnMoveAddin = buttons.Find("MoveAddin");
		this.menu = this.form.Controls.CmdBar2.Buttons.Find("Menu").Buttons;
		this.btnUnloadAddin = this.menu.Find("UnloadAddin");
		this.btnRestartAddin = this.menu.Find("RestartAddin");
		// Добавим команды загрузчиков
		this.loaderButtons = [];
		var loaders: string[] = stdlib.toArray(addins.getLoaderCommands());
		for (var idx = 0; idx < loaders.length; idx++) {
			var cmd = loaders[idx].split('|');
			this.loaderButtons.push(this.menu.Insert(idx, cmd[1], CommandBarButtonType.Action, cmd[0] + "...", v8New("Action", "DoLoadAddin")));
		}
		// Добавим макросы для разработчиков
		var devs: CommandBarButtons = buttons.Find("Develop").Buttons;
		idx = 0;
		for (var k in snmain) {
			if (/macrosРазработка\\(.+)/.exec(k)) {
				var btn: CommandBarButton = devs.Add("devs" + k, CommandBarButtonType.Action, RegExp.$1, v8New("Action", "DevelopCommand"));
				btn.Description = btn.ToolTip = "Вызвать макрос '" + RegExp.$1 + "'";
				if (snmain[k].descr && snmain[k].descr.picture)
					btn.Picture = snmain[k].descr.picture;
			}
		}
		// Заполним работающие аддины
		this.fillLoadedAddins();
		// Покажем аддины из репозитария
		this.fillAllAddins();
		// Заполним список загружаемых аддинов
		this.fillUserAddinsTree();
		// Будем следить за загрузкой/выгрузкой аддинов, дабы поддерживать актуальность списка
		events.connect(Designer, "onLoadAddin", this);
		events.connect(Designer, "onUnLoadAddin", this);
	}
	enter() {
		// В 1С ТабличноеПоле не имеет события получения фокуса, приходится извращатся.
		this.idleNode = events.connect(Designer, "onIdle", this);
	}
	exit() {
		events.disconnectNode(this.idleNode);
	}
	// Отслеживание загрузки аддинов
	onLoadAddin(addin: Addin) {
		if (this.loadedGroup == addin.group) {    // Это загрузился аддин по нашей команде "Загрузить"
			var row: AddinsTreeRow = this.form.Controls.LoadedAddins.CurrentRow.Rows.Add();
			row.picture = 2;
			row.Addin = addin.displayName;
			row.object = addin;
			this.form.Controls.LoadedAddins.CurrentRow = row;
		} else if (this.reloadRow) {   // Это загрузился аддин по команде "Перезагрузить"
			this.reloadRow.Addin = addin.displayName;
			this.reloadRow.object = addin;
			this.reloadRow = null;
		}
		else    // Аддин типа где-то со стороны загрузился
			this.fillLoadedAddins();
	}
	onUnLoadAddin(addin: Addin) {
		if (this.reloadRow)
			return;
		this.fillLoadedAddins();
	}
	// Заполнение списка всех аддинов из репозитариев
	fillAllAddins() {
		(function processRepo(repoFolder: repo.AddinsFolder, rows: ValueTreeRowCollection) {
			for (var i in repoFolder.childs) {
				var row = <AllAddinsRow>rows.Add();
				var fi = repoFolder.childs[i];
				row.Addin = fi.name;
				processRepo(fi, row.Rows);
			}
			for (var a in repoFolder.addins) {
				var ai = repoFolder.addins[a];
				if (ai.tags.hidden != "yes") {
					var row = <AllAddinsRow>rows.Add();
					row.Addin = ai.name();
					row.Descr = ai.tags.descr;
					row.ai = ai;
				}
			}
		})(repo.getRepo().root, this.form.AllAddins.Rows);
	}
	// Первоначальное заполнение списка загруженных аддинов
	fillLoadedAddins() {
		this.form.LoadedAddins.Rows.Clear();
		// Выполняется рекурсивно
		(function (rows: ValueTreeRowCollection, group: AddinGroup) {
			// добавляем дочерние группы
			for (var child = group.child; child; child = child.next) {
				var row = <AddinsTreeRow>rows.Add();
				row.Addin = child.name;
				row.picture = 0;
				row.object = child;
				arguments.callee(row.Rows, child)
			}
			// добавляем аддины из группы
			for (var i = 0, c = group.addinsCount; i < c; i++) {
				var row = <AddinsTreeRow>rows.Add();
				var a = group.addin(i);
				row.Addin = a.displayName;
				row.object = a;
				row.picture = 2;
			}
		})(this.form.LoadedAddins.Rows, addins.root);
	}
	// При активизации строки списка работающих аддинов.
	// Нужно выставить доступность разным командам, в-зависимости от текущей строки
	handlerLoadedAddinsOnActivateRow() {
		var cr: AddinsTreeRow = this.form.Controls.LoadedAddins.CurrentRow;
		if (!cr)
			return;
		for (var r = cr; r.Parent; r = <AddinsTreeRow>r.Parent);
		var inUsersAddins = r.object == addins.users;
		var isAddin = cr.picture == 2;
		// Разберемся с выгрузкой/перезагрузкой
		if (isAddin) {
			if (inUsersAddins && addins.isAddinUnloadable(<Addin>cr.object)) {
				this.btnUnloadAddin.Text = "Выгрузить <" + cr.Addin + ">";
				this.btnRestartAddin.Text = "Перезагрузить <" + cr.Addin + ">";
				this.btnUnloadAddin.Enabled = this.btnRestartAddin.Enabled = true;
			} else {
				this.btnUnloadAddin.Text = "Этот аддин не выгружается";
				this.btnRestartAddin.Text = "И не перезагружается";
				this.btnUnloadAddin.Enabled = this.btnRestartAddin.Enabled = false;
			}
		} else {
			this.btnUnloadAddin.Text = "Выгрузить аддин";
			this.btnRestartAddin.Text = "Перезагрузить аддин";
			this.btnUnloadAddin.Enabled = this.btnRestartAddin.Enabled = false;
		}
		// Теперь с загрузкой. Она активна, если стоим на группе в пользовательском разделе
		for (var idx in this.loaderButtons)
			this.loaderButtons[idx].Enabled = inUsersAddins && !isAddin;
		// Теперь надо показать инфу об аддине, если она есть
		var helpPath;
		if (isAddin)
			helpPath = helpsys.getHelpSystem().addinHelpPath((<Addin>cr.object).uniqueName);
		this.setInfo(helpPath);
	}
	onIdle() {
		var ctrl = this.form.CurrentControl.Name;
		if (ctrl != this.lastInfoControl) {
			if (ctrl == "LoadedAddins")
				this.handlerLoadedAddinsOnActivateRow();
			else if (ctrl == "AllAddins")
				this.handlerAllAddinsOnActivateRow();
			else if (ctrl == "LoadList")
				this.handlerLoadListOnActivateRow();
			this.lastInfoControl = ctrl;
		}
	}
	setInfo(path: string) {
		if (!path || !path.length)
			path = "core\\00 firststep.md0.html";
		path = env.pathes.help + path;
		try {
			var testPath = "/" + path.replace(/ /g, "%20").replace(/\\/g, "/").toLowerCase();
			var loc = getLocation(this.form.Controls.AddinInfo.Document);
			if (loc.protocol != "file:" || loc.pathname.toLowerCase() != testPath)
				this.form.Controls.AddinInfo.Navigate(path);
		} catch (e) {
			this.form.Controls.AddinInfo.Navigate(path);
		}
	}
	// Обработчик команды загрузки аддина
	handlerDoLoadAddin(button: { val: CommandBarButton }) {
		this.loadedGroup = this.form.Controls.LoadedAddins.CurrentRow.object;
		try {
			addins.selectAndLoad(button.val.Name, this.loadedGroup);
		} catch (e) {
			Message("Ошибка при загрузке: " + e.description)
		}
		this.loadedGroup = null;
	}
	// Обработка команды меню "Выбрать и выполнить макрос"
	handlerCmdBarRunMacros() {
		addins.byUniqueName("SnegopatMainScript").invokeMacros("ВыбратьИВыполнитьМакрос");
	}
	// Обработка динамически созданных команд подменю "Разработка"
	handlerDevelopCommand(button: { val: CommandBarButton }) {
		addins.byUniqueName("SnegopatMainScript").invokeMacros("Разработка\\" + button.val.Text);
	}
	// Обработка нажатия на ссылку в поле "www" на страницах описаний аддинов. Чтобы открывать во внешнем браузере
	handlerAddinInfoonhelp(Control, pEvtObj) {
		try {
			RunApp(this.form.Controls.AddinInfo.Document.getElementById('wwwsite').innerText);
		} catch (e) { }
	}
	// Обработчик команды "Выгрузить аддин"
	handlerCmdBarUnloadScript() {
		var cr: AddinsTreeRow = this.form.Controls.LoadedAddins.CurrentRow;
		if (cr && cr.picture == 2) {
			var addin = <Addin>cr.object;
			if (addins.isAddinUnloadable(addin)) {
				this.reloadRow = cr;
				try {
					if (addins.unloadAddin(addin))
						cr.Parent.Rows.Delete(cr);
					else
						Message("Аддин не смог выгрузится: " + addins.lastAddinError);
				} catch (e) {
					Message("При выгрузке аддина произошла ошибка " + e.description);
				}
				this.reloadRow = null;
			}
		}
	}
	// Обработчик команды "Перезагрузить аддин"
	handlerCmdBarRestartCurrentScript() {
		var cr: AddinsTreeRow = this.form.Controls.LoadedAddins.CurrentRow;
		if (cr && cr.picture == 2) {
			var addin = <Addin>cr.object;
			if (addins.isAddinUnloadable(addin)) {
				this.reloadRow = cr;
				try {
					if (addins.unloadAddin(addin)) {
						if (!addins.loadAddin(addin.fullPath, addin.group)) {
							Message("Аддин не смог загрузится: " + addins.lastAddinError);
							cr.Parent.Rows.Delete(cr);
						}
					}
					else
						Message("Аддин не смог выгрузится: " + addins.lastAddinError);
				} catch (e) {
					Message("При выгрузке аддина произошла ошибка " + e.description);
				}
				this.reloadRow = null;
			}
		}
	}
	// При активизации строки в дереве репозитариев покажем первый топик справки по аддину, при наличии
	handlerAllAddinsOnActivateRow() {
		if (this.form.Controls.AllAddins.CurrentRow) {
			var ai: repo.AddinInfo = this.form.Controls.AllAddins.CurrentRow.ai;
			this.setInfo(ai ? ai.helpPath : undefined);
		}
	}
	handlerAddinInfoSyncContent() {
		var loc = getLocation(this.form.Controls.AddinInfo.Document);
		if (loc.protocol == "file:") {
			var hf = "/" + env.pathes.help.replace(/\\/g, "/").replace(/ /g, "%20").toLowerCase();
			if (loc.pathname.toLowerCase().indexOf(hf) == 0) {
				var path = loc.pathname.substr(hf.length).replace(/\//g, "\\").replace(/%20/g, ' ').toLowerCase();
				var hs = helpsys.getHelpSystem();
				if (path in hs.allTopics) {
					var p = this.form.Panel;
					p.CurrentPage = p.Pages.Find("Help");
					if (hs.allTopics[path]["row"])
						(<any>this.form.Controls).Find("HelpTree").CurrentRow = hs.allTopics[path]["row"];
				}
			}
		}
	}
	// Обработчик при выводе строки дерева репозитариев аддинов
	handlerAllAddinsOnRowOutput(Control, RowAppearance: { val }, RowData: { val: AllAddinsRow }) {
		// если аддин из репозитария уже загружен, покажем его зелёненьким
		if (RowData.val.ai && addins.byUniqueName(RowData.val.ai.tags.uname)) {
			RowAppearance.val.TextColor = clrLoadedAddin;
		}
		RowAppearance.val.Cells.Addin.ShowPicture = true;
		RowAppearance.val.Cells.Addin.PictureIndex = RowData.val.ai ? 2 : 0;
	}
	// Заполнение списка загрузки аддинов
	fillUserAddinsTree() {
		var vt = profileRoot.getValue(addinsProfileKey);
		this.form.LoadList.Rows.Clear();
		var row = <UserListRow>this.form.LoadList.Rows.Add();
		row.LoadStr = "Пользовательские аддины";
		row.isGroup = true;
		var rp = repo.getRepo();
		(function copyvt(src, dst) {
			for (var i = 0; i < src.Count(); i++) {
				var from: LoadRow = src.Get(i);
				var to: UserListRow = <UserListRow>dst.Add();
				var ai = rp.findByLoadStr(from.Addin);
				to.LoadStr = from.Addin;
				to.Dname = ai ? ai.name() : "";
				to.isGroup = from.isGroup;
				copyvt(from.Rows, to.Rows);
			}
		})(vt.Rows, row.Rows);
	}
	handlerLoadListOnActivateRow() {
		var row: UserListRow = this.form.Controls.LoadList.CurrentRow;
		if (row) {
			var ai: repo.AddinInfo = repo.getRepo().findByLoadStr(row.LoadStr);
			this.setInfo(ai ? ai.helpPath : undefined);
		}
	}
	// Отмена правок в списке загружаемых аддинов
	handlerLoadListCmdBarReloadAddinBootList() {
		if (MessageBox("Будут отменены все изменения, внесённые с момента\nпоследнего сохранения списка.\nПродолжить?", mbYesNo) == mbaNo)
			return;
		this.fillUserAddinsTree();
	}
	// Сохранение списка загружаемых аддинов
	handlerLoadListCmdBarSaveAddinList() {
		var vt: ValueTree = profileRoot.getValue(addinsProfileKey);
		vt.Rows.Clear();
		(function copyvt(src, dst) {
			for (var i = 0; i < src.Count(); i++) {
				var from: UserListRow = <UserListRow>src.Get(i);
				var to: LoadRow = <LoadRow>dst.Add();
				to.Addin = from.LoadStr;
				to.isGroup = from.isGroup;
				copyvt(from.Rows, to.Rows);
			}
		})(this.form.LoadList.Rows.Get(0).Rows, vt.Rows);
		profileRoot.setValue(addinsProfileKey, vt);
	}
	handlerLoadListOnRowOutput(Control, RowAppearance, RowData) {
		RowAppearance.val.Cells.LoadStr.ShowPicture = true;
		RowAppearance.val.Cells.LoadStr.PictureIndex = RowData.val.isGroup ? 0 : 2;
	}
	// Перед удалением строки из списка загружаемых аддинов
	handlerLoadListBeforeDeleteRow(Control: { val: TableBox }, Cancel) {
		// корневую строку удалять нельзя
		if (!Control.val.CurrentRow.Parent)
			Cancel.val = true;
	}
	// Перед добавлением. К аддину уже нельзя добавлять
	handlerLoadListBeforeAddRow(Control, Cancel, Clone, Parent) {
		if (!Parent.val.isGroup)
			Cancel.val = true;
	}
	// Перед началом изменения. Корневую строку менять нельзя.
	handlerLoadListBeforeRowChange(Control, Cancel) {
		var cr: UserListRow = Control.val.CurrentRow;
		if (!cr.Parent)
			Cancel.val = true;
	}
	// При начале редактирования
	handlerLoadListOnStartEdit(Control: { val: TableBox }, NewRow, Clone) {
		var cr: UserListRow = Control.val.CurrentRow;
		if (NewRow.val) {
			cr.isGroup = true;
			cr.LoadStr = "Новая группа";
		}
	}
	// перед окончанием редактирования
	handlerLoadListBeforeEditEnd(Control, NewRow, CancelEdit, Cancel) {
		var cr: UserListRow = Control.val.CurrentRow;
		var ls = cr.LoadStr.toLowerCase();
		// Если это группа, надо проверить, что у этого родителя больше нет группы с таким именем
		if (cr.isGroup) {
			var rows = cr.Parent.Rows;
			var midx = rows.IndexOf(cr);
			for (var idx = 0; idx < rows.Count(); idx++) {
				var test = <UserListRow>rows.Get(idx);
				if (idx != midx && test.LoadStr.toLowerCase() == ls) {
					MessageBox("Такая группа уже есть");
					Cancel.val = true;
					return;
				}
			}
		} else {
			// Это аддин, надо проверить, что такой строки загрузки больше нет.
			var founded = 0;
			try {
				(function test(rows: ValueTreeRowCollection) {
					for (var idx = 0; idx < rows.Count(); idx++) {
						var r = <UserListRow>rows.Get(idx);
						if (r.isGroup)
							test(r.Rows);
						else if (r.LoadStr == cr.LoadStr && ++founded == 2) {
							MessageBox("Такой аддин уже есть");
							Cancel.val = true;
							throw 1;
						}
					}
				})(this.form.LoadList.Rows);
			} catch (e) { }
		}
	}
	// После редактирования
	handlerLoadListOnEditEnd(Control, NewRow, CancelEdit) {
		if (!CancelEdit.val) {
			var cr: UserListRow = Control.val.CurrentRow;
			if (!cr.isGroup) {
				var ai = repo.getRepo().findByLoadStr(cr.LoadStr);
				cr.Dname = ai ? ai.name() : "";
			}
		}
	}
	handlerCmdBarMoveAddin() {
		var selected: repo.AddinInfo = this.form.Controls.AllAddins.CurrentRow.ai;
		if (!selected) {
			MessageBox("Не выбран аддин в репозитарии аддинов");
			return;
		}
		if (selected.isStd) {
			MessageBox("Это стандартный аддин и он подключается автоматически");
			return;
		}
		if (this.form.Controls.Panel1.CurrentPage.Name == "LoadList") {
			if (this.form.LoadList.Rows.Find(selected.load, "LoadStr", true)) {
				MessageBox("Такой аддин уже есть в списке");
				return;
			}
			var cr: UserListRow = this.form.Controls.LoadList.CurrentRow;
			if (!cr) {
				MessageBox("Не выбрана группа для аддина");
				return;
			}
			if (!cr.isGroup)
				cr = <UserListRow>cr.Parent;
			cr = <UserListRow>cr.Rows.Add();
			cr.isGroup = false;
			cr.LoadStr = selected.load;
			cr.Dname = selected.name();
			this.form.Controls.LoadList.CurrentRow = cr;
		} else {
			if (addins.byUniqueName(selected.tags.uname)) {
				MessageBox("Этот аддин уже запущен.");
				return;
			}
			var ar: AddinsTreeRow = this.form.Controls.LoadedAddins.CurrentRow;
			if (!ar) {
				MessageBox("Не выбрана группа для загрузки аддина");
				return;
			}
			if (ar.picture == 2) {
				ar = <AddinsTreeRow>ar.Parent;
				this.form.Controls.LoadedAddins.CurrentRow = ar;
			}
			var test = <any>ar;
			while (test.Parent)
				test = test.Parent;
			if (test.object != addins.users) {
				MessageBox("Загружать аддин на выполнение можно только в группу пользовательских аддинов");
				return;
			}
			this.loadedGroup = <AddinGroup>ar.object;
			try {
				if (!addins.loadAddin(selected.load, this.loadedGroup))
					Message("Ошибка при загрузке аддина: " + addins.lastAddinError);
			} catch (e) {
				Message("Ошибка при загрузке: " + e.description);
			}
			this.loadedGroup = null;
		}
	}
}

// Базовый класс обработчика параметра настроек снегопата
class Param {
	constructor(public control: string) { }
	fromForm(form) {    // Считать значение параметра с формы
		return form[this.control];
	}
	toForm(form, val) { // Установить значение параметра на форму
		form[this.control] = val;
	}
	validate(val): boolean {    // Проверить допустимость значения
		return true;
	}
	isEqual(val1, val2): boolean {  // Сравнить на равенство два значения
		return val1 == val2;
	}
	needReboot(): boolean {    // Отрабатывает установку значения и возвращает необходимость перезагрузки
		return false;
	}
};

// Данный обработчик параметра раскидывает параметр-битовый набор флагов по отдельным флажкам на форме
class ParamFlags extends Param {
	controls: string[];
	constructor(...ctrls: string[]) {
		super('');
		this.controls = ctrls;
	}
	fromForm(form) {
		var v = 0, flag = 1;
		for (var k in this.controls) {
			v |= form[this.controls[k]] ? flag : 0;
			flag <<= 1;
		}
		return v;
	}
	toForm(form, v) {
		var flag = 1;
		for (var k in this.controls) {
			form[this.controls[k]] = 0 != (v & flag);
			flag <<= 1;
		}
	}
};

class ParamColor extends Param {
	validate(val: Color) {
		if (ValueToStringInternal(val.Type) != '{"#",7c626d2b-6cc1-4f6c-9367-352a9da94a2e,0}') {
			MessageBox("Параметр " + this.control + ". Для цвета можно задавать только абсолютные значения!");
			return false;
		}
		return true;
	}
	isEqual(val1, val2) {
		return ValueToStringInternal(val1) == ValueToStringInternal(val2);
	}
};

class SettingsPage implements Page {
	form;
	optMap = {};
	optFolder: ProfileStore;
	params = {
		// Название опции в движке снегопата : связь с полем формы
		EnableCustomGrouping: new Param("ПользовательскиеГруппировки"),
		QueryColors: new Param("РаскрашиватьСтроки"),
		EnableTextWork: new Param("EnableTextWork"),
		Autoreplace: new Param("Автозамены"),
		EnableSmartEnter: new Param("SmartEnter"),
		EnableSmartList: new Param("SmartList"),
		HookStdList: new Param("ПерехватШтатногоСписка"),
		EnableHidingRemark: new Param("HidingRemark"),
		ListWidth: new Param("ШиринаСписка"),
		QuickActivateCharsCount: new Param("СимволовДляАктивации"),
		//ParamsAutoShow: new Param("ParamsAutoShow"),
		AllowFilterInSmartList: new Param("AllowFilterInSmartList"),
		InsertTextOnDot: new Param("InsertTextOnDot"),
		UseLangs: new ParamFlags("фАнглийский", "фРусский"),
		EnableBkColorForMultyLine: new Param("EnableBkColorForMultyLine"),
		MultiLineBackground: new ParamColor("ЦветФонаМногострочныхСтрок"),
		GroupMultiLine: new Param("GroupMultiLine"),
		UseCtrlClicks: new Param("UseCtrlClicks"),
		CamelSearchOnUpperOnly: new Param("CamelSearchOnUpperOnly"),
		//ActionOnSelectScript: new Param("ВариантДействияПриВыбореСкрипта"),
		//EditScriptCommand: new Param("КомандаЗапускаРедактора"),
	};
	connect(form) {
		this.form = form;
		this.optFolder = profileRoot.getFolder("Snegopat/Settings");
		var op = snegopat.optionEntries;
		while (op) {
			this.optMap[op.name] = op;
			op = op.next;
		}
		this.readParams();
	}
	enableButtons(e) {
		var b = this.form.Controls.SettingsCmdBar.Buttons;
		b.SaveSettings.Enabled = b.RestoreSettings.Enabled = e;
	}
	readParams() {
		for (var k in this.params) {
			var p: Param = this.params[k];
			var sp: OptionsEntry = this.optMap[k];
			p.toForm(this.form, sp ? profileRoot.getValue(sp.profile) : this.optFolder.getValue(k));
		}
		this.handlerПользовательскиеГруппировкиПриИзменении();
		this.enableButtons(false);
	}
	isParamChanged() {
		for (var k in this.params) {
			var p: Param = this.params[k];
			var sp: OptionsEntry = this.optMap[k];
			if (!p.isEqual(sp ? profileRoot.getValue(sp.profile) : this.optFolder.getValue(k), p.fromForm(this.form)))
				return true;
		}
		return false;
	}
	applyParams() {
		var reboot = false;
		for (var k in this.params) {
			var p: Param = this.params[k];
			var onform = p.fromForm(this.form);
			if (!p.validate(onform))
				return;
			var sp: OptionsEntry = this.optMap[k];
			var saved = sp ? profileRoot.getValue(sp.profile) : this.optFolder.getValue(k);
			if (!p.isEqual(onform, saved)) {
				if (sp) {
					if (sp.doApply(onform))
						reboot = true;
				} else {
					this.optFolder.setValue(k, onform);
					if (p.needReboot())
						reboot = true;
				}
			}
		}
		if (reboot)
			MessageBox("Необходимо перезапустить Конфигуратор для вступления изменений в силу.", mbIconWarning, "Снегопат");
	}
	enter() {
	}
	exit() {
	}
	handlerSettingsCmdBarSaveSettings() {
		this.applyParams();
		this.enableButtons(false);
	}
	handlerSettingsCmdBarRestoreSettings() {
		this.readParams();
	}
	handlerфРусскийПриИзменении() {
		this.form.фАнглийский = true;
		this.enableButtons(this.isParamChanged());
	}
	handlerфАнглийскийПриИзменении() {
		this.form.фРусский = true;
		this.enableButtons(this.isParamChanged());
	}
	handlerПользовательскиеГруппировкиПриИзменении() {
		var form = this.form;
		if (!form.РаскрашиватьСтроки)
			form.EnableBkColorForMultyLine = false;
		form.ЭлементыФормы.EnableBkColorForMultyLine.Доступность = form.РаскрашиватьСтроки;
		form.ЭлементыФормы.ЦветФонаМногострочныхСтрок.Доступность = form.EnableBkColorForMultyLine;

		if (!form.EnableTextWork) {
			form.Автозамены = false;
			form.SmartEnter = false;
			form.SmartList = false;
		}
		var ctrls = ['Автозамены', 'SmartEnter', 'SmartList'];
		for (var k in ctrls)
			form.ЭлементыФормы[ctrls[k]].Доступность = form.EnableTextWork;
		ctrls = ['ШиринаСписка', 'СимволовДляАктивации', 'AllowFilterInSmartList', 'фРусский', 'фАнглийский', 'InsertTextOnDot'];
		for (var k in ctrls)
			form.ЭлементыФормы[ctrls[k]].Доступность = form.SmartList;
		this.enableButtons(this.isParamChanged());
	}
	handlerCheckChanges() {
		this.enableButtons(this.isParamChanged());
	}
	handlerAltEditorsНажатие() {
		(<any>addins.byUniqueName('alteditors').object()).setup();
	}
}

type HotkeysControls = FormItems & { HKTable: TableBox, CommandDescription: Label };
type HotkeysForm = Form & { HKTable: ValueTable, Controls: HotkeysControls };
type HKRow = ValueTableRow & { Command: string, HotKey: string, RealCmd: string };

class HotkeysPage implements Page {
	form: HotkeysForm;
	connect(form) {
		this.form = form;
		this.form.HKTable.Columns.Add("RealCmd");
		this.fillTable();
	}
	enter() {
	}
	exit() {
	}
	fillTable() {
		this.form.HKTable.Clear();
		// Заполняем текущими хоткеями
		for (var i = 0; i < hotkeys.count; i++) {
			var hk = hotkeys.item(i);
			var row = <HKRow><any>this.form.HKTable.Add();
			row.RealCmd = hk.addin + "::" + hk.macros;
			row.HotKey = hks.KeyCodes.stringFromCode(hk.key);
			var a = addins.byUniqueName(hk.addin);
			row.Command = a ? a.displayName + "::" + hk.macros : row.RealCmd;
		}
	}
	handlerHKTableКомандаStartChoice(Элемент, СтандартнаяОбработка): void {
		var macrosSelect = macroswnd.MacrosWnd();
		var res = macrosSelect.selectMacros();
		if (res) {
			var row = <HKRow>this.form.Controls.HKTable.CurrentRow;
			row.RealCmd = res.addin + "::" + res.macros;
			var a = addins.byUniqueName(res.addin);
			row.Command = a ? a.displayName + "::" + res.macros : row.RealCmd;
		}
	}
	handlerHkCmdBarApply(): void {
		var vt = hks.ProfileExchanger.loadHotkeys();
		var myvt = this.form.HKTable;
		vt.Clear();
		for (var idx = 0; idx < myvt.Count(); idx++) {
			var from = <HKRow>myvt.Get(idx);
			var to = <any>vt.Add();
			to.Команда = from.RealCmd;
			to.СочетаниеКлавиш = from.HotKey;
		}
		// Установим все хоткееи
		hks.applyKeysFromValueTable(vt);
		// Сохраним таблицу хоткеев в профайл
		hks.ProfileExchanger.saveHotkeys(vt);
	}
	handlerHkCmdBarCancel(): void {
		this.fillTable();
	}
	handlerHKTableСочетаниеКлавишStartChoice(Control, StandardProcessing) {
		var selector = new hks.SelectHotKey(this.form.Controls.HKTable);
		var result = selector.select(this.form.Controls.HKTable.CurrentRow.HotKey);
		if (result)
			this.form.Controls.HKTable.CurrentRow.HotKey = result;
	}
	handlerHKTableOnActivateRow(Control) {
		var info = this.getCommandDescr(this.form.Controls.HKTable.CurrentRow);
		this.form.Controls.CommandDescription.Caption = info ? info.descr.replace(/&/g, "&&") : "";
	}
	handlerHKTableOnRowOutput(Control, RowAppearance, RowData) {
		var info = this.getCommandDescr(RowData.val);
		if (info) {
			var ca = RowAppearance.val.Cells.Command;
			ca.ShowPicture = true;
			if (info.picture)
				ca.Picture = info.picture;
			else
				ca.PictureIndex = 1;
		}
	}
	getCommandDescr(row: HKRow) {
		if (row.RealCmd && typeof(row.RealCmd) == "string") {
			var info = { picture: undefined, hotkey: "", descr: "" };
			var cmd: string[] = row.RealCmd.split("::");
			var a = addins.byUniqueName(cmd[0]);
			if (a && a.object && a.object["getMacrosInfo"])
				a.object["getMacrosInfo"](cmd[1], info);
			return info;
		}
		return null;
	}
}

type UpdateControls = FormItems & {
	vtRepoList: TableBox, cmdBarUpdate: CommandBar, snLocalVersion: Label, snRemoteVersion: Label, snSubscribe: Label
};
type UpdateTreeRow = { checkinDate: string, content: string } & ValueTreeRow;
type UpdateTree = { Get(p: number): UpdateTreeRow } & ValueTree;
type UpdateForm = {
	Controls: UpdateControls, vtRepoList: UpdateTree, localRepoPath: string,
	remoteRepoURL: string, snegopatLogin: string, useProxy: boolean, proxyAddress: string, proxyUser: string,
	proxyPass: string, notStorePass: boolean, proxyNtlm: boolean, ntlmPort: number, ntlmAuth: string, VersionsForReport: string
} & Form;

class UpdatePage implements Page {
	form: UpdateForm;
	btnDownloadSnegopat: CommandBarButton;
	btnRefreshRepo: CommandBarButton;
	btnSubscribePage: CommandBarButton;
	wsh = new ActiveXObject("WScript.Shell");
	pathToFossil = '';
	pathToFecho = '';
	pathToCmd: string;
	pathToOut: string;
	localRepoExist: boolean;
	localRepoRow: UpdateTreeRow;
	remoteRepoRow: UpdateTreeRow;
	profilePath = env.pathes.data + "proxy.cmd";
	ntlmIni: string;
	lastLocalDate: Date;

	connect(form) {
		this.form = form;
		var buttons = this.form.Controls.cmdBarUpdate.Buttons;
		this.btnDownloadSnegopat = buttons.Find("btnDownloadSnegopat");
		this.btnRefreshRepo = buttons.Find("btnRefreshRepo");
		this.btnSubscribePage = buttons.Find("btnSubscribePage");
		var pf = env.pathes.tools + 'fossil.exe';
		var file = v8New("File", pf);
		if (file.Exist()) {
			this.pathToFossil = '"' + file.FullName + '" ';
			this.pathToFecho = '| "' + file.Path + 'fecho.exe" ';
		} else
			Message("Не найден путь к fossil");
		file = v8New("File", env.pathes.core + "_fossil_");
		this.form.localRepoPath = file.Path;
		this.localRepoExist = file.Exist();
		if (!this.localRepoExist) {
			MessageBox('Нет синхронизации локального и внешнего репозитария. Заполните данные для подключения и нажмите "Обновить репозитарий"');
		}
		this.pathToCmd = GetTempFileName(".cmd");
		this.pathToOut = GetTempFileName();
		this.form.Controls.snLocalVersion.Caption = env.sVersion + ' ' + env.BuildDateTime;
		this.remoteRepoRow = <UpdateTreeRow>this.form.vtRepoList.Rows.Add();
		this.localRepoRow = <UpdateTreeRow>this.form.vtRepoList.Rows.Add();
		this.remoteRepoRow.content = "Внешний репозитарий снегопата";
		this.localRepoRow.content = "Локальный репозитарий";
		if (this.localRepoExist) {
			this.runFossilLocal('settings autosync on', false, false);
			var res = this.runFossilLocal("remote", false, false).split('\n')[0];
			if (res.match(/^http:/)) {
				var login = res.match(/\/\/([^@]+)@/);
				if (login)
					this.form.snegopatLogin = login[1];
				this.form.remoteRepoURL = res.replace(/\/\/[^@]+@/, '//') + '/';
			}
		}
		else
			this.form.remoteRepoURL = "http://snegopat.ru/new/";
		if (!this.form.remoteRepoURL.length) {
			Message("Не удалось получить URL внешнего репозитария снегопата");
		}
		this.readSettings();
		file = v8New("File", env.pathes.data + "cntlm.ini");
		this.ntlmIni = file.FullName;
		if (!file.Exist()) {
			var td = v8New("TextDocument");
			td.Write(this.ntlmIni);
		}
		this.fillRepoList();
		this.updateVersionInfo();
	}
	updateVersionInfo() {
		this.form.VersionsForReport = `[${env.sVersion} | ${env.v8Version} | ${this.lastLocalDate.toLocaleDateString() + " " + this.lastLocalDate.toLocaleTimeString()}]`;
	}
	enter() {
	}
	exit() {
	}
	readSettings() {
		var td = v8New("TextDocument");
		try {
			td.Read(this.profilePath);
			td.LineSeparator = '\n';
			var lines = td.GetText().split('\n');
			for (var k in lines) {
				var m = lines[k].match(/^set\s+([^=]+)=(.*)/i)
				if (m) {
					if (m[1] in this.form) {
						var field = this.form[m[1]];
						if ('boolean' == typeof field)
							this.form[m[1]] = m[2] == 'true';
						else
							this.form[m[1]] = m[2];
					}
				}
			}

		} catch (e) { }
	}
	storeSettings() {
		var td = v8New("TextDocument");
		var fields = ['useProxy', 'notStorePass', 'proxyAddress', 'proxyUser', 'proxyNtlm', 'ntlmAuth', 'ntlmPort'];
		if (!this.form.notStorePass)
			fields.push('proxyPass');
		for (var k in fields)
			td.AddLine("set " + fields[k] + "=" + this.form[fields[k]]);
		td.Write(this.profilePath, "cp866");
	}
	fillRepoList() {
		try {
			var td = v8New('TextDocument');
			td.Read(env.pathes.core + 'snegopat.dll.version');
			this.form.Controls.snRemoteVersion.Caption = td.GetText();
		} catch (e) { }
		var lastLocalTime = this.readLocalTimeline();
		this.readRemoteTimeline(lastLocalTime);
	}
	startNtlm() {
		this.killNtlm();
		this.wsh.Run(`"${env.pathes.tools}cntlm\\cntlm.exe" -c "${this.ntlmIni}" -s -a ${this.form.ntlmAuth} -l ${this.form.ntlmPort} ` +
			(this.form.proxyPass.length ? `-p "${this.form.proxyPass}"` : '') + ` -u "${this.form.proxyUser}" ${this.form.proxyAddress}`, 0, 1);
	}
	killNtlm() {
		this.wsh.Run(`taskkill /f /IM cntlm.exe`, 0, 1);
	}
	runFossilLocal(command: string, visible: boolean, needConnect: boolean): string {
		if (this.pathToFossil.length) {
			var td = v8New("TextDocument");
			td.Write(this.pathToOut, 'UTF-8');
			td.AddLine("@echo off");
			var ntlmStarted = false;
			if (needConnect && this.form.useProxy) {
				var hp = "set http_proxy=http://";
				if (this.form.proxyNtlm) {
					this.startNtlm();
					hp += '127.0.0.1:' + this.form.ntlmPort;
					ntlmStarted = true;
				} else {
					if (this.form.proxyUser.length) {
						hp += this.form.proxyUser;
						if (this.form.proxyPass)
							hp += ':' + this.form.proxyPass;
						hp += '@';
					}
					hp += this.form.proxyAddress;
				}
				td.AddLine(hp);
			}
			td.AddLine('cd /d "' + this.form.localRepoPath + '"');
			var cmd = this.pathToFossil + command;
			if (visible)
				cmd += this.pathToFecho;
			td.AddLine(cmd + ` >> "${this.pathToOut}"`);
			td.Write(this.pathToCmd, "cp866");
			this.wsh.Run(this.pathToCmd, visible ? 1 : 0, 1);
			if (ntlmStarted)
				this.killNtlm();
			td.Read(this.pathToOut);
			DeleteFiles(this.pathToCmd);
			DeleteFiles(this.pathToOut);
			td.LineSeparator = '\n';
			return td.GetText();
		}
		return "";
	}
	runFossilRemote(command, handler) {
		if (!this.form.remoteRepoURL)
			return;
		var http: XMLHttpRequest;
		try {
			http = new ActiveXObject('MSXML2.ServerXMLHTTP.6.0');
		} catch (e) {
			Message("Не удалось создать объект MSXML2.ServerXMLHTTP.6.0 для запроса данных из внешнего репозитария");
		}
		if (http) {
			var url = this.form.remoteRepoURL;
			if (url.slice(-1) != '/')
				url += '/';
			url += command;
			if (this.form.useProxy) {
				if (this.form.proxyAddress.length == 0) // Адрес прокси должен быть задан
					return;
				var hp: string, ntlmStarted = false;
				if (this.form.proxyNtlm) {
					this.startNtlm();
					hp = '127.0.0.1:' + this.form.ntlmPort;
					ntlmStarted = true;
				} else {
					hp = this.form.proxyAddress;
				}
				(<any>http).setProxy(2, hp);
				http.open('get', url);
				if (!ntlmStarted) {
					var uname = this.form.proxyUser;
					if (uname.length) {
						var dog = uname.indexOf('@');
						if (dog >= 0)
							uname = uname.substr(dog + 1) + '\\' + uname.substr(0, dog);
						(<any>http).setProxyCredentials(uname, this.form.proxyPass);
					}
				}
			} else
				http.open('get', url);
			http.onreadystatechange = () => {
				if (http.readyState == 4) {
					if (ntlmStarted)
						this.killNtlm();
					//Message(http.getAllResponseHeaders());
					//Message(http.responseText);
					try {
						var r = JSON.parse(http.responseText);
						r.error = false;
						handler(r);
					} catch (e) {
						handler({ error: true });
					}
				}
			}
			try {
				http.send(null);
			} catch (e) {
				if (ntlmStarted)
					this.killNtlm();
				handler({ error: true });
			}
		}
	}
	readLocalTimeline(): string {
		try {
			if (this.localRepoExist) {
				var res = JSON.parse(this.runFossilLocal("json timeline checkin --tag trunk --limit 20 --files 1", false, false));
				this.fillRepoRow(this.localRepoRow, res);
				var dt = new Date(res.payload.timeline[0].timestamp * 1000)
				this.lastLocalDate = dt;
				var a2 = (p: number) => (p < 10 ? '0' : '') + p
				return '' + dt.getFullYear() + '-' + a2(dt.getMonth() + 1) + '-' + a2(dt.getDate()) + '%20' + a2(dt.getHours()) + ':' + a2(dt.getMinutes()) + ':' + a2(dt.getSeconds());
			} else {
				this.fillRepoRow(this.localRepoRow, { payload: { timeline: [{ timestamp: 0, comment: "История локального репозитария отсутствует" }] } });
			}
		} catch (e) {
			this.fillRepoRow(this.localRepoRow, { payload: { timeline: [{ timestamp: 0, comment: e.description }] } });
		}
		return '2010-01-01';
	}
	readRemoteTimeline(after: string) {
		this.remoteRepoRow.Rows.Clear();
		var c = <UpdateTreeRow>this.remoteRepoRow.Rows.Add();
		c.content = "данные не получены...";
		this.runFossilRemote("json/timeline/checkin?tag=trunk&after=" + after + "&files=1", (res) => {
			this.fillRepoRow(this.remoteRepoRow, res);
		});
	}
	fillRepoRow(row: UpdateTreeRow, res) {
		if (res && res.payload && res.payload.timeline) {
			if (res.payload.timeline.length == 0) {
				var r = <UpdateTreeRow>row.Rows.Get(0);
				r.content = "Обновлений нет";
			} else {
				row.Rows.Clear();
				for (var k in res.payload.timeline) {
					var ci = res.payload.timeline[k];
					var r = <UpdateTreeRow>row.Rows.Add();
					var dt = new Date(ci.timestamp * 1000);
					r.checkinDate = dt.toLocaleDateString() + " " + dt.toLocaleTimeString();
					r.content = ci.comment;
					if (ci.files) {
						for (var l in ci.files) {
							var f = ci.files[l];
							var sr = <UpdateTreeRow>r.Rows.Add();
							sr.content = f.state + " " + f.name;
						}
					}
				}
			}
		} else if (res && res.resultCode && res.resultText) {
			var r = <UpdateTreeRow>row.Rows.Get(0);
			r.content = "Ошибка " + res.resultCode + ": " + res.resultText;
		}
		this.form.Controls.vtRepoList.Expand(row);
	}
	handlerCmdBarUpdatebtnRefreshRepo() {
		if (!this.pathToFossil) {
			Message("fossil не найден!");
		} else {
			if (this.localRepoExist) {
				Message(this.runFossilLocal("update", true, true));
			} else {
				if (!this.form.snegopatLogin.length) {
					MessageBox("Не задан логин на snegopat.ru")
					return;
				}
				CreateDirectory(env.pathes.repo);
				var remoteUrl = this.form.remoteRepoURL.replace("://", `://${this.form.snegopatLogin}@`);
				this.runFossilLocal(`clone "${remoteUrl}" -A ${this.form.snegopatLogin} "${env.pathes.repo}sn.fossil"`, true, true);
				this.runFossilLocal(`open "${env.pathes.repo}sn.fossil"`, true, true);
				var file = v8New("File", env.pathes.core + "_fossil_");
				this.localRepoExist = file.Exist();
				if (this.localRepoExist) {
					this.handlerCmdBarUpdatebtnRefreshRepo();
					return;
				}
			}
			this.fillRepoList();
			this.updateVersionInfo();
		}
	}
	handlerCmdBarUpdatebtnDownloadSnegopat() {
		RunApp('https://snegopat.ru/spnew.php?login=' + this.form.snegopatLogin);
	}
	handlerCmdBarUpdateBugsForum() {
		RunApp('https://snegopat.ru/forum/viewforum.php?f=8');
	}
	handlerbtnFillRepoНажатие() {
		this.fillRepoList();
	}
	handlerntlmDetectНажатие() {
		if (!this.form.proxyAddress) {
			MessageBox("Не задан адрес прокси сервера");
			return;
		}
		var td = v8New("TextDocument");
		td.Write(this.pathToOut, 'UTF-8');
		td.AddLine("@echo off");
		td.AddLine("set CYGWIN=nodosfilewarning");
		td.AddLine(`echo Пользователь: ${this.form.proxyUser}`);
		td.AddLine("<nul set /p strt=Введите пароль: ");
		td.AddLine(`"${env.pathes.tools}cntlm\\cntlm.exe" -c "${this.ntlmIni}" -I -M ${this.form.remoteRepoURL} -u "${this.form.proxyUser}" ${this.form.proxyAddress}` +
			` ${this.pathToFecho} >> "${this.pathToOut}"`);
		//td.AddLine("pause");
		td.Write(this.pathToCmd, "cp866");
		//Message(td.GetText());
		this.wsh.Run(this.pathToCmd, 1, 1);
		td.Read(this.pathToOut);
		DeleteFiles(this.pathToCmd);
		DeleteFiles(this.pathToOut);
		td.LineSeparator = '\n';
		var text = td.GetText();
		var found = text.match(/Config profile\s+\d\/\d... OK \(.+\)\n-{3,}.+\n([\s\S]+)\n-{3,}/);
		if (found) {
			text = found[1];
			found = text.match(/^Auth\s+(.+)$/m);
			if (found) {
				this.form.ntlmAuth = found[1];
				td.SetText(text);
				td.Write(this.ntlmIni);
				Message("Режим прокси-сервера определён как " + this.form.ntlmAuth, mInfo);
				Message(`Хеш пароля был сохранён в файле настроек промежуточного сервера ${this.ntlmIni}:`);
				Message('    ' + text.replace(/\n/g, "\n    "));
				Message("Теперь пароль в настройках можно не указывать и не хранить");
				return;
			}
		}
		Message("Не удалось определить режим сервера. Программа выдала:\n" + text, mExc1);
		Message("Возможно, прокси-сервер не запущен или вы ввели неверные имя/пароль", mInfo);
	}
	handlerbtnProxyReadНажатие() {
		var key = '';
		try {
			key = this.wsh.RegRead("HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings\\ProxyServer");
		} catch (e) { }
		if (key.length) {
			var keys = key.split(';');
			key = '';
			for (var i = 0; i < keys.length; i++) {
				var tt = keys[i].match(/^(?:https?:\/\/|)([A-Za-z0-9_\.\-]+:\d+)$/);
				if (tt) {
					key = tt[1];
					break;
				}
			}
		}
		if (key.length) {
			this.form.proxyAddress = key;
			try {
				var http: XMLHttpRequest = new ActiveXObject('MSXML2.ServerXMLHTTP.6.0');
			} catch (e) {
				Message("Не удалось создать объект MSXML2.ServerXMLHTTP.6.0 для проверки прокси-сервера");
			}
			var url = this.form.remoteRepoURL;
			if (!url)
				url = 'https://snegopat.ru';
			try {
				(<any>http).setProxy(2, key);
				http.open('get', url);
			} catch (e) { return; }
			http.onreadystatechange = () => {
				if (http.readyState == 4) {
					if (http.status == 200 || http.status == 301 || http.status == 302) {
						MessageBox("Прокси-сервер ответил, авторизации не требует");
					} else if (http.status == 407) {
						var authMetods = [];
						var headers = http.getAllResponseHeaders().split('\n');
						for (var i in headers) {
							var h = headers[i].match(/^Proxy-Authenticate:\s+(\S+)/i);
							if (h)
								authMetods.push(h[1]);
						}
						MessageBox("Прокси-сервер ответил, требует авторизации, поддерживает " + authMetods.join(', '));
					} else {
						MessageBox("Прокси-сервер ответил " + http.status + ": " + http.statusText);
					}
				}
			}
			try {
				http.send(null);
			} catch (e) {
				MessageBox("Не удалось проверить прокси-сервер: " + e.description);
			}
		} else {
			MessageBox("Адрес прокси сервера в реестре не найден");
		}
	}
	handlerCmdBarUpdatebtnSaveSettings() {
		this.storeSettings();
		MessageBox("Настройки сохранены");
	}
	handlervtRepoListПриВыводеСтроки(Control, RowAppearance: { val }, RowData: { val }) {
		if (!RowData.val.Parent) {
			RowAppearance.val.Font = v8New("Font", RowAppearance.val.Font, undefined, undefined, true);
		}
	}
}

/**
 * Данный класс служит для связи отображения справки в форме со справочной системой
 */
type HelpControls = FormItems & { HelpTree: TableBox, HelpSearch: TextBox, HelpHtml: HTMLDocumentField, HelpBar: CommandBar };
type HelpTreeRow = { topic: string, data: helpsys.HelpFolder } & ValueTreeRow;
type HelpTree = { Get(p: number): HelpTreeRow } & ValueTree;
type HelpForm = { Controls: HelpControls, HelpSearch: string, HelpTree: HelpTree } & Form;

class HelpPage implements Page {
	form: HelpForm;
	stdButtonsCount: number;
	breadCrumbs;
	connect(form) {
		helpsys.getHelpSystem().createDocs();
		this.form = form;
		this.stdButtonsCount = this.form.Controls.HelpBar.Buttons.Count();
		this.form.HelpTree.Columns.Add("data");
		this.fillHelpTree();
	}
	enter() {
	}
	exit() {
	}
	fillHelpTree() {
		var hs = helpsys.getHelpSystem();
		(function process(folder: helpsys.HelpFolder, rows: ValueTreeRowCollection) {
			var row = <HelpTreeRow>rows.Add();
			row.data = folder;
			row.topic = folder.title;
			if (!folder.folder)
				folder.row = row;
			for (var i in folder.topics)
				process(folder.topics[i], row.Rows);
		})(hs.root, this.form.HelpTree.Rows);
	}
	activate(topic: helpsys.HelpFolder) {
		if (topic.folder)
			return;
		this.form.Controls.HelpHtml.Navigate(env.pathes.help + topic.path);
		for (var idx = this.form.Controls.HelpBar.Buttons.Count() - 1; idx >= this.stdButtonsCount; idx--)
			this.form.Controls.HelpBar.Buttons.Delete(idx);
		idx = 0;
		this.breadCrumbs = {};
		for (var r = <HelpTreeRow>topic.row.Parent; !r.data.folder; r = <HelpTreeRow>r.Parent) {
			var name = "btn" + idx;
			var button: CommandBarButton = this.form.Controls.HelpBar.Buttons.Insert(this.stdButtonsCount, name,
				CommandBarButtonType.Action, r.topic, v8New("Действие", "OnBreadCrumbsClick"));
			button.ToolTip = `Перейти к разделу "${r.topic}"`;
			this.form.Controls.HelpBar.Buttons.Insert(this.stdButtonsCount, "bcsep" + idx, CommandBarButtonType.Separator);
			this.breadCrumbs[name] = r;
			idx++;
		}
	}
	activateByPath(path: string) {
		try {
			this.form.Controls.HelpTree.CurrentRow = helpsys.getHelpSystem().allTopics[path].row;
		} catch (e) { }
	}
	handlerHelpTreeПриАктивизацииСтроки() {
		this.activate(this.form.Controls.HelpTree.CurrentRow.data);
	}
	handlerHelpTreeПриВыводеСтроки(Control, RowAppearance: { val }, RowData: { val }) {
		var ra = RowAppearance.val.Cells.topic;
		ra.ShowPicture = true;
		if (RowData.val.data.folder)
			ra.PictureIndex = 0;
		else
			ra.Picture = (<any>PictureLib).ListViewModeList;
	}
	handlerHelpBarsyncContent() {
		var loc = getLocation(this.form.Controls.HelpHtml.Document);
		if (loc.protocol == "file:") {
			var hf = "/" + env.pathes.help.replace(/\\/g, "/").replace(/ /g, "%20").toLowerCase();
			if (loc.pathname.toLowerCase().indexOf(hf) == 0) {
				var path = loc.pathname.substr(hf.length).replace(/\//g, "\\").toLowerCase();
				var hs = helpsys.getHelpSystem();
				if (path in hs.allTopics && hs.allTopics[path]["row"]) {
					this.form.Controls.HelpTree.CurrentRow = hs.allTopics[path]["row"];
				}
			}
		}
	}
	handlerOnBreadCrumbsClick(button: { val: CommandBarButton }) {
		this.form.Controls.HelpTree.CurrentRow = this.breadCrumbs[button.val.Name];
	}
	handlerHelpSearchOpening(Control, StandardProcessing: { val: boolean }) {
		StandardProcessing.val = false;
		if (this.form.HelpSearch.length) {
			var search = helpsys.getHelpSystem().searchTopics(this.form.HelpSearch);
			var resultCount = search.Count();
			if (0 == resultCount)
				MessageBox("Ничего не найдено");
			else if (1 == resultCount)
				this.activateByPath(search.Get(0).path);
			else {
				var vl = v8New("ValueList");
				for (var i = 0; i < search.Count(); i++) {
					var row = search.Get(i);
					vl.Add(row.path, row.fullTitle, false, (<any>PictureLib).ListViewModeList);
				}
				var choise = vl.ChooseItem("Выберите раздел справки");
				if (choise)
					this.activateByPath(choise.Value);
			}
		}
	}
	handlerHelpHtmlonhelp(Control, pEvtObj) {
		try {
			RunApp(this.form.Controls.HelpHtml.Document.getElementById('wwwsite').innerText);
		} catch (e) { }
	}
};

type AboutControls = FormItems & { AboutHtml: HTMLDocumentField };
type AboutForm = { Controls: AboutControls } & Form;

class AboutPage implements Page {
	form: AboutForm;
	connect(form) {
		this.form = form;
	}
	enter() {
		this.form.Controls.AboutHtml.Navigate(env.pathes.core + "www\\about.html");
	}
	exit() {
		this.form.Controls.AboutHtml.Navigate("about:blank");
	}
	handlerAboutHtmlDocumentComplete() {
		//debugger
		try {
			this.form.Controls.AboutHtml.Document.parentWindow.setDesigner(Designer);
		} catch (e) {
			var data = JSON.stringify({
				"BuildDateTime": env.BuildDateTime,
				"sVersion": env.sVersion,
				"ownerName": env.ownerName,
				"snMainFolder": env.snMainFolder,
				"v8Version": env.v8Version
			});
			try {
				this.form.Controls.AboutHtml.Document.defaultView.setData(data);
			} catch (e) {}
		}
	}
	handlerAboutHtmlonhelp(Control, pEvtObj) {
		RunApp("https://snegopat.ru");
	}
}


// Функция вызывается основным загрузчиком после загрузки стартовых аддинов
function restoreWindowState() {
	// Восстановим состояние окна
	profileRoot.createValue(wndStateProfilePath, true, pflSnegopat);
	var isWndOpened = profileRoot.getValue(wndStateProfilePath);
	if (isWndOpened) {
		if (windows.modalMode != msNone) {
			var nd = events.connect(Designer, "onIdle", () => {
				if (windows.modalMode == msNone) {
					openWnd();
					events.disconnectNode(nd);
				}

			}, "-");
		} else
			openWnd();
	}
}
function getLocation(htmlDoc) {
	try {
		return htmlDoc.parentWindow.location;
	} catch (e) {
		return htmlDoc.defaultView.location;
    }
}