/* com_commands.as
    Работа с командами из скриптов.
*/
// Данные строки нужны только для среды разработки и вырезаются препроцессором
#pragma once
#include "../../all.h"

class ICmdUpdateResult {
    ICmdUpdateResult(CommandState&& s) {
        &&state = s;
    }
    private CommandState&& state;
    //[propget, helpstring("Доступна")]
    bool get_enabled() {
        return state.cmdState.bEnable;
    }
    //[propget, helpstring("Помечена")]
    bool get_checked() {
        return state.cmdState.bChecked;
    }
    //[propget, helpstring("Текст")]
    string get_text() {
        return state.cmdState.text;
    }
    //[propget, helpstring("Описание")]
    string get_description() {
        return state.cmdState.descr;
    }
    //[propget, helpstring("Тултип")]
    string get_tooltip() {
        return state.cmdState.tooltip;
    }
    //[propget, helpstring("Состав подкоманд")]
    uint get_subCommands() {
        return state.lstState.count;
    }
};

ICmdUpdateResult&& getCommandState(const CommandID& cmd, int subCommand) {
    CommandState&& st = getMainFrameCommandState(cmd, subCommand);
    return st !is null ? &&ICmdUpdateResult(st) : null;
}

ICmdUpdateResult&& getCommandStateRecv(const CommandID& cmd, int subCommand, ICommandReceiver&& recv) {
    CommandState&& st = getCommandState(cmd, subCommand, recv);
    return st !is null ? &&ICmdUpdateResult(st) : null;
}

class CommandService {
    
    CommandDescription&& getCommandDescription(string groupUuid, uint number) {
        ICommandService&& pCmdServ = currentProcess().getService(IID_ICommandService);
        CommandID id(Guid(groupUuid), number);
        ICmdDescription&& descr;
        pCmdServ.commandDescription(descr, id);
        if (descr !is null) {
            CommandDescription cd;
            &&cd.__cmdDescr = descr;
            return cd;
        }
        return null;
    }
    /*
    string groupPresentation(string groupID) {
        ICommandService&& pCmdServ = currentProcess().getService(IID_ICommandService);
        //dumpVtable(&&pCmdServ);
        return pCmdServ.groupPresentation(Guid(groupID));
    }*/
};

class CommandDescription {
    ICmdDescription&& __cmdDescr;
    string get_group() const {
        CommandID id;
        __cmdDescr.id(id);
        return id.group;
    }
    uint get_num() const {
        CommandID id;
        __cmdDescr.id(id);
        return id.num;
    }
    string get_text() const { return __cmdDescr.text(); }
    string get_accel() const { return __cmdDescr.accelText(); }
    Variant get_picture() const {
        IImage&& img;
        __cmdDescr.image(img);
        return image2pict(img);
    }
    string get_description() const { return __cmdDescr.description(); }
    string get_tooltip() const { return __cmdDescr.tooltip(); }
    string get_presentation() const { return __cmdDescr.presentation(); }
};
