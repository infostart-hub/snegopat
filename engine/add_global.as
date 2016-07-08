//uname: global
//descr: Подключение глобальных контекстов
//help: inplace
//author: orefkov
/* add_global.as
    Встроенный аддин "global" для подключения известных глобальных контекстов к скриптам
*/
#pragma once
#include "../../all.h"
/*@
Аддин служит для подключения к аддинам-скриптам глобальных контекстов, доступных для создания в
среде Конфигуратора, а также методы и свойства этих контекстов.
Не факт, что все они будут работать в Конфигураторе.
Определить можно только методом научного тыка - проб и ошибок.
В этом аддине я буду по мере возможностей исследовать эти контексты и подключать их.
Для опробованных и работающих методов/свойств буду ставить "+" перед их названием
Для опробованных и НЕ работающих методов/свойств буду ставить "-" перед их названием
Неопробованные будут как есть.
Для подключения своего скрипта к глобальным контекстам используйте такой код:

    addins.byUniqueName("global").object.connectGlobals(SelfScript);
 
Либо в шапке скрипта пропишите
    
	//addin: global
 
а в первых строках кода

    global.connectGlobals(SelfScript)

После этого в скрипте можно пользоваться этими методами напрямую, например

    f = ЗначениеВСтрокуВнутр(val)

## Подключенные контексты и их методы и свойства

@*/

class AddinGlobal : BuiltinAddin {
    AddinGlobal()
    {
        super("global", "Подключение глобальных контекстов", 0);
    }
    IUnknown&& object()
    {
        if (obj is null)
            &&obj = createDispatchFromAS(&&GlobalAddinObject());
        return obj;
    }
    private IDispatch&& obj;
};
AddinGlobal addGlobal;


