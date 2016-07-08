// Описание интерфейсов для работы с профайлом
:iface IProfileFolder {154EF4A0-5965-11d4-9418-008048DA11F9}
:virt
	// получить название данного раздела
	v8string getName()
	// создать значение в профайле
	void createValue(const v8string&in path, const Guid&in sourceID, const Value&in value)
	// создать и установить значение по ключу
	void createAndSetValue(const v8string&in path, const Guid&in sourceID, const Value&in value)
	// получить значение по ключу
    bool getULong(const v8string&in path, uint&out value)
    bool getLong(const v8string&in path, int&out value)
    bool getUInt(const v8string&in path, uint&out value)
    bool getInt(const v8string&in path, int&out value)
    bool getUShort(const v8string&in path, uint16&out value)
    bool getShort(const v8string&in path, int16&out value)
    bool getBool(const v8string&in path, bool&out value)
    bool getDate(const v8string&in path, Date&out value)
    bool getNumeric(const v8string&in path, Numeric&out value)
    bool getString(const v8string&in path, v8string&out value)
    bool getValue(const v8string&in path, Value&out value)
	// установить значение по ключу
	bool setValue(const v8string&in path, const Value&in value)
	// удалить значение по ключу
	void deleteValue(const v8string&in path)
	// количество значений данного раздела
	uint32 valuesCount()
	// получить значение данного раздела по индексу
    bool getULongAt(uint32 index, uint32&out value)
    bool getLongAt(uint32 index, int&out value)
    bool getUIntAt(uint32 index, uint32&out value)
    bool getIntAt(uint32 index, int&out value)
    bool getUShortAt(uint32 index, uint16&out value)
    bool getShortAt(uint32 index, int16&out value)
    bool getBoolAt(uint32 index, bool&out value)
    bool getDateAt(uint32 index, Date&out value)
    bool getNumericAt(uint32 index, Numeric&out value)
    bool getStringAt(uint32 index, v8string&out value)
    bool getValueAt(uint32 index, Value&out value)
	// получить название значения
	bool getValueKeyAt(uint32 index, v8string&out key)
	// установить значение данного раздела по индексу
	bool setValueAt(uint32 index, const Value&in value)
	// удалить значение по индексу
	bool deleteValueAt(uint32 index)
	// создать подраздел
	void createFolder(const v8string&in path, const Guid& sourceID)
	// получить подраздел по ключу
	void getFolder(IProfileFolder@&out, const v8string&in path)
	// удалить раздел по ключу
	void deleteFolder(const v8string&in path)
	// количество подразделов данного раздела
	uint32 foldersCount()
	// получить подраздел данного раздела по ключу
	void getFolderAt(IProfileFolder@& out, uint32 index)
	// удалить подраздел данного раздела по индексу
	bool deleteFolderAt(uint32 index)

:service IProfileService {57358488-BF08-4C25-AFD4-374051D5FEBD}
:base IProfileFolder
:virt
	void attachSource(IProfileSource@ profileSource, const Guid&in)
	// отсоединить источник данных профайла
	void detachSource(const Guid&in)
	// открыть профайл. тут надо поставить перехват, дабы присоединить snegopat.pfl
	save void open()
	// записать все изменения  в профайле
	void flush()
	// закрыть
	void close()

// Описание интерфейса объекта файлового хранилища профайла
:iface IProfileSource {9CD0CA00-5BC0-11d4-9418-008048DA11F9}
:virt
    void init(const v8string&in path)

// Идентификатор объекта - файлового хранилища настроек
:guid CLSID_FileProfileSrc      {9CD0CA02-5BC0-11d4-9418-008048DA11F9}
// Идентификаторы различных хранилищ настроек
:guid gpflComputer               {E98B896D-2869-4A03-9E8A-AA5D2DBC3BD8}
:guid gpflBase                   {934D1821-2523-4BD7-931C-AF004304A04C}
:guid gpflBaseUser               {620610F5-6E66-4324-B873-F5A6C0B41CA8}
:guid gpflCompBase               {4F3C15E7-6D26-4329-B0B9-D949EB88EF81}
:guid gpflCompBaseUser           {9198936F-CF98-4479-A644-3892A8691B52}
:guid gpflSnegopat               {1C0D6B14-76F4-49d7-AC4E-77948702D9A1}

:global
:meths
    IProfileService@ getProfileService()
    {
        return currentProcess().getService(IID_IProfileService);
    }
    ---
    IProfileFolder@ getProfileRoot()
    {
		return cast<IProfileService>(currentProcess().getService(IID_IProfileService));
    }
	---
