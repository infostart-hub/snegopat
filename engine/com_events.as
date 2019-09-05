/* com_events.as
    Реализует объект events из SnegAPI.
*/
// Данные строки нужны только для среды разработки и вырезаются препроцессором
#pragma once
#include "../../all.h"

class IEventConnector {
    IEventConnector() {
        setCmdTrap();
    }
    //[helpstring("Подключить обработчик события")]
    HandlerNode&& connect(IDispatch&& pSource, const string& eventName, IDispatch&& handler, string handlerName = "") {
        if (pSource is null || handler is null || eventName.isEmpty())
            return null;
        if (handlerName.isEmpty())
            handlerName = eventName;
        HandlerNode hn(handler, handlerName);
        getEventNode(pSource, eventName, true).handlers.insertLast(hn);
        return hn;
    }
    //[helpstring("Отключить обработчик события")]
    void disconnect(IDispatch&& pSource, const string& eventName, IDispatch&& handler, string handlerName = "") {
        if (pSource is null || handler is null || eventName.isEmpty())
            return;
        if (handlerName.isEmpty())
            handlerName = eventName;
        disconnectImpl(pSource, eventName, handler, handlerName);
    }
    void disconnectNode(HandlerNode&& node) {
        node._removed = true;
        if (fireEventEnters == 0)
            deleteRemoved();
        else
            hasRemovedNodes = true;
    }
    //[vararg, helpstring("Вызвать событие")]
    void fireEvent(IDispatch&& pSource, const string& eventName, array<Variant>&& args) {
        EventNode&& pNode = getEventNode(pSource, eventName);
        if (pNode !is null) {
            fireEventEnters++;
            for (uint k = 0; k < pNode.handlers.length; k++) {
                HandlerNode&& pHN = pNode.handlers[k];
                if (pHN._removed)
                    continue;
                int id;
                if (pHN.nameOfHandler == "-")
                    id = 0;
                else if (!pHN.handler.findMember(pHN.nameOfHandler, id))
                    continue;
                args.insertAt(0, Variant(createDispatchFromAS(&&pHN)));
                Variant res;
                //if (pHN.nameOfHandler == "onDoModal") continue; // artbear https://snegopat.ru/forum/viewtopic.php?f=1&t=766&sid=53cb2ca3c71c92165f7f787195f4238a&start=90#p10509
                pHN.handler.call(id, args, res);
            }
            fireEventEnters--;
            if (fireEventEnters == 0 && hasRemovedNodes)
                deleteRemoved();
        }
    }
    //[helpstring("Подключить обработчик команд 1С")]
    HandlerNode&& addCommandHandler(const string& cmdGroupUUID, uint cmdNumber, IDispatch&& handler, string handlerName) {
        if (handler is null || handlerName.isEmpty())
            return null;
        HandlerNode hn(handler, handlerName);
        getEventNode(null, _getCmdEventName(cmdGroupUUID, cmdNumber), true).handlers.insertLast(hn);
        return hn;
    }
    //[helpstring("Отключить обработчик команд 1С")]
    void delCommandHandler(const string& cmdGroupUUID, uint cmdNumber, IDispatch&& handler, string handlerName) {
        if (handler is null || handlerName.isEmpty())
            return;
        disconnectImpl(null, _getCmdEventName(cmdGroupUUID, cmdNumber), handler, handlerName);
    }
    string _getCmdEventName(const string&in uuid, int num) {
        return uuid + "-" + num;
    }
    bool _hasHandlers(IDispatch&& source, const string& eventName) {
        EventNode&& pNode = getEventNode(source, eventName);
        return pNode !is null && pNode.handlers.length > 0;
    }
    void removeMyListeners(IDispatch&& pSource) {
        bool removed = false;
        for (auto it = events.begin(); it++;) {
            array<EventNode&&>&& en = it.value;
            for (uint i = 0, im = en.length; i < im; i++) {
                EventNode&& pNode = en[i];
                if (pNode.pSource is pSource) {
                    removed = true;
                    for (uint k = 0, km = pNode.handlers.length; k < km; k++)
                        pNode.handlers[k]._removed = true;
                }
            }
        }
        if (removed) {
            if (fireEventEnters == 0)
                deleteRemoved();
            else
                hasRemovedNodes = false;
        }
    }
    private NoCaseMap<array<EventNode&&>&&> events;
    private EventNode&& getEventNode(IDispatch&& pSrc, const string& eventName, bool create = false) {
        array<EventNode&&>&& en;
        auto fnd = events.find(eventName);
        if (fnd.isEnd()) {
            if (!create)
                return null;
            &&en = array<EventNode&&>();
            events.insert(eventName, en);
        } else
            &&en = fnd.value;
        for (uint i = 0, im = en.length; i < im; i++) {
            if (en[i].pSource is pSrc)
                return en[i];
        }
        if (!create)
            return null;
        EventNode&& pNewNode = EventNode(pSrc);
        en.insertLast(pNewNode);
        return pNewNode;
    }
    private void disconnectImpl(IDispatch&& pSource, const string& eventName, IDispatch&& handler, string handlerName = "") {
        EventNode&& pNode = getEventNode(pSource, eventName);
        if (pNode !is null) {
            for (uint k = 0, km = pNode.handlers.length; k < km; k++) {
                HandlerNode&& pHN = pNode.handlers[k];
                if (pHN.handler is handler && pHN.nameOfHandler == handlerName) {
                    if (fireEventEnters > 0) {
                        // Идет оповещение о каком-то событии, и ноду удалять нельзя,
                        // чтобы не сбить выборку
                        pHN._removed = hasRemovedNodes = true;
                    } else {
                        pNode.handlers.removeAt(k);
                        if (pNode.handlers.length == 0)
                            deleteRemoved();
                    }
                    break;
                }
            }
        }
    }
    private void deleteRemoved() {
        array<string> removedKeys;
        for (auto it = events.begin(); it++; ) {
            array<EventNode&&>&& en = it.value;
            for (uint i = 0, im = en.length; i < im; i++) {
                EventNode&& pNode = en[i];
                for (uint k = 0, km = pNode.handlers.length; k < km; k++) {
                    if (pNode.handlers[k]._removed) {
                        pNode.handlers.removeAt(k);
                        k--;
                        km--;
                    }
                }
                if (pNode.handlers.length == 0) {
                    en.removeAt(i);
                    i--;
                    im--;
                }
            }
            if (en.length == 0)
                removedKeys.insertLast(it.key);
        }
        for (uint k = 0, km = removedKeys.length; k < km; k++)
            events.remove(removedKeys[k]);
        hasRemovedNodes = false;
    }
    private uint fireEventEnters = 0;
    private bool hasRemovedNodes = false;
};

