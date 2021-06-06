/*
    sqlcolors.as
    Функционал по группированию строк в редакторе с помощью //{ //},
    а также раскраске многострочных строк в цвета запросов
*/
// Данные строки нужны только для среды разработки и вырезаются препроцессором
#pragma once
#include "../../all.h"

Packet sqlColorsAndGrouping("sqlColorsAndGrouping", initGroupingAndColoring, piOnMainEnter);

// Перехватчик функции синтакс-разбора строки текста редактором 1С для
// текстового расширения "Встроенный язык"
TrapVirtualStdCall trITextExtColors_getColors;
// Перехватчик QueryInterface текстового расширения "Встроенный язык"
// Нужен для 8.2, где расширение не реализовывало раскраску фона, и приходилось
// отдавать свою реализацию интерфейса
TrapVirtualStdCall trTextExtModule_QI;
// с 8.3 расширение стало само поддерживать расцветку фона, и теперь надо
// перехватывать сами функции.
TrapVirtualStdCall trTxtExt_hasBG;
TrapVirtualStdCall trTxtExt_getBG;

// Мой экземпляр обработчика цвета фона
IUnknown&& myBGHandler;

// Один экземпляр текстового расширения "Язык запросов". Он и будет
// парсить строки в кавычках
ITextExtColors&& sqlColors;

// Использовать пользовательские группировки
bool usersGrouping;
OptionsEntry oeEnableCustomGrouping("EnableCustomGrouping", function(v) {v = true; },
    function(v){v.getBoolean(usersGrouping); },
    function(v){v.getBoolean(usersGrouping); initGroupingAndColoring(); return false; });

// Раскрашивать мульти-строки в цвета запросов.
bool colorizedMultiLines;
OptionsEntry oeQueryColors("QueryColors", function(v) {v = true; },
    function(v){v.getBoolean(colorizedMultiLines); },
    function(v){v.getBoolean(colorizedMultiLines); initGroupingAndColoring(); return false; });

// Менять фон для мульти-строк при раскраске в цвета запроса.
bool enableBkColorForMultiLine;
OptionsEntry oeEnableBkColorForMultyLine("EnableBkColorForMultyLine", function(v) {v = true; },
    function(v){v.getBoolean(enableBkColorForMultiLine); },
    function(v){v.getBoolean(enableBkColorForMultiLine); initGroupingAndColoring(); return false; });

// Цвет фона для мульти-строк при смене фона при их раскраске в цвета запроса.
uint colorBgForMultiLine = 0xE0E0E0;
OptionsEntry oeMultiLineBackground("MultiLineBackground", &&defvalBgColorForMultiLine,
    function(v){colorFromV8(v, colorBgForMultiLine); },
    function(v){colorFromV8(v, colorBgForMultiLine); return false; });

// Сворачивать многострочные литералы.
bool groupMultiLine = true;
OptionsEntry oeGroupMultiLine("GroupMultiLine", function(v) {v = true; },
    function(v){v.getBoolean(groupMultiLine); },
    function(v){v.getBoolean(groupMultiLine); initGroupingAndColoring(); return false; });

void defvalBgColorForMultiLine(Value& val) {
    IV8Color&& clr;
    currentProcess().createByClsid(V8Color, IID_IV8Color, clr);
    Color c(0xE0, 0xE0, 0xE0);
    clr.setColor(c);
    &&val.pValue = cast<IUnknown>(clr);
}

void colorFromV8(const Value& val, uint&out res) {
    IV8Color&& color = cast<IUnknown>(val.pValue);
    if (color !is null) {
        Color clr;
        color.getColor(clr);
        if (clr.kind == 0)
            res = clr.value.id;
    }
}

// Цвет символа |
uint colorForPipe = 0xBBBBBB;
// Этим мы будем сигнализировать процедуре определения фона текста о необходимости
// применения нашего алгоритма
const uint bgMagic = 0xDEADBEEF;
int bgColorTrapType = 0;

