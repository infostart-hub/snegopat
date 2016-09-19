:class TextPosition
:props
	uint vtable
	uint line
	uint col
:dlls
#if ver < 8.3
	core82.dll
#else
	core83.dll
#endif
	void ctor(const TextPosition&in)|??0TextPosition@core@@QAE@ABV01@@Z
	//TextPosition(const LabelData&in)|??0TextPosition@core@@QAE@ABVLabelData@1@@Z
	void ctor(int, int)|??0TextPosition@core@@QAE@HH@Z
	void ctor()|??0TextPosition@core@@QAE@XZ
	void dtor()|??1TextPosition@core@@UAE@XZ

	bool isValid()const|?isValid@TextPosition@core@@QBE_NXZ
	//bool operator!=(const TextPosition&in)const|??9TextPosition@core@@QBE_NABV01@@Z
	TextPosition opSub(const TextPosition&in)|??GTextPosition@core@@QAE?AV01@ABV01@@Z
	//bool operator<(const TextPosition&in)const|??MTextPosition@core@@QBE_NABV01@@Z
	//bool operator<=(const TextPosition&in)const|??NTextPosition@core@@QBE_NABV01@@Z
	TextPosition& opAssign(const TextPosition&in)|??4TextPosition@core@@QAEAAV01@ABV01@@Z
	//TextPosition& operator=(const LabelData&in)|??4TextPosition@core@@QAEAAV01@ABVLabelData@1@@Z
	//bool operator==(const TextPosition&in)const|??8TextPosition@core@@QBE_NABV01@@Z
	//bool operator>(const TextPosition&in)const|??OTextPosition@core@@QBE_NABV01@@Z
	//bool operator>=(const TextPosition&in)const|??PTextPosition@core@@QBE_NABV01@@Z

// Это не сервис в понимании V8, просто так объявляется ссылочный тип без подсчета ссылок
:service TextManager {00000000-0000-0000-0000-000000000000}
:virt
	0
	void virt_dtor()
	void onLoad()
	// Стоит void onLoad() Наверное здесь
	save void onClearText()
	+1	//void setSelectionLabels(const LabelDataVector&in, const LabelDataVector&in)
	+1	//void onChangeTextStart(const TextPosition&in, const TextPosition&in)
	+1	//void onChangeTextStop(const TextPosition&in, const TextPosition&in)
	// Теперь снова void onLoad() Наверное тут:
	+1	//void onSelectionRecalculateFinished()
	+1	//void onAddRemoveLabel(bool, bool, MarkType, char const*, int, int)
	+1	//void serializeLabels(IOutPersistenceStorage*)
	+1	//void deserializeLabels(class IInPersistenceStorage*)
	+1	//bool createNewAction(DocActionType, const TextPosition&in, const TextPosition&in, IUnknown*)
	+1	//void closeNewAction(DocActionType, const TextPosition&in, const TextPosition&in)
	+1	//void onTextAreaModifyPrepare(const TextPosition&in, const TextPosition&in)
	+1	//void onTextAreaModified(bool, const TextPosition&in, const TextPosition&in, const TextPosition&in, const TextPosition&in)
	+1	//void onTextAreaRemoveLabel(MarkType, char const*, int, int, bool)
	+1	//void onSetSelectRangeStart(const TextPosition&in, const TextPosition&in)
	+1	//void onSetSelectRangeStop(const TextPosition&in, const TextPosition&in)
	
:dlls
#if ver < 8.3
	core82.dll
#else
	core83.dll
#endif
	//void ctor()|??0TextManager@core@@QAE@XZ
	//void dtor()|??1TextManager@core@@UAE@XZ
	void clearText()|?clearText@TextManager@core@@QAEXXZ
	bool empty()|?empty@TextManager@core@@QAE_NXZ
	int getLinesCount()|?getLinesCount@TextManager@core@@QAEHXZ
	bool getLine(int, v8string&out)|?getLine@TextManager@core@@QAE_NHPAV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@@Z
	bool save(v8string&)|?save@TextManager@core@@QAE_NAAV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@@Z
	uint getCashObject(IUnknown@&)|?getCashObject@TextManager@core@@QAE?AV?$InterfacePtr@VITextManagerCash@core@@@2@XZ
	bool getLineFast(int, v8string&, IUnknown& cash)|?getLineFast@TextManager@core@@QAE_NHPAV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@PAVITextManagerCash@2@@Z
	int getLineLength(int, bool)|?getLineLength@TextManager@core@@QAEHH_N@Z
