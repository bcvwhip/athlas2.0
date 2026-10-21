import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { GeneratedImage, ImageAspectRatio } from '../types.js';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const IMAGES_DIR = path.join(UPLOADS_DIR, 'images');

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

export interface ImageOptimizationResult {
  enhancedPrompt: string;
  aspectRatio: ImageAspectRatio;
  style: string;
  summaryIt: string;
}

export interface GenerateImageOptions {
  prompt: string;
  aspectRatio?: ImageAspectRatio;
  style?: string;
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
  referenceImageId?: string;
  referenceImageUrl?: string;
  referenceContext?: string;
  geminiApiKey?: string;
  conversationId: string;
  messageId?: string;
  userId?: string;
  onStep?: (step: 'optimizing' | 'generating' | 'finalizing', message: string) => void;
}

/**
 * Dimensions mapping for standard aspect ratios
 */
export const ASPECT_RATIO_DIMENSIONS: Record<
  ImageAspectRatio,
  { width: number; height: number; geminiRatio: string }
> = {
  '1:1': { width: 1024, height: 1024, geminiRatio: '1:1' },
  '16:9': { width: 1280, height: 720, geminiRatio: '16:9' },
  '9:16': { width: 720, height: 1280, geminiRatio: '9:16' },
  '4:3': { width: 1024, height: 768, geminiRatio: '4:3' },
  '3:4': { width: 768, height: 1024, geminiRatio: '3:4' },
};

async function generateWithReplicate(
  prompt: string,
  aspectRatio: ImageAspectRatio,
  referenceImageBase64?: string,
  referenceImageMimeType = 'image/jpeg'
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const apiKey = process.env.REPLICATE_API_TOKEN || process.env.IMAGE_PROVIDER_API_KEY;
  if (!apiKey) return null;

  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: aspectRatio,
    output_format: 'jpg',
    output_quality: 90,
  };

  // FLUX Kontext accepts an input image for edits while remaining compatible with text-only generation.
  if (referenceImageBase64) {
    input.input_image = `data:${referenceImageMimeType};base64,${referenceImageBase64.replace(/^data:image\/[a-z]+;base64,/, '')}`;
  }

  const response = await fetch(
    'https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Prefer: 'wait=60',
      },
      body: JSON.stringify({ input }),
      signal: AbortSignal.timeout(70000),
    }
  );

  if (!response.ok) {
    throw new Error(`Replicate image request failed (${response.status})`);
  }

  let prediction = await response.json() as { id: string; status: string; output?: string | string[]; error?: string };
  const deadline = Date.now() + 70000;
  while (!['succeeded', 'failed', 'canceled'].includes(prediction.status) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!statusResponse.ok) throw new Error(`Replicate status request failed (${statusResponse.status})`);
    prediction = await statusResponse.json() as typeof prediction;
  }

  if (prediction.status !== 'succeeded' || !prediction.output) {
    throw new Error(prediction.error || 'Replicate did not return an image');
  }

  const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  const imageResponse = await fetch(outputUrl, { signal: AbortSignal.timeout(30000) });
  if (!imageResponse.ok) throw new Error(`Replicate output download failed (${imageResponse.status})`);
  const outputType = imageResponse.headers.get('content-type') || 'image/jpeg';
  return { buffer: Buffer.from(await imageResponse.arrayBuffer()), mimeType: outputType };
}

async function generateWithHuggingFace(
  prompt: string,
  aspectRatio: ImageAspectRatio
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const token = process.env.HF_TOKEN;
  if (!token) return null;

  const dimensions = ASPECT_RATIO_DIMENSIONS[aspectRatio] || ASPECT_RATIO_DIMENSIONS['1:1'];

  try {
    const endpoints = [
      'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell',
      'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
    ];

    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              width: dimensions.width,
              height: dimensions.height,
            },
          }),
          signal: AbortSignal.timeout(45000),
        });

        if (response.ok) {
          const mimeType = response.headers.get('content-type') || 'image/jpeg';
          const buffer = Buffer.from(await response.arrayBuffer());
          return { buffer, mimeType };
        }
      } catch {
        // Continue to next endpoint
      }
    }
  } catch {
    // Return null on failure to allow fallback
  }

  return null;
}

/**
 * Detect aspect ratio requested in natural language
 */
