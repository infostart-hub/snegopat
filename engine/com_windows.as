/* com_windows.as
    Работы из аддинов с окнами 1С.
*/
// Данные строки нужны только для среды разработки и вырезаются препроцессором
#pragma once
#include "../../all.h"


IDispatch&& dspWindows;

// Реализация объекта windows. Пока частичная.
class IV8Windows {
    IV8Windows() {
        &&dspWindows = createDispatchFromAS(&&this);
        // Инициализируем перехваты
        setTrapOnChangeTitle();
        setTrapOnMsgBox();
        setTrapOnMessage();
        idleHandlers.insertLast(clearViewMap);
    }
    // Основное окно
    IV8View&& get_mainView() {
        return mdiView.parent;
    }
    // Контейнер MDI-окон
    IV8View&& get_mdiView() {
        return getViewWrapper(gMDIClientID);
    }
    // Текущий модальный режим
    ModalStates get_modalMode() {
        //dumpVtable(getBkEndUI());
        return getBkEndUI().currentModalState();
    }
    // Заголовок основного окна
    string get_caption() {
        if (mainFrame !is null) {
            IWindow&& w = mainFrame.unk;
            if (w !is null) {
                HWND hWnd = w.hwnd();
                int len = GetWindowTextLength(hWnd);
                string res;
                GetWindowText(hWnd, res.setLength(len), len + 1);
                return res;
            }
        }
        return string();
    }
    void set_caption(const string& str) {
        if (mainFrame !is null) {
            IWindow&& wnd = mainFrame.unk;
            if (wnd !is null)
                SetWindowText(wnd.hwnd(), str.cstr);
        }
    }
    // Основная часть заголовка
    string get_mainTitle() {
        string res;
        if (mainFrame !is null)
            res = mainFrame.getTitle();
        return res;
    }
    void set_mainTitle(const string& str) {
        if (mainFrame !is null)
            mainFrame.setTitle(str);
    }
    // Дополнительная часть заголовка
    string get_additionalTitle() {
        string res;
        if (mainFrame !is null)
            res = mainFrame.getAdditionalTitle();
        return res;
    }
    void set_additionalTitle(const string& str) {
        if (mainFrame !is null)
            mainFrame.setAdditionalTitle(str);
    }
    // Видимость окна свойств
    bool get_propsVisible() {
        IPropertyService&& props = currentProcess().getService(IID_IPropertyService);
        return props.isPropWndVisible();
    }
    void set_propsVisible(bool bVisible) {
        IPropertyService&& props = currentProcess().getService(IID_IPropertyService);
        props.showPropWnd(bVisible);
    }
    //Активное отображение
    IV8View&& getActiveView() {
        return frameView(ActiveViewInCoreFrame);
    }
    // Отображение в фокусе
    IV8View&& getFocusedView() {
        return frameView(FocusedViewInCoreFrame);
    }
    // Данный метод позволяет получить текущий текст из поля ввода на форме,
    // не дожидаясь перехода фокуса из поля.
    // На вход надо подать ЭУ (Форма.ЭлементыФормы.ИмяКонтрола)
    string getInputFieldText(const Variant& ctrl) {
        v8string res;
        Value val;
        var2val(ctrl, val);
        if (val.pValue !is null) {
            IControlContext&& ctx = val.pValue.unk;
            if (ctx !is null) {
                IUnknown&& unk;
                ctx.getControl(unk, IID_IFldEdit);
                if (unk !is null) {
                    IDataControl&& dc = unk;
                    if (unk !is null) {
                        dc.getValue(val);
                        val.getString(res);
                    }
                }
            }
        }
        return res;
    }
};

IV8View&& frameView(uint offset) {
    ITopLevelFrameCore&& tlc = coreMainFrame.unk;
    int addrOfViewCont = mem::dword[tlc.self + offset];
    if (addrOfViewCont > 0) {
        ViewContextRef&& pCont = toViewContext(addrOfViewCont + ViewContextInView);
        return getViewWrapper(pCont.ref.id);
    }
    return null;

}

