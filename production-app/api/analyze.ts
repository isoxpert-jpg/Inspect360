import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Rate limiting map (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 50; // requests per window
const RATE_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record || now > record.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
        return true;
    }

    if (record.count >= RATE_LIMIT) {
        return false;
    }

    record.count++;
    return true;
}

function getClientIp(req: VercelRequest): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.headers['x-real-ip'] as string || 'unknown';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Rate limiting
    const clientIp = getClientIp(req);
    if (!checkRateLimit(clientIp)) {
        return res.status(429).json({
            error: 'Too many requests',
            message: 'Please try again after 15 minutes'
        });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('GEMINI_API_KEY not configured');
            return res.status(500).json({ error: 'API key not configured' });
        }

        const { image, scope, roomName, department, customPrompt } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'Image is required' });
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        // Model for text analysis
        const textModel = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: {
                temperature: 0.4,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
            }
        });

        // Build the analysis prompt
        const scopeLabels = (scope || ['OHS']).join(', ');
        const prompt = customPrompt || buildAnalysisPrompt(scopeLabels, roomName, department);

        // Prepare the image data
        const imageData = image.replace(/^data:image\/\w+;base64,/, '');

        // Run text analysis
        const textResult = await textModel.generateContent([
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: imageData,
                },
            },
            prompt,
        ]);

        const response = await textResult.response;
        const text = response.text();

        // Parse the JSON response
        let analysis;
        try {
            // Extract JSON from potential markdown code blocks
            const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ||
                text.match(/```\n?([\s\S]*?)\n?```/) ||
                [null, text];
            const jsonStr = jsonMatch[1] || text;
            analysis = JSON.parse(jsonStr);
        } catch (parseError) {
            console.error('Failed to parse AI response:', parseError);
            return res.status(500).json({
                error: 'Failed to parse analysis',
                rawResponse: text
            });
        }

        // Generate overlay image (use original as fallback)
        let overlayImage = image; // Default to original
        try {
            const overlayPrompt = buildOverlayPrompt(scopeLabels);
            const overlayModel = genAI.getGenerativeModel({
                model: 'gemini-2.0-flash-exp',
            });

            const overlayResult = await overlayModel.generateContent([
                {
                    inlineData: {
                        mimeType: 'image/jpeg',
                        data: imageData,
                    },
                },
                overlayPrompt,
            ]);

            const overlayResponse = await overlayResult.response;
            // Check if there's an inline image in the response
            const candidates = overlayResponse.candidates;
            if (candidates && candidates[0]?.content?.parts) {
                for (const part of candidates[0].content.parts) {
                    if ('inlineData' in part && part.inlineData) {
                        overlayImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                        break;
                    }
                }
            }
        } catch (overlayError) {
            console.warn('Overlay generation failed, using original image:', overlayError);
            // Keep original image as fallback
        }

        return res.status(200).json({
            success: true,
            analysis,
            overlayImage,
        });

    } catch (error: unknown) {
        console.error('Analysis error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return res.status(500).json({
            error: 'Analysis failed',
            message
        });
    }
}

function buildAnalysisPrompt(scope: string, roomName: string, department: string): string {
    return `You are an expert HSE (Health, Safety, and Environment) compliance inspector. 
Analyze this image of "${roomName}" in the "${department}" department.

Focus areas: ${scope}

Provide a comprehensive safety and compliance assessment in the following JSON format:
{
  "score": <number 0-100>,
  "summary": "<brief overall assessment>",
  "hazards": ["<list of identified hazards>"],
  "zoningIssues": "<any zoning or layout concerns>",
  "riskLevel": "<Low|Medium|High>",
  "relevantStandards": [
    {"standardId": "<standard code>", "description": "<what it covers>"}
  ],
  "missingDocuments": ["<list of potentially missing compliance documents>"],
  "recommendedItems": [
    {"item": "<safety item>", "quantity": "<amount>", "reason": "<why needed>"}
  ],
  "detailedFindings": [
    {
      "issue": "<specific finding>",
      "type": "<Good condition|Minor issue|Major defect|Safety hazard|Compliance gap>",
      "risk": "<Low|Medium|High|None>",
      "recommendation": "<what to do>"
    }
  ]
}

Be thorough but concise. Focus on actionable findings.`;
}

function buildOverlayPrompt(scope: string): string {
    let examples = "'HAZARD'";
    if (scope.includes('OHS')) examples += ", 'TRIP HAZARD', 'MISSING GUARD', 'SAFE WALKWAY'";
    if (scope.includes('Fire')) examples += ", 'BLOCKED EXIT', 'FIRE RISK', 'EXTINGUISHER'";
    if (scope.includes('Security')) examples += ", 'BLIND SPOT', 'WEAK ENTRY', 'NO CCTV'";
    if (scope.includes('Facilities')) examples += ", 'CRACK', 'LEAK', 'DAMAGED ASSET', 'CLUTTER'";

    return `Redraw this image with safety/inspection overlays for ${scope}.

1. DETECT HAZARDS (RED Bounding Boxes & Text):
   - Identify hazards relevant to ${scope}.
   - Draw RED bounding boxes around hazards.
   - Add clear UPPERCASE labels (e.g., ${examples}).

2. DETECT POSITIVE COMPLIANCE (GREEN Bounding Boxes & Text):
   - Identify compliant areas or good conditions.
   - Draw GREEN bounding boxes around compliant elements.
   - Label as 'COMPLIANT' or 'GOOD CONDITION'.

3. VISUAL QUALITY:
   - Ensure text is UPPERCASE, LEGIBLE, and SPELLED CORRECTLY.
   - Use bright, contrasting colors for visibility.

Return the annotated image.`;
}
