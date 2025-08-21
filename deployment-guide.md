# Production Deployment Guide (with SSL)

This guide provides instructions for deploying the NodeBook application to a production server with automatic SSL certificate generation and renewal using Nginx and Let's Encrypt.

## Prerequisites

1.  **A Server:** A Linux server (e.g., Ubuntu 22.04) with a basic OS installation.
2.  **Required Software:** The following software must be installed on the server:
    *   `docker`
    *   `docker-compose`
    *   `git`
    *   `curl`
3.  **Domain Name:** A registered domain name (e.g., `nodebook.your-school.org`).
4.  **DNS Configuration:** A DNS "A" record pointing from your domain to your server's public IP address.
5.  **Firewall:** Your server's firewall must allow incoming traffic on the following ports:
    *   `TCP/22` (for SSH access)
    *   `TCP/80` (for the Let's Encrypt HTTP challenge)
    *   `TCP/443` (for HTTPS traffic)

## Deployment Steps

### 1. Clone the Repository

Connect to your server via SSH and clone the project repository:

```bash
git clone <your-repository-url>
cd nodebook
```

### 2. Run the One-Time SSL Initialization Script

This is the most critical step. The script will configure Nginx and obtain the initial SSL certificate from Let's Encrypt.

Run the script:

```bash
./init-letsencrypt.sh
```

The script will prompt you for two pieces of information:
*   **Your domain name:** (e.g., `nodebook.your-school.org`)
*   **Your email address:** This is used by Let's Encrypt for important notifications, such as certificate expiration warnings.

The script will perform the necessary setup, request the certificate, and then stop the services.

### 3. Start the Application

Once the initialization script has completed successfully, you can start the entire application stack in the background.

```bash
docker-compose -f docker-compose-ssl.yml up -d
```

Your NodeBook instance is now running and accessible at `https://<your-domain-name>`.

## Managing the Application

### Checking Logs

To view the logs for all running services:

```bash
docker-compose -f docker-compose-ssl.yml logs -f
```

To view the logs for a specific service (e.g., `nodebook`):

```bash
docker-compose -f docker-compose-ssl.yml logs -f nodebook
```

### Stopping the Application

To stop all the services:

```bash
docker-compose -f docker-compose-ssl.yml down
```

## SSL Certificate Renewal

The `certbot` service defined in the `docker-compose-ssl.yml` file is configured to run automatically every 12 hours. It will check the status of your SSL certificate and automatically renew it if it is close to expiring. You do not need to take any manual action for certificate renewal.
