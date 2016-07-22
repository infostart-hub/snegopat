/*
    intellisite.as
*/
#pragma once
#include "../../all.h"

// синглтон списка снегопата
IntelliSite&& oneIntelliSite;
IntelliSite&& getIntelliSite()
{
    if (oneIntelliSite is null)
        &&oneIntelliSite = IntelliSite();
    return oneIntelliSite;
}

const string hotOrderDataPath = "Snegopat/HotWords";
const uint16 spaceSymbol = '∙';

// Элементы, которые вставляются из списка, должны наследоваться от этого класса
class SmartBoxInsertableItem : SmartBoxItem {
    SmartBoxInsertableItem(const string& descr, imagesIdx img)
    {
        super(descr, img);
    }
    void textForInsert(string&out text)
    {
        text = d.descr;
    }
    void updateInsertPosition(TextWnd& wnd, TextPosition& start, TextPosition& end, bool& notIndent)
    {
    }
    void afterInsert(TextWnd&& editor)
    {
    }
};

// Максимальная высота списка в строках
const uint maxItems = 12;
// Ширина окна списка. Потом сделаем настраиваемой
uint boxWidth;
uint getBoxWidth() { return boxWidth; }

// Можно ли осуществлять фильтрацию по нескольким подстрокам
bool allowMultyFilter;
bool isAllowMultyFilter() { return allowMultyFilter; }

uint maxHotOrderItems()
{
    return 100;
}

// Какие языки использовать
enum UseLangFlags{ useLangEng = 1, useLangRus = 2 };
uint useLangs = useLangRus;

OptionsEntry oeUseLangs("UseLangs", function(v){v = uint(useLangRus); },
	function(v) {Numeric n; v.getNumeric(n); useLangs = n; },
	function(v){Numeric n; v.getNumeric(n); useLangs = n; return false; });

OptionsEntry oeListWidth("ListWidth", function(v){v = 250; },
	function(v){Numeric n; v.getNumeric(n); boxWidth = n; },
	function(v){Numeric n; v.getNumeric(n); boxWidth = n; return false; });

OptionsEntry oeAllowMultyFilter("AllowFilterInSmartList", function(v){v = true; },
	function(v){v.getBoolean(allowMultyFilter); },
	function(v){v.getBoolean(allowMultyFilter); return false; });

funcdef void AfterSelect(bool bCancel);

