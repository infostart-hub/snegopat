/* com_debug.as
    Реализация работы с отладчиком 1С
*/
#pragma once
#include "../../all.h"

// Описание свойства результата вычисления отладочного выражения
class IDebugEvalProp {
    string _name;       // Имя свойства
    string _value;      // Значение свойства
    int _typeCode;      // Код типа
    string _type;       // Название типа
    bool _expandable;   // Можно развернуть дальше
};

// Результат вычисления отладочного выражения
class IDebugEvalResult {
    bool _sucessed;         // Вычислено успешно
    string _value;          // Значение
    int _typeCode;          // Код типа
    string _type;           // Название типа
    int _propCount;         // Количество свойств
    // Получить свойство
    IDebugEvalProp&& prop(int idx) {
        return null;
    }
};

class IDebugEventReceiver {
    void onEvent(const Guid&in eventID, long val, IUnknown& obj) {
        uint _obj = 0;
        IExternalCalculatorDebugger&& cd;
        if (obj !is null) {
            _obj = obj.self;
            &&cd = obj;
        }
        doLog("Debug event " + eventID + " val=" + val + " obj=" + _obj + (cd is null ? " no calc" : " have calc"));
        //DebugBreak();
    }
};

TrapVirtualStdCall trSetCalc;
void IExternalCalculatorOwner_setExternalCalculatorTrap(IExternalCalculatorOwner& pThis, IUnknown& calc) {
    Print("Set calc");
    IExternalCalculatorDebugger&& ed = calc;
    if (ed is null) {
        Print("No debug calc");
    } else
        Print("Has debug calc");
    trSetCalc.swap();
    pThis.setExternalCalculator(calc);
    trSetCalc.swap();
}

// Работа с отладчиком 1С
class IV8Debugger {
    IV8Debugger() {
        IEventService&& es = getEventService();
        IUnknown&& recv = AStoIUnknown(IDebugEventReceiver(), IID_IEventRecipient);
        es.subscribe(kExecutionStateEvent, recv);
        es.subscribe(kExecutionStateMediumOpen, recv);
        es.subscribe(kExecutionStateMediumClose, recv);
        es.subscribe(kRestartApplication, recv);
        es.subscribe(kDebuggerAppWaitStart, recv);
        es.subscribe(kDebuggerAppWaitStop, recv);
        es.subscribe(kDebuggerGetDebugProcessMode, recv);
        es.subscribe(kDebuggerStopDebugMode, recv);
        es.subscribe(kSomeEvent3, recv);
        es.subscribe(kSomeEvent6, recv);

        IDebugService&& serv = currentProcess().getService(IID_IDebugService);
        IUnknown&& u = serv.getDebugger();
        if (u !is null)
            Print("Debugger=" + mem::dword[u.self]);
        else
            Print("No debugger");
        dumpVtable(&&u, "dbg");

        IUnknown&& unk;
        currentProcess().createByClsid(CLSID_Watch, IID_IUnknown, unk);
        if (unk is null) {
            Print("No watch");
        } else
            Print("Has watch vt=" + mem::dword[unk.self]);
        IExternalCalculatorOwner&& eo;
        if (eo !is null) {
            Print("Has eo");
            trSetCalc.setTrap(&&eo, IExternalCalculatorOwner_setExternalCalculator, IExternalCalculatorOwner_setExternalCalculatorTrap);
        } else
            Print("No eo");
    }
    // Вычислить отладочное вырадение
    IDebugEvalResult&& eval(const string& expression) {
        Vector vec;
        vec.allock(1, 4);
        mem::dword[vec.start] = 0;
        ICalcValueCreator&& cv;
        currentProcess().createByClsid(CalcValueCreator, IID_ICalcValueCreator, cv);
        IUnknown&& uk;
        cv.create(uk, expression);
        /*
        IExecutionStateMediumInStreamPtr answer = extCalc->calculateBig(vec, uk, 0x2800);

        IDebugParserPtr dp;
        current_process()->create_object<DebugParser>(dp);
        IPersistableObjectPtr po(dp);
        po->deserialize(answer->getInStorage());
        *ret = new DebugEvalResult(dp);
        return S_OK;
        */
        return null;
    }
};

/*
DECLARE_SCOM_INTERFACE(IExternalCalculator, "B18EF1A3-E1F1-46F3-9DB0-5942CC08D511")
class IExternalCalculator : public IUnknown
{
public: // Interface members
/**
* @brief - проверяет на синтаксис и вычисляет арифметическое выражение
* @param - strIn - входная строка с арифметическим выражением
* @param GenericValue& value - ссылка для сохранения результатов вычислений
* @exception - при ошибке ипускает CalculatorException
* @see  CalculatorException
virtual void SCOM_API calculate(const wstring& strIn, Value& value, int) = 0;
};

:iface IExternalCalculatorDebugger{1A7E4120 - 9F11 - 43C5 - AF53 - F0ED888D86C9} public IExternalCalculator
{
public:

    * @brief - проверяет на синтаксис и вычисляет арифметическое выражение
    * @param - strVector - вектор с входными строками для вычисления выражения
    * @param GenericValue& value - ссылка для сохранения результатов вычислений
    * @exception - при ошибке ипускает CalculatorException
    * @see  CalculatorException
    virtual IExecutionStateMediumInStreamPtr SCOM_API calculateBig(stlp_std::vector<int>& vShow, IUnknown* p1, int flag = 0x2800) = 0;
*/
/*
.rdata:1C2E7C08 stru_1C2E7C08 dd 2F0E7819h                            ; Data1
.rdata:1C2E7C08                                         ; DATA XREF: getService_1C2E7C08+16B6o
.rdata:1C2E7C08 dw 1F4Bh                                ; Data2
.rdata:1C2E7C08 dw 478Fh                                ; Data3
.rdata:1C2E7C08 db 0A8h, 0Fh, 5Fh, 9Eh, 3, 73h, 98h, 4Ch; Data4

DebugTarget + 0x28
stru_1C2E6ED4 dd 1B12F4A6h                            ; Data1
.rdata:1C2E6ED4                                         ; DATA XREF: sub_1C22DFB0+31o
.rdata:1C2E6ED4                                         ; .rdata:1C2F1FC4o
.rdata:1C2E6ED4 dw 7C8Ah                                ; Data2
.rdata:1C2E6ED4 dw 4C87h                                ; Data3
.rdata:1C2E6ED4 db 8Ah, 7Fh, 0DDh, 0E4h, 1, 51h, 0, 0B4h; Data4

Сервис, 4 функция выдает IDebugger
stru_1C2D2FE4 dd 8105BA7Ah                            ; Data1
.rdata:1C2D2FE4                                         ; DATA XREF: getService_8105BA7A+1116o
.rdata:1C2D2FE4                                         ; .rdata:off_1C2F37C0o ...
.rdata:1C2D2FE4 dw 0D799h                               ; Data2
.rdata:1C2D2FE4 dw 478Dh                                ; Data3
.rdata:1C2D2FE4 db 0BDh, 0E8h, 3Fh, 84h, 57h, 97h, 0F9h, 21h; Data4

Объект для IExecutionStateMediumOutStream
.rdata:1C2E54A0 stru_1C2E54A0 dd 0BBA53901h                           ; Data1
.rdata:1C2E54A0                                         ; DATA XREF: sub_1C24C280+16o
.rdata:1C2E54A0 dw 5F8Fh                                ; Data2
.rdata:1C2E54A0 dw 4766h                                ; Data3
.rdata:1C2E54A0 db 96h, 0B9h, 0DEh, 14h, 0E5h, 0D3h, 0ECh, 0DEh; Data4

*/