enum ViewContainerType {
    vctNo = 0,
    vctTabbed = 1,
    vctTwoViewsHorz = 2,
    vctTwoViewsVert = 3,
    vctMdiContainer = 4,
    vctUnknown = 5
};


NoCaseMap<IV8View&&> viewWrappers;
IV8View&& getViewWrapper(const Guid& id) {
    string strId = id;
    auto find = viewWrappers.find(strId);
    if (!find.isEnd())
        return find.value;
    IV8View v(id);
    viewWrappers.insert(strId, v);
    return v;
}

void clearViewMap() {
    array<string> removed;
    for (auto it = viewWrappers.begin(); it++;) {
        if (!it.value.isAlive())
            removed.insertLast(it.key);
    }
    for (uint i = 0, im = removed.length; i < im; i++)
        viewWrappers.remove(removed[i]);
}

IMDObject&& getMdObjFromView(IFramedView&& view) {
    IDocumentView&& dv = view.unk;
    if (dv !is null) {
        IDocument&& doc;
        dv.document(doc);
        IConfigMngrUI&& ui = doc.unk;
        if (ui is null) {
            IConfigMngrUIOwner&& ow = doc.unk;
            if (ow !is null)
                &&ui = ow.getUI();
        }
        if (ui !is null)
            return ui.getMDCont();
        else {
            if (doc.getConfigMode()) {
                IConnectionPointContainer&& pCont = doc.unk;
                if (pCont !is null) {
                    IUnknown&& pCP;
                    if (0 == pCont.FindConnectionPoint(IID_IDocumentSink, pCP) && pCP !is null) {
                        uint pdata = mem::dword[pCP.self + 4];
                        uint size = mem::dword[pCP.self + 8];
                        for (uint i = 0; i < size; i++) {
                            DocSinkRef&& pSink = toDocSink(mem::dword[pdata + i * 4]);
                            if (pSink !is null && pSink.ref.refCount < 10) {
                                IMDEditHelper&& eh = pSink.ref.editHelper;
                                if (eh !is null)
                                    return eh.getMDObj();
                            }
                        }
                    }
                }
            }
        }
    } else {
        // Проверить на форму редактирования объекта метаданных
        IEventRecipient&& er = view.unk;
        ICommandTarget&& ct = view.unk;
        if (er !is null && ct !is null && er.self < view.self && ct.request(CommandID(cmdFrameGroup, cmdFindInTree))) {
            IMDObject&& obj = toIUnknown(mem::dword[er.self + 32]);
            obj.AddRef();
            return obj;
        }
    }
    return null;
}


Guid getMdPropIDFromView(IFramedView&& view) {
    IDocumentView&& dv = view.unk;
    if (dv !is null) {
        IDocument&& doc;
        dv.document(doc);
        if (doc.getConfigMode()) {
            IConnectionPointContainer&& pCont = doc.unk;
            if (pCont !is null) {
                IUnknown&& pCP;
                if (0 == pCont.FindConnectionPoint(IID_IDocumentSink, pCP) && pCP !is null) {
                    uint pdata = mem::dword[pCP.self + 4];
                    uint size = mem::dword[pCP.self + 8];
                    for (uint i = 0; i < size; i++) {
                        DocSinkRef&& pSink = toDocSink(mem::dword[pdata + i * 4]);
                        if (pSink !is null && pSink.ref.refCount < 10) {
                            IMDEditHelper&& eh = pSink.ref.editHelper;
                            if (eh !is null)
                                return pSink.ref.propId;
                        }
                    }
                }
            }
        }
    }
    return IID_NULL;
}