class HandlerNode {
    HandlerNode(IDispatch&& pHndl, const string& name) {
        &&handler = pHndl;
        nameOfHandler = name;
    }
    IDispatch&& handler;
    string nameOfHandler;
    bool _removed = false;
};

class EventNode {
    EventNode(IDispatch&& pSrc) {
        &&pSource = pSrc;
    }
    IDispatch&& pSource;
    array<HandlerNode&&> handlers;
};

TrapVirtualStdCall trSendCommand;
funcdef void FTransmitCommand(ICommandReceiver&, const Command&, bool);
void transmitCommandTrap(ICommandReceiver& cmdRecv, const CommandRef&& command, bool deactivate) {
    if (oneDesigner._develop.cmdTrace)
        Message("Команда: группа " + command.ref.id.group + " номер " + command.ref.id.num + " Параметр: " + command.ref.param + " obj=" + command.ref.object);
    FTransmitCommand&& original;
    trSendCommand.getOriginal(&&original);
    string eventName = oneDesigner._events._getCmdEventName(command.ref.id.group, command.ref.id.num);
    if (!oneDesigner._events._hasHandlers(null, eventName)) {
        original(cmdRecv, command.ref, deactivate);
        return;
    }
    CmdHandlerParam hp(command.ref);
    array<Variant> args(1);
    args[0].setDispatch(createDispatchFromAS(&&hp));
    oneDesigner._events.fireEvent(null, eventName, args);
    if (!hp.cancel) { // Обработчик не отменил команду
        // Вызовем штатную обработку команды
        original(cmdRecv, command.ref, deactivate);
        // Ещё раз оповестим
        hp._isBefore = false;
        oneDesigner._events.fireEvent(null, eventName, args);
    }
}

void setCmdTrap() {
    if (coreMainFrame !is null) {
        ICommandReceiver&& cmdReceiver = coreMainFrame.unk;
        if (cmdReceiver !is null) {
            trSendCommand.setTrap(&&cmdReceiver, ICommandReceiver_transmitCommand, transmitCommandTrap);
            return;
        }
    }
    Message("Не удалось установить перехват на обработку команд основного окна");
}

class CmdHandlerParam {
    string _groupID;
    uint _cmdNumber;
    int _cmdParam;
    bool _isBefore = true;
    bool cancel = false;
    CmdHandlerParam(const Command& cmd) {
        _groupID = cmd.id.group;
        _cmdNumber = cmd.id.num;
        _cmdParam = cmd.param;
    }
};
