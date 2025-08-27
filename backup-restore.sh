#!/bin/bash

# NodeBook Backup and Restore Script
# This script handles backup and restore operations for production data

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
BACKUP_DIR="/backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="nodebook_backup_$TIMESTAMP"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to create backup
create_backup() {
    print_status "Creating backup: $BACKUP_NAME"
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME"
    
    # Backup NodeBook data
    print_status "Backing up NodeBook data..."
    docker run --rm \
        -v nodebook_nodebook-data:/data \
        -v "$BACKUP_DIR/$BACKUP_NAME:/backup" \
        alpine tar czf /backup/nodebook-data.tar.gz -C /data .
    
    # Backup WordNet data
    print_status "Backing up WordNet data..."
    docker run --rm \
        -v nodebook_wordnet-data:/data \
        -v "$BACKUP_DIR/$BACKUP_NAME:/backup" \
        alpine tar czf /backup/wordnet-data.tar.gz -C /data .
    
    # Backup NLP data
    print_status "Backing up NLP data..."
    docker run --rm \
        -v nodebook_nlp-data:/data \
        -v "$BACKUP_DIR/$BACKUP_NAME:/backup" \
        alpine tar czf /backup/nlp-data.tar.gz -C /data .
    
    # Backup Media data
    print_status "Backing up Media data..."
    docker run --rm \
        -v nodebook_media-data:/data \
        -v "$BACKUP_DIR/$BACKUP_NAME:/backup" \
        alpine tar czf /backup/media-data.tar.gz -C /data .
    
    # Backup SSL certificates
    print_status "Backing up SSL certificates..."
    docker run --rm \
        -v nodebook_certbot-etc:/data \
        -v "$BACKUP_DIR/$BACKUP_NAME:/backup" \
        alpine tar czf /backup/ssl-certificates.tar.gz -C /data .
    
    # Create backup info file
    cat > "$BACKUP_DIR/$BACKUP_NAME/backup-info.txt" << EOF
NodeBook Backup Information
==========================
Backup Date: $(date)
Backup Name: $BACKUP_NAME
Backup Size: $(du -sh "$BACKUP_DIR/$BACKUP_NAME" | cut -f1)

Services Backed Up:
- NodeBook Base Data
- WordNet Service Data
- NLP Service Data
- Media Backend Data
- SSL Certificates

To restore this backup, run:
./backup-restore.sh restore $BACKUP_NAME
EOF
    
    print_success "Backup completed successfully: $BACKUP_DIR/$BACKUP_NAME"
    print_status "Backup size: $(du -sh "$BACKUP_DIR/$BACKUP_NAME" | cut -f1)"
}

