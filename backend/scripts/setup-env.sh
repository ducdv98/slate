#!/bin/bash

# Slate Backend Environment Setup Script

set -e

echo "🚀 Setting up Slate Backend Environment..."

# Function to generate a random secret
generate_secret() {
    node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
}

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists."
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled."
        exit 1
    fi
fi

# Copy example to .env
echo "📝 Copying .env.example to .env..."
cp .env.example .env

# Generate secrets
echo "🔐 Generating secure secrets..."
JWT_SECRET=$(generate_secret)
JWT_REFRESH_SECRET=$(generate_secret)

# Update .env with generated secrets
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/your-super-secret-jwt-key-here/$JWT_SECRET/" .env
    sed -i '' "s/your-super-secret-refresh-jwt-key-here/$JWT_REFRESH_SECRET/" .env
else
    # Linux
    sed -i "s/your-super-secret-jwt-key-here/$JWT_SECRET/" .env
    sed -i "s/your-super-secret-refresh-jwt-key-here/$JWT_REFRESH_SECRET/" .env
fi

echo "✅ Environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update DATABASE_URL in .env with your PostgreSQL connection string"
echo "2. Configure email settings if you plan to use email features"
echo "3. Review other settings in .env and adjust as needed"
echo "4. Run 'npm run start:dev' to start the development server"
echo ""
echo "📚 For more information, see docs/environment-configuration.md"
