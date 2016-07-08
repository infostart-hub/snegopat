// Описание интерфейсов работы с событиями
:iface IEventRecipient {D15F2BB0-BD08-11d3-B950-008048DA0334}
:virt
	void onEvent(const Guid&in eventID, long val, IUnknown& obj)

:service IEventService {EBF766AA-F32C-11D3-9851-008048DA1252}
:virt
	// Рассылка уведомления о событии
	void  notify(const Guid&in eventID, long val=0, IUnknown@ obj=null)
	// Подписка на событие
	void  subscribe(const Guid&in eventID, IEventRecipient@ pRecipient)
	// Отписка от события
	void  unsubscribe(const Guid&in eventID, IEventRecipient@ pRecipient)
:global
:meths
    IEventService@ getEventService()
    {
        return currentProcess().getService(IID_IEventService);
    }
    ---

// Сервис позволяющий подписаться на получение уведомлений о простое программы
:iface IIdleService {6B1FFDD4-36BE-11D4-9859-008048DA1252}
:virt
	+2
    void addIdleHandler(IIdleHandler@ handler)
    void removeIdleHandler(IIdleHandler@ handler)
	+1
	void postEvent(const Guid& id, int val = 0, IUnknown@+ obj=null)
:global
:meths
    IIdleService@ getIdleService()
    {
        return currentProcess().getService(IID_IIdleService);
    }
    ---

// Подписчик на получение уведомлений о простое должен реализовать этот интерфейс.
// unknown должно возвращать 7
:iface IIdleHandler {6B1FFDD6-36BE-11D4-9859-008048DA1252}
:virt
    bool onIdle(int count)
	int unknown()

:enum IdleHandlerAnswer
#if ver <= 8.3.5
	7 idleHandlerUnknownFuncAnswer
#else
	0 idleHandlerUnknownFuncAnswer
#endif

// Интерфейс позволяет отменить закрытие приложения, с возможностью его спрятать
// Приходит в onEvent как obj в событии eventBeforeExitApp
:iface IAppExitCancel {85097440-4AD8-11D6-B231-0050BAE2BC79}
:virt
	void cancelExit(bool hide=false)

:guid eventCreateFrame		{3573FFE0-2FFF-11D5-BF5E-0050BAE2BC79}
:guid eventBeforeExitApp	{18B3F170-4979-11D6-B22B-0050BAE2BC79}
:guid eventExitApp			{18b3f171-4979-11D6-B22B-0050BAE2BC79}
