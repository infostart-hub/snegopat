// Описание интерфейсов работы с документами
:iface IPersistableDocument {39D1961C-1881-4E3F-8453-16AD0A648B05}
	:virt
		void save(IFile@+ file)
		void load(IFile@+ file)

:iface IDocument {425EE300-9DD3-11d4-84AE-008048DA06DF}
	:base IPersistableDocument
	:virt
		save uint createView(IUnknown@&)
		//void enumAllViews(DocumentViews& views)
		void enumAllViews(Vector& views)
		+1
		bool isModified()
		bool canClose()
		+1
		v8string getTitle()
		void setTitle(const v8string&in title)
		void setConfigMode(bool configMode)
		bool getConfigMode()
		void getKey(v8string&out key)
		const URL& url()
		const Guid& getKind()
		void setReadOnly(bool bFlag)
		bool getReadOnly()

:iface IPersistableObject {45B81B41-9540-11D4-9427-008048DA11F9}
:virt
	const Guid& getCLSID()
    void serialize(IOutPersistenceStorage@+ storage)
    void deserialize(IInPersistenceStorage@+ storage)

:iface IOutPersistenceStorage {24865123-AB36-11D4-B9A4-008048DA0334}
	:virt
		void f()

:iface IInPersistenceStorage {24865124-AB36-11D4-B9A4-008048DA0334}
	:virt
		void f()

:iface IStreamPersistenceStorage {86EB9CD0-FFA0-4E4C-8134-05DCF57C253C}
	:virt
		void setFile(IFile@+ file)
		void open(const URL& url)
		void close()

:iface IDocumentSink {E7D5C730-A01E-11D4-84AF-008048DA06DF}
	:virt
		void f()

:struct DocSink
	:props
		int vtab
		uint refCount
		+8
		IUnknown@ editHelper
		Guid propId
		+12

:guid CLSID_StreamOutPersistenceStorage		{E3DDF5CD-4150-41B9-9D92-8B2E7CF39DD5}
:guid CLSID_StreamInPersistenceStorage		{25802095-C067-4AD9-B340-B23A2349FEC3}

