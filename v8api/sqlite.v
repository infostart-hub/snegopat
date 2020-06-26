// Файл для подключения AngelScript к sqlite3
:enum s3const
	 0	SQLITE_OK
	 1 	SQLITE_ERROR        // SQL error or missing database
	 2 	SQLITE_INTERNAL     // Internal logic error in SQLite
	 3 	SQLITE_PERM         // Access permission denied
	 4 	SQLITE_ABORT        // Callback routine requested an abort
	 5 	SQLITE_BUSY         // The database file is locked
	 6 	SQLITE_LOCKED       // A table in the database is locked
	 7 	SQLITE_NOMEM        // A malloc() failed
	 8 	SQLITE_READONLY     // Attempt to write a readonly database
	 9 	SQLITE_INTERRUPT    // Operation terminated by sqlite3_interrupt()
	10 	SQLITE_IOERR        // Some kind of disk I/O error occurred
	11 	SQLITE_CORRUPT      // The database disk image is malformed
	12 	SQLITE_NOTFOUND     // Unknown opcode in sqlite3_file_control()
	13 	SQLITE_FULL         // Insertion failed because database is full
	14 	SQLITE_CANTOPEN     // Unable to open the database file
	15 	SQLITE_PROTOCOL     // Database lock protocol error
	16 	SQLITE_EMPTY        // Database is empty
	17 	SQLITE_SCHEMA       // The database schema changed
	18 	SQLITE_TOOBIG       // String or BLOB exceeds size limit
	19 	SQLITE_CONSTRAINT   // Abort due to constraint violation
	20 	SQLITE_MISMATCH     // Data type mismatch
	21 	SQLITE_MISUSE       // Library used incorrectly
	22 	SQLITE_NOLFS        // Uses OS features not supported on host
	23 	SQLITE_AUTH         // Authorization denied
	24 	SQLITE_FORMAT       // Auxiliary database format error
	25 	SQLITE_RANGE        // 2nd parameter to sqlite3_bind out of range 
	26 	SQLITE_NOTADB       // File opened that is not a database file
	27 	SQLITE_NOTICE       // Notifications from sqlite3_log()
	28 	SQLITE_WARNING      // Warnings from sqlite3_log()
	100	SQLITE_ROW          // sqlite3_step() has another row ready
	101	SQLITE_DONE         // sqlite3_step() has finished executing
	1	SQLITE_INTEGER  
	2	SQLITE_FLOAT    
	3	SQLITE_TEXT    
	4	SQLITE_BLOB     
	5	SQLITE_NULL     
	0   SQLITE_STATIC
	-1  SQLITE_TRANSIENT
	0x00000001	SQLITE_OPEN_READONLY           // Ok for sqlite3_open_v2()
	0x00000002	SQLITE_OPEN_READWRITE          // Ok for sqlite3_open_v2()
	0x00000004	SQLITE_OPEN_CREATE             // Ok for sqlite3_open_v2()
	0x00000008	SQLITE_OPEN_DELETEONCLOSE      // VFS only
	0x00000010	SQLITE_OPEN_EXCLUSIVE          // VFS only
	0x00000020	SQLITE_OPEN_AUTOPROXY          // VFS only
	0x00000040	SQLITE_OPEN_URI                // Ok for sqlite3_open_v2()
	0x00000080	SQLITE_OPEN_MEMORY             // Ok for sqlite3_open_v2()
	0x00000100	SQLITE_OPEN_MAIN_DB            // VFS only
	0x00000200	SQLITE_OPEN_TEMP_DB            // VFS only
	0x00000400	SQLITE_OPEN_TRANSIENT_DB       // VFS only
	0x00000800	SQLITE_OPEN_MAIN_JOURNAL       // VFS only
	0x00001000	SQLITE_OPEN_TEMP_JOURNAL       // VFS only
	0x00002000	SQLITE_OPEN_SUBJOURNAL         // VFS only
	0x00004000	SQLITE_OPEN_MASTER_JOURNAL     // VFS only
	0x00008000	SQLITE_OPEN_NOMUTEX            // Ok for sqlite3_open_v2()
	0x00010000	SQLITE_OPEN_FULLMUTEX          // Ok for sqlite3_open_v2()
	0x00020000	SQLITE_OPEN_SHAREDCACHE        // Ok for sqlite3_open_v2()
	0x00040000	SQLITE_OPEN_PRIVATECACHE       // Ok for sqlite3_open_v2()
	0x00080000	SQLITE_OPEN_WAL                // VFS only

