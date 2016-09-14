/*
    smartboxitems.as
    Отображение окна-списка снегопата, используемого для контекстной подсказки
    и списка методов модуля, реализовано использованием встроенного в snegopat.dll
    объекта SmartBoxWindow, который собственно и созадет окно, осуществляет его
    отрисовку и навигацию.
    Для задания списка элементов в окне используется массив объектов, реализующих
    интерфейс SmartBoxItemBaseIface и первым свойством которых должно быть поле SmartBoxItemData.

    Для обратного взаимодействия окна списка с программой ему передается объект SmartBoxSite.
    Все эти интерфейсы задаются самой snegopat.dll перед запуском скриптов, и в скрипт-языке
    имели бы следующее описание:
    
    class SmartBoxItemData {
        string descr;   // отображаемый текст
        string key;     // ключ для сортировки. Самим окном не используется, может использоваться владельцем окна
        uint hotOrder;  // дополнительный ключ для сортировки. Самим окном не используется, может использоваться владельцем окна
        uint8 image;    // индекс пиктограммы элемента в пиктограммах снегопата. Смотри перечисление ниже
        bool exclude;   // временно не выводить элемент. Самим окном не используется, может использоваться владельцем окна
    };

     Интерфейс элемента списка. Окно через него запрашивает доп. сведения об элементе
     реальный элемент должен наследоваться от этого интерфейса и иметь первым свойством
     поле SmartBoxItemData, для оптимизации доступа движком снегопата к данным элемента
    class SmartBoxItemBaseIface {
        SmartBoxItemData& data();            вернуть данные элемента
        void textForTooltip(string& text);   Получить тултип элемента
    };
    
     Интерфейс владельца окна. Через него оно уведомляет владельца о различных событиях
    class SmartBoxSite {
        void onDoSelect(SmartBoxItemBaseIface@ pSelected);   пользователь выбрал элемент списка
        bool onKeydown(uint wParam, uint lParam);            событие WM_KEYDOWN. При возврате false - вызывается дефолтная обработка
        void onChar(uint wParam, uint lParam);               событие WM_CHAR
        bool onKillFocus();                                  Окно потеряло фокус. При возврате false - вызывается дефолтная обработка
    };

     Сам объект окна списка
    class SmartBoxWindow {
         Создание окна
        void createWindow(SmartBoxSite&& site, uint styles, uint exStyles, uint hWndParent = 0, uint ctrlID = 0);
         Установка списка элементов. Окно отображает все эти элементы как есть.
         фильтрацию, сортировку должен делать владелец окна, после чего задавать новый список элементов
         для удобства и оптимизации реализации тип здесь не указан, так как движок не может до компиляции скрипта
         указать тип, который еще только будет создан в скрипте, но передаваться должен array<SmartBoxItem>
        void setItems(?& items);
         установить текущий элемент по его индексу
        void setCurrentIdx(uint current);
         рассчитать полную высоту окна (с учетом границ) для заданного количества элементов.
         при -1 для всех элементов. Должен вызываться только после создания окна.
        uint fullHeight(int items = - 1);
         Уведомить окно о том, что положение родительского окна изменилось.
        void onParentPosChange();
         навигация по списку
        uint navigate(NavigateType to);
         Некоторые свойства окна
        const uint hwnd;
        const uint rowHeight;    высота строки
        const uint currentIdx;   индекс текущего элемента
    };
     Способы навигации в списке
    enum NavigateType {
        navFirst = 0,
        navLast = 1,
        navNext = 2,
        navPrev = 3,
        navNextPage = 4,
        navPrevPage = 5,
    };
    
     Кроме того, движок задает глобальный метод для сортировки массива элементов по hotOrder'у и ключу.
     ключ сравнивается регистрозависимо, поэтому скрипт должен сам делать все ключи в одном регистре.
     Метод нужен, так как базовая реализация универсальной сортировки массива
     скриптовым движком - медленная
    void sortItemsArray(?& itemsArrray, bool asc)
     Первым параметром должен передаваться array<SmartBoxItem>, вторым - направление сортировки,
     true - по возврастанию, false - по убыванию
*/
#pragma once
#include "../../all.h"

// Индексы стандартных пиктограмм снегопата
enum imagesIdx {
    imgNone,
    imgPublicMethod,
    imgPublicVar,
    imgKeyword,
    imgType,
    imgParenthesis,
    imgMethodWithKey,
    imgVarWithKey,
    imgLocalVar,
    imgEvent,
    imgCmnModule,
    imgEnums,
    imgCtxMethod,
    imgCtxVar,
};

class SmartBoxItem : SmartBoxItemBaseIface
{
    SmartBoxItemData d;
    SmartBoxItemData& data() {
        return d;
    }
    void textForTooltip(string& text)  // Получить тултип элемента
    {
        text = d.descr;
    }
    SmartBoxItem(const string& descr, imagesIdx img) {
        d.descr = descr;
        d.key = descr.dup().makeLower();
        d.exclude = false;
        d.hotOrder = 0;
        d.image = img;
    }
};
