$engine JScript
$uname TextChangesWatcher
$dname Класс TextChangesWatcher
$addin stdlib
$addin vbs

////////////////////////////////////////////////////////////////////////////////////////
////{ TextChangesWatcher (Александр Орефков)
////
// Класс для отслеживания изменения текста в поле ввода, для замены
// события АвтоПодборТекста. Штатное событие плохо тем, что не возникает
// - при установке пустого текста
// - при изменении текста путем вставки/вырезания из/в буфера обмена
// - при отмене редактирования (Ctrl+Z)
// не позволяет регулировать задержку
// Параметры конструктора
// field - элемент управления поле ввода, чье изменение хотим отслеживать
// ticks - величина задержки после ввода текста в десятых секунды (т.е. 3 - 300 мсек)
// invoker - функция обратного вызова, вызывается после окончания изменения текста,
//  новый текст передается параметром функции
////
////} TextChangesWatcher
////////////////////////////////////////////////////////////////////////////////////////

TextChangesWatcher = stdlib.Class.extend({

    construct: function (field, ticks, invoker, toLowerCase) {
        this.ticks = ticks
        this.invoker = invoker
        this.field = field
        if (toLowerCase==undefined) toLowerCase = true
        this.toLowerCase = toLowerCase;
    },

    // Начать отслеживание изменения текста
    start: function() {
        this.lastText = this.field.Значение.replace(/^\s*|\s*$/g, '')
        if (this.toLowerCase){
            this.lastText = this.lastText.toLowerCase();
        }
        
        this.noChangesTicks = this.ticks + 1
        this.timerID = createTimer(100, this, "onTimer")
    },
    
    // Остановить отслеживание изменения текста
    stop: function() {
        killTimer(this.timerID);
    },
    
    // Обработчик события таймера
    onTimer: function() {
        // Получим текущий текст из поля ввода
        var newText = windows.getInputFieldText(this.field).replace(/^\s*|\s*$/g, '');
        if (this.toLowerCase)
            newText = newText.toLowerCase()
        // Проверим, изменился ли текст по сравению с прошлым разом
        if(newText != this.lastText)
        {
            // изменился, запомним его
            this.lastText = newText
            this.noChangesTicks = 0
        }
        else
        {
            // Текст не изменился. Если мы еще не сигнализировали об этом, то увеличим счетчик тиков
            if(this.noChangesTicks <= this.ticks)
            {
                if(++this.noChangesTicks > this.ticks)  // Достигли заданного количества тиков.
                    this.invoker(newText)               // Отрапортуем
            }
        }
    }
});