#if ver<1
	void addAction(const v8string&in, const TextPosition&in, const TextPosition&in)|?addAction@TextManager@core@@QAEXABV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@ABVTextPosition@2@1@Z
	void addAction(bool, MarkType, char const*, int, int, bool)|?addAction@TextManager@core@@QAEX_NW4MarkType@2@PBDHH0@Z
	void clearRedoUndo()|?clearRedoUndo@TextManager@core@@QAEXXZ
	void clearTextSelection()|?clearTextSelection@TextManager@core@@QAEXXZ
	void* copyAreaToHGlobal(const TextPosition&in, const TextPosition&in, bool)|?copyAreaToHGlobal@TextManager@core@@QAEPAXABVTextPosition@2@0_N@Z
	void* copySelectionToHGlobal(bool)|?copySelectionToHGlobal@TextManager@core@@QAEPAX_N@Z
	bool deleteLine(int)|?deleteLine@TextManager@core@@QAE_NH@Z
	void deleteMarkOfLineStarts(MarkType)|?deleteMarkOfLineStarts@TextManager@core@@QAEXW4MarkType@2@@Z
	bool findLabel(vector<MarkType, allocator<MarkType> > const&, char const*, TextPosition&, bool)|?findLabel@TextManager@core@@QAE_NABV?$vector@W4MarkType@core@@V?$allocator@W4MarkType@core@@@stlp_std@@@stlp_std@@PBDAAVTextPosition@2@_N@Z
	bool findLabel(MarkType, char const*, TextPosition&, bool)|?findLabel@TextManager@core@@QAE_NW4MarkType@2@PBDAAVTextPosition@2@_N@Z
	bool findLabelInLine(MarkType, char const*, int, TextPosition&, bool)|?findLabelInLine@TextManager@core@@QAE_NW4MarkType@2@PBDHAAVTextPosition@2@_N@Z
	bool findNextLabel(vector<MarkType, allocator<MarkType> > const&, TextPosition&)|?findNextLabel@TextManager@core@@QAE_NABV?$vector@W4MarkType@core@@V?$allocator@W4MarkType@core@@@stlp_std@@@stlp_std@@AAVTextPosition@2@@Z
	bool findNextLabel(MarkType, TextPosition&)|?findNextLabel@TextManager@core@@QAE_NW4MarkType@2@AAVTextPosition@2@@Z
	bool findPrevLabel(MarkType, TextPosition&)|?findPrevLabel@TextManager@core@@QAE_NW4MarkType@2@AAVTextPosition@2@@Z
	bool findString(const TextPosition&in, const TextPosition&in, const v8string&in, unsigned int, TextPosition&, int, int)|?findString@TextManager@core@@QAE_NABVTextPosition@2@0ABV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@IAAV32@HH@Z
	InterfacePtr<ITextManagerCash> getCashObject()|?getCashObject@TextManager@core@@QAE?AV?$InterfacePtr@VITextManagerCash@core@@@2@XZ
	bool getChangeTextNotificationState()|?getChangeTextNotificationState@TextManager@core@@QAE_NXZ
	int getCharSetID(wchar_t)|?getCharSetID@TextManager@core@@QAEH_W@Z
	int getCharSetID_find(wchar_t)|?getCharSetID_find@TextManager@core@@QAEH_W@Z
	int getCharsCount()|?getCharsCount@TextManager@core@@QAEHXZ
	bool getCurrentLineNoBySrcLineNo(int, int&)|?getCurrentLineNoBySrcLineNo@TextManager@core@@QAE_NHAAH@Z
	int getLabelCountInSelection(MarkType)|?getLabelCountInSelection@TextManager@core@@QAEHW4MarkType@2@@Z
	bool getLabelsFast(int, deque<LabelData, allocator<LabelData> >&, ITextManagerCash*)|?getLabelsFast@TextManager@core@@QAE_NHAAV?$deque@VLabelData@core@@V?$allocator@VLabelData@core@@@stlp_std@@@stlp_std@@PAVITextManagerCash@2@@Z
	void getLabelsPosition(set<MarkType, struct stlp_std::less<MarkType>, allocator<MarkType> > const&, vector<LabelData, allocator<LabelData> >&, vector<LabelData, allocator<LabelData> >&, const TextPosition&in, const TextPosition&in)|?getLabelsPosition@TextManager@core@@QAEXABV?$set@W4MarkType@core@@U?$less@W4MarkType@core@@@stlp_std@@V?$allocator@W4MarkType@core@@@4@@stlp_std@@AAV?$vector@VLabelData@core@@V?$allocator@VLabelData@core@@@stlp_std@@@4@1ABVTextPosition@2@2@Z
	void getLabelsPosition(vector<MarkType, allocator<MarkType> > const&, multimap<TextPosition, LabelData, struct stlp_std::less<TextPosition>, allocator<struct stlp_std::pair<TextPosition const , LabelData> > >&)|?getLabelsPosition@TextManager@core@@QAEXABV?$vector@W4MarkType@core@@V?$allocator@W4MarkType@core@@@stlp_std@@@stlp_std@@AAV?$multimap@VTextPosition@core@@VLabelData@2@U?$less@VTextPosition@core@@@stlp_std@@V?$allocator@U?$pair@$$CBVTextPosition@core@@VLabelData@2@@stlp_std@@@5@@4@@Z
	unsigned int getLastActionItemCount()|?getLastActionItemCount@TextManager@core@@QAEIXZ
	bool getLineFast(int, v8string*, deque<LabelData, allocator<LabelData> >*, ITextManagerCash*)|?getLineFast@TextManager@core@@QAE_NHPAV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@PAV?$deque@VLabelData@core@@V?$allocator@VLabelData@core@@@stlp_std@@@4@PAVITextManagerCash@2@@Z
	int getLinesCountSelection()|?getLinesCountSelection@TextManager@core@@QAEHXZ
	int getMaxLineLength(int*)|?getMaxLineLength@TextManager@core@@QAEHPAH@Z
	int getMpodifyActionCounter()|?getMpodifyActionCounter@TextManager@core@@QAEHXZ
	bool getRedoActionCode(DocActionType&)|?getRedoActionCode@TextManager@core@@QAE_NAAW4DocActionType@2@@Z
	InterfacePtr<struct IUnknown> getRedoActionExternalData()|?getRedoActionExternalData@TextManager@core@@QAE?AV?$InterfacePtr@UIUnknown@@@2@XZ
	void getSelectRange(TextPosition&, TextPosition&)|?getSelectRange@TextManager@core@@QAEXAAVTextPosition@2@0@Z
	wchar_t const* getSelectText()|?getSelectText@TextManager@core@@QAEPB_WXZ
	void getSelectionLabels(vector<LabelData, allocator<LabelData> >&, vector<LabelData, allocator<LabelData> >&, set<MarkType, struct stlp_std::less<MarkType>, allocator<MarkType> > const&)|?getSelectionLabels@TextManager@core@@QAEXAAV?$vector@VLabelData@core@@V?$allocator@VLabelData@core@@@stlp_std@@@stlp_std@@0ABV?$set@W4MarkType@core@@U?$less@W4MarkType@core@@@stlp_std@@V?$allocator@W4MarkType@core@@@4@@4@@Z
	bool getSrcLineNoByCurrentLineNo(int, set<int, struct stlp_std::less<int>, allocator<int> >&)|?getSrcLineNoByCurrentLineNo@TextManager@core@@QAE_NHAAV?$set@HU?$less@H@stlp_std@@V?$allocator@H@2@@stlp_std@@@Z
	void getTextArea(const TextPosition&in, const TextPosition&in, wchar_t**)|?getTextArea@TextManager@core@@QAEXABVTextPosition@2@0PAPA_W@Z
	ITextManagerSite* getTextManagerSite()|?getTextManagerSite@TextManager@core@@QAEPAVITextManagerSite@2@XZ
	bool getTextPositionByOffset(TextPosition, unsigned int, TextPosition&)|?getTextPositionByOffset@TextManager@core@@QAE_NVTextPosition@2@IAAV32@@Z
	bool getUndoActionCode(DocActionType&)|?getUndoActionCode@TextManager@core@@QAE_NAAW4DocActionType@2@@Z
	InterfacePtr<struct IUnknown> getUndoActionExternalData()|?getUndoActionExternalData@TextManager@core@@QAE?AV?$InterfacePtr@UIUnknown@@@2@XZ
	bool getUndoActionSelectionAfter(TextPosition&, TextPosition&)|?getUndoActionSelectionAfter@TextManager@core@@QAE_NAAVTextPosition@2@0@Z
	bool getUndoActionSelectionBefore(TextPosition&, TextPosition&)|?getUndoActionSelectionBefore@TextManager@core@@QAE_NAAVTextPosition@2@0@Z
	bool insertLine(int, const v8string&in)|?insertLine@TextManager@core@@QAE_NHABV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@@Z
	bool isActionModify(DocActionType)|?isActionModify@TextManager@core@@QAE_NW4DocActionType@2@@Z
	bool isLastEditActionModify()|?isLastEditActionModify@TextManager@core@@QAE_NXZ
	bool isLastLineFull()|?isLastLineFull@TextManager@core@@QAE_NXZ
	bool isLastSelectionLineFull()|?isLastSelectionLineFull@TextManager@core@@QAE_NXZ
	bool isLineFull(int)|?isLineFull@TextManager@core@@QAE_NH@Z
	bool isModified()|?isModified@TextManager@core@@QAE_NXZ
	bool isRedoData()|?isRedoData@TextManager@core@@QAE_NXZ
	bool isSelectionContainLabel(MarkType)|?isSelectionContainLabel@TextManager@core@@QAE_NW4MarkType@2@@Z
	bool isSelectionEmpty()|?isSelectionEmpty@TextManager@core@@QAE_NXZ
	bool isUndoData()|?isUndoData@TextManager@core@@QAE_NXZ
	bool load(InputFileStream&)|?load@TextManager@core@@QAE_NAAVInputFileStream@2@@Z
	bool load(wchar_t const*)|?load@TextManager@core@@QAE_NPB_W@Z
	void markAllSelectionChar(MarkType)|?markAllSelectionChar@TextManager@core@@QAEXW4MarkType@2@@Z
	void markCurrentRedoUndoStateAsTimerProcessed()|?markCurrentRedoUndoStateAsTimerProcessed@TextManager@core@@QAEXXZ
	void markStartsOfEachLine(MarkType)|?markStartsOfEachLine@TextManager@core@@QAEXW4MarkType@2@@Z
	void moveLabels(set<MarkType, struct stlp_std::less<MarkType>, allocator<MarkType> > const&, const TextPosition&in, const TextPosition&in, bool)|?moveLabels@TextManager@core@@QAEXABV?$set@W4MarkType@core@@U?$less@W4MarkType@core@@@stlp_std@@V?$allocator@W4MarkType@core@@@4@@stlp_std@@ABVTextPosition@2@1_N@Z
	bool redo(TextPosition&, TextPosition&, struct IUnknown**, IRedoUndoProcessingSite*)|?redo@TextManager@core@@QAE_NAAVTextPosition@2@0PAPAUIUnknown@@PAVIRedoUndoProcessingSite@2@@Z
	bool removeLabel(MarkType, int, int, bool)|?removeLabel@TextManager@core@@QAE_NW4MarkType@2@HH_N@Z
	bool removeLabel(MarkType, char const*, int, int, bool)|?removeLabel@TextManager@core@@QAE_NW4MarkType@2@PBDHH_N@Z
	bool removeLabel(MarkType, char const*, int, bool)|?removeLabel@TextManager@core@@QAE_NW4MarkType@2@PBDH_N@Z
	bool removeLabel(MarkType, char const*, bool, bool)|?removeLabel@TextManager@core@@QAE_NW4MarkType@2@PBD_N2@Z
	bool removeLabel(MarkType, bool)|?removeLabel@TextManager@core@@QAE_NW4MarkType@2@_N@Z
	void removeLabels(vector<MarkType, allocator<MarkType> >&, bool)|?removeLabels@TextManager@core@@QAEXAAV?$vector@W4MarkType@core@@V?$allocator@W4MarkType@core@@@stlp_std@@@stlp_std@@_N@Z
	void removeLabelsFromLine(vector<MarkType, allocator<MarkType> >&, int, bool)|?removeLabelsFromLine@TextManager@core@@QAEXAAV?$vector@W4MarkType@core@@V?$allocator@W4MarkType@core@@@stlp_std@@@stlp_std@@H_N@Z
	bool replaceLine(int, const v8string&in)|?replaceLine@TextManager@core@@QAE_NHABV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@@Z
	bool save(OutputFileStream&)|?save@TextManager@core@@QAE_NAAVOutputFileStream@2@@Z
	bool setChangeTextNotificationState(bool)|?setChangeTextNotificationState@TextManager@core@@QAE_N_N@Z
	bool setLabel(MarkType, char const*, int, int, bool)|?setLabel@TextManager@core@@QAE_NW4MarkType@2@PBDHH_N@Z
	bool setLabel(MarkType, char const*, int, bool)|?setLabel@TextManager@core@@QAE_NW4MarkType@2@PBDH_N@Z
	void setLabels(vector<LabelData, allocator<LabelData> >&, bool)|?setLabels@TextManager@core@@QAEXAAV?$vector@VLabelData@core@@V?$allocator@VLabelData@core@@@stlp_std@@@stlp_std@@_N@Z
	void setRedoActionExternalData(struct IUnknown*)|?setRedoActionExternalData@TextManager@core@@QAEXPAUIUnknown@@@Z
	void setSavePoint()|?setSavePoint@TextManager@core@@QAEXXZ
	void setSelectNULL(const TextPosition&in)|?setSelectNULL@TextManager@core@@QAEXABVTextPosition@2@@Z
	void setSelectNULL(int, int)|?setSelectNULL@TextManager@core@@QAEXHH@Z
	void setSelectRange(const TextPosition&in, const TextPosition&in)|?setSelectRange@TextManager@core@@QAEXABVTextPosition@2@0@Z
	void setSelectRange(int, int, int, int)|?setSelectRange@TextManager@core@@QAEXHHHH@Z
	void setSelectText(wchar_t const*, bool)|?setSelectText@TextManager@core@@QAEXPB_W_N@Z
	void setTextManagerSite(ITextManagerSite*)|?setTextManagerSite@TextManager@core@@QAEXPAVITextManagerSite@2@@Z
	void setUndoActionExternalData(struct IUnknown*)|?setUndoActionExternalData@TextManager@core@@QAEXPAUIUnknown@@@Z
	void testEmptySelection(const EditAction&in)|?testEmptySelection@TextManager@core@@QAEXABVEditAction@2@@Z
	void testEmptySelection()|?testEmptySelection@TextManager@core@@QAEXXZ
	bool undo(TextPosition&, TextPosition&, struct IUnknown**, IRedoUndoProcessingSite*)|?undo@TextManager@core@@QAE_NAAVTextPosition@2@0PAPAUIUnknown@@PAVIRedoUndoProcessingSite@2@@Z
	bool undoCreated(struct IUnknown**)|?undoCreated@TextManager@core@@QAE_NPAPAUIUnknown@@@Z
	void writeLine(const v8string&in)|?writeLine@TextManager@core@@QAEXABV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@@Z

	void collectSelectionStrInfo_Internal()|?collectSelectionStrInfo_Internal@TextManager@core@@IAEXXZ
	void convertPosBA(TextPosition&, bool&)|?convertPosBA@TextManager@core@@IAEXAAVTextPosition@2@AA_N@Z
	void convertPosBS(TextPosition&, bool&)|?convertPosBS@TextManager@core@@IAEXAAVTextPosition@2@AA_N@Z
	void convertPosPG(class PageBase*, TextPosition&)|?convertPosPG@TextManager@core@@IAEXPAVPageBase@@AAVTextPosition@2@@Z
	void convertPosSA(TextPosition&, bool&)|?convertPosSA@TextManager@core@@IAEXAAVTextPosition@2@AA_N@Z
	bool existAndNotEmptyAfter()|?existAndNotEmptyAfter@TextManager@core@@IAE_NXZ
	bool existAndNotEmptyBefore()|?existAndNotEmptyBefore@TextManager@core@@IAE_NXZ
	bool existAndNotEmptySelection()|?existAndNotEmptySelection@TextManager@core@@IAE_NXZ
	class PageListAfter* getAfter()|?getAfter@TextManager@core@@IAEPAVPageListAfter@@XZ
	wchar_t getAfterFirstChar()|?getAfterFirstChar@TextManager@core@@IAE_WXZ
	class PageListBefore* getBefore()|?getBefore@TextManager@core@@IAEPAVPageListBefore@@XZ
	void getBufEmptyState(bool&, bool&, bool&)|?getBufEmptyState@TextManager@core@@IAEXAA_N00@Z
	class PageBase* getFirstPage()|?getFirstPage@TextManager@core@@IAEPAVPageBase@@XZ
	unsigned int getLabelDirection(const LabelData&in)|?getLabelDirection@TextManager@core@@IAEIABVLabelData@2@@Z
	unsigned int getLabelDirection(MarkType)|?getLabelDirection@TextManager@core@@IAEIW4MarkType@2@@Z
	void getLabelForSrcLine(int, char*, unsigned long)|?getLabelForSrcLine@TextManager@core@@IAEXHPADK@Z
	bool getLineStart(int, int, class PageBase**, int*, ITextManagerCash*, int*, unsigned short*)|?getLineStart@TextManager@core@@IAE_NHHPAPAVPageBase@@PAHPAVITextManagerCash@2@1PAG@Z
	class PageBase* getNextPage(class PageBase*)|?getNextPage@TextManager@core@@IAEPAVPageBase@@PAV3@@Z
	class PageBase* getPrevPage(class PageBase*)|?getPrevPage@TextManager@core@@IAEPAVPageBase@@PAV3@@Z
	class DocActionList* getRedoUndoList()|?getRedoUndoList@TextManager@core@@IAEPAVDocActionList@@XZ
	class PageSelection* getSelection()|?getSelection@TextManager@core@@IAEPAVPageSelection@@XZ
	int getSrcLineNoFromLabel(char const*)|?getSrcLineNoFromLabel@TextManager@core@@IAEHPBD@Z
	void getTextArea(const TextPosition&in, const TextPosition&in, class PageBase**, class PageBase**, int&, int&, int&, int&)|?getTextArea@TextManager@core@@IAEXABVTextPosition@2@0PAPAVPageBase@@1AAH222@Z
	bool haveSomeLabels()|?haveSomeLabels@TextManager@core@@IAE_NXZ
	void internalInit()|?internalInit@TextManager@core@@IAEXXZ
	bool moveInfo_after_before(const TextPosition&in)|?moveInfo_after_before@TextManager@core@@IAE_NABVTextPosition@2@@Z
	bool moveInfo_after_selection(const TextPosition&in)|?moveInfo_after_selection@TextManager@core@@IAE_NABVTextPosition@2@@Z
	bool moveInfo_before_after(const TextPosition&in)|?moveInfo_before_after@TextManager@core@@IAE_NABVTextPosition@2@@Z
	bool moveInfo_before_selection(const TextPosition&in)|?moveInfo_before_selection@TextManager@core@@IAE_NABVTextPosition@2@@Z
	bool moveInfo_selection_after(const TextPosition&in)|?moveInfo_selection_after@TextManager@core@@IAE_NABVTextPosition@2@@Z
	bool moveInfo_selection_before(const TextPosition&in)|?moveInfo_selection_before@TextManager@core@@IAE_NABVTextPosition@2@@Z
	void onSomeTextChanged()|?onSomeTextChanged@TextManager@core@@IAEXXZ
	bool restoreLabels(deque<LabelData, allocator<LabelData> >&, deque<LabelData, allocator<LabelData> >&)|?restoreLabels@TextManager@core@@IAE_NAAV?$deque@VLabelData@core@@V?$allocator@VLabelData@core@@@stlp_std@@@stlp_std@@0@Z
	bool saveLabels(const TextPosition&in, const TextPosition&in, set<class PageBase*, struct stlp_std::less<class PageBase*>, allocator<class PageBase*> > const&, deque<LabelData, allocator<LabelData> >&, deque<LabelData, allocator<LabelData> >&)|?saveLabels@TextManager@core@@IAE_NABVTextPosition@2@0ABV?$set@PAVPageBase@@U?$less@PAVPageBase@@@stlp_std@@V?$allocator@PAVPageBase@@@3@@stlp_std@@AAV?$deque@VLabelData@core@@V?$allocator@VLabelData@core@@@stlp_std@@@5@2@Z
	void saveSelLabels()|?saveSelLabels@TextManager@core@@IAEXXZ
#endif

:struct LocalWString 4
:dlls
#if ver < 8.3
	core82.dll
#else
	core83.dll
#endif
	void ctor()|??0LocalWString@core@@QAE@XZ
	v8string getString(const v8string&in)const|?getString@LocalWString@core@@QBE?AV?$basic_string@_WV?$char_traits@_W@stlp_std@@V?$allocator@_W@2@@stlp_std@@ABV34@@Z
