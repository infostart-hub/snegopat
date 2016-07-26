// mainframe.as
/*
  Тут часть кода, работающая с основным окном
*/
#pragma once
#include "../../all.h"

void initWorkWithMainFrame() {
    getEventService().subscribe(eventCreateFrame, AStoIUnknown(EventTopLevelFrame(), IID_IEventRecipient));
}

ITopLevelFrame&& mainFrame;
ITopLevelFrame&& coreMainFrame;

class EventTopLevelFrame {
    void onEvent(const Guid&in eventID, long val, IUnknown& obj) {
        ITopLevelFrame&& frame = obj;
        if (frame !is null) {
            if (mainFrame is null) {
                if (frame.frameType() == eTLFT_Main) {
                    &&mainFrame = frame;
                    mainFrame.getCoreTopLevelFrame(coreMainFrame);
                    // Создаем подписчика на уведомления о простое
                    getIdleService().addIdleHandler(AStoIUnknown(IdleHandler(), IID_IIdleHandler));
                    // Инициализируем пакеты.
                    initPackets(piOnMainWindow);
                }
            }
        }
    }
};

// Класс-приемник информации о состоянии команды, для реализации ICommandState
class MyCommandState {
    CommandIDRef&& _idc;
    int p;
    bool bEnable;
    bool bChecked;
    string text;
    string descr;
    string tooltip;

    MyCommandState() {
        p = 0;
        bEnable = bChecked = false;
    }
    uint id() { return _idc.self;}
    int param(){return p;}
    uint object(uint i) {
        mem::dword[i] = 0;
        return i;
    }
    void enable(bool enable) { bEnable = enable; }
    void setCheck(bool check){ bChecked = check; }
    void setText(const v8string& str) { text = str; }
    void u1(uint u) {}
    void setDescription(const v8string& str) { descr = str; }
    void setTooltipText(const v8string& str) { tooltip = str; }
    void u2(uint u){}
    void t1(){}
    void t2(){}
    void t3(){}
    void t4(){}
    void t5(){}
};

class MyCommandStateList {
    uint count = 0;
    void setCount(uint c) {
        //Message("Set cmd list count " + c);
        count = c;
    }
};

class CommandState {
    MyCommandState cmdState;
    MyCommandStateList lstState;
    ICmdSateImpl&& allState;

    CommandState(const CommandID& id, bool withList) {
        currentProcess().createByClsid(CLSID_CmdStateImpl, IID_ICmdSateImpl, allState);
        allState.setCommand(id, AStoIUnknown(&&cmdState, IID_ICommandState));
        if (withList)
            &&allState.lstState = AStoIUnknown(&&lstState, IID_IListCmdState);
    }
};

// Флаги обработки состояния команды
enum stateFlags {
    cmdStateHandler = 1,    // имеется обработчик команды
    cmdStateEnabled = 2,    // команда доступна
    cmdStateChecked = 4,    // команда помечена
};

uint commandState(const CommandID& cmd, int subCommand = -1) {
    CommandState&& st = getMainFrameCommandState(cmd);
    if (st !is null)
        return cmdStateHandler | (!st.cmdState.bEnable ? 0 : cmdStateEnabled) | (!st.cmdState.bChecked ? 0 : cmdStateChecked);
    return 0;
}

CommandState&& getMainFrameCommandState(const CommandID& cmd, int subCommand = -1) {
    //Message("Get state of " + cmd.group + " - " + cmd.num + " sc=" + subCommand);
    if (coreMainFrame !is null) {
        ICommandReceiver&& cmdReceiver = coreMainFrame.unk;
        return getCommandState(cmd, subCommand, cmdReceiver);
    }
    return null;
}

CommandState&& getCommandState(const CommandID& cmd, int subCommand, ICommandReceiver&& cmdReceiver) {
    if (cmdReceiver !is null && cmdReceiver.hasHandler(cmd)) {
        CommandState st(cmd, subCommand == -1);
		st.cmdState.p = subCommand;
        cmdReceiver.updateState(cast<IUnknown>(st.allState));
        return st;
    }
    return null;
}

bool sendCommandToCmdRecv(const CommandID& cmd, int subCommandIdx, ICommandReceiver&& pCmdRcv) {
    if (pCmdRcv !is null) {
        if (pCmdRcv.hasHandler(cmd)) {
            pCmdRcv.transmitCommand(Command(cmd, subCommandIdx));
            return true;
        }
    }
    return false;
}

bool sendCommandToMainFrame(const CommandID& cmd, int subCommandIdx = 0) {
    //Message("Send " + cmd.group + " - " + cmd.num + " sc=" + subCommandIdx);
    if (coreMainFrame !is null) {
        ICommandReceiver&& pCmdRcv = coreMainFrame.unk;
        return sendCommandToCmdRecv(cmd, subCommandIdx, pCmdRcv);
    }
    return false;
}

array<PVV&&> idleHandlers;
array<PVV&&> idleHandlersSingle;
class IdleHandler {
    bool first = true;
    bool onIdle(int count) {
        if (first) {
            first = false;
            initPackets(piOnFirstIdle);
        }
        for (uint i = 0, im = idleHandlers.length; i < im; i++)
            idleHandlers[i]();
        uint im = idleHandlersSingle.length;
        for (uint i = 0; i < im; i++) {
            idleHandlersSingle[0]();
            idleHandlersSingle.removeAt(0);
        }
        return false;
    }
    int unknown() {
        return idleHandlerUnknownFuncAnswer;
    }
};
