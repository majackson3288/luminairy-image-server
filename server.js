const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── YOUR API KEYS ──
const STABILITY_KEY = process.env.STABILITY_KEY || 'PASTE_YOUR_STABILITY_KEY_HERE';
const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY || 'PASTE_YOUR_ANTHROPIC_KEY_HERE';
// ──────────────────

app.get('/', (req, res) => {
  res.json({ status: 'LuminAIry server running', endpoints: ['/generate-text', '/generate-image'] });
});

// ── CLAUDE TEXT GENERATION ──
app.post('/generate-text', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'No prompt provided' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'Claude API error' });
    }

    const data = await response.json();
    const text = data.content.map(b => b.text || '').join('');
    res.json({ text });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── STABILITY AI IMAGE GENERATION ──
app.post('/generate-image', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'No prompt provided' });

  try {
    const response = await fetch(
      'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${STABILITY_KEY}`
        },
        body: JSON.stringify({
          text_prompts: [
            { text: prompt, weight: 1 },
            { text: 'low quality, blurry, distorted, ugly, watermark, text, nsfw', weight: -1 }
          ],
          cfg_scale: 7,
          height: 1024,
          width: 1024,
          steps: 30,
          samples: 1,
          style_preset: 'photographic'
        })
      }
    );

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.message || 'Stability AI error' });
    }

    const data = await response.json();
    const base64 = data.artifacts[0].base64;
    res.json({ image: `data:image/png;base64,${base64}` });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`LuminAIry server running on port ${PORT}`));

