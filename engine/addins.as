/* addins.as
Работа с аддинами
*/
#pragma once
#include "../../all.h"

Packet pkAddinMgr("AddinManager", initAddins, piOnFirstIdle);
// Ссылка на менеджер аддинов
AddinMgr&& oneAddinMgr;
// Один загрузчик встроенных аддинов
AddinLoader oneBuiltinLoader;
// Ссылка на начало списка встроенных аддинов. Каждый встроенный аддин добавляет себя в этот список
BuiltinAddin&& builtinAddinsList;
// Ссылка на начало списка загрузчиков аддинов. Для авто-подключения загрузчик должен добавить себя в этот список
AddinLoader&& loadersList;

bool initAddins()
{
    // Создаем корень SnegAPI, а он создаст менеджер аддинов
    &&oneDesigner = Designer();
    //oneAddinMgr.loadAddin("script:test.js", oneAddinMgr._root);
    if (oneAddinMgr.loadAddin("script:" + pathes._core + "scripts\\main.js", oneAddinMgr._root.childs[0]) is null)
        Message(oneAddinMgr._lastAddinError);
    return true;
}

// Класс, представляющий загруженный аддин.
// Загрузчик аддинов должен возвращать наследника от этого класса
class Addin {
    protected string uName, dName, fPath;
    AddinLoader&& __loader;
    AddinGroup&& group;
    const string& get_uniqueName() const    { return uName; }
    const string& get_displayName() const   { return dName; }
    const string& get_fullPath()const       { return fPath; }
    // получить массив имен макросов
    array<string>&& macroses()              { return null; }
    // выполнить макрос
    Variant invokeMacros(const string& macros) { return Variant(); }
    // получить массив имен команд меню
    array<string>&& menu()                  { return null; }
    // Выполнить команду меню
    void invokeMenu(uint idx)               {}
    // получить Dispatch объект
    IUnknown&& object()                     { return null; }
};

// Интерфейс загрузчика аддинов. Остальные загрузчики должны наследоваться от него
class AddinLoader {
    AddinLoader&& next;
    AddinLoader()
    {
        &&next = loadersList;
        &&loadersList = this;
    }
    string proto()                  { return "snegopat"; }
	Addin&& load(const string& uri) { return null; }
	bool run(Addin&& addin) { return true; }
    bool canUnload(Addin&& addin)   { return false; }
    bool unload(Addin&& addin)      { return false; }
    string nameOfLoadCommand()      { return ""; }
    string selectLoadURI()          { return ""; }
};

class AddinGroup {
    string name;
    AddinGroup&& parent;
    AddinGroup&& child;
    AddinGroup&& next;
    array<AddinGroup&&> childs;
    array<Addin&&> addins;

    AddinGroup()
    {
        &&parent = null;
    }
    AddinGroup(AddinGroup&& p, const string& n)
    {
        name = n;
        &&parent = p;
        if (p.child is null)
            &&p.child = this;
        else
            &&p.childs[p.childs.length - 1].next = this;
        p.childs.insertLast(this);
    }
    AddinGroup&& addGroup(const string& nameOfChild)
    {
        for (uint i = 0, im = childs.length; i < im; i++) {
            AddinGroup&& c = childs[i];
            if (c.name.compareNoCase(nameOfChild) == 0)
                return c;
        }
        return AddinGroup(this, nameOfChild);
    }
    void addAddin(Addin&& addin)
    {
        &&addin.group = this;
        addins.insertLast(addin);
    }
    uint get_addinsCount()
    {
        return addins.length;
    }
    Addin&& addin(uint idx)
    {
        return idx < addins.length ? addins[idx] : null;
    }
};

class AddinMgr {
    private NoCaseMap<AddinLoader&&> loaders;
    private array<Addin&&> addins;
    private NoCaseMap<Addin&&> mapUniqueName;
    private NoCaseMap<Addin&&> mapFullPath;
    // Корневая группа
    AddinGroup _root;
	AddinGroup&& _libs;
	AddinGroup&& _users;
	AddinGroup&& _sys;
	// При ошибке работы с аддинами описание ошибки писать сюда
    string _lastAddinError;

    AddinMgr()
    {
        &&oneAddinMgr = this;
        // Зарегим все лоадеры
        while (loadersList !is null) {
            loaders.insert(loadersList.proto(), loadersList);
            //Message(loadersList.proto());
            &&loadersList = loadersList.next;
        }
        // Создаем группу для встроенных аддинов
        &&_sys= _root.addGroup("Служебные аддины");
		// Для библиотек
		&&_libs = _root.addGroup("Подгружаемые библиотеки");
		// Для пользователей
		&&_users = _root.addGroup("Пользовательские аддины");
        // Зарегистрируем все встроенные аддины
        for (BuiltinAddin&& ptr = builtinAddinsList; ptr !is null; &&ptr = ptr.next) {
            //Message("Load " + ptr.uniqueName);
            &&ptr.__loader = oneBuiltinLoader;
            mapUniqueName.insert(ptr.uniqueName, ptr);
            mapFullPath.insert(ptr.fullPath, ptr);
            addins.insertLast(ptr);
            _sys.addAddin(ptr);
        }
    }

