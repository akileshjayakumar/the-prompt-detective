# The Prompt Detective
Interactive web game for learning the CO-STAR prompt framework by solving short AI failure cases.

## Quick Start
```bash
npm install
```

## Capabilities
- Node.js 18+
- A Google Gemini API key
- Detective mode: identify which CO-STAR element caused a bad output.
- Rectification mode: choose the best repaired prompt.

## Configuration
- `GEMINI_API_KEY`: Required for related integrations/features.

## Usage
```bash
cat > .env.local <<'EOF'
GEMINI_API_KEY=your_key_here
EOF
npm run dev
```

## Contributing and Testing
- Contributions are welcome through pull requests with clear, scoped changes.
- Run the following checks before submitting changes:
```bash
npm run lint
npm run build
```

## License
Licensed under the `MIT` license. See [LICENSE](./LICENSE) for full text.
