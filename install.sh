#!/bin/bash

# AWS Certification Study Companion - Installation Script
# This script handles all setup tasks for a fresh installation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    local missing_deps=0

    # Check Node.js
    if command_exists node; then
        node_version=$(node -v | cut -d'v' -f2)
        major_version=$(echo "$node_version" | cut -d'.' -f1)
        if [ "$major_version" -ge 18 ]; then
            print_success "Node.js $node_version installed"
        else
            print_error "Node.js 18.x or higher required (found $node_version)"
            missing_deps=1
        fi
    else
        print_error "Node.js not found. Please install Node.js 18.x or higher"
        print_info "Download from: https://nodejs.org/"
        missing_deps=1
    fi

    # Check pnpm
    if command_exists pnpm; then
        pnpm_version=$(pnpm -v)
        print_success "pnpm $pnpm_version installed"
    else
        print_warning "pnpm not found. Installing pnpm..."
        npm install -g pnpm
        if command_exists pnpm; then
            print_success "pnpm installed successfully"
        else
            print_error "Failed to install pnpm"
            missing_deps=1
        fi
    fi

    if [ "$missing_deps" -eq 1 ]; then
        print_error "Please install missing dependencies and run this script again"
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    print_header "Installing Dependencies"

    print_info "Running pnpm install..."
    pnpm install
    print_success "Dependencies installed"
}

# Select LLM provider
select_provider() {
    print_header "LLM Provider Configuration"

    echo "Select your preferred AI provider for the tutor:"
    echo ""
    echo "  1) Claude (Anthropic) - Recommended"
    echo "     Get API key: https://console.anthropic.com/"
    echo ""
    echo "  2) Gemini (Google)"
    echo "     Get API key: https://aistudio.google.com/apikey"
    echo ""

    while true; do
        read -p "Enter choice [1-2]: " provider_choice
        case $provider_choice in
            1)
                LLM_PROVIDER="claude"
                print_success "Selected Claude (Anthropic)"
                break
                ;;
            2)
                LLM_PROVIDER="gemini"
                print_success "Selected Gemini (Google)"
                break
                ;;
            *)
                print_warning "Invalid choice. Please enter 1 or 2."
                ;;
        esac
    done
}

# Select model based on provider
select_model() {
    print_header "Model Selection"

    if [ "$LLM_PROVIDER" = "claude" ]; then
        echo "Select Claude model:"
        echo ""
        echo "  1) Claude Sonnet 4 (claude-sonnet-4-20250514) - Recommended"
        echo "     Best balance of capability and cost"
        echo ""
        echo "  2) Claude Opus 4 (claude-opus-4-20250514)"
        echo "     Most capable, higher cost"
        echo ""

        while true; do
            read -p "Enter choice [1-2]: " model_choice
            case $model_choice in
                1)
                    SELECTED_MODEL="claude-sonnet-4-20250514"
                    print_success "Selected Claude Sonnet 4"
                    break
                    ;;
                2)
                    SELECTED_MODEL="claude-opus-4-20250514"
                    print_success "Selected Claude Opus 4"
                    break
                    ;;
                *)
                    print_warning "Invalid choice. Please enter 1 or 2."
                    ;;
            esac
        done
        MODEL_VAR="CLAUDE_MODEL"

    else
        echo "Select Gemini model:"
        echo ""
        echo "  Gemini 3 (Latest)"
        echo "  1) Gemini 3 Flash (gemini-3-flash-preview) - Recommended"
        echo "     Fast and efficient"
        echo "  2) Gemini 3 Pro (gemini-3-pro-preview)"
        echo "     Most capable Gemini 3 model"
        echo ""
        echo "  Gemini 2.5"
        echo "  3) Gemini 2.5 Flash (gemini-2.5-flash)"
        echo "     Balanced performance"
        echo "  4) Gemini 2.5 Pro (gemini-2.5-pro)"
        echo "     Advanced reasoning"
        echo ""
        echo "  Gemini 2.0"
        echo "  5) Gemini 2.0 Flash (gemini-2.0-flash)"
        echo "     Stable release"
        echo ""

        while true; do
            read -p "Enter choice [1-5]: " model_choice
            case $model_choice in
                1)
                    SELECTED_MODEL="gemini-3-flash-preview"
                    print_success "Selected Gemini 3 Flash"
                    break
                    ;;
                2)
                    SELECTED_MODEL="gemini-3-pro-preview"
                    print_success "Selected Gemini 3 Pro"
                    break
                    ;;
                3)
                    SELECTED_MODEL="gemini-2.5-flash"
                    print_success "Selected Gemini 2.5 Flash"
                    break
                    ;;
                4)
                    SELECTED_MODEL="gemini-2.5-pro"
                    print_success "Selected Gemini 2.5 Pro"
                    break
                    ;;
                5)
                    SELECTED_MODEL="gemini-2.0-flash"
                    print_success "Selected Gemini 2.0 Flash"
                    break
                    ;;
                *)
                    print_warning "Invalid choice. Please enter 1-5."
                    ;;
            esac
        done
        MODEL_VAR="GEMINI_MODEL"
    fi
}