:global
:dlls tools\sqlite3.dll
	int		sqlite3_open(uint name, uint&out db)|sqlite3_open
	int		sqlite3_open_v2(uint name, uint&out db, int flags, uint vfs=0)|sqlite3_open_v2
	int		sqlite3_close(uint db)|sqlite3_close
	int		sqlite3_close_v2(uint db)|sqlite3_close_v2
	int		sqlite3_errcode(uint db)|sqlite3_errcode
	int		sqlite3_extended_errcode(uint db)|sqlite3_extended_errcode
	uint	sqlite3_errmsg16(uint db)|sqlite3_errmsg16
	int		sqlite3_exec(uint db, uint utf8text, uint cb=0, uint cbarg=0, uint&out errmsg=void)|sqlite3_exec
	int		sqlite3_prepare16_v2(uint db, uint zSql, int nByte, uint&out stmt, uint&out pzTail=void)|sqlite3_prepare16_v2
	uint	sqlite3_db_handle(uint stmt)|sqlite3_db_handle
	int		sqlite3_step(uint stmt)|sqlite3_step
	int		sqlite3_reset(uint stmt)|sqlite3_reset
	int		sqlite3_finalize(uint stmt)|sqlite3_finalize
	int		sqlite3_changes(uint db)|sqlite3_changes
	int		sqlite3_total_changes(uint db)|sqlite3_total_changes
	int64	sqlite3_last_insert_rowid(uint db)|sqlite3_last_insert_rowid
	int		sqlite3_column_count(uint stmt)|sqlite3_column_count
	uint	sqlite3_column_name16(uint stmt, int nColumn)|sqlite3_column_name16
	uint	sqlite3_column_blob(uint stmt, int iCol)|sqlite3_column_blob
	int		sqlite3_column_bytes(uint stmt, int iCol)|sqlite3_column_bytes
	int		sqlite3_column_bytes16(uint stmt, int iCol)|sqlite3_column_bytes16
	double	sqlite3_column_double(uint stmt, int iCol)|sqlite3_column_double
	int		sqlite3_column_int(uint stmt, int iCol)|sqlite3_column_int
	int64	sqlite3_column_int64(uint stmt, int iCol)|sqlite3_column_int64
	uint	sqlite3_column_text(uint stmt, int iCol)|sqlite3_column_text
	uint	sqlite3_column_text16(uint stmt, int iCol)|sqlite3_column_text16
	int		sqlite3_column_type(uint stmt, int iCol)|sqlite3_column_type
	int		sqlite3_clear_bindings(uint stmt)|sqlite3_clear_bindings
	int		sqlite3_bind_parameter_count(uint stmt)|sqlite3_bind_parameter_count
	int		sqlite3_bind_parameter_index(uint stmt, uint utf8Name)|sqlite3_bind_parameter_index
	uint	sqlite3_bind_parameter_name(uint stmt, int)|sqlite3_bind_parameter_name
	int		sqlite3_bind_blob(uint stmt, int, uint data, int n, int destr=SQLITE_TRANSIENT)|sqlite3_bind_blob
	int		sqlite3_bind_double(uint stmt, int, double)|sqlite3_bind_double
	int		sqlite3_bind_int(uint stmt, int, int)|sqlite3_bind_int
	int		sqlite3_bind_int64(uint stmt, int, int64)|sqlite3_bind_int64
	int		sqlite3_bind_null(uint stmt, int)|sqlite3_bind_null
	int		sqlite3_bind_text(uint stmt,int,uint text,int nLen, int destr=SQLITE_TRANSIEN)|sqlite3_bind_text
	int		sqlite3_bind_text16(uint stmt, int, uint text, int nLen, int destr=SQLITE_TRANSIEN)|sqlite3_bind_text16

:struct SqliteTransactionGuard
:props
	uint db
	bool success
:meths
	void ctor(uint _db)
	{
		obj.db = _db;
		obj.success = false;
		sqlite3_exec(_db, "begin".toUtf8().ptr);
	}
	---
	void dtor()
	{
		sqlite3_exec(obj.db, (obj.success ? "commit" : "rollback").toUtf8().ptr);
	}
	---

