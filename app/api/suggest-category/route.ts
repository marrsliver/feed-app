import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: Request) {
  const body = await req.json()
  const { name, url, availableCategories } = body

  if (!name || !url || !Array.isArray(availableCategories)) {
    return NextResponse.json({ categoryId: null, confidence: 'low' })
  }

  const categoryList = availableCategories
    .slice(0, 50)
    .map((c: { id: string; name: string }) => `- ${String(c.id).slice(0, 50)}: ${String(c.name).slice(0, 100)}`)
    .join('\n')

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `You are categorizing a content source for a curated research/art feed.

Source name: ${name}
Source URL: ${url}

Available categories:
${categoryList}

Pick the single best category ID from the list above. Reply with JSON only:
{"categoryId": "the-id", "confidence": "high" | "medium" | "low"}`,
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ categoryId: null, confidence: 'low' })

    const parsed = JSON.parse(jsonMatch[0])
    const category = availableCategories.find((c: { id: string; name: string }) => c.id === parsed.categoryId)
    return NextResponse.json({
      categoryId: parsed.categoryId ?? null,
      categoryName: category?.name ?? null,
      confidence: parsed.confidence ?? 'low',
    })
  } catch {
    return NextResponse.json({ categoryId: null, categoryName: null, confidence: 'low' })
  }
}
