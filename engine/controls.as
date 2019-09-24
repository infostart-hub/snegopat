/*
controls.as
Перехват модальных окон, работа с формами и контролами
*/
// Данные строки нужны только для среды разработки и вырезаются препроцессором
#pragma once
#include "../../all.h"

Packet piSetTrapOnDoModal("trapDoModal", setTrapOnDoModal, piOnMainWindow);

class IExtControl {};

class IV8Control {
    private IForm&& form;
    private uint ctrlId;

    IV8Control(IForm&& o, uint id) {
        &&form = o;
        ctrlId = id;
    }

    void _detach() {
        &&form = null;
        &&ext = null;
    }

    Variant get_value() {
        Variant ret;
        if (form !is null) {
            Value val;
            IGrid&& gr;
            form.getControl(gr, ctrlId, IID_IGrid);
            if (gr !is null) {
                IUnknown&& ds = gr.getDataSource();
                IValue&& ids = ds;
                if (ids !is null) {
                    &&val.pValue = ids;
                    val2var(val, ret);
                }
            } else {
                IDataControl&& dc;
                form.getControl(dc, ctrlId, IID_IDataControl);
                if (dc !is null) {
                    dc.getValue(val);
                    val2var(val, ret);
                }
            }
        }
        return ret;
    }
    void set_value(Variant newVal) {
        if (form is null)
            return;
        Value val;
        var2val(newVal, val);
        // Проверим на грид
        IV8DataSource&& ds = val.pValue.unk;
        if (ds !is null) {
            IGrid&& gr;
            form.getControl(gr, ctrlId, IID_IGrid);
            if (gr !is null) {
                gr.setDataSource(ds);
                return;
            }
        }

        IDataControl&& dc;
        form.getControl(dc, ctrlId, IID_IDataControl);
        if (dc is null) {
            setComException("Элемент управления не поддерживает установку значения");
            return;
        }

        IDataControlEx&& dex = dc.unk;
        if (dex !is null) {
            if (val.pValue !is null) {
                IType&& type = val.pValue.getType();
                if (type !is null) {
                    TypeDomainPattern tdp;
                    tdp.addType(type.getClsid());
                    dex.setTypeDomain(tdp);
                }
            }
        }
        dc.setValue(val);
    }
    uint get_id() {
        return ctrlId;
    }
    string get_name() {
        if (form !is null) {
            IFormCtrl&& fc;
            form.getControl(fc, ctrlId, IID_IFormCtrl);
            if (fc !is null)
                return fc.getCode();
        }
        return "";
    }
    int get_hwnd() {
        if (form !is null) {
            IWindowView&& fc;
            form.getControl(fc, ctrlId, IID_IWindowView);
            if (fc !is null)
                return fc.hwnd();
        }
        return 0;
    }
    private IExtControl&& ext;
    IExtControl&& get_extInterface() {
        if (ext is null && form !is null) {
            IGrid&& grd;
            form.getControl(grd, ctrlId, IID_IGrid);
            if (grd !is null)
                &&ext = IGridCtrl(grd);
        }
        return ext;
    }
    IObjectProperties&& get_props() {
        return null;
    }
};

class IV8Form {
    private IForm&& form;
    private UintMap<IV8Control&&> ctrls;
    IV8Control&& _getControl(uint ctrlId) {
        auto find = ctrls.find(ctrlId);
        if (!find.isEnd())
            return find.value;
        IV8Control control(form, ctrlId);
        ctrls.insert(ctrlId, control);
        return control;
    }

    IV8Form(IForm&& f) {
        &&form = f;
    }