class GlobalAddinObject {
    GlobalAddinObject()
    {
        fillArrayOfContextes();
		//oneDesigner._develop.dumpV8typesToDts();
    }
    // небольшой косячок: раньше этим вызовом мог в-принципе воспользоваться любой IDispatch, имеющий
    // метод addNamedItem, а теперь только исключительно объект SelfScript. Если возникнет нужда,
    // надо сделать параметр IDispatch'ем, а возможность вытащить из него объект AngelScript
    // вынести на уровень самого скрипта. Тогда выполнение будет идти по двум вариантам -
    // если из параметра удалось вытащить SelfScript, и если нет.
    void connectGlobals(SelfScript&& ss)
    {
        if (ss is null)
            return;
        for (uint i = 0, im = globalContextes.length; i < im; i++)
            ss.addNamedItem("gc" + i, globalContextes[i], true);
    }
    private array<IDispatch&&> globalContextes;
    private void addGC(const string& g)
    {
        globalContextes.insertLast(oneDesigner.globalContext(g).getDispatch());
    }
    private void fillArrayOfContextes()
    {
        //allgc.push(globalContext("{F10C9E4B-49CA-48A8-8363-BE52C25F46BE}"))
        // {F10C9E4B-49CA-48A8-8363-BE52C25F46BE} - 0x25575200 c:\Program Files\1cv82\8.2.11.236\bin\scheme.dll
        // Методы
        // Свойства
        // BusinessProcessRoutePointType / ВидТочкиМаршрутаБизнесПроцесса
        // GraphicalSchemaGridDrawMode / РежимОтрисовкиСеткиГрафическойСхемы
        // ConnectorLineType / ТипСоединительнойЛинии
        // ConnectorTextLocation / ПоложениеТекстаСоединительнойЛинии
        // FitPageMode / РежимРазмещенияНаСтранице
        // GraphicalSchemaItemPictureLocation / ПоложениеКартинкиЭлементаГрафическойСхемы
        // ArrowStyle / СтильСтрелки
        // GraphicalSchemaShapes / ФигурыГрафическойСхемы
        // GraphicalSchemeElementSideType / ТипСтороныЭлементаГрафическойСхемы

        //allgc.push(globalContext("{9D5A8092-A139-4C90-8DE2-234C5DA2DB94}"))
        // {9D5A8092-A139-4C90-8DE2-234C5DA2DB94} - 0x11E1C7E8 c:\Program Files\1cv82\8.2.11.236\bin\chart.dll
        // Методы
        // Свойства
        // ChartType / ТипДиаграммы
        // ChartLabelType / ВидПодписейКДиаграмме
        // ChartLabelLocation / ПоложениеПодписейКДиаграмме
        // ChartOrientation / ОриентацияДиаграммы
        // MaxSeries / МаксимумСерий
        // ChartSpaceMode / РежимПробеловДиаграммы
        // ChartMarkerType / ТипМаркераДиаграммы
        // AutoSeriesSeparation / АвтоРаздвижениеСерий
        // ChartLineType / ТипЛинииДиаграммы
        // RadarChartScaleType / ТипШкалыРадарнойДиаграммы
        // GaugeChartValueRepresentation / ОтображениеЗначенияИзмерительнойДиаграммы
        // GaugeChartValuesScaleLabelsLocation / ПоложениеПодписейШкалыЗначенийИзмерительнойДиаграммы
        // TimeScaleUnitType / ТипЕдиницыШкалыВремени
        // TimeScalePosition / ПоложениеШкалыВремени
        // GanttChartScaleKeeping / ПоддержкаМасштабаДиаграммыГанта
        // TimeScaleDayFormat / ФорматДняШкалыВремени
        // GanttChartIntervalRepresentation / ОтображениеИнтервалаДиаграммыГанта
        // GanttChartVerticalStretch / РастягиваниеПоВертикалиДиаграммыГанта
        // GanttChartValueTextRepresentation / ОтображениеТекстаЗначенияДиаграммыГанта
        // GanttChartLinkType / ТипСвязиДиаграммыГанта
        // PivotChartValuesShowMode / ОтображениеЗначенийСводнойДиаграммы
        // PivotChartScaleKeeping / ПоддержкаМасштабаСводнойДиаграммы
        // PivotChartType / ТипСводнойДиаграммы
        // PivotChartLabelsOrientation / ОриентацияМетокСводнойДиаграммы
        // DendrogramOrientation / ОриентацияДендрограммы
        // DendrogramScaleKeeping / ПоддержкаМасштабаДендрограммы


        //allgc.push(globalContext("{C1380284-4854-45E1-993A-7B8EE6CA381F}"))
        // {C1380284-4854-45E1-993A-7B8EE6CA381F} - 0x62108C10 c:\Program Files\1cv82\8.2.11.236\bin\enums.dll
        // Методы
        // Свойства
        // AccountingRecordType / ВидДвиженияБухгалтерии
        // AccountType / ВидСчета
        // CalculationRegisterPeriodType / ВидПериодаРегистраРасчета
        // ComparisonType / ВидСравнения
        // MessageStatus / СтатусСообщения
        // AccumulationRecordType / ВидДвиженияНакопления
        // AccumulationRegisterAggregateUse / ИспользованиеАгрегатаРегистраНакопления
        // AccumulationRegisterAggregatePeriodicity / ПериодичностьАгрегатаРегистраНакопления
        // DocumentWriteMode / РежимЗаписиДокумента
        // DocumentPostingMode / РежимПроведенияДокумента
        // AutoTimeMode / РежимАвтоВремя
        // AutoTime / АвтоВремя
        // SliceUse / ИспользованиеСреза
        // PostingModeUse / ИспользованиеРежимаПроведения
        // DataLockMode / РежимБлокировкиДанных
        // DataLockControlMode / РежимУправленияБлокировкойДанных
        // TaskListMode / РежимСпискаЗадач
        // ClientConnectionSpeed / СкоростьКлиентскогоСоединения
        // AnalysisDataType / ВидДанныхАнализа
        // ClusterizationMethod / МетодКластеризации
        // DataAnalysisTimeIntervalUnitType / ТипЕдиницыИнтервалаВремениАнализаДанных
        // DataAnalysisResultTableFillType / ТипЗаполненияТаблицыРезультатаАнализаДанных
        // DataAnalysisNumericValueUseType / ТипИспользованияЧисловыхЗначенийАнализаДанных
        // AssociationRulesDataSourceType / ТипИсточникаДанныхПоискаАссоциаций
        // DataAnalysisColumnTypeDecisionTree / ТипКолонкиАнализаДанныхДеревоРешений
        // DataAnalysisColumnTypeClusterization / ТипКолонкиАнализаДанныхКластеризация
        // DataAnalysisColumnTypeSummaryStatistics / ТипКолонкиАнализаДанныхОбщаяСтатистика
        // DataAnalysisColumnTypeAssociationRules / ТипКолонкиАнализаДанныхПоискАссоциаций
        // DataAnalysisColumnTypeSequentialPatterns / ТипКолонкиАнализаДанныхПоискПоследовательностей
        // PredictionModelColumnType / ТипКолонкиМоделиПрогноза
        // DataAnalysisDistanceMetricType / ТипМерыРасстоянияАнализаДанных
        // AssociationRulesPruneType / ТипОтсеченияПравилАссоциации
        // DataAnalysisStandardizationType / ТипСтандартизацииАнализаДанных
        // DecisionTreeSimplificationType / ТипУпрощенияДереваРешений
        // DataAnalysisAssociationRulesOrderType / ТипУпорядочиванияПравилАссоциацииАнализаДанных
        // DataAnalysisSequentialPatternsOrderType / ТипУпорядочиванияШаблоновПоследовательностейАнализаДанных
        // DataAnalysisColumnType / ТипКолонкиАнализаДанных
        // FoldersAndItemsUse / ИспользованиеГруппИЭлементов
        // UpdateOnDataChange / ОбновлениеПриИзмененииДанных
        // LinkedValueChangeMode / РежимИзмененияСвязанногоЗначения
        // BoundaryType / ВидГраницы
        // ResultCompositionMode / РежимКомпоновкиРезультата
        // AutoShowStateMode / РежимАвтоОтображенияСостояния
        // CryptoCertificateIncludeMode / РежимВключенияСертификатовКриптографии
        // CryptoCertificateCheckMode / РежимПроверкиСертификатаКриптографии
        // CryptoCertificateStoreType / ТипХранилищаСертификатовКриптографии
        // CryptoCertificateStorePlacement / РасположениеХранилищаСертификатовКриптографии
        addGC("{D041F9A0-476B-4558-8EFC-D895DC695E72}");
        /*@
		{D041F9A0-476B-4558-8EFC-D895DC695E72}
		0x15B58DC0 c:\Program Files\1cv82\8.2.11.236\bin\frame.dll
         Методы
         Свойства
         +ButtonPictureLocation / ПоложениеКартинкиКнопки
         TitleLocation / ПоложениеЗаголовка
         DateTimeMode / ПредставлениеДаты
         Key / Клавиша
         DialogReturnCode / КодВозвратаДиалога
         CommandBarButtonType / ТипКнопкиКоманднойПанели
         InitialListView / НачальноеОтображениеСписка
         WindowStateVariant / ВариантСостоянияОкна
         WindowDockVariant / ВариантПрикрепленияОкна
         WindowSizeChange / ИзменениеРазмераОкна
         ScrollingTextMode / РежимБегущейСтроки
         Format / Формат
         ListEditMode / СпособРедактированияСписка
         ControlEdge / ГраницаЭлементаУправления
         LabelPictureLocation / ПоложениеКартинкиНадписи
         PanelPictureLocation / ПоложениеКартинкиПанели
         WindowLocationVariant / ВариантПоложенияОкна
         ControlCollapseMode / РежимСверткиЭлементаУправления
         CommandBarButtonOrder / ПорядокКнопокКоманднойПанели
         WindowAppearanceModeVariant / ВариантСпособаОтображенияОкна
         WindowAppearanceModeChange / ИзменениеСпособаОтображенияОкна
         DragAllowedActions / ДопустимыеДействияПеретаскивания
         DragAction / ДействиеПеретаскивания
         +QuestionDialogMode / РежимДиалогаВопрос
		@*/
        addGC("{22A21030-E1D6-46A0-9465-F0A5427BE011}");
        /*@
		{22A21030-E1D6-46A0-9465-F0A5427BE011}
		0x14AB63B0 c:\Program Files\1cv82\8.2.11.236\bin\ext.dll
        // Методы
        // +NumberInWords / ЧислоПрописью
        // PeriodPresentation / ПредставлениеПериода
        // FileCopy / КопироватьФайл
        // MoveFile / ПереместитьФайл
        // DeleteFiles / УдалитьФайлы
        // +FindFiles / НайтиФайлы
        // CreateDirectory / СоздатьКаталог
        // GetCOMObject / ПолучитьCOMОбъект
        // SplitFile / РазделитьФайл
        // MergeFiles / ОбъединитьФайлы
        // Свойства
        // XBaseEncoding / КодировкаXBase
        // InternetMailTextType / ТипТекстаПочтовогоСообщения
        // InternetMailTextProcessing / ОбработкаТекстаИнтернетПочтовогоСообщения
        // InternetMailMessageImportance / ВажностьИнтернетПочтовогоСообщения
        // InternetMailAttachmentEncodingMode / СпособКодированияИнтернетПочтовогоВложения
        // InternetMailMessageNonASCIISymbolsEncodingMode / СпособКодированияНеASCIIСимволовИнтернетПочтовогоСообщения
        // SMTPAuthenticationMode / СпособSMTPАутентификации
        // POP3AuthenticationMode / СпособPOP3Аутентификации
        // ZIPCompressionMethod / МетодСжатияZIP
        // ZIPCompressionLevel / УровеньСжатияZIP
        // ZIPEncryptionMethod / МетодШифрованияZIP
        // ZIPStorePathMode / РежимСохраненияПутейZIP
        // ZIPSubDirProcessingMode / РежимОбработкиПодкаталоговZIP
        // ZIPRestoreFilePathsMode / РежимВосстановленияПутейФайловZIP
        // CryptoTools / СредстваКриптографии
		@*/
        addGC("{B8542F1F-3296-45EF-9891-59DAFA57B67C}");
		/*@
        // {B8542F1F-3296-45EF-9891-59DAFA57B67C}
		0x666FD440 c:\Program Files\1cv82\8.2.11.236\bin\mngbase.dll
        // Методы
        // ValueToFormData / ЗначениеВДанныеФормы
        // FormDataToValue / ДанныеФормыВЗначение
        // GetFunctionalOption / ПолучитьФункциональнуюОпцию
        // +PutToTempStorage / ПоместитьВоВременноеХранилище
        // +GetFromTempStorage / ПолучитьИзВременногоХранилища
        // +DeleteFromTempStorage / УдалитьИзВременногоХранилища
        // PredefinedValue / ПредопределенноеЗначение
        // GetPredefinedValueFullName / ПолучитьПолноеИмяПредопределенногоЗначения
        // GetURL / ПолучитьНавигационнуюСсылку
        // GetChoiceData / ПолучитьДанныеВыбора
        // GetClientConnectionSpeed / ПолучитьСкоростьКлиентскогоСоединения
        // SetObjectAndFormAttributeConformity / УстановитьСоответствиеОбъектаИРеквизитаФормы
        // GetObjectAndFormAttributeConformity / ПолучитьСоответствиеОбъектаИРеквизитаФормы
        // GetURLsPresentations / ПолучитьПредставленияНавигационныхСсылок
        // Свойства
		@*/

        addGC("{38406666-F954-489E-BB5B-B0E6C0C81AFB}");
		/*@
        // {38406666-F954-489E-BB5B-B0E6C0C81AFB}
		0x3269BE10 c:\Program Files\1cv82\8.2.11.236\bin\frntend.dll
        // Методы
        // +DoMessageBox / Предупреждение
        // +DoQueryBox / Вопрос
        // +InputString / ВвестиСтроку  В JScript параметры ВСЕГДА передаются по значению, поэтому получить результат из JScript кода невозможно. Обход см. в snegopatwnd.js SnegopatWnd.prototype.CmdBarДобавитьГруппу
        // +InputNumber / ВвестиЧисло
        // +InputDate / ВвестиДату
        // +InputValue / ВвестиЗначение
        // OpenValue / ОткрытьЗначение
        // +Beep / Сигнал
        // +GetCaption / ПолучитьЗаголовокСистемы
        // +SetCaption / УстановитьЗаголовокСистемы
        // +SaveValue / СохранитьЗначение      // сохраняют и восстанавливают в разделе/из раздела FrEndContext/SaveRestoreValues/ хранилища База+Пользователь
        // +RestoreValue / ВосстановитьЗначение // для работы с другими разделами/хранилищами используйте методы объекта profileRoot Снегопата: createValue/getValue/setValue
        // SaveUserSettings / СохранитьНастройкиПользователя
        // ClearUserSettings / ОчиститьНастройкиПользователя
        // RunSystem / ЗапуститьСистему
        // +Exit / ЗавершитьРаботуСистемы
        // +Terminate / ПрекратитьРаботуСистемы
        // AttachIdleHandler / ПодключитьОбработчикОжидания
        // DetachIdleHandler / ОтключитьОбработчикОжидания
        // +LockApplication / ЗаблокироватьРаботуПользователя
        // +ClearMessages / ОчиститьСообщения
        // +Status / Состояние
        // +Notify / Оповестить вызывается без ошибки, но есть ли эффект, непонятно
        // UserInterruptProcessing / ОбработкаПрерыванияПользователя
        // +OpenHelpContent / ОткрытьСодержаниеСправки
        // +OpenHelpIndex / ОткрытьИндексСправки
        // OpenHelp / ОткрытьСправку
        // +CloseHelp / ЗакрытьСправку
        // GetAppearanceTemplate / ПолучитьМакетОформления
        // WindowsUsers / ПользователиWindows
        // OSUsers / ПользователиОС
        // AttachNotificationHandler / ПодключитьОбработчикОповещения
        // DetachNotificationHandler / ОтключитьОбработчикОповещения
        // ShowErrorInfo / ПоказатьИнформациюОбОшибке
        // ProcessJobs / ВыполнитьОбработкуЗаданий
        // GetForm / ПолучитьФорму
        // OpenForm / ОткрытьФорму
        // OpenFormModal / ОткрытьФормуМодально
        // Свойства
        // MainInterface / ГлавныйИнтерфейс
        // +WorkingDate / РабочаяДата
        // WorkingDateUse / ИспользованиеРабочейДаты
        // StyleLib / БиблиотекаСтилей
        // LaunchParameter / ПараметрЗапуска
        // +MainStyle / ГлавныйСтиль
        // WorkingDateMode / РежимРабочейДаты
        // IntervalBoundVariant / ВариантГраницыИнтервала
        // PeriodVariant / ВариантПериода
        // PeriodSettingsVariant / ВариантНастройкиПериода
        // NewRowShowCheckVariant / ВариантПроверкиОтображенияНовойСтроки
		@*/

        //allgc.push(globalContext("{F8EE2CA3-E705-4C3A-A2A3-A691AABF5976}"))
        // {F8EE2CA3-E705-4C3A-A2A3-A691AABF5976} - 0x28182380 c:\Program Files\1cv82\8.2.11.236\bin\backbas.dll
        // Методы
        // Свойства


        addGC("{2482FC4E-012A-4E97-88A1-77DE6EC8DEA2}");
		/*@
        // {2482FC4E-012A-4E97-88A1-77DE6EC8DEA2}
		0x15425F28 c:\Program Files\1cv82\8.2.11.236\bin\extui.dll
        // Методы
        // InstallCryptoExtension / УстановитьРасширениеРаботыСКриптографией
        // AttachCryptoExtension / ПодключитьРасширениеРаботыСКриптографией
        // Свойства
        // +FileDialogMode / РежимДиалогаВыбораФайла
		@*/


        //allgc.push(globalContext("{ACDDDD96-BBBC-4793-8D2E-E0A76C613F75}"))
        // {ACDDDD96-BBBC-4793-8D2E-E0A76C613F75} - 0x23A4B0C0 c:\Program Files\1cv82\8.2.11.236\bin\map.dll
        // Методы
        // Свойства
        // GeographicalSchemaLineType / ТипЛинииГеографическойСхемы
        // GeographicalSchemaLayerSeriesShowMode / ТипОтображенияСерииСлояГеографическойСхемы
        // GeographicalSchemaDataSourceOrganizationType / ТипОрганизацииИсточникаДанныхГеографическойСхемы
        // PaintingReferencePointPosition / ПоложениеОпорнойТочкиОтрисовки
        // GeographicalSchemaShowMode / РежимОтображенияГеографическойСхемы
        // GeographicalSchemaMarkerType / ТипМаркераГеографическойСхемы
        // GeographicalSchemaLayerSeriesImportModeType / ТипИмпортаСерийСлояГеографическойСхемы
        // GeographicalSchemaPointObjectDrawingType / ТипОтображенияТочечногоОбъектаГеографическойСхемы
        // GeographicalSchemaObjectFindType / ТипПоискаОбъектовГеографическойСхемы
        // GeographicalSchemaLegendItemShowScaleType / ТипОтображенияШкалыЭлементаЛегендыГеографическойСхемы
        // SeriesValuesDrawingMode / РежимОтображенияЗначенийСерии
        // GeographicalSchemaProjection / ТипПроекцииГеографическойСхемы


        //allgc.push(globalContext("{D4CE0B0F-9C96-4289-88BD-5172728B4AD7}"))
        // {D4CE0B0F-9C96-4289-88BD-5172728B4AD7} - 0x4FABBC40 c:\Program Files\1cv82\8.2.11.236\bin\calc.dll
        // Методы
        // Свойства
        // ChartsOfCalculationTypes / ПланыВидовРасчета
        // CalculationRegisters / РегистрыРасчета


        //allgc.push(globalContext("{CE673725-8181-4B54-8329-6980A9178162}"))
        // {CE673725-8181-4B54-8329-6980A9178162} - 0x52E3DD58 c:\Program Files\1cv82\8.2.11.236\bin\accnt.dll
        // Методы
        // Свойства
        // ChartsOfAccounts / ПланыСчетов
        // AccountingRegisters / РегистрыБухгалтерии


        addGC("{593796CF-D334-4E0C-963A-8F67DE0625A6}");
		/*@
        // {593796CF-D334-4E0C-963A-8F67DE0625A6}
		0x1FC17360 c:\Program Files\1cv82\8.2.11.236\bin\xml2.dll
        // Методы
        // XMLString / XMLСтрока
        // XMLValue / XMLЗначение
        // XMLType / XMLТип
        // XMLTypeOf / XMLТипЗнч
        // FromXMLType / ИзXMLТипа
        // WriteXML / ЗаписатьXML
        // ReadXML / ПрочитатьXML
        // GetXMLType / ПолучитьXMLТип
        // CanReadXML / ВозможностьЧтенияXML
        // FindDisallowedXMLCharacters / НайтиНедопустимыеСимволыXML
        // Свойства
        // XMLNodeType / ТипУзлаXML
        // XMLTypeAssignment / НазначениеТипаXML
        // XMLAttributeType / ТипАтрибутаXML
        // XMLSpace / ПробельныеСимволыXML
        // XMLValidationType / ТипПроверкиXML
        // DOMNodeType / ТипУзлаDOM
        // DOMDocumentPosition / ПозицияВДокументеDOM
        // DOMBuilderAction / ДействиеПостроителяDOM
        // DOMImplementation / РеализацияDOM
        // DOMNodeFilterParameters / ПараметрыОтбораУзловDOM
        // XSComponentType / ТипКомпонентыXS
        // XSAttributeUseCategory / КатегорияИспользованияАтрибутаXS
        // XSForm / ФормаПредставленияXS
        // XSConstraint / ОграничениеЗначенияXS
        // XSDisallowedSubstitutions / НедопустимыеПодстановкиXS
        // XSSubstitutionGroupExclusions / ИсключенияГруппПодстановкиXS
        // XSIdentityConstraintCategory / КатегорияОграниченияИдентичностиXS
        // XSXPathVariety / ВариантXPathXS
        // XSSimpleFinal / ЗавершенностьПростогоТипаXS
        // XSComplexFinal / ЗавершенностьСоставногоТипаXS
        // XSSchemaFinal / ЗавершенностьСхемыXS
        // XSSimpleTypeVariety / ВариантПростогоТипаXS
        // XSOrdered / УпорядочиваниеXS
        // XSCardinality / КоличествоЭлементовXS
        // XSWhitespaceHandling / ОбработкаПробельныхСимволовXS
        // XSProcessContents / ОбработкаСодержимогоXS
        // XSNamespaceConstraintCategory / КатегорияОграниченияПространствИменXS
        // XSCompositor / ВидГруппыМоделиXS
        // XSDerivationMethod / МетодНаследованияXS
        // XSProhibitedSubstitutions / ЗапрещенныеПодстановкиXS
        // XSContentModel / МодельСодержимогоXS
        // XMLCanonicalizationType / ТипКаноническогоXML
        // DOMXPathResultType / ТипРезультатаDOMXPath
		@*/

        addGC("{1373BA1B-0DCB-47DA-8A46-D9CF64F3DECA}");
		/*@
        // {1373BA1B-0DCB-47DA-8A46-D9CF64F3DECA}
		0x63A942A8 c:\Program Files\1cv82\8.2.11.236\bin\mngcore.dll
        // Методы
        // CopyFormData / КопироватьДанныеФормы
        // IsTempStorageURL / ЭтоАдресВременногоХранилища
        // GetInfoBaseURL / ПолучитьНавигационнуюСсылкуИнформационнойБазы
        // Свойства
        // FormItemTitleLocation / ПоложениеЗаголовкаЭлементаФормы
        // FormItemCommandBarLabelLocation / ПоложениеКоманднойПанелиЭлементаФормы
        // FormCommandBarLabelLocation / ПоложениеКоманднойПанелиФормы
        // IncompleteChoiceMode / РежимВыбораНезаполненного
        // SelectionShowMode / РежимОтображенияВыделения
        // ItemHorizontalLocation / ГоризонтальноеПоложениеЭлемента
        // ItemVerticalAlign / ВертикальноеПоложениеЭлемента
        // ColumnsGroup / ГруппировкаКолонок
        // ChildFormItemsGroup / ГруппировкаПодчиненныхЭлементовФормы
        // FixingInTable / ФиксацияВТаблице
        // ChildFormItemsWidth / ШиринаПодчиненныхЭлементовФормы
        // UsualGroupRepresentation / ОтображениеОбычнойГруппы
        // FormButtonType / ВидКнопкиФормы
        // FormFieldType / ВидПоляФормы
        // FormDecorationType / ВидДекорацииФормы
        // FormGroupType / ВидГруппыФормы
        // TableRepresentation / ОтображениеТаблицы
        // TableRowInputMode / РежимВводаСтрокТаблицы
        // TableSelectionMode / РежимВыделенияТаблицы
        // TableRowSelectionMode / РежимВыделенияСтрокиТаблицы
        // ScrollBarUse / ИспользованиеПолосыПрокрутки
        // InitialListView / НачальноеОтображениеСписка
        // InitialTreeView / НачальноеОтображениеДерева
        // FoldersAndItems / ГруппыИЭлементы
        // EnterKeyBehaviorType / ТипПоведенияКлавишиEnter
        // ColumnEditMode / РежимРедактированияКолонки
        // UserWorkHistory / ИсторияРаботыПользователя
        // ReportFormType / ТипФормыОтчета
        // DateSelectionMode / РежимВыделенияДаты
        // FormItemOrientation / ОриентацияЭлементаФормы
        // ProgressBarSmoothingMode / РежимСглаживанияИндикатора
        // TrackBarMarkingAppearance / ОтображениеРазметкиПолосыРегулирования
        // URLPresentation / ПредставлениеНавигационнойСсылки
        // FormPagesRepresentation / ОтображениеСтраницФормы
        // WarningOnEditRepresentation / ОтображениеПредупрежденияПриРедактировании
        // DataChangeType / ВидИзмененияДанных
        // SaveFormDataInSettings / СохранениеДанныхФормыВНастройках
        // AutoSaveFormDataInSettings / АвтоматическоеСохранениеДанныхФормыВНастройках
        // FormWindowOpeningMode / РежимОткрытияОкнаФормы
        // ClientRunMode / РежимЗапускаКлиентскогоПриложения
        // CommandGroupCategory / КатегорияГруппыКоманд
        // CommandParameterUseMode / РежимИспользованияПараметраКоманды
        // AdditionalShowMode / ДополнительныйРежимОтображения
        // ButtonRepresentation / ОтображениеКнопки
		@*/

        //allgc.push(globalContext("{1AAA6685-50B5-4501-B9EF-BD7707B6A52E}"))
        // {1AAA6685-50B5-4501-B9EF-BD7707B6A52E} - 0x27A758B0 c:\Program Files\1cv82\8.2.11.236\bin\fmtd.dll
        // Методы
        // Свойства
        // FormattedDocumentFileType / ТипФайлаФорматированногоДокумента
        // FormattedDocumentItemType / ТипЭлементаФорматированногоДокумента


        //allgc.push(globalContext("{FA397D0C-FC61-412D-9D1F-63C725D2FB90}"))
        // {FA397D0C-FC61-412D-9D1F-63C725D2FB90} - 0x5A1BABD0 c:\Program Files\1cv82\8.2.11.236\bin\dcs.dll
        // Методы
        // Свойства
        // DataCompositionBalanceType / ТипОстаткаКомпоновкиДанных
        // DataCompositionAccountingBalanceType / ТипБухгалтерскогоОстаткаКомпоновкиДанных
        // DataCompositionAreaTemplateType / ТипМакетаОбластиКомпоновкиДанных
        // DataCompositionDataSetsLinkType / ТипСвязиНаборовДанныхКомпоновкиДанных
        // DataCompositionResultBeginItemType / ТипНачалаЭлементаРезультатаКомпоновкиДанных
        // DataCompositionResultItemType / ТипЭлементаРезультатаКомпоновкиДанных
        // DataCompositionResultNestedItemsLayout / РасположениеВложенныхЭлементовРезультатаКомпоновкиДанных
        // DataCompositionPeriodType / ТипПериодаКомпоновкиДанных
        // DataCompositionAppearanceTemplateLib / БиблиотекаМакетовОформленияКомпоновкиДанных


        //allgc.push(globalContext("{DD0311F2-0289-4FE6-A4AC-A8423BBF9A8E}"))
        // {DD0311F2-0289-4FE6-A4AC-A8423BBF9A8E} - 0x5E213A70 c:\Program Files\1cv82\8.2.11.236\bin\dcscore.dll
        // Методы
        // Свойства
        // DataCompositionGroupFieldsPlacement / РасположениеПолейГруппировкиКомпоновкиДанных
        // DataCompositionGroupPlacement / РасположениеГруппировкиКомпоновкиДанных
        // DataCompositionAttributesPlacement / РасположениеРеквизитовКомпоновкиДанных
        // DataCompositionFieldPlacement / РасположениеПоляКомпоновкиДанных
        // DataCompositionResourcesPlacement / РасположениеРесурсовКомпоновкиДанных
        // DataCompositionSortDirection / НаправлениеСортировкиКомпоновкиДанных
        // DataCompositionGroupType / ТипГруппировкиКомпоновкиДанных
        // DataCompositionPeriodAdditionType / ТипДополненияПериодаКомпоновкиДанных
        // DataCompositionComparisonType / ВидСравненияКомпоновкиДанных
        // DataCompositionFilterItemsGroupType / ТипГруппыЭлементовОтбораКомпоновкиДанных
        // DataCompositionTotalPlacement / РасположениеИтоговКомпоновкиДанных
        // DataCompositionLengthUnit / ЕдиницаДлиныКомпоновкиДанных
        // DataCompositionGroupTemplateType / ТипМакетаГруппировкиКомпоновкиДанных
        // DataCompositionTextPlacementType / ТипРазмещенияТекстаКомпоновкиДанных
        // DataCompositionFieldsTitleType / ТипЗаголовкаПолейКомпоновкиДанных
        // DataCompositionTextOutputType / ТипВыводаТекстаКомпоновкиДанных
        // DataCompositionDetailsProcessingAction / ДействиеОбработкиРасшифровкиКомпоновкиДанных
        // DataCompositionChartLegendPlacement / РасположениеЛегендыДиаграммыКомпоновкиДанных
        // DataCompositionFilterApplicationType / ТипПримененияОтбораКомпоновкиДанных
        // DataCompositionSettingsItemViewMode / РежимОтображенияЭлементаНастройкиКомпоновкиДанных
        // DataCompositionSettingsViewMode / РежимОтображенияНастроекКомпоновкиДанных
        // DataCompositionSettingsItemState / СостояниеЭлементаНастройкиКомпоновкиДанных
        // DataCompositionSettingsRefreshMethod / СпособВосстановленияНастроекКомпоновкиДанных


        addGC("{C96430EF-26D9-4B53-87C7-05036A39E73C}");
		/*@
        // {C96430EF-26D9-4B53-87C7-05036A39E73C}
		0x1022CB40 c:\Program Files\1cv82\8.2.11.236\bin\core82.dll
        // Методы
        // FillPropertyValues / ЗаполнитьЗначенияСвойств
        // Base64Value / Base64Значение
        // Base64String / Base64Строка
        // +ValueIsFilled / ЗначениеЗаполнено
        // Свойства
        // VerticalAlign / ВертикальноеПоложение
        // HorizontalAlign / ГоризонтальноеПоложение
        // PageOrientation / ОриентацияСтраницы
        // PictureSize / РазмерКартинки
        // PictureFormat / ФорматКартинки
        // AllowedLength / ДопустимаяДлина
        // AllowedSign / ДопустимыйЗнак
        // DateFractions / ЧастиДаты
        // RoundMode / РежимОкругления
        // Chars / Символы
        // SortDirection / НаправлениеСортировки
        // TextEncoding / КодировкаТекста
        // UseOutput / ИспользованиеВывода
        // PrintDialogUseMode / РежимИспользованияДиалогаПечати
        // FontType / ВидШрифта
        // BorderType / ВидРамки
        // ControlBorderType / ТипРамкиЭлементаУправления
        // WebColors / WebЦвета
        // WindowsColors / WindowsЦвета
        // ColorType / ВидЦвета
        // WindowsFonts / WindowsШрифты
        // PictureType / ВидКартинки
        // FillChecking / ПроверкаЗаполнения
        // StandardBeginningDateVariant / ВариантСтандартнойДатыНачала
        // StandardPeriodVariant / ВариантСтандартногоПериода
        // PlatformType / ТипПлатформы
        // SizeChangeMode / РежимИзмененияРазмера
        // Key / Клавиша
		@*/

        //allgc.push(globalContext("{1BBF90ED-E363-42AD-9112-C8C0D6DBE8F3}"))
        // {1BBF90ED-E363-42AD-9112-C8C0D6DBE8F3} - 0x56FBDAB8 c:\Program Files\1cv82\8.2.11.236\bin\bp.dll
        // Методы
        // Свойства
        // BusinessProcesses / БизнесПроцессы
        // Tasks / Задачи


        addGC("{4A993AB7-2F75-43CF-B34A-0AD9FFAEE7E3}");
		/*@
        {4A993AB7-2F75-43CF-B34A-0AD9FFAEE7E3}
		0x3101ECA0 c:\Program Files\1cv82\8.2.11.236\bin\backend.dll
        // Методы
        // BeginTransaction / НачатьТранзакцию
        // CommitTransaction / ЗафиксироватьТранзакцию
        // RollbackTransaction / ОтменитьТранзакцию
        // TransactionActive / ТранзакцияАктивна
        // +Message / Сообщить
        // FindMarkedForDeletion / НайтиПомеченныеНаУдаление
        // FindByRef / НайтиПоСсылкам
        // DeleteObjects / УдалитьОбъекты
        // AccessRight / ПравоДоступа
        // IsInRole / РольДоступна
        // SetExclusiveMode / УстановитьМонопольныйРежим
        // ExclusiveMode / МонопольныйРежим
        // NStr / НСтр
        // +GetRealTimeTimestamp / ПолучитьОперативнуюОтметкуВремени
        // +WriteLogEvent / ЗаписьЖурналаРегистрации
        // +CurrentLanguage / ТекущийЯзык
        // +ValueToStringInternal / ЗначениеВСтрокуВнутр
        // +ValueFromStringInternal / ЗначениеИзСтрокиВнутр
        // ValueToFile / ЗначениеВФайл
        // ValueFromFile / ЗначениеИзФайла
        // +ComputerName / ИмяКомпьютера
        // +UserName / ИмяПользователя
        // +UserFullName / ПолноеИмяПользователя
        // +BinDir / КаталогПрограммы
        // +TempFilesDir / КаталогВременныхФайлов
        // +CurrentLocaleCode / ТекущийКодЛокализации
        // +InfoBaseLocaleCode / КодЛокализацииИнформационнойБазы
        // LocaleCode / КодЛокализации
        // +InfoBaseConnectionString / СтрокаСоединенияИнформационнойБазы
        // AccessParameters / ПараметрыДоступа
        // UnloadEventLog / ВыгрузитьЖурналРегистрации
        // +ApplicationPresentation / ПредставлениеПриложения
        // +GetInfoBaseConnections / ПолучитьСоединенияИнформационнойБазы
        // GetInfoBaseSessions / ПолучитьСеансыИнформационнойБазы
        // InfoBaseConnectionNumber / НомерСоединенияИнформационнойБазы
        // +InfoBaseSessionNumber / НомерСеансаИнформационнойБазы
        // EventLogEventPresentation / ПредставлениеСобытияЖурналаРегистрации
        // GetEventLogUsing / ПолучитьИспользованиеЖурналаРегистрации
        // SetEventLogUsing / УстановитьИспользованиеЖурналаРегистрации
        // +ConfigurationChanged / КонфигурацияИзменена
        // +DataBaseConfigurationChangedDynamically / КонфигурацияБазыДанныхИзмененаДинамически
        // GetDBStorageStructureInfo / ПолучитьСтруктуруХраненияБазыДанных
        // SetLockWaitTime / УстановитьВремяОжиданияБлокировкиДанных
        // GetLockWaitTime / ПолучитьВремяОжиданияБлокировкиДанных
        // SetUserPasswordMinLength / УстановитьМинимальнуюДлинуПаролейПользователей
        // GetUserPasswordMinLength / ПолучитьМинимальнуюДлинуПаролейПользователей
        // SetUserPasswordStrengthCheck / УстановитьПроверкуСложностиПаролейПользователей
        // GetUserPasswordStrengthCheck / ПолучитьПроверкуСложностиПаролейПользователей
        // +CurrentSystemLanguage / ТекущийЯзыкСистемы
        // GetConnectionsLock / ПолучитьБлокировкуУстановкиСоединений
        // GetSessionsLock / ПолучитьБлокировкуСеансов
        // SetConnectionsLock / УстановитьБлокировкуУстановкиСоединений
        // SetSessionsLock / УстановитьБлокировкуСеансов
        // BriefErrorDescription / КраткоеПредставлениеОшибки
        // DetailErrorDescription / ПодробноеПредставлениеОшибки
        // GetCommonTemplate / ПолучитьОбщийМакет
        // RefreshObjectsNumbering / ОбновитьНумерациюОбъектов
        // ConnectionStopRequest / НеобходимостьЗавершенияСоединения
        // SetPrivilegedMode / УстановитьПривилегированныйРежим
        // PrivilegedMode / ПривилегированныйРежим
        // LockDataForEdit / ЗаблокироватьДанныеДляРедактирования
        // UnlockDataForEdit / РазблокироватьДанныеДляРедактирования
        // RefreshReusingValues / ОбновитьПовторноИспользуемыеЗначения
        // GetEventLogFilterValues / ПолучитьЗначенияОтбораЖурналаРегистрации
        // SetSafeMode / УстановитьБезопасныйРежим
        // SafeMode / БезопасныйРежим
        // SetInfoBaseTimeZone / УстановитьЧасовойПоясИнформационнойБазы
        // GetInfoBaseTimeZone / ПолучитьЧасовойПоясИнформационнойБазы
        // SetSessionTimeZone / УстановитьЧасовойПоясСеанса
        // SessionTimeZone / ЧасовойПоясСеанса
        // CurrentSessionDate / ТекущаяДатаСеанса
        // GetUserMessages / ПолучитьСообщенияПользователю
        // DaylightTimeOffset / СмещениеЛетнегоВремени
        // CurrentUniversalDate / ТекущаяУниверсальнаяДата
        // ToLocalTime / МестноеВремя
        // ToUniversalTime / УниверсальноеВремя
        // TimeZone / ЧасовойПояс
        // GetAvailableTimeZones / ПолучитьДопустимыеЧасовыеПояса
        // TimeZonePresentation / ПредставлениеЧасовогоПояса
        // GetAvailableLocaleCodes / ПолучитьДопустимыеКодыЛокализации
        // LocaleCodePresentation / ПредставлениеКодаЛокализации
        // StandardTimeOffset / СмещениеСтандартногоВремени
        // CurrentRunMode / ТекущийРежимЗапуска
        // GetTempFileName / ПолучитьИмяВременногоФайла
        // SetEventLogEventUse / УстановитьИспользованиеСобытияЖурналаРегистрации
        // GetEventLogEventUse / ПолучитьИспользованиеСобытияЖурналаРегистрации
        // RightPresentation / ПредставлениеПрава
        // Свойства
        // +Metadata / Метаданные  Пока не выяснил, доступ к метаданным ИБ или к редактируемым
        // PictureLib / БиблиотекаКартинок
        // FilterCriteria / КритерииОтбора
        // ExchangePlans / ПланыОбмена
        // SessionParameters / ПараметрыСеанса
        // QueryResultIteration / ОбходРезультатаЗапроса
        // QueryRecordType / ТипЗаписиЗапроса
        // SelectRecordType / SelectRecordType
        // EventLogLevel / УровеньЖурналаРегистрации
        // EventLogEntryTransactionMode / РежимТранзакцииЗаписиЖурналаРегистрации
        // EventLogEntryTransactionStatus / СтатусТранзакцииЗаписиЖурналаРегистрации
        // AutoChangeRecord / АвтоРегистрацияИзменений
        // AllowedMessageNo / ДопустимыйНомерСообщения
        // InfoBaseUsers / ПользователиИнформационнойБазы
        // QueryBuilderDimensionType / ТипИзмеренияПостроителяЗапроса
        // DataAnalysisFieldType / ТипПоляАнализаДанных
        // DataItemSend / ОтправкаЭлементаДанных
        // DataItemReceive / ПолучениеЭлементаДанных
        // PresentationAdditionType / ТипДобавленияПредставлений
        // StyleColors / ЦветаСтиля
        // StyleFonts / ШрифтыСтиля
        // StyleBorders / РамкиСтиля
        // WSReferences / WSСсылки
        // StandardAppearance / СтандартноеОформление
        // ReportBuilderDimensionType / ТипИзмеренияПостроителяОтчета
        // PivotTableRowTotalPosition / ПоложениеИтоговСтрокСводнойТаблицы
        // PivotTableColumnTotalPosition / ПоложениеИтоговКолонокСводнойТаблицы
        // ReportBuilderDetailsFillType / ВидЗаполненияРасшифровкиПостроителяОтчета
        // DimensionPlacementType / ТипРазмещенияИзмерений
        // DimensionAttributePlacementType / ТипРазмещенияРеквизитовИзмерений
        // TotalPlacementType / ТипРазмещенияИтогов
        // PivotTableLinesShowType / ТипОтображенияЛинийСводнойТаблицы
        // AppearanceAreaType / ТипОбластиОформления
        // FullTextMode / РежимПолнотекстовогоПоиска
        // FullTextSearch / ПолнотекстовыйПоиск
        // FullTextSearchRepresentationType / ВидОтображенияПолнотекстовогоПоиска
        // BackgroundJobState / СостояниеФоновогоЗадания
        // BackgroundJobs / ФоновыеЗадания
        // ScheduledJobs / РегламентныеЗадания
        // AutonumerationInForm / АвтонумерацияВФорме
        // SettingsStorages / ХранилищаНастроек
        // SystemSettingsStorage / ХранилищеСистемныхНастроек
        // CommonSettingsStorage / ХранилищеОбщихНастроек
        // ReportsUserSettingsStorage / ХранилищеПользовательскихНастроекОтчетов
        // ReportsVariantsStorage / ХранилищеВариантовОтчетов
        // FormDataSettingsStorage / ХранилищеНастроекДанныхФорм
        // StandardCommandsGroup / СтандартнаяГруппаКоманд
		@*/

        //allgc.push(globalContext("{C1DB9C38-CBED-4A55-BB0C-7A891C804310}"))
        // {C1DB9C38-CBED-4A55-BB0C-7A891C804310} - 0x27D687A8 c:\Program Files\1cv82\8.2.11.236\bin\addin.dll
        // Методы
        // AttachAddIn / ПодключитьВнешнююКомпоненту
        // LoadAddIn / ЗагрузитьВнешнююКомпоненту
        // Свойства
        // AddInType / ТипВнешнейКомпоненты


        //allgc.push(globalContext("{E66DB7C3-74E5-4DEC-89C5-A6F01375E841}"))
        // {E66DB7C3-74E5-4DEC-89C5-A6F01375E841} - 0x3101ED28 c:\Program Files\1cv82\8.2.11.236\bin\backend.dll
        // Методы
        // Свойства


        //allgc.push(globalContext("{6298753D-31C2-43C8-A18D-45EE478271D6}"))
        // {6298753D-31C2-43C8-A18D-45EE478271D6} - 0x39317C20 c:\Program Files\1cv82\8.2.11.236\bin\basic.dll
        // Методы
        // GetCommonForm / ПолучитьОбщуюФорму
        // Свойства
        // Constants / Константы
        // -Catalogs / Справочники
        // Enums / Перечисления
        // DataProcessors / Обработки
        // Reports / Отчеты
        // Documents / Документы
        // DocumentJournals / ЖурналыДокументов
        // InformationRegisters / РегистрыСведений
        // AccumulationRegisters / РегистрыНакопления
        // Sequences / Последовательности
        // ChartsOfCharacteristicTypes / ПланыВидовХарактеристик
        // ExternalDataProcessors / ВнешниеОбработки
        // ExternalReports / ВнешниеОтчеты
        addGC("{C6B82646-54E9-4151-97A2-704D2DD57E9F}");
		/*@
        {C6B82646-54E9-4151-97A2-704D2DD57E9F}
		0x22F0BB70 c:\Program Files\1cv82\8.2.11.236\bin\xdto.dll
        // Методы
        // ImportXDTOModel / ИмпортМоделиXDTO
        // CreateXDTOFactory / СоздатьФабрикуXDTO
        // Свойства
        // XMLForm / ФормаXML
        // XDTOFacetType / ВидФасетаXDTO
        // XDTOFactory / ФабрикаXDTO
        // XDTOSerializer / СериализаторXDTO
		@*/


        addGC("{F9DB1621-C863-11D5-A3C1-0050BAE0A776}");
		/*@
        {F9DB1621-C863-11D5-A3C1-0050BAE0A776}
		0x3E3089A8 c:\Program Files\1cv82\8.2.11.236\bin\basicui.dll
        // Методы
        // Свойства
        // FileCompareMethod / СпособСравненияФайлов
		@*/


        //allgc.push(globalContext("{6EE0CC38-4E22-4F31-B0F1-851DE29B9B1A}"))
        // {6EE0CC38-4E22-4F31-B0F1-851DE29B9B1A} - 0x60838270 c:\Program Files\1cv82\8.2.11.236\bin\dcsui.dll
        // Методы
        // Свойства
        // OnUnavailabilityDataCompositionSettingsAction / ДействиеПриНедоступностиНастроекКомпоновкиДанных


        addGC("{5ABA21A1-5571-4FE5-885C-44928B6CCA88}");
		/*@
        {5ABA21A1-5571-4FE5-885C-44928B6CCA88}
		0x6AD158D0 c:\Program Files\1cv82\8.2.11.236\bin\mngui.dll
        // Методы
        // GetApplicationCaption / ПолучитьЗаголовокПриложения
        // SetApplicationCaption / УстановитьЗаголовокПриложения
        // -ShowUserNotification / ПоказатьОповещениеПользователя
        // GetFile / ПолучитьФайл
        // PutFile / ПоместитьФайл
        // GetInterfaceFunctionalOption / ПолучитьФункциональнуюОпциюИнтерфейса
        // SetInterfaceFunctionalOptionParameters / УстановитьПараметрыФункциональныхОпцийИнтерфейса
        // GetInterfaceFunctionalOptionParameters / ПолучитьПараметрыФункциональныхОпцийИнтерфейса
        // RefreshInterface / ОбновитьИнтерфейс
        // GetWindows / ПолучитьОкна
        // SetShortApplicationCaption / УстановитьКраткийЗаголовокПриложения
        // GetShortApplicationCaption / ПолучитьКраткийЗаголовокПриложения
        // ActiveWindow / АктивноеОкно
        // GotoURL / ПерейтиПоНавигационнойСсылке
        // FindWindowByURL / НайтиОкноПоНавигационнойСсылке
        // +System / КомандаСистемы
        // +RunApp / ЗапуститьПриложение
        // NotifyChanged / ОповеститьОбИзменении
        // AttachFileSystemExtension / ПодключитьРасширениеРаботыСФайлами
        // InstallFileSystemExtension / УстановитьРасширениеРаботыСФайлами
        // GetFiles / ПолучитьФайлы
        // PutFiles / ПоместитьФайлы
        // InstallAddIn / УстановитьВнешнююКомпоненту
        // RequestUserPermission / ЗапроситьРазрешениеПользователя
        // Свойства
		@*/


        //allgc.push(globalContext("{B5F7310D-24ED-4F88-B424-AABAF5E30A9C}"))
        // {B5F7310D-24ED-4F88-B424-AABAF5E30A9C} - 0x26E4F880 c:\Program Files\1cv82\8.2.11.236\bin\ws.dll
        // Методы
        // Свойства
        // WSParameterDirection / WSНаправлениеПараметра


        //allgc.push(globalContext("{6AAC416A-51E8-4E97-95DF-2E06F46919D8}"))
        // {6AAC416A-51E8-4E97-95DF-2E06F46919D8} - 0x58658DA8 c:\Program Files\1cv82\8.2.11.236\bin\bpui.dll
        // Методы
        // Свойства


        //allgc.push(globalContext("{39A0CC00-2D20-459E-893F-69F8B5262A49}"))
        // {39A0CC00-2D20-459E-893F-69F8B5262A49} - 0x19E77160 c:\Program Files\1cv82\8.2.11.236\bin\richui.dll
        // Методы
        // Свойства
        // ButtonPictureLocation / ПоложениеКартинкиКнопки
        // TitleLocation / ПоложениеЗаголовка
        // Orientation / Ориентация
        // DateTimeMode / ПредставлениеДаты
        // TableBoxRowSelectionMode / РежимВыделенияСтрокиТабличногоПоля
        // TableBoxSelectionMode / РежимВыделенияТабличногоПоля
        // TableBoxRowInputMode / РежимВводаСтрокТабличногоПоля
        // ShowTabs / ОтображениеЗакладок
        // Key / Клавиша
        // ColumnLocation / ПоложениеКолонки
        // CommandBarButtonType / ТипКнопкиКоманднойПанели
        // CommandBarButtonRepresentation / ОтображениеКнопкиКоманднойПанели
        // InitialListView / НачальноеОтображениеСписка
        // ColumnSizeChange / ИзменениеРазмераКолонки
        // ScrollingTextMode / РежимБегущейСтроки
        // Format / Формат
        // ListEditMode / СпособРедактированияСписка
        // UseMenuMode / ИспользованиеРежимаМеню
        // LabelPictureLocation / ПоложениеКартинкиНадписи
        // PanelPictureLocation / ПоложениеКартинкиПанели
        // ControlCollapseMode / РежимСверткиЭлементаУправления
        // CommandBarButtonAlignment / ВыравниваниеКнопокКоманднойПанели
        // CommandBarButtonOrder / ПорядокКнопокКоманднойПанели


        //allgc.push(globalContext("{3B9CDD52-B8DC-4BD5-B861-AC81D66057F8}"))
        // {3B9CDD52-B8DC-4BD5-B861-AC81D66057F8} - 0x1B1ACB50 c:\Program Files\1cv82\8.2.11.236\bin\htmlui.dll
        // Методы
        // Свойства
        // HTMLDocumentFieldMode / РежимПоляHTMLДокумента


        //allgc.push(globalContext("{F38A89C4-6477-4DDB-83A9-97FB39C1FB54}"))
        // {F38A89C4-6477-4DDB-83A9-97FB39C1FB54} - 0x1BD2DD98 c:\Program Files\1cv82\8.2.11.236\bin\moxel.dll
        // Методы
        // Свойства
        // SpreadsheetDocumentFileType / ТипФайлаТабличногоДокумента
        // SpreadsheetDocumentStepDirectionType / ТипНаправленияПереходаТабличногоДокумента
        // SpreadsheetDocumentDetailUse / ИспользованиеРасшифровкиТабличногоДокумента
        // SpreadsheetDocumentTextPlacementType / ТипРазмещенияТекстаТабличногоДокумента
        // SpreadsheetDocumentPatternType / ТипУзораТабличногоДокумента
        // SpreadsheetDocumentDrawingType / ТипРисункаТабличногоДокумента
        // SpreadsheetDocumentShiftType / ТипСмещенияТабличногоДокумента
        // SpreadsheetDocumentCellLineType / ТипЛинииЯчейкиТабличногоДокумента
        // SpreadsheetDocumentDrawingLineType / ТипЛинииРисункаТабличногоДокумента
        // SpreadsheetDocumentCellAreaType / ТипОбластиЯчеекТабличногоДокумента
        // SpreadsheetDocumentAreaFillType / ТипЗаполненияОбластиТабличногоДокумента
        // SpreadsheetDocumentSelectionShowModeType / ТипОтображенияВыделенияТабличногоДокумента
        // SpreadsheetDocumentGroupHeaderPlacement / РасположениеЗаголовкаГруппировкиТабличногоДокумента
    }
};
