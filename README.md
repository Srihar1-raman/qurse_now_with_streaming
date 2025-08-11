# Qurse - AI Chat Application

A modern AI chat application built with Next.js, featuring multiple AI models and a clean, responsive interface.

## Features

- 🤖 **Multiple AI Models**: Support for GPT-4o, Claude 3.5 Sonnet, Gemini Pro, and more
- 💬 **Real-time Chat**: Smooth conversation experience with markdown support
- 🎨 **Modern UI**: Clean, responsive design with dark/light theme support
- 🔐 **Authentication**: OAuth support via NextAuth.js (GitHub, Google, Twitter)
- 💾 **Local Storage**: Conversations saved to browser localStorage
- 📱 **Mobile Friendly**: Responsive design that works on all devices

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js
- **AI Models**: OpenAI, Anthropic, Google, Groq
- **Storage**: Browser localStorage

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd qurse
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file:
   ```bash
   # NextAuth.js Configuration
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-super-secret-nextauth-key

   # OAuth Provider Credentials (optional)
   GITHUB_ID=your-github-oauth-client-id
   GITHUB_SECRET=your-github-oauth-client-secret
   GOOGLE_CLIENT_ID=your-google-oauth-client-id
   GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
   TWITTER_CLIENT_ID=your-twitter-oauth-client-id
   TWITTER_CLIENT_SECRET=your-twitter-oauth-client-secret

   # AI API Keys
   OPENAI_API_KEY=your-openai-api-key
   ANTHROPIC_API_KEY=your-anthropic-api-key
   GOOGLE_API_KEY=your-google-api-key
   GROQ_API_KEY=your-groq-api-key
   
   # Web Search (Optional)
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## Usage

### Chat Interface
- **Send messages** by typing and pressing Enter
- **Select AI models** using the model selector
- **View conversation history** in the chat thread
- **Switch themes** using the theme toggle

### Authentication
- **Sign in** with OAuth providers (GitHub, Google, Twitter)
- **Guest mode** available for testing without authentication
- **Conversations** are saved to localStorage

### AI Models
- **GPT-4o**: OpenAI's latest model
- **Claude 3.5 Sonnet**: Anthropic's conversational AI
- **Gemini Pro**: Google's AI model
- **Groq Models**: Fast inference models (Llama, Mixtral, Gemma)

## Project Structure

```
src/
├── app/                 # Next.js app directory
│   ├── conversation/    # Main chat interface
│   ├── login/          # Authentication pages
│   └── signup/         # Sign up page
├── components/         # React components
├── lib/               # Utility functions and services
│   ├── ai-service.ts  # AI model integrations
│   ├── auth.ts        # NextAuth configuration
│   └── conversation-storage.ts # localStorage management
└── styles/            # CSS styles
```

## Configuration

### OAuth Setup
1. **GitHub**: Create OAuth app at GitHub Settings > Developer settings
2. **Google**: Set up OAuth 2.0 credentials in Google Cloud Console
3. **Twitter**: Create app in Twitter Developer Portal

### AI API Keys
- **OpenAI**: Get API key from [OpenAI Platform](https://platform.openai.com/)
- **Anthropic**: Get API key from [Anthropic Console](https://console.anthropic.com/)
- **Google**: Get API key from [Google AI Studio](https://aistudio.google.com/)
- **Groq**: Get API key from [Groq Console](https://console.groq.com/)

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Adding New AI Models
1. Add the model to `AI_MODELS` in `src/lib/ai-service.ts`
2. Implement the API call in the `chat` function
3. Add any required environment variables

## Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms
- **Netlify**: Configure build settings for Next.js
- **Railway**: Deploy with automatic environment variable management
- **Self-hosted**: Build and deploy to your own server

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue on GitHub or contact the maintainers.
