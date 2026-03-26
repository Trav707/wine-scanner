import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseGeminiResponse, imageFileToBase64, extractWineLabel } from '../../src/gemini.js'

// ---------------------------------------------------------------------------
// parseGeminiResponse
// ---------------------------------------------------------------------------
describe('parseGeminiResponse', () => {
  it('parses a clean JSON response', () => {
    const raw = {
      producer: 'Ridge Vineyards',
      varietal: 'Zinfandel',
      bottleSize: '750ml',
      wineType: 'Red',
      appellation: 'Sonoma County',
      subAppellation: null,
      vineyard: 'Lytton Springs',
      proprietaryName: null
    }
    const response = {
      candidates: [{ content: { parts: [{ text: JSON.stringify(raw) }] } }]
    }
    const result = parseGeminiResponse(response)
    expect(result.producer).toBe('Ridge Vineyards')
    expect(result.varietal).toBe('Zinfandel')
    expect(result.vineyard).toBe('Lytton Springs')
    expect(result.subAppellation).toBeNull()
  })

  it('strips markdown json code fences', () => {
    const response = {
      candidates: [{ content: { parts: [{ text: '```json\n{"producer":"Kosta Browne"}\n```' }] } }]
    }
    expect(parseGeminiResponse(response).producer).toBe('Kosta Browne')
  })

  it('strips plain code fences', () => {
    const response = {
      candidates: [{ content: { parts: [{ text: '```\n{"producer":"DRC"}\n```' }] } }]
    }
    expect(parseGeminiResponse(response).producer).toBe('DRC')
  })

  it('throws on empty candidates', () => {
    expect(() => parseGeminiResponse({})).toThrow('Empty response from Gemini')
  })

  it('throws on missing parts text', () => {
    expect(() => parseGeminiResponse({ candidates: [{ content: { parts: [] } }] }))
      .toThrow('Empty response from Gemini')
  })

  it('throws on non-JSON text', () => {
    const response = {
      candidates: [{ content: { parts: [{ text: 'Sorry, I cannot read this label.' }] } }]
    }
    expect(() => parseGeminiResponse(response)).toThrow('Could not parse Gemini response as JSON')
  })
})

// ---------------------------------------------------------------------------
// imageFileToBase64
// ---------------------------------------------------------------------------
describe('imageFileToBase64', () => {
  it('returns a base64 string without the data URL prefix', async () => {
    const file = new File(['fake-image-bytes'], 'label.jpg', { type: 'image/jpeg' })
    const result = await imageFileToBase64(file)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
    expect(result).not.toContain('data:')
    expect(result).not.toContain(',')
  })
})

// ---------------------------------------------------------------------------
// extractWineLabel
// ---------------------------------------------------------------------------
describe('extractWineLabel', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const makeFile = () => new File(['img'], 'label.jpg', { type: 'image/jpeg' })

  const mockSuccess = (data) => ({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(data) }] } }]
    })
  })

  it('throws INVALID_KEY when apiKey is empty', async () => {
    await expect(extractWineLabel(makeFile(), '')).rejects.toThrow('INVALID_KEY')
  })

  it('returns parsed wine data on a successful API response', async () => {
    const expected = {
      producer: 'Opus One', varietal: 'Bordeaux Blend', bottleSize: '750ml',
      wineType: 'Red', appellation: 'Napa Valley', subAppellation: 'Oakville',
      vineyard: null, proprietaryName: 'Opus One'
    }
    fetch.mockResolvedValueOnce(mockSuccess(expected))

    const result = await extractWineLabel(makeFile(), 'valid-key')
    expect(result.producer).toBe('Opus One')
    expect(result.appellation).toBe('Napa Valley')
  })

  it('throws RATE_LIMIT on HTTP 429', async () => {
    fetch.mockResolvedValueOnce({
      ok: false, status: 429,
      json: async () => ({ error: { message: 'Quota exceeded' } })
    })
    await expect(extractWineLabel(makeFile(), 'key')).rejects.toThrow('RATE_LIMIT')
  })

  it('throws INVALID_KEY on HTTP 403', async () => {
    fetch.mockResolvedValueOnce({
      ok: false, status: 403,
      json: async () => ({ error: { message: 'API key not valid' } })
    })
    await expect(extractWineLabel(makeFile(), 'bad-key')).rejects.toThrow('INVALID_KEY')
  })

  it('throws INVALID_KEY on HTTP 400', async () => {
    fetch.mockResolvedValueOnce({
      ok: false, status: 400,
      json: async () => ({ error: { message: 'Bad request' } })
    })
    await expect(extractWineLabel(makeFile(), 'bad-key')).rejects.toThrow('INVALID_KEY')
  })

  it('throws API_ERROR on other HTTP errors', async () => {
    fetch.mockResolvedValueOnce({
      ok: false, status: 500,
      json: async () => ({ error: { message: 'Internal server error' } })
    })
    await expect(extractWineLabel(makeFile(), 'key')).rejects.toThrow('API_ERROR')
  })

  it('sends the image as base64 inline_data in the request body', async () => {
    fetch.mockResolvedValueOnce(mockSuccess({ producer: 'Test' }))
    await extractWineLabel(makeFile(), 'my-key')

    const [url, options] = fetch.mock.calls[0]
    expect(url).toContain('my-key')
    const body = JSON.parse(options.body)
    const parts = body.contents[0].parts
    const imagePart = parts.find(p => p.inline_data)
    expect(imagePart.inline_data.mime_type).toBe('image/jpeg')
    expect(typeof imagePart.inline_data.data).toBe('string')
  })
})
