﻿# Дополнительные утилиты на 1С

В поставку добавлены утилиты на 1С в виде дополнительных внешних обработок, которые могут помочь разработке.

- [Сравнение дампов снегопата](#Сравнение-дампов-снегопата)

## Сравнение дампов снегопата

Обработка предназначена для помощи в анализе ошибок, возникающих при выпуске новых релизов 1С.

Как работать?
1. Выбираем 2 каталога дампов снегопата:
	- рабочий набор, на котором снегопат работает без сбоев
	- тот, который работает нестабильно или не работает вообще
2. Жмём "Прочитать" - обработка прочитает файлы в обоих каталогах и покажет анализ только тех,
   которые найдены в обоих каталогах.
   Анализ (пока) идёт по номерам функций в файлах и описанию самой функции,
   что позволяет быстро найти смещенные функции и поправить нужные файлы 
   (*.v или *.as - тут надо знать, где что описано).
3. После изменения файлов - можно запустить стартер с командой отладки прямо из обработки,
   указав путь к стареру.
4. Опция "Показывать\учитывать функции без описания" сделана для скрытия\показа
   несущественных функций, которые есть, но в работе не участвуют.
5. Можно реализовать функционал сравнения текстов фукнций построчно.
   Такой анализ более точен будет, но требует больше времени.