/* com_files.as
    Работы из аддинов с файлами.
*/
// Данные строки нужны только для среды разработки и вырезаются препроцессором
#pragma once
#include "../../all.h"

class V8Files {
    V8Files()
    {
    }
    IV8DataFile&& open(const string& path, FileOpenModes mode)
    {
        IFile&& file;
        URL url(path);
        IFileSystem&& fs = getFSService();
        {
            ExceptionCatcher catcher;
            CppCatch c("class core::Exception", ExceptionHandler(catcher.handle));
            fs.openURL(file, url, mode);
            if (catcher.hasException) {
                setComException(catcher.errStr);
                return null;
            }
        }
        IFileEx&& fex = file.unk;
        return fex is null ? null : IV8DataFile(fex);
    }
    IV8DataFile&& createMemoryFile()
    {
        IFileEx&& fex;
        currentProcess().createByClsid(CLSID_MemoryFile, IID_IFileEx, fex);
        return IV8DataFile(fex);
    }
    IV8DataFile&& createTempFile(uint memLimit = 0)
    {
        IFileEx&& fex;
        currentProcess().createByClsid(CLSID_TempFile, IID_IFileEx, fex);
        if (memLimit != 0) {
            ITempFile&& tf = fex.unk;
            tf.setMemLimit(memLimit);
        }
        return IV8DataFile(fex);
    }
    IV8StorageFile&& attachStorage(IV8DataFile&& file, bool createNew = false)
    {
        IStorageRW&& stg;
        currentProcess().createByClsid(CLSID_StorageRW, IID_IStorageRW, stg);
        if (file.file !is null) {
            ExceptionCatcher catcher;
            CppCatch c("class core::Exception", ExceptionHandler(catcher.handle));
            
            if (createNew)
                stg.createNewFromFile(file.file);
            else
                stg.initFromFile(file.file);
            if (catcher.hasException) {
                setComException(catcher.errStr);
                return null;
            }
            return IV8StorageFile(stg);
        }
        return null;
    }
    MemoryBuffer&& newMemoryBuffer(uint size)
    {
        return MemoryBuffer(size);
    }
};

enum StringDataMode {
    dsAnsi = 1,
    dsUtf8 = 2,
    dsUtf16 = 3
};

class MemoryBuffer {
    uint bytes;
    uint _length;
    MemoryBuffer(uint l)
    {
        _length = l;
        bytes = l != 0 ? malloc(l) : 0;
    }
    ~MemoryBuffer()
    {
        if (bytes != 0)
            free(bytes);
    }
    uint8 byte(uint pos)
    {
        return mem::byte[bytes + pos];
    }
    void set_byte(uint pos, uint8 val)
    {
        mem::byte[bytes + pos] = val;
    }
};

