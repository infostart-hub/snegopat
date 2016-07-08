/* com_sqlite.as
Работа с sqlite базами
*/
#pragma once
#include "../../all.h"

// Обработка одного запроса
bool processOneQuery(uint pStmt, Value& result, QueryResultProcessor& qp)
{
    uint cols = sqlite3_column_count(pStmt);
    if (cols > 0) {
        if (qp.needColumns()) {
            array<string> colNames;
            for (uint i = 0; i < cols; i++)
                colNames.insertLast(stringFromAddress(sqlite3_column_name16(pStmt, i)));
            qp.setColumns(colNames);
        }
        Value valOfColumn;
        for (;;) {
            int res = sqlite3_step(pStmt);
            if (SQLITE_ROW == res) {
                AddResultRowAnswers adrow = qp.addResultRow();
                if (adrow == addRowError)
                    return false;
                for (uint i = 0; i < cols; i++) {
                    switch (sqlite3_column_type(pStmt, i)) {
                    case SQLITE_INTEGER:
                        valOfColumn = sqlite3_column_int64(pStmt, i);
                        break;
                    case SQLITE_FLOAT:
                        valOfColumn = sqlite3_column_double(pStmt, i);
                        break;
                    case SQLITE_NULL:
                        valOfColumn.clear();
                        break;
                    default:
                        valOfColumn = stringFromAddress(sqlite3_column_text16(pStmt, i));
                    }
                    qp.setResultValue(i, valOfColumn);
                }
                if (adrow == addRowBreak)
                    break;
            } else if (SQLITE_DONE == res)
                break;
            else
                return false;
        }
    } else if (SQLITE_DONE != sqlite3_step(pStmt))
        return false;
    qp.setAnswer(result, sqlite3_db_handle(pStmt));
    return true;
}

bool processOneQueryAndReset(uint pStmt, Value& result, QueryResultProcessor& qp)
{
    bool res = processOneQuery(pStmt, result, qp);
    sqlite3_reset(pStmt);
    return res;
}

enum AddResultRowAnswers {
    addRowError,
    addRowSuccess,
    addRowBreak
};

// Интерфейс приёмника результата запроса
interface QueryResultProcessor {
    bool needColumns();
    void setColumns(array<string>& colNames);
    AddResultRowAnswers addResultRow();
    void setResultValue(uint col, const Value& val);
    void setAnswer(Value& val, uint db);
};

// Пустой обработчик результата запроса
class EmptyQueryResultProcessor : QueryResultProcessor {
    bool needColumns() { return false; }
    void setColumns(array<string>& colNames) {}
    AddResultRowAnswers addResultRow() { return addRowSuccess; }
    void setResultValue(uint col, const Value& val) {}
    void setAnswer(Value& val, uint db) {}
};

// Обработчик, укладывающий результат в таблицу значений
class ValueTableQueryResultProcessor : QueryResultProcessor {
    IValueTableColumns&& pIValueTable;
    IVTRow&& addedRow;
    bool answerIsID;
    ValueTableQueryResultProcessor(bool aid) { answerIsID = aid; }
    bool needColumns() { return true; }
    void setColumns(array<string>& colNames)
    {
        currentProcess().createByClsid(CLSID_ValueTable, IID_IValueTableColumns, pIValueTable);
        VTColumnInfo info;
        IUnknown&& unk;
        int newId = -1;
        for (uint i = 0, cols = colNames.length; i < cols; i++) {
            // Добавим колонки в источник данных
            string title = colNames[i];
            info.title = title;
            for (uint idx = 0; idx < title.length; idx++) {
                if (!is_name_symbol(title[idx]))
                    title[idx] = '_';
            }
            info.name1 = info.name2 = title;
            pIValueTable.addColumn(unk, info, newId);
            &&unk = null;
        }
    }
    AddResultRowAnswers addResultRow()
    {
        IVTRowRO&& row;
        pIValueTable.addRow(row);
        &&addedRow = cast<IUnknown>(row);
        return addRowSuccess;
    }
    void setResultValue(uint col, const Value& val)
    {
        addedRow.setValueAt(col, val);
    }
    void setAnswer(Value& val, uint db)
    {
        if (pIValueTable is null)
            val = answerIsID ? sqlite3_last_insert_rowid(db) : sqlite3_changes(db);
        else
            val = cast<IValue>(cast<IUnknown>(pIValueTable));
    }
};

