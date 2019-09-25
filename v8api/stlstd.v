// Типы стандартной библиотеки

// Вектор
:class Vector
:props
	int_ptr start
	int_ptr end
	int_ptr allocked
:meths
	void ctor()
	{
		obj.start = obj.end = obj.allocked = 0;
	}
	---
	void dtor()
	{
		if(obj.start != 0)
	  #if ver < 8.3.11
			free(obj.start);
	  #else
			v8free(obj.start, obj.allocked - obj.start);
	  #endif
	}
	---
	int_ptr size()
	{
		return obj.end - obj.start;
	}
	---
	int_ptr allock(uint count, uint size)
	{
		uint s = count * size;
		obj.start =
	  #if ver < 8.3.11
		malloc(s);
	  #else
		v8malloc(s);
	  #endif
		obj.allocked = obj.end = obj.start + s;
		return obj.start;
	}
	---
	int_ptr count(uint s)
	{
		return obj.start == 0 ? 0 : (obj.end - obj.start) / s;
	}
	---

:global
:meths
	int_ptr v8malloc(size_t count)
	{
		int_ptr m;
	  #if ver >= 8.3.11
		if (count >= 0x1000) {
			m = malloc(count + 35);
			uint km = (m + 35) & ~31;
			mem::int_ptr[km - sizeof_ptr] = m;
			m = km;
		} else
	  #endif
			m = malloc(count);
		return m;
	}
	---
	void v8free(int_ptr ptr, size_t allocked)
	{
	  #if ver >= 8.3.11
		if (allocked >= 0x1000)
			ptr = mem::int_ptr[ptr - sizeof_ptr];
	  #endif
		free(ptr);
	}
	---