class IV8DataFile {
    IFileEx&& file;
    IV8DataFile(IFileEx&& f)
    {
        &&file = f;
    }
    MemoryBuffer&& read(uint length)
    {
        if (file is null) {
            setComException("Файл закрыт");
            return null;
        }
        MemoryBuffer buf(length);
        IFile&& f = file;
        ExceptionCatcher catcher;
        CppCatch c("class core::Exception", ExceptionHandler(catcher.handle));
        buf._length = f.read(buf.bytes, length);
        if (catcher.hasException) {
            buf._length = 0;
            setComException(catcher.errStr);
        }
        return buf;
    }
    void write(MemoryBuffer&& bytes)
    {
        if (file is null) {
            setComException("Файл закрыт");
            return;
        }
        IFile&& f = file;
        ExceptionCatcher catcher;
        CppCatch c("class core::Exception", ExceptionHandler(catcher.handle));
        f.write(bytes.bytes, bytes._length);
        if (catcher.hasException)
            setComException(catcher.errStr);
    }
    uint32 seek(int64 pos, FileSeekMode fsMode)
    {
        if (file is null) {
            setComException("Файл закрыт");
            return 0;
        }
        ExceptionCatcher catcher;
        CppCatch c("class core::Exception", ExceptionHandler(catcher.handle));
        uint32 res = file.seek(pos, fsMode);
        if (catcher.hasException)
            setComException(catcher.errStr);
        return res;
    }
    string getString(StringDataMode mode, int length=-1)
    {
        string result;
        if (file is null) {
            setComException("Файл закрыт");
            return result;
        }
        ExceptionCatcher catcher;
        CppCatch c("class core::Exception", ExceptionHandler(catcher.handle));
        
        if (-1 == length) {
            // Прочитать всё до конца
            uint64 curPos = file.seek(0, fsCurrent);
            uint64 endPos = file.seek(0, fsEnd);
            file.seek(curPos, fsBegin);
            if (catcher.hasException) {
                setComException(catcher.errStr);
                return result;
            }
            length = endPos - curPos;
        }
        if (length > 0) {
            IFile&& f = file;
            if (dsUtf16 == mode) {
                length &= ~1;	// Длина должна быть нечетной
                f.read(result.setLength(length / 2), length);
                if (catcher.hasException) {
                    setComException(catcher.errStr);
                    return string();
                }
            } else {
                MemoryBuffer buf(length);
                length = f.read(buf.bytes, length);
                if (catcher.hasException) {
                    setComException(catcher.errStr);
                    return result;
                }
                int cp = dsUtf8 == mode ? CP_UTF8 : CP_ACP;
                int len = MultiByteToWideChar(cp, 0, buf.bytes, length, 0, 0);
                MultiByteToWideChar(cp, 0, buf.bytes, length, result.setLength(len), len);
            }
        }
        return result;
    }
    void putString(StringDataMode mode, const string& str, int length = -1)
    {
        if (length == -1)
            length = str.length;
        if (file is null) {
            setComException("Файл закрыт");
            return;
        }
        if (length <= 0)
            return;
        ExceptionCatcher catcher;
        CppCatch c("class core::Exception", ExceptionHandler(catcher.handle));
        IFile&& f = file;
        if (dsUtf16 == mode)
            f.write(str.cstr, length * 2);
        else {
            int cp = dsUtf8 == mode ? CP_UTF8 : CP_ACP;
            bool useDef;
            int len = WideCharToMultiByte(cp, 0, str.cstr, length, 0, 0, 0, useDef);
            MemoryBuffer buf(len);
            WideCharToMultiByte(cp, 0, str.cstr, length, buf.bytes, len, 0, useDef);
            f.write(buf.bytes, len);
        }
        if (catcher.hasException)
            setComException(catcher.errStr);
    }
    void flush()
    {
        if (file is null) {
            setComException("Файл закрыт");
            return;
        }
        IFile&& f = file;
        ExceptionCatcher catcher;
        CppCatch c("class core::Exception", ExceptionHandler(catcher.handle));
        f.flush();
        if (catcher.hasException)
            setComException(catcher.errStr);
    }
    void setEOF()
    {
        if (file is null) {
            setComException("Файл закрыт");
            return;
        }
        ExceptionCatcher catcher;
        CppCatch c("class core::Exception", ExceptionHandler(catcher.handle));
        file.setEOF();
        if (catcher.hasException)
            setComException(catcher.errStr);
    }
    string get_url()
    {
        if (file is null) {
            setComException("Файл закрыт");
            return string();
        }
        IFile&& f = file;
        ExceptionCatcher catcher;
        CppCatch c("class core::Exception", ExceptionHandler(catcher.handle));
        URL u;
        f.url(u);
        if (catcher.hasException)
            setComException(catcher.errStr);
        return u.url;
    }
    void close()
    {
        &&file = null;
    }
};

class IV8StorageFile {
    IV8StorageFile(IStorageRW&& s)
    {
        &&stg = s;
    }
    IStorageRW&& stg;
    array<string>&& files()
    {
        array<string> result;
        Vector flist;
        stg.find(flist, "*".cstr);
        if (flist.start < flist.end) {
            for (StorageFileInfoRef&& ptr = toStorageFileInfo(flist.start); ptr < flist.end; &&ptr = ptr + 1) {
                result.insertLast(ptr.ref.name);
                ptr.ref.dtor();
            }
        }
        return result;
    }
    IV8DataFile&& open(const string& name, FileOpenModes mode)
    {
        IFileEx&& file;
        ExceptionCatcher catcher;
        CppCatch c("class core::Exception", ExceptionHandler(catcher.handle));
        stg.open(file, name, mode);
        if (catcher.hasException) {
            setComException(catcher.errStr);
            return null;
        }
        return file is null ? null : IV8DataFile(file);
    }
    void rename(const string& oldName, const string& newName)
    {
        ExceptionCatcher catcher;
        CppCatch c("class core::Exception", ExceptionHandler(catcher.handle));
        stg.rename(oldName, newName);
        if (catcher.hasException)
            setComException(catcher.errStr);
    }
    void remove(const string& name)
    {
        ExceptionCatcher catcher;
        CppCatch c("class core::Exception", ExceptionHandler(catcher.handle));
        stg.remove(name.cstr);
        if (catcher.hasException)
            setComException(catcher.errStr);
    }
};

funcdef bool ExceptionHandler(Exception&);

// Класс для отлова С++ исключения с типом core::Exception
// Если установлен bypass - исключение пробрасывается дальше,
// иначе запоминает факт произошедшего исключения и описание ошибки
class ExceptionCatcher {
    bool hasException = false;
    bool bypass = false;
    string errStr;
    bool handle(Exception& exc)
    {
        if (bypass)
            return false;       // Исключение не обработано, передать дальше
        hasException = true;
        errStr = exc.descr;
        return true;            // Исключение обработано
    }
};
