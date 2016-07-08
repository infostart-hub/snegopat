/* com_profile.as
    Обёртка для работы с деревом настроек 1С из аддинов.
*/
// Данные строки нужны только для среды разработки и вырезаются препроцессором
#pragma once
#include "../../all.h"

enum ProfileStoreType {
    pflSeanse = 0,
    pflComputer = 1,
    pflBase = 2,
    pflBaseUser = 3,
    pflCompBase = 4,
    pflCompBaseUser = 5,
    pflSnegopat = 6
};

const Guid& guidOfStore(ProfileStoreType pfs)
{
    switch (pfs) {
    case pflComputer:
        return gpflComputer;
    case pflBase:
        return gpflBase;
    case pflBaseUser:
        return gpflBaseUser;
    case pflCompBase:
        return gpflCompBase;
    case pflCompBaseUser:
        return gpflCompBaseUser;
    case pflSnegopat:
        return gpflSnegopat;
    }
    return IID_NULL;
}

class ProfileStore {
    protected IProfileFolder&& folder;
    ProfileStore(IProfileFolder&& f)
    {
        &&folder = f;
    }
    //[propget, helpstring("Название раздела")]
    string get_name()
    {
        return folder.getName();
    }
    //[helpstring("Создать значение")]
    void createValue(const string& path2value, const Variant& defaultValue, ProfileStoreType storeType)
    {
        v8string strPath = path2value;
        Value val, existVal;
        if (folder.getValue(strPath, existVal)) {
            folder.deleteValue(strPath);
            val = existVal;
        } else
            var2val(defaultValue, val);
        folder.createAndSetValue(strPath, guidOfStore(storeType), val);
    }
    //[helpstring("Получить значение")]
    Variant getValue(const string& path2value)
    {
        Variant res;
        Value val;
        if (folder.getValue(path2value, val))
            val2var(val, res);
        return res;
    }
    //[helpstring("Установить значение")]
    void setValue(const string& path2value, Variant value)
    {
        Value val;
        var2val(value, val);
        folder.setValue(path2value, val);
    }
    //[propget, helpstring("Количество значений")]
    uint get_valuesCount()
    {
        return folder.valuesCount();
    }
    //[helpstring("Название значения по номеру")]
    string valueName(uint idx)
    {
        v8string res;
        if (idx < folder.valuesCount())
            folder.getValueKeyAt(idx, res);
        return res;
    }
    //[helpstring("Получить значение по номеру")]
    Variant getValueAt(uint idx)
    {
        Variant res;
        if (idx < folder.valuesCount()) {
            Value val;
            folder.getValueAt(idx, val);
            val2var(val, res);
        }
        return res;
    }
    //[helpstring("Установить значение по номеру")]
    void setValueAt(uint idx, Variant value)
    {
        if (idx < folder.valuesCount()) {
            Value val;
            var2val(value, val);
            folder.setValueAt(idx, val);
        }
    }
    //[helpstring("Удалить значение по имени")]
    void deleteValue(const string&  name)
    {
        folder.deleteValue(name);
    }
    //[helpstring("Удалить значение по номеру")]
    void deleteValueAt(uint idx)
    {
        if (idx < folder.valuesCount())
            folder.deleteValueAt(idx);
    }
    //[helpstring("Создать раздел")]
    void createFolder(const string&  folderName, ProfileStoreType storeType)
    {
        folder.createFolder(folderName, guidOfStore(storeType));
    }
    //[propget, helpstring("Количество разделов")]
    uint get_foldersCount()
    {
        return folder.foldersCount();
    }
    //[helpstring("Получить раздел по имени")]
    ProfileStore&& getFolder(const string&  path2folder)
    {
        IProfileFolder&& ptr;
        folder.getFolder(ptr, path2folder);
        if (ptr is null)
            return null;
        return ProfileStore(ptr);
    }
    //[helpstring("Получить раздел по номеру")]
    ProfileStore&& getFolderAt(uint idx)
    {
        if (idx < folder.foldersCount()) {
            IProfileFolder&& ptr;
            folder.getFolderAt(ptr, idx);
            return ProfileStore(ptr);
        }
        return null;
    }
    //[helpstring("Удалить раздел по имени")]
    void deleteFolder(const string&  name)
    {
        folder.deleteFolder(name);
    }
    //[helpstring("Удалить раздел по номеру")]
    void deleteFolderAt(uint idx)
    {
        if (idx < folder.foldersCount())
            folder.deleteFolderAt(idx);
    }
};
