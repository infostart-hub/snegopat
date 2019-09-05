// Описание объекта Строка
:enum EStringSize
#if ver < 8.3
	16 inplaceStringSize
#else
	10 inplaceStringSize
#endif

:struct v8strData
  :props
    size_t refCount
	#if ver < 8.3
		int pad
	#endif
	uint8 text

:class v8string
  :props
	size_t len
	int_ptr data
	int_ptr pEnd
	int i1
	int i2
#if ver < 8.3
	36
#else
	24
#endif
  :meths
	void ctor()
	{
		obj.len = 0;
		obj.data = 0;
	}
	---
	void ctor1(const v8string&in other)
	{
		mem::memcpy(obj.self, other.self, v8string_size);
		if (obj.len == inplaceStringSize)
			InterlockedIncrement(obj.data);
	}
	---
	void ctor3(int_ptr text, uint l)
	{
		if (l < inplaceStringSize) {
			obj.len = l;
			if (l > 0)
				mem::memcpy(obj.self + v8string_data_offset, text, l * 2);
			mem::word[obj.self + v8string_data_offset + l * 2] = 0;
		} else {
			obj.len = inplaceStringSize;
			uint dataLen = v8strData_text_offset + l * 2;
			obj.data = malloc(dataLen + 2);
			mem::size_t[obj.data] = 1;
			mem::memcpy(obj.data + v8strData_text_offset, text, l * 2);
			obj.pEnd = obj.data + dataLen;
			mem::word[obj.pEnd] = 0;
			obj.i1 = l + 4;
		}
	}
	---
	void dtor()
	{
		if (obj.len == inplaceStringSize && 0 == InterlockedDecrement(obj.data))
			free(obj.data);
	}
	---
	string opImplConv()const|int_ptr v8string__opImplConv(v8string& obj, string& ret)
	{
		ret.ctor(v8string__get_cstr(obj), v8string__get_length(obj));
		return ret.self;
	}
	---
	int_ptr get_cstr()const
	{
		return obj.len < inplaceStringSize ? obj.self + v8string_data_offset : obj.data + v8strData_text_offset;
	}
	---
	uint get_length()const
	{
		return obj.len < inplaceStringSize ? obj.len : (obj.pEnd - (obj.data + v8strData_text_offset)) / 2;
	}
	---
	void opAssign(const v8string&in s)
	{
		if (obj.self != s.self) {
			v8string__dtor(obj);
			v8string__ctor1(obj, s);
		}
	}
	---
	bool isEmpty()const
	{
		return obj.len == 0;
	}
	---
	void opAssign(const string&in s)
	{
		v8string__dtor(obj);
		v8string__ctor3(obj, s.cstr, s.length);
	}
	---
	string get_str()const|int_ptr v8string__get_str(v8string& obj, string& ret)
	{
		ret.ctor(v8string__get_cstr(obj), v8string__get_length(obj));
		return ret.self;
	}
	---

:mixin string
  :meths
	v8string opImplConv()const|int_ptr string__opImplConv(string& obj, v8string& ret)
	{
		v8string__ctor3(ret, obj.cstr, obj.length);
		return ret.self;
	}
	---