    void detach() {
        &&form = null;
        for (auto it = ctrls.begin(); !it.isEnd(); it++)
            it.value._detach();
    }
    uint get_controlsCount() {
        if (form is null) {
            setComException("Форма не установлена");
            return 0;
        }
        return form.controlsCount();
    }
    IV8Control&& getControl(Variant IdxOrCode) {
        if (form is null) {
            setComException("Форма не установлена");
            return null;
        }
        uint ctrlCount = form.controlsCount();
        uint ctrlID = uint(-1);
        if (IdxOrCode.vt == VT_BSTR) {
            string name = stringFromAddress(IdxOrCode.dword);
            if (!name.isEmpty()) {
                for (uint i = 0; i < ctrlCount; i++) {
                    uint idc = form.getControlID(i);
                    IFormCtrl&& fctrl;
                    form.getControl(fctrl, idc, IID_IFormCtrl);
                    if (fctrl !is null && name == fctrl.getCode().str) {
                        ctrlID = idc;
                        break;
                    }
                }
            }
        } else {
            if (IdxOrCode.vt != VT_UI4)
                IdxOrCode.changeType(VT_UI4);
            if (IdxOrCode.vt == VT_UI4) {
                if (IdxOrCode.dword < ctrlCount)
                    ctrlID = form.getControlID(IdxOrCode.dword);
                else if (uint(-1) == IdxOrCode.dword)
                    ctrlID = 0;
            }
        }
        if (uint(-1) == ctrlID) {
            setComException("Элемент управления не найден");
            return null;
        }
        return _getControl(ctrlID);
    }
    bool get_trapDialogEvents() {
        return false;
    }
    void put_trapDialogEvents(bool newVal) {
        setComException("Не реализовано");
    }
    void sendEvent(uint ctrlID, uint eventID, array<Variant>& args) {
        IFormDialog&& fdp = form.unk;
        if (fdp !is null) {
            ValueParamsVector vargs(args.length);
            for (uint i = 0; i < args.length; i++)
                var2val(args[i], vargs.values[i]);
            fdp.processEvents(ctrlID, eventID, vargs.args);
        }
    }
    ICmdUpdateResult&& getCmdState(string cmdGroupUUID, uint cmdNumber, Variant subCommandIdx = -1) {
        IFormDialog&& cmdRecv = form.unk;
        if (cmdRecv !is null) {
            CommandID cmdID(Guid(cmdGroupUUID), cmdNumber);
            if (subCommandIdx.vt != VT_I4)
                subCommandIdx.changeType(VT_I4);
            CommandState st(cmdID, subCommandIdx.dword == uint(-1));
            st.cmdState.p = subCommandIdx.dword;
            if (cmdRecv.requestCommand(cmdID)) {
                cmdRecv.onQueryCommandStatus(cast<IUnknown>(st.allState));
                return ICmdUpdateResult(st);
            }
        }
        return null;
    }
    bool sendCommand(string cmdGroupUUID, uint cmdNumber, uint subCommandIdx=-1) {
        IFormDialog&& cmdRecv = form.unk;
        if (cmdRecv !is null) {
            CommandID command(Guid(cmdGroupUUID), cmdNumber);
            Command cmd(command, subCommandIdx);
            if (cmdRecv.requestCommand(command)) {
                cmdRecv.onExecuteCommand(cmd);
                return true;
            }
        }
        return false;
    }
    ICmdUpdateResult&& getCtrlCmdState(uint ctrlID, string cmdGroupUUID, uint cmdNumber, Variant subCommandIdx = -1) {
        IFormDialog&& cmdRecv = form.unk;
        if (cmdRecv !is null) {
            CommandID cmdID(Guid(cmdGroupUUID), cmdNumber);
            if (subCommandIdx.vt != VT_I4)
                subCommandIdx.changeType(VT_I4);
            CommandState st(cmdID, subCommandIdx.dword == uint(-1));
            st.cmdState.p = subCommandIdx.dword;
            if (cmdRecv.requestControlCommand(ctrlID, cmdID)) {
                cmdRecv.onQueryControlCommandStatus(ctrlID, cast<IUnknown>(st.allState));
                return ICmdUpdateResult(st);
            }
        }
        return null;
    }
    bool sendCtrlCommand(uint ctrlID, string cmdGroupUUID, uint cmdNumber, uint subCommandIdx) {
        IFormDialog&& cmdRecv = form.unk;
        if (cmdRecv !is null) {
            CommandID command(Guid(cmdGroupUUID), cmdNumber);
            Command cmd(command, subCommandIdx);
            if (cmdRecv.requestControlCommand(ctrlID, command)) {
                cmdRecv.onExecuteControlCommand(ctrlID, cmd);
                return true;
            }
        }
        return false;
    }
    IV8Control&& get_activeControl() {
        uint ai = form.getActiveControlId();
        if (ai != uint(-1))
            return _getControl(ai);
        return null;
    }
    void set_activeControl(IV8Control&& val) {
        form.activateControl(val.get_id());
        IWindowView&& wnd;
        form.getControl(wnd, val.get_id(), IID_IWindowView);
        if (wnd !is null)
            SetFocus(wnd.hwnd());
    }
};

