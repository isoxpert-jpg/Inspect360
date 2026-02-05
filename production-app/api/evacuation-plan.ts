import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        const { roomName, department, scope, findings, hazards } = req.body;

        if (!roomName) {
            return res.status(400).json({ error: 'Room name is required' });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 4096,
            }
        });

        const prompt = `Generate a professional emergency evacuation plan for the following area:

Location: ${roomName}
Department: ${department || 'General'}
Scope: ${(scope || ['OHS', 'FireSafety']).join(', ')}

Known Hazards:
${(hazards || []).join('\n- ') || 'None identified'}

Key Findings:
${(findings || []).map((f: { issue: string; type: string }) => `- ${f.issue} (${f.type})`).join('\n') || 'None'}

Create a detailed evacuation plan that includes:
1. Primary and secondary evacuation routes
2. Assembly points
3. Emergency contacts and procedures
4. Special considerations based on hazards
5. Responsibilities for personnel
6. Equipment locations (fire extinguishers, first aid, etc.)

Format the response in clear sections with bullet points for easy reading.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const plan = response.text();

        return res.status(200).json({
            success: true,
            evacuationPlan: plan,
        });

    } catch (error: unknown) {
        console.error('Evacuation plan generation error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return res.status(500).json({
            error: 'Failed to generate evacuation plan',
            message
        });
    }
}