class IntelliSite : SmartBoxSite {
    // Окно отображения списка
    SmartBoxWindow smartBox;
    // Массив групп элементов
    array<array<SmartBoxItem&&>&&> itemsGroup;
    // текущий буфер набранного текста
    string buffer;
    // положение каретки в буфере
    uint posInBuffer;
    // текстовое окно, с которым работаем
    TextWnd&& textWnd;
    ITextEditor&& editor;
    // Размеры шрифта редактора
    Size fontSize;
    // Координаты каретки
    int xCaret;
    int	yCaret;
    Point boxCornerPosition;
    uint boxWidth;
    // Положение в тексте
    TextPosition caretPos;
    // Список открыт снизу строки текста
    bool boxIsUnderLine;
    bool bCaretCreated;
    bool bInHide;
    bool bAllowMultyFilter;
    array<string>&& hotItems;
    //ToolTip							m_templateToolTip;
    IntelliSite()
    {
        fontSize.cx = 0;
        clearAllItems();
        // Подпишемся на событие изменения настроек текстового редактора,
        // для пересчета размера шрифта
        IEventService&& es = getEventService();
        es.subscribe(eTxtEdtOptionChanged, AStoIUnknown(TextEditorSettingChangeNotifier(), IID_IEventRecipient));
        prepareV8StockItems();
        loadHotOrder();
        exitAppHandlers.insertLast(PVV(this.saveHotOrder));
    }
    // Очистка элементов
    void clearAllItems()
    {
        itemsGroup.resize(0);
        itemsGroup.insertLast(array<SmartBoxItem&&>()); // Добавляем пустую группу для отдельных элементов
    }
    // Добавление группы элементов для показа в списке
    void addItemGroup(array<SmartBoxItem&&>&& group)
    {
        itemsGroup.insertLast(group);
    }
    // Добавление одного элемента для показа в списке
    void addItem(SmartBoxItem&& item)
    {
        itemsGroup[0].insertLast(item);
    }
    // Активен ли сейчас список
    bool isActive() const
    {
        return editor !is null;
    }
    // Показать список. Вызывается после заполнения его необходимыми элементами.
    // Указывается начальная строка для первой фильтрации.
    // Возвращает true, если список показан, false - не показан
    bool show(TextWnd&& twnd, const string& beginOfWord, const string& selected = "", bool snegoList = true)
    {
        //debugger();
        if (isActive())
            return false;
        buffer = beginOfWord;
        posInBuffer = buffer.length;
        // Отфильтруем элементы
        boxIsUnderLine = true;
        setHotOrderForItems();
        array<SmartBoxItem&&>&& items = filter();
        // Если отфильтрованный список пустой - даже не вылазим
        int itemsCount = items.length;
        if (itemsCount == 0) {
            clearAllItems();
            return false;
        }
        // Запоминаем редактор
        &&textWnd = twnd;
        &&editor = textWnd.ted;
        bInHide = false;
        // Обновляем опции
        readSettings();
        // Запоминаем стартовые условия
        //Message("Font " + fontSize.cx + ", " + fontSize.cy + " " + string(font.lf.lfFaceNameStart));
        editor.getCaretPosition(caretPos);  // где в тексте каретка
        GetCaretPos(boxCornerPosition);     // координаты каретки в окне
        xCaret = boxCornerPosition.x;
        yCaret = boxCornerPosition.y;
        boxCornerPosition.y += fontSize.cy + 3;     // Первоначально считаем, что список будет ниже текста
        ClientToScreen(textWnd.hWnd, boxCornerPosition);    // координаты угла списка должны быть экранные, ибо POPUP
        //Print("Text pos: " + caretPos.line + ", " + caretPos.col + "  Caret pos: " + xCaret + ", " + yCaret +
        //      " boxCorner: " + boxCornerPosition.x + ", " + boxCornerPosition.y + " Font: " + fontSize.cx + ", " + fontSize.cy);
        // Создаем окно списка и устанавливаем ему элементы для показа
        smartBox.createWindow(this, uint(WS_POPUP | (snegoList ? WS_DLGFRAME : WS_BORDER)), 0, textWnd.hWnd);
        // Теперь проверим, уместится ли список ниже текста
        Rect rcScreen;
        screenGeometry(textWnd.hWnd, rcScreen); // Получим границы текущего монитора
        if (boxCornerPosition.y + smartBox.fullHeight(maxItems) > rcScreen.bottom) {
            // Список не влезет снизу. Будем отображать его над текстом
            boxIsUnderLine = false;
            boxCornerPosition.y -= fontSize.cy + 6;
            items.reverse();    // В этом случае элементы в нем должны идти в обратном порядке
        }
        // Теперь проверим по ширине монитора
        if (boxCornerPosition.x + boxWidth > rcScreen.right - 10)
            boxCornerPosition.x = rcScreen.right - boxWidth - 10;
        if (boxCornerPosition.x < rcScreen.left + 10)
            boxCornerPosition.x = rcScreen.left + 10;
        // Зададим списку элементы
        smartBox.setItems(items);
        // Установим положение списка
        setBoxPosition(itemsCount);
        // Установим текущий элемент
        bool currentItemSelected = false;
        if (!selected.isEmpty()) {
            string key = selected.dup().makeLower();
            for (int i = 0; i < itemsCount; i++) {
                if (items[i].d.key == key) {
                    currentItemSelected = true;
                    smartBox.setCurrentIdx(i);
                    break;
                }
            }
        }
        if (!currentItemSelected)
            smartBox.navigate(boxIsUnderLine ? navFirst : navLast);
        CreateCaret(textWnd.hWnd, 0, 2, fontSize.cy);
        bCaretCreated = true;
        SetCaretPos(xCaret, yCaret);
        ShowCaret(textWnd.hWnd);
        return true;
    }
    void setBoxPosition(uint itemsCount)
    {
        uint height = smartBox.fullHeight(itemsCount > maxItems ? maxItems : itemsCount);
        SetWindowPos(smartBox.hwnd, HWND(HWND_TOPMOST), boxCornerPosition.x, boxIsUnderLine ? boxCornerPosition.y : boxCornerPosition.y - height,
                     boxWidth, height, SWP_SHOWWINDOW);
    }
    private void readSettings()
    {
        boxWidth = getBoxWidth();
        bAllowMultyFilter = isAllowMultyFilter();
        if (fontSize.cx == 0)
            getFontSize();
    }
    private void getFontSize()
    {
        ITxtEdtOptions&& params = editor.unk;
        Font font;
        params.getFont(font);
        //Message("Font kind=" + font.kind + " Height=" + font.lf.lfHeight);
        getLogFontSizes(font.lf, fontSize);
        //Message("font.cx=" + fontSize.cx + " font.cy=" + fontSize.cy);
    }