    uint get_count() const { return addins.length; }
    Addin&& byUniqueName(const string& name) const
    {
        auto fnd = mapUniqueName.find(name);
        return fnd.isEnd() ? null : fnd.value;
    }
    Addin&& byFullPath(const string& fullPath) const
    {
        auto fnd = mapFullPath.find(fullPath);
        return fnd.isEnd() ? null : fnd.value;
    }
    Addin&& byIdx(uint idx) const
    {
        return addins[idx];
    }
    Addin&& loadAddin(const string& uri, AddinGroup&& group)
    {
        int protoPos = uri.find(':');
        if (protoPos <= 0) {
            _lastAddinError = "Не задан тип загрузчика";
            return null;
        }
        string proto = uri.substr(0, protoPos), path = uri.substr(protoPos + 1);
        auto fndLdr = loaders.find(proto);
        if (fndLdr.isEnd()) {
            _lastAddinError = "Не найден загрузчик '" + proto + "'";
            return null;
        }
		path.replace("<addins>", pathes._addins).replace("<custom>", pathes._custom).replace("<core>", pathes._core);
        Addin&& addin = fndLdr.value.load(path);
        if (addin is null)
            return null;
        string un = addin.uniqueName;
        if (un.isEmpty()) {
            _lastAddinError = "Не задано уникальное имя аддина";
            return null;
        }
        if (mapUniqueName.contains(un)) {
            _lastAddinError = "Аддин с уникальным именем '" + un + "' уже загружен";
            return null;
        }
        string fp = addin.fullPath;
        if (fp.isEmpty()) {
            _lastAddinError = "Не задан полный путь аддина";
            return null;
        }
        if (mapFullPath.contains(fp)) {
            _lastAddinError = "Аддин с полным путём '" + fp + "' уже загружен";
            return null;
        }
        // В момент запуска аддин уже должен видеть себя в менеджере аддинов
        group.addAddin(addin);
        mapUniqueName.insert(un, addin);
        mapFullPath.insert(fp, addin);
        addins.insertLast(addin);
        // Теперь пробуем запустить его
        if (!fndLdr.value.run(addin)) {
            remove(addin, un);
            return null;
        }
        oneDesigner._fireAddinChanges(addin, true);
        return addin;
    }
    private void remove(Addin&& addin, const string& uniqueName)
    {
        mapUniqueName.remove(uniqueName);
        mapFullPath.remove(addin.fullPath);
        removeAddinFromArray(addins, addin);
        removeAddinFromArray(addin.group.addins, addin);
    }
    bool unloadAddin(Addin&& addin)
    {
        if (addin is null)
            return true;
        string uniqueName = addin.get_uniqueName();
        if (uniqueName.isEmpty()) {
            _lastAddinError = "Аддин уже выгружен";
            return false;
        }
        if (!addin.__loader.canUnload(addin)) {
            _lastAddinError = "Аддин не может быть выгружен";
            return false;
        }
        if (!addin.__loader.unload(addin))
            return false;
        remove(addin, uniqueName);
        oneDesigner._fireAddinChanges(addin, false);
        return true;
    }
    //[helpstring("Получить команды для загрузки всех поддерживаемых видов аддинов.")]
    array<string>&& getLoaderCommands()
    {
        array<string> result;
        for (auto it = loaders.begin(); it++;) {
            string cmd = it.value.nameOfLoadCommand();
            if (!cmd.isEmpty())
                result.insertLast(cmd);
        }
        return result;
    }
    //[helpstring("Выбрать и загрузить аддин. Передавать часть команды загрузчика после '|'")]
    Addin&& selectAndLoad(const string& loaderCommand, AddinGroup&& group)
    {
        auto find = loaders.find(loaderCommand);
        if (!find.isEnd()) {
            string uri = find.value.selectLoadURI();
            if (!uri.isEmpty())
                return loadAddin(uri, group);
        } else
            _lastAddinError = "Не найден загузчик для " + loaderCommand;
        return null;
    }
    //[helpstring("Можно ли выгружать аддин")]
    bool isAddinUnloadable(Addin&& addin)
    {
        if (addin.uniqueName.isEmpty()) {
            _lastAddinError = "Аддин уже выгружен";
            return false;
        }
        return addin.__loader.canUnload(addin);
    }
};

class BuiltinAddin : Addin {
    BuiltinAddin&& next;
    uint order;
    BuiltinAddin(const string& un, const string& dn, uint ord = 0)
    {
        uName = fPath = un;
        dName = dn;
        order = ord;
        if (&&builtinAddinsList is null)
            &&builtinAddinsList = this;
        else {
            BuiltinAddin&& ptr = builtinAddinsList;
            while (ptr.next !is null && ptr.next.order < order)
                &&ptr = ptr.next;
            &&next = ptr.next;
            &&ptr.next = this;
        }
    }
};

void removeAddinFromArray(array<Addin&&>&& arr, Addin&& a)
{
    for (uint i = 0, im = arr.length; i < im; i++) {
        if (arr[i] is a) {
            arr.removeAt(i);
            return;
        }
    }
}