// Реализация перехвата открытия модальных окон

funcdef bool POnInitialUpdate(IFramedView&);
funcdef void POnFinalOpen(IFramedView&);

class DoModalPatchedTables {
    int_ptr vtableCopy;
    int_ptr realVtable;
    TrapVirtualStdCall trInitialUpdate;
    TrapVirtualStdCall trFinalOpen;
    POnInitialUpdate&& real_iu;
    POnFinalOpen&& real_fo;
};
UintMap<DoModalPatchedTables> mapFramedViewVTablesToPatches;

class ModalDialogInfo {
    DoModalPatchedTables&& originals;
    IDoModalHook&& object;
};
UintMap<ModalDialogInfo&&> mapDialogsToInfo;

// Перехват открытия модальных диалогов
TrapVirtualStdCall trDoModal1;
TrapVirtualStdCall trDoModal2;

enum DoModalHookStages {
    beforeDoModal = 0,
    openModalWnd = 1,
    afterDoModal = 2,
    afterInitial = 3
};

class IDoModalHook {
    private IFramedView&& view;
    private IV8Form&& _form;
    IDoModalHook(IFramedView&& v) {
        &&view = v;
    }
    string get_caption() {
        return view.title();
    }
    IV8Form&& get_form() {
        if (_form is null) {
            IForm&& f = view.unk;
            if (f !is null)
                &&_form = IV8Form(f);
        }
        return _form;
    }
    bool cancel = false;
    int result = 0;
    DoModalHookStages _stage = beforeDoModal;
    void _reset() {
        if (_form !is null) {
            _form.detach();
            &&_form = null;
        }
        &&view = null;
    }
};

bool onFrameViewInitialUpdate_trap(IFramedView& pView) {
    //Print("Trap initial update");
    ModalDialogInfo&& info = mapDialogsToInfo.find(pView.self).value;
    if (!info.originals.real_iu(pView))
        return false;
    info.object._stage = afterInitial;
    array<Variant> args(1);
    args[0].setDispatch(createDispatchFromAS(&&info.object));
    oneDesigner._events.fireEvent(dspWindows, "onDoModal", args);
    return !info.object.cancel;
}

void onFrameViewFinalOpen_trap(IFramedView& pView) {
    //Print("Trap final open");
    ModalDialogInfo&& info = mapDialogsToInfo.find(pView.self).value;
    info.originals.real_fo(pView);
    info.object._stage = openModalWnd;
    array<Variant> args(1);
    args[0].setDispatch(createDispatchFromAS(&&info.object));
    oneDesigner._events.fireEvent(dspWindows, "onDoModal", args);
    // Если отменили, то закроем диалог
    if (info.object.cancel) {
        IFormViewCore&& fp = pView.unk;
        if (fp !is null) {
            fp.updateData(true, -1);
            fp.endDialog(info.object.result);
        }
    }
}

