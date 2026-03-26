import * as XLSX from 'xlsx'

// Column order and display names for the spreadsheet.
const COLUMNS = [
  { key: 'producer',        header: 'Producer',          width: 26 },
  { key: 'vintage',         header: 'Vintage',            width: 10 },
  { key: 'varietal',        header: 'Varietal',           width: 24 },
  { key: 'bottleSize',      header: 'Bottle Size',        width: 13 },
  { key: 'wineType',        header: 'Wine Type',          width: 13 },
  { key: 'appellation',     header: 'Appellation',        width: 24 },
  { key: 'subAppellation',  header: 'Sub Appellation',    width: 22 },
  { key: 'vineyard',        header: 'Vineyard Designate', width: 26 },
  { key: 'proprietaryName', header: 'Proprietary Name',   width: 24 },
  { key: 'quantity',        header: 'Quantity',           width: 11 },
]

/**
 * Maps an array of wine records to plain row objects keyed by spreadsheet
 * column headers. Pure function — no side effects, fully unit-testable.
 */
export function buildExportRows(wines) {
  return wines.map(wine => {
    const row = {}
    for (const col of COLUMNS) {
      const val = wine[col.key]
      // Quantity as a number; everything else as a string or empty string.
      if (col.key === 'quantity') {
        row[col.header] = Number(val) || 1
      } else {
        row[col.header] = val != null && val !== '' ? String(val) : ''
      }
    }
    return row
  })
}

/**
 * Generates and triggers a browser download of a .xlsx file containing all
 * wines. Exported in the same newest-first order shown in the Cellar tab.
 *
 * Returns the filename used, for testing / logging.
 */
export function exportToXlsx(wines) {
  if (!wines || wines.length === 0) {
    throw new Error('No wines to export.')
  }

  const rows = buildExportRows(wines)

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: COLUMNS.map(c => c.header)
  })

  // Set column widths so the file opens looking reasonable without manual resizing.
  ws['!cols'] = COLUMNS.map(c => ({ wch: c.width }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'My Cellar')

  const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const filename = `wine-cellar-${date}.xlsx`

  // XLSX.writeFile uses document.createElement('a') internally on browsers,
  // which works on iOS Safari 13+ and drops the file into the Files app.
  XLSX.writeFile(wb, filename)

  return filename
}