export function detectAspectRatioFromText(text: string): ImageAspectRatio | undefined {
  const lower = text.toLowerCase();
  if (/\b(16:9|16\/9|widescreen|panoramica|panoramico|orizzontale|landscape|wallpaper|desktop|cinema|cinematografico)\b/i.test(lower)) {
    return '16:9';
  }
  if (/\b(9:16|9\/16|story|stories|reels|tiktok|smartphone|telefono)\b/i.test(lower)) {
    return '9:16';
  }
  if (/\b(4:3|4\/3)\b/i.test(lower)) {
    return '4:3';
  }
  if (/\b(3:4|3\/4|ritratto|portrait)\b/i.test(lower)) {
    return '3:4';
  }
  if (/\b(1:1|quadrata|quadrato|square|post\s+instagram)\b/i.test(lower)) {
    return '1:1';
  }
  return undefined;
}

/**
 * Optimize user prompt using Gemini or Mistral to build a highly detailed, professional prompt
 * specifying subject, environment, lighting, composition, colors, mood, and realism.
 */
export async function optimizeImagePrompt(
  userQuery: string,
  targetAspectRatio?: ImageAspectRatio,
  referenceContext?: string,
  geminiApiKey?: string
): Promise<ImageOptimizationResult> {
  const detectedRatio = targetAspectRatio || detectAspectRatioFromText(userQuery) || '1:1';

  const systemInstruction = `You are 3 athlas's Master AI Image Prompt Engineer.
Transform the user's natural language request into an exceptionally detailed, photorealistic, cinematic prompt for state-of-the-art AI image generation models (Gemini Flash Image / FLUX).

Ensure the prompt explicitly details:
1. Exact Subject (anatomy, materials, textures, expressions, fine details)
2. Environment / Background (depth of field, scenery, atmospheric particles, architecture)
3. Lighting (e.g. volumetric god-rays, rim light, golden hour, neon subsurface glow, ray-traced reflections)
4. Composition & Camera Perspective (e.g. 85mm portrait lens, wide-angle cinematic, low-angle, rule of thirds, f/1.4 aperture)
5. Color Palette & Mood (harmonious tones, color grading, emotional atmosphere)
6. Level of Realism (8k resolution, photorealistic, octane render, masterpiece)

${referenceContext ? `Important: The user wants to edit or evolve a previous image. Previous image context: "${referenceContext}". Apply the user's modifications precisely.` : ''}

Respond ONLY with a JSON object strictly matching this schema:
{
  "enhancedPrompt": "Comprehensive English generation prompt with all visual details",
  "aspectRatio": "1:1" | "16:9" | "9:16" | "4:3" | "3:4",
  "style": "Brief style description (e.g. Hyper-realistic cinematic photography)",
  "summaryIt": "Sintesi elegante in italiano della scena (1 frase breve)"
}`;

  // 1. Try Gemini first if key is available
  const effectiveGeminiKey = geminiApiKey || process.env.GEMINI_API_KEY;
  if (effectiveGeminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: effectiveGeminiKey });
      const promptReq = `Richiesta utente: "${userQuery}"${
        detectedRatio ? ` (Formato preferito: ${detectedRatio})` : ''
      }`;
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          { role: 'user', parts: [{ text: `${systemInstruction}\n\n${promptReq}` }] }
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.6,
        },
      });

      const text = response.text?.trim();
      if (text) {
        const parsed = JSON.parse(text);
        return {
          enhancedPrompt: parsed.enhancedPrompt || userQuery,
          aspectRatio:
            detectedRatio ||
            (['1:1', '16:9', '9:16', '4:3', '3:4'].includes(parsed.aspectRatio)
              ? parsed.aspectRatio
              : '1:1'),
          style: parsed.style || 'Fotorealistico cinematografico',
          summaryIt: parsed.summaryIt || userQuery,
        };
      }
    } catch {
      // Quiet fallback if Gemini prompt optimization is unavailable
    }
  }

  // 2. Try Mistral if key is available
  const mistralKey = process.env.MISTRAL_API_KEY;
  if (mistralKey) {
    try {
      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mistralKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'ministral-8b-latest',
          messages: [
            { role: 'system', content: systemInstruction },
            {
              role: 'user',
              content: `Richiesta utente: "${userQuery}"${
                detectedRatio ? ` (Formato preferito: ${detectedRatio})` : ''
              }`,
            },
          ],
          temperature: 0.6,
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return {
            enhancedPrompt: parsed.enhancedPrompt || userQuery,
            aspectRatio:
              detectedRatio ||
              (['1:1', '16:9', '9:16', '4:3', '3:4'].includes(parsed.aspectRatio)
                ? parsed.aspectRatio
                : '1:1'),
            style: parsed.style || 'Fotorealistico cinematografico',
            summaryIt: parsed.summaryIt || userQuery,
          };
        }
      }
    } catch {
      // Quiet fallback to heuristic enhancement
    }
  }

  // 3. Robust heuristic prompt enhancement fallback
  const cleanItalian = userQuery.replace(/^(crea|genera|fai|disegna|renderizza|voglio)\s+(un'|un\s+|una\s+)?(immagine|foto|rendering|wallpaper|grafica)\s*(di|per|su|con)?/i, '').trim();
  const enhanced = `Cinematic masterpiece photograph, ${cleanItalian || userQuery}, highly detailed, 8k resolution, volumetric dramatic lighting, photorealistic textures, depth of field, ray-traced reflections, sharp focus, professional color grading.`;

  return {
    enhancedPrompt: enhanced,
    aspectRatio: detectedRatio,
    style: 'Fotorealistico cinematografico 8K',
    summaryIt: cleanItalian || userQuery,
  };
}

/**
 * Generate a real image using either Gemini or high-quality diffusion pipeline
 */
export async function generateRealImage(
  options: GenerateImageOptions
): Promise<{ image: GeneratedImage; filePath: string }> {
  const {
    prompt,
    aspectRatio: requestedRatio = '1:1',
    referenceImageBase64,
    referenceImageMimeType = 'image/jpeg',
    referenceImageId,
    referenceImageUrl,
    geminiApiKey,
    conversationId,
    messageId,
    onStep,
  } = options;

  // Step 1: Optimize prompt
  if (onStep) onStep('optimizing', '✨ Analisi ed ottimizzazione del prompt...');
  const refContext = options.referenceContext || (referenceImageId ? `Modifica immagine precedente ID ${referenceImageId}` : undefined);
  const optimized = await optimizeImagePrompt(
    prompt,
    requestedRatio,
    refContext,
    geminiApiKey
  );

  const finalAspectRatio: ImageAspectRatio = requestedRatio || optimized.aspectRatio || '1:1';
  const dimensions = ASPECT_RATIO_DIMENSIONS[finalAspectRatio] || ASPECT_RATIO_DIMENSIONS['1:1'];

  const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let imageBuffer: Buffer | null = null;
  let modelUsed = 'FLUX.1 High-Resolution';
  let mimeType = 'image/jpeg';
  let extension = 'jpg';

  // Step 2: Processing
  if (onStep) onStep('generating', '⚡ Sto elaborando...');

  // Attempt A: Try Gemini image models if API key is provided or process.env is configured
  const effectiveGeminiKey = geminiApiKey || process.env.GEMINI_API_KEY;
  if (effectiveGeminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: effectiveGeminiKey });
      const contentsParts: any[] = [];

      // If reference image provided (Image-to-Image editing)
      if (referenceImageBase64) {
        contentsParts.push({
          inlineData: {
            mimeType: referenceImageMimeType,
            data: referenceImageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
          },
        });
        contentsParts.push({
          text: `Modify this reference image precisely according to this instruction: ${optimized.enhancedPrompt}`,
        });
      } else {
        contentsParts.push({
          text: optimized.enhancedPrompt,
        });
      }

      // Try gemini-3.1-flash-lite-image first (default model in gemini-api skill)
      const candidateModels = ['gemini-3.1-flash-lite-image', 'gemini-3.1-flash-image'];
      for (const geminiModel of candidateModels) {
        try {
          const geminiResponse = await ai.models.generateContent({
            model: geminiModel,
            contents: { parts: contentsParts },
            config: {
              imageConfig: {
                aspectRatio: dimensions.geminiRatio,
              },
            },
          });

          const parts = geminiResponse.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
              imageBuffer = Buffer.from(part.inlineData.data, 'base64');
              mimeType = part.inlineData.mimeType || 'image/png';
              extension = mimeType.includes('png') ? 'png' : 'jpg';
              modelUsed =
                geminiModel === 'gemini-3.1-flash-lite-image'
                  ? 'Gemini 3.1 Flash Lite Image'
                  : 'Gemini 3.1 Flash Image';
              break;
            }
          }
          if (imageBuffer) break;
        } catch (gErr: any) {
          // Free-tier API keys have limit: 0 for image models (RESOURCE_EXHAUSTED/429).
          // Break immediately to seamlessly route to the neural diffusion engine.
          break;
        }
      }
    } catch {
      // Quiet fallback to neural diffusion engine
    }
  }

  // Attempt B: Real Diffusion Engine (FLUX / Turbo)
  if (!imageBuffer) {
    try {
      const replicateResult = await generateWithReplicate(
        optimized.enhancedPrompt,
        finalAspectRatio,
        referenceImageBase64,
        referenceImageMimeType
      );
      if (replicateResult) {
        imageBuffer = replicateResult.buffer;
        mimeType = replicateResult.mimeType;
        extension = mimeType.includes('png') ? 'png' : 'jpg';
        modelUsed = 'FLUX Kontext Pro (Replicate)';
      }
    } catch {
      // Continue to next provider when Replicate is unavailable.
    }
  }

  // Attempt B2: Hugging Face Inference FLUX.1 Engine
  if (!imageBuffer && process.env.HF_TOKEN) {
    try {
      const hfResult = await generateWithHuggingFace(
        optimized.enhancedPrompt,
        finalAspectRatio
      );
      if (hfResult) {
        imageBuffer = hfResult.buffer;
        mimeType = hfResult.mimeType;
        extension = mimeType.includes('png') ? 'png' : 'jpg';
        modelUsed = 'FLUX.1 Schnell (Hugging Face)';
      }
    } catch {
      // Continue to fallback when Hugging Face is unavailable.
    }
  }

  // Attempt C: Public fallback for local development and installations without a provider key.
  if (!imageBuffer) {
    const diffusionModels = ['flux', 'turbo', 'flux-realism'];
    const cleanPrompt = optimized.enhancedPrompt.slice(0, 800);
    const randomSeed = Math.floor(Math.random() * 1000000);

    for (const m of diffusionModels) {
      try {
        let url = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=${
          dimensions.width
        }&height=${dimensions.height}&model=${m}&nologo=true&seed=${randomSeed}`;

        // If reference image URL exists, attach it
        if (referenceImageUrl && !referenceImageUrl.startsWith('data:')) {
          url += `&image=${encodeURIComponent(referenceImageUrl)}`;
        }

        const res = await fetch(url, {
          signal: AbortSignal.timeout(14000),
          headers: {
            Accept: 'image/*',
            'User-Agent': '3athlas-Agent/1.0',
          },
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.startsWith('image/')) {
          const arrayBuf = await res.arrayBuffer();
          if (arrayBuf.byteLength > 1024) {
            imageBuffer = Buffer.from(arrayBuf);
            mimeType = contentType.includes('png') ? 'image/png' : 'image/jpeg';
            extension = mimeType.includes('png') ? 'png' : 'jpg';
            modelUsed = m === 'flux' ? 'FLUX.1 Neural Engine' : `Diffusion ${m.toUpperCase()}`;
            break;
          }
        }
      } catch {
        // Quiet fallback to next model
      }
    }
  }

  // Step 3: Finalizing
  if (onStep) onStep('finalizing', '🎨 Finalizzo i dettagli...');

  // If still no buffer, fail fast with real error as strictly required by prompt
  if (!imageBuffer) {
    throw new Error(
      'Impossibile generare l\'immagine: i servizi di generazione grafica sono momentaneamente occupati o la quota API è esaurita. Puoi inserire una chiave API Gemini personale con quota attiva nelle Impostazioni.'
    );
  }

  // Save the image to uploads/images
  const fileName = `${imageId}.${extension}`;
  const filePath = path.join(IMAGES_DIR, fileName);
  fs.writeFileSync(filePath, imageBuffer);

  const imageRecord: GeneratedImage = {
    id: imageId,
    conversationId,
    messageId,
    prompt,
    enhancedPrompt: optimized.enhancedPrompt,
    aspectRatio: finalAspectRatio,
    imageUrl: `/api/images/${fileName}`,
    downloadUrl: `/api/images/download/${imageId}`,
    width: dimensions.width,
    height: dimensions.height,
    model: modelUsed,
    referenceImageId,
    referenceImageUrl,
    createdAt: new Date().toISOString(),
    generatedBy: '3 athlas',
  };

  return { image: imageRecord, filePath };
}
