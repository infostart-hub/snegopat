/* packets.as
Организация работы функционала снегопата в виде отдельных пакетов.
Пакет - логически связная часть функционала, которая требует инициализации
при загрузке снегопата. Если функционал не требует специальной инициализации,
оформлять его пакетом нет смысла.
*/
#pragma once
#include "../../all.h"
funcdef bool InitPacket();

Packet&& firstPacket;

enum PacketsInitLevel {
    piOnMainEnter,
    piOnMainWindow,
    piOnFirstIdle,
    piOnDesignerInit,
};

// Пакеты инициализируются путем создания глобальной переменной типа Packet,
// указав имя пакета, массив зависимостей, функтор инициализации
class Packet {
    Packet&& next;
    string _name;
    array<string>&& _depends;
    PacketsInitLevel _level;
    InitPacket&& _init;

    Packet(const string& name, InitPacket&& init, PacketsInitLevel level = piOnMainEnter, array<string>&& depends = null) {
        &&next = firstPacket;
        &&firstPacket = this;
        _name = name;
        _level = level;
        &&_init = init;
        &&_depends = depends;
    }
};

NoCaseSet loadedPackets;

void initPackets(PacketsInitLevel level) {
    bool hasLoaded, hasNotLoaded;
    for (;;) {
        hasLoaded = false;
        hasNotLoaded = false;
        for (Packet&& ptr = firstPacket; ptr !is null; &&ptr = ptr.next) {
            if (ptr._level != level || loadedPackets.contains(ptr._name))
                continue;
            if (ptr._depends !is null) {
                bool allDependsLoaded = true;
                for (uint i = 0, im = ptr._depends.length; i < im; i++) {
                    if (!loadedPackets.contains(ptr._depends[i])) {
                        allDependsLoaded = false;
                        break;
                    }
                }
                if (!allDependsLoaded) {
                    hasNotLoaded = true;
                    continue;
                }
            }
            if (ptr._init()) {
                loadedPackets.insert(ptr._name);
                hasLoaded = true;
            }
        }
        if (hasNotLoaded) { // Есть незагрузившиеся
            if (!hasLoaded) {   // Ни одного нового не загрузилось, дальше крутить цикл нет смысла
                // Покажем список не загрузившихся
                array<string> lst;
                for (Packet&& ptr = firstPacket; ptr !is null; &&ptr = ptr.next) {
                    if (!loadedPackets.contains(ptr._name))
                        lst.insertLast(ptr._name);
                }
                Print("Не смогли загрузиться следующие пакеты: " + join(lst, ", "));
            } else
                continue;   // Кто-то загрузился, попробуем еще раз загрузить остальные
        }
        break;
    }
}
