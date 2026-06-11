// src/app/api/quiz/extract/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = file.name.toLowerCase();
        const ext = fileName.split('.').pop() || '';

        // MIME type map
        const mimeMap: Record<string, string> = {
            pdf: 'application/pdf',
            ppt: 'application/vnd.ms-powerpoint',
            pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            doc: 'application/msword',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            txt: 'text/plain',
            md: 'text/plain',
            csv: 'text/csv',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            webp: 'image/webp',
            gif: 'image/gif',
            heic: 'image/heic',
            heif: 'image/heif',
        };

        const mimeType = mimeMap[ext] || 'application/octet-stream';
        const base64 = buffer.toString('base64');

        // For plain text files, also return the raw text so we can embed it
        let text: string | undefined;
        if (['txt', 'md', 'csv'].includes(ext)) {
            text = buffer.toString('utf-8');
        }

        return NextResponse.json({
            base64,
            mimeType,
            fileName: file.name,
            fileSize: file.size,
            text,
            isDocument: ['pdf', 'ppt', 'pptx', 'doc', 'docx'].includes(ext),
            isImage: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'].includes(ext),
        });
    } catch (error: any) {
        console.error('Extract error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to process file' },
            { status: 500 }
        );
    }
}