// Обработчик, который укладывает первую строку результата запроса в объект Структура
// Названия полей результата запроса становятся названиями свойств структуры
// Недопустимые символы заменяются на '_'
class OneRowQueryResultProcessor : QueryResultProcessor {
    IValueStructure&& valueStruct;
    array<v8string> keys;
    bool needColumns() { return true; }
    void setColumns(array<string>& colNames)
    {
        for (uint i = 0, cols = colNames.length; i < cols; i++) {
            // Добавим колонки в источник данных
            string title = colNames[i];
            for (uint idx = 0; idx < title.length; idx++) {
                if (!is_name_symbol(title[idx]))
                    title[idx] = '_';
            }
            keys.insertLast(title);
        }
    }
    AddResultRowAnswers addResultRow()
    {
        currentProcess().createByClsid(CLSID_ValueStruct, IID_IValueStructure, valueStruct);
        return addRowBreak;
    }
    void setResultValue(uint col, const Value& val)
    {
        valueStruct.set(keys[col], val);
    }
    void setAnswer(Value& val, uint db)
    {
        val = valueStruct is null ? null: cast<IValue>(cast<IUnknown>(valueStruct));
    }
};

// Обработчик, который возвращает как результат первое поле первой строки запроса
class OneValueQueryResultProcessor : QueryResultProcessor {
    Value answer;
    bool needColumns() { return false; }
    void setColumns(array<string>& colNames) {}
    AddResultRowAnswers addResultRow() { return addRowBreak; }
    void setResultValue(uint col, const Value& val)
    {
        if (0 == col)
            answer = val;
    }
    void setAnswer(Value& val, uint db)
    {
        val = answer;
    }
};

// Класс обёртка для работы с базой данных sqlite
class SqliteBase {
    uint _db;
    SqliteBase(uint db)
    {
        _db = db;
    }
    // Выполнить один запрос или несколько запросов, разделённых ';'
    // Возвращает результат выполнения последнего из запросов.
    // Если третьим параметром передан Массив, то добавляет к нему результат выполнения каждого из запросов
    // Результатом выполнения запроса считается:
    // - для select запросов:
    //  ТаблицаЗначений, в которую укладываются полученные строки
    //  Колонки ТЗ соответствуют полям запроса. В идентификаторах колонок все недопустимые символы
    //  заменяются на '_', а заголовки колонок совпадают с названиями полей запроса
    // - для остальных запросов: если answerIsID false, то количество обработанных строк, иначе lastInsertRowID
    Variant exec(const string& strQuery, bool answerIsID = false, Variant resArray = 0)
    {
        Value val;
        var2val(resArray, val);
        IValueArray&& resultArray = cast<IUnknown>(val.pValue);
        int count = 0;
        if (resultArray !is null)
            count = resultArray.count();
        uint pSqlText = strQuery.cstr;
        uint pStmt;
        for (uint iQuery = 1;;iQuery++) {
            if (SQLITE_OK != sqlite3_prepare16_v2(_db, pSqlText, -1, pStmt, pSqlText)) {
                setComException("Ошибка в запросе № " + iQuery + ": " + get_lastError());
                break;
            }
            bool isLastQuery = pSqlText == 0 || mem::word[pSqlText] == 0;
            val.clear();
            bool res = processOneQuery(pStmt, val, resultArray is null && !isLastQuery ? cast<QueryResultProcessor>(EmptyQueryResultProcessor()) : ValueTableQueryResultProcessor(answerIsID));
            sqlite3_finalize(pStmt);
            if (!res)
                setComException(get_lastError());
            if (resultArray !is null)
                resultArray.insertAt(count++, val);
            if (isLastQuery)
                break;
        }
        Variant result;
        val2var(val, result);
        return result;
    }
    // Получить описание ошибки
    string get_lastError()
    {
        return stringFromAddress(sqlite3_errmsg16(_db));
    }
    // Закрыть базу данных
    void close()
    {
        sqlite3_close_v2(_db);
        _db = 0;
    }
    // Подготовить один запрос
    SqliteQuery&& prepare(const string& strQuery)
    {
        uint pSqlText = strQuery.cstr;
        uint pStmt;
        if (SQLITE_OK != sqlite3_prepare16_v2(_db, pSqlText, -1, pStmt, pSqlText)) {
            setComException(get_lastError());
            return null;
        }
        return SqliteQuery(pStmt);
    }
    // Возвращает количество строк, обработанных непосредственно последним запросом
    uint changes()
    {
        return sqlite3_changes(_db);
    }
    // Возвращает общее количество строк, обработанных при выполнении последнего запроса, учитывая различные триггеры
    uint totalChanges()
    {
        return sqlite3_total_changes(_db);
    }
    // Возвращает rowid последней добавленной строки
    uint lastInsertedID()
    {
        return sqlite3_last_insert_rowid(_db);
    }
};