    // Метод фильтрует существующие элементы, создавая массив с удовлетворяющему фильтру элементами
    array<SmartBoxItem&&>&& filter()
    {
        array<SmartBoxItem&&> result;

        if (posInBuffer == 0) {
            // Добавляем все элементы
            for (uint g = 0, gm = itemsGroup.length(); g < gm; g++) {
                array<SmartBoxItem&&>&& group = itemsGroup[g];
                for (uint i = 0, im = group.length(); i < im; i++) {
                    SmartBoxItem&& item = group[i];
                    if (!item.d.exclude)
                        result.insertLast(item);
                }
            }
        } else {
            StringComparator cmp;
            string pattern = buffer.substr(0, posInBuffer);
            if (pattern.find(spaceSymbol) >= 0)
                cmp.setPattern(pattern.replace(spaceSymbol, ' '), cmContain);
            else
                cmp.setPattern(pattern, cmBeginWithOtherLangs);
            string patternUpper = pattern.makeUpper();
            for (uint g = 0, gm = itemsGroup.length(); g < gm; g++) {
                array<SmartBoxItem&&>&& group = itemsGroup[g];
                for (uint i = 0, im = group.length(); i < im; i++) {
                    SmartBoxItem&& item = group[i];
                    if (!item.d.exclude && (cmp.match(item.d.key) || compareUcaseLetters(item.d.descr, patternUpper)))
                        result.insertLast(item);
                }
            }
        }
        sortItemsArray(result, boxIsUnderLine);
        return result;
    }

