import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);

    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json([]);
    }

    const response = await fetch(
        `https://gutendex.com/books/?search=${encodeURIComponent(query)}`
    );

    const data = await response.json();

    return NextResponse.json(data.results);
}