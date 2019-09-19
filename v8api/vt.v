// vt.v - интерфейсы для работы с ТаблицейЗначений, Массивом, ДеревомЗначений

:iface IIndexedCollectionRO {920E4923-2CAF-4E62-9618-C80B9C3D75EC}
:virt
    uint count()
    uint at(Value&out val, uint idx)

:iface IIndexedCollectionFS {0D4B9A60-A032-4AFD-8E5A-C7FA10D1CA2C}
:base IIndexedCollectionRO
:virt
    void setAt(uint idx, const Value& value)

:iface IValueArray {B98D9CE2-D69F-4A6A-B49E-B25416CD866F}
:base IIndexedCollectionFS
:virt
    void setCount(uint count)
    void insertAt(uint idx, const Value& value)
    void remove(uint idx)

:iface IVTColumnRO {90D6BA06-6962-4EFC-ABAF-7F010DF91864}
:virt
    const int& id()
    uint index()
    uint name(int alias)
    uint type(TypeDomainPattern&out)
    v8string title()
    uint width()
    bool colInfo(VTColumnInfo&out info)
    uint columnContainer(IValueTableBaseRO@&)

:iface IVTColumn {775383C9-59D7-496E-84AC-4FE30DFD3A38}
:base IVTColumnRO
:virt
    void setName(const v8string& name)
    void setType(const TypeDomainPattern& type)
    void setTitle(const v8string& title)
    void setWidth(uint width)
    void setColumnInfo(const VTColumnInfo& info)

:iface IVTRowRO {F72AB106-96DB-4CE0-80B0-50D6DE1BEEA3}
:virt
    uint index() 
    uint columnCount()
    Value value(const int& columnId)
    Value valueAt(uint column)
    +1
    uint parentTable(IValueTableBaseRO@&)
	+1

:iface IVTRow {68F3330B-9CDB-4DFD-8702-FF38F90C10EE}
:base IVTRowRO
:virt
    bool setValue(const int& columnId, const Value& value)
    bool setValueAt(uint column, const Value& value)
    void load(IVTRowRO@+ src)


:iface IValueTableBaseRO {7920ABFF-B178-4575-9263-4B9BA79ABADF}
:virt
    uint columnCount()
	+16

:iface IValueTableBase {A1DBEEE1-03E5-40D7-9BD6-C8763F7D8CB0}
:base IValueTableBaseRO
:virt
    void setRowCount(uint count)
	uint addRow(IVTRowRO@&)
    uint insertRow(IVTRowRO@+, uint index)
    void deleteRow(uint index)
    void deleteRows()
    void moveRow(uint index, int offset)
    bool setValue(uint row, const int& id, const Value& value)
    bool setValueAt(uint row, uint column, const Value& value)
    +2

:iface IValueTableColumns {E17D31E5-14C3-4A66-83B1-1B943B542A4C}
:base IValueTableBase
:virt
    void setColumnCount(uint count)
	uint addColumn(IVTColumnRO@&, const VTColumnInfo& info, const int& id)
	uint insertColumn(IVTColumnRO@&, uint index, const VTColumnInfo& info, const int& id)
	+4

:iface IValueTable {B7C66F56-E802-4B6C-BE2E-733E40AC6A3C}
:base IValueTableColumns
:virt
	void f()

:iface IValueSubTree {2B3C14FE-F864-414A-B27F-252D72CCED32}
:base IValueTableBase
:virt
    uint parentRow(IVTRowRO@&)

:iface IValueTreeRow {93E2A4CE-5E45-4A25-9601-3DC3103AF140}
:base IVTRow
:virt
    uint parentRow(IValueTreeRow@&)
    uint parentTree(IValueTableBaseRO@&)
    bool hasChild()
    uint subTree(IValueSubTree@&)
    uint level()

:iface IValueTree {108B9848-B862-4DC3-A906-E2CE6326870F}
:base IValueTableColumns
:virt
	void f()

:struct VTColumnInfo
:props
    v8string name1
	v8string name2
    TypeDomainPattern type
    v8string title
    uint width
:meths
	void ctor()
	{
		obj.name1.ctor();
		obj.name2.ctor();
		obj.title.ctor();
		obj.type.ctor();
		obj.width = 0;
	}
	---
	void dtor()
	{
		obj.name1.dtor();
		obj.name2.dtor();
		obj.title.dtor();
		obj.type.dtor();
	}
	---

:struct StructKeys
:props
	uint key1
	uint key2

:iface IValueStructure {D55C9347-9320-49E1-B2E6-A1D2B87C1193}
:virt
    uint count()
    bool find(const StructKeys& key, Value& val)
	+2
    bool set(const v8string& key, const Value& val)


:guid CLSID_ValueArray	{1BB40B60-BBFA-11D5-A3C1-0050BAE0A776}
:guid CLSID_ValueTable	{F24E186B-AB33-447F-B813-08AB49F126F2}
:guid CLSID_ValueTree	{41CCA7E8-9581-485C-B954-134A6D740F7E}
:guid CLSID_ValueStruct	{C6BDAE87-2280-4624-AF03-2C1B4371B2E4}