    // Реализация интерфейса взаимодействия со списком
    void onDoSelect(SmartBoxItemBaseIface&& pSelected) {
        SmartBoxInsertableItem&& ins = cast<SmartBoxInsertableItem>(pSelected);
        if (ins !is null) {
            TextPosition tpStart = caretPos;
            tpStart.col -= posInBuffer;
            TextPosition tpEnd = tpStart;
            tpEnd.col += buffer.length;
            bool notIndent = false;
            ins.updateInsertPosition(textWnd, tpStart, tpEnd, notIndent);
            string text;
            ins.textForInsert(text);
			while ('\x8' == text[0]) {
				if (tpStart.col > 1)
					tpStart.col--;
				text.remove(0);
			}
            editor.setSelection(tpStart, tpEnd, false, false);
            insertInSelection(editor, textWnd.textDoc.tm, textWnd.textDoc.itm, text, true, !notIndent);
            updateHotOrder(ins);
            buffer.empty();
            TextWnd&& tw = textWnd;
            hide(ins);
            // Уведомим сам элемент, что его вставили
            ins.afterInsert(tw);
        }
    }
    bool onKeydown(uint wParam, uint lParam)
    {
        switch (wParam) {
        case VK_ESCAPE:
            hide();
            return true;
        case VK_BACK:
            if (posInBuffer == 0)
                hideAndSend(WM_KEYDOWN, wParam, lParam);
            else {
				int c = (GetKeyState(VK_CONTROL) & 0x8000) > 0 ? posInBuffer : 1;
                TextPosition tpStart = caretPos;
                tpStart.col -= c;
                editor.setSelection(tpStart, caretPos, false, false);
                editor.setSelectionText("");
                buffer.remove(posInBuffer - c, c);
                moveCaret(-c);
            }
            return true;
        case VK_LEFT:
            if (posInBuffer == 0)
                hideAndSend(WM_KEYDOWN, wParam, lParam);
            else
                moveCaret(-1);
            return true;
        case VK_RIGHT:
            if (posInBuffer == buffer.length)
                hideAndSend(WM_KEYDOWN, wParam, lParam);
            else
                moveCaret(1);
            return true;
        case VK_DELETE:
            if (posInBuffer == 0)
                hideAndSend(WM_KEYDOWN, wParam, lParam);
            else {
                TextPosition tpEnd = caretPos;
                tpEnd.col++;
                editor.setSelection(caretPos, tpEnd, false, false);
                editor.setSelectionText("");
                buffer.remove(posInBuffer);
                moveCaret(0);
            }
            return true;
        case VK_TAB:
            SendMessage(smartBox.hwnd, WM_KEYDOWN, VK_RETURN, 0);
            return true;
        }
        return false;
    }
    void onChar(uint wParam, uint lParam)
    {
        if ((GetKeyState(VK_CONTROL) & 0x8000) > 0 || VK_BACK == wParam)
            return;
        wchar_t symbol = wParam;
        if (' ' == symbol) {
            if (bAllowMultyFilter && ((GetKeyState(VK_SHIFT) & 0x8000) > 0 || buffer.find(spaceSymbol) >= 0)) {
                symbol = spaceSymbol;
            } else {
                hideAndSend(WM_CHAR, wParam, lParam);
                return;
            }
        }
        string text;
        text.insert(0, symbol);
        editor.setSelection(caretPos, caretPos, false, false);
        editor.setSelectionText(text);
        buffer.insert(posInBuffer, symbol);
        moveCaret(1);
    }
    bool onKillFocus(HWND hNewWnd)
    {
        if (!bInHide) {
            if (hNewWnd == textWnd.hWnd) {
                SetFocus(smartBox.hwnd);
                return true;
            } else if (hNewWnd == smartBox.hwnd)
                return false;
        }
        hide();
        return true;
    }
    void hide(SmartBoxInsertableItem&& insert = null)
    {
        if (bInHide)
            return;
        bInHide = true;
        if (bCaretCreated) {
            DestroyCaret();
            bCaretCreated = false;
        }
        DestroyWindow(smartBox.hwnd);
        smartBox.setItems(array<SmartBoxItem&&>());
        ITextParserCache&& cache = cast<IUnknown>(textWnd.textDoc.itm);
        if (cache !is null)
            cache.clearCache();
        if (!buffer.isEmpty() && buffer.find(spaceSymbol) >= 0) {
            // Мы осуществляли многословную фильтрацию, в ходе которой в текст вставлялись символы '∙' (0x2219)
            TextPosition tpStart = caretPos;
            tpStart.col -= posInBuffer;
            TextPosition tpEnd = tpStart;
            tpEnd.col += buffer.length;
            editor.setSelection(tpStart, tpEnd, false, false);
            insertInSelection(editor, textWnd.textDoc.tm, textWnd.textDoc.itm, buffer.replace(spaceSymbol, ' '), true, true);
            editor.setCaretPosition(caretPos, false);
        }
        clearAllItems();
        TextWnd&& tw = textWnd;
        &&textWnd = null;
        &&editor = null;
        // Уведомим текстовый процессор о закрытии списка
        tw.textDoc.tp.itemInserted(tw, insert);
    }
    void hideAndSend(uint msg, uint wParam, uint lParam)
    {
        HWND hWnd = textWnd.hWnd;
        hide();
        SendMessage(hWnd, msg, wParam, lParam);
    }
    void moveCaret(int step)
    {
        caretPos.col += step;
        posInBuffer += step;
        xCaret += fontSize.cx * step;
        SetCaretPos(xCaret, yCaret);
        array<SmartBoxItem&&>&& items = filter();
        int itemsCount = items.length;
        if (itemsCount == 0) {
            hide();
            return;
        }
        smartBox.setItems(items);
        smartBox.navigate(boxIsUnderLine ? navFirst : navLast);
        setBoxPosition(itemsCount);

        if (editor !is null) {
            if (posInBuffer < buffer.length) {
                TextPosition tpCurrent = caretPos, tpEnd = caretPos;
                tpCurrent.col -= posInBuffer;
                tpEnd.col = tpCurrent.col + buffer.length;
                editor.setSelection(tpCurrent, tpEnd, false, false);
            } else
                editor.setCaretPosition(caretPos);
            editor.updateView();
        }
    }
    void setHotOrderForItems()
    {
        for (uint i = 0, im = itemsGroup.length; i < im; i++) {
            array<SmartBoxItem&&>&& group = itemsGroup[i];
            for (uint k = 0, km = group.length; k < km; k++) {
                SmartBoxItem&& item = group[k];
				if (item.d.hotOrder != uint(-1))
					item.d.hotOrder = hotItems.find(item.d.key) + 1;
            }
        }
    }
    void updateHotOrder(SmartBoxItem&& item)
    {
        if (item.d.hotOrder > 0 && item.d.hotOrder != uint(-1))
            hotItems.removeAt(item.d.hotOrder - 1);
        hotItems.insertLast(item.d.key);
        if (hotItems.length > maxHotOrderItems())
            hotItems.removeAt(0);
    }
    void loadHotOrder()
    {
        IProfileFolder&& root = getProfileRoot();
        v8string data;
        root.getString(hotOrderDataPath, data);
        &&hotItems = data.str.split("\n");
    }
    void saveHotOrder()
    {
        IProfileFolder&& root = getProfileRoot();
        //Value val;
        //if (root.getValue(v8string(hotOrderDataPath), val))
        //    root.deleteValue(hotOrderDataPath);
        root.createAndSetValue(hotOrderDataPath, gpflBaseUser, Value(v8string(join(hotItems, "\n"))));
    }
	bool isLineTailEmpty() {
		return getTextLine(textWnd.textDoc.tm, caretPos.line).substr(caretPos.col - 1).replace(indentRex, "").isEmpty();
	}
};

