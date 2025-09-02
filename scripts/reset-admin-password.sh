#!/bin/bash

# NodeBook Admin Password Reset Script
# This script helps reset the admin password in development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 NodeBook Admin Password Reset${NC}"
echo "=================================="

# Check if running in project directory
if [ ! -f "docker-compose.dev.yml" ]; then
    echo -e "${RED}❌ Error: Please run this script from the NodeBook project root directory${NC}"
    exit 1
fi
 
# Function to generate secure password
generate_password() {
    # Generate a 16-character password with mixed characters
    openssl rand -base64 12 | tr -d "=+/" | cut -c1-16
}

# Function to update docker-compose file
update_docker_compose() {
    local new_password="$1"
    local temp_file=$(mktemp)
    
    # Create backup
    cp docker-compose.dev.yml docker-compose.dev.yml.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${YELLOW}📁 Backup created: docker-compose.dev.yml.backup.$(date +%Y%m%d_%H%M%S)${NC}"
    
    # Update the file
    if grep -q "ADMIN_PASSWORD" docker-compose.dev.yml; then
        # Replace existing ADMIN_PASSWORD
        sed "s/ADMIN_PASSWORD=.*/ADMIN_PASSWORD=$new_password/" docker-compose.dev.yml > "$temp_file"
    else
        # Add ADMIN_PASSWORD after SESSION_SECRET
        sed "/SESSION_SECRET=.*/a\      - ADMIN_PASSWORD=$new_password" docker-compose.dev.yml > "$temp_file"
    fi
    
    mv "$temp_file" docker-compose.dev.yml
    echo -e "${GREEN}✅ Updated docker-compose.dev.yml with new admin password${NC}"
}

# Function to reset database and restart services
reset_and_restart() {
    echo -e "${YELLOW}🔄 Stopping services...${NC}"
    docker compose -f docker-compose.dev.yml down
    
    echo -e "${YELLOW}🗑️  Removing admin user data volume...${NC}"
    docker volume rm nodebook-dev-data 2>/dev/null || echo -e "${YELLOW}⚠️  Volume not found, continuing...${NC}"
    
    echo -e "${YELLOW}🚀 Starting services with new password...${NC}"
    docker compose -f docker-compose.dev.yml up -d
    
    echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
    sleep 10
    
    echo -e "${GREEN}✅ Services restarted successfully!${NC}"
}

# Main script logic
echo -e "${BLUE}Choose an option:${NC}"
echo "1) Generate a secure random password"
echo "2) Enter a custom password"
echo "3) Reset to default password (admin123)"
echo "4) Show current admin password (if set)"
echo "5) Exit"

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        new_password=$(generate_password)
        echo -e "${GREEN}🔑 Generated password: ${new_password}${NC}"
        echo -e "${YELLOW}⚠️  Save this password securely!${NC}"
        read -p "Press Enter to continue with this password..."
        update_docker_compose "$new_password"
        ;;
    2)
        read -s -p "Enter new admin password: " new_password
        echo
        read -s -p "Confirm new admin password: " confirm_password
        echo
        
        if [ "$new_password" != "$confirm_password" ]; then
            echo -e "${RED}❌ Passwords don't match!${NC}"
            exit 1
        fi
        
        if [ ${#new_password} -lt 6 ]; then
            echo -e "${RED}❌ Password must be at least 6 characters long${NC}"
            exit 1
        fi
        
        update_docker_compose "$new_password"
        ;;
    3)
        new_password="admin123"
        echo -e "${YELLOW}🔄 Resetting to default password: admin123${NC}"
        update_docker_compose "$new_password"
        ;;
    4)
        if grep -q "ADMIN_PASSWORD" docker-compose.dev.yml; then
            current_password=$(grep "ADMIN_PASSWORD" docker-compose.dev.yml | sed 's/.*ADMIN_PASSWORD=//')
            echo -e "${GREEN}🔑 Current admin password: ${current_password}${NC}"
        else
            echo -e "${YELLOW}⚠️  No ADMIN_PASSWORD set in docker-compose.dev.yml${NC}"
            echo "The system will use a randomly generated password on first startup."
        fi
        exit 0
        ;;
    5)
        echo -e "${BLUE}👋 Goodbye!${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}❌ Invalid choice. Please run the script again.${NC}"
        exit 1
        ;;
esac

# Ask if user wants to restart services now
echo
read -p "Do you want to restart services now to apply the new password? (y/n): " restart_now

if [[ $restart_now =~ ^[Yy]$ ]]; then
    reset_and_restart
    
    echo
    echo -e "${GREEN}🎉 Admin password reset complete!${NC}"
    echo -e "${BLUE}📱 You can now login to NodeBook with:${NC}"
    echo -e "   Username: admin"
    echo -e "   Password: $new_password"
    echo
    echo -e "${YELLOW}🔗 Access your application:${NC}"
    echo -e "   Frontend: http://localhost:5173"
    echo -e "   Backend: http://localhost:3000"
else
    echo
    echo -e "${YELLOW}⚠️  Remember to restart your services manually:${NC}"
    echo -e "   docker compose -f docker-compose.dev.yml down"
    echo -e "   docker compose -f docker-compose.dev.yml up -d"
    echo
    echo -e "${GREEN}✅ Password updated in docker-compose.dev.yml${NC}"
fi



