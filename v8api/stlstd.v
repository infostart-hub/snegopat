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
			free(obj.start);
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
		obj.start = malloc(s);
		obj.allocked = obj.end = obj.start + s;
		return obj.start;
	}
	---
	uint count(uint s)
	{
		return obj.start == 0 ? 0 : (obj.end - obj.start) / s;
	}
	---