// Реализация объекта представления окна.
class IV8View {
    Guid __id;
    IV8View(const Guid& i) {
        __id = i;
    }
    IFramedView&& _getView(bool throwComError = true) {
        IFramedView&& view;
        mainFrame.getView(view, __id);
        if (view is null && throwComError)
            setComException("Отображение уже не существует");
        return view;
    }
    bool isAlive() {
        return _getView(false) !is null;
    }
    string get_id() {
        return __id;
    }
    string get_title() {
        IFramedView&& v = _getView();
        return v is null ? string() : v.title().str;
    }
    uint get_hwnd() {
        IFramedView&& v = _getView();
        if (v !is null) {
            IWindowView&& wv = v.unk;
            if (wv !is null)
                return wv.hwnd();
            IWindow&& wnd = v.unk;
            if (wnd !is null)
                return wnd.hwnd();
        }
        return 0;
    }
    IV8ViewPosition&& position() {
        IFramedView&& v = _getView();
        if (v is null)
            return null;
        IContainedObject&& co = v.unk;
        if (co is null)
            return null;
        IFramedViewSite&& site = cast<IUnknown>(co.getSite());
        if (co is null)
            return null;
        IV8ViewPosition vp;
        site.getViewPosition(vp.vp);
        return vp;
    }
    IV8View&& get_parent() {
        IFramedView&& v = _getView();
        if (v !is null) {
            Guid pid;
            if (getViewParentID(v, pid))
                return getViewWrapper(pid);
        }
        return null;
    }
    array<IV8View&&>&& enumChilds() {
        IFramedView&& v = _getView();
        if (v is null)
            return null;
        array<IV8View&&> result;
        IViewLayouter&& vl = v.unk;
        if (vl !is null) {
            // Пробуем простые частные случаи
            ITabbedLayouter&& tabs = vl.unk;
            Guid newID;
            if (tabs !is null) {
                uint count = tabs.pagesCount();
                result.reserve(count);
                for (uint i = 0; i < count; i++) {
                    tabs.page(i).getID(newID);
                    result.insertLast(getViewWrapper(newID));
                }
            } else {
                IViewSplitter&& vs = vl.unk;
                if (vs !is null) {
                    IFramedView&& view = vs.first();
                    if (view !is null) {
                        view.getID(newID);
                        result.insertLast(getViewWrapper(newID));
                    }
                    &&view = vs.second();
                    if (view !is null) {
                        view.getID(newID);
                        result.insertLast(getViewWrapper(newID));
                    }
                } else {
                    IMDIClient&& mdi = vl.unk;
                    if (mdi !is null) {
                        if (mdi.childsIds.start > 0) {
                            for (GuidRef&& ids = toGuid(mdi.childsIds.start); ids < mdi.childsIds.end; &&ids = ids + 1)
                                result.insertAt(0, getViewWrapper(ids.ref));
                        }
                    } else {
                        // Неизвестный контейнер. Переберем всех потомков.
                        // Так как нам нужны только непосредственные потомки, для каждого
                        // потомка будем получать родителя, пока он не станет равным заданному
                        NoCaseSet ids;
                        ViewContextList views;
                        views.head = views.end = views.self;
                        vl.enumAllChilds(views, true);
                        ViewContextListNodeRef&& pNode = toViewContextListNode(views.head);
                        while (pNode.self != views.self) {
                            IViewContext&& pContext = pNode.ref.view;
                            do {
                                IFramedView&& parentView = getViewContext(pContext).ref.parent;
                                parentView.getID(newID);
                                if (__id != newID) {
                                    IContainedObject&& co = parentView.unk;
                                    &&pContext = cast<IUnknown>(co.getSite());
                                    continue;
                                }
                            } while (false);
                            pContext.getID(newID);
                            string snewID = newID;
                            if (!ids.contains(snewID)) {
                                result.insertLast(getViewWrapper(newID));
                                ids.insert(snewID);
                            }
                            uint del = pNode.self;
                            &&pNode = toViewContextListNode(pNode.ref.next);
                            free(del);
                        }
                    }
                }
            }
        }
        return result;
    }
    void merge(IV8View&& other, ViewPlacements place) {
        IFramedView&& v = _getView();
        if (v is null)
            return;
        IFramedView&& vo = other._getView();
        if (vo is null)
            return;
        IContainedObject&& co = v.unk;
        if (co !is null) {
            IFramedViewSite&& site = cast<IUnknown>(co.getSite());
            if (site !is null && site.canSplit())
                site.split(vo, place, true, -1);
        }
    }
    ViewContainerType get_isContainer() {
        IFramedView&& view = _getView();
        if (view !is null) {
            IViewLayouter&& vl = view.unk;
            if (vl !is null) {
                ITabbedLayouter&& tabs = view.unk;
                if (tabs !is null)
                    return vctTabbed;
                else {
                    IViewSplitter&& vs = view.unk;
                    if (vs !is null)
                        return vs.isHorizontal() ? vctTwoViewsHorz : vctTwoViewsVert;
                    else {
                        IMDIClient&& mdi = view.unk;
                        if (mdi !is null)
                            return vctMdiContainer;
                        else
                            return vctUnknown;
                    }
                }
            }
        }
        return vctNo;
    }
    string get_wndClass() {
        string result;
        uint hWnd = get_hwnd();
        if (hWnd > 0)
            result.setLength(GetClassName(hWnd, result.setLength(300), 300));
        return result;
    }
    bool get_visible() {
        return mainFrame.isViewVisible(__id);
    }
    void set_visible(bool vis) {
        mainFrame.showView(__id, vis);
    }
    IV8View&& get_activeChild() {
        IFramedView&& view = _getView();
        if (view is null)
            return null;
        IViewLayouter&& vl = view.unk;
        if (vl !is null) {
            Guid newID;
            &&view = vl.activeView();
            if (view !is null) {
                view.getID(newID);
                return getViewWrapper(newID);
            } else {
                ICommandTarget&& at;
                vl.activeTarget(at);
                if (at !is null) {
                    IViewContext&& vc = at.unk;
                    if (vc !is null) {
                        vc.getID(newID);
                        return getViewWrapper(newID);
                    } else {
                        &&view = at.unk;
                        if (view !is null) {
                            view.getID(newID);
                            return getViewWrapper(newID);
                        }
                    }
                }
            }
        }
        return null;
    }
    void activate() {
        mainFrame.activateView(__id);
    }
    void close(bool forceClose = false) {
        mainFrame.closeView(__id, forceClose);
    }
    ICmdUpdateResult&& getCmdState(string cmdGroupUUID, uint cmdNumber, int subCommandIdx = -1) {
        IFramedView&& view = _getView();
        if (view !is null) {
            ICommandReceiver&& recv = view.unk;
            if (recv !is null)
                return getCommandStateRecv(CommandID(Guid(cmdGroupUUID), cmdNumber), subCommandIdx, recv);
        }
        return null;
    }
    bool sendCommand(string cmdGroupUUID, uint cmdNumber, int subCommandIdx = 0) {
        IFramedView&& view = _getView();
        if (view !is null) {
            ICommandReceiver&& recv = view.unk;
            return sendCommandToCmdRecv(CommandID(Guid(cmdGroupUUID), cmdNumber), subCommandIdx, recv);
        }
        return false;
    }
    IViewDocument&& getDocument() {
        IFramedView&& view = _getView();
        if (view !is null) {
            IDocumentView&& w = view.unk;
            if (w !is null) {
                IDocument&& doc;
                w.document(doc);
                return getDocWrapper(doc);
            }
        }
        return null;
    }
    Variant getObject() {
        Variant res;
        IFramedView&& view = _getView();
        if (view !is null) {
            IDocumentView&& w = view.unk;
            if (w !is null) {
                IDocument&& doc;
                w.document(doc);
                if (doc !is null) {
                    Value val;
                    &&val.pValue = doc.unk;
                    if (val.pValue !is null)
                        val2var(val, res);
                }
            }
        }
        return res;
    }
    IV8Form&& getInternalForm() {
		IFramedView&& view = _getView();
		if (view !is null) {
			IForm&& form = view.unk;
			if (form !is null)
				return IV8Form(form);
		}
		return null;
    }
    protected Variant pict;
    Variant get_icon() {
        IFramedView&& view = _getView();
        if (view !is null) {
            if (pict.vt == VT_EMPTY) {
                IUnknown&& unk;
                view.icon(unk);
                pict = image2pict(unk);
            }
        }
        return pict;
    }
    protected IV8MDObject&& myMdObj;
    IV8MDObject&& get_mdObj() {
        IFramedView&& view = _getView();
        if (view is null)
            return null;
        if (myMdObj is null)
            &&myMdObj = getMDObjectWrapper(getMdObjFromView(view));
        return myMdObj;
    }
    protected IV8MDProperty&& myMdProp;
    IV8MDProperty&& get_mdProp() {
        IFramedView&& view = _getView();
        if (view is null)
            return null;
        if (myMdProp is null)
            &&myMdProp = getMDPropWrapper(mdService.mdProp(getMdPropIDFromView(view)));
        return myMdProp;
    }
};