// Инициализация перехвата
bool initGroupingAndColoring() {
    getEventService().notify(eTxtEdtOptionChanged);
    if (!usersGrouping && !colorizedMultiLines) {
        // Не нужны ни группировки, ни раскраска запросов
        // Поверим, если перехваты уже установлены, снимем их
        if (trITextExtColors_getColors.state == trapEnabled)
            trITextExtColors_getColors.swap();
        if (trTextExtModule_QI.state == trapEnabled)
            trTextExtModule_QI.swap();
        if (trTxtExt_hasBG.state == trapEnabled)
            trTxtExt_hasBG.swap();
        if (trTxtExt_getBG.state == trapEnabled)
            trTxtExt_getBG.swap();
        return true;
    }
    // Хотя бы одна из опций "группировка" или "раскраска" активна.
    // значит, надо по-любому устанавливать/восстанавливать перехват на парсинг строки
    // Создаем текстовое расширение "Встроенный язык"
    IUnknown&& ext;
    if (trITextExtColors_getColors.state == trapNotActive) {
        currentProcess().createByClsid(gTextExtModule, IID_IUnknown, ext);
        // Получаем его интерфейс для синтакс-разбора строки
        ITextExtColors&& colorsExt = ext;
        if (colorsExt !is null) {
            // Ставим перехват на функцию разбора строки
            trITextExtColors_getColors.setTrap(colorsExt, ITextExtColors_getColors, ITextExtColors_getColorsTrap);
            // Создаем текстовое расширение "Язык запросов" 
            currentProcess().createByClsid(CLSID_TextExtSQL, IID_ITextExtColors, sqlColors);
        } else {
            doLog("Not have colorsExt in initGroupingAndColoring");
        }
    } else if (trITextExtColors_getColors.state == trapDisabled)
        trITextExtColors_getColors.swap();
    // Если включена раскраска строк в цвета запросов, надо разобраться с фоном
    if (colorizedMultiLines) {
        if (enableBkColorForMultiLine) {
            // Надо устанавливать или восстанавливать перехват на получение фона строки
            // Для начала выясним, какой тип перехвата нужно делать
            if (bgColorTrapType == 0) {	// Еще не выясняли, надо узнать
                if (ext is null)
                    currentProcess().createByClsid(gTextExtModule, IID_IUnknown, ext);
                ITextExtBackColors&& bgHandler = ext;
                if (bgHandler is null) {
                    &&myBGHandler = AStoIUnknown(MyTextExtBackColors(), IID_ITextExtBackColors);
                    // Ставим перехват на QueryInterface расширения "Встроенный язык"
                    ITextExtention&& tExt = ext;
                    trTextExtModule_QI.setTrap(tExt, 0, TextExtModule_QI);
                    bgColorTrapType = 1;
                } else {
					#if ver < 8.3.19
					// тут не знаю, как быть
                    trTxtExt_hasBG.setTrap(bgHandler, ITextExtBackColors_hasCustomBackground, TxtExt_hasCustomBackground);
                    trTxtExt_getBG.setTrap(bgHandler, ITextExtBackColors_getColorInfo, TxtExt_getColorInfo);
                    bgColorTrapType = 2;
					#endif
                }
            } else if (bgColorTrapType == 1) {
                if (trTextExtModule_QI.state != trapEnabled)
                    trTextExtModule_QI.swap();
            } else if (bgColorTrapType == 2) {
                if (trTxtExt_getBG.state != trapEnabled) {
                    trTxtExt_getBG.swap();
                    trTxtExt_hasBG.swap();
                }
            }
        } else {
            // Надо отключить перехваты на фон строки
            if (trTextExtModule_QI.state == trapEnabled)
                trTextExtModule_QI.swap();
            if (trTxtExt_hasBG.state == trapEnabled)
                trTxtExt_hasBG.swap();
            if (trTxtExt_getBG.state == trapEnabled)
                trTxtExt_getBG.swap();
        }
    }
    return true;
}