class TextEditorSettingChangeNotifier {
    void onEvent(const Guid&in eventID, long val, IUnknown& obj)
    {
        oneIntelliSite.fontSize.cx = oneIntelliSite.fontSize.cy = 0;
    }
};

// Реализация вставляемого элемента метода
mixin class MethodInsertable {
    bool isFunction;
    uint paramsCount;
    void textForInsert(string&out text)
    {
        text = d.descr + "(";
        if (paramsCount > 0)
            text += "¦";
        text += ")";
        if (!isFunction)
            text += ";";
    }
};

bool compareUcaseLetters(const string& test, const string& pattern)
{
    return test.extract(ucaseLetterRex).beginFrom(pattern);
}

// Метод-перехватчик обработки команд текстовым окном.
funcdef bool TE_onExecute(ICommandTarget&, const Command&);
bool checkCommandAndHideSmartBox(ICommandTarget& tgt, const Command& command, TrapVirtualStdCall& trap)
{
    //Message("" + command.id.group + " " + command.id.num);
    // При посылании команды текстовому окну открыт список снегопата
    if (oneIntelliSite !is null && oneIntelliSite.isActive()) {
        // проверим, будет ли команда обработана
        uint cs = commandState(command.id);
        if (cs & cmdStateEnabled != 0)
            oneIntelliSite.hide();   // спрячем список снегопата
    }
    TE_onExecute&& orig;
    trap.getOriginal(&&orig);
    return orig(tgt, command);
}