ViewContextRef&& getViewContext(IViewContext&& ctx) {
    return toViewContext(ctx.self + ViewContextOffset);
}

bool getViewParentID(IFramedView&& view, Guid& pid) {
    IFramedView&& parent = frameViewParent(view);
    if (parent !is null) {
        parent.getID(pid);
        return true;
    }
    return false;
}

IFramedView&& frameViewParent(IFramedView&& view) {
    IContainedObject&& co = view.unk;
    if (co !is null) {
        IViewContext&& ctx = cast<IUnknown>(co.getSite());
        if (ctx !is null) {
            IFramedView&& object = cast<IUnknown>(getViewContext(ctx).ref.parent);
            return object;
        }
    }
    return null;
}

class IV8ViewPosition {
    ViewPosition vp;
}

IViewDocument&& getDocWrapper(IDocument&& d) {
    return IViewDocument(d);
}

class IViewDocument {
    protected IDocument&& doc;
    IViewDocument(IDocument&& d) {
        &&doc = d;
    }
};

////////////////////////////////////////////////////////////////////////////////
// Перехват и оповещение о смене заголовка основного окна
void setTrapOnChangeTitle() {
    trMainFrame_setTitle.setTrap(coreMainFrame, ITopLevelFrame_setTitle, MainFrame_setTitle);
    trMainFrame_setAddTitle.setTrap(coreMainFrame, ITopLevelFrame_setAdditionalTitle, MainFrame_setAdditionalTitle);
}
TrapVirtualStdCall trMainFrame_setTitle;
TrapVirtualStdCall trMainFrame_setAddTitle;
funcdef void MainFrame_st(ITopLevelFrame&, const v8string&in);

