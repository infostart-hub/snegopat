
:enum FileOpenModes
	0x1		fomAppend
	0x2		fomTruncate
	0x8		fomIn
	0x10	fomOut
	0x100	fomShareRead
	0x200	fomShareWrite

:iface IFileSystem {3A6C2186-45C3-11D4-985D-008048DA1252}
:virt
    +3
    save uint openURL(IFile@&, const URL& url, int mode)

:iface IFile {F85A2E9A-37AB-11D4-985A-008048DA1252}
:virt
	uint url(URL&)
    uint read(uint buffer, uint count)
    void write(uint buffer, uint count)
    void flush()

:enum FileSeekMode
	1	fsBegin
	2	fsCurrent
	4	fsEnd

:iface IFileEx {BC354E75-3C37-11D4-985C-008048DA1252}
	:base IFile
	:virt
		uint64 seek(int64 pos, FileSeekMode mode)
	    uint64 setEOF()

:enum StorageCreateFlags
    0	scfNone
    1	scfCached
    2	scfTruncate

:struct StorageFileInfo
	:props
		32
		v8string name
	#if ver < 8.3
		+4
	#endif
	:meths
		void dtor()
		{
			obj.name.dtor();
		}
		---

:iface IStorageRW {C6A8E687-B22A-476D-94A8-58F40BCB4710}
	:virt
		void initFromPath(const URL& path, FileOpenModes mode)
		void initFromFile(IFileEx@+ file, StorageCreateFlags flags = scfNone)
		void createNewFromPath(const URL& path, FileOpenModes mode, StorageCreateFlags flags = scfTruncate, uint blockSize = 512)
		void createNewFromFile(IFile@+ file, StorageCreateFlags flags = scfTruncate, uint blockSize = 512)
		uint find(Vector& res, uint pPattern)
		uint open(IFileEx@& res, const v8string&in fileName, FileOpenModes mode)
		void remove(uint pPattern)
		void rename(const v8string&in oldFileName, const v8string&in newFileName)
		void compressToFile(IFileEx@+ file, uint blockSize = 512)
		void compressToPath(const URL& path, FileOpenModes mode, uint blockSize = 512)

:struct FileException
	//:base Exception
	:props
		Guid		id
		v8string	descr
		uint		ptr
		int code
		URL	url

:guid CLSID_MemoryFile	{C1AF3F04-620A-40BC-8CA8-F6089B4A46F5}
:guid CLSID_TempFile	{4FBE2375-4CED-4038-A89A-1C772F305CBE}
:guid CLSID_StorageRW	{1E87FC1E-F03C-44D3-B87E-1DB84EF2C70C}

:iface ITempFile {0C6E9F49-A3CA-4C45-B078-5871639BF726}
	:virt
	    uint detach(URL&)
		void attach(const URL& url)
	    void setMemLimit(uint limit)
		uint getMemLimit()

:global
:meths
	IFileSystem@ getFSService()
	{
		return currentProcess().getService(IID_IFileSystem);
	}
	---