void printSyntaxInfos(const string& text, Vector& infos) {
    SyntaxItemInfoRef&& s = toSyntaxItemInfo(infos.start);
    Print("------");
    while (s < infos.end) {
        Print(text.substr(s.ref.start, s.ref.len) + "  blockKind=" + s.ref.blockKind + " blockMode=" + s.ref.blockMode + " isBlock=" + int(s.ref.isBlock)
            + " cat=" + s.ref.lexemCategory + " lexType=" + s.ref.lexemType);
        &&s = s + 1;
    }
}

// Обработчик перехваченной функции синтакс-разбора строки
funcdef void TE_gc(ITextExtColors&, const v8string&, Vector&);
void ITextExtColors_getColorsTrap(ITextExtColors& pThis, const v8string& sourceLine, Vector& infos) {
    // Вызовем штатную процедуру
    TE_gc&& orig;
    trITextExtColors_getColors.getOriginal(&&orig);
    orig(pThis, sourceLine, infos);
    // На нет и суда нет
    if (infos.end == infos.start)
        return;
    //printSyntaxInfos(sourceLine.str, infos);
    // Проверим на группирующие комментарии
    string srcLine = sourceLine.str;
    SyntaxItemInfoRef&& sInfo = toSyntaxItemInfo(infos.start);
    if (usersGrouping && checkForGroupingRemark(srcLine, infos))
        return;
    if (!colorizedMultiLines && !groupMultiLine)
        return;
    // Дополнительно парсить языком запросов будем, если первый токен - строковая константа, начинающаяся с |,
    // либо последний токен - открытая строковая константа
    if (!((vlString == sInfo.ref.lexemCategory && '|' == srcLine[sInfo.ref.start])
        || isLineEndWithOpenQuote(srcLine)))
        return;
    if (colorizedMultiLines) {
        // распарсим дополнительно все строковые константы в строке текста языком запросов
        // При этом если включена группировка, то там еще сгруппирует
        uint newCount;
        array<SQLBlockInfo&&>&& newBlocks = parseQuoteLexemAsSQL(srcLine, infos, newCount);
        // Теперь все полученные блоки нужно слить в один вектор
        infos.dtor();
        uint pWrite = infos.allock(newCount, SyntaxItemInfo_size);
        for (uint idx = 0, m = newBlocks.length; idx < m; idx++) {
            SQLBlockInfo&& pBlock = newBlocks[idx];
            uint size = pBlock.tokens.size();
            if (size != 0) {
                mem::memcpy(pWrite, pBlock.tokens.start, size);
                pWrite += size;
            }
        }
    } else {
        // Просто группировка, без раскраски
        checkForGroupingMultiLine(srcLine, infos);
    }
}

RegExp reGroupComment("(//\\{)|(//\\})");
// Проверка на группирующий комментарий
bool checkForGroupingRemark(const string& srcLine, Vector& infos) {
    if (infos.start > 0) {
        SyntaxItemInfoRef&& sInfo = toSyntaxItemInfo(infos.start);
        while (sInfo < infos.end) {
            // Если строка - коментарий, проверим на символы группировки
            if (vlRemark == sInfo.ref.lexemCategory) {
                auto res = reGroupComment.match(srcLine.substr(sInfo.ref.start));
                if (res.matches > 0) {
                    sInfo.ref.isBlock = res.text(0, 1).isEmpty() ? groupBlockEnd : groupBlockBegin;
                    sInfo.ref.blockKind = groupBlockKind;
                    sInfo.ref.blockMode = 0;
                    sInfo.ref.lexemCategory = vlUnknown;
                    sInfo.ref.lexemType = 999;
                    return true;
                }
                return false;
            }
            &&sInfo = sInfo + 1;
        }
    }
    return false;
}