// Функция направляет view на копию vtable, в которой перехвачены два метода.
// для каждого типа создаётся своя копия vtable, запоминая оригинальные адреса
// этих методов.
DoModalPatchedTables&& findPatchedTable(IFramedView& view) {
    DoModalPatchedTables&& patch = null;
    uint pVtable = mem::dword[view.self];	// Получим адрес vtable этого view
    auto fnd = mapFramedViewVTablesToPatches.find(pVtable); // поищем его в уже патченных
    if (fnd.isEnd()) {
        // эту таблицу еще не патчили. Создадим её копию.
        &&patch = DoModalPatchedTables();
        patch.realVtable = pVtable;	// запомним адрес настоящей vtable
        patch.vtableCopy = malloc(30 * sizeof_ptr);	// там не больше 30 функций
        mem::memcpy(patch.vtableCopy, pVtable, 30 * sizeof_ptr);		// скопируем vtable
        mem::int_ptr[view.self] = patch.vtableCopy;			// направим view на копию vtable
        // и перехватим два метода в ней
        patch.trInitialUpdate.setTrap(&&view, IFramedView_onInitialUpdate, onFrameViewInitialUpdate_trap);
        patch.trInitialUpdate.getOriginal(&&patch.real_iu);
        patch.trFinalOpen.setTrap(&&view, IFramedView_onFinalOpen, onFrameViewFinalOpen_trap);
        patch.trFinalOpen.getOriginal(&&patch.real_fo);
        // запомним эту vtable, что для неё уже есть патченная копия
        mapFramedViewVTablesToPatches.insert(pVtable, patch);
    } else
        &&patch = fnd.value;	// для этой vtable уже есть патченная копия
    // направим view на копию
    mem::int_ptr[view.self] = patch.vtableCopy;
    return patch;
}

/* Перехват функций, вызываемых для показа модальных диалогов.
Таких функций две. Для некоторых диалогов вызывается сразу вторая функция,
для некоторых - сначала первая, а из неё - вторая.
Перехватим обе. В первой функции сначала сгенерим событие onDoModal с
состоянием beforeDoModal.
Если кто-то из обработчиков отменил показ диалога - оригинальную функцию не вызываем,
сразу возвращаем результат, установленный обработчиком. В противном случае изменяем
у view указатель на vtable, поменяв его на копию vtable, в которой перехвачены
две функции - onInitialUpdate и onFinalOpen. Сам view заносим в список.
Во второй функции предварительно ищем view в списке - если он там есть, значит,
его вызов был через первую функцию, событие не генерим. Иначе всё как в первой функции.
После в обеих функциях вызываем оригинальные методы. При возврате бросаем событие
с флагом afterDoModal, убираем view из списка.
*/

bool generateModalEvent(IFramedView&& pView, int& result, bool& bCreated) {
    if (oneDesigner is null)
        initAddins();
    bCreated = false;
    // ищем view в списке. Если он уже там, значит, beforeDoModal для него уже вызывали,
    auto fnd = mapDialogsToInfo.find(pView.self);
    if (!fnd.isEnd())
        return true;	// и надо просто вызвать оригинальный метод
    // Если обработчиков нет, зачем что-то делать?
    if (!oneDesigner._events._hasHandlers(dspWindows, "onDoModal"))
        return true;
    // Создаем объект для события
    IDoModalHook hookInfo(pView);
    array<Variant> args(1);
    args[0].setDispatch(createDispatchFromAS(&&hookInfo));
    // вызываем событие
    oneDesigner._events.fireEvent(dspWindows, "onDoModal", args);
    // Если показ диалога отменили, то возврат
    if (hookInfo.cancel) {
        // инициируем чтение данных из контролов диалога в его данные
        IFormViewCore&& fp = pView.unk;
        if (fp !is null)
            fp.updateData(true, -1);
        result = hookInfo.result;
        hookInfo._reset();
        return false;	// оригинал вызывать не надо
    }
    bCreated = true;			// сигнализируем, что добавили view в список
    ModalDialogInfo info;
    &&info.object = hookInfo;	// запоминаем объект для события
    &&info.originals = findPatchedTable(pView);	// Находим нужную для view патченную vtable, запоминаем оригинал
    mapDialogsToInfo.insert(pView.self, info);	// запоминаем view
    return true;	// вызвать оригинал
}