# Get API key
get_api_key() {
    print_header "API Key Configuration"

    if [ "$LLM_PROVIDER" = "claude" ]; then
        echo "Enter your Anthropic API key"
        echo "Get one at: https://console.anthropic.com/"
        echo "(Key starts with 'sk-ant-')"
        echo ""

        while true; do
            read -sp "API Key: " api_key
            echo ""

            if [ -z "$api_key" ]; then
                print_warning "API key cannot be empty"
            elif [[ ! "$api_key" =~ ^sk-ant- ]]; then
                print_warning "Claude API keys typically start with 'sk-ant-'"
                read -p "Continue anyway? [y/N]: " confirm
                if [[ "$confirm" =~ ^[Yy]$ ]]; then
                    API_KEY="$api_key"
                    API_KEY_VAR="ANTHROPIC_API_KEY"
                    break
                fi
            else
                API_KEY="$api_key"
                API_KEY_VAR="ANTHROPIC_API_KEY"
                break
            fi
        done

    else
        echo "Enter your Google AI API key"
        echo "Get one at: https://aistudio.google.com/apikey"
        echo ""

        while true; do
            read -sp "API Key: " api_key
            echo ""

            if [ -z "$api_key" ]; then
                print_warning "API key cannot be empty"
            else
                API_KEY="$api_key"
                API_KEY_VAR="GOOGLE_AI_API_KEY"
                break
            fi
        done
    fi

    print_success "API key configured"
}

# Optional AWS configuration
configure_aws() {
    print_header "AWS Configuration (Optional)"

    echo "AWS credentials are optional and only needed for hands-on labs."
    echo "You can add these later by editing .env.local"
    echo ""

    read -p "Configure AWS credentials now? [y/N]: " configure_aws

    if [[ "$configure_aws" =~ ^[Yy]$ ]]; then
        read -p "AWS Access Key ID: " aws_access_key
        read -sp "AWS Secret Access Key: " aws_secret_key
        echo ""
        read -p "AWS Region [us-east-1]: " aws_region
        aws_region=${aws_region:-us-east-1}

        AWS_ACCESS_KEY_ID="$aws_access_key"
        AWS_SECRET_ACCESS_KEY="$aws_secret_key"
        AWS_REGION="$aws_region"

        print_success "AWS credentials configured"
    else
        AWS_ACCESS_KEY_ID=""
        AWS_SECRET_ACCESS_KEY=""
        AWS_REGION=""
        print_info "Skipping AWS configuration"
    fi
}

# Create .env.local file
create_env_file() {
    print_header "Creating Environment File"

    if [ -f ".env.local" ]; then
        print_warning ".env.local already exists"
        read -p "Overwrite existing file? [y/N]: " overwrite
        if [[ ! "$overwrite" =~ ^[Yy]$ ]]; then
            print_info "Keeping existing .env.local"
            return
        fi
    fi

    cat > .env.local << EOF
# AWS Certification Study Companion - Environment Configuration
# Generated by install.sh on $(date)

# LLM Provider Configuration
# Options: claude, gemini
LLM_PROVIDER=$LLM_PROVIDER

# API Key for selected provider
$API_KEY_VAR=$API_KEY

# Model selection (optional - defaults shown)
$MODEL_VAR=$SELECTED_MODEL

# Database path (optional)
DATABASE_PATH=./data/study.db
EOF

    # Add AWS config if provided
    if [ -n "$AWS_ACCESS_KEY_ID" ]; then
        cat >> .env.local << EOF

# AWS Credentials (for hands-on labs)
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
AWS_REGION=$AWS_REGION
EOF
    else
        cat >> .env.local << EOF

# AWS Credentials (for hands-on labs)
# Uncomment and fill in to enable CDK lab deployments
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_REGION=us-east-1
EOF
    fi

    print_success "Created .env.local"
}

# Initialize database
init_database() {
    print_header "Initializing Database"

    print_info "Running database migrations..."
    pnpm db:migrate
    print_success "Database schema created"

    print_info "Seeding content..."
    pnpm db:seed
    print_success "Content loaded"
}

# Final instructions
print_final_instructions() {
    print_header "Installation Complete!"

    echo -e "${GREEN}Your AWS Certification Study Companion is ready!${NC}"
    echo ""
    echo "Configuration summary:"
    echo "  - LLM Provider: $LLM_PROVIDER"
    echo "  - Model: $SELECTED_MODEL"
    if [ -n "$AWS_ACCESS_KEY_ID" ]; then
        echo "  - AWS: Configured (region: $AWS_REGION)"
    else
        echo "  - AWS: Not configured (labs disabled)"
    fi
    echo ""
    echo "To start studying:"
    echo ""
    echo "  pnpm dev"
    echo ""
    echo "Then open http://localhost:3000 in your browser."
    echo ""
    echo "To modify settings later, edit .env.local"
    echo ""
}

# Ask to start dev server
ask_start_server() {
    echo ""
    read -p "Start the development server now? [Y/n]: " start_server

    if [[ ! "$start_server" =~ ^[Nn]$ ]]; then
        print_info "Starting development server..."
        echo ""
        pnpm dev
    fi
}

# Main installation flow
main() {
    print_header "AWS Certification Study Companion"
    echo "Installation Script v1.0"
    echo ""

    check_prerequisites
    install_dependencies
    select_provider
    select_model
    get_api_key
    configure_aws
    create_env_file
    init_database
    print_final_instructions
    ask_start_server
}

# Run main function
main
