import { NextRequest, NextResponse } from 'next/server';
import { getRandomDomainQuestions, getTopicQuestions } from '@/lib/content/loader';

export const dynamic = 'force-dynamic';

/**
 * GET /api/questions - Get questions for assessment
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const domainId = searchParams.get('domain');
    const topicId = searchParams.get('topic');
    const countParam = searchParams.get('count');
    const count = countParam ? parseInt(countParam, 10) : 15;

    if (!domainId) {
      return NextResponse.json(
        { error: 'Domain ID is required' },
        { status: 400 }
      );
    }

    let questions;
    if (topicId) {
      // Get questions for specific topic
      questions = getTopicQuestions(domainId, topicId);
    } else {
      // Get random questions for domain
      questions = getRandomDomainQuestions(domainId, count);
    }

    return NextResponse.json({
      questions,
      count: questions.length,
    });
  } catch (error) {
    console.error('Questions API error:', error);
    return NextResponse.json(
      { error: 'Failed to load questions' },
      { status: 500 }
    );
  }
}
