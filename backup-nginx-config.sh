#!/bin/bash

# Nginx Proxy Manager Configuration Backup Script
# This script backs up nginx proxy manager configurations

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Create backup directory with timestamp
BACKUP_DIR="nginx-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

print_status "Creating nginx configuration backup in: $BACKUP_DIR"

# Check if container is running
if ! docker ps | grep -q "nodebook-nginx-proxy-manager"; then
    print_warning "Nginx proxy manager container is not running"
    print_status "Trying to start it..."
    docker-compose -f docker-compose-deploy.yml up -d nginx-proxy-manager
    sleep 5
fi

# Backup nginx configurations
print_status "Backing up nginx proxy configurations..."
docker cp nodebook-nginx-proxy-manager:/data/nginx "$BACKUP_DIR/"

# Backup SSL certificates
print_status "Backing up SSL certificates..."
docker cp nodebook-nginx-proxy-manager:/data/letsencrypt "$BACKUP_DIR/"

# Backup database
print_status "Backing up database..."
docker cp nodebook-nginx-proxy-manager:/data/database.sqlite "$BACKUP_DIR/"

# Create a restore script
cat > "$BACKUP_DIR/restore.sh" << 'EOF'
#!/bin/bash
# Nginx Proxy Manager Configuration Restore Script

set -e

echo "Restoring nginx proxy manager configuration..."

# Check if container is running
if ! docker ps | grep -q "nodebook-nginx-proxy-manager"; then
    echo "Starting nginx proxy manager container..."
    docker-compose -f docker-compose-deploy.yml up -d nginx-proxy-manager
    sleep 5
fi

# Restore configurations
echo "Restoring nginx configurations..."
docker cp ./nginx/. nodebook-nginx-proxy-manager:/data/

echo "Restoring SSL certificates..."
docker cp ./letsencrypt/. nodebook-nginx-proxy-manager:/data/letsencrypt/

echo "Restoring database..."
docker cp ./database.sqlite nodebook-nginx-proxy-manager:/data/

echo "Restarting nginx proxy manager..."
docker restart nodebook-nginx-proxy-manager

echo "Restore complete!"
EOF

chmod +x "$BACKUP_DIR/restore.sh"

# Create a summary file
cat > "$BACKUP_DIR/README.md" << EOF
# Nginx Proxy Manager Backup

**Backup Date:** $(date)
**Container:** nodebook-nginx-proxy-manager

## Contents
- \`nginx/\` - Proxy host configurations
- \`letsencrypt/\` - SSL certificates
- \`database.sqlite\` - Nginx proxy manager database
- \`restore.sh\` - Script to restore this backup

## Restore Instructions
1. Ensure the nginx proxy manager container is running
2. Run: \`./restore.sh\`
3. The container will restart automatically

## Manual Restore
If the restore script doesn't work, you can manually copy files:
\`\`\`bash
docker cp ./nginx/. nodebook-nginx-proxy-manager:/data/
docker cp ./letsencrypt/. nodebook-nginx-proxy-manager:/data/letsencrypt/
docker cp ./database.sqlite nodebook-nginx-proxy-manager:/data/
docker restart nodebook-nginx-proxy-manager
\`\`\`
EOF

print_status "Backup complete!"
print_status "Backup location: $BACKUP_DIR"
print_status "To restore: cd $BACKUP_DIR && ./restore.sh"
