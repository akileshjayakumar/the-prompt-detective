# The Prompt Detective

Interactive web game for learning the CO-STAR prompt framework by solving short AI failure cases.

## Quick Start

### Prerequisites
- Node.js 18+
- A Google Gemini API key

### Install
```bash
npm install
```

### Run
```bash
cat > .env.local <<'EOF'
GEMINI_API_KEY=your_key_here
EOF
npm run dev
```

Open http://localhost:3000.

## Features
- Detective mode: identify which CO-STAR element caused a bad output.
- Rectification mode: choose the best repaired prompt.
- Prompt Auditor mode: spot issues in generated prompts.
- Prompt Sandbox mode: submit your own prompt and get mentor feedback.
- Client/server caching to reduce repeated model calls.

## Usage
1. Start in Detective mode and inspect the faulty prompt and output.
2. Pick the missing or weak CO-STAR element.
3. Select the best fixed prompt and review the verdict.
4. Switch tabs to Auditor or Sandbox to practice different skills.

CO-STAR stands for Context, Objective, Style, Tone, Audience, and Response.

## Configuration
- `GEMINI_API_KEY` (required): API key used by `@google/genai`.
- `MOCK_CASES` (optional): set to `1` to run with local mock case generation.

Example:
```env
GEMINI_API_KEY=your_gemini_api_key
MOCK_CASES=0
```

## Contributing
```bash
npm run lint
npm run build
```

## License
MIT