# Function to list available backups
list_backups() {
    print_status "Available backups:"
    echo
    
    if [ ! "$(ls -A "$BACKUP_DIR")" ]; then
        print_warning "No backups found in $BACKUP_DIR"
        return
    fi
    
    for backup in "$BACKUP_DIR"/*; do
        if [ -d "$backup" ]; then
            backup_name=$(basename "$backup")
            backup_date=$(echo "$backup_name" | grep -o '[0-9]\{8\}_[0-9]\{6\}')
            backup_size=$(du -sh "$backup" | cut -f1)
            
            if [ -n "$backup_date" ]; then
                formatted_date=$(date -d "${backup_date:0:8} ${backup_date:9:2}:${backup_date:11:2}:${backup_date:13:2}" '+%Y-%m-%d %H:%M:%S')
                echo "  $backup_name ($formatted_date) - $backup_size"
            else
                echo "  $backup_name - $backup_size"
            fi
        fi
    done
}

# Function to restore backup
restore_backup() {
    local backup_name="$1"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    if [ -z "$backup_name" ]; then
        print_error "Please specify a backup name to restore"
        echo "Usage: $0 restore <backup-name>"
        exit 1
    fi
    
    if [ ! -d "$backup_path" ]; then
        print_error "Backup not found: $backup_path"
        exit 1
    fi
    
    print_warning "This will overwrite current data. Are you sure? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        print_status "Restore cancelled"
        exit 0
    fi
    
    print_status "Stopping services..."
    docker-compose -f docker-compose.prod.yml down
    
    print_status "Restoring backup: $backup_name"
    
    # Restore NodeBook data
    print_status "Restoring NodeBook data..."
    docker run --rm \
        -v nodebook_nodebook-data:/data \
        -v "$backup_path:/backup" \
        alpine sh -c "rm -rf /data/* && tar xzf /backup/nodebook-data.tar.gz -C /data"
    
    # Restore WordNet data
    print_status "Restoring WordNet data..."
    docker run --rm \
        -v nodebook_wordnet-data:/data \
        -v "$backup_path:/backup" \
        alpine sh -c "rm -rf /data/* && tar xzf /backup/wordnet-data.tar.gz -C /data"
    
    # Restore NLP data
    print_status "Restoring NLP data..."
    docker run --rm \
        -v nodebook_nlp-data:/data \
        -v "$backup_path:/backup" \
        alpine sh -c "rm -rf /data/* && tar xzf /backup/nlp-data.tar.gz -C /data"
    
    # Restore Media data
    print_status "Restoring Media data..."
    docker run --rm \
        -v nodebook_media-data:/data \
        -v "$backup_path:/backup" \
        alpine sh -c "rm -rf /data/* && tar xzf /backup/media-data.tar.gz -C /data"
    
    # Restore SSL certificates
    print_status "Restoring SSL certificates..."
    docker run --rm \
        -v nodebook_certbot-etc:/data \
        -v "$backup_path:/backup" \
        alpine sh -c "rm -rf /data/* && tar xzf /backup/ssl-certificates.tar.gz -C /data"
    
    print_status "Starting services..."
    docker-compose -f docker-compose.prod.yml up -d
    
    print_success "Restore completed successfully"
}

# Function to clean old backups
clean_backups() {
    local days="$1"
    
    if [ -z "$days" ]; then
        print_error "Please specify number of days to keep backups"
        echo "Usage: $0 clean <days>"
        exit 1
    fi
    
    print_status "Cleaning backups older than $days days..."
    
    local deleted_count=0
    for backup in "$BACKUP_DIR"/*; do
        if [ -d "$backup" ]; then
            backup_name=$(basename "$backup")
            backup_date=$(echo "$backup_name" | grep -o '[0-9]\{8\}_[0-9]\{6\}')
            
            if [ -n "$backup_date" ]; then
                backup_timestamp=$(date -d "${backup_date:0:8} ${backup_date:9:2}:${backup_date:11:2}:${backup_date:13:2}" +%s)
                current_timestamp=$(date +%s)
                age_days=$(( (current_timestamp - backup_timestamp) / 86400 ))
                
                if [ $age_days -gt $days ]; then
                    print_status "Removing old backup: $backup_name (age: ${age_days} days)"
                    rm -rf "$backup"
                    ((deleted_count++))
                fi
            fi
        fi
    done
    
    if [ $deleted_count -eq 0 ]; then
        print_status "No old backups found to clean"
    else
        print_success "Cleaned $deleted_count old backups"
    fi
}

# Function to show usage
show_usage() {
    echo "NodeBook Backup and Restore Script"
    echo
    echo "Usage: $0 <command> [options]"
    echo
    echo "Commands:"
    echo "  backup              Create a new backup"
    echo "  list                List available backups"
    echo "  restore <name>      Restore a specific backup"
    echo "  clean <days>        Remove backups older than specified days"
    echo "  help                Show this help message"
    echo
    echo "Examples:"
    echo "  $0 backup                    # Create backup"
    echo "  $0 list                      # List backups"
    echo "  $0 restore nodebook_backup_20231201_143022  # Restore specific backup"
    echo "  $0 clean 30                  # Remove backups older than 30 days"
}

# Main script logic
case "${1:-help}" in
    backup)
        create_backup
        ;;
    list)
        list_backups
        ;;
    restore)
        restore_backup "$2"
        ;;
    clean)
        clean_backups "$2"
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        print_error "Unknown command: $1"
        show_usage
        exit 1
        ;;
esac
