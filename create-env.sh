#!/bin/bash
echo "🔧 Setting up environment file..."

# Create .env.local file
cat > .env.local << 'ENVEOF'
# Choose ONE of these options:

# Option 1: Google Vision API (FREE $300 credit)
# Get key from: https://cloud.google.com
# VITE_GOOGLE_VISION_API_KEY=AIzaYourApiKeyHere

# Option 2: OpenAI Vision API (Paid - $5 minimum)  
# Get key from: https://platform.openai.com
# VITE_OPENAI_API_KEY=sk-proj-your-key-here

# Remove the # before the line you want to use and add your actual key
ENVEOF

echo "✅ Created .env.local file"
echo "📝 Edit .env.local and uncomment one of the API key lines"
echo "🔄 Then run: npm run dev"