// Процедура перебирает все токены в массиве, дополнительно обрабатывая
// строковые константы языком запросов. Обрабатываются те, которые либо начинаются с |,
// либо без закрывающей кавычки
array<SQLBlockInfo&&>&& parseQuoteLexemAsSQL(const string& srcLine, Vector& tokens, uint&out newCount) {
    SyntaxItemInfoRef&& sInfo = toSyntaxItemInfo(tokens.start);
    uint tokensCount = tokens.count(SyntaxItemInfo_size);
    array<SQLBlockInfo&&> sqlBlocks;
    newCount = 0;
    for (uint idx = 0; idx < tokensCount; idx++) {
        // Один блок по-любому войдет в новый вектор, либо как есть, либо как открывающая кавычка
        newCount++;
        bool needProcess = false, withoutBegin, withoutEnd;
        if (vlString == sInfo.ref.lexemCategory) {
            withoutBegin = srcLine[sInfo.ref.start] == '|';
            withoutEnd = isLineEndWithOpenQuote(srcLine.substr(sInfo.ref.start, sInfo.ref.len));
            if ((withoutBegin || withoutEnd) /*&& !(sInfo.ref.len == 2 && !withoutEnd)*/)
                needProcess = true;
        }
        if (needProcess) {
            // Добавим блок для открывающей кавычки
            SQLBlockInfo&& blockInfo = SQLBlockInfo();
            SyntaxItemInfoRef&& sCopy = blockInfo.addSyntaxBlock(sInfo.ref);
            sCopy.ref.len = 1;
            sCopy.ref.lexemCategory = vlUnknown;
            sCopy.ref.lexemType = 1000;
            if (withoutBegin) {
                sCopy.ref.color.kind = ckRGB;
                sCopy.ref.color.value.id = colorForPipe;
            }
            bool needChangeBG = true;
            BlockMarker isBlock = bmNone;
            int blockKind = 0;
            if (withoutEnd && !withoutBegin) {
                // Текст с открывающей, но без закрывающей кавычки.
                // Для него цвет фона будем менять только если он не пустой,
                // либо первый токен в строке - |
                if (srcLine[toSyntaxItemInfo(tokens.start).ref.start] != '|') {
                    isBlock = groupMultiLine ? groupBlockBegin : bmNone;
                    blockKind = groupBlockKind;
                    if (sInfo.ref.len == 1 ||
                        srcLine.substr(sInfo.ref.start + 1, sInfo.ref.len - 1).trim().isEmpty()) {
                        needChangeBG = false;
                    }
                }
            }
            if (withoutBegin && !withoutEnd && !isLineEndWithOpenQuote(srcLine)) {
                isBlock = groupMultiLine ? groupBlockEnd : bmNone;
                blockKind = groupBlockKind;
            }
            if (enableBkColorForMultiLine && needChangeBG) {
                sCopy.ref.color.value.uuid.data1 = bgMagic;
                sCopy.ref.color.value.uuid.data2 = withoutEnd ? 777 : sInfo.ref.len - 2;
            }
            sCopy.ref.isBlock = isBlock;
            sCopy.ref.blockKind = blockKind;

            sqlBlocks.insertLast(blockInfo);

            // Вытащим текст из кавычек и заменим в нем сдвоенные кавычки на обычные,
            // чтобы они нормально обработались языком запросов
            int innerLen = sInfo.ref.len - (withoutEnd ? 1 : 2);
            if (innerLen > 0) {
                string text = srcLine.substr(sInfo.ref.start + 1, innerLen);
                text.replace("\"\"", "\"");
                // Теперь такой текст можно отдавать парсеру цветов sql-запросов
                &&blockInfo = SQLBlockInfo();
                sqlColors.getColors(text, blockInfo.tokens);
                if (blockInfo.tokens.size() != 0) {
                    // Пофиксим позиции и длины
                    newCount += blockInfo.fixupStartPositions(sInfo.ref.start + 1, srcLine);
                    sqlBlocks.insertLast(&&blockInfo);
                }
            } else if (innerLen < 0) {
                Print("Bad inner len: " + innerLen);
            }

            // Учтем отдельный токен для закрывающей кавычки
            if (!withoutEnd) {
                newCount++;
                SQLBlockInfo&& blockInfo1 = SQLBlockInfo();
                SyntaxItemInfoRef&& sCopy1 = blockInfo1.addSyntaxBlock(sInfo.ref);
                sCopy1.ref.len = 1;
                sCopy1.ref.start = sInfo.ref.start + sInfo.ref.len - 1;
                sCopy1.ref.lexemCategory = vlUnknown;
                sCopy1.ref.lexemType = 1000;
                sqlBlocks.insertLast(blockInfo1);
            }
        } else {
            // Просто копируем блок
            SQLBlockInfo&& blockInfo = SQLBlockInfo();
            blockInfo.addSyntaxBlock(sInfo.ref);
            sqlBlocks.insertLast(&&blockInfo);
        }
        &&sInfo = sInfo + 1;
    }
    return sqlBlocks;
}

