/*
grid.as
Работа с табличным полем
*/
// Данные строки нужны только для среды разработки и вырезаются препроцессором
#pragma once
#include "../../all.h"

enum DataSourceType {
	dstGrid = 0,
	dstTree = 1
};


class IDataRow {
	IDataSource&& _owner;
	IV8Bookmark&& bkmk;
	IDataRow(IDataSource&& pOwner, IV8Bookmark&& pBkmk) {
		&&_owner = pOwner;
		&&bkmk = pBkmk;
	}
	IDataRow&& _getRow(LinkType lt) {
		IV8Bookmark&& b;
		_owner.m_ds.getLinkedBookmark(b, bkmk, lt);
		if (b is null)
			return null;
		return IDataRow(_owner, b);
	}

	IDataRow&& get_parent() {
		return _getRow(ltParent);
	}
	IDataRow&& get_firstChild() {
		return _getRow(ltFirstChild);
	}
	IDataRow&& get_lastChild() {
		return _getRow(ltLastChild);
	}
	IDataRow&& get_next() {
		return _getRow(ltNext);
	}
	IDataRow&& get_prev() {
		return _getRow(ltPrev);
	}
	Variant getCellValue(int columnID) {
		Value val;
		_owner.m_ds.getCellValue(bkmk, columnID, val);
		Variant ret;
		val2var(val, ret);
		return ret;
	}
	ICellAppearance&& getCellAppearance(long columnID) {
		if (_owner.m_ui !is null) {
			ICellAppearance pCA;
			_owner.m_ui.getCellFormat(bkmk, columnID, pCA.m_value, pCA.cell);
			return pCA;
		}
		return null;
	}
};

class IDataSource {
	IV8DataSource&& m_ds;
	IGridUISource&& m_ui;
	IDataRow&& _root;
	IDataSource(IV8DataSource& pDS, IGridUISource& pUI) {
		&&m_ds = pDS;
		&&m_ui = m_ds.unk;
		if (m_ui is null)
			&&m_ui = pUI;
		&&_root = IDataRow(this, null);
	}
	DataSourceType get_type() {
		return DataSourceType(m_ds.getSourceType());
	}
	bool get_hasCellAppearance() {
		return m_ui !is null;
	}
};

class ICellAppearance  {
	CellFormat cell;
	Value m_value;
	string get_text() {
		return cell.text.str;
	}
	int get_checked() {
		return cell.state;
	}
	Variant get_picture() {
		return image2pict(toIUnknown(cell.image.image));
	}
	Variant get_addPicture() {
		return image2pict(toIUnknown(cell.extImage.image));
	}
	Variant get_value() {
		Variant ret;
		val2var(m_value, ret);
		return ret;
	}
};

class IGridCtrl : IExtControl {
	IDataSource&& _dataSource;
	IGrid&& grd;
	
	IGridCtrl(IGrid&& pGrid) {
		&&grd = pGrid;
		if (grd !is null) {
			Print("Has grid");
			IV8DataSource&& ds = grd.getDataSource();
			if (ds !is null) {
				Print("has ds");
				&&_dataSource = IDataSource(ds, grd.getUISource());
			}
		}
	}

	int get_columnCount() {
		return grd.columnsCount();
	}
	IDataRow&& get_currentRow() {
		IV8Bookmark&& line;
		grd.getCurrentLine(line);
		if (line !is null)
			return IDataRow(_dataSource, line);
		return null;
	}
	void set_currentRow(IDataRow&& val) {
		if (val is null || val._owner !is _dataSource)
			return;
		int colId = grd.getCurrentColumnId();
		grd.setActiveCell(val.bkmk, colId, true, eCenter, 0, 0);
	}
	int get_currentColID() {
		return grd.getCurrentColumnId();
	}
	void set_currentColID(int val) {
		grd.setCurrentColumnId(val);
	}
	bool isExpanded(IDataRow&& row) {
		if (row is null || row._owner !is _dataSource)
			return false;
		return grd.isExpandedLine(row.bkmk);
	}
	void expand(IDataRow&& row, bool bExpand, bool withChilds = false) {
		if (row is null || row._owner !is _dataSource)
			return;
		grd.expandLine(row.bkmk, bExpand, withChilds);
	}
	int isCellChecked(IDataRow&& row, int columnID) {
		if (row is null || row._owner !is _dataSource)
			return 0;
		return grd.getCellCheck(row.bkmk, columnID);
	}
	void checkCell(IDataRow&& row, int columnID, CheckState mark = 0) {
		if (row is null || row._owner !is _dataSource)
			return;
		grd.setCellCheck(row.bkmk, columnID, mark);
	}
};
