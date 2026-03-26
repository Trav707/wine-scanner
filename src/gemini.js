const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

const EXTRACTION_PROMPT = `Analyze this wine bottle label image and extract structured information.

Return ONLY a valid JSON object with exactly these keys. Use null for any field not visible on the label.

{
  "producer": "Winery or producer name (e.g. Ridge Vineyards, Chateau Margaux)",
  "varietal": "Grape variety or blend name (e.g. Cabernet Sauvignon, Meritage, GSM Blend)",
  "bottleSize": "Volume as shown on label (e.g. 750ml, 375ml, 1.5L). Default to 750ml if not shown.",
  "wineType": "Exactly one of: Red, White, Rosé, Sparkling, Dessert, Orange",
  "appellation": "Primary geographic region or AVA (e.g. Napa Valley, Bordeaux, Willamette Valley)",
  "subAppellation": "More specific sub-region if present (e.g. Rutherford, Pauillac, Dundee Hills)",
  "vineyard": "Vineyard designate name if present (e.g. To Kalon Vineyard, Beckstoffer Georges III)",
  "proprietaryName": "Proprietary or fantasy wine name if distinct from the producer name (e.g. Opus One, Insignia, Isosceles)",
  "vintage": "The vintage year as a 4-digit string (e.g. '2019'), or 'NV' for non-vintage wines. null if not shown."
}`

export function imageFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.readAsDataURL(file)
  })
}

// Pulls the text out of a Gemini REST response and parses it as JSON.
// Handles models that wrap output in markdown code fences.
export function parseGeminiResponse(responseJson) {
  const text = responseJson?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Empty response from Gemini')

  const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error('Could not parse Gemini response as JSON: ' + text.slice(0, 120))
  }
}

export async function extractWineLabel(imageFile, apiKey) {
  if (!apiKey) throw new Error('INVALID_KEY: No API key set. Tap the gear icon to add one.')

  const base64 = await imageFileToBase64(imageFile)

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: EXTRACTION_PROMPT },
          { inline_data: { mime_type: imageFile.type, data: base64 } }
        ]
      }],
      generationConfig: { responseMimeType: 'application/json' }
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const msg = err?.error?.message || `HTTP ${response.status}`
    if (response.status === 429) {
      throw new Error('RATE_LIMIT: Daily quota exceeded. Resets at midnight Pacific time.')
    }
    if (response.status === 400 || response.status === 403) {
      throw new Error('INVALID_KEY: Check your Gemini API key in Settings.')
    }
    throw new Error('API_ERROR: ' + msg)
  }

  const data = await response.json()
  return parseGeminiResponse(data)
}