// Класс для выполнения подготовленного запроса
class SqliteQuery {
    uint _stmt;
    SqliteQuery(uint s)
    {
        _stmt = s;
    }
    // Установить параметр по имени или номеру
    SqliteQuery&& bind(Variant idx, Variant val)
    {
        Value vidx, vval;
        var2val(idx, vidx);
        var2val(val, vval);
        int idxOfParam = 0;
        int tk = vidx.pValue.getType().getTypeKind();
        if (tk == tkString) {
            v8string nameOfParam;
            vidx.getString(nameOfParam);
            idxOfParam = sqlite3_bind_parameter_index(_stmt, nameOfParam.str.toUtf8().ptr);
        } else {
            Numeric num;
            vidx.getNumeric(num);
            idxOfParam = num;
        }
        if (0 == idxOfParam || idxOfParam > sqlite3_bind_parameter_count(_stmt))
            setComException("Неправильный индекс");
        
        tk = vval.pValue.getType().getTypeKind();

        int res;
        switch (tk) {
        case tkNull:
        case tkUndefined:
            res = sqlite3_bind_null(_stmt, idxOfParam);
            break;
        case tkBoolean:
            {
                bool v;
                vval.getBoolean(v);
                res = sqlite3_bind_int(_stmt, idxOfParam, v ? 1 : 0);
            }
            break;
        case tkNumeric:
            {
                Numeric num;
                vval.getNumeric(num);
                uint len, prec;
                num.lengthAndPrecision(len, prec);
                if (prec == 0)
                    res = sqlite3_bind_int64(_stmt, idxOfParam, num);
                else
                    res = sqlite3_bind_double(_stmt, idxOfParam, num);
            }
            break;
        default:
            {
                v8string text;
                vval.getString(text);
                res = sqlite3_bind_text16(_stmt, idxOfParam, text.cstr, text.length * 2, SQLITE_TRANSIENT);
            }
        }
        if (SQLITE_OK != res)
            setComException(stringFromAddress(sqlite3_errmsg16(sqlite3_db_handle(_stmt))));
        return this;
    }
    // Выполнить запрос. Возвращаемое значение, как в SqliteBase::exec
    Variant exec(bool isAnswerID = false)
    {
        Variant var;
        Value val;
        if (processOneQueryAndReset(_stmt, val, ValueTableQueryResultProcessor(isAnswerID)))
            val2var(val, var);
        else
            setComException(stringFromAddress(sqlite3_errmsg16(sqlite3_db_handle(_stmt))));
        return var;
    }
    // Выполняет запрос и возвращает первую строку результата в виде объекта Структура
    Variant queryRow()
    {
        Variant var;
        Value val;
        if (processOneQueryAndReset(_stmt, val, OneRowQueryResultProcessor()))
            val2var(val, var);
        else
            setComException(stringFromAddress(sqlite3_errmsg16(sqlite3_db_handle(_stmt))));
        return var;
    }
    // Выполняет запрос и возвращает первое поле первой строки результата запроса
    Variant queryValue()
    {
        Variant var;
        Value val;
        if (processOneQueryAndReset(_stmt, val, OneValueQueryResultProcessor()))
            val2var(val, var);
        else
            setComException(stringFromAddress(sqlite3_errmsg16(sqlite3_db_handle(_stmt))));
        return var;
    }
	void close()
	{
		sqlite3_finalize(_stmt);
		_stmt = 0;
	}
};

/*
Тестировалось:
var db = sqliteOpen(snMainFolder + "test.db")
Message("Exec=" + db.exec("create table if not exists test(t1, t2);insert into test values(1, 2)", true))
db.prepare("select *, lower(@p2) from test").bind("@p2", "Вася").exec().ВыбратьСтроку()
Message(db.prepare("select lower(@p2)").bind("@p2", "Вася").queryValue())
Message("row=" + db.prepare("select * from test limit 1").queryRow().t2)

var db = sqliteOpen();
var res = v8new("Массив");
db.exec("create table test(t1, t2);insert into test values(1, 2);insert into test values(3, 4);select * from test", true, res);
Message("res1=" + res.get(0) + " res2=" + res.get(1) + " res3=" + res.get(2));
res.get(3).ВыбратьСтроку();


Полнотекстовый поиск
var db = sqliteOpen(":memory:")
db.exec(
"create virtual table if not exists search using fts4(tokenize=unicode61);" +
"insert into search values('Зима, крестянин торжествуя, на дровнях обновляет путь.');" +
"select rowid, * from search where content match 'зи* дро*'"
).ВыбратьСтроку();
*/
