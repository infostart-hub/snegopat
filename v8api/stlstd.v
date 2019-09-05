// Типы стандартной библиотеки

// Вектор
:class Vector
:props
	uint start
	uint end
	uint allocked
:meths
	void ctor()
	{
		obj.start = obj.end = obj.allocked = 0;
	}
	---
	void dtor()
	{
		if(obj.start != 0) {
			uint f = obj.start;
		  #if ver >= 8.3.11
			if (obj.allocked - f >= 0x1000)
				f = mem::dword[f - 4];
		  #endif
			free(f);
		}
	}
	---
	uint size()
	{
		return obj.end - obj.start;
	}
	---
	uint allock(uint count, uint size)
	{
		uint s = count * size;
		uint m;
		#if ver >= 8.3.11
		if (s >= 0x1000) {
			m = malloc(s + 35);
			uint km = (m + 35) & ~31;
			mem::dword[km - 4] = m;
			m = km;
		} else
		#endif
			m = malloc(s);
		obj.start = m;
		obj.allocked = obj.end = obj.start + s;
		return obj.start;
	}
	---
	uint count(uint s)
	{
		return obj.start == 0 ? 0 : (obj.end - obj.start) / s;
	}
	---
