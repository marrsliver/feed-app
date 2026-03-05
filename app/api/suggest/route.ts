import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic()

interface PostSummary {
  id: string
  title: string
  sourceName: string
  excerpt?: string
  date: string
}

interface SuggestRequest {
  query: string
  posts: PostSummary[]
}

export async function POST(req: Request) {
  try {
    const { query, posts }: SuggestRequest = await req.json()

    if (!query?.trim() || !posts?.length) {
      return NextResponse.json({ error: 'Missing query or posts' }, { status: 400 })
    }

    // Limit to 150 posts to keep tokens reasonable
    const postList = posts.slice(0, 150).map((p) =>
      `ID: ${p.id}\nTitle: ${p.title}\nSource: ${p.sourceName}\nDate: ${p.date}${p.excerpt ? `\nExcerpt: ${p.excerpt.slice(0, 150)}` : ''}`
    ).join('\n\n')

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a research assistant helping a user find relevant articles from their personal feed.

The user's request: "${query}"

Here are the available articles:

${postList}

Return a JSON object with:
- "message": a warm, one-sentence response to the user's request (e.g. "Here are some articles that might spark some hope:")
- "suggestions": an array of up to 4 objects, each with:
  - "postId": the exact ID from the list above
  - "reason": one short sentence explaining why this article fits the request

Only suggest articles that genuinely match. If nothing fits well, return fewer suggestions and say so in the message. Return only valid JSON, no other text.`,
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''

    // Strip markdown code fences and extract JSON
    const cleaned = raw.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')
    const result = JSON.parse(jsonMatch[0])
    if (!result.suggestions) result.suggestions = []

    return NextResponse.json(result)
  } catch (err) {
    console.error('Suggest error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
