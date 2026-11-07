import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';

// Manually read .env.local without needing external packages
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    });
  }
} catch (e) {
  console.log('Could not parse .env.local manually, relying on environment.');
}

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  console.error('❌ Error: GROQ_API_KEY is missing!');
  process.exit(1);
}

const groq = new Groq({ apiKey });

async function checkModels() {
  console.log('🔍 Fetching available Groq models for your API key...\n');

  try {
    const modelsList = await groq.models.list();
    const activeModels = modelsList.data.map((m) => m.id);

    console.log('✅ Models available on your account:');
    activeModels.forEach((model) => console.log(`   - ${model}`));
    console.log('\n----------------------------------------\n');

    const testModel = activeModels[0] || 'llama-3.1-8b-instant';
    console.log(`🚀 Testing completion with model: "${testModel}"...`);

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'Say hello in 3 words!' }],
      model: testModel,
    });

    console.log('🎉 SUCCESS! Response received:');
    console.log(`   "${completion.choices[0]?.message?.content}"\n`);
    console.log(`👉 Put this exact model string in your route.ts: '${testModel}'`);
  } catch (error) {
    console.error('❌ Error testing Groq API:', error.message || error);
  }
}

checkModels();
