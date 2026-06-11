import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);

    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json([]);
    }

    const response = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}`
    );

    const data = await response.json();

    return NextResponse.json(data.docs.slice(0, 20));
}