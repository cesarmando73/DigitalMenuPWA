import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { translate } from '@vitalets/google-translate-api';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

// Función para traducir con IA (Groq o Gemini)
async function translateWithAI(name: string, description: string, prompt: string) {
  // INTENTO 1: GROQ (Más rápido y sin cuotas molestas)
  if (GROQ_API_KEY) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        }),
      });
      const data = await response.json();
      if (data.choices && data.choices[0]) {
        return JSON.parse(data.choices[0].message.content);
      }
    } catch (e) { 
        console.error("Groq falló, intentando Gemini...", e); 
    }
  }

  // INTENTO 2: GEMINI (Backup)
  if (GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash', 
        generationConfig: { responseMimeType: 'application/json' } 
      });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (e) { 
        console.error("Gemini falló también...", e); 
    }
  }

  throw new Error("No hay motores de IA disponibles o han fallado.");
}

// Función de FALLBACK: Google Translate estándar (Nunca falla)
async function translateWithStandard(name: string, description: string) {
  const langs = ['ca', 'en', 'de', 'fr', 'it', 'pt'];
  const results: any = {};
  
  for (const lang of langs) {
    try {
        if (name) {
          const resName = await translate(name, { from: 'es', to: lang });
          results[`name_${lang}`] = resName.text;
        }
        if (description) {
          const resDesc = await translate(description, { from: 'es', to: lang });
          results[`desc_${lang}`] = resDesc.text;
        } else {
          results[`desc_${lang}`] = "";
        }
    } catch (e) {
        console.error(`Error en traducción estándar para ${lang}:`, e);
        results[`name_${lang}`] = name || "";
        results[`desc_${lang}`] = description || "";
    }
  }
  return results;
}

export async function POST(request: Request) {
  try {
    const { name, description } = await request.json();
    
    // Mejoramos el prompt para que sea más específico
    const prompt = `
      Eres un traductor experto en gastronomía de alta gama para un restaurante en Mallorca, España.
      Debes traducir los siguientes textos del CASTELLANO/ESPAÑOL a estos idiomas: catalán (ca), alemán (de), inglés (en), francés (fr), italiano (it) y portugués (pt).
      Usa términos gastronómicos precisos y elegantes, no literales.
      
      Datos a traducir:
      - Nombre: "${name || ''}"
      - Descripción: "${description || ''}"
      
      Devuelve un objeto JSON estrictamente con este formato:
      {
        "name_ca": "...", "desc_ca": "...",
        "name_de": "...", "desc_de": "...",
        "name_en": "...", "desc_en": "...",
        "name_fr": "...", "desc_fr": "...",
        "name_it": "...", "desc_it": "...",
        "name_pt": "...", "desc_pt": "..."
      }
    `;

    try {
      const translations = await translateWithAI(name, description, prompt);
      return NextResponse.json(translations);
    } catch (aiError) {
      console.log("Motores de IA fallaron, usando traductor estándar como backup...");
      const translations = await translateWithStandard(name, description);
      return NextResponse.json(translations);
    }
  } catch (error: any) {
    console.error('Translation route error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