// Проверка на группирующий комментарий
void checkForGroupingMultiLine(const string& srcLine, Vector& infos) {
    if (infos.start > 0) {
        SyntaxItemInfoRef&& sInfo = toSyntaxItemInfo(infos.start);
        while (sInfo < infos.end) {
            bool needProcess = false, withoutBegin, withoutEnd;
            if (vlString == sInfo.ref.lexemCategory) {
                withoutBegin = srcLine[sInfo.ref.start] == '|';
                withoutEnd = isLineEndWithOpenQuote(srcLine.substr(sInfo.ref.start, sInfo.ref.len));
                if ((withoutBegin || withoutEnd) /*&& !(sInfo.ref.len == 2 && !withoutEnd)*/)
                    needProcess = true;
            }
            if (needProcess) {
                BlockMarker isBlock = bmNone;
                if (withoutEnd && !withoutBegin) {
                    if (srcLine[toSyntaxItemInfo(infos.start).ref.start] != '|')
                        isBlock = groupBlockBegin;
                }else if (withoutBegin && !withoutEnd && !isLineEndWithOpenQuote(srcLine))
                    isBlock = groupBlockEnd;
                if (isBlock != bmNone) {
                    sInfo.ref.isBlock = isBlock;
                    sInfo.ref.blockKind = groupBlockKind;
                    sInfo.ref.blockMode = 0;
                    sInfo.ref.lexemCategory = vlUnknown;
                    sInfo.ref.lexemType = 999;
                }
            }
            &&sInfo = sInfo + 1;
        }
    }
}


// Для хранения массивов токенов от разбора строковых литералов парсером языка запросов
class SQLBlockInfo {
    Vector tokens;
    // Создает вектор для одного элемента и копирует в него элемент
    SyntaxItemInfoRef&& addSyntaxBlock(SyntaxItemInfo& si) {
        tokens.allock(1, SyntaxItemInfo_size);
        SyntaxItemInfoRef&& p = toSyntaxItemInfo(tokens.start);
        p.ref.copy(si);
        return p;
    }
    // Исправляет стартовые позиции токенов после их разбора парсером языка запросов
    // также правится длина токенов, если в них встречаются кавычки, так как в
    // оригинальном тексте это сдвоенные кавычки.
    // возвращает количество токенов
    uint fixupStartPositions(uint shift, const string& srcLine) {
        uint tokensCount = Vector__count(tokens, SyntaxItemInfo_size);
        SyntaxItemInfoRef&& pS = toSyntaxItemInfo(tokens.start);
        for (uint idx = 0; idx < tokensCount; idx++) {
            pS.ref.start += shift;
            for (uint kk = pS.ref.start, kEnd = pS.ref.start + pS.ref.len; kk < kEnd; kk++) {
                if (srcLine[kk] == '\"') {
                    shift++;
                    kk++;
                    kEnd++;
                    pS.ref.len++;
                }
            }
            pS.ref.lexemCategory = vlUnknown;
            pS.ref.lexemType += 1001;
            pS.ref.isBlock = bmNone;
            pS.ref.blockKind = 0;
            pS.ref.blockMode = 0;
            &&pS = pS + 1;
        }
        return tokensCount;
    }
};