// После закрытия модального диалога
void afterModal(IFramedView& pView, int result) {
    // найдём сохраненные в списке данные для этого view
    ModalDialogInfo&& info = mapDialogsToInfo.find(pView.self).value;
    // бросим событие
    info.object._stage = afterDoModal;
    info.object.result = result;
    array<Variant> args(1);
    args[0].setDispatch(createDispatchFromAS(&&info.object));
    oneDesigner._events.fireEvent(dspWindows, "onDoModal", args);
    // удалим view из списка
    mapDialogsToInfo.remove(pView.self);
    info.object._reset();
    // у view восстановим оригинальную vtable
    mem::int_ptr[pView.self] = info.originals.realVtable;
}


#if ver < 8.3.4
funcdef int DoModal1Func(IBkEndUI&, IFramedView&, int, int, int, int, int, int, int, int);
int doModal1_trap(IBkEndUI& pThis, IFramedView& pView, int i1, int i2, int i3, int i4, int i5, int i6, int i7, int i8) {
#else
funcdef int DoModal1Func(IBkEndUI&, IFramedView&, int, int, int, int, int, int, int, int, int);
int doModal1_trap(IBkEndUI& pThis, IFramedView& pView, int i1, int i2, int i3, int i4, int i5, int i6, int i7, int i8, int i9) {
#endif
    //Print("Do modal 1");
    int result = 0;
    bool bCreated = false;
    if (!generateModalEvent(pView, result, bCreated))
        return result;	// обработчики события отменили показ
    // вызываем оригинал
    DoModal1Func&& orig;
    trDoModal1.getOriginal(&&orig);
#if ver < 8.3.4
    result = orig(pThis, pView, i1, i2, i3, i4, i5, i6, i7, i8);
#else
    result = orig(pThis, pView, i1, i2, i3, i4, i5, i6, i7, i8, i9);
#endif
    // если мы добавляли в список, удалим
    if (bCreated)
        afterModal(pView, result);
    return result;
}

#if ver < 8.3.4
funcdef int DoModal2Func(IBkEndUI&, IFramedView&, int, int, int, int, int, int, int);
int doModal2_trap(IBkEndUI& pThis, IFramedView& pView, int i1, int i2, int i3, int i4, int i5, int i6, int i7) {
#else
funcdef int DoModal2Func(IBkEndUI&, IFramedView&, int, int, int, int, int, int, int, int);
int doModal2_trap(IBkEndUI& pThis, IFramedView& pView, int i1, int i2, int i3, int i4, int i5, int i6, int i7, int i8) {
#endif
    //Print("Do modal 2");
    int result = 0;
    bool bCreated = false;
    if (!generateModalEvent(pView, result, bCreated))
        return result;	// обработчики события отменили показ
    // вызываем оригинал
    DoModal2Func&& orig;
    trDoModal2.getOriginal(&&orig);
#if ver < 8.3.4
    result = orig(pThis, pView, i1, i2, i3, i4, i5, i6, i7);
#else
    result = orig(pThis, pView, i1, i2, i3, i4, i5, i6, i7, i8);
#endif
    // если мы добавляли в список, удалим
    if (bCreated)
        afterModal(pView, result);
    return result;
}

bool setTrapOnDoModal() {
    IBkEndUI&& ui = getBkEndUI();
    trDoModal1.setTrap(&&ui, IBkEndUI_doModal1, doModal1_trap);
    trDoModal2.setTrap(&&ui, IBkEndUI_doModal2, doModal2_trap);
    //dumpVtable(&&ui);
    return true;
}