void MainFrame_setTitle(ITopLevelFrame&frame, const v8string&in str) {
    if (!fireFrameTitleChanged(str, frame.getAdditionalTitle())) {
        MainFrame_st&& original;
        trMainFrame_setTitle.getOriginal(&&original);
        original(frame, str);
    }
}

void MainFrame_setAdditionalTitle(ITopLevelFrame&frame, const v8string&in str) {
    if (!fireFrameTitleChanged(frame.getTitle(), str)) {
        MainFrame_st&& original;
        trMainFrame_setAddTitle.getOriginal(&&original);
        original(frame, str);
    }
}

// Оповещение о событии изменения заголовка основного окна.
bool fireFrameTitleChanged(const string&in mainTitle, const string&in additionalTitle) {
    ISetMainTitleHook param;
    param._mainTitle = mainTitle;
    param._additionalTitle = additionalTitle;
    array<Variant> args(1);
    args[0].setDispatch(createDispatchFromAS(&&param));
    oneDesigner._events.fireEvent(dspWindows, "onChangeTitles", args);
    return param.cancel;
}

// Объект с параметрами оповещения об изменении заголовка основного окна.
// Подписчик может сам изменить заголовок окна через windows.caption, и установить
// cancel в true, чтобы отменить штатную обработку события
class ISetMainTitleHook {
    //[propget, helpstring("Основной заголовок")]
    string _mainTitle;
    //[propget, helpstring("Дополнительный заголовок")]
    string _additionalTitle;
    //[propget, helpstring("Отказ")]
    bool cancel = false;
};

