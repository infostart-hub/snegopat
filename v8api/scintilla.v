:tdef uptr_t int_ptr
:tdef sptr_t int_ptr
:tdef Sci_Position int
:tdef Sci_PositionU uint
:tdef Sci_PositionCR int32
:tdef Sci_SurfaceID int_ptr

:struct Sci_CharacterRange
:props
	Sci_PositionCR cpMin
	Sci_PositionCR cpMax

:struct Sci_TextRange
:props
	Sci_CharacterRange chrg
	int_ptr lpstrText

:struct Sci_TextToFind
:props
	Sci_CharacterRange chrg
	int_ptr lpstrText
	Sci_CharacterRange chrgText


:struct Sci_Rectangle
:props
	int left
	int top
	int right
	int bottom

:struct Sci_NotifyHeader
:props
	HWND hwndFrom
	uptr_t idFrom
	uint code

:struct SCNotification
:props
	Sci_NotifyHeader nmhdr
	Sci_Position position
	int ch
	int modifiers
	int modificationType
	int_ptr text
	Sci_Position length
	Sci_Position linesAdded
	int message
	uptr_t wParam
	sptr_t lParam
	Sci_Position line
	int foldLevelNow
	int foldLevelPrev
	int margin
	int listType
	int x
	int y
	int token
	Sci_Position annotationLinesAdded
	int updated
	int listCompletionMethod