bool processHasCustomBackground(Vector& items) {
    if (items.start != 0) {
        SyntaxItemInfoRef&& p = toSyntaxItemInfo(items.start);
        while (p < items.end) {
            if (p.ref.color.value.uuid.data1 == bgMagic)
                return true;
            &&p = p + 1;
        }
    }
    return false;
}

void processGetColorInfo(Vector& items, Vector& res) {
    if (items.start != 0) {
        uint newCount = 0;
        SyntaxItemInfoRef&& p = toSyntaxItemInfo(items.start);
        while (p < items.end) {
            if (p.ref.color.value.uuid.data1 == bgMagic)
                newCount++;
            &&p = p + 1;
        }
        if (newCount > 0) {
            uint oldBGCount = res.count(BackColorsItem_size),
                newSize = (oldBGCount + newCount) * BackColorsItem_size,
                newSpace = v8malloc(newSize);
            BackColorsItemRef&& ptr = toBackColorsItem(newSpace);
            &&p = toSyntaxItemInfo(items.start);
            while (p < items.end) {
                if (p.ref.color.value.uuid.data1 == bgMagic) {
                    ptr.ref.start = p.ref.start + 1;
                    ptr.ref.len = p.ref.color.value.uuid.data2;
                    ptr.ref.color = colorBgForMultiLine;
                    &&ptr = ptr + 1;
                }
                &&p = p + 1;
            }
            if (oldBGCount > 0) {   // надо скопировать прошлые значения
                mem::memcpy(ptr.self, res.start, oldBGCount * BackColorsItem_size);
                res.dtor();
            }
            res.start = newSpace;
            res.end = res.allocked = res.start + newSize;
        }
    }
}

bool TxtExt_hasCustomBackground(ITextExtBackColors& pThis, int nLineNo, SyntaxItemInfos& items) {
	#if ver > 8.3.19
	//на скорую руку - не уверен, что правильно
	return false;
	#else
    trTxtExt_hasBG.swap();
    bool res = pThis.hasCustomBackground(nLineNo, items);
    trTxtExt_hasBG.swap();
    return res || processHasCustomBackground(items.infos);
	#endif
}

void TxtExt_getColorInfo(ITextExtBackColors& pThis, COLORREF currentBGColor, SyntaxItemInfos& items, Vector& res) {
    trTxtExt_getBG.swap();
    pThis.getColorInfo(currentBGColor, items, res);
    trTxtExt_getBG.swap();
    processGetColorInfo(items.infos, res);
}

// Класс для обработки запросов о цвете фона
class MyTextExtBackColors {
    // Определить, нужно ли будет менять фон слов в строке
    bool hasCustomBackground(int nLineNo, SyntaxItemInfos& items) {
        return processHasCustomBackground(items.infos);
    }
    // Получить инфу о цветах фона
    void getColorInfo(COLORREF currentBGColor, SyntaxItemInfos& items, Vector& res) {
        processGetColorInfo(items.infos, res);
    }
};

funcdef uint IUnk_QI(IUnknown&, const Guid&, IUnknown&&&);
uint TextExtModule_QI(IUnknown& pThis, const Guid& g, IUnknown&&& res) {
    //Print("" + g);
    
    if (g == IID_ITextExtBackColors) {
        &&res = myBGHandler;
        res.AddRef();
        return 0;
    }
    
    //Print("" + toGuid(p2).ref);
    IUnk_QI&& orig;
    trTextExtModule_QI.getOriginal(&&orig);
    return orig(pThis, g, res);
    //return orig(p1, p2, p3);
}