//////////////////////////////////////////////////////////////////////////////////////////////////////
// Перехват и оповещение о предупреждении
TrapVirtualStdCall trMsgBox;
void setTrapOnMsgBox() {
    trMsgBox.setTrap(getBkEndUI(), IBkEndUI_messageBox, msgBoxTrap);
}

int msgBoxTrap(IBkEndUI& pUI, const v8string& text, uint type, uint timeout, uint caption, uint parent, mbp&inout param,
               int i1, int i2, int i3
#if ver >= 8.3
               , int i4, int i5
#endif
               ) {
    // Для начала снимем перехват. Тогда обработчики события смогут также вызывать MsgBox без зацикливания
    trMsgBox.swap();
    if (oneDesigner._events._hasHandlers(dspWindows, "onMessageBox")) {
        // Если есть подписанты, оповестим их
        IMsgBoxHook params;
        params._text = text;
        params._caption = stringFromAddress(caption);
        params._type = type;
        params._timeout = timeout;
        array<Variant> args(1);
        args[0].setDispatch(createDispatchFromAS(&&params));
        oneDesigner._events.fireEvent(dspWindows, "onMessageBox", args);
        if (params.cancel) {
            // Подписанты отменили показ предупреждения.
            // Восстановим перехват
            trMsgBox.swap();
            return params.result;
        }
    }
    // Вызовем штатную процедуру
    int res = pUI.messageBox(text, type, timeout, caption, parent, param, i1, i2, i3
#if ver >= 8.3
                   , i4, i5
#endif
                   );
    // Восстановим перехват
    trMsgBox.swap();
    return res;
}
// Объект с параметрами оповещения о Предупреждении
class IMsgBoxHook {
    //[propget, helpstring("Заголовок")]
    string _caption;
    //[propget, helpstring("Текст")]
    string _text;
    //[propget, helpstring("Тип (см. MsgBoxStyles)")]
    uint _type;
    //[propget, helpstring("Таймаут")]
    uint _timeout;
    //[propget, helpstring("Отказ")]
    bool cancel = false;
    //[propget, helpstring("Результат при отказе")]
    MsgBoxAnswers result;
};

////////////////////////////////////////////////////////////////////////////////////
// Перехват и оповещение о Сообщить
void setTrapOnMessage() {
    trMessage.setTrap(getBkEndUI(), IBkEndUI_doMsgLine, doMsgLineTrap);
}

TrapVirtualStdCall trMessage;

int doMsgLineTrap(IBkEndUI& pUI, const v8string&in text, MessageMarker marker, const Guid&in g, int i1, IUnknown& pUnkObject, const V8Picture&in customMarker) {
    // Для начала снимем перехват. Тогда обработчики события смогут также вызывать Message без зацикливания
    trMessage.swap();
    if (oneDesigner._events._hasHandlers(dspWindows, "onMessage")) {
        // Если есть подписанты, оповестим их
        IMessageParams params;
        params._text = text;
        params._marker = marker;
        array<Variant> args(1);
        args[0].setDispatch(createDispatchFromAS(&&params));
        oneDesigner._events.fireEvent(dspWindows, "onMessage", args);
        if (params.cancel) {
            // Подписанты отменили показ предупреждения.
            // Восстановим перехват
            trMessage.swap();
            return 0;
        }
    }
    // Вызовем штатную процедуру
    int res = pUI.doMsgLine(text, marker, g, i1, pUnkObject, customMarker);
    // Восстановим перехват
    trMessage.swap();
    return res;
}

class IMessageParams {
    string _text;
    MessageMarker _marker;
    bool cancel = false;